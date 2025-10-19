# NETWORK-01: Přepracovat list_network_requests

Cíl: Jednodušší, spolehlivější a MCP‑přátelský nástroj se srozumitelnými filtry, stabilní identifikací požadavků a JSON‑serializovatelným `inputSchema`.

Problémy dnes
- Nevhodné schéma vstupu (Zod objekty přímo v `inputSchema`) – ne JSON pro MCP klienty (src/tools/network.ts).
- Verbózní textový výstup bez stabilního ID; těžké navázat následným dotazem.
- Filtry nepokrývají běžné scénáře (časové okno, limit, řazení) a kombinace jsou neohrabané.
- Závislost na `start/stop` pro sběr – komplikuje tok nástrojů.

Návrh řešení
- `inputSchema` (čisté JSON Schema):
  - `limit` (number, default 50)
  - `sinceMs` (number) – vrátit pouze požadavky novější než N ms
  - `urlContains` (string, case‑insensitive)
  - `method` (string, e.g. GET/POST)
  - `status`, `statusMin`, `statusMax` (number)
  - `isXHR` (boolean)
  - `resourceType` (string; nebo enum známých typů)
  - `sortBy` (string: timestamp|duration|status, default timestamp desc)
  - `detail` (string: summary|min|full; default summary)
- Stabilní identifikátory: v odpovědi vždy vracet `id` (BiDi request id) a index (0..n) pro snadné následné dotazy.
- Strukturovaný výstup: pro `detail=min|full` vracet JSON (textově serializovaný v MCP) s poli: id, url, method, status, statusText, resourceType, isXHR, timings{requestTime,responseTime,duration}, requestHeaders, responseHeaders. Pro `detail=summary` stručný list s `id`/URL/Status.
- Nezávislost na `start/stop`: sběr může být trvale zapnutý (viz NETWORK-03), filtry poskytnou relevantní výsek.

Akceptační kritéria
- `inputSchema` je čisté JSON Schema (bez Zod), MCP klient zobrazuje validní parametry.
- Při volání bez parametrů: vrátí posledních 50 požadavků seřazených dle `timestamp desc`.
- Filtry fungují kumulativně a stabilní `id` je vždy součástí položky.
- `detail=full` vrací i hlavičky a `timings.duration` (pokud dostupné) pro každou položku.
- Výstup jasně instruuje, že detaily lze dotáhnout přes `get_network_request` s `id` (viz NETWORK-02).

Implementační kroky
1) Nahradit Zod v `inputSchema` za JSON Schema (src/tools/network.ts).
2) Upravit handler: 
   - doplnit `limit`, `sinceMs`, `sortBy`, `detail` a jednotné filtrování.
   - ve formátování přidat `id` a konzistentní textové řádky pro summary.
   - pro `detail` složit JSON do textu (MCP `text` content) – bez Base64/velkých blobů.
3) Dopsat „usage hints“ do description (stručně, bez zbytečných disclaimerů).
4) Aktualizovat dokumentaci (docs) a případné testy.

Reference
- src/tools/network.ts
- src/firefox/events/network.ts (id, status, timings)

---

Pozn.: Pokud prosadíme NETWORK-03 (vždy zapnuto), výrazně se zjednoduší UX.
