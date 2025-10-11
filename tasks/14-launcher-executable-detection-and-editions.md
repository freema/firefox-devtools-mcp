# 14 – Launcher: Detekce binárky a podpora edic (stable/developer/nightly)

Cíl: Zlepšit nalezení spustitelného Firefoxu napříč platformami a instalacemi. Přidat možnost zadat edici namísto plné cesty a zlepšit chybové hlášky.

Proč: Statické cesty (zejména na Linuxu) nestačí. Potřebujeme PATH scanning, kontrolu spustitelnosti a lepší UX (edice).

Odkazy
- `old/debug_firefox_vscode/src/adapter/configuration.ts:267–380` – `findFirefoxExecutable()`, `getExecutableCandidates()` a varianty pro platformy/edice
- `src/firefox/launcher.ts` – současný způsob detekce

Rozsah
- Přidáváme robustní detekci a volitelnou podporu edic, bez změny veřejného API.

Úkoly
1) Kontrola spustitelnosti
   - Implementovat utilitu ve stylu `await access(path, fs.constants.X_OK)`
   - Rozlišit: soubor existuje, ale není executable vs. neexistuje

2) Kandidáti dle platformy a edice
   - Linux/Unix: prohledat všechna dirs v `$PATH` (flatpak/snap/homebrew/custom)
   - macOS: podpora obou názvů Developer Edition (s mezerami i bez):
     - `/Applications/Firefox Developer Edition.app/Contents/MacOS/firefox`
     - `/Applications/FirefoxDeveloperEdition.app/Contents/MacOS/firefox`
   - Windows: rozšířit kandidáty o `C:\\Program Files\\Mozilla\\Firefox\\firefox.exe`

3) Parametr „edice“
   - Povolit hodnoty `stable|developer|nightly` (např. přes `firefoxPath: 'developer'`)
   - Bez parametru → auto-detect s prioritou: developer → nightly → stable

4) Chybové hlášky
   - „Nalezeno, ale není executable“ vs. „nenalezeno“
   - Navrhnout řešení (zkontrolujte práva, použijte `--firefox-path`)

Akceptační kritéria
- Na macOS/Linux/Windows:
  - Auto-detect najde nainstalovaný Firefox (developer preferován, jinak stable)
  - `--firefox-path developer` najde Developer Edition (pokud je nainstalována)
  - Při neplatné cestě je hláška akční a srozumitelná

Poznámky
- Kódové snippety ber z `old/debug_firefox_vscode` (ilustrace), implementuj v našem `src/firefox/launcher.ts`.
- Neprováděj změny v API – pouze interní detekce a vylepšení chyb.

