/**
 * Unit tests for SSRF-safe fetch helpers
 *
 * @module tests/unit/safeFetch
 */

import { describe, test, expect, mock, beforeEach, afterEach } from "bun:test";
import {
  isPrivateAddress,
  assertPublicUrl,
  safeFetch,
  UnsafeUrlError,
  type LookupFn,
} from "../../lib/safeFetch.js";

const publicLookup: LookupFn = async () => [{ address: "93.184.216.34", family: 4 }];

describe("isPrivateAddress", () => {
  test.each([
    "127.0.0.1",
    "127.1.2.3",
    "10.0.0.1",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.1.1",
    "169.254.169.254",
    "0.0.0.0",
    "100.64.0.1",
    "100.127.255.255",
    "192.0.2.1",
    "198.18.0.1",
    "224.0.0.1",
    "255.255.255.255",
    "::1",
    "[::1]",
    "::",
    "::ffff:127.0.0.1",
    "[::ffff:127.0.0.1]",
    "::ffff:7f00:1",
    "::ffff:169.254.169.254",
    "::ffff:10.0.0.1",
    "fd00::1",
    "fc00::1",
    "fe80::1",
    "fe80::1%eth0",
    "ff02::1",
    "2001:db8::1",
    "64:ff9b::7f00:1",
    "2002:7f00:1::1",
  ])("blocks %s", (ip) => {
    expect(isPrivateAddress(ip)).toBe(true);
  });

  test.each([
    "8.8.8.8",
    "1.1.1.1",
    "93.184.216.34",
    "172.32.0.1",
    "100.63.255.255",
    "100.128.0.1",
    "2606:4700:4700::1111",
    "2001:4860:4860::8888",
    "::ffff:8.8.8.8",
    "64:ff9b::808:808",
  ])("allows %s", (ip) => {
    expect(isPrivateAddress(ip)).toBe(false);
  });

  test("treats unparseable input as private", () => {
    expect(isPrivateAddress("not-an-ip")).toBe(true);
    expect(isPrivateAddress("999.1.1.1")).toBe(true);
  });
});

describe("assertPublicUrl", () => {
  const originalEnv = process.env.ALLOW_PRIVATE_NETWORK_FETCH;

  beforeEach(() => {
    delete process.env.ALLOW_PRIVATE_NETWORK_FETCH;
  });

  afterEach(() => {
    if (originalEnv === undefined) delete process.env.ALLOW_PRIVATE_NETWORK_FETCH;
    else process.env.ALLOW_PRIVATE_NETWORK_FETCH = originalEnv;
  });

  test.each([
    "http://127.0.0.1/",
    "http://[::1]/",
    "http://[::ffff:127.0.0.1]/",
    "http://169.254.169.254/latest/meta-data/",
    "http://0.0.0.0:3000/",
    "http://100.64.0.1/",
    "http://[fd00::1]/",
    "http://localhost:3000/",
    "http://foo.localhost/",
    "http://2130706433/", // 127.0.0.1 in decimal, normalized by URL parser
    "http://0x7f.0.0.1/",
  ])("rejects %s", async (url) => {
    await expect(assertPublicUrl(url, { lookup: publicLookup })).rejects.toBeInstanceOf(
      UnsafeUrlError,
    );
  });

  test("rejects non-HTTP schemes", async () => {
    await expect(assertPublicUrl("file:///etc/passwd")).rejects.toBeInstanceOf(UnsafeUrlError);
    await expect(assertPublicUrl("gopher://example.com/")).rejects.toBeInstanceOf(UnsafeUrlError);
  });

  test("rejects invalid URLs", async () => {
    await expect(assertPublicUrl("not a url")).rejects.toBeInstanceOf(UnsafeUrlError);
  });

  test("allows public IP literals", async () => {
    const url = await assertPublicUrl("https://93.184.216.34/image.png");
    expect(url.hostname).toBe("93.184.216.34");
    await expect(assertPublicUrl("https://[2606:4700:4700::1111]/")).resolves.toBeInstanceOf(URL);
  });

  test("allows hostnames resolving only to public addresses", async () => {
    const url = await assertPublicUrl("https://remote.example/users/alice", {
      lookup: async () => [
        { address: "93.184.216.34", family: 4 },
        { address: "2606:2800:220:1:248:1893:25c8:1946", family: 6 },
      ],
    });
    expect(url.hostname).toBe("remote.example");
  });

  test("rejects hostnames where ANY resolved address is private", async () => {
    await expect(
      assertPublicUrl("https://evil.example/", {
        lookup: async () => [
          { address: "93.184.216.34", family: 4 },
          { address: "10.0.0.5", family: 4 },
        ],
      }),
    ).rejects.toBeInstanceOf(UnsafeUrlError);

    await expect(
      assertPublicUrl("https://evil6.example/", {
        lookup: async () => [{ address: "::ffff:127.0.0.1", family: 6 }],
      }),
    ).rejects.toBeInstanceOf(UnsafeUrlError);
  });

  test("rejects when DNS resolution fails", async () => {
    await expect(
      assertPublicUrl("https://nxdomain.example/", {
        lookup: async () => {
          throw new Error("ENOTFOUND");
        },
      }),
    ).rejects.toBeInstanceOf(UnsafeUrlError);
  });

  test("ALLOW_PRIVATE_NETWORK_FETCH=true disables private address checks", async () => {
    process.env.ALLOW_PRIVATE_NETWORK_FETCH = "true";
    await expect(assertPublicUrl("http://127.0.0.1:3000/")).resolves.toBeInstanceOf(URL);
    // Scheme check still applies
    await expect(assertPublicUrl("file:///etc/passwd")).rejects.toBeInstanceOf(UnsafeUrlError);
  });
});

describe("safeFetch", () => {
  const originalEnv = process.env.ALLOW_PRIVATE_NETWORK_FETCH;

  beforeEach(() => {
    delete process.env.ALLOW_PRIVATE_NETWORK_FETCH;
  });

  afterEach(() => {
    if (originalEnv === undefined) delete process.env.ALLOW_PRIVATE_NETWORK_FETCH;
    else process.env.ALLOW_PRIVATE_NETWORK_FETCH = originalEnv;
  });

  function redirect(location: string, status = 302): Response {
    return new Response(null, { status, headers: { Location: location } });
  }

  test("does not call fetch for private initial URLs", async () => {
    const fetchImpl = mock(async () => new Response("ok"));
    await expect(
      safeFetch("http://169.254.169.254/", {}, { fetchImpl: fetchImpl as any }),
    ).rejects.toBeInstanceOf(UnsafeUrlError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  test("uses manual redirect mode", async () => {
    const fetchImpl = mock(async (_url: string, _init?: RequestInit) => new Response("ok"));
    await safeFetch("https://93.184.216.34/", {}, { fetchImpl: fetchImpl as any });
    expect(fetchImpl.mock.calls[0]?.[1]?.redirect).toBe("manual");
  });

  test("re-validates redirect targets and blocks redirects to private addresses", async () => {
    const fetchImpl = mock(async (url: string) => {
      if (url.startsWith("https://93.184.216.34/")) {
        return redirect("http://169.254.169.254/latest/meta-data/");
      }
      return new Response("secret");
    });

    await expect(
      safeFetch("https://93.184.216.34/start", {}, { fetchImpl: fetchImpl as any }),
    ).rejects.toBeInstanceOf(UnsafeUrlError);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  test("blocks redirects to hostnames resolving to private addresses", async () => {
    const lookup: LookupFn = async (host) =>
      host === "internal.example"
        ? [{ address: "10.1.2.3", family: 4 }]
        : [{ address: "93.184.216.34", family: 4 }];
    const fetchImpl = mock(async () => redirect("https://internal.example/admin"));

    await expect(
      safeFetch("https://public.example/", {}, { fetchImpl: fetchImpl as any, lookup }),
    ).rejects.toBeInstanceOf(UnsafeUrlError);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  test("follows redirects to public addresses (relative Location)", async () => {
    const fetchImpl = mock(async (url: string) => {
      if (url === "https://93.184.216.34/a") return redirect("/b", 301);
      return new Response("final", { status: 200 });
    });

    const res = await safeFetch("https://93.184.216.34/a", {}, { fetchImpl: fetchImpl as any });
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("final");
    expect(fetchImpl.mock.calls[1]?.[0]).toBe("https://93.184.216.34/b");
  });

  test("enforces maximum redirects", async () => {
    let n = 0;
    const fetchImpl = mock(async () => redirect(`https://93.184.216.34/${++n}`));

    await expect(
      safeFetch("https://93.184.216.34/0", {}, { fetchImpl: fetchImpl as any, maxRedirects: 3 }),
    ).rejects.toThrow("Too many redirects");
    expect(fetchImpl).toHaveBeenCalledTimes(4);
  });

  test("maxRedirects: 0 rejects any redirect", async () => {
    const fetchImpl = mock(async () => redirect("https://93.184.216.34/next"));
    await expect(
      safeFetch("https://93.184.216.34/", {}, { fetchImpl: fetchImpl as any, maxRedirects: 0 }),
    ).rejects.toBeInstanceOf(UnsafeUrlError);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  test("303 switches POST to GET and drops credentials across origins", async () => {
    const fetchImpl = mock(async (url: string, _init?: RequestInit) => {
      if (url === "https://93.184.216.34/post") return redirect("https://8.8.8.8/done", 303);
      return new Response("ok");
    });

    await safeFetch(
      "https://93.184.216.34/post",
      {
        method: "POST",
        body: "data",
        headers: { Authorization: "Bearer x", "Content-Type": "text/plain", Host: "a" },
      },
      { fetchImpl: fetchImpl as any },
    );

    const second = fetchImpl.mock.calls[1]?.[1];
    expect(second?.method).toBe("GET");
    expect(second?.body).toBeUndefined();
    const headers = new Headers(second?.headers);
    expect(headers.has("authorization")).toBe(false);
    expect(headers.has("content-type")).toBe(false);
    expect(headers.has("host")).toBe(false);
  });

  test("works against a local server when ALLOW_PRIVATE_NETWORK_FETCH=true", async () => {
    process.env.ALLOW_PRIVATE_NETWORK_FETCH = "true";
    const server = Bun.serve({
      port: 0,
      hostname: "127.0.0.1",
      fetch(req) {
        const { pathname } = new URL(req.url);
        if (pathname === "/start") return redirect("/end");
        if (pathname === "/file") return redirect("file:///etc/passwd");
        return new Response("reached");
      },
    });
    try {
      const base = `http://127.0.0.1:${server.port}`;
      const res = await safeFetch(`${base}/start`);
      expect(await res.text()).toBe("reached");

      // Scheme is still re-validated on each hop
      await expect(safeFetch(`${base}/file`)).rejects.toBeInstanceOf(UnsafeUrlError);
    } finally {
      server.stop(true);
    }
  });

  test("blocks a local server without the escape hatch", async () => {
    const server = Bun.serve({
      port: 0,
      hostname: "127.0.0.1",
      fetch: () => new Response("should not be reached"),
    });
    try {
      await expect(safeFetch(`http://127.0.0.1:${server.port}/`)).rejects.toBeInstanceOf(
        UnsafeUrlError,
      );
    } finally {
      server.stop(true);
    }
  });
});
