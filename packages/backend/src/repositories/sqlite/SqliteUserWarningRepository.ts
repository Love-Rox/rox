/**
 * SQLite User Warning Repository
 *
 * SQLite/D1 implementation of the IUserWarningRepository interface.
 *
 * @module repositories/sqlite/SqliteUserWarningRepository
 */

import { eq, and, desc, isNull, sql, or } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { userWarnings, type UserWarning } from "../../db/schema/sqlite.js";
import type * as sqliteSchema from "../../db/schema/sqlite.js";
import type { IUserWarningRepository } from "../../interfaces/repositories/IUserWarningRepository.js";
import { generateId } from "shared";

type SqliteDatabase = BetterSQLite3Database<typeof sqliteSchema>;

/**
 * SQLite implementation of user warning repository
 */
export class SqliteUserWarningRepository implements IUserWarningRepository {
  constructor(private db: SqliteDatabase) {}

  async create(data: {
    userId: string;
    moderatorId: string;
    reason: string;
    expiresAt?: Date;
  }): Promise<UserWarning> {
    const id = generateId();

    this.db.insert(userWarnings).values({
      id,
      userId: data.userId,
      moderatorId: data.moderatorId,
      reason: data.reason,
      expiresAt: data.expiresAt ?? null,
      isRead: false,
    }).run();

    // SQLite doesn't support RETURNING, fetch the inserted record
    const [warning] = this.db.select().from(userWarnings).where(eq(userWarnings.id, id)).limit(1).all();

    return warning as UserWarning;
  }

  async findById(id: string): Promise<UserWarning | null> {
    const [warning] = this.db
      .select()
      .from(userWarnings)
      .where(eq(userWarnings.id, id))
      .limit(1)
      .all();

    return (warning as UserWarning) ?? null;
  }

  async findByUserId(
    userId: string,
    options?: { limit?: number; offset?: number; includeExpired?: boolean },
  ): Promise<UserWarning[]> {
    const { limit = 100, offset = 0, includeExpired = false } = options ?? {};
    const now = new Date();

    const conditions = [eq(userWarnings.userId, userId)];

    if (!includeExpired) {
      // Only include non-expired warnings (null expiresAt or expiresAt > now)
      conditions.push(or(isNull(userWarnings.expiresAt), sql`${userWarnings.expiresAt} > ${now}`)!);
    }

    const results = this.db
      .select()
      .from(userWarnings)
      .where(and(...conditions))
      .orderBy(desc(userWarnings.createdAt))
      .limit(limit)
      .offset(offset)
      .all();

    return results as UserWarning[];
  }

  async findByModeratorId(
    moderatorId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<UserWarning[]> {
    const { limit = 100, offset = 0 } = options ?? {};

    const results = this.db
      .select()
      .from(userWarnings)
      .where(eq(userWarnings.moderatorId, moderatorId))
      .orderBy(desc(userWarnings.createdAt))
      .limit(limit)
      .offset(offset)
      .all();

    return results as UserWarning[];
  }

  async findUnreadByUserId(userId: string): Promise<UserWarning[]> {
    const now = new Date();

    const results = this.db
      .select()
      .from(userWarnings)
      .where(
        and(
          eq(userWarnings.userId, userId),
          eq(userWarnings.isRead, false),
          or(isNull(userWarnings.expiresAt), sql`${userWarnings.expiresAt} > ${now}`),
        ),
      )
      .orderBy(desc(userWarnings.createdAt))
      .all();

    return results as UserWarning[];
  }

  async markAsRead(id: string): Promise<UserWarning | null> {
    this.db
      .update(userWarnings)
      .set({
        isRead: true,
        readAt: new Date(),
      })
      .where(eq(userWarnings.id, id))
      .run();

    // SQLite doesn't support RETURNING, fetch the updated record
    const [warning] = this.db.select().from(userWarnings).where(eq(userWarnings.id, id)).limit(1).all();

    return (warning as UserWarning) ?? null;
  }

  async markAllAsReadByUserId(userId: string): Promise<number> {
    // SQLite doesn't support RETURNING, so count before updating
    const [countResult] = this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(userWarnings)
      .where(and(eq(userWarnings.userId, userId), eq(userWarnings.isRead, false)))
      .all();

    const count = countResult?.count ?? 0;

    this.db
      .update(userWarnings)
      .set({
        isRead: true,
        readAt: new Date(),
      })
      .where(and(eq(userWarnings.userId, userId), eq(userWarnings.isRead, false)))
      .run();

    return count;
  }

  async countByUserId(
    userId: string,
    options?: { includeExpired?: boolean; unreadOnly?: boolean },
  ): Promise<number> {
    const { includeExpired = false, unreadOnly = false } = options ?? {};
    const now = new Date();

    const conditions = [eq(userWarnings.userId, userId)];

    if (!includeExpired) {
      conditions.push(or(isNull(userWarnings.expiresAt), sql`${userWarnings.expiresAt} > ${now}`)!);
    }

    if (unreadOnly) {
      conditions.push(eq(userWarnings.isRead, false));
    }

    const [result] = this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(userWarnings)
      .where(and(...conditions))
      .all();

    return result?.count ?? 0;
  }

  async count(): Promise<number> {
    const [result] = this.db.select({ count: sql<number>`COUNT(*)` }).from(userWarnings).all();

    return result?.count ?? 0;
  }

  async delete(id: string): Promise<boolean> {
    // SQLite doesn't support RETURNING, so check existence first
    const existing = await this.findById(id);
    if (!existing) {
      return false;
    }

    this.db.delete(userWarnings).where(eq(userWarnings.id, id)).run();

    return true;
  }

  async findAll(options?: {
    userId?: string;
    moderatorId?: string;
    limit?: number;
    offset?: number;
    includeExpired?: boolean;
  }): Promise<UserWarning[]> {
    const { userId, moderatorId, limit = 100, offset = 0, includeExpired = false } = options ?? {};
    const now = new Date();

    const conditions = [];

    if (userId) {
      conditions.push(eq(userWarnings.userId, userId));
    }

    if (moderatorId) {
      conditions.push(eq(userWarnings.moderatorId, moderatorId));
    }

    if (!includeExpired) {
      conditions.push(or(isNull(userWarnings.expiresAt), sql`${userWarnings.expiresAt} > ${now}`)!);
    }

    const query = this.db
      .select()
      .from(userWarnings)
      .orderBy(desc(userWarnings.createdAt))
      .limit(limit)
      .offset(offset);

    if (conditions.length > 0) {
      return query.where(and(...conditions)).all() as UserWarning[];
    }

    return query.all() as UserWarning[];
  }
}
