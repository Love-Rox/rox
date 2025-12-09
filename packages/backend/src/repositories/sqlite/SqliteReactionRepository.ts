/**
 * SQLite Reaction Repository
 *
 * SQLite/D1 implementation of the IReactionRepository interface.
 *
 * @module repositories/sqlite/SqliteReactionRepository
 */

import { eq, and, sql, desc, inArray } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { reactions } from "../../db/schema/sqlite.js";
import type * as sqliteSchema from "../../db/schema/sqlite.js";
import type { IReactionRepository } from "../../interfaces/repositories/IReactionRepository.js";
import type { Reaction } from "shared";

type SqliteDatabase = BetterSQLite3Database<typeof sqliteSchema>;

/**
 * SQLite implementation of reaction repository
 */
export class SqliteReactionRepository implements IReactionRepository {
  constructor(private db: SqliteDatabase) {}

  async create(reaction: Omit<Reaction, "createdAt" | "updatedAt">): Promise<Reaction> {
    const now = new Date();
    this.db.insert(reactions).values({
      ...reaction,
      customEmojiUrl: reaction.customEmojiUrl ?? null,
      createdAt: now,
      updatedAt: now,
    }).run();

    // SQLite doesn't support RETURNING, fetch the inserted record
    const [result] = this.db.select().from(reactions).where(eq(reactions.id, reaction.id)).limit(1).all();

    if (!result) {
      throw new Error("Failed to create reaction");
    }

    return this.mapToReaction(result);
  }

  async findById(id: string): Promise<Reaction | null> {
    const [result] = this.db.select().from(reactions).where(eq(reactions.id, id)).limit(1).all();

    return result ? this.mapToReaction(result) : null;
  }

  async findByUserAndNote(userId: string, noteId: string): Promise<Reaction | null> {
    const [result] = this.db
      .select()
      .from(reactions)
      .where(and(eq(reactions.userId, userId), eq(reactions.noteId, noteId)))
      .limit(1)
      .all();

    return result ? this.mapToReaction(result) : null;
  }

  async findByUserNoteAndReaction(userId: string, noteId: string, reaction: string): Promise<Reaction | null> {
    const [result] = this.db
      .select()
      .from(reactions)
      .where(
        and(
          eq(reactions.userId, userId),
          eq(reactions.noteId, noteId),
          eq(reactions.reaction, reaction),
        ),
      )
      .limit(1)
      .all();

    return result ? this.mapToReaction(result) : null;
  }

  async findByUserAndNoteAll(userId: string, noteId: string): Promise<Reaction[]> {
    const results = this.db
      .select()
      .from(reactions)
      .where(and(eq(reactions.userId, userId), eq(reactions.noteId, noteId)))
      .orderBy(desc(reactions.createdAt))
      .all();

    return results.map(this.mapToReaction);
  }

  async findByNoteId(noteId: string, limit = 100): Promise<Reaction[]> {
    const results = this.db
      .select()
      .from(reactions)
      .where(eq(reactions.noteId, noteId))
      .orderBy(desc(reactions.createdAt))
      .limit(limit)
      .all();

    return results.map(this.mapToReaction);
  }

  async countByNoteId(noteId: string): Promise<Record<string, number>> {
    const results = this.db
      .select({
        reaction: reactions.reaction,
        count: sql<number>`COUNT(*)`,
      })
      .from(reactions)
      .where(eq(reactions.noteId, noteId))
      .groupBy(reactions.reaction)
      .all();

    const counts: Record<string, number> = {};
    for (const r of results) {
      counts[r.reaction] = r.count;
    }
    return counts;
  }

  async countByNoteIdWithEmojis(noteId: string): Promise<{
    counts: Record<string, number>;
    emojis: Record<string, string>;
  }> {
    const results = this.db
      .select({
        reaction: reactions.reaction,
        count: sql<number>`COUNT(*)`,
        customEmojiUrl: reactions.customEmojiUrl,
      })
      .from(reactions)
      .where(eq(reactions.noteId, noteId))
      .groupBy(reactions.reaction)
      .all();

    const counts: Record<string, number> = {};
    const emojis: Record<string, string> = {};

    for (const r of results) {
      counts[r.reaction] = r.count;
      if (r.customEmojiUrl) {
        emojis[r.reaction] = r.customEmojiUrl;
      }
    }

    return { counts, emojis };
  }

  async countByNoteIds(noteIds: string[]): Promise<Map<string, Record<string, number>>> {
    if (noteIds.length === 0) return new Map();

    const results = this.db
      .select({
        noteId: reactions.noteId,
        reaction: reactions.reaction,
        count: sql<number>`COUNT(*)`,
      })
      .from(reactions)
      .where(inArray(reactions.noteId, noteIds))
      .groupBy(reactions.noteId, reactions.reaction)
      .all();

    const map = new Map<string, Record<string, number>>();
    for (const r of results) {
      if (!map.has(r.noteId)) {
        map.set(r.noteId, {});
      }
      map.get(r.noteId)![r.reaction] = r.count;
    }

    return map;
  }

  async delete(userId: string, noteId: string): Promise<void> {
    this.db
      .delete(reactions)
      .where(and(eq(reactions.userId, userId), eq(reactions.noteId, noteId)))
      .run();
  }

  async deleteByUserNoteAndReaction(userId: string, noteId: string, reaction: string): Promise<void> {
    this.db
      .delete(reactions)
      .where(
        and(
          eq(reactions.userId, userId),
          eq(reactions.noteId, noteId),
          eq(reactions.reaction, reaction),
        ),
      )
      .run();
  }

  async deleteByNoteId(noteId: string): Promise<void> {
    this.db.delete(reactions).where(eq(reactions.noteId, noteId)).run();
  }

  private mapToReaction(r: typeof reactions.$inferSelect): Reaction {
    return {
      id: r.id,
      userId: r.userId,
      noteId: r.noteId,
      reaction: r.reaction,
      customEmojiUrl: r.customEmojiUrl ?? undefined,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }
}
