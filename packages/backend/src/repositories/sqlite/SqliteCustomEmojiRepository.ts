/**
 * SQLite Custom Emoji Repository
 *
 * SQLite/D1 implementation of the ICustomEmojiRepository interface.
 *
 * @module repositories/sqlite/SqliteCustomEmojiRepository
 */

import { eq, and, isNull, like, inArray, sql } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { customEmojis, type CustomEmoji, type NewCustomEmoji } from "../../db/schema/sqlite.js";
import type * as sqliteSchema from "../../db/schema/sqlite.js";
import type {
  ICustomEmojiRepository,
  ListCustomEmojisOptions,
} from "../../interfaces/repositories/ICustomEmojiRepository.js";

type SqliteDatabase = BetterSQLite3Database<typeof sqliteSchema>;

/**
 * SQLite implementation of Custom Emoji Repository
 */
export class SqliteCustomEmojiRepository implements ICustomEmojiRepository {
  constructor(private db: SqliteDatabase) {}

  async create(emoji: NewCustomEmoji): Promise<CustomEmoji> {
    this.db.insert(customEmojis).values(emoji).run();

    // SQLite doesn't support RETURNING, fetch the inserted record
    const [result] = this.db.select().from(customEmojis).where(eq(customEmojis.id, emoji.id)).limit(1).all();

    if (!result) {
      throw new Error("Failed to create custom emoji");
    }

    return result as CustomEmoji;
  }

  async findById(id: string): Promise<CustomEmoji | null> {
    const [result] = this.db.select().from(customEmojis).where(eq(customEmojis.id, id)).limit(1).all();

    return (result as CustomEmoji) ?? null;
  }

  async findByName(name: string, host?: string | null): Promise<CustomEmoji | null> {
    const conditions =
      host === null || host === undefined
        ? and(eq(customEmojis.name, name), isNull(customEmojis.host))
        : and(eq(customEmojis.name, name), eq(customEmojis.host, host));

    const [result] = this.db.select().from(customEmojis).where(conditions).limit(1).all();

    return (result as CustomEmoji) ?? null;
  }

  async findByNameAnyHost(name: string): Promise<CustomEmoji | null> {
    const [result] = this.db.select().from(customEmojis).where(eq(customEmojis.name, name)).limit(1).all();

    return (result as CustomEmoji) ?? null;
  }

  async findManyByNames(names: string[], host?: string | null): Promise<Map<string, CustomEmoji>> {
    if (names.length === 0) {
      return new Map();
    }

    const hostCondition =
      host === null || host === undefined ? isNull(customEmojis.host) : eq(customEmojis.host, host);

    const results = this.db
      .select()
      .from(customEmojis)
      .where(and(inArray(customEmojis.name, names), hostCondition))
      .all();

    const map = new Map<string, CustomEmoji>();
    for (const emoji of results) {
      map.set(emoji.name, emoji as CustomEmoji);
    }

    return map;
  }

  async findManyByNamesAnyHost(names: string[]): Promise<Map<string, CustomEmoji>> {
    if (names.length === 0) {
      return new Map();
    }

    const results = this.db.select().from(customEmojis).where(inArray(customEmojis.name, names)).all();

    const map = new Map<string, CustomEmoji>();
    for (const emoji of results) {
      if (!map.has(emoji.name)) {
        map.set(emoji.name, emoji as CustomEmoji);
      }
    }

    return map;
  }

  async list(options: ListCustomEmojisOptions = {}): Promise<CustomEmoji[]> {
    const { host, category, search, limit = 100, offset = 0, includeSensitive = false } = options;

    const conditions = [];

    if (host === null) {
      conditions.push(isNull(customEmojis.host));
    } else if (host !== undefined) {
      conditions.push(eq(customEmojis.host, host));
    }

    if (category) {
      conditions.push(eq(customEmojis.category, category));
    }

    if (search) {
      conditions.push(like(customEmojis.name, `%${search}%`));
    }

    if (!includeSensitive) {
      conditions.push(eq(customEmojis.isSensitive, false));
    }

    const query = this.db
      .select()
      .from(customEmojis)
      .limit(limit)
      .offset(offset)
      .orderBy(customEmojis.category, customEmojis.name);

    if (conditions.length > 0) {
      return query.where(and(...conditions)).all() as CustomEmoji[];
    }

    return query.all() as CustomEmoji[];
  }

  async listLocal(): Promise<CustomEmoji[]> {
    const results = this.db
      .select()
      .from(customEmojis)
      .where(isNull(customEmojis.host))
      .orderBy(customEmojis.category, customEmojis.name)
      .all();

    return results as CustomEmoji[];
  }

  async listCategories(): Promise<string[]> {
    const results = this.db
      .selectDistinct({ category: customEmojis.category })
      .from(customEmojis)
      .where(isNull(customEmojis.host))
      .orderBy(customEmojis.category)
      .all();

    return results.map((r) => r.category).filter((c): c is string => c !== null);
  }

  async update(id: string, updates: Partial<NewCustomEmoji>): Promise<CustomEmoji | null> {
    this.db
      .update(customEmojis)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(customEmojis.id, id))
      .run();

    // Fetch the updated record
    const [result] = this.db.select().from(customEmojis).where(eq(customEmojis.id, id)).limit(1).all();

    return (result as CustomEmoji) ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const existing = await this.findById(id);
    if (!existing) {
      return false;
    }

    this.db.delete(customEmojis).where(eq(customEmojis.id, id)).run();

    return true;
  }

  async exists(name: string, host?: string | null): Promise<boolean> {
    const conditions =
      host === null || host === undefined
        ? and(eq(customEmojis.name, name), isNull(customEmojis.host))
        : and(eq(customEmojis.name, name), eq(customEmojis.host, host));

    const [result] = this.db.select({ id: customEmojis.id }).from(customEmojis).where(conditions).limit(1).all();

    return result !== undefined;
  }

  async count(options: ListCustomEmojisOptions = {}): Promise<number> {
    const { host, category, search, includeSensitive = false } = options;

    const conditions = [];

    if (host === null) {
      conditions.push(isNull(customEmojis.host));
    } else if (host !== undefined) {
      conditions.push(eq(customEmojis.host, host));
    }

    if (category) {
      conditions.push(eq(customEmojis.category, category));
    }

    if (search) {
      conditions.push(like(customEmojis.name, `%${search}%`));
    }

    if (!includeSensitive) {
      conditions.push(eq(customEmojis.isSensitive, false));
    }

    const [result] =
      conditions.length > 0
        ? this.db
            .select({ count: sql<number>`COUNT(*)` })
            .from(customEmojis)
            .where(and(...conditions))
            .all()
        : this.db.select({ count: sql<number>`COUNT(*)` }).from(customEmojis).all();

    return result?.count ?? 0;
  }
}
