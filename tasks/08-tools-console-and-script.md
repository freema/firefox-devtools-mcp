Title: 08 – Tools: Console a evaluate

Cíl

- Umožnit vyhodnocení JS v kontextu stránky a načtení konzolových zpráv.

Tools

- `evaluate_script` – obdobné jako v Chrome: předání funkce jako string + `args` (viz `old/mcp_dev_tool_chrome/docs/tool-reference.md` → Debugging)
- `list_console_messages` – vrátit od poslední navigace/zadání, typ a text (zdroj: RDP console API)

Snippet (ilustrační – evaluate)

```ts
// src/tools/script.ts (ilustrace)
import z from 'zod';

export const evaluateScriptTool = {
  name: 'evaluate_script',
  description: 'Evaluate a JavaScript function inside the selected page.',
  inputSchema: {
    function: z.string().describe('JS function as string'),
    args: z.array(z.any()).optional()
  }
};

export async function handleEvaluateScript(args: { function: string; args?: unknown[] }) {
  // const result = await devtools.evaluate({ fn: args.function, args: args.args })
  // návrat JSON-serializable výsledku
}
```

Reference

- `old/mcp_dev_tool_chrome/src/tools/script.ts`
- `old/mcp_dev_tool_chrome/docs/tool-reference.md` – `evaluate_script`, `list_console_messages`

Akceptační kritéria

- Spolehlivé vyhodnocení jednoduchých funkcí, serializovatelný výstup.
- `list_console_messages` vrací typ a text zprávy, resetuje se po navigaci.
