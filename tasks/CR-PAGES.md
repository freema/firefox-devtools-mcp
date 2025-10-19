# Code Review – PAGES: Remove refresh_pages (duplicate of list_pages)

Date: 2025-10-19

## What Was Done

Removed redundant `refresh_pages`, which duplicated `list_pages`:

- Removed tool definition (src/tools/pages.ts:21-31):
  - Deleted `refreshPagesTool`
  - Updated `listPagesTool` description to state it always refreshes
- Removed handler (src/tools/pages.ts:151-164):
  - Deleted `handleRefreshPages`
  - Kept `handleListPages` (already calls `refreshTabs()`)
- Removed exports (src/tools/index.ts:6-17):
  - Deleted `refreshPagesTool`, `handleRefreshPages` exports
- Removed registrations (src/index.ts):
  - Deleted handler mapping from `toolHandlers` (line 83)
  - Deleted tool entry from `allTools` (line 127)

## Decisions and Impact

### Redundancy analysis

Kept – handleListPages:
```typescript
await firefox.refreshTabs();
const tabs = firefox.getTabs();
const selectedIdx = firefox.getSelectedTabIdx();
return formatPageList(tabs, selectedIdx);
```

Removed – handleRefreshPages:
```typescript
await firefox.refreshTabs();
const tabs = firefox.getTabs();
const selectedIdx = firefox.getSelectedTabIdx();
return '🔄 Page list refreshed.\n\n' + formatPageList(tabs, selectedIdx);
```

Only difference: the "refreshed" prefix; functionally identical.

### API simplification

Before:
```
1. navigate_page (URL)
2. refresh_pages       ← redundant
3. list_pages
```

After:
```
1. navigate_page (URL)
2. list_pages          ← automatically refreshes
```

Fewer steps (3 → 2), cleaner API.

### Docs update

`listPagesTool.description` now explicitly says it returns the current state and refreshes automatically.

### Breaking change
- API break: clients calling `refresh_pages` will fail
- Justification: 100% duplicate of `list_pages`
- Migration: replace `refresh_pages` with `list_pages` (1:1)

## References

### Touched files
- `src/tools/pages.ts` – removed definition/handler
- `src/tools/index.ts` – removed exports
- `src/index.ts` – removed registrations

### Related
- Recommendation from tools-analysis.md
- Consistent with API simplification (similar to NETWORK-03 always-on)

## Next Steps

- Document the breaking change in CHANGELOG
- Update README/examples if they reference `refresh_pages`
- Consider similar simplifications for other tools
- Monitor user feedback on the simplified API
