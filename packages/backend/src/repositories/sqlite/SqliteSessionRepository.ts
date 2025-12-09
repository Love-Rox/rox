/**
 * SQLite Session Repository
 *
 * SQLite/D1 implementation of the ISessionRepository interface.
 *
 * @module repositories/sqlite/SqliteSessionRepository
 */

import { eq, lt, sql } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { sessions } from "../../db/schema/sqlite.js";
import type * as sqliteSchema from "../../db/schema/sqlite.js";
import type { ISessionRepository } from "../../interfaces/repositories/ISessionRepository.js";
import type { Session } from "shared";

type SqliteDatabase = BetterSQLite3Database<typeof sqliteSchema>;

/**
 * SQLite implementation of session repository
 */
export class SqliteSessionRepository implements ISessionRepository {
  constructor(private db: SqliteDatabase) {}

  async create(session: Omit<Session, "createdAt" | "updatedAt">): Promise<Session> {
    const now = new Date();
    this.db.insert(sessions).values({
      ...session,
      createdAt: now,
      updatedAt: now,
    }).run();

    // SQLite doesn't support RETURNING, fetch the inserted record
    const [result] = this.db.select().from(sessions).where(eq(sessions.id, session.id)).limit(1).all();

    if (!result) {
      throw new Error("Failed to create session");
    }

    return result as Session;
  }

  async findById(id: string): Promise<Session | null> {
    const [result] = this.db.select().from(sessions).where(eq(sessions.id, id)).limit(1).all();

    return (result as Session) ?? null;
  }

  async findByToken(token: string): Promise<Session | null> {
    const [result] = this.db.select().from(sessions).where(eq(sessions.token, token)).limit(1).all();

    return (result as Session) ?? null;
  }

  async findByUserId(userId: string): Promise<Session[]> {
    const results = this.db.select().from(sessions).where(eq(sessions.userId, userId)).all();

    return results as Session[];
  }

  async updateExpiresAt(id: string, expiresAt: Date): Promise<Session> {
    this.db
      .update(sessions)
      .set({
        expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(sessions.id, id))
      .run();

    // Fetch the updated record
    const [result] = this.db.select().from(sessions).where(eq(sessions.id, id)).limit(1).all();

    if (!result) {
      throw new Error("Session not found");
    }

    return result as Session;
  }

  async delete(id: string): Promise<void> {
    this.db.delete(sessions).where(eq(sessions.id, id)).run();
  }

  async deleteByToken(token: string): Promise<void> {
    this.db.delete(sessions).where(eq(sessions.token, token)).run();
  }

  async deleteByUserId(userId: string): Promise<void> {
    this.db.delete(sessions).where(eq(sessions.userId, userId)).run();
  }

  async deleteExpired(): Promise<number> {
    // SQLite doesn't support RETURNING, so count before deleting
    const now = new Date();
    const [countResult] = this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(sessions)
      .where(lt(sessions.expiresAt, now))
      .all();

    const count = countResult?.count ?? 0;

    this.db.delete(sessions).where(lt(sessions.expiresAt, now)).run();

    return count;
  }
}
