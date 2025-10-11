# Code Review – 16 Dokumentace: Vlastní Firefox klient (EN)

Datum: 2025-10-11

## Co bylo provedeno

### Vytvořena kompletní technická dokumentace

Vytvořil jsem dokument `docs/firefox-client.md` v angličtině popisující celou architekturu Firefox DevTools klienta.

**Struktura dokumentu:**

1. **Purpose and Goals**
   - Vysvětlení proč vlastní RDP klient
   - Žádné extra browser downloads
   - Direct protocol access
   - Minimal dependencies

2. **Protocols Overview**
   - RDP (TCP, length-prefixed JSON, port 6000)
   - WebDriver BiDi (WebSocket, JSON-RPC, port 9223)
   - Příklady packetů pro oba protokoly

3. **Client Architecture**
   - Transport Layer (RDP transport, BiDi transport)
   - Protocol Layer (RDP client, BiDi client)
   - High-Level API (FirefoxDevTools, McpContext)
   - Vysvětlení actor-based model

4. **Auto-Launch and Profiles**
   - 4-step auto-launch proces
   - Required Firefox preferences
   - Ephemeral profile pattern
   - `user.js` generování

5. **Ports and Configuration**
   - Tabulka s rozdíly RDP vs BiDi
   - CLI argumenty a ENV variables
   - Příklady usage

6. **Parity with Chrome DevTools MCP**
   - Tabulka tool equivalence
   - Reference na `old/` soubory
   - Označení limitací (⚠️)

7. **Limitations and Roadmap**
   - Network monitoring limitace
   - Performance metrics limitace
   - Screenshot limitace
   - Console limitace
   - Feature roadmap

8. **Development and Testing**
   - Running tests
   - Debug logging
   - Troubleshooting guide

9. **Contributing**
   - Guidelines pro extension
   - Best practices

10. **Resources**
    - Odkazy na Firefox docs
    - WebDriver BiDi spec
    - MCP docs

**Dotčené soubory:**
- `docs/firefox-client.md` - nový/přepsaný dokument (336 řádků)

## Rozhodnutí a dopady

### Proč angličtina?
- Technická dokumentace pro open-source projekt
- Mezinárodní audience (MCP komunita)
- Reference dokumentace jsou v angličtině
- CR a task záznamy zůstávají v češtině (interní)

### Úroveň detailu
- **High-level přehled** - srozumitelný pro nové čtenáře
- **Technické detaily** - dostatečné pro přispěvatele
- **Code references** - konkrétní odkazy na soubory
- **Příklady** - packet formáty, CLI usage, troubleshooting

### Pokrytí témat

**Zdůrazněno:**
- Rozdíl RDP vs BiDi (2 porty, 2 protokoly)
- Auto-launch mechanismus (critical feature)
- Parity s Chrome MCP (naming, tools)
- Limitations (realistická očekávání)

**Odkazy na existující kód:**
- `old/debug_firefox_vscode/` - RDP patterns
- `old/mcp_dev_tool_chrome/` - Tool naming
- `old/mcp_gsheet/` - Project structure
- `src/` - konkrétní implementace

### Známá omezení dokumentace

- Neobsahuje tutorial (pouze technical reference)
- API reference je high-level (ne complete method signatures)
- Roadmap je orientační (ne guaranteed features)

## Reference

**Existující dokumentace (rozšířena):**
- Původní `docs/firefox-client.md` byla velmi stručná (69 řádků)
- Nový dokument je kompletní (336 řádků)
- Zachována struktura z task definice

**Externí zdroje citované:**
- Firefox Remote Debugging Protocol docs
- WebDriver BiDi Specification
- Firefox Remote Agent docs
- Model Context Protocol

**Interní reference:**
- `src/firefox/transport.ts` - RDP transport
- `src/firefox/rdp-client.ts` - Protocol client
- `src/firefox/bidi-client.ts` - BiDi client
- `src/firefox/devtools.ts` - High-level API
- `src/firefox/launcher.ts` - Auto-launch
- `src/config/constants.ts` - Preferences

## Další kroky

### Navazující dokumentace
- Task 12: README, Tool reference, Troubleshooting (general docs)
- Možná přidat: Quick start guide
- Možná přidat: Architecture diagrams

### Údržba dokumentace
- Aktualizovat při změnách v API
- Rozšířit při přidání nových features
- Doplnit examples při common use-cases

### Testování
- Dokument je srozumitelný (čitelnost)
- Všechny odkazy fungují (file paths)
- Příklady jsou aktuální (code examples)

## Poznámky

Dokument je psaný pro:
- **New contributors** - pochopit architekturu
- **Users** - pochopit configuraci a troubleshooting
- **Maintainers** - reference na design decisions

Style guide:
- Markdown s code blocks
- Tables pro strukturovaná data
- Bullets pro lists
- Bold pro důležité termíny
- Code references s backticks
