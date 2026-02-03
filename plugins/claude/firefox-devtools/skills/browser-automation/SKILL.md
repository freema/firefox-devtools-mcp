---
name: browser-automation
description: Firefox browser automation via WebDriver BiDi. Use for testing, scraping, form filling, screenshots, and console/network monitoring.
---

# Firefox DevTools MCP

## Core Workflow

**Always snapshot before interacting:**

```
navigate_page url="https://example.com"
take_snapshot
→ Returns DOM with UIDs (e.g., e42) for each element

fill_by_uid uid="e5" text="user@example.com"
click_by_uid uid="e8"
take_snapshot  # Re-snapshot after DOM changes
```

## Tools by Category

| Category | Tools |
|----------|-------|
| Pages | `list_pages`, `new_page`, `navigate_page`, `select_page`, `close_page` |
| Snapshots | `take_snapshot`, `clear_snapshot` |
| Interactions | `click_by_uid`, `fill_by_uid`, `fill_form_by_uid`, `hover_by_uid`, `drag_by_uid_to_uid` |
| Screenshots | `screenshot_page`, `screenshot_by_uid` |
| Debug | `list_console_messages`, `list_network_requests` |

## Quick Examples

**Login flow:**
```
navigate_page url="https://app.example.com/login"
take_snapshot
fill_by_uid uid="e5" text="user@example.com"
fill_by_uid uid="e6" text="password"
click_by_uid uid="e8"
```

**Debug errors:**
```
list_console_messages level="error"
list_network_requests status="failed"
```

## Notes

- UIDs are stable until DOM changes, then re-snapshot
- Firefox 120+ required
