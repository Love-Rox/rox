import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

const dbType = process.env.DB_TYPE || 'postgres';
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

async function runMigrations() {
  console.log(`🔄 Running migrations for ${dbType}...`);
  console.log(`📍 Database: ${databaseUrl.split('@')[1] || 'localhost'}`);

  try {
    if (dbType === 'postgres') {
      const connection = postgres(databaseUrl, { max: 1 });
      const db = drizzle(connection);

      await migrate(db, {
        migrationsFolder: `./drizzle/${dbType}`,
      });

      await connection.end();
      console.log('✅ Migrations completed successfully');
    } else {
      console.error(`❌ Migration for ${dbType} is not yet implemented`);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();
