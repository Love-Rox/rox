# VPS Docker Deployment Guide

This guide covers deploying Rox on a VPS (Virtual Private Server) using Docker Compose with automatic HTTPS via Caddy.

## Prerequisites

- VPS with at least 2GB RAM and 20GB storage
- Docker Engine 24.0+ and Docker Compose v2
- A domain name pointing to your server's IP
- Ports 80 and 443 available

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/your-org/rox.git
cd rox

# 2. Configure environment
cp docker/.env.production.example docker/.env.production
nano docker/.env.production  # Edit your settings

# 3. Deploy
docker compose -f docker/docker-compose.prod.yml up -d

# 4. Verify
docker compose -f docker/docker-compose.prod.yml ps
curl https://your-domain.com/health
```

## Detailed Setup

### 1. Server Preparation

#### Install Docker (Ubuntu/Debian)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh

# Add your user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Verify installation
docker --version
docker compose version
```

#### Configure Firewall

```bash
# UFW (Ubuntu)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 443/udp  # HTTP/3
sudo ufw enable
```

### 2. DNS Configuration

Create an A record pointing your domain to your server's IP address:

| Type | Name | Value |
|------|------|-------|
| A | rox.example.com | YOUR_SERVER_IP |

Wait for DNS propagation (can take up to 48 hours, usually 5-15 minutes).

### 3. Environment Configuration

```bash
cd /path/to/rox
cp docker/.env.production.example docker/.env.production
```

Edit `docker/.env.production`:

```ini
# Required Settings
ROX_DOMAIN=rox.example.com
ROX_URL=https://rox.example.com
POSTGRES_PASSWORD=your-strong-password-here
ACME_EMAIL=admin@example.com

# Enable registration for initial setup
ENABLE_REGISTRATION=true
```

#### Generate Strong Password

```bash
# Generate a 32-character random password
openssl rand -base64 32
```

### 4. Deploy

```bash
# Start all services
docker compose -f docker/docker-compose.prod.yml up -d

# Watch logs during initial startup
docker compose -f docker/docker-compose.prod.yml logs -f

# Check service status
docker compose -f docker/docker-compose.prod.yml ps
```

### 5. Verify Deployment

```bash
# Health check
curl -s https://your-domain.com/health | jq

# Expected response:
# {
#   "status": "ok",
#   "timestamp": "2025-11-26T12:00:00.000Z",
#   "version": "1.0.0"
# }

# Detailed health check
curl -s https://your-domain.com/health/ready | jq

# Expected response:
# {
#   "status": "ok",
#   "checks": {
#     "database": "ok",
#     "cache": "ok"
#   }
# }
```

### 6. Create First User

Register your first (admin) user:

```bash
curl -X POST https://your-domain.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@example.com",
    "password": "your-secure-password"
  }'
```

After creating your admin account, disable registration:

```bash
# Edit .env.production
ENABLE_REGISTRATION=false

# Restart to apply
docker compose -f docker/docker-compose.prod.yml restart rox
```

## Architecture

```
                    ┌─────────────┐
        Internet    │   Caddy     │ :80/:443
            ↓       │   (HTTPS)   │
                    └──────┬──────┘
                           │
                    ┌──────┴──────┐
                    │     Rox     │ :3000
                    │   Backend   │
                    └──────┬──────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
    ┌─────┴─────┐   ┌─────┴─────┐   ┌──────┴──────┐
    │ PostgreSQL│   │ Dragonfly │   │   Uploads   │
    │   :5432   │   │   :6379   │   │   Volume    │
    └───────────┘   └───────────┘   └─────────────┘
```

## Resource Requirements

| Service | CPU | Memory | Storage |
|---------|-----|--------|---------|
| Rox | 0.5-2 cores | 256MB-1GB | - |
| PostgreSQL | 0.25-1 core | 128MB-512MB | 10GB+ |
| Dragonfly | 0.25-1 core | 64MB-512MB | 1GB |
| Caddy | 0.5 core | 128MB | 100MB |
| **Total** | **2-4 cores** | **1-2.5GB** | **12GB+** |

Recommended minimum VPS: 2 vCPU, 2GB RAM, 40GB SSD

## Common Operations

### View Logs

```bash
# All services
docker compose -f docker/docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker/docker-compose.prod.yml logs -f rox
docker compose -f docker/docker-compose.prod.yml logs -f postgres
```

### Restart Services

```bash
# Restart all
docker compose -f docker/docker-compose.prod.yml restart

# Restart specific service
docker compose -f docker/docker-compose.prod.yml restart rox
```

### Update Deployment

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker compose -f docker/docker-compose.prod.yml build
docker compose -f docker/docker-compose.prod.yml up -d

# Or force recreate
docker compose -f docker/docker-compose.prod.yml up -d --force-recreate
```

### Database Backup

```bash
# Create backup
docker exec rox-postgres pg_dump -U rox rox > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
docker exec -i rox-postgres psql -U rox rox < backup_20251126_120000.sql
```

### Stop Services

```bash
# Stop all services (keeps data)
docker compose -f docker/docker-compose.prod.yml down

# Stop and remove volumes (DESTROYS DATA)
docker compose -f docker/docker-compose.prod.yml down -v
```

## Monitoring

### Prometheus Metrics

Rox exposes Prometheus metrics at `/metrics`:

```bash
curl -s https://your-domain.com/metrics
```

Available metrics:
- `rox_http_requests_total` - HTTP request counts
- `rox_http_request_duration_seconds` - Request latency
- `rox_activitypub_delivery_total` - AP delivery counts
- `rox_activitypub_inbox_total` - Inbox activity counts
- `rox_db_queries_total` - Database query counts
- `rox_cache_operations_total` - Cache hit/miss counts

### Health Checks

Docker automatically monitors service health. View status:

```bash
docker inspect --format='{{json .State.Health}}' rox-api | jq
```

## S3/R2 Storage Configuration

For production, consider using S3-compatible storage:

```ini
# .env.production
STORAGE_TYPE=s3
S3_ENDPOINT=https://your-bucket.r2.cloudflarestorage.com
S3_BUCKET_NAME=rox-media
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
S3_REGION=auto
S3_PUBLIC_URL=https://cdn.your-domain.com
```

## Troubleshooting

See [Troubleshooting Guide](./troubleshooting.md) for common issues and solutions.

### Quick Diagnostics

```bash
# Check all container status
docker compose -f docker/docker-compose.prod.yml ps

# Check resource usage
docker stats

# Check disk space
df -h

# Check Caddy certificate status
docker exec rox-caddy caddy list-certificates
```

## Security Checklist

- [ ] Strong PostgreSQL password generated
- [ ] Registration disabled after admin account created
- [ ] Firewall configured (only 80, 443 open)
- [ ] Regular backups scheduled
- [ ] SSL certificate verified (Caddy auto-manages)
- [ ] Server updates enabled
