# Firefox DevTools MCP

[![npm version](https://badge.fury.io/js/firefox-devtools-mcp.svg)](https://www.npmjs.com/package/firefox-devtools-mcp)
[![CI](https://github.com/freema/firefox-devtools-mcp/workflows/CI/badge.svg)](https://github.com/freema/firefox-devtools-mcp/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/freema/firefox-devtools-mcp/branch/main/graph/badge.svg)](https://codecov.io/gh/freema/firefox-devtools-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
<a href="https://glama.ai/mcp/servers/@freema/firefox-devtools-mcp"><img src="https://glama.ai/mcp/servers/@freema/firefox-devtools-mcp/badge" height="150" alt="Glama"></a>

Model Context Protocol server for automating Firefox via WebDriver BiDi (through Selenium WebDriver). Works with Claude Code, Claude Desktop, Cursor, Cline and other MCP clients.

Repository: https://github.com/freema/firefox-devtools-mcp

> **Note**: This MCP server requires a local Firefox browser installation and cannot run on cloud hosting services like glama.ai. Use `npx firefox-devtools-mcp@latest` to run locally, or use Docker with the provided Dockerfile.

## Requirements

- Node.js ≥ 20.19.0
- Firefox 100+ installed (auto‑detected, or pass `--firefox-path`)

## Install and use with Claude Code (npx)

Recommended: use npx so you always run the latest published version from npm.

Option A — Claude Code CLI

```bash
claude mcp add firefox-devtools npx firefox-devtools-mcp@latest
```

Pass options either as args or env vars. Examples:

```bash
# Headless + viewport via args
claude mcp add firefox-devtools npx firefox-devtools-mcp@latest -- --headless --viewport 1280x720

# Or via environment variables
claude mcp add firefox-devtools npx firefox-devtools-mcp@latest \
  --env START_URL=https://example.com \
  --env FIREFOX_HEADLESS=true
```

Option B — Edit Claude Code settings JSON

Add to your Claude Code config file:
- macOS: `~/Library/Application Support/Claude/Code/mcp_settings.json`
- Linux: `~/.config/claude/code/mcp_settings.json`
- Windows: `%APPDATA%\Claude\Code\mcp_settings.json`

```json
{
  "mcpServers": {
    "firefox-devtools": {
      "command": "npx",
      "args": ["-y", "firefox-devtools-mcp@latest", "--headless", "--viewport", "1280x720"],
      "env": {
        "START_URL": "about:home"
      }
    }
  }
}
```

Option C — Helper script (local dev build)

```bash
npm run setup
# Choose Claude Code; the script saves JSON to the right path
```

## Try it with MCP Inspector

```bash
npx @modelcontextprotocol/inspector npx firefox-devtools-mcp@latest --start-url https://example.com --headless
```

Then call tools like:
- `list_pages`, `select_page`, `navigate_page`
- `take_snapshot` then `click_by_uid` / `fill_by_uid`
- `list_network_requests` (always‑on capture), `get_network_request`
- `screenshot_page`, `list_console_messages`

## CLI options

You can pass flags or environment variables (names on the right):

- `--firefox-path` — absolute path to Firefox binary
- `--headless` — run without UI (`FIREFOX_HEADLESS=true`)
- `--viewport 1280x720` — initial window size
- `--profile-path` — use a specific Firefox profile
- `--firefox-arg` — extra Firefox arguments (repeatable)
- `--start-url` — open this URL on start (`START_URL`)
- `--accept-insecure-certs` — ignore TLS errors (`ACCEPT_INSECURE_CERTS=true`)

## Tool overview

- Pages: list/new/navigate/select/close
- Snapshot/UID: take/resolve/clear
- Input: click/hover/fill/drag/upload/form fill
- Network: list/get (ID‑first, filters, always‑on capture)
- Console: list/clear
- Screenshot: page/by uid
- Utilities: accept/dismiss dialog, history back/forward, set viewport

## Local development

```bash
npm install
npm run build

# Run with Inspector against local build
npx @modelcontextprotocol/inspector node dist/index.js --headless --viewport 1280x720

# Or run in dev with hot reload
npm run inspector:dev
```

## Troubleshooting

- Firefox not found: pass `--firefox-path "/Applications/Firefox.app/Contents/MacOS/firefox"` (macOS) or the correct path on your OS.
- First run is slow: Selenium sets up the BiDi session; subsequent runs are faster.
- Stale UIDs after navigation: take a fresh snapshot (`take_snapshot`) before using UID tools.

## Versioning

- Pre‑1.0 API: versions start at `0.x`. Use `@latest` with npx for the newest release.

## CI and Release

- GitHub Actions for CI, Release, and npm publish are included. See docs/ci-and-release.md for details and required secrets.
