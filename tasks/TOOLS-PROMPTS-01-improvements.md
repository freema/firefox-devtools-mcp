# TOOLS-PROMPTS-01: MCP Tool Prompt Improvements (Descriptions)

Goal
- Improve MCP tool descriptions in `src/tools/` to be concise, actionable, and consistent. Keep them English‑only, agent‑friendly, and aligned with actual behavior. Below are per‑tool proposed descriptions ready to paste into `description` fields.

General Style
- First sentence: what the tool does (1 line).
- Follow‑up: when to use, key tips, constraints. Avoid long disclaimers.
- Use “TIP:” sparingly for critical guidance.

Note on Network Scope
- Current implementation collects requests across all tabs (global subscribe). If we keep it, descriptions should say “across all tabs”. If we later scope to the selected tab, update text accordingly.

Pages
- list_pages
  Proposed:
  "List all open tabs with index, title, and URL. The currently selected tab is marked. Use the index with select_page."

- refresh_pages
  Proposed (if kept temporarily):
  "Deprecated: Use list_pages to refresh and show the current tab list."

- new_page
  Proposed:
  "Open a new tab and navigate it to the provided URL. Returns the new tab index in the response."

- navigate_page
  Proposed:
  "Navigate the currently selected tab to the provided URL."

- select_page
  Proposed:
  "Select the active tab by index (preferred), or by matching URL/title. Index takes precedence when multiple parameters are provided."

- close_page
  Proposed:
  "Close the tab at the given index. Use list_pages to find valid indices."

Console
- list_console_messages
  Proposed:
  "List console messages for the selected tab since the last navigation. Use filters (level, limit, sinceMs) to focus on recent and relevant logs."

- clear_console_messages
  Proposed:
  "Clear the collected console messages. TIP: Clear before a new measurement to keep output focused."

Network (Always‑On)
- list_network_requests
  Proposed (global capture wording):
  "List recent network requests across all tabs. Network capture is always on. Use filters (limit, sinceMs, urlContains, method, status, resourceType) and detail (summary|min|full) to control output. Each entry includes a stable id for use with get_network_request."

- get_network_request
  Proposed:
  "Get detailed information about a network request by id (recommended). URL lookup is available as a fallback but may match multiple requests."

Performance
- performance_get_metrics
  Proposed:
  "Deprecated: This server does not provide performance tooling via MCP. Use the Firefox DevTools Performance panel instead."

- performance_start_trace / performance_stop_trace
  Proposed:
  "Removed: Performance tracing is not supported via WebDriver BiDi in this server."

Snapshot / UID
- take_snapshot
  Proposed:
  "Capture a textual page snapshot with stable UIDs for elements. Always take a fresh snapshot after navigation or major DOM changes. TIP: Use the UIDs with click_by_uid / fill_by_uid / hover_by_uid. The output may be truncated for readability."

- resolve_uid_to_selector
  Proposed:
  "Resolve a UID to a CSS selector (debugging aid). Fails on stale UIDs—take a fresh snapshot first."

- clear_snapshot
  Proposed:
  "Clear the snapshot/UID cache. Usually not needed, as navigation invalidates snapshots automatically."

Input (UID‑based)
- click_by_uid
  Proposed:
  "Click an element identified by its UID. Supports double‑click via dblClick=true. TIP: Take a fresh snapshot if the UID becomes stale."

- hover_by_uid
  Proposed:
  "Hover over an element identified by its UID. TIP: Take a fresh snapshot if the UID becomes stale."

- fill_by_uid
  Proposed:
  "Fill a text input or textarea identified by its UID. Keep values short and safe. TIP: Take a fresh snapshot if the UID becomes stale."

- drag_by_uid_to_uid
  Proposed:
  "Simulate HTML5 drag‑and‑drop from one UID to another using JS drag events. May not work with all custom libraries."

- fill_form_by_uid
  Proposed:
  "Fill multiple form fields in one call using an array of {uid, value} pairs."

- upload_file_by_uid
  Proposed:
  "Upload a file into an <input type=\"file\"> element identified by its UID. The file path must be accessible to the server."

Screenshot
- screenshot_page
  Proposed:
  "Capture a PNG screenshot of the current page and return it as a base64 string (without data: prefix). TIP: Use for visual verification rather than structural inspection."

- screenshot_by_uid
  Proposed:
  "Capture a PNG screenshot of a specific element by UID and return it as a base64 string (without data: prefix). TIP: Take a fresh snapshot if the UID is stale."

Utilities
- accept_dialog
  Proposed:
  "Accept the active browser dialog (alert/confirm/prompt). For prompts, you may provide promptText. Returns an error if no dialog is open."

- dismiss_dialog
  Proposed:
  "Dismiss the active browser dialog (alert/confirm/prompt). Returns an error if no dialog is open."

- navigate_history
  Proposed:
  "Navigate the selected tab’s history back or forward. NOTE: After navigation, UIDs from previous snapshots are stale—take a new snapshot before UID‑based actions."

- set_viewport_size
  Proposed:
  "Set the browser viewport size (width x height in pixels). In some modes (e.g., headless), the actual size may vary slightly."

Script (Disabled by default)
- evaluate_script
  Proposed:
  "Execute a JavaScript function in the selected tab and return its JSON‑serializable result. Use with caution; prefer snapshot+UID tools for interactions. This tool may be disabled by default."

Appendix: Notes vs Chrome Reference
- Chrome reference tools skew minimal (one‑liners). The above keeps one‑liner intent while adding brief guidance where it materially helps agents (e.g., stable id, snapshot staleness). Avoid protocol caveats; leave those for docs.

Next Steps
- If approved, I can apply these descriptions directly in `src/tools/*.ts` (and remove refresh_pages + performance tools per earlier tasks).
