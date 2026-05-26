/**
 * Sentry Integration (frontend)
 *
 * Browser-side Sentry initialization. When `VITE_SENTRY_DSN` is not set, all
 * helpers become no-ops so self-hosted operators are not forced to use Sentry.
 *
 * @module lib/sentry
 */

import * as Sentry from "@sentry/react";

let initialized = false;

/**
 * Optional context attached to a captured exception.
 *
 * Kept structurally identical to the backend helper so the same call shape
 * works in both environments.
 */
export interface CaptureContext {
  /** Indexed tags (low cardinality, suitable for filtering in Sentry UI). */
  tags?: Record<string, string>;
  /** Free-form extras (high cardinality OK, not indexed for search). */
  extras?: Record<string, unknown>;
}

/**
 * Initialize Sentry from Vite env. Safe to call multiple times.
 *
 * Reads:
 * - `VITE_SENTRY_DSN`: Project DSN. Required; if missing, initialization is skipped.
 * - `VITE_SENTRY_ENVIRONMENT`: Environment tag (falls back to `MODE`).
 * - `VITE_SENTRY_TRACES_SAMPLE_RATE`: Float in `[0, 1]`. Defaults to `0`.
 * - `VITE_SENTRY_RELEASE`: Release identifier. Optional.
 */
export function initSentry(): void {
  if (initialized) return;
  if (typeof window === "undefined") return;

  const env = import.meta.env;
  const dsn = env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn) return;

  const tracesSampleRate = parseSampleRate(
    env.VITE_SENTRY_TRACES_SAMPLE_RATE as string | undefined,
  );

  Sentry.init({
    dsn,
    environment:
      (env.VITE_SENTRY_ENVIRONMENT as string | undefined) || (env.MODE as string) || "development",
    release: env.VITE_SENTRY_RELEASE as string | undefined,
    tracesSampleRate,
    sendDefaultPii: false,
  });

  initialized = true;
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
 * Parse the `VITE_SENTRY_TRACES_SAMPLE_RATE` env var into a value Sentry accepts.
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

// Initialize on module load so error boundaries firing during the first
// render phase (which runs synchronously before any useEffect) can still
// report. The function short-circuits during SSR (`typeof window`).
initSentry();
