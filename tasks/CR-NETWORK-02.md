# Code Review – NETWORK-02: Redesign get_network_request

Date: 2025-10-19

## What Was Done

Redesigned `get_network_request` for stable ID-based lookup with a URL fallback:

- Clean JSON Schema (src/tools/network.ts:71-89):
  - Primary `id` (string) – recommended lookup
  - Optional `url` (string) – fallback with collision detection
  - Neither is required in schema; handler validates that at least one is provided
- New handler (src/tools/network.ts:243-321):
  - Primary path: lookup by `id`
  - Fallback path: lookup by `url` with multiple-match detection
  - Collision handling: when multiple requests match the URL, return a list of IDs to choose from
  - Structured JSON output including all available fields
- Updated description:
  - Clearly recommends ID lookup
  - Explains risks of URL fallback (multiple matches)
  - Removes unnecessary disclaimers

## Decisions and Impact

### API design
- ID-first approach is reliable and unambiguous
- URL fallback keeps backward compatibility but warns about collisions
- Error cases: explicit messages with tips to resolve

### Collision handling
When a URL matches multiple requests:
```
Multiple requests (3) found with URL: https://example.com/api/data

Please use one of these IDs with the "id" parameter:
  - ID: req-123 | GET [200]
  - ID: req-456 | POST [201]
  - ID: req-789 | GET [304]
```
The user gets a clear list and can select by ID.

### Output
- Consistent JSON shape (same as `list_network_requests` full detail)
- Fields are `null` when not available (not `undefined`)
- Readable as text, easy to parse programmatically

### Relation to list_network_requests
- `list_network_requests` now returns `id` in every entry
- Description explicitly says: “Use the ID from list_network_requests”
- Establishes a reliable pattern: list → get detail

## References

### Touched files
- `src/tools/network.ts` – tool definition and handler (get_network_request)
- `tasks/NETWORK-02-redesign-get_network_request.md` – task spec

### Related changes
- NETWORK-01: `list_network_requests` includes a stable `id` field
- Binding: ID from list → input to get

## Next Steps

- Document recommended workflow: `list_network_requests` → use ID → `get_network_request`
- Consider adding an `index` parameter as another fallback (e.g., “get request #3”)
- Test collision handling with real scenarios (e.g., polling endpoints)
