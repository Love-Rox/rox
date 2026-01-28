# TSDoc Documentation Standards

## Code Documentation

- **TSDoc Comments (/** */)**: MUST be written in English
  - Module-level documentation
  - Function/method documentation
  - Class/interface documentation
  - Parameter descriptions (@param)
  - Return value descriptions (@returns)
  - Example code (@example)

- **Inline Comments (`//` or `/* */`)**: MAY be in Japanese or English
  - Implementation notes
  - TODO comments
  - Code explanations

## Examples

### Component TSDoc

```tsx
/**
 * User profile card component.
 *
 * Displays user avatar, name, and bio with optional action buttons.
 *
 * @example
 * ```tsx
 * <UserCard user={userData} onFollow={handleFollow} />
 * ```
 */
export function UserCard({ user, onFollow }: UserCardProps) {
```

### Interface TSDoc

```tsx
/**
 * Props for the UserCard component.
 */
interface UserCardProps {
  /** User data to display */
  user: User;
  /** Callback when follow button is pressed */
  onFollow?: (userId: string) => void;
}
```

### Hook TSDoc

```tsx
/**
 * Hook to manage API authentication state.
 *
 * Provides authenticated API methods and token management.
 *
 * @returns Object containing token, auth status, and API methods
 *
 * @example
 * ```tsx
 * const { token, isAuthenticated, get, post } = useApi();
 * ```
 */
export function useApi(): AuthenticatedApi {
```

## Rationale

English-first documentation for:
- International collaboration
- Global developer accessibility
- Better IDE/tooling support
- Industry standard compliance
