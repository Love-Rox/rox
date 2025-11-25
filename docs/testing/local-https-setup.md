# Local HTTPS Testing Environment Setup

**Purpose**: Create a completely local HTTPS environment for testing ActivityPub federation between Rox and Misskey without exposing anything to the internet.

**Estimated Time**: 30-45 minutes

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│  Browser / curl                                     │
│  https://rox.local                                 │
│  https://misskey.local                             │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│  Caddy Reverse Proxy (HTTPS → HTTP)                │
│  :443 → rox:3000,  misskey:3001                    │
│  Auto SSL with mkcert certificates                  │
└──────────────────┬──────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
┌───────▼────────┐   ┌────────▼────────┐
│  Rox           │   │  Misskey        │
│  Port: 3000    │◄─►│  Port: 3001     │
│  (existing)    │   │  (Docker)       │
└────────────────┘   └─────────────────┘
```

---

## Prerequisites

- ✅ Docker and Docker Compose (already installed)
- ✅ mkcert (already installed)
- ⏸️ Caddy (to be installed)
- ⏸️ Misskey (to be configured)

---

## Step 1: mkcert Certificate Authority Setup

### 1.1 Install Local CA (requires sudo)

```bash
# This will add mkcert's root CA to your system trust store
# You'll be prompted for your password
mkcert -install
```

**Expected output:**
```
The local CA is now installed in the system trust store! ⚡️
```

### 1.2 Create Certificates Directory

```bash
mkdir -p ~/rox-testing/certs
cd ~/rox-testing/certs
```

### 1.3 Generate Certificates

```bash
# Generate certificate for rox.local
mkcert rox.local "*.rox.local"

# Generate certificate for misskey.local
mkcert misskey.local "*.misskey.local"

# List generated files
ls -la
```

**Expected files:**
- `rox.local+1.pem` - Rox certificate
- `rox.local+1-key.pem` - Rox private key
- `misskey.local+1.pem` - Misskey certificate
- `misskey.local+1-key.pem` - Misskey private key

---

## Step 2: Install and Configure Caddy

### 2.1 Install Caddy

```bash
brew install caddy
```

### 2.2 Create Caddyfile

```bash
cd ~/rox-testing
cat > Caddyfile << 'EOF'
# Rox reverse proxy
https://rox.local {
    tls /Users/YOUR_USERNAME/rox-testing/certs/rox.local+1.pem /Users/YOUR_USERNAME/rox-testing/certs/rox.local+1-key.pem

    reverse_proxy localhost:3000

    # Enable CORS for ActivityPub
    header {
        Access-Control-Allow-Origin *
        Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
        Access-Control-Allow-Headers "Content-Type, Authorization, Accept"
    }

    log {
        output file /tmp/caddy-rox.log
        format console
    }
}

# Misskey reverse proxy
https://misskey.local {
    tls /Users/YOUR_USERNAME/rox-testing/certs/misskey.local+1.pem /Users/YOUR_USERNAME/rox-testing/certs/misskey.local+1-key.pem

    reverse_proxy localhost:3001

    # Enable CORS for ActivityPub
    header {
        Access-Control-Allow-Origin *
        Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
        Access-Control-Allow-Headers "Content-Type, Authorization, Accept"
    }

    log {
        output file /tmp/caddy-misskey.log
        format console
    }
}
EOF
```

**Important**: Replace `YOUR_USERNAME` with your actual username:
```bash
sed -i '' "s|YOUR_USERNAME|$(whoami)|g" Caddyfile
```

### 2.3 Test Caddyfile Syntax

```bash
caddy validate --config Caddyfile
```

---

## Step 3: Update /etc/hosts

### 3.1 Add Local Domains

```bash
# Edit /etc/hosts (requires sudo)
sudo tee -a /etc/hosts << EOF

# Rox Federation Testing
127.0.0.1 rox.local
127.0.0.1 misskey.local
EOF
```

### 3.2 Verify DNS Resolution

```bash
ping -c 1 rox.local
ping -c 1 misskey.local
```

Both should resolve to `127.0.0.1`.

---

## Step 4: Configure Misskey

### 4.1 Update Misskey Configuration

```bash
cd /tmp/misskey

# Edit .config/default.yml
cat > .config/default.yml << 'EOF'
url: https://misskey.local

port: 3001

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

# Disable bot protection for testing
disableHcaptcha: true
disableRecaptcha: true
EOF
```

### 4.2 Update docker.env

```bash
# Edit .config/docker.env
cat > .config/docker.env << 'EOF'
POSTGRES_DB=misskey
POSTGRES_USER=misskey
POSTGRES_PASSWORD=misskey_password
EOF
```

### 4.3 Update compose.yml (change port)

```bash
# Update port mapping to 3001
sed -i '' 's/"3000:3000"/"3001:3000"/' compose.yml
```

---

## Step 5: Build and Start Misskey

### 5.1 Build Misskey Docker Image

```bash
cd /tmp/misskey

# Build image (takes 10-15 minutes)
docker-compose build
```

**Note**: This will take some time. Go get coffee! ☕

### 5.2 Initialize Database

```bash
# Start database and redis first
docker-compose up -d db redis

# Wait for database to be ready
sleep 10

# Initialize Misskey database
docker-compose run --rm web pnpm run init
```

### 5.3 Start All Services

```bash
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f web
```

### 5.4 Verify Misskey is Running

```bash
# Check HTTP endpoint
curl http://localhost:3001/

# Should return HTML page
```

---

## Step 6: Update Rox Configuration

### 6.1 Stop Current Rox Server

```bash
# Kill existing Rox servers
pkill -f "bun run dev"

# Or find and kill specific process
lsof -ti:3000 | xargs kill
```

### 6.2 Update Rox Environment

```bash
cd ~/rox/packages/backend

# Update .env with HTTPS URL
cat > .env << 'EOF'
DB_TYPE=postgres
DATABASE_URL=postgresql://rox:rox_dev_password@localhost:5432/rox
STORAGE_TYPE=local
LOCAL_STORAGE_PATH=./uploads
PORT=3000
NODE_ENV=production
URL=https://rox.local
ENABLE_REGISTRATION=true
SESSION_EXPIRY_DAYS=30
EOF
```

### 6.3 Start Rox Server

```bash
cd ~/rox/packages/backend
bun run dev
```

---

## Step 7: Start Caddy Reverse Proxy

### 7.1 Start Caddy

```bash
cd ~/rox-testing

# Start Caddy in foreground to see logs
caddy run --config Caddyfile

# Or start in background
caddy start --config Caddyfile
```

### 7.2 Verify Caddy is Running

```bash
# Check if Caddy is listening on port 443
sudo lsof -i:443

# View Caddy logs
tail -f /tmp/caddy-rox.log
tail -f /tmp/caddy-misskey.log
```

---

## Step 8: Verify HTTPS Setup

### 8.1 Test Rox HTTPS

```bash
# WebFinger endpoint (should work without SSL errors)
curl https://rox.local/.well-known/webfinger

# Actor endpoint
curl -H "Accept: application/activity+json" https://rox.local/users/alice
```

### 8.2 Test Misskey HTTPS

```bash
# Home page
curl https://misskey.local/

# NodeInfo endpoint
curl https://misskey.local/nodeinfo/2.1
```

### 8.3 Test Browser Access

Open in browser:
- https://rox.local
- https://misskey.local

**Should see**: Valid HTTPS (no certificate warnings)

---

## Step 9: Create Test Users

### 9.1 Create Rox User

```bash
cd ~/rox/packages/backend

# Use existing test script or API
curl -X POST https://rox.local/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "alice",
    "email": "alice@rox.local",
    "password": "test1234"
  }'
```

### 9.2 Create Misskey User

Open browser: https://misskey.local

1. Click "新規登録" (Register)
2. Fill in:
   - Username: `bob`
   - Email: `bob@misskey.local`
   - Password: `test1234`
3. Confirm registration

---

## Step 10: Test Federation

### 10.1 Test WebFinger Discovery

From Rox → Misskey:
```bash
curl https://rox.local/.well-known/webfinger?resource=acct:bob@misskey.local
```

From Misskey → Rox:
```bash
curl https://misskey.local/.well-known/webfinger?resource=acct:alice@rox.local
```

### 10.2 Test Actor Fetching

Fetch Misskey actor from Rox:
```bash
curl -H "Accept: application/activity+json" https://misskey.local/users/bob
```

Fetch Rox actor from Misskey:
```bash
curl -H "Accept: application/activity+json" https://rox.local/users/alice
```

### 10.3 Test Follow Activity

**From Rox web UI:**
1. Log in as `alice@rox.local`
2. Search for `@bob@misskey.local`
3. Click "Follow"

**Check Misskey inbox logs:**
```bash
cd /tmp/misskey
docker-compose logs -f web | grep -i "inbox"
```

Should see incoming Follow activity from Rox!

---

## Troubleshooting

### Issue: Certificate Not Trusted

**Solution:**
```bash
# Re-install mkcert CA
mkcert -install

# Check CA location
mkcert -CAROOT
```

### Issue: Port Already in Use

```bash
# Check what's using port 443
sudo lsof -i:443

# Kill Caddy if needed
caddy stop

# Restart Caddy
caddy start --config ~/rox-testing/Caddyfile
```

### Issue: Misskey Database Error

```bash
cd /tmp/misskey

# Reset database
docker-compose down -v
docker-compose up -d db redis
sleep 10
docker-compose run --rm web pnpm run init
docker-compose up -d
```

### Issue: DNS Not Resolving

```bash
# Flush DNS cache (macOS)
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder

# Verify /etc/hosts
cat /etc/hosts | grep -E "(rox|misskey)"
```

### Issue: Caddy Not Starting

```bash
# Check Caddyfile syntax
caddy validate --config ~/rox-testing/Caddyfile

# Check if port 443 is available
sudo lsof -i:443

# View Caddy errors
caddy run --config ~/rox-testing/Caddyfile
```

---

## Cleanup (After Testing)

### Stop All Services

```bash
# Stop Caddy
caddy stop

# Stop Misskey
cd /tmp/misskey
docker-compose down

# Stop Rox
pkill -f "bun run dev"
```

### Remove Test Data

```bash
# Remove Misskey data
cd /tmp/misskey
docker-compose down -v
rm -rf db redis files

# Remove certificates
rm -rf ~/rox-testing
```

### Remove /etc/hosts Entries

```bash
# Edit /etc/hosts and remove lines:
# 127.0.0.1 rox.local
# 127.0.0.1 misskey.local
sudo nano /etc/hosts
```

---

## Quick Start Commands

Once everything is set up, use these commands to start testing:

```bash
# Terminal 1: Start Rox
cd ~/rox/packages/backend
bun run dev

# Terminal 2: Start Misskey
cd /tmp/misskey
docker-compose up

# Terminal 3: Start Caddy
cd ~/rox-testing
caddy run --config Caddyfile

# Terminal 4: Run tests
cd ~/rox
# Follow federation-test-plan.md
```

---

## Next Steps

Once the HTTPS environment is running:

1. **Create test accounts** on both Rox and Misskey
2. **Follow [federation-test-plan.md](./federation-test-plan.md)** to execute tests
3. **Document results** in [federation-test-results.md](./federation-test-results.md)

---

**Document Version**: 1.0
**Last Updated**: 2025-11-25
**Status**: Ready for use
