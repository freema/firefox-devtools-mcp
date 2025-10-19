# Code Review – CI Fix: Duplicate Workflow Runs

Date: 2025-10-19

## Problem

Two workflows were running on every PR:
- **CI workflow** (`ci.yml`) - triggered on `pull_request` to main
- **PR Check workflow** (`pr-check.yml`) - triggered on `pull_request`

This caused:
- ❌ Duplicate runs on every PR (wasting CI minutes)
- ❌ Redundant checks (same linting, format, typecheck)
- ❌ Confusion (which workflow to check?)

**Screenshot evidence**: User showed 2 workflows running simultaneously on PR #1:
- CI #2: In progress
- PR Check #2: In progress

## Solution

Removed `pull_request` trigger from `ci.yml`:

**Before**:
```yaml
on:
  push:
    branches: [main, develop]
  pull_request:              # ← Removed this!
    branches: [main]
```

**After**:
```yaml
on:
  push:
    branches: [main, develop]
```

## Workflow separation

Now we have clear separation:

### CI workflow (`ci.yml`)
- **Triggers**: Push to `main` or `develop` only
- **Purpose**: Full validation before merging/after merge
- **Matrix**: Node 20 + 22
- **Includes**: Coverage upload, artifact upload

### PR Check workflow (`pr-check.yml`)
- **Triggers**: Pull requests only (opened, synchronize, reopened)
- **Purpose**: Fast feedback on PRs
- **Node**: 22 only (faster, single version)
- **Includes**: Lint, format, typecheck (no tests, no build)

## Benefits

✅ **No duplicate runs**: Each PR now triggers only PR Check workflow
✅ **Faster PR feedback**: pr-check.yml is lightweight (no tests/build)
✅ **CI minutes saved**: ~50% reduction in workflow runs
✅ **Clear purpose**: CI = post-merge validation, PR Check = pre-merge validation

## Expected behavior

### On PR creation/update:
```
✓ PR Check #X (Node 22, fast checks only)
```

### On push to main:
```
✓ CI #X (Node 20 + 22, full suite + coverage + artifacts)
```

### On push to develop:
```
✓ CI #X (Node 20 + 22, full suite)
```

## Alternative considered

**Option A**: Keep both, add path filters
```yaml
# ci.yml
on:
  pull_request:
    paths:
      - 'src/**'
      - 'tests/**'
```

**Rejected**: Still confusing, still some duplication.

**Option B**: Remove pr-check.yml, keep only ci.yml
**Rejected**: CI is heavy (tests + build + 2 Node versions), slow PR feedback.

**Option C** (chosen): Separate concerns - fast PR checks vs full CI.

## Testing

User should verify on next PR:
1. Only PR Check workflow runs
2. CI workflow does NOT run
3. After merge to main, CI workflow runs

## Related files

- `.github/workflows/ci.yml` - Modified (removed pull_request trigger)
- `.github/workflows/pr-check.yml` - Unchanged
- `tasks/ACTIONS-02-github-actions-implementation.md` - Original design (should be updated)

## Impact

- ✅ Immediate: No more duplicate runs
- ✅ Cost: Saves CI minutes (important for free tier)
- ✅ UX: Clearer workflow runs page
- ⚠️ Note: Main/develop still get full CI with both Node versions

---

**User feedback**: User correctly identified the duplicate runs as problematic. Good catch!
