/**
 * Federation URL Utilities
 *
 * Helpers for validating ActivityPub identifiers received from remote servers
 * (actor URIs, keyIds, object ids). Used to bind HTTP Signatures to actors and
 * to enforce origin checks on inbound objects.
 *
 * @module utils/federationUrl
 */

/**
 * Get the hostname of this instance (derived from `process.env.URL`).
 *
 * @returns Local hostname (e.g. "rox.example.com")
 */
export function getLocalHostname(): string {
  try {
    return new URL(process.env.URL || "http://localhost:3000").hostname;
  } catch {
    return "localhost";
  }
}

/**
 * Parse a value as an absolute http(s) URL.
 *
 * @param value - Value to parse
 * @returns Parsed URL, or null if the value is not a string or not an http(s) URL
 */
export function parseHttpUrl(value: unknown): URL | null {
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

/**
 * Check whether a value is an absolute http(s) URL.
 *
 * @param value - Value to check
 * @returns True if the value is an http(s) URL
 */
export function isHttpUrl(value: unknown): value is string {
  return parseHttpUrl(value) !== null;
}

/**
 * Check whether a URL points at this instance.
 *
 * @param value - URL to check
 * @returns True if the URL's hostname equals the local hostname
 */
export function isLocalUrl(value: unknown): boolean {
  const url = parseHttpUrl(value);
  return url !== null && url.hostname === getLocalHostname();
}

/**
 * Check whether two URLs share the same origin (scheme, host and port).
 *
 * @param a - First URL
 * @param b - Second URL
 * @returns True if both are http(s) URLs with the same origin
 */
export function isSameOrigin(a: unknown, b: unknown): boolean {
  const urlA = parseHttpUrl(a);
  const urlB = parseHttpUrl(b);
  return urlA !== null && urlB !== null && urlA.origin === urlB.origin;
}

/**
 * Normalize a URL string (WHATWG serialization).
 *
 * @param value - URL to normalize
 * @returns Normalized href, or null if the value is not an http(s) URL
 */
export function normalizeUrl(value: unknown): string | null {
  return parseHttpUrl(value)?.href ?? null;
}

/**
 * Check whether a raw URL string would be rewritten by URL path normalization.
 *
 * Detects dot segments (`.`, `..`, including percent-encoded forms),
 * backslashes (treated as `/` by WHATWG parsers) and whitespace/control
 * characters (silently stripped by WHATWG parsers). Such identifiers can make
 * a string look like it belongs to one actor while resolving to another.
 *
 * @param value - Raw URL string
 * @returns True if the string contains ambiguous path components
 */
export function hasAmbiguousPath(value: string): boolean {
  // oxlint-disable-next-line no-control-regex
  if (/[\\\s\u0000-\u001f\u007f]/.test(value)) {
    return true;
  }
  return /\/(?:\.|%2e){1,2}(?=\/|\?|#|$)/i.test(value);
}

/**
 * Extract the URI of an `attributedTo`/`actor`-style reference.
 *
 * @param ref - String URI or object with an `id`
 * @returns URI string, or null if it cannot be determined
 */
export function extractRefUri(ref: unknown): string | null {
  if (typeof ref === "string") {
    return ref;
  }
  if (ref && typeof ref === "object" && !Array.isArray(ref)) {
    const id = (ref as { id?: unknown }).id;
    if (typeof id === "string") {
      return id;
    }
  }
  return null;
}
