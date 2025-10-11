Title: 12 – Dokumentace: README, Tool reference, Troubleshooting

Cíl

- Připravit kvalitní dokumentaci inspirovanou `old/mcp_gsheet/README.md` a `old/mcp_dev_tool_chrome/README.md` + `docs/tool-reference.md`.

Kroky

- `README.md` obsah:
  - Badges (volitelné), přehled, požadavky
  - Konfigurace MCP klientů (Claude Desktop, Cursor, atd.) – ukázky JSON
  - Quick Start: první prompt (např. „Otevři stránku a udělej screenshot“)
  - Přehled dostupných nástrojů (MVP) s krátkým popisem
  - Troubleshooting (sandboxy, headless, cesty k binárkám)
  - Průběžné změny – udržovat aktualizované při každém dokončeném tasku (doplnit nové nástroje, nové CLI volby, známá omezení)

- `docs/tool-reference.md` (volitelně auto-generované později):
  - Struktura a styl jako `old/mcp_dev_tool_chrome/docs/tool-reference.md`
  - Po každém dokončeném tasku aktualizovat sekce pro přidané/změněné nástroje

Reference

- `old/mcp_gsheet/README.md`
- `old/mcp_dev_tool_chrome/README.md`
- `old/mcp_dev_tool_chrome/docs/tool-reference.md`

Akceptační kritéria

- README vede uživatele od instalace k prvnímu úspěšnému běhu a k Inspectoru.
- Tool reference existuje alespoň pro MVP nástroje.
 - Dokumentace je průběžně aktualizována s každým uzavřeným taskem.
