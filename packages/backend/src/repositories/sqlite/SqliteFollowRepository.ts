/**
 * SQLite Follow Repository
 *
 * SQLite/D1 implementation of the IFollowRepository interface.
 *
 * @module repositories/sqlite/SqliteFollowRepository
 */

import { eq, and, or, sql } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { follows, users } from "../../db/schema/sqlite.js";
import type * as sqliteSchema from "../../db/schema/sqlite.js";
import type { IFollowRepository } from "../../interfaces/repositories/IFollowRepository.js";
import type { Follow } from "shared";

type SqliteDatabase = BetterSQLite3Database<typeof sqliteSchema>;

/**
 * SQLite implementation of follow repository
 */
export class SqliteFollowRepository implements IFollowRepository {
  constructor(private db: SqliteDatabase) {}

  async create(follow: Omit<Follow, "createdAt" | "updatedAt">): Promise<Follow> {
    const now = new Date();
    this.db.insert(follows).values({
      ...follow,
      createdAt: now,
      updatedAt: now,
    }).run();

    // SQLite doesn't support RETURNING, fetch the inserted record
    const [result] = this.db.select().from(follows).where(eq(follows.id, follow.id)).limit(1).all();

    if (!result) {
      throw new Error("Failed to create follow");
    }

    return result as Follow;
  }

  async findById(id: string): Promise<Follow | null> {
    const [result] = this.db.select().from(follows).where(eq(follows.id, id)).limit(1).all();

    return (result as Follow) ?? null;
  }

  async exists(followerId: string, followeeId: string): Promise<boolean> {
    const [result] = this.db
      .select({ id: follows.id })
      .from(follows)
      .where(and(eq(follows.followerId, followerId), eq(follows.followeeId, followeeId)))
      .limit(1)
      .all();

    return result !== undefined;
  }

  async findByFolloweeId(followeeId: string, limit = 100): Promise<Follow[]> {
    const results = this.db
      .select()
      .from(follows)
      .where(eq(follows.followeeId, followeeId))
      .limit(limit)
      .all();

    return results as Follow[];
  }

  async findByFollowerId(followerId: string, limit = 100): Promise<Follow[]> {
    const results = this.db
      .select({
        follow: follows,
        followee: users,
      })
      .from(follows)
      .leftJoin(users, eq(follows.followeeId, users.id))
      .where(eq(follows.followerId, followerId))
      .limit(limit)
      .all();

    return results.map((r) => ({
      ...r.follow,
      followee: r.followee,
    })) as Follow[];
  }

  async countFollowers(userId: string): Promise<number> {
    const [result] = this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(follows)
      .where(eq(follows.followeeId, userId))
      .all();

    return result?.count ?? 0;
  }

  async countFollowing(userId: string): Promise<number> {
    const [result] = this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(follows)
      .where(eq(follows.followerId, userId))
      .all();

    return result?.count ?? 0;
  }

  async delete(followerId: string, followeeId: string): Promise<void> {
    this.db
      .delete(follows)
      .where(and(eq(follows.followerId, followerId), eq(follows.followeeId, followeeId)))
      .run();
  }

  async deleteByUserId(userId: string): Promise<void> {
    this.db
      .delete(follows)
      .where(or(eq(follows.followerId, userId), eq(follows.followeeId, userId)))
      .run();
  }
}
