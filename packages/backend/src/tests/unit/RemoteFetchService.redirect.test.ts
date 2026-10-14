/**
 * RemoteFetchService redirect origin tests
 *
 * ActivityPub objects are trusted by the origin of their URL, so a redirect to
 * another origin must not be followed silently. Also verifies that the final
 * URL is exposed to callers.
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { safeFetchWithFinalUrl } from "../../lib/safeFetch.js";
import { RemoteFetchService } from "../../services/ap/RemoteFetchService.js";

describe("RemoteFetchService cross-origin redirects", () => {
  let serverA: ReturnType<typeof Bun.serve>;
  let serverB: ReturnType<typeof Bun.serve>;
  let baseA: string;
  let baseB: string;
  let previousAllow: string | undefined;

  const json = (body: unknown) =>
    new Response(JSON.stringify(body), {
      headers: { "Content-Type": "application/activity+json" },
    });

  beforeAll(() => {
    previousAllow = process.env.ALLOW_PRIVATE_NETWORK_FETCH;
    process.env.ALLOW_PRIVATE_NETWORK_FETCH = "true";
    serverB = Bun.serve({
      port: 0,
      hostname: "127.0.0.1",
      fetch: () => json({ id: "attacker" }),
    });
    baseB = `http://127.0.0.1:${serverB.port}`;
    serverA = Bun.serve({
      port: 0,
      hostname: "127.0.0.1",
      fetch(req) {
        const { pathname } = new URL(req.url);
        if (pathname === "/cross") {
          return new Response(null, { status: 302, headers: { Location: `${baseB}/doc` } });
        }
        if (pathname === "/same") {
          return new Response(null, { status: 302, headers: { Location: "/doc" } });
        }
        return json({ id: `${baseA}/doc` });
      },
    });
    baseA = `http://127.0.0.1:${serverA.port}`;
  });

  afterAll(() => {
    serverA.stop(true);
    serverB.stop(true);
    if (previousAllow === undefined) delete process.env.ALLOW_PRIVATE_NETWORK_FETCH;
    else process.env.ALLOW_PRIVATE_NETWORK_FETCH = previousAllow;
  });

  test("safeFetchWithFinalUrl exposes the final URL after redirects", async () => {
    const { response, finalUrl } = await safeFetchWithFinalUrl(`${baseA}/same`);
    await response.body?.cancel();
    expect(finalUrl.href).toBe(`${baseA}/doc`);
  });

  test("rejects a cross-origin redirect by default", async () => {
    const service = new RemoteFetchService();
    const result = await service.fetchActivityPubObject(`${baseA}/cross`, { maxRetries: 0 });
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("Cross-origin redirect");
  });

  test("follows a same-origin redirect and reports finalUrl", async () => {
    const service = new RemoteFetchService();
    const result = await service.fetchActivityPubObject(`${baseA}/same`, { maxRetries: 0 });
    expect(result.success).toBe(true);
    expect(result.finalUrl).toBe(`${baseA}/doc`);
  });

  test("allows a cross-origin redirect when explicitly enabled", async () => {
    const service = new RemoteFetchService();
    const result = await service.fetchActivityPubObject(`${baseA}/cross`, {
      maxRetries: 0,
      allowCrossOriginRedirect: true,
    });
    expect(result.success).toBe(true);
    expect(result.finalUrl).toBe(`${baseB}/doc`);
  });
});
