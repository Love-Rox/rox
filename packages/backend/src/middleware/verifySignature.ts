/**
 * HTTP Signature Verification Middleware
 *
 * Verifies ActivityPub HTTP Signatures on incoming requests.
 * Fetches and caches remote actor public keys using Redis (with in-memory fallback).
 * Supports Authorized Fetch servers by signing outgoing key fetch requests.
 *
 * @module middleware/verifySignature
 */

import type { Context, Next } from "hono";
import {
  parseSignatureHeader,
  reconstructSignatureString,
  verifySignature,
  verifyDigest,
  verifyDateHeader,
} from "../utils/httpSignature.js";
import type { ICacheService } from "../interfaces/ICacheService.js";
import type { IUserRepository } from "../interfaces/repositories/IUserRepository.js";
import { CacheTTL, CachePrefix } from "../adapters/cache/DragonflyCacheAdapter.js";
import { RemoteFetchService, type SignatureConfig } from "../services/ap/RemoteFetchService.js";
import { logger } from "../lib/logger.js";
import {
  hasAmbiguousPath,
  isLocalUrl,
  normalizeUrl,
  parseHttpUrl,
} from "../utils/federationUrl.js";

/**
 * In-memory cache fallback for public keys when Redis is unavailable
 */
const publicKeyMemoryCache = new Map<string, { key: VerifiedPublicKey; expires: number }>();

/**
 * In-memory cache for fetch failures to prevent repeated requests to failing servers
 * Caches actor URLs that have failed with their error type and expiry time
 */
interface FetchFailureEntry {
  errorType: "timeout" | "server_error" | "permanent_error";
  message: string;
  expires: number;
}

const fetchFailureCache = new Map<string, FetchFailureEntry>();

/**
 * Failure cache TTLs by error type (in milliseconds)
 * - Timeout: Short cache (30s) - may be transient network issue
 * - Server error: Medium cache (2min) - server may recover
 * - Permanent error: Long cache (10min) - 404/410 unlikely to change quickly
 */
const FAILURE_CACHE_TTL = {
  timeout: 30 * 1000,
  server_error: 2 * 60 * 1000,
  permanent_error: 10 * 60 * 1000,
} as const;

/**
 * Check if a fetch failure is cached for this actor URL
 */
function getCachedFailure(actorUrl: string): FetchFailureEntry | null {
  const cached = fetchFailureCache.get(actorUrl);
  if (cached && cached.expires > Date.now()) {
    return cached;
  }
  // Clean up expired entry
  if (cached) {
    fetchFailureCache.delete(actorUrl);
  }
  return null;
}

/**
 * Cache a fetch failure for an actor URL
 */
function cacheFailure(
  actorUrl: string,
  errorType: FetchFailureEntry["errorType"],
  message: string,
): void {
  const ttl = FAILURE_CACHE_TTL[errorType];
  fetchFailureCache.set(actorUrl, {
    errorType,
    message,
    expires: Date.now() + ttl,
  });
}

/**
 * Categorize fetch error into timeout, server_error, or permanent_error
 */
function categorizeError(error?: {
  type?: string;
  statusCode?: number;
  message?: string;
}): FetchFailureEntry["errorType"] {
  if (!error) return "server_error";

  // Timeout errors
  if (error.type === "timeout") {
    return "timeout";
  }

  // Permanent errors (4xx except rate limiting)
  if (error.statusCode) {
    // 404 Not Found, 410 Gone - actor doesn't exist or was deleted
    if (error.statusCode === 404 || error.statusCode === 410) {
      return "permanent_error";
    }
    // Other 4xx errors (except 429 rate limit) are considered permanent
    if (error.statusCode >= 400 && error.statusCode < 500 && error.statusCode !== 429) {
      return "permanent_error";
    }
  }

  // Everything else (5xx, network errors, rate limits) is transient
  return "server_error";
}

/**
 * Get signature configuration for authenticated fetches
 *
 * Uses a local admin user's credentials for signing requests to
 * Authorized Fetch servers.
 *
 * @param userRepository - User repository for finding admin user
 * @param baseUrl - Base URL of this instance
 * @returns Signature configuration or null if not available
 */
async function getSignatureConfig(
  userRepository: IUserRepository,
  baseUrl: string,
): Promise<SignatureConfig | null> {
  try {
    const adminUser = await userRepository.findFirstLocalAdmin();

    if (!adminUser || !adminUser.privateKey) {
      logger.debug("No admin user with private key found for signed fetch");
      return null;
    }

    const keyId = `${baseUrl}/users/${adminUser.username}#main-key`;

    return {
      keyId,
      privateKey: adminUser.privateKey,
    };
  } catch (error) {
    logger.error({ err: error }, "Failed to get signature config for public key fetch");
    return null;
  }
}

/**
 * Public key bound to its verified owner (actor URI)
 */
export interface VerifiedPublicKey {
  /** PEM-encoded public key */
  publicKeyPem: string;
  /** Actor URI that owns this key (verified against the fetched document) */
  owner: string;
}

/**
 * Validate a signature keyId before fetching it.
 *
 * Rejects keyIds that are not http(s) URLs, contain ambiguous path components
 * (dot segments, backslashes, whitespace) that URL normalization would rewrite,
 * or point at this instance (local users never deliver to our inbox over HTTP).
 *
 * @param keyId - KeyId from the Signature header
 * @returns URL to fetch the key document from (keyId without fragment)
 * @throws Error if the keyId is not acceptable
 */
export function validateKeyId(keyId: string): string {
  if (!parseHttpUrl(keyId)) {
    throw new Error("Invalid keyId: not an http(s) URL");
  }
  if (hasAmbiguousPath(keyId)) {
    throw new Error("Invalid keyId: ambiguous path");
  }
  if (isLocalUrl(keyId)) {
    throw new Error("Invalid keyId: points to local host");
  }
  const fetchUrl = keyId.split("#")[0];
  if (!fetchUrl || normalizeUrl(fetchUrl) === null) {
    throw new Error("Invalid keyId format");
  }
  return fetchUrl;
}

/**
 * A fetched key/actor document together with the URL it was served from.
 */
export interface FetchedKeyDocument {
  /** Parsed JSON document */
  data: unknown;
  /** URL of the final response (after redirects) */
  finalUrl: string;
}

/**
 * Fetcher used by {@link resolveVerifiedPublicKey} to retrieve documents.
 * Must throw on network/HTTP failure.
 */
export type KeyDocumentFetcher = (url: string) => Promise<FetchedKeyDocument>;

/**
 * Key entry found in a document, with the owner it claims.
 */
interface KeyClaim {
  publicKeyPem: string;
  owner: string;
}

/**
 * Find the key whose `id` equals `keyId` inside an actor document's `publicKey`
 * (object or array).
 */
function findActorKey(
  doc: { publicKey?: unknown },
  normalizedKeyId: string,
): { publicKeyPem?: unknown; owner?: unknown } | null {
  const candidates: unknown[] = Array.isArray(doc.publicKey) ? doc.publicKey : [doc.publicKey];
  const key = candidates.find(
    (k) =>
      !!k &&
      typeof k === "object" &&
      typeof (k as { id?: unknown }).id === "string" &&
      normalizeUrl((k as { id: string }).id) === normalizedKeyId,
  );
  return (key as { publicKeyPem?: unknown; owner?: unknown } | undefined) ?? null;
}

/**
 * Extract the key claim for `keyId` from a fetched document (actor document
 * with `publicKey`, or standalone Key document). Does not establish trust.
 */
function extractKeyClaim(keyId: string, doc: unknown): KeyClaim {
  if (!doc || typeof doc !== "object") {
    throw new Error("Key document is not an object");
  }
  const document = doc as {
    id?: unknown;
    owner?: unknown;
    publicKey?: unknown;
    publicKeyPem?: unknown;
  };
  const normalizedKeyId = normalizeUrl(keyId);
  if (!normalizedKeyId) {
    throw new Error("Invalid keyId");
  }
  const docId = typeof document.id === "string" ? document.id : null;

  let claim: { publicKeyPem?: unknown; owner?: unknown } | null = null;
  if (document.publicKey) {
    claim = findActorKey(document, normalizedKeyId);
    if (!claim) {
      throw new Error("publicKey.id does not match keyId");
    }
    claim = { publicKeyPem: claim.publicKeyPem, owner: claim.owner ?? docId };
  } else if (typeof document.publicKeyPem === "string") {
    if (!docId || normalizeUrl(docId) !== normalizedKeyId) {
      throw new Error("Key document id does not match keyId");
    }
    claim = { publicKeyPem: document.publicKeyPem, owner: document.owner };
  }

  if (!claim || typeof claim.publicKeyPem !== "string" || !claim.publicKeyPem) {
    throw new Error("Public key not found in key document");
  }
  if (typeof claim.owner !== "string" || !parseHttpUrl(claim.owner)) {
    throw new Error("Key owner is missing or not an http(s) URL");
  }
  if (isLocalUrl(claim.owner)) {
    throw new Error("Key owner points to local host");
  }
  return { publicKeyPem: claim.publicKeyPem, owner: claim.owner };
}

/**
 * Resolve the public key for `keyId` and verify which actor owns it.
 *
 * Trust is established Mastodon-style:
 * 1. The key document (keyId without fragment) is fetched and the entry with
 *    `id === keyId` is located; its owner is `publicKey.owner` (or the document id).
 * 2. If the document is the owner's actor document served from exactly the
 *    requested URL (document id === owner === fetched URL, no redirect), it is
 *    accepted directly.
 * 3. Otherwise (GoToSocial `/main-key` stubs, standalone `/publickey` Key
 *    documents, redirected responses, …) the owner's actor document is fetched
 *    from the owner URL itself. It must be served without redirect, have
 *    `id === owner`, and list a key with `id === keyId` and the identical PEM.
 *
 * Same-origin content (open redirects, user-uploaded JSON, proxies) therefore
 * cannot bind a key to an actor unless the actor document itself lists it.
 *
 * @param keyId - KeyId from the Signature header
 * @param fetchUrl - URL the key document is fetched from (keyId without fragment)
 * @param fetchDocument - Fetcher for documents (throws on failure)
 * @returns Verified PEM and owner actor URI
 * @throws Error if ownership cannot be verified
 */
export async function resolveVerifiedPublicKey(
  keyId: string,
  fetchUrl: string,
  fetchDocument: KeyDocumentFetcher,
): Promise<VerifiedPublicKey> {
  const first = await fetchDocument(fetchUrl);
  const claim = extractKeyClaim(keyId, first.data);

  const normalizedFetchUrl = normalizeUrl(fetchUrl);
  const firstDocId = (first.data as { id?: unknown }).id;
  const servedFromRequestedUrl = normalizeUrl(first.finalUrl) === normalizedFetchUrl;

  if (
    servedFromRequestedUrl &&
    typeof firstDocId === "string" &&
    normalizeUrl(firstDocId) === normalizedFetchUrl &&
    claim.owner === firstDocId &&
    (first.data as { publicKey?: unknown }).publicKey
  ) {
    return claim;
  }

  // Fetch the owner's actor document and require it to list the same key
  const ownerDoc = await fetchDocument(claim.owner);
  if (normalizeUrl(ownerDoc.finalUrl) !== normalizeUrl(claim.owner)) {
    throw new Error("Owner actor document was served from a different URL");
  }
  const actor = ownerDoc.data as { id?: unknown; publicKey?: unknown } | null;
  if (!actor || typeof actor !== "object" || actor.id !== claim.owner || !actor.publicKey) {
    throw new Error("Owner actor document id does not match key owner");
  }
  const normalizedKeyId = normalizeUrl(keyId)!;
  const ownerKey = findActorKey(actor, normalizedKeyId);
  if (!ownerKey || ownerKey.publicKeyPem !== claim.publicKeyPem) {
    throw new Error("Owner actor document does not list this key");
  }
  if (ownerKey.owner !== undefined && ownerKey.owner !== claim.owner) {
    throw new Error("Owner actor document key has a different owner");
  }
  return claim;
}

/**
 * Check whether a cached value has the current {@link VerifiedPublicKey} shape.
 * Legacy cache entries (plain PEM strings) are treated as a miss.
 */
function isVerifiedPublicKey(value: unknown): value is VerifiedPublicKey {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as VerifiedPublicKey).publicKeyPem === "string" &&
    typeof (value as VerifiedPublicKey).owner === "string"
  );
}

/**
 * Fetch a key/actor document for signature verification.
 *
 * Tries an unsigned fetch first, then retries with an HTTP Signature for
 * Authorized Fetch servers (401/403). Failures are cached per URL.
 *
 * @throws Error if the document cannot be fetched
 */
async function fetchKeyDocument(
  url: string,
  userRepository?: IUserRepository,
  baseUrl?: string,
): Promise<FetchedKeyDocument> {
  // Check if we have a cached failure for this URL
  const cachedFailure = getCachedFailure(url);
  if (cachedFailure) {
    logger.debug(
      {
        actorUrl: url,
        errorType: cachedFailure.errorType,
        ttlRemaining: cachedFailure.expires - Date.now(),
      },
      "Skipping fetch due to cached failure",
    );
    throw new Error(`Cached failure (${cachedFailure.errorType}): ${cachedFailure.message}`);
  }

  const fetchService = new RemoteFetchService();

  // First, try unsigned fetch (works for most servers)
  let result = await fetchService.fetchActivityPubObject<unknown>(url, { maxRetries: 1 });

  // If unsigned fetch failed with 401/403, retry with signed request
  // This is required for Authorized Fetch servers (e.g., some Mastodon instances)
  if (
    !result.success &&
    result.error?.statusCode &&
    (result.error.statusCode === 401 || result.error.statusCode === 403) &&
    userRepository &&
    baseUrl
  ) {
    logger.debug(
      { actorUrl: url, statusCode: result.error.statusCode },
      "Unsigned fetch failed, retrying with HTTP Signature for Authorized Fetch server",
    );

    const signatureConfig = await getSignatureConfig(userRepository, baseUrl);

    if (signatureConfig) {
      result = await fetchService.fetchActivityPubObject<unknown>(url, {
        signature: signatureConfig,
        maxRetries: 2,
      });
    }
  }

  if (!result.success) {
    // Categorize and cache the failure
    const errorType = categorizeError(result.error);
    const errorMessage = result.error?.message || "Unknown error";

    cacheFailure(url, errorType, errorMessage);

    // Use appropriate log level based on error type
    if (errorType === "permanent_error") {
      logger.warn(
        { err: result.error, actorUrl: url, errorType },
        "Failed to fetch public key (permanent error)",
      );
    } else {
      logger.debug(
        { err: result.error, actorUrl: url, errorType },
        "Failed to fetch public key (transient error)",
      );
    }

    throw new Error(`Failed to fetch actor: ${errorMessage}`);
  }

  return { data: result.data, finalUrl: result.finalUrl ?? url };
}

/**
 * Fetch remote actor's public key
 *
 * Retrieves the public key for `keyId` and verifies which actor owns it
 * (see {@link resolveVerifiedPublicKey}).
 * Results are cached in Redis (1 hour) with in-memory fallback.
 *
 * @param keyId - Public key identifier URL
 * @param cacheService - Optional cache service for Redis caching
 * @param userRepository - Optional user repository for signed fetch retry
 * @param baseUrl - Optional base URL of this instance for signed fetch
 * @returns PEM-formatted public key and its verified owner
 * @throws Error if key cannot be fetched or verified
 */
async function fetchPublicKey(
  keyId: string,
  cacheService?: ICacheService,
  userRepository?: IUserRepository,
  baseUrl?: string,
): Promise<VerifiedPublicKey> {
  // keyId format: https://example.com/users/alice#main-key
  // Fetch URL: https://example.com/users/alice
  const actorUrl = validateKeyId(keyId);

  const cacheKey = `${CachePrefix.PUBLIC_KEY}:${keyId}`;

  // Check Redis cache first
  if (cacheService?.isAvailable()) {
    const cached = await cacheService.get<unknown>(cacheKey);
    if (isVerifiedPublicKey(cached)) {
      return cached;
    }
  } else {
    // Fallback to in-memory cache
    const cached = publicKeyMemoryCache.get(keyId);
    if (cached && cached.expires > Date.now()) {
      return cached.key;
    }
  }

  logger.debug({ keyId, actorUrl }, "Fetching public key for signature verification");

  const verified = await resolveVerifiedPublicKey(keyId, actorUrl, (url) =>
    fetchKeyDocument(url, userRepository, baseUrl),
  );

  // Cache in Redis (1 hour)
  if (cacheService?.isAvailable()) {
    await cacheService.set(cacheKey, verified, { ttl: CacheTTL.LONG });
  } else {
    // Fallback to in-memory cache
    publicKeyMemoryCache.set(keyId, {
      key: verified,
      expires: Date.now() + CacheTTL.LONG * 1000,
    });
  }

  return verified;
}

/**
 * HTTP Signature Verification Middleware
 *
 * Verifies the HTTP Signature on incoming ActivityPub requests.
 * Should be applied to Inbox and other federation endpoints.
 *
 * @param c - Hono context
 * @param next - Next middleware
 * @returns Response or calls next middleware
 *
 * @example
 * ```typescript
 * app.post('/users/:username/inbox', verifySignatureMiddleware, async (c) => {
 *   // Handle activity
 * });
 * ```
 */
export async function verifySignatureMiddleware(c: Context, next: Next): Promise<Response | void> {
  const signatureHeader = c.req.header("Signature");
  const requestPath = c.req.path;
  const requestHost = c.req.header("Host");

  logger.debug(
    { path: requestPath, host: requestHost, hasSignature: !!signatureHeader },
    "Inbox request received",
  );

  if (!signatureHeader) {
    logger.warn({ path: requestPath }, "Missing Signature header");
    return c.json({ error: "Missing signature" }, 401);
  }

  try {
    // Parse signature header
    const params = parseSignatureHeader(signatureHeader);
    logger.debug(
      { keyId: params.keyId, algorithm: params.algorithm, headers: params.headers },
      "Parsed signature header",
    );

    // Get services from context (if available)
    const cacheService = c.get("cacheService") as ICacheService | undefined;
    const userRepository = c.get("userRepository") as IUserRepository | undefined;

    // Get base URL for signed fetch retry (for Authorized Fetch servers)
    const baseUrl = process.env.URL || `https://${c.req.header("Host") || "localhost"}`;

    // Fetch public key (with Redis caching and signed fetch retry)
    logger.debug({ keyId: params.keyId }, "Fetching public key");
    const { publicKeyPem: publicKey, owner: signatureActor } = await fetchPublicKey(
      params.keyId,
      cacheService,
      userRepository,
      baseUrl,
    );
    logger.debug(
      { keyId: params.keyId, owner: signatureActor, keyLength: publicKey.length },
      "Public key fetched successfully",
    );

    // Get request details
    const method = c.req.method;
    const url = c.req.url;
    const headers: Record<string, string | undefined> = {};

    // Collect headers needed for verification
    for (const headerName of params.headers) {
      if (headerName !== "(request-target)") {
        headers[headerName.toLowerCase()] = c.req.header(headerName);
      }
    }

    // Reconstruct signature string
    const signatureString = reconstructSignatureString(method, url, headers, params.headers);

    // Verify signature
    const isValid = verifySignature(publicKey, signatureString, params.signature, params.algorithm);

    if (!isValid) {
      logger.warn({ keyId: params.keyId, algorithm: params.algorithm }, "Invalid signature");
      return c.json({ error: "Invalid signature" }, 401);
    }

    logger.debug({ keyId: params.keyId }, "Signature cryptographically valid");

    // Verify Date header (prevent replay attacks)
    const dateHeader = c.req.header("Date");
    if (dateHeader && !verifyDateHeader(dateHeader, 30)) {
      logger.warn({ date: dateHeader, keyId: params.keyId }, "Date header too old or invalid");
      return c.json({ error: "Request too old" }, 401);
    }

    // Verify Digest header (if present)
    const digestHeader = c.req.header("Digest");
    if (digestHeader) {
      const body = await c.req.text();
      if (!verifyDigest(body, digestHeader)) {
        logger.warn({ keyId: params.keyId }, "Invalid digest");
        return c.json({ error: "Invalid digest" }, 401);
      }
      // Store body for later use (since we've already read it)
      c.set("requestBody", body);
    }

    // Store keyId and the verified key owner for activity validation.
    // The inbox route must require activity.actor === signatureActor.
    c.set("signatureKeyId", params.keyId);
    c.set("signatureActor", signatureActor);

    logger.debug({ keyId: params.keyId }, "Signature verified successfully");

    return await next();
  } catch (error) {
    logger.error({ err: error }, "Signature verification error");
    return c.json({ error: "Signature verification failed" }, 401);
  }
}

/**
 * Clear public key cache
 *
 * Utility function to clear the in-memory cache (e.g., for testing).
 * Note: Does not clear Redis cache - use cache service directly for that.
 */
export function clearPublicKeyCache(): void {
  publicKeyMemoryCache.clear();
}

/**
 * Clear fetch failure cache
 *
 * Utility function to clear the failure cache (e.g., for testing or manual recovery).
 */
export function clearFetchFailureCache(): void {
  fetchFailureCache.clear();
}

/**
 * Get fetch failure cache stats (for monitoring)
 */
export function getFetchFailureCacheStats(): {
  size: number;
  entries: Array<{ actorUrl: string; errorType: string; ttlRemaining: number }>;
} {
  const now = Date.now();
  const entries: Array<{ actorUrl: string; errorType: string; ttlRemaining: number }> = [];

  for (const [actorUrl, entry] of fetchFailureCache) {
    if (entry.expires > now) {
      entries.push({
        actorUrl,
        errorType: entry.errorType,
        ttlRemaining: entry.expires - now,
      });
    }
  }

  return {
    size: entries.length,
    entries,
  };
}
