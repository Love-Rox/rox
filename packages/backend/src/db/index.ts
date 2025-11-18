import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js';
import { drizzle as drizzleMysql } from 'drizzle-orm/mysql2';
import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import postgres from 'postgres';
import mysql from 'mysql2/promise';
import Database from 'better-sqlite3';
import * as pgSchema from './schema/pg.js';

const dbType = process.env.DB_TYPE || 'postgres';
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is required');
}

export function createDatabase() {
  switch (dbType) {
    case 'postgres': {
      const client = postgres(databaseUrl);
      return drizzlePg(client, { schema: pgSchema });
    }
    case 'mysql': {
      const pool = mysql.createPool(databaseUrl);
      return drizzleMysql(pool);
    }
    case 'sqlite': {
      const sqlite = new Database(databaseUrl.replace('sqlite://', ''));
      return drizzleSqlite(sqlite);
    }
    default:
      throw new Error(`Unsupported database type: ${dbType}`);
  }
}

export type Database = ReturnType<typeof createDatabase>;

// Singleton instance
let dbInstance: Database | null = null;

export function getDatabase(): Database {
  if (!dbInstance) {
    dbInstance = createDatabase();
  }
  return dbInstance;
}
