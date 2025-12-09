/**
 * SQLite Scheduled Note Repository
 *
 * SQLite/D1 implementation of the IScheduledNoteRepository interface.
 *
 * @module repositories/sqlite/SqliteScheduledNoteRepository
 */

import { eq, and, desc, lt, sql } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import {
  scheduledNotes,
  type ScheduledNote,
  type NewScheduledNote,
  type ScheduledNoteStatus,
} from "../../db/schema/sqlite.js";
import type * as sqliteSchema from "../../db/schema/sqlite.js";
import type { IScheduledNoteRepository } from "../../interfaces/repositories/IScheduledNoteRepository.js";

type SqliteDatabase = BetterSQLite3Database<typeof sqliteSchema>;

/**
 * SQLite implementation of scheduled note repository
 */
export class SqliteScheduledNoteRepository implements IScheduledNoteRepository {
  constructor(private db: SqliteDatabase) {}

  async create(input: NewScheduledNote): Promise<ScheduledNote> {
    this.db.insert(scheduledNotes).values(input).run();

    // SQLite doesn't support RETURNING, fetch the inserted record
    const [scheduledNote] = this.db
      .select()
      .from(scheduledNotes)
      .where(eq(scheduledNotes.id, input.id))
      .limit(1)
      .all();

    if (!scheduledNote) {
      throw new Error("Failed to create scheduled note");
    }

    return scheduledNote as ScheduledNote;
  }

  async findById(id: string): Promise<ScheduledNote | null> {
    const [scheduledNote] = this.db
      .select()
      .from(scheduledNotes)
      .where(eq(scheduledNotes.id, id))
      .limit(1)
      .all();

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

    const results = this.db
      .select()
      .from(scheduledNotes)
      .where(and(...conditions))
      .orderBy(desc(scheduledNotes.scheduledAt))
      .limit(limit)
      .offset(offset)
      .all();

    return results as ScheduledNote[];
  }

  async countPendingByUserId(userId: string): Promise<number> {
    const [result] = this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(scheduledNotes)
      .where(and(eq(scheduledNotes.userId, userId), eq(scheduledNotes.status, "pending")))
      .all();

    return result?.count ?? 0;
  }

  async findPendingToPublish(before: Date, limit: number): Promise<ScheduledNote[]> {
    const results = this.db
      .select()
      .from(scheduledNotes)
      .where(and(eq(scheduledNotes.status, "pending"), lt(scheduledNotes.scheduledAt, before)))
      .orderBy(scheduledNotes.scheduledAt)
      .limit(limit)
      .all();

    return results as ScheduledNote[];
  }

  async update(
    id: string,
    input: Partial<Omit<ScheduledNote, "id" | "userId" | "createdAt">>,
  ): Promise<ScheduledNote | null> {
    this.db
      .update(scheduledNotes)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(scheduledNotes.id, id))
      .run();

    // SQLite doesn't support RETURNING, fetch the updated record
    const [scheduledNote] = this.db
      .select()
      .from(scheduledNotes)
      .where(eq(scheduledNotes.id, id))
      .limit(1)
      .all();

    return (scheduledNote as ScheduledNote) ?? null;
  }

  async delete(id: string): Promise<boolean> {
    // SQLite doesn't support RETURNING, so check existence first
    const existing = await this.findById(id);
    if (!existing) {
      return false;
    }

    this.db.delete(scheduledNotes).where(eq(scheduledNotes.id, id)).run();

    return true;
  }
}
