/**
 * Frontend Plugin Registry
 *
 * Manages the registration and retrieval of frontend plugins.
 * Provides a central point for slot component lookup.
 *
 * @module lib/plugins/registry
 */

import type { ComponentType } from "react";
import type { SlotName } from "./slots";
import type {
  FrontendPlugin,
  LoadedFrontendPlugin,
  SlotProps,
} from "./types";

/**
 * Slot component entry
 */
interface SlotEntry<T extends SlotName = SlotName> {
  pluginId: string;
  component: ComponentType<SlotProps<T>>;
  priority: number;
}

/**
 * Plugin Registry
 *
 * Singleton class that manages frontend plugins.
 *
 * @example
 * ```typescript
 * const registry = PluginRegistry.getInstance();
 *
 * // Register a plugin
 * registry.register(myPlugin);
 *
 * // Get components for a slot
 * const components = registry.getSlotComponents('note:footer');
 * ```
 */
class PluginRegistry {
  private static instance: PluginRegistry;

  private plugins: Map<string, LoadedFrontendPlugin> = new Map();
  private slotComponents: Map<SlotName, SlotEntry[]> = new Map();
  private listeners: Set<() => void> = new Set();
  private registering: Set<string> = new Set();
  // Cache uses unknown[] to avoid complex generic type issues
  // The cache is type-safe at runtime since we only store what getSlotComponents computes
  private slotComponentsCache: Map<SlotName, unknown[]> = new Map();

  private constructor() {}

  /**
   * Get the singleton instance
   */
  static getInstance(): PluginRegistry {
    if (!PluginRegistry.instance) {
      PluginRegistry.instance = new PluginRegistry();
    }
    return PluginRegistry.instance;
  }

  /**
   * Register a plugin
   *
   * @param plugin - Plugin to register
   * @param priority - Priority for slot components (higher = rendered first)
   */
  async register(plugin: FrontendPlugin, priority = 0): Promise<void> {
    // Check if already registered or currently registering
    if (this.plugins.has(plugin.id) || this.registering.has(plugin.id)) {
      console.warn(`Plugin ${plugin.id} is already registered`);
      return;
    }

    this.registering.add(plugin.id);
    try {
      // Call onLoad if defined
      if (plugin.onLoad) {
        await plugin.onLoad();
      }

      // Register slot components
      if (plugin.slots) {
        for (const [slotName, component] of Object.entries(plugin.slots)) {
          if (component) {
            this.registerSlotComponent(
              slotName as SlotName,
              plugin.id,
              component as ComponentType<SlotProps<SlotName>>,
              priority,
            );
          }
        }
      }

      // Store plugin
      this.plugins.set(plugin.id, {
        plugin,
        enabled: true,
        loadedAt: new Date(),
      });

      // Notify listeners
      this.notifyListeners();

      console.log(`Plugin ${plugin.id} registered successfully`);
    } catch (error) {
      console.error(`Failed to register plugin ${plugin.id}:`, error);

      // Store with error
      this.plugins.set(plugin.id, {
        plugin,
        enabled: false,
        loadedAt: new Date(),
        error: error instanceof Error ? error.message : "Unknown error",
      });

      // Notify listeners so UI can reflect the failure state
      this.notifyListeners();
    } finally {
      this.registering.delete(plugin.id);
    }
  }

  /**
   * Unregister a plugin
   *
   * @param pluginId - Plugin ID to unregister
   */
  async unregister(pluginId: string): Promise<void> {
    const loaded = this.plugins.get(pluginId);
    if (!loaded) {
      return;
    }

    try {
      // Call onUnload if defined
      if (loaded.plugin.onUnload) {
        await loaded.plugin.onUnload();
      }
    } catch (error) {
      console.error(`Error during plugin ${pluginId} unload:`, error);
    }

    // Remove slot components
    for (const [slotName, entries] of this.slotComponents) {
      const filtered = entries.filter((e) => e.pluginId !== pluginId);
      if (filtered.length > 0) {
        this.slotComponents.set(slotName, filtered);
      } else {
        this.slotComponents.delete(slotName);
      }
    }

    // Remove plugin
    this.plugins.delete(pluginId);

    // Notify listeners
    this.notifyListeners();

    console.log(`Plugin ${pluginId} unregistered`);
  }

  /**
   * Get all loaded plugins
   */
  getPlugins(): LoadedFrontendPlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get a specific plugin
   */
  getPlugin(pluginId: string): LoadedFrontendPlugin | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * Check if a plugin is registered
   */
  isRegistered(pluginId: string): boolean {
    return this.plugins.has(pluginId);
  }

  /**
   * Get components for a specific slot
   *
   * @param slotName - Slot name to get components for
   * @returns Array of slot entries sorted by priority (highest first)
   */
  getSlotComponents<T extends SlotName>(slotName: T): SlotEntry<T>[] {
    // Return cached result if available
    const cached = this.slotComponentsCache.get(slotName);
    if (cached) {
      return cached as SlotEntry<T>[];
    }

    const entries = this.slotComponents.get(slotName) || [];
    // Filter by enabled plugins
    const enabledEntries = entries.filter((e) => {
      const plugin = this.plugins.get(e.pluginId);
      return plugin?.enabled;
    });
    // Sort by priority (highest first)
    const result = [...enabledEntries].sort((a, b) => b.priority - a.priority) as SlotEntry<T>[];

    // Cache the result
    this.slotComponentsCache.set(slotName, result);
    return result;
  }

  /**
   * Check if a slot has any components
   */
  hasSlotComponents(slotName: SlotName): boolean {
    return this.getSlotComponents(slotName).length > 0;
  }

  /**
   * Get all pages from all plugins
   */
  getAllPages(): Array<{
    pluginId: string;
    path: string;
    component: ComponentType;
    title?: string;
    requiresAuth?: boolean;
  }> {
    const pages: Array<{
      pluginId: string;
      path: string;
      component: ComponentType;
      title?: string;
      requiresAuth?: boolean;
    }> = [];

    for (const [pluginId, loaded] of this.plugins) {
      if (!loaded.enabled || !loaded.plugin.pages) continue;

      for (const page of loaded.plugin.pages) {
        pages.push({
          pluginId,
          ...page,
        });
      }
    }

    return pages;
  }

  /**
   * Subscribe to registry changes
   *
   * @param listener - Callback function
   * @returns Unsubscribe function
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Clear all plugins (for testing)
   */
  clear(): void {
    this.plugins.clear();
    this.slotComponents.clear();
    this.notifyListeners();
  }

  // Private methods

  private registerSlotComponent<T extends SlotName>(
    slotName: T,
    pluginId: string,
    component: ComponentType<SlotProps<T>>,
    priority: number,
  ): void {
    const entries = this.slotComponents.get(slotName) || [];
    entries.push({
      pluginId,
      component: component as ComponentType<SlotProps<SlotName>>,
      priority,
    });
    this.slotComponents.set(slotName, entries);
  }

  private notifyListeners(): void {
    // Invalidate slot components cache
    this.slotComponentsCache.clear();

    for (const listener of this.listeners) {
      try {
        listener();
      } catch (error) {
        console.error("Plugin registry listener error:", error);
      }
    }
  }
}

/**
 * Get the plugin registry instance
 */
export function getPluginRegistry(): PluginRegistry {
  return PluginRegistry.getInstance();
}

/**
 * Register a plugin
 */
export async function registerPlugin(
  plugin: FrontendPlugin,
  priority = 0,
): Promise<void> {
  return getPluginRegistry().register(plugin, priority);
}

/**
 * Unregister a plugin
 */
export async function unregisterPlugin(pluginId: string): Promise<void> {
  return getPluginRegistry().unregister(pluginId);
}
