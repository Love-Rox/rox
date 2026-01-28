/**
 * Plugin System Initialization
 *
 * Handles plugin loading, route registration, and middleware integration.
 *
 * @module plugins/init
 */

import { Hono } from "hono";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { PluginLoader, InMemoryPluginConfigStorage, type IPluginConfigStorage } from "./loader.js";
import { DatabasePluginConfigStorage } from "./config-storage.js";
import type { EventBus } from "../lib/events.js";
import { logger } from "../lib/logger.js";
import type { PluginActivity } from "./types.js";
import packageJson from "../../../../package.json";

const pluginLogger = logger.child({ module: "PluginSystem" });

/**
 * Options for initializing the plugin system
 */
export interface PluginSystemOptions {
  /** Hono app instance */
  app: Hono;
  /** Event bus instance */
  eventBus: EventBus;
  /** Database connection (optional, for persistent config storage) */
  db?: PostgresJsDatabase;
  /** Directory containing plugins */
  pluginsDir?: string;
  /** Base URL of the instance */
  baseUrl: string;
  /** Instance name */
  instanceName: string;
  /** Whether to enable plugins */
  enabled?: boolean;
}

/**
 * Plugin system instance
 */
export interface PluginSystem {
  /** Plugin loader */
  loader: PluginLoader;
  /** Plugin routes Hono sub-app */
  routes: Hono;
  /** Shutdown function */
  shutdown: () => Promise<void>;
}

/**
 * Initialize the plugin system
 *
 * Loads plugins from the plugins directory, registers their routes,
 * and sets up middleware.
 *
 * @example
 * ```typescript
 * const pluginSystem = await initializePluginSystem({
 *   app,
 *   eventBus: container.eventBus,
 *   db: container.db,
 *   baseUrl: process.env.URL,
 *   instanceName: 'My Instance',
 * });
 *
 * // Later, during shutdown:
 * await pluginSystem.shutdown();
 * ```
 */
export async function initializePluginSystem(
  options: PluginSystemOptions,
): Promise<PluginSystem | null> {
  const { app, eventBus, db, baseUrl, instanceName, enabled = true } = options;
  const pluginsDir = options.pluginsDir || "./plugins";

  if (!enabled) {
    pluginLogger.info("Plugin system disabled");
    return null;
  }

  pluginLogger.info({ pluginsDir }, "Initializing plugin system");

  // Create config storage (database-backed if available, otherwise in-memory)
  const configStorage = db
    ? new DatabasePluginConfigStorage(db)
    : new InMemoryPluginConfigStorage();

  // Create plugin loader
  const loader = new PluginLoader({
    pluginsDir,
    eventBus,
    configStorage,
    baseUrl,
    instanceName,
    roxVersion: packageJson.version,
  });

  // Load all plugins
  const results = await loader.loadAll();

  // Log results
  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  if (successful.length > 0) {
    pluginLogger.info(
      { count: successful.length, plugins: successful.map((r) => r.pluginId) },
      "Plugins loaded successfully",
    );
  }

  if (failed.length > 0) {
    pluginLogger.warn(
      { count: failed.length, errors: failed.map((r) => r.error) },
      "Some plugins failed to load",
    );
  }

  // Create plugin routes sub-app
  const pluginRoutes = new Hono();

  // Register plugin routes under /api/x/{pluginId}/
  const pluginsWithRoutes = loader.getPluginsWithRoutes();
  for (const { pluginId, routes } of pluginsWithRoutes) {
    const subApp = new Hono();
    // Add enabled check middleware - routes return 404 when plugin is disabled
    subApp.use("*", async (c, next) => {
      if (!loader.getPlugin(pluginId)?.enabled) {
        return c.notFound();
      }
      return next();
    });
    try {
      routes(subApp);
      pluginRoutes.route(`/${pluginId}`, subApp);
      pluginLogger.debug({ pluginId }, "Registered plugin routes");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      pluginLogger.error({ pluginId, error: message }, "Failed to register plugin routes");
    }
  }

  // Mount plugin routes on main app
  app.route("/api/x", pluginRoutes);

  // Register plugin middleware
  const pluginsWithMiddleware = loader.getPluginsWithMiddleware();
  for (const { pluginId, middleware } of pluginsWithMiddleware) {
    try {
      for (const mw of middleware) {
        app.use("*", mw as never);
      }
      pluginLogger.debug({ pluginId, count: middleware.length }, "Registered plugin middleware");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      pluginLogger.error({ pluginId, error: message }, "Failed to register plugin middleware");
    }
  }

  pluginLogger.info(
    {
      loaded: loader.getLoadedPlugins().length,
      routePlugins: pluginsWithRoutes.length,
      middlewarePlugins: pluginsWithMiddleware.length,
    },
    "Plugin system initialized",
  );

  return {
    loader,
    routes: pluginRoutes,
    shutdown: async () => {
      pluginLogger.info("Shutting down plugin system");
      await loader.unloadAll();
    },
  };
}

/**
 * Options for registering ActivityPub handlers
 */
export interface ActivityPubHandlerOptions {
  /** Plugin loader instance */
  loader: PluginLoader;
  /** Event bus instance for plugin events (can be a read-only reference) */
  eventBus: EventBus;
  /** Config storage for plugin configuration */
  configStorage: IPluginConfigStorage;
  /** Base URL of the instance */
  baseUrl: string;
  /** Instance name */
  instanceName: string;
}

/**
 * Register plugin ActivityPub handlers with InboxService
 *
 * Creates adapter wrappers for plugin handlers and registers them
 * with the InboxService.
 *
 * @param options - Handler registration options
 * @param inboxService - InboxService instance
 */
export function registerPluginActivityPubHandlers(
  options: ActivityPubHandlerOptions,
  // Using interface instead of importing InboxService to avoid circular dependency
  inboxService: {
    registerHandler(handler: {
      readonly activityType: string;
      handle(
        activity: unknown,
        context: { c: unknown; recipientId: string | null; baseUrl: string },
      ): Promise<{ success: boolean; message?: string; error?: Error }>;
    }): void;
  },
): void {
  const { loader, eventBus, configStorage, baseUrl, instanceName } = options;
  const handlers = loader.getActivityPubHandlers();

  for (const [activityType, pluginHandlers] of handlers) {
    // Create a composite handler that calls all plugin handlers
    const compositeHandler = {
      activityType,
      async handle(
        activity: unknown,
        context: { c: unknown; recipientId: string | null; baseUrl: string },
      ): Promise<{ success: boolean; message?: string; error?: Error }> {
        for (const { pluginId, handler } of pluginHandlers) {
          // Skip disabled plugins
          if (!loader.getPlugin(pluginId)?.enabled) {
            continue;
          }
          try {
            // Create plugin context with proper implementations
            const pluginContext = {
              events: eventBus,
              logger: {
                debug: (msg: string, ...args: unknown[]) => pluginLogger.debug({ pluginId, args }, msg),
                info: (msg: string, ...args: unknown[]) => pluginLogger.info({ pluginId, args }, msg),
                warn: (msg: string, ...args: unknown[]) => pluginLogger.warn({ pluginId, args }, msg),
                error: (msg: string, ...args: unknown[]) => pluginLogger.error({ pluginId, args }, msg),
              },
              config: {
                get: <T>(key: string, defaultValue?: T) => configStorage.get<T>(pluginId, key, defaultValue),
                set: <T>(key: string, value: T) => configStorage.set<T>(pluginId, key, value),
                delete: (key: string) => configStorage.delete(pluginId, key),
              },
              baseUrl: context.baseUrl || baseUrl,
              instanceName,
            };
            await handler(activity as PluginActivity, pluginContext);
          } catch (error) {
            const message = error instanceof Error ? error.message : "Unknown error";
            pluginLogger.error(
              { pluginId, activityType, error: message },
              "Plugin ActivityPub handler error",
            );
            // Continue with other handlers even if one fails
          }
        }
        return { success: true };
      },
    };

    inboxService.registerHandler(compositeHandler);
    pluginLogger.debug(
      { activityType, count: pluginHandlers.length },
      "Registered plugin ActivityPub handlers",
    );
  }
}

/**
 * Get plugin system status for admin API
 */
export function getPluginSystemStatus(loader: PluginLoader): {
  enabled: boolean;
  loaded: number;
  plugins: Array<{
    id: string;
    name: string;
    version: string;
    description?: string;
    enabled: boolean;
    loadedAt: Date;
    error?: string;
  }>;
} {
  const plugins = loader.getLoadedPlugins();

  return {
    enabled: true,
    loaded: plugins.length,
    plugins: plugins.map((p) => ({
      id: p.plugin.id,
      name: p.plugin.name,
      version: p.plugin.version,
      description: p.plugin.description,
      enabled: p.enabled,
      loadedAt: p.loadedAt,
      error: p.error,
    })),
  };
}
