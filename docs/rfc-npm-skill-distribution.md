# RFC: Distributing SKILL.md directly in npm packages

> **Status:** Draft
> **Author:** Borek Bernard (@borekb)
> **Date:** 2026-02-03

## Motivation

The current workflow for distributing skills is not ideal:

1. **skills.sh** - centralized registry requires HTTP fetch and manual management
2. **Project-level installation** (`<project>/.claude/skills`) - issues:
   - Skill duplication across projects
   - Need to commit skills into each project
   - Skill versioning separate from package versioning
3. **Global installation** - problematic due to versioning and isolation

## Proposal: SKILL.md as part of npm package

Just as TypeScript types started with DefinitelyTyped and gradually moved directly into packages, skills should be distributed directly with the npm package.

### Convention

```
my-package/
├── package.json
├── src/
├── dist/
├── SKILL.md          # <- Main skill file
└── skills/           # <- Optional: multiple skill files
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

### Benefits

| Aspect | skills.sh | Project-level | npm package |
|--------|-----------|---------------|-------------|
| Versioning | Separate | Separate | Shared with code |
| Updates | Manual fetch | Manual | `npm update` |
| Offline | No | Yes | Yes |
| Deduplication | No | No | node_modules |
| Type-safety | No | No | Possible |
| Discovery | skills.sh | None | npm search |

### How it would work

#### 1. Package author

```bash
# When publishing package
npm publish
# SKILL.md is automatically included if in "files" in package.json
```

#### 2. Package user

```bash
# Install as dependency
npm install firefox-devtools-mcp

# AI assistant automatically detects SKILL.md in node_modules
```

#### 3. AI assistant

AI assistant (Claude Code, Cursor, etc.) would:

1. Scan `node_modules/*/SKILL.md` at startup
2. Index available skills
3. Use relevant skill based on context

```typescript
// Pseudo-implementation in AI assistant
async function discoverSkills(projectRoot: string): Promise<Skill[]> {
  const skills: Skill[] = [];

  // 1. Look for SKILL.md in node_modules
  const nodeModulesSkills = await glob('node_modules/*/SKILL.md', { cwd: projectRoot });

  // 2. Parse and index
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

## SKILL.md format

### Basic structure

```markdown
---
name: Firefox DevTools MCP
version: 0.5.3
description: Browser automation via WebDriver BiDi
keywords: [firefox, browser, automation, mcp]
ai-compatible: [claude-code, cursor, cline]
---

# Firefox DevTools MCP Skill

## When to use

This skill is relevant when the user wants to:
- Automate Firefox browser
- Test web pages
- Scrape web content
- Interact with DOM elements

## Available tools

### Navigation
- `navigate_page` - Navigate to URL
- `list_pages` - List open pages
- `new_page` - Open new page

### DOM interaction
- `take_snapshot` - Create DOM snapshot with UID elements
- `click_by_uid` - Click element by UID
- `fill_by_uid` - Fill input by UID

## Usage examples

### Open page and click button

1. First navigate to page:
   ```
   navigate_page url="https://example.com"
   ```

2. Create snapshot to get UIDs:
   ```
   take_snapshot
   ```

3. Click element:
   ```
   click_by_uid uid="e42"
   ```

## Limitations

- Requires running Firefox with WebDriver BiDi
- `evaluate_script` is currently disabled for security reasons
```

## Implementation plan

### Phase 1: Convention (now)
- Define SKILL.md format
- Publish RFC
- Get community feedback

### Phase 2: Adoption (Q1 2026)
- Add SKILL.md to firefox-devtools-mcp
- Document best practices
- Create validator/linter for SKILL.md

### Phase 3: Tooling (Q2 2026)
- npm CLI plugin for skill discovery
- VS Code extension for skill preview
- AI assistants implement auto-discovery

### Phase 4: Ecosystem (Q3 2026)
- npm.js displays skill badge
- Searchable skill registry on npm
- DefinitelySkilled repo for legacy packages without own skills

## Open questions

1. **Fallback to skills.sh?**
   - Should AI assistant fall back to skills.sh if package doesn't have SKILL.md?

2. **Monorepo support?**
   - How to handle skills in monorepo with multiple packages?

3. **Skill versioning?**
   - Should SKILL.md have its own version or share with package.json?

4. **Scoped packages?**
   - `@org/package/SKILL.md` - how to handle discovery?

5. **Peer dependencies?**
   - Can a skill depend on other skills?

## References

- [Model Context Protocol](https://modelcontextprotocol.io/)
- [DefinitelyTyped](https://github.com/DefinitelyTyped/DefinitelyTyped) - analogy for types
- [skills.sh](https://skills.sh) - current centralized registry

---

## Appendix: Example for firefox-devtools-mcp

See [SKILL.md](../SKILL.md) in the root of this repository for a concrete implementation.
