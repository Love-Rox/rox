/**
 * Unit tests for the media proxy route
 *
 * Verifies SSRF protection, content-type allowlisting (no SVG) and the
 * security headers applied to proxied responses.
 *
 * @module tests/unit/proxy
 */

import { describe, test, expect, spyOn, beforeEach, afterEach } from "bun:test";
import { Hono } from "hono";
import proxyRoute, { PROXY_CSP } from "../../routes/proxy.js";
import { securityHeaders } from "../../middleware/securityHeaders.js";

function createApp() {
  const app = new Hono();
  app.use("*", securityHeaders());
  app.route("/api/proxy", proxyRoute);
  return app;
}

function proxyPath(url: string, sub = ""): string {
  return `/api/proxy${sub}?url=${encodeURIComponent(url)}`;
}

describe("Media proxy", () => {
  let fetchSpy: ReturnType<typeof spyOn>;
  const originalEnv = process.env.ALLOW_PRIVATE_NETWORK_FETCH;

  beforeEach(() => {
    delete process.env.ALLOW_PRIVATE_NETWORK_FETCH;
  });

  afterEach(() => {
    fetchSpy?.mockRestore();
    if (originalEnv === undefined) delete process.env.ALLOW_PRIVATE_NETWORK_FETCH;
    else process.env.ALLOW_PRIVATE_NETWORK_FETCH = originalEnv;
  });

  test("rejects SVG content type and does not echo upstream details", async () => {
    fetchSpy = spyOn(globalThis, "fetch").mockImplementation(
      (async () =>
        new Response('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>', {
          status: 200,
          headers: { "Content-Type": "image/svg+xml" },
        })) as any,
    );

    const res = await createApp().request(proxyPath("https://93.184.216.34/evil.svg"));
    expect(res.status).toBe(415);
    const body = await res.text();
    expect(body).not.toContain("svg");
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(res.headers.get("content-security-policy")).toBe(PROXY_CSP);
  });

  test("serves allowed images with sandboxed CSP, nosniff and Content-Disposition", async () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    fetchSpy = spyOn(globalThis, "fetch").mockImplementation(
      (async () =>
        new Response(png, { status: 200, headers: { "Content-Type": "image/png" } })) as any,
    );

    const res = await createApp().request(proxyPath("https://93.184.216.34/ok.png"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    // Global securityHeaders middleware must not overwrite the proxy CSP
    expect(res.headers.get("content-security-policy")).toBe(PROXY_CSP);
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("content-disposition")).toBe('inline; filename="media.png"');
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(png);
  });

  test.each([
    "http://169.254.169.254/latest/meta-data/",
    "http://[::1]/",
    "http://[::ffff:127.0.0.1]/",
    "http://0.0.0.0/",
    "http://100.64.0.1/",
    "http://localhost/",
  ])("blocks private destination %s without fetching", async (url) => {
    fetchSpy = spyOn(globalThis, "fetch").mockImplementation(
      (async () => new Response("secret")) as any,
    );

    const res = await createApp().request(proxyPath(url));
    expect(res.status).toBe(403);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test("blocks redirects to private addresses", async () => {
    fetchSpy = spyOn(globalThis, "fetch").mockImplementation(
      (async () =>
        new Response(null, {
          status: 302,
          headers: { Location: "http://169.254.169.254/" },
        })) as any,
    );

    const res = await createApp().request(proxyPath("https://93.184.216.34/redirect.png"));
    expect(res.status).toBe(403);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  test("returns generic 502 without upstream status on upstream errors", async () => {
    fetchSpy = spyOn(globalThis, "fetch").mockImplementation(
      (async () => new Response("teapot", { status: 418 })) as any,
    );

    const res = await createApp().request(proxyPath("https://93.184.216.34/x.png"));
    expect(res.status).toBe(502);
    expect(await res.text()).not.toContain("418");
  });

  test("avatar endpoint falls back to default avatar for SVG upstream", async () => {
    fetchSpy = spyOn(globalThis, "fetch").mockImplementation(
      (async () =>
        new Response("<svg><script>alert(1)</script></svg>", {
          status: 200,
          headers: { "Content-Type": "image/svg+xml" },
        })) as any,
    );

    const res = await createApp().request(proxyPath("https://93.184.216.34/a.svg", "/avatar"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-security-policy")).toBe(PROXY_CSP);
    const body = await res.text();
    expect(body).not.toContain("script");
    expect(body).toContain("<svg");
  });
});
