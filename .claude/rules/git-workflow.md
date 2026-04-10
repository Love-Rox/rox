# Git Workflow Rules

## Branch Strategy

```
feature/* ──PR──> dev ──PR──> main (release only)
                                │
                                └──> dev (auto-synced by GitHub Actions)
```

## Rules

### 1. Always use feature branches
- **Never commit directly to `dev` or `main`**
- Create a feature branch from `dev` for every change (e.g., `fix/emoji-size`, `chore/bump-version`, `feat/new-feature`)
- Branch naming: `{type}/{short-description}` (types: feat, fix, chore, docs, refactor)

### 2. PRs always target `dev`
- All feature branch PRs merge into `dev`
- Wait for CI to pass before merging
- Delete the feature branch after merge

### 3. Releases merge `dev` into `main`
- Only create a `dev` → `main` PR for stable version releases
- The PR should contain **all commits since the last stable release** as a single merge
- PR title: `Release vX.X.X`
- PR body: Summary of all changes (features, fixes, docs, maintenance)
- After merging to main:
  - The `auto-tag` workflow automatically creates a Git tag and GitHub Release with categorized changelog
  - The `sync-dev` workflow automatically fast-forwards `dev` to match `main`

### 4. Version bumps
- Beta/prerelease versions: bump on `dev` via feature branch PR
- Stable versions: bump in the same feature branch as the release PR to `dev`, then merge `dev` → `main`

## Summary of automation
| Event | Automated by |
|-------|-------------|
| Tag + Release creation on main | `auto-tag.yml` |
| dev sync after main merge | `sync-dev.yml` |
| CI checks on PRs | `ci.yml` |
