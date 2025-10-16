**34 – MCP tools: Console + Pages drobný refaktor**

Cíl

- Dodat symetrické nástroje a zpřehlednit výstup: možnost čistit console logy a (volitelně) refreshnout seznam stránek. Textový výstup bude konzistentní a stručný.

Rozsah

- `src/tools/console.ts`:
  - Nový nástroj `clear_console_messages` → `firefox.clearConsoleMessages()`.
  - `list_console_messages` – přidat volitelné filtry: `level?: 'debug'|'info'|'warn'|'error'`, `limit?: number` (default 50), `sinceMs?: number` (filtrovat dle timestampu ≥ now - sinceMs).
  - Výstup: hlavička + max `limit` položek, jednotné emoji dle levelu.
- `src/tools/pages.ts`:
  - Nový nástroj `refresh_pages` → zavolá `firefox.refreshTabs()` a vrátí stručný výpis stejně jako `list_pages`.
  - U `list_pages` lehce upravit formát (zachovat kompatibilitu), vypsat počet tabs a index vybraného tabu.

Prompty (zahrnout do popisů nástrojů)

- Console:
  - „Použij `clear_console_messages` před novým měřením/akcí, aby byl výpis relevantní.“
  - „Při výpise používej filtry (level/limit/sinceMs) — ušetříš kontext a rychleji najdeš podstatné logy.“
- Pages:
  - „`refresh_pages` aktualizuje seznam po otevření/zavření karet. `select_page` vybírá kontext pro další akce.“

Akceptační kritéria

- `clear_console_messages` a `refresh_pages` jsou exportované v `src/tools/index.ts` a zaregistrované v `src/index.ts`.
- `list_console_messages` podporuje filtry a limit, bez breaking changes (parametry volitelné).
- `list_pages` a `refresh_pages` mají konzistentní textový výstup (indikátor vybraného tabu).

Dotčené soubory

- src/tools/console.ts
- src/tools/pages.ts
- src/tools/index.ts (exporty)
- src/index.ts (registrace handlerů)
- tasks/99-specification.md (doplnění dokumentace)
