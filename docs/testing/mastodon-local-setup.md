# Local Mastodon Test Environment Setup

**Purpose**: Setup a local Mastodon instance for testing Rox's ActivityPub federation implementation.

**Estimated Time**: 1-2 hours (initial setup)

---

## Prerequisites

- Docker and Docker Compose installed
- At least 4GB free RAM
- At least 10GB free disk space
- ngrok (for public URL)

---

## Option 1: Mastodon Development Docker (Recommended for Testing)

This is the simplest approach using the official Mastodon Docker setup.

### Step 1: Clone Mastodon Repository

```bash
cd /tmp
git clone https://github.com/mastodon/mastodon.git
cd mastodon
git checkout stable  # Use stable branch for testing
```

### Step 2: Setup Environment

```bash
# Copy example environment file
cp .env.production.sample .env.production

# Generate secrets
docker-compose run --rm web bundle exec rake secret
# Copy the output, you'll need it 3 times for:
# - SECRET_KEY_BASE
# - OTP_SECRET
# - VAPID_PRIVATE_KEY and VAPID_PUBLIC_KEY (run rake mastodon:webpush:generate_vapid_key)
```

Edit `.env.production`:

```bash
# Basic configuration
LOCAL_DOMAIN=mastodon.local
SINGLE_USER_MODE=false
RAILS_ENV=production

# Database (using Docker Compose defaults)
DB_HOST=db
DB_PORT=5432
DB_NAME=mastodon_production
DB_USER=mastodon
DB_PASS=mastodon_password

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# Secrets (generate with: docker-compose run --rm web bundle exec rake secret)
SECRET_KEY_BASE=<generated-secret-1>
OTP_SECRET=<generated-secret-2>

# VAPID keys (generate with: docker-compose run --rm web bundle exec rake mastodon:webpush:generate_vapid_key)
VAPID_PRIVATE_KEY=<generated-vapid-private>
VAPID_PUBLIC_KEY=<generated-vapid-public>

# Email (optional for testing, can use letter_opener)
SMTP_SERVER=smtp.mailgun.org
SMTP_PORT=587
SMTP_LOGIN=
SMTP_PASSWORD=
SMTP_FROM_ADDRESS=notifications@mastodon.local

# File storage (local for testing)
S3_ENABLED=false

# Registration
ALLOW_REGISTRATION=true
REQUIRE_APPROVAL=false
```

### Step 3: Build and Start Mastodon

```bash
# Build images (takes 10-20 minutes)
docker-compose build

# Setup database
docker-compose run --rm web rails db:migrate
docker-compose run --rm web rails db:seed

# Start all services
docker-compose up -d

# Check status
docker-compose ps
```

Expected services:
- `web` - Mastodon web server (port 3000)
- `streaming` - Streaming API (port 4000)
- `sidekiq` - Background jobs
- `db` - PostgreSQL database
- `redis` - Redis cache

### Step 4: Create Admin User

```bash
docker-compose run --rm web bin/tootctl accounts create \
  alice \
  --email alice@mastodon.local \
  --confirmed \
  --role Owner

# Output will include a password, save it!
```

### Step 5: Setup ngrok for Public Access

Mastodon requires HTTPS for federation. Use ngrok to expose the local instance:

```bash
# In a new terminal
ngrok http 3000

# ngrok will output a URL like: https://abc123.ngrok.io
# Copy this URL
```

Update `.env.production`:

```bash
LOCAL_DOMAIN=abc123.ngrok.io  # Replace with your ngrok URL (without https://)
```

Restart Mastodon:

```bash
docker-compose down
docker-compose up -d
```

### Step 6: Verify Installation

```bash
# Check WebFinger
curl https://abc123.ngrok.io/.well-known/webfinger?resource=acct:alice@abc123.ngrok.io

# Check instance info
curl https://abc123.ngrok.io/api/v1/instance

# Access web UI
open https://abc123.ngrok.io
```

Log in with:
- Username: `alice`
- Password: (from Step 4 output)

---

## Option 2: Lightweight Mastodon (GoToSocial)

If Mastodon is too resource-intensive, consider GoToSocial (Mastodon-compatible, written in Go):

### Step 1: Download GoToSocial

```bash
cd /tmp
wget https://github.com/superseriousbusiness/gotosocial/releases/download/v0.12.0/gotosocial_0.12.0_linux_amd64.tar.gz
tar -xzf gotosocial_0.12.0_linux_amd64.tar.gz
cd gotosocial
```

### Step 2: Generate Configuration

```bash
./gotosocial --config-path ./config.yaml init
```

Edit `config.yaml`:

```yaml
# Basic settings
host: "gotosocial.local"
account-domain: "gotosocial.local"
protocol: "https"
bind-address: "0.0.0.0"
port: 8080

# Database (SQLite for simplicity)
db-type: "sqlite"
db-address: "./gotosocial.db"

# Media storage
storage-local-base-path: "./storage"

# Accounts
accounts-registration-open: true
accounts-approval-required: false
```

### Step 3: Start GoToSocial

```bash
# Start server
./gotosocial --config-path ./config.yaml server start &

# Setup ngrok
ngrok http 8080

# Create admin user
./gotosocial --config-path ./config.yaml admin account create \
  --username alice \
  --email alice@gotosocial.local \
  --password test1234
```

---

## Testing Checklist

### Verify Mastodon is Running

- [ ] Web UI accessible at ngrok URL
- [ ] Can log in as admin user
- [ ] WebFinger endpoint responds
- [ ] Actor endpoint responds
- [ ] Can create posts
- [ ] Can follow users

### Prepare for Rox Testing

- [ ] Note Mastodon's public URL (ngrok)
- [ ] Create test user: `alice@<mastodon-domain>`
- [ ] Create second test user: `bob@<mastodon-domain>`
- [ ] Keep Mastodon logs visible: `docker-compose logs -f web`

---

## Troubleshooting

### Database Migration Fails

```bash
# Reset database
docker-compose down -v
docker-compose up -d db redis
docker-compose run --rm web rails db:create
docker-compose run --rm web rails db:migrate
docker-compose run --rm web rails db:seed
```

### Assets Not Loading

```bash
# Precompile assets
docker-compose run --rm web rails assets:precompile
docker-compose restart web
```

### ngrok URL Changes

When ngrok restarts, the URL changes. You need to:

```bash
# Update .env.production with new ngrok URL
LOCAL_DOMAIN=new-url.ngrok.io

# Restart Mastodon
docker-compose down
docker-compose up -d
```

### Port Already in Use

```bash
# Check what's using port 3000
lsof -i :3000

# Kill the process or change Mastodon's port in docker-compose.yml
```

---

## Resource Management

### Stop Mastodon

```bash
cd /tmp/mastodon
docker-compose down
```

### Start Mastodon

```bash
cd /tmp/mastodon
docker-compose up -d
```

### View Logs

```bash
# All services
docker-compose logs -f

# Web server only
docker-compose logs -f web

# Sidekiq (background jobs)
docker-compose logs -f sidekiq
```

### Clean Up (When Done Testing)

```bash
# Stop and remove containers, volumes
docker-compose down -v

# Remove cloned repository
cd ..
rm -rf mastodon
```

---

## Next Steps

Once Mastodon is running:

1. **Update federation-test-results.md** with Mastodon environment details
2. **Create test users** on both Rox and Mastodon
3. **Start Phase 1 tests** (Discovery)
4. **Document results** as you go

See [federation-test-plan.md](./federation-test-plan.md) for detailed test procedures.

---

## Useful Commands

```bash
# Create new user
docker-compose run --rm web bin/tootctl accounts create USERNAME --email EMAIL --confirmed

# Make user admin
docker-compose run --rm web bin/tootctl accounts modify USERNAME --role Owner

# Check user info
docker-compose run --rm web bin/tootctl accounts show USERNAME

# Reset user password
docker-compose run --rm web bin/tootctl accounts modify USERNAME --reset-password

# Check federation status
docker-compose run --rm web bin/tootctl domains crawl

# Clear cache
docker-compose run --rm web bin/tootctl cache clear
```

---

**Document Version**: 1.0
**Last Updated**: 2025-11-25
**Status**: Ready for use
