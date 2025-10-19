# NETWORK-02: Redesign get_network_request

Cíl: Stabilní a praktický nástroj pro získání detailu síťového požadavku, který je navázaný na `id` (ne na URL), s konzistentním výstupem a čistým JSON Schema vstupu.

Problémy dnes
- Parametr `url` je křehký (duplicitní URL, redirecty, query parametry, změny v čase).
- Výstup je textový bez jasné struktury, chybí vazba na `list_network_requests`.
- Zbytečné disclaimery („BiDi MVP…“) snižují hodnotu pro MCP agenty.

Návrh řešení
- Vstupní schema (čisté JSON Schema):
  - Primárně `id` (string) – stejné `id`, které vrací `list_network_requests`.
  - Volitelně `url` (string) jako fallback: pokud je více shod, vrátit chybu s nabídkou volby (ID seznam), ne heuristiku.
- Výstup (serializovaný JSON ve `text` contentu):
  - `id`, `url`, `method`, `status`, `statusText`, `resourceType`, `isXHR`, `timings { requestTime, responseTime, duration }`, `requestHeaders`, `responseHeaders`.
  - Bez dlouhých disclaimers; pokud některá data nejsou dostupná, explicitně `null` nebo pole chybějící.
- Chybové stavy:
  - `id` neexistuje → „Nenalezeno. Tip: zavolej list_network_requests a použij vrácené id.“
  - `url` matchuje více řádků → vypsat seznam id + URL a požádat o volbu.

Akceptační kritéria
- `inputSchema` je JSON-serializovatelné.
- Primární cesta je přes `id`; fallback přes `url` je bezpečný a vysvětlený.
- Výstup lze snadno zpracovat (serializovaný JSON), bez zbytečných vět/příznaků.

Implementační kroky
1) Změnit `inputSchema` (src/tools/network.ts) – `id` (string, required) + volitelně `url`.
2) Handler: lookup podle `id`; fallback lookup podle `url` s detekcí kolizí.
3) Vytvořit konzistentní formát JSON detailu (stejný shape jako v list detailu).
4) Aktualizovat popis `list_network_requests`, aby explicitně říkal „ID použijte v get_network_request“.
