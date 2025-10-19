# PERFORMANCE-01: Odstranit performance nástroje

Cíl: Zmenšit API o nástroje, které v MCP nepřinášejí hodnotu: `performance_start_trace`, `performance_stop_trace`, a dočasně i `performance_get_metrics`.

Důvody
- `performance_start_trace` / `performance_stop_trace` pouze vrací „not supported“ – pro uživatele i agenty matoucí a k ničemu.
- `performance_get_metrics` (Navigation Timing) je pro běžné scénáře málo přínosný; lepší jej stáhnout, dokud nebude existovat srozumitelnější a užitečnější agregace.

Návrh řešení
- Odebrat tři nástroje z exportů (`src/tools/index.ts`) a registrace (`src/index.ts`).
- `src/tools/performance.ts` ponechat jako interní „future“ nebo odstranit a přesunout poznámky do `docs/future-features.md`.
- Aktualizovat dokumentaci (README/docs) a testy.

Akceptační kritéria
- Nástroje nejsou nabízeny ve `ListTools` a nelze je volat.
- Dokumentace neodkazuje na odstraněné nástroje; případně je zmíní v „future“.
