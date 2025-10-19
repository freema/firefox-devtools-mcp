# Code Review – TESTS-01 Smoke Tests

Date: 2025-10-19

## What was done

Created basic smoke tests to fix CI pipeline failure. The CI was failing because no test files existed in the `tests/` directory, causing vitest to exit with code 1.

### Files created
- **tests/smoke.test.ts** – Comprehensive smoke tests covering basic functionality

## Problem solved

**CI Error**:
```
No test files found, exiting with code 1
include: tests/**/*.test.ts
exclude:  node_modules, dist
Error: Process completed with exit code 1.
```

**Root cause**:
- vitest.config.ts configured to look for `tests/**/*.test.ts`
- Only `tests/setup.ts` existed (no actual test files)
- All existing tests are in `old/mcp_gsheet/tests/` and `old/mcp_dev_tool_chrome/tests/`

**Solution**: Created smoke tests that validate basic functionality without requiring a Firefox instance.

## Smoke test coverage

The smoke test suite covers 5 main areas:

### 1. Constants validation
```typescript
describe('Constants', () => {
  it('should have correct server name', () => {
    expect(SERVER_NAME).toBe('firefox-devtools');
  });

  it('should have valid server version', () => {
    expect(SERVER_VERSION).toMatch(/^\d+\.\d+\.\d+/);
    expect(SERVER_VERSION).toBe('0.2.0');
  });
});
```

**Why important**: Ensures version constants are correctly set, especially after version bumps.

### 2. Module imports
```typescript
describe('Module imports', () => {
  it('should import tools without errors', async () => {
    const { listPagesTool } = await import('../src/tools/pages.js');
    const { takeSnapshotTool } = await import('../src/tools/snapshot.js');
    const { listConsoleMessagesTool } = await import('../src/tools/console.js');
    const { listNetworkRequestsTool } = await import('../src/tools/network.js');
    // ... assertions
  });
});
```

**Why important**: Catches syntax errors, missing dependencies, and broken imports early.

### 3. Tool schema validation
```typescript
describe('Tool schemas', () => {
  it('should have valid inputSchema for pages tools', async () => {
    // Validates all tool schemas are well-formed
  });

  it('should have valid inputSchema for snapshot tool', async () => {
    // Validates new parameters (includeText, maxDepth, etc.)
  });

  it('should have valid inputSchema for console tool', async () => {
    // Validates new filters (textContains, source, format)
  });

  it('should have valid inputSchema for network tool', async () => {
    // Validates format parameter
  });
});
```

**Why important**:
- Ensures MCP tool schemas are valid JSON Schema
- Catches missing or incorrectly typed parameters
- Validates all Release 0.2.0 additions (format, filters, etc.)

### 4. Response helpers
```typescript
describe('Response helpers', () => {
  it('should create success response', async () => {
    const response = successResponse('Test message');
    expect(response.content).toEqual([
      { type: 'text', text: 'Test message' }
    ]);
  });

  it('should create error response', async () => {
    const response = errorResponse('Test error');
    expect(response.content).toEqual([
      { type: 'text', text: 'Error: Test error' }
    ]);
    expect(response).toHaveProperty('isError', true);
  });

  it('should create JSON response', async () => {
    const data = { foo: 'bar', count: 42 };
    const response = jsonResponse(data);
    expect(response.content[0].text).toBe(JSON.stringify(data, null, 2));
  });
});
```

**Why important**: Validates core response formatting used by all tools.

## Test results

```bash
npm run test:run

✓ tests/smoke.test.ts (11 tests) 43ms

Test Files  1 passed (1)
     Tests  11 passed (11)
```

All 11 smoke tests passing.

## Decisions and impact

### Decision 1: Smoke tests over integration tests

**Rationale**:
- Integration tests require running Firefox instance
- GitHub Actions would need Firefox + geckodriver setup
- Smoke tests run fast without external dependencies
- Sufficient for CI health check

**Trade-off**: Not testing actual browser automation (covered by manual testing and offline scripts).

### Decision 2: Test file naming pattern

Used `smoke.test.ts` to match vitest.config.ts pattern:
```typescript
include: ['tests/**/*.test.ts']
```

**Alternatives considered**:
- `*.spec.ts` - Less common in Node.js ecosystem
- `smoke.spec.ts` - Would require changing vitest config

### Decision 3: Test all Release 0.2.0 additions

Explicitly validated:
- New snapshot parameters (includeText, maxDepth)
- New console filters (textContains, source, format)
- New network format parameter
- SERVER_VERSION = 0.2.0

**Why**: Ensures all recent changes are properly integrated.

### Decision 4: Async imports in tests

```typescript
const { listPagesTool } = await import('../src/tools/pages.js');
```

**Rationale**:
- Catches import-time errors (syntax, missing deps)
- More realistic than static imports
- Isolates test suites (no shared state)

## Testing approach

### What smoke tests validate:
✅ Syntax is valid (modules load without errors)
✅ Exports are correctly named
✅ Tool schemas are well-formed JSON Schema
✅ Response helpers work as expected
✅ Constants have expected values

### What smoke tests DON'T validate:
❌ Actual browser automation (requires Firefox)
❌ WebDriver BiDi communication
❌ Tool handlers with real browser context
❌ Error handling in browser operations

**For full validation**: Use offline test scripts:
```bash
npm run test:tools      # Test all MCP tools with real browser
npm run test:input      # Test input actions (click, hover, fill)
npm run test:screenshot # Test screenshot functionality
npm run test:dialog     # Test dialog handling
```

## Initial test failures and fixes

### Issue 1: Wrong export names
**Error**: `expected undefined to be defined`

**Cause**: Used `listConsoleTool` instead of `listConsoleMessagesTool`

**Fix**: Corrected import names:
- `listConsoleTool` → `listConsoleMessagesTool`
- `listNetworkTool` → `listNetworkRequestsTool`

### Issue 2: Error response format
**Error**: `expected "Error: Test error" to equal "Test error"`

**Cause**: `errorResponse()` adds "Error: " prefix

**Fix**: Updated test to expect `'Error: Test error'`

## CI Integration

No changes needed to `.github/workflows/ci.yml`. Workflow already configured:

```yaml
- name: Test
  run: npm run test:run
```

Now that `tests/smoke.test.ts` exists:
- ✅ vitest finds test files
- ✅ Tests run successfully
- ✅ CI passes

## Coverage impact

```bash
npm run test:coverage
```

**Current coverage** (smoke tests only):
- Most tool files: ~10-15% (only imports + schema access)
- Constants: 100%
- Response helpers: ~60%

**Why low?**: Smoke tests don't execute tool handlers (require browser context).

**Future**: Add unit tests for:
- Formatter utilities (snapshot, console, network)
- CLI argument parsing
- Error handling
- Response formatting edge cases

## Future test additions

### Priority 1: Unit tests (no browser required)
- `tests/unit/formatters/snapshot-formatter.test.ts` - Test snapshot formatting logic
- `tests/unit/formatters/network-formatter.test.ts` - Test network response formatting
- `tests/unit/utils/response-helpers.test.ts` - Extended response helper tests
- `tests/unit/cli/args-parser.test.ts` - CLI argument validation

### Priority 2: Integration tests (requires browser)
- `tests/integration/tools/pages.test.ts` - Test page navigation
- `tests/integration/tools/snapshot.test.ts` - Test snapshot with real DOM
- `tests/integration/tools/input.test.ts` - Test click/hover/fill actions
- `tests/integration/events/console.test.ts` - Test console message capture
- `tests/integration/events/network.test.ts` - Test network request capture

### Priority 3: E2E tests
- `tests/e2e/mcp-server.test.ts` - Full MCP server lifecycle
- `tests/e2e/tool-execution.test.ts` - End-to-end tool calls via MCP protocol

**Current scope**: Smoke tests sufficient for CI health check. Integration tests can be added incrementally.

## References

- Vitest smoke testing: https://vitest.dev/guide/
- MCP testing best practices: https://modelcontextprotocol.io/docs/tools/testing
- old/mcp_gsheet/tests/ - Example unit tests
- old/mcp_dev_tool_chrome/tests/ - Example tool tests

## Next steps

1. **CI should now pass** ✅ - smoke tests provide test files

2. **Optional: Add more unit tests**:
   ```bash
   # Create unit test for snapshot formatter
   mkdir -p tests/unit/formatters
   touch tests/unit/formatters/snapshot-formatter.test.ts
   ```

3. **Optional: Add integration tests** (requires browser setup in CI):
   ```yaml
   # .github/workflows/ci.yml
   - name: Install Firefox
     run: |
       sudo apt-get update
       sudo apt-get install -y firefox

   - name: Integration tests
     run: npm run test:integration
   ```

4. **Optional: Coverage threshold enforcement**:
   ```typescript
   // vitest.config.ts
   coverage: {
     thresholds: {
       lines: 70,    // Enforce 70% minimum
       functions: 70,
       branches: 70,
       statements: 70,
     },
   }
   ```

## Success criteria

✅ **Achieved**:
- Smoke tests created and passing (11/11)
- CI no longer fails with "No test files found"
- All checks pass: `npm run check`
- All tests pass: `npm run test:run`
- Tool schemas validated for Release 0.2.0 features
- Response helpers validated

⏳ **Pending verification** (in CI):
- GitHub Actions CI workflow passes
- Tests run successfully in CI environment
- Coverage upload to Codecov works

---

**Impact**: CI pipeline is now functional. Smoke tests provide basic safety net without requiring complex browser automation setup in CI.
