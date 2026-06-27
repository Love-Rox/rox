import { and, desc, eq, lt, sql } from "drizzle-orm";
import type { Database } from "../../db/index.js";
import { chartSnapshots } from "../../db/schema/pg.js";
import type {
  ChartSnapshotInput,
  IChartRepository,
} from "../../interfaces/repositories/IChartRepository.js";
import type { ChartBackend, ChartPoint, ChartSpan } from "shared";

/**
 * Plain PostgreSQL implementation of the charts repository.
 *
 * Persists time-series snapshots in the `chart_snapshots` table, keyed by
 * `(metric, span, bucket)`. Works on any PostgreSQL instance without
 * extensions; it is the default fallback when TimescaleDB is unavailable.
 *
 * @example
 * ```typescript
 * const repo = new PostgresChartRepository(db);
 * await repo.recordSnapshot({ metric: "users.total", span: "day", bucket: new Date(), value: 42 });
 * const points = await repo.getSeries("users.total", "day", 30);
 * ```
 */
export class PostgresChartRepository implements IChartRepository {
  readonly backend: ChartBackend = "postgres";

  constructor(private db: Database) {}

  async recordSnapshot(input: ChartSnapshotInput): Promise<void> {
    await this.db
      .insert(chartSnapshots)
      .values({
        metric: input.metric,
        span: input.span,
        bucket: input.bucket,
        value: input.value,
        delta: input.delta ?? null,
      })
      .onConflictDoUpdate({
        target: [chartSnapshots.metric, chartSnapshots.span, chartSnapshots.bucket],
        set: {
          value: input.value,
          delta: input.delta ?? null,
        },
      });
  }

  async recordSnapshots(inputs: ChartSnapshotInput[]): Promise<void> {
    if (inputs.length === 0) {
      return;
    }

    await this.db
      .insert(chartSnapshots)
      .values(
        inputs.map((input) => ({
          metric: input.metric,
          span: input.span,
          bucket: input.bucket,
          value: input.value,
          delta: input.delta ?? null,
        })),
      )
      .onConflictDoUpdate({
        target: [chartSnapshots.metric, chartSnapshots.span, chartSnapshots.bucket],
        // Update with the values from the row that triggered the conflict.
        set: {
          value: sql`excluded."value"`,
          delta: sql`excluded."delta"`,
        },
      });
  }

  async getSeries(
    metric: string,
    span: ChartSpan,
    limit: number,
    until?: Date,
  ): Promise<ChartPoint[]> {
    const condition = until
      ? and(
          eq(chartSnapshots.metric, metric),
          eq(chartSnapshots.span, span),
          lt(chartSnapshots.bucket, until),
        )
      : and(eq(chartSnapshots.metric, metric), eq(chartSnapshots.span, span));

    const rows = await this.db
      .select()
      .from(chartSnapshots)
      .where(condition)
      .orderBy(desc(chartSnapshots.bucket))
      .limit(limit);

    // Fetched most-recent-first for the limit; reverse to oldest-first for output.
    return rows.reverse().map((row) => ({
      t: row.bucket.toISOString(),
      total: Number(row.value),
      delta: row.delta == null ? undefined : Number(row.delta),
    }));
  }
}
