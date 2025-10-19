# SNAPSHOT-01: Vyčistit výstup snapshotu a přidat návod

Cíl: Udělat výstup `take_snapshot` čistší, konzistentně formátovaný a samo-vysvětlující („co dál“), aby agent/AI přesně věděla, jak s UIDs pracovat.

Problémy dnes
- Dlouhé výpisy mohou přetékat kontext; formátování obsahuje zvláštní mezery/odsazení, které zhoršují čitelnost.
- Chybí jasný návod nahoře: jak použít UID (click/fill/hover), připomenutí stárnutí UID po navigaci.
- Není parametrizace rozsahu (limit/hloubka/atributy/texty), takže není kontrola nad velikostí.

Návrh řešení
- Přidat parametry do `take_snapshot` (čisté JSON Schema):
  - `maxLines` (number, default 100)
  - `depth` (number, default auto)
  - `includeAttributes` (boolean, default false)
  - `includeText` (boolean, default true, limitovat délku)
- Upravit formátování: jednotné odsazení, odstranění podivných mezer, vždy `uid=... tag "label"` na jednom řádku + doplňkové vlastnosti na dalších řádcích s konzistentním prefixem.
- Na začátek výstupu vložit stručný návod:
  - „Akce: click/hover/fill → použij UID“
  - „Po navigaci vždy: take_snapshot“
  - „Při chybě stale UID: take_snapshot → akce znovu“
- Zachovat truncaci s jasnou indikací, kolik řádků bylo vynecháno.

Akceptační kritéria
- Výstup je čitelnější a stabilní (bez nečekaných mezer), UIDs jsou snadno kopírovatelné.
- Parametry fungují a omezují velikost výpisu.
- Návod je přítomen a krátký (první blok výstupu), bez zahlcení.

Implementační kroky
1) Rozšířit `inputSchema` v `src/tools/snapshot.ts` o nové volitelné parametry.
2) Upravit formatter v `handleTakeSnapshot` (konzistentní layout, návod nahoře).
3) Dopsat dokumentaci a krátké příklady.
