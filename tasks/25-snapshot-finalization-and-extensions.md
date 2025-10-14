# 25 – Snapshot: Finalization and Extensions

Cíl

- Dovést snapshot do „konečného“ stavu pro BiDi: bez DOM mutací, s robustním resolverem, ARIA obohacením, (same‑origin) iframe podporou, a lepší strukturou kódu. Zachovat LLM‑friendly textový výstup a přiblížit se UX Chrome MCP.

Rozsah

- Klient (`src/firefox/*`) – SnapshotManager + injected skript refactor, UID resolver, iframe podpora, ARIA obohacení, cache, staleness.
- MCP vrstva (`src/tools/*`) – nástroje přestanou řešit UID „ručně“, budou používat klientského resolvera; přidat „take_snapshot“ tool + formátování.
- Testy/skripty – rozšíření `scripts/test-bidi-devtools.js` o snapshot scénáře.

Požadavky a návrh řešení

1) Bez DOM mutací (drop `data-mcp-uid`)
- Generovat selektory v injected skriptu a vracet `uidMap` bez úprav DOM.
- Preferovat robustní CSS cestu; přidat XPath fallback.
- Struktura `uidMap`: `[ { uid, css: string, xpath?: string } ]`.

2) Staleness a centrální resolver
- `snapshotId` (prefix v UID) udržovat v `SnapshotManager` a vracet v `takeSnapshot()`.
- Invalidovat UIDs po navigaci (`clearSnapshot()` voláno již v `FirefoxClient.navigate`).
- `resolveUidToSelector(uid)` – validuje, že UID odpovídá aktuálnímu `snapshotId`, jinak chyba „stale snapshot“.
- Přidat `resolveUidToElement(uid): Promise<WebElement>` – použije CSS, na chybu fallback na XPath.
- Nástroje (např. `evaluate_script`) přejdou z inline `querySelector` na klientského resolvera.

3) Iframe podpora (hybridní)
- Same‑origin: injected skript rekurzivně projde `iframe.contentDocument.body` a sloučí strom (označit uzly `isIframe`, `frameSrc`).
- Cross‑origin: volitelné v další iteraci – webdriver frame‑switch per rámec (pomalé), vracet jen placeholder v hlavním stromu s metadaty `src` a `crossOrigin: true`.

4) ARIA obohacení a computed vlastnosti
- Rozšířit uzly o: `aria.disabled/expanded/selected/checked/pressed/haspopup/invalid/autocomplete`, `level`, `label/labelledby/describedby/controls` atp.
- `computed`: `focusable`, `interactive`, `visible`, `accessible` (odvozené z atributů + computed style).
- Zachovat `tag/name/role/text/href/src/value` jako dnes.

5) Formátování výstupu (Chrome‑like)
- Nadále LLM‑friendly text: řádek `uid role "name" [attrs...]` a ponechat `tag` pro debug.
- Omezit délku textů a počty uzlů (limit/hloubka/časový budget) konfigurovatelně.

6) Cache elementů s invalidací
- `uid -> { selector, element?, snapshotId, ts }` v `SnapshotManager`.
- Při použití zkusit cached WebElement a validovat (např. `isDisplayed()`), při `StaleElementReference` re‑find.
- `clear()` při navigaci.

7) Struktura kódu (refactor + bundle)
- Nová struktura:
  - `src/firefox/snapshot/`
    - `collectors/elementCollector.ts` (isRelevant)
    - `collectors/attributeCollector.ts` (name/text/ariaComputed)
    - `collectors/treeWalker.ts` (rekurze + iframy)
    - `injected/snapshot.injected.ts` (entry pro browser)
    - `injected/build.config.ts` (esbuild/rollup konfigurace pro bundle do stringu)
    - `manager.ts` (SnapshotManager orchestrace, resolver, cache)
- Build‑time: generovat JS bundle (minifikovaný) a injectovat ho jako funkci `(snapshotId) => { ... }` do `executeScript`.

8) MCP integrace
- `take_snapshot` tool: nastaví response includeSnapshot, zavolá `client.takeSnapshot()`, renderuje text formatterem (server‑side), připojí JSON do hidden metadata (volitelně).
- `evaluate_script` a další nástroje, které berou `uid`, musí použít `resolveUidToElement`.

Akceptační kritéria

- `takeSnapshot()` vrací text + JSON se `snapshotId`, stromem a `uidMap` (bez DOM mutace).
- `resolveUidToSelector/Element` detekují stale UID a vrací chybu s jasnou instrukcí „Take a fresh snapshot“.
- Same‑origin iframy jsou zahrnuty v textu; cross‑origin mají placeholder uzel s `src` a `crossOrigin: true`.
- ARIA a computed atributy se propisují do textového formátu a JSON.
- `scripts/test-bidi-devtools.js` obsahuje: snapshot→akce by UID, stale‑UID test, same‑origin iframe smoke.
- Kód snapshotu rozdělen dle nové struktury a injected bundle se buildí (CI skript/Taskfile doplněn).

Milníky (doporučené PR)

1) Staleness + resolver + bez DOM mutací (CSS+XPath) + úprava `evaluate_script`.
2) Same‑origin iframy v injected skriptu + text formatter update.
3) ARIA a computed atributy v collector/formatteru.
4) Cache WebElementů a invalidace.
5) Refactor do modulů + bundler (esbuild/rollup) + CI/Taskfile kroky.
6) MCP `take_snapshot` tool + testy + dokumentace.

Rizika a mitigace

- Selektory křehké na dynamické DOM změny → fallback XPath + možnost fingerprintu (volitelně, mimo scope P1).
- Iframe SOP limity → placeholder pro cross‑origin; případné frame‑switch přidat za feature‑flag.
- Build injected kódu → jednoduchý esbuild config a snapshot testy v CI.

Reference

- `tasks/20-snapshot-and-uid-mapping.md`, `tasks/CR-20-snapshot-and-uid-mapping.md`, `tasks/CR-20-snapshot-vs-chrome.md`
- Chrome MCP: `old/mcp_dev_tool_chrome/src/McpContext.ts`, `old/mcp_dev_tool_chrome/src/formatters/snapshotFormatter.ts`, `old/mcp_dev_tool_chrome/src/tools/snapshot.ts`

---

Rozšířená specifikace

Terminologie

- „Snapshot“: strom relevantních DOM uzlů s metadaty (LLM‑friendly text + JSON + `uidMap`).
- „UID“: identifikátor `{snapshotId}_{counter}`, platný pouze pro aktuální snapshot/navigaci.
- „Resolver“: klientská logika, která převádí UID → CSS/XPath → WebElement a vynucuje staleness.

Veřejné API (klient)

```ts
// src/firefox/index.ts (facade)
class FirefoxClient {
  async takeSnapshot(): Promise<Snapshot>; // { text, json: {root, snapshotId, timestamp}, uidMap? }
  resolveUidToSelector(uid: string): string; // throws stale UID
  async resolveUidToElement(uid: string): Promise<WebElement>; // CSS → XPath fallback
  clearSnapshot(): void; // on navigate
}

// src/firefox/snapshot/manager.ts
export interface UidEntry { uid: string; css: string; xpath?: string }
export interface SnapshotNodeJson { /* viz níže */ }
export interface SnapshotJson { root: SnapshotNodeJson; snapshotId: number; timestamp: number }
export interface Snapshot { text: string; json: SnapshotJson }

class SnapshotManager {
  async takeSnapshot(): Promise<Snapshot>;
  resolveUidToSelector(uid: string): string; // stale check
  async resolveUidToElement(uid: string): Promise<WebElement>;
  clear(): void;
}
```

Injected bundle – entry a moduly

- `injected/snapshot.injected.ts` exportuje čistou funkci `createSnapshot(snapshotId: number): { tree: Node; uidMap: UidEntry[] }`.
- Sestavit do jediného bundle (minifikované IIFE), který lze vložit do `executeScript` jako `return (function(){...})(arguments[0])`.
- Moduly:
  - `collectors/elementCollector.ts` – `isRelevant(el)`, filtry (visibility/interactive/semantic), limity.
  - `collectors/attributeCollector.ts` – `name`, `text`, `href/src/value`, `aria*`, `computed*`.
  - `collectors/treeWalker.ts` – rekurze (depth limit), iframe handling (same‑origin), uid přidělování, `uidMap` build.

Generování selektorů (spec)

1) CSS (primární)
- Preferuj stabilní identifikátory v pořadí: `id`, `[data-testid]`, `[data-test-id]`, `[aria-label]` + `[role]`, jinak kombinace tag + `:nth-of-type()`.
- Přidávej prefix rodičů, dokud nedosáhneš rootu anebo unikátnosti v `document`.
- Normalizace: tag lower‑case, escapování uvozovek, omezit délku na N znaků na segment (např. 64).
- Ověření unikátnosti: `document.querySelectorAll(selector).length === 1` (akceptovat i >1, ale preferovat kratší cestu; unikátnost není tvrdá podmínka, resolver v případě vícero nalezených elementů validuje vlastnostmi – volitelně).

2) XPath (fallback)
- Syntéza `//*[@id="..."]` pokud existuje; jinak absolutní cesta `/html/body/.../tag[index]`.
- Index je pořadí sourozenců stejného tagu (1‑based).

Staleness – semantika a chování

- `snapshotId` se inkrementuje na každé `takeSnapshot()` a je zahrnut v každém UID i `json.snapshotId`.
- Resolver parsuje `uid.split('_')[0]` a porovná s posledním `snapshotId`.
- Pokud nesouhlasí: vyhodí `Error("This uid is from a stale snapshot. Take a fresh snapshot.")`.
- Navigace (`FirefoxClient.navigate`) volá `clearSnapshot()`.

Iframe – semantika

- Same‑origin iframy: rekurzivně projít `iframe.contentDocument.body`; poduzel označit `isIframe: true`, `frameSrc`, volitelně `frameName`/`title`.
- Cross‑origin: vložit placeholder uzel `{ tag: 'iframe', src, crossOrigin: true }` a nepokračovat do vnitřku.
- V text výstupu anotovat `[iframe src="..."]`.

Struktura uzlu (JSON)

```ts
interface SnapshotNode {
  uid: string;
  tag: string;
  role?: string;
  name?: string;
  value?: string;
  href?: string;
  src?: string;
  text?: string;
  isIframe?: boolean;
  frameSrc?: string;
  crossOrigin?: boolean;
  aria?: {
    disabled?: boolean;
    hidden?: boolean;
    selected?: boolean;
    checked?: boolean | 'mixed';
    pressed?: boolean | 'mixed';
    expanded?: boolean;
    autocomplete?: string;
    haspopup?: boolean | string;
    invalid?: boolean | string;
    label?: string;
    labelledby?: string;
    describedby?: string;
    controls?: string;
    level?: number;
  };
  computed?: {
    focusable?: boolean;
    interactive?: boolean;
    visible?: boolean;
    accessible?: boolean;
  };
  children: SnapshotNode[];
}
```

Formatter (text)

- Řádek: `uid role "name" tag [attrs...]` (role může být `tag` pokud role chybí; `name` v uvozovkách; atributy ve formátu `key="value"` bez dlouhých hodnot, krácení na 50–80 znaků).
- Výběr atributů: `href/src/value/text` (krátit), ARIA a computed booleany jako přítomné flagy (`disabled`, `expanded`, `focusable`), `checked="true|false|mixed"` apod.
- Iframe: přidat `[iframe src="..."]` marker.
- Limity: max hloubka (např. 10), max uzlů (např. 1000), max čas (např. 200ms); konfig. viz níže.

Limity a konfigurace

- Defaulty (lze změnit přes env/konst):
  - `SNAPSHOT_MAX_DEPTH=10`
  - `SNAPSHOT_MAX_NODES=1000`
  - `SNAPSHOT_TIME_BUDGET_MS=200`
  - `SNAPSHOT_INCLUDE_IFRAMES_SAME_ORIGIN=true`
  - `SNAPSHOT_GENERATE_XPATH=true`
  - `SNAPSHOT_PREFER_ID_ATTRIBUTES=["id","data-testid","data-test-id"]`
- Při překročení limitů doplnit do rootu JSON `truncated: true` a do textu poznámku.

Chyby a diagnostika

- Stale UID: „This uid is from a stale snapshot. Take a fresh snapshot.“
- UID neexistuje: „UID not found. Take a fresh snapshot.“
- Cross‑origin iframe: nechyba, ale placeholder + poznámka v textu.
- Injected script error: vrátit `{error: string}` a zabalit do `Error("Failed to generate snapshot: ...")`.

Bezpečnost a soukromí

- Bez DOM mutací – žádné `setAttribute` na stránce.
- Nezachytávat citlivé hodnoty (např. hesla): `value` generovat jen pro `type!="password"`.
- Krátit textové obsahy, neukládat velké blob texty.

MCP integrace – detaily

- `take_snapshot` tool:
  - handler pouze zapne `response.setIncludeSnapshot(true)` a nechá odpověď vytisknout snapshot (volá `client.takeSnapshot()` a formátuje text; JSON lze přiložit do oddělené sekce nebo jako hidden metadata – volitelné).
  - Tool reference doplnit v docs.
- `evaluate_script` a ostatní UID‑nástroje:
  - místo in‑page `querySelector` používat `client.resolveUidToElement()`.
  - Pokud je snapshot stale/neexistuje, vrátit instrukci „Take a fresh snapshot“.

Test plán

1) Unit (injected)
- `isRelevant()` filtr (pokrýt typické tagy; skryté elementy; aria‑label/role)
- CSS/XPath generátor (id, data‑testid, :nth-of-type)
- ARIA/computed extrakce (true/false/mixed; visibility/focusable)

2) Integration (client)
- `takeSnapshot()` → `resolveUidToSelector/Element()` → akce (click)
- Navigace → stale UID detekce
- Same‑origin iframe → uzly existují, placeholder pro cross‑origin

3) Scripts (manual)
- `scripts/test-bidi-devtools.js` rozšířit o: snapshot → klik na UID, stale UID test, simple iframe data: URL (same‑origin)

Rollout a migrace

- Fáze 1: přepnout nástroje na klientského resolvera (back‑compat s injektovanými UIDs není nutná).
- Fáze 2: nasadit bez DOM mutace (UIDy pouze v klientské mapě / `uidMap`).
- Fáze 3: zapnout iframy, ARIA/computed, cache.
- Fáze 4: refactor do modulů + bundler.

Mimo scope

- Element fingerprinting a heuristiky vícezdrojového vyhledání – možné doplnit později.
- Cross‑origin iframy s automatickým frame‑switch – volitelně další task.

Checklist (DoD)

- [ ] Bez DOM mutací (CSS+XPath v `uidMap`)
- [ ] Staleness enforcement v resolveru + tooly používají resolver
- [ ] Same‑origin iframe snapshot
- [ ] ARIA + computed atributy v JSON i textu
- [ ] Cache elementů a invalidace po navigaci
- [ ] Limity/konfigurace a diagnostika
- [ ] Rozšířené testy + `scripts/test-bidi-devtools.js` scénáře
- [ ] Dokumentace (tool reference + README poznámka o snapshotu)
