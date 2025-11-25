# Technology Stack

## Runtime & Language

- **Runtime**: Bun (1.1.45+) - Fast JavaScript runtime, package manager, and test runner
- **Language**: TypeScript 5.x - Strict mode enabled with comprehensive type checking

## Backend (Hono Rox)

| Technology | Version | Purpose |
|-----------|---------|---------|
| Hono | 4.6.15+ | Ultra-lightweight web framework with edge compatibility |
| Drizzle ORM | 0.36.4 | TypeScript-first ORM with multi-DB support |
| BullMQ | 5.64.1+ | Job queue for async ActivityPub delivery |
| ioredis | 5.8.2+ | Redis client for queue management |
| @aws-sdk/client-s3 | 3.705.0+ | S3-compatible storage support |
| postgres | 3.4.5+ | PostgreSQL client |
| mysql2 | 3.11.5+ | MySQL/MariaDB client |
| better-sqlite3 | 11.7.0+ | SQLite client |

## Frontend (Waku Rox)

| Technology | Version | Purpose |
|-----------|---------|---------|
| Waku | 0.27.1 | React Server Components (RSC) framework |
| React | 19.0.0 | UI library |
| Jotai | 2.10.3+ | Atomic state management |
| React Aria Components | 1.13.0+ | Accessible headless UI components |
| Tailwind CSS | 4.1.17 | Utility-first CSS with OKLCH color space |
| Lingui | 5.6.0 | i18n library (English/Japanese support) |
| lucide-react | 0.554.0+ | Icon library |
| class-variance-authority | 0.7.1 | Component variant styling |

## Development Tools

- **oxc (oxlint)**: Rust-based linting and formatting (replaces ESLint/Prettier)
- **TypeDoc**: API documentation generation
- **Drizzle Kit**: Database migration tool

## Infrastructure

### Databases (DB_TYPE)
- PostgreSQL 14+ (default/recommended)
- MySQL 8.0+ / MariaDB
- SQLite / Cloudflare D1 (for edge deployment)

### Storage (STORAGE_TYPE)
- **local**: Local filesystem via Bun.write (development)
- **s3**: S3-compatible storage (AWS S3, Cloudflare R2, MinIO)

### Queue
- **Dragonfly / Redis**: For BullMQ job queue (ActivityPub delivery)

## TypeScript Configuration

Strict mode enabled with:
- `noUncheckedIndexedAccess`: true
- `noImplicitReturns`: true
- `noFallthroughCasesInSwitch`: true
- `noUnusedLocals`: true
- `noUnusedParameters`: true

Target: ES2022, Module: ESNext, Module Resolution: bundler
