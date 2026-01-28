/**
 * Hello World Plugin
 *
 * A sample plugin demonstrating the Rox plugin system.
 * This plugin:
 * - Logs messages when loaded/unloaded
 * - Listens to note creation events
 * - Provides a simple API route
 */

/** @type {import('../../packages/backend/src/plugins/types').RoxPlugin} */
const helloWorldPlugin = {
  id: "hello-world",
  name: "Hello World",
  version: "1.0.0",
  description: "A sample plugin demonstrating the Rox plugin system",

  /**
   * Called when the plugin is loaded
   * @param {import('../../packages/backend/src/plugins/types').PluginContext} context
   */
  async onLoad(context) {
    context.logger.info("Hello World plugin loaded!");
    context.logger.info(`Instance: ${context.instanceName}`);
    context.logger.info(`Base URL: ${context.baseUrl}`);

    // Subscribe to note creation events
    // Note: We intentionally don't log note content to protect user privacy
    context.events.on(
      "note:afterCreate",
      (payload) => {
        context.logger.info(
          `New note created by @${payload.author.username} (${payload.note.text?.length || 0} chars)`,
        );
      },
      "hello-world",
    );

    // Store a value in plugin config
    await context.config.set("loadCount", ((await context.config.get("loadCount")) || 0) + 1);
    const loadCount = await context.config.get("loadCount");
    context.logger.info(`This plugin has been loaded ${loadCount} time(s)`);
  },

  /**
   * Called when the plugin is unloaded
   * Note: context is not available in onUnload, so we use console.log directly
   */
  async onUnload() {
    console.log("Hello World plugin unloaded!");
  },

  /**
   * Custom API routes
   * Mounted at /api/x/hello-world/
   * @param {import('hono').Hono} app
   */
  routes(app) {
    // GET /api/x/hello-world/
    app.get("/", (c) => {
      return c.json({
        message: "Hello from the Hello World plugin!",
        version: "1.0.0",
        timestamp: new Date().toISOString(),
      });
    });

    // GET /api/x/hello-world/greet/:name
    app.get("/greet/:name", (c) => {
      const name = c.req.param("name");
      return c.json({
        greeting: `Hello, ${name}! Welcome to Rox.`,
      });
    });

    // GET /api/x/hello-world/stats
    app.get("/stats", async (c) => {
      // This demonstrates accessing plugin config from routes
      // Note: In a real plugin, you'd store the context reference
      return c.json({
        status: "running",
        uptime: process.uptime(),
      });
    });
  },
};

export default helloWorldPlugin;
