# Code Review – 20 Snapshot + UID Mapping

Datum: 2025-10-12

## Co bylo provedeno

Implementovali jsme snapshot + UID mapping ve vrstvě Firefox klienta. Snapshot umožňuje zachytit strukturu DOM, přiřadit každému elementu unikátní UID a později tyto elementy najít pomocí CSS selektorů.

### Dotčené soubory

1. **src/firefox/snapshot.ts** (nový)
   - `SnapshotManager` class pro správu snapshotů
   - In-page DOM walker injektovaný jako JavaScript
   - UID generování ve formátu `{snapshotId}_{counter}`
   - Export snapshotu jako text (LLM-friendly) a JSON
   - Metody: `takeSnapshot()`, `resolveUidToSelector()`, `clear()`

2. **src/firefox/index.ts** (aktualizován)
   - Integrace `SnapshotManager` do `FirefoxClient` facade
   - Public metody: `takeSnapshot()`, `resolveUidToSelector()`, `clearSnapshot()`
   - Export typu `Snapshot`
   - `navigate()` nyní čistí snapshot (stejně jako console)

3. **scripts/test-snapshot.js** (nový)
   - Komplexní test snapshot funkcionality
   - Testuje: vytvoření snapshotu, UID resolution, clearing při navigaci
   - Ukládá snapshoty do `temp/snapshot-*.txt` pro debug

4. **.gitignore** (aktualizován)
   - Přidán `temp/` pro test snapshoty

## Rozhodnutí a dopady

### 1. JavaScript Injection přes executeScript

**Rozhodnutí:** Injektovat DOM walker jako JavaScript string, ne function

```typescript
const result = await this.driver.executeScript<{...}>(
  `
  const snapshotId = arguments[0];
  function walkTree(el, depth) { ... }
  const tree = walkTree(document.body, 0);
  return { tree, uidMap };
  `,
  snapshotId
);
```

**Důvod:**
- TypeScript type checking v executeScript function způsobuje problémy
- ESLint nested function declarations jsou problematické
- String je jednodušší a funguje spolehlivě
- Vanilla JS syntax (žádné TypeScript typy)

### 2. Filtrace Relevantních Elementů

**Rozhodnutí:** Filtrujeme elementy podle několika kritérií:

```javascript
function isRelevant(el) {
  // Vždy zahrnout:
  - Interactive elementy: a, button, input, select, textarea, img, video, audio, iframe
  - Elementy s role attribute
  - Elementy s aria-label
  - Headings: h1-h6
  - Semantic elementy: nav, main, section, article, header, footer
  - Container elementy (div, span, p, li, ul, ol) s textem < 500 znaků
  - Container elementy s id nebo class
}
```

**Důvod:**
- Kompaktnost - nechceme zachytit tisíce elementů
- LLM-friendly - jen důležité interaktivní a strukturální elementy
- Example.com: 6 elementů, Mozilla.org: 345 elementů (optimální)

### 3. Root Elements (body/html) Vždy Zahrnuty

**Rozhodnutí:** `body` a `html` jsou vždy zahrnuty, i když nejsou "relevantní"

```javascript
const tag = el.tagName.toLowerCase();
const isRoot = tag === 'body' || tag === 'html';
if (!isRoot && !isRelevant(el)) {
  return null;
}
```

**Důvod:**
- Snapshot musí mít root element
- Fix pro initial problém kdy `walkTree(document.body, 0)` vracel `null`

### 4. UID Formát: `{snapshotId}_{counter}`

**Rozhodnutí:** UIDs jsou ve formátu `1_0`, `1_1`, `2_0`, etc.

**Důvod:**
- Snapshot ID prefix umožňuje detekovat stale snapshoty
- Čítač zajišťuje unikátnost v rámci snapshotu
- Jednoduchý pattern pro debugging

### 5. UID → Selector Mapping

**Rozhodnutí:** UIDs jsou injektovány jako `data-mcp-uid` atributy

```javascript
el.setAttribute('data-mcp-uid', uid);
const selector = '[data-mcp-uid="' + uid + '"]';
```

**Důvod:**
- CSS selector je přímý a rychlý
- `data-*` atributy jsou standardní a neovlivňují rendering
- Persistence v DOM po snapshot (dokud není refresh)

### 6. Snapshot Text Format

**Rozhodnutí:** Indentovaný text format s klíčovými atributy

```
uid=1_0 body
  uid=1_1 div
    uid=1_2 h1 name="Example Domain" text="Example Domain"
    uid=1_3 p text="..."
      uid=1_4 a href="..." text="Learn more"
```

**Důvod:**
- LLM-friendly - snadné parsování
- Hierarchie je viditelná přes indentaci
- Kompaktní - jen důležité atributy (uid, tag, name, text, href, src, role, value)

### 7. Navigate() Čistí Snapshot

**Rozhodnutí:** `navigate()` volá `clearSnapshot()`

**Důvod:**
- Snapshot je specifický pro aktuální stránku
- Po navigaci jsou staré UIDs neplatné
- Prevence použití stale UIDs

## Technické poznámky

- **executeScript return value:** TypeScript types jsou hinted, ale runtime je plain JavaScript object
- **Error handling:** try-catch v injected JS kódu vrací `{ tree: null, error: string }`
- **Debug logging:** `logDebug()` pro troubleshooting snapshot generování
- **Test snapshoty:** Ukládány do `temp/` pro manuální inspekci

## Validace

- ✅ `task check` prošel (ESLint + TypeScript)
- ✅ `task build` prošel
- ✅ Test snapshot úspěšný:
  - Example.com: 6 elementů zachyceno
  - Mozilla.org: 345 elementů zachyceno
  - UID resolution funguje (element nalezen)
  - Snapshot clearing funguje (staré UIDs neplatné)
  - Interaktivní element detekce funguje (link nalezen)

## Reference

- Task specifikace: `tasks/20-snapshot-and-uid-mapping.md`
- Chrome reference: `old/mcp_dev_tool_chrome/src/formatters/snapshotFormatter.ts`
- Test script: `scripts/test-snapshot.js`
- Test outputs: `temp/snapshot-example.txt`, `temp/snapshot-mozilla.txt`

## Další kroky

- [x] Task 20 kompletní
- [ ] Task 21: Input tools (click/hover/fill by UID) - využijí `resolveUidToSelector()`
- [ ] Task 22: Screenshot tool
- [ ] Task 23: Page utilities
- [ ] MCP tool: `take_snapshot` - integrovat do MCP serveru

## Lessons Learned

1. **executeScript string > function** - String syntax je jednodušší pro komplexní JS kód
2. **Vanilla JS je nutný** - TypeScript syntax v executeScript nefunguje
3. **Filtrace je kritická** - Bez filtrace by Mozilla.org měla tisíce elementů
4. **Root element fix** - `body` musí být vždy zahrnut, i když není "relevantní"
5. **Debug snapshoty jsou užitečné** - Ukládání do `temp/` pomáhá při troubleshootingu
6. **data-* atributy fungují skvěle** - Standard, persistentní, neinvazivní
