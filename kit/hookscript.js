// ff-llm primitive: hookScript — break on a line of Firefox's own code and record each hit.
//
// A hook whose seam is a source location instead of a property: any position
// the engine can stop at, in any compiled chrome script, addressed by url plus
// displayName and/or line. Reaches what wrapping cannot — private methods
// (#name), closures, and a function's locals mid-flight — with optional
// write-back. Wrapping by name stays the right tool for everything a property
// can reach: it is orders of magnitude cheaper (arming a breakpoint discards
// the script's JIT code; every hit costs ~35-60us) and a name survives
// releases where a line number drifts.
//
// hookScript(id, where) -> JSON { id, installed, undo, armed: {url, displayName, line, column} }
//   (async, like hook itself — await it)
//   where.url          script url, e.g. 'chrome://browser/content/tabbrowser/tabbrowser.js'
//   where.displayName  the function's displayName or a substring of it — private
//                      methods appear literally, e.g. '#insertTabAtIndex'
//   where.line         arm the first stoppable site on this line; omit to arm
//                      the first site of the matched function
//   where.global       the debuggee — any object from the target realm
//                      (normalized via Cu.getGlobalForObject); a script
//                      compiles once per realm, so this picks which copy is
//                      armed. Default: the most recent browser window.
//   where.self         only record when frame.this is exactly this object — the
//                      per-instance filter (a line is shared by every instance
//                      of a class; skipped instances still pay the trap, so
//                      prefer a wrapper when the method is name-reachable)
//   where.set          { name: value } — on each hit, write these frame locals
//                      via env.find(name).setVariable before the frame resumes;
//                      undefined/null/boolean/number/string only
//
//   Wrong-shaped calls (non-string id, unknown where keys, missing url) throw
//   synchronously and kill the payload; a failing arm still returns its
//   { installed: false } report.
//
// Each hit records { callee, args, locals, wrote?, stack } through the normal
// capture path: drain(id) reads it, unhook(id) disarms, and
// Cu.getGlobalForObject(__ffllm.hook)['__ffllm_ctl_' + id].stats() reports
// hits/skips/errors between calls (the controller lives on the kit sandbox
// global, not the window). Locals are read through env.find, which walks the
// scope chain —
// Environment.getVariable alone sees only one environment and misses names
// bound in enclosing blocks.
//
// Hazards, all measured: the function-end position is a stoppable site where
// an implicit return would run — a function that always leaves through an
// explicit return never reaches it, so a breakpoint armed there is valid and
// silently dead; stats() hits staying 0 is the symptom. A const local reads
// [unreadable] before its declaration runs (temporal dead zone) — parameters
// read anywhere; arm a later site to see locals. Re-entry by a hook's own rec
// is guarded (dropped, counted as selfSkips), but one hook's rec crossing
// another hook's armed site is not: never break on the kit's own capture path.
(() => {
  const S = (globalThis.__ffllm ??= { installedAt: Date.now() });

  // The async body — entered only after the façade below has validated the
  // shape. `target` is the debuggee global, already normalized.
  const armScriptHook = async (id, where, target) => {
    let armed = null;
    const report = await S.hook(id, (rec) => {
      const sp = Cc['@mozilla.org/systemprincipal;1'].createInstance(Ci.nsIPrincipal);
      const sb = Cu.Sandbox(sp, { invisibleToDebugger: true, sandboxName: 'ffllm-hookscript' });
      const { addDebuggerToGlobal } =
        ChromeUtils.importESModule('resource://gre/modules/jsdebugger.sys.mjs');
      addDebuggerToGlobal(sb);

      // Compiled inside the sandbox: a closure written here would be debuggee
      // code, and the debugger's own code has to stay out of view.
      const makeController = Cu.evalInSandbox('(' + String(function (rec, opt) {
        const dbg = new Debugger();
        const stats = { hits: 0, selfSkips: 0, instanceSkips: 0, errors: 0, lastError: null };
        let recDepth = 0;
        let selfDO = null;

        const dv = (v, depth) => {
          const t = typeof v;
          if (v === null || t === 'number' || t === 'boolean') return v;
          if (t === 'undefined') return '(undefined)';
          if (t === 'string') return v.length > 200 ? v.slice(0, 200) + '…' : v;
          if (t !== 'object') { try { return String(v); } catch (e) { return '[' + t + ']'; } }
          try {
            if (typeof v.getOwnPropertyNames !== 'function')
              return v.optimizedOut ? '(optimized out)' : '[non-debuggee object]';
            if (v.callable) return 'function ' + (v.name || '(anon)');
            const out = { class: v.class };
            if (depth > 0) for (const n of v.getOwnPropertyNames().slice(0, 10)) {
              try {
                const d = v.getOwnPropertyDescriptor(n);
                out[n] = d && 'value' in d ? dv(d.value, depth - 1) : '[accessor]';
              } catch (e) { out[n] = '[unreadable]'; }
            }
            return out;
          } catch (e) { return '[unreadable: ' + e + ']'; }
        };

        const snap = (frame) => {
          const ev = { callee: (frame.callee && (frame.callee.displayName || frame.callee.name)) || frame.type };
          try { ev.args = (frame.arguments || []).slice(0, 8).map((a) => dv(a, 1)); } catch (e) { }
          try {
            let env = frame.environment;
            ev.locals = {};
            let count = 0;
            for (let e2 = env, hops = 0; e2 && hops < 4 && count < 30; e2 = e2.parent, hops++) {
              for (const n of e2.names()) {
                if (n in ev.locals || count >= 30) continue;
                try { ev.locals[n] = dv(e2.getVariable(n), 1); count++; }
                catch (e) { ev.locals[n] = '[unreadable]'; }
              }
            }
          } catch (e) { }
          ev.stack = [];
          for (let f = frame, i = 0; f && i < 15; f = f.older, i++) {
            try {
              let line = '?';
              try { line = f.script.getOffsetMetadata(f.offset).lineNumber; } catch (e) { }
              ev.stack.push(((f.callee && (f.callee.displayName || f.callee.name)) || f.type) +
                ' @ ' + (f.script ? f.script.url : '?') + ':' + line);
            } catch (e) { ev.stack.push('[unreadable]'); }
          }
          return ev;
        };

        return {
          stats: () => JSON.parse(JSON.stringify(stats)),
          arm(global, self) {
            const gdo = dbg.addDebuggee(global);
            if (self) selfDO = gdo.makeDebuggeeValue(self);
            let scripts = dbg.findScripts({ url: opt.url });
            if (opt.displayName) {
              scripts = scripts.filter((s) =>
                String(s.displayName || '').includes(opt.displayName));
              scripts.sort((a, b) =>
                (a.displayName === opt.displayName ? 0 : 1) -
                (b.displayName === opt.displayName ? 0 : 1));
            }
            if (!scripts.length) throw new Error('no script matches url/displayName');
            let script = null, site = null;
            for (const s of scripts) {
              const cands = s.getPossibleBreakpoints()
                .filter((b) => opt.line == null || b.lineNumber === opt.line);
              if (cands.length) { script = s; site = cands[0]; break; }
            }
            if (!site) throw new Error('no stoppable site there; matching scripts: ' + scripts.length);
            script.setBreakpoint(site.offset, {
              hit: (frame) => {
                try {
                  if (recDepth) { stats.selfSkips++; return; }
                  if (selfDO && frame.this !== selfDO) { stats.instanceSkips++; return; }
                  stats.hits++;
                  const ev = snap(frame);
                  if (opt.set) {
                    ev.wrote = {};
                    for (const n of Object.keys(opt.set)) {
                      try {
                        const e2 = frame.environment.find(n);
                        if (e2) { e2.setVariable(n, opt.set[n]); ev.wrote[n] = true; }
                        else ev.wrote[n] = 'no binding';
                      } catch (e) { ev.wrote[n] = String(e); }
                    }
                  }
                  // Deferred out of the handler: rec's path is debuggee code,
                  // and a hit during it must not nest (see breakpoint-hook.md).
                  Promise.resolve().then(() => {
                    recDepth++;
                    try { rec(ev); } catch (e) { } finally { recDepth--; }
                  });
                } catch (e) { stats.errors++; stats.lastError = String(e); }
              },
            });
            return { url: script.url, displayName: script.displayName || null,
                     line: site.lineNumber, column: site.columnNumber };
          },
          uninstall() { dbg.removeAllDebuggees(); },
        };
      }) + ')', sb);

      const ctl = makeController(rec, {
        url: where.url,
        displayName: where.displayName ?? null,
        line: where.line ?? null,
        set: where.set ?? null,
      });
      // Arm before publishing: a failed arm must not leave __ffllm_ctl_<id>
      // behind with no registered hook to clean it up.
      armed = ctl.arm(target, where.self ?? null);
      globalThis['__ffllm_ctl_' + id] = ctl;
      return () => { ctl.uninstall(); delete globalThis['__ffllm_ctl_' + id]; };
    });

    const r = JSON.parse(report);
    r.armed = armed;
    return JSON.stringify(r);
  };

  // Only the body is async — a shape error has to throw synchronously in the
  // caller's frame, where it kills the whole payload, not seal itself into a
  // promise a bare call is free to drop (the hook.js / tap.js façade).
  S.hookScript = (id, where = {}) => {
    if (typeof id !== 'string') {
      throw new TypeError('hookScript is positional: hookScript(id, where)');
    }
    if (where === null || typeof where !== 'object' || Array.isArray(where)) {
      throw new TypeError(
        'hookScript: where must be a plain object { url, displayName, line, self, set, global }');
    }
    for (const k of Object.keys(where)) {
      if (!['url', 'displayName', 'line', 'self', 'set', 'global'].includes(k)) {
        throw new TypeError(`hookScript: unknown where key "${k}" — where is ` +
          '{ url, displayName, line, self, set, global }');
      }
    }
    if (!where.url) throw new TypeError('hookScript: where.url is required');
    for (const [n, v] of Object.entries(where.set || {})) {
      const t = typeof v;
      if (!(v === null || t === 'undefined' || t === 'boolean' || t === 'number' || t === 'string'))
        throw new TypeError('hookScript: set.' + n + ' must be a primitive');
    }
    let target;
    if (where.global !== undefined) {
      if (where.global === null ||
          (typeof where.global !== 'object' && typeof where.global !== 'function')) {
        throw new TypeError(
          'hookScript: where.global must be an object from the target realm');
      }
      target = Cu.getGlobalForObject(where.global);
    } else {
      target = Services.wm.getMostRecentWindow('navigator:browser');
      if (!target) {
        throw new Error('hookScript: no browser window open — pass where.global');
      }
    }
    return armScriptHook(id, where, target);
  };
})();
