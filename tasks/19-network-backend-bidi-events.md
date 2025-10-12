# 19 – Network backend (BiDi events)

Cíl

- Implementovat zachytávání a ukládání síťových požadavků přes WebDriver BiDi ve vrstvě klienta (src/firefox/*). MCP integrace až následně.

Rozsah (jen klient)

- Subscribe na relevantní BiDi události (min.):
  - `network.beforeRequestSent`
  - `network.responseStarted`
  - `network.responseCompleted`
- Interní úložiště požadavků per browsing context (window handle):
  - `id`, `url`, `method`, `timestamp`, `resourceType`, `isXHR` (odvozeno), `status`, `statusText`
  - volitelně `requestHeaders`, `responseHeaders`, `timings` pokud dostupné
- Metody na klientovi (`src/firefox/…`):
  - `startNetworkMonitoring()`, `stopNetworkMonitoring()`, `clearNetworkRequests()`
  - `getNetworkRequests()` (vrací surová data; filtrování až v MCP nástavbě)

Akceptační kritéria

- Funkce klienta: `startNetworkMonitoring/stopNetworkMonitoring/getNetworkRequests/clearNetworkRequests` fungují bez pádu
- Data se ukládají per context a čistí se po navigaci
- Smoke test: rozšířit `scripts/test-bidi-devtools.js` o jednoduchou síťovou aktivitu a ověření přítomnosti záznamů

Poznámky k implementaci

- Vázat subscribce na aktuální `contextId`; při přepnutí tabu znovu vázat nebo držet mapu dle handle
- Při navigaci vyčistit buffer aktuálního contextu (stejně jako u konzole)
- Ošetřit limity – např. limitovat velikost bufferu (LRU, posledních N)

Reference

- `src/tools/network.ts`
- `src/firefox/devtools.ts` (stubs)
- `docs/firefox-client.md`
- `tasks/17-bidi-coverage-vs-chrome-tools.md`
