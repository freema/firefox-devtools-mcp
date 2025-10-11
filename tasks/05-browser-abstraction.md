Title: 05 – Vrstva prohlížeče (RDP klient / DevTools wrapper)

Cíl

- Jednotná vrstva pro správu Firefox instance přes RDP, výběr stránky (tabu), zachytávání konzole a sítě. Analogické k `old/mcp_dev_tool_chrome/src/McpContext.ts`, ale implementace pro Firefox RDP backend.

Kroky

- Definovat moduly:
  - `src/firefox/rdp-client.ts` – low‑level RDP WebSocket/TCP, actor-based komunikace, subscription na eventy
  - `src/firefox/devtools.ts` – high‑level API (navigate, evaluate, screenshot, logs, network)
  - `src/McpContext.ts` – bridge využívající `devtools.ts` a poskytující utilitní rozhraní toolům (zrcadlí Chrome přístup)
  - Dočasné úložiště souborů (pro velké screenshoty) – viz Chrome `saveTemporaryFile`

- Základní logger a response helpery (GSheet styl):
  - `src/utils/logger.ts`
  - `src/utils/response-helpers.ts` (formátování textové odpovědi)

Ukázka rozhraní (ilustrační)

```ts
export interface BrowserContextApi {
  getPages(): any[];
  getSelectedPageIdx(): number;
  setSelectedPageIdx(idx: number): void;
  getSelectedPage(): any;
  newPage(url?: string): Promise<any>;
  screenshot(options: { fullPage?: boolean; format?: 'png'|'jpeg'|'webp' }): Promise<Buffer>;
  evaluate<T>(fn: string, args?: unknown[]): Promise<T>;
  getConsoleMessages(): { type: string; text: string }[];
  getNetworkRequests(): { url: string; status?: number; method?: string }[];
}
```

Reference

- `old/mcp_dev_tool_chrome/src/McpContext.ts`
- `old/mcp_dev_tool_chrome/src/WaitForHelper.ts`
- `old/mcp_dev_tool_chrome/src/PageCollector.ts`
- `old/mcp_dev_tool_chrome/src/McpResponse.ts`

Akceptační kritéria

- Jednoduchý wrapper umožní: vytvořit/vrátit stránku, navigovat, vybrat stránku, udělat screenshot, vypsat konzoli.
- Interní API jasně oddělí browser backend od tool handlerů.

Startup Flow (ASCII)

```
Start MCP server
  └─ read CLI/ENV (rdp-host/port, firefox-path, headless, auto-launch)
      └─ connect to RDP (host:port)?
          ├─ yes → use existing Firefox instance
          └─ no  → auto-launch enabled?
                 ├─ yes → spawn Firefox (RDP on host:port) → connect
                 └─ no  → return instruction: "Please start Firefox with RDP or enable auto-launch"
```
