Title: 07 – Tools: Debug a screenshoty (MVP)

Cíl

- Přidat schopnost vizuální inspekce a základní textový snapshot.

Tools

- `take_screenshot` – formáty `png|jpeg|webp`, `fullPage` (inspirováno `old/mcp_dev_tool_chrome/src/tools/screenshot.ts`)
- `take_snapshot` – textový snapshot (RDP: DOM walker/inspekce; formát se může lišit od Chrome)

Snippet (ilustrační – screenshot)

```ts
// src/tools/screenshot.ts (ilustrace)
import z from 'zod';

export const takeScreenshotTool = {
  name: 'take_screenshot',
  description: 'Take a screenshot of the page.',
  inputSchema: {
    format: z.enum(['png','jpeg','webp']).default('png'),
    fullPage: z.boolean().optional(),
    filePath: z.string().optional(),
  }
};

export async function handleTakeScreenshot(args: { format?: string; fullPage?: boolean; filePath?: string }) {
  // const page = context.getSelectedPage();
  // const buf = await devtools.screenshot({ type: args.format, fullPage: args.fullPage });
  // uložení/attachment jako v Chrome MCP (viz McpResponse), GSheet styl response helperů
}
```

Reference

- `old/mcp_dev_tool_chrome/src/tools/screenshot.ts`
- `old/mcp_dev_tool_chrome/src/McpResponse.ts` (formátování odpovědi s attachments)

Akceptační kritéria

- `take_screenshot` vrací obrázek (attachment nebo uložení do souboru).
- `take_snapshot` vrátí textový snapshot obsahu (alespoň základní strom elementů).
