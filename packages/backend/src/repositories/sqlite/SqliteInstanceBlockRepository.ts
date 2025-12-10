/**
 * SQLite Instance Block Repository
 *
 * SQLite/D1 implementation of the IInstanceBlockRepository interface.
 *
 * @module repositories/sqlite/SqliteInstanceBlockRepository
 */

import { eq, sql, desc } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { instanceBlocks, type InstanceBlock } from "../../db/schema/sqlite.js";
import type * as sqliteSchema from "../../db/schema/sqlite.js";
import type { IInstanceBlockRepository } from "../../interfaces/repositories/IInstanceBlockRepository.js";
import { generateId } from "shared";

type SqliteDatabase = BetterSQLite3Database<typeof sqliteSchema>;

/**
 * SQLite implementation of Instance Block Repository
 */
export class SqliteInstanceBlockRepository implements IInstanceBlockRepository {
  constructor(private db: SqliteDatabase) {}

  async create(block: Omit<InstanceBlock, "id" | "createdAt">): Promise<InstanceBlock> {
    const id = generateId();
    const now = new Date();

    this.db.insert(instanceBlocks).values({
      id,
      ...block,
      createdAt: now,
    }).run();

    // SQLite doesn't support RETURNING, fetch the inserted record
    const [result] = this.db.select().from(instanceBlocks).where(eq(instanceBlocks.id, id)).limit(1).all();

    if (!result) {
      throw new Error("Failed to create instance block");
    }

    return result;
  }

  async findByHost(host: string): Promise<InstanceBlock | null> {
    const [result] = this.db
      .select()
      .from(instanceBlocks)
      .where(eq(instanceBlocks.host, host.toLowerCase()))
      .limit(1)
      .all();

    return result ?? null;
  }

  async isBlocked(host: string): Promise<boolean> {
    const result = await this.findByHost(host.toLowerCase());
    return result !== null;
  }

  async findAll(limit = 100, offset = 0): Promise<InstanceBlock[]> {
    const results = this.db
      .select()
      .from(instanceBlocks)
      .orderBy(desc(instanceBlocks.createdAt))
      .limit(limit)
      .offset(offset)
      .all();

    return results;
  }

  async deleteByHost(host: string): Promise<boolean> {
    // Check existence first since SQLite doesn't support RETURNING
    const existing = await this.findByHost(host.toLowerCase());
    if (!existing) {
      return false;
    }

    this.db
      .delete(instanceBlocks)
      .where(eq(instanceBlocks.host, host.toLowerCase()))
      .run();

    return true;
  }

  async count(): Promise<number> {
    const [result] = this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(instanceBlocks)
      .all();

    return result?.count ?? 0;
  }
}
