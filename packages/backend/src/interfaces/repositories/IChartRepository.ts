import type { ChartBackend, ChartPoint, ChartSpan } from "shared";

/**
 * Input for recording a single chart snapshot point.
 */
export interface ChartSnapshotInput {
  /** Metric key (see `CHART_METRICS` in shared). */
  metric: string;
  /** Aggregation granularity. */
  span: ChartSpan;
  /** Bucket start timestamp. */
  bucket: Date;
  /** Cumulative value at this bucket. */
  value: number;
  /** Change within this bucket, when applicable. */
  delta?: number;
}

/**
 * Repository for the optional time-series charts subsystem.
 *
 * Implementations persist periodic snapshots of instance metrics and serve
 * them back as ordered series. Two implementations exist:
 *
 * - `PostgresChartRepository`: plain PostgreSQL snapshot table (default
 *   fallback, works on any Postgres).
 * - `TimescaleChartRepository`: same table promoted to a TimescaleDB hypertable
 *   with compression and retention policies.
 *
 * The read/write contract is identical across backends; Timescale only changes
 * the physical storage of the underlying table.
 */
export interface IChartRepository {
  /**
   * Backend implementation label, for diagnostics and the API envelope.
   */
  readonly backend: ChartBackend;

  /**
   * Upsert a single snapshot point.
   *
   * Idempotent on `(metric, span, bucket)`: re-recording the same bucket
   * overwrites the previous value.
   *
   * @param input - Snapshot to record
   */
  recordSnapshot(input: ChartSnapshotInput): Promise<void>;

  /**
   * Upsert many snapshot points in a single batch.
   *
   * @param inputs - Snapshots to record
   */
  recordSnapshots(inputs: ChartSnapshotInput[]): Promise<void>;

  /**
   * Read the most recent points for a metric.
   *
   * @param metric - Metric key
   * @param span - Aggregation granularity
   * @param limit - Maximum number of buckets to return (most recent first internally, returned oldest-first)
   * @param until - When provided, only buckets strictly older than this are returned (pagination)
   * @returns Points ordered oldest-first
   */
  getSeries(metric: string, span: ChartSpan, limit: number, until?: Date): Promise<ChartPoint[]>;
}
