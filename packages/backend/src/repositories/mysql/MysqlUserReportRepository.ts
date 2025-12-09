/**
 * MySQL User Report Repository
 *
 * MySQL implementation of the IUserReportRepository interface.
 *
 * @module repositories/mysql/MysqlUserReportRepository
 */

import { eq, sql, desc, and } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { userReports, type UserReport } from "../../db/schema/mysql.js";
import type * as mysqlSchema from "../../db/schema/mysql.js";
import type {
  IUserReportRepository,
  ReportStatus,
} from "../../interfaces/repositories/IUserReportRepository.js";
import { generateId } from "shared";

type MysqlDatabase = MySql2Database<typeof mysqlSchema>;

/**
 * MySQL implementation of User Report Repository
 */
export class MysqlUserReportRepository implements IUserReportRepository {
  constructor(private db: MysqlDatabase) {}

  async create(data: {
    reporterId: string;
    targetUserId?: string;
    targetNoteId?: string;
    reason: string;
    comment?: string;
  }): Promise<UserReport> {
    const id = generateId();

    await this.db.insert(userReports).values({
      id,
      reporterId: data.reporterId,
      targetUserId: data.targetUserId ?? null,
      targetNoteId: data.targetNoteId ?? null,
      reason: data.reason,
      comment: data.comment ?? null,
      status: "pending",
    });

    // MySQL doesn't support RETURNING, fetch the inserted record
    const [result] = await this.db.select().from(userReports).where(eq(userReports.id, id)).limit(1);

    if (!result) {
      throw new Error("Failed to create user report");
    }

    return result;
  }

  async findById(id: string): Promise<UserReport | null> {
    const [result] = await this.db
      .select()
      .from(userReports)
      .where(eq(userReports.id, id))
      .limit(1);

    return result ?? null;
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
      return query.where(and(...conditions));
    }

    return query;
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

    const query = this.db.select({ count: sql<number>`CAST(COUNT(*) AS SIGNED)` }).from(userReports);

    if (conditions.length > 0) {
      const [result] = await query.where(and(...conditions));
      return result?.count ?? 0;
    }

    const [result] = await query;
    return result?.count ?? 0;
  }

  async resolve(
    id: string,
    resolvedById: string,
    resolution: string,
    status: "resolved" | "rejected",
  ): Promise<UserReport | null> {
    await this.db
      .update(userReports)
      .set({
        status,
        resolvedById,
        resolution,
        resolvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(userReports.id, id));

    // MySQL doesn't support RETURNING, fetch the updated record
    const [updated] = await this.db.select().from(userReports).where(eq(userReports.id, id)).limit(1);

    return updated ?? null;
  }

  async delete(id: string): Promise<boolean> {
    // MySQL doesn't support RETURNING, so check existence first
    const existing = await this.findById(id);
    if (!existing) {
      return false;
    }

    await this.db.delete(userReports).where(eq(userReports.id, id));

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

    const [result] = await this.db
      .select({ count: sql<number>`CAST(COUNT(*) AS SIGNED)` })
      .from(userReports)
      .where(and(...conditions));

    return (result?.count ?? 0) > 0;
  }
}
