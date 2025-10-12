# 22 – Screenshot API ve vrstvě klienta (page/element)

Cíl

- Přidat klientské API pro screenshot celé stránky i elementu (UID). MCP nástroj vznikne později.

Rozsah (jen klient)

- Metody: `takeScreenshotPage(): Promise<string>` (base64 PNG), `takeScreenshotByUid(uid): Promise<string>`
- Element: najít via UID resolver, `scrollIntoView`, ořez volitelně (MVP může vrátit celostránkový snímek + metadata bbox)

Akceptační kritéria

- `takeScreenshotPage()` vrací platný PNG (base64)
- `takeScreenshotByUid()` vrací PNG (minimálně celostránkový) a poskytuje bbox info (pokud neřežeme)
- Testováno v `scripts/test-bidi-devtools.js`

Poznámky k implementaci

- Ořez lze řešit offline (`sharp`) – volitelně; MVP může vrátit celostránkový snímek + bbox info
- `optimizeForSpeed` není v Selenium API – zaměřit se na rychlé PNG

Reference

- `old/mcp_dev_tool_chrome/src/tools/screenshot.ts`
- `tasks/17-bidi-coverage-vs-chrome-tools.md`
