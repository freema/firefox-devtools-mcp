# Code Review – 13 Launcher: RDP přepínače a readiness

Datum: 2025-10-11

## Co bylo provedeno

### 1. Přepínače na jednopomlčkové varianty
- Změnil jsem všechny Firefox přepínače z `--flag=value` na `-flag value` formát
- `-start-debugger-server <port>` (místo `--start-debugger-server=<port>`)
- `-profile <dir>` (místo `--profile <dir>`)
- `-headless`, `-no-remote`, `-foreground`
- `-width=`, `-height=` pro viewport

**Dotčené soubory:**
- `src/firefox/launcher.ts` - metoda `buildArgs()` (řádky 150-185)

### 2. TCP readiness polling
- Implementoval jsem aktivní testování dostupnosti RDP portu
- Přidal `testTcpPort()` utilitu - Socket connect test s timeoutem
- Odstranění spoléhání se na stderr parsing ("Listening on port...")
- 20 pokusů po 500ms = 10s celkový timeout

**Nová logika:**
```typescript
// Active readiness check: poll TCP port
const maxAttempts = 20;
const pollInterval = 500;
for (attempt = 1; attempt <= maxAttempts; attempt++) {
  const isReady = await testTcpPort(host, port, 300);
  if (isReady) resolve();
  else if (attempt >= maxAttempts) reject(error);
  else setTimeout(pollPort, pollInterval);
}
```

**Dotčené soubory:**
- `src/firefox/launcher.ts`:
  - Import `Socket` z 'net' (řádek 10)
  - Funkce `testTcpPort()` (řádky 47-81)
  - Metoda `launch()` - polling logika (řádky 163-192)

### 3. Rozšíření FIREFOX_PREFS
- Přidal jsem důležité preference z `old/debug_firefox_vscode`
- Extensions: `autoDisableScopes`, `xpinstall.signatures.required`, `console.logLevel`
- Browser: `checkDefaultBrowser`, `warnOnQuit`, `resume_from_crash`
- Telemetry: `dataSubmissionPolicyBypassNotification`, `homepage_override.mstone`
- UI: `uitour.enabled`
- macOS stability: `toolkit.startup.max_resumed_crashes` (prevence safe mode)

**Dotčené soubory:**
- `src/config/constants.ts` - `FIREFOX_PREFS` (řádky 13-38)

### 4. Test script fix
- Změnil `rdpHost` z `'localhost'` na `'127.0.0.1'`
- Vyhneme se problémům s IPv6 (`::1`)

**Dotčené soubory:**
- `scripts/test-tools.js` (řádek 18)

### 5. Vylepšené logování
- Detailní error messages při timeout readiness
- Troubleshooting návody (check port, try different port, check firefox path)
- Debug logy pro každý pokus o připojení

## Rozhodnutí a dopady

### Proč jednopomlčkové přepínače?
- Firefox parser je robustnější s `-flag value` než `--flag=value`
- Konzistence s referenční implementací v `old/debug_firefox_vscode`
- Méně problémů napříč verzemi Firefoxu

### Proč TCP polling místo stderr parsing?
- Stderr výstupy se liší napříč verzemi Firefox
- Heuristika "Listening on port" není spolehlivá
- Aktivní test je deterministický a jistý

### Známá omezení
- 10s timeout může být krátký na velmi pomalých strojích
- Retry interval je fixní (500ms), mohlo by být exponenciální backoff

## Reference

**Z old/debug_firefox_vscode:**
- `src/adapter/configuration.ts:108` - jednopomlčkové přepínače
- `src/adapter/configuration.ts:416-429` - Firefox preferences
- Pattern TCP readiness - inspirováno Puppeteer/Chrome MCP

**Aktuální implementace:**
- `src/firefox/launcher.ts`
- `src/firefox/transport.ts`
- `src/config/constants.ts`
- `scripts/test-tools.js`

## Další kroky

- Task 14: Vylepšená detekce binárky a podpora edic
- Možné vylepšení: exponenciální backoff pro retry
- Možné vylepšení: konfigurovatelný timeout přes ENV
