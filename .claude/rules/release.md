# Release Procedure

## Version Files

Update version in **all** package.json files:

1. `/package.json` (root) - Project version using CalVer
2. `/packages/backend/package.json` - Package version using SemVer
3. `/packages/frontend/package.json` - Package version using SemVer
4. `/packages/shared/package.json` - Package version using SemVer

## Version Numbering Scheme

**Root version (CalVer)**: `YYYY.MM.patch[-stage.N]`
- Stable: `2025.12.0`, `2025.12.1`
- Prerelease: `2025.12.0-alpha.1`, `2025.12.0-beta.3`, `2025.12.0-rc.1`

**Package versions (SemVer)**: `MAJOR.MINOR.PATCH[-stage.N]`
- Stable: `1.0.0`, `1.0.1`, `1.1.0`
- Prerelease: `1.0.0-alpha.1`, `1.0.0-beta.3`, `1.0.0-rc.1`

## Version Examples

| Release Type | Root Version | Package Version |
| ------------ | ------------ | --------------- |
| First stable release | `2025.12.0` | `1.0.0` |
| Patch release | `2025.12.1` | `1.0.1` |
| Minor feature release | `2025.12.2` | `1.1.0` |
| Next alpha | `2026.1.0-alpha.1` | `1.2.0-alpha.1` |
| Beta after alpha | `2026.1.0-beta.1` | `1.2.0-beta.1` |
| Release candidate | `2026.1.0-rc.1` | `1.2.0-rc.1` |

## Prerelease Stages

1. **alpha**: Early development, unstable, breaking changes expected
2. **beta**: Feature complete, testing phase, may have bugs
3. **rc** (Release Candidate): Final testing, should be stable

## Git Tag

After committing version changes, create an annotated tag:

```bash
# Stable release
git tag -a v2025.12.0 -m "Release v2025.12.0"

# Prerelease
git tag -a v2025.12.0-beta.1 -m "Release v2025.12.0-beta.1"

# Push
git push origin <branch> && git push origin <tag>
```

## Release Checklist

1. Update all 4 package.json files with new version
2. Commit with message: `chore: bump version to X.X.X`
3. Create annotated git tag: `git tag -a vX.X.X -m "Release vX.X.X"`
4. Push commits and tag to remote
5. Create PR to main (if on dev branch)

**Note**: The auto-tag workflow automatically detects prerelease versions and marks them accordingly on GitHub releases.
