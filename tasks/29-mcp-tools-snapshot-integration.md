**29 – MCP tools: Snapshot integration**

Cíl

- Zpřístupnit snapshot funkcionalitu klienta přes MCP tools. Přidat minimální sadu příkazů pro pořízení snapshotu, práci s UID a invalidaci snapshotu.

Rozsah

- Nové nástroje v `src/tools/`:
  - `take_snapshot` – zavolá `firefox.takeSnapshot()` a vrátí textový výstup (LLM‑friendly) + informaci o `snapshotId`.
  - `resolve_uid_to_selector` – pro `uid` vrátí CSS selektor přes `firefox.resolveUidToSelector(uid)`.
  - `clear_snapshot` – vyčistí stav přes `firefox.clearSnapshot()` (volitelné; navigate() už invaliduje automaticky).

Prompty (zahrnout do implementace nástrojů)

- `take_snapshot` – popis z pohledu LLM:
  - „Pořiď aktuální textový snímek stránky včetně jedinečných UID. Vždy pracuj s nejnovějším snapshotem. Snímek je zkrácený pro čitelnost; pro další práci používej UID.“
  - Tipy: používej jen při změně stránky nebo pokud je UID zastaralé; nedomnívej se, že starý UID platí po navigaci.
- `resolve_uid_to_selector` – popis:
  - „Převeď UID na CSS selektor (pro debug/inspekci). Není nutné pro běžné akce na UID.“
  - Varování: vyhodí chybu pro zastaralý UID – nejdřív proveď `take_snapshot`.
- `clear_snapshot` – popis:
  - „Vymaž cache UID/snapshot. Po další akci, která závisí na UID, znovu pořiď snapshot.“

Doporučené texty chyb

- „Tento UID je ze starého snapshotu. Pořiďte nový snapshot (tool: take_snapshot) a zkuste akci znovu.“
- „UID nebyl nalezen. Struktura stránky se mohla změnit — pořiďte nový snapshot.“

Specifikace nástrojů

- `take_snapshot`
  - Input: prázdný objekt `{}` (bez parametrů)
  - Output: text s prvních N řádků snapshotu + informace o snapshotId (z `snapshot.json.snapshotId`).
  - Error: standardní MCP error; zachytit výjimky z klienta.
- `resolve_uid_to_selector`
  - Input: `{ uid: string }`
  - Output: text: `Selector for UID <uid>: <selector>`
  - Error: zachytit chyby „stale snapshot“/„UID not found“ a vrátit přátelskou zprávu.
- `clear_snapshot`
  - Input: `{}`
  - Output: potvrzovací text `Snapshot cache cleared.`

Akceptační kritéria

- Nástroje jsou exportované v `src/tools/index.ts` a zaregistrované v `src/index.ts` (List/Call handlers).
- `take_snapshot` vrací konzistentní text (prvních ~50–100 řádků) a zbytek indikovaně zkrácen (pokud je dlouhý).
- Při volání `resolve_uid_to_selector` na zastaralé UID vrací nástroj srozumitelnou hlášku a návrh „pořiďte nový snapshot“.
- Základní happy‑path testy přidané do poznámek v `tasks/99-specification.md` (nebo krátký dev skript pro manuální ověření).

Poznámky k implementaci

- Vycházej z klienta: `FirefoxClient.takeSnapshot`, `resolveUidToSelector`, `clearSnapshot`.
- Pro delší snapshot text doporučeno omezit výstup (LLM kontext) a dopsat „… and X more lines“.
- Inspirace: `old/mcp_dev_tool_chrome/src/tools/snapshot.ts` (parita názvu `take_snapshot`).

Dotčené soubory

- src/tools/snapshot.ts (nový)
- src/tools/index.ts (export)
- src/index.ts (registrace nástrojů)
- tasks/99-specification.md (dokumentace nástrojů)
