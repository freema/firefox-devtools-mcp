# Rejection observer — every uncaught rejection in the privileged realm, as drainable evidence

A standing `hook` that turns every promise rejection left uncaught in the
privileged realm into a drainable event. Zero new machinery: the seam is
`PromiseDebugging`; ring, drain and undo are the kit's. Validated against
Nightly 155.0a1 (buildID 20260731085738) on 2026-08-03.

The kit's wrong-shape guards throw synchronously, so a malformed call kills
its payload; what they cannot catch is a well-formed call whose async phase
fails after the sync frame has returned. That failure travels only in the
returned promise, and a promise nobody holds drops it silently — and this
environment has no other backstop, since agents cannot read the Browser
Console. This observer is the backstop: installed once, every rejection
nobody handled becomes an event in an ordinary capture ring.

## What it stands on

`PromiseDebugging` is a bare global in the browser.xhtml realm — chrome-only,
nothing to import. Members: `getState`, `getPromiseID`, `getAllocationStack`,
`getRejectionStack`, `getFullfillmentStack` (the triple-l is the real IDL
spelling), `addUncaughtRejectionObserver`, `removeUncaughtRejectionObserver`.

`addUncaughtRejectionObserver(obs)` reports through two callbacks:

- `obs.onLeftUncaught(p)` — `p` was rejected and finished its task with no
  handler. Delivery rides a dispatched runnable and lands about two
  event-loop turns after the fact (measured sub-ms); a following tool call
  is always late enough to see it. There is no JS-callable flush —
  `flushUncaughtRejections` is C++-only and asserts off-main-thread
  (`dom/promise/PromiseDebugging.cpp:179`).
- `obs.onConsumed(p)` — a previously reported promise later got a handler.

Three behaviors the recipe leans on, all confirmed live:

- A `.catch` attached in the same task as the rejection produces no events
  at all — the common benign pattern is auto-invisible.
- A handler attached in a later task produces an ordered pair,
  `onLeftUncaught` then `onConsumed`, with the same `getPromiseID` (a string
  like `PromiseDebugging.0.593`). Only an unpaired `left` is a real leak;
  correlate by id across drains, since a drain between the two clears the
  `left` out first.
- `onConsumed` carries no reason. The reason must be read in
  `onLeftUncaught` via `getState(p).reason`, while the promise is at hand —
  that is what makes it survive into the buffer.

Returning `true` from `onLeftUncaught` is documented in the IDL to suppress
the console report, but is dead on the main thread: the console message
comes from an independent path (`CycleCollectedJSContext::
AfterProcessMicrotasks`, `xpcom/base/CycleCollectedJSContext.cpp:539`).
Return `false` and expect the console line regardless.

## Install

An ordinary hook; ring, drain and file sink are capture.js's:

```js
await __ffllm.hook('rejections', (rec) => {
  const obs = {
    onLeftUncaught(p) {
      let reason = '';
      try { reason = String(PromiseDebugging.getState(p).reason); }
      catch (e) { reason = '[unreadable]'; }
      rec({ kind: 'left', id: PromiseDebugging.getPromiseID(p), reason }, p);
      return false;
    },
    onConsumed(p) {
      rec({ kind: 'consumed', id: PromiseDebugging.getPromiseID(p) });
    },
  };
  PromiseDebugging.addUncaughtRejectionObserver(obs);
  return () => PromiseDebugging.removeUncaughtRejectionObserver(obs);
}, { max: 200 });
```

## Use

```js
// one call leaks:
Promise.reject(new Error('ffllm-leak-A')); return 'leaked';
// any later call drains:
return await __ffllm.drain('rejections');
```

The drained event, verbatim from the validation run:

```json
{ "kind": "left", "id": "PromiseDebugging.0.593", "reason": "Error: ffllm-leak-A" }
```

The first event also carries a full inspect of the promise (`sample: 1`
default) — about 700 bytes, once. `unhook('rejections')` detaches cleanly:
after it, a deliberately leaked rejection produced a console error and no
event.

## Noise

Idle headless bench, ~40 s window: zero unrelated rejections. An earlier
probe on the same build, with activity in the session: about 3 unrelated
rejections per minute. Filter by reason string and treat only unpaired
`left` events as leaks.

Incidental from the same probe: `Cu.now` is undefined in this realm —
`ChromeUtils.now()` is the clock.
