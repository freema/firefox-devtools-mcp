# Future Features

This document tracks features that are planned or considered for future implementation but are currently disabled or not yet implemented.

## Disabled Features

### `evaluate_script` Tool

**Status:** Temporarily Disabled
**Reason:** Needs further consideration for security and use case validation
**Implementation:** Fully implemented in `src/tools/script.ts`

#### Description

The `evaluate_script` tool allows executing arbitrary JavaScript functions inside the currently selected browser page. It supports:

- Synchronous and async functions
- Passing arguments via UIDs from snapshots
- Timeout protection against infinite loops
- JSON-serializable return values

#### Example Usage

```json
{
  "function": "() => document.title",
  "timeout": 5000
}
```

```json
{
  "function": "(el) => el.innerText",
  "args": [{ "uid": "abc123" }]
}
```

#### Security Considerations

This tool allows executing arbitrary JavaScript in the browser context, which requires careful consideration:

1. **Sandboxing:** Scripts run in the page context with full DOM access
2. **Timeout Protection:** Default 5s timeout prevents infinite loops
3. **Size Limits:** Functions limited to 16KB
4. **Return Values:** Must be JSON-serializable

#### Future Work

Before re-enabling this tool, consider:

- [ ] Add explicit security warnings in tool description
- [ ] Document safe usage patterns and anti-patterns
- [ ] Consider adding a "safe mode" with restricted APIs
- [ ] Add example use cases to documentation
- [ ] Evaluate if snapshot + UID-based tools cover most use cases

#### Re-enabling

To re-enable this tool:

1. Uncomment exports in `src/tools/index.ts`
2. Uncomment handler registration in `src/index.ts`
3. Uncomment tool definition in `src/index.ts` allTools array
4. Update documentation with security guidelines
5. Run tests: `npm test -- script`

---

## Planned Features

### BiDi Native Tab Management

**Status:** Planned
**Priority:** High

Currently, tab management uses Selenium WebDriver's window handles. Future versions should use Firefox BiDi's native `browsingContext` API for:

- Better performance
- More reliable tab metadata
- Real-time tab updates
- Window management

**Implementation Location:** `src/firefox/pages.ts`

### Console Message Filtering by Source

**Status:** Planned
**Priority:** Medium

Add ability to filter console messages by source (realm/context):

```json
{
  "level": "error",
  "source": "worker",
  "limit": 10
}
```

**Implementation Location:** `src/tools/console.ts`

### Network Request Body Capture

**Status:** Planned
**Priority:** Medium

Capture and expose request/response bodies for network requests:

- POST/PUT request bodies
- Response bodies (with size limits)
- Binary data handling

**Implementation Location:** `src/firefox/events/network.ts`

### Advanced Performance Profiling

**Status:** Planned
**Priority:** Low
**Note:** Basic performance metrics are available via Navigation Timing API (not exposed as MCP tools)

Full performance profiling support would include:

- CPU profiling
- Memory snapshots
- FPS monitoring
- Long task detection
- Custom performance marks and measures

**Reason for deferral:** WebDriver BiDi does not currently provide advanced profiling APIs. Use Firefox DevTools UI Performance panel for advanced profiling.

**Previous implementation:** Performance tools were removed in PERFORMANCE-01 task due to limited BiDi support and complexity for minimal value.

---

## Rejected Features

None yet.

---

## Contributing

Have an idea for a new feature? Please:

1. Check this document first
2. Open an issue with the `feature-request` label
3. Describe the use case and benefits
4. Consider security and performance implications
