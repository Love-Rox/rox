/**
 * SQLite User Report Repository
 *
 * SQLite/D1 implementation of the IUserReportRepository interface.
 *
 * @module repositories/sqlite/SqliteUserReportRepository
 */

import { eq, sql, desc, and } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { userReports, type UserReport } from "../../db/schema/sqlite.js";
import type * as sqliteSchema from "../../db/schema/sqlite.js";
import type {
  IUserReportRepository,
  ReportStatus,
} from "../../interfaces/repositories/IUserReportRepository.js";
import { generateId } from "shared";

type SqliteDatabase = BetterSQLite3Database<typeof sqliteSchema>;

/**
 * SQLite implementation of User Report Repository
 */
export class SqliteUserReportRepository implements IUserReportRepository {
  constructor(private db: SqliteDatabase) {}

  async create(data: {
    reporterId: string;
    targetUserId?: string;
    targetNoteId?: string;
    reason: string;
    comment?: string;
  }): Promise<UserReport> {
    const id = generateId();

    this.db.insert(userReports).values({
      id,
      reporterId: data.reporterId,
      targetUserId: data.targetUserId ?? null,
      targetNoteId: data.targetNoteId ?? null,
      reason: data.reason,
      comment: data.comment ?? null,
      status: "pending",
    }).run();

    // SQLite doesn't support RETURNING, fetch the inserted record
    const [result] = this.db.select().from(userReports).where(eq(userReports.id, id)).limit(1).all();

    if (!result) {
      throw new Error("Failed to create user report");
    }

    return result as UserReport;
  }

  async findById(id: string): Promise<UserReport | null> {
    const [result] = this.db
      .select()
      .from(userReports)
      .where(eq(userReports.id, id))
      .limit(1)
      .all();

    return (result as UserReport) ?? null;
  }

  async findAll(options?: {
    status?: ReportStatus;
    targetUserId?: string;
    reporterId?: string;
    limit?: number;
    offset?: number;
  }): Promise<UserReport[]> {
    const conditions = [];

    if (options?.status) {
      conditions.push(eq(userReports.status, options.status));
    }
    if (options?.targetUserId) {
      conditions.push(eq(userReports.targetUserId, options.targetUserId));
    }
    if (options?.reporterId) {
      conditions.push(eq(userReports.reporterId, options.reporterId));
    }

    const query = this.db
      .select()
      .from(userReports)
      .orderBy(desc(userReports.createdAt))
      .limit(options?.limit ?? 100)
      .offset(options?.offset ?? 0);

    if (conditions.length > 0) {
      return query.where(and(...conditions)).all() as UserReport[];
    }

    return query.all() as UserReport[];
  }

  async count(options?: {
    status?: ReportStatus;
    targetUserId?: string;
    reporterId?: string;
  }): Promise<number> {
    const conditions = [];

    if (options?.status) {
      conditions.push(eq(userReports.status, options.status));
    }
    if (options?.targetUserId) {
      conditions.push(eq(userReports.targetUserId, options.targetUserId));
    }
    if (options?.reporterId) {
      conditions.push(eq(userReports.reporterId, options.reporterId));
    }

    if (conditions.length > 0) {
      const [result] = this.db
        .select({ count: sql<number>`COUNT(*)` })
        .from(userReports)
        .where(and(...conditions))
        .all();
      return result?.count ?? 0;
    }

    const [result] = this.db.select({ count: sql<number>`COUNT(*)` }).from(userReports).all();
    return result?.count ?? 0;
  }

  async resolve(
    id: string,
    resolvedById: string,
    resolution: string,
    status: "resolved" | "rejected",
  ): Promise<UserReport | null> {
    this.db
      .update(userReports)
      .set({
        status,
        resolvedById,
        resolution,
        resolvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(userReports.id, id))
      .run();

    // SQLite doesn't support RETURNING, fetch the updated record
    const [updated] = this.db.select().from(userReports).where(eq(userReports.id, id)).limit(1).all();

    return (updated as UserReport) ?? null;
  }

  async delete(id: string): Promise<boolean> {
    // SQLite doesn't support RETURNING, so check existence first
    const existing = await this.findById(id);
    if (!existing) {
      return false;
    }

    this.db.delete(userReports).where(eq(userReports.id, id)).run();

    return true;
  }

  async hasReported(
    reporterId: string,
    targetUserId?: string,
    targetNoteId?: string,
  ): Promise<boolean> {
    const conditions = [eq(userReports.reporterId, reporterId)];

    if (targetUserId) {
      conditions.push(eq(userReports.targetUserId, targetUserId));
    }
    if (targetNoteId) {
      conditions.push(eq(userReports.targetNoteId, targetNoteId));
    }

    // Must have at least one target
    if (!targetUserId && !targetNoteId) {
      return false;
    }

    const [result] = this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(userReports)
      .where(and(...conditions))
      .all();

    return (result?.count ?? 0) > 0;
  }
}
