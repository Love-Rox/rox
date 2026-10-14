/**
 * SSRF-safe outbound HTTP helpers
 *
 * Provides utilities to make outbound HTTP requests to attacker-controllable
 * URLs (remote ActivityPub objects, inboxes, media, WebPush endpoints, ...)
 * without exposing internal network services.
 *
 * - {@link isPrivateAddress} classifies IPv4/IPv6 literals
 * - {@link assertPublicUrl} validates the scheme and resolves the hostname,
 *   rejecting it if ANY resolved address is non-public
 * - {@link safeFetch} wraps `fetch` with manual redirect handling and
 *   re-validates every redirect hop
 *
 * Set `ALLOW_PRIVATE_NETWORK_FETCH=true` to disable the private address
 * checks (local development / federation testing on localhost only).
 *
 * Note: DNS is resolved once for validation and again by `fetch` itself, so a
 * DNS rebinding attacker with a very short TTL could still race the check.
 * This module significantly narrows the attack surface but is not a
 * substitute for network-level egress filtering.
 *
 * @module lib/safeFetch
 */

import { isIP } from "node:net";
import { lookup as dnsLookup } from "node:dns/promises";

/**
 * Error thrown when a URL is rejected by SSRF protection.
 */
export class UnsafeUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsafeUrlError";
  }
}

/**
 * DNS lookup function signature (subset of `dns.promises.lookup` with `all: true`).
 */
export type LookupFn = (hostname: string) => Promise<Array<{ address: string; family: number }>>;

/**
 * Options for {@link assertPublicUrl}.
 */
export interface AssertPublicUrlOptions {
  /** Custom DNS resolver (primarily for tests) */
  lookup?: LookupFn;
  /**
   * Allow private network destinations. Defaults to the
   * `ALLOW_PRIVATE_NETWORK_FETCH` environment variable.
   */
  allowPrivateNetwork?: boolean;
}

/**
 * Options for {@link safeFetch}.
 */
export interface SafeFetchOptions extends AssertPublicUrlOptions {
  /** Maximum number of redirects to follow (default: 5). Use 0 to disable. */
  maxRedirects?: number;
  /** Custom fetch implementation (primarily for tests). Defaults to global `fetch`. */
  fetchImpl?: typeof fetch;
}

/** Default maximum number of redirect hops followed by {@link safeFetch}. */
export const DEFAULT_MAX_REDIRECTS = 5;

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

/**
 * Check whether private network fetches are allowed via environment.
 *
 * @returns True when `ALLOW_PRIVATE_NETWORK_FETCH=true`
 */
export function isPrivateNetworkFetchAllowed(): boolean {
  return process.env.ALLOW_PRIVATE_NETWORK_FETCH === "true";
}

/**
 * Parse a dotted-quad IPv4 address into four octets.
 */
function parseIPv4(ip: string): [number, number, number, number] | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  const octets = parts.map((p) => (/^\d{1,3}$/.test(p) ? Number(p) : NaN));
  if (octets.some((o) => Number.isNaN(o) || o > 255)) return null;
  return octets as [number, number, number, number];
}

/**
 * Check whether an IPv4 address is non-public.
 */
function isPrivateIPv4(octets: [number, number, number, number]): boolean {
  const [a, b, c] = octets;
  return (
    a === 0 || // 0.0.0.0/8 "this network" / unspecified
    a === 10 || // 10.0.0.0/8 private
    (a === 100 && b >= 64 && b <= 127) || // 100.64.0.0/10 CGNAT
    a === 127 || // 127.0.0.0/8 loopback
    (a === 169 && b === 254) || // 169.254.0.0/16 link-local (cloud metadata)
    (a === 172 && b >= 16 && b <= 31) || // 172.16.0.0/12 private
    (a === 192 && b === 0 && c === 0) || // 192.0.0.0/24 IETF protocol assignments
    (a === 192 && b === 0 && c === 2) || // 192.0.2.0/24 TEST-NET-1
    (a === 192 && b === 88 && c === 99) || // 192.88.99.0/24 6to4 relay anycast
    (a === 192 && b === 168) || // 192.168.0.0/16 private
    (a === 198 && (b === 18 || b === 19)) || // 198.18.0.0/15 benchmarking
    (a === 198 && b === 51 && c === 100) || // 198.51.100.0/24 TEST-NET-2
    (a === 203 && b === 0 && c === 113) || // 203.0.113.0/24 TEST-NET-3
    a >= 224 // 224.0.0.0/4 multicast, 240.0.0.0/4 reserved, broadcast
  );
}

/**
 * Parse an IPv6 address into eight 16-bit groups.
 * Supports `::` compression and embedded IPv4 suffixes.
 */
function parseIPv6(ip: string): number[] | null {
  let addr = ip;
  // Embedded IPv4 (e.g. ::ffff:127.0.0.1)
  const lastColon = addr.lastIndexOf(":");
  const tail = addr.slice(lastColon + 1);
  if (tail.includes(".")) {
    const v4 = parseIPv4(tail);
    if (!v4) return null;
    const hi = ((v4[0] << 8) | v4[1]).toString(16);
    const lo = ((v4[2] << 8) | v4[3]).toString(16);
    addr = `${addr.slice(0, lastColon + 1)}${hi}:${lo}`;
  }

  const doubleColon = addr.indexOf("::");
  let groups: string[];
  if (doubleColon !== -1) {
    if (addr.indexOf("::", doubleColon + 1) !== -1) return null;
    const head = addr.slice(0, doubleColon);
    const rest = addr.slice(doubleColon + 2);
    const headParts = head ? head.split(":") : [];
    const restParts = rest ? rest.split(":") : [];
    const missing = 8 - headParts.length - restParts.length;
    if (missing < 1) return null;
    groups = [...headParts, ...Array<string>(missing).fill("0"), ...restParts];
  } else {
    groups = addr.split(":");
  }

  if (groups.length !== 8) return null;
  const values = groups.map((g) => (/^[0-9a-f]{1,4}$/i.test(g) ? parseInt(g, 16) : NaN));
  if (values.some((v) => Number.isNaN(v))) return null;
  return values;
}

/**
 * Extract an embedded IPv4 address from the last 32 bits of an IPv6 address.
 */
function embeddedIPv4(groups: number[], hiIndex = 6): [number, number, number, number] {
  const hi = groups[hiIndex] ?? 0;
  const lo = groups[hiIndex + 1] ?? 0;
  return [hi >> 8, hi & 0xff, lo >> 8, lo & 0xff];
}

/**
 * Check whether an IPv6 address is non-public.
 */
function isPrivateIPv6(g: number[]): boolean {
  const [g0 = 0, g1 = 0, g2 = 0, g3 = 0, g4 = 0, g5 = 0] = g;

  // ::/96 — unspecified (::), loopback (::1), deprecated IPv4-compatible
  if (g0 === 0 && g1 === 0 && g2 === 0 && g3 === 0 && g4 === 0 && g5 === 0) return true;
  // ::ffff:0:0/96 — IPv4-mapped
  if (g0 === 0 && g1 === 0 && g2 === 0 && g3 === 0 && g4 === 0 && g5 === 0xffff) {
    return isPrivateIPv4(embeddedIPv4(g));
  }
  // ::ffff:0:0:0/96 — IPv4-translated (SIIT)
  if (g0 === 0 && g1 === 0 && g2 === 0 && g3 === 0 && g4 === 0xffff && g5 === 0) return true;
  // 64:ff9b::/96 — NAT64 well-known prefix
  if (g0 === 0x64 && g1 === 0xff9b && g2 === 0 && g3 === 0 && g4 === 0 && g5 === 0) {
    return isPrivateIPv4(embeddedIPv4(g));
  }
  // 64:ff9b:1::/48 — local-use NAT64
  if (g0 === 0x64 && g1 === 0xff9b && g2 === 1) return true;
  // 100::/64 — discard-only
  if (g0 === 0x100 && g1 === 0 && g2 === 0 && g3 === 0) return true;
  // 2001::/32 — Teredo (may tunnel to arbitrary IPv4)
  if (g0 === 0x2001 && g1 === 0) return true;
  // 2001:db8::/32 — documentation
  if (g0 === 0x2001 && g1 === 0xdb8) return true;
  // 2002::/16 — 6to4, check embedded IPv4
  if (g0 === 0x2002) return isPrivateIPv4(embeddedIPv4(g, 1));
  // fc00::/7 — unique local addresses
  if ((g0 & 0xfe00) === 0xfc00) return true;
  // fe80::/10 — link-local, fec0::/10 — deprecated site-local
  if ((g0 & 0xffc0) === 0xfe80 || (g0 & 0xffc0) === 0xfec0) return true;
  // ff00::/8 — multicast
  if ((g0 & 0xff00) === 0xff00) return true;

  return false;
}

/**
 * Check whether an IP address literal is non-public.
 *
 * Returns true for loopback, private (RFC 1918 / ULA), link-local,
 * unspecified, CGNAT, multicast, reserved, documentation ranges and
 * IPv4-mapped / NAT64 / 6to4 IPv6 addresses wrapping such IPv4 addresses.
 * Surrounding brackets and IPv6 zone identifiers are ignored.
 *
 * Unparseable input is treated as private (fail closed).
 *
 * @param ip - IPv4 or IPv6 address literal
 * @returns True if the address must not be contacted
 *
 * @example
 * ```typescript
 * isPrivateAddress("127.0.0.1"); // true
 * isPrivateAddress("[::ffff:10.0.0.1]"); // true
 * isPrivateAddress("8.8.8.8"); // false
 * ```
 */
export function isPrivateAddress(ip: string): boolean {
  let addr = ip.trim();
  if (addr.startsWith("[") && addr.endsWith("]")) addr = addr.slice(1, -1);
  const zoneIndex = addr.indexOf("%");
  if (zoneIndex !== -1) addr = addr.slice(0, zoneIndex);

  const version = isIP(addr);
  if (version === 4) {
    const v4 = parseIPv4(addr);
    return v4 ? isPrivateIPv4(v4) : true;
  }
  if (version === 6) {
    const v6 = parseIPv6(addr.toLowerCase());
    return v6 ? isPrivateIPv6(v6) : true;
  }
  return true;
}

/**
 * Default DNS resolver using `dns.promises.lookup` with all addresses.
 */
const defaultLookup: LookupFn = (hostname) => dnsLookup(hostname, { all: true, verbatim: true });

/**
 * Validate that a URL is safe to fetch from the server.
 *
 * - Only `http:` and `https:` are allowed
 * - IP literal hosts are checked directly (brackets stripped)
 * - `localhost` / `*.localhost` are rejected without resolving
 * - Hostnames are resolved and rejected if ANY resolved address is private
 *
 * Private address checks are skipped when `ALLOW_PRIVATE_NETWORK_FETCH=true`
 * (or `options.allowPrivateNetwork` is true); the scheme check always applies.
 *
 * @param input - URL to validate
 * @param options - Validation options
 * @returns The parsed URL
 * @throws {UnsafeUrlError} If the URL is invalid or targets a non-public address
 *
 * @example
 * ```typescript
 * await assertPublicUrl("https://mastodon.social/users/alice"); // ok
 * await assertPublicUrl("http://169.254.169.254/latest/meta-data"); // throws
 * ```
 */
export async function assertPublicUrl(
  input: string | URL,
  options: AssertPublicUrlOptions = {},
): Promise<URL> {
  let url: URL;
  try {
    url = new URL(input.toString());
  } catch {
    throw new UnsafeUrlError("Invalid URL");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new UnsafeUrlError("Only HTTP/HTTPS URLs are allowed");
  }

  const allowPrivate = options.allowPrivateNetwork ?? isPrivateNetworkFetchAllowed();
  if (allowPrivate) return url;

  let hostname = url.hostname.toLowerCase();
  if (hostname.startsWith("[") && hostname.endsWith("]")) hostname = hostname.slice(1, -1);
  if (hostname.endsWith(".")) hostname = hostname.slice(0, -1);

  if (!hostname) {
    throw new UnsafeUrlError("Missing hostname");
  }

  if (isIP(hostname) !== 0) {
    if (isPrivateAddress(hostname)) {
      throw new UnsafeUrlError("Private addresses are not allowed");
    }
    return url;
  }

  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    throw new UnsafeUrlError("Private addresses are not allowed");
  }

  let addresses: Array<{ address: string; family: number }>;
  try {
    addresses = await (options.lookup ?? defaultLookup)(hostname);
  } catch {
    throw new UnsafeUrlError("Failed to resolve hostname");
  }

  if (addresses.length === 0) {
    throw new UnsafeUrlError("Failed to resolve hostname");
  }
  if (addresses.some((a) => isPrivateAddress(a.address))) {
    throw new UnsafeUrlError("Private addresses are not allowed");
  }

  return url;
}

/**
 * SSRF-safe `fetch` wrapper.
 *
 * Validates the initial URL with {@link assertPublicUrl}, performs the request
 * with `redirect: "manual"` and re-validates every redirect target before
 * following it (up to `maxRedirects` hops). On redirect, the `Host` header is
 * dropped and credentials (`Authorization`, `Cookie`) are removed when the
 * origin changes. 303 responses (and 301/302 for POST) switch to GET without
 * a body, matching browser semantics.
 *
 * @param input - URL to fetch
 * @param init - Fetch init (the `redirect` option is ignored)
 * @param options - Redirect and validation options
 * @returns The final (non-redirect) response, or the last 3xx response if it has no Location
 * @throws {UnsafeUrlError} If any hop targets a non-public address or the redirect limit is exceeded
 *
 * @example
 * ```typescript
 * const res = await safeFetch("https://remote.example/image.png", {
 *   headers: { Accept: "image/*" },
 * });
 * ```
 */
export async function safeFetch(
  input: string | URL,
  init: RequestInit = {},
  options: SafeFetchOptions = {},
): Promise<Response> {
  const maxRedirects = options.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
  const fetchImpl = options.fetchImpl ?? fetch;

  let current = await assertPublicUrl(input, options);
  let method = (init.method ?? "GET").toUpperCase();
  let body = init.body;
  const headers = new Headers(init.headers);

  for (let hop = 0; ; hop++) {
    const response = await fetchImpl(current.toString(), {
      ...init,
      method,
      body,
      headers,
      redirect: "manual",
    });

    if (!REDIRECT_STATUSES.has(response.status)) {
      return response;
    }

    const location = response.headers.get("location");
    if (!location) {
      return response;
    }

    // Discard the redirect body
    try {
      await response.body?.cancel();
    } catch {
      // ignore
    }

    if (hop >= maxRedirects) {
      throw new UnsafeUrlError("Too many redirects");
    }

    let next: URL;
    try {
      next = new URL(location, current);
    } catch {
      throw new UnsafeUrlError("Invalid redirect location");
    }

    if (
      response.status === 303 ||
      ((response.status === 301 || response.status === 302) && method === "POST")
    ) {
      method = "GET";
      body = undefined;
      headers.delete("content-type");
      headers.delete("content-length");
      headers.delete("digest");
    }

    headers.delete("host");
    if (next.origin !== current.origin) {
      headers.delete("authorization");
      headers.delete("cookie");
    }

    current = await assertPublicUrl(next, options);
  }
}
