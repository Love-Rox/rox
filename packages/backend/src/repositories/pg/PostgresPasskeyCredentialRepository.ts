import { eq, sql } from "drizzle-orm";
import type { Database } from "../../db/index.js";
import { passkeyCredentials, type PasskeyCredential, type NewPasskeyCredential } from "../../db/schema/pg.js";
import type { IPasskeyCredentialRepository } from "../../interfaces/repositories/IPasskeyCredentialRepository.js";

/**
 * PostgreSQL implementation of Passkey Credential Repository
 */
export class PostgresPasskeyCredentialRepository implements IPasskeyCredentialRepository {
  constructor(private db: Database) {}

  async create(credential: NewPasskeyCredential): Promise<PasskeyCredential> {
    const [result] = await this.db.insert(passkeyCredentials).values(credential).returning();

    if (!result) {
      throw new Error("Failed to create passkey credential");
    }

    return result;
  }

  async findById(id: string): Promise<PasskeyCredential | null> {
    const [result] = await this.db
      .select()
      .from(passkeyCredentials)
      .where(eq(passkeyCredentials.id, id))
      .limit(1);

    return result ?? null;
  }

  async findByCredentialId(credentialId: string): Promise<PasskeyCredential | null> {
    const [result] = await this.db
      .select()
      .from(passkeyCredentials)
      .where(eq(passkeyCredentials.credentialId, credentialId))
      .limit(1);

    return result ?? null;
  }

  async findByUserId(userId: string): Promise<PasskeyCredential[]> {
    const results = await this.db
      .select()
      .from(passkeyCredentials)
      .where(eq(passkeyCredentials.userId, userId))
      .orderBy(passkeyCredentials.createdAt);

    return results;
  }

  async updateCounter(id: string, counter: number, lastUsedAt: Date): Promise<PasskeyCredential> {
    const [result] = await this.db
      .update(passkeyCredentials)
      .set({
        counter,
        lastUsedAt,
      })
      .where(eq(passkeyCredentials.id, id))
      .returning();

    if (!result) {
      throw new Error("Passkey credential not found");
    }

    return result;
  }

  async updateName(id: string, name: string): Promise<PasskeyCredential> {
    const [result] = await this.db
      .update(passkeyCredentials)
      .set({ name })
      .where(eq(passkeyCredentials.id, id))
      .returning();

    if (!result) {
      throw new Error("Passkey credential not found");
    }

    return result;
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(passkeyCredentials).where(eq(passkeyCredentials.id, id));
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.db.delete(passkeyCredentials).where(eq(passkeyCredentials.userId, userId));
  }

  async countByUserId(userId: string): Promise<number> {
    const [result] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(passkeyCredentials)
      .where(eq(passkeyCredentials.userId, userId));

    return result?.count ?? 0;
  }
}
