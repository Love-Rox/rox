/**
 * MySQL Passkey Challenge Repository
 *
 * MySQL implementation of the IPasskeyChallengeRepository interface.
 *
 * @module repositories/mysql/MysqlPasskeyChallengeRepository
 */

import { eq, lt, sql } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { passkeyChallenges, type PasskeyChallenge, type NewPasskeyChallenge } from "../../db/schema/mysql.js";
import type * as mysqlSchema from "../../db/schema/mysql.js";
import type { IPasskeyChallengeRepository } from "../../interfaces/repositories/IPasskeyChallengeRepository.js";

type MysqlDatabase = MySql2Database<typeof mysqlSchema>;

/**
 * MySQL implementation of Passkey Challenge Repository
 */
export class MysqlPasskeyChallengeRepository implements IPasskeyChallengeRepository {
  constructor(private db: MysqlDatabase) {}

  async create(challenge: NewPasskeyChallenge): Promise<PasskeyChallenge> {
    await this.db.insert(passkeyChallenges).values(challenge);

    // MySQL doesn't support RETURNING, fetch the inserted record
    const [result] = await this.db
      .select()
      .from(passkeyChallenges)
      .where(eq(passkeyChallenges.id, challenge.id))
      .limit(1);

    if (!result) {
      throw new Error("Failed to create passkey challenge");
    }

    return result;
  }

  async findByChallenge(challenge: string): Promise<PasskeyChallenge | null> {
    const [result] = await this.db
      .select()
      .from(passkeyChallenges)
      .where(eq(passkeyChallenges.challenge, challenge))
      .limit(1);

    if (!result) {
      return null;
    }

    // Check if expired
    if (new Date() > result.expiresAt) {
      // Delete expired challenge
      await this.delete(result.id);
      return null;
    }

    return result;
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(passkeyChallenges).where(eq(passkeyChallenges.id, id));
  }

  async deleteByChallenge(challenge: string): Promise<void> {
    await this.db.delete(passkeyChallenges).where(eq(passkeyChallenges.challenge, challenge));
  }

  async deleteExpired(): Promise<number> {
    // MySQL doesn't support RETURNING, so count before deleting
    const [countResult] = await this.db
      .select({ count: sql<number>`CAST(COUNT(*) AS SIGNED)` })
      .from(passkeyChallenges)
      .where(lt(passkeyChallenges.expiresAt, new Date()));

    const count = countResult?.count ?? 0;

    await this.db.delete(passkeyChallenges).where(lt(passkeyChallenges.expiresAt, new Date()));

    return count;
  }
}
