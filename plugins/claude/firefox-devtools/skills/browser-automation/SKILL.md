---
name: browser-automation
description: Firefox browser automation via WebDriver BiDi. Use when automating Firefox, testing web pages, scraping content, filling forms, clicking elements, taking screenshots, or monitoring console/network activity.
---

# Firefox DevTools MCP

MCP server for Firefox browser automation using WebDriver BiDi protocol.

## Available tools (18)

### Page management
- `list_pages` - List all open pages/tabs
- `new_page` - Open new blank page
- `navigate_page` - Navigate to URL
- `select_page` - Select page as active
- `close_page` - Close page

### DOM Snapshots (UID system)
- `take_snapshot` - Create DOM snapshot, assign UIDs to elements
- `resolve_uid_to_selector` - Convert UID to CSS selector
- `clear_snapshot` - Clear snapshot cache

**Important:** Always call `take_snapshot` before interacting with elements. UIDs (e.g., `e42`) are stable references to DOM elements.

### Element interactions
- `click_by_uid` - Click element by UID
- `hover_by_uid` - Hover over element
- `fill_by_uid` - Fill text into input/textarea
- `fill_form_by_uid` - Fill multiple form fields at once
- `drag_by_uid_to_uid` - Drag element to another element
- `upload_file_by_uid` - Upload file to file input

### Screenshots
- `screenshot_page` - Screenshot entire page
- `screenshot_by_uid` - Screenshot specific element

### Console and Network
- `list_console_messages` - List console messages (log, error, warn)
- `clear_console_messages` - Clear console cache
- `list_network_requests` - List HTTP requests
- `get_network_request` - Get details of specific request

### Utilities
- `accept_dialog` - Accept dialog (alert, confirm, prompt)
- `dismiss_dialog` - Dismiss dialog
- `navigate_history` - Navigate back/forward in history
- `set_viewport_size` - Set viewport size

## Typical workflow

### 1. Navigate and snapshot
```
navigate_page url="https://example.com"
take_snapshot
→ Returns text representation of DOM with UIDs for each interactive element
```

### 2. Interact with elements
```
click_by_uid uid="e15"
fill_by_uid uid="e23" text="hello@example.com"
take_snapshot  # Refresh after DOM changes
```

### 3. Fill forms
```
fill_form_by_uid fields=[
  {"uid": "e10", "value": "John Doe"},
  {"uid": "e11", "value": "john@example.com"}
]
```

## Examples

### E2E login test
```
navigate_page url="https://app.example.com/login"
take_snapshot
fill_by_uid uid="e5" text="user@example.com"
fill_by_uid uid="e6" text="password123"
click_by_uid uid="e8"
take_snapshot
screenshot_page
```

### Debug JavaScript errors
```
navigate_page url="https://buggy-app.example.com"
list_console_messages level="error"
list_network_requests status="failed"
```

## Limitations

- Firefox only (no Chrome/Safari)
- Requires Firefox 120+ with WebDriver BiDi
- `evaluate_script` disabled for security reasons
