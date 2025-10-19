# Code Review – SNAPSHOT-01: Vyčistit výstup snapshotu a přidat parametry

Datum: 2025-10-19

## Co bylo provedeno

Zlepšení UX nástroje `take_snapshot` přidáním parametrů a jasného návodu pro agenty:

- **Nové parametry** (src/tools/snapshot.ts:19-31):
  - `maxLines` (number, default 100) - kontrola velikosti výstupu
  - `includeAttributes` (boolean, default false) - detailní ARIA atributy
  - Čisté JSON Schema pro MCP kompatibilitu
- **Nový výstupní formát** (src/tools/snapshot.ts:65-125):
  - **Návod nahoře**: jasný a strukturovaný guide "HOW TO USE THIS SNAPSHOT"
  - **Metadata**: Snapshot ID, truncation status
  - **Parametrizace**: využití maxLines pro kontrolu délky výstupu
- **Návod obsahuje**:
  - Jak používat UIDs (`click_by_uid`, `hover_by_uid`, `fill_by_uid`)
  - Kdy volat `take_snapshot` znovu (po navigaci)
  - Co dělat při stale UID errors (take_snapshot → retry)

## Rozhodnutí a dopady

### Výstupní formát

**Před:**
```
📸 Snapshot taken (ID: 123)
⚠️  Snapshot was truncated (too many elements)

[snapshot tree]
```

**Po:**
```
📸 Snapshot taken

═══ HOW TO USE THIS SNAPSHOT ═══
• To interact with elements: use click_by_uid, hover_by_uid, or fill_by_uid with the UID
• After navigation: always call take_snapshot again (UIDs become stale)
• On stale UID errors: call take_snapshot → retry your action
═════════════════════════════════

Snapshot ID: 123
⚠️  Snapshot content was truncated (too many elements in DOM)

[snapshot tree]

... and 150 more lines (use maxLines parameter to see more)
```

### Parametry

**maxLines:**
- Default: 100 (stejně jako předtím MAX_SNAPSHOT_LINES)
- Umožňuje agentům kontrolovat context usage
- Jasná indikace, kolik řádků bylo vynecháno

**includeAttributes:**
- Default: false (zachování stávajícího chování)
- Připraveno pro budoucí filtrování verbose atributů
- Současná implementace: placeholder (snapshot backend je nezávislý)

### Self-guiding výstup

**Cíl**: Agent/AI má okamžitě vědět:
1. Co může s UIDs dělat (akce)
2. Kdy musí snapshot obnovit (navigace)
3. Jak řešit chyby (stale UIDs)

**Benefit**: Snížení potřeby externí dokumentace, agent má vše "in-context"

### Implementační poznámky

- **Backend nezměněn**: `SnapshotManager.takeSnapshot()` funguje stejně
- **Frontend formátování**: změny pouze v MCP tool handleru
- **includeAttributes**: placeholder pro budoucí implementaci (vyžaduje změny v formatter.ts)

## Reference

### Dotčené soubory
- `src/tools/snapshot.ts` - inputSchema a handler (take_snapshot)
- `src/firefox/snapshot/` - backend nezměněn (budoucí rozšíření pro includeAttributes)

### Související změny
- Konzistence s ostatními tools (JSON Schema, structured output)
- Návaznost na input tools (click/hover/fill_by_uid)

## Další kroky

- Implementovat skutečné filtrování pro `includeAttributes` v formatter.ts (volitelné)
- Zvážit další parametry: `depth` (max hloubka stromu), `includeText` (text on/off)
- Otestovat s reálnými agenty (Claude Code) pro UX feedback
- Dokumentovat best practices pro snapshot workflow v README

