# ACTIONS-02: Google Actions – Mapping for Firefox Tools

Goal
- Produce the action mapping (name, description, input schema) directly from the current Firefox tools. Keep it concise and consistent.

Notes
- Use the finalized descriptions already present in `src/tools/*` (English-only).
- If an action returns large data (snapshot, screenshots, network JSON), consider a `format` or `detail` parameter where appropriate to reduce output volume.

Proposed Mapping (Phase 1)
- Pages
  - `list_pages` – no input
  - `select_page` – input: { pageIdx?: number, url?: string, title?: string }
  - `navigate_page` – input: { url: string }
  - `new_page` – input: { url: string }
  - `close_page` – input: { pageIdx: number }
- Snapshot / UID
  - `take_snapshot` – input: { maxLines?: number, includeAttributes?: boolean } (consider adding: depth, includeText)
  - `resolve_uid_to_selector` – input: { uid: string }
- Input
  - `click_by_uid` – input: { uid: string, dblClick?: boolean }
  - `hover_by_uid` – input: { uid: string }
  - `fill_by_uid` – input: { uid: string, value: string }
  - `drag_by_uid_to_uid` – input: { fromUid: string, toUid: string }
  - `fill_form_by_uid` – input: { elements: Array<{ uid: string, value: string }> }
  - `upload_file_by_uid` – input: { uid: string, filePath: string }
- Network
  - `list_network_requests` – input: { limit?, sinceMs?, urlContains?, method?, status?, statusMin?, statusMax?, isXHR?, resourceType?, sortBy?, detail? }
  - `get_network_request` – input: { id?: string, url?: string }
- Console
  - `list_console_messages` – input: { level?, limit?, sinceMs? }
  - `clear_console_messages` – no input
- Screenshot
  - `screenshot_page` – no input
  - `screenshot_by_uid` – input: { uid: string }
- Utilities
  - `accept_dialog` – input: { promptText?: string }
  - `dismiss_dialog` – no input
  - `navigate_history` – input: { direction: 'back' | 'forward' }
  - `set_viewport_size` – input: { width: number, height: number }

Acceptance Criteria
- A single, clean mapping document suitable to generate a Google Actions manifest from our current tool schemas.
- Clear notes where output size might need format/detail switches.

