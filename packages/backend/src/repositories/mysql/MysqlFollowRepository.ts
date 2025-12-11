/**
 * MySQL Follow Repository
 *
 * MySQL implementation of the IFollowRepository interface.
 *
 * @module repositories/mysql/MysqlFollowRepository
 */

import { eq, and, or, sql } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { follows, users } from "../../db/schema/mysql.js";
import type * as mysqlSchema from "../../db/schema/mysql.js";
import type { IFollowRepository } from "../../interfaces/repositories/IFollowRepository.js";
import type { Follow } from "shared";

type MysqlDatabase = MySql2Database<typeof mysqlSchema>;

export class MysqlFollowRepository implements IFollowRepository {
  constructor(private db: MysqlDatabase) {}

  async create(follow: Omit<Follow, "createdAt" | "updatedAt">): Promise<Follow> {
    const now = new Date();
    await this.db.insert(follows).values({
      ...follow,
      createdAt: now,
      updatedAt: now,
    });

    // MySQL doesn't support RETURNING, fetch the inserted record
    const [result] = await this.db.select().from(follows).where(eq(follows.id, follow.id)).limit(1);

    if (!result) {
      throw new Error("Failed to create follow");
    }

    return result as Follow;
  }

  async findById(id: string): Promise<Follow | null> {
    const [result] = await this.db.select().from(follows).where(eq(follows.id, id)).limit(1);

    return (result as Follow) ?? null;
  }

  async exists(followerId: string, followeeId: string): Promise<boolean> {
    const [result] = await this.db
      .select({ id: follows.id })
      .from(follows)
      .where(and(eq(follows.followerId, followerId), eq(follows.followeeId, followeeId)))
      .limit(1);

    return result !== undefined;
  }

  async findByFolloweeId(followeeId: string, limit = 100, offset = 0): Promise<Follow[]> {
    const results = await this.db
      .select({
        follow: follows,
        follower: users,
      })
      .from(follows)
      .leftJoin(users, eq(follows.followerId, users.id))
      .where(eq(follows.followeeId, followeeId))
      .limit(limit)
      .offset(offset);

    return results.map((r) => ({
      ...r.follow,
      follower: r.follower,
    })) as Follow[];
  }

  async findByFollowerId(followerId: string, limit = 100, offset = 0): Promise<Follow[]> {
    const results = await this.db
      .select({
        follow: follows,
        followee: users,
      })
      .from(follows)
      .leftJoin(users, eq(follows.followeeId, users.id))
      .where(eq(follows.followerId, followerId))
      .limit(limit)
      .offset(offset);

    return results.map((r) => ({
      ...r.follow,
      followee: r.followee,
    })) as Follow[];
  }

  async countFollowers(userId: string): Promise<number> {
    const [result] = await this.db
      .select({ count: sql<number>`CAST(COUNT(*) AS SIGNED)` })
      .from(follows)
      .where(eq(follows.followeeId, userId));

    return result?.count ?? 0;
  }

  async countFollowing(userId: string): Promise<number> {
    const [result] = await this.db
      .select({ count: sql<number>`CAST(COUNT(*) AS SIGNED)` })
      .from(follows)
      .where(eq(follows.followerId, userId));

    return result?.count ?? 0;
  }

  async delete(followerId: string, followeeId: string): Promise<void> {
    await this.db
      .delete(follows)
      .where(and(eq(follows.followerId, followerId), eq(follows.followeeId, followeeId)));
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.db
      .delete(follows)
      .where(or(eq(follows.followerId, userId), eq(follows.followeeId, userId)));
  }
}
