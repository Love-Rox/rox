/**
 * SQLite OAuth Account Repository
 *
 * SQLite/D1 implementation of the IOAuthAccountRepository interface.
 *
 * @module repositories/sqlite/SqliteOAuthAccountRepository
 */

import { eq, and, sql } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { oauthAccounts, type OAuthAccount, type NewOAuthAccount } from "../../db/schema/sqlite.js";
import type * as sqliteSchema from "../../db/schema/sqlite.js";
import type {
  IOAuthAccountRepository,
  OAuthProvider,
} from "../../interfaces/repositories/IOAuthAccountRepository.js";

type SqliteDatabase = BetterSQLite3Database<typeof sqliteSchema>;

/**
 * SQLite implementation of OAuth Account Repository
 */
export class SqliteOAuthAccountRepository implements IOAuthAccountRepository {
  constructor(private db: SqliteDatabase) {}

  async create(account: NewOAuthAccount): Promise<OAuthAccount> {
    this.db.insert(oauthAccounts).values(account).run();

    // SQLite doesn't support RETURNING, fetch the inserted record
    const [result] = this.db
      .select()
      .from(oauthAccounts)
      .where(eq(oauthAccounts.id, account.id))
      .limit(1)
      .all();

    if (!result) {
      throw new Error("Failed to create OAuth account");
    }

    return result as OAuthAccount;
  }

  async findById(id: string): Promise<OAuthAccount | null> {
    const [result] = this.db.select().from(oauthAccounts).where(eq(oauthAccounts.id, id)).limit(1).all();

    return (result as OAuthAccount) ?? null;
  }

  async findByProviderAccount(provider: OAuthProvider, providerAccountId: string): Promise<OAuthAccount | null> {
    const [result] = this.db
      .select()
      .from(oauthAccounts)
      .where(and(eq(oauthAccounts.provider, provider), eq(oauthAccounts.providerAccountId, providerAccountId)))
      .limit(1)
      .all();

    return (result as OAuthAccount) ?? null;
  }

  async findByUserAndProvider(userId: string, provider: OAuthProvider): Promise<OAuthAccount | null> {
    const [result] = this.db
      .select()
      .from(oauthAccounts)
      .where(and(eq(oauthAccounts.userId, userId), eq(oauthAccounts.provider, provider)))
      .limit(1)
      .all();

    return (result as OAuthAccount) ?? null;
  }

  async findByUserId(userId: string): Promise<OAuthAccount[]> {
    const results = this.db
      .select()
      .from(oauthAccounts)
      .where(eq(oauthAccounts.userId, userId))
      .orderBy(oauthAccounts.createdAt)
      .all();

    return results as OAuthAccount[];
  }

  async updateTokens(
    id: string,
    data: {
      accessToken?: string | null;
      refreshToken?: string | null;
      tokenExpiresAt?: Date | null;
      scope?: string | null;
    },
  ): Promise<OAuthAccount> {
    this.db
      .update(oauthAccounts)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(oauthAccounts.id, id))
      .run();

    // SQLite doesn't support RETURNING, fetch the updated record
    const [result] = this.db.select().from(oauthAccounts).where(eq(oauthAccounts.id, id)).limit(1).all();

    if (!result) {
      throw new Error("OAuth account not found");
    }

    return result as OAuthAccount;
  }

  async delete(id: string): Promise<void> {
    this.db.delete(oauthAccounts).where(eq(oauthAccounts.id, id)).run();
  }

  async deleteByUserAndProvider(userId: string, provider: OAuthProvider): Promise<void> {
    this.db
      .delete(oauthAccounts)
      .where(and(eq(oauthAccounts.userId, userId), eq(oauthAccounts.provider, provider)))
      .run();
  }

  async deleteByUserId(userId: string): Promise<void> {
    this.db.delete(oauthAccounts).where(eq(oauthAccounts.userId, userId)).run();
  }

  async countByUserId(userId: string): Promise<number> {
    const [result] = this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(oauthAccounts)
      .where(eq(oauthAccounts.userId, userId))
      .all();

    return result?.count ?? 0;
  }
}
