/**
 * SQLite Instance Settings Repository
 *
 * SQLite/D1 implementation of the IInstanceSettingsRepository interface.
 *
 * @module repositories/sqlite/SqliteInstanceSettingsRepository
 */

import { eq, inArray } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { instanceSettings, type InstanceSetting } from "../../db/schema/sqlite.js";
import type * as sqliteSchema from "../../db/schema/sqlite.js";
import type {
  IInstanceSettingsRepository,
  InstanceSettingKey,
} from "../../interfaces/repositories/IInstanceSettingsRepository.js";

type SqliteDatabase = BetterSQLite3Database<typeof sqliteSchema>;

/**
 * SQLite implementation of Instance Settings Repository
 */
export class SqliteInstanceSettingsRepository implements IInstanceSettingsRepository {
  constructor(private db: SqliteDatabase) {}

  async get<T>(key: InstanceSettingKey): Promise<T | null> {
    const [result] = this.db
      .select()
      .from(instanceSettings)
      .where(eq(instanceSettings.key, key))
      .limit(1)
      .all();

    if (!result) {
      return null;
    }

    return result.value as T;
  }

  async set<T>(key: InstanceSettingKey, value: T, updatedById?: string): Promise<InstanceSetting> {
    // SQLite uses INSERT OR REPLACE
    const [existing] = this.db
      .select()
      .from(instanceSettings)
      .where(eq(instanceSettings.key, key))
      .limit(1)
      .all();

    if (existing) {
      this.db
        .update(instanceSettings)
        .set({
          value: value as unknown as Record<string, unknown>,
          updatedAt: new Date(),
          updatedById: updatedById ?? null,
        })
        .where(eq(instanceSettings.key, key))
        .run();
    } else {
      this.db
        .insert(instanceSettings)
        .values({
          key,
          value: value as unknown as Record<string, unknown>,
          updatedAt: new Date(),
          updatedById: updatedById ?? null,
        })
        .run();
    }

    // Fetch the record
    const [result] = this.db.select().from(instanceSettings).where(eq(instanceSettings.key, key)).limit(1).all();

    if (!result) {
      throw new Error("Failed to set instance setting");
    }

    return result as InstanceSetting;
  }

  async getMany(keys: InstanceSettingKey[]): Promise<Map<InstanceSettingKey, unknown>> {
    const results = this.db
      .select()
      .from(instanceSettings)
      .where(inArray(instanceSettings.key, keys))
      .all();

    const map = new Map<InstanceSettingKey, unknown>();
    for (const result of results) {
      map.set(result.key as InstanceSettingKey, result.value);
    }

    return map;
  }

  async getAll(): Promise<InstanceSetting[]> {
    return this.db.select().from(instanceSettings).all() as InstanceSetting[];
  }

  async getAllAsObject(): Promise<Record<string, unknown>> {
    const results = this.db.select().from(instanceSettings).all();

    const obj: Record<string, unknown> = {};
    for (const result of results) {
      obj[result.key] = result.value;
    }

    return obj;
  }

  async delete(key: InstanceSettingKey): Promise<boolean> {
    // SQLite doesn't support RETURNING, so check existence first
    const existing = await this.get(key);
    if (existing === null) {
      return false;
    }

    this.db.delete(instanceSettings).where(eq(instanceSettings.key, key)).run();

    return true;
  }

  async exists(key: InstanceSettingKey): Promise<boolean> {
    const [result] = this.db
      .select({ key: instanceSettings.key })
      .from(instanceSettings)
      .where(eq(instanceSettings.key, key))
      .limit(1)
      .all();

    return result !== undefined;
  }
}
