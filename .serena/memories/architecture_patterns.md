# Architecture Patterns

## Core Design Principles

Rox uses **Repository Pattern** and **Adapter Pattern** to decouple business logic from infrastructure, enabling environment-based switching without code changes.

## 1. Repository Pattern

Database operations are abstracted through interfaces. Controllers depend only on repository interfaces, not concrete implementations.

### Directory Structure

```
src/repositories/
├── pg/          # PostgreSQL implementations
├── mysql/       # MySQL implementations
└── d1/          # D1 (SQLite) implementations
```

### Usage Pattern

```typescript
// ✅ Good: Use repository interface
const user = await userRepository.findById(userId);

// ❌ Bad: Direct database access
const user = await db.select().from(users).where(eq(users.id, userId));
```

### Key Repositories

- `INoteRepository`: Note CRUD operations
- `IUserRepository`: User CRUD operations
- `IFollowRepository`: Follow relationship operations
- `IReactionRepository`: Reaction operations
- `IDriveFileRepository`: File metadata operations

### Selection Mechanism

Repository implementations are selected via `DB_TYPE` environment variable at application startup through the DI container (`src/di/container.ts`).

## 2. Adapter Pattern

Storage operations use adapters to abstract infrastructure concerns.

### Directory Structure

```
src/adapters/
├── storage/
│   ├── LocalStorageAdapter.ts    # Local filesystem
│   └── S3StorageAdapter.ts       # S3-compatible storage
└── email/                         # (Future: email adapters)
```

### Interface

All storage adapters implement `IFileStorage`:
- `save(file: Buffer, metadata: FileMetadata): Promise<string>` - Returns file ID/URL
- `delete(fileId: string): Promise<void>`
- `getUrl(fileId: string): string` - Returns publicly accessible URL

### Usage Pattern

```typescript
// ✅ Good: Use storage adapter
const url = await storageAdapter.save(file, metadata);

// ❌ Bad: Direct filesystem access
await fs.writeFile(path, file);
```

### Selection Mechanism

Storage adapters are selected via `STORAGE_TYPE` environment variable.

## 3. Dependency Injection

Dependencies are injected via Hono Context based on environment configuration.

### Container

The DI container (`src/di/container.ts`) initializes:
- Repository implementations (based on `DB_TYPE`)
- Storage adapters (based on `STORAGE_TYPE`)
- Services (business logic)

### Usage in Routes

```typescript
app.post('/api/notes', requireAuth(), async (c) => {
  const noteRepository = c.get('noteRepository');
  const storageAdapter = c.get('storageAdapter');
  const user = c.get('user')!;
  
  // Business logic using injected dependencies
});
```

## 4. Service Layer

Business logic lives in the service layer (`src/services/`), which orchestrates repositories and adapters.

### Key Services

- `NoteService`: Note creation, deletion, timeline generation
- `AuthService`: Authentication, session management
- `FollowService`: Follow/unfollow operations
- `ReactionService`: Reaction management
- `FileService`: File upload/download handling
- `ActivityPubDeliveryService`: ActivityPub federation delivery

### Pattern

Services receive repositories via constructor injection and implement business logic without direct infrastructure knowledge.

## 5. Database Schema Management

Each database type has its own schema file:
- `db/schema/pg.ts` - PostgreSQL
- `db/schema/mysql.ts` - MySQL/MariaDB
- `db/schema/sqlite.ts` - SQLite/D1

Schemas are kept synchronized across database types using Drizzle's migration system.

## 6. Multi-Environment Support

The architecture enables running the same codebase in:
- **VPS**: PostgreSQL/MySQL + local/S3 storage + Docker
- **Edge**: Cloudflare Workers + D1 database + R2 storage

Configuration is entirely environment-variable driven.
