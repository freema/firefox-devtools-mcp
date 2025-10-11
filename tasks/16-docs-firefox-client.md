% 16 – Dokumentace: Vlastní Firefox klient (EN)

Cíl: Přidat dokument do `docs/` popisující vlastní RDP klient (a volitelně BiDi), architekturu, závislosti a rozdíl oproti Playwright/Puppeteer. Dokument je v angličtině.

Proč: Uživatelé i přispěvatelé potřebují jasně pochopit, že server používá nativní RDP bez dalších binárek a jak funguje auto‑launch a připojení.

Úkoly
- Vytvořit `docs/firefox-client.md` se strukturou:
  - Purpose and goals (Firefox‑only, no extra browser downloads)
  - Protocols overview (RDP TCP framing, BiDi WS)
  - Client architecture (transport, request/response, actors, high‑level API)
  - Auto‑launch and profiles (prefs, `user.js`, ephemeral profiles)
  - Ports (RDP vs BiDi) and configuration (CLI/ENV)
  - Parity with `old/mcp_dev_tool_chrome` (naming, tools) a odkazy na `old/` soubory
  - Limitations and roadmap (console/network completeness, screenshots)

Akceptační kritéria
- Soubor `docs/firefox-client.md` existuje a je srozumitelný pro čtenáře „zvenku“
- Odkazuje na existující soubory v `old/` a na relevantní části `src/`
- Po dokončení aktualizovat `tasks/README.md` a zapsat CR (`tasks/CR-16.md`)

Poznámky
- Dokument v angličtině; ostatní tasky a CR zůstávají v češtině.

