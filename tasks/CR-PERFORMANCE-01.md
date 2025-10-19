# Code Review – PERFORMANCE-01: Odstranit performance nástroje

Datum: 2025-10-19

## Co bylo provedeno

Odstranění všech performance nástrojů z veřejné sady MCP tools, protože nepřinášejí hodnotu:

- **Odstranění exportů** (src/tools/index.ts:40-48):
  - Odstraněny exporty: `performanceGetMetricsTool`, `performanceStartTraceTool`, `performanceStopTraceTool`
  - Odstraněny exporty handlerů: `handlePerformanceGetMetrics`, `handlePerformanceStartTrace`, `handlePerformanceStopTrace`
- **Odstranění registrací** (src/index.ts):
  - Odstraněny handler mappings z `toolHandlers` Map (řádky 100-103)
  - Odstraněny tool definitions z `allTools` array (řádky 150-153)
- **Soubor performance.ts** (src/tools/performance.ts):
  - Ponechán v repozitáři (obsahuje poznámky o omezeních BiDi)
  - Není exportován ani registrován, takže není dostupný přes MCP

## Rozhodnutí a dopady

### Důvody odstranění

**1. performance_start_trace / performance_stop_trace:**
- Vrací pouze "not supported" error message
- BiDi nepodporuje performance tracing (na rozdíl od Chrome DevTools Protocol)
- Pro uživatele a agenty matoucí - vypadá jako funkční tool, ale nic nedělá

**2. performance_get_metrics:**
- Vrací pouze základní Navigation Timing API data
- Pro praktické MCP scénáře málo přínosný
- Lepší je použít Firefox DevTools UI nebo Firefox Profiler pro skutečný profiling

### API surface reduction
**Před:**
- 3 performance tools (všechny non-functional nebo low-value)
- Celkem ~27 tools

**Po:**
- 0 performance tools
- Celkem ~24 tools
- Čistší, srozumitelnější API pro MCP agenty

### Breaking change
- **API break**: Klienty používající `performance_*` tools přestanou fungovat
- **Justifikace**: Tools byly deprecated a non-functional, minimální dopad
- **Migrace**: Odstranit volání performance tools, použít Firefox DevTools UI pro profiling

### Alternativy pro performance monitoring
Dokumentováno v error messages a docs:
1. Firefox DevTools Performance panel (F12 → Performance)
2. Firefox Profiler (https://profiler.firefox.com/)
3. Navigation Timing API (dostupné přes `evaluate_script` pokud bude potřeba)

## Reference

### Dotčené soubory
- `src/tools/index.ts` - odstranění exportů
- `src/index.ts` - odstranění registrací (toolHandlers a allTools)
- `src/tools/performance.ts` - ponechán jako reference (není exportován)

### Související změny
- SCHEMA-01: performance.ts měl Zod v inputSchema, byl opraven před odstraněním
- Celkové zjednodušení API podle tools-analysis.md

## Další kroky

- Dokumentovat breaking change v CHANGELOG
- Zvážit přesun poznámek z performance.ts do `docs/future-features.md`
- Dokumentovat alternativy pro performance monitoring v README
- Pokud bude v budoucnu BiDi podporovat plnohodnotný profiling, můžeme tools vrátit

