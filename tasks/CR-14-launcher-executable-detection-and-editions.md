# Code Review – 14 Launcher: Detekce binárky a podpora edic

Datum: 2025-10-11

## Co bylo provedeno

### 1. Utilita pro kontrolu spustitelnosti
- Vytvořil jsem nový modul `src/utils/fs.ts`
- Funkce `isExecutable()` - async kontrola executable práv přes `fs.access(path, X_OK)`
- Funkce `fileExists()` - sync kontrola existence souboru

**Důvod:**
- Rozlišení mezi "soubor neexistuje" a "soubor existuje ale není spustitelný"
- Async přístup pro lepší error handling

**Dotčené soubory:**
- `src/utils/fs.ts` (nový soubor, 28 řádků)

### 2. getExecutableCandidates() - robustní detekce
- Podpora edic: `stable`, `developer`, `nightly`
- Auto-detect priorita: developer → stable → nightly (pokud není specifikována edice)

**Linux/Unix PATH scanning:**
```typescript
if (['linux', 'freebsd', 'sunos'].includes(platform)) {
  const paths = process.env.PATH.split(':');
  // Pro developer:
  return paths.map(dir => path.join(dir, 'firefox-developer-edition'))
    + paths.map(dir => path.join(dir, 'firefox-developer'));
}
```

**macOS Developer Edition - oba tvary:**
- `/Applications/Firefox Developer Edition.app/Contents/MacOS/firefox` (s mezerou)
- `/Applications/FirefoxDeveloperEdition.app/Contents/MacOS/firefox` (bez mezery)

**Windows - rozšířené cesty:**
- `C:\Program Files\Mozilla Firefox\firefox.exe`
- `C:\Program Files (x86)\Mozilla Firefox\firefox.exe`
- Developer Edition i Nightly varianty

**Dotčené soubory:**
- `src/firefox/launcher.ts` - funkce `getExecutableCandidates()` (řádky 21-92)

### 3. findFirefoxExecutable() - inteligentní hledání
- Podpora stringových edic: `--firefox-path developer` najde Developer Edition
- Validace existence a spustitelnosti
- Rozlišení error states:
  - Edition string → vyhledá kandidáty pro edici
  - Absolutní cesta + executable → použije přímo
  - Absolutní cesta + exists ale NOT executable → error s návodem (check permissions)
  - Absolutní cesta + neexistuje → error s návodem
  - Auto-detect → prohledá všechny edice

**Error messages - akční a srozumitelné:**
```typescript
throw new Error(
  `Firefox executable found at ${path} but is not executable. ` +
  `Please check file permissions or specify a different path with --firefox-path`
);
```

**Dotčené soubory:**
- `src/firefox/launcher.ts` - funkce `findFirefoxExecutable()` (řádky 97-142)

### 4. Refaktoring launch() metody
- Nahradil `detectFirefoxPath()` za `await findFirefoxExecutable()`
- Odstranil manuální `existsSync()` check (už je v `findFirefoxExecutable`)
- Lepší error handling s try-catch a `logError()`

**Dotčené soubory:**
- `src/firefox/launcher.ts` - metoda `launch()` (řádky 189-199)

### 5. Import rename: path → nodePath
- Přejmenoval import `path` na `nodePath` kvůli konfliktu s lokální proměnnou
- Konzistence v celém souboru

**Dotčené soubory:**
- `src/firefox/launcher.ts` - import (řádek 8), použití v `createEphemeralProfileWithPrefs()` (řádky 325, 327)

## Rozhodnutí a dopady

### Proč priorita developer → stable → nightly?
- Developer Edition má DevTools vždycky enabled (lepší pro debugging)
- Stable je nejčastější instalace
- Nightly je nestabilní (nejnižší priorita)

### Proč PATH scanning na Linuxu?
- Statické cesty (`/usr/bin/firefox`) nestačí
- Snap, Flatpak, Homebrew instalují do různých adresářů
- PATH scanning pokryje všechny běžné instalace

### Proč async `isExecutable()`?
- `fs.access()` je async API (správný Node.js pattern)
- Umožňuje lepší error handling
- Konzistence s moderním async/await kódem

### Známá omezení
- Neskenujeme nestandardní instalační adresáře mimo PATH
- Na Windows nerozeznáváme různé architektury (x64 vs x86) explicitně - spoléháme se na pořadí

## Reference

**Z old/debug_firefox_vscode:**
- `src/adapter/configuration.ts:267-289` - `findFirefoxExecutable()`
- `src/adapter/configuration.ts:291-361` - `getExecutableCandidates()`
- `src/adapter/util/fs.ts` - `isExecutable()` utilita

**Aktuální implementace:**
- `src/firefox/launcher.ts` - hlavní změny
- `src/utils/fs.ts` - nová utilita

## Další kroky

- Task 15: BiDi port a screenshot (volitelné)
- Možné vylepšení: cache výsledku detekce (performance)
- Možné vylepšení: podpora custom search paths
