# Firefox DevTools Client Architecture

This document describes the Selenium WebDriver BiDi client implementation used in this MCP server.

## Purpose and Goals

The Firefox DevTools MCP server uses **Selenium WebDriver** with WebDriver BiDi to provide browser automation capabilities. This design choice provides:

- **Battle-tested reliability** - Uses the industry-standard `selenium-webdriver` library
- **W3C Standard protocol** - WebDriver BiDi is actively developed by browser vendors
- **No custom protocol code** - ~1000 lines of custom code eliminated
- **Future-proof** - Cross-browser potential (Chrome, Edge, Safari)
- **Better DevTools access** - Native BiDi events for console, network, and performance

## Protocol Overview

### WebDriver BiDi

**Transport:** WebSocket (managed by Selenium)
**Format:** JSON-RPC over WebSocket
**Standard:** [W3C WebDriver BiDi Specification](https://w3c.github.io/webdriver-bidi/)

BiDi is the modern browser automation protocol, used for:
- Browser and tab management
- JavaScript evaluation
- Real-time console event capture
- Network monitoring (via BiDi events)
- Page content access
- Screenshots
- Performance metrics collection

**Example BiDi event subscription:**
```typescript
const bidi = await driver.getBidi();
await bidi.subscribe('log.entryAdded', contextId, (event) => {
  console.log(event.params);
});
```

## Client Architecture

### Selenium WebDriver Integration

The architecture is intentionally simple - a **thin wrapper** around Selenium's WebDriver:

**FirefoxDevTools** (`src/firefox/devtools.ts`)
- Direct proxy to Selenium WebDriver
- No "smart" logic or modifications
- Console event subscription via BiDi
- Tab and window management
- Simple state tracking

**Key principle:** Don't reinvent the wheel. Selenium knows what it's doing.

### Core Components

**1. Driver Initialization**
```typescript
const firefoxOptions = new firefox.Options();
firefoxOptions.enableBidi();

this.driver = await new Builder()
  .forBrowser(Browser.FIREFOX)
  .setFirefoxOptions(firefoxOptions)
  .build();
```

**2. Browsing Context Management**
```typescript
// Get window handle (browsing context ID)
this.currentContextId = await this.driver.getWindowHandle();
```

**3. Console Listener Setup**
```typescript
const bidi = await this.driver.getBidi();
await bidi.subscribe('log.entryAdded', this.currentContextId, (event) => {
  const entry = event.params;
  const message = {
    level: entry.level || 'info',
    text: entry.text || JSON.stringify(entry.args || []),
    timestamp: entry.timestamp || Date.now(),
  };
  this.consoleMessages.push(message);
});
```

**Critical order:** Get context → Subscribe to events → Navigate

**4. JavaScript Evaluation**
```typescript
async evaluate(script: string): Promise<unknown> {
  // Direct passthrough - Selenium handles it correctly
  return await this.driver.executeScript(script);
}
```

**Why direct passthrough?** Selenium already handles single-line expressions vs multi-line scripts correctly. Don't add "helpful" logic that breaks things.

### High-Level API

**FirefoxDevTools** (`src/firefox/devtools.ts`)
- Unified API for browser automation
- Tab state management
- Console message buffering
- Network monitoring stubs (planned)

**McpContext** (`src/McpContext.ts`)
- MCP server integration layer
- Tool method implementations
- Resource management

## Auto-Launch and Configuration

### Auto-Launch Process

Selenium automatically manages Firefox through geckodriver:

1. **Geckodriver detection**
   - Installed via `geckodriver` npm package
   - Automatically added to PATH

2. **Firefox startup**
   - Selenium launches Firefox with Marionette protocol
   - BiDi is enabled via `firefoxOptions.enableBidi()`
   - Headless mode supported via `firefoxOptions.addArguments('-headless')`

3. **Connection establishment**
   - Selenium handles all connection logic
   - WebSocket connection to BiDi automatically managed
   - No manual port configuration needed

### Configuration Options

**CLI Arguments:**
```bash
--firefox-path <path>    # Firefox executable path
--headless               # Run Firefox headless
--viewport <WxH>         # Set viewport size (e.g., 1280x720)
--start-url <url>        # Initial URL to navigate to
```

**Environment Variables:**
```bash
FIREFOX_HEADLESS=false
START_URL=https://example.com
```

**Profile Management:**
- Selenium creates temporary profiles automatically
- Custom profile support via `firefoxOptions.setProfile()`
- Automatic cleanup on shutdown

## Available Tools

The server provides comprehensive browser automation tools:

### Page Management

| Tool | Description | Implementation |
|------|------------|----------------|
| `list_pages` | List all open tabs | `driver.getAllWindowHandles()` |
| `new_page` | Create new tab and navigate | `driver.switchTo().newWindow('tab')` |
| `navigate_page` | Navigate to URL | `driver.get(url)` |
| `select_page` | Switch active tab | `driver.switchTo().window(handle)` |
| `close_page` | Close tab | `driver.close()` |

### Content Access

| Tool | Description | Implementation |
|------|------------|----------------|
| `take_screenshot` | Capture screenshot (PNG) | `driver.takeScreenshot()` |
| `take_snapshot` | Get HTML content | `driver.executeScript('return document.documentElement.outerHTML')` |
| `evaluate_script` | Execute JavaScript | `driver.executeScript(script)` |

### Developer Tools

| Tool | Description | Status |
|------|------------|--------|
| `list_console_messages` | Get console logs | ✅ Real-time BiDi events |
| `list_network_requests` | Get network activity | 🚧 Planned (BiDi events) |
| `get_network_request` | Get request details | 🚧 Planned (BiDi events) |
| `start_network_monitoring` | Enable network capture | 🚧 Planned |
| `stop_network_monitoring` | Disable network capture | 🚧 Planned |
| `performance_get_metrics` | Get timing metrics | ✅ Via `performance` API |

✅ = Fully implemented
🚧 = Planned (BiDi supports this)

## Migration from RDP

This server was migrated from a custom Remote Debugging Protocol (RDP) implementation to Selenium WebDriver BiDi. See [`docs/migration-to-bidi.md`](./migration-to-bidi.md) for the complete migration story.

**Before:** ~1200 lines of custom RDP client code
**After:** ~200 lines of Selenium wrapper code
**Reduction:** 83% less code to maintain

**Key improvements:**
- ✅ No custom protocol implementation
- ✅ Industry-standard library (selenium-webdriver)
- ✅ W3C standard protocol (WebDriver BiDi)
- ✅ Better console capture (real-time events)
- ✅ Simpler architecture
- ✅ Future cross-browser support

## Current Features and Limitations

### Working Features

**Console Monitoring:**
- ✅ Real-time console event capture via BiDi
- ✅ All log levels (log, info, warn, error, debug)
- ✅ Stack traces included
- ✅ Works across navigations

**JavaScript Execution:**
- ✅ Single-line expressions
- ✅ Multi-line scripts
- ✅ Return values
- ✅ Error handling

**Tab Management:**
- ✅ Multiple tabs support
- ✅ Context switching
- ✅ Window handles management

**Screenshots:**
- ✅ Full page capture
- ✅ PNG format
- ✅ Base64 encoded

### Planned Features (BiDi Supports These)

**Network Monitoring:**
- 🚧 Request/response capture via `network.beforeRequestSent`
- 🚧 Response body access via `network.responseCompleted`
- 🚧 Full headers and timing
- 🚧 Request interception

**Performance Monitoring:**
- 🚧 Frame rate monitoring
- 🚧 Memory profiling
- 🚧 CPU metrics

**Advanced Automation:**
- 🚧 Cookie management
- 🚧 Local storage access
- 🚧 Authentication handling
- 🚧 Mobile emulation

## Development and Testing

### Running Tests

```bash
# Build project
npm run build

# Test BiDi implementation
DEBUG=firefox-devtools npm run test:tools

# Test script with comprehensive checks
node scripts/test-bidi-devtools.js
```

### Debug Logging

Set `DEBUG=firefox-devtools` environment variable for verbose logging:

```bash
DEBUG=firefox-devtools node scripts/test-bidi-devtools.js
```

Logs include:
- Firefox launch status
- BiDi connection details
- Console event capture
- Navigation events
- Evaluation results

### Troubleshooting

**Firefox won't launch:**
- Ensure Firefox is installed
- Check `--firefox-path` argument if using custom location
- Verify geckodriver is installed: `npm list geckodriver`

**Console events not captured:**
- Verify BiDi is enabled (it's automatic with Selenium)
- Check listener is subscribed BEFORE navigation
- Ensure correct browsing context ID

**Evaluation returns null:**
- Don't modify scripts - pass them directly to `executeScript()`
- Multi-line scripts should include `return` if you need the value
- Single-line expressions work without `return`

**Build errors:**
- Ensure `selenium-webdriver` is in `external` array in `tsup.config.ts`
- Don't bundle Selenium (it uses dynamic requires)

## Implementation Best Practices

When extending the Firefox client:

### 1. Direct Proxy Pattern

**❌ Don't do this:**
```typescript
async evaluate(script: string): Promise<unknown> {
  // Trying to be "helpful"
  if (!script.startsWith('return ')) {
    script = `return ${script}`; // BREAKS multi-line scripts!
  }
  return await this.driver.executeScript(script);
}
```

**✅ Do this:**
```typescript
async evaluate(script: string): Promise<unknown> {
  // Just pass it through
  return await this.driver.executeScript(script);
}
```

### 2. Event Subscription Order

**Critical:** Subscribe to events BEFORE navigation to capture early messages.

```typescript
// ✅ Correct order
const contextId = await driver.getWindowHandle();
await bidi.subscribe('log.entryAdded', contextId, callback);
await driver.get(url); // Now events will be captured

// ❌ Wrong order
await driver.get(url);
await bidi.subscribe('log.entryAdded', contextId, callback); // Misses early logs
```

### 3. Copy Working Code

If you have a working test script, **make your implementation identical** to it. Don't modify what works.

### 4. Trust the Library

Selenium knows how to:
- Handle script evaluation
- Manage contexts
- Process events
- Handle errors

Don't second-guess it with "smart" logic.

## Build Configuration

### tsup.config.ts

**Critical:** Selenium must be external (not bundled):

```typescript
export default defineConfig({
  external: [
    'selenium-webdriver'  // Don't bundle - uses dynamic requires
  ],
});
```

**Why external?** Selenium uses dynamic `require()` for browser drivers, which doesn't work when bundled.

### Dependencies

```json
{
  "dependencies": {
    "selenium-webdriver": "^4.36.0"
  },
  "devDependencies": {
    "geckodriver": "^6.0.2"
  }
}
```

## Resources

- [Selenium WebDriver Documentation](https://www.selenium.dev/documentation/webdriver/)
- [WebDriver BiDi Specification](https://w3c.github.io/webdriver-bidi/)
- [Firefox Remote Agent](https://firefox-source-docs.mozilla.org/remote/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Migration from RDP to BiDi](./migration-to-bidi.md)

## Contributing

When contributing to the Firefox client:

1. **Keep it simple** - Maintain the thin wrapper pattern
2. **Don't add logic** - Let Selenium handle complexity
3. **Copy working patterns** - Use test scripts as templates
4. **Test incrementally** - Small, focused tests reveal issues quickly
5. **Document lessons** - Update this doc with new learnings

See `tasks/README.md` for development workflow and CR process.
