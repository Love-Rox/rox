# Rox Project Overview

## Purpose

**Rox** is a lightweight ActivityPub server & client designed to be faster and more flexible than existing Misskey instances. It aims to provide:

- **Lightweight & High Performance**: Built with Bun runtime and modern web standards
- **Infrastructure Agnostic**: Can run on traditional VPS (Docker) or edge environments (Cloudflare Workers/D1)
- **Misskey API Compatible**: Seamless migration for existing Misskey users
- **Multi-Database Support**: PostgreSQL, MySQL, SQLite/D1
- **Flexible Storage**: Local filesystem or S3-compatible storage

## Component Names

- **Backend**: Hono Rox (API server)
- **Frontend**: Waku Rox (web client)
- **Shared**: Common types and utilities

## Project Structure

```
rox/
├── packages/
│   ├── backend/   # Hono Rox - API server with ActivityPub support
│   ├── frontend/  # Waku Rox - React Server Components web client
│   └── shared/    # Common types and utilities
├── docs/          # Implementation guides and specifications
├── docker/        # Docker configurations (not yet created)
└── scripts/       # Build and deployment scripts (not yet created)
```

## Implementation Status

- **Phase 0**: Foundation (Database, Storage, DI) ✅ Complete
- **Phase 1**: Misskey-Compatible API ✅ Complete
- **Phase 2**: Frontend (Waku Client) ✅ Complete
  - Waku + Jotai setup, Tailwind CSS v4, React Aria Components
  - Lingui i18n (English/Japanese), Authentication (Passkey + Password)
  - Timeline, Note Composer, User interactions, File uploads
- **Phase 3**: ActivityPub Federation ⏳ ~75% Complete
  - ✅ WebFinger, Actor, HTTP Signatures, Inbox, Outbox, Collections
  - ✅ BullMQ delivery queue, automatic note delivery to followers
  - 🚧 Additional activity types, rate limiting, real-server testing

## Key Features Implemented

- User registration and authentication (Passkey + Password)
- Note creation with text, images, CW, visibility controls
- Timeline rendering with infinite scroll
- Reactions and interactions (reply, renote, follow/unfollow)
- File uploads (multiple images, drag & drop)
- User profile pages
- ActivityPub federation (basic)
