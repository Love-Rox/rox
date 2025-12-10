/**
 * SQLite Passkey Challenge Repository
 *
 * SQLite/D1 implementation of the IPasskeyChallengeRepository interface.
 *
 * @module repositories/sqlite/SqlitePasskeyChallengeRepository
 */

import { eq, lt, sql } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { passkeyChallenges, type PasskeyChallenge, type NewPasskeyChallenge } from "../../db/schema/sqlite.js";
import type * as sqliteSchema from "../../db/schema/sqlite.js";
import type { IPasskeyChallengeRepository } from "../../interfaces/repositories/IPasskeyChallengeRepository.js";

type SqliteDatabase = BetterSQLite3Database<typeof sqliteSchema>;

/**
 * SQLite implementation of Passkey Challenge Repository
 */
export class SqlitePasskeyChallengeRepository implements IPasskeyChallengeRepository {
  constructor(private db: SqliteDatabase) {}

  async create(challenge: NewPasskeyChallenge): Promise<PasskeyChallenge> {
    this.db.insert(passkeyChallenges).values(challenge).run();

    // SQLite doesn't support RETURNING, fetch the inserted record
    const [result] = this.db
      .select()
      .from(passkeyChallenges)
      .where(eq(passkeyChallenges.id, challenge.id))
      .limit(1)
      .all();

    if (!result) {
      throw new Error("Failed to create passkey challenge");
    }

    return result as PasskeyChallenge;
  }

  async findByChallenge(challenge: string): Promise<PasskeyChallenge | null> {
    const [result] = this.db
      .select()
      .from(passkeyChallenges)
      .where(eq(passkeyChallenges.challenge, challenge))
      .limit(1)
      .all();

    if (!result) {
      return null;
    }

    // Check if expired
    if (new Date() > result.expiresAt) {
      // Delete expired challenge
      await this.delete(result.id);
      return null;
    }

    return result as PasskeyChallenge;
  }

  async delete(id: string): Promise<void> {
    this.db.delete(passkeyChallenges).where(eq(passkeyChallenges.id, id)).run();
  }

  async deleteByChallenge(challenge: string): Promise<void> {
    this.db.delete(passkeyChallenges).where(eq(passkeyChallenges.challenge, challenge)).run();
  }

  async deleteExpired(): Promise<number> {
    // SQLite doesn't support RETURNING, so count before deleting
    const [countResult] = this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(passkeyChallenges)
      .where(lt(passkeyChallenges.expiresAt, new Date()))
      .all();

    const count = countResult?.count ?? 0;

    this.db.delete(passkeyChallenges).where(lt(passkeyChallenges.expiresAt, new Date())).run();

    return count;
  }
}
