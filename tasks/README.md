**Firefox DevTools MCP – TODO Roadmap**

Tento adresář obsahuje rozpracované úkoly k vývoji nového MCP serveru pro Firefox DevTools. Implementace se bude držet struktury a praxe jako v `old/mcp_gsheet` a funkční parity (kde dává smysl) s `old/mcp_dev_tool_chrome`.

- Kompletní specifikace (původní návrh) byla přesunuta do: `tasks/99-specification.md`

Stav práce budeme řídit přes checklist níže. Každý bod odkazuje na samostatný úkol s detaily, akceptačními kritérii, referencemi a ukázkovými snippetami (ilustrační, ne finální kód).

Roadmapa

- [x] 00 – Výzkum a architektura: přístup k Firefoxu, parity s Chrome, struktura projektu (`tasks/00-architecture-research.md`)
- [x] 01 – Projektový scaffold (TypeScript, tsup, eslint, prettier, vitest, scripts) (`tasks/01-project-scaffold.md`)
- [x] 02 – Struktura `src/` a skelet MCP serveru (`tasks/02-structure-and-boilerplate.md`)
- [x] 03 – Konfigurace, `.env`, setup skript pro MCP klienty, Inspector (`tasks/03-config-env-and-scripts.md`)
- [x] 04 – Taskfile.yaml a Dockerfile pro lokální testování a Inspector (`tasks/04-taskfile-and-dockerfile.md`)
- [x] 05 – Vrstva prohlížeče (McpContext/browser wrapper) (`tasks/05-browser-abstraction.md`)
- [x] 06 – Tools: Navigace a správa stránek (MVP) (`tasks/06-tools-pages-and-navigation.md`)
- [x] 07 – Tools: Debug a screenshoty (MVP) (`tasks/07-tools-debug-and-screenshot.md`)
- [x] 08 – Tools: Console a evaluate (MVP) (`tasks/08-tools-console-and-script.md`)
- [x] 09 – Tools: Síť a výkon (iterace, omezení Firefoxu) (`tasks/09-tools-network-and-performance.md`)
- [x] 10 – Testování (unit/integration) a Inspector workflow (`tasks/10-testing-and-inspector.md`)
- [x] 11 – Balíčkování, metadata, `server.json`, publikace (`tasks/11-ci-and-packaging.md`)
- [x] 12 – Dokumentace: README, Tool reference, Troubleshooting (`tasks/12-docs-and-readme.md`)
 - [x] 13 – Launcher: RDP přepínače a readiness (`tasks/13-launcher-rdp-flags-and-readiness.md`)
 - [x] 14 – Launcher: Detekce binárky + edice (`tasks/14-launcher-executable-detection-and-editions.md`)
 - [x] 15 – BiDi port a screenshot (volitelné) (`tasks/15-bidi-port-and-screenshot.md`)
- [x] 16 – Docs: Vlastní Firefox klient (EN) (`tasks/16-docs-firefox-client.md`)
- [x] 17 – BiDi coverage vs. Chrome tools (`tasks/17-bidi-coverage-vs-chrome-tools.md`)
- [x] 18 – Refaktor architektury `src/firefox/` (modularizace) (`tasks/18-firefox-client-architecture-refactor.md`)
- [x] 19 – Network backend (BiDi events) (`tasks/19-network-backend-bidi-events.md`)
- [x] 20 – Snapshot + UID mapping (`tasks/20-snapshot-and-uid-mapping.md`)
- [x] 21 – Input tools (click/hover/fill/drag/upload) (`tasks/21-input-tools-bidi.md`)
- [x] 22 – Screenshot tool (page/element) (`tasks/22-screenshot-tool.md`)
- [x] 23 – Page utilities (history/resize/dialog) (`tasks/23-page-utilities-history-resize-dialog.md`)
- [x] 24 – Remove legacy RDP options & wording (`tasks/24-remove-legacy-rdp.md`)
- [x] 25 – Snapshot: Finalization and Extensions (`tasks/25-snapshot-finalization-and-extensions.md`)
- [x] 26 – Firefox modules cleanup & lifecycle hooks (`tasks/26-firefox-modules-cleanup-and-lifecycle.md`)
- [x] 27 – Offline test harness & scripts refactor (`tasks/27-offline-test-harness-and-scripts-refactor.md`)
- [x] 28 – Snapshot bundling integration & de‑dup (`tasks/28-snapshot-bundling-integration-and-dedup.md`)
 - [ ] 29 – MCP tools: Snapshot integration (`tasks/29-mcp-tools-snapshot-integration.md`)
 - [ ] 30 – MCP tools: Input akce podle UID (`tasks/30-mcp-tools-input-uid-actions.md`)
 - [ ] 31 – MCP tools: Screenshot a Utility akce stránky (`tasks/31-mcp-tools-screenshot-and-page-utilities.md`)
 - [ ] 32 – MCP tools: Refaktor evaluate_script (`tasks/32-mcp-tools-evaluate-refactor.md`)
 - [ ] 33 – MCP tools: Síťové nástroje – filtry + čištění (`tasks/33-mcp-tools-network-refactor.md`)
 - [ ] 34 – MCP tools: Console + Pages drobný refaktor (`tasks/34-mcp-tools-console-and-pages-refactor.md`)

Poznámky

- V ukázkových snippetech odkazujeme na existující implementace v `old/`. Nepíšeme finální kód, snippety slouží jen k ilustraci a jako „most“ k hotovým souborům.
- Struktura, tooling a skripty se mají co nejvíce držet `old/mcp_gsheet`.
- Při definici tools zachovávejme názvy a semantics z `old/mcp_dev_tool_chrome`, kde to dává smysl (lepší přenositelnost promptů). Pokud Firefox neumí 1:1 funkci, uvést odchylky v tasku.

Proces a kontrola kvality

- Úkoly plň postupně dle pořadí (00 → 12). Nepřeskakovat, pokud to není výslovně domluveno.
- Po dokončení každého úkolu spusť `task check`.
  - `task check` provede automatický ESLint fix a TypeScript typecheck (formát a přesnou skladbu úloh držíme v Taskfile podle vzoru `old/mcp_gsheet`).
- Po každém úkolu ulož záznam pro code review do souboru `tasks/CR-<ID>.md`.
  - Příklad: `tasks/CR-06.md` nebo `tasks/CR-06-tools-pages-and-navigation.md`.
  - Doporučená osnova CR záznamu:

```md
# Code Review – <ID> <název úkolu>

Datum: YYYY-MM-DD

Co bylo provedeno
- Krátký souhrn změn a důvodů
- Dotčené části (soubory/oblast)

Rozhodnutí a dopady
- Důležitá rozhodnutí (např. naming, chování CLI, defaulty)
- Známá omezení nebo technické dluhy

Reference
- Odkazy do `old/mcp_gsheet` a `old/mcp_dev_tool_chrome` (konkrétní soubory)

Další kroky
- Navazující task/y nebo testy
```

- Rozšiřuj `.gitignore` podle potřeby (např. `dist/`, `node_modules/`, `coverage/`, `*.log`, `.env`, dočasné soubory, artefakty Dockeru, atd.). Vycházej ze vzoru v `old/mcp_gsheet/.gitignore`.
- Po každém dokončeném úkolu aktualizuj dokumentaci (README, případně `docs/*`, tool reference, poznámky k konfiguraci a omezením). Uveď změny i do CR záznamu.
