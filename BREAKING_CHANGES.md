# Breaking Changes (v0.2.0)

## Summary

This release significantly simplifies the Firefox RDP codebase by removing legacy fallbacks and focusing on modern Firefox versions (100+). Screenshot functionality via WebDriver BiDi has been removed, and the internal architecture has been streamlined.

## Requirements

- **Firefox 100+** now required (released October 2022)
- Older Firefox versions are no longer supported

## Removed Features

### 1. Screenshot Functionality
- **Removed**: WebDriver BiDi client (`bidi-client.ts`)
- **Removed**: All screenshot-related tools and methods
  - `takeScreenshot()` method from `FirefoxDevTools`
  - `take_screenshot` MCP tool
  - `take_snapshot` MCP tool
- **Reason**: Screenshots can be implemented externally using dedicated tools or extensions

### 2. Legacy RDP Methods
- **Removed**: `navigateTo()` method - use `navigate()` instead which uses JS-based navigation
- **Removed**: `openNewTab()` method - use `createNewPage()` instead
- **Removed**: RDP-based screenshot implementation

### 3. Configuration Options
- **Removed**: `bidiPort` configuration option (no longer needed)
- **Removed**: `ScreenshotOptions` TypeScript interface

## API Changes

### Simplified Tab Attachment

The `attachToTab()` method now uses only the modern watcher/targets API:

**Before (v0.1.x):**
- Multiple fallback strategies
- Complex error handling for different Firefox versions
- Support for ancient RDP protocols

**After (v0.2.0):**
- Single modern API path using watcher/targets
- Clear error messages for unsupported scenarios
- Requires Firefox 100+

### Simplified Root Discovery

The `discoverRoot()` method now uses only `listTabs`:

**Before (v0.1.x):**
```typescript
// Try getRoot first, fallback to listTabs
```

**After (v0.2.0):**
```typescript
// Uses listTabs only - requires Firefox 100+
```

### Tab Creation and Navigation

**Before (v0.1.x):**
- Multiple approaches with BiDi fallbacks
- Complex empty tab handling

**After (v0.2.0):**
- `createNewPage(url)` now uses `window.open()` internally
- `navigate(url)` uses JS-based navigation (`window.location.href`)
- Cleaner error handling for empty tabs

## Migration Guide

### If you're using Firefox < 100:

**Option 1 (Recommended):** Upgrade Firefox to version 100 or newer
- Firefox 100 was released in October 2022
- All modern Firefox versions support the new RDP APIs

**Option 2:** Use an older version of this package
```bash
npm install firefox-devtools-mcp@0.1.x
```

### If you were using screenshots:

**Option 1:** Use external screenshot tools
- Firefox's built-in screenshot tool: `Ctrl+Shift+S` (or `Cmd+Shift+S` on macOS)
- Browser extensions like "Fireshot" or "Nimbus Screenshot"
- External automation tools like Selenium or Playwright

**Option 2:** Implement custom screenshot solution
```typescript
// Example using evaluate() to capture via canvas
await firefox.evaluate(`
  const canvas = document.createElement('canvas');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  // ... capture logic
`);
```

### API Migration Examples

#### Creating new tabs:

**Before:**
```typescript
const tabIdx = await context.openTabWithUrl('https://example.com');
```

**After:**
```typescript
const tabIdx = await firefox.createNewPage('https://example.com');
```

#### Navigation:

**Before:**
```typescript
// May have used navigateTo() or navigateDescriptor()
await client.navigateTo(tabActor, url);
```

**After:**
```typescript
// Simple, consistent navigation
await firefox.navigate(url);
```

## Internal Changes

### Architecture Simplification

1. **Removed files:**
   - `src/firefox/bidi-client.ts`
   - `src/tools/screenshot.ts`

2. **Simplified methods:**
   - `devtools.ts`: Removed BiDi integration
   - `rdp-client.ts`: Removed legacy fallback protocols
   - `launcher.ts`: Removed BiDi port argument

3. **Cleaner error handling:**
   - `NO_CONSOLE_ACTOR` error code for empty tabs
   - `ATTACH_TIMEOUT` error code for attachment timeouts
   - `NO_WATCHER` error code for missing watcher actor

### Code Quality Improvements

- Reduced complexity in tab attachment logic
- Consistent navigation strategy
- Better error messages that guide users to solutions
- Removed ~700 lines of legacy code

## Benefits

1. **Easier maintenance:** Fewer code paths to test and maintain
2. **Better performance:** No fallback overhead
3. **Clearer errors:** Users get actionable error messages
4. **Modern focus:** Optimized for current Firefox versions

## Testing

After upgrading:

1. Verify Firefox version:
```bash
firefox --version
# Should show version 100 or higher
```

2. Test connection:
```typescript
import { FirefoxDevTools } from 'firefox-devtools-mcp';

const firefox = new FirefoxDevTools({
  rdpHost: '127.0.0.1',
  rdpPort: 6000,
  headless: false,
});

await firefox.connect();
console.log('Connected to Firefox', firefox.getTabs());
```

3. Run test suite:
```bash
npm test
```

## Questions or Issues?

If you encounter problems after upgrading:

1. Check Firefox version: `firefox --version`
2. Review error messages - they now include specific guidance
3. Report issues at: https://github.com/your-repo/firefox-devtools-mcp/issues
