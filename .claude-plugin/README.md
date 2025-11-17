# Claude Code Plugin Configuration

This directory contains the Claude Code plugin configuration for Firefox DevTools MCP.

## Files

- **plugin.json** - Plugin metadata (name, description, version, author, etc.)
- **.mcp.json** - MCP server configuration (how to launch the server)

## Installation

Users can install directly from GitHub:

```bash
/plugin install github:freema/firefox-devtools-mcp
```

## MCP Server Configuration

The `.mcp.json` file configures the MCP server to run with:
- NPX for easy installation (`npx firefox-devtools-mcp@latest`)
- Headless mode by default
- 1280x720 viewport
- Start URL set to `about:home`

Users can customize these settings after installation by modifying their Claude Code MCP settings.

## Publishing

When you publish to npm, the `.claude-plugin` directory is automatically included (configured in `package.json` files array).
