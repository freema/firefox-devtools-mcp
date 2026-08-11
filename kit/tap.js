// ff-llm primitive: tap — watch an observer topic and keep what the notifications carry.
//
// Passive observation of an observer-service topic. Installing is addObserver
// and removing is removeObserver; everything between them — reducing at
// capture, the buffer or the sink, drain — is capture.js.
//
// Because the reduction runs inside the notification, the agent has to know the
// subject's shape before it has ever seen one. That is what `sample` is for:
// the first N notifications also carry a full introspect of the live subject, QI
// list included. Read it, write a real extractor, re-tap. Retapping the same id
// replaces the old tap in place; the outgoing tap's final report — including
// how many undrained events it took with it — returns as `prior`.
//
// Only observer topics for now. Event listeners and nsIWebProgressListener are
// the other passive seams and are not wired up. A topic that exists to be
// intervened in rather than watched — http-on-modify-request — is a hook even
// though addObserver installs it; the mechanism does not decide which primitive
// it is, the wrapper's licence to change the outcome does.
//
//   await tap(topic, opts) -> JSON { id, topic, replaced, prior? }
//     opts { extract: (subject, data, topic) => any   default: ctor + toString
//            sample, max, out, flushMs   see capture.js
//            id }               defaults to the topic
//
//   await untap(id) -> JSON    untap() with no id removes every tap
//
//   Wrong-shaped arguments (non-string topic, unknown opts keys) throw
//   synchronously and kill the payload.
//
// Installed taps are their own inventory — await describe('__ffllm.taps')
// lists them, describe('__ffllm.taps.<id>') shows one, and the extractor's
// full source is describe('__ffllm.taps.<id>.extract') away. There is no
// separate ledger to drift out of sync with the process.
(() => {
  const S = (globalThis.__ffllm ??= { installedAt: Date.now() });
  // Null prototype: ids like "toString" must not collide with inherited keys.
  S.taps = Object.assign(Object.create(null), S.taps);

  // Reloading only reassigns what the new version installs, so anything an
  // older one left behind stays callable until deleted here or the browser
  // restarts. Retiring a name means saying so.
  //
  //   obs/buf/max/installed  the hand-written http-on-examine-response observer
  //                          this primitive generalizes; it had no removal path
  //   tail                   briefly public, now internal — capture.js
  //   _record                moved to _capture.record, along with the rest of
  //                          the machinery hook turned out to need too
  if (S.obs) {
    try { Services.obs.removeObserver(S.obs, 'http-on-examine-response'); } catch (e) { }
    delete S.obs; delete S.buf; delete S.max; delete S.installed;
  }
  delete S.tail;
  delete S._record;

  const summary = (v) => {
    if (v === null || (typeof v !== 'object' && typeof v !== 'function')) return v;
    const out = {};
    try { out.ctor = (v.constructor && v.constructor.name) || null; } catch (e) { }
    try {
      const s = String(v);
      if (s !== '[object Object]') out.str = s.length > 200 ? s.slice(0, 200) + '…' : s;
    } catch (e) { }
    return out;
  };

  // Only the body is async — replacing a tap awaits the outgoing one's last
  // flush. The function itself must not be: a shape error has to throw
  // synchronously in the caller's frame, where it kills the whole payload,
  // not seal itself into a promise a bare call is free to drop.
  const tap = (topic, opts = {}) => {
    if (typeof topic !== 'string') {
      throw new TypeError('tap is positional: tap(topic, opts)' +
        (topic !== null && typeof topic === 'object'
          ? ' — pass the topic string first, everything else in opts' : ''));
    }
    if (opts === null || typeof opts !== 'object' || Array.isArray(opts)) {
      throw new TypeError(
        'tap: opts must be a plain object { extract, sample, max, out, flushMs, id }');
    }
    for (const k of Object.keys(opts)) {
      if (!['extract', 'sample', 'max', 'out', 'flushMs', 'id'].includes(k)) {
        throw new TypeError(
          `tap: unknown opts key "${k}" — opts is { extract, sample, max, out, flushMs, id }`);
      }
    }
    S._capture.checkOpts(opts);
    if (opts.extract !== undefined && typeof opts.extract !== 'function') {
      throw new TypeError(
        'tap: extract must be a function (subject, data, topic) => any');
    }
    if (opts.id !== undefined && typeof opts.id !== 'string') {
      throw new TypeError('tap: id must be a string');
    }
    return (async () => {
      const o = { extract: summary, id: topic, ...opts };
      if (S.hooks && o.id in S.hooks) {
        return JSON.stringify({ id: o.id, topic, error: 'id already names a hook' });
      }
      let prior;
      if (o.id in S.taps) [prior] = await S._capture.remove(S.taps, o.id);

      const entry = S._capture.open(opts);
      entry.topic = topic;
      entry.extract = o.extract;

      // A throw here would propagate into whatever Firefox code sent the
      // notification, so nothing in the callback is allowed to escape.
      entry.observer = {
        observe(subject, obsTopic, data) {
          try {
            const extra = {};
            if (obsTopic !== topic) extra.topic = obsTopic;
            if (data !== null && data !== undefined && data !== '') extra.data = data;

            let value;
            try { value = entry.extract(subject, data, obsTopic); }
            catch (e) { extra.error = String(e); }

            S._capture.record(entry, value, subject, extra);
          } catch (e) { }
        },
      };

      Services.obs.addObserver(entry.observer, topic, false);
      entry.uninstall = () => Services.obs.removeObserver(entry.observer, topic);
      S.taps[o.id] = entry;
      const r = { id: o.id, topic, replaced: !!prior };
      if (prior) r.prior = prior;
      return JSON.stringify(r);
    })();
  };

  const untap = (id) => {
    if (id !== undefined && typeof id !== 'string') {
      throw new TypeError('untap: id must be a string, or omitted to remove every tap');
    }
    return (async () =>
      JSON.stringify({ removed: await S._capture.remove(S.taps, id) }))();
  };

  S.tap = tap;
  S.untap = untap;
})();
