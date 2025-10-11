Title: 03 – Konfigurace, `.env`, setup skript pro MCP klienty, Inspector

Cíl

- Umožnit snadnou lokální konfiguraci (env), přidání serveru do MCP klienta a pohodlné ladění přes Inspector.

Kroky

- `.env.example` – definovat proměnné (ilustrační, pro RDP):
  - `RDP_HOST=127.0.0.1`
  - `RDP_PORT=6000`
  - `FIREFOX_PATH=` – volitelné, pokud budeme umět Firefox spouštět sami
  - `FIREFOX_HEADLESS=false`
  - `AUTO_LAUNCH_FIREFOX=true`
  - `VIEWPORT=1280x720`
  - `ACCEPT_INSECURE_CERTS=false`

- `scripts/setup-mcp-config.js` – interaktivní přidání do MCP klienta (analogicky k GSheet):

```js
#!/usr/bin/env node
// Inspirováno: old/mcp_gsheet/scripts/setup-mcp-config.js
// Ilustrační výřez: načtení Node path, dotazy na uživatele, zápis do Claude Desktop configu
import fs from 'fs';
import os from 'os';
import path from 'path';
// ...
const mcpConfig = {
  mcpServers: {
    'firefox-devtools': {
      command: 'node',
      args: ['/ABS/PATH/dist/index.js'],
      env: {
        RDP_HOST: '127.0.0.1',
        RDP_PORT: '6000',
        FIREFOX_HEADLESS: 'false',
        AUTO_LAUNCH_FIREFOX: 'true',
        VIEWPORT: '1280x720'
      }
    }
  }
};
// Zápis do `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) atd.
```

- Přidat npm scripts pro Inspector (stejně jako v GSheet):
  - `inspector`: `npx @modelcontextprotocol/inspector node dist/index.js`
  - `inspector:dev`: `NODE_ENV=development npx @modelcontextprotocol/inspector npx tsx src/index.ts`

Reference

- `old/mcp_gsheet/scripts/setup-mcp-config.js`
- `old/mcp_gsheet/package.json` (scripts `inspector`, `inspector:dev`)

Akceptační kritéria

- `npm run setup` vytvoří/aktualizuje MCP config v Claude Desktop (nebo vypíše JSON pro ruční vložení).
- Inspector se připojí a zobrazí MCP server (dev i build režim).

Konfigurační rozhraní (CLI/ENV)

- CLI přepínače:
  - `--rdp-host=localhost`
  - `--rdp-port=6000`
  - `--firefox-path=/path/to/firefox`
  - `--headless` (zapne headless)
  - `--no-auto-launch` (zakáže auto-spuštění Firefoxu)

- ENV proměnné:
  - `RDP_HOST` (default `localhost`)
  - `RDP_PORT` (default `6000`)
  - `FIREFOX_PATH`
  - `FIREFOX_HEADLESS` (default `false`)
  - `AUTO_LAUNCH_FIREFOX` (default `true`)

Ilustrační parsing (yargs, podobně jako chrome CLI):

```ts
// src/cli.ts (ilustrace)
import yargs from 'yargs';
export const args = yargs(process.argv.slice(2))
  .option('rdp-host', { type: 'string', default: process.env.RDP_HOST ?? 'localhost' })
  .option('rdp-port', { type: 'number', default: Number(process.env.RDP_PORT ?? 6000) })
  .option('firefox-path', { type: 'string', default: process.env.FIREFOX_PATH })
  .option('headless', { type: 'boolean', default: (process.env.FIREFOX_HEADLESS ?? 'false') === 'true' })
  .option('auto-launch', { type: 'boolean', default: (process.env.AUTO_LAUNCH_FIREFOX ?? 'true') === 'true' })
  .boolean(['headless', 'auto-launch'])
  .alias({})
  .parseSync();
```
