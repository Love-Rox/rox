# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

**Rox** is a lightweight ActivityPub server & client designed to be:

- **Lighter and faster** than existing Misskey instances
- **Infrastructure agnostic** - runs on traditional VPS (Docker) or edge environments
- **Misskey API compatible** for seamless migration of existing users

**Component Names:**
- Backend: **Hono Rox**
- Frontend: **Waku Rox**

## Technology Stack

| Category | Technology | Purpose |
|----------|-----------|---------|
| Runtime | Bun | Fast JavaScript runtime, package manager, and test runner |
| Language | TypeScript | Type safety and development efficiency |
| Backend Framework | Hono | Ultra-lightweight, web standards-compliant framework |
| Frontend Framework | Waku | React Server Components (RSC) native support |
| State Management | Jotai | Atomic state management with minimal re-renders |
| UI Components | React Aria Components | Accessible, headless UI components |
| Styling | Tailwind CSS | Utility-first CSS |
| Internationalization | Lingui | Readable, automated i18n |
| ORM | Drizzle ORM | TypeScript-first, lightweight ORM |
| Queue | Dragonfly / BullMQ | Async job processing for ActivityPub delivery |
| Code Quality | oxc | Rust-based linting and formatting |

## Development Commands

```bash
# Development
bun run dev              # Both backend and frontend
bun run dev:backend      # Backend only
bun run dev:frontend     # Frontend only

# Build & Start
bun run build            # Production build
bun run start            # Start production server

# Testing
bun test                 # All tests
bun run test:unit        # Unit tests
bun run test:integration # Integration tests
bun run test:backend     # Backend tests

# Database
bun run db:generate      # Generate migrations
bun run db:migrate       # Run migrations
bun run db:studio        # Open Drizzle Studio

# Code Quality
bun run typecheck        # Type checking
bun run lint             # Linting
bun run format           # Format code

# i18n
bun run lingui:extract   # Extract translation strings
bun run lingui:compile   # Compile translations
```

## Environment Configuration

```ini
# Database
DB_TYPE=postgres
DATABASE_URL=<connection-string>

# Storage
STORAGE_TYPE=local|s3

# S3 (when STORAGE_TYPE=s3)
S3_ENDPOINT=<endpoint-url>
S3_BUCKET_NAME=<bucket>
S3_ACCESS_KEY=<key>
S3_SECRET_KEY=<secret>
S3_REGION=<region>

# Application
PORT=3000
NODE_ENV=development|production
URL=<public-url>
ENABLE_REGISTRATION=true|false
SESSION_EXPIRY_DAYS=30
```

## Supported Infrastructure

**Databases (DB_TYPE):**
- PostgreSQL (default/recommended)
- MySQL / MariaDB (planned)
- SQLite (planned)

**Storage (STORAGE_TYPE):**
- `local`: Local filesystem (development)
- `s3`: S3-compatible storage (AWS S3, Cloudflare R2, MinIO)

## Non-Functional Requirements

**Security:**
- Strict HTTP Signatures validation for federated requests
- ORM usage prevents SQL injection
- React/Waku default escaping prevents XSS

**Performance:**
- SSR/RSC for fast First Contentful Paint
- Optional WebP conversion for images
- Database query optimization per implementation

**Extensibility:**
- Core logic loosely coupled for future plugin system
- Interface-driven design enables swapping implementations

## Detailed Guidelines

For detailed guidelines, see `.claude/rules/`:

| File | Contents |
|------|----------|
| `tsdoc.md` | TSDoc documentation standards |
| `react-aria.md` | React Aria Components usage |
| `architecture.md` | Core architecture patterns |
| `release.md` | Release versioning procedure |
| `devcontainer.md` | DevContainer setup |
| `mcp-servers.md` | MCP server usage |
| `discord-logger.md` | Discord conversation logging |

## Historical Documentation

- `docs/implementation/` - Phase-by-phase implementation records
- `docs/implementation/archive/` - Completed task summaries
- `docs/project/v1.md` - Original specification (Japanese)
- `docs/project/v1.en.md` - Original specification (English)
