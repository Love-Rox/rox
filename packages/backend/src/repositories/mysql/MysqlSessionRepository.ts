/**
 * MySQL Session Repository
 *
 * MySQL implementation of the ISessionRepository interface.
 *
 * @module repositories/mysql/MysqlSessionRepository
 */

import { eq, lt, sql } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { sessions } from "../../db/schema/mysql.js";
import type * as mysqlSchema from "../../db/schema/mysql.js";
import type { ISessionRepository } from "../../interfaces/repositories/ISessionRepository.js";
import type { Session } from "shared";

type MysqlDatabase = MySql2Database<typeof mysqlSchema>;

export class MysqlSessionRepository implements ISessionRepository {
  constructor(private db: MysqlDatabase) {}

  async create(session: Omit<Session, "createdAt" | "updatedAt">): Promise<Session> {
    const now = new Date();
    await this.db.insert(sessions).values({
      ...session,
      createdAt: now,
      updatedAt: now,
    });

    // MySQL doesn't support RETURNING, fetch the inserted record
    const [result] = await this.db.select().from(sessions).where(eq(sessions.id, session.id)).limit(1);

    if (!result) {
      throw new Error("Failed to create session");
    }

    return result as Session;
  }

  async findById(id: string): Promise<Session | null> {
    const [result] = await this.db.select().from(sessions).where(eq(sessions.id, id)).limit(1);

    return (result as Session) ?? null;
  }

  async findByToken(token: string): Promise<Session | null> {
    const [result] = await this.db
      .select()
      .from(sessions)
      .where(eq(sessions.token, token))
      .limit(1);

    return (result as Session) ?? null;
  }

  async findByUserId(userId: string): Promise<Session[]> {
    const results = await this.db.select().from(sessions).where(eq(sessions.userId, userId));

    return results as Session[];
  }

  async updateExpiresAt(id: string, expiresAt: Date): Promise<Session> {
    await this.db
      .update(sessions)
      .set({
        expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(sessions.id, id));

    // MySQL doesn't support RETURNING, fetch the updated record
    const [result] = await this.db.select().from(sessions).where(eq(sessions.id, id)).limit(1);

    if (!result) {
      throw new Error("Session not found");
    }

    return result as Session;
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(sessions).where(eq(sessions.id, id));
  }

  async deleteByToken(token: string): Promise<void> {
    await this.db.delete(sessions).where(eq(sessions.token, token));
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.db.delete(sessions).where(eq(sessions.userId, userId));
  }

  async deleteExpired(): Promise<number> {
    // MySQL doesn't support RETURNING, so we need to count before deleting
    const [countResult] = await this.db
      .select({ count: sql<number>`CAST(COUNT(*) AS SIGNED)` })
      .from(sessions)
      .where(lt(sessions.expiresAt, new Date()));

    const count = countResult?.count ?? 0;

    await this.db.delete(sessions).where(lt(sessions.expiresAt, new Date()));

    return count;
  }
}
