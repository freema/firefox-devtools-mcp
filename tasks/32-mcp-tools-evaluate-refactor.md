**32 – MCP tools: Refaktor evaluate_script (robustnost + UID chyby)**

Cíl

- Zpřesnit chování `evaluate_script` tak, aby mělo jednotnou exekuci, lepší validaci vstupu a přátelštější chybové zprávy (zejm. u „stale UID“). Zachovat kompatibilitu s Chrome MCP namingem a současným API.

Rozsah

- `src/tools/script.ts`:
  - Sjednotit volání na jediný `executeScript` path (aktuálně jsou dvě větve pro s/bez args) – snížíme duplicitní kód a rozdíly v chování.
  - Validovat, že `function` je volatelný výraz (funkce/arrow funkce). Pokud rozpoznáme pouhé výrazy, vrátit jasnou chybu s příkladem správného formátu.
  - Vylepšit zachytávání chyb z `resolveUidToElement(uid)` a mapovat je na srozumitelnou odpověď: „Tento UID je ze starého snapshotu… Pořiďte nový snapshot (take_snapshot).“
  - Přidat limit na velikost `function` řetězce (např. 8–16 KB) a vrátit chybu, pokud je překročen.
  - Zvážit přidání volitelného timeoutu (parametr, default např. 5s) – ochrana proti nekonečným smyčkám.

Prompty (zahrnout do popisu nástroje)

- „Zadej funkci jako JavaScript ‘function’ nebo ‘() => …’, která vrací JSON‑serializovatelnou hodnotu. Neposílej dlouhé skripty; nástroj není určen pro masivní manipulace DOM.“
- „Pokud předáváš `args` s `uid`, ujisti se, že máš čerstvý snapshot. Při chybě ‘stale UID’ nejprve proveď `take_snapshot`."
- „Vyhni se side‑effectům — preferuj čisté čtení hodnot.“

Akceptační kritéria

- `evaluate_script` používá jednotný exec path s jasně oddělenou přípravou argumentů (UID → WebElement) a spuštěním funkce.
- Chyby „Invalid UID“, „stale snapshot“ a syntax chyby funkce vrací přátelskou, jednolitou zprávu + návrh další akce.
- Žádné breaking changes rozhraní; stávající testy/skripty fungují beze změn.

Dotčené soubory

- src/tools/script.ts
- tasks/99-specification.md (krátká poznámka k formátu `function` a chybovým hláškám)
