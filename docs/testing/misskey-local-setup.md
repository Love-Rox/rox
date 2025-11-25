# Local Misskey Test Environment Setup

**Purpose**: Setup a local Misskey instance for testing Rox's ActivityPub federation implementation.

**Estimated Time**: 30-60 minutes (faster than Mastodon)

---

## Prerequisites

- Docker and Docker Compose installed
- At least 2GB free RAM
- At least 5GB free disk space
- ngrok (for public URL)

---

## Option 1: Misskey Docker Compose (Recommended)

Misskey provides an official Docker setup that's simpler than Mastodon.

### Step 1: Clone Misskey Repository

```bash
cd /tmp
git clone https://github.com/misskey-dev/misskey.git
cd misskey
git checkout master  # or a specific version tag
```

### Step 2: Setup Configuration

```bash
# Copy example files
cp .config/docker_example.yml .config/default.yml
cp .config/docker_example.env .config/docker.env
```

Edit `.config/default.yml`:

```yaml
url: https://misskey.local  # Will be updated with ngrok URL later

port: 3000

# PostgreSQL configuration
db:
  host: db
  port: 5432
  db: misskey
  user: misskey
  pass: misskey_password

# Redis configuration
redis:
  host: redis
  port: 6379

# File storage
drive:
  storage: 'fs'  # Use filesystem for testing

# ID generation
id: 'aid'  # Use AID (recommended)
```

### Step 3: Build and Start Misskey

```bash
# Build Docker image (takes 10-15 minutes)
docker-compose build

# Initialize database
docker-compose run --rm web pnpm run init

# Start all services
docker-compose up -d

# Check status
docker-compose ps
```

Expected services:
- `web` - Misskey web server (port 3000)
- `db` - PostgreSQL database
- `redis` - Redis cache

### Step 4: Setup ngrok for Public Access

```bash
# In a new terminal
ngrok http 3000

# ngrok will output a URL like: https://xyz789.ngrok.io
# Copy this URL
```

Update `.config/default.yml`:

```yaml
url: https://xyz789.ngrok.io  # Replace with your ngrok URL
```

Restart Misskey:

```bash
docker-compose down
docker-compose up -d
```

### Step 5: Create Admin User

Access Misskey web UI:

```bash
open https://xyz789.ngrok.io
```

1. Click "Create Account" (新規登録)
2. Fill in:
   - Username: `alice`
   - Email: `alice@misskey.local`
   - Password: `test1234`
3. Confirm registration
4. Log in

To make the user admin (via Docker):

```bash
docker-compose exec web pnpm run ts-node packages/backend/src/tools/mark-admin.ts alice
```

### Step 6: Verify Installation

```bash
# Check WebFinger
curl "https://xyz789.ngrok.io/.well-known/webfinger?resource=acct:alice@xyz789.ngrok.io"

# Check NodeInfo
curl https://xyz789.ngrok.io/nodeinfo/2.1

# Check Actor
curl -H "Accept: application/activity+json" https://xyz789.ngrok.io/users/alice
```

---

## Option 2: Misskey Lightweight Fork (Firefish/Calckey)

For even lighter resource usage:

### Firefish (formerly Calckey)

```bash
cd /tmp
git clone https://github.com/firefish-dev/firefish.git
cd firefish

# Follow similar steps to Misskey
cp .config/docker_example.yml .config/default.yml
docker-compose build
docker-compose run --rm web pnpm run init
docker-compose up -d
```

Firefish is fork of Misskey with:
- Better performance
- More features
- Similar ActivityPub implementation

---

## Simplified Setup (Using Docker Hub Image)

If building from source is too slow:

### Step 1: Create docker-compose.yml

```yaml
version: '3'

services:
  web:
    image: misskey/misskey:latest
    restart: always
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    volumes:
      - ./files:/misskey/files
      - ./config:/misskey/.config:ro
    depends_on:
      - db
      - redis

  db:
    image: postgres:14-alpine
    restart: always
    environment:
      POSTGRES_DB: misskey
      POSTGRES_USER: misskey
      POSTGRES_PASSWORD: misskey_password
    volumes:
      - db-data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    restart: always
    volumes:
      - redis-data:/data

volumes:
  db-data:
  redis-data:
```

### Step 2: Create config/default.yml

```yaml
url: https://your-ngrok-url.ngrok.io

port: 3000

db:
  host: db
  port: 5432
  db: misskey
  user: misskey
  pass: misskey_password

redis:
  host: redis
  port: 6379

id: 'aid'

drive:
  storage: 'fs'
```

### Step 3: Start

```bash
# Create config directory
mkdir -p config files

# Start services
docker-compose up -d

# Initialize database (first time only)
docker-compose exec web pnpm run init
```

---

## Testing Checklist

### Verify Misskey is Running

- [ ] Web UI accessible at ngrok URL
- [ ] Can create account
- [ ] Can log in
- [ ] WebFinger endpoint responds
- [ ] Actor endpoint responds (application/activity+json)
- [ ] Can create notes
- [ ] Can react to notes (emoji reactions)

### Prepare for Rox Testing

- [ ] Note Misskey's public URL (ngrok)
- [ ] Create test user: `alice@<misskey-domain>`
- [ ] Create second test user: `bob@<misskey-domain>`
- [ ] Keep Misskey logs visible: `docker-compose logs -f web`

---

## Troubleshooting

### Database Connection Error

```bash
# Check if PostgreSQL is ready
docker-compose logs db

# Restart services in order
docker-compose down
docker-compose up -d db redis
sleep 10
docker-compose up -d web
```

### Assets Not Loading

```bash
# Rebuild assets
docker-compose exec web pnpm run build
docker-compose restart web
```

### ngrok URL Changes

When ngrok restarts:

```bash
# Update config/default.yml with new URL
url: https://new-url.ngrok.io

# Restart Misskey
docker-compose down
docker-compose up -d
```

### Port Conflict

```bash
# Change port in docker-compose.yml
ports:
  - "3001:3000"  # Use port 3001 instead
```

---

## Misskey-Specific Features to Test

### Emoji Reactions

Misskey uses custom emoji reactions (not just ⭐ like Mastodon):

```json
{
  "type": "Like",
  "content": ":heart:",
  "_misskey_reaction": "❤️"
}
```

### Renote (Boost/Announce)

Misskey has two types:
- Simple Renote (like Mastodon boost)
- Quote Renote (renote with comment)

### Drive (Media Storage)

Misskey has a built-in "Drive" for media management.

---

## Resource Management

### Stop Misskey

```bash
cd /tmp/misskey
docker-compose down
```

### Start Misskey

```bash
cd /tmp/misskey
docker-compose up -d
```

### View Logs

```bash
# All services
docker-compose logs -f

# Web server only
docker-compose logs -f web
```

### Clean Up

```bash
# Stop and remove everything
docker-compose down -v

# Remove repository
cd ..
rm -rf misskey
```

---

## Useful Commands

### Database Access

```bash
# Access PostgreSQL
docker-compose exec db psql -U misskey misskey

# Run migrations
docker-compose exec web pnpm run migrate
```

### User Management

```bash
# Make user admin
docker-compose exec web pnpm run ts-node packages/backend/src/tools/mark-admin.ts USERNAME

# Reset user password (if needed)
# Use web UI: Settings → Security → Change Password
```

### Clear Cache

```bash
# Clear Redis cache
docker-compose exec redis redis-cli FLUSHALL
```

---

## Comparison: Misskey vs Mastodon

| Feature | Misskey | Mastodon |
|---------|---------|----------|
| Resource Usage | Lower (~1GB RAM) | Higher (~3GB RAM) |
| Setup Time | Faster (30-60 min) | Slower (1-2 hours) |
| Build Time | Faster (10-15 min) | Slower (15-20 min) |
| Reactions | Custom emoji | Star only |
| Renote | Simple + Quote | Simple only |
| UI | More feature-rich | Simpler |

**Recommendation**: Start with Misskey if you have limited resources, or want faster setup.

---

## Next Steps

Once Misskey is running:

1. **Update federation-test-results.md** with Misskey environment details
2. **Create test users** on both Rox and Misskey
3. **Start Phase 1 tests** (Discovery)
4. **Test Misskey-specific features** (emoji reactions, quote renotes)

See [federation-test-plan.md](./federation-test-plan.md) for detailed test procedures.

---

**Document Version**: 1.0
**Last Updated**: 2025-11-25
**Status**: Ready for use
