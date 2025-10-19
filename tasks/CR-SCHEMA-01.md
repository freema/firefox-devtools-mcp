# Code Review – SCHEMA-01: Sjednotit inputSchema na čisté JSON Schema

Datum: 2025-10-19

## Co bylo provedeno

Sjednocení všech `inputSchema` definic v MCP tools na čisté JSON Schema pro kompatibilitu s MCP klienty:

- **Audit všech tools** (src/tools/*.ts):
  - Zkontrolovány všechny tool soubory: pages, console, network, performance, snapshot, input, screenshot, utilities
  - Identifikován jediný problém: performance.ts používal Zod objekty v inputSchema
- **Oprava performance.ts** (src/tools/performance.ts:23-41):
  - Odstraněn import Zod (řádek 6)
  - Přepsáno `categories` parametr z Zod na čisté JSON Schema:
    ```typescript
    // Před:
    categories: z.array(z.string()).optional().describe('...')

    // Po:
    categories: {
      type: 'array',
      items: { type: 'string' },
      description: '...'
    }
    ```

## Rozhodnutí a dopady

### MCP kompatibilita
- **Problém**: Zod objekty (`z.number()`, `z.string()`) nejsou JSON-serializovatelné
- **Dopad**: MCP klienti neviděli správné schémata parametrů v `ListTools`
- **Řešení**: Všechny inputSchema nyní používají čisté JSON Schema objekty

### Konzistence napříč tools
**Před:**
- Většina tools měla již čisté JSON Schema (pages, console, snapshot, input, screenshot, utilities)
- Network tools opraveny v NETWORK-01
- Performance tools obsahovaly poslední Zod usage

**Po:**
- 100% konzistence - všechny tools mají čisté JSON Schema
- Žádné Zod objekty v inputSchema (Zod se může stále používat pro runtime validaci, ale ne v definicích)

### Validace vs. Schéma
- **Design**: Oddělení runtime validace (může používat Zod) od MCP schema (čisté JSON)
- **Budoucnost**: Pokud se bude používat Zod pro validaci, generovat JSON Schema pomocí `zod-to-json-schema`

## Reference

### Dotčené soubory
- `src/tools/performance.ts` - odstranění Zod importu a konverze inputSchema
- Ověřeno: všechny ostatní tools již měly čisté JSON Schema

### Související změny
- NETWORK-01: network.ts již byl opraven na čisté JSON Schema
- PERFORMANCE-01: performance tools byly následně odstraněny (ale schema bylo opraveno jako součást SCHEMA-01)

## Další kroky

- Zachovat konzistenci při přidávání nových tools (vždy čisté JSON Schema)
- Zvážit vytvoření helper funkce pro validaci inputu (pokud bude potřeba runtime validace mimo MCP schema)
- Dokumentovat best practice pro tool definitions v contributing guide

