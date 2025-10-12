# Code Review – 19 Network Backend (BiDi Events)

Datum: 2025-10-12

## Co bylo provedeno

Implementovali jsme zachytávání a ukládání síťových požadavků přes WebDriver BiDi v klientské vrstvě. Network monitoring je nyní plně funkční.

### Dotčené soubory

1. **src/firefox/types.ts** (aktualizován)
   - Nový typ `NetworkRecord` sloučující request + response data
   - Obsahuje: `id`, `url`, `method`, `timestamp`, `resourceType`, `isXHR`, `status`, `statusText`, `requestHeaders`, `responseHeaders`, `timings`
   - Odstraněny staré typy `NetworkRequest` a `NetworkResponse`

2. **src/firefox/events.ts** (aktualizován)
   - Implementace `NetworkEvents` class
   - BiDi event subscription:
     - `network.beforeRequestSent` - zachytí nový požadavek
     - `network.responseStarted` - zachytí status code a response headers
     - `network.responseCompleted` - zachytí konec požadavku
   - Interní buffer: `Map<requestId, NetworkRecord>`
   - Enable/disable mechanismus - události se sbírají jen když `enabled = true`
   - Helper metody:
     - `guessResourceType()` - odvozuje typ zdroje z URL extension
     - `parseHeaders()` - konvertuje BiDi headers array na object
   - Metody: `subscribe()`, `startMonitoring()`, `stopMonitoring()`, `getRequests()`, `clearRequests()`

3. **src/firefox/index.ts** (aktualizován)
   - `connect()` volá `networkEvents.subscribe()` hned po console subscription
   - Implementace facade metod:
     - `startNetworkMonitoring()` - zapne sběr
     - `stopNetworkMonitoring()` - vypne sběr
     - `getNetworkRequests()` - vrátí buffer
     - `clearNetworkRequests()` - vyčistí buffer
   - **Poznámka:** `navigate()` **NEČISTÍ** network buffer (na rozdíl od console)

4. **scripts/test-bidi-devtools.js** (rozšířen)
   - Přidán test network monitoring (sekce 14)
   - Test workflow:
     1. Start monitoring
     2. Navigace na example.com
     3. Čeká 3s na načtení
     4. Zobrazí prvních 5 požadavků
     5. Stop monitoring a clear buffer

5. **scripts/test-network-only.js** (nový)
   - Izolovaný test pro rychlé ověření network monitoring
   - Užitečný pro debug

## Rozhodnutí a dopady

### 1. Enable/Disable Mechanismus

**Rozhodnutí:** Network události se **sbírají jen když `enabled = true`**

```typescript
if (!this.enabled) {
  return; // Only collect when explicitly enabled
}
```

**Důvod:**
- Subscription je aktivní pořád (od `connect()`), ale data se ukládají jen když uživatel zavolá `startNetworkMonitoring()`
- Šetří paměť - network data mohou být velká
- User má kontrolu nad tím, kdy chce monitorovat

### 2. Separate Timings Tracking

**Rozhodnutí:** Používáme `Map<requestId, startTime>` pro měření duration

**Důvod:**
- BiDi události přicházejí asynchronně
- `beforeRequestSent` → uložíme `Date.now()`
- `responseCompleted` → spočítáme `duration = Date.now() - startTime`
- Po dokončení uvolníme paměť: `requestStartTimes.delete(requestId)`

### 3. Resource Type Guessing

**Rozhodnutí:** Odvozujeme resource type z URL extension

```typescript
private guessResourceType(url: string): string {
  const ext = ...;
  if (['js', 'mjs'].includes(ext)) return 'script';
  if (['css'].includes(ext)) return 'stylesheet';
  ...
}
```

**Důvod:**
- BiDi event `network.beforeRequestSent` neobsahuje `resourceType` (na rozdíl od CDP)
- Heuristic based na extension je "good enough" pro většinu případů
- Content-Type header je dostupný až v `responseStarted`, ale ne vždy

### 4. Navigate() NEČISTÍ Network Buffer

**Rozhodnutí:** `navigate()` čistí pouze console buffer, NE network buffer

**Důvod:**
- Console logs jsou specifické pro každou stránku → má smysl čistit
- Network requests mohou být globální záležitost → user může chtít trackovat requests napříč navigacemi
- User může explicitně zavolat `clearNetworkRequests()` kdykoliv

### 5. Headers Parsing

**Rozhodnutí:** BiDi headers jsou array `[{name, value}]`, konvertujeme na object `{name: value}`

```typescript
private parseHeaders(headers: any[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const h of headers) {
    result[h.name.toLowerCase()] = String(h.value);
  }
  return result;
}
```

**Důvod:**
- Jednodušší práce s headers v MCP tools
- Lowercase keys pro case-insensitive lookup

## Technické poznámky

- **BiDi event flow:**
  1. `network.beforeRequestSent` → vytvoříme `NetworkRecord`, uložíme do Map
  2. `network.responseStarted` → update status + response headers
  3. `network.responseCompleted` → update duration, cleanup start time

- **RequestId extraction:**
  ```typescript
  const requestId = req.request?.request || req.requestId;
  ```
  BiDi má různé struktury pro různé události, takže fallback logic

- **isXHR detection:**
  ```typescript
  isXHR: req.initiator?.type === 'xmlhttprequest' || req.initiator?.type === 'fetch'
  ```

## Validace

- ✅ `task check` prošel (ESLint + TypeScript)
- ✅ `task build` prošel
- ✅ `DEBUG=firefox-devtools node scripts/test-network-only.js` zachytil 2 požadavky:
  - `GET https://example.com/` (status 200, document, 600ms)
  - `GET https://example.com/favicon.ico` (image)
- ✅ BiDi události přicházejí v pořádku:
  - `network.beforeRequestSent` ✅
  - `network.responseStarted` ✅
  - `network.responseCompleted` ✅

## Reference

- Task specifikace: `tasks/19-network-backend-bidi-events.md`
- BiDi coverage: `tasks/17-bidi-coverage-vs-chrome-tools.md`
- Client docs: `docs/firefox-client.md` (bude aktualizováno)

## Další kroky

- [x] Task 19 kompletní
- [ ] Aktualizovat `docs/firefox-client.md` - přidat dokumentaci network monitoring
- [ ] Task 20: Snapshot + UID mapping
- [ ] Task 21: Input tools (MCP integration)
- [ ] Task 22: Screenshot tool
- [ ] Task 23: Page utilities (history/resize/dialog)

## Lessons Learned

1. **Enable/disable pattern funguje skvěle** - subscription je pořád aktivní, ale sběr jen na vyžádání
2. **BiDi network events jsou async** - potřebujeme tracking map pro měření duration
3. **Resource type heuristic je OK** - extension-based guess je dostatečný
4. **Network buffer persistence** - na rozdíl od console, network buffer přežívá navigaci
5. **Debug logging byl kritický** - bez něj bych netušil, že události přicházejí správně
