# Rox Technology Stack

## Runtime & Language

| Technology | Purpose |
|------------|---------|
| **Bun** | JavaScript runtime, package manager, test runner |
| **TypeScript** | Primary language with strict typing |

## Backend (packages/backend)

| Technology | Purpose |
|------------|---------|
| **Hono** | Ultra-lightweight web framework with edge compatibility |
| **Drizzle ORM** | TypeScript-first ORM with multi-DB support |
| **BullMQ** | Job queue for async ActivityPub delivery |
| **ioredis** | Redis/Dragonfly client for caching |
| **Sharp** | Image processing |
| **Zod** | Runtime schema validation |
| **Pino** | Structured logging |

### Supported Databases

- **PostgreSQL** (recommended for production)
- **MySQL/MariaDB** (planned)
- **SQLite/Cloudflare D1** (planned for edge)

### Supported Storage

- **Local filesystem** (development)
- **S3-compatible** (AWS S3, Cloudflare R2, MinIO)

## Frontend (packages/frontend)

| Technology | Purpose |
|------------|---------|
| **Waku** | React framework with RSC support |
| **React 19** | UI library |
| **Jotai** | Atomic state management |
| **React Aria Components** | Accessible headless UI |
| **Tailwind CSS 4** | Utility-first styling |
| **Lingui** | Internationalization (i18n) |
| **Lucide React** | Icons |
| **class-variance-authority** | Component variant styling |

## Development Tools

| Tool | Purpose |
|------|---------|
| **oxlint** | Rust-based linter (replaces ESLint) |
| **TypeScript** | Type checking |
| **Drizzle Kit** | DB migrations |
| **TypeDoc** | API documentation generation |

## Testing

- **Bun Test** - Built-in test runner
- Unit tests: `packages/backend/src/tests/unit/`
- Integration tests: `packages/backend/src/tests/integration/`
- E2E tests: `packages/backend/src/tests/e2e/`

## CI/CD

- **GitHub Actions** - CI pipeline
  - Lint & type check
  - Unit tests
  - Build verification
