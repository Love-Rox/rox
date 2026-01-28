# Discord Conversation Logger Rules

Use the `discord-conversation-logger` MCP to log important messages for review and history tracking.

## When to Log

### User Messages (role: "human")
- Task start/change/completion instructions
- Important decisions or confirmations
- Error reports or issue identification

### Assistant Messages (role: "assistant")
- Task completion reports
- Important suggestions or solutions
- Error resolution methods
- Summary of significant changes made

### System Messages (role: "system")
- Critical errors or warnings
- Important environment changes
- Security-related notifications

## Logging Format

```typescript
mcp__discord-conversation-logger__log_conversation({
  message: "Actual message content",
  role: "human" | "assistant" | "system",
  context: "Brief context description"
})
```

## Examples

```typescript
// Task completion
mcp__discord-conversation-logger__log_conversation({
  message: "Completed migration of 40+ files to useApi hook pattern",
  role: "assistant",
  context: "Frontend refactoring task"
})

// Error report
mcp__discord-conversation-logger__log_conversation({
  message: "TypeScript compilation failed due to missing type definitions",
  role: "system",
  context: "Build error"
})
```

## Cases NOT Requiring Logs

- Simple acknowledgments
- Intermediate progress reports
- Temporary debug outputs
- Routine file reads or searches
