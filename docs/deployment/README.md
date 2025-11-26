# Deployment Documentation

Guides for deploying Rox in various environments.

## Deployment Options

| Environment | Guide | Status |
|-------------|-------|--------|
| VPS (Docker) | [vps-docker.md](./vps-docker.md) | Available |
| Cloudflare Workers | Coming Soon | Planned |
| Kubernetes | Coming Soon | Planned |

## Quick Links

- [VPS Docker Deployment](./vps-docker.md) - Deploy on any VPS with Docker
- [Environment Variables](./environment-variables.md) - Complete configuration reference
- [Troubleshooting](./troubleshooting.md) - Common issues and solutions

## Minimum Requirements

### VPS Deployment

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 2 vCPU | 4 vCPU |
| RAM | 2 GB | 4 GB |
| Storage | 20 GB SSD | 40 GB SSD |
| OS | Ubuntu 22.04+ | Ubuntu 24.04 |

### Software Requirements

- Docker Engine 24.0+
- Docker Compose v2
- Domain with DNS access

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Internet                              │
└───────────────────────────┬─────────────────────────────────┘
                            │
                    ┌───────┴───────┐
                    │    Caddy      │  Automatic HTTPS
                    │  (Reverse     │  HTTP/2, HTTP/3
                    │   Proxy)      │
                    └───────┬───────┘
                            │
                    ┌───────┴───────┐
                    │     Rox       │  Hono + Bun
                    │   Backend     │  ActivityPub
                    └───────┬───────┘
                            │
         ┌──────────────────┼──────────────────┐
         │                  │                  │
┌────────┴────────┐ ┌──────┴──────┐ ┌────────┴────────┐
│   PostgreSQL    │ │  Dragonfly  │ │     Storage     │
│   (Database)    │ │  (Cache/    │ │   (Local/S3)    │
│                 │ │   Queue)    │ │                 │
└─────────────────┘ └─────────────┘ └─────────────────┘
```

## Security Checklist

Before going to production:

- [ ] Use strong, unique passwords for database
- [ ] Disable registration after creating admin account
- [ ] Ensure firewall only exposes ports 80 and 443
- [ ] Set up automated backups
- [ ] Configure monitoring and alerting
- [ ] Review rate limiting configuration
- [ ] Test federation with other instances

## Support

- [GitHub Issues](https://github.com/your-org/rox/issues) - Bug reports and feature requests
- [Discussions](https://github.com/your-org/rox/discussions) - Questions and community support
