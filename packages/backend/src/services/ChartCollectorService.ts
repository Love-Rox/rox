/**
 * Chart Collector Service
 *
 * Periodically snapshots instance-wide metrics (users, notes, active users,
 * federation, drive) into the chart subsystem. Each run records the same set of
 * values for both the `hour` and `day` aggregation spans; the underlying
 * repository upserts on `(metric, span, bucket)`, so repeated writes to the same
 * bucket are safe and idempotent.
 *
 * @module services/ChartCollectorService
 */

import { CHART_METRICS } from "shared";
import type {
  ChartSnapshotInput,
  IChartRepository,
} from "../interfaces/repositories/IChartRepository.js";
import type { IUserRepository } from "../interfaces/repositories/IUserRepository.js";
import type { INoteRepository } from "../interfaces/repositories/INoteRepository.js";
import type { IRemoteInstanceRepository } from "../interfaces/repositories/IRemoteInstanceRepository.js";
import type { IDriveFileRepository } from "../interfaces/repositories/IDriveFileRepository.js";
import { logger } from "../lib/logger.js";
import { withMonitor } from "../lib/sentry.js";

/**
 * Configuration for the chart collector service.
 */
export interface ChartCollectorConfig {
  /** Collection interval in milliseconds (default: 1 hour). */
  intervalMs?: number;
}

/**
 * Optional dependencies for the chart collector.
 *
 * When a repository is omitted (or its capability is unavailable), the related
 * metrics are skipped on a best-effort basis rather than failing the run.
 */
export interface ChartCollectorDeps {
  /** Repository persisting chart snapshots (required). */
  chartRepository: IChartRepository;
  /** Repository for user counts (required). */
  userRepository: IUserRepository;
  /** Repository for note counts (required). */
  noteRepository: INoteRepository;
  /** Repository for federated instance counts (optional). */
  remoteInstanceRepository?: IRemoteInstanceRepository;
  /** Repository for drive file aggregates (optional). */
  driveFileRepository?: IDriveFileRepository;
}

const DEFAULT_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Collects periodic metric snapshots for the time-series charts subsystem.
 *
 * The service follows the same lifecycle conventions as other periodic services
 * in this codebase: {@link start} runs one collection immediately and then on a
 * fixed interval, {@link stop} clears the timer, and {@link isActive} reports
 * the running state. Each collection pass is wrapped in a Sentry cron check-in
 * via `withMonitor`.
 *
 * @example
 * ```typescript
 * const collector = new ChartCollectorService({
 *   chartRepository,
 *   userRepository,
 *   noteRepository,
 *   remoteInstanceRepository,
 *   driveFileRepository,
 * });
 * collector.start();
 * ```
 */
export class ChartCollectorService {
  private readonly chartRepository: IChartRepository;
  private readonly userRepository: IUserRepository;
  private readonly noteRepository: INoteRepository;
  private readonly remoteInstanceRepository?: IRemoteInstanceRepository;
  private readonly driveFileRepository?: IDriveFileRepository;
  private readonly intervalMs: number;

  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  /**
   * Constructor.
   *
   * @param deps - Required and optional repository dependencies
   * @param config - Optional service configuration
   */
  constructor(deps: ChartCollectorDeps, config?: ChartCollectorConfig) {
    this.chartRepository = deps.chartRepository;
    this.userRepository = deps.userRepository;
    this.noteRepository = deps.noteRepository;
    this.remoteInstanceRepository = deps.remoteInstanceRepository;
    this.driveFileRepository = deps.driveFileRepository;
    this.intervalMs = config?.intervalMs ?? DEFAULT_INTERVAL_MS;
  }

  /**
   * Start the collector.
   *
   * Runs one collection immediately, then schedules periodic collection based
   * on the configured interval.
   */
  public start(): void {
    if (this.isRunning) {
      logger.warn("ChartCollectorService is already running");
      return;
    }

    this.isRunning = true;
    logger.debug(
      { intervalMs: this.intervalMs, backend: this.chartRepository.backend },
      "Starting ChartCollectorService",
    );

    // 起動直後に1回収集
    this.runMonitored().catch((error) => {
      logger.error({ err: error }, "Initial chart collection failed");
    });

    this.intervalId = setInterval(() => {
      this.runMonitored().catch((error) => {
        logger.error({ err: error }, "Scheduled chart collection failed");
      });
    }, this.intervalMs);
  }

  /**
   * Stop the collector and clear the interval timer.
   */
  public stop(): void {
    if (!this.isRunning) {
      logger.warn("ChartCollectorService is not running");
      return;
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
    logger.info("Stopped ChartCollectorService");
  }

  /**
   * Check whether the service is currently running.
   *
   * @returns True if the collector is active
   */
  public isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Run one collection pass wrapped in a Sentry cron check-in (no-op when
   * Sentry is disabled).
   *
   * @private
   */
  private runMonitored(): Promise<void> {
    const intervalMinutes = Math.max(1, Math.round(this.intervalMs / 60_000));
    return withMonitor("rox-chart-collector", () => this.collect(), {
      type: "interval",
      value: intervalMinutes,
      unit: "minute",
    });
  }

  /**
   * Perform a single collection pass.
   *
   * Computes the current snapshot value for each metric and records it for both
   * the `hour` and `day` spans. Individual metric failures are tolerated so that
   * one unavailable data source does not abort the whole pass.
   *
   * @public
   */
  public async collect(): Promise<void> {
    try {
      const now = new Date();
      const hourBucket = floorToHour(now);
      const dayBucket = floorToUtcDay(now);

      const inputs: ChartSnapshotInput[] = [];

      // 各メトリクスを (value, hourDelta?, dayDelta?) で push するヘルパ
      const push = (metric: string, value: number, hourDelta?: number, dayDelta?: number): void => {
        inputs.push({ metric, span: "hour", bucket: hourBucket, value, delta: hourDelta });
        inputs.push({ metric, span: "day", bucket: dayBucket, value, delta: dayDelta });
      };

      // --- Users ---
      const [usersTotal, usersLocal, usersRemote] = await Promise.all([
        this.userRepository.count(false),
        this.userRepository.count(true),
        this.userRepository.countRemote(),
      ]);
      push(CHART_METRICS.usersTotal, usersTotal);
      push(CHART_METRICS.usersLocal, usersLocal);
      push(CHART_METRICS.usersRemote, usersRemote);

      // --- Notes ---
      const [notesTotal, notesLocal] = await Promise.all([
        this.noteRepository.count(false),
        this.noteRepository.count(true),
      ]);
      const notesRemote = Math.max(0, notesTotal - notesLocal);

      // delta はベストエフォート: countInPeriod があれば期間増分を求める
      const noteDeltas = await this.computeNoteDeltas(hourBucket, dayBucket, now);
      push(CHART_METRICS.notesTotal, notesTotal, noteDeltas.hour.total, noteDeltas.day.total);
      push(CHART_METRICS.notesLocal, notesLocal, noteDeltas.hour.local, noteDeltas.day.local);
      push(CHART_METRICS.notesRemote, notesRemote, noteDeltas.hour.remote, noteDeltas.day.remote);

      // --- Active users ---
      const [activeMonth, activeHalfyear] = await Promise.all([
        this.userRepository.countActiveLocal(30),
        this.userRepository.countActiveLocal(180),
      ]);
      push(CHART_METRICS.activeUsersMonth, activeMonth);
      push(CHART_METRICS.activeUsersHalfyear, activeHalfyear);

      // --- Federation (optional) ---
      if (this.remoteInstanceRepository) {
        try {
          const instances = await this.remoteInstanceRepository.count();
          push(CHART_METRICS.federationInstances, instances);
        } catch (error) {
          logger.warn({ err: error }, "Failed to collect federation metrics");
        }
      }

      // --- Drive (optional, best-effort) ---
      if (this.driveFileRepository) {
        try {
          const drive = await this.computeDriveTotals();
          push(CHART_METRICS.driveTotalFiles, drive.totalFiles);
          push(CHART_METRICS.driveTotalBytes, drive.totalBytes);
        } catch (error) {
          logger.warn({ err: error }, "Failed to collect drive metrics");
        }
      }

      await this.chartRepository.recordSnapshots(inputs);
      logger.debug(
        {
          count: inputs.length,
          hourBucket: hourBucket.toISOString(),
          dayBucket: dayBucket.toISOString(),
        },
        "Chart collection completed",
      );
    } catch (error) {
      // サービスは落とさず、ログのみ
      logger.error({ err: error }, "Chart collection failed");
    }
  }

  /**
   * Compute best-effort note deltas for the current hour and day buckets.
   *
   * Returns zeros when `countInPeriod` is unavailable on the note repository.
   *
   * @private
   */
  private async computeNoteDeltas(
    hourBucket: Date,
    dayBucket: Date,
    now: Date,
  ): Promise<{
    hour: { total?: number; local?: number; remote?: number };
    day: { total?: number; local?: number; remote?: number };
  }> {
    const countInPeriod = this.noteRepository.countInPeriod?.bind(this.noteRepository);
    if (!countInPeriod) {
      return { hour: {}, day: {} };
    }

    try {
      const [hourTotal, hourLocal, dayTotal, dayLocal] = await Promise.all([
        countInPeriod(hourBucket, now, false),
        countInPeriod(hourBucket, now, true),
        countInPeriod(dayBucket, now, false),
        countInPeriod(dayBucket, now, true),
      ]);
      return {
        hour: {
          total: hourTotal,
          local: hourLocal,
          remote: Math.max(0, hourTotal - hourLocal),
        },
        day: {
          total: dayTotal,
          local: dayLocal,
          remote: Math.max(0, dayTotal - dayLocal),
        },
      };
    } catch (error) {
      logger.warn({ err: error }, "Failed to compute note deltas");
      return { hour: {}, day: {} };
    }
  }

  /**
   * Compute total drive file count and byte size.
   *
   * Mirrors the aggregation strategy used by the admin storage-stats endpoint:
   * list files and sum their sizes. This is best-effort and may be expensive on
   * very large instances.
   *
   * @private
   */
  private async computeDriveTotals(): Promise<{ totalFiles: number; totalBytes: number }> {
    const repo = this.driveFileRepository;
    if (!repo) {
      return { totalFiles: 0, totalBytes: 0 };
    }
    const files = await repo.findAll({ limit: 100000 });
    let totalBytes = 0;
    for (const file of files) {
      totalBytes += file.size;
    }
    return { totalFiles: files.length, totalBytes };
  }
}

/**
 * Floor a date to the start of its hour (local-equivalent, minutes onward zeroed).
 *
 * @param date - Source date
 * @returns New date at the top of the hour
 */
function floorToHour(date: Date): Date {
  const d = new Date(date);
  d.setMinutes(0, 0, 0);
  return d;
}

/**
 * Floor a date to the start of its UTC day.
 *
 * @param date - Source date
 * @returns New date at 00:00:00.000 UTC
 */
function floorToUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0),
  );
}
