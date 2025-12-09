/**
 * SQLite Notification Repository
 *
 * SQLite/D1 implementation of the INotificationRepository interface.
 *
 * @module repositories/sqlite/SqliteNotificationRepository
 */

import { eq, and, desc, lt, gt, inArray, sql } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { notifications, type Notification, type NotificationType } from "../../db/schema/sqlite.js";
import type * as sqliteSchema from "../../db/schema/sqlite.js";
import type { INotificationRepository } from "../../interfaces/repositories/INotificationRepository.js";
import { generateId } from "shared";

type SqliteDatabase = BetterSQLite3Database<typeof sqliteSchema>;

/**
 * SQLite implementation of notification repository
 */
export class SqliteNotificationRepository implements INotificationRepository {
  constructor(private db: SqliteDatabase) {}

  async create(data: {
    userId: string;
    type: NotificationType;
    notifierId?: string;
    noteId?: string;
    reaction?: string;
    warningId?: string;
  }): Promise<Notification> {
    const id = generateId();

    this.db.insert(notifications).values({
      id,
      userId: data.userId,
      type: data.type,
      notifierId: data.notifierId ?? null,
      noteId: data.noteId ?? null,
      reaction: data.reaction ?? null,
      warningId: data.warningId ?? null,
      isRead: false,
    }).run();

    // SQLite doesn't support RETURNING, fetch the inserted record
    const [notification] = this.db.select().from(notifications).where(eq(notifications.id, id)).limit(1).all();

    return notification as Notification;
  }

  async findById(id: string): Promise<Notification | null> {
    const [notification] = this.db
      .select()
      .from(notifications)
      .where(eq(notifications.id, id))
      .limit(1)
      .all();

    return (notification as Notification) ?? null;
  }

  async findByUserId(
    userId: string,
    options?: {
      limit?: number;
      sinceId?: string;
      untilId?: string;
      types?: NotificationType[];
      unreadOnly?: boolean;
    },
  ): Promise<Notification[]> {
    const { limit = 40, sinceId, untilId, types, unreadOnly } = options ?? {};

    const conditions = [eq(notifications.userId, userId)];

    if (sinceId) {
      // Get notifications after (newer than) sinceId
      const sinceNotification = await this.findById(sinceId);
      if (sinceNotification) {
        conditions.push(gt(notifications.createdAt, sinceNotification.createdAt));
      }
    }

    if (untilId) {
      // Get notifications before (older than) untilId
      const untilNotification = await this.findById(untilId);
      if (untilNotification) {
        conditions.push(lt(notifications.createdAt, untilNotification.createdAt));
      }
    }

    if (types && types.length > 0) {
      conditions.push(inArray(notifications.type, types));
    }

    if (unreadOnly) {
      conditions.push(eq(notifications.isRead, false));
    }

    const results = this.db
      .select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .all();

    return results as Notification[];
  }

  async findUnreadByUserId(userId: string, limit: number = 40): Promise<Notification[]> {
    const results = this.db
      .select()
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .all();

    return results as Notification[];
  }

  async markAsRead(id: string): Promise<Notification | null> {
    this.db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id)).run();

    // SQLite doesn't support RETURNING, fetch the updated record
    const [notification] = this.db.select().from(notifications).where(eq(notifications.id, id)).limit(1).all();

    return (notification as Notification) ?? null;
  }

  async markAllAsReadByUserId(userId: string): Promise<number> {
    // SQLite doesn't support RETURNING, so count before updating
    const [countResult] = this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))
      .all();

    const count = countResult?.count ?? 0;

    this.db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))
      .run();

    return count;
  }

  async markAsReadUntil(userId: string, untilId: string): Promise<number> {
    const untilNotification = await this.findById(untilId);
    if (!untilNotification) {
      return 0;
    }

    // SQLite doesn't support RETURNING, so count before updating
    const [countResult] = this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false),
          sql`${notifications.createdAt} <= ${untilNotification.createdAt}`,
        ),
      )
      .all();

    const count = countResult?.count ?? 0;

    this.db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false),
          sql`${notifications.createdAt} <= ${untilNotification.createdAt}`,
        ),
      )
      .run();

    return count;
  }

  async countUnreadByUserId(userId: string): Promise<number> {
    const [result] = this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))
      .all();

    return result?.count ?? 0;
  }

  async countByUserId(
    userId: string,
    options?: { types?: NotificationType[]; unreadOnly?: boolean },
  ): Promise<number> {
    const { types, unreadOnly } = options ?? {};

    const conditions = [eq(notifications.userId, userId)];

    if (types && types.length > 0) {
      conditions.push(inArray(notifications.type, types));
    }

    if (unreadOnly) {
      conditions.push(eq(notifications.isRead, false));
    }

    const [result] = this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(notifications)
      .where(and(...conditions))
      .all();

    return result?.count ?? 0;
  }

  async delete(id: string): Promise<boolean> {
    // SQLite doesn't support RETURNING, so check existence first
    const existing = await this.findById(id);
    if (!existing) {
      return false;
    }

    this.db.delete(notifications).where(eq(notifications.id, id)).run();

    return true;
  }

  async deleteAllByUserId(userId: string): Promise<number> {
    // SQLite doesn't support RETURNING, so count before deleting
    const [countResult] = this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .all();

    const count = countResult?.count ?? 0;

    this.db.delete(notifications).where(eq(notifications.userId, userId)).run();

    return count;
  }

  async deleteOlderThan(userId: string, before: Date): Promise<number> {
    // SQLite doesn't support RETURNING, so count before deleting
    const [countResult] = this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), lt(notifications.createdAt, before)))
      .all();

    const count = countResult?.count ?? 0;

    this.db
      .delete(notifications)
      .where(and(eq(notifications.userId, userId), lt(notifications.createdAt, before)))
      .run();

    return count;
  }

  async exists(
    userId: string,
    type: NotificationType,
    notifierId?: string,
    noteId?: string,
  ): Promise<boolean> {
    const conditions = [eq(notifications.userId, userId), eq(notifications.type, type)];

    if (notifierId) {
      conditions.push(eq(notifications.notifierId, notifierId));
    }

    if (noteId) {
      conditions.push(eq(notifications.noteId, noteId));
    }

    const [result] = this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(notifications)
      .where(and(...conditions))
      .limit(1)
      .all();

    return (result?.count ?? 0) > 0;
  }
}
