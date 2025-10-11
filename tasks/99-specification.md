Title: 99 – Původní specifikace (přesunuto z tasks/README.md)

# Firefox DevTools MCP Server - Specifikace

## Přehled projektu
Model Context Protocol server pro ovládání a inspekci Firefox browseru přes Mozilla Remote Debugging Protocol. Umožňuje AI asistentům automatizovat Firefox stejně jako chrome-devtools-mcp funguje pro Chrome.

## Technologie
- **Jazyk:** TypeScript/Node.js
- **Runtime:** Node.js 18+
- **Browser automatizace:** Playwright for Firefox
- **Protocol:** Mozilla Remote Debugging Protocol
- **MCP SDK:** @modelcontextprotocol/sdk

## Hlavní funkce (MCP Tools)

### 1. Browser Lifecycle Management
- `launch_firefox` - Spustí Firefox s remote debugging
  - Parametry: headless (bool), debugging_port (number), profile_path (string)
  - Výstup: browser instance info, debugging URL
  
- `close_firefox` - Ukončí Firefox instanci
  - Parametry: force (bool)

### 2. Navigace a Tab Management
- `navigate_to` - Naviguje na URL
  - Parametry: url (string), wait_until (string: load/domcontentloaded/networkidle)
  
- `list_tabs` - Vypíše všechny otevřené taby
  - Výstup: array tabů s ID, title, URL
  
- `create_tab` - Vytvoří nový tab
  - Parametry: url (string), context_id (string)
  
- `close_tab` - Zavře tab
  - Parametry: tab_id (string)
  
- `switch_tab` - Přepne na jiný tab
  - Parametry: tab_id (string)

### 3. JavaScript Execution
- `evaluate_javascript` - Vykoná JS kód v kontextu stránky
  - Parametry: code (string), tab_id (string), await_promise (bool)
  - Výstup: result/error
  
- `evaluate_in_console` - Vykoná příkaz v DevTools konzoli
  - Parametry: expression (string), tab_id (string)

### 4. DOM Inspection
- `get_page_content` - Získá HTML obsah stránky
  - Parametry: tab_id (string), selector (optional string)
  - Výstup: HTML string nebo text content
  
- `get_page_title` - Získá title stránky
  - Parametry: tab_id (string)
  
- `find_elements` - Najde elementy podle selectoru
  - Parametry: selector (string), tab_id (string)
  - Výstup: array elementů s info (tag, id, class, text)
  
- `get_element_properties` - Získá properties elementu
  - Parametry: selector (string), properties (array), tab_id (string)

### 5. User Interaction Simulation
- `click_element` - Klikne na element
  - Parametry: selector (string), tab_id (string)
  
- `type_text` - Napíše text do inputu
  - Parametry: selector (string), text (string), tab_id (string)
  
- `scroll_page` - Scrolluje stránku
  - Parametry: direction (string), amount (number), tab_id (string)

### 6. Network & Debugging
- `get_console_logs` - Získá console logy
  - Parametry: tab_id (string), types (array: log/warn/error), limit (number)
  
- `monitor_network` - Zapne/vypne network monitoring
  - Parametry: enabled (bool), tab_id (string)
  
- `get_network_requests` - Získá zachycené network requesty
  - Parametry: tab_id (string), filter (optional object)

### 7. Screenshots & Visual
- `take_screenshot` - Udělá screenshot
  - Parametry: tab_id (string), full_page (bool), path (optional string)
  - Výstup: base64 image nebo saved path
  
- `get_viewport_size` - Získá velikost viewportu
  - Parametry: tab_id (string)

### 8. Storage & Cookies
- `get_cookies` - Získá cookies
  - Parametry: tab_id (string), url (optional string)
  
- `set_cookie` - Nastaví cookie
  - Parametry: name, value, domain, path, tab_id
  
- `get_local_storage` - Získá localStorage data
  - Parametry: tab_id (string)

## Architektura

### Komponenty
1. **MCP Server** - Hlavní server implementující MCP protocol
2. **Firefox Manager** - Správa Firefox procesů a připojení
3. **Protocol Client** - Komunikace s Firefox Remote Debugging Protocol
4. **Tab Manager** - Správa browser kontextů a tabů
5. **Event Monitor** - Zachytávání console logů, network events, atd.

### Komunikace
```
Claude/AI Agent
    ↓ (MCP Protocol)
MCP Server
    ↓ (stdio/WebSocket)
Firefox Manager
    ↓ (Remote Debugging Protocol)
Firefox Browser
```

## Konfigurace

### Claude Desktop config příklad
```json
{
  "mcpServers": {
    "firefox-devtools": {
      "command": "node",
      "args": ["/path/to/firefox-devtools-mcp/build/index.js"],
      "env": {
        "FIREFOX_PATH": "/path/to/firefox",
        "DEBUG_PORT": "6000"
      }
    }
  }
}
```

### Environment Variables
- `FIREFOX_PATH` - Cesta k Firefox binary
- `DEBUG_PORT` - Port pro remote debugging (default: 6000)
- `HEADLESS` - Headless mode (default: false)
- `PROFILE_DIR` - Cesta k Firefox profilu
- `LOG_LEVEL` - Logging level (debug/info/warn/error)

## Firefox Setup Requirements

### Nastavení Firefox profilu
```
devtools.chrome.enabled = true
devtools.debugger.remote-enabled = true
devtools.debugger.prompt-connection = false
browser.sessionstore.resume_from_crash = false
```

### Spuštění s debugging
```bash
firefox --start-debugger-server 6000 --profile /path/to/profile
```

## Error Handling

### Chybové stavy
- Firefox není nainstalovaný
- Port už je používaný
- Timeout při připojování
- Tab/context neexistuje
- JavaScript execution error
- Network error

### Response formát
```typescript
{
  success: boolean,
  data?: any,
  error?: {
    code: string,
    message: string,
    details?: any
  }
}
```

## Bezpečnost

### Omezení
- Pouze localhost připojení (default)
- Konfigurovatelný whitelist domén
- No arbitrary file system access
- User confirmation pro sensitive operace (optional)

### Permissions
- Explicitní povolení pro:
  - File downloads
  - Clipboard access
  - Geolocation
  - Notifications

## Testing

### Test Coverage
- Unit testy pro každý MCP tool
- Integration testy s real Firefox
- E2E testy pro common workflows
- Mock Firefox protocol responses pro CI/CD

### Test Scenarios
- Browser launch/close
- Multi-tab management
- JavaScript evaluation
- DOM manipulation
- Network monitoring
- Error handling

## Documentation

### README sections
1. Installation
2. Quick Start
3. Configuration
4. Available Tools (všechny MCP tools s příklady)
5. Firefox Setup Guide
6. Troubleshooting
7. Development Guide
8. API Reference

### Příklady použití
- Basic navigation a scraping
- Multi-tab testing
- Console debugging
- Network analysis
- Automated testing

## Rozšíření (Future Features)

### Nice to have
- WebSocket monitoring
- Performance metrics (timing, memory)
- HAR export
- Screenshot comparison
- Video recording
- Multiple Firefox profiles
- Remote Firefox (ne jen localhost)
- Firefox Developer Edition specifics
- WebExtension debugging support

## Kompatibilita

### Firefox verze
- Firefox Stable (latest)
- Firefox ESR
- Firefox Developer Edition
- Firefox Nightly

### OS Support
- Linux ✅
- macOS ✅
- Windows ✅

## Performance

### Optimalizace
- Connection pooling pro multiple tabs
- Lazy loading pro heavy operations
- Caching pro repeated queries
- Configurable timeouts
- Resource cleanup on disconnect

---

**Poznámka:** Toto je komplexní specifikace. Pro MVP stačí implementovat základní nástroje (launch, navigate, evaluate_javascript, get_page_content, list_tabs, take_screenshot).

