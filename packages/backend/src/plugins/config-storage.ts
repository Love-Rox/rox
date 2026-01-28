/**
 * Plugin Configuration Storage
 *
 * Database-backed storage for plugin configurations.
 * Uses Drizzle ORM for database operations.
 *
 * @module plugins/config-storage
 */

import { eq, and } from "drizzle-orm";
import { pluginConfigs } from "../db/schema/pg.js";
import type { IPluginConfigStorage } from "./loader.js";
import type { Database } from "../db/index.js";

/**
 * Database-backed plugin configuration storage
 *
 * @example
 * ```typescript
 * const storage = new DatabasePluginConfigStorage(db);
 * await storage.set('my-plugin', 'setting1', { value: true });
 * const value = await storage.get('my-plugin', 'setting1');
 * ```
 */
export class DatabasePluginConfigStorage implements IPluginConfigStorage {
  constructor(private readonly db: Database) {}

  /**
   * Get a configuration value for a plugin
   */
  async get<T>(pluginId: string, key: string, defaultValue?: T): Promise<T | undefined> {
    const result = await this.db
      .select({ value: pluginConfigs.value })
      .from(pluginConfigs)
      .where(and(eq(pluginConfigs.pluginId, pluginId), eq(pluginConfigs.key, key)))
      .limit(1);

    const row = result[0];
    if (!row) {
      return defaultValue;
    }

    return row.value as T;
  }

  /**
   * Set a configuration value for a plugin
   */
  async set<T>(pluginId: string, key: string, value: T): Promise<void> {
    const id = `${pluginId}:${key}`;

    await this.db
      .insert(pluginConfigs)
      .values({
        id,
        pluginId,
        key,
        value: value as unknown,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: pluginConfigs.id,
        set: {
          value: value as unknown,
          updatedAt: new Date(),
        },
      });
  }

  /**
   * Delete a configuration value for a plugin
   */
  async delete(pluginId: string, key: string): Promise<void> {
    await this.db
      .delete(pluginConfigs)
      .where(and(eq(pluginConfigs.pluginId, pluginId), eq(pluginConfigs.key, key)));
  }

  /**
   * Delete all configuration values for a plugin
   */
  async deleteAll(pluginId: string): Promise<void> {
    await this.db.delete(pluginConfigs).where(eq(pluginConfigs.pluginId, pluginId));
  }
}
