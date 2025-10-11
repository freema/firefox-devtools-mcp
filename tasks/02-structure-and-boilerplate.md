Title: 02 – Struktura `src/` a skelet MCP serveru

Cíl

- Vytvořit adresářovou strukturu jako v `old/mcp_gsheet` a připravit minimální `src/index.ts`, který registruje nástroje a běží přes stdio.

Struktura

- `src/index.ts` – start MCP serveru (viz GSheet)
- `src/tools/index.ts` – export všech tool definic + handlerů
- `src/tools/*` – soubory jednotlivých nástrojů (MVP: pages, screenshot, console, evaluate)
- `src/utils/*` – response/util/helper vrstva (logger, validace, parsování)
- `src/types/*` – sdílené typy
- `src/config/*` – konstanty a konfigurace

Ukázkový skelet `src/index.ts` (ilustrační)

```ts
#!/usr/bin/env node

// Dev .env podpora jako v GSheet
if (process.env.NODE_ENV !== 'production') {
  try {
    const { config } = await import('dotenv');
    config();
  } catch {}
}

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, ListResourcesRequestSchema, ReadResourceRequestSchema, CallToolRequest } from '@modelcontextprotocol/sdk/types.js';

// Sem přijde validace konfigurace (analogicky k `old/mcp_gsheet/src/utils/google-auth.ts`)
// validateRuntime();

// CLI argumenty (ilustrační) – použijeme modul podobný chrome `src/cli.ts`:
// import { args } from './cli.js'; // args.rdpHost, args.rdpPort, args.firefoxPath, args.headless, args.autoLaunch

// Import nástrojů
import * as tools from './tools/index.js';

// Mapování názvu -> handler (stejný pattern jako v GSheet)
const toolHandlers = new Map<string, (input: any) => Promise<any>>([
  ['list_pages', tools.handleListPages],
  ['new_page', tools.handleNewPage],
  ['navigate_page', tools.handleNavigatePage],
  ['select_page', tools.handleSelectPage],
  ['take_screenshot', tools.handleTakeScreenshot],
  ['evaluate_script', tools.handleEvaluateScript],
  ['list_console_messages', tools.handleListConsoleMessages],
  // ...
]);

const allTools = [
  tools.listPagesTool,
  tools.newPageTool,
  tools.navigatePageTool,
  tools.selectPageTool,
  tools.takeScreenshotTool,
  tools.evaluateScriptTool,
  tools.listConsoleMessagesTool,
];

async function main() {
  const server = new Server(
    { name: 'firefox_devtools', version: '0.0.0' },
    { capabilities: { resources: {}, tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: allTools }));

  server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
    const { name, arguments: args } = request.params;
    const handler = toolHandlers.get(name);
    if (!handler) throw new Error(`Unknown tool: ${name}`);
    return await handler(args);
  });

  server.setRequestHandler(ListResourcesRequestSchema, async () => ({ resources: [] }));
  server.setRequestHandler(ReadResourceRequestSchema, async () => { throw new Error('Resource reading not implemented'); });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Firefox DevTools MCP server running on stdio');
}

main().catch(err => { console.error('Fatal error:', err); process.exit(1); });
```

Reference

- `old/mcp_gsheet/src/index.ts`
- `old/mcp_dev_tool_chrome/src/main.ts` (paralelní registrace nástrojů)
- `old/mcp_dev_tool_chrome/src/cli.ts` (styl parsování CLI voleb)

Akceptační kritéria

- `npx @modelcontextprotocol/inspector node dist/index.js` nabídne Tools seznam (po dočasné registraci několika MVP nástrojů – viz další tasky).
