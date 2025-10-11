Title: 11 – Balíčkování, metadata, `server.json`, publikace

Cíl

- Připravit metadata MCP serveru a publikační proces (minimálně lokální). CI/Release: publikace na npm pomocí GitLabu.

Kroky

- `server.json` – struktura podobná Chrome projektu:

```json
{
  "$schema": "https://static.modelcontextprotocol.io/schemas/2025-09-29/server.schema.json",
  "name": "io.github.yourname/firefox-devtools-mcp",
  "description": "MCP server for Firefox DevTools",
  "version": "0.0.0",
  "packages": [
    {
      "registryType": "npm",
      "registryBaseUrl": "https://registry.npmjs.org",
      "identifier": "firefox-devtools-mcp",
      "version": "0.0.0",
      "transport": { "type": "stdio" },
      "environmentVariables": []
    }
  ]
}
```

- `prepublishOnly`: build (viz `old/mcp_gsheet/package.json`).
- GitLab CI: pipeline pro verzování a `npm publish` (chráněné tagy, NPM_TOKEN v CI variables).
  - Sem lze přenést i „release-please“ proces nebo semver konvenci changelogů.

Reference

- `old/mcp_dev_tool_chrome/server.json`
- `old/mcp_gsheet/package.json` (prepublishOnly)
 - GitLab CI publikační vzor (doplnit v repo CI, mimo scope kódu)

Akceptační kritéria

- Lokální instalace funguje: `npm pack` + lokální test v MCP klientovi.
- `server.json` validní dle schématu a vyplněný.
- GitLab pipeline dokáže z tagu publikovat na npm (suchý běh nebo reálné publikování).
