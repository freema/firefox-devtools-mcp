# 20 – Snapshot + UID mapping

Cíl

- Navrhnout a implementovat snapshot + UID resolver ve vrstvě klienta (src/firefox/*). MCP nástroj(y) přijdou později.

Rozsah (jen klient)

- `src/firefox/snapshot.ts` – implementace:
  - In-page walker (výběr relevantních tagů/atributů, např. role/name/text, href/src)
  - Generování/injektování stabilních `data-mcp-uid` (per navigace)
  - Export snapshotu (text/JSON) kompaktně (LLM-friendly)
- Veřejné metody klienta:
  - `takeSnapshot(): Promise<{ text: string, json: object }>`
  - `resolveUidToSelector(uid: string): Promise<string>` (např. `[data-mcp-uid="..."]`)
  - `clickByUid/hoverByUid/fillByUid/dragByUidToUid` využijí resolver (v úkolu 21)

Akceptační kritéria

- `takeSnapshot()` vrací čitelný snapshot s UID a základní hierarchií
- Resolver umí vrátit selector z UID a element lze nalézt
- Snapshot se obnoví po navigaci; UID jsou stabilní v rámci jedné navigace

Poznámky k implementaci

- Klademe důraz na kompaktnost a použitelnost (LLM-friendly)
- Zvážit filtrování „šumu“ (skrýt neinteraktivní/duplicity)
- UID generovat deterministicky z pořadí/atributů v rámci aktuálního DOMu; nepřesouvat je mezi navigacemi

Reference

- `old/mcp_dev_tool_chrome/src/tools/snapshot.ts`
- `tasks/17-bidi-coverage-vs-chrome-tools.md`
