/**
 * API Utility Functions
 *
 * Common utilities for API parameter building and URL construction.
 *
 * @module lib/api/utils
 */

/**
 * Options for pagination-based API calls
 */
export interface PaginationOptions {
  /** Maximum number of items to return */
  limit?: number;
  /** Return items older than this ID (cursor for older items) */
  untilId?: string;
  /** Return items newer than this ID (cursor for newer items) */
  sinceId?: string;
}

/**
 * Build URLSearchParams from pagination options
 *
 * @param options - Pagination options
 * @returns URLSearchParams object with pagination parameters
 *
 * @example
 * ```ts
 * const params = buildPaginationParams({ limit: 20, untilId: "abc123" });
 * const url = `/api/notes?${params.toString()}`;
 * ```
 */
export function buildPaginationParams(
  options: PaginationOptions
): URLSearchParams {
  const params = new URLSearchParams();
  if (options.limit) params.set("limit", options.limit.toString());
  if (options.untilId) params.set("untilId", options.untilId);
  if (options.sinceId) params.set("sinceId", options.sinceId);
  return params;
}

/**
 * Build URL with query parameters
 *
 * @param path - Base URL path
 * @param params - URLSearchParams to append
 * @returns Full URL with query string
 *
 * @example
 * ```ts
 * const params = buildPaginationParams({ limit: 20 });
 * const url = buildUrlWithParams("/api/notes", params);
 * // Returns: "/api/notes?limit=20"
 * ```
 */
export function buildUrlWithParams(
  path: string,
  params: URLSearchParams
): string {
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}
