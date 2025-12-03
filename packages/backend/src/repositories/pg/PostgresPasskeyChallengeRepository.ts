import { eq, lt } from "drizzle-orm";
import type { Database } from "../../db/index.js";
import { passkeyChallenges, type PasskeyChallenge, type NewPasskeyChallenge } from "../../db/schema/pg.js";
import type { IPasskeyChallengeRepository } from "../../interfaces/repositories/IPasskeyChallengeRepository.js";

/**
 * PostgreSQL implementation of Passkey Challenge Repository
 */
export class PostgresPasskeyChallengeRepository implements IPasskeyChallengeRepository {
  constructor(private db: Database) {}

  async create(challenge: NewPasskeyChallenge): Promise<PasskeyChallenge> {
    const [result] = await this.db.insert(passkeyChallenges).values(challenge).returning();

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
    const result = await this.db
      .delete(passkeyChallenges)
      .where(lt(passkeyChallenges.expiresAt, new Date()))
      .returning({ id: passkeyChallenges.id });

    return result.length;
  }
}
