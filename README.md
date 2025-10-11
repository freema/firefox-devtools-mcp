# firefox-devtools-mcp

Model Context Protocol server for Firefox DevTools — enables AI assistants to inspect and control Firefox via the native Remote Debugging Protocol (RDP), without extra browser downloads.

## ⚠️ Version 0.2.0 - Breaking Changes

**Firefox 100+ now required.** Legacy fallbacks and screenshot functionality have been removed for a simpler, more maintainable codebase.

📖 **[Read the full migration guide →](./BREAKING_CHANGES.md)**

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

Quick start

1) Build
- `npm run build`

2) Run local tool test (auto‑launches Firefox if needed)
- `npm run test:tools`

Tips

- If Firefox isn’t auto‑detected, pass a path: `--firefox-path "/Applications/Firefox.app/Contents/MacOS/firefox"`
- Default RDP endpoint: `127.0.0.1:6000`
- BiDi WebSocket: defaults to `127.0.0.1:9222` and is used for tab creation/navigation only when needed (empty‑tab bootstrap) and for screenshots. You can change with `--bidi-port`.
