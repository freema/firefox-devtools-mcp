# BiDi Coverage vs. Old Chrome Dev Tool Actions

Purpose: compare actions used in `old/mcp_dev_tool_chrome/src/tools` with BiDi capabilities and our current MCP tool coverage in `src/tools`.

Legend

- BiDi: Yes = supported by WebDriver BiDi or standard WebDriver APIs; Partial = doable with extra logic; No = not available in Firefox via BiDi
- Status: Implemented = available in `src/tools`; API present (backend missing) = tool exists but backend not wired; Missing = no tool yet; Not applicable = design diverges (CDP-specific)

Overall Summary

- Coverage: 19 Yes, 2 Partial, 5 No (out of 26 actions)
- Gaps to close next: Network monitoring backend, Snapshot+UIDs, Input actions, Page history/resize/dialog, Screenshot tool
- CDP-only items (not in BiDi): performance trace/insights, CPU/network emulation

Comparison Table

| Category | Old tool/action | BiDi | Status in `src/tools` | Notes |
|---|---|---|---|---|
| Console | `list_console_messages` | Yes | Implemented (`list_console_messages`) | Uses BiDi `log.entryAdded`; verified by `scripts/test-bidi-devtools.js` |
| Network | `list_network_requests` | Yes | API present (backend missing) | BiDi supports network events; backend in `src/firefox/devtools.ts` is stubbed |
| Network | `get_network_request` | Yes | API present (backend missing) | Needs request store + lookup by URL |
| Performance | `performance_start_trace` | No | Present (returns not supported) | Firefox BiDi doesn’t provide DevTools tracing like CDP |
| Performance | `performance_stop_trace` | No | Present (returns not supported) | — |
| Performance | `performance_analyze_insight` | No | Not applicable | Depended on CDP trace processing; out of scope for BiDi |
| Script | `evaluate_script` | Yes | Implemented (`evaluate_script`) | Direct `executeScript` passthrough |
| Screenshot | `take_screenshot` | Yes | Missing | Full-page easy via `driver.takeScreenshot()`; element crop needs extra logic |
| Snapshot | `take_snapshot` | Yes | Missing | Basic HTML snapshot via `executeScript`; prior UID structure needs custom walker |
| Snapshot | `wait_for` | Yes | Missing | Implement with `driver.wait()` and DOM check via JS |
| Input | `click` | Yes | Missing | Use WebDriver Actions or JS click once elements are locatable by UID/selector |
| Input | `hover` | Yes | Missing | Use pointer move + no button press |
| Input | `fill` | Yes | Missing | Focus + send keys; requires locators |
| Input | `drag` | Partial | Missing | Pointer actions sequence works; may be flaky without robust targeting |
| Input | `fill_form` | Yes | Missing | Batch of `fill` operations |
| Input | `upload_file` | Partial | Missing | For `<input type=file>`, send file path via `sendKeys`; chooser interception is trickier |
| Pages | `list_pages` | Yes | Implemented | Wrapper over window handles |
| Pages | `select_page` | Yes | Implemented | `switchTo().window(handle)` |
| Pages | `close_page` | Yes | Implemented | `driver.close()` + focus fallback |
| Pages | `new_page` | Yes | Implemented | `switchTo().newWindow('tab')` + `get(url)` |
| Pages | `navigate_page` | Yes | Implemented | `get(url)` |
| Pages | `navigate_page_history` | Yes | Missing | Use `driver.navigate().back()` / `.forward()` (or JS `history.go()`) |
| Pages | `resize_page` | Yes | Missing | `driver.manage().window().setRect({ width, height })` |
| Pages | `handle_dialog` | Yes | Missing | `switchTo().alert().accept()/dismiss()` + optional prompt text |
| Emulation | `emulate_network` | No | Not supported | CDP feature; no Firefox BiDi API for throttling/offline |
| Emulation | `emulate_cpu` | No | Not supported | CDP-only CPU throttling; not in Firefox BiDi |

What’s Already Verified by `scripts/test-bidi-devtools.js`

- Connect via BiDi, evaluate scripts, capture console logs, navigate, create/select tabs; basic performance metrics via page JS. Network/input/screenshot/snapshot are not exercised yet.

Recommended Next Steps (implementation order)

1) Network monitoring backend
- Subscribe to BiDi network events; buffer per tab; expose in `getNetworkRequests()`
- Enable/disable via `start_network_monitoring`/`stop_network_monitoring`

2) Snapshot + UID mapping
- Add `take_snapshot` tool that walks DOM, annotates nodes with stable `data-mcp-uid`, and returns a compact text/JSON snapshot
- Update `evaluate_script` and future input tools to resolve UIDs to elements

3) Input tools (click/hover/fill/drag/upload)
- Build on UID locators; use WebDriver Actions and element scripts
- Implement `upload_file` via sending local path to `<input type=file>`; fallback strategy for custom pickers as feasible

4) Screenshot tool
- Page screenshot via `driver.takeScreenshot()`; optionally implement element crop using bounding rect + Canvas

5) Page utilities
- `navigate_page_history`, `resize_page`, `handle_dialog`

6) Document CDP-only gaps
- Keep `performance_*` trace tools as informative no-op; explain Firefox pathway (DevTools Performance panel / profiler)
- Mark network/CPU emulation as unsupported in Firefox BiDi and suggest manual alternatives where relevant

References

- Old Chrome tools: `old/mcp_dev_tool_chrome/src/tools`
- Current MCP tools: `src/tools`
- BiDi wrapper: `src/firefox/devtools.ts`
- Migration notes: `docs/migration-to-bidi.md`
- BiDi test script: `scripts/test-bidi-devtools.js`

Fallbacky a priority (bez overkill)

- Performance trace → Performance API + lightweight metrics (střední)
- Network emulation → Proxy server (např. mitmproxy) (nízká)
- CPU emulation → OS-level throttling nebo skip (velmi nízká)
- Drag & Drop → JS events fallback (vysoká)
- File upload → sendKeys + JS unhide (vysoká)
