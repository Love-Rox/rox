/**
 * Database Utility Functions
 *
 * Provides database-agnostic utility functions that abstract away
 * differences between PostgreSQL, MySQL, and SQLite.
 *
 * @module db/utils
 */

import { sql } from "drizzle-orm";
import type { DbType } from "./index.js";

/**
 * Get count SQL expression for the current database type
 *
 * @param dbType - Current database type
 * @returns SQL expression for counting rows
 */
export function getCountSql(dbType: DbType) {
  switch (dbType) {
    case "postgres":
      return sql<number>`count(*)::int`;
    case "mysql":
      return sql<number>`CAST(count(*) AS SIGNED)`;
    case "sqlite":
    case "d1":
      return sql<number>`count(*)`;
    default:
      return sql<number>`count(*)`;
  }
}

/**
 * Get case-insensitive like operator for the current database type
 *
 * PostgreSQL uses ILIKE, MySQL and SQLite use LIKE with LOWER()
 *
 * @param dbType - Current database type
 * @param column - Column to search
 * @param pattern - Search pattern
 * @returns SQL expression for case-insensitive like
 */
export function getCaseInsensitiveLike(
  dbType: DbType,
  column: ReturnType<typeof sql>,
  pattern: string,
) {
  switch (dbType) {
    case "postgres":
      return sql`${column} ILIKE ${pattern}`;
    case "mysql":
    case "sqlite":
    case "d1":
      return sql`LOWER(${column}) LIKE LOWER(${pattern})`;
    default:
      return sql`LOWER(${column}) LIKE LOWER(${pattern})`;
  }
}

/**
 * Get SQL for extracting a result from db.execute
 *
 * Different databases return results in different formats
 *
 * @param result - Raw result from db.execute
 * @returns Normalized result array
 */
export function normalizeExecuteResult<T>(
  result: { rows?: T[] } | T[],
): T[] {
  if (Array.isArray(result)) {
    return result;
  }
  return result.rows ?? [];
}
