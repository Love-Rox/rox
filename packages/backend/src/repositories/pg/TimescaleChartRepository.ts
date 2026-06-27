import type { ChartBackend } from "shared";
import { PostgresChartRepository } from "./PostgresChartRepository.js";

/**
 * TimescaleDB implementation of the charts repository.
 *
 * Reads and writes are identical to {@link PostgresChartRepository} because
 * both operate on the same `chart_snapshots` table. TimescaleDB's advantage is
 * purely physical: the table is promoted to a hypertable with compression and
 * retention policies (see `db/charts/timescale.ts`), which is transparent to
 * SQL queries.
 *
 * This class exists to:
 * - Expose the `"timescale"` backend label in diagnostics and the API envelope.
 * - Provide an extension point for future TimescaleDB-specific features such as
 *   continuous aggregates, which would override read paths here while leaving
 *   the plain-Postgres implementation untouched.
 */
export class TimescaleChartRepository extends PostgresChartRepository {
  override readonly backend: ChartBackend = "timescale";
}
