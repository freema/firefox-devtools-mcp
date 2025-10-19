# Code Review – NETWORK-01: Přepracovat list_network_requests

Datum: 2025-10-19

## Co bylo provedeno

Přepracován nástroj `list_network_requests` na MCP-přátelský nástroj s čistým JSON Schema a zlepšenou funkcionalitou:

- **Čisté JSON Schema**: Odstraněn Zod z `inputSchema` (src/tools/network.ts:11-69)
  - Všechny vlastnosti jsou nyní čisté JSON Schema objekty
  - Odstraněn import `zod` z network.ts:6
- **Nové parametry**:
  - `limit` (number, default 50) - nahrazuje pageSize/pageIdx
  - `sinceMs` (number) - filtrování podle času
  - `sortBy` (enum: timestamp/duration/status) - řazení výsledků
  - `detail` (enum: summary/min/full) - úroveň detailů výstupu
- **Vylepšený handler** (src/tools/network.ts:87-235):
  - Časové filtrování přes `sinceMs`
  - Flexibilní řazení podle `sortBy` (default: timestamp desc)
  - Tři úrovně výstupu podle `detail`:
    - `summary`: Textový výpis s ID v prvním sloupci
    - `min`: Kompaktní JSON bez headerů
    - `full`: Plný JSON včetně requestHeaders/responseHeaders
  - Stabilní `id` field je vždy součástí výstupu
- **Aktualizovaný popis**: Odstraněna zmínka o nutnosti spustit monitoring (nyní always-on)

## Rozhodnutí a dopady

### Naming a API design
- `limit` místo `pageSize` + `pageIdx` - jednodušší API pro MCP agenty
- `detail` parametr pro kontrolu verbosity - umožňuje agentům optimalizovat context usage
- Stabilní `id` v každé položce - umožňuje spolehlivé navázání přes `get_network_request`

### Výstup
- Summary formát: `{id} | {method} {url} {status}` - jasné a parsovatelné
- JSON formáty (min/full): strukturovaný výstup pro programovou zpracovatelnost
- TIP message odkazuje na `get_network_request` s ID

### Defaulty
- `limit: 50` - rozumný default pro většinu use casů
- `sortBy: 'timestamp'` descending - nejnovější požadavky první
- `detail: 'summary'` - stručný výstup jako default

### Chybějící funkce (vedlejší efekt)
- Odstranění page-based paginace (pageSize/pageIdx) - může být problém pro velmi velké seznamy
- Kompenzace: limit + sinceMs + filtry poskytují dostačující kontrolu

## Reference

### Dotčené soubory
- `src/tools/network.ts` - tool definition a handler
- `tasks/NETWORK-01-overhaul-list_network_requests.md` - task specifikace

### Související změny
- NETWORK-03: Always-on monitoring (odstraněna nutnost start/stop)
- NETWORK-02: get_network_request nyní přijímá ID

## Další kroky

- Otestovat s reálnými workflowy (např. Claude Code MCP client)
- Zvážit přidání `offset` parametru pro pokročilé stránkování (pokud se ukáže potřebné)
- Dokumentovat v README/tool reference formáty výstupu podle `detail` parametru
