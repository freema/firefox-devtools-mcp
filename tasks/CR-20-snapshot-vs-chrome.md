# Snapshot vs Chrome MCP — Analysis

Goal

- Compare our Firefox BiDi snapshot implementation to the old Chrome DevTools MCP snapshot, highlight gaps, and recommend concrete next steps.

Summary

- Chrome MCP uses the Accessibility (AX) tree via Puppeteer and does not mutate the DOM. UIDs map to AX nodes and can be resolved back to element handles reliably, including across iframes.
- Our Firefox snapshot injects `data-mcp-uid` attributes into the DOM, walks a filtered DOM tree, and maps UIDs to CSS selectors. It is simple and portable under BiDi, but misses AX semantics and some safeguards.

What Chrome MCP does

- Source of truth: Accessibility tree
  - Creates an AX snapshot for the selected page with `includeIframes: true` (puppeteer), then assigns incremental IDs per snapshot.
  - Code: `old/mcp_dev_tool_chrome/src/McpContext.ts:315` (createTextSnapshot)
  - Nodes keep a reference to the underlying element via `node.elementHandle()` used to perform actions.
  - Code: `old/mcp_dev_tool_chrome/src/McpContext.ts:293`

- UID semantics and staleness
  - UID format: `{snapshotId}_{counter}`. The server rejects stale UIDs by checking the UID prefix against the current snapshot.
  - Code: `old/mcp_dev_tool_chrome/src/McpContext.ts:290`

- Formatting for responses
  - Snapshot is formatted with role/name and ARIA-like properties, not raw tag names. Optimized for LLM consumption.
  - Code: `old/mcp_dev_tool_chrome/src/formatters/snapshotFormatter.ts:8`
  - Emission path: `McpResponse` sets `includeSnapshot`, triggers `createTextSnapshot()`, and renders formatted tree.
  - Code: `old/mcp_dev_tool_chrome/src/McpResponse.ts:135`

What our Firefox snapshot does

- Source of truth: DOM walker with mutation
  - Injects `data-mcp-uid` attributes during a JS-executed walk, filtering to “relevant” elements (interactive and contentful containers).
  - Code: `src/firefox/snapshot.ts:53`
  - Collects a compact tree with: `tag`, `role` (attribute), `name` (from aria-label/label/placeholder/title/alt/text), `value`, `href`, `src`, `text`.
  - Text formatter renders a readable tree with key attributes.
  - Code: `src/firefox/snapshot.ts:304`

- UID semantics and mapping
  - UID format matches Chrome `{snapshotId}_{counter}`; mapping stored as UID → `[data-mcp-uid="..."]` selector.
  - Code: `src/firefox/snapshot.ts:283`
  - Public API exposed via client facade: `takeSnapshot()`, `resolveUidToSelector()`, `clearSnapshot()`.
  - Code: `src/firefox/index.ts:237`

- How tools use UIDs today
  - The `evaluate_script` tool builds `document.querySelector('[data-mcp-uid="..."]')` inline and does not consult the client resolver, nor checks for stale snapshot IDs.
  - Code: `src/tools/script.ts:65`

Key differences and impact

- AX tree vs DOM tree
  - Chrome’s AX-based snapshot exposes semantic roles, names, and state in a standardized way and does not mutate the page.
  - Our DOM-based approach approximates name/role but lacks full AX semantics and may include/exclude elements differently.

- Staleness detection
  - Chrome rejects UIDs from older snapshots by comparing the prefix snapshotId.
  - We clear the internal map on navigation, but tools that query via `querySelector` can still match stale UIDs if old attributes remain on elements that are not re-labeled in a newer snapshot. This can yield inconsistent behavior.

- Iframes coverage
  - Chrome includes iframes (`includeIframes: true`).
  - Our walker starts from `document.body` only; no cross-frame traversal. Same-origin iframes could be included; cross-origin cannot (SOP).

- Element handles vs selectors
  - Chrome resolves UIDs directly to element handles and performs actions via Puppeteer APIs.
  - We resolve to CSS selectors, which is sufficient for Selenium/WebDriver interactions, but less direct than handles.

- DOM mutation
  - We inject `data-mcp-uid` attributes. While `data-*` is generally safe, it can trigger app logic or styling in rare cases and leaves attributes behind until reinjection.

Recommendations (incremental and BiDi-friendly)

1) Add explicit staleness checks
  - Track the latest `snapshotId` on the client. Expose it via `SnapshotManager` and/or return it in `takeSnapshot()`; require UID prefix to match in resolver.
  - Update tools (e.g., `evaluate_script`) to resolve UIDs via the client (`resolveUidToSelector`) and reject UIDs from older snapshots.

2) Include iframes where possible
  - Extend the walker to traverse same-origin iframes using `iframe.contentDocument`. Emit placeholder nodes for cross-origin frames (with `src` and note), similar to Chrome’s holistic view.

3) Align snapshot formatting with Chrome’s AX style
  - Keep DOM-based capture but adopt Chrome-like text formatting: `uid role "name"` plus selected ARIA-like properties where derivable (disabled/expanded/focused/required/checked/pressed, etc.).
  - Preserve `tag` as an extra attribute for debugging parity.

4) Reduce DOM side effects
  - Consider marking the snapshot via a single `data-mcp-snapshot-id` attribute on `<html>` and reassigning per run; optionally clean old `data-mcp-uid` attributes before reinjection.
  - Alternatively, keep injection but ensure reinjection overwrites any previous UID consistently (already true for included nodes); explicitly remove old attributes from nodes no longer included.

5) Provide handle-level resolution for input APIs
  - Add `resolveUidToElement()` that returns a `WebElement` via `driver.findElement(By.css(...))`. Use it in UID-based input tools (click/hover/fill/drag/upload) to avoid ad-hoc `querySelector` in tool code.

6) Add a first-class `take_snapshot` MCP tool
  - Mirror Chrome’s tool: set a response flag to include snapshot, call client `takeSnapshot()`, and render using a Chrome-like formatter. Keep server-side formatting centralized.

7) Testing and limits
  - Add snapshot smoke tests to `scripts/test-bidi-devtools.js` (take snapshot, act by UID, navigate, ensure stale UID rejected, iframes placeholder check).
  - Add safety limits: max depth, max nodes, and time budget for the walker.

Tradeoffs and rationale

- AX parity vs portability: BiDi does not currently expose a standardized AX snapshot API. DOM-based capture with AX-like formatting is a practical compromise that keeps the UX close to Chrome MCP while remaining portable.
- Injection simplicity: UID injection makes element lookup robust across action calls. We can mitigate side effects with better cleanup and explicit staleness checks.

Pointers (code)

- Firefox snapshot entrypoints: `src/firefox/snapshot.ts:53`, `src/firefox/snapshot.ts:283`, `src/firefox/snapshot.ts:304`
- Client facade integration: `src/firefox/index.ts:237`
- Script tool using raw selectors: `src/tools/script.ts:65`
- Chrome snapshot creation: `old/mcp_dev_tool_chrome/src/McpContext.ts:315`
- Chrome element handle resolution: `old/mcp_dev_tool_chrome/src/McpContext.ts:293`
- Chrome staleness check: `old/mcp_dev_tool_chrome/src/McpContext.ts:290`
- Chrome snapshot formatting: `old/mcp_dev_tool_chrome/src/formatters/snapshotFormatter.ts:8`

Proposed tasks (follow-ups)

1) Snapshot staleness and resolver alignment (client + tools)
2) Iframe traversal and placeholders (client)
3) AX-like formatter and MCP `take_snapshot` tool (server)
4) Optional attribute cleanup strategy (client)
5) UID → WebElement resolver for input tools (client)
6) Test coverage in `scripts/test-bidi-devtools.js`

