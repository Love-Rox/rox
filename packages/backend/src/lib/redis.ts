/**
 * Redis / Dragonfly Connection Helpers
 *
 * Shared connection settings for the Dragonfly cache adapter and the
 * ActivityPub delivery queue, so both always talk to the same server with
 * the same protocol and reconnect behavior.
 *
 * @module lib/redis
 */

import { Redis, type RedisOptions } from "ioredis";
import { logger } from "./logger.js";

/** Default Redis URL when neither `REDIS_URL` nor `DRAGONFLY_URL` is set. */
const DEFAULT_REDIS_URL = "redis://localhost:6379";

/** Upper bound for the delay between reconnect attempts. */
const MAX_RECONNECT_DELAY_MS = 5000;

/** How long to wait for the first connection at startup. */
export const DEFAULT_STARTUP_TIMEOUT_MS = 15000;

/**
 * Resolve the Redis connection URL.
 *
 * `REDIS_URL` takes precedence; `DRAGONFLY_URL` is accepted as a fallback
 * because docker/compose.yml and the K8s secret set that name.
 *
 * @returns Redis connection URL
 */
export function getRedisUrl(): string {
  return process.env.REDIS_URL || process.env.DRAGONFLY_URL || DEFAULT_REDIS_URL;
}

/**
 * Create an ioredis client with the shared defaults.
 *
 * Defaults:
 * - `protocol: 2`: ioredis v6 defaults to RESP3; RESP2 keeps v5 behavior
 *   for Dragonfly/BullMQ compatibility.
 * - Never gives up reconnecting (capped backoff), so a Dragonfly restart
 *   does not permanently disable the cache or the delivery queue.
 * - Logs a warning when an established connection drops and an info
 *   message when it comes back.
 *
 * @param name - Label used in log messages (e.g. "cache", "queue")
 * @param options - ioredis options merged over the defaults
 * @returns ioredis client (connecting unless `lazyConnect` is set)
 */
export function createRedisClient(name: string, options: RedisOptions = {}): Redis {
  const redis = new Redis(getRedisUrl(), {
    protocol: 2,
    connectTimeout: 5000,
    retryStrategy: (times) => Math.min(times * 200, MAX_RECONNECT_DELAY_MS),
    ...options,
  });

  // Log once per outage. "reconnecting" (unlike "close") does not fire on a
  // deliberate quit()/disconnect(), so graceful shutdown stays quiet.
  let everReady = false;
  let connected = false;
  redis.on("ready", () => {
    if (everReady) {
      logger.info({ client: name }, "Redis connection restored");
    }
    everReady = true;
    connected = true;
  });
  redis.on("reconnecting", () => {
    if (connected) {
      logger.warn({ client: name }, "Redis connection lost, reconnecting");
      connected = false;
    }
  });
  // Without an error listener ioredis prints "Unhandled error event" on
  // every reconnect attempt. Connection state is reported via ready/close.
  redis.on("error", (err) => {
    logger.debug({ err, client: name }, "Redis connection error");
  });

  return redis;
}

/**
 * Wait until a client is ready, tolerating transient connection errors.
 *
 * Unlike listening for the first `error` event, this keeps waiting while
 * ioredis retries, so a backend that starts before Dragonfly accepts
 * connections still picks it up.
 *
 * @param redis - Client to wait for
 * @param timeoutMs - Maximum time to wait
 * @throws Error if the client is not ready within `timeoutMs`
 */
export async function waitForRedisReady(
  redis: Redis,
  timeoutMs: number = DEFAULT_STARTUP_TIMEOUT_MS,
): Promise<void> {
  if (redis.status === "ready") return;

  await new Promise<void>((resolve, reject) => {
    const onReady = () => {
      cleanup();
      resolve();
    };
    const onEnd = () => {
      cleanup();
      reject(new Error("Redis connection ended before becoming ready"));
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`Redis not ready within ${timeoutMs}ms (${getRedisUrl()})`));
    }, timeoutMs);
    const cleanup = () => {
      clearTimeout(timer);
      redis.off("ready", onReady);
      redis.off("end", onEnd);
    };

    redis.once("ready", onReady);
    redis.once("end", onEnd);
  });
}
