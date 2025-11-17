# Claude Code Plugin Configuration

This directory contains the Claude Code plugin configuration for Firefox DevTools MCP.

## Files

- **plugin.json** - Plugin metadata (name, description, version, author, etc.)
- **.mcp.json** - MCP server configuration (how to launch the server)
- **marketplace.json.example** - Example marketplace configuration for distribution

## Installation Methods

### Method 1: Direct GitHub Installation

Users can install directly from GitHub:

```bash
/plugin install github:freema/firefox-devtools-mcp
```

### Method 2: Via Marketplace

If you want to distribute via a marketplace:

1. Create a marketplace repository (e.g., `firefox-devtools-marketplace`)
2. Copy `marketplace.json.example` to `.claude-plugin/marketplace.json` in that repo
3. Users can then install with:

```bash
/plugin marketplace add freema/firefox-devtools-marketplace
/plugin install firefox-devtools-mcp@firefox-devtools-marketplace
```

### Method 3: Submit to Existing Marketplace

Submit a PR to existing marketplaces like:
- [obra/superpowers-marketplace](https://github.com/obra/superpowers-marketplace)

Add this entry to their `marketplace.json`:

```json
{
  "name": "firefox-devtools-mcp",
  "source": {
    "source": "github",
    "url": "https://github.com/freema/firefox-devtools-mcp"
  },
  "description": "Firefox browser automation via WebDriver BiDi - control Firefox, take snapshots, interact with elements, monitor network requests, and capture screenshots",
  "version": "0.3.0",
  "strict": true
}
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
