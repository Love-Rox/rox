# Rox Code Style & Conventions

## Documentation Language

- **TSDoc comments** (`/** */`): MUST be in English
- **Inline comments** (`//`): May be Japanese or English

## TypeScript Style

### Naming Conventions

- **Files**: `PascalCase.ts` for classes/components, `camelCase.ts` for utilities
- **Interfaces**: `I` prefix for repository interfaces (`IUserRepository`)
- **Types**: No prefix, PascalCase (`UserData`, `NoteCreateInput`)
- **Functions**: camelCase (`createNote`, `findById`)
- **Constants**: UPPER_SNAKE_CASE for environment configs

### Repository Interface Pattern

```typescript
export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  create(data: CreateUserInput): Promise<User>;
  update(id: string, data: Partial<User>): Promise<User>;
  delete(id: string): Promise<boolean>;
}
```

### Service Class Pattern

```typescript
export class NoteService {
  constructor(
    private noteRepository: INoteRepository,
    private userRepository: IUserRepository
  ) {}

  async createNote(input: NoteCreateInput): Promise<Note> {
    // Business logic
  }
}
```

### React Component Pattern

```typescript
/**
 * Component description
 *
 * @param props - Component props
 * @example
 * ```tsx
 * <Button variant="primary">Click me</Button>
 * ```
 */
export function Button({ variant, size, ...props }: ButtonProps) {
  return (
    <AriaButton className={buttonVariants({ variant, size })} {...props} />
  );
}
```

## Frontend Patterns

### State Management (Jotai)

```typescript
// lib/atoms/auth.ts
export const tokenAtom = atom<string | null>(null);
export const userAtom = atom<User | null>(null);
```

### API Client Usage

```typescript
apiClient.setToken(token);
const response = await apiClient.post<ResponseType>('/api/endpoint', body);
```

### i18n (Lingui)

```tsx
import { Trans } from '@lingui/react/macro';
import { t } from '@lingui/core/macro';

// In JSX
<Trans>Hello World</Trans>

// In code
const message = t`User not found`;
```

## Import Order

1. External packages
2. Internal packages (shared)
3. Relative imports (interfaces → repositories → services → routes)

## Error Handling

- Use Zod for input validation
- Return appropriate HTTP status codes
- Log errors with pino logger

## Test Conventions

- Files: `*.test.ts`
- Use `describe`/`test` blocks
- Mock repositories for unit tests
- Test file next to implementation or in `tests/unit/`
