Title: 10 – Testování a Inspector workflow

Cíl

- Pokrýt unit testy (schémata, formatery, helpery) a základní integration sanity (pokud je dostupný headless Firefox). Zajistit plynulé ladění přes Inspector.

Kroky

- Unit testy (Vitest):
  - Validace vstupních schémat (Zod) pro MVP nástroje
  - Response formatery (text, přílohy) – vzor v `old/mcp_dev_tool_chrome/src/McpResponse.ts`

- Integration sanity (volitelné):
  - Headless běh: otevřít stránku, `list_pages`, `navigate_page`, `take_screenshot`
  - Mocks, pokud není k dispozici skutečný prohlížeč v CI

- Inspector: 
  - `npm run inspector` – build + stdio
  - `npm run inspector:dev` – hot-reload přes `tsx`

Reference

- `old/mcp_gsheet/tests/*`
- `old/mcp_dev_tool_chrome/tests/*`

Akceptační kritéria

- `npm run test` proběhne lokálně.
- Inspector ukáže registrované tools a dovolí ruční ověření základních funkcí.

