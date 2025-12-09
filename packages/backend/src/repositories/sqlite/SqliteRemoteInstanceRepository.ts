/**
 * SQLite Remote Instance Repository
 *
 * SQLite/D1 implementation of the IRemoteInstanceRepository interface.
 *
 * @module repositories/sqlite/SqliteRemoteInstanceRepository
 */

import { eq, lt, inArray, sql } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { remoteInstances } from "../../db/schema/sqlite.js";
import type * as sqliteSchema from "../../db/schema/sqlite.js";
import type { IRemoteInstanceRepository } from "../../interfaces/repositories/IRemoteInstanceRepository.js";
import type { RemoteInstance } from "shared";

type SqliteDatabase = BetterSQLite3Database<typeof sqliteSchema>;

export class SqliteRemoteInstanceRepository implements IRemoteInstanceRepository {
  constructor(private db: SqliteDatabase) {}

  async findByHost(host: string): Promise<RemoteInstance | null> {
    const [result] = this.db
      .select()
      .from(remoteInstances)
      .where(eq(remoteInstances.host, host))
      .limit(1)
      .all();

    return (result as RemoteInstance) ?? null;
  }

  async findByHosts(hosts: string[]): Promise<RemoteInstance[]> {
    if (hosts.length === 0) return [];

    const results = this.db
      .select()
      .from(remoteInstances)
      .where(inArray(remoteInstances.host, hosts))
      .all();

    return results as RemoteInstance[];
  }

  async upsert(instance: Partial<RemoteInstance> & { host: string }): Promise<RemoteInstance> {
    const now = new Date();

    // Check if exists
    const existing = this.db
      .select()
      .from(remoteInstances)
      .where(eq(remoteInstances.host, instance.host))
      .limit(1)
      .all()[0];

    if (existing) {
      this.db
        .update(remoteInstances)
        .set({
          ...instance,
          updatedAt: now,
        })
        .where(eq(remoteInstances.host, instance.host))
        .run();
    } else {
      this.db
        .insert(remoteInstances)
        .values({
          ...instance,
          createdAt: now,
          updatedAt: now,
        })
        .run();
    }

    // Fetch the record
    const [result] = this.db.select().from(remoteInstances).where(eq(remoteInstances.host, instance.host)).limit(1).all();

    if (!result) {
      throw new Error("Failed to upsert remote instance");
    }

    return result as RemoteInstance;
  }

  async findAll(options?: { limit?: number; offset?: number }): Promise<RemoteInstance[]> {
    const results = this.db
      .select()
      .from(remoteInstances)
      .limit(options?.limit ?? 100)
      .offset(options?.offset ?? 0)
      .all();

    return results as RemoteInstance[];
  }

  async findStale(olderThan: Date, limit = 100): Promise<RemoteInstance[]> {
    const results = this.db
      .select()
      .from(remoteInstances)
      .where(lt(remoteInstances.lastFetchedAt, olderThan))
      .limit(limit)
      .all();

    return results as RemoteInstance[];
  }

  async incrementErrorCount(host: string, errorMessage?: string): Promise<void> {
    this.db
      .update(remoteInstances)
      .set({
        fetchErrorCount: sql`${remoteInstances.fetchErrorCount} + 1`,
        lastFetchError: errorMessage ?? null,
        updatedAt: new Date(),
      })
      .where(eq(remoteInstances.host, host))
      .run();
  }

  async resetErrorCount(host: string): Promise<void> {
    this.db
      .update(remoteInstances)
      .set({
        fetchErrorCount: 0,
        lastFetchError: null,
        updatedAt: new Date(),
      })
      .where(eq(remoteInstances.host, host))
      .run();
  }

  async markForRefresh(host: string): Promise<void> {
    this.db
      .update(remoteInstances)
      .set({
        lastFetchedAt: null,
        fetchErrorCount: 0,
        lastFetchError: null,
        updatedAt: new Date(),
      })
      .where(eq(remoteInstances.host, host))
      .run();
  }

  async count(): Promise<number> {
    const [result] = this.db.select({ count: sql<number>`COUNT(*)` }).from(remoteInstances).all();
    return Number(result?.count ?? 0);
  }

  async delete(host: string): Promise<void> {
    this.db.delete(remoteInstances).where(eq(remoteInstances.host, host)).run();
  }
}
