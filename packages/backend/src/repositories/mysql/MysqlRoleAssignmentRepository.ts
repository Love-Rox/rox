/**
 * MySQL Role Assignment Repository
 *
 * MySQL implementation of the IRoleAssignmentRepository interface.
 *
 * @module repositories/mysql/MysqlRoleAssignmentRepository
 */

import { eq, and, sql, lt } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { roleAssignments, roles, type Role, type RoleAssignment } from "../../db/schema/mysql.js";
import type * as mysqlSchema from "../../db/schema/mysql.js";
import type {
  IRoleAssignmentRepository,
  RoleAssignmentWithRole,
} from "../../interfaces/repositories/IRoleAssignmentRepository.js";
import { generateId } from "shared";

type MysqlDatabase = MySql2Database<typeof mysqlSchema>;

/**
 * MySQL implementation of Role Assignment Repository
 */
export class MysqlRoleAssignmentRepository implements IRoleAssignmentRepository {
  constructor(private db: MysqlDatabase) {}

  async assign(
    userId: string,
    roleId: string,
    assignedById?: string,
    expiresAt?: Date,
  ): Promise<RoleAssignment> {
    const id = generateId();

    // MySQL uses ON DUPLICATE KEY instead of ON CONFLICT
    // Check if assignment exists first
    const [existing] = await this.db
      .select()
      .from(roleAssignments)
      .where(and(eq(roleAssignments.userId, userId), eq(roleAssignments.roleId, roleId)))
      .limit(1);

    if (existing) {
      return existing;
    }

    await this.db.insert(roleAssignments).values({
      id,
      userId,
      roleId,
      assignedById: assignedById ?? null,
      expiresAt: expiresAt ?? null,
    });

    // MySQL doesn't support RETURNING, fetch the inserted record
    const [result] = await this.db.select().from(roleAssignments).where(eq(roleAssignments.id, id)).limit(1);

    if (!result) {
      throw new Error("Failed to assign role");
    }

    return result;
  }

  async unassign(userId: string, roleId: string): Promise<boolean> {
    // MySQL doesn't support RETURNING, so check existence first
    const [existing] = await this.db
      .select({ id: roleAssignments.id })
      .from(roleAssignments)
      .where(and(eq(roleAssignments.userId, userId), eq(roleAssignments.roleId, roleId)))
      .limit(1);

    if (!existing) {
      return false;
    }

    await this.db
      .delete(roleAssignments)
      .where(and(eq(roleAssignments.userId, userId), eq(roleAssignments.roleId, roleId)));

    return true;
  }

  async findByUserId(userId: string): Promise<RoleAssignmentWithRole[]> {
    const results = await this.db
      .select({
        assignment: roleAssignments,
        role: roles,
      })
      .from(roleAssignments)
      .innerJoin(roles, eq(roleAssignments.roleId, roles.id))
      .where(eq(roleAssignments.userId, userId));

    return results.map((r) => ({
      ...r.assignment,
      role: r.role,
    }));
  }

  async findRolesByUserId(userId: string): Promise<Role[]> {
    const results = await this.db
      .select({ role: roles })
      .from(roleAssignments)
      .innerJoin(roles, eq(roleAssignments.roleId, roles.id))
      .where(eq(roleAssignments.userId, userId));

    return results.map((r) => r.role);
  }

  async findUserIdsByRoleId(roleId: string, limit = 100, offset = 0): Promise<string[]> {
    const results = await this.db
      .select({ userId: roleAssignments.userId })
      .from(roleAssignments)
      .where(eq(roleAssignments.roleId, roleId))
      .limit(limit)
      .offset(offset);

    return results.map((r) => r.userId);
  }

  async countUsersByRoleId(roleId: string): Promise<number> {
    const [result] = await this.db
      .select({ count: sql<number>`CAST(COUNT(*) AS SIGNED)` })
      .from(roleAssignments)
      .where(eq(roleAssignments.roleId, roleId));

    return result?.count ?? 0;
  }

  async hasRole(userId: string, roleId: string): Promise<boolean> {
    const [result] = await this.db
      .select({ id: roleAssignments.id })
      .from(roleAssignments)
      .where(and(eq(roleAssignments.userId, userId), eq(roleAssignments.roleId, roleId)))
      .limit(1);

    return result !== undefined;
  }

  async hasAdminRole(userId: string): Promise<boolean> {
    const [result] = await this.db
      .select({ id: roleAssignments.id })
      .from(roleAssignments)
      .innerJoin(roles, eq(roleAssignments.roleId, roles.id))
      .where(and(eq(roleAssignments.userId, userId), eq(roles.isAdminRole, true)))
      .limit(1);

    return result !== undefined;
  }

  async hasModeratorRole(userId: string): Promise<boolean> {
    const [result] = await this.db
      .select({ id: roleAssignments.id })
      .from(roleAssignments)
      .innerJoin(roles, eq(roleAssignments.roleId, roles.id))
      .where(and(eq(roleAssignments.userId, userId), eq(roles.isModeratorRole, true)))
      .limit(1);

    return result !== undefined;
  }

  async removeAllForUser(userId: string): Promise<number> {
    // MySQL doesn't support RETURNING, so count before deleting
    const [countResult] = await this.db
      .select({ count: sql<number>`CAST(COUNT(*) AS SIGNED)` })
      .from(roleAssignments)
      .where(eq(roleAssignments.userId, userId));

    const count = countResult?.count ?? 0;

    await this.db.delete(roleAssignments).where(eq(roleAssignments.userId, userId));

    return count;
  }

  async removeExpired(): Promise<number> {
    const now = new Date();

    // MySQL doesn't support RETURNING, so count before deleting
    const [countResult] = await this.db
      .select({ count: sql<number>`CAST(COUNT(*) AS SIGNED)` })
      .from(roleAssignments)
      .where(lt(roleAssignments.expiresAt, now));

    const count = countResult?.count ?? 0;

    await this.db.delete(roleAssignments).where(lt(roleAssignments.expiresAt, now));

    return count;
  }
}
