# Suggested Commands

## Essential Development Commands

### Setup and Installation

```bash
# Install dependencies
bun install

# Copy environment template
cp .env.example .env
# Then edit .env with appropriate values
```

### Development Servers

```bash
# Start all services (backend + frontend)
bun run dev

# Start backend only
bun run backend:dev

# Start frontend only
bun run frontend:dev
```

### Database Management

```bash
# Generate database migrations
bun run db:generate

# Run database migrations
bun run db:migrate

# Open Drizzle Studio (database GUI)
bun run db:studio
```

### Code Quality

```bash
# Type checking (all packages)
bun run typecheck

# Linting (check for issues)
bun run lint

# Formatting (auto-fix issues)
bun run format

# Run all checks before committing
bun run lint && bun run typecheck && bun test
```

### Testing

```bash
# Run all tests
bun test

# Run specific test file
bun test src/services/AuthService.test.ts

# Run tests in watch mode
bun test --watch
```

### Documentation

```bash
# Generate TypeDoc API documentation
bun run typedoc
# Output: ./typedoc/ directory
```

## Docker Commands

### Start Infrastructure Services

```bash
# Start PostgreSQL and Dragonfly (Redis)
docker compose up -d

# Check service health
docker compose ps

# View logs
docker compose logs -f

# Stop services
docker compose down
```

### MySQL Support (Optional)

```bash
# Start with MySQL instead of PostgreSQL
docker compose --profile mysql up -d
```

### Database Access

```bash
# PostgreSQL CLI
PGPASSWORD=rox_dev_password psql -h localhost -U rox -d rox

# MySQL CLI (if using MySQL profile)
mysql -h localhost -u rox -prox_dev_password rox
```

## Build and Production

```bash
# Build all packages
bun run build

# Build backend only
bun run --filter backend build

# Build frontend only
bun run --filter frontend build

# Start production server (after build)
bun run --filter backend start
```

## Workspace Commands

```bash
# Run command in specific package
bun run --filter backend [command]
bun run --filter frontend [command]
bun run --filter shared [command]

# Run command in all packages
bun run --filter '*' [command]
```

## Git Workflow

```bash
# Create feature branch
git checkout -b feat/your-feature

# Commit with conventional commits
git commit -m "feat(scope): description"

# Push to remote
git push origin feat/your-feature
```

## Utility Commands (macOS)

### File Operations
```bash
# Find files
find . -name "*.ts" -type f

# Search in files
grep -r "searchterm" src/

# List directory tree
tree -L 3 -I node_modules
```

### Process Management
```bash
# Find process by port
lsof -i :3000

# Kill process by PID
kill -9 [PID]
```

### System Information
```bash
# Check Bun version
bun --version

# Check Node version (if needed)
node --version

# Check Docker version
docker --version
```

## Environment-Specific Commands

### PostgreSQL Environment
```bash
DB_TYPE=postgres DATABASE_URL="postgresql://rox:rox_dev_password@localhost:5432/rox" bun run dev
```

### SQLite Environment
```bash
DB_TYPE=sqlite DATABASE_URL="sqlite://./rox.db" bun run dev
```

### With Federation Enabled
```bash
ENABLE_FEDERATION=true bun run dev
```

## Troubleshooting

```bash
# Clear build cache
rm -rf packages/*/dist packages/*/.waku

# Reinstall dependencies
rm -rf node_modules packages/*/node_modules
bun install

# Reset database (WARNING: destroys data)
docker compose down -v
docker compose up -d
bun run db:migrate
```
