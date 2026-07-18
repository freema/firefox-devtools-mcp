# Validation: turning guesses into measurements

Use this when a "likely" or "hypothesis" finding matters enough to act on, or to get a reliable metric for a before/after comparison. Instrumentation goes into the user's source where there is source to edit, and through `evaluate_script` otherwise.

## Bracket the operation with User Timing

Marks and measures appear both as markers in the next captured profile and via `performance.getEntriesByType('measure')`.

**If the user's source is available, put the marks there instead.** They then measure only the operation, can wrap code you cannot reach from the outside, survive a navigation, and are still in place for the after-fix capture, so both runs measure the same span.

With no source to edit, bracket from outside while the profiler records:

1. `performance.mark('before')`, then perform the STR step with the automation tools.
2. `performance.mark('after')` and `performance.measure('op', 'before', 'after')`.
3. Read back with `evaluate_script function="() => performance.getEntriesByType('measure').map(m => ({name: m.name, dur: m.duration}))"`, and find the same span in the profile with `thread markers --search op`.

Those are three separate tool calls, so the measure also contains the MCP round-trips and your own thinking time between them. Treat it as a way to locate the span in the profile, not as the operation's cost.

A measured duration matching the sampled cost confirms the finding; a mismatch means sampling misattributed it, which is common with inlined or minified code.

## LCP and Event Timing

Firefox might not support every entry type Chrome does, and `observe()` ignores an unsupported one with a console warning and no exception - you get an empty result that reads like a clean bill of health. Check before relying on one, rather than assuming the Chrome set:

`evaluate_script function="() => PerformanceObserver.supportedEntryTypes"`

Anything missing from that list has to come from the profile instead.

An observer needs a document, and `evaluate_script` runs in the *current* one - a navigation destroys it along with anything on `window`. For a page load, install the observer *after* the navigation settles; `buffered: true` replays entries that already fired, so nothing is missed. For an STR, install it before the action.

```
evaluate_script function="() => { window.__perf = {lcp: 0, events: []}; new PerformanceObserver(l => { for (const e of l.getEntries()) window.__perf.lcp = e.startTime; }).observe({type: 'largest-contentful-paint', buffered: true}); new PerformanceObserver(l => { for (const e of l.getEntries()) window.__perf.events.push({name: e.name, dur: e.duration}); }).observe({type: 'event', buffered: true, durationThreshold: 16}); }"
```

Read back with `evaluate_script function="() => window.__perf"`. The last LCP entry wins; `event` entries give per-interaction latency.
