# Capture recipes

Record the right profile per scenario. If a capture misses the slow moment or is mostly idle, re-capture instead of salvaging it.

Applies to every recipe:
- Firefox launches lazily on the first MCP call (`list_pages`, `get_firefox_info`). Reuse the existing session and tab; only `new_page` / `navigate_page` for a different page or a clean state.
- `preset="web-developer"` is the usual choice for `profiler_start`, but it does not record the networking threads. A network-shaped problem (slow TTFB, connection or TLS setup, DNS, cache misses) might want `networking` instead. Use `firefox-platform` when the target is Firefox itself, another preset when the problem sits squarely in its domain, or explicit `entries`/`interval`/`features`/`threads` when none of them fit.
- `profiler_stop` saves to Firefox's downloads directory and returns the path. Keep it.
- If nothing records, check `profiler_is_active` and confirm Firefox is 154+.

## Page load

The recording should span one navigation with nothing before it.

1. `navigate_page url="about:blank"`, so the navigation is captured from the start.
2. `profiler_start`.
3. `navigate_page url="https://the-page"` - this navigation is the whole recording.
4. Wait for the page to finish, then stop promptly without recording an idle tail. There is no wait tool, so poll: `evaluate_script function="() => [document.readyState, performance.getEntriesByType('navigation')[0]?.loadEventEnd]"`, or `screenshot_page`.
5. `profiler_stop`.

Caching caveat: this is a clean navigation but not a cold load. The session shares Firefox's HTTP cache, and `about:blank` or a new tab does not clear it. Neither can you: there is no cache-clearing or private-window tool. So either:
- label the finding a warm-cache load, or
- for a real first visit, `restart_firefox` with `profilePath` set to a fresh empty directory - a new profile starts with an empty cache, but it closes every tab and drops cookies and logins, so it is no good for authenticated pages.

Confirm which one you got instead of assuming: in `thread network`, a cold load shows real DNS/connect/download phases for subresources, a warm one near-zero fetch time.

Warm variant (repeat visit): navigate to the URL and let it settle first, then start the profiler and navigate to it again. The second navigation is the measured one.

## Interaction or STR

Record the action, not the setup.

1. `navigate_page` to the state right before the slow action. Do NOT perform it yet.
2. `take_snapshot` to resolve the UIDs you will need, so the recorded window is only the action.
3. `profiler_start`.
4. Perform exactly the steps the user reports as slow, in order, with the automation tools.
5. `profiler_stop` as soon as the slow result is visible.

If the DOM changed and you need a fresh snapshot mid-recording, `take_snapshot` again; it does not meaningfully pollute the profile.

## Ongoing jank (scroll, animation, CPU pinning)

1. `navigate_page` to the janky page and state.
2. `profiler_start`.
3. Reproduce the jank for a few representative seconds. Drive the scrolling if you can, otherwise ask the user to scroll while recording.
4. `profiler_stop`.

## Re-capturing to verify a fix

The second capture must be like-for-like or the comparison is meaningless:
- Same recipe, URL, STR steps and window length.
- Same cache warmth and page state; a cold-vs-warm difference will swamp the fix.
- Ideally the same `performance.mark`/`measure` instrumentation (see `validation.md`), so you compare the same measured span rather than two eyeballed windows.
