# RFC: Distribuce SKILL.md přímo v npm balíčcích

> **Status:** Draft
> **Autor:** Borek Bernard (@borekb)
> **Datum:** 2026-02-03

## Motivace

Současný workflow pro distribuci skills není ideální:

1. **skills.sh** - centralizovaný registr vyžaduje HTTP fetch a manuální správu
2. **Projekt-level instalace** (`<project>/.claude/skills`) - problémy:
   - Duplicita skills napříč projekty
   - Nutnost commitovat skills do každého projektu
   - Verzování skills oddělené od verzování balíčku
3. **Globální instalace** - ošemetné z důvodu verzování a izolace

## Návrh: SKILL.md jako součást npm balíčku

Stejně jako TypeScript typy začínaly s DefinitelyTyped a postupně se přesunuly přímo do balíčků, skills by měly být distribuovány přímo s npm balíčkem.

### Konvence

```
my-package/
├── package.json
├── src/
├── dist/
├── SKILL.md          # <- Hlavní skill soubor
└── skills/           # <- Volitelně: více skill souborů
    ├── advanced.md
    └── examples.md
```

### package.json metadata

```json
{
  "name": "firefox-devtools-mcp",
  "version": "0.5.3",
  "skill": {
    "main": "SKILL.md",
    "additional": ["skills/*.md"],
    "keywords": ["browser-automation", "firefox", "mcp", "webdriver-bidi"],
    "ai-compatible": ["claude-code", "cursor", "cline"]
  }
}
```

### Výhody

| Aspekt | skills.sh | Projekt-level | npm balíček |
|--------|-----------|---------------|-------------|
| Verzování | Oddělené | Oddělené | Sdílené s kódem |
| Aktualizace | Manuální fetch | Manuální | `npm update` |
| Offline | Ne | Ano | Ano |
| Deduplikace | Ne | Ne | node_modules |
| Type-safety | Ne | Ne | Možné |
| Discovery | skills.sh | Žádné | npm search |

### Jak by to fungovalo

#### 1. Autor balíčku

```bash
# Při publikování balíčku
npm publish
# SKILL.md je automaticky součástí, pokud je v "files" v package.json
```

#### 2. Uživatel balíčku

```bash
# Instalace jako dependency
npm install firefox-devtools-mcp

# AI asistent automaticky detekuje SKILL.md v node_modules
```

#### 3. AI asistent

AI asistent (Claude Code, Cursor, atd.) by:

1. Skenoval `node_modules/*/SKILL.md` při startu
2. Indexoval dostupné skills
3. Použil relevantní skill na základě kontextu

```typescript
// Pseudo-implementace v AI asistentovi
async function discoverSkills(projectRoot: string): Promise<Skill[]> {
  const skills: Skill[] = [];

  // 1. Hledej SKILL.md v node_modules
  const nodeModulesSkills = await glob('node_modules/*/SKILL.md', { cwd: projectRoot });

  // 2. Parsuj a indexuj
  for (const skillPath of nodeModulesSkills) {
    const content = await fs.readFile(skillPath, 'utf-8');
    const metadata = extractMetadata(content);
    skills.push({
      source: 'npm',
      package: path.basename(path.dirname(skillPath)),
      content,
      ...metadata
    });
  }

  return skills;
}
```

## SKILL.md formát

### Základní struktura

```markdown
---
name: Firefox DevTools MCP
version: 0.5.3
description: Browser automation via WebDriver BiDi
keywords: [firefox, browser, automation, mcp]
ai-compatible: [claude-code, cursor, cline]
---

# Firefox DevTools MCP Skill

## Kdy použít

Tento skill je relevantní když uživatel chce:
- Automatizovat Firefox prohlížeč
- Testovat webové stránky
- Scrapovat obsah webových stránek
- Interagovat s DOM elementy

## Dostupné nástroje

### Navigace
- `navigate_page` - Naviguje na URL
- `list_pages` - Vypíše otevřené stránky
- `new_page` - Otevře novou stránku

### DOM interakce
- `take_snapshot` - Vytvoří snapshot DOM s UID elementy
- `click_by_uid` - Klikne na element podle UID
- `fill_by_uid` - Vyplní input podle UID

## Příklady použití

### Otevření stránky a kliknutí na tlačítko

1. Nejprve naviguj na stránku:
   ```
   navigate_page url="https://example.com"
   ```

2. Vytvoř snapshot pro získání UID:
   ```
   take_snapshot
   ```

3. Klikni na element:
   ```
   click_by_uid uid="e42"
   ```

## Omezení

- Vyžaduje běžící Firefox s WebDriver BiDi
- `evaluate_script` je momentálně vypnutý z bezpečnostních důvodů
```

## Implementační plán

### Fáze 1: Konvence (nyní)
- Definovat SKILL.md formát
- Publikovat RFC
- Získat feedback od komunity

### Fáze 2: Adopce (Q1 2026)
- Přidat SKILL.md do firefox-devtools-mcp
- Dokumentovat best practices
- Vytvořit validátor/linter pro SKILL.md

### Fáze 3: Tooling (Q2 2026)
- npm CLI plugin pro skill discovery
- VS Code extension pro skill preview
- AI asistenti implementují auto-discovery

### Fáze 4: Ecosystem (Q3 2026)
- npm.js zobrazuje skill badge
- Searchable skill registry na npm
- DefinitelySkilled repo pro legacy balíčky bez vlastních skills

## Otevřené otázky

1. **Fallback na skills.sh?**
   - Měl by AI asistent fallbackovat na skills.sh pokud balíček nemá SKILL.md?

2. **Monorepo podpora?**
   - Jak řešit skills v monorepo s více balíčky?

3. **Skill versioning?**
   - Má mít SKILL.md vlastní verzi nebo sdílet s package.json?

4. **Scoped packages?**
   - `@org/package/SKILL.md` - jak řešit discovery?

5. **Peer dependencies?**
   - Skill může záviset na jiných skills?

## Reference

- [Model Context Protocol](https://modelcontextprotocol.io/)
- [DefinitelyTyped](https://github.com/DefinitelyTyped/DefinitelyTyped) - analogie pro typy
- [skills.sh](https://skills.sh) - současný centralizovaný registr

---

## Appendix: Příklad pro firefox-devtools-mcp

Viz [SKILL.md](../SKILL.md) v rootu tohoto repozitáře pro konkrétní implementaci.
