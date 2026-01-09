# Session Status - 2026-01-10 (Updated)

## Current Release: v2026.1.1

### Overall Status: ✅ STABLE RELEASE

| Check | Status | Notes |
|-------|--------|-------|
| TypeScript type check | ✅ Pass | All packages pass |
| Linting (oxlint) | ✅ Pass | 0 warnings, 0 errors |
| Unit tests | ✅ Pass | 841+ tests passing |
| Build | ✅ Pass | Backend and frontend build successfully |
| Translations | ✅ Complete | 1173 strings, 0 missing in Japanese |
| Docker configs | ✅ Ready | compose.yml, compose.dev.yml configured |
| DevContainer | ✅ Ready | Full setup with HTTPS, Claude Code |

### Package Versions
- Root: `2026.1.1` (CalVer)
- packages/backend: `1.3.1` (SemVer)
- packages/frontend: `1.3.1` (SemVer)
- packages/shared: `1.3.1` (SemVer)

## Recent Changes (v2026.1.1)

### Discord/ActivityPub Embed Improvements (PR #121)
- **OGP Meta Tags**: Fixed for proper Discord link previews with SSR
- **ActivityPub Notes**: Improved formatting with proper HTML content
- **Nginx Routing**: 404 fallthrough from backend to frontend for SSR
- **Custom Emoji Support**: Added emoji tags in ActivityPub notes
- **URL Handling**: Improved avatar URL and mention URI handling

### DM Log Privacy (PR #123)
- **Privacy Enhancement**: Log only recipient counts instead of full user ID arrays
- **Log Level**: Changed DM-related logs from info to debug level

### Code Quality (v2026.1.1 patch)
- Added GH_TOKEN to release workflow for GitHub API authentication
- Fixed textToHtml to handle CRLF and CR line endings
- Use plain text for ActivityPub summary field (CW) for Fediverse interop
- Updated nginx config to remove unused embed crawler detection map
- Added INTERNAL_API_URL to production Docker Compose for SSR

### Removed
- Plugin system infrastructure (unused, planned for future v2)

## Development Environment

```bash
# Standard dev command
DB_TYPE=postgres \
DATABASE_URL="postgresql://rox:rox_dev_password@localhost:5432/rox" \
STORAGE_TYPE=local LOCAL_STORAGE_PATH=./uploads \
PORT=3000 NODE_ENV=development URL=http://localhost:3000 \
bun run dev
```

## Frontend Development

```bash
cd packages/frontend
bun run dev  # Runs on port 3001
```

## Key Features

- ActivityPub federation (Follow, Create, Like, Announce, Delete, Move)
- Misskey-compatible API endpoints
- Multi-database support (PostgreSQL, MySQL, SQLite/D1)
- S3-compatible storage support
- Redis/Dragonfly caching
- BullMQ job queue for async delivery
- Role-based access control (Admin, Moderator)
- User moderation (warnings, suspensions, reports)
- Account migration support (Move activity)
- Custom emoji management
- MFM (Misskey Flavored Markdown) support
- List feature (create, manage, timeline)
- Web Push notifications
- Discord-compatible OGP embeds

## Potential Next Steps
1. Performance optimizations (query caching, response optimization)
2. Plugin architecture implementation (design complete in memory)
3. Image optimization improvements
4. Mobile UX refinements
5. Mentions field consistency fix (usernames vs user IDs)
