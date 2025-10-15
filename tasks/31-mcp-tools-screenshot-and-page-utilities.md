**31 – MCP tools: Screenshot a Utility akce stránky**

Cíl

- Zpřístupnit screenshoty a běžné page utility přes MCP tools s využitím hotových metod ve Firefox klientovi.

Rozsah

- Nové nástroje v `src/tools/`:
  - Screenshot
    - `screenshot_page` → `firefox.takeScreenshotPage()` (PNG base64)
    - `screenshot_by_uid` → `firefox.takeScreenshotByUid(uid)` (PNG base64)
  - Dialogy
    - `accept_dialog` → `firefox.acceptDialog(promptText?)`
    - `dismiss_dialog` → `firefox.dismissDialog()`
  - Page utility
    - `navigate_history` → `{ direction: 'back' | 'forward' }` → `firefox.navigateBack()` / `firefox.navigateForward()`
    - `set_viewport_size` → `{ width: number, height: number }` → `firefox.setViewportSize(w,h)`

Specifikace nástrojů (návrh schémat)

- `screenshot_page`: `{}` → text: `data:image/png;base64,<...>` nebo pouze base64 (zvolit konzistentně s ostatními výstupy; doporučeno prostý base64 + prefix vysvětlit v textu).
- `screenshot_by_uid`: `{ uid: string }` → base64 PNG. Při stale UID vrátit přátelskou chybu (viz Task 30 styl).
- `accept_dialog`: `{ promptText?: string }` → potvrzovací text.
- `dismiss_dialog`: `{}` → potvrzovací text.
- `navigate_history`: `{ direction: 'back'|'forward' }` → potvrzovací text.
- `set_viewport_size`: `{ width: number, height: number }` → potvrzovací text.

Akceptační kritéria

- Nástroje jsou exportované v `src/tools/index.ts` a zaregistrované v `src/index.ts`.
- Screenshot nástroje vrací validní base64 PNG (ověřit jednoduchým regexem v logu, podobně jako test skripty).
- Dialogy korektně selžou s chybou „no such alert“ pokud není aktivní (zabalit do přátelské error response).

Poznámky k implementaci

- Klient již implementuje všechny požadované metody; MCP vrstva pouze mapuje schémata a formátuje odpovědi.
- Pro base64 se držet jednoduchého textového výstupu; nepřidávat binární resource.

Dotčené soubory

- src/tools/screenshot.ts (nový)
- src/tools/utilities.ts (nový; dialogy, history, viewport)
- src/tools/index.ts (exporty)
- src/index.ts (registrace nástrojů)
- tasks/99-specification.md (dokumentace nástrojů)

