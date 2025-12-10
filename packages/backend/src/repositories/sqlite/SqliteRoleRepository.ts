/**
 * SQLite Role Repository
 *
 * SQLite/D1 implementation of the IRoleRepository interface.
 *
 * @module repositories/sqlite/SqliteRoleRepository
 */

import { eq, asc, sql, desc } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { roles, type Role } from "../../db/schema/sqlite.js";
import type * as sqliteSchema from "../../db/schema/sqlite.js";
import type {
  IRoleRepository,
  CreateRoleInput,
  UpdateRoleInput,
} from "../../interfaces/repositories/IRoleRepository.js";
import { generateId } from "shared";

type SqliteDatabase = BetterSQLite3Database<typeof sqliteSchema>;

/**
 * SQLite implementation of Role Repository
 */
export class SqliteRoleRepository implements IRoleRepository {
  constructor(private db: SqliteDatabase) {}

  async create(data: CreateRoleInput): Promise<Role> {
    const id = generateId();

    this.db.insert(roles).values({
      id,
      name: data.name,
      description: data.description ?? null,
      color: data.color ?? null,
      iconUrl: data.iconUrl ?? null,
      displayOrder: data.displayOrder ?? 0,
      isPublic: data.isPublic ?? false,
      isDefault: data.isDefault ?? false,
      isAdminRole: data.isAdminRole ?? false,
      isModeratorRole: data.isModeratorRole ?? false,
      policies: data.policies ?? {},
    }).run();

    // SQLite doesn't support RETURNING, fetch the inserted record
    const [result] = this.db.select().from(roles).where(eq(roles.id, id)).limit(1).all();

    if (!result) {
      throw new Error("Failed to create role");
    }

    return result as Role;
  }

  async findById(id: string): Promise<Role | null> {
    const [result] = this.db.select().from(roles).where(eq(roles.id, id)).limit(1).all();

    return (result as Role) ?? null;
  }

  async findByName(name: string): Promise<Role | null> {
    const [result] = this.db.select().from(roles).where(eq(roles.name, name)).limit(1).all();

    return (result as Role) ?? null;
  }

  async findAll(limit = 100, offset = 0): Promise<Role[]> {
    const results = this.db
      .select()
      .from(roles)
      .orderBy(asc(roles.displayOrder), desc(roles.createdAt))
      .limit(limit)
      .offset(offset)
      .all();

    return results as Role[];
  }

  async findDefaultRoles(): Promise<Role[]> {
    const results = this.db
      .select()
      .from(roles)
      .where(eq(roles.isDefault, true))
      .orderBy(asc(roles.displayOrder))
      .all();

    return results as Role[];
  }

  async findAdminRoles(): Promise<Role[]> {
    const results = this.db
      .select()
      .from(roles)
      .where(eq(roles.isAdminRole, true))
      .orderBy(asc(roles.displayOrder))
      .all();

    return results as Role[];
  }

  async findModeratorRoles(): Promise<Role[]> {
    const results = this.db
      .select()
      .from(roles)
      .where(eq(roles.isModeratorRole, true))
      .orderBy(asc(roles.displayOrder))
      .all();

    return results as Role[];
  }

  async update(id: string, data: UpdateRoleInput): Promise<Role | null> {
    const updateData: Partial<typeof roles.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.color !== undefined) updateData.color = data.color;
    if (data.iconUrl !== undefined) updateData.iconUrl = data.iconUrl;
    if (data.displayOrder !== undefined) updateData.displayOrder = data.displayOrder;
    if (data.isPublic !== undefined) updateData.isPublic = data.isPublic;
    if (data.isDefault !== undefined) updateData.isDefault = data.isDefault;
    if (data.isAdminRole !== undefined) updateData.isAdminRole = data.isAdminRole;
    if (data.isModeratorRole !== undefined) updateData.isModeratorRole = data.isModeratorRole;
    if (data.policies !== undefined) updateData.policies = data.policies;

    this.db.update(roles).set(updateData).where(eq(roles.id, id)).run();

    // SQLite doesn't support RETURNING, fetch the updated record
    const [result] = this.db.select().from(roles).where(eq(roles.id, id)).limit(1).all();

    return (result as Role) ?? null;
  }

  async delete(id: string): Promise<boolean> {
    // SQLite doesn't support RETURNING, so check existence first
    const existing = await this.findById(id);
    if (!existing) {
      return false;
    }

    this.db.delete(roles).where(eq(roles.id, id)).run();

    return true;
  }

  async count(): Promise<number> {
    const [result] = this.db.select({ count: sql<number>`COUNT(*)` }).from(roles).all();

    return result?.count ?? 0;
  }
}
