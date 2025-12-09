/**
 * SQLite Moderation Audit Log Repository
 *
 * SQLite/D1 implementation of the IModerationAuditLogRepository interface.
 *
 * @module repositories/sqlite/SqliteModerationAuditLogRepository
 */

import { eq, sql, desc, and } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { moderationAuditLogs, type ModerationAuditLog } from "../../db/schema/sqlite.js";
import type * as sqliteSchema from "../../db/schema/sqlite.js";
import type {
  IModerationAuditLogRepository,
  ModerationAction,
  ModerationTargetType,
} from "../../interfaces/repositories/IModerationAuditLogRepository.js";
import { generateId } from "shared";

type SqliteDatabase = BetterSQLite3Database<typeof sqliteSchema>;

/**
 * SQLite implementation of Moderation Audit Log Repository
 */
export class SqliteModerationAuditLogRepository implements IModerationAuditLogRepository {
  constructor(private db: SqliteDatabase) {}

  async create(data: {
    moderatorId: string;
    action: ModerationAction;
    targetType: ModerationTargetType;
    targetId: string;
    reason?: string;
    details?: Record<string, unknown>;
  }): Promise<ModerationAuditLog> {
    const id = generateId();

    this.db.insert(moderationAuditLogs).values({
      id,
      moderatorId: data.moderatorId,
      action: data.action,
      targetType: data.targetType,
      targetId: data.targetId,
      reason: data.reason ?? null,
      details: data.details ?? null,
    }).run();

    // SQLite doesn't support RETURNING, fetch the inserted record
    const [result] = this.db.select().from(moderationAuditLogs).where(eq(moderationAuditLogs.id, id)).limit(1).all();

    if (!result) {
      throw new Error("Failed to create moderation audit log");
    }

    return result as ModerationAuditLog;
  }

  async findById(id: string): Promise<ModerationAuditLog | null> {
    const [result] = this.db
      .select()
      .from(moderationAuditLogs)
      .where(eq(moderationAuditLogs.id, id))
      .limit(1)
      .all();

    return (result as ModerationAuditLog) ?? null;
  }

  async findAll(options?: {
    moderatorId?: string;
    action?: ModerationAction;
    targetType?: ModerationTargetType;
    targetId?: string;
    limit?: number;
    offset?: number;
  }): Promise<ModerationAuditLog[]> {
    const conditions = [];

    if (options?.moderatorId) {
      conditions.push(eq(moderationAuditLogs.moderatorId, options.moderatorId));
    }
    if (options?.action) {
      conditions.push(eq(moderationAuditLogs.action, options.action));
    }
    if (options?.targetType) {
      conditions.push(eq(moderationAuditLogs.targetType, options.targetType));
    }
    if (options?.targetId) {
      conditions.push(eq(moderationAuditLogs.targetId, options.targetId));
    }

    const query = this.db
      .select()
      .from(moderationAuditLogs)
      .orderBy(desc(moderationAuditLogs.createdAt))
      .limit(options?.limit ?? 100)
      .offset(options?.offset ?? 0);

    if (conditions.length > 0) {
      return query.where(and(...conditions)).all() as ModerationAuditLog[];
    }

    return query.all() as ModerationAuditLog[];
  }

  async count(options?: {
    moderatorId?: string;
    action?: ModerationAction;
    targetType?: ModerationTargetType;
    targetId?: string;
  }): Promise<number> {
    const conditions = [];

    if (options?.moderatorId) {
      conditions.push(eq(moderationAuditLogs.moderatorId, options.moderatorId));
    }
    if (options?.action) {
      conditions.push(eq(moderationAuditLogs.action, options.action));
    }
    if (options?.targetType) {
      conditions.push(eq(moderationAuditLogs.targetType, options.targetType));
    }
    if (options?.targetId) {
      conditions.push(eq(moderationAuditLogs.targetId, options.targetId));
    }

    if (conditions.length > 0) {
      const [result] = this.db
        .select({ count: sql<number>`COUNT(*)` })
        .from(moderationAuditLogs)
        .where(and(...conditions))
        .all();
      return result?.count ?? 0;
    }

    const [result] = this.db.select({ count: sql<number>`COUNT(*)` }).from(moderationAuditLogs).all();
    return result?.count ?? 0;
  }

  async findByTarget(
    targetType: ModerationTargetType,
    targetId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<ModerationAuditLog[]> {
    const results = this.db
      .select()
      .from(moderationAuditLogs)
      .where(
        and(
          eq(moderationAuditLogs.targetType, targetType),
          eq(moderationAuditLogs.targetId, targetId),
        ),
      )
      .orderBy(desc(moderationAuditLogs.createdAt))
      .limit(options?.limit ?? 100)
      .offset(options?.offset ?? 0)
      .all();

    return results as ModerationAuditLog[];
  }

  async findByModerator(
    moderatorId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<ModerationAuditLog[]> {
    const results = this.db
      .select()
      .from(moderationAuditLogs)
      .where(eq(moderationAuditLogs.moderatorId, moderatorId))
      .orderBy(desc(moderationAuditLogs.createdAt))
      .limit(options?.limit ?? 100)
      .offset(options?.offset ?? 0)
      .all();

    return results as ModerationAuditLog[];
  }
}
