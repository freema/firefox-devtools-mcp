# Testing Firefox DevTools MCP

Tento adresář obsahuje testovací skripty pro ověření funkcionality MCP serveru.

## Přímý test tools (`test-tools.js`)

Testovací script který **přímo volá naše funkce** bez MCP protokolu. Ověřuje základní funkčnost.

### Požadavky

**Jediné co potřebuješ:**

```bash
npm run build
```

**Firefox se spustí automaticky!** 🚀

Test script má **AUTO-LAUNCH** zabudovaný - pokud Firefox neběží s RDP, automaticky ho spustí.

### Spuštění testu

```bash
# Spustit test
npm run test:tools

# Nebo přímo
node scripts/test-tools.js
```

### Co test dělá

Test postupně ověřuje:

1. ✅ **Připojení k Firefoxu** - connect přes RDP na localhost:6000
2. ✅ **List pages** - výpis otevřených stránek
3. ✅ **New page** - vytvoření nové stránky a navigace na https://example.com
4. ✅ **Get content** - získání HTML obsahu stránky
5. ✅ **Evaluate script** - spuštění JavaScriptu (`document.title`)
6. ✅ **Navigate** - přesměrování na jinou URL (https://www.mozilla.org)
7. ✅ **Console messages** - získání console logů
8. ✅ **Screenshot** - pořízení screenshotu a uložení do souboru
9. ✅ **List pages** - finální stav stránek

### Výstup

Úspěšný test vypíše:

```
🔧 Starting Firefox DevTools MCP Tool Test...

📡 Connecting to Firefox...
✅ Connected to Firefox!

📄 Listing current pages:
Found 1 page(s)
  [0] New Tab - about:newtab

🆕 Creating new page with URL: https://example.com
✅ Created new page at index: 1

⏳ Waiting 2 seconds for page to load...
📖 Getting page content...
✅ Page content length: 1256 chars
First 200 chars: <!doctype html><html><head>...

⚡ Evaluating JavaScript: document.title
✅ Page title: Example Domain

🧭 Navigating to: https://www.mozilla.org
✅ Navigation initiated

⏳ Waiting 3 seconds for navigation...
⚡ Getting new page title...
✅ New page title: Internet for people, not profit — Mozilla

📝 Getting console messages...
✅ Found 0 console message(s)

📸 Taking screenshot...
✅ Screenshot captured: 45678 bytes

💾 Saving screenshot to: ./test-screenshot.png
✅ Screenshot saved!

📄 Final page list:
   [0] New Tab - about:newtab
👉 [1] Internet for people, not profit — Mozilla - https://www.mozilla.org/

✅ All tests passed successfully! 🎉
```

### Troubleshooting

**Chyba: "Module not found"**
- Spusť `npm run build` před testem

**Firefox se nespustil automaticky?**
- Zkontroluj že Firefox je nainstalovaný v `/Applications/Firefox.app` (macOS)
- Nebo nastav cestu: `export FIREFOX_PATH=/path/to/firefox`

**Chyba: "Screenshot failed"**
- BiDi WebSocket může vyžadovat novější Firefox (115+)
- Screenshot funkce používá WebDriver BiDi protokol

## Další testy

V budoucnu přidáme:
- Network monitoring test
- Performance metrics test
- Console logging test
- Multi-page management test
