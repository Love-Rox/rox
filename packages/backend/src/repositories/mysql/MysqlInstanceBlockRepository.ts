/**
 * MySQL Instance Block Repository
 *
 * MySQL implementation of the IInstanceBlockRepository interface.
 *
 * @module repositories/mysql/MysqlInstanceBlockRepository
 */

import { eq, sql, desc } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { instanceBlocks, type InstanceBlock } from "../../db/schema/mysql.js";
import type * as mysqlSchema from "../../db/schema/mysql.js";
import type { IInstanceBlockRepository } from "../../interfaces/repositories/IInstanceBlockRepository.js";
import { generateId } from "shared";

type MysqlDatabase = MySql2Database<typeof mysqlSchema>;

/**
 * MySQL implementation of Instance Block Repository
 */
export class MysqlInstanceBlockRepository implements IInstanceBlockRepository {
  constructor(private db: MysqlDatabase) {}

  async create(block: Omit<InstanceBlock, "id" | "createdAt">): Promise<InstanceBlock> {
    const id = generateId();
    const now = new Date();

    await this.db.insert(instanceBlocks).values({
      id,
      ...block,
      createdAt: now,
    });

    // MySQL doesn't support RETURNING, fetch the inserted record
    const [result] = await this.db.select().from(instanceBlocks).where(eq(instanceBlocks.id, id)).limit(1);

    if (!result) {
      throw new Error("Failed to create instance block");
    }

    return result;
  }

  async findByHost(host: string): Promise<InstanceBlock | null> {
    const [result] = await this.db
      .select()
      .from(instanceBlocks)
      .where(eq(instanceBlocks.host, host.toLowerCase()))
      .limit(1);

    return result ?? null;
  }

  async isBlocked(host: string): Promise<boolean> {
    const result = await this.findByHost(host.toLowerCase());
    return result !== null;
  }

  async findAll(limit = 100, offset = 0): Promise<InstanceBlock[]> {
    const results = await this.db
      .select()
      .from(instanceBlocks)
      .orderBy(desc(instanceBlocks.createdAt))
      .limit(limit)
      .offset(offset);

    return results;
  }

  async deleteByHost(host: string): Promise<boolean> {
    // MySQL doesn't support RETURNING, so check existence first
    const existing = await this.findByHost(host.toLowerCase());
    if (!existing) {
      return false;
    }

    await this.db
      .delete(instanceBlocks)
      .where(eq(instanceBlocks.host, host.toLowerCase()));

    return true;
  }

  async count(): Promise<number> {
    const [result] = await this.db
      .select({ count: sql<number>`CAST(COUNT(*) AS SIGNED)` })
      .from(instanceBlocks);

    return result?.count ?? 0;
  }
}
