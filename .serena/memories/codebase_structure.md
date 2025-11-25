# Codebase Structure

## Repository Layout

```
rox/
├── packages/              # Monorepo workspaces
│   ├── backend/          # Hono Rox (API server)
│   ├── frontend/         # Waku Rox (web client)
│   └── shared/           # Common types and utilities
├── docs/                 # Documentation
│   ├── implementation/   # Implementation guides (phase-*.md)
│   ├── project/          # Project specifications (v1.md)
│   └── activitypub-test-results.md
├── typedoc/              # Generated API documentation
├── .serena/              # Serena MCP server memory
├── .claude/              # Claude Code configuration
├── compose.yml           # Docker Compose configuration
├── package.json          # Root package.json (workspace config)
├── tsconfig.json         # TypeScript configuration
├── oxlint.json           # Linting configuration
├── CLAUDE.md             # AI assistant instructions
├── CONTRIBUTING.md       # Contributing guidelines
└── README.md             # Project overview
```

## Backend Structure (packages/backend/src)

```
packages/backend/src/
├── adapters/             # Infrastructure adapters (Adapter Pattern)
│   └── storage/
│       ├── LocalStorageAdapter.ts    # Local filesystem storage
│       └── S3StorageAdapter.ts       # S3-compatible storage
│
├── db/                   # Database configuration and schemas
│   ├── schema/
│   │   ├── pg.ts        # PostgreSQL schema
│   │   ├── mysql.ts     # MySQL/MariaDB schema
│   │   └── sqlite.ts    # SQLite/D1 schema
│   ├── index.ts         # Database connection initialization
│   └── migrate.ts       # Migration runner
│
├── di/                   # Dependency Injection
│   └── container.ts     # DI container (creates repositories/adapters)
│
├── interfaces/           # Abstract interfaces
│   ├── IFileStorage.ts  # Storage adapter interface
│   └── repositories/    # Repository interfaces (not yet created as separate files)
│
├── middleware/           # Hono middleware
│   ├── auth.ts          # Authentication middleware (requireAuth)
│   └── httpSignature.ts # HTTP Signature verification (ActivityPub)
│
├── repositories/         # Database operations (Repository Pattern)
│   ├── pg/              # PostgreSQL implementations
│   ├── mysql/           # MySQL implementations
│   └── d1/              # D1/SQLite implementations
│
├── routes/               # API endpoints (Hono routes)
│   ├── ap/              # ActivityPub endpoints
│   │   ├── actor.ts     # Actor document endpoint
│   │   ├── webfinger.ts # WebFinger discovery
│   │   ├── inbox.ts     # Inbox endpoint
│   │   ├── outbox.ts    # Outbox endpoint
│   │   ├── followers.ts # Followers collection
│   │   ├── following.ts # Following collection
│   │   └── note.ts      # ActivityPub Note object
│   ├── auth.ts          # Authentication endpoints
│   ├── notes.ts         # Note CRUD endpoints
│   ├── users.ts         # User endpoints
│   ├── reactions.ts     # Reaction endpoints
│   ├── following.ts     # Follow/unfollow endpoints
│   └── drive.ts         # File upload/drive endpoints
│
├── services/             # Business logic layer
│   ├── ap/              # ActivityPub services
│   │   ├── ActivityDeliveryQueue.ts      # BullMQ queue/worker
│   │   ├── ActivityDeliveryService.ts    # HTTP delivery with signatures
│   │   ├── ActivityPubDeliveryService.ts # High-level delivery service
│   │   ├── RemoteActorService.ts         # Remote actor fetching/caching
│   │   └── RemoteNoteService.ts          # Remote note handling
│   ├── AuthService.ts    # Authentication logic
│   ├── NoteService.ts    # Note creation/deletion (with AP delivery)
│   ├── FollowService.ts  # Follow/unfollow logic
│   ├── ReactionService.ts # Reaction logic
│   └── FileService.ts    # File upload/download logic
│
├── tests/                # Test files
│   └── integration/      # Integration tests
│
├── utils/                # Utility functions
│   ├── crypto.ts        # Cryptography (key generation, signatures)
│   └── id.ts            # ID generation utilities
│
└── index.ts              # Application entry point
```

## Frontend Structure (packages/frontend/src)

```
packages/frontend/src/
├── components/           # React components
│   ├── ui/              # Base UI components (Button, Input, etc.)
│   └── features/        # Feature-specific components
│
├── pages/               # Waku pages (RSC)
│   ├── _layout.tsx     # Root layout
│   └── [username].tsx  # User profile page
│
├── lib/                 # Utilities and libraries
│   ├── api.ts          # API client functions
│   └── i18n.ts         # Lingui i18n configuration
│
├── stores/              # Jotai stores (state management)
│
├── styles/              # Global styles
│   └── globals.css     # Tailwind CSS imports
│
└── entries.tsx          # Waku entry point
```

## Shared Package (packages/shared/src)

```
packages/shared/src/
├── types/               # Shared TypeScript types
│   ├── api.ts          # API request/response types
│   ├── note.ts         # Note types
│   ├── user.ts         # User types
│   └── activitypub.ts  # ActivityPub types
└── index.ts             # Export barrel
```

## Key Files

### Configuration Files

- `package.json` - Workspace configuration, scripts
- `tsconfig.json` - TypeScript compiler options (strict mode)
- `oxlint.json` - Linting rules
- `.env` - Environment variables (not in git)
- `.env.example` - Environment variable template
- `compose.yml` - Docker services (PostgreSQL, Dragonfly/Redis)

### Documentation Files

- `CLAUDE.md` - Instructions for AI assistants
- `CONTRIBUTING.md` - Contributing guidelines
- `README.md` - Project overview and quick start
- `docs/implementation/phase-3-federation.md` - ActivityPub implementation guide
- `docs/activitypub-test-results.md` - Test results

## Database Schema

All database types share common tables:
- **users**: User accounts, profiles, public/private keys
- **sessions**: Authentication sessions
- **notes**: Posts/notes with content, visibility, attachments
- **reactions**: Emoji reactions to notes
- **follows**: Follow relationships
- **driveFiles**: File metadata for uploads

Schema files maintain parity across:
- PostgreSQL (`db/schema/pg.ts`)
- MySQL (`db/schema/mysql.ts`)
- SQLite (`db/schema/sqlite.ts`)

## Import Paths

The project uses TypeScript's `moduleResolution: "bundler"` which allows:
- Relative imports: `../utils/crypto`
- Package imports: `rox_shared` (workspace package)
- Extension-inclusive imports: `./file.ts` (required with `allowImportingTsExtensions`)

## Build Artifacts

Build outputs and generated files (ignored by git):
- `packages/backend/dist/` - Backend build output
- `packages/frontend/.waku/` - Waku build cache
- `node_modules/` - Dependencies
- `typedoc/` - Generated API docs
- `.env` - Local environment variables
