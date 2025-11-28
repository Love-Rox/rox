# Rox Development Commands

## Quick Start

```bash
# Install dependencies
bun install

# Start development (both backend and frontend)
bun run dev

# Or start individually
bun run backend:dev   # Backend only
bun run frontend:dev  # Frontend only
```

## Backend Development

```bash
# Start backend with PostgreSQL
DB_TYPE=postgres \
DATABASE_URL="postgresql://rox:rox_dev_password@localhost:5432/rox" \
STORAGE_TYPE=local LOCAL_STORAGE_PATH=./uploads \
PORT=3000 NODE_ENV=development URL=http://localhost:3000 \
bun run dev

# Type check
cd packages/backend && bun run typecheck

# Run tests
cd packages/backend && bun test                    # All tests
cd packages/backend && bun test src/tests/unit/    # Unit tests only
cd packages/backend && bun test src/tests/integration/  # Integration tests

# Build
cd packages/backend && bun run build
```

## Database Operations

```bash
# Generate migration after schema changes
cd packages/backend && DB_TYPE=postgres DATABASE_URL="..." bun run db:generate

# Apply migrations
cd packages/backend && DB_TYPE=postgres DATABASE_URL="..." bun run db:migrate

# Open Drizzle Studio (DB GUI)
cd packages/backend && DB_TYPE=postgres DATABASE_URL="..." bun run db:studio
```

## Frontend Development

```bash
# Start frontend dev server
cd packages/frontend && bun run dev

# Type check
cd packages/frontend && bun run typecheck

# Build
cd packages/frontend && bun run build

# Extract translations
cd packages/frontend && bun run lingui:extract

# Compile translations
cd packages/frontend && bun run lingui:compile
```

## Code Quality

```bash
# Lint (from root)
bun run lint

# Auto-fix lint issues
bun run format

# Type check all packages
bun run typecheck
```

## Docker

```bash
# Start with Docker Compose
docker compose up -d

# View logs
docker compose logs -f

# Stop
docker compose down
```

## Git Workflow

```bash
# Check status
git status

# Create feature branch
git checkout -b feat/feature-name

# Commit with conventional commit format
git commit -m "feat: add user warning system"
git commit -m "fix: resolve pagination issue"
git commit -m "docs: update API documentation"
```

## Environment Variables

Required for backend:
```bash
DB_TYPE=postgres
DATABASE_URL=postgresql://user:pass@host:5432/db
STORAGE_TYPE=local
LOCAL_STORAGE_PATH=./uploads
PORT=3000
NODE_ENV=development
URL=http://localhost:3000
```

Optional:
```bash
REDIS_URL=redis://localhost:6379  # For caching/queue
S3_ENDPOINT=...                   # For S3 storage
```

## Documentation

```bash
# Generate TypeDoc
bun run typedoc

# View at typedoc/index.html
```
