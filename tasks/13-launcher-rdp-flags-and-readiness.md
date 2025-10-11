# 13 – Launcher: Správné RDP přepínače a readiness (MVP fix)

Cíl: Opravit spouštění Firefoxu tak, aby RDP server skutečně naslouchal a klient se k němu spolehlivě připojil. Nahradit chybné dlouhé přepínače a přidat aktivní ověření dostupnosti portu.

Proč: Test script `scripts/test-tools.js` hlásí `ECONNREFUSED`, protože Firefox není spuštěn se správnými volbami a/nebo readiness check je příliš optimistický.

Odkazy
- `old/debug_firefox_vscode/src/adapter/configuration.ts:108` – používá jednopomlčkové přepínače `-start-debugger-server`, `-no-remote`, `-profile`
- `old/debug_firefox_vscode/src/adapter/configuration.ts:416–418` – povinné DevTools prefs pro remote debugging
- `src/firefox/launcher.ts` – současná implementace launcheru
- `src/firefox/transport.ts` – TCP transport RDP

Rozsah
- Nepřidáváme nové featury, jen opravujeme argumenty a readiness.
- Kódové snippety níže jsou ilustrační; řiď se existující implementací v `old/` a v aktuálním `src/`.

Úkoly
1) Přepnout na jednopomlčkové přepínače
   - `-start-debugger-server <port>` (místo `--start-debugger-server=...`)
   - `-profile <dir>` (místo `--profile`)
   - zachovat `-no-remote`, `-foreground`; `--headless` může zůstat (Firefox akceptuje oba tvary, pro konzistenci lze sjednotit na `-headless`).

2) Aktivní readiness (polling)
   - Po `spawn()` opakovaně testovat TCP připojení na RDP port (např. 10–20 pokusů po 300–500 ms) a teprve poté `resolve()`
   - Nespoléhat se pouze na stderr „Listening on port…“. Heuristika logů se liší napříč verzemi.

3) Ephemeral profil a prefs
   - Zachovat generování `user.js` z `FIREFOX_PREFS` (viz `src/config/constants.ts`)
   - Prefs se musí načíst ze zvoleného profilu přes `-profile <dir>`

4) Test script – host
   - V `scripts/test-tools.js` změnit `rdpHost` na `127.0.0.1` (vyhneme se problémům s `::1`)

5) Logování
   - Přidat jasné logy v případě timeoutu readiness s návrhem řešení (zkontrolovat port, přidat `--firefox-path`)

Akceptační kritéria
- `npm run build && node scripts/test-tools.js`:
  - Firefox se spustí a do 10 s se naváže RDP spojení bez `ECONNREFUSED`
  - V logu se objeví potvrzení připojení RDP transportu
  - `lsof -i :6000` během běhu ukáže naslouchající proces Firefoxu
  - Test pokračuje do části „list pages / navigate / evaluate“ bez pádu

Poznámky
- Screenshoty přes BiDi mohou selhávat, pokud neexistuje BiDi Remote Agent – jejich stabilizaci řeší navazující task 15.

