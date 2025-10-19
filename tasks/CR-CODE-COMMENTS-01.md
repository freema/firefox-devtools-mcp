# Code Review – CODE-COMMENTS-01: Review and cleanup of code comments

Date: 2025-10-19

## What Was Done

Systematic audit and cleanup of comments across `src/` to ensure clarity, accuracy, and consistency.

### Removed internal task references
- `src/index.ts`: removed "task NN" breadcrumbs; replaced with neutral categories (Pages, Console, Network, Snapshot, Input, Screenshot, Utilities) in both `toolHandlers` and `allTools`.
- `src/tools/pages.ts`, `console.ts`, `script.ts`: normalized headers to clear, durable descriptions.
- `src/firefox/index.ts`, `src/firefox/dom.ts`: removed stale "Task XX" markers.

### Removed MVP disclaimers
- `src/tools/performance.ts`: dropped "MVP" disclaimers; kept concise BiDi limitation notes.
- `src/tools/network.ts`: verified there are no MVP disclaimers (already addressed in NETWORK-01/02/03).

### Fixed inaccurate comments
- `src/firefox/dom.ts`: clarified the DnD approach – we use JS drag events fallback; Actions DnD is not used.

### Always-on notes
- `src/firefox/events/network.ts`: comments state "Enables monitoring by default (always-on capture)", consistent with the implementation.

### Reference file header
- `src/tools/performance.ts`: header explains it’s kept for reference (not exported) and points to docs/future-features.md.

## Decisions and Impact

### Removing task references
- Internal task numbers are project breadcrumbs that don’t age well and add noise.
- Replaced with neutral section headers for readability.

### Removing MVP disclaimers from tool descriptions
- Descriptions are agent-facing and should be concise/actionable; protocol limitations belong in docs.

### Correcting the DnD comment
- Prevents confusion – there is no Actions API path implemented.

### Always-on consistency
- Comments reflect the always-on model (NETWORK-03): "Enables monitoring by default (always-on capture)".

## References

### Touched files
- `src/index.ts`, `src/tools/pages.ts`, `src/tools/console.ts`, `src/tools/script.ts`, `src/tools/performance.ts`, `src/firefox/index.ts`, `src/firefox/dom.ts`, `src/firefox/events/network.ts`

### Verification
```
rg -n "Task [0-9]|Full implementation|MVP" src/
```
Result: none ✅

### Related
- NETWORK-01/02/03: network descriptions already clean
- PERFORMANCE-01: performance tools removed; file kept for reference
- SNAPSHOT-01: snapshot guidance added to output (not comments)

## Next Steps

- Keep comments concise and durable (no task refs)
- Document limitations under docs/future-features.md, not descriptions
- Periodically audit comments for accuracy after refactors
- Consider a lint rule to flag "Task [0-9]" patterns in PRs

