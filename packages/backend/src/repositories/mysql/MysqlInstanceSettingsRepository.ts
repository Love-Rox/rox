/**
 * MySQL Instance Settings Repository
 *
 * MySQL implementation of the IInstanceSettingsRepository interface.
 *
 * @module repositories/mysql/MysqlInstanceSettingsRepository
 */

import { eq, inArray } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { instanceSettings, type InstanceSetting } from "../../db/schema/mysql.js";
import type * as mysqlSchema from "../../db/schema/mysql.js";
import type {
  IInstanceSettingsRepository,
  InstanceSettingKey,
} from "../../interfaces/repositories/IInstanceSettingsRepository.js";

type MysqlDatabase = MySql2Database<typeof mysqlSchema>;

/**
 * MySQL implementation of Instance Settings Repository
 */
export class MysqlInstanceSettingsRepository implements IInstanceSettingsRepository {
  constructor(private db: MysqlDatabase) {}

  async get<T>(key: InstanceSettingKey): Promise<T | null> {
    const [result] = await this.db
      .select()
      .from(instanceSettings)
      .where(eq(instanceSettings.key, key))
      .limit(1);

    if (!result) {
      return null;
    }

    return result.value as T;
  }

  async set<T>(key: InstanceSettingKey, value: T, updatedById?: string): Promise<InstanceSetting> {
    // MySQL uses ON DUPLICATE KEY UPDATE instead of ON CONFLICT DO UPDATE
    await this.db
      .insert(instanceSettings)
      .values({
        key,
        value: value as unknown as Record<string, unknown>,
        updatedAt: new Date(),
        updatedById: updatedById ?? null,
      })
      .onDuplicateKeyUpdate({
        set: {
          value: value as unknown as Record<string, unknown>,
          updatedAt: new Date(),
          updatedById: updatedById ?? null,
        },
      });

    // MySQL doesn't support RETURNING, fetch the record
    const [result] = await this.db.select().from(instanceSettings).where(eq(instanceSettings.key, key)).limit(1);

    if (!result) {
      throw new Error("Failed to set instance setting");
    }

    return result;
  }

  async getMany(keys: InstanceSettingKey[]): Promise<Map<InstanceSettingKey, unknown>> {
    const results = await this.db
      .select()
      .from(instanceSettings)
      .where(inArray(instanceSettings.key, keys));

    const map = new Map<InstanceSettingKey, unknown>();
    for (const result of results) {
      map.set(result.key as InstanceSettingKey, result.value);
    }

    return map;
  }

  async getAll(): Promise<InstanceSetting[]> {
    return this.db.select().from(instanceSettings);
  }

  async getAllAsObject(): Promise<Record<string, unknown>> {
    const results = await this.db.select().from(instanceSettings);

    const obj: Record<string, unknown> = {};
    for (const result of results) {
      obj[result.key] = result.value;
    }

    return obj;
  }

  async delete(key: InstanceSettingKey): Promise<boolean> {
    // MySQL doesn't support RETURNING, so check existence first
    const existing = await this.get(key);
    if (existing === null) {
      return false;
    }

    await this.db.delete(instanceSettings).where(eq(instanceSettings.key, key));

    return true;
  }

  async exists(key: InstanceSettingKey): Promise<boolean> {
    const [result] = await this.db
      .select({ key: instanceSettings.key })
      .from(instanceSettings)
      .where(eq(instanceSettings.key, key))
      .limit(1);

    return result !== undefined;
  }
}
