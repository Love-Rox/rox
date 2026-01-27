# Rox Plugins

This directory contains plugins for Rox. Each subdirectory is a plugin.

## Plugin Structure

```
plugins/
├── my-plugin/
│   ├── plugin.json    # Plugin manifest (required)
│   └── index.js       # Plugin entry point (required)
└── another-plugin/
    ├── plugin.json
    └── index.js
```

## Plugin Manifest (plugin.json)

```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "description": "Plugin description",
  "author": "Your Name",
  "minRoxVersion": "2025.12.0",
  "permissions": ["notes:read", "notes:write"]
}
```

## Plugin Entry Point (index.js)

```javascript
export default {
  id: "my-plugin",
  name: "My Plugin",
  version: "1.0.0",

  async onLoad(context) {
    // Called when plugin is loaded
    context.logger.info("Plugin loaded!");

    // Subscribe to events
    context.events.on("note:afterCreate", (payload) => {
      context.logger.info(`Note created: ${payload.note.id}`);
    }, "my-plugin");
  },

  async onUnload() {
    // Called when plugin is unloaded
  },

  // Optional: Custom API routes at /api/x/my-plugin/
  routes(app) {
    app.get("/", (c) => c.json({ hello: "world" }));
  },
};
```

## Available Events

### Note Events
- `note:beforeCreate` - Before a note is created (can cancel/modify)
- `note:afterCreate` - After a note is created
- `note:beforeDelete` - Before a note is deleted (can cancel)
- `note:afterDelete` - After a note is deleted

### User Events
- `user:beforeRegister` - Before user registration (can cancel/modify)
- `user:afterRegister` - After user registration
- `user:beforeLogin` - Before user login (can cancel)
- `user:afterLogin` - After user login

### Follow Events
- `follow:afterCreate` - After a follow relationship is created
- `follow:afterDelete` - After a follow relationship is deleted

## Plugin Context

The `context` object provides:

- `events` - Event bus for subscribing to events
- `logger` - Namespaced logger (debug, info, warn, error)
- `config` - Plugin configuration storage (get, set, delete)
- `baseUrl` - Instance base URL
- `instanceName` - Instance name

## Included Plugins

### hello-world

A sample plugin demonstrating the plugin system. It:
- Logs messages when loaded/unloaded
- Listens to note creation events
- Provides API routes at `/api/x/hello-world/`
