# Firefox DevTools Plugin for Claude Code

Automate Firefox browser via WebDriver BiDi. Navigate pages, fill forms, click elements, take screenshots, and monitor console/network activity.

## Installation

```bash
claude plugin install firefox-devtools
```

## What's Included

- **MCP Server** - Connects Claude Code to Firefox automation
- **Skills** - Auto-triggers for browser automation, testing, and scraping tasks

## Usage

The plugin works automatically when you ask about browser tasks:

- "Navigate to example.com and take a screenshot"
- "Fill out the login form and submit"  
- "Check for JavaScript errors on this page"
- "Scrape all product prices from this page"

## Key Workflow

1. `take_snapshot` - Creates DOM snapshot with UIDs (e.g., `e42`)
2. Interact using UIDs - `click_by_uid`, `fill_by_uid`, etc.
3. Re-snapshot after DOM changes

## Requirements

- Firefox 120+
- Node.js 20.19.0+

## Links

- [Repository](https://github.com/freema/firefox-devtools-mcp)
- [npm](https://www.npmjs.com/package/firefox-devtools-mcp)
