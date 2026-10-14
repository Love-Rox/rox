/**
 * OAuth / Registration Route Security Tests
 *
 * Covers:
 * - OAuth callback refuses email auto-linking and gated sign-ups
 * - OAuth link/unlink/accounts endpoints actually require authentication
 * - Link-flow callback binds the provider to the session that initiated it
 * - Legacy `POST /api/users` registration endpoint is removed
 * - Shared registration policy helpers
 */

import { describe, test, expect, mock, beforeEach, afterEach } from "bun:test";
import { Hono } from "hono";
import oauthApp from "../../routes/oauth.js";
import usersApp from "../../routes/users.js";
import { getRegistrationPolicy } from "../../lib/registrationPolicy.js";
import type { User, OAuthAccount } from "../../db/schema/pg.js";

const baseUser: User = {
  id: "user1",
  username: "alice",
  email: "alice@example.com",
  passwordHash: "$argon2id$hash",
  displayName: "Alice",
  host: null,
  avatarUrl: null,
  bannerUrl: null,
  bio: null,
  isAdmin: false,
  isSuspended: false,
  isDeleted: false,
  deletedAt: null,
  isSystemUser: false,
  publicKey: "pk",
  privateKey: "sk",
  inbox: null,
  outbox: null,
  followersUrl: null,
  followingUrl: null,
  uri: null,
  sharedInbox: null,
  customCss: null,
  uiSettings: null,
  alsoKnownAs: [],
  movedTo: null,
  movedAt: null,
  profileEmojis: [],
  storageQuotaMb: null,
  goneDetectedAt: null,
  fetchFailureCount: 0,
  lastFetchAttemptAt: null,
  lastFetchError: null,
  followersCount: 0,
  followingCount: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
} as User;

const linkRow: OAuthAccount = {
  id: "oa1",
  userId: "user1",
  provider: "github",
  providerAccountId: "42",
  accessToken: "tok",
  refreshToken: null,
  tokenExpiresAt: null,
  scope: null,
  tokenType: "Bearer",
  providerUsername: "gh",
  providerEmail: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("OAuth routes security", () => {
  const originalEnv = { ...process.env };
  const originalFetch = globalThis.fetch;

  let userRepo: Record<string, ReturnType<typeof mock>>;
  let oauthRepo: Record<string, ReturnType<typeof mock>>;
  let sessionRepo: Record<string, ReturnType<typeof mock>>;
  let settings: {
    isRegistrationEnabled: ReturnType<typeof mock>;
    isInviteOnly: ReturnType<typeof mock>;
  };
  let app: Hono;

  beforeEach(() => {
    process.env.URL = "http://localhost:3000";
    process.env.GITHUB_CLIENT_ID = "id";
    process.env.GITHUB_CLIENT_SECRET = "secret";
    delete process.env.REQUIRE_INVITATION;
    delete process.env.ENABLE_REGISTRATION;

    // GitHub: token exchange, /user, /user/emails (verified primary email)
    globalThis.fetch = mock((input: string | URL | Request) => {
      const url = String(input);
      let body: unknown = {};
      if (url.includes("/login/oauth/access_token")) {
        body = { access_token: "tok", token_type: "bearer" };
      } else if (url.endsWith("/user")) {
        body = { id: 42, login: "victim", name: null, email: null, avatar_url: null };
      } else if (url.endsWith("/user/emails")) {
        body = [{ email: "alice@example.com", primary: true, verified: true }];
      }
      return Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
    }) as unknown as typeof fetch;

    userRepo = {
      findByEmail: mock(() => Promise.resolve(null)),
      findByUsername: mock(() => Promise.resolve(null)),
      findById: mock(() => Promise.resolve(baseUser)),
      create: mock((u: User) => Promise.resolve({ ...baseUser, ...u })),
    };
    oauthRepo = {
      findByProviderAccount: mock(() => Promise.resolve(null)),
      findByUserAndProvider: mock(() => Promise.resolve(null)),
      create: mock(() => Promise.resolve(linkRow)),
      updateTokens: mock(() => Promise.resolve(linkRow)),
      findByUserId: mock(() => Promise.resolve([linkRow])),
    };
    sessionRepo = {
      create: mock(() => Promise.resolve({})),
      findByToken: mock((token: string) =>
        Promise.resolve(
          token === "valid-session"
            ? {
                id: "s1",
                userId: "user1",
                token,
                expiresAt: new Date(Date.now() + 60_000),
              }
            : null,
        ),
      ),
      delete: mock(() => Promise.resolve()),
    };
    settings = {
      isRegistrationEnabled: mock(() => Promise.resolve(true)),
      isInviteOnly: mock(() => Promise.resolve(false)),
    };

    app = new Hono();
    app.use("*", async (c, next) => {
      c.set("userRepository" as any, userRepo as any);
      c.set("oauthAccountRepository" as any, oauthRepo as any);
      c.set("sessionRepository" as any, sessionRepo as any);
      c.set("instanceSettingsService" as any, settings as any);
      c.set(
        "blockedUsernameService" as any,
        {
          isUsernameBlocked: mock(() => Promise.resolve({ blocked: false })),
        } as any,
      );
      await next();
    });
    app.route("/api/auth/oauth", oauthApp);
    app.route("/api/users", usersApp);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    globalThis.fetch = originalFetch;
  });

  const callback = (cookie: string) =>
    app.request("/api/auth/oauth/github/callback?code=abc&state=st", {
      headers: { Cookie: cookie },
    });

  const errorOf = (res: Response) =>
    new URL(res.headers.get("location")!, "http://x").searchParams.get("error");

  test("callback refuses to auto-link an existing account by email", async () => {
    userRepo.findByEmail!.mockResolvedValue(baseUser);

    const res = await callback("oauth_state=st");

    expect(res.status).toBe(302);
    expect(res.headers.get("location")!.startsWith("/login?")).toBe(true);
    expect(errorOf(res)).toContain("An account with this email already exists");
    expect(oauthRepo.create).not.toHaveBeenCalled();
    expect(sessionRepo.create).not.toHaveBeenCalled();
  });

  test("callback refuses OAuth sign-up when invite-only", async () => {
    settings.isInviteOnly.mockResolvedValue(true);

    const res = await callback("oauth_state=st");

    expect(errorOf(res)).toContain("invitation code");
    expect(userRepo.create).not.toHaveBeenCalled();
  });

  test("callback refuses OAuth sign-up when REQUIRE_INVITATION env is set", async () => {
    process.env.REQUIRE_INVITATION = "true";

    const res = await callback("oauth_state=st");

    expect(errorOf(res)).toContain("invitation code");
    expect(userRepo.create).not.toHaveBeenCalled();
  });

  test("callback refuses OAuth sign-up when registration is disabled", async () => {
    settings.isRegistrationEnabled.mockResolvedValue(false);

    const res = await callback("oauth_state=st");

    expect(errorOf(res)).toBe("Registration is currently disabled");
    expect(userRepo.create).not.toHaveBeenCalled();
  });

  test("callback still logs in already-linked users when invite-only", async () => {
    settings.isInviteOnly.mockResolvedValue(true);
    oauthRepo.findByProviderAccount!.mockResolvedValue(linkRow);

    const res = await callback("oauth_state=st");

    expect(res.headers.get("location")).toBe("/");
    expect(sessionRepo.create).toHaveBeenCalled();
  });

  test("callback rejects state mismatch", async () => {
    const res = await callback("oauth_state=other");
    expect(errorOf(res)).toBe("Invalid OAuth state");
  });

  test("link-flow callback links to the session that initiated it", async () => {
    const res = await callback("oauth_link_state=st.valid-session");

    expect(res.headers.get("location")).toBe("/settings?oauth_linked=github");
    expect(oauthRepo.create).toHaveBeenCalled();
    const created = oauthRepo.create!.mock.calls[0]![0] as OAuthAccount;
    expect(created.userId).toBe("user1");
    expect(sessionRepo.create).not.toHaveBeenCalled();
  });

  test("link-flow callback with an invalid session does not link", async () => {
    const res = await callback("oauth_link_state=st.forged-or-expired");

    expect(res.headers.get("location")!.startsWith("/login?")).toBe(true);
    expect(oauthRepo.create).not.toHaveBeenCalled();
  });

  test("link/unlink/accounts endpoints require authentication", async () => {
    const accounts = await app.request("/api/auth/oauth/accounts");
    expect(accounts.status).toBe(401);

    const link = await app.request("/api/auth/oauth/github/link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "x", state: "y" }),
    });
    expect(link.status).toBe(401);

    const linkAuthorize = await app.request("/api/auth/oauth/github/link/authorize", {
      method: "POST",
    });
    expect(linkAuthorize.status).toBe(401);

    const unlink = await app.request("/api/auth/oauth/github", { method: "DELETE" });
    expect(unlink.status).toBe(401);
  });

  test("authenticated user can list linked accounts", async () => {
    const res = await app.request("/api/auth/oauth/accounts", {
      headers: { Authorization: "Bearer valid-session" },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { accounts: unknown[] };
    expect(body.accounts.length).toBe(1);
  });

  test("POST /link requires state bound to the caller's session", async () => {
    const res = await app.request("/api/auth/oauth/github/link", {
      method: "POST",
      headers: {
        Authorization: "Bearer valid-session",
        "Content-Type": "application/json",
        Cookie: "oauth_link_state=st.some-other-session",
      },
      body: JSON.stringify({ code: "abc", state: "st" }),
    });
    expect(res.status).toBe(400);
    expect(oauthRepo.create).not.toHaveBeenCalled();
  });

  test("legacy POST /api/users registration endpoint is removed", async () => {
    process.env.ENABLE_REGISTRATION = "true";
    const res = await app.request("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "mallory",
        email: "mallory@example.com",
        password: "password123",
      }),
    });
    expect(res.status).toBe(404);
    expect(userRepo.create).not.toHaveBeenCalled();
  });
});

describe("getRegistrationPolicy", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  const source = (enabled: boolean, inviteOnly: boolean) => ({
    isRegistrationEnabled: () => Promise.resolve(enabled),
    isInviteOnly: () => Promise.resolve(inviteOnly),
  });

  test("reflects DB settings", async () => {
    delete process.env.REQUIRE_INVITATION;
    expect(await getRegistrationPolicy(source(true, false))).toEqual({
      registrationEnabled: true,
      inviteOnly: false,
    });
    expect(await getRegistrationPolicy(source(false, true))).toEqual({
      registrationEnabled: false,
      inviteOnly: true,
    });
  });

  test("REQUIRE_INVITATION env forces invite-only", async () => {
    process.env.REQUIRE_INVITATION = "1";
    const policy = await getRegistrationPolicy(source(true, false));
    expect(policy.inviteOnly).toBe(true);
  });
});
