/**
 * SQLite Passkey Credential Repository
 *
 * SQLite/D1 implementation of the IPasskeyCredentialRepository interface.
 *
 * @module repositories/sqlite/SqlitePasskeyCredentialRepository
 */

import { eq, sql } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { passkeyCredentials, type PasskeyCredential, type NewPasskeyCredential } from "../../db/schema/sqlite.js";
import type * as sqliteSchema from "../../db/schema/sqlite.js";
import type { IPasskeyCredentialRepository } from "../../interfaces/repositories/IPasskeyCredentialRepository.js";

type SqliteDatabase = BetterSQLite3Database<typeof sqliteSchema>;

/**
 * SQLite implementation of Passkey Credential Repository
 */
export class SqlitePasskeyCredentialRepository implements IPasskeyCredentialRepository {
  constructor(private db: SqliteDatabase) {}

  async create(credential: NewPasskeyCredential): Promise<PasskeyCredential> {
    this.db.insert(passkeyCredentials).values(credential).run();

    // SQLite doesn't support RETURNING, fetch the inserted record
    const [result] = this.db
      .select()
      .from(passkeyCredentials)
      .where(eq(passkeyCredentials.id, credential.id))
      .limit(1)
      .all();

    if (!result) {
      throw new Error("Failed to create passkey credential");
    }

    return result as PasskeyCredential;
  }

  async findById(id: string): Promise<PasskeyCredential | null> {
    const [result] = this.db
      .select()
      .from(passkeyCredentials)
      .where(eq(passkeyCredentials.id, id))
      .limit(1)
      .all();

    return (result as PasskeyCredential) ?? null;
  }

  async findByCredentialId(credentialId: string): Promise<PasskeyCredential | null> {
    const [result] = this.db
      .select()
      .from(passkeyCredentials)
      .where(eq(passkeyCredentials.credentialId, credentialId))
      .limit(1)
      .all();

    return (result as PasskeyCredential) ?? null;
  }

  async findByUserId(userId: string): Promise<PasskeyCredential[]> {
    const results = this.db
      .select()
      .from(passkeyCredentials)
      .where(eq(passkeyCredentials.userId, userId))
      .orderBy(passkeyCredentials.createdAt)
      .all();

    return results as PasskeyCredential[];
  }

  async updateCounter(id: string, counter: number, lastUsedAt: Date): Promise<PasskeyCredential> {
    this.db
      .update(passkeyCredentials)
      .set({
        counter,
        lastUsedAt,
      })
      .where(eq(passkeyCredentials.id, id))
      .run();

    // SQLite doesn't support RETURNING, fetch the updated record
    const [result] = this.db
      .select()
      .from(passkeyCredentials)
      .where(eq(passkeyCredentials.id, id))
      .limit(1)
      .all();

    if (!result) {
      throw new Error("Passkey credential not found");
    }

    return result as PasskeyCredential;
  }

  async updateName(id: string, name: string): Promise<PasskeyCredential> {
    this.db.update(passkeyCredentials).set({ name }).where(eq(passkeyCredentials.id, id)).run();

    // SQLite doesn't support RETURNING, fetch the updated record
    const [result] = this.db
      .select()
      .from(passkeyCredentials)
      .where(eq(passkeyCredentials.id, id))
      .limit(1)
      .all();

    if (!result) {
      throw new Error("Passkey credential not found");
    }

    return result as PasskeyCredential;
  }

  async delete(id: string): Promise<void> {
    this.db.delete(passkeyCredentials).where(eq(passkeyCredentials.id, id)).run();
  }

  async deleteByUserId(userId: string): Promise<void> {
    this.db.delete(passkeyCredentials).where(eq(passkeyCredentials.userId, userId)).run();
  }

  async countByUserId(userId: string): Promise<number> {
    const [result] = this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(passkeyCredentials)
      .where(eq(passkeyCredentials.userId, userId))
      .all();

    return result?.count ?? 0;
  }
}
