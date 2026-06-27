/**
 * Chart / time-series statistics types.
 *
 * These types describe the contract for the optional charts subsystem, which
 * records periodic snapshots of instance metrics (user counts, note counts,
 * active users, federation, drive usage) into a time-series store and exposes
 * them through Misskey-compatible chart endpoints.
 *
 * The data model is intentionally backend-agnostic: a single long-format
 * snapshot table `(metric, span, bucket, value, delta)` is shared by both the
 * plain PostgreSQL implementation and the TimescaleDB implementation. Timescale
 * only adds storage policies (hypertable / compression / retention) on top of
 * the same table, so this contract is identical regardless of backend.
 *
 * @module types/chart
 */

/**
 * Aggregation granularity for a chart series.
 *
 * - `hour`: one bucket per hour
 * - `day`: one bucket per day (UTC day boundaries)
 */
export type ChartSpan = "hour" | "day";

/**
 * Selected charts backend implementation.
 *
 * - `postgres`: plain PostgreSQL snapshot table (works on any Postgres)
 * - `timescale`: TimescaleDB hypertable with compression/retention policies
 */
export type ChartBackend = "postgres" | "timescale";

/**
 * A single point in a chart series.
 */
export interface ChartPoint {
  /** ISO-8601 timestamp of the bucket start. */
  t: string;
  /** Cumulative value at this bucket (e.g. total users). */
  total: number;
  /** Change within this bucket, when the metric tracks deltas (e.g. new notes). */
  delta?: number;
}

/**
 * A chart series for a single metric.
 */
export interface ChartSeries {
  /** Metric key (see {@link CHART_METRICS}). */
  metric: string;
  /** Aggregation granularity. */
  span: ChartSpan;
  /** Points ordered oldest-first. */
  points: ChartPoint[];
}

/**
 * Response envelope for a chart endpoint that returns multiple metrics.
 *
 * When the charts subsystem is disabled, `enabled` is `false` and `series` is
 * empty, allowing clients to gracefully hide chart UI.
 */
export interface ChartResponse {
  /** Whether the charts subsystem is enabled on this instance. */
  enabled: boolean;
  /** Backend serving the data, when enabled. */
  backend?: ChartBackend;
  /** Aggregation granularity of the returned series. */
  span: ChartSpan;
  /** One entry per requested metric. */
  series: ChartSeries[];
}

/**
 * Known chart metric keys.
 *
 * Metric keys are dot-namespaced strings. Each chart endpoint maps to a fixed
 * set of these keys. Storing them as strings (rather than enum columns) keeps
 * the snapshot table flexible and future metrics additive.
 */
export const CHART_METRICS = {
  /** Total users (local + remote). */
  usersTotal: "users.total",
  /** Local users. */
  usersLocal: "users.local",
  /** Remote (federated) users. */
  usersRemote: "users.remote",
  /** Total notes (local + remote). */
  notesTotal: "notes.total",
  /** Local notes. */
  notesLocal: "notes.local",
  /** Remote notes. */
  notesRemote: "notes.remote",
  /** Users active within the last 30 days. */
  activeUsersMonth: "activeUsers.month",
  /** Users active within the last 180 days. */
  activeUsersHalfyear: "activeUsers.halfyear",
  /** Number of known federated instances. */
  federationInstances: "federation.instances",
  /** Total drive files. */
  driveTotalFiles: "drive.totalFiles",
  /** Total drive bytes used. */
  driveTotalBytes: "drive.totalBytes",
} as const;

/**
 * Union of known chart metric keys.
 */
export type ChartMetric = (typeof CHART_METRICS)[keyof typeof CHART_METRICS];

/**
 * Metric groupings exposed by each Misskey-compatible chart endpoint.
 */
export const CHART_ENDPOINT_METRICS = {
  users: [CHART_METRICS.usersTotal, CHART_METRICS.usersLocal, CHART_METRICS.usersRemote],
  notes: [CHART_METRICS.notesTotal, CHART_METRICS.notesLocal, CHART_METRICS.notesRemote],
  "active-users": [CHART_METRICS.activeUsersMonth, CHART_METRICS.activeUsersHalfyear],
  federation: [CHART_METRICS.federationInstances],
  drive: [CHART_METRICS.driveTotalFiles, CHART_METRICS.driveTotalBytes],
} as const satisfies Record<string, readonly ChartMetric[]>;

/**
 * Names of the available chart endpoints.
 */
export type ChartEndpoint = keyof typeof CHART_ENDPOINT_METRICS;
