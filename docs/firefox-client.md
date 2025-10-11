# Firefox DevTools Client Architecture

This document describes the custom Firefox Remote Debugging Protocol (RDP) and WebDriver BiDi client implementation used in this MCP server.

## Purpose and Goals

The Firefox DevTools MCP server uses a **native Firefox RDP client** with no external dependencies on browser automation frameworks like Puppeteer or Playwright. This design choice provides:

- **No extra browser downloads** - Uses the Firefox installation already on your system
- **Direct protocol access** - Lightweight TCP and WebSocket communication
- **Firefox-specific features** - Full access to Firefox DevTools capabilities
- **Minimal dependencies** - Only `ws` package for WebSocket support

## Protocols Overview

The server communicates with Firefox using two distinct protocols:

### 1. Remote Debugging Protocol (RDP)

**Transport:** TCP socket with length-prefixed JSON framing
**Default port:** 6000
**Format:** `<length>:<json>`

RDP is Firefox's native debugging protocol, used for:
- Tab management (list, create, close, navigate)
- JavaScript evaluation
- Console message capture
- Network monitoring
- Page content access

**Example RDP packet:**
```
85:{"to":"server1.conn0.child1/consoleActor2","type":"evaluateJS","text":"document.title"}
```

### 2. WebDriver BiDi

**Transport:** WebSocket
**Default port:** 9222
**Format:** Standard JSON-RPC over WebSocket

BiDi is a modern, cross-browser protocol used for:
- Screenshot capture
- Browsing context management
- Future advanced automation features

**Example BiDi command:**
```json
{
  "id": 1,
  "method": "browsingContext.captureScreenshot",
  "params": { "context": "context-id-123" }
}
```

## Client Architecture

### Transport Layer

**RDP Transport** (`src/firefox/transport.ts`)
- TCP socket connection
- Length-prefixed JSON frame parsing
- Event-based message handling
- Connection timeout and error handling

**BiDi Transport** (`src/firefox/bidi-client.ts`)
- WebSocket connection via `ws` package
- Command/response matching by ID
- Promise-based API
- Timeout handling for commands

### Protocol Layer

**RDP Client** (`src/firefox/rdp-client.ts`)
- Actor-based communication model
- Request/response correlation
- Tab attachment and detachment
- Console and network actor management
- Error handling and logging

Key concepts:
- **Actors** - Server-side objects with unique IDs (e.g., `server1.conn0.tab1`)
- **Packets** - JSON messages with `to`, `from`, and `type` fields
- **Attachment** - Connecting to a tab to access its console, thread, and network actors

**BiDi Client** (`src/firefox/bidi-client.ts`)
- Command ID generation
- Browsing context management
- Screenshot capture API
- Event handling (future use)

### High-Level API

**FirefoxDevTools** (`src/firefox/devtools.ts`)
- Unified API for both RDP and BiDi
- Tab state management
- Lazy BiDi client initialization
- Auto-launch integration

**McpContext** (`src/McpContext.ts`)
- MCP server integration layer
- Tool method implementations
- Resource management

## Auto-Launch and Profiles

### Auto-Launch Process

When connecting fails, the server automatically launches Firefox:

1. **Executable detection** (`src/firefox/launcher.ts`)
   - Platform-specific paths
   - PATH scanning on Linux
   - Edition support (stable/developer/nightly)

2. **Profile setup**
   - Creates ephemeral profile in temp directory
   - Writes `user.js` with required preferences

3. **Firefox startup**
   - Launches with RDP and BiDi enabled
   - TCP port readiness polling (20 attempts × 500ms)

4. **Connection retry**
   - Attempts RDP connection
   - Retry logic with backoff

### Required Firefox Preferences

Located in `src/config/constants.ts`:

```javascript
{
  // Remote debugging (critical for RDP)
  'devtools.chrome.enabled': true,
  'devtools.debugger.remote-enabled': true,
  'devtools.debugger.prompt-connection': false,

  // Extensions
  'extensions.autoDisableScopes': 10,
  'xpinstall.signatures.required': false,

  // Browser behavior
  'browser.shell.checkDefaultBrowser': false,
  'browser.warnOnQuit': false,

  // macOS stability
  'toolkit.startup.max_resumed_crashes': -1,
}
```

### Ephemeral Profiles

The launcher creates temporary profiles with:
- `user.js` containing required prefs
- Isolated from user's default profile
- Automatic cleanup on server shutdown
- Pattern: `/tmp/firefox-devtools-mcp-profile-*`

## Ports and Configuration

### Port Separation

The server uses **two separate ports**:

| Protocol | Default Port | Purpose | Launch Argument |
|----------|--------------|---------|-----------------|
| RDP | 6000 | Core DevTools | `-start-debugger-server 6000` |
| BiDi | 9222 | Screenshots, Advanced | `-remote-debugging-port 9222` |

### Configuration Options

**CLI Arguments:**
```bash
--rdp-host <host>        # RDP server host (default: 127.0.0.1)
--rdp-port <port>        # RDP server port (default: 6000)
--bidi-port <port>       # BiDi Remote Agent port (default: 9223)
--firefox-path <path>    # Firefox executable or edition (stable/developer/nightly)
--headless               # Run Firefox headless
--viewport <WxH>         # Set viewport size (e.g., 1280x720)
--profile-path <path>    # Use persistent profile
```

**Environment Variables:**
```bash
RDP_HOST=127.0.0.1
RDP_PORT=6000
BIDI_PORT=9222
FIREFOX_HEADLESS=false
AUTO_LAUNCH_FIREFOX=true
```

## Available Tools

The server provides comprehensive browser automation tools organized by category:

### Page Management

| Tool | Description | Protocol |
|------|------------|----------|
| `list_pages` | List all open tabs | RDP |
| `new_page` | Create new tab and navigate | RDP |
| `navigate_page` | Navigate to URL | RDP |
| `select_page` | Switch active tab | RDP |
| `close_page` | Close tab | RDP |

### Content Access

| Tool | Description | Protocol |
|------|------------|----------|
| `take_screenshot` | Capture screenshot (PNG) | BiDi |
| `take_snapshot` | Get HTML content | RDP |
| `evaluate_script` | Execute JavaScript | RDP |

### Developer Tools

| Tool | Description | Protocol | Notes |
|------|------------|----------|-------|
| `list_console_messages` | Get console logs | RDP | |
| `list_network_requests` | Get network activity | RDP | ⚠️ Limited headers/body |
| `get_network_request` | Get request details | RDP | ⚠️ Limited detail |
| `start_network_monitoring` | Enable network capture | RDP | |
| `stop_network_monitoring` | Disable network capture | RDP | |
| `performance_get_metrics` | Get timing metrics | RDP | ⚠️ Basic metrics only |

⚠️ = Firefox RDP protocol limitations compared to modern DevTools APIs

## Limitations and Roadmap

### Current Limitations

**Network Monitoring:**
- Request/response body capture is incomplete
- Some headers may be missing
- Timing information is limited
- RDP network actors have less detail than Chrome CDP

**Performance Metrics:**
- Limited to basic timing metrics
- No detailed profiling like Chrome
- Memory metrics are basic

**Screenshots:**
- BiDi returns PNG only (no JPEG/WebP transcoding yet)
- Requires Firefox 115+ for BiDi Remote Agent
- Full-page screenshots may have sizing issues on some pages

**Console:**
- Stack traces are basic compared to Chrome
- Source mapping is limited

### Architectural Improvements

**Potential enhancements:**
- Connection pooling for multiple contexts
- Event streaming for real-time updates
- Enhanced error recovery
- Profile cleanup automation
- Port conflict detection and auto-reassignment

### Feature Roadmap

**Planned additions:**
- DOM inspection tools
- CSS manipulation
- Cookie management
- Local storage access
- Request interception (BiDi)
- Mobile emulation

## Development and Testing

### Running Tests

```bash
# Build project
npm run build

# Direct tool testing (bypasses MCP)
node scripts/test-tools.js

# MCP Inspector testing
task inspector
```

### Debug Logging

Set `DEBUG=true` environment variable for verbose logging:
```bash
DEBUG=true npx firefox-devtools-mcp
```

Logs include:
- RDP packet send/receive
- BiDi command execution
- Actor lifecycle
- Connection status

### Troubleshooting

**Connection refused:**
- Check Firefox is running with `-start-debugger-server 6000`
- Verify port with: `lsof -i :6000`
- Enable auto-launch with `AUTO_LAUNCH_FIREFOX=true`

**Screenshot fails:**
- Ensure BiDi port is not in use: `lsof -i :9223`
- Check Firefox version >= 115
- Verify `-remote-debugging-port` argument is passed

**Profile issues:**
- Check temp directory permissions
- Verify `user.js` was written (check logs)
- Try specifying explicit profile with `--profile-path`

## Contributing

When extending the Firefox client:

1. **Maintain protocol separation** - Keep RDP and BiDi logic isolated
2. **Follow actor patterns** - Use actor-based communication for RDP
3. **Add type safety** - Define TypeScript interfaces for new packets
4. **Update documentation** - Document new tools and limitations
5. **Test across versions** - Verify with Firefox stable, developer, and nightly

See `tasks/README.md` for development workflow and CR process.

## Resources

- [Firefox Remote Debugging Protocol](https://firefox-source-docs.mozilla.org/devtools/backend/protocol.html)
- [WebDriver BiDi Specification](https://w3c.github.io/webdriver-bidi/)
- [Firefox Remote Agent](https://firefox-source-docs.mozilla.org/remote/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
