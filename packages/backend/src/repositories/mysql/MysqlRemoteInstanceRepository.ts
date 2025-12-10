/**
 * MySQL Remote Instance Repository
 *
 * MySQL implementation of the IRemoteInstanceRepository interface.
 *
 * @module repositories/mysql/MysqlRemoteInstanceRepository
 */

import { eq, lt, inArray, sql } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { remoteInstances } from "../../db/schema/mysql.js";
import type * as mysqlSchema from "../../db/schema/mysql.js";
import type { IRemoteInstanceRepository } from "../../interfaces/repositories/IRemoteInstanceRepository.js";
import type { RemoteInstance } from "shared";

type MysqlDatabase = MySql2Database<typeof mysqlSchema>;

export class MysqlRemoteInstanceRepository implements IRemoteInstanceRepository {
  constructor(private db: MysqlDatabase) {}

  async findByHost(host: string): Promise<RemoteInstance | null> {
    const [result] = await this.db
      .select()
      .from(remoteInstances)
      .where(eq(remoteInstances.host, host))
      .limit(1);

    return (result as RemoteInstance) ?? null;
  }

  async findByHosts(hosts: string[]): Promise<RemoteInstance[]> {
    if (hosts.length === 0) return [];

    const results = await this.db
      .select()
      .from(remoteInstances)
      .where(inArray(remoteInstances.host, hosts));

    return results as RemoteInstance[];
  }

  async upsert(instance: Partial<RemoteInstance> & { host: string }): Promise<RemoteInstance> {
    const now = new Date();

    // MySQL uses ON DUPLICATE KEY UPDATE instead of ON CONFLICT DO UPDATE
    await this.db
      .insert(remoteInstances)
      .values({
        ...instance,
        createdAt: now,
        updatedAt: now,
      })
      .onDuplicateKeyUpdate({
        set: {
          ...instance,
          updatedAt: now,
        },
      });

    // MySQL doesn't support RETURNING, fetch the record
    const [result] = await this.db.select().from(remoteInstances).where(eq(remoteInstances.host, instance.host)).limit(1);

    if (!result) {
      throw new Error("Failed to upsert remote instance");
    }

    return result as RemoteInstance;
  }

  async findAll(options?: { limit?: number; offset?: number }): Promise<RemoteInstance[]> {
    const results = await this.db
      .select()
      .from(remoteInstances)
      .limit(options?.limit ?? 100)
      .offset(options?.offset ?? 0);

    return results as RemoteInstance[];
  }

  async findStale(olderThan: Date, limit = 100): Promise<RemoteInstance[]> {
    const results = await this.db
      .select()
      .from(remoteInstances)
      .where(lt(remoteInstances.lastFetchedAt, olderThan))
      .limit(limit);

    return results as RemoteInstance[];
  }

  async incrementErrorCount(host: string, errorMessage?: string): Promise<void> {
    await this.db
      .update(remoteInstances)
      .set({
        fetchErrorCount: sql`${remoteInstances.fetchErrorCount} + 1`,
        lastFetchError: errorMessage ?? null,
        updatedAt: new Date(),
      })
      .where(eq(remoteInstances.host, host));
  }

  async resetErrorCount(host: string): Promise<void> {
    await this.db
      .update(remoteInstances)
      .set({
        fetchErrorCount: 0,
        lastFetchError: null,
        updatedAt: new Date(),
      })
      .where(eq(remoteInstances.host, host));
  }

  async markForRefresh(host: string): Promise<void> {
    await this.db
      .update(remoteInstances)
      .set({
        lastFetchedAt: null,
        fetchErrorCount: 0,
        lastFetchError: null,
        updatedAt: new Date(),
      })
      .where(eq(remoteInstances.host, host));
  }

  async count(): Promise<number> {
    const result = await this.db.select({ count: sql<number>`CAST(COUNT(*) AS SIGNED)` }).from(remoteInstances);
    return Number(result[0]?.count ?? 0);
  }

  async delete(host: string): Promise<void> {
    await this.db.delete(remoteInstances).where(eq(remoteInstances.host, host));
  }
}
