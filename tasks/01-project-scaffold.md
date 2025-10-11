Title: 01 – Projektový scaffold (TypeScript, build, lint, test)

Cíl

- Připravit základní Node/TypeScript projekt podle vzoru `old/mcp_gsheet`.

Kroky

- `package.json` (inspirace: `old/mcp_gsheet/package.json`):
  - Scripts: `dev`, `build`, `start`, `setup`, `clean`, `typecheck`, `lint`, `lint:fix`, `format`, `format:check`, `check`, `inspector`, `inspector:dev`, `test`, `test:*`
  - `main: dist/index.js`, `type: module`, `bin` dle potřeby (až při publikaci)
  - Závislosti: `@modelcontextprotocol/sdk`, `zod` (RDP backend přijde v dalších krocích)
  - Dev závislosti: `typescript`, `tsup`, `tsx`, `eslint`, `prettier`, `vitest`, atd.
  - Engines: Node `>=18` (vývoj na Node 22; podporovat 18 a 20)

- `.gitignore` – převzít a rozšířit podle `old/mcp_gsheet/.gitignore` (ignore: `dist/`, `node_modules/`, `coverage/`, `*.log`, `.env`, dočasné soubory, artefakty Dockeru, atd.).
- `tsconfig.json`, `tsup.config.ts`, `vitest.config.ts`, ESLint/Prettier (převzít styl z GSheet):
  - Viz `old/mcp_gsheet/tsconfig.json`
  - Viz `old/mcp_gsheet/tsup.config.ts`
  - Viz `old/mcp_gsheet/vitest.config.ts`
  - Viz `old/mcp_gsheet/.eslintrc.json`, `.prettierrc.json`, `.prettierignore`, `.eslintrc` skripty v `package.json`
  - Zrcadlit `npm run check` = `typecheck` + `lint` + `format:check`

Ukázkový snippet `package.json` (ilustrační)

```json
{
  "name": "firefox-devtools-mcp",
  "version": "0.0.0",
  "description": "MCP server for Firefox DevTools",
  "type": "module",
  "main": "dist/index.js",
  "engines": { "node": ">=18.0.0" },
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsup",
    "start": "node dist/index.js",
    "setup": "node scripts/setup-mcp-config.js",
    "clean": "rm -rf dist",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src --ext .ts",
    "lint:fix": "eslint src --ext .ts --fix",
    "format": "prettier --write \"src/**/*.ts\"",
    "format:check": "prettier --check \"src/**/*.ts\"",
    "check": "npm run lint:fix && npm run typecheck",
    "inspector": "npx @modelcontextprotocol/inspector node dist/index.js",
    "inspector:dev": "NODE_ENV=development npx @modelcontextprotocol/inspector npx tsx src/index.ts",
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest watch"
  }
}
```

Node verze a guard (ilustrační)

```ts
// index.ts (příklad měkké validace)
import { version } from 'node:process';
const [major, minor] = version.substring(1).split('.').map(Number);
if (major < 18) {
  console.error(`Node ${process.version} is not supported. Please use >=18.`);
  process.exit(1);
}
// vývoj primárně testován na Node 22; podporujeme 18 a 20
```

Reference

- `old/mcp_gsheet/package.json`
- `old/mcp_gsheet/tsconfig.json`
- `old/mcp_gsheet/tsup.config.ts`
- `old/mcp_gsheet/vitest.config.ts`
- `old/mcp_gsheet/.eslintrc.json`, `.prettierrc.json`, `.prettierignore`, `.gitignore`

Akceptační kritéria

- Nainstalovatelné závislosti, funkční build `npm run build` a `npm run dev`.
- ESLint/Prettier konfigurace převzaté z `old/mcp_gsheet`. `npm run check` spouští `lint:fix` + `typecheck`.
- Aktualizovaná `.gitignore` s potřebnými ignorovanými cestami.
- Scripts obsahují `inspector` a `inspector:dev` jako v GSheet projektu.
