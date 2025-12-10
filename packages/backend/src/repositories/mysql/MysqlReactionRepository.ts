/**
 * MySQL Reaction Repository
 *
 * MySQL implementation of the IReactionRepository interface.
 *
 * @module repositories/mysql/MysqlReactionRepository
 */

import { eq, and, inArray, sql } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { reactions } from "../../db/schema/mysql.js";
import type * as mysqlSchema from "../../db/schema/mysql.js";
import type { IReactionRepository } from "../../interfaces/repositories/IReactionRepository.js";
import type { Reaction } from "shared";

type MysqlDatabase = MySql2Database<typeof mysqlSchema>;

export class MysqlReactionRepository implements IReactionRepository {
  constructor(private db: MysqlDatabase) {}

  async create(reaction: Omit<Reaction, "createdAt" | "updatedAt">): Promise<Reaction> {
    const now = new Date();
    await this.db.insert(reactions).values({
      ...reaction,
      createdAt: now,
      updatedAt: now,
    });

    // MySQL doesn't support RETURNING, fetch the inserted record
    const [result] = await this.db.select().from(reactions).where(eq(reactions.id, reaction.id)).limit(1);

    if (!result) {
      throw new Error("Failed to create reaction");
    }

    return result as Reaction;
  }

  async findById(id: string): Promise<Reaction | null> {
    const [result] = await this.db.select().from(reactions).where(eq(reactions.id, id)).limit(1);

    return (result as Reaction) ?? null;
  }

  async findByUserAndNote(userId: string, noteId: string): Promise<Reaction | null> {
    const [result] = await this.db
      .select()
      .from(reactions)
      .where(and(eq(reactions.userId, userId), eq(reactions.noteId, noteId)))
      .limit(1);

    return (result as Reaction) ?? null;
  }

  async findByUserNoteAndReaction(
    userId: string,
    noteId: string,
    reaction: string,
  ): Promise<Reaction | null> {
    const [result] = await this.db
      .select()
      .from(reactions)
      .where(
        and(
          eq(reactions.userId, userId),
          eq(reactions.noteId, noteId),
          eq(reactions.reaction, reaction),
        ),
      )
      .limit(1);

    return (result as Reaction) ?? null;
  }

  async findByUserAndNoteAll(userId: string, noteId: string): Promise<Reaction[]> {
    const results = await this.db
      .select()
      .from(reactions)
      .where(and(eq(reactions.userId, userId), eq(reactions.noteId, noteId)));

    return results as Reaction[];
  }

  async findByNoteId(noteId: string, limit = 100): Promise<Reaction[]> {
    const results = await this.db
      .select()
      .from(reactions)
      .where(eq(reactions.noteId, noteId))
      .limit(limit);

    return results as Reaction[];
  }

  async countByNoteId(noteId: string): Promise<Record<string, number>> {
    const results = await this.db
      .select({
        reaction: reactions.reaction,
        count: sql<number>`CAST(COUNT(*) AS SIGNED)`,
      })
      .from(reactions)
      .where(eq(reactions.noteId, noteId))
      .groupBy(reactions.reaction);

    const counts: Record<string, number> = {};
    for (const row of results) {
      if (row.reaction) {
        counts[row.reaction] = row.count;
      }
    }

    return counts;
  }

  async countByNoteIdWithEmojis(noteId: string): Promise<{
    counts: Record<string, number>;
    emojis: Record<string, string>;
  }> {
    // Get all reactions for the note to include custom emoji URLs
    const allReactions = await this.db
      .select({
        reaction: reactions.reaction,
        customEmojiUrl: reactions.customEmojiUrl,
      })
      .from(reactions)
      .where(eq(reactions.noteId, noteId));

    const counts: Record<string, number> = {};
    const emojis: Record<string, string> = {};

    for (const row of allReactions) {
      if (row.reaction) {
        // Count reactions
        counts[row.reaction] = (counts[row.reaction] || 0) + 1;

        // Store custom emoji URL (only need one URL per emoji name)
        if (row.customEmojiUrl && !emojis[row.reaction]) {
          emojis[row.reaction] = row.customEmojiUrl;
        }
      }
    }

    return { counts, emojis };
  }

  async countByNoteIds(noteIds: string[]): Promise<Map<string, Record<string, number>>> {
    if (noteIds.length === 0) {
      return new Map();
    }

    const results = await this.db
      .select({
        noteId: reactions.noteId,
        reaction: reactions.reaction,
        count: sql<number>`CAST(COUNT(*) AS SIGNED)`,
      })
      .from(reactions)
      .where(inArray(reactions.noteId, noteIds))
      .groupBy(reactions.noteId, reactions.reaction);

    const countsMap = new Map<string, Record<string, number>>();

    for (const row of results) {
      if (!countsMap.has(row.noteId)) {
        countsMap.set(row.noteId, {});
      }
      const counts = countsMap.get(row.noteId)!;
      if (row.reaction) {
        counts[row.reaction] = row.count;
      }
    }

    return countsMap;
  }

  async delete(userId: string, noteId: string): Promise<void> {
    await this.db
      .delete(reactions)
      .where(and(eq(reactions.userId, userId), eq(reactions.noteId, noteId)));
  }

  async deleteByUserNoteAndReaction(
    userId: string,
    noteId: string,
    reaction: string,
  ): Promise<void> {
    await this.db
      .delete(reactions)
      .where(
        and(
          eq(reactions.userId, userId),
          eq(reactions.noteId, noteId),
          eq(reactions.reaction, reaction),
        ),
      );
  }

  async deleteByNoteId(noteId: string): Promise<void> {
    await this.db.delete(reactions).where(eq(reactions.noteId, noteId));
  }
}
