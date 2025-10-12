# 24 – Odstranění legacy RDP prvků (BiDi-only cleanup)

Cíl

- Důsledně odstranit zbylé odkazy na RDP (Remote Debugging Protocol) z kódu, CLI a textů. Zůstat čistě na WebDriver BiDi (Selenium) bez matoucích voleb a wordingů.

Rozsah

1) Kód a typy (povinné)
- `src/firefox/types.ts`: odstranit RDP volby z `FirefoxLaunchOptions`
  - Odebrat: `rdpHost`, `rdpPort` (aktuálně na `src/firefox/types.ts:59`–`src/firefox/types.ts:61`)
- `src/index.ts`:
  - Upravit hlavičku: řádek `src/index.ts:5` z „Remote Debugging Protocol“ → „WebDriver BiDi“
  - Přestat číst a předávat `rdpHost`/`rdpPort` do `FirefoxLaunchOptions` (`src/index.ts:62`–`src/index.ts:63`)
  - Přestat logovat RDP hodnoty (`src/index.ts:141`, `src/index.ts:142`)
- `src/cli.ts`:
  - Odstranit CLI volby: `rdpHost`, `rdpPort` (definice `src/cli.ts:9`–`src/cli.ts:21`)
  - Odstranit/aktualizovat příklad s `--rdp-host/--rdp-port` (`src/cli.ts:38`)
  - Zvážit odstranění `autoLaunch` (původně RDP use‑case). Pokud zůstane, popis změnit na „Selenium launches Firefox (BiDi)“
- `src/config/constants.ts`:
  - Odstranit RDP‑specifické konstanty a prefs (nepoužívané, matoucí): `FIREFOX_ARGS`, `FIREFOX_PREFS`, a komentář „Remote debugging settings (critical for RDP)“ (`src/config/constants.ts:11`–`src/config/constants.ts:36`).
  - Zachovat pouze `SERVER_NAME`, `SERVER_VERSION` (případně `DEFAULT_HEADLESS` pokud má smysl)

2) User-facing texty (povinné)
- `src/tools/network.ts`: změnit wording „Firefox RDP …“ na „Current BiDi MVP …“
  - Řádky: `src/tools/network.ts:16`, `src/tools/network.ts:41`, `src/tools/network.ts:114`, `src/tools/network.ts:162`
- `src/tools/performance.ts`: změnit wording z „Firefox RDP“ na „WebDriver BiDi“ a vysvětlit, že DevTools tracing (CDP) není dostupný
  - Řádky: `src/tools/performance.ts:16`, `src/tools/performance.ts:26`, `src/tools/performance.ts:43`, `src/tools/performance.ts:169`, `src/tools/performance.ts:183`, `src/tools/performance.ts:196`

3) Dokumentace a specifikace (doporučeno)
- `tasks/99-specification.md`: přepsat „Protocol: Mozilla Remote Debugging Protocol“ → „WebDriver BiDi (Selenium)“, a odstranit/nebo označit „historické“ RDP pasáže.
- `docs/firefox-client.md`: ponechat sekci „Migration from RDP“, ale ověřit, že nejsou nikde instrukce k RDP host/port. (Migrační dokument zůstává.)

4) Testy a skripty (validace)
- `scripts/test-bidi-devtools.js`: neobsahuje RDP argy – beze změny; spustit jako smoke test po refaktoru.
- Volitelně: `scripts/test-tools.js` projít pro jistotu wording.

Akceptační kritéria

- Build prochází (`npm run build`), test script běží (`node scripts/test-bidi-devtools.js`).
- CLI neobsahuje `--rdp-host/--rdp-port` ani zmínky o RDP, help texty odpovídají BiDi.
- Žádné „Firefox RDP …“ v uživatelských hláškách nástrojů.
- Kód neobsahuje nepoužívané RDP konstanty/prefs.

Poznámky k implementaci

- Pokud je `autoLaunch` nepoužitý/no‑op, odstranit jej; jinak přejmenovat popis a potvrdit jeho význam ve světě Selenium/BiDi.
- Případné env proměnné `RDP_HOST`/`RDP_PORT` odstranit z CLI/README, pokud existují.

Rizika

- Typové kaskády: po odstranění `rdpHost`/`rdpPort` z `FirefoxLaunchOptions` zkontrolovat všechny call‑sites (aktuálně jen `src/index.ts`).
- Při odstraňování konstant z `src/config/constants.ts` ověřit, že nejsou nikde importované (aktuálně se používají jen `SERVER_NAME`/`SERVER_VERSION`).

Odhad

- Kód: ~30–45 minut
- Texty/dokumentace: ~20–30 minut
- Validace: ~10–15 minut

