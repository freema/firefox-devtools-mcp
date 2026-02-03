---
name: Firefox DevTools MCP
version: 0.5.3
description: MCP server for Firefox browser automation via WebDriver BiDi
keywords: [firefox, browser, automation, mcp, webdriver-bidi, testing, scraping]
ai-compatible: [claude-code, cursor, cline, windsurf]
repository: https://github.com/freema/firefox-devtools-mcp
---

# Firefox DevTools MCP Skill

MCP server for Firefox browser automation using the WebDriver BiDi protocol.

## When to use this skill

This skill is relevant when the user wants to:

- **Automate browser** - navigation, clicking, filling forms
- **Test web pages** - end-to-end tests, visual regression
- **Scrape content** - extract data from web pages
- **Debug** - monitor console, network requests
- **Take screenshots** - full page or specific elements

## Getting started

```bash
# Simplest way - always latest version
npx firefox-devtools-mcp@latest

# With headless mode (no GUI)
npx firefox-devtools-mcp@latest --headless

# On a specific port
npx firefox-devtools-mcp@latest --port 9222
```

## Available tools (18)

### Page management

| Tool | Description |
|------|-------------|
| `list_pages` | List all open pages/tabs |
| `new_page` | Open a new blank page |
| `navigate_page` | Navigate to URL (optionally specify `pageId`) |
| `select_page` | Select a page as active |
| `close_page` | Close a page |

### DOM Snapshots (UID system)

| Tool | Description |
|------|-------------|
| `take_snapshot` | Create DOM snapshot, assign UIDs to elements |
| `resolve_uid_to_selector` | Convert UID to CSS selector |
| `clear_snapshot` | Clear snapshot cache |

**Important:** Always call `take_snapshot` before interacting with elements. UIDs (e.g., `e42`) are stable references to DOM elements.

### Element interactions

| Tool | Description |
|------|-------------|
| `click_by_uid` | Click element by UID |
| `hover_by_uid` | Hover over element |
| `fill_by_uid` | Fill text into input/textarea |
| `fill_form_by_uid` | Fill multiple form fields at once |
| `drag_by_uid_to_uid` | Drag element to another element |
| `upload_file_by_uid` | Upload file to file input |

### Screenshots

| Tool | Description |
|------|-------------|
| `screenshot_page` | Screenshot entire page |
| `screenshot_by_uid` | Screenshot specific element |

### Console and Network

| Tool | Description |
|------|-------------|
| `list_console_messages` | List console messages (log, error, warn) |
| `clear_console_messages` | Clear console cache |
| `list_network_requests` | List HTTP requests |
| `get_network_request` | Get details of specific request |

### Utilities

| Tool | Description |
|------|-------------|
| `accept_dialog` | Accept dialog (alert, confirm, prompt) |
| `dismiss_dialog` | Dismiss dialog |
| `navigate_history` | Navigate back/forward in history |
| `set_viewport_size` | Set viewport size |

## Typical workflow

### 1. Navigation and snapshot

```
1. navigate_page url="https://example.com"
2. take_snapshot
   → Returns text representation of DOM with UIDs for each interactive element
```

### 2. Element interaction

```
3. click_by_uid uid="e15"     # Click button
4. fill_by_uid uid="e23" text="hello@example.com"
5. take_snapshot              # New snapshot after DOM change
```

### 3. Forms

```
fill_form_by_uid fields=[
  {"uid": "e10", "value": "John Doe"},
  {"uid": "e11", "value": "john@example.com"},
  {"uid": "e12", "value": "secret123"}
]
```

### 4. Debugging

```
list_console_messages level="error"
list_network_requests status="failed"
```

## Usage examples

### E2E login test

```
1. navigate_page url="https://app.example.com/login"
2. take_snapshot
3. fill_by_uid uid="e5" text="user@example.com"
4. fill_by_uid uid="e6" text="password123"
5. click_by_uid uid="e8"  # Submit button
6. take_snapshot
7. screenshot_page        # Document result
```

### Product scraping

```
1. navigate_page url="https://shop.example.com/products"
2. take_snapshot
   → Parse output to extract data from elements
3. click_by_uid uid="e42"  # Next page
4. take_snapshot
   → Repeat for more pages
```

### Console monitoring

```
1. navigate_page url="https://buggy-app.example.com"
2. list_console_messages level="error"
   → Analyze JavaScript errors
3. list_network_requests status="failed"
   → Check failed requests
```

## Limitations

- **Firefox only** - does not support Chrome/Safari
- **WebDriver BiDi** - requires Firefox 120+
- **evaluate_script** - currently disabled for security reasons
- **Headless mode** - some tests may require visible browser

## Troubleshooting

### Firefox won't start

```bash
# Check Firefox is installed
firefox --version

# Try with explicit path
npx firefox-devtools-mcp@latest --firefox-path /usr/bin/firefox
```

### Element not found

1. Always call `take_snapshot` before interaction
2. UIDs change after DOM changes - always refresh snapshot
3. Wait for page to load before taking snapshot

### Timeout errors

```bash
# Increase timeout for slow pages
npx firefox-devtools-mcp@latest --timeout 60000
```

## See also

- [GitHub Repository](https://github.com/freema/firefox-devtools-mcp)
- [MCP Protocol](https://modelcontextprotocol.io/)
- [WebDriver BiDi Spec](https://w3c.github.io/webdriver-bidi/)
