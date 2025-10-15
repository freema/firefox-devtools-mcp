**30 – MCP tools: Input akce podle UID**

Cíl

- Zpřístupnit existující UID‑based akce z klienta Firefox přes MCP tools, s důrazem na minimální API a srozumitelné chyby při „stale“ UID.

Rozsah

- Nové nástroje v `src/tools/` mapované na `FirefoxClient`:
  - `click_by_uid` → `firefox.clickByUid(uid, dblClick?)`
  - `hover_by_uid` → `firefox.hoverByUid(uid)`
  - `fill_by_uid` → `firefox.fillByUid(uid, value)`
  - `drag_by_uid_to_uid` → `firefox.dragByUidToUid(fromUid, toUid)`
  - `fill_form_by_uid` → `firefox.fillFormByUid([{ uid, value }, …])`
  - `upload_file_by_uid` → `firefox.uploadFileByUid(uid, filePath)`

Specifikace nástrojů (návrh schémat)

- `click_by_uid`:
  - Input: `{ uid: string, dblClick?: boolean }`
  - Output: potvrzovací text.
- `hover_by_uid`:
  - Input: `{ uid: string }`
  - Output: potvrzovací text.
- `fill_by_uid`:
  - Input: `{ uid: string, value: string }`
  - Output: potvrzovací text.
- `drag_by_uid_to_uid`:
  - Input: `{ fromUid: string, toUid: string }`
  - Output: potvrzovací text.
- `fill_form_by_uid`:
  - Input: `{ elements: Array<{ uid: string, value: string }> }`
  - Output: potvrzovací text + shrnutí počtu polí.
- `upload_file_by_uid`:
  - Input: `{ uid: string, filePath: string }`
  - Output: potvrzovací text (název souboru detekovaný stránkou je na volající straně).

Akceptační kritéria

- Všechny nové nástroje jsou exportovány v `src/tools/index.ts` a registrovány v `src/index.ts`.
- Chyby „Invalid UID“/„stale snapshot“ jsou transformovány na přátelské zprávy s návrhem „pořiďte nový snapshot“.
- Krátké usage příklady doplněny do `tasks/99-specification.md` (sekce Tools → User Interaction).
- Nezavádět nový naming – držet se `*_by_uid` pro paritu a jasnost.

Poznámky k implementaci

- Klient už vše umí; v MCP vrstvu stačí přidat input schémata, error handling a textové odpovědi.
- DnD používá JS fallback – doplnit upozornění do tool description, že nemusí fungovat pro všechny knihovny.

Dotčené soubory

- src/tools/input.ts (nový)
- src/tools/index.ts (exporty)
- src/index.ts (registrace nástrojů)
- tasks/99-specification.md (dokumentace nástrojů)

