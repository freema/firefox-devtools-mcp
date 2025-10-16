# firefox-devtools-mcp

Model Context Protocol server for Firefox DevTools — enables AI assistants to inspect and control Firefox via the native Remote Debugging Protocol (RDP), without extra browser downloads.

## ⚠️ Version 0.2.0 - Breaking Changes

**Firefox 100+ now required.** Legacy fallbacks and screenshot functionality have been removed for a simpler, more maintainable codebase.

📖 **[Read the full migration guide →](./BREAKING_CHANGES.md)**

## Requirements

- **Node.js**: v20.19 or newer (latest maintenance LTS version)
- **Firefox**: 100+ (auto-detected or specify with `--firefox-path`)

## Key Features

- **Firefox‑only**: uses your system Firefox (no Playwright/Puppeteer browser bundles)
- **Auto‑launch**: with required DevTools prefs and ephemeral profile (`user.js`)
- **Modern RDP**: uses watcher/targets API (Firefox 100+)
  - `getWatcher` → `watchTargets(frame)` → `target-available-form`
  - Extracts `consoleActor`/`threadActor` from target form
- **JS-based navigation**: uses `window.location.href` and `window.open()` for reliability
- **Robust transport**: byte-precise RDP framing with length-prefixed JSON packets

## Documentation

- Architecture and protocol notes: `docs/firefox-client.md`
- Breaking changes: `BREAKING_CHANGES.md`

## Quick Start

### 1) Build

```bash
npm run build
```

### 2) Register with Claude Code

**Option A: Using `claude mcp` command (Recommended)**

```bash
# Build first
npm run build

# Add to Claude Code
claude mcp add firefox-devtools node /absolute/path/to/firefox-devtools-mcp/dist/index.js

# Or with options
claude mcp add firefox-devtools node /absolute/path/to/firefox-devtools-mcp/dist/index.js --headless=false --viewport=1280x720
```

**Option B: Using setup script**

```bash
npm run setup
# Select option 2 (Claude Code)
```

**Option C: Manual configuration**

Add to `~/Library/Application Support/Claude/Code/mcp_settings.json` (macOS):

```json
{
  "mcpServers": {
    "firefox-devtools": {
      "command": "node",
      "args": [
        "/absolute/path/to/firefox-devtools-mcp/dist/index.js",
        "--headless=false",
        "--viewport=1280x720"
      ]
    }
  }
}
```

On Linux: `~/.config/claude/code/mcp_settings.json`
On Windows: `%APPDATA%\Claude\Code\mcp_settings.json`

### 3) Test in Claude Code

After registering, test with prompts like:

- "List all open pages in Firefox"
- "Take a screenshot of the current page"
- "Navigate to https://example.com"
- "Click the button with text 'Submit'"

### 4) Run standalone tests (optional)

```bash
node scripts/test-bidi-devtools.js   # Comprehensive test
node scripts/test-input-tools.js     # Input tools test
node scripts/demo-server.js          # Demo server for testing
```

## Tips

- If Firefox isn't auto‑detected, pass a path: `--firefox-path "/Applications/Firefox.app/Contents/MacOS/firefox"`
- For headless mode: `--headless=true`
- Custom viewport: `--viewport=1920x1080`
