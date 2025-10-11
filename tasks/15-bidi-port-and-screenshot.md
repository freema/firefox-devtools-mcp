# 15 – BiDi port a screenshot (volitelný post‑MVP)

Cíl: Oddělit WebDriver BiDi od RDP a umožnit stabilní `captureScreenshot` přes BiDi Remote Agent.

Proč: BiDi WebSocket typicky neběží na stejném portu jako RDP. V současnosti se BiDi pokouší připojit k RDP portu, což selže, pokud Remote Agent není spuštěn.

Odkazy
- `src/firefox/bidi-client.ts` – očekává `ws://host:port/`
- `src/firefox/devtools.ts: takeScreenshot()` – lazy init BiDi klienta
- Firefox: Remote Agent spouštěcí volba `-remote-debugging-port <port>`
- `old/mcp_dev_tool_chrome` – screenshot řešen přes Puppeteer/CDP (referenční parity)

Rozsah
- Nový CLI/ENV parametr `bidiPort`
- Při auto‑launch přidat `-remote-debugging-port <bidiPort>`
- `FirefoxBiDiClient.connect()` přepnout na BiDi port (ne RDP port)

Úkoly
1) CLI/ENV
   - Přidat `--bidi-port` (ENV `BIDI_PORT`), default např. `9223`
   - Logovat BiDi port v `src/index.ts`

2) Launcher
   - Při launch přidat `-remote-debugging-port <bidiPort>`

3) BiDi klient
   - `FirefoxBiDiClient.connect(host, bidiPort)` – použít BiDi port
   - Error handling: srozumitelná hláška, pokud Remote Agent neběží

4) Dokumentace
   - Vysvětlit rozdíl RDP (TCP) vs. BiDi (WebSocket)
   - Doplnit troubleshooting (port kolize)

Akceptační kritéria
- `node scripts/test-tools.js` → `take_screenshot` vrací base64 PNG (případně uložený soubor)
- BiDi WebSocket handshake proběhne na zadaném portu
- Při vypnutém Remote Agentu dostanu jasnou chybu a doporučení

Poznámky
- MVP může dočasně zůstat u RDP/canvas placeholderu; tento task je volitelný.

