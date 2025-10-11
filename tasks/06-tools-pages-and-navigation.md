Title: 06 – Tools: Navigace a správa stránek (MVP)

Cíl

- Implementovat základní navigační nástroje s paritou názvů dle Chrome MCP (`old/mcp_dev_tool_chrome/src/tools/pages.ts`).

Tools (MVP)

- `launch_firefox` (NOVÉ dle rozhodnutí):
  - popis: spustí Firefox s RDP, pokud neběží; pokud běží, pouze se připojí
  - vstup: `{ headless?: boolean, rdpHost?: string, rdpPort?: number, firefoxPath?: string, autoLaunch?: boolean }`
  - výstup: potvrzení a aktuální RDP endpoint; informace o běžícím/nově spuštěném procesu

- `list_pages`
- `select_page`
- `new_page`
- `navigate_page`
- `navigate_page_history` (pokud Playwright backend poskytne „back/forward“ analogii)
- `close_page`

API (Zod schémata – ilustrační)

```ts
// src/tools/pages.ts (ilustrace)
import z from 'zod';

export const listPagesTool = {
  name: 'list_pages',
  description: 'Get a list of pages open in the browser.',
  inputSchema: {},
};
export async function handleListPages(_: any) { /* ... */ }

export const selectPageTool = {
  name: 'select_page',
  inputSchema: { pageIdx: z.number() },
  description: 'Select a page as a context for future tool calls.',
};
export async function handleSelectPage(args: { pageIdx: number }) { /* ... */ }

export const newPageTool = {
  name: 'new_page',
  inputSchema: { url: z.string(), timeout: z.number().optional() },
  description: 'Creates a new page and navigates to URL.',
};
export async function handleNewPage(args: { url: string, timeout?: number }) { /* ... */ }

export const navigatePageTool = {
  name: 'navigate_page',
  inputSchema: { url: z.string(), timeout: z.number().optional() },
  description: 'Navigates the selected page to a URL.',
};
export async function handleNavigatePage(args: { url: string, timeout?: number }) { /* ... */ }

// launch_firefox (ilustrační signatura)
export const launchFirefoxTool = {
  name: 'launch_firefox',
  inputSchema: {
    rdpHost: z.string().optional(),
    rdpPort: z.number().optional(),
    firefoxPath: z.string().optional(),
    headless: z.boolean().optional(),
    autoLaunch: z.boolean().optional()
  },
  description: 'Ensure Firefox is available via RDP: connect if running, else launch (if allowed).'
};
export async function handleLaunchFirefox(args: { rdpHost?: string; rdpPort?: number; firefoxPath?: string; headless?: boolean; autoLaunch?: boolean }) {
  // 1) try connect rdpHost:rdpPort
  // 2) if fails and autoLaunch !== false → spawn firefox using firefoxPath/headless
  // 3) connect and return endpoint + status
}
```

Reference

- `old/mcp_dev_tool_chrome/src/tools/pages.ts`
 - `old/mcp_dev_tool_chrome/src/main.ts` – vzor guard/registrace

Akceptační kritéria

- `list_pages` vrací popis otevřených stránek a zvýrazní vybranou.
- `new_page` + `navigate_page` spolehlivě načítají URL a čekají na dokončení (rozumný default timeout).
