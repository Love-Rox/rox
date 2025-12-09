/**
 * MySQL Scheduled Note Repository
 *
 * MySQL implementation of the IScheduledNoteRepository interface.
 *
 * @module repositories/mysql/MysqlScheduledNoteRepository
 */

import { eq, and, desc, lt, sql } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import {
  scheduledNotes,
  type ScheduledNote,
  type NewScheduledNote,
  type ScheduledNoteStatus,
} from "../../db/schema/mysql.js";
import type * as mysqlSchema from "../../db/schema/mysql.js";
import type { IScheduledNoteRepository } from "../../interfaces/repositories/IScheduledNoteRepository.js";

type MysqlDatabase = MySql2Database<typeof mysqlSchema>;

/**
 * MySQL implementation of scheduled note repository
 */
export class MysqlScheduledNoteRepository implements IScheduledNoteRepository {
  constructor(private db: MysqlDatabase) {}

  async create(input: NewScheduledNote): Promise<ScheduledNote> {
    await this.db.insert(scheduledNotes).values(input);

    // MySQL doesn't support RETURNING, fetch the inserted record
    const [scheduledNote] = await this.db
      .select()
      .from(scheduledNotes)
      .where(eq(scheduledNotes.id, input.id))
      .limit(1);

    if (!scheduledNote) {
      throw new Error("Failed to create scheduled note");
    }

    return scheduledNote as ScheduledNote;
  }

  async findById(id: string): Promise<ScheduledNote | null> {
    const [scheduledNote] = await this.db
      .select()
      .from(scheduledNotes)
      .where(eq(scheduledNotes.id, id))
      .limit(1);

    return (scheduledNote as ScheduledNote) ?? null;
  }

  async findByUserId(
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
      status?: ScheduledNoteStatus;
    },
  ): Promise<ScheduledNote[]> {
    const { limit = 20, offset = 0, status } = options ?? {};

    const conditions = [eq(scheduledNotes.userId, userId)];

    if (status) {
      conditions.push(eq(scheduledNotes.status, status));
    }

    const results = await this.db
      .select()
      .from(scheduledNotes)
      .where(and(...conditions))
      .orderBy(desc(scheduledNotes.scheduledAt))
      .limit(limit)
      .offset(offset);

    return results as ScheduledNote[];
  }

  async countPendingByUserId(userId: string): Promise<number> {
    const [result] = await this.db
      .select({ count: sql<number>`CAST(COUNT(*) AS SIGNED)` })
      .from(scheduledNotes)
      .where(and(eq(scheduledNotes.userId, userId), eq(scheduledNotes.status, "pending")));

    return result?.count ?? 0;
  }

  async findPendingToPublish(before: Date, limit: number): Promise<ScheduledNote[]> {
    const results = await this.db
      .select()
      .from(scheduledNotes)
      .where(and(eq(scheduledNotes.status, "pending"), lt(scheduledNotes.scheduledAt, before)))
      .orderBy(scheduledNotes.scheduledAt)
      .limit(limit);

    return results as ScheduledNote[];
  }

  async update(
    id: string,
    input: Partial<Omit<ScheduledNote, "id" | "userId" | "createdAt">>,
  ): Promise<ScheduledNote | null> {
    await this.db
      .update(scheduledNotes)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(scheduledNotes.id, id));

    // MySQL doesn't support RETURNING, fetch the updated record
    const [scheduledNote] = await this.db
      .select()
      .from(scheduledNotes)
      .where(eq(scheduledNotes.id, id))
      .limit(1);

    return (scheduledNote as ScheduledNote) ?? null;
  }

  async delete(id: string): Promise<boolean> {
    // MySQL doesn't support RETURNING, so check existence first
    const existing = await this.findById(id);
    if (!existing) {
      return false;
    }

    await this.db.delete(scheduledNotes).where(eq(scheduledNotes.id, id));

    return true;
  }
}
