# Code Review – 15 BiDi port a screenshot (volitelné)

Datum: 2025-10-11

## Co bylo provedeno

### 1. Nový CLI parametr `--bidi-port`
- Přidal jsem `--bidi-port` do CLI options s defaultem `9223`
- Podpora ENV proměnné `BIDI_PORT`
- Popis: "Port for WebDriver BiDi Remote Agent (used for screenshots)"

**Dotčené soubory:**
- `src/cli.ts` - nová option `bidiPort` (řádky 20-24)

### 2. Rozšíření typu FirefoxLaunchOptions
- Přidal `bidiPort: number` do interface

**Dotčené soubory:**
- `src/firefox/types.ts` - `FirefoxLaunchOptions` (řádek 68)

### 3. Launcher - Firefox argument `-remote-debugging-port`
- Přidal `-remote-debugging-port <bidiPort>` do Firefox argumentů
- Toto spustí WebDriver BiDi Remote Agent na zadaném portu

**Důvod:**
BiDi Remote Agent je oddělený server od RDP. RDP běží na TCP (např. 6000), BiDi na WebSocket (např. 9223).

**Dotčené soubory:**
- `src/firefox/launcher.ts` - metoda `buildArgs()` (řádky 293-294)

### 4. DevTools - BiDi klient používá bidiPort
- Změnil `connect(rdpHost, rdpPort)` na `connect(rdpHost, bidiPort)`
- BiDi se nyní připojuje na správný port (9223 místo 6000)

**Dotčené soubory:**
- `src/firefox/devtools.ts` - metoda `takeScreenshot()` (řádek 249)

### 5. Index.ts - předání bidiPort do options
- Přidal `bidiPort: args.bidiPort` do FirefoxLaunchOptions
- Přidal logování BiDi portu v konfiguraci

**Dotčené soubory:**
- `src/index.ts`:
  - `getContext()` - options (řádek 64)
  - `main()` - logging (řádek 150)

## Rozhodnutí a dopady

### Proč oddělený BiDi port?
- **RDP (Remote Debugging Protocol)** běží na TCP socketu (default 6000)
- **BiDi (WebDriver BiDi)** běží na WebSocket (default 9223)
- Jsou to dva nezávislé servery v rámci Firefoxu
- Screenshot používá BiDi protokol, ostatní funkce používají RDP

### Proč default 9223?
- Běžný port pro Chrome DevTools Protocol je 9222
- Zvolil jsem 9223 pro Firefox aby se nepletl s Chrome
- Uživatel může změnit přes `--bidi-port` nebo `BIDI_PORT`

### Firefox argument `-remote-debugging-port`
- Spouští BiDi Remote Agent
- Naslouchá na `ws://host:port/`
- Nutné pro screenshot funkcionalitu

### Známá omezení
- BiDi Remote Agent vyžaduje Firefox 115+
- Pokud BiDi port koliduje s jiným procesem, screenshot selže s jasnou chybou
- Format screenshotu je vždy PNG (BiDi limitace), transcoding do JPEG/WebP zatím není implementován

## Reference

**Podobné implementace:**
- Chrome MCP používá Puppeteer s CDP (Chrome DevTools Protocol)
- BiDi je standard napříč browsery (WebDriver BiDi specification)

**Aktuální implementace:**
- `src/cli.ts` - CLI konfigurace
- `src/firefox/types.ts` - typy
- `src/firefox/launcher.ts` - spouštění s BiDi
- `src/firefox/devtools.ts` - screenshot přes BiDi
- `src/firefox/bidi-client.ts` - BiDi WebSocket klient
- `src/index.ts` - inicializace

## Další kroky

- Task 16: Dokumentace pro vlastní Firefox klient
- Možné vylepšení: automatická detekce volného portu pro BiDi
- Možné vylepšení: fallback mechanismus pokud BiDi není k dispozici

## Testování

Build prošel úspěšně. Screenshot funkcionalita vyžaduje:
1. Firefox spuštěný s `-remote-debugging-port 9223`
2. BiDi WebSocket handshake na `ws://127.0.0.1:9223/`
3. Browsing context selection
4. `browsingContext.captureScreenshot` command

Při chybě BiDi připojení uživatel dostane:
```
Screenshot not available: BiDi connection failed. [error details]
```
