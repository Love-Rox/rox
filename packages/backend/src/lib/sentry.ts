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
    // Strip request bodies and cookies by default to minimize PII exposure.
    // ActivityPub payloads frequently contain user-generated content.
    sendDefaultPii: false,
    beforeSend(event) {
      if (event.request) {
        delete event.request.cookies;
        delete event.request.data;
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
 * @param context - Optional context (tags, extras) merged into the event
 */
export function captureException(
  error: unknown,
  context?: { tags?: Record<string, string>; extras?: Record<string, unknown> },
): void {
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
 * Flush queued Sentry events. Call during graceful shutdown to avoid losing
 * events still in the network buffer.
 *
 * @param timeoutMs - Maximum time to wait in milliseconds
 * @returns `true` if the queue drained within the timeout
 */
export async function flushSentry(timeoutMs = 2000): Promise<boolean> {
  if (!initialized) return true;
  try {
    return await Sentry.flush(timeoutMs);
  } catch {
    return false;
  }
}

function parseSampleRate(raw: string | undefined): number {
  if (!raw) return 0;
  const parsed = Number.parseFloat(raw);
  if (!Number.isFinite(parsed)) return 0;
  if (parsed < 0) return 0;
  if (parsed > 1) return 1;
  return parsed;
}
