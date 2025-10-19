# NETWORK-03: Always‑on network capture a odstranění start/stop/clear

Cíl: Zjednodušit UX a API tím, že sběr síťových událostí poběží trvale („always‑on“), a zrušit nástroje `start_network_monitoring`, `stop_network_monitoring` a `clear_network_requests`.

Analýza současného stavu
- `src/firefox/index.ts` subscribuje na BiDi události při `connect()`, sběr je však gateován `enabled` flagem v `src/firefox/events/network.ts` a ovládán přes `startNetworkMonitoring()`/`stopNetworkMonitoring()`.
- Navigační eventy mohou automaticky čistit buffer při zapnutém monitoringu (`autoClearOnNavigate: true`).
- MCP UX: „pustit monitoring → akce → list → stop“ je těžkopádné; agenti preferují prosté „list s filtrem času“.

Návrh řešení
- Nastavit `enabled = true` by default po subscribu (tj. monitoring pořád aktivní).
- Odebrat nástroje `start_network_monitoring`, `stop_network_monitoring`, `clear_network_requests` z exportů a z registrací v serveru.
- Řízení velikosti/aktuálnosti dat přes `list_network_requests` filtry: `sinceMs`, `limit`, `sortBy`.
- Zachovat `autoClearOnNavigate` (vhodné pro per‑page snapshot) nebo přidat parametr pro jeho konfiguraci v budoucnu.
- Doložit v dokumentaci, že „list“ je jediné místo ovládání výřezu dat.

Akceptační kritéria
- Po spuštění serveru je sběr síťových událostí aktivní bez dalších příkazů.
- `list_network_requests` vrací relevantní data i bez volání `start_*`.
- Nástroje `start_*`, `stop_*`, `clear_*` nejsou nabízeny v MCP `ListTools`.
- Neběží paměťové úniky: při navigaci se buffer čistí podle dosavadní logiky.

Implementační kroky
1) `src/firefox/events/network.ts`: povolit monitoring defaultně (po `subscribe()` nastavit `this.enabled = true`).
2) Odebrat handlers a exports nástrojů `start_*`, `stop_*`, `clear_*` v `src/tools/network.ts`, `src/tools/index.ts` a `src/index.ts`.
3) Upravit popisy u `list_network_requests` (už bez zmínky o „musíte nejdřív startovat…“).
4) Aktualizovat dokumentaci a testy.
