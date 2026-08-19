// ff-llm primitive: hookChild — carry a hook into content processes.
//
// hook, one process over. hook installs a wrapper in the parent realm; the
// behaviour worth watching often lives in a content process, where the agent's
// channel cannot reach — the eval channel terminates in the parent. hookChild
// carries a hook into every content process (or a named few) and streams what
// it captures back to a parent hook the agent drains as usual.
//
// The seam travels as source. hook takes an install closure (rec) => uninstall
// because agent and kit share a realm; a closure cannot cross a process
// boundary, so hookChild takes the SAME closure as a string and evaluates it in
// each child. Everything else is the hook you know: rec records one event, the
// undo is kept where the agent cannot hold it, drain and unhook are the kit's,
// and the id names one channel.
//
//   await hookChild(id, seam, opts) -> JSON (hook()'s report, for the parent side)
//     seam   source text of (rec) => uninstall, evaluated in each child's
//            process-script scope (Services, ChromeUtils, Cc/Ci available).
//            rec(value, subject) records one event; `value` must be
//            structured-cloneable — it rides a message to the parent. The
//            uninstall must be returned synchronously, as with hook.
//     opts   { targets: 'all' | [pid, ...]   default 'all' (covers future procs)
//              out, max     parent sink and buffer — where the agent drains
//              flushMs      child send latency, default 250
//              sample }     child-side sample is not supported yet; must be 0
//
//   drain(id) / unhook(id)   the kit's own. unhook tears down every child
//     (broadcast teardown + removeDelayedProcessScript) and removes the parent
//     listener. Events carry `pid`; one parent ring holds all processes at once
//     — different seams take different ids (channels), processes are pid tags on
//     the same channel.
//
// Only capture.js is shipped into the child, pulled from __ffllm._sources (the
// loader retains the shipment). The child mints its own invisibleToDebugger
// sandbox for it, so a Debugger armed in the child later cannot see the capture
// machinery. The parent's own in-process message manager is skipped by a
// processType guard: ppmm delivers a process script to the parent too, and an
// unguarded wrap would double-report from the parent's module copy.
//
// A snapshot, not a subscription: a process that swaps out (a cross-origin
// navigation moves a tab between processes) strands its child hook silently.
// 'all' re-arms new processes — loadProcessScript's delayed flag covers them; a
// targeted [pid] load does not. Teardown loses at most one in-flight child batch
// (newer than the last flush): drain() immediately before unhook() to collect
// it, or keep flushMs small. Validated Nightly 155,
// runs/child-recipe/validation-2026-08-08.md.
(() => {
  const S = (globalThis.__ffllm ??= { installedAt: Date.now() });

  // Child flush trigger; flushMs is the latency backstop for a partial batch.
  // Small on purpose — the child is the volatile end, evidence should not pool
  // there.
  const CHILD_BATCH = 20;

  // The process script, as a string: JSON.stringify makes safe JS string
  // literals of capture.js (it contains backticks and newlines) and of the
  // message names; the seam is the agent's own code, spliced in raw as a
  // parenthesized expression.
  const buildWrapper = (id, capSrc, seam, msg, ctl, flushMs) =>
    '(() => {' +
    'if (Services.appinfo.processType == Services.appinfo.PROCESS_TYPE_DEFAULT) return;' +
    'const G = (globalThis.__ffllmChild ??= {});' +
    'if (G[' + JSON.stringify(id) + ']) return;' +
    'const sp = Cc["@mozilla.org/systemprincipal;1"].createInstance(Ci.nsIPrincipal);' +
    'const sb = Cu.Sandbox(sp, { invisibleToDebugger: true, freshCompartment: true,' +
    ' sandboxName: "ffllm-child", wantGlobalProperties: ["ChromeUtils", "TextDecoder"] });' +
    'const T = ChromeUtils.importESModule("resource://gre/modules/Timer.sys.mjs");' +
    'sb.setTimeout = T.setTimeout; sb.clearTimeout = T.clearTimeout;' +
    'Cu.evalInSandbox(' + JSON.stringify(capSrc) + ', sb, null, "ffllm-child/capture.js", 1, false);' +
    'const S = sb.__ffllm;' +
    'const pid = Services.appinfo.processID;' +
    'const entry = S._capture.open({ sample: 0, max: ' + CHILD_BATCH + ', flushMs: ' + flushMs +
    ', out: (batch) => Services.cpmm.sendAsyncMessage(' + JSON.stringify(msg) +
    ', { pid, events: batch }) });' +
    'const rec = (value, subject) => { try { S._capture.record(entry, value, subject); }' +
    ' catch (e) { entry.recordError = String(e); } };' +
    'let uninstall = null;' +
    'try { uninstall = (' + seam + ')(rec); } catch (e) {' +
    ' Services.cpmm.sendAsyncMessage(' + JSON.stringify(msg) +
    ', { pid, events: [{ t: 0, installError: String(e) }] }); return; }' +
    'const ctl = () => { Services.cpmm.removeMessageListener(' + JSON.stringify(ctl) + ', ctl);' +
    ' try { if (typeof uninstall === "function") uninstall(); } catch (e) {}' +
    ' S._capture.flush(entry); delete G[' + JSON.stringify(id) + ']; };' +
    'Services.cpmm.addMessageListener(' + JSON.stringify(ctl) + ', ctl);' +
    'G[' + JSON.stringify(id) + '] = true;' +
    '})();';

  const hookChild = (id, seam, opts = {}) => {
    if (typeof id !== 'string') {
      throw new TypeError('hookChild is positional: hookChild(id, seam, opts)');
    }
    if (typeof seam !== 'string') {
      throw new TypeError('hookChild: seam must be a string — the source of (rec) => uninstall');
    }
    if (opts === null || typeof opts !== 'object' || Array.isArray(opts)) {
      throw new TypeError(
        'hookChild: opts must be a plain object { targets, out, max, flushMs, sample }');
    }
    for (const k of Object.keys(opts)) {
      if (!['targets', 'out', 'max', 'flushMs', 'sample'].includes(k)) {
        throw new TypeError(
          `hookChild: unknown opts key "${k}" — opts is { targets, out, max, flushMs, sample }`);
      }
    }
    const targets = opts.targets ?? 'all';
    if (targets !== 'all'
        && !(Array.isArray(targets) && targets.every((p) => typeof p === 'number'))) {
      throw new TypeError('hookChild: targets must be "all" or an array of pids');
    }
    if (opts.sample) {
      throw new TypeError(
        'hookChild: child-side sample is not supported yet — shape the value inside your seam');
    }
    const src = (S._sources || []).find((f) => f.name === 'capture.js');
    if (!src) {
      throw new Error(
        'hookChild: capture.js not in __ffllm._sources — reload the kit (ensure_privileged_kit)');
    }

    const msg = 'ffllm:child:' + id;
    const ctl = 'ffllm:child-teardown:' + id;
    const flushMs = opts.flushMs ?? 250;
    const delayed = targets === 'all';
    const uri = 'data:application/javascript,'
      + encodeURIComponent(buildWrapper(id, src.source, seam, msg, ctl, flushMs));

    return (async () => {
      // Replacing an id must tear the prior arming out of the children first —
      // hook alone would only swap the parent listener and leave the old process
      // script running. unhook(id) runs this file's uninstall, which broadcasts
      // teardown.
      if (S.hooks && id in S.hooks) await S.unhook(id);

      return S.hook(id, (rec) => {
        const l = (m) => {
          for (const ev of m.data.events) rec(Object.assign({ pid: m.data.pid }, ev));
        };
        Services.ppmm.addMessageListener(msg, l);
        if (delayed) {
          Services.ppmm.loadProcessScript(uri, true);
        } else {
          for (let i = 0; i < Services.ppmm.childCount; i++) {
            const mm = Services.ppmm.getChildAt(i);
            let pid = null;
            try { pid = mm.osPid; } catch (e) { }
            if (targets.includes(pid)) mm.loadProcessScript(uri, false);
          }
        }
        return () => {
          Services.ppmm.broadcastAsyncMessage(ctl);
          if (delayed) Services.ppmm.removeDelayedProcessScript(uri);
          Services.ppmm.removeMessageListener(msg, l);
        };
      }, { out: opts.out ?? null, max: opts.max ?? 500, sample: 0 });
    })();
  };

  S.hookChild = hookChild;
})();
