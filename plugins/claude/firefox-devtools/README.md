# Firefox DevTools Plugin for Claude Code

This plugin provides Firefox browser automation capabilities for Claude Code using WebDriver BiDi protocol.

## Installation

```bash
# Via Claude Code plugin manager
/plugin install https://github.com/freema/firefox-devtools-mcp/plugins/claude/firefox-devtools

# Or test locally
claude --plugin-dir ./plugins/claude/firefox-devtools
```

## What's included

### MCP Server
Automatically connects Claude Code to the Firefox DevTools MCP server.

### Skills
- **browser-automation** - Auto-triggers when you ask about browser automation, testing, or scraping

## Available tools

The MCP server provides 18 tools for browser automation:

| Category | Tools |
|----------|-------|
| Pages | `list_pages`, `new_page`, `navigate_page`, `select_page`, `close_page` |
| Snapshots | `take_snapshot`, `resolve_uid_to_selector`, `clear_snapshot` |
| Interactions | `click_by_uid`, `hover_by_uid`, `fill_by_uid`, `fill_form_by_uid`, `drag_by_uid_to_uid`, `upload_file_by_uid` |
| Screenshots | `screenshot_page`, `screenshot_by_uid` |
| Console/Network | `list_console_messages`, `clear_console_messages`, `list_network_requests`, `get_network_request` |
| Utilities | `accept_dialog`, `dismiss_dialog`, `navigate_history`, `set_viewport_size` |

## Usage

Once installed, ask Claude to automate Firefox:

```
"Navigate to example.com and take a screenshot"
"Fill out the login form and submit"
"Check for JavaScript errors on this page"
```

## Requirements

- Firefox 120 or later
- Node.js 20.19.0 or later

## Links

- [GitHub Repository](https://github.com/freema/firefox-devtools-mcp)
- [npm Package](https://www.npmjs.com/package/firefox-devtools-mcp)
