/**
 * MySQL Notification Repository
 *
 * MySQL implementation of the INotificationRepository interface.
 *
 * @module repositories/mysql/MysqlNotificationRepository
 */

import { eq, and, desc, lt, gt, inArray, sql } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { notifications, type Notification, type NotificationType } from "../../db/schema/mysql.js";
import type * as mysqlSchema from "../../db/schema/mysql.js";
import type { INotificationRepository } from "../../interfaces/repositories/INotificationRepository.js";
import { generateId } from "shared";

type MysqlDatabase = MySql2Database<typeof mysqlSchema>;

/**
 * MySQL implementation of notification repository
 */
export class MysqlNotificationRepository implements INotificationRepository {
  constructor(private db: MysqlDatabase) {}

  async create(data: {
    userId: string;
    type: NotificationType;
    notifierId?: string;
    noteId?: string;
    reaction?: string;
    warningId?: string;
  }): Promise<Notification> {
    const id = generateId();

    await this.db.insert(notifications).values({
      id,
      userId: data.userId,
      type: data.type,
      notifierId: data.notifierId ?? null,
      noteId: data.noteId ?? null,
      reaction: data.reaction ?? null,
      warningId: data.warningId ?? null,
      isRead: false,
    });

    // MySQL doesn't support RETURNING, fetch the inserted record
    const [notification] = await this.db.select().from(notifications).where(eq(notifications.id, id)).limit(1);

    return notification as Notification;
  }

  async findById(id: string): Promise<Notification | null> {
    const [notification] = await this.db
      .select()
      .from(notifications)
      .where(eq(notifications.id, id))
      .limit(1);

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

    const results = await this.db
      .select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);

    return results as Notification[];
  }

  async findUnreadByUserId(userId: string, limit: number = 40): Promise<Notification[]> {
    const results = await this.db
      .select()
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);

    return results as Notification[];
  }

  async markAsRead(id: string): Promise<Notification | null> {
    await this.db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));

    // MySQL doesn't support RETURNING, fetch the updated record
    const [notification] = await this.db.select().from(notifications).where(eq(notifications.id, id)).limit(1);

    return (notification as Notification) ?? null;
  }

  async markAllAsReadByUserId(userId: string): Promise<number> {
    // MySQL doesn't support RETURNING, so count before updating
    const [countResult] = await this.db
      .select({ count: sql<number>`CAST(COUNT(*) AS SIGNED)` })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));

    const count = countResult?.count ?? 0;

    await this.db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));

    return count;
  }

  async markAsReadUntil(userId: string, untilId: string): Promise<number> {
    const untilNotification = await this.findById(untilId);
    if (!untilNotification) {
      return 0;
    }

    // MySQL doesn't support RETURNING, so count before updating
    const [countResult] = await this.db
      .select({ count: sql<number>`CAST(COUNT(*) AS SIGNED)` })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false),
          sql`${notifications.createdAt} <= ${untilNotification.createdAt}`,
        ),
      );

    const count = countResult?.count ?? 0;

    await this.db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false),
          sql`${notifications.createdAt} <= ${untilNotification.createdAt}`,
        ),
      );

    return count;
  }

  async countUnreadByUserId(userId: string): Promise<number> {
    const [result] = await this.db
      .select({ count: sql<number>`CAST(COUNT(*) AS SIGNED)` })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));

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

    const [result] = await this.db
      .select({ count: sql<number>`CAST(COUNT(*) AS SIGNED)` })
      .from(notifications)
      .where(and(...conditions));

    return result?.count ?? 0;
  }

  async delete(id: string): Promise<boolean> {
    // MySQL doesn't support RETURNING, so check existence first
    const existing = await this.findById(id);
    if (!existing) {
      return false;
    }

    await this.db.delete(notifications).where(eq(notifications.id, id));

    return true;
  }

  async deleteAllByUserId(userId: string): Promise<number> {
    // MySQL doesn't support RETURNING, so count before deleting
    const [countResult] = await this.db
      .select({ count: sql<number>`CAST(COUNT(*) AS SIGNED)` })
      .from(notifications)
      .where(eq(notifications.userId, userId));

    const count = countResult?.count ?? 0;

    await this.db.delete(notifications).where(eq(notifications.userId, userId));

    return count;
  }

  async deleteOlderThan(userId: string, before: Date): Promise<number> {
    // MySQL doesn't support RETURNING, so count before deleting
    const [countResult] = await this.db
      .select({ count: sql<number>`CAST(COUNT(*) AS SIGNED)` })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), lt(notifications.createdAt, before)));

    const count = countResult?.count ?? 0;

    await this.db
      .delete(notifications)
      .where(and(eq(notifications.userId, userId), lt(notifications.createdAt, before)));

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

    const [result] = await this.db
      .select({ count: sql<number>`CAST(COUNT(*) AS SIGNED)` })
      .from(notifications)
      .where(and(...conditions))
      .limit(1);

    return (result?.count ?? 0) > 0;
  }
}
