Title: 00 – Výzkum a architektura

Cíl

- Stanovit architekturu nového MCP serveru pro Firefox DevTools s maximální shodou struktury na `old/mcp_gsheet` a s funkční paritou (kde dává smysl) na `old/mcp_dev_tool_chrome`.
- Vybrat backend pro automatizaci Firefoxu a inspekci (Playwright Firefox / Puppeteer + BiDi / WebDriver BiDi / RDP) a zmapovat limity oproti Chrome CDP.

Výstupy

- Rozhodnutí o backendu a omezeních (MVP scope vs. nice-to-have).
- Návrh adresářové struktury a build toolchainu (kopie vzoru z `old/mcp_gsheet`).
- Seznam nástrojů (tools) pro MVP a jejich mapování na Chrome nástroje z `old/mcp_dev_tool_chrome`.

Doporučený postup

- Adopce struktury jako v `old/mcp_gsheet`:
  - `src/index.ts` s MCP serverem a mapováním tool handlerů
  - `src/tools/*` – každý tool jako samostatný soubor
  - `src/utils/*` – pomocné utility (logger, validace, response-helpery)
  - `scripts/*` – setup skripty a utility pro vývoj
  - Taskfile a Dockerfile jako v GSheet projektu

- Parita s Chrome devtools MCP (kde to dává smysl):
  - Kategorie: navigace, vstupy, emulace, síť, debug, screenshot, výkon
  - Zachovat názvy a parametry nástrojů (např. `list_pages`, `new_page`, `navigate_page`, `take_screenshot`, `evaluate_script`) pro snadné přenosy promptů

Volba backendu – úvaha

- Playwright (Firefox):
  - + Jednoduchá instalace a stabilita, dostupná síť/konzole/screenshots
  - − Ne všechny DevTools performance funkce a „insights“ jako Chrome

- Puppeteer + WebDriver BiDi (Firefox):
  - + Možná bližší kódové parity s Chrome přístupem
  - − Větší komplexita, dostupnost funkcí závislá na Firefox/BiDi verzi

- Mozilla RDP (Remote Debugging Protocol):
  - + Nejblíže k DevTools, hluboká integrace
  - − Vyšší komplexita a menší ekosystém toolingů

Rozhodnutí pro MVP – Mozilla RDP

- Backend: Mozilla Remote Debugging Protocol (RDP).
  - „Firefox only“: žádné další prohlížečové binárky ani velké závislosti
  - Parita s CDP přístupem u Chrome (nativní protokol prohlížeče)
  - Cross‑platform (Windows, macOS, Linux), funguje i v CI a kontejnerech
  - Performance trace v odlišném formátu než Chrome; „insights“ budou iterací

Reference (číst a držet se vzoru)

- GSheet MCP server (struktura, tasky, docker, inspector):
  - `old/mcp_gsheet/README.md`
  - `old/mcp_gsheet/Taskfile.yaml`
  - `old/mcp_gsheet/Dockerfile`
  - `old/mcp_gsheet/package.json`
  - `old/mcp_gsheet/src/index.ts`
  - `old/mcp_gsheet/scripts/setup-mcp-config.js`

- Chrome DevTools MCP (parita tools a CLI konfigurace):
  - `old/mcp_dev_tool_chrome/README.md`
  - `old/mcp_dev_tool_chrome/docs/tool-reference.md`
  - `old/mcp_dev_tool_chrome/src/main.ts`
  - `old/mcp_dev_tool_chrome/src/cli.ts`
  - `old/mcp_dev_tool_chrome/src/tools/pages.ts`
  - `old/mcp_dev_tool_chrome/src/tools/screenshot.ts`
  - `old/mcp_dev_tool_chrome/src/tools/script.ts`
  - `old/mcp_dev_tool_chrome/src/tools/network.ts`
  - `old/mcp_dev_tool_chrome/src/McpResponse.ts`

Akceptační kritéria

- Jasné rozhodnutí pro backend (RDP) a popsané limity vs Chrome.
- Seznam MVP tools: navigace, screenshoty, evaluate, console, základní síť.
- Potvrzený seznam souborů a adresářové struktury dle `old/mcp_gsheet`.
