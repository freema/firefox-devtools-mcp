# ACTIONS-01: Google Actions – Outline (Inspiration from old/mcp_gsheet)

Goal
- Prepare Google Actions (tool/action definitions) for Firefox DevTools MCP, using old/mcp_gsheet only as inspiration for style and structure. Do NOT integrate the gsheet server; keep focus on Firefox tools.

Principles
- English-only names and descriptions.
- Minimal, useful action surface (fewer is better).
- Plain JSON Schema inputs; consistent error text.

Scope (Phase 1)
- Actions for the most valuable flows only:
  - Pages: `list_pages`, `select_page`, `navigate_page`, `new_page`, `close_page`.
  - Snapshot/UID: `take_snapshot`, `resolve_uid_to_selector`.
  - Input: `click_by_uid`, `fill_by_uid`, `hover_by_uid`, `drag_by_uid_to_uid`, `fill_form_by_uid`, `upload_file_by_uid`.
  - Network: `list_network_requests`, `get_network_request` (always-on model, succinct outputs).
  - Console: `list_console_messages`, `clear_console_messages`.
  - Screenshot: `screenshot_page`, `screenshot_by_uid`.
  - Utilities: `accept_dialog`, `dismiss_dialog`, `navigate_history`, `set_viewport_size`.

Out of scope (Phase 1)
- Performance tools (removed/deprecated).
- Any Google Sheets integration.

Deliverables
- Action descriptors (names, descriptions, JSON Schema) aligned with `src/tools/*`.
- Guidance: when to call which action, tips for staleness (snapshot/UID), and network filters.

Acceptance Criteria
- Action list is small, clear, in English, and mirrors current Firefox tool behavior.
- Ready for publishing without bumping to 1.x (keep pre-1.0).

