/**
 * MySQL DriveFile Repository
 *
 * MySQL implementation of the IDriveFileRepository interface.
 *
 * @module repositories/mysql/MysqlDriveFileRepository
 */

import { eq, and, inArray, desc, gt, lt, sql, isNull } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { driveFiles } from "../../db/schema/mysql.js";
import type * as mysqlSchema from "../../db/schema/mysql.js";
import type { IDriveFileRepository } from "../../interfaces/repositories/IDriveFileRepository.js";
import type { DriveFile } from "shared";

type MysqlDatabase = MySql2Database<typeof mysqlSchema>;

export class MysqlDriveFileRepository implements IDriveFileRepository {
  constructor(private db: MysqlDatabase) {}

  async create(file: Omit<DriveFile, "createdAt" | "updatedAt">): Promise<DriveFile> {
    const now = new Date();
    await this.db.insert(driveFiles).values({
      ...file,
      createdAt: now,
      updatedAt: now,
    });

    // MySQL doesn't support RETURNING, fetch the inserted record
    const [result] = await this.db.select().from(driveFiles).where(eq(driveFiles.id, file.id)).limit(1);

    if (!result) {
      throw new Error("Failed to create file");
    }

    return result as DriveFile;
  }

  async findById(id: string): Promise<DriveFile | null> {
    const [result] = await this.db.select().from(driveFiles).where(eq(driveFiles.id, id)).limit(1);

    return (result as DriveFile) ?? null;
  }

  async findAll(options?: { limit?: number; offset?: number }): Promise<DriveFile[]> {
    const { limit = 1000, offset = 0 } = options ?? {};

    const results = await this.db
      .select()
      .from(driveFiles)
      .orderBy(desc(driveFiles.createdAt))
      .limit(limit)
      .offset(offset);

    return results as DriveFile[];
  }

  async findByMd5(md5: string, userId: string): Promise<DriveFile | null> {
    const [result] = await this.db
      .select()
      .from(driveFiles)
      .where(and(eq(driveFiles.md5, md5), eq(driveFiles.userId, userId)))
      .limit(1);

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
    const { limit = 20, sinceId, untilId, folderId } = options ?? {};

    const conditions = [eq(driveFiles.userId, userId)];

    if (sinceId) {
      conditions.push(gt(driveFiles.id, sinceId));
    }

    if (untilId) {
      conditions.push(lt(driveFiles.id, untilId));
    }

    // Filter by folder - undefined means no filter, null means root folder (no parent)
    if (folderId !== undefined) {
      if (folderId === null) {
        conditions.push(isNull(driveFiles.folderId));
      } else {
        conditions.push(eq(driveFiles.folderId, folderId));
      }
    }

    const results = await this.db
      .select()
      .from(driveFiles)
      .where(and(...conditions))
      .orderBy(desc(driveFiles.createdAt))
      .limit(limit);

    return results as DriveFile[];
  }

  async moveToFolder(id: string, folderId: string | null): Promise<DriveFile> {
    await this.db
      .update(driveFiles)
      .set({
        folderId,
        updatedAt: new Date(),
      })
      .where(eq(driveFiles.id, id));

    // MySQL doesn't support RETURNING, fetch the updated record
    const [result] = await this.db.select().from(driveFiles).where(eq(driveFiles.id, id)).limit(1);

    if (!result) {
      throw new Error("File not found");
    }

    return result as DriveFile;
  }

  async findByIds(ids: string[]): Promise<DriveFile[]> {
    if (ids.length === 0) {
      return [];
    }

    const results = await this.db.select().from(driveFiles).where(inArray(driveFiles.id, ids));

    return results as DriveFile[];
  }

  async update(
    id: string,
    data: Partial<Omit<DriveFile, "id" | "userId" | "createdAt">>,
  ): Promise<DriveFile> {
    await this.db
      .update(driveFiles)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(driveFiles.id, id));

    // MySQL doesn't support RETURNING, fetch the updated record
    const [result] = await this.db.select().from(driveFiles).where(eq(driveFiles.id, id)).limit(1);

    if (!result) {
      throw new Error("File not found");
    }

    return result as DriveFile;
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(driveFiles).where(eq(driveFiles.id, id));
  }

  async getTotalSize(userId: string): Promise<number> {
    const [result] = await this.db
      .select({ total: sql<number>`CAST(COALESCE(SUM(${driveFiles.size}), 0) AS SIGNED)` })
      .from(driveFiles)
      .where(
        and(
          eq(driveFiles.userId, userId),
          eq(driveFiles.source, "user"), // Only count user uploads, not system files
        ),
      );

    return Number(result?.total ?? 0);
  }
}
