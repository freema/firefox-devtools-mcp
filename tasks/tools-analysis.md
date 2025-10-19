# Analýza MCP nástrojů v src/tools

Tento dokument shrnuje stav nástrojů (tools) pro Firefox DevTools MCP server, navrhuje zjednodušení a změny pro spolehlivější používání v MCP, a doporučuje menší, pragmatickou sadu nástrojů.

Aktualizace stavu (Network)
- NETWORK‑01/02/03 byly implementovány:
  - `list_network_requests` má čisté JSON Schema, stabilní `id`, filtry a úroveň detailu výstupu.
  - `get_network_request` primárně přijímá `id` (URL fallback řeší kolize hláškou).
  - Always‑on capture zapnuto; `start/stop/clear` z MCP odstraněny.

## Shrnutí
- Struktura a API jsou konzistentní, handler vrstvy jsou jednoduché a dobře čitelné.
- Některé nástroje se překrývají nebo nepřinášejí přidanou hodnotu pro MCP („méně je více“):
  - `refresh_pages` je redundantní vůči `list_pages`.
  - `performance_start_trace` a `performance_stop_trace` pouze vrací „not supported“. Lze je vyřadit.
  - Síťové nástroje mají částečnou redundanci v „clear“ vs „start/stop“.
- Vstupní schémata jsou místy nekonzistentní: někde čisté JSON Schema, jinde přímo objekty Zod. MCP očekává JSON-serializovatelná schémata.
- UX návratových zpráv je pro LLM přívětivé (stručné texty, jasné chyby), u screenshotů je však vhodné zvážit strukturovaný výstup místo dlouhého Base64 textu.

## Aktuální inventář nástrojů (zkráceně)
- Navigace/stránky: `list_pages`, `refresh_pages`, `new_page`, `navigate_page`, `select_page`, `close_page` (src/tools/pages.ts)
- Konzole: `list_console_messages`, `clear_console_messages` (src/tools/console.ts)
- Síť: `list_network_requests`, `get_network_request`, `start_network_monitoring`, `stop_network_monitoring`, `clear_network_requests` (src/tools/network.ts)
- Výkon: `performance_get_metrics`, `performance_start_trace`, `performance_stop_trace` (src/tools/performance.ts)
- Snapshot/UID: `take_snapshot`, `resolve_uid_to_selector`, `clear_snapshot` (src/tools/snapshot.ts)
- Vstup/UID: `click_by_uid`, `hover_by_uid`, `fill_by_uid`, `drag_by_uid_to_uid`, `fill_form_by_uid`, `upload_file_by_uid` (src/tools/input.ts)
- Screenshoty: `screenshot_page`, `screenshot_by_uid` (src/tools/screenshot.ts)
- Utility: `accept_dialog`, `dismiss_dialog`, `navigate_history`, `set_viewport_size` (src/tools/utilities.ts)

## Překryvy a kandidáti na odstranění
- `refresh_pages` je redundantní:
  - `handleListPages` už volá refresh a vrací aktuální stav záložek: `src/tools/pages.ts:136`.
  - `handleRefreshPages` dělá totéž, jen přidá prefix „🔄 Page list refreshed“: `src/tools/pages.ts:151`.
  - Doporučení: úplně odstranit `refresh_pages` (exporty v `src/tools/index.ts:7–15`, mapování handlerů a registraci v `src/index.ts:82–87`, `src/index.ts:134–140`). Agenti mohou po akci vždy zavolat `list_pages`.
- `performance_start_trace` a `performance_stop_trace`:
  - Vracejí jen „not supported“ (viz `src/tools/performance.ts`).
  - Doporučení: odstranit z veřejné sady, aby se zmenšil povrch API a nepletly se nástroje, které nic nedělají (úpravy v `src/tools/index.ts:47–54` a `src/index.ts:103–107`, `src/index.ts:156–160`).
- Síťové nástroje – „clear“ vs „start/stop“:
  - `start_network_monitoring` má `clearFirst=true` default; `stop_network_monitoring` také maže buffer. `clear_network_requests` je tedy pohodlná, ale nepovinná zkratka.
  - Pokud chcete menší sadu, lze `clear_network_requests` vypustit a držet se „start(clear) → list/get → stop(clear)“.

## Konsolidace a konzistence schémat
- MCP očekává, že `inputSchema` bude JSON-serializovatelné. V repo jsou smíchané přístupy:
  - JSON Schema styl: např. `pages.ts` (OK).
  - Zod objekty přímo v `inputSchema`: např. `network.ts` (`z.number()`, `z.string()` atd.). Tyto objekty nejsou JSON, při serializaci do MCP se ztratí a klient nevidí validní schéma.
- Doporučení: sjednotit na čisté JSON Schema u všech nástrojů.
  - Příklad (network):
    - místo `pageSize: z.number().int().positive()` → `{ type: 'number', description: '...' }`
    - místo `resourceType: z.string()` → `{ type: 'string', description: '...' }`
  - Alternativa: použít generátor JSON Schema ze Zod (např. zod-to-json-schema) a schéma do `inputSchema` vkládat už převedené. Zůstane typová jistota v kódu a kompatibilita s MCP.

## Návrh „minimal“ sady nástrojů
Zaměřeno na nejčastější úlohy, bez duplicit a „no-op“ příkazů.

- Stránky: `list_pages`, `new_page`, `navigate_page`, `select_page`, `close_page`.
- Snapshot/UID: `take_snapshot`, `clear_snapshot` (volitelné: `resolve_uid_to_selector` spíše pro ladění).
- Vstup: `click_by_uid`, `fill_by_uid`, `hover_by_uid` (volitelné: `fill_form_by_uid`, `upload_file_by_uid`, `drag_by_uid_to_uid`).
- Screenshot: `screenshot_page`, `screenshot_by_uid`.
- Konzole: `list_console_messages`, `clear_console_messages`.
- Síť: `start_network_monitoring`, `list_network_requests`, `get_network_request`, `stop_network_monitoring` (volitelné: `clear_network_requests`).
- Dialogy: `accept_dialog`, `dismiss_dialog` (volitelné: `navigate_history`, `set_viewport_size`).

Poznámka: Vyřadit `refresh_pages`, `performance_start_trace`, `performance_stop_trace`.

## UX a formát výstupu (MCP)
- Snapshoty: truncace a UID messaging jsou velmi dobré (stálé připomenutí na obnovu snapshotu po změnách DOM).
- Vstupní akce: kvalitní „friendly“ chyby pro „stale UID“ – výborné.
- Screenshoty: vrací base64 jako text. V MCP je lepší (pokud klient podporuje) vracet strukturovaný obsah obrázku nebo publikovat jako resource a vracet odkaz.
  - Návrh: přidat helper typu `imageResponse({ base64, mimeType: 'image/png' })` nebo exportovat jako link/attachment.
- Konzole a síť: přehledné shrnutí a filtrování, používání limit/since je rozumné.

## Pojmenování a organizace
- Pojmenování je konzistentní (`snake_case`).
- Historie/viewport jsou v `utilities.ts`, v „chrome“ referenci byly v „pages“. Nevadí, ale lze sjednotit.
- V „chrome“ referenci existují kategorie a `readOnlyHint`. To pomáhá agentům s prioritizací nástrojů. Zvážit doplnění „annotations“ (neblokující).

## Doporučené kroky
1) Odstranit `refresh_pages` ze všech exportů/registrací a aktualizovat popisy „po akci volej list_pages“:
   - `src/tools/index.ts:7–15`, `src/index.ts:82–87`, `src/index.ts:134–140`, `src/tools/pages.ts:21–31`, `src/tools/pages.ts:151–164`.
2) Odstranit „not supported“ performance nástroje:
   - `src/tools/index.ts:47–54`, `src/index.ts:103–107`, `src/index.ts:156–160` a odpovídající části v `src/tools/performance.ts`.
3) Sjednotit `inputSchema` na čisté JSON Schema (zejména `src/tools/network.ts`, částečně `src/tools/performance.ts`).
4) Volitelné: vypustit `clear_network_requests` (ponechat jen start/list/get/stop) a zmínit „clear“ v popisu `start/stop`.
5) Volitelné: přidat „profil“ nástrojů (např. env `MCP_TOOLS_PROFILE=minimal|full`) a v `src/index.ts` podle profilu registrovat menší/větší sadu bez změny implementací handlerů.
6) Volitelné: zlepšit screenshot výstup na strukturovaný obsah (méně textu v odpovědi, lepší práce s obrázky v MCP klientech).

## Reference kódu (vybrané)
- Redundance `refresh_pages` vs `list_pages`: `src/tools/pages.ts:136`, `src/tools/pages.ts:151`.
- Export `refresh_pages`: `src/tools/index.ts:7–15`.
- Registrace `refresh_pages` v serveru: `src/index.ts:82–87`, `src/index.ts:134–140`.
- Performance „not supported“ nástroje: `src/tools/index.ts:47–54`, `src/index.ts:103–107`, `src/index.ts:156–160`.
- Zod v `inputSchema` (MCP ne-JSON): `src/tools/network.ts` (více míst, např. `z.number()`, `z.string()`), kontrast s čistým JSON Schema v `src/tools/pages.ts`.

---

Pokud souhlasíte s tímto směrem, mohu připravit PR, který:
- odstraní `refresh_pages` a oba „performance trace“ nástroje,
- přepíše `inputSchema` v síťových/perf nástrojích na čisté JSON Schema,
- volitelně zavede „minimal“ profil registrace nástrojů.

## Síťové nástroje: hlubší analýza a plán

- Problémy v MCP použití dnes:
  - `list_network_requests` vrací jen text bez stabilního `id`, schéma vstupu používá Zod objekty (ne JSON), filtry jsou nedostatečné a UX je těžkopádné.
  - `get_network_request` je vázaný na URL místo stabilního `id`, což je křehké (duplicitní URL, redirecty atd.).
  - `start_network_monitoring`/`stop_network_monitoring`/`clear_network_requests` nafukují API a komplikují tok; „always‑on“ sběr s filtrováním je pro agenty i lidi jednodušší.

- Návrh změn:
  - Přepnout síťový sběr na „always‑on“ (v `src/firefox/events/network.ts` nastavit enabled by default) a odstranit nástroje start/stop/clear z veřejného API.
  - `list_network_requests`: čisté JSON Schema; filtry `limit`, `sinceMs`, `urlContains`, `method`, `status`/`statusMin`/`statusMax`, `isXHR`, `resourceType`, `sortBy`; výstup se stabilním `id` a možností `detail=min|full`.
  - `get_network_request`: primární parametr `id`, volitelný fallback přes URL; výstup jako JSON (serializovaný v textu) bez nepotřebných disclaimerů.

- Související úkoly:
  - tasks/NETWORK-01-overhaul-list_network_requests.md
  - tasks/NETWORK-02-redesign-get_network_request.md
  - tasks/NETWORK-03-always-on-network-capture-and-remove-start-stop-clear.md

## Snapshot: výstup a použitelnost

- Dlouhé snapshoty mohou přetékat kontext – přidat parametrizaci (`maxLines`, `depth`, `includeAttributes`, `includeText`).
- Na začátek výstupu doplnit stručný návod „co dál“ (použij `click_by_uid`/`hover_by_uid`/`fill_by_uid`; po navigaci vždy `take_snapshot`).
- Opravit zarovnání/mezery v textovém výpisu, aby byl UID strom čistě čitelný a parsovatelný pro agenty.

- Související úkol:
  - tasks/SNAPSHOT-01-clean-snapshot-output-and-guidance.md

## Performance nástroje

- `performance_start_trace` a `performance_stop_trace` odstranit (nepřinášejí hodnotu).
- `performance_get_metrics` je pro MCP nyní málo přínosný (navigační timing není pro praktické scénáře dost) – navrhujeme odstranit z veřejné sady nebo jej přesunout mezi „future features“ a vrátit až s významnější přidanou hodnotou.

- Související úkol:
  - tasks/PERFORMANCE-01-remove-performance-tools.md

## Sjednocení schémat

- Všechny `inputSchema` sjednotit na čisté JSON Schema (bez Zod instancí v místě), případně generovat JSON Schema ze Zod během build kroku.

- Související úkol:
  - tasks/SCHEMA-01-json-schema-unification.md
