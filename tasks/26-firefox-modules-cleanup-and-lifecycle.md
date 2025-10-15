**26 – Firefox modules cleanup & lifecycle hooks**

Cíl

- Upevnit hranice mezi moduly `src/firefox/*`, zjednodušit zodpovědnosti a přidat lifecycle hooky (navigace) tak, aby se snapshot/console/network automaticky udržovaly konzistentní bez nutnosti ručních zásahů v klientech.

Důvod

- `events.ts` kombinuje Console i Network do jednoho souboru – horší čitelnost a budoucí rozšíření.
- Invalidace snapshotu probíhá pouze v `FirefoxClient.navigate()`; pokud někdo použije WebDriver přímo nebo dojde k navigaci jiným způsobem, cache snapshotu může zůstat viset.
- Network buffer by měl být konzistentní per‑context a čistit se na navigaci (volitelně konfigurovatelně).

Rozsah

- Vytvořit adresář `src/firefox/events/` a rozdělit implementaci:
  - `events/console.ts` – ConsoleEvents (beze změny API)
  - `events/network.ts` – NetworkEvents (beze změny API)
- Do `NetworkEvents` a `ConsoleEvents` přidat volitelný hook na BiDi události `browsingContext.*` (pokud jsou k dispozici přes `driver.getBidi()`), minimálně:
  - při začátku/commit navigace volat poskytované callbacks (např. `onNavigate`) které `FirefoxClient` zapojí tak, aby:
    - `snapshot.clear()` (invalidace UID)
    - `console.clearMessages()` (volitelně – již dnes děláme při `navigate()`)
    - `network.clearRequests()` (volitelně – když je monitoring aktivní)
- `FirefoxClient.connect()` zapojí tyto callbacks a sjednotí centralizovanou invalidaci i mimo `navigate()` veřejné API.
- Ujistit se, že NetworkEvents drží záznamy per‑context (klíč: browsing context id), nebo alespoň obsahuje metadata s aktuálním context id pro snadnější filtraci.

Akceptační kritéria

- `events.ts` neexistuje; místo něj `events/console.ts` a `events/network.ts` se shodným veřejným API jako dříve.
- Při jakékoli navigaci (spuštěné z klienta nebo jinak) dojde k invalidaci snapshotu a opcí pro clear console/network (zapnuto defaultně, dá se vypnout volbou v konstruktoru klienta – volitelná drobná rozšíření typů).
- `scripts/test-bidi-devtools.js` projde beze změn (nebo s minimální úpravou logu) a ukáže, že po navigaci staré UID selžou správnou chybou (staleness) bez manuálního volání `clearSnapshot()`.

Poznámky k implementaci

- BiDi ws: už dnes je používán v `events.ts` parsingem `ws.on('message', …)`. Stejný přístup lze použít pro `browsingContext.*` eventy – v minimální verzi stačí poslouchat `browsingContext.load` / `browsingContext.domContentLoaded` (nebo jiný ekvivalent dostupný pro vaši verzi Selenium/Firefox) a vyvolat invalidaci.
- Pokud nebude `browsingContext` snadno dostupný, ponechat hook v `FirefoxClient.navigate()` a přidat TODO + interní API pro pozdější zapojení BiDi eventů.

Dotčené soubory

- src/firefox/index.ts
- src/firefox/events.ts → src/firefox/events/console.ts, src/firefox/events/network.ts
- src/firefox/snapshot/manager.ts (pouze zapojení `clear()`)
- scripts/test-bidi-devtools.js (případně drobný log)

