---
name: Firefox DevTools MCP
version: 0.5.3
description: MCP server for Firefox browser automation via WebDriver BiDi
keywords: [firefox, browser, automation, mcp, webdriver-bidi, testing, scraping]
ai-compatible: [claude-code, cursor, cline, windsurf]
repository: https://github.com/freema/firefox-devtools-mcp
---

# Firefox DevTools MCP Skill

MCP server pro automatizaci Firefox prohlížeče pomocí WebDriver BiDi protokolu.

## Kdy použít tento skill

Tento skill je relevantní když uživatel chce:

- **Automatizovat prohlížeč** - navigace, klikání, vyplňování formulářů
- **Testovat webové stránky** - end-to-end testy, vizuální regrese
- **Scrapovat obsah** - extrakce dat z webových stránek
- **Debugovat** - sledování konzole, network requestů
- **Pořizovat screenshoty** - celé stránky nebo specifických elementů

## Spuštění

```bash
# Nejjednodušší způsob - vždy nejnovější verze
npx firefox-devtools-mcp@latest

# S headless módem (bez GUI)
npx firefox-devtools-mcp@latest --headless

# Na specifickém portu
npx firefox-devtools-mcp@latest --port 9222
```

## Dostupné nástroje (18)

### Správa stránek

| Nástroj | Popis |
|---------|-------|
| `list_pages` | Seznam všech otevřených stránek/tabů |
| `new_page` | Otevře novou prázdnou stránku |
| `navigate_page` | Naviguje na URL (volitelně `pageId`) |
| `select_page` | Vybere stránku jako aktivní |
| `close_page` | Zavře stránku |

### DOM Snapshots (UID systém)

| Nástroj | Popis |
|---------|-------|
| `take_snapshot` | Vytvoří snapshot DOM, přiřadí UID elementům |
| `resolve_uid_to_selector` | Převede UID na CSS selektor |
| `clear_snapshot` | Vymaže snapshot cache |

**Důležité:** Vždy nejprve zavolej `take_snapshot` před interakcí s elementy. UID (např. `e42`) jsou stabilní reference na DOM elementy.

### Interakce s elementy

| Nástroj | Popis |
|---------|-------|
| `click_by_uid` | Klikne na element podle UID |
| `hover_by_uid` | Nastaví hover na element |
| `fill_by_uid` | Vyplní text do inputu/textarea |
| `fill_form_by_uid` | Vyplní více polí formuláře najednou |
| `drag_by_uid_to_uid` | Přetáhne element na jiný element |
| `upload_file_by_uid` | Nahraje soubor do file inputu |

### Screenshoty

| Nástroj | Popis |
|---------|-------|
| `screenshot_page` | Screenshot celé stránky |
| `screenshot_by_uid` | Screenshot konkrétního elementu |

### Konzole a Network

| Nástroj | Popis |
|---------|-------|
| `list_console_messages` | Vypíše zprávy z konzole (log, error, warn) |
| `clear_console_messages` | Vymaže cache konzole |
| `list_network_requests` | Seznam HTTP requestů |
| `get_network_request` | Detail konkrétního requestu |

### Utility

| Nástroj | Popis |
|---------|-------|
| `accept_dialog` | Potvrdí dialog (alert, confirm, prompt) |
| `dismiss_dialog` | Zamítne dialog |
| `navigate_history` | Navigace zpět/vpřed v historii |
| `set_viewport_size` | Nastaví velikost viewportu |

## Typický workflow

### 1. Navigace a snapshot

```
1. navigate_page url="https://example.com"
2. take_snapshot
   → Vrátí text reprezentaci DOM s UID pro každý interaktivní element
```

### 2. Interakce s elementy

```
3. click_by_uid uid="e15"     # Kliknutí na tlačítko
4. fill_by_uid uid="e23" text="hello@example.com"
5. take_snapshot              # Nový snapshot po změně DOM
```

### 3. Formuláře

```
fill_form_by_uid fields=[
  {"uid": "e10", "value": "John Doe"},
  {"uid": "e11", "value": "john@example.com"},
  {"uid": "e12", "value": "secret123"}
]
```

### 4. Debugging

```
list_console_messages level="error"
list_network_requests status="failed"
```

## Příklady použití

### E2E test přihlášení

```
1. navigate_page url="https://app.example.com/login"
2. take_snapshot
3. fill_by_uid uid="e5" text="user@example.com"
4. fill_by_uid uid="e6" text="password123"
5. click_by_uid uid="e8"  # Submit button
6. take_snapshot
7. screenshot_page        # Dokumentace výsledku
```

### Scraping produktů

```
1. navigate_page url="https://shop.example.com/products"
2. take_snapshot
   → Parsuj výstup pro extrakci dat z elementů
3. click_by_uid uid="e42"  # Next page
4. take_snapshot
   → Opakuj pro další stránky
```

### Monitoring konzole

```
1. navigate_page url="https://buggy-app.example.com"
2. list_console_messages level="error"
   → Analyzuj JavaScript chyby
3. list_network_requests status="failed"
   → Zkontroluj selhané requesty
```

## Omezení

- **Firefox only** - nepodporuje Chrome/Safari
- **WebDriver BiDi** - vyžaduje Firefox 120+
- **evaluate_script** - momentálně vypnuto z bezpečnostních důvodů
- **Headless mód** - některé testy mohou vyžadovat viditelný prohlížeč

## Řešení problémů

### Firefox se nespustí

```bash
# Zkontroluj že Firefox je nainstalovaný
firefox --version

# Zkus s explicitní cestou
npx firefox-devtools-mcp@latest --firefox-path /usr/bin/firefox
```

### Element nenalezen

1. Vždy zavolej `take_snapshot` před interakcí
2. UID se mění po změnách DOM - vždy refreshni snapshot
3. Počkej na načtení stránky před snapshotem

### Timeout chyby

```bash
# Zvyš timeout pro pomalé stránky
npx firefox-devtools-mcp@latest --timeout 60000
```

## Viz také

- [GitHub Repository](https://github.com/freema/firefox-devtools-mcp)
- [MCP Protocol](https://modelcontextprotocol.io/)
- [WebDriver BiDi Spec](https://w3c.github.io/webdriver-bidi/)
