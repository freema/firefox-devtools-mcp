# Firefox DevTools MCP Server - Aktuální Specifikace (2025)

## Přehled projektu

Model Context Protocol server pro ovládání a inspekci Firefox browseru přes **WebDriver BiDi protokol**. Umožňuje AI asistentům automatizovat Firefox s moderní architekturou založenou na W3C standardech.

**Status:** ✅ Produkční implementace s kompletní funkcionalitou

## Technologie

- **Jazyk:** TypeScript/Node.js
- **Runtime:** Node.js 20.19.0+
- **Browser automatizace:** Selenium WebDriver 4.36+ s BiDi protokolem
- **Protocol:** W3C WebDriver BiDi (nástupce RDP)
- **MCP SDK:** @modelcontextprotocol/sdk ^1.17.1
- **Build:** tsup (esbuild wrapper)
- **Testing:** Vitest + manuální test skripty

## Aktuální Architektura

### Modulární struktura `src/firefox/`

```
src/firefox/
├── index.ts           # FirefoxClient - Public API facade
├── core.ts            # FirefoxCore - WebDriver + BiDi connection
├── types.ts           # TypeScript type definitions
├── events.ts          # ConsoleEvents + NetworkEvents
├── dom.ts             # DomInteractions - DOM manipulation
├── pages.ts           # PageManagement - tabs, navigation, dialogs
└── snapshot/          # DOM snapshot system with UID mapping
    ├── index.ts       # Snapshot public interface
    ├── manager.ts     # SnapshotManager - caching & resolution
    ├── formatter.ts   # Text formatter for LLM consumption
    ├── types.ts       # Snapshot type definitions
    └── injected/      # Browser-side injected scripts
        ├── snapshot.injected.ts    # Main injected entry point
        ├── treeWalker.ts           # DOM tree traversal
        ├── elementCollector.ts     # Element filtering & relevance
        ├── attributeCollector.ts   # ARIA & accessibility
        └── selectorGenerator.ts    # CSS & XPath generation
```

### Komponenty

1. **FirefoxCore** (`core.ts`)
   - Správa Selenium WebDriver instance
   - BiDi protokol enablement
   - Lifecycle management (launch, quit)
   - Browsing context tracking

2. **ConsoleEvents** (`events.ts`)
   - BiDi `log.entryAdded` subscription
   - Console message collection (debug, info, warn, error)
   - Real-time WebSocket message parsing

3. **NetworkEvents** (`events.ts`)
   - BiDi network event subscriptions:
     - `network.beforeRequestSent`
     - `network.responseStarted`
     - `network.responseCompleted`
   - Request/response pairing
   - Timing calculation
   - Resource type detection
   - Start/stop monitoring control

4. **DomInteractions** (`dom.ts`)
   - JavaScript evaluation via WebDriver
   - Page content extraction
   - Selector-based interactions (click, hover, fill, drag, upload)
   - UID-based interactions (resolves snapshot UIDs to elements)
   - Screenshot capture (full page + element)

5. **PageManagement** (`pages.ts`)
   - Navigation (URL, back, forward)
   - Tab/window management
   - Viewport resizing
   - Dialog handling (alert, confirm, prompt)

6. **SnapshotManager** (`snapshot/`)
   - DOM tree snapshot with UIDs
   - CSS & XPath selector generation
   - Element caching with staleness detection
   - ARIA attributes & accessibility info
   - LLM-optimized text format
   - Iframe support (same-origin only)
   - Incremental snapshot IDs

### Komunikace

```
Claude/AI Agent
    ↓ (MCP Protocol - stdio)
MCP Server (src/index.ts)
    ↓ (FirefoxClient API)
Selenium WebDriver
    ↓ (WebDriver BiDi Protocol - WebSocket)
Firefox Browser (BiDi enabled)
```

## Implementované Funkce

### 1. Browser Lifecycle ✅

**`FirefoxClient.connect()`**
- Spustí Firefox přes Selenium WebDriver
- Nastaví BiDi protokol
- Vrací: Promise<void>
- Options:
  - `firefoxPath?: string` - Cesta k Firefox binary
  - `headless: boolean` - Headless mode
  - `profilePath?: string` - Custom Firefox profile
  - `viewport?: {width, height}` - Velikost okna
  - `args?: string[]` - Další Firefox argumenty
  - `startUrl?: string` - Počáteční URL

**`FirefoxClient.close()`**
- Ukončí Firefox instanci
- Cleanup všech resources
- Vrací: Promise<void>

### 2. Navigace a Správa Stránek ✅

**`navigate(url: string)`**
- Naviguje na URL
- Automaticky čistí console a snapshot cache
- Vrací: Promise<void>

**`navigateBack()` / `navigateForward()`**
- Historie navigace
- Vrací: Promise<void>

**`getTabs()` / `selectTab(index)` / `createNewPage(url)` / `closeTab(index)`**
- Tab management přes window handles
- Vrací: tab info nebo Promise<void>

**`refreshTabs()` / `getSelectedTabIdx()`**
- Tab metadata operations

### 3. Viewport & Dialogs ✅

**`setViewportSize(width: number, height: number)`**
- Změní velikost viewport
- Vrací: Promise<void>

**`acceptDialog(promptText?: string)`**
- Přijme alert/confirm/prompt dialog
- Optional text input pro prompt
- Vrací: Promise<void>

**`dismissDialog()`**
- Zavře/zamítne dialog
- Vrací: Promise<void>

### 4. JavaScript Execution ✅

**`evaluate(script: string)`**
- Vykoná JavaScript v page context
- Automatické `return` wrapping
- Vrací: Promise<unknown> (JSON-serializable result)

**`getContent()`**
- Získá `document.documentElement.outerHTML`
- Vrací: Promise<string>

### 5. DOM Snapshot System ✅

**`takeSnapshot()`**
- Kompletní DOM snapshot s UIDs
- Vrací: `Promise<Snapshot>`
  - `json: SnapshotJson` - Strukturovaný DOM tree
  - `text: string` - LLM-optimized textová reprezentace

**SnapshotNode structure:**
```typescript
{
  uid: string,              // Unikátní ID (snapshotId_nodeId)
  tag: string,              // HTML tag name
  role?: string,            // ARIA role nebo semantická role
  name?: string,            // Accessible name
  value?: string,           // Input/textarea value
  href?: string,            // Link href
  src?: string,             // Image/iframe src
  text?: string,            // Text content
  aria?: AriaAttributes,    // ARIA properties
  computed?: {              // Computed properties
    focusable?: boolean,
    interactive?: boolean,
    visible?: boolean
  },
  children: SnapshotNode[]  // Nested elements
}
```

**`resolveUidToSelector(uid: string)`**
- Převede UID na CSS selector
- Validuje staleness (snapshot ID)
- Vrací: string

**`resolveUidToElement(uid: string)`**
- Převede UID na WebElement
- Caching s staleness detection
- Fallback na XPath při selhání CSS
- Vrací: Promise<WebElement>

**`clearSnapshot()`**
- Vyčistí snapshot cache

### 6. User Interaction (Selector-based) ✅

**`clickBySelector(selector: string)`**
- Klikne na element
- Vrací: Promise<void>

**`hoverBySelector(selector: string)`**
- Hover nad element
- Vrací: Promise<void>

**`fillBySelector(selector: string, text: string)`**
- Vyplní input/textarea
- Clear + sendKeys
- Vrací: Promise<void>

**`dragAndDropBySelectors(source: string, target: string)`**
- Drag & drop mezi elementy
- JS fallback (HTML5 DnD API)
- Vrací: Promise<void>

**`uploadFileBySelector(selector: string, filePath: string)`**
- Upload souboru
- JS unhide + sendKeys
- Vrací: Promise<void>

### 7. User Interaction (UID-based) ✅

**`clickByUid(uid: string, dblClick = false)`**
- Klikne na element podle UID
- Optional double-click
- Vrací: Promise<void>

**`hoverByUid(uid: string)`**
- Hover podle UID
- Vrací: Promise<void>

**`fillByUid(uid: string, value: string)`**
- Vyplní input podle UID
- Vrací: Promise<void>

**`dragByUidToUid(fromUid: string, toUid: string)`**
- Drag & drop mezi UIDs
- Vrací: Promise<void>

**`fillFormByUid(elements: Array<{uid, value}>)`**
- Batch form filling
- Vrací: Promise<void>

**`uploadFileByUid(uid: string, filePath: string)`**
- Upload podle UID
- Vrací: Promise<void>

### 8. Screenshots ✅

**`takeScreenshotPage()`**
- Full page screenshot
- Vrací: Promise<string> (base64 PNG)

**`takeScreenshotByUid(uid: string)`**
- Screenshot konkrétního elementu
- Automatický scrollIntoView
- Element cropping (native Selenium)
- Vrací: Promise<string> (base64 PNG)

### 9. Console Monitoring ✅

**`getConsoleMessages()`**
- Získá všechny console logy
- Vrací: Promise<ConsoleMessage[]>
  - `level: 'debug' | 'info' | 'warn' | 'error'`
  - `text: string`
  - `timestamp: number`
  - `source?: string`
  - `args?: unknown[]`

**`clearConsoleMessages()`**
- Vyčistí console buffer
- Vrací: void

### 10. Network Monitoring ✅

Aktuální přístup: Always‑on capture (návrh změny) – sběr síťových událostí běží trvale po `connect()`, relevanci dat řídíme přes nástroj `list_network_requests` (filtry `sinceMs`, `limit`, `sortBy`, …). Jednotlivé requesty mají stabilní `id` (BiDi request id), které lze použít v `get_network_request` pro stažení detailu.

API (klientská vrstva):

**`getNetworkRequests()`**
- Vrátí zachycené requesty (od posledního čistění bufferu při navigaci, pokud je auto‑clear zapnut)
- Vrací: Promise<NetworkRecord[]>
  - `id: string`
  - `url: string`
  - `method: string`
  - `status?: number`
  - `resourceType?: string`
  - `requestHeaders?: Record<string, string>`
  - `responseHeaders?: Record<string, string>`
  - `timings?: {requestTime, responseTime, duration}`

Pozn.: Dřívější start/stop/clear nástroje budou odstraněny z MCP vrstvy (viz tasks/NETWORK-03-...).

## MCP Tools (Budoucí implementace)

Následující MCP tools budou vystaveny přes `src/index.ts` MCP server:

Poznámka k `inputSchema`:
- Všechny MCP nástroje musí používat čisté JSON Schema (serializovatelné), ne přímo Zod instance. Validaci lze interně ponechat, ale schema publikovat v JSON podobě (viz tasks/SCHEMA-01-json-schema-unification.md).

### Plánované Tools

1. **Browser Management**
   - `firefox_launch` - Spustí Firefox (wrapper nad connect)
   - `firefox_close` - Ukončí Firefox
   - `firefox_get_status` - Status info

2. **Navigation**
   - `navigate_to` - Navigace na URL
   - `navigate_back` / `navigate_forward` - Historie
   - `list_tabs` - Seznam tabů
   - `select_tab` - Přepnutí tabu
   - `create_tab` - Nový tab
   - `close_tab` - Zavřít tab

3. **DOM Inspection**
   - `take_snapshot` - DOM snapshot s UIDs
   - `get_page_content` - HTML content
   - `find_elements` - Najít elementy (future)
   - `resolve_uid` - UID → selector/element

4. **User Interaction**
   - `click_element` - Klik (selector nebo UID)
   - `type_text` - Psaní textu
   - `hover_element` - Hover
   - `drag_and_drop` - Drag & drop
   - `upload_file` - Upload souboru
   - `fill_form` - Batch form filling

5. **JavaScript**
   - `evaluate_javascript` - JS eval
   - `get_console_logs` - Console messages

6. **Network & Performance**
   - `list_network_requests` - Vylistovat requesty (filtry, stabilní `id`, možnost detailního výstupu)
   - `get_network_request` - Detail požadavku podle `id`
   - (odstranit) `start_network_monitor` / `stop_network_monitor` / `clear_network_requests`
   - (odstranit) `get_performance_metrics`, `performance_start_trace`, `performance_stop_trace` (viz tasks/PERFORMANCE-01-...)

7. **Screenshots**
   - `take_screenshot` - Page nebo element screenshot

8. **Dialogs & Viewport**
   - `handle_dialog` - Accept/dismiss dialog
   - `resize_viewport` - Změna velikosti

---

## Release and Versioning (RELEASE-01)

- Use semver in the 0.x range until the public API is stable.
- Injected snapshot bundle includes a simple version marker that is logged on load.
- Align Node.js runtime requirement with `package.json engines` (>=20).

## Google Actions (ACTIONS-01/02)

- Prepare Google Actions mapping for our Firefox tools. Use `old/mcp_gsheet` as inspiration only (style and structure), do not integrate Google Sheets.
- Keep action surface minimal and English‑only; inputs use plain JSON Schema.


9. **Storage (future)**
   - `get_cookies` - Získat cookies
   - `set_cookie` - Nastavit cookie
   - `get_local_storage` - LocalStorage data
   - `get_session_storage` - SessionStorage data

## Testování

### Implementované Test Skripty

1. **`scripts/test-bidi-devtools.js`**
   - Kompletní E2E test suite (18 testů)
   - Coverage všech funkcí:
     - Browser launch & connect
     - Navigation & tabs
     - Console monitoring
     - Network monitoring
     - JavaScript evaluation
     - Snapshot system
     - History navigation
     - Screenshot capture
     - Dialog handling

2. **`scripts/test-input-tools.js`**
   - Test všech input interakcí
   - Selector-based i UID-based metody
   - Click, hover, fill, drag, upload

3. **`scripts/test-screenshot.js`**
   - Full page screenshots
   - Element screenshots
   - Custom HTML testy
   - Output do `/temp` složky

4. **`scripts/test-dialog.js`**
   - Alert dialogs
   - Confirm dialogs (accept/dismiss)
   - Prompt dialogs s text inputem
   - Error handling

### NPM Test Scripts

```bash
npm run test:tools       # Hlavní E2E testy
npm run test:input       # Input tools testy
npm run test:screenshot  # Screenshot testy
npm run test:dialog      # Dialog handling testy
```

### Quality Checks

```bash
npm run check           # ESLint fix + TypeScript typecheck
npm run check:all       # check + vitest + build
npm run build           # tsup build
```

## Konfigurace

### FirefoxLaunchOptions

```typescript
{
  firefoxPath?: string;        // Auto-detect pokud není uvedeno
  headless: boolean;           // true/false
  profilePath?: string;        // Custom profile
  viewport?: {
    width: number;
    height: number;
  };
  args?: string[];            // Extra Firefox args
  startUrl?: string;          // Počáteční URL
}
```

### Claude Desktop Config (MCP)

```json
{
  "mcpServers": {
    "firefox-devtools": {
      "command": "node",
      "args": ["/path/to/firefox-devtools-mcp/dist/index.js"],
      "env": {
        "FIREFOX_PATH": "/Applications/Firefox.app/Contents/MacOS/firefox"
      }
    }
  }
}
```

### Environment Variables

- `FIREFOX_PATH` - Cesta k Firefox binary (optional, auto-detect)
- `DEBUG` - Debug logging (např. `DEBUG=firefox-devtools-mcp`)
- `NODE_ENV` - development/production

## Firefox Setup

### Požadavky

- **Firefox:** Stable (latest), ESR, Developer Edition, nebo Nightly
- **Geckodriver:** Auto-instalováno přes npm (geckodriver package)
- **Node.js:** 20.19.0+

### BiDi Protocol

WebDriver BiDi je automaticky aktivován přes Selenium:

```typescript
const firefoxOptions = new firefox.Options();
firefoxOptions.enableBidi();
```

**Žádná manuální konfigurace Firefox profilu není potřeba!**

## Omezení a Známé Issues

### BiDi Coverage

✅ **Plně podporováno:**
- JavaScript evaluation
- Navigation & history
- Console monitoring
- Network monitoring (beforeRequestSent, responseStarted, responseCompleted)
- Screenshot (full page + element)
- Dialog handling
- Tab management

⚠️ **Částečně podporováno:**
- Iframe support (pouze same-origin)
- Network timing (ne tak přesné jako Chrome DevTools)

❌ **Není podporováno:**
- WebSocket monitoring (BiDi spec in progress)
- Service Worker debugging
- Cross-origin iframe inspection
- HAR export (není v BiDi)
- Video recording (není v BiDi)
- Performance profiling (pouze Performance API přes JS)

### Known Issues

1. **Data URL parsing:** Firefox má problém s komplexními data: URLs
   - **Fix:** Použít `about:blank` + innerHTML injection

2. **Staleness detection:** UIDs jsou vázány na snapshot ID
   - Po navigaci automaticky invalidovány
   - Cache se čistí při `navigate()`

3. **Drag & Drop:** Native WebDriver DnD je nestabilní
   - **Fix:** JS fallback s HTML5 DnD API

4. **File Upload:** Input může být `display: none`
   - **Fix:** JS unhide před sendKeys

## Performance & Optimalizace

### Implementované optimalizace

1. **Element caching** - UID → WebElement cache
2. **Staleness detection** - Snapshot ID validation
3. **Lazy event subscription** - BiDi events pouze při connect
4. **Always‑on network capture** - Filtry (`sinceMs`, `limit`) místo start/stop
5. **Efficient selectors** - CSS primary, XPath fallback

### Resource Cleanup

- Automatické cleanup při `close()`
- Console/Network buffer clearing
- Snapshot cache invalidation na navigation

## Development

### Struktura projektu

```
firefox-devtools-mcp/
├── src/
│   ├── index.ts           # MCP server entry point
│   ├── firefox/           # Firefox client library
│   ├── tools/             # MCP tool definitions (future)
│   └── utils/             # Shared utilities
├── scripts/               # Test & setup scripts
├── tasks/                 # Task specifications
├── old/                   # Reference implementations
├── temp/                  # Test artifacts
└── dist/                  # Build output
```

### Build System

- **Builder:** tsup (esbuild wrapper)
- **Target:** Node 20 ESM
- **Output:** Single-file bundle + type definitions
- **Watch mode:** `npm run dev`

### Code Quality

- **Linter:** ESLint + TypeScript plugin
- **Formatter:** Prettier
- **Types:** Strict TypeScript (`exactOptionalPropertyTypes: true`)
- **Testing:** Vitest + manual E2E scripts
 - **Comment Style:** English only; concise, accurate, and durable (no internal task numbers). User‑facing caveats belong in docs, not tool descriptions. See tasks/CODE-COMMENTS-01-review-and-cleanup.md.

## Roadmap

### ✅ Completed (Q1 2025)

- [x] Project scaffold & TypeScript setup
- [x] BiDi connection & WebDriver integration
- [x] Modular architecture (core, events, dom, pages, snapshot)
- [x] Console & Network monitoring
- [x] Snapshot system s UID mapping
- [x] Selector-based input tools
- [x] UID-based input tools
- [x] Screenshot tools (page + element)
- [x] Dialog handling
- [x] Comprehensive test coverage

### 🚧 In Progress (Q2 2025)

- [ ] MCP Tools implementation (`src/tools/`)
- [ ] MCP Server integration (`src/index.ts`)
- [ ] Resource & Prompt definitions
- [ ] Error handling standardization
- [ ] Tool documentation & examples

### 📋 Future Features

#### Short-term
- [ ] Cookie management
- [ ] LocalStorage/SessionStorage access
- [ ] Element visibility checks
- [ ] Wait conditions (element present, visible, etc.)
- [ ] Keyboard shortcuts simulation
- [ ] Mouse wheel scroll
 - [ ] Overhaul síťových nástrojů (NETWORK-01/02/03)
 - [ ] Sjednocení `inputSchema` na čisté JSON Schema (SCHEMA-01)
 - [ ] Odstranění performance nástrojů z MCP (PERFORMANCE-01)
 - [ ] Vylepšit `take_snapshot` (SNAPSHOT-01)

#### Medium-term
- [ ] Performance metrics (Performance API wrapper)
- [ ] Advanced selector strategies (text content, label)
- [ ] Accessibility tree snapshot
- [ ] Cross-origin iframe support (if BiDi adds)
- [ ] WebSocket monitoring (when BiDi supports)

#### Long-term
- [ ] Multi-profile support
- [ ] Remote Firefox connection
- [ ] HAR export (custom implementation)
- [ ] Screenshot comparison
- [ ] Video recording (screencast)
- [ ] Firefox Developer Edition specifics
- [ ] WebExtension debugging support

## Kompatibilita

### Firefox Verze
- ✅ Firefox Stable (latest) - Primary target
- ✅ Firefox ESR - Supported
- ✅ Firefox Developer Edition - Supported
- ✅ Firefox Nightly - Supported (ale může mít BiDi breaking changes)

### OS Support
- ✅ macOS (tested: macOS Sequoia 15.6)
- ✅ Linux (via Selenium WebDriver)
- ✅ Windows (via Selenium WebDriver)

### Node.js
- ✅ Node 20.19.0+ (required)
- ❌ Node 18.x (není testováno)

## Závěr

Firefox DevTools MCP je kompletní automation library postavená na moderním WebDriver BiDi protokolu. Poskytuje:

- **Čistou TypeScript API** s type safety
- **Modular architecture** s jasnou separation of concerns
- **UID-based interaction** pro AI-friendly DOM targeting
- **Comprehensive testing** s E2E coverage
- **Production-ready** s error handling a resource cleanup

**Ready for MCP integration!** Další krok je implementace MCP Tools vrstvy a připojení na MCP SDK.
