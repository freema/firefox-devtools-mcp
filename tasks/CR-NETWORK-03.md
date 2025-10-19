# Code Review – NETWORK-03: Always-on network capture

Datum: 2025-10-19

## Co bylo provedeno

Zjednodušení UX tím, že sběr síťových událostí běží trvale ("always-on") a odstranění manuálních control nástrojů:

- **Always-on monitoring** (src/firefox/events/network.ts:156-159):
  - `this.enabled = true` automaticky po úspěšném `subscribe()`
  - Monitoring začíná okamžitě po inicializaci, žádná další akce není nutná
  - Aktualizovaný log message: "monitoring enabled by default"
- **Odstranění control tools** (src/tools/network.ts, src/tools/index.ts, src/index.ts):
  - Odstraněny definice: `startNetworkMonitoringTool`, `stopNetworkMonitoringTool`, `clearNetworkRequestsTool`
  - Odstraněny handlery: `handleStartNetworkMonitoring`, `handleStopNetworkMonitoring`, `handleClearNetworkRequests`
  - Odstraněny exporty z `src/tools/index.ts`
  - Odstraněny registrace z `src/index.ts` (toolHandlers map a allTools array)
- **Aktualizované descriptions**:
  - `list_network_requests`: odstraněna zmínka "must start monitoring first"
  - Nová formulace: "Network monitoring is always active"

## Rozhodnutí a dopady

### Zjednodušení API
**Před:**
```
1. start_network_monitoring
2. {akce v browseru}
3. list_network_requests
4. stop_network_monitoring
```

**Po:**
```
1. {akce v browseru}
2. list_network_requests (s filtry: sinceMs, limit)
```

Redukce kroků z 4 na 2 výrazně zlepšuje UX pro MCP agenty.

### Filtering místo clear
- Místo manuálního `clear_network_requests` používáme `sinceMs` filter
- Příklad: `sinceMs: 5000` vrátí pouze požadavky z posledních 5 sekund
- Výhoda: zachována historie, filtrování je flexibilnější

### Auto-clear on navigate
- `autoClearOnNavigate: false` v NetworkEvents je zachováno (src/firefox/index.ts:56-59)
- Buffer se automaticky nečistí při navigaci (zachování dat napříč navigacemi)
- Uživatelé mohou filtrovat pomocí `sinceMs` pokud potřebují fresh data

### Paměťové úniky
- Buffer může narůst při dlouhém běhu
- Mitigace: `limit` parameter (default 50) v `list_network_requests`
- Budoucí: zvážit maxBuffer size nebo TTL pro staré requesty

### Breaking change
- **API break**: existující MCP klienty používající `start/stop/clear` přestanou fungovat
- Justifikace: always-on je lepší UX, control tools byly těžkopádné
- Migrace: odstranit `start_network_monitoring` calls, použít `sinceMs` filter místo `clear`

## Reference

### Dotčené soubory
- `src/firefox/events/network.ts` - enabled = true by default
- `src/tools/network.ts` - odstranění tool definitions a handlers
- `src/tools/index.ts` - odstranění exportů
- `src/index.ts` - odstranění registrací
- `tasks/NETWORK-03-always-on-network-capture-and-remove-start-stop-clear.md` - task specifikace

### Související změny
- NETWORK-01: `sinceMs` filter nahrazuje nutnost manuálního clear
- Celková simplifikace network API

## Další kroky

- Monitorovat paměťové nároky při dlouhém běhu (možná přidat maxBufferSize)
- Dokumentovat breaking change v CHANGELOG/docs
- Zvážit přidání internal TTL pro auto-expiraci starých požadavků
- Otestovat s dlouho běžícími sessions
