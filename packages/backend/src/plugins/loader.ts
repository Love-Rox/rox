/**
 * Plugin Loader
 *
 * Discovers, loads, and manages plugins from the filesystem.
 * Handles plugin lifecycle (load/unload) and dependency resolution.
 *
 * @module plugins/loader
 */

import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { Hono } from "hono";
import { EventBus } from "../lib/events.js";
import { logger as rootLogger } from "../lib/logger.js";
import type { MiddlewareHandler } from "hono";
import type {
  RoxPlugin,
  PluginManifest,
  LoadedPlugin,
  PluginContext,
  PluginPermission,
  PluginActivity,
} from "./types.js";

const logger = rootLogger.child({ module: "PluginLoader" });

/**
 * Plugin configuration storage interface
 */
export interface IPluginConfigStorage {
  get<T>(pluginId: string, key: string, defaultValue?: T): Promise<T | undefined>;
  set<T>(pluginId: string, key: string, value: T): Promise<void>;
  delete(pluginId: string, key: string): Promise<void>;
  deleteAll(pluginId: string): Promise<void>;
}

/**
 * In-memory plugin configuration storage
 * For development/testing purposes
 */
export class InMemoryPluginConfigStorage implements IPluginConfigStorage {
  private storage: Map<string, Map<string, unknown>> = new Map();

  async get<T>(pluginId: string, key: string, defaultValue?: T): Promise<T | undefined> {
    const pluginConfig = this.storage.get(pluginId);
    if (!pluginConfig) return defaultValue;
    const value = pluginConfig.get(key);
    return (value as T) ?? defaultValue;
  }

  async set<T>(pluginId: string, key: string, value: T): Promise<void> {
    let pluginConfig = this.storage.get(pluginId);
    if (!pluginConfig) {
      pluginConfig = new Map();
      this.storage.set(pluginId, pluginConfig);
    }
    pluginConfig.set(key, value);
  }

  async delete(pluginId: string, key: string): Promise<void> {
    const pluginConfig = this.storage.get(pluginId);
    if (pluginConfig) {
      pluginConfig.delete(key);
    }
  }

  async deleteAll(pluginId: string): Promise<void> {
    this.storage.delete(pluginId);
  }
}

/**
 * Options for PluginLoader
 */
export interface PluginLoaderOptions {
  /** Directory to load plugins from */
  pluginsDir: string;
  /** Event bus instance */
  eventBus: EventBus;
  /** Plugin configuration storage */
  configStorage: IPluginConfigStorage;
  /** Base URL of the instance */
  baseUrl: string;
  /** Instance name */
  instanceName: string;
  /** Rox version for compatibility check */
  roxVersion: string;
}

/**
 * Plugin load result
 */
export interface PluginLoadResult {
  success: boolean;
  pluginId?: string;
  error?: string;
}

/**
 * Plugin Loader
 *
 * Manages the plugin lifecycle including:
 * - Discovery from filesystem
 * - Loading and initialization
 * - Dependency resolution
 * - Graceful unloading
 *
 * @example
 * ```typescript
 * const loader = new PluginLoader({
 *   pluginsDir: './plugins',
 *   eventBus,
 *   configStorage: new InMemoryPluginConfigStorage(),
 *   baseUrl: 'https://example.com',
 *   instanceName: 'My Instance',
 *   roxVersion: '2025.12.0',
 * });
 *
 * await loader.loadAll();
 * const plugins = loader.getLoadedPlugins();
 * ```
 */
export class PluginLoader {
  private plugins: Map<string, LoadedPlugin> = new Map();
  private pluginsDir: string;
  private eventBus: EventBus;
  private configStorage: IPluginConfigStorage;
  private baseUrl: string;
  private instanceName: string;
  private roxVersion: string;

  constructor(options: PluginLoaderOptions) {
    this.pluginsDir = resolve(options.pluginsDir);
    this.eventBus = options.eventBus;
    this.configStorage = options.configStorage;
    this.baseUrl = options.baseUrl;
    this.instanceName = options.instanceName;
    this.roxVersion = options.roxVersion;
  }

  /**
   * Load all plugins from the plugins directory
   */
  async loadAll(): Promise<PluginLoadResult[]> {
    const results: PluginLoadResult[] = [];

    try {
      const entries = await readdir(this.pluginsDir, { withFileTypes: true });
      const pluginDirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);

      logger.info({ pluginsDir: this.pluginsDir, count: pluginDirs.length }, "Discovering plugins");

      // First pass: load all manifests to resolve dependencies
      const manifests = new Map<string, { dir: string; manifest: PluginManifest }>();

      for (const dir of pluginDirs) {
        const pluginPath = join(this.pluginsDir, dir);
        try {
          const manifest = await this.loadManifest(pluginPath);
          manifests.set(manifest.id, { dir: pluginPath, manifest });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown error";
          logger.warn({ pluginDir: dir, error: message }, "Failed to load plugin manifest");
          results.push({ success: false, error: `${dir}: ${message}` });
        }
      }

      // Sort by dependencies (topological sort)
      const loadOrder = this.resolveDependencies(manifests);

      // Second pass: load plugins in dependency order
      for (const pluginId of loadOrder) {
        const entry = manifests.get(pluginId);
        if (!entry) continue;

        const result = await this.loadPlugin(entry.dir, entry.manifest);
        results.push(result);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      logger.error({ error: message }, "Failed to discover plugins directory");
      // If plugins dir doesn't exist, that's okay - just no plugins
    }

    return results;
  }

  /**
   * Load a single plugin from a directory
   */
  async loadPlugin(pluginPath: string, manifest?: PluginManifest): Promise<PluginLoadResult> {
    try {
      // Load manifest if not provided
      if (!manifest) {
        manifest = await this.loadManifest(pluginPath);
      }

      // Check if already loaded
      if (this.plugins.has(manifest.id)) {
        return { success: false, pluginId: manifest.id, error: "Plugin already loaded" };
      }

      // Check version compatibility
      if (manifest.minRoxVersion && !this.isVersionCompatible(manifest.minRoxVersion)) {
        return {
          success: false,
          pluginId: manifest.id,
          error: `Requires Rox version ${manifest.minRoxVersion} or higher`,
        };
      }

      // Check dependencies
      if (manifest.dependencies) {
        for (const depId of manifest.dependencies) {
          if (!this.plugins.has(depId)) {
            return {
              success: false,
              pluginId: manifest.id,
              error: `Missing dependency: ${depId}`,
            };
          }
        }
      }

      // Load the plugin module
      const indexPath = join(pluginPath, "index.js");
      const module = await import(indexPath);
      const plugin: RoxPlugin = module.default || module;

      // Validate plugin structure
      if (!this.validatePlugin(plugin)) {
        return { success: false, pluginId: manifest.id, error: "Invalid plugin structure" };
      }

      // Check manifest.id and plugin.id match to prevent handler/config key mismatches
      if (manifest.id !== plugin.id) {
        return {
          success: false,
          pluginId: manifest.id,
          error: `Plugin ID mismatch: manifest has "${manifest.id}" but plugin exports "${plugin.id}"`,
        };
      }

      // Create plugin context
      const context = this.createPluginContext(plugin.id);

      // Call onLoad
      if (plugin.onLoad) {
        await plugin.onLoad(context);
      }

      // Register the plugin
      const loadedPlugin: LoadedPlugin = {
        plugin,
        manifest,
        enabled: true,
        loadedAt: new Date(),
      };

      this.plugins.set(manifest.id, loadedPlugin);
      logger.info({ pluginId: manifest.id, version: manifest.version }, "Plugin loaded");

      return { success: true, pluginId: manifest.id };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      logger.error({ pluginPath, error: message }, "Failed to load plugin");
      return { success: false, error: message };
    }
  }

  /**
   * Unload a plugin by ID
   */
  async unloadPlugin(pluginId: string): Promise<boolean> {
    const loaded = this.plugins.get(pluginId);
    if (!loaded) {
      logger.warn({ pluginId }, "Plugin not found for unload");
      return false;
    }

    // Check if other plugins depend on this one
    for (const [id, other] of this.plugins) {
      if (other.manifest.dependencies?.includes(pluginId)) {
        logger.warn({ pluginId, dependentId: id }, "Cannot unload: other plugins depend on it");
        return false;
      }
    }

    try {
      // Call onUnload
      if (loaded.plugin.onUnload) {
        await loaded.plugin.onUnload();
      }

      // Unregister event handlers
      this.eventBus.offPlugin(pluginId);

      // Remove from loaded plugins
      this.plugins.delete(pluginId);
      logger.info({ pluginId }, "Plugin unloaded");

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      logger.error({ pluginId, error: message }, "Error during plugin unload");
      return false;
    }
  }

  /**
   * Unload all plugins (in reverse dependency order)
   */
  async unloadAll(): Promise<void> {
    const loadedIds = Array.from(this.plugins.keys());
    const unloadOrder = this.getUnloadOrder(loadedIds);

    for (const pluginId of unloadOrder) {
      await this.unloadPlugin(pluginId);
    }
  }

  /**
   * Get all loaded plugins
   */
  getLoadedPlugins(): LoadedPlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get a specific loaded plugin
   */
  getPlugin(pluginId: string): LoadedPlugin | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * Check if a plugin is loaded
   */
  isLoaded(pluginId: string): boolean {
    return this.plugins.has(pluginId);
  }

  /**
   * Enable/disable a plugin
   */
  async setEnabled(pluginId: string, enabled: boolean): Promise<boolean> {
    const loaded = this.plugins.get(pluginId);
    if (!loaded) return false;

    if (enabled && !loaded.enabled) {
      // Re-enable: call onLoad
      const context = this.createPluginContext(pluginId);
      if (loaded.plugin.onLoad) {
        await loaded.plugin.onLoad(context);
      }
    } else if (!enabled && loaded.enabled) {
      // Disable: call onUnload but keep in memory
      if (loaded.plugin.onUnload) {
        await loaded.plugin.onUnload();
      }
      this.eventBus.offPlugin(pluginId);
    }

    loaded.enabled = enabled;
    return true;
  }

  /**
   * Get plugins that provide routes
   */
  getPluginsWithRoutes(): Array<{ pluginId: string; routes: (app: Hono) => void }> {
    const result: Array<{ pluginId: string; routes: (app: Hono) => void }> = [];

    for (const [pluginId, loaded] of this.plugins) {
      if (loaded.enabled && loaded.plugin.routes) {
        result.push({ pluginId, routes: loaded.plugin.routes });
      }
    }

    return result;
  }

  /**
   * Get plugins that provide middleware
   */
  getPluginsWithMiddleware(): Array<{ pluginId: string; middleware: MiddlewareHandler[] }> {
    const result: Array<{ pluginId: string; middleware: MiddlewareHandler[] }> = [];

    for (const [pluginId, loaded] of this.plugins) {
      if (loaded.enabled && loaded.plugin.middleware && loaded.plugin.middleware.length > 0) {
        result.push({ pluginId, middleware: loaded.plugin.middleware });
      }
    }

    return result;
  }

  /**
   * Get plugins that provide ActivityPub handlers
   */
  getActivityPubHandlers(): Map<
    string,
    Array<{
      pluginId: string;
      handler: (activity: PluginActivity, context: PluginContext) => Promise<void>;
    }>
  > {
    const handlers = new Map<
      string,
      Array<{
        pluginId: string;
        handler: (activity: PluginActivity, context: PluginContext) => Promise<void>;
      }>
    >();

    for (const [pluginId, loaded] of this.plugins) {
      if (!loaded.enabled || !loaded.plugin.activityHandlers) continue;

      for (const [activityType, handler] of Object.entries(loaded.plugin.activityHandlers)) {
        if (!handlers.has(activityType)) {
          handlers.set(activityType, []);
        }
        handlers.get(activityType)!.push({ pluginId, handler });
      }
    }

    return handlers;
  }

  // Private methods

  /**
   * Load plugin manifest from directory
   */
  private async loadManifest(pluginPath: string): Promise<PluginManifest> {
    // Try plugin.json first, then package.json
    const manifestPaths = [join(pluginPath, "plugin.json"), join(pluginPath, "package.json")];

    for (const path of manifestPaths) {
      try {
        const content = await readFile(path, "utf-8");
        const json = JSON.parse(content);

        // Validate required fields
        if (!json.id || !json.name || !json.version) {
          throw new Error("Manifest missing required fields: id, name, version");
        }

        return {
          id: json.id,
          name: json.name,
          version: json.version,
          description: json.description,
          author: json.author,
          homepage: json.homepage || json.repository,
          minRoxVersion: json.minRoxVersion,
          dependencies: json.dependencies
            ? Array.isArray(json.dependencies)
              ? json.dependencies
              : Object.keys(json.dependencies)
            : undefined,
          permissions: json.permissions as PluginPermission[],
        };
      } catch {
        // Try next path
      }
    }

    throw new Error(`No valid manifest found in ${pluginPath}`);
  }

  /**
   * Validate plugin structure
   */
  private validatePlugin(plugin: unknown): plugin is RoxPlugin {
    if (!plugin || typeof plugin !== "object") return false;
    const p = plugin as Record<string, unknown>;
    return (
      typeof p.id === "string" && typeof p.name === "string" && typeof p.version === "string"
    );
  }

  /**
   * Create plugin context for a plugin
   */
  private createPluginContext(pluginId: string): PluginContext {
    const configStorage = this.configStorage;

    return {
      events: this.eventBus,
      logger: {
        debug: (message: string, ...args: unknown[]) =>
          logger.debug({ pluginId, args }, message),
        info: (message: string, ...args: unknown[]) => logger.info({ pluginId, args }, message),
        warn: (message: string, ...args: unknown[]) => logger.warn({ pluginId, args }, message),
        error: (message: string, ...args: unknown[]) =>
          logger.error({ pluginId, args }, message),
      },
      config: {
        get: <T>(key: string, defaultValue?: T) => configStorage.get(pluginId, key, defaultValue),
        set: <T>(key: string, value: T) => configStorage.set(pluginId, key, value),
        delete: (key: string) => configStorage.delete(pluginId, key),
      },
      baseUrl: this.baseUrl,
      instanceName: this.instanceName,
    };
  }

  /**
   * Check version compatibility
   */
  private isVersionCompatible(minVersion: string): boolean {
    // Simple version comparison (assumes CalVer: YYYY.MM.patch)
    const current = this.roxVersion.split(".").map(Number);
    const min = minVersion.split(".").map(Number);

    for (let i = 0; i < Math.max(current.length, min.length); i++) {
      const c = current[i] || 0;
      const m = min[i] || 0;
      if (c > m) return true;
      if (c < m) return false;
    }
    return true;
  }

  /**
   * Resolve dependencies and return load order
   */
  private resolveDependencies(
    manifests: Map<string, { dir: string; manifest: PluginManifest }>,
  ): string[] {
    const result: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (id: string) => {
      if (visited.has(id)) return;
      if (visiting.has(id)) {
        logger.warn({ pluginId: id }, "Circular dependency detected");
        return;
      }

      const entry = manifests.get(id);
      if (!entry) return;

      visiting.add(id);

      if (entry.manifest.dependencies) {
        for (const depId of entry.manifest.dependencies) {
          visit(depId);
        }
      }

      visiting.delete(id);
      visited.add(id);
      result.push(id);
    };

    for (const id of manifests.keys()) {
      visit(id);
    }

    return result;
  }

  /**
   * Get unload order (reverse of dependency order)
   */
  private getUnloadOrder(pluginIds: string[]): string[] {
    // Build dependency graph
    const dependents = new Map<string, Set<string>>();

    for (const id of pluginIds) {
      const loaded = this.plugins.get(id);
      if (!loaded) continue;

      if (loaded.manifest.dependencies) {
        for (const depId of loaded.manifest.dependencies) {
          if (!dependents.has(depId)) {
            dependents.set(depId, new Set());
          }
          dependents.get(depId)!.add(id);
        }
      }
    }

    // Topological sort in reverse
    const result: string[] = [];
    const visited = new Set<string>();

    const visit = (id: string) => {
      if (visited.has(id)) return;
      visited.add(id);

      const deps = dependents.get(id);
      if (deps) {
        for (const depId of deps) {
          visit(depId);
        }
      }

      result.push(id);
    };

    for (const id of pluginIds) {
      visit(id);
    }

    return result;
  }
}
