/**
 * SQLite Invitation Code Repository
 *
 * SQLite/D1 implementation of the IInvitationCodeRepository interface.
 *
 * @module repositories/sqlite/SqliteInvitationCodeRepository
 */

import { eq, sql, desc, and, gt, or, isNull, lt } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { invitationCodes, type InvitationCode } from "../../db/schema/sqlite.js";
import type * as sqliteSchema from "../../db/schema/sqlite.js";
import type { IInvitationCodeRepository } from "../../interfaces/repositories/IInvitationCodeRepository.js";
import { generateId } from "shared";

type SqliteDatabase = BetterSQLite3Database<typeof sqliteSchema>;

/**
 * SQLite implementation of Invitation Code Repository
 */
export class SqliteInvitationCodeRepository implements IInvitationCodeRepository {
  constructor(private db: SqliteDatabase) {}

  async create(data: {
    code: string;
    createdById: string;
    expiresAt?: Date;
    maxUses?: number;
  }): Promise<InvitationCode> {
    const id = generateId();

    this.db.insert(invitationCodes).values({
      id,
      code: data.code,
      createdById: data.createdById,
      expiresAt: data.expiresAt ?? null,
      maxUses: data.maxUses ?? 1,
      useCount: 0,
    }).run();

    // SQLite doesn't support RETURNING, fetch the inserted record
    const [result] = this.db.select().from(invitationCodes).where(eq(invitationCodes.id, id)).limit(1).all();

    if (!result) {
      throw new Error("Failed to create invitation code");
    }

    return result;
  }

  async findByCode(code: string): Promise<InvitationCode | null> {
    const [result] = this.db
      .select()
      .from(invitationCodes)
      .where(eq(invitationCodes.code, code))
      .limit(1)
      .all();

    return result ?? null;
  }

  async findById(id: string): Promise<InvitationCode | null> {
    const [result] = this.db
      .select()
      .from(invitationCodes)
      .where(eq(invitationCodes.id, id))
      .limit(1)
      .all();

    return result ?? null;
  }

  async findByCreatedBy(userId: string, limit = 100, offset = 0): Promise<InvitationCode[]> {
    return this.db
      .select()
      .from(invitationCodes)
      .where(eq(invitationCodes.createdById, userId))
      .orderBy(desc(invitationCodes.createdAt))
      .limit(limit)
      .offset(offset)
      .all();
  }

  async findAll(limit = 100, offset = 0): Promise<InvitationCode[]> {
    return this.db
      .select()
      .from(invitationCodes)
      .orderBy(desc(invitationCodes.createdAt))
      .limit(limit)
      .offset(offset)
      .all();
  }

  async isValid(code: string): Promise<boolean> {
    const invitation = await this.findByCode(code);
    if (!invitation) return false;

    // Check if expired
    if (invitation.expiresAt && invitation.expiresAt < new Date()) {
      return false;
    }

    // Check if max uses reached
    if (invitation.maxUses !== null && invitation.useCount >= invitation.maxUses) {
      return false;
    }

    return true;
  }

  async use(code: string, usedById: string): Promise<InvitationCode | null> {
    const invitation = await this.findByCode(code);
    if (!invitation) return null;

    // Validate
    if (!(await this.isValid(code))) {
      return null;
    }

    // Update use count and usedById
    this.db
      .update(invitationCodes)
      .set({
        useCount: invitation.useCount + 1,
        usedById: invitation.maxUses === 1 ? usedById : invitation.usedById,
        usedAt: invitation.maxUses === 1 ? new Date() : invitation.usedAt,
      })
      .where(eq(invitationCodes.code, code))
      .run();

    // Fetch the updated record
    const [updated] = this.db.select().from(invitationCodes).where(eq(invitationCodes.code, code)).limit(1).all();

    return updated ?? null;
  }

  async delete(id: string): Promise<boolean> {
    // Check existence first since SQLite doesn't support RETURNING
    const existing = await this.findById(id);
    if (!existing) {
      return false;
    }

    this.db.delete(invitationCodes).where(eq(invitationCodes.id, id)).run();

    return true;
  }

  async count(): Promise<number> {
    const [result] = this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(invitationCodes)
      .all();

    return result?.count ?? 0;
  }

  async countUnused(): Promise<number> {
    const now = new Date();
    const [result] = this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(invitationCodes)
      .where(
        and(
          // Not expired (expiresAt is null or > now)
          or(isNull(invitationCodes.expiresAt), gt(invitationCodes.expiresAt, now)),
          // Not fully used (useCount < maxUses or maxUses is null)
          or(
            isNull(invitationCodes.maxUses),
            lt(invitationCodes.useCount, invitationCodes.maxUses),
          ),
        ),
      )
      .all();

    return result?.count ?? 0;
  }

  async countRecentByCreator(userId: string, withinHours: number): Promise<number> {
    const cutoff = new Date(Date.now() - withinHours * 60 * 60 * 1000);
    const [result] = this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(invitationCodes)
      .where(and(eq(invitationCodes.createdById, userId), gt(invitationCodes.createdAt, cutoff)))
      .all();

    return result?.count ?? 0;
  }
}
