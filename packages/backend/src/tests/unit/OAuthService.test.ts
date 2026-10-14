/**
 * OAuthService Unit Tests
 *
 * Tests OAuth authentication flow including authorization URL generation,
 * token exchange, user profile fetching, and account linking.
 */

import { describe, test, expect, mock, beforeEach, afterEach } from "bun:test";
import {
  OAuthService,
  OAuthError,
  hasUsablePassword,
  isGoogleEmailVerified,
  selectVerifiedGitHubEmail,
} from "../../services/OAuthService";
import type { IOAuthAccountRepository } from "../../interfaces/repositories/IOAuthAccountRepository";
import type { IUserRepository } from "../../interfaces/repositories/IUserRepository";
import type { ISessionRepository } from "../../interfaces/repositories/ISessionRepository";
import type { User, OAuthAccount } from "../../db/schema/pg";

describe("OAuthService", () => {
  // Mock user data
  const mockUser: User = {
    id: "user1",
    username: "testuser",
    email: "test@example.com",
    passwordHash: "oauth:github:xxx",
    displayName: "Test User",
    host: null,
    avatarUrl: "https://avatars.githubusercontent.com/u/12345",
    bannerUrl: null,
    bio: null,
    isAdmin: false,
    isSuspended: false,
    isDeleted: false,
    deletedAt: null,
    isSystemUser: false,
    publicKey: "mock-public-key",
    privateKey: "mock-private-key",
    inbox: "http://localhost:3000/users/testuser/inbox",
    outbox: "http://localhost:3000/users/testuser/outbox",
    followersUrl: "http://localhost:3000/users/testuser/followers",
    followingUrl: "http://localhost:3000/users/testuser/following",
    uri: "http://localhost:3000/users/testuser",
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
  };

  // Mock OAuth account data
  const mockOAuthAccount: OAuthAccount = {
    id: "oauth1",
    userId: "user1",
    provider: "github",
    providerAccountId: "12345",
    accessToken: "gho_xxx",
    refreshToken: null,
    tokenExpiresAt: null,
    scope: "read:user user:email",
    tokenType: "Bearer",
    providerUsername: "testuser",
    providerEmail: "test@example.com",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Mock session data
  const mockSession = {
    id: "session1",
    userId: "user1",
    token: "session_token_xxx",
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    userAgent: "Test Agent",
    ipAddress: "127.0.0.1",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Mock repositories
  let mockOAuthRepo: IOAuthAccountRepository;
  let mockUserRepo: Partial<IUserRepository>;
  let mockSessionRepo: Partial<ISessionRepository>;

  // Store original env
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Set up mock environment
    process.env.URL = "http://localhost:3000";
    process.env.GITHUB_CLIENT_ID = "github_client_id";
    process.env.GITHUB_CLIENT_SECRET = "github_client_secret";
    process.env.GITHUB_REDIRECT_URI = "http://localhost:3000/api/auth/oauth/github/callback";
    process.env.GOOGLE_CLIENT_ID = "google_client_id";
    process.env.GOOGLE_CLIENT_SECRET = "google_client_secret";
    process.env.GOOGLE_REDIRECT_URI = "http://localhost:3000/api/auth/oauth/google/callback";
    process.env.DISCORD_CLIENT_ID = "discord_client_id";
    process.env.DISCORD_CLIENT_SECRET = "discord_client_secret";
    process.env.DISCORD_REDIRECT_URI = "http://localhost:3000/api/auth/oauth/discord/callback";
    process.env.SESSION_EXPIRY_DAYS = "30";

    mockOAuthRepo = {
      create: mock(() => Promise.resolve(mockOAuthAccount)),
      findById: mock(() => Promise.resolve(mockOAuthAccount)),
      findByProviderAccount: mock(() => Promise.resolve(null)),
      findByUserId: mock(() => Promise.resolve([mockOAuthAccount])),
      findByUserAndProvider: mock(() => Promise.resolve(null)),
      updateTokens: mock(() => Promise.resolve(mockOAuthAccount)),
      delete: mock(() => Promise.resolve()),
      deleteByUserAndProvider: mock(() => Promise.resolve()),
      deleteByUserId: mock(() => Promise.resolve()),
      countByUserId: mock(() => Promise.resolve(1)),
    };

    mockUserRepo = {
      findByEmail: mock(() => Promise.resolve(null)),
      findByUsername: mock(() => Promise.resolve(null)),
      findById: mock(() => Promise.resolve(mockUser)),
      create: mock(() => Promise.resolve(mockUser)),
    };

    mockSessionRepo = {
      create: mock(() => Promise.resolve(mockSession)),
      findByToken: mock(() => Promise.resolve(mockSession)),
    };
  });

  afterEach(() => {
    // Restore original env
    process.env = { ...originalEnv };
  });

  describe("getEnabledProviders", () => {
    test("should return list of enabled providers", () => {
      const service = new OAuthService(
        mockOAuthRepo,
        mockUserRepo as IUserRepository,
        mockSessionRepo as ISessionRepository,
      );

      const providers = service.getEnabledProviders();

      // Should include github, google, discord based on env vars
      expect(providers).toContain("github");
      expect(providers).toContain("google");
      expect(providers).toContain("discord");
    });

    test("should not include providers without credentials", () => {
      delete process.env.GOOGLE_CLIENT_ID;
      delete process.env.GOOGLE_CLIENT_SECRET;

      const service = new OAuthService(
        mockOAuthRepo,
        mockUserRepo as IUserRepository,
        mockSessionRepo as ISessionRepository,
      );

      const providers = service.getEnabledProviders();

      expect(providers).toContain("github");
      expect(providers).not.toContain("google");
    });
  });

  describe("getAuthorizationUrl", () => {
    test("should generate GitHub authorization URL", () => {
      const service = new OAuthService(
        mockOAuthRepo,
        mockUserRepo as IUserRepository,
        mockSessionRepo as ISessionRepository,
      );

      const url = service.getAuthorizationUrl("github", "test_state");

      expect(url).toContain("https://github.com/login/oauth/authorize");
      expect(url).toContain("client_id=github_client_id");
      expect(url).toContain("state=test_state");
      expect(url).toContain("scope=read%3Auser+user%3Aemail");
    });

    test("should generate Google authorization URL", () => {
      const service = new OAuthService(
        mockOAuthRepo,
        mockUserRepo as IUserRepository,
        mockSessionRepo as ISessionRepository,
      );

      const url = service.getAuthorizationUrl("google", "test_state");

      expect(url).toContain("https://accounts.google.com/o/oauth2/v2/auth");
      expect(url).toContain("client_id=google_client_id");
      expect(url).toContain("state=test_state");
    });

    test("should generate Discord authorization URL", () => {
      const service = new OAuthService(
        mockOAuthRepo,
        mockUserRepo as IUserRepository,
        mockSessionRepo as ISessionRepository,
      );

      const url = service.getAuthorizationUrl("discord", "test_state");

      expect(url).toContain("https://discord.com/api/oauth2/authorize");
      expect(url).toContain("client_id=discord_client_id");
      expect(url).toContain("state=test_state");
    });

    test("should throw error for unconfigured provider", () => {
      delete process.env.GOOGLE_CLIENT_ID;

      const service = new OAuthService(
        mockOAuthRepo,
        mockUserRepo as IUserRepository,
        mockSessionRepo as ISessionRepository,
      );

      expect(() => service.getAuthorizationUrl("google", "test_state")).toThrow(
        "OAuth provider google is not configured",
      );
    });
  });

  describe("createSession", () => {
    test("should create a session for user", async () => {
      const service = new OAuthService(
        mockOAuthRepo,
        mockUserRepo as IUserRepository,
        mockSessionRepo as ISessionRepository,
      );

      const token = await service.createSession("user1", "Test Agent", "127.0.0.1");

      expect(mockSessionRepo.create).toHaveBeenCalled();
      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.length).toBeGreaterThan(0);
    });

    test("should create session without optional parameters", async () => {
      const service = new OAuthService(
        mockOAuthRepo,
        mockUserRepo as IUserRepository,
        mockSessionRepo as ISessionRepository,
      );

      const token = await service.createSession("user1");

      expect(token).toBeDefined();
    });
  });

  describe("getLinkedAccounts", () => {
    test("should return linked OAuth accounts for user", async () => {
      const service = new OAuthService(
        mockOAuthRepo,
        mockUserRepo as IUserRepository,
        mockSessionRepo as ISessionRepository,
      );

      const accounts = await service.getLinkedAccounts("user1");

      expect(accounts).toEqual([mockOAuthAccount]);
      expect(mockOAuthRepo.findByUserId).toHaveBeenCalledWith("user1");
    });
  });

  describe("unlinkAccount", () => {
    test("should unlink OAuth account from user", async () => {
      // User has password, so can unlink
      (mockUserRepo.findById as ReturnType<typeof mock>).mockResolvedValue({
        ...mockUser,
        passwordHash: "$argon2id$v=19$m=65536,t=3,p=4$mock",
      });
      (mockOAuthRepo.countByUserId as ReturnType<typeof mock>).mockResolvedValue(1);

      const service = new OAuthService(
        mockOAuthRepo,
        mockUserRepo as IUserRepository,
        mockSessionRepo as ISessionRepository,
      );

      await service.unlinkAccount("user1", "github");

      expect(mockOAuthRepo.deleteByUserAndProvider).toHaveBeenCalledWith("user1", "github");
    });

    test("should throw error if it's the only login method", async () => {
      // User has no password and only 1 OAuth account
      (mockUserRepo.findById as ReturnType<typeof mock>).mockResolvedValue({
        ...mockUser,
        passwordHash: null,
      });
      (mockOAuthRepo.countByUserId as ReturnType<typeof mock>).mockResolvedValue(1);

      const service = new OAuthService(
        mockOAuthRepo,
        mockUserRepo as IUserRepository,
        mockSessionRepo as ISessionRepository,
      );

      await expect(service.unlinkAccount("user1", "github")).rejects.toThrow(
        "Cannot unlink the only login method",
      );
    });

    test("should allow unlink if user has multiple OAuth accounts", async () => {
      // User has no password but has 2 OAuth accounts
      (mockUserRepo.findById as ReturnType<typeof mock>).mockResolvedValue({
        ...mockUser,
        passwordHash: null,
      });
      (mockOAuthRepo.countByUserId as ReturnType<typeof mock>).mockResolvedValue(2);

      const service = new OAuthService(
        mockOAuthRepo,
        mockUserRepo as IUserRepository,
        mockSessionRepo as ISessionRepository,
      );

      await service.unlinkAccount("user1", "github");

      expect(mockOAuthRepo.deleteByUserAndProvider).toHaveBeenCalledWith("user1", "github");
    });
  });

  describe("sanitizeUsername", () => {
    test("should lowercase and clean username", () => {
      const service = new OAuthService(
        mockOAuthRepo,
        mockUserRepo as IUserRepository,
        mockSessionRepo as ISessionRepository,
      );

      // Access private method via any cast for testing
      const sanitize = (service as any).sanitizeUsername.bind(service);

      expect(sanitize("TestUser")).toBe("testuser");
      expect(sanitize("test.user")).toBe("testuser");
      expect(sanitize("test-user")).toBe("testuser");
      expect(sanitize("test_user")).toBe("test_user");
    });

    test("should truncate long usernames", () => {
      const service = new OAuthService(
        mockOAuthRepo,
        mockUserRepo as IUserRepository,
        mockSessionRepo as ISessionRepository,
      );

      const sanitize = (service as any).sanitizeUsername.bind(service);

      const longUsername = "a".repeat(30);
      const result = sanitize(longUsername);

      expect(result.length).toBeLessThanOrEqual(20);
    });

    test("should pad short usernames", () => {
      const service = new OAuthService(
        mockOAuthRepo,
        mockUserRepo as IUserRepository,
        mockSessionRepo as ISessionRepository,
      );

      const sanitize = (service as any).sanitizeUsername.bind(service);

      const result = sanitize("ab");

      expect(result.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("provider configurations", () => {
    test("should have correct GitHub scopes", () => {
      const service = new OAuthService(
        mockOAuthRepo,
        mockUserRepo as IUserRepository,
        mockSessionRepo as ISessionRepository,
      );

      const url = service.getAuthorizationUrl("github", "state");

      // GitHub needs read:user and user:email scopes
      expect(url).toContain("read%3Auser");
      expect(url).toContain("user%3Aemail");
    });

    test("should have correct Google scopes", () => {
      const service = new OAuthService(
        mockOAuthRepo,
        mockUserRepo as IUserRepository,
        mockSessionRepo as ISessionRepository,
      );

      const url = service.getAuthorizationUrl("google", "state");

      // Google needs email and profile scopes
      expect(url).toContain("email");
      expect(url).toContain("profile");
    });

    test("should have correct Discord scopes", () => {
      const service = new OAuthService(
        mockOAuthRepo,
        mockUserRepo as IUserRepository,
        mockSessionRepo as ISessionRepository,
      );

      const url = service.getAuthorizationUrl("discord", "state");

      // Discord needs identify and email scopes
      expect(url).toContain("identify");
      expect(url).toContain("email");
    });
  });

  describe("findOrCreateUser security", () => {
    const tokens = { access_token: "tok", token_type: "Bearer" };
    const openPolicy = { registrationEnabled: true, inviteOnly: false };
    const profile = {
      id: "999",
      username: "victim",
      email: "victim@example.com",
      displayName: "Victim",
      avatarUrl: null,
    };

    const makeService = (blocked?: (name: string) => boolean) =>
      new OAuthService(
        mockOAuthRepo,
        mockUserRepo as IUserRepository,
        mockSessionRepo as ISessionRepository,
        blocked
          ? {
              isUsernameBlocked: mock((name: string) =>
                Promise.resolve({ blocked: blocked(name) }),
              ),
            }
          : undefined,
      );

    test("logs in an already-linked provider account", async () => {
      (mockOAuthRepo.findByProviderAccount as ReturnType<typeof mock>).mockResolvedValue(
        mockOAuthAccount,
      );

      const result = await makeService().findOrCreateUser("github", profile, tokens, {
        registrationEnabled: false,
        inviteOnly: true,
      });

      // Existing links keep working even when registration is closed
      expect(result.isNew).toBe(false);
      expect(result.user.id).toBe("user1");
      expect(mockUserRepo.create).not.toHaveBeenCalled();
      expect(mockOAuthRepo.create).not.toHaveBeenCalled();
    });

    test("never auto-links to an existing account with the same email", async () => {
      (mockUserRepo.findByEmail as ReturnType<typeof mock>).mockResolvedValue(mockUser);

      await expect(
        makeService().findOrCreateUser("github", profile, tokens, openPolicy),
      ).rejects.toThrow("An account with this email already exists");

      expect(mockOAuthRepo.create).not.toHaveBeenCalled();
      expect(mockUserRepo.create).not.toHaveBeenCalled();
    });

    test("throws OAuthError with email_exists code", async () => {
      (mockUserRepo.findByEmail as ReturnType<typeof mock>).mockResolvedValue(mockUser);

      try {
        await makeService().findOrCreateUser("github", profile, tokens, openPolicy);
        throw new Error("expected rejection");
      } catch (err) {
        expect(err).toBeInstanceOf(OAuthError);
        expect((err as OAuthError).code).toBe("email_exists");
      }
    });

    test("refuses sign-up when registration is disabled", async () => {
      await expect(
        makeService().findOrCreateUser("github", profile, tokens, {
          registrationEnabled: false,
          inviteOnly: false,
        }),
      ).rejects.toThrow("Registration is currently disabled");
      expect(mockUserRepo.create).not.toHaveBeenCalled();
    });

    test("refuses sign-up when invite-only", async () => {
      await expect(
        makeService().findOrCreateUser("github", profile, tokens, {
          registrationEnabled: true,
          inviteOnly: true,
        }),
      ).rejects.toThrow("invitation code");
      expect(mockUserRepo.create).not.toHaveBeenCalled();
    });

    test("creates a new user with verified email when allowed", async () => {
      const result = await makeService().findOrCreateUser("github", profile, tokens, openPolicy);

      expect(result.isNew).toBe(true);
      const created = (mockUserRepo.create as ReturnType<typeof mock>).mock.calls[0]![0];
      expect(created.email).toBe("victim@example.com");
      expect(created.username).toBe("victim");
      expect(mockOAuthRepo.create).toHaveBeenCalled();
    });

    test("uses a placeholder email when the provider email is not verified", async () => {
      await makeService().findOrCreateUser(
        "discord",
        { ...profile, email: null },
        tokens,
        openPolicy,
      );

      expect(mockUserRepo.findByEmail).not.toHaveBeenCalled();
      const created = (mockUserRepo.create as ReturnType<typeof mock>).mock.calls[0]![0];
      expect(created.email).toBe("999@discord.oauth");
    });

    test("does not use a blocked username", async () => {
      await makeService((name) => name === "admin").findOrCreateUser(
        "github",
        { ...profile, username: "admin" },
        tokens,
        openPolicy,
      );

      const created = (mockUserRepo.create as ReturnType<typeof mock>).mock.calls[0]![0];
      expect(created.username).not.toBe("admin");
      expect(created.username.startsWith("user")).toBe(true);
    });

    test("refuses sign-up if no allowed username can be derived", async () => {
      await expect(
        makeService(() => true).findOrCreateUser("github", profile, tokens, openPolicy),
      ).rejects.toThrow("allowed username");
      expect(mockUserRepo.create).not.toHaveBeenCalled();
    });
  });

  describe("provider email verification", () => {
    const originalFetch = globalThis.fetch;

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    const mockFetchSequence = (bodies: unknown[]) => {
      let i = 0;
      globalThis.fetch = mock(() =>
        Promise.resolve(new Response(JSON.stringify(bodies[i++]), { status: 200 })),
      ) as unknown as typeof fetch;
    };

    const getProfile = (service: OAuthService, method: string, ...args: unknown[]) =>
      (service as any)[method](...args) as Promise<{ email: string | null }>;

    test("drops unverified Discord email", async () => {
      mockFetchSequence([{ id: "1", username: "u", email: "v@example.com", verified: false }]);
      const service = new OAuthService(
        mockOAuthRepo,
        mockUserRepo as IUserRepository,
        mockSessionRepo as ISessionRepository,
      );
      expect((await getProfile(service, "getDiscordProfile", "t")).email).toBeNull();
    });

    test("keeps verified Discord email", async () => {
      mockFetchSequence([{ id: "1", username: "u", email: "v@example.com", verified: true }]);
      const service = new OAuthService(
        mockOAuthRepo,
        mockUserRepo as IUserRepository,
        mockSessionRepo as ISessionRepository,
      );
      expect((await getProfile(service, "getDiscordProfile", "t")).email).toBe("v@example.com");
    });

    test("drops unverified Google email", async () => {
      mockFetchSequence([{ id: "1", email: "v@example.com", verified_email: false }]);
      const service = new OAuthService(
        mockOAuthRepo,
        mockUserRepo as IUserRepository,
        mockSessionRepo as ISessionRepository,
      );
      expect((await getProfile(service, "getGoogleProfile", "t")).email).toBeNull();
    });

    test("keeps verified Google email", async () => {
      mockFetchSequence([{ id: "1", email: "v@example.com", verified_email: true }]);
      const service = new OAuthService(
        mockOAuthRepo,
        mockUserRepo as IUserRepository,
        mockSessionRepo as ISessionRepository,
      );
      expect((await getProfile(service, "getGoogleProfile", "t")).email).toBe("v@example.com");
    });

    test("drops unverified GitHub public email", async () => {
      mockFetchSequence([
        { id: 1, login: "u", name: null, email: "v@example.com", avatar_url: null },
        [{ email: "v@example.com", primary: true, verified: false }],
      ]);
      const service = new OAuthService(
        mockOAuthRepo,
        mockUserRepo as IUserRepository,
        mockSessionRepo as ISessionRepository,
      );
      expect((await getProfile(service, "getGitHubProfile", "t")).email).toBeNull();
    });

    test("selectVerifiedGitHubEmail prefers verified public email, then primary verified", () => {
      const emails = [
        { email: "primary@example.com", primary: true, verified: true },
        { email: "public@example.com", primary: false, verified: true },
        { email: "unverified@example.com", primary: false, verified: false },
      ];
      expect(selectVerifiedGitHubEmail("public@example.com", emails)).toBe("public@example.com");
      expect(selectVerifiedGitHubEmail("unverified@example.com", emails)).toBe(
        "primary@example.com",
      );
      expect(selectVerifiedGitHubEmail(null, emails)).toBe("primary@example.com");
      expect(
        selectVerifiedGitHubEmail(null, [{ email: "a@b.c", primary: true, verified: false }]),
      ).toBeNull();
    });

    test("isGoogleEmailVerified requires an explicit true flag", () => {
      expect(isGoogleEmailVerified({})).toBe(false);
      expect(isGoogleEmailVerified({ verified_email: false })).toBe(false);
      expect(isGoogleEmailVerified({ verified_email: true })).toBe(true);
      expect(isGoogleEmailVerified({ email_verified: true })).toBe(true);
    });
  });

  describe("linkProfile", () => {
    const tokens = { access_token: "tok", token_type: "Bearer" };
    const profile = {
      id: "555",
      username: "gh",
      email: null,
      displayName: null,
      avatarUrl: null,
    };

    test("links provider to the given user", async () => {
      const service = new OAuthService(
        mockOAuthRepo,
        mockUserRepo as IUserRepository,
        mockSessionRepo as ISessionRepository,
      );
      await service.linkProfile("user1", "github", profile, tokens);
      const created = (mockOAuthRepo.create as ReturnType<typeof mock>).mock.calls[0]![0];
      expect(created.userId).toBe("user1");
      expect(created.providerAccountId).toBe("555");
    });

    test("refuses if provider account is linked to another user", async () => {
      (mockOAuthRepo.findByProviderAccount as ReturnType<typeof mock>).mockResolvedValue({
        ...mockOAuthAccount,
        userId: "other",
      });
      const service = new OAuthService(
        mockOAuthRepo,
        mockUserRepo as IUserRepository,
        mockSessionRepo as ISessionRepository,
      );
      await expect(service.linkProfile("user1", "github", profile, tokens)).rejects.toThrow(
        "already linked to another user",
      );
      expect(mockOAuthRepo.create).not.toHaveBeenCalled();
    });
  });

  describe("hasUsablePassword", () => {
    test("treats OAuth placeholder hashes as unusable", () => {
      expect(hasUsablePassword("oauth:github:abc")).toBe(false);
      expect(hasUsablePassword(null)).toBe(false);
      expect(hasUsablePassword("")).toBe(false);
      expect(hasUsablePassword("$argon2id$v=19$hash")).toBe(true);
    });

    test("prevents OAuth-only users from unlinking their only login method", async () => {
      // mockUser has an OAuth placeholder hash and a single link
      (mockOAuthRepo.countByUserId as ReturnType<typeof mock>).mockResolvedValue(1);
      const service = new OAuthService(
        mockOAuthRepo,
        mockUserRepo as IUserRepository,
        mockSessionRepo as ISessionRepository,
      );
      await expect(service.unlinkAccount("user1", "github")).rejects.toThrow(
        "Cannot unlink the only login method",
      );
    });
  });
});
