// ff-llm primitive: hook — stand in any Firefox function's path and capture its calls.
//
// The active counterpart of tap. A tap watches a seam; a hook stands in it —
// the wrapper sees the arguments and may change them, change the return value,
// or not call through at all.
//
// The primitive knows no seams and should not. A catalogue of interposition
// points is a table that rots every Firefox release, and introspect exists so
// the agent can re-derive one against the running browser instead. So the agent
// brings the seam, as an install closure that attaches however it likes and
// returns the closure that detaches. What hook owns is what outlives the call:
// the registry, the undo the agent cannot hold, and capture.js.
//
//   await hook(id, install, opts) -> JSON { id, installed, undo, replaced,
//     prior? }  prior is the replaced hook's final report
//     install  (rec) => uninstall
//              rec(value, subject) records one event and never throws; subject,
//              if given, is what `sample` inspects.
//              Return nothing and the hook is not undoable — reports say so.
//     opts     { sample: 1, max: 200, out: null, flushMs: 5000 }   see capture.js
//
//   await unhook(id) -> JSON    unhook() with no id removes every hook,
//     newest-first, so a stack on one target comes apart cleanly
//
//   Wrong-shaped arguments (non-string id, non-function install, unknown opts
//   keys) throw synchronously and kill the payload; a failing installer still
//   returns its { installed: false } report.
//
//   drain(id) is capture.js's and reads hooks and taps alike.
//
// Seams to reach for before patching anything, none of them special-cased here:
// nsITraceableChannel.setNewListener hands back the listener it replaces,
// http-on-modify-request is an observer topic Necko fires so listeners can
// alter the request, ChromeUtils.registerWindowActor has its own unregister.
// Replacing a JS property is the fallback for the frontend, where no extension
// point was ever designed — which is most of it.
//
// One seam is a backstop rather than a target. A well-formed call whose async
// phase fails after the sync frame has returned travels only in a promise
// nobody holds — silently, since agents cannot read the Browser Console.
// PromiseDebugging, a bare global in chrome realms, reports exactly those:
//
//   hook('rejections', (rec) => {
//     const obs = {
//       onLeftUncaught(p) {
//         let reason = '[unreadable]';
//         try { reason = String(PromiseDebugging.getState(p).reason); }
//         catch (e) {}
//         rec({ kind: 'left', id: PromiseDebugging.getPromiseID(p), reason }, p);
//         return false;
//       },
//       onConsumed(p) {
//         rec({ kind: 'consumed', id: PromiseDebugging.getPromiseID(p) });
//       },
//     };
//     PromiseDebugging.addUncaughtRejectionObserver(obs);
//     return () => PromiseDebugging.removeUncaughtRejectionObserver(obs);
//   }, { max: 200 })
//
// A handler attached in the same task as the rejection reports nothing — the
// benign pattern filters itself. A later handler reports a `left`/`consumed`
// pair with one id; only an unpaired `left` is a leak. The reason is readable
// only inside onLeftUncaught, and delivery lands a couple of event-loop turns
// after the fact — the next tool call is always late enough to see it.
// Validated Nightly 155.
//
// Two caveats stay the agent's to track. An undo restores what its install
// saved, so hooks stacked on one target must come off newest-first — bare
// unhook() does that on its own, but unhook(id) on a buried hook clobbers
// whoever wrapped after it. And any reference taken before the patch keeps
// calling the old function. Restarting Firefox is the backstop.
//
// Record every call, pass it through unchanged — a hook doing tap's job:
//
//   hook('loadURI', (rec) => {
//     const orig = gBrowser.loadURI;
//     gBrowser.loadURI = function (...args) {
//       rec(String(args[0]), args[0]);
//       return orig.apply(this, args);
//     };
//     return () => { gBrowser.loadURI = orig; };
//   })
//
// install is a closure rather than a target and a member name because some
// seams can only be taken from inside a notification: setNewListener works
// during http-on-examine-response and nowhere else, so that hook's install
// registers an observer and splices from the callback. Composing with tap
// needs no support here, only the freedom to run arbitrary attach code.
//
// Installed hooks are their own inventory — await describe('__ffllm.hooks')
// lists them, describe('__ffllm.hooks.<id>') shows one, and the undo's full
// source is describe('__ffllm.hooks.<id>.uninstall') away.
(() => {
  const S = (globalThis.__ffllm ??= { installedAt: Date.now() });
  // Null prototype: ids like "toString" must not collide with inherited keys.
  S.hooks = Object.assign(Object.create(null), S.hooks);

  // Only the body is async — replacing a hook awaits the outgoing one's last
  // flush. The function itself must not be: a shape error has to throw
  // synchronously in the caller's frame, where it kills the whole payload,
  // not seal itself into a promise a bare call is free to drop.
  const hook = (id, install, opts = {}) => {
    if (typeof id !== 'string') {
      throw new TypeError('hook is positional: hook(id, install, opts)' +
        (id !== null && typeof id === 'object'
          ? ' — did you mean hook(o.id, o.install, o.opts)?' : ''));
    }
    if (typeof install !== 'function') {
      throw new TypeError('hook: install must be a function (rec) => uninstall');
    }
    if (opts === null || typeof opts !== 'object' || Array.isArray(opts)) {
      throw new TypeError('hook: opts must be a plain object { sample, max, out, flushMs }');
    }
    for (const k of Object.keys(opts)) {
      if (!['sample', 'max', 'out', 'flushMs'].includes(k)) {
        throw new TypeError(
          `hook: unknown opts key "${k}" — opts is { sample, max, out, flushMs }`);
      }
    }
    S._capture.checkOpts(opts);
    return (async () => {
      if (S.taps && id in S.taps) {
        return JSON.stringify({ id, installed: false, error: 'id already names a tap' });
      }
      let prior;
      if (id in S.hooks) [prior] = await S._capture.remove(S.hooks, id);

      const entry = S._capture.open(opts);
      // Reached through S at call time so reloading capture.js fixes live hooks,
      // and swallowing here because the wrapper is on someone's critical path:
      // a throw out of rec would surface as a failure in whatever was hooked.
      const rec = (value, subject) => {
        try { S._capture.record(entry, value, subject); }
        catch (e) { entry.recordError = String(e); }
      };

      // Attaching is the agent's code and may fail; registering a hook that never
      // installed would leave an undo that undoes nothing.
      let uninstall;
      try { uninstall = install(rec); }
      catch (e) {
        const r = { id, installed: false, error: String(e) };
        if (prior) r.prior = prior;
        return JSON.stringify(r);
      }

      entry.uninstall = typeof uninstall === 'function' ? uninstall : null;
      S.hooks[id] = entry;
      const r = { id, installed: true, undo: !!entry.uninstall, replaced: !!prior };
      if (prior) r.prior = prior;
      return JSON.stringify(r);
    })();
  };

  const unhook = (id) => {
    if (id !== undefined && typeof id !== 'string') {
      throw new TypeError('unhook: id must be a string, or omitted to remove every hook');
    }
    return (async () =>
      JSON.stringify({ removed: await S._capture.remove(S.hooks, id) }))();
  };

  S.hook = hook;
  S.unhook = unhook;
})();
