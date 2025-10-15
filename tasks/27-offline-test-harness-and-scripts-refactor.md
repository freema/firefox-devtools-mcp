**27 – Offline test harness & scripts refactor**

Cíl

- Udělat testovací skripty determinističtější a bez závislosti na externí síti. Zkrátit runtime, odstranit flaky chování a lépe pokrýt snapshot/UID, input API, screenshoty a dialogy.

Důvod

- `scripts/test-bidi-devtools.js` a další skripty používají živé weby (`centrum.cz`, `example.com`, `mozilla.org`). V prostředích s omezenou sítí jsou testy nespolehlivé/nevykonatelné.
- Části testů opakují boilerplate pro injekci HTML a čekání.

Rozsah

- Přidat lehký „offline“ harness:
  - Utility `scripts/_helpers/page-loader.js` pro nastavení `about:blank` + `documentElement.innerHTML = …` a oddělené spuštění `<script>` části (již použitý pattern v `test-input-tools.js`).
  - Helper pro malé čekání po akcích (raf + short timeout), aby se sjednotilo chování.
- Upravit existující skripty tak, aby měly „offline“ scénáře jako výchozí a online testy byly volitelné:
  - `test-bidi-devtools.js`: přepnout většinu scénářů na offline data/innerHTML. Sekci „Network monitoring“ obalit pod `if (process.env.TEST_ONLINE === '1')` a jasně zalogovat skip.
  - `test-screenshot.js`: používat převážně offline scénáře; online pouze pokud `TEST_ONLINE=1`.
  - `test-dialog.js`: beze změn (již je offline, používá about:blank).
- Zkrátit explicitní čekání (5s/3s) na malé deterministické pauzy a/nebo čekat na konkrétní stav (např. přítomnost elementu, atributu, atd.).

Akceptační kritéria

- Všechny skripty běží v prostředí bez přístupu na internet v základním režimu a končí s exit code 0.
- Po nastavení `TEST_ONLINE=1` se spustí i online části (network monitor aj.).
- Sdílené helpery omezí duplikaci kódu pro načítání HTML a čekání.

Poznámky k implementaci

- Re‑use kód z `scripts/test-input-tools.js (loadHTML)` – vytáhnout do helperu a všude použít.
- Network monitor lze otestovat i na offline stránce s `<img src="data:…">` (nepočítá se jako network), takže primární pokrytí online nechat jako volitelné.

Dotčené soubory

- scripts/test-bidi-devtools.js
- scripts/test-screenshot.js
- scripts/test-input-tools.js (jen refactor na helper)
- scripts/test-dialog.js (bez změny)
- scripts/_helpers/page-loader.js (nový soubor)

