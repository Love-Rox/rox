# Code Style and Conventions

## Documentation Standards

### TSDoc Comments (English Required)

All TSDoc comments (`/** */`) **MUST** be written in English for:
- Module-level documentation
- Function/method documentation
- Class/interface documentation
- Parameter descriptions (`@param`)
- Return value descriptions (`@returns`)
- Examples (`@example`)

**Required Elements:**
- Function/method description
- `@param` for all parameters
- `@returns` for return values
- `@throws` when applicable
- `@example` for public APIs
- `@remarks` for implementation notes

**Example:**
```typescript
/**
 * Hash a password using Argon2id
 *
 * @param password - Plain text password to hash
 * @returns Hashed password string
 *
 * @example
 * ```typescript
 * const hash = await hashPassword('mySecretPassword123');
 * ```
 *
 * @remarks
 * - Algorithm: argon2id
 * - Memory cost: 19456 KiB
 */
export async function hashPassword(password: string): Promise<string> {
  // Implementation...
}
```

### Inline Comments (Flexible)

Inline comments (`//` or `/* */`) MAY be in Japanese or English:
```typescript
// ユーザーごとのディレクトリに保存
// Save to user-specific directory
const relativePath = join(metadata.userId, filename);
```

## TypeScript Style

### Type Usage
- Prefer `interface` over `type` for object shapes
- Use `type` for unions and intersections
- Always specify return types for public functions
- Enable strict mode (already configured)

### Naming Conventions
- **PascalCase**: Classes, interfaces, types (`UserRepository`, `IFileStorage`)
- **camelCase**: Functions, variables, module exports (`hashPassword`, `userId`)
- **UPPER_SNAKE_CASE**: Constants (`MAX_FILE_SIZE`, `DB_TYPE`)

### File Naming
- **PascalCase**: Classes, interfaces, types (`UserRepository.ts`, `IFileStorage.ts`)
- **camelCase**: Functions, utilities, multiple exports (`crypto.ts`, `session.ts`)
- **kebab-case**: Configuration files (`docker-compose.yml`)

### Code Quality Rules
- Use meaningful variable names (avoid single letters except in loops)
- No unused variables or parameters
- No unchecked indexed access
- No implicit returns
- No fallthrough cases in switch statements

## Formatting

**Tool**: oxc (oxlint)

```bash
# Auto-fix formatting issues
bun run format

# Check for issues (without fixing)
bun run lint
```

Configuration in `oxlint.json`:
- typescript: warn
- correctness: warn
- suspicious: warn
- perf: warn

## Commit Message Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

**Format**: `<type>(<scope>): <subject>`

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples**:
```
feat(auth): add passkey authentication
fix(timeline): resolve infinite scroll bug
docs(api): update endpoint documentation
refactor(storage): simplify S3 adapter logic
test(note): add note creation tests
chore(deps): update dependencies
```

## Import Organization

Order imports logically:
1. External dependencies
2. Internal absolute imports
3. Relative imports

```typescript
// External
import { Hono } from 'hono';
import { eq } from 'drizzle-orm';

// Internal
import type { IUserRepository } from '../interfaces/IUserRepository';
import { hashPassword } from '../utils/crypto';

// Relative
import { requireAuth } from './middleware/auth';
```

## Error Handling

- Use try-catch for async operations that can fail
- Throw meaningful error messages
- Use appropriate HTTP status codes in API responses
- Log errors with context information

```typescript
try {
  const user = await userRepo.findById(userId);
  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }
} catch (error) {
  console.error('Failed to fetch user:', error);
  return c.json({ error: 'Internal server error' }, 500);
}
```

## Testing

Use Bun's built-in test runner:

```typescript
import { describe, test, expect } from 'bun:test';

describe('AuthService', () => {
  test('should hash password correctly', async () => {
    const password = 'testPassword123';
    const hash = await hashPassword(password);

    expect(hash).toStartWith('$argon2id$');
    expect(await verifyPassword(password, hash)).toBe(true);
  });
});
```
