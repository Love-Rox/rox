/**
 * Media Proxy Routes
 *
 * Proxies and caches remote media files to:
 * - Improve loading performance for users
 * - Reduce load on remote servers
 * - Provide content-type validation for security
 *
 * Security notes:
 * - Outbound requests go through {@link safeFetch}, which blocks private /
 *   loopback / link-local destinations and re-validates every redirect hop
 * - Only raster image, audio and video MIME types are allowed. SVG is
 *   intentionally excluded because it can carry script and would execute on
 *   the application origin
 * - Every proxied response carries a restrictive sandboxed CSP so that even a
 *   mislabeled payload cannot run script on the application origin
 *
 * @module routes/proxy
 */

import { Hono } from "hono";
import type { Context } from "hono";
import { createHash } from "node:crypto";
import { logger } from "../lib/logger.js";
import { safeFetch, UnsafeUrlError } from "../lib/safeFetch.js";
import type { ICacheService } from "../interfaces/ICacheService.js";

const proxy = new Hono();

/**
 * Allowed MIME types for proxying, mapped to the file extension used in the
 * `Content-Disposition` filename.
 *
 * `image/svg+xml` is deliberately NOT allowed (stored XSS on the app origin).
 */
const ALLOWED_MIME_TYPES = new Map<string, string>([
  // Images
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/gif", "gif"],
  ["image/webp", "webp"],
  ["image/avif", "avif"],
  ["image/x-icon", "ico"],
  ["image/vnd.microsoft.icon", "ico"],
  // Audio
  ["audio/mpeg", "mp3"],
  ["audio/ogg", "ogg"],
  ["audio/wav", "wav"],
  ["audio/webm", "webm"],
  // Video
  ["video/mp4", "mp4"],
  ["video/webm", "webm"],
  ["video/ogg", "ogv"],
]);

/**
 * Content Security Policy applied to every proxy response.
 *
 * `sandbox` prevents script execution and gives the document an opaque
 * origin even if it is navigated to directly.
 */
export const PROXY_CSP =
  "default-src 'none'; img-src 'self' data:; media-src 'self'; style-src 'unsafe-inline'; sandbox";

/**
 * Maximum file size for proxying (10MB)
 */
const MAX_PROXY_SIZE = 10 * 1024 * 1024;

/**
 * Upstream request timeout (10 seconds)
 */
const PROXY_TIMEOUT = 10000;

/**
 * Cache duration headers (1 day for success, 1 hour for errors)
 */
const CACHE_SUCCESS = "public, max-age=86400, immutable";
const CACHE_ERROR = "public, max-age=3600";

/**
 * Generate cache key from URL
 */
function getCacheKey(url: string): string {
  return createHash("sha256").update(url).digest("hex");
}

/**
 * Apply security headers shared by every proxy response.
 *
 * @param c - Hono context
 * @param contentType - Content type of the body (if it is media)
 */
function applyProxySecurityHeaders(c: Context, contentType?: string): void {
  c.header("Content-Security-Policy", PROXY_CSP);
  c.header("X-Content-Type-Options", "nosniff");
  if (contentType) {
    const ext = ALLOWED_MIME_TYPES.get(contentType) ?? "bin";
    c.header("Content-Disposition", `inline; filename="media.${ext}"`);
  }
}

/**
 * Result of fetching media for the proxy.
 */
type ProxyMediaResult =
  | { ok: true; buffer: Buffer; contentType: string; cacheHit: boolean }
  | { ok: false; status: 400 | 403 | 413 | 415 | 502 | 504; error: string };

/**
 * Fetch (or load from cache) remote media with validation.
 *
 * @param url - Remote media URL
 * @param cacheService - Optional cache service
 * @returns Media buffer and content type, or an error description safe to return to clients
 */
async function fetchProxiedMedia(
  url: string,
  cacheService: ICacheService | undefined,
): Promise<ProxyMediaResult> {
  // Validate URL format
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return { ok: false, status: 400, error: "Invalid URL format" };
  }

  // Only allow http/https
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    return { ok: false, status: 400, error: "Only HTTP/HTTPS URLs are allowed" };
  }

  const cacheKey = `proxy:${getCacheKey(url)}`;

  // Check cache first
  if (cacheService?.isAvailable()) {
    const cached = await cacheService.get<{
      data: string; // Base64 encoded
      contentType: string;
    }>(cacheKey);

    // Re-validate the cached content type: entries written before the
    // allowlist was tightened (e.g. SVG) must not be served.
    if (cached && ALLOWED_MIME_TYPES.has(cached.contentType)) {
      return {
        ok: true,
        buffer: Buffer.from(cached.data, "base64"),
        contentType: cached.contentType,
        cacheHit: true,
      };
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROXY_TIMEOUT);

  try {
    let response: Response;
    try {
      response = await safeFetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Rox/1.0 (ActivityPub; +https://github.com/Love-Rox/rox)",
          Accept: "image/*,video/*,audio/*",
        },
      });
    } catch (error) {
      if (error instanceof UnsafeUrlError) {
        return { ok: false, status: 403, error: "URL is not allowed" };
      }
      throw error;
    }

    if (!response.ok) {
      await response.body?.cancel().catch(() => {});
      return { ok: false, status: 502, error: "Failed to fetch remote media" };
    }

    // Validate content type
    const rawContentType = response.headers.get("content-type") || "";
    const contentType = (rawContentType.split(";")[0] ?? "").trim().toLowerCase();
    if (!contentType || !ALLOWED_MIME_TYPES.has(contentType)) {
      await response.body?.cancel().catch(() => {});
      return { ok: false, status: 415, error: "Unsupported media type" };
    }

    // Check content length
    const contentLength = response.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_PROXY_SIZE) {
      await response.body?.cancel().catch(() => {});
      return { ok: false, status: 413, error: "File too large" };
    }

    // Read body with size limit
    const chunks: Uint8Array[] = [];
    let totalSize = 0;
    const reader = response.body?.getReader();

    if (!reader) {
      return { ok: false, status: 502, error: "Failed to fetch remote media" };
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      totalSize += value.length;
      if (totalSize > MAX_PROXY_SIZE) {
        await reader.cancel();
        return { ok: false, status: 413, error: "File too large" };
      }

      chunks.push(value);
    }

    const buffer = Buffer.concat(chunks);

    // Cache the result
    if (cacheService?.isAvailable()) {
      await cacheService.set(
        cacheKey,
        {
          data: buffer.toString("base64"),
          contentType,
        },
        { ttl: 86400 }, // 24 hours
      );
    }

    return { ok: true, buffer, contentType, cacheHit: false };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { ok: false, status: 504, error: "Request timeout" };
    }
    logger.error({ err: error, url }, "Proxy fetch error");
    return { ok: false, status: 502, error: "Failed to fetch remote media" };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * GET /proxy
 *
 * Proxy remote media files with caching and validation.
 *
 * @query {string} url - URL of the remote media to proxy (URL-encoded)
 * @returns Proxied media content with appropriate headers
 *
 * @example
 * GET /proxy?url=https%3A%2F%2Fremote.server%2Fimage.jpg
 */
proxy.get("/", async (c: Context) => {
  const url = c.req.query("url");

  applyProxySecurityHeaders(c);

  if (!url) {
    return c.json({ error: "url parameter is required" }, 400);
  }

  const result = await fetchProxiedMedia(url, c.get("cacheService"));

  if (!result.ok) {
    if (result.status !== 400) {
      c.header("Cache-Control", CACHE_ERROR);
    }
    return c.json({ error: result.error }, result.status);
  }

  applyProxySecurityHeaders(c, result.contentType);
  c.header("Content-Type", result.contentType);
  c.header("Cache-Control", CACHE_SUCCESS);
  c.header("X-Cache", result.cacheHit ? "HIT" : "MISS");
  return c.body(new Uint8Array(result.buffer));
});

/**
 * GET /proxy/avatar
 *
 * Specialized endpoint for avatar images with fallback.
 *
 * @query {string} url - URL of the avatar image
 * @returns Avatar image or default fallback
 */
proxy.get("/avatar", async (c: Context) => {
  const url = c.req.query("url");

  applyProxySecurityHeaders(c);

  if (url) {
    const result = await fetchProxiedMedia(url, c.get("cacheService"));
    if (result.ok) {
      applyProxySecurityHeaders(c, result.contentType);
      c.header("Content-Type", result.contentType);
      c.header("Cache-Control", CACHE_SUCCESS);
      return c.body(new Uint8Array(result.buffer));
    }
  }

  // Return default avatar placeholder (static, trusted SVG)
  c.header("Content-Type", "image/svg+xml");
  c.header("Content-Disposition", 'inline; filename="avatar.svg"');
  c.header("Cache-Control", CACHE_SUCCESS);
  return c.body(DEFAULT_AVATAR_SVG);
});

/**
 * Default avatar SVG placeholder
 */
const DEFAULT_AVATAR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="#e0e0e0"/>
  <circle cx="50" cy="35" r="20" fill="#9e9e9e"/>
  <ellipse cx="50" cy="85" rx="35" ry="25" fill="#9e9e9e"/>
</svg>`;

export default proxy;
