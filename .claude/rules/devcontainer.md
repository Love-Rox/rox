# DevContainer Development

This project includes a fully configured DevContainer for VS Code and Cursor.

## Quick Start

1. Open the project in VS Code or Cursor
2. Click "Reopen in Container" when prompted
3. Wait for container build and post-create script
4. Run `bun run dev` to start development servers

## Included Services

| Service | Port | Description |
|---------|------|-------------|
| PostgreSQL | 5432 | Primary database |
| MariaDB | 3306 | MySQL compatibility testing |
| Dragonfly | 6379 | Redis-compatible cache/queue |
| Nginx | 443, 80 | HTTPS reverse proxy with mkcert |

## Pre-installed Tools

- **Bun** - JavaScript runtime and package manager
- **Node.js 20** - For npm packages requiring Node
- **Claude Code CLI** - AI-powered coding assistant
- **mkcert** - Local HTTPS certificate generation

## VS Code Extensions (Auto-installed)

- oxc (formatter/linter)
- Tailwind CSS IntelliSense
- Docker
- GitHub Copilot
- GitLens
- Error Lens
- Path Intellisense

## HTTPS Development

- Access at `https://localhost` after starting dev server
- Certificates auto-generated via mkcert on first container creation
- Stored in `docker/certs/` (gitignored)

## Claude Code in DevContainer

Configuration and history are persisted in `.claude/` directory:

```bash
# First-time setup
claude login

# Or set API key in .devcontainer/.env
echo "ANTHROPIC_API_KEY=your-key" >> .devcontainer/.env
```

## Docker Compose Files

| File | Purpose |
|------|---------|
| `docker/compose.yml` | Production deployment |
| `docker/compose.dev.yml` | Local development (without DevContainer) |
| `.devcontainer/compose.yml` | DevContainer services |
