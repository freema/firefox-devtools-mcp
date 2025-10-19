# Code Review – PAGES: Odstranit refresh_pages (duplicitní s list_pages)

Datum: 2025-10-19

## Co bylo provedeno

Odstranění redundantního nástroje `refresh_pages`, který byl duplikátem `list_pages`:

- **Odstranění tool definition** (src/tools/pages.ts:21-31):
  - Odstraněna definice `refreshPagesTool`
  - Aktualizován popis `listPagesTool` - nyní explicitně uvádí, že vždy automaticky refreshuje
- **Odstranění handleru** (src/tools/pages.ts:151-164):
  - Odstraněn `handleRefreshPages` handler
  - Zachován `handleListPages` (který již volal `refreshTabs()`)
- **Odstranění exportů** (src/tools/index.ts:6-17):
  - Odstraněny exporty: `refreshPagesTool`, `handleRefreshPages`
- **Odstranění registrací** (src/index.ts):
  - Odstraněn handler mapping z `toolHandlers` Map (řádek 83)
  - Odstraněna tool definition z `allTools` array (řádek 127)

## Rozhodnutí a dopady

### Analýza redundance

**handleListPages** (zachován):
```typescript
await firefox.refreshTabs();
const tabs = firefox.getTabs();
const selectedIdx = firefox.getSelectedTabIdx();
return formatPageList(tabs, selectedIdx);
```

**handleRefreshPages** (odstraněn):
```typescript
await firefox.refreshTabs();
const tabs = firefox.getTabs();
const selectedIdx = firefox.getSelectedTabIdx();
return '🔄 Page list refreshed.\n\n' + formatPageList(tabs, selectedIdx);
```

**Rozdíl**: Pouze prefix "🔄 Page list refreshed" - funkčně identické.

### API zjednodušení

**Před:**
```
1. navigate_page (URL)
2. refresh_pages       ← redundantní krok
3. list_pages
```

**Po:**
```
1. navigate_page (URL)
2. list_pages          ← automaticky refreshuje
```

Snížení kroků z 3 na 2, čistší API.

### Aktualizace dokumentace

`listPagesTool.description` nyní jasně uvádí:
> "Shows page index, title, URL, and indicates which page is currently selected. **This always returns the current state (automatically refreshes the page list).**"

Agenti mají jasno, že nepotřebují samostatný refresh.

### Breaking change
- **API break**: Klienty používající `refresh_pages` přestanou fungovat
- **Justifikace**: 100% duplicita s `list_pages`, žádná ztráta funkcionality
- **Migrace**: Nahradit `refresh_pages` za `list_pages` (1:1 replacement)

## Reference

### Dotčené soubory
- `src/tools/pages.ts` - odstranění tool definition a handleru
- `src/tools/index.ts` - odstranění exportů
- `src/index.ts` - odstranění registrací

### Související změny
- Doporučení z tools-analysis.md (řádky 31-34)
- Konzistence se zjednodušením API (podobně jako NETWORK-03 - always-on monitoring)

## Další kroky

- Dokumentovat breaking change v CHANGELOG
- Aktualizovat README/příklady, pokud používají `refresh_pages`
- Zvážit podobné simplifikace u ostatních tools (odstranit redundance)
- Monitorovat feedback od uživatelů na zjednodušené API

