/**
 * SQLite Drive File Repository
 *
 * SQLite/D1 implementation of the IDriveFileRepository interface.
 *
 * @module repositories/sqlite/SqliteDriveFileRepository
 */

import { eq, and, sql, desc, lt, gt, inArray, isNull } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { driveFiles } from "../../db/schema/sqlite.js";
import type * as sqliteSchema from "../../db/schema/sqlite.js";
import type { IDriveFileRepository } from "../../interfaces/repositories/IDriveFileRepository.js";
import type { DriveFile } from "shared";

type SqliteDatabase = BetterSQLite3Database<typeof sqliteSchema>;

/**
 * SQLite implementation of drive file repository
 */
export class SqliteDriveFileRepository implements IDriveFileRepository {
  constructor(private db: SqliteDatabase) {}

  async create(file: Omit<DriveFile, "createdAt" | "updatedAt">): Promise<DriveFile> {
    const now = new Date();
    this.db.insert(driveFiles).values({
      ...file,
      createdAt: now,
      updatedAt: now,
    }).run();

    // SQLite doesn't support RETURNING, fetch the inserted record
    const [result] = this.db.select().from(driveFiles).where(eq(driveFiles.id, file.id)).limit(1).all();

    if (!result) {
      throw new Error("Failed to create drive file");
    }

    return result as DriveFile;
  }

  async findById(id: string): Promise<DriveFile | null> {
    const [result] = this.db.select().from(driveFiles).where(eq(driveFiles.id, id)).limit(1).all();

    return (result as DriveFile) ?? null;
  }

  async findAll(options?: { limit?: number; offset?: number }): Promise<DriveFile[]> {
    const { limit = 100, offset = 0 } = options ?? {};

    const results = this.db
      .select()
      .from(driveFiles)
      .orderBy(desc(driveFiles.createdAt))
      .limit(limit)
      .offset(offset)
      .all();

    return results as DriveFile[];
  }

  async findByMd5(md5: string, userId: string): Promise<DriveFile | null> {
    const [result] = this.db
      .select()
      .from(driveFiles)
      .where(and(eq(driveFiles.md5, md5), eq(driveFiles.userId, userId)))
      .limit(1)
      .all();

    return (result as DriveFile) ?? null;
  }

  async findByUserId(
    userId: string,
    options?: {
      limit?: number;
      sinceId?: string;
      untilId?: string;
      folderId?: string | null;
    },
  ): Promise<DriveFile[]> {
    const { limit = 100, sinceId, untilId, folderId } = options ?? {};

    const conditions = [eq(driveFiles.userId, userId)];

    if (sinceId) {
      const sinceFile = await this.findById(sinceId);
      if (sinceFile) {
        conditions.push(gt(driveFiles.createdAt, sinceFile.createdAt));
      }
    }

    if (untilId) {
      const untilFile = await this.findById(untilId);
      if (untilFile) {
        conditions.push(lt(driveFiles.createdAt, untilFile.createdAt));
      }
    }

    if (folderId !== undefined) {
      if (folderId === null) {
        conditions.push(isNull(driveFiles.folderId));
      } else {
        conditions.push(eq(driveFiles.folderId, folderId));
      }
    }

    const results = this.db
      .select()
      .from(driveFiles)
      .where(and(...conditions))
      .orderBy(desc(driveFiles.createdAt))
      .limit(limit)
      .all();

    return results as DriveFile[];
  }

  async moveToFolder(id: string, folderId: string | null): Promise<DriveFile> {
    this.db
      .update(driveFiles)
      .set({
        folderId,
        updatedAt: new Date(),
      })
      .where(eq(driveFiles.id, id))
      .run();

    // Fetch the updated record
    const [result] = this.db.select().from(driveFiles).where(eq(driveFiles.id, id)).limit(1).all();

    if (!result) {
      throw new Error("Drive file not found");
    }

    return result as DriveFile;
  }

  async findByIds(ids: string[]): Promise<DriveFile[]> {
    if (ids.length === 0) return [];

    const results = this.db.select().from(driveFiles).where(inArray(driveFiles.id, ids)).all();

    return results as DriveFile[];
  }

  async update(id: string, data: Partial<Omit<DriveFile, "id" | "userId" | "createdAt">>): Promise<DriveFile> {
    this.db
      .update(driveFiles)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(driveFiles.id, id))
      .run();

    // Fetch the updated record
    const [result] = this.db.select().from(driveFiles).where(eq(driveFiles.id, id)).limit(1).all();

    if (!result) {
      throw new Error("Drive file not found");
    }

    return result as DriveFile;
  }

  async delete(id: string): Promise<void> {
    this.db.delete(driveFiles).where(eq(driveFiles.id, id)).run();
  }

  async getTotalSize(userId: string): Promise<number> {
    const [result] = this.db
      .select({ total: sql<number>`COALESCE(SUM(${driveFiles.size}), 0)` })
      .from(driveFiles)
      .where(eq(driveFiles.userId, userId))
      .all();

    return result?.total ?? 0;
  }
}
