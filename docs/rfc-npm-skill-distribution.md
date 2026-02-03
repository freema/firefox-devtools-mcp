# RFC: Distributing Claude Code plugins directly in npm packages

> **Status:** Draft
> **Author:** Borek Bernard (@borekb)
> **Date:** 2026-02-03

## Motivation

The current workflow for distributing Claude Code skills is not ideal:

1. **skills.sh** - centralized registry requires HTTP fetch and manual management
2. **Project-level installation** (`<project>/.claude/skills`) - issues:
   - Skill duplication across projects
   - Need to commit skills into each project
   - Skill versioning separate from package versioning
3. **Global installation** - problematic due to versioning and isolation

## Proposal: Claude Code plugins as part of npm packages

Just as TypeScript types started with DefinitelyTyped and gradually moved directly into packages, Claude Code plugins should be distributed directly with npm packages.

### Convention

Following the [Context7 approach](https://github.com/upstash/context7/tree/master/plugins/claude/context7), plugins are stored in a `plugins/claude/<plugin-name>/` directory:

```
my-package/
├── package.json
├── src/
├── dist/
└── plugins/
    └── claude/
        └── my-plugin/
            ├── .claude-plugin/
            │   └── plugin.json     # Plugin manifest (required)
            ├── skills/
            │   └── my-skill/
            │       └── SKILL.md    # Skill definition
            ├── .mcp.json           # MCP server configuration
            └── README.md           # Plugin documentation
```

### Plugin manifest (plugin.json)

```json
{
  "name": "my-plugin",
  "description": "What this plugin does",
  "version": "1.0.0",
  "author": {
    "name": "Author Name"
  },
  "repository": "https://github.com/owner/repo",
  "license": "MIT"
}
```

### SKILL.md format

```yaml
---
name: my-skill
description: When to use this skill. Claude uses this to decide when to apply it automatically.
allowed-tools: Bash(npx my-package*), Read, Grep
---

# My Skill

Instructions for Claude when this skill is active...
```

### MCP server configuration (.mcp.json)

```json
{
  "mcpServers": {
    "my-server": {
      "command": "npx",
      "args": ["-y", "my-package@latest"]
    }
  }
}
```

## Benefits

| Aspect | skills.sh | Project-level | npm package |
|--------|-----------|---------------|-------------|
| Versioning | Separate | Separate | Shared with code |
| Updates | Manual fetch | Manual | `npm update` |
| Offline | No | Yes | Yes |
| Deduplication | No | No | node_modules |
| Discovery | skills.sh | None | npm search |

## How it would work

### 1. Package author

```bash
# When publishing package, plugins are included via "files" in package.json
npm publish
```

### 2. Package user

```bash
# Install package
npm install firefox-devtools-mcp

# Install plugin from node_modules
/plugin install ./node_modules/firefox-devtools-mcp/plugins/claude/firefox-devtools
```

### 3. AI assistant auto-discovery (future)

AI assistants could scan `node_modules/*/plugins/claude/*/` at startup to automatically discover and suggest available plugins.

## Implementation plan

### Phase 1: Convention (now)
- Define plugin directory structure
- Publish RFC
- Implement in firefox-devtools-mcp as reference

### Phase 2: Adoption (Q1 2026)
- Document best practices
- Create plugin generator/scaffolder
- More packages adopt the convention

### Phase 3: Tooling (Q2 2026)
- npm CLI plugin for plugin discovery
- Auto-discovery in Claude Code
- VS Code extension for plugin preview

### Phase 4: Ecosystem (Q3 2026)
- npm.js displays plugin badge
- Searchable plugin registry
- One-click installation from npm page

## Open questions

1. **Auto-discovery scope?**
   - Should Claude Code auto-discover plugins in node_modules?
   - Performance implications for large node_modules?

2. **Plugin versioning?**
   - Should plugin version match package version?
   - How to handle breaking changes in plugin format?

3. **Monorepo support?**
   - How to handle plugins in monorepo with multiple packages?

4. **Security?**
   - Should there be plugin signing/verification?
   - How to handle malicious plugins?

## References

- [Claude Code Plugins Documentation](https://code.claude.com/docs/en/plugins)
- [Claude Code Skills Documentation](https://code.claude.com/docs/en/skills)
- [Context7 Plugin Example](https://github.com/upstash/context7/tree/master/plugins/claude/context7)
- [Agent Skills Standard](https://agentskills.io)

---

## Example: firefox-devtools-mcp

See [plugins/claude/firefox-devtools/](../plugins/claude/firefox-devtools/) for a concrete implementation.

### Directory structure

```
firefox-devtools-mcp/
├── package.json                    # npm package (includes "plugins" in files)
├── src/                            # MCP server source
├── dist/                           # Built MCP server
└── plugins/
    └── claude/
        └── firefox-devtools/
            ├── .claude-plugin/
            │   └── plugin.json     # Plugin manifest
            ├── skills/
            │   └── browser-automation/
            │       └── SKILL.md    # Browser automation skill
            ├── .mcp.json           # MCP server config
            └── README.md           # Plugin docs
```

### Installation

```bash
# After npm install
/plugin install ./node_modules/firefox-devtools-mcp/plugins/claude/firefox-devtools

# Or test from source
claude --plugin-dir ./plugins/claude/firefox-devtools
```
