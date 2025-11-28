# Rox Codebase Structure

## Monorepo Layout

```
rox/
├── packages/
│   ├── backend/              # Hono Rox - API server
│   │   ├── src/
│   │   │   ├── adapters/     # Storage, cache adapters
│   │   │   ├── db/           # Drizzle schema & migrations
│   │   │   ├── di/           # DI container
│   │   │   ├── interfaces/   # Repository interfaces
│   │   │   ├── lib/          # Utilities, validation
│   │   │   ├── middleware/   # Hono middleware
│   │   │   ├── repositories/ # Data access (pg/)
│   │   │   ├── routes/       # API endpoints
│   │   │   ├── services/     # Business logic
│   │   │   ├── tests/        # Test suites
│   │   │   └── index.ts      # Entry point
│   │   ├── drizzle/          # DB migrations
│   │   └── package.json
│   │
│   ├── frontend/             # Waku Rox - React client
│   │   ├── src/
│   │   │   ├── components/   # UI components
│   │   │   ├── hooks/        # Custom hooks
│   │   │   ├── lib/          # API client, atoms
│   │   │   ├── locales/      # i18n (en, ja)
│   │   │   ├── pages/        # Route pages
│   │   │   └── styles/       # Global CSS
│   │   └── package.json
│   │
│   └── shared/               # Shared utilities
│       └── src/
│           ├── types/        # Shared TypeScript types
│           └── index.ts
│
├── docker/                   # Docker configs
├── docs/                     # Documentation
│   ├── deployment/           # Deployment guides
│   └── project/              # Spec documents
│
├── .github/workflows/        # CI/CD
├── .serena/memories/         # Serena memories (this!)
│
├── CLAUDE.md                 # Claude Code guidance
├── package.json              # Root package (workspaces)
├── oxlint.json               # Linter config
├── compose.yml               # Docker Compose
└── tsconfig.json             # TypeScript base config
```

## Key Files

### Backend
- `src/index.ts` - App entry, route registration
- `src/di/container.ts` - DI container setup
- `src/middleware/di.ts` - Injects container into Hono context
- `src/middleware/auth.ts` - Authentication middleware
- `src/db/schema/pg.ts` - PostgreSQL schema
- `drizzle.config.ts` - Drizzle ORM config

### Frontend
- `src/pages/_layout.tsx` - Root layout
- `src/components/AppProviders.tsx` - Context providers
- `src/lib/api/client.ts` - API client
- `src/lib/atoms/auth.ts` - Auth state (Jotai)
- `lingui.config.ts` - i18n config

### Config Files
- `package.json` - Root (monorepo scripts)
- `oxlint.json` - Linter rules
- `tsconfig.json` - TypeScript config
- `.env.example` - Environment variables template
