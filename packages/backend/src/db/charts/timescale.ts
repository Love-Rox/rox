/**
 * TimescaleDB detection and policy management for the charts subsystem.
 *
 * Provides idempotent helpers to detect the TimescaleDB extension and to
 * promote the `chart_snapshots` table to a hypertable with compression and
 * retention policies. All operations are guarded so they can be run repeatedly
 * without error.
 *
 * @module db/charts/timescale
 */

import { sql } from "drizzle-orm";
import type { Database } from "../index.js";
import { logger } from "../../lib/logger.js";

/**
 * Check whether the TimescaleDB extension is installed in the database.
 *
 * @param db - Database connection
 * @returns `true` if the `timescaledb` extension is present, otherwise `false`
 */
export async function isTimescaleAvailable(db: Database): Promise<boolean> {
  try {
    const result = await db.execute(sql`SELECT 1 FROM pg_extension WHERE extname = 'timescaledb'`);
    return result.rows.length > 0;
  } catch (error) {
    logger.warn({ err: error }, "Failed to check TimescaleDB availability");
    return false;
  }
}

/**
 * Apply TimescaleDB hypertable, compression, and retention policies to the
 * `chart_snapshots` table.
 *
 * Idempotent: every statement uses `IF NOT EXISTS` / `if_not_exists => TRUE`
 * so re-running is safe. This function assumes TimescaleDB is present (callers
 * should gate on {@link isTimescaleAvailable}), but a failing `CREATE EXTENSION`
 * (e.g. insufficient privileges) is treated as non-fatal: a warning is logged
 * and the function returns early.
 *
 * @param db - Database connection
 */
export async function applyTimescalePolicies(db: Database): Promise<void> {
  logger.info("Applying TimescaleDB chart policies");

  // Ensure the extension exists. Failure here (commonly privilege related) is
  // non-fatal: warn and bail out without throwing.
  try {
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE`);
  } catch (error) {
    logger.warn({ err: error }, "Failed to create TimescaleDB extension; skipping chart policies");
    return;
  }

  // Promote chart_snapshots to a hypertable partitioned on `bucket`.
  await db.execute(
    sql`SELECT create_hypertable('chart_snapshots', 'bucket', if_not_exists => TRUE, migrate_data => TRUE)`,
  );

  // Enable compression, segmenting by metric/span for efficient queries.
  await db.execute(
    sql`ALTER TABLE chart_snapshots SET (timescaledb.compress, timescaledb.compress_segmentby = 'metric, span')`,
  );

  // Compress chunks older than 30 days.
  await db.execute(
    sql`SELECT add_compression_policy('chart_snapshots', INTERVAL '30 days', if_not_exists => TRUE)`,
  );

  // Drop chunks older than 400 days.
  await db.execute(
    sql`SELECT add_retention_policy('chart_snapshots', INTERVAL '400 days', if_not_exists => TRUE)`,
  );
}
