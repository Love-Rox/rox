/**
 * Error Handling Middleware
 *
 * Catches application-wide errors and returns appropriate responses.
 *
 * @module middleware/errorHandler
 */
import type { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";
import { routePath } from "hono/route";
import { logger } from "../lib/logger.js";
import { captureException } from "../lib/sentry.js";

/**
 * Global Error Handler
 *
 * Catches all errors and converts them to appropriate HTTP responses.
 * HTTPException is handled by Hono, other errors are returned as 500 errors.
 *
 * @param c - Hono context
 * @param next - Next middleware/handler
 *
 * @remarks
 * - HTTPException: Delegated to Hono's default handler (re-thrown)
 * - Other errors: Returned as 500 Internal Server Error
 * - Production environment: Error message replaced with "Internal server error"
 * - Development environment: Returns original error message and stack trace
 *
 * @example
 * ```typescript
 * app.use('*', errorHandler);
 * ```
 */
export async function errorHandler(c: Context, next: Next) {
  try {
    return await next();
  } catch (error) {
    // HTTPExceptionはそのままスロー
    if (error instanceof HTTPException) {
      throw error;
    }

    // その他のエラーはログに記録して500エラーを返す
    logger.error({ err: error }, "Unhandled error");
    // `route` is the Hono route template (low cardinality) which makes a
    // useful tag. The resolved path can have unbounded cardinality (UUIDs,
    // proxied URLs, ...), so it goes into extras. We deliberately use
    // `c.req.path` (no query string) — `c.req.url` would leak OAuth `code`,
    // session tokens, and other secrets that `beforeSend` strips from
    // `event.request.query_string`.
    //
    // `routePath(c)` reads Hono's match result, which may not be populated
    // when an error fires before routing completes. Fall back gracefully.
    let route = "<unmatched>";
    try {
      route = routePath(c) || route;
    } catch {
      // Match result not available yet — leave the placeholder.
    }
    captureException(error, {
      tags: { method: c.req.method, route },
      extras: { path: c.req.path },
    });

    return c.json(
      {
        error: {
          message:
            process.env.NODE_ENV === "production"
              ? "Internal server error"
              : (error as Error).message,
          stack: process.env.NODE_ENV === "development" ? (error as Error).stack : undefined,
        },
      },
      500,
    );
  }
}
