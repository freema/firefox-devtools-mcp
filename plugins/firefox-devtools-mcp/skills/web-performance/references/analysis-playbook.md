# Analysis playbook

Turning a loaded profile into web-platform findings. Assumes `profiler-cli guide` has been read in full (it documents the flags used here) and the profile is loaded.

## Select the right thread

Start on the content process main thread: the `GeckoMain` thread of the `Isolated Web Content [<url>]` process serving the page. Most of the script, layout and paint work a user feels is there. Cross-origin iframes get their own content process, so third-party work (ads, embeds) sits under a different one; worker cost sits on `DOM Worker` threads.

That is where to start, not where to stop. Depending on the problem:

- **Network.** The request is not content-process work at all. `GeckoMain` in the parent process drives navigation and channel setup, and `Socket Thread` does connection, TLS and transfer, with `DNS Resolver`, `TRR Background` and `Cache2 I/O` next to it - in the parent, or in a separate `Socket` process when the build runs one. A content thread sitting idle while requests are in flight means the answer is on those threads.
- **Scrolling, animation, dropped frames.** `Compositor`, `Renderer` and the GPU-process threads, alongside the content main thread.
- **Firefox itself as the target.** Any platform thread can be the subject, most often parent `GeckoMain`.

A thread is only in the profile if the capture recorded it: the `web-developer` preset leaves out the networking threads, so a network question usually needs a re-capture with `preset="networking"`.

## Start here

**Page-load captures:** `thread page-load` gives navigation timing, FCP/LCP, resources, CPU and jank periods in one view, and its marker handles feed `zoom push` and `marker info`. "No page load markers found in this thread" means the capture has no navigation or the thread is wrong - it is not a verdict about the page.

**Interaction and jank captures** never navigate, so `page-load` returns nothing for them. Enter through markers:

```
profiler-cli thread markers --min-duration 50 --list   # long intervals, chronological
profiler-cli zoom push m-<handle>                      # onto the worst one
profiler-cli thread samples-top-down                   # what ran during it
```

Blocking main-thread work appears as a long `Runnable`, or `Perform microtasks`. `DOMEvent` markers locate the interaction. Ignore long-lived span markers that are not blocking work: `Image Animation` (one animating GIF spans the whole recording), `IPC Accumulator`. `--has-stack` with `marker stack <handle>` gives the stack that belongs to a marker.

## Minified bundles: apply the source map first

If JS frames show mangled names (`a`, `t.exports`), de-minify before reading stacks.

```
profiler-cli sourcemap sources                  # bundles with a source map, as src-N, plus their sourceMapURL
profiler-cli sourcemap apply dist/bundle.js.map
```

`apply` reads a local file, it does not fetch: take the `.map` from the user's build output, and if `sources` shows a remote `sourceMapURL`, download it first. It rewrites stacks in place, so apply before reading call trees. The guide's SOURCE MAPS section covers `--to src-N` and ambiguous matches. With no map, keep findings at function level - mangled names do not support line-level claims.

## Symptom -> where to look

**Do not limit yourself to the categories below.** They are the common cases, not a list of the problems a profile can answer. The data decides what the problem is; if the symptom does not match any of them, or the profile points somewhere else, follow the profile. Forcing a finding into one of these buckets is how you end up reporting the wrong cause.

**Slow first paint / LCP / content appears late.** `thread page-load` for which phase dominates. Before first byte is server or network; between response and paint is client work. `thread markers` shows when paint, DOMContentLoaded and load actually fired.

**Long tasks / blocked main thread / unresponsive UI.** Take long tasks from the profile: `page-load` jank periods for a navigation capture, the marker route above otherwise. `samples-bottom-up` complements the top-down tree by showing hot leaf functions and their callers. If the hot frames are framework internals (render, reconcile, hydrate), look for too many or too expensive components rather than one slow function.

**Heavy JavaScript.** `thread functions` for a flat list by CPU percentage, `samples-top-down` for the tree, `function annotate <handle>` for per-line timing, `function expand <handle>` for a truncated name.

**Layout thrashing / forced reflow.** In `samples-top-down`, look for reflow/layout/style-recalc frames interleaved with script - that pattern is a script reading layout, writing, then reading again, forcing synchronous reflow. `thread markers` shows how often layout and reflow markers fire. Then find the read-write-read loop in the source.

**Slow or render-blocking network.** `thread network` gives per-request timing phases (DNS, connect, TLS, wait, download) for the selected thread. Look for render-blocking CSS/JS in the head, long TTFB, request chains where each waits on the previous, and duplicate downloads. When the cost is in the transfer itself rather than in how the page requested it, follow it onto the parent's `GeckoMain` and `Socket Thread` as described above. The profile has timing but not response headers, so for `content-encoding`, `cache-control` and `content-type` - what tells you whether an asset is actually compressed or cacheable - use the MCP's `list_network_requests` and `get_network_request`.

**User Timing.** `thread markers` shows the developer's `performance.mark`/`measure` alongside platform markers; `marker info` and `marker stack` give one marker's detail and its stack.

**Anything else.** Let the profile pick the direction: `profile info` for which process and thread actually burned CPU or stalled, then markers and samples on that thread.

## Before recommending a fix

Correlate the hot stack with markers and network timing. A stack alone says what ran, rarely why it ran.
