# NETWORK-01: Overhaul list_network_requests

Goal: Make the tool simpler, more reliable, and MCP‑friendly with clear filters, stable IDs, and a JSON‑serializable `inputSchema`.

Current issues
- Input schema used Zod objects directly in `inputSchema` (not JSON for MCP clients).
- Verbose text output without stable IDs; hard to follow up with another call.
- Filters didn’t cover common scenarios (time window, limit, sorting) and combinations were clunky.
- Dependency on `start/stop` for capture complicated flows.

Proposed solution
- `inputSchema` (plain JSON Schema):
  - `limit` (number, default 50)
  - `sinceMs` (number) – only requests newer than N ms
  - `urlContains` (string, case‑insensitive)
  - `method` (string, e.g., GET/POST)
  - `status`, `statusMin`, `statusMax` (number)
  - `isXHR` (boolean)
  - `resourceType` (string; or enum of known types)
  - `sortBy` (string: timestamp|duration|status; default timestamp desc)
  - `detail` (string: summary|min|full; default summary)
- Stable identifiers: always include `id` (BiDi request id) in the response.
- Structured output: for `detail=min|full`, return JSON (stringified in MCP) with: id, url, method, status, statusText, resourceType, isXHR, timings{requestTime,responseTime,duration}, requestHeaders, responseHeaders. For `detail=summary` return concise lines with `id`/URL/Status.
- Independent of `start/stop`: capture can remain enabled (see NETWORK‑03); filters provide the relevant slice.

Acceptance criteria
- `inputSchema` is plain JSON Schema (no Zod); MCP clients show valid parameters.
- With no params: returns last 50 requests sorted by `timestamp desc`.
- Filters are cumulative and every item includes a stable `id`.
- `detail=full` includes headers and `timings.duration` (when available).
- Output clearly instructs to fetch details via `get_network_request` with the `id` (see NETWORK‑02).

Implementation steps
1) Replace Zod with JSON Schema in `inputSchema` (src/tools/network.ts).
2) Update handler:
   - add `limit`, `sinceMs`, `sortBy`, `detail` and unified filters.
   - ensure `id` is present and summary formatting is consistent.
   - for `detail`, stringify JSON into MCP `text` content (no large blobs).
3) Add brief usage hints in the description (no disclaimers).
4) Update docs and tests as needed.

References
- src/tools/network.ts
- src/firefox/events/network.ts (id, status, timings)

---

Note: With NETWORK‑03 (always‑on), UX is significantly simplified.
