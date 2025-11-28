# Task Completion Checklist

When completing a task in the Rox codebase, follow this checklist:

## Before Committing

### 1. Code Quality
- [ ] TypeScript type check passes: `bun run typecheck`
- [ ] Linting passes: `bun run lint`
- [ ] No unused imports or variables

### 2. Testing
- [ ] All existing tests pass: `bun test`
- [ ] Added tests for new functionality (if applicable)
- [ ] Tested manually in development environment

### 3. Documentation
- [ ] TSDoc comments in English for new functions/classes
- [ ] Updated relevant documentation if APIs changed

### 4. i18n (Frontend changes)
- [ ] Wrapped user-facing strings with `<Trans>` or `t\`\``
- [ ] Ran `bun run lingui:extract` to update catalogs
- [ ] Added Japanese translations for new strings
- [ ] Ran `bun run lingui:compile` to compile translations

### 5. Database Changes
- [ ] Generated migration: `bun run db:generate`
- [ ] Applied migration: `bun run db:migrate`
- [ ] Verified migration in development database

### 6. Backend Service/Repository Changes
- [ ] Updated DI container (`di/container.ts`) if new dependencies
- [ ] Updated middleware (`middleware/di.ts`) if new context variables
- [ ] Exported from index files (`repositories/pg/index.ts`, etc.)

### 7. Security
- [ ] No hardcoded secrets or credentials
- [ ] Input validation using Zod schemas
- [ ] Proper authorization checks (admin/moderator middleware)

## Commit Message Format

Use conventional commits:
```
feat: add user warning system
fix: resolve timeline pagination issue
docs: update API documentation
test: add unit tests for RoleService
refactor: simplify note creation logic
perf: add Redis caching for instance settings
chore: update dependencies
```

## After Committing

- [ ] Update session handoff memory if significant changes
- [ ] Consider updating architecture documentation if patterns changed
