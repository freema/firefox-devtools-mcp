// ff-llm primitive: callChild — evaluate in a content process, return the value.
//
// eval, one process over. The agent's eval channel terminates in the parent: a
// function goes in, its return value comes back, a returned promise is awaited.
// callChild is the same contract across the process boundary: src is the source
// of a function, evaluated in a child's persistent kit scope; its return value
// rides one message home. Streams are hookChild's job — callChild asks one
// question and is gone.
//
//   await callChild(pid, src, opts)   -> the function's return value
//   await callChild('all', src, opts) -> [{ pid, value | error | timeout }]
//     src   source text of () => value, async fine. Runs inside the child's
//           persistent ffllm-call sandbox (Services, Cc/Ci/Cu, ChromeUtils,
//           setTimeout available). The value rides a message, so it must be
//           structured-cloneable: JSON-shaped data survives every hop
//           losslessly; project anything else to plain data or a string
//           yourself, in the child, where the object is alive and you know
//           its faithful reduction. A child throw rejects the pid form with
//           the child's message and stack; 'all' reports it as { error }.
//     opts  { timeoutMs }, default 5000. The pid form rejects on timeout;
//           'all' resolves with { pid, timeout: true } for each silent
//           process — who did not answer is evidence, not noise.
//
// The scope persists, the call does not. Each call ships one non-delayed
// process script: nothing stays armed, there is no teardown. But all calls
// into a process evaluate in one sandbox, minted on first use — stash on
// globalThis in this call, query it in the next, exactly as the parent realm
// carries state between evals. Keep an undo beside anything you install there;
// evidence that accrues over time belongs to hookChild, not to a stash. A
// process that dies takes its scope and stashes with it — re-plant on the next
// call, or use hookChild targets: 'all' when survival across churn matters.
//
// A snapshot with a deadline: the call reaches processes alive at dispatch —
// nothing re-arms for ones spawned later, and an unknown pid throws, naming
// the pids that exist ('all' is also the cheap process map). The timeout is a
// parent-side give-up, not an abort: the child evaluation runs on and its
// side effects land in the scope, where a follow-up call can inspect them; a
// late reply arrives on a message name nobody holds and is dropped — each
// call mints its own, so it can never leak into another call's answer.
// Validated Nightly 155.0a1, runs/callchild/validation-2026-08-09.md.
(() => {
  const S = (globalThis.__ffllm ??= { installedAt: Date.now() });

  // The process script, as a string: JSON.stringify makes safe JS string
  // literals of the agent's src and the message name. Answer and failure ride
  // the same message — there is no other road home.
  const buildWrapper = (src, msg) =>
    '(async () => {' +
    'if (Services.appinfo.processType == Services.appinfo.PROCESS_TYPE_DEFAULT) return;' +
    'const G = (globalThis.__ffllmChild ??= {});' +
    'const pid = Services.appinfo.processID;' +
    'if (!G.callSb) {' +
    'const sp = Cc["@mozilla.org/systemprincipal;1"].createInstance(Ci.nsIPrincipal);' +
    'const sb = Cu.Sandbox(sp, { invisibleToDebugger: true, freshCompartment: true,' +
    ' sandboxName: "ffllm-call", wantGlobalProperties: ["ChromeUtils", "TextDecoder"] });' +
    'const T = ChromeUtils.importESModule("resource://gre/modules/Timer.sys.mjs");' +
    'sb.setTimeout = T.setTimeout; sb.clearTimeout = T.clearTimeout;' +
    'sb.Services = Services; sb.Cc = Cc; sb.Ci = Ci; sb.Cu = Cu;' +
    'G.callSb = sb; }' +
    'let reply;' +
    'try {' +
    'const fn = Cu.evalInSandbox(' + JSON.stringify('(' + src + ')') +
    ', G.callSb, null, "ffllm-call/src", 1, false);' +
    'let value = fn();' +
    'if (value && typeof value.then === "function") value = await value;' +
    'reply = { pid, value };' +
    '} catch (e) {' +
    'reply = { pid, error: String(e), stack: e && e.stack ? String(e.stack) : null };' +
    '}' +
    'try { Services.cpmm.sendAsyncMessage(' + JSON.stringify(msg) + ', reply); }' +
    'catch (e) { Services.cpmm.sendAsyncMessage(' + JSON.stringify(msg) +
    ', { pid, error: "return value not structured-cloneable: " + e }); }' +
    '})();';

  const callChild = (target, src, opts = {}) => {
    if (target !== 'all' && !Number.isInteger(target)) {
      throw new TypeError('callChild is positional: callChild(pid | "all", src, opts)');
    }
    if (typeof src !== 'string') {
      throw new TypeError('callChild: src must be a string — the source of () => value');
    }
    if (opts === null || typeof opts !== 'object' || Array.isArray(opts)) {
      throw new TypeError('callChild: opts must be a plain object { timeoutMs }');
    }
    for (const k of Object.keys(opts)) {
      if (k !== 'timeoutMs') {
        throw new TypeError(`callChild: unknown opts key "${k}" — opts is { timeoutMs }`);
      }
    }
    const timeoutMs = opts.timeoutMs ?? 5000;

    // Delivery is per-child-mm, so the parent's own in-process message manager
    // is never a target; the wrapper's processType guard stays as a backstop.
    const parentPid = Services.appinfo.processID;
    const children = [];
    for (let i = 0; i < Services.ppmm.childCount; i++) {
      const mm = Services.ppmm.getChildAt(i);
      let pid = null;
      try { pid = mm.osPid; } catch (e) { }
      if (pid !== null && pid !== parentPid) children.push({ pid, mm });
    }
    const single = target !== 'all';
    const wanted = single ? children.filter((c) => c.pid === target) : children;
    if (single && wanted.length === 0) {
      throw new Error('callChild: no child process with pid ' + target
        + ' — children: [' + children.map((c) => c.pid).join(', ') + ']');
    }
    if (wanted.length === 0) return Promise.resolve([]);

    const msg = 'ffllm:call:' + (S._callSeq = (S._callSeq ?? 0) + 1);
    const uri = 'data:application/javascript,' + encodeURIComponent(buildWrapper(src, msg));

    return new Promise((resolve, reject) => {
      const pending = new Set(wanted.map((c) => c.pid));
      const results = [];
      let timer = null;
      const settle = (fn, v) => {
        Services.ppmm.removeMessageListener(msg, l);
        clearTimeout(timer);
        fn(v);
      };
      const l = (m) => {
        const d = m.data;
        if (!pending.has(d.pid)) return;
        pending.delete(d.pid);
        if (single) {
          if (d.error != null) {
            settle(reject, new Error(d.error + (d.stack ? '\n' + d.stack : '')));
          } else {
            settle(resolve, d.value);
          }
          return;
        }
        results.push(d);
        if (pending.size === 0) settle(resolve, results);
      };
      Services.ppmm.addMessageListener(msg, l);
      for (const c of wanted) c.mm.loadProcessScript(uri, false);
      timer = setTimeout(() => {
        if (single) {
          settle(reject, new Error('callChild: timeout after ' + timeoutMs + 'ms (pid ' + target + ')'));
        } else {
          for (const pid of pending) results.push({ pid, timeout: true });
          settle(resolve, results);
        }
      }, timeoutMs);
    });
  };

  S.callChild = callChild;
})();
