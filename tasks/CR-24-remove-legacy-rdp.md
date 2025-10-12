# Code Review – 24 Remove legacy RDP options & wording

Datum: 2025-10-12

## Co bylo provedeno

- Odstraněny všechny odkazy na RDP (Remote Debugging Protocol) z kódu
- Projekt nyní používá výhradně WebDriver BiDi terminologii
- Čištění CLI argumentů, typů, konstant a user-facing textů

### Dotčené soubory

1. **src/firefox/types.ts**
   - Odstraněny `rdpHost` a `rdpPort` z `FirefoxLaunchOptions`

2. **src/index.ts**
   - Změněna hlavička z "Remote Debugging Protocol" → "WebDriver BiDi"
   - Odstraněny RDP parametry z `FirefoxLaunchOptions` (řádky 62-63)
   - Odstraněn RDP logging (řádky 141-142)

3. **src/cli.ts**
   - Odstraněny CLI volby: `rdpHost`, `rdpPort` (definice i příklady)
   - Odstraněn `autoLaunch` (bylo RDP-specifické)
   - Aktualizovány příklady použití CLI

4. **src/config/constants.ts**
   - Odstraněny nepoužívané RDP konstanty: `FIREFOX_ARGS`, `FIREFOX_PREFS`, `DEFAULT_FIREFOX_PORT`
   - Zachovány pouze `SERVER_NAME`, `SERVER_VERSION`, `DEFAULT_HEADLESS`

5. **src/tools/network.ts**
   - Změněn wording z "Firefox RDP" → "Current BiDi MVP" (4 místa)

6. **src/tools/performance.ts**
   - Změněn wording z "Firefox RDP" → "WebDriver BiDi" (6 míst)

7. **src/firefox/devtools.ts**
   - Odstraněn nepoužitý import `WebElement` (ESLint fix)
   - Přidán type cast pro `HTMLElement.style` (TypeScript fix)

8. **tsconfig.json**
   - Přidána `"DOM"` do `lib` pro správnou typovou podporu DOM API

## Rozhodnutí a dopady

1. **CLI breaking change**: Volby `--rdp-host` a `--rdp-port` již nejsou podporovány
   - Uživatelé by měli aktualizovat své skripty
   - Selenium automaticky spravuje port, takže tyto volby již nejsou potřeba

2. **Konzistentní terminologie**: Všude používáme "WebDriver BiDi" nebo "BiDi MVP"
   - Jasně odděluje současnou implementaci od staré RDP-based verze
   - Snižuje zmatení uživatelů

3. **Odstraněn `autoLaunch`**: Byla RDP-specifická volba
   - Selenium vždy spouští Firefox automaticky, takže tato volba nemá smysl

4. **Čištění konstant**: Odstraněny `FIREFOX_PREFS` a `FIREFOX_ARGS`
   - Tyto byly RDP-specifické a nejsou potřeba pro BiDi
   - Selenium spravuje vlastní preferencí

## Technické poznámky

- **TypeScript DOM typy**: Přidání `"DOM"` do `lib` umožňuje správnou typovou kontrolu pro `executeScript` callback kód
- **HTMLElement casting**: V `uploadFileBySelector` bylo nutné přidat `(e as HTMLElement)` pro přístup k `.style`

## Validace

- ✅ `task check` prošel (ESLint + TypeScript)
- ✅ `task build` prošel
- ✅ `node scripts/test-bidi-devtools.js` úspěšně otestoval všechny funkce
  - Console logging funguje
  - Navigation funguje
  - Performance metrics fungují
  - Tab management funguje

## Reference

- Task specifikace: `tasks/24-remove-legacy-rdp.md`
- BiDi coverage analýza: `tasks/17-bidi-coverage-vs-chrome-tools.md`
- Firefox client docs: `docs/firefox-client.md`

## Další kroky

- [x] Task 24 kompletní
- [ ] Task 18: Refaktor architektury `src/firefox/` (modularizace)
- [ ] Task 19: Network backend (BiDi events)
- [ ] Aktualizovat dokumentaci (README, docs) s novými CLI volbami
