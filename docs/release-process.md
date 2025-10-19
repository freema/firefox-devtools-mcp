# Release Process

This document describes the release process for `firefox-devtools-mcp`.

## Quick Start (Recommended)

Use `npm version` to automatically update package.json and create tags:

```bash
# For patch release (0.2.0 → 0.2.1)
npm version patch -m "chore: release v%s"
git push origin main --follow-tags

# For minor release (0.2.0 → 0.3.0)
npm version minor -m "chore: release v%s"
git push origin main --follow-tags

# For major release (0.2.0 → 1.0.0)
npm version major -m "chore: release v%s"
git push origin main --follow-tags
```

**What happens:**
1. `npm version` updates `package.json`
2. Creates a git commit with message "chore: release v0.2.1"
3. Creates a git tag `v0.2.1`
4. `git push --follow-tags` pushes both commit and tag
5. GitHub Actions automatically:
   - Runs CI tests (ci.yml)
   - Checks version match (version-check.yml)
   - Creates GitHub release (release.yml)
   - Publishes to npm (publish.yml)

---

## Manual Process (Not Recommended)

If you prefer manual control:

```bash
# 1. Update package.json version manually
vim package.json  # Change version to "0.2.1"

# 2. Update src/config/constants.ts
vim src/config/constants.ts  # Update SERVER_VERSION

# 3. Commit
git add package.json src/config/constants.ts
git commit -m "chore: release v0.2.1"

# 4. Create tag
git tag v0.2.1

# 5. Push
git push origin main --follow-tags
```

**⚠️ Problem:** Easy to forget updating one of the files or mismatch versions.

---

## Version Check

The `version-check.yml` workflow will fail if:
- Git tag version (e.g., `v0.2.1`) doesn't match `package.json` version (`0.2.1`)

This prevents publishing packages with wrong versions.

---

## Pre-release Checklist

Before running `npm version`:

- [ ] All tests pass locally: `npm run test:run`
- [ ] Linting passes: `npm run lint`
- [ ] Type checking passes: `npm run typecheck`
- [ ] Build succeeds: `npm run build`
- [ ] CHANGELOG.md updated (if exists)
- [ ] All changes committed
- [ ] On correct branch (`main`)

Quick check:
```bash
npm run check && npm run test:run && npm run build
```

---

## GitHub Actions Workflows

### Triggered by Tags

When you push a tag `v*.*.*`:

1. **version-check.yml** - Validates tag matches package.json
2. **release.yml** - Creates GitHub release with tarball
3. **publish.yml** - Publishes to npm (requires `NPM_TOKEN` secret)

### Triggered by Push/PR

- **ci.yml** - Full test suite
- **pr-check.yml** - Quick checks on PRs

---

## Troubleshooting

### "Tag version doesn't match package.json"

Fix:
```bash
# Remove the wrong tag
git tag -d v0.2.1
git push origin :refs/tags/v0.2.1

# Use npm version instead
npm version 0.2.1 -m "chore: release v%s"
git push origin main --follow-tags
```

### "Failed to publish to npm"

Check:
1. `NPM_TOKEN` secret is set in GitHub
2. You have publish permissions for the package
3. Version doesn't already exist on npm

### Forgot to update SERVER_VERSION constant

The constant in `src/config/constants.ts` should match package.json.

Auto-sync (add to package.json scripts):
```json
{
  "scripts": {
    "version": "node scripts/sync-version.js && git add src/config/constants.ts"
  }
}
```

Then create `scripts/sync-version.js`:
```javascript
const fs = require('fs');
const pkg = require('../package.json');
const constantsPath = 'src/config/constants.ts';

let content = fs.readFileSync(constantsPath, 'utf-8');
content = content.replace(
  /SERVER_VERSION = '[^']+'/,
  `SERVER_VERSION = '${pkg.version}'`
);
fs.writeFileSync(constantsPath, content);
console.log(`✅ Synced SERVER_VERSION to ${pkg.version}`);
```

---

## Best Practices

1. **Use npm version** - Prevents human error
2. **Test before release** - Run full check suite
3. **Semantic versioning** - Follow semver.org
4. **Write release notes** - GitHub releases auto-generate from commits
5. **Keep CHANGELOG** - Consider maintaining CHANGELOG.md

---

## Examples

### Patch Release (Bug Fix)

```bash
npm version patch -m "chore: release v%s"
git push origin main --follow-tags
```

### Minor Release (New Feature)

```bash
npm version minor -m "chore: release v%s"
git push origin main --follow-tags
```

### Pre-release (Beta)

```bash
npm version prerelease --preid=beta -m "chore: release v%s"
git push origin main --follow-tags
```

This creates: `0.2.1-beta.0`

---

## npm Commands Reference

```bash
# Current version
npm version

# Patch: 0.2.0 → 0.2.1
npm version patch

# Minor: 0.2.0 → 0.3.0
npm version minor

# Major: 0.2.0 → 1.0.0
npm version major

# Prerelease: 0.2.0 → 0.2.1-0
npm version prerelease

# Specific version
npm version 1.0.0

# Dry run (see what would happen)
npm version patch --dry-run
```

---

## Automation Options (Advanced)

### Option 1: semantic-release (Fully Automated)

Auto-releases based on commit messages:

```bash
npm install --save-dev semantic-release @semantic-release/git @semantic-release/github
```

Commits like:
- `fix: bug` → patch release
- `feat: new feature` → minor release
- `feat!: breaking change` → major release

### Option 2: release-please (Google)

Creates PR with version bump:

```yaml
# .github/workflows/release-please.yml
uses: google-github-actions/release-please-action@v3
```

**Current setup uses manual npm version - simple and predictable.**
