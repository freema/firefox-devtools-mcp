# Code Review – 18 Firefox Client Architecture Refactor

Datum: 2025-10-12

## Co bylo provedeno

Refaktorovali jsme monolitický `src/firefox/devtools.ts` do modulární struktury se 4 specializovanými moduly. Zachována zpětná kompatibilita.

### Nová struktura

```
src/firefox/
├── index.ts      - FirefoxClient facade (veřejné API)
├── core.ts       - WebDriver + BiDi connection management
├── dom.ts        - JavaScript eval, element lookup, input actions
├── pages.ts      - Tab/window management, navigation
├── events.ts     - Console buffer (live), network buffer (Task 19)
└── types.ts      - Shared TypeScript types
```

### Dotčené soubory

1. **src/firefox/core.ts** (nový)
   - `FirefoxCore` class
   - WebDriver initialization, BiDi connection
   - `connect()`, `getDriver()`, `getCurrentContextId()`, `close()`

2. **src/firefox/dom.ts** (nový)
   - `DomInteractions` class
   - `evaluate()`, `getContent()`, `clickBySelector()`, `hoverBySelector()`
   - `fillBySelector()`, `dragAndDropBySelectors()`, `uploadFileBySelector()`

3. **src/firefox/pages.ts** (nový)
   - `PageManagement` class
   - `navigate()`, `navigateBack()`, `navigateForward()`, `setViewportSize()`
   - `getTabs()`, `selectTab()`, `createNewPage()`, `closeTab()`

4. **src/firefox/events.ts** (nový)
   - `ConsoleEvents` class - BiDi console subscription a message buffer
   - `NetworkEvents` class - placeholder pro Task 19

5. **src/firefox/index.ts** (nový)
   - `FirefoxClient` facade delegující na moduly
   - Export `FirefoxDevTools` alias pro backward compatibility

6. **src/firefox/devtools.ts** (odstraněn)
   - Monolitická implementace (~350 řádků) rozdělena do modulů

7. **src/index.ts** (aktualizován)
   - Import změněn z `./firefox/devtools.js` → `./firefox/index.js`

8. **docs/firefox-client.md** (aktualizován)
   - Sekce "Client Architecture" popisuje novou modulární strukturu
   - Sekce "High-Level API" aktualizována pro moduly

## Rozhodnutí a dopady

### 1. Minimal Modularizace

**Rozhodnutí:** 4 moduly místo více (např. nepřidávat `input.ts`, `snapshot.ts` apod.)
- `core` - connection lifecycle
- `dom` - všechny DOM interakce
- `pages` - všechno co se týká tabů/oken
- `events` - všechny event buffery

**Důvod:** Start konzervativně. Pokud modul poroste, rozdělíme později.

### 2. Facade Pattern

**FirefoxClient** (`index.ts`) slouží jako jediný entry point:
- Všechny public metody delegují na příslušné moduly
- Zachována 100% backward compatibility
- Export `FirefoxDevTools` alias pro existující kód

### 3. Constructor Injection

`PageManagement` přijímá callbacks pro přístup k `currentContextId`:
```typescript
constructor(
  private driver: WebDriver,
  private getCurrentContextId: () => string | null,
  private setCurrentContextId: (id: string) => void
)
```

**Důvod:** Umožňuje `pages` modulu aktualizovat stav v `core` bez přímé závislosti.

### 4. Network Stub

`NetworkEvents` obsahuje placeholder metody s `// TODO: Implement in Task 19`:
- `subscribe()`, `getRequests()`, `clearRequests()`
- Parametr `driver` označen `@ts-expect-error` kvůli „unused variable"

**Důvod:** Připravit strukturu pro Task 19, ale neimplementovat nyní.

## Technické poznámky

- **Žádné breaking changes** - všechny existující volání fungují
- **TypeScript strict mode** - všechny moduly projdou type check
- **ESLint clean** - žádné warningy

## Validace

- ✅ `task check` prošel (ESLint + TypeScript)
- ✅ `task build` prošel
- ✅ `node scripts/test-bidi-devtools.js` úspěšně otestoval všechny funkce
  - Console logging ✅
  - Navigation ✅
  - DOM interactions ✅
  - Tab management ✅
  - Performance metrics ✅
  - History navigation ✅

## Reference

- Task specifikace: `tasks/18-firefox-client-architecture-refactor.md`
- BiDi coverage: `tasks/17-bidi-coverage-vs-chrome-tools.md`
- Client docs: `docs/firefox-client.md`

## Další kroky

- [x] Task 18 kompletní
- [ ] Task 19: Network backend (BiDi events) - implementovat `NetworkEvents`
- [ ] Task 20: Snapshot + UID mapping
- [ ] Task 21: Input tools (MCP integration)
- [ ] Task 22: Screenshot tool
- [ ] Task 23: Page utilities (history/resize/dialog)

## Lessons Learned

1. **Facade pattern funguje skvěle** - jediný entry point, čistá delegace
2. **Constructor injection je užitečná** - `PageManagement` může aktualizovat state v `core` bez cyklické závislosti
3. **Placeholder classes jsou OK** - `NetworkEvents` stub připravuje strukturu pro Task 19
4. **Backward compatibility je kritická** - export `FirefoxDevTools` alias zachoval všechny existující call-sites
