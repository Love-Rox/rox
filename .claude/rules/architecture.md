# Core Architecture Patterns

## Infrastructure Abstraction

The project uses **Repository Pattern** and **Adapter Pattern** to decouple business logic from infrastructure concerns. This enables switching databases and storage backends via environment variables.

### Database Abstraction Layer

- Controllers (Hono routes) depend only on repository interfaces (e.g., `INoteRepository`, `IUserRepository`)
- Concrete implementations exist per database type in `repositories/pg/`
- Selection via `DB_TYPE` environment variable at application startup
- Dependency injection happens during DI container construction

### Storage Abstraction Layer

- All media operations go through `IFileStorage` interface
- Implementations: `LocalStorageAdapter` (development) and `S3StorageAdapter` (production)
- Selection via `STORAGE_TYPE` environment variable

## Dependency Injection

- Use Hono Context to provide repository implementations to controllers
- Initialize concrete repository classes at application startup based on `DB_TYPE`
- Example: `context.get('noteRepository')` returns the appropriate implementation

## Storage Adapter Interface

The `IFileStorage` interface must support:

```typescript
interface IFileStorage {
  save(file: Buffer, metadata: FileMetadata): Promise<string>;  // Returns file identifier/URL
  delete(fileId: string): Promise<void>;
  getUrl(fileId: string): string;  // Returns publicly accessible URL
}
```

## ActivityPub Considerations

- HTTP Signatures must be strictly validated for incoming activities
- Use job queue for outbound delivery to handle retries and rate limiting
- Actor documents must be cacheable and follow ActivityPub spec
- WebFinger responses must include proper CORS headers

## Directory Structure

```
packages/
├── shared/             # Shared code between frontend and backend
│   └── src/
│       ├── types/      # Shared TypeScript types
│       ├── utils/      # Shared utility functions
│       └── constants/  # Shared validation constants
├── backend/
│   └── src/
│       ├── adapters/       # Infrastructure implementations (Adapter Pattern)
│       ├── db/             # Drizzle schema and connections
│       ├── di/             # Dependency injection container
│       ├── interfaces/     # Abstract definitions (Interfaces)
│       ├── middleware/     # Hono middleware
│       ├── repositories/   # DB operations (Repository Pattern)
│       ├── routes/         # Hono endpoints
│       ├── services/       # Business logic
│       └── lib/            # Shared utilities
└── frontend/
    └── src/
        ├── components/     # React components
        ├── hooks/          # Custom React hooks
        ├── lib/            # Frontend utilities
        ├── pages/          # Waku pages
        └── locales/        # i18n translations
```
