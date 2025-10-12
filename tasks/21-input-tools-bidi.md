# 21 – Input API ve vrstvě klienta (click/hover/fill/drag/upload)

Cíl

- Implementovat vstupní akce ve firefox klientovi, s podporou UID lokátorů. MCP integrace přijde později.

Rozsah (jen klient)

- Metody v `src/firefox/devtools.ts` (nebo `dom.ts`):
  - `clickByUid(uid)`, `hoverByUid(uid)`, `fillByUid(uid, value)`, `dragByUidToUid(fromUid, toUid)`, `fillFormByUid([{uid, value}])`
  - `uploadFileBySelector(selector, filePath)` (priorita vysoká; pro `<input type=file>`) a dle potřeby `uploadFileByUid(uid, filePath)`
- Použití resolveru z úkolu 20 (UID → selector)
- Implementace: Actions (hover/drag) + JS fallback (D&D), sendKeys pro upload

Akceptační kritéria

- API metody fungují na běžných formulářových prvcích (happy path)
- D&D funguje pro jednoduché případy (best-effort)
- File upload funguje pro `<input type=file>` (hidden→unhide fallback)
- Testováno rozšířením `scripts/test-bidi-devtools.js`

Poznámky k implementaci

- Stabilita drag & drop často závisí na webu; preferovat Actions, případně JS eventy
- Operace po akci krátce počkat (microtask/raf) pro zachycení následných eventů

Reference

- `old/mcp_dev_tool_chrome/src/tools/input.ts`
- `tasks/20-snapshot-and-uid-mapping.md`
- `tasks/17-bidi-coverage-vs-chrome-tools.md`
