**28 – Snapshot bundling integration & de‑dup**

Cíl

- Odstranit duplicitní implementace snapshotu a přepnout `SnapshotManager` z inline stringu na bundlovaný injected balíček z `src/firefox/snapshot/injected/*`. Zjednodušit `manager.ts` (vyčlenit resolver/cache/executor).

Důvod

- V repu jsou dvě verze injektované logiky: plně modularizovaná v `src/firefox/snapshot/injected/*` a současně „inline“ concat string v `SnapshotManager.buildInlineScript()`. To je zmatečné a náročné na údržbu.

Rozsah

- Přidat jednoduchý bundle krok (esbuild/tsup/rollup) pro `src/firefox/snapshot/injected/snapshot.injected.ts` → výstup jako ESM funkce `createSnapshot()` nebo IIFE dostupné jako `window.__createSnapshot`.
- `SnapshotManager` upravit tak, aby:
  - načetl bundlovaný payload (např. lazy read `dist/snapshot.injected.bundle.js` při startu) a injektoval ho do stránky (1× per session) – bez velkého inline stringu,
  - volal přes `executeScript('return window.__createSnapshot(arguments[0])', snapshotId)`;
  - vyčlenit část pro UID resolver/cache do samostatného souboru (např. `src/firefox/snapshot/resolver.ts`), aby `manager.ts` zůstal štíhlý a přehledný.
- Doplnit ochranu pro případ chybějícího bundlu (jasná chyba s instrukcí „spusť build“).

Akceptační kritéria

- `src/firefox/snapshot/manager.ts` již neobsahuje dlouhý inline JS; používá bundlovaný injected modul.
- `src/firefox/snapshot/injected/*` je jediný zdroj pravdy pro logiku collectoru (treeWalker, selectors, attributes, …).
- `scripts/test-bidi-devtools.js` „Snapshot tests“ prochází beze změny.

Poznámky k implementaci

- Pro začátek lze použít `tsup` (již v projektu) s `format: ['iife']`, `globalName: '__SnapshotInjected'`, export `createSnapshot`. Při loadu injekce zaregistrovat `window.__createSnapshot = __SnapshotInjected.createSnapshot`.
- Při produkčním buildu uložit bundle do `dist/` a načítat ho v `SnapshotManager` (vyhneme se runtime závislosti na Node bundleru).

Dotčené soubory

- src/firefox/snapshot/manager.ts
- src/firefox/snapshot/injected/* (zdroj)
- tsup.config.ts (rozšířit bundling konfiguraci)
- scripts/test-bidi-devtools.js (bez změny)

