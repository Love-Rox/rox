/**
 * Redis helper unit tests
 */

import { describe, test, expect } from "bun:test";
import { redactRedisUrl } from "../../lib/redis";

describe("redactRedisUrl", () => {
  test("should mask password-only credentials", () => {
    expect(redactRedisUrl("redis://:s3cret@dragonfly:6379")).toBe("redis://:***@dragonfly:6379");
  });

  test("should mask username and password", () => {
    expect(redactRedisUrl("rediss://user:pw@host:6380/0")).toBe("rediss://***:***@host:6380/0");
  });

  test("should leave URLs without credentials unchanged", () => {
    expect(redactRedisUrl("redis://localhost:6379")).toBe("redis://localhost:6379");
  });

  test("should not echo invalid input", () => {
    expect(redactRedisUrl("not a url :secret")).toBe("<invalid redis url>");
  });
});
