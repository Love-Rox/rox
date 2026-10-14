/**
 * Verify Signature Middleware Unit Tests
 *
 * Tests the fetch failure caching functionality in the HTTP Signature verification middleware,
 * keyId validation, key document → owner binding, and activity actor binding.
 */

import { describe, test, expect, beforeEach } from "bun:test";
import {
  clearFetchFailureCache,
  getFetchFailureCacheStats,
  type KeyDocumentFetcher,
  resolveVerifiedPublicKey,
  validateKeyId,
} from "../../middleware/verifySignature.js";
import { validateActivity, ValidationErrorType } from "../../utils/activityValidation.js";
import { isLocalHostname, isLocalUrl } from "../../utils/federationUrl.js";

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

describe("resolveVerifiedPublicKey", () => {
  const pem = "-----BEGIN PUBLIC KEY-----\nAAA\n-----END PUBLIC KEY-----";
  const otherPem = "-----BEGIN PUBLIC KEY-----\nBBB\n-----END PUBLIC KEY-----";

  beforeEach(() => {
    process.env.URL = "http://localhost:3000";
  });

  /**
   * Build a fetcher from a URL → document map. Documents are served from the
   * requested URL unless `redirects` maps the URL to a different final URL.
   */
  const makeFetcher = (
    docs: Record<string, unknown>,
    redirects: Record<string, string> = {},
  ): KeyDocumentFetcher & { calls: string[] } => {
    const calls: string[] = [];
    const fetcher = (async (url: string) => {
      calls.push(url);
      if (!(url in docs)) throw new Error(`404 ${url}`);
      return { data: docs[url], finalUrl: redirects[url] ?? url };
    }) as KeyDocumentFetcher & { calls: string[] };
    fetcher.calls = calls;
    return fetcher;
  };

  const actorDoc = (id: string, keyId: string, keyPem = pem, owner: string | undefined = id) => ({
    id,
    type: "Person",
    publicKey: { id: keyId, ...(owner ? { owner } : {}), publicKeyPem: keyPem },
  });

  test("accepts Mastodon/Misskey actor document without a second fetch", async () => {
    const fetcher = makeFetcher({
      "https://remote.example/users/bob": actorDoc(
        "https://remote.example/users/bob",
        "https://remote.example/users/bob#main-key",
      ),
    });
    const result = await resolveVerifiedPublicKey(
      "https://remote.example/users/bob#main-key",
      "https://remote.example/users/bob",
      fetcher,
    );
    expect(result).toEqual({ publicKeyPem: pem, owner: "https://remote.example/users/bob" });
    expect(fetcher.calls).toHaveLength(1);
  });

  test("defaults owner to the document id when publicKey.owner is missing", async () => {
    const fetcher = makeFetcher({
      "https://remote.example/users/bob": actorDoc(
        "https://remote.example/users/bob",
        "https://remote.example/users/bob#main-key",
        pem,
        undefined,
      ),
    });
    const result = await resolveVerifiedPublicKey(
      "https://remote.example/users/bob#main-key",
      "https://remote.example/users/bob",
      fetcher,
    );
    expect(result.owner).toBe("https://remote.example/users/bob");
  });

  test("accepts GoToSocial stub via a separate owner fetch", async () => {
    const keyId = "https://gts.example/users/bob/main-key";
    const fetcher = makeFetcher({
      [keyId]: actorDoc("https://gts.example/users/bob", keyId),
      "https://gts.example/users/bob": actorDoc("https://gts.example/users/bob", keyId),
    });
    const result = await resolveVerifiedPublicKey(keyId, keyId, fetcher);
    expect(result.owner).toBe("https://gts.example/users/bob");
    expect(fetcher.calls).toEqual([keyId, "https://gts.example/users/bob"]);
  });

  test("accepts a standalone Key document when the owner actor lists the key", async () => {
    const keyId = "https://remote.example/users/bob/publickey";
    const fetcher = makeFetcher({
      [keyId]: {
        id: keyId,
        type: "Key",
        owner: "https://remote.example/users/bob",
        publicKeyPem: pem,
      },
      "https://remote.example/users/bob": actorDoc("https://remote.example/users/bob", keyId),
    });
    const result = await resolveVerifiedPublicKey(keyId, keyId, fetcher);
    expect(result.owner).toBe("https://remote.example/users/bob");
  });

  test("rejects same-origin attacker Key document when owner's PEM differs", async () => {
    // e.g. user-uploaded JSON on the victim's origin claiming bob's ownership
    const keyId = "https://victim.example/files/evil.json";
    const fetcher = makeFetcher({
      [keyId]: {
        id: keyId,
        owner: "https://victim.example/users/bob",
        publicKeyPem: otherPem,
      },
      "https://victim.example/users/bob": actorDoc(
        "https://victim.example/users/bob",
        "https://victim.example/users/bob#main-key",
      ),
    });
    await expect(resolveVerifiedPublicKey(keyId, keyId, fetcher)).rejects.toThrow();
  });

  test("rejects when the owner lists the keyId but with a different PEM", async () => {
    const keyId = "https://gts.example/users/bob/main-key";
    const fetcher = makeFetcher({
      [keyId]: actorDoc("https://gts.example/users/bob", keyId, otherPem),
      "https://gts.example/users/bob": actorDoc("https://gts.example/users/bob", keyId, pem),
    });
    await expect(resolveVerifiedPublicKey(keyId, keyId, fetcher)).rejects.toThrow();
  });

  test("rejects a redirected key fetch unless the owner document confirms it", async () => {
    // keyId URL redirects (open redirect) to an attacker document claiming bob
    const keyId = "https://victim.example/users/bob#main-key";
    const fetcher = makeFetcher(
      {
        "https://victim.example/users/bob": actorDoc(
          "https://victim.example/users/bob",
          keyId,
          otherPem,
        ),
      },
      { "https://victim.example/users/bob": "https://victim.example/redirect-target" },
    );
    await expect(
      resolveVerifiedPublicKey(keyId, "https://victim.example/users/bob", fetcher),
    ).rejects.toThrow();
  });

  test("rejects when the owner actor document itself was redirected", async () => {
    const keyId = "https://gts.example/users/bob/main-key";
    const fetcher = makeFetcher(
      {
        [keyId]: actorDoc("https://gts.example/users/bob", keyId),
        "https://gts.example/users/bob": actorDoc("https://gts.example/users/bob", keyId),
      },
      { "https://gts.example/users/bob": "https://gts.example/elsewhere" },
    );
    await expect(resolveVerifiedPublicKey(keyId, keyId, fetcher)).rejects.toThrow();
  });

  test("rejects owner mismatch (attacker doc claiming a victim owner)", async () => {
    const keyId = "https://evil.example/users/eve#main-key";
    const fetcher = makeFetcher({
      "https://evil.example/users/eve": actorDoc(
        "https://evil.example/users/eve",
        keyId,
        pem,
        "https://victim.example/users/bob",
      ),
      "https://victim.example/users/bob": actorDoc(
        "https://victim.example/users/bob",
        "https://victim.example/users/bob#main-key",
        otherPem,
      ),
    });
    await expect(
      resolveVerifiedPublicKey(keyId, "https://evil.example/users/eve", fetcher),
    ).rejects.toThrow();
  });

  test("rejects a document whose publicKey.id does not match keyId", async () => {
    const fetcher = makeFetcher({
      "https://remote.example/users/bob2": actorDoc(
        "https://remote.example/users/bob2",
        "https://remote.example/users/bob2#other-key",
      ),
    });
    await expect(
      resolveVerifiedPublicKey(
        "https://remote.example/users/bob2#main-key",
        "https://remote.example/users/bob2",
        fetcher,
      ),
    ).rejects.toThrow();
  });

  test("rejects a key owner on the local host", async () => {
    const keyId = "https://evil.example/keys/1";
    const fetcher = makeFetcher({
      [keyId]: { id: keyId, owner: "http://localhost:3000/users/alice", publicKeyPem: pem },
    });
    await expect(resolveVerifiedPublicKey(keyId, keyId, fetcher)).rejects.toThrow();
  });

  test("rejects document without a public key", async () => {
    const fetcher = makeFetcher({
      "https://remote.example/users/bob": { id: "https://remote.example/users/bob" },
    });
    await expect(
      resolveVerifiedPublicKey(
        "https://remote.example/users/bob#main-key",
        "https://remote.example/users/bob",
        fetcher,
      ),
    ).rejects.toThrow();
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

  test("rejects activities from a trailing-dot local hostname", () => {
    const result = validateActivity(
      activity("http://LOCALHOST.:3000/users/alice"),
      "http://LOCALHOST.:3000/users/alice#main-key",
      "http://LOCALHOST.:3000/users/alice",
    );
    expect(result.valid).toBe(false);
  });

  test("rejects a javascript: activity id", () => {
    const actor = "https://remote.example/users/bob";
    const result = validateActivity(
      { ...activity(actor), id: "javascript:alert(1)" },
      `${actor}#main-key`,
      actor,
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "id")).toBe(true);
  });

  test("rejects an activity id on another origin than the actor", () => {
    const actor = "https://remote.example/users/bob";
    const result = validateActivity(
      { ...activity(actor), id: "https://victim.example/users/alice/statuses/1/activity" },
      `${actor}#main-key`,
      actor,
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "id")).toBe(true);
  });
});

describe("federationUrl local host detection", () => {
  beforeEach(() => {
    process.env.URL = "https://rox.example.com";
  });

  test("treats trailing-dot and uppercase hostnames as local", () => {
    expect(isLocalUrl("https://rox.example.com./users/alice")).toBe(true);
    expect(isLocalUrl("https://ROX.Example.COM/users/alice")).toBe(true);
    expect(isLocalHostname("rox.example.com.")).toBe(true);
  });

  test("does not treat other hosts as local", () => {
    expect(isLocalUrl("https://rox.example.com.evil.example/users/alice")).toBe(false);
    expect(isLocalHostname("other.example.com")).toBe(false);
  });

  test("normalizes a trailing dot in the configured URL", () => {
    process.env.URL = "https://rox.example.com.";
    expect(isLocalUrl("https://rox.example.com/users/alice")).toBe(true);
  });
});
