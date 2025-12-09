/**
 * SQLite Drive Folder Repository
 *
 * SQLite/D1 implementation of the IDriveFolderRepository interface.
 *
 * @module repositories/sqlite/SqliteDriveFolderRepository
 */

import { eq, and, sql, isNull, desc } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { driveFolders } from "../../db/schema/sqlite.js";
import type * as sqliteSchema from "../../db/schema/sqlite.js";
import type { IDriveFolderRepository } from "../../interfaces/repositories/IDriveFolderRepository.js";
import type { DriveFolder } from "shared";

type SqliteDatabase = BetterSQLite3Database<typeof sqliteSchema>;

/**
 * SQLite implementation of drive folder repository
 */
export class SqliteDriveFolderRepository implements IDriveFolderRepository {
  constructor(private db: SqliteDatabase) {}

  async create(folder: Omit<DriveFolder, "createdAt" | "updatedAt">): Promise<DriveFolder> {
    const now = new Date();
    this.db.insert(driveFolders).values({
      ...folder,
      createdAt: now,
      updatedAt: now,
    }).run();

    // SQLite doesn't support RETURNING, fetch the inserted record
    const [result] = this.db.select().from(driveFolders).where(eq(driveFolders.id, folder.id)).limit(1).all();

    if (!result) {
      throw new Error("Failed to create folder");
    }

    return result as DriveFolder;
  }

  async findById(id: string): Promise<DriveFolder | null> {
    const [result] = this.db
      .select()
      .from(driveFolders)
      .where(eq(driveFolders.id, id))
      .limit(1)
      .all();

    return (result as DriveFolder) ?? null;
  }

  async findByUserId(
    userId: string,
    options?: {
      parentId?: string | null;
      limit?: number;
    },
  ): Promise<DriveFolder[]> {
    const { parentId, limit = 100 } = options ?? {};

    const conditions = [eq(driveFolders.userId, userId)];

    // Filter by parent folder - undefined means no filter, null means root folder
    if (parentId !== undefined) {
      if (parentId === null) {
        conditions.push(isNull(driveFolders.parentId));
      } else {
        conditions.push(eq(driveFolders.parentId, parentId));
      }
    }

    const results = this.db
      .select()
      .from(driveFolders)
      .where(and(...conditions))
      .orderBy(desc(driveFolders.createdAt))
      .limit(limit)
      .all();

    return results as DriveFolder[];
  }

  async update(
    id: string,
    data: Partial<Pick<DriveFolder, "name" | "parentId">>,
  ): Promise<DriveFolder> {
    this.db
      .update(driveFolders)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(driveFolders.id, id))
      .run();

    // Fetch the updated record
    const [result] = this.db.select().from(driveFolders).where(eq(driveFolders.id, id)).limit(1).all();

    if (!result) {
      throw new Error("Folder not found");
    }

    return result as DriveFolder;
  }

  async delete(id: string): Promise<void> {
    this.db.delete(driveFolders).where(eq(driveFolders.id, id)).run();
  }

  async getPath(id: string): Promise<DriveFolder[]> {
    // Recursive CTE to get all parent folders
    const result = this.db.all<{
      id: string;
      userId: string;
      parentId: string | null;
      name: string;
      createdAt: Date;
      updatedAt: Date;
    }>(sql`
      WITH RECURSIVE folder_path AS (
        SELECT id, user_id, parent_id, name, created_at, updated_at, 0 as depth
        FROM drive_folders
        WHERE id = ${id}

        UNION ALL

        SELECT f.id, f.user_id, f.parent_id, f.name, f.created_at, f.updated_at, fp.depth + 1
        FROM drive_folders f
        INNER JOIN folder_path fp ON f.id = fp.parent_id
      )
      SELECT id, user_id as userId, parent_id as parentId, name,
             created_at as createdAt, updated_at as updatedAt
      FROM folder_path
      ORDER BY depth DESC
    `);

    return result as DriveFolder[];
  }

  async countChildren(id: string): Promise<number> {
    const [result] = this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(driveFolders)
      .where(eq(driveFolders.parentId, id))
      .all();

    return result?.count ?? 0;
  }
}
