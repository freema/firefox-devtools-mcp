# Code Review – CODE-COMMENTS-01: Review and cleanup of code comments

Datum: 2025-10-19

## Co bylo provedeno

Systematický audit a cleanup všech komentářů v `src/` pro zajištění čistoty, přesnosti a konzistence:

### Odstranění internal task references
- **src/index.ts** (řádky 81-121):
  - Odstraněny komentáře "task NN" (task 06, 08, 09, 29, 30, 31)
  - Nahrazeny neutrálními kategoriemi (Pages, Console, Network, Snapshot, Input, Screenshot, Utilities)
  - Aplikováno v `toolHandlers` Map i `allTools` array
- **src/tools/pages.ts** (řádek 2):
  - "Full implementation in task 06" → "Page navigation and management tools for MCP"
- **src/tools/console.ts** (řádek 2):
  - "Full implementation in task 08" → "Console tools for MCP"
- **src/tools/script.ts** (řádek 2):
  - "Full implementation in task 08" → "JavaScript evaluation tool (currently disabled - see docs/future-features.md)"
- **src/firefox/index.ts** (řádky 130, 347):
  - "(Task 21)" → odstraněno z "UID-based input methods"
  - "(Task 22)" → odstraněno z "Screenshot"
- **src/firefox/dom.ts** (řádky 125, 298):
  - "(Task 21)" → odstraněno z "UID-based input methods"
  - "(Task 22)" → odstraněno z "Screenshot"

### Odstranění MVP disclaimers
- **src/tools/performance.ts** (řádek 14):
  - "NOTE: This is a basic MVP implementation" → odstraněno
  - Zachována pouze jasná informace o omezeních BiDi
- **src/tools/network.ts**:
  - Ověřeno: žádné MVP disclaimery (již opraveno v NETWORK-01/02/03)

### Oprava nepřesných komentářů
- **src/firefox/dom.ts** (řádek 199):
  - **Před**: "Use Actions API first, then dispatch JS events as fallback"
  - **Po**: "Use JS drag events fallback for compatibility (Actions DnD not used)"
  - **Důvod**: Kód používá pouze JS events, Actions API není implementováno

### Always-on komentáře
- **src/firefox/events/network.ts** (řádek 32-34):
  - Přidán komentář: "Enables monitoring by default (always-on capture)"
  - Konzistence s implementací (již nastaveno v řádcích 157-159)

### Aktualizace souboru pro referenci
- **src/tools/performance.ts** (řádek 1-3):
  - Header: "Performance monitoring tools (not exported - see docs/future-features.md)"
  - "Kept for reference: limitations and alternatives documented within"

## Rozhodnutí a dopady

### Odstranění task references
**Proč:**
- Task čísla jsou internal project breadcrumbs
- Nepřinášejí hodnotu pro budoucí contributors
- Zhoršují čitelnost kódu

**Benefit:**
- Durable, self-explanatory komentáře
- Kategorie (Pages, Console, Network...) jsou čitelnější než "task 06"

### Odstranění MVP disclaimers z tool descriptions
**Proč:**
- Tool descriptions jsou viditelné pro MCP agenty
- Disclaimery jako "MVP implementation" nebo "BiDi limitations" patří do docs
- Tool descriptions mají být actionable a concise

**Benefit:**
- Čistší API pro agenty
- Dokumentace omezení zůstává v docs/future-features.md

### Oprava DnD komentáře
**Kritické:**
- Komentář tvrdil "Use Actions API first, then JS events as fallback"
- Kód ve skutečnosti používá pouze JS events
- **Nepřesný komentář by mohl zmást vývojáře hledající Actions API implementaci**

**Oprava:**
- Explicitně uvádí "Actions DnD not used"
- Ponechává možnost přidat TODO pro budoucí Actions API implementaci

### Always-on konzistence
- Komentáře nyní reflektují always-on model (NETWORK-03)
- Jasně uvádí "Enables monitoring by default (always-on capture)"

## Reference

### Dotčené soubory
- `src/index.ts` - tool handler mappings a registrace
- `src/tools/pages.ts`, `console.ts`, `script.ts`, `performance.ts` - headers
- `src/firefox/index.ts` - public API
- `src/firefox/dom.ts` - DOM interactions (DnD comment fix)
- `src/firefox/events/network.ts` - network event handling

### Verification
Spuštěno:
```bash
rg -n "Task [0-9]|Full implementation|MVP" src/
```
Výsledek: **žádné výskyty** ✅

### Související změny
- NETWORK-01/02/03: network tools již měly čisté descriptions
- PERFORMANCE-01: performance tools odstraněny, soubor ponechán pro referenci
- SNAPSHOT-01: snapshot output již má guidance (ne v komentářích)

## Další kroky

- Zachovat konzistenci při přidávání nových features (žádné task refs v komentářích)
- Dokumentovat omezení v docs/future-features.md, ne v tool descriptions
- Pravidelně auditovat komentáře pro přesnost (zejména po větších refactorech)
- Zvážit lint rule pro detekci "Task [0-9]" patterns v pull requestech

