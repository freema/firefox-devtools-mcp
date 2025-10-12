# 18 – Refaktor architektury `src/firefox/` (minimal modularizace)

Cíl

- Navrhnout jednoduchou, minimální vrstvu klienta tak, aby více budoucích MCP toolů mohlo bezpečně sdílet stejné schopnosti (console, dom, pages, network). Bez over-engineeringu.

Motivace

- Držet vše jednoduché: minimum modulů, jasné rozhraní, snadná údržba. Nejprve navrhnout klienta, integraci MCP toolů řešit až následně.

Minimalní struktura (4 moduly)

- `src/firefox/core.ts` – správa WebDriveru + BiDi (connect/close, context, subscribe)
- `src/firefox/dom.ts` – evaluate, element lookup, jednoduché akce (click/hover/fill/drag/upload), snapshot rozhraní
- `src/firefox/pages.ts` – tab/window management (list/select/new/close, history, resize)
- `src/firefox/events.ts` – console buffer, (později) network buffer a subscribe/unsubscribe
- `src/firefox/types.ts` – společné typy
- `src/firefox/index.ts` – veřejná façade `FirefoxClient` delegující na výše uvedené

Pozn.: Pokud se ukáže, že některý modul roste, rozdělíme ho později (e.g. `dom` → `snapshot`, `input`). Start bude záměrně konzervativní.

Akceptační kritéria

- Zachová se veřejné API pro současné skripty (`connect`, `navigate`, `evaluate`, `getConsoleMessages`, …)
- Bez změn MCP toolů (žádná integrace v tomto kroku)
- `npm run build` projde, kód bez duplicit
- V `docs/firefox-client.md` krátký popis nové struktury
- Volitelně: rozšířit `scripts/test-bidi-devtools.js` o smoke testy nových helperů (pokud přidány)

Poznámky k implementaci

- Pořadí BiDi subscribce zachovat: contextId → subscribe → navigate
- `events` modul poskytne jednoduché rozhraní `ConsoleEvents` a později `NetworkEvents`
- `dom` modul vystaví UID resolver – implementace přijde v úkolu 20 (snapshot + UID)

Reference

- `src/firefox/devtools.ts`
- `docs/firefox-client.md`
- `tasks/17-bidi-coverage-vs-chrome-tools.md`
