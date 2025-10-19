# Code Review – NETWORK-01: Overhaul list_network_requests

Date: 2025-10-19

## What Was Done

Reworked `list_network_requests` into an MCP-friendly tool with clean JSON Schema and improved functionality:

- Clean JSON Schema (src/tools/network.ts:11-69)
  - All properties are plain JSON Schema objects
  - Removed `zod` import from network.ts:6
- New parameters:
  - `limit` (number, default 50) – replaces pageSize/pageIdx
  - `sinceMs` (number) – time-based filtering
  - `sortBy` (enum: timestamp/duration/status) – result ordering
  - `detail` (enum: summary/min/full) – output verbosity
- Improved handler (src/tools/network.ts:87-235):
  - Time filter via `sinceMs`
  - Flexible sorting via `sortBy` (default: timestamp desc)
  - Three output levels based on `detail`:
    - `summary`: text lines with ID in the first column
    - `min`: compact JSON (no headers)
    - `full`: full JSON including requestHeaders/responseHeaders
  - Stable `id` field included in every entry
- Updated description: no longer mentions starting monitoring (always-on now)

## Decisions and Impact

### Naming and API design
- `limit` instead of `pageSize` + `pageIdx` – simpler API for MCP agents
- `detail` controls verbosity – lets agents optimize context usage
- Stable `id` in every row – enables reliable follow-up with `get_network_request`

### Output
- Summary format: `{id} | {method} {url} {status}` – easy to read and parse
- JSON formats (min/full): structured output for programmatic use
- TIP message points to `get_network_request` with ID

### Defaults
- `limit: 50` – reasonable default
- `sortBy: 'timestamp'` descending – newest requests first
- `detail: 'summary'` – concise by default

### Removed functionality (trade-off)
- Page-based pagination removed (pageSize/pageIdx) – could be limiting for very large sets
- Mitigation: `limit` + `sinceMs` + filters provide sufficient control

## References

### Touched files
- `src/tools/network.ts` – tool definition and handler
- `tasks/NETWORK-01-overhaul-list_network_requests.md` – task spec

### Related changes
- NETWORK-03: Always-on monitoring (no start/stop tools)
- NETWORK-02: `get_network_request` now prefers ID

## Next Steps

- Test with real workflows (e.g., MCP Inspector / clients)
- Consider adding an `offset` parameter if advanced paging is needed
- Document summary/min/full formats in README/tool reference
