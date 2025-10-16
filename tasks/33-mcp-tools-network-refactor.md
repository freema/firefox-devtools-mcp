**33 – MCP tools: Síťové nástroje – filtry + čištění**

Cíl

- Zlepšit použitelnost síťových nástrojů přidáním filtrů pro výpis a přidat chybějící nástroj pro vyčištění bufferu. Udržet kompatibilitu s BiDi omezeními.

Rozsah

- `src/tools/network.ts`:
  - `list_network_requests` – přidat volitelné filtry do input schématu:
    - `urlContains?: string`, `method?: 'GET'|'POST'|...`, `status?: number`, `statusMin?: number`, `statusMax?: number`, `isXHR?: boolean`, `resourceType?: string`
    - Implementovat filtraci na straně handleru nad `firefox.getNetworkRequests()`.
  - `start_network_monitoring` – volitelný parametr `clearFirst?: boolean` (default true), pokud true → `firefox.clearNetworkRequests()` před startem.
  - Nový nástroj `clear_network_requests` – zavolá `firefox.clearNetworkRequests()` a vrátí potvrzení.
  - Vylepšit format výstupu (metoda, status, url, typ, duration) – zachovat stručnost (max prvních N).

Prompty (zahrnout do popisů nástrojů)

- „Pro přesnější výsledky spusť monitoring před navigací a po dokončení ho vypni. Při opakovaném měření používej `clear_network_requests` nebo `start_network_monitoring` s `clearFirst=true`."
- „Používej filtry (urlContains, method, status…) pro zúžení výpisu — vyhneš se zahlcení kontextu.“
- „Nástroj nevrací těla odpovědí (BiDi omezení).“

Akceptační kritéria

- Filtrace v `list_network_requests` funguje dle parametrů a je case‑insensitive pro `method` a `resourceType`.
- `start_network_monitoring` s `clearFirst=true` začíná s prázdným bufferem.
- `clear_network_requests` je dostupný v `tools/index.ts` a registrovaný v `src/index.ts`.
- Nejsou breaking changes původního chování, parametry jsou volitelné.

Dotčené soubory

- src/tools/network.ts
- src/tools/index.ts (export `clear_network_requests`)
- src/index.ts (registrace handleru)
- tasks/99-specification.md (doplnění dokumentace)
