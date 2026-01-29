# MCP Server Usage

This project leverages Model Context Protocol (MCP) servers for enhanced development.

## context7

**Purpose**: Fetch up-to-date documentation and code examples for any library

**When to use**:
- Implementing features with external libraries (Hono, Waku, Drizzle, Jotai, etc.)
- Getting latest API patterns or query syntax
- Checking library-specific best practices

**Example queries**:
- "Hono middleware patterns"
- "Drizzle ORM query syntax"
- "Jotai atom composition"

## deepwiki

**Purpose**: Access GitHub repository documentation and answer questions about codebases

**When to use**:
- Researching ActivityPub implementations
- Referencing Misskey source code
- Exploring related federated social projects

**Example queries**:
- "How does Misskey handle federation?"
- "HTTP Signatures implementation in ActivityPub"
- "WebFinger response format"

## serena

**Purpose**: Semantic code navigation and intelligent refactoring for this codebase

**When to use**:
- Navigate symbols across the codebase
- Find all references to interfaces/types
- Perform safe refactorings across Repository/Adapter patterns
- Track dependencies between modules

**Example tasks**:
- Renaming repository interfaces
- Finding all implementations of `INoteRepository`
- Understanding symbol relationships

## Integration Guidelines

| Task | Use |
|------|-----|
| Library documentation | context7 |
| External project research | deepwiki |
| Codebase navigation/refactoring | serena |
