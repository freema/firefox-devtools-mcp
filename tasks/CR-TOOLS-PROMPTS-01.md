# Code Review – TOOLS-PROMPTS-01: MCP Tool Prompt Improvements

Datum: 2025-10-19

## Co bylo provedeno

Systematické zlepšení všech MCP tool descriptions pro lepší agent-friendliness, konzistenci a actionability:

### Style Guidelines Applied
- **First sentence**: Co tool dělá (1 line, concise)
- **Follow-up**: Kdy použít, key tips, constraints
- **TIP usage**: Používáno sparsely pro critical guidance
- **Format**: Krátké, actionable descriptions bez verbose disclaimers

### Changes by Tool Category

**Pages** (src/tools/pages.ts):
- `list_pages`: "List all open tabs..." → Přidán hint "Use the index with select_page"
- `new_page`: Zkráceno, přidáno "Returns the new tab index in the response"
- `navigate_page`: Zkráceno na one-liner
- `select_page`: Konzistentní "Select the active tab by index (preferred)..."
- `close_page`: "Close the tab at the given index. Use list_pages to find valid indices."

**Console** (src/tools/console.ts):
- `list_console_messages`: "List console messages for the selected tab..." → Zkráceno, focus na filters
- `clear_console_messages`: Zkráceno s TIP: "Clear before a new measurement to keep output focused"

**Network** (src/tools/network.ts):
- `list_network_requests`: **KRITICKÉ**: Přidáno "across all tabs" (dokumentuje global capture), explicitní mention filters a detail levels
- `get_network_request`: Zkráceno na "by id (recommended). URL lookup is available as fallback..."

**Snapshot** (src/tools/snapshot.ts):
- `take_snapshot`: Zkráceno, přidán TIP s actionable guidance (click_by_uid/fill_by_uid/hover_by_uid)
- `resolve_uid_to_selector`: Zkráceno na "(debugging aid). Fails on stale UIDs—take a fresh snapshot first"
- `clear_snapshot`: "Usually not needed, as navigation invalidates snapshots automatically"

**Input** (src/tools/input.ts):
- **Removed**: `COMMON_UID_WARNING` constant (unused po změnách)
- Všechny tools: Zkráceny z verbose multi-line descriptions na concise one-liners s TIP
- `click_by_uid`: "Click an element identified by its UID. Supports double-click via dblClick=true. TIP:..."
- `hover_by_uid`: "Hover over an element identified by its UID. TIP:..."
- `fill_by_uid`: "Fill a text input or textarea... Keep values short and safe. TIP:..."
- `drag_by_uid_to_uid`: "Simulate HTML5 drag-and-drop... May not work with all custom libraries"
- `fill_form_by_uid`: "Fill multiple form fields in one call..."
- `upload_file_by_uid`: "Upload a file into an <input type=\"file\">... The file path must be accessible to the server"

**Screenshot** (src/tools/screenshot.ts):
- `screenshot_page`: Zkráceno, TIP: "Use for visual verification rather than structural inspection"
- `screenshot_by_uid`: Zkráceno, TIP: "Take a fresh snapshot if the UID is stale"

**Utilities** (src/tools/utilities.ts):
- `accept_dialog`: "Accept the active browser dialog... For prompts, you may provide promptText..."
- `dismiss_dialog`: "Dismiss the active browser dialog..."
- `navigate_history`: "Navigate the selected tab's history... NOTE: After navigation, UIDs... are stale"
- `set_viewport_size`: "Set the browser viewport size... In some modes (e.g., headless), the actual size may vary slightly"

**Script** (src/tools/script.ts):
- `evaluate_script`: "Execute a JavaScript function... Use with caution; prefer snapshot+UID tools... This tool may be disabled by default"

## Rozhodnutí a dopady

### Conciseness vs. Completeness
**Před:**
```typescript
description:
  'List all console messages for the currently selected page since the last navigation. ' +
  'Use filters (level/limit/sinceMs) to narrow results and save context - helps find relevant logs faster.',
```

**Po:**
```typescript
description:
  'List console messages for the selected tab since the last navigation. Use filters (level, limit, sinceMs) to focus on recent and relevant logs.',
```

**Benefit:**
- Kratší, rychleji čitelné pro agenty
- Stále obsahuje všechny klíčové informace
- Odstraněny redundantní fráze

### Global Network Capture Documentation
**Kritická změna** v `list_network_requests`:
```typescript
'List recent network requests across all tabs. Network capture is always on. ...'
```

**Důvod:**
- Current implementation používá global subscribe (všechny kontexty)
- Agenti musí vědět, že requests jsou from all tabs, ne jen selected tab
- Připraveno pro případnou budoucí změnu na per-tab capture

### TIP Usage Pattern
**Guidelines:**
- TIP použit pouze pro critical/actionable guidance
- Příklady: "TIP: Take a fresh snapshot if the UID becomes stale"
- **NE** použit pro general info nebo disclaimers

### Removal of Verbose Warnings
**Removed patterns:**
- Long multi-line disclaimers (e.g., COMMON_UID_WARNING)
- Repeated "IMPORTANT:" blocks
- Protocol limitations (moved to docs)

**Kept:**
- Short actionable NOTEs (e.g., UIDs become stale after navigation)
- Critical safety tips (e.g., keep values short, file path must be accessible)

### Consistency Improvements
**Terminology standardization:**
- "selected tab" místo mix "selected page" / "currently selected page"
- "identified by its UID" místo variations
- "TIP:" prefix pro actionable guidance
- "NOTE:" prefix pro important context

## Reference

### Dotčené soubory
- `src/tools/pages.ts` - 5 tools updated
- `src/tools/console.ts` - 2 tools updated
- `src/tools/network.ts` - 2 tools updated (critical: global capture mention)
- `src/tools/snapshot.ts` - 3 tools updated
- `src/tools/input.ts` - 6 tools updated + COMMON_UID_WARNING removed
- `src/tools/screenshot.ts` - 2 tools updated
- `src/tools/utilities.ts` - 4 tools updated
- `src/tools/script.ts` - 1 tool updated

**Total**: 25 tool descriptions improved

### Related
- Vazba na CODE-COMMENTS-01 (internal comments cleanup)
- Vazba na SNAPSHOT-01 (guidance přidán do výstupu, ne jen description)
- Vazba na NETWORK-03 (always-on capture dokumentován v description)

## Další kroky

- Monitorovat agent behavior s novými descriptions (zejména global network capture understanding)
- Zvážit přidání examples do inputSchema descriptions pro komplexní tools
- Dokumentovat "approved description style" v contributing guide
- Pokud se network capture změní na per-tab, aktualizovat description

