/**
 * Sentry Integration
 *
 * Initializes Sentry error tracking for the backend. When `SENTRY_DSN` is not
 * set, all helpers become no-ops so self-hosted operators are not forced to
 * use Sentry.
 *
 * @module lib/sentry
 */

import * as Sentry from "@sentry/bun";
import { logger } from "./logger.js";

let initialized = false;

/**
 * Optional context attached to a captured exception.
 */
export interface CaptureContext {
  /** Indexed tags (low cardinality, suitable for filtering in Sentry UI). */
  tags?: Record<string, string>;
  /** Free-form extras (high cardinality OK, not indexed for search). */
  extras?: Record<string, unknown>;
}

/**
 * Initialize Sentry from environment variables.
 *
 * Reads:
 * - `SENTRY_DSN`: Project DSN. Required; if missing, initialization is skipped.
 * - `SENTRY_ENVIRONMENT`: Environment tag (falls back to `NODE_ENV`).
 * - `SENTRY_TRACES_SAMPLE_RATE`: Float in `[0, 1]`. Defaults to `0` (no tracing).
 * - `SENTRY_RELEASE`: Release identifier. Optional.
 *
 * Safe to call multiple times; subsequent calls are ignored.
 */
export function initSentry(): void {
  if (initialized) return;

  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    return;
  }

  const tracesSampleRate = parseSampleRate(process.env.SENTRY_TRACES_SAMPLE_RATE);

  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || "development",
    release: process.env.SENTRY_RELEASE,
    tracesSampleRate,
    // Suppress the default server_name. Passing an empty string is NOT
    // enough — Sentry treats it as falsy and falls back to
    // `SENTRY_NAME` env / `os.hostname()`. `includeServerName: false` is
    // the documented opt-out.
    includeServerName: false,
    // Strip request bodies, cookies, headers, and query strings by default to
    // minimize PII exposure. ActivityPub payloads and Authorization /
    // Cookie / Signature headers can all contain secrets.
    sendDefaultPii: false,
    beforeSend(event) {
      if (event.request) {
        delete event.request.cookies;
        delete event.request.data;
        delete event.request.headers;
        delete event.request.query_string;
      }
      return event;
    },
  });

  initialized = true;
  logger.info(
    {
      environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || "development",
      tracesSampleRate,
    },
    "Sentry initialized",
  );
}

/**
 * Capture an exception in Sentry. No-op when Sentry is not initialized.
 *
 * @param error - The error to capture
 * @param context - Optional tags (indexed) and extras (free-form) for the event
 */
export function captureException(error: unknown, context?: CaptureContext): void {
  if (!initialized) return;

  Sentry.withScope((scope) => {
    if (context?.tags) {
      for (const [key, value] of Object.entries(context.tags)) {
        scope.setTag(key, value);
      }
    }
    if (context?.extras) {
      for (const [key, value] of Object.entries(context.extras)) {
        scope.setExtra(key, value);
      }
    }
    Sentry.captureException(error);
  });
}

/**
 * Whether Sentry has been initialized with a valid DSN.
 */
export function isSentryEnabled(): boolean {
  return initialized;
}

/**
 * Schedule descriptor for a recurring background task. Maps to Sentry's
 * MonitorConfig.schedule field.
 *
 * - `crontab`: cron expression, e.g. `"0 * * * *"` (every hour).
 * - `interval`: numeric interval, e.g. `{ type: "interval", value: 30, unit: "minute" }`.
 */
export type MonitorSchedule =
  | { type: "crontab"; value: string }
  | { type: "interval"; value: number; unit: "minute" | "hour" | "day" | "week" | "month" | "year" };

/**
 * Run a callback under a Sentry cron check-in. The callback runs unconditionally;
 * when Sentry is not initialized, this is a transparent pass-through.
 *
 * The check-in pattern: a single `in_progress` event is emitted before the
 * callback, then `ok` or `error` based on whether the callback resolves or
 * rejects. If a check-in is not received within the configured schedule
 * window, Sentry alerts.
 *
 * @param monitorSlug - Sentry monitor slug (configure server-side or via `schedule` for auto-upsert)
 * @param callback - The async task to run
 * @param schedule - Optional schedule for monitor auto-upsert
 * @returns Whatever the callback returns
 */
export async function withMonitor<T>(
  monitorSlug: string,
  callback: () => Promise<T>,
  schedule?: MonitorSchedule,
): Promise<T> {
  if (!initialized) {
    return callback();
  }
  const monitorConfig = schedule ? { schedule } : undefined;
  return Sentry.withMonitor(monitorSlug, callback, monitorConfig);
}

/**
 * Flush queued Sentry events. Call during graceful shutdown to avoid losing
 * events still in the network buffer.
 *
 * Logs a warning when the queue does not drain within the timeout so that
 * operators have visibility into dropped events.
 *
 * @param timeoutMs - Maximum time to wait in milliseconds
 * @returns `true` if the queue drained within the timeout
 */
export async function flushSentry(timeoutMs = 2000): Promise<boolean> {
  if (!initialized) return true;
  try {
    const drained = await Sentry.flush(timeoutMs);
    if (!drained) {
      logger.warn({ timeoutMs }, "Sentry flush did not drain within timeout");
    }
    return drained;
  } catch (err) {
    logger.warn({ err }, "Sentry flush threw");
    return false;
  }
}

/**
 * Parse the `SENTRY_TRACES_SAMPLE_RATE` env var into a value Sentry accepts.
 *
 * Returns `0` for unset / non-numeric input, and clamps to `[0, 1]`.
 *
 * @param raw - Raw env var value
 * @returns Sample rate in `[0, 1]`
 */
function parseSampleRate(raw: string | undefined): number {
  if (!raw) return 0;
  const parsed = Number.parseFloat(raw);
  if (!Number.isFinite(parsed)) return 0;
  if (parsed < 0) return 0;
  if (parsed > 1) return 1;
  return parsed;
}
