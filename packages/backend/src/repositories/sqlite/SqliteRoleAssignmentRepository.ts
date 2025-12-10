/**
 * SQLite Role Assignment Repository
 *
 * SQLite/D1 implementation of the IRoleAssignmentRepository interface.
 *
 * @module repositories/sqlite/SqliteRoleAssignmentRepository
 */

import { eq, and, sql, lt } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { roleAssignments, roles, type Role, type RoleAssignment } from "../../db/schema/sqlite.js";
import type * as sqliteSchema from "../../db/schema/sqlite.js";
import type {
  IRoleAssignmentRepository,
  RoleAssignmentWithRole,
} from "../../interfaces/repositories/IRoleAssignmentRepository.js";
import { generateId } from "shared";

type SqliteDatabase = BetterSQLite3Database<typeof sqliteSchema>;

/**
 * SQLite implementation of Role Assignment Repository
 */
export class SqliteRoleAssignmentRepository implements IRoleAssignmentRepository {
  constructor(private db: SqliteDatabase) {}

  async assign(
    userId: string,
    roleId: string,
    assignedById?: string,
    expiresAt?: Date,
  ): Promise<RoleAssignment> {
    const id = generateId();

    // Check if assignment exists first
    const [existing] = this.db
      .select()
      .from(roleAssignments)
      .where(and(eq(roleAssignments.userId, userId), eq(roleAssignments.roleId, roleId)))
      .limit(1)
      .all();

    if (existing) {
      return existing as RoleAssignment;
    }

    this.db.insert(roleAssignments).values({
      id,
      userId,
      roleId,
      assignedById: assignedById ?? null,
      expiresAt: expiresAt ?? null,
    }).run();

    // SQLite doesn't support RETURNING, fetch the inserted record
    const [result] = this.db.select().from(roleAssignments).where(eq(roleAssignments.id, id)).limit(1).all();

    if (!result) {
      throw new Error("Failed to assign role");
    }

    return result as RoleAssignment;
  }

  async unassign(userId: string, roleId: string): Promise<boolean> {
    // SQLite doesn't support RETURNING, so check existence first
    const [existing] = this.db
      .select({ id: roleAssignments.id })
      .from(roleAssignments)
      .where(and(eq(roleAssignments.userId, userId), eq(roleAssignments.roleId, roleId)))
      .limit(1)
      .all();

    if (!existing) {
      return false;
    }

    this.db
      .delete(roleAssignments)
      .where(and(eq(roleAssignments.userId, userId), eq(roleAssignments.roleId, roleId)))
      .run();

    return true;
  }

  async findByUserId(userId: string): Promise<RoleAssignmentWithRole[]> {
    const results = this.db
      .select({
        assignment: roleAssignments,
        role: roles,
      })
      .from(roleAssignments)
      .innerJoin(roles, eq(roleAssignments.roleId, roles.id))
      .where(eq(roleAssignments.userId, userId))
      .all();

    return results.map((r) => ({
      ...r.assignment,
      role: r.role,
    })) as RoleAssignmentWithRole[];
  }

  async findRolesByUserId(userId: string): Promise<Role[]> {
    const results = this.db
      .select({ role: roles })
      .from(roleAssignments)
      .innerJoin(roles, eq(roleAssignments.roleId, roles.id))
      .where(eq(roleAssignments.userId, userId))
      .all();

    return results.map((r) => r.role) as Role[];
  }

  async findUserIdsByRoleId(roleId: string, limit = 100, offset = 0): Promise<string[]> {
    const results = this.db
      .select({ userId: roleAssignments.userId })
      .from(roleAssignments)
      .where(eq(roleAssignments.roleId, roleId))
      .limit(limit)
      .offset(offset)
      .all();

    return results.map((r) => r.userId);
  }

  async countUsersByRoleId(roleId: string): Promise<number> {
    const [result] = this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(roleAssignments)
      .where(eq(roleAssignments.roleId, roleId))
      .all();

    return result?.count ?? 0;
  }

  async hasRole(userId: string, roleId: string): Promise<boolean> {
    const [result] = this.db
      .select({ id: roleAssignments.id })
      .from(roleAssignments)
      .where(and(eq(roleAssignments.userId, userId), eq(roleAssignments.roleId, roleId)))
      .limit(1)
      .all();

    return result !== undefined;
  }

  async hasAdminRole(userId: string): Promise<boolean> {
    const [result] = this.db
      .select({ id: roleAssignments.id })
      .from(roleAssignments)
      .innerJoin(roles, eq(roleAssignments.roleId, roles.id))
      .where(and(eq(roleAssignments.userId, userId), eq(roles.isAdminRole, true)))
      .limit(1)
      .all();

    return result !== undefined;
  }

  async hasModeratorRole(userId: string): Promise<boolean> {
    const [result] = this.db
      .select({ id: roleAssignments.id })
      .from(roleAssignments)
      .innerJoin(roles, eq(roleAssignments.roleId, roles.id))
      .where(and(eq(roleAssignments.userId, userId), eq(roles.isModeratorRole, true)))
      .limit(1)
      .all();

    return result !== undefined;
  }

  async removeAllForUser(userId: string): Promise<number> {
    // SQLite doesn't support RETURNING, so count before deleting
    const [countResult] = this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(roleAssignments)
      .where(eq(roleAssignments.userId, userId))
      .all();

    const count = countResult?.count ?? 0;

    this.db.delete(roleAssignments).where(eq(roleAssignments.userId, userId)).run();

    return count;
  }

  async removeExpired(): Promise<number> {
    const now = new Date();

    // SQLite doesn't support RETURNING, so count before deleting
    const [countResult] = this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(roleAssignments)
      .where(lt(roleAssignments.expiresAt, now))
      .all();

    const count = countResult?.count ?? 0;

    this.db.delete(roleAssignments).where(lt(roleAssignments.expiresAt, now)).run();

    return count;
  }
}
