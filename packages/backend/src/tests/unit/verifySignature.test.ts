/**
 * Verify Signature Middleware Unit Tests
 *
 * Tests the fetch failure caching functionality in the HTTP Signature verification middleware,
 * keyId validation, key document → owner binding, and activity actor binding.
 */

import { describe, test, expect, beforeEach } from "bun:test";
import {
  clearFetchFailureCache,
  extractVerifiedPublicKey,
  getFetchFailureCacheStats,
  validateKeyId,
} from "../../middleware/verifySignature.js";
import { validateActivity, ValidationErrorType } from "../../utils/activityValidation.js";

describe("verifySignature fetch failure cache", () => {
  beforeEach(() => {
    // Clear the cache before each test
    clearFetchFailureCache();
  });

  test("clearFetchFailureCache should clear all entries", () => {
    // Initially empty
    const stats = getFetchFailureCacheStats();
    expect(stats.size).toBe(0);
    expect(stats.entries).toHaveLength(0);
  });

  test("getFetchFailureCacheStats should return empty stats when cache is empty", () => {
    const stats = getFetchFailureCacheStats();

    expect(stats.size).toBe(0);
    expect(stats.entries).toEqual([]);
  });

  test("getFetchFailureCacheStats should return correct structure", () => {
    const stats = getFetchFailureCacheStats();

    expect(stats).toHaveProperty("size");
    expect(stats).toHaveProperty("entries");
    expect(Array.isArray(stats.entries)).toBe(true);
  });
});

describe("validateKeyId", () => {
  beforeEach(() => {
    process.env.URL = "http://localhost:3000";
  });

  test("accepts a normal keyId and strips the fragment", () => {
    expect(validateKeyId("https://remote.example/users/bob#main-key")).toBe(
      "https://remote.example/users/bob",
    );
  });

  test("rejects dot-segment keyIds", () => {
    expect(() => validateKeyId("https://victim.example/users/bob/../eve#main-key")).toThrow();
    expect(() => validateKeyId("https://victim.example/users/bob/%2e%2e/eve#main-key")).toThrow();
    expect(() => validateKeyId("https://victim.example/users/./bob#main-key")).toThrow();
    expect(() => validateKeyId("https://victim.example/users/bob\\..\\eve#main-key")).toThrow();
  });

  test("rejects non-http(s) keyIds", () => {
    expect(() => validateKeyId("javascript:alert(1)")).toThrow();
    expect(() => validateKeyId("not a url")).toThrow();
  });

  test("rejects keyIds on the local host (e.g. /api/proxy)", () => {
    expect(() =>
      validateKeyId("http://localhost:3000/api/proxy?url=https://evil.example/key#main-key"),
    ).toThrow();
  });
});

describe("extractVerifiedPublicKey", () => {
  const pem = "-----BEGIN PUBLIC KEY-----\nAAA\n-----END PUBLIC KEY-----";

  test("accepts Mastodon/Misskey-style actor document", () => {
    const result = extractVerifiedPublicKey(
      "https://remote.example/users/bob#main-key",
      "https://remote.example/users/bob",
      {
        id: "https://remote.example/users/bob",
        type: "Person",
        publicKey: {
          id: "https://remote.example/users/bob#main-key",
          owner: "https://remote.example/users/bob",
          publicKeyPem: pem,
        },
      },
    );
    expect(result).toEqual({ publicKeyPem: pem, owner: "https://remote.example/users/bob" });
  });

  test("defaults owner to the document id when publicKey.owner is missing", () => {
    const result = extractVerifiedPublicKey(
      "https://remote.example/users/bob#main-key",
      "https://remote.example/users/bob",
      {
        id: "https://remote.example/users/bob",
        publicKey: { id: "https://remote.example/users/bob#main-key", publicKeyPem: pem },
      },
    );
    expect(result.owner).toBe("https://remote.example/users/bob");
  });

  test("finds the matching key in a publicKey array", () => {
    const result = extractVerifiedPublicKey(
      "https://remote.example/users/bob#key-2",
      "https://remote.example/users/bob",
      {
        id: "https://remote.example/users/bob",
        publicKey: [
          { id: "https://remote.example/users/bob#key-1", publicKeyPem: "other" },
          { id: "https://remote.example/users/bob#key-2", publicKeyPem: pem },
        ],
      },
    );
    expect(result.publicKeyPem).toBe(pem);
  });

  test("accepts a standalone Key document on a different path (/publickey)", () => {
    const result = extractVerifiedPublicKey(
      "https://remote.example/users/bob/publickey",
      "https://remote.example/users/bob/publickey",
      {
        id: "https://remote.example/users/bob/publickey",
        type: "Key",
        owner: "https://remote.example/users/bob",
        publicKeyPem: pem,
      },
    );
    expect(result.owner).toBe("https://remote.example/users/bob");
  });

  test("rejects a document whose publicKey.id does not match keyId", () => {
    expect(() =>
      extractVerifiedPublicKey(
        "https://remote.example/users/bob2#main-key",
        "https://remote.example/users/bob2",
        {
          id: "https://remote.example/users/bob2",
          publicKey: {
            id: "https://remote.example/users/bob2#other-key",
            owner: "https://remote.example/users/bob2",
            publicKeyPem: pem,
          },
        },
      ),
    ).toThrow();
  });

  test("accepts GoToSocial-style stub actor served at the key path", () => {
    const result = extractVerifiedPublicKey(
      "https://gts.example/users/bob/main-key",
      "https://gts.example/users/bob/main-key",
      {
        id: "https://gts.example/users/bob",
        type: "Person",
        publicKey: {
          id: "https://gts.example/users/bob/main-key",
          owner: "https://gts.example/users/bob",
          publicKeyPem: pem,
        },
      },
    );
    expect(result.owner).toBe("https://gts.example/users/bob");
  });

  test("rejects an actor document whose id is on a different origin", () => {
    expect(() =>
      extractVerifiedPublicKey(
        "https://evil.example/users/eve#main-key",
        "https://evil.example/users/eve",
        {
          id: "https://victim.example/users/bob",
          publicKey: {
            id: "https://evil.example/users/eve#main-key",
            owner: "https://victim.example/users/bob",
            publicKeyPem: pem,
          },
        },
      ),
    ).toThrow();
  });

  test("dot-segment keyId resolves to the normalized target's owner, never the prefix actor", () => {
    // Even if validateKeyId were bypassed, the verified owner is eve (the document
    // actually fetched), so activity.actor === bob would fail the binding check.
    const result = extractVerifiedPublicKey(
      "https://victim.example/users/bob/../eve#main-key",
      "https://victim.example/users/bob/../eve",
      {
        id: "https://victim.example/users/eve",
        publicKey: {
          id: "https://victim.example/users/eve#main-key",
          owner: "https://victim.example/users/eve",
          publicKeyPem: pem,
        },
      },
    );
    expect(result.owner).toBe("https://victim.example/users/eve");
  });

  test("rejects owner mismatch in actor document", () => {
    expect(() =>
      extractVerifiedPublicKey(
        "https://evil.example/users/eve#main-key",
        "https://evil.example/users/eve",
        {
          id: "https://evil.example/users/eve",
          publicKey: {
            id: "https://evil.example/users/eve#main-key",
            owner: "https://victim.example/users/bob",
            publicKeyPem: pem,
          },
        },
      ),
    ).toThrow();
  });

  test("rejects cross-origin owner in standalone Key document", () => {
    expect(() =>
      extractVerifiedPublicKey("https://evil.example/keys/1", "https://evil.example/keys/1", {
        id: "https://evil.example/keys/1",
        owner: "https://victim.example/users/bob",
        publicKeyPem: pem,
      }),
    ).toThrow();
  });

  test("rejects document without a public key", () => {
    expect(() =>
      extractVerifiedPublicKey(
        "https://remote.example/users/bob#main-key",
        "https://remote.example/users/bob",
        { id: "https://remote.example/users/bob" },
      ),
    ).toThrow();
  });
});

describe("validateActivity actor binding", () => {
  beforeEach(() => {
    process.env.URL = "http://localhost:3000";
  });

  const activity = (actor: string) => ({
    "@context": "https://www.w3.org/ns/activitystreams",
    id: `${actor}/activities/1`,
    type: "Follow",
    actor,
    object: "http://localhost:3000/users/alice",
  });

  test("accepts actor equal to the verified key owner", () => {
    const result = validateActivity(
      activity("https://remote.example/users/bob"),
      "https://remote.example/users/bob#main-key",
      "https://remote.example/users/bob",
    );
    expect(result.valid).toBe(true);
  });

  test("accepts keyId on a different path as long as the owner matches", () => {
    const result = validateActivity(
      activity("https://remote.example/users/bob"),
      "https://remote.example/users/bob/publickey",
      "https://remote.example/users/bob",
    );
    expect(result.valid).toBe(true);
  });

  test("rejects actor that only shares a prefix with the keyId (bob vs bob2)", () => {
    const result = validateActivity(
      activity("https://remote.example/users/bob"),
      "https://remote.example/users/bob2#main-key",
      "https://remote.example/users/bob2",
    );
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.type).toBe(ValidationErrorType.ACTOR_MISMATCH);
  });

  test("rejects dot-segment keyId whose verified owner is a different actor", () => {
    const result = validateActivity(
      activity("https://victim.example/users/bob"),
      "https://victim.example/users/bob/../eve#main-key",
      "https://victim.example/users/eve",
    );
    expect(result.valid).toBe(false);
  });

  test("rejects when keyId is present but owner was not verified", () => {
    const result = validateActivity(
      activity("https://remote.example/users/bob"),
      "https://remote.example/users/bob#main-key",
    );
    expect(result.valid).toBe(false);
  });

  test("rejects activities whose actor is on the local host", () => {
    const result = validateActivity(
      activity("http://localhost:3000/users/alice"),
      "http://localhost:3000/users/alice#main-key",
      "http://localhost:3000/users/alice",
    );
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.type).toBe(ValidationErrorType.ACTOR_MISMATCH);
  });
});
