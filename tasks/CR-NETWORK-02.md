# Code Review – NETWORK-02: Redesign get_network_request

Datum: 2025-10-19

## Co bylo provedeno

Redesign nástroje `get_network_request` pro stabilní lookup podle ID s fallback na URL:

- **Čisté JSON Schema** (src/tools/network.ts:71-89):
  - Primární parametr `id` (string) - doporučený způsob lookup
  - Volitelný parametr `url` (string) - fallback s detekcí kolizí
  - Žádný required parametr - jeden z nich musí být poskytnut (validace v handleru)
- **Nový handler** (src/tools/network.ts:243-321):
  - Primární cesta: lookup podle `id`
  - Fallback cesta: lookup podle `url` s detekcí multiple matches
  - Kolize handling: pokud URL matchuje více požadavků, vrátí seznam ID s nabídkou volby
  - Strukturovaný JSON výstup s všemi dostupnými poli
- **Aktualizovaný popis**:
  - Jasně komunikuje preferenci ID lookup
  - Vysvětluje riziko URL fallbacku (multiple matches)
  - Odstraněny zbytečné disclaimery ("BiDi MVP...")

## Rozhodnutí a dopady

### API design
- **ID-first approach**: Primární lookup podle `id` je spolehlivý a jednoznačný
- **URL jako fallback**: Zachována zpětná kompatibilita, ale s jasným varováním
- **Chybové stavy**: Explicitní error messages s TIP návody na řešení

### Kolize handling
Pokud URL matchuje více požadavků:
```
Multiple requests (3) found with URL: https://example.com/api/data

Please use one of these IDs with the "id" parameter:
  - ID: req-123 | GET [200]
  - ID: req-456 | POST [201]
  - ID: req-789 | GET [304]
```
Uživatel dostane jasný seznam a může zvolit správný request podle ID.

### Výstup
- Konzistentní JSON formát (stejný shape jako v `list_network_requests` full detail)
- Všechna pole explicitně `null` pokud nejsou dostupná (ne `undefined`)
- Čitelné jako text, snadno parsovatelné programově

### Vazba na list_network_requests
- `list_network_requests` nyní vrací `id` field ve všech výstupech
- Description explicitně instruuje: "Use the ID from list_network_requests"
- Vytváří spolehlivý pattern: list → get detail

## Reference

### Dotčené soubory
- `src/tools/network.ts` - tool definition a handler (get_network_request)
- `tasks/NETWORK-02-redesign-get_network_request.md` - task specifikace

### Související změny
- NETWORK-01: list_network_requests nyní vrací stabilní `id` field
- Vazba: ID z list → vstup do get

## Další kroky

- Dokumentovat recommended workflow: `list_network_requests` → použít ID → `get_network_request`
- Zvážit přidání `index` parametru jako další fallback (např. "get request #3")
- Otestovat kolize detection s reálnými scénáři (např. polling endpoints)
