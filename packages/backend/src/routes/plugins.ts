/**
 * Plugin API Routes
 *
 * Provides endpoints for plugin information and management.
 *
 * @module routes/plugins
 */

import { Hono } from "hono";
import type { Context } from "hono";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { getPluginSystemStatus } from "../plugins/init.js";
import type { PluginLoader } from "../plugins/loader.js";

const plugins = new Hono();

/**
 * GET /api/plugins
 *
 * Get list of loaded plugins (public endpoint)
 *
 * @returns {object} Plugin system status
 */
plugins.get("/", (c: Context) => {
  const pluginLoader = c.get("pluginLoader") as PluginLoader | undefined;

  if (!pluginLoader) {
    return c.json({
      enabled: false,
      loaded: 0,
      plugins: [],
    });
  }

  const status = getPluginSystemStatus(pluginLoader);

  // Filter out sensitive info for public endpoint
  return c.json({
    enabled: status.enabled,
    loaded: status.loaded,
    plugins: status.plugins.map((p) => ({
      id: p.id,
      name: p.name,
      version: p.version,
      enabled: p.enabled,
    })),
  });
});

/**
 * GET /api/plugins/:id
 *
 * Get details for a specific plugin
 *
 * @param {string} id - Plugin ID
 * @returns {object} Plugin details
 */
plugins.get("/:id", (c: Context) => {
  const pluginLoader = c.get("pluginLoader") as PluginLoader | undefined;
  const pluginId = c.req.param("id");

  if (!pluginLoader) {
    return c.json({ error: "Plugin system not enabled" }, 503);
  }

  const loaded = pluginLoader.getPlugin(pluginId);

  if (!loaded) {
    return c.json({ error: "Plugin not found" }, 404);
  }

  return c.json({
    id: loaded.plugin.id,
    name: loaded.plugin.name,
    version: loaded.plugin.version,
    description: loaded.plugin.description,
    enabled: loaded.enabled,
    loadedAt: loaded.loadedAt,
    error: loaded.error,
  });
});

/**
 * POST /api/plugins/:id/enable
 *
 * Enable a plugin (admin only)
 *
 * @auth Required (Admin)
 * @param {string} id - Plugin ID
 * @returns {object} Success status
 */
plugins.post("/:id/enable", requireAuth(), requireAdmin(), async (c: Context) => {
  const pluginLoader = c.get("pluginLoader") as PluginLoader | undefined;
  const pluginId = c.req.param("id");

  if (!pluginLoader) {
    return c.json({ error: "Plugin system not enabled" }, 503);
  }

  const success = await pluginLoader.setEnabled(pluginId, true);

  if (!success) {
    return c.json({ error: "Plugin not found" }, 404);
  }

  return c.json({ success: true });
});

/**
 * POST /api/plugins/:id/disable
 *
 * Disable a plugin (admin only)
 *
 * @auth Required (Admin)
 * @param {string} id - Plugin ID
 * @returns {object} Success status
 */
plugins.post("/:id/disable", requireAuth(), requireAdmin(), async (c: Context) => {
  const pluginLoader = c.get("pluginLoader") as PluginLoader | undefined;
  const pluginId = c.req.param("id");

  if (!pluginLoader) {
    return c.json({ error: "Plugin system not enabled" }, 503);
  }

  const success = await pluginLoader.setEnabled(pluginId, false);

  if (!success) {
    return c.json({ error: "Plugin not found" }, 404);
  }

  return c.json({ success: true });
});

export default plugins;
