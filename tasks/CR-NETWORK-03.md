# Code Review – NETWORK-03: Always-on network capture

Date: 2025-10-19

## What Was Done

Simplified UX by keeping network capture always on and removing manual control tools:

- Always-on monitoring (src/firefox/events/network.ts:156-159):
  - `this.enabled = true` automatically after `subscribe()`
  - Monitoring starts immediately after initialization; no extra action required
  - Updated log message: “monitoring enabled by default”
- Removed control tools (src/tools/network.ts, src/tools/index.ts, src/index.ts):
  - Removed tool definitions: `startNetworkMonitoringTool`, `stopNetworkMonitoringTool`, `clearNetworkRequestsTool`
  - Removed handlers: `handleStartNetworkMonitoring`, `handleStopNetworkMonitoring`, `handleClearNetworkRequests`
  - Removed exports in `src/tools/index.ts`
  - Removed registrations from `src/index.ts` (toolHandlers/allTools)
- Updated descriptions:
  - `list_network_requests` no longer mentions “must start monitoring first”
  - New phrasing: “Network monitoring is always active”

## Decisions and Impact

### API simplification
Before:
```
1. start_network_monitoring
2. {do something in the browser}
3. list_network_requests
4. stop_network_monitoring
```

After:
```
1. {do something in the browser}
2. list_network_requests (filters: sinceMs, limit)
```

This reduces steps from 4 to 2 and improves agent UX.

### Filtering instead of clear
- Replace manual `clear_network_requests` with `sinceMs` filter
- Example: `sinceMs: 5000` returns only the last 5 seconds of requests
- Benefit: history preserved, filtering is more flexible

### Auto-clear on navigate
- `autoClearOnNavigate: false` in NetworkEvents remains (src/firefox/index.ts:56-59)
- Buffer is not automatically cleared on navigation (data preserved across navigations)
- Users can filter with `sinceMs` for fresh data

### Memory growth
- Buffer can grow during long sessions
- Mitigation: `limit` parameter (default 50) in `list_network_requests`
- Future: consider max buffer size or TTL

### Breaking change
- API break: clients relying on start/stop/clear will fail
- Justification: always-on provides better UX; control tools were clunky
- Migration: remove `start_network_monitoring` calls; use `sinceMs` instead of clear

## References

### Touched files
- `src/firefox/events/network.ts` – enabled by default
- `src/tools/network.ts` – removed tool definitions/handlers
- `src/tools/index.ts` – removed exports
- `src/index.ts` – removed registrations
- `tasks/NETWORK-03-always-on-network-capture-and-remove-start-stop-clear.md` – task spec

### Related changes
- NETWORK-01: `sinceMs` replaces manual clear
- Overall simplification of the network API

## Next Steps

- Monitor memory usage in long sessions (possibly add maxBufferSize)
- Document the breaking change in CHANGELOG/docs
- Consider internal TTL for auto-expiration of old requests
- Test with long-running sessions
