// ff-llm capture: rings, sinks, and drain — where hook and tap events land and come back.
//
// Both primitives face the same problem once they are attached. Something
// happened, they are holding a live XPCOM object that mutates and is usually
// dead by the time the agent asks, and whatever is not copied right now is
// gone. So neither can be "buffer the events and filter later" — the reduction
// runs at capture, inside the notification or inside the wrapper. What the
// agent gets to keep is decided there and nowhere later.
//
// Everything downstream of that decision is the same for the two, so it lives
// here: the ring or the sink, the counters, drain, and the uninstall.
// tap.js and hook.js differ only in how they attach.
//
// A channel holds the uninstall because the agent cannot. Only serialized
// values cross the eval channel, so a function reference — the observer to
// unregister, the original of a patched method — has to be kept inside Firefox
// or the change is irreversible. Every seam has its own unregister
// (removeObserver, restoring a property, unregisterWindowActor); a channel does
// not care which one, it just calls what it was given.
//
//   await drain(id, opts) -> JSON { events, count, ... }   taps and hooks alike
//     opts { clear: true, limit: 0, redeliver: false }
//     Event times are ms since the channel was installed.
//
// Whether `out` is set changes what the buffer is for, and so what drain does.
// `out` names the sink: a string is a file path (JSONL appends), a function is
// called with each batch, and { write, tail?, label? } is the general form —
// write(batch) may return a promise, tail(n) is what drain reads back, label
// is what reports print as `out`. A sink without tail only forwards (a message
// sink: the record lives where the batches land), so drain on it flushes and
// accounts but returns no events, and the report says why. `flushMs` (default
// 5000) bounds how long a partial batch may wait for the next event.
//
// Without it the buffer is the only copy: `max` is a ring, the oldest events
// are dropped once it fills, and drain is the sole exit — FIFO, returning and
// removing the `limit` oldest, or all of them at 0. `clear: false` peeks
// instead. Anything not drained before the ring wraps is gone, and sizing `max`
// is a guess against an event rate nobody knows yet.
//
// A returned batch is not a received batch. The channel cannot tell an awaited
// drain from a fumbled one, and clear-on-return would make that mistake
// destructive — it did once, an unawaited call that consumed three events into
// a promise nobody read. So a ring drain parks what it hands out: the last
// non-empty batch stays replayable until the next non-empty batch overwrites
// it, `redeliver: true` prepends it to the answer (original `t` stamps, so an
// accidental double replay is detectable), and a drain that comes back empty
// while a copy exists says so with `replayable`. Recovery is one batch deep.
// A sink channel needs none of this — the sink's destination is the record.
//
// With it the destination is the record and the only thing held in memory is
// what has not been written yet; `max` is just a write batch size. drain
// flushes that, then reads the last `limit` records back through the sink's
// tail — so what it returns is the tail of the record itself rather than of
// some buffer, and `limit` is not silently capped by however much happened to
// be pending at that instant. The file sink's tail reads a bounded range from
// the end, so draining a channel that has been running all day costs the same
// as draining one installed a second ago.
//
// So with a sink `limit: 0` returns no events at all — flush and accounting
// only, and `clear` means nothing because reading back consumes nothing.
// Pulling an unbounded record back through the channel is the exact cost the
// sink exists to avoid, so asking for a tail should be deliberate. Since
// nothing is dropped the reports carry `flushed` where they carried `dropped`;
// a counter that changes meaning from "you lost data" to "all is well" while
// still reading 0 is worse than no counter.
//
// Writes are dispatched from a sync callback that cannot await them. IOUtils
// keeps same-path writes ordered on its own, so for the file sink the
// per-channel promise chain is not for ordering — it is so drain and remove
// can await every queued write and report a record that is actually complete;
// a custom sink gets its ordering from the same chain. A partial batch would
// otherwise sit in memory until the next event or drain; the flushMs timer
// flushes it, because the crash that loses the unwritten tail is the expected
// failure mode of a tool whose job is patching browser internals.
(() => {
  const S = (globalThis.__ffllm ??= { installedAt: Date.now() });

  // Empties the buffer into the sink. Returns the channel's write chain, so
  // callers that can wait know when the sink caught up; a failed write is
  // recorded on the entry rather than left to reject somewhere unrelated, and
  // the chain keeps running so one bad write does not silence the rest.
  const flush = (entry) => {
    if (entry.timer) { clearTimeout(entry.timer); entry.timer = null; }
    if (!entry.out || !entry.pend.length) return entry.pending;
    const batch = entry.pend.splice(0, entry.pend.length);
    entry.flushed += batch.length;
    entry.pending = entry.pending
      .then(() => sinkOf(entry).write(batch))
      .catch((e) => { entry.writeError = String(e); });
    return entry.pending;
  };

  // Last `n` records of a JSONL sink. Reads a byte range off the end rather
  // than the file, so cost tracks what was asked for and not how long the
  // channel has been running; a short file just yields fewer lines than the
  // budget.
  //
  // Deliberately not exposed. Once the events are a file on the agent's own
  // disk, reading it is `tail`/`grep`, and an in-Firefox file reader would be
  // coreutils duplicated across an RPC boundary. This exists so that drain can
  // flush and answer in one call, which the shell cannot do.
  const tailOfFile = async (path, n) => {
    let size;
    try { size = (await IOUtils.stat(path)).size; } catch (e) { return []; }
    const start = Math.max(0, size - Math.min(4 << 20, Math.max(64 << 10, n * 8192)));
    const bytes = await IOUtils.read(path, { offset: start, maxBytes: size - start });
    let text = new TextDecoder().decode(bytes);
    // Starting mid-file almost certainly lands mid-record; that head is not one.
    if (start > 0) text = text.slice(text.indexOf('\n') + 1);
    return text.split('\n').filter((l) => l).slice(-n)
      .map((l) => { try { return JSON.parse(l); } catch (e) { return { unparsed: l }; } });
  };

  const fileSink = (path) => ({
    label: path,
    write: (batch) => IOUtils.writeUTF8(path,
      batch.map((e) => JSON.stringify(e)).join('\n') + '\n', { mode: 'appendOrCreate' }),
    tail: (n) => tailOfFile(path, n),
  });

  // Built lazily from `out` and cached, so entries opened by an older
  // capture.js pick up a sink on their next flush.
  const sinkOf = (entry) =>
    entry.sink ??= typeof entry.out === 'string' ? fileSink(entry.out)
      : typeof entry.out === 'function' ? { label: entry.out.name || 'sink', write: entry.out }
      : { label: 'sink', ...entry.out };

  const open = (opts = {}) => ({
    max: opts.max ?? 200,
    sample: opts.sample ?? 1,
    out: opts.out ?? null,
    flushMs: opts.flushMs ?? 5000,
    installedAt: Date.now(),
    count: 0, dropped: 0, flushed: 0,
    buf: [], last: [], pend: [], pending: Promise.resolve(), timer: null,
    // Replaced by whatever installed the channel. A channel that never got one
    // is not undoable, and reports say so rather than pretending.
    uninstall: null,
  });

  // `value` is already reduced — tap ran its extractor, a hook's wrapper chose
  // what to pass. `subject` is the live object, kept only long enough for the
  // first `sample` events to carry a full inspect of it; that is what closes
  // the loop where the agent has to describe a shape it has never seen.
  const record = (entry, value, subject, extra) => {
    const ev = { t: Date.now() - entry.installedAt, ...extra };
    if (value !== undefined) ev.v = value;

    if (entry.sample > 0 && subject !== undefined) {
      entry.sample--;
      try { ev.sample = S.inspect ? S.inspect(subject, { qi: true, max: 120 }) : 'no inspect'; }
      catch (e) { ev.sample = { error: String(e) }; }
    }

    entry.count++;
    if (entry.out) {
      entry.pend.push(ev);
      if (entry.pend.length >= entry.max) flush(entry);
      else if (!entry.timer) {
        entry.timer = setTimeout(() => { entry.timer = null; flush(entry); },
          entry.flushMs ?? 5000);
      }
    } else {
      entry.buf.push(ev);
      while (entry.buf.length > entry.max) { entry.buf.shift(); entry.dropped++; }
    }
  };

  const report = (id, e, extra) => {
    const r = { id };
    if (e.topic) r.topic = e.topic;
    r.count = e.count;
    Object.assign(r, extra);
    if (e.out) { r.out = sinkOf(e).label; r.flushed = e.flushed; r.unwritten = e.pend.length; }
    else { r.dropped = e.dropped; r.remaining = e.buf.length; }
    if (e.writeError) r.writeError = e.writeError;
    if (e.recordError) r.recordError = e.recordError;
    if (e.uninstallError) r.uninstallError = e.uninstallError;
    return r;
  };

  // Detach and forget, for either registry. Uninstall runs before the entry
  // leaves the registry so a throw is still attributable, and the flush runs
  // after: past this point the entry is unreachable, so an unwritten tail would
  // be destroyed rather than merely late.
  //
  // Remove-all unwinds newest-first: an undo restores what its install saved,
  // so hooks stacked on one target only come apart in reverse install order —
  // insertion order would resurrect the inner wrapper after restoring stock.
  const remove = async (reg, id) => {
    const removed = [];
    for (const k of id === undefined ? Object.keys(reg).reverse() : [id]) {
      const e = reg[k];
      if (!e) continue;
      if (e.uninstall) {
        try { e.uninstall(); } catch (err) { e.uninstallError = String(err); }
      } else {
        e.uninstallError = 'no undo was registered; restart Firefox to be sure';
      }
      delete reg[k];
      await flush(e);
      removed.push(report(k, e, {}));
    }
    return removed;
  };

  const drain = async (id, opts = {}) => {
    const o = { clear: true, limit: 0, ...opts };
    const e = (S.taps && S.taps[id]) || (S.hooks && S.hooks[id]);
    if (!e) {
      return JSON.stringify({
        error: 'no such tap or hook: ' + id,
        taps: Object.keys(S.taps || {}), hooks: Object.keys(S.hooks || {}),
      });
    }

    let events;
    if (e.out) {
      await flush(e);
      const sink = sinkOf(e);
      events = o.limit > 0 && sink.tail ? await sink.tail(o.limit) : [];
    } else {
      e.last ??= []; // entries opened by an older capture.js
      const n = o.limit > 0 ? Math.min(o.limit, e.buf.length) : e.buf.length;
      events = o.clear ? e.buf.splice(0, n) : e.buf.slice(0, n);
      if (o.redeliver && e.last.length) events = e.last.concat(events);
      // An empty batch never overwrites the copy — the retry that comes up
      // empty is exactly the caller who still needs it.
      if (o.clear && events.length) e.last = events;
    }
    // Reported before the reset, or `dropped` reads 0 in the one report whose
    // job is to say the ring wrapped and the agent is holding an incomplete
    // record. It counts losses since the previous drain, not since install.
    const r = report(id, e, { returned: events.length });
    if (e.out && o.limit > 0 && !sinkOf(e).tail) {
      r.note = 'sink has no tail; the record lives where the batches land';
    }
    if (!e.out && !events.length && e.last.length) r.replayable = e.last.length;
    if (o.clear && !e.out) e.dropped = 0;
    r.events = events;
    return JSON.stringify(r);
  };

  // Sink-facing opts are validated here, shared by hook and tap so a wrong
  // shape dies synchronously in the caller's frame, not inside a dropped
  // promise.
  const checkOpts = (opts) => {
    const o = opts.out;
    if (o !== undefined && o !== null && typeof o !== 'string' && typeof o !== 'function'
        && !(typeof o === 'object' && typeof o.write === 'function')) {
      throw new TypeError(
        'out must be a file path, a batch function, or { write, tail?, label? }');
    }
    if (opts.flushMs !== undefined
        && !(typeof opts.flushMs === 'number' && opts.flushMs > 0)) {
      throw new TypeError('flushMs must be a positive number of milliseconds');
    }
  };

  // Reached through S at call time, never captured in an installed closure, so
  // reloading this file fixes capture for taps and hooks already running.
  S._capture = { open, record, flush, report, remove, checkOpts };
  S.drain = drain;
})();
