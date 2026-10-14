/**
 * OAuth Service
 *
 * Handles OAuth authentication flow for external providers.
 * Supports GitHub, Google, Discord, and Mastodon.
 *
 * @module services/OAuthService
 */

import { generateId } from "shared";
import type {
  IOAuthAccountRepository,
  OAuthProvider,
} from "../interfaces/repositories/IOAuthAccountRepository.js";
import type { IUserRepository } from "../interfaces/repositories/IUserRepository.js";
import type { ISessionRepository } from "../interfaces/repositories/ISessionRepository.js";
import type { User, OAuthAccount } from "../db/schema/pg.js";
import { logger } from "../lib/logger.js";
import { generateKeyPair } from "../utils/crypto.js";
import type { BlockedUsernameService } from "./BlockedUsernameService.js";
import type { EventBus } from "../lib/events.js";
import { toPluginUser } from "../plugins/utils.js";
import type { RegistrationPolicy } from "../lib/registrationPolicy.js";

/**
 * Prefix of the placeholder password hash given to OAuth-created users.
 * Such hashes can never match a password.
 */
const OAUTH_PASSWORD_HASH_PREFIX = "oauth:";

/**
 * Registration policy applied when an OAuth login would create a new account.
 */
export type OAuthRegistrationPolicy = RegistrationPolicy;

/**
 * Error codes raised by OAuthService for user-facing failures.
 */
export type OAuthErrorCode =
  | "email_exists"
  | "registration_disabled"
  | "invite_only"
  | "registration_cancelled"
  | "username_not_allowed"
  | "already_linked"
  | "linked_to_other_user";

/**
 * User-facing OAuth error. The message is safe to show to end users.
 */
export class OAuthError extends Error {
  /**
   * @param code - Machine-readable error code
   * @param message - Human-readable message safe to display
   */
  constructor(
    public readonly code: OAuthErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "OAuthError";
  }
}

/**
 * Whether a stored password hash can actually be used for password login.
 *
 * @param passwordHash - Stored password hash (may be an OAuth placeholder)
 * @returns False for empty hashes and OAuth placeholder hashes
 */
export function hasUsablePassword(passwordHash: string | null | undefined): boolean {
  return !!passwordHash && !passwordHash.startsWith(OAUTH_PASSWORD_HASH_PREFIX);
}

/**
 * Select a verified email from GitHub's `/user/emails` response.
 *
 * Prefers the public profile email when it is listed as verified, otherwise the
 * primary verified email. Unverified addresses are never returned.
 *
 * @param publicEmail - Email from the public profile (carries no verification flag)
 * @param emails - Entries from `GET /user/emails`
 * @returns A verified email or null
 */
export function selectVerifiedGitHubEmail(
  publicEmail: string | null,
  emails: GitHubEmail[],
): string | null {
  if (publicEmail) {
    const match = emails.find(
      (e) => e.verified && e.email.toLowerCase() === publicEmail.toLowerCase(),
    );
    if (match) return match.email;
  }
  return emails.find((e) => e.primary && e.verified)?.email ?? null;
}

/**
 * Whether a Google userinfo response reports the email as verified.
 *
 * @param user - Google userinfo response (v2 or OIDC shape)
 * @returns True only when Google explicitly marks the email as verified
 */
export function isGoogleEmailVerified(user: {
  verified_email?: boolean;
  email_verified?: boolean;
}): boolean {
  return user.verified_email === true || user.email_verified === true;
}

/**
 * GitHub user profile response
 */
interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
}

/**
 * GitHub email response
 */
export interface GitHubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
}

/**
 * Google user profile response
 */
interface GoogleUser {
  id: string;
  email?: string;
  /** Whether Google has verified the email address (v2 userinfo) */
  verified_email?: boolean;
  /** Whether Google has verified the email address (OIDC userinfo) */
  email_verified?: boolean;
  name?: string;
  picture?: string;
}

/**
 * Discord user profile response
 */
interface DiscordUser {
  id: string;
  username: string;
  global_name?: string;
  email?: string;
  /** Whether the email on the Discord account has been verified */
  verified?: boolean;
  avatar?: string;
}

/**
 * Mastodon user profile response
 */
interface MastodonUser {
  id: string;
  username: string;
  display_name?: string;
  avatar?: string;
}

/**
 * OAuth token error response
 */
interface OAuthErrorResponse {
  error?: string;
  error_description?: string;
}

/**
 * OAuth provider configuration
 */
export interface OAuthProviderConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  // Mastodon-specific: instance URL
  instanceUrl?: string;
}

/**
 * OAuth token response from provider
 */
interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
}

/**
 * Normalized user profile from OAuth provider
 */
export interface OAuthUserProfile {
  id: string;
  username: string;
  /**
   * Email address reported by the provider.
   * Only set when the provider has verified the address; otherwise null.
   */
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}

/**
 * OAuth Service for handling external authentication
 */
export class OAuthService {
  private configs: Partial<Record<OAuthProvider, OAuthProviderConfig>> = {};

  constructor(
    private oauthAccountRepository: IOAuthAccountRepository,
    private userRepository: IUserRepository,
    private sessionRepository: ISessionRepository,
    private blockedUsernameService?: Pick<BlockedUsernameService, "isUsernameBlocked">,
    private eventBus?: EventBus,
  ) {
    // Load configs from environment
    this.loadConfigs();
  }

  /**
   * Load OAuth provider configurations from environment variables
   */
  private loadConfigs(): void {
    // GitHub
    if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
      this.configs.github = {
        clientId: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        redirectUri: process.env.GITHUB_REDIRECT_URI || `${process.env.URL}/auth/callback/github`,
      };
    }

    // Google
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      this.configs.google = {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        redirectUri: process.env.GOOGLE_REDIRECT_URI || `${process.env.URL}/auth/callback/google`,
      };
    }

    // Discord
    if (process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET) {
      this.configs.discord = {
        clientId: process.env.DISCORD_CLIENT_ID,
        clientSecret: process.env.DISCORD_CLIENT_SECRET,
        redirectUri: process.env.DISCORD_REDIRECT_URI || `${process.env.URL}/auth/callback/discord`,
      };
    }

    // Mastodon (requires instance URL)
    if (
      process.env.MASTODON_CLIENT_ID &&
      process.env.MASTODON_CLIENT_SECRET &&
      process.env.MASTODON_INSTANCE_URL
    ) {
      this.configs.mastodon = {
        clientId: process.env.MASTODON_CLIENT_ID,
        clientSecret: process.env.MASTODON_CLIENT_SECRET,
        redirectUri:
          process.env.MASTODON_REDIRECT_URI || `${process.env.URL}/auth/callback/mastodon`,
        instanceUrl: process.env.MASTODON_INSTANCE_URL,
      };
    }
  }

  /**
   * Check if a provider is configured
   */
  isProviderEnabled(provider: OAuthProvider): boolean {
    return !!this.configs[provider];
  }

  /**
   * Get list of enabled providers
   */
  getEnabledProviders(): OAuthProvider[] {
    return Object.keys(this.configs) as OAuthProvider[];
  }

  /**
   * Get OAuth authorization URL for a provider
   */
  getAuthorizationUrl(provider: OAuthProvider, state: string): string {
    const config = this.configs[provider];
    if (!config) {
      throw new Error(`OAuth provider ${provider} is not configured`);
    }

    switch (provider) {
      case "github":
        return this.getGitHubAuthUrl(config, state);
      case "google":
        return this.getGoogleAuthUrl(config, state);
      case "discord":
        return this.getDiscordAuthUrl(config, state);
      case "mastodon":
        return this.getMastodonAuthUrl(config, state);
      default:
        throw new Error(`Unknown OAuth provider: ${provider}`);
    }
  }

  private getGitHubAuthUrl(config: OAuthProviderConfig, state: string): string {
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      scope: "read:user user:email",
      state,
    });
    return `https://github.com/login/oauth/authorize?${params}`;
  }

  private getGoogleAuthUrl(config: OAuthProviderConfig, state: string): string {
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: "code",
      scope: "openid email profile",
      state,
      access_type: "offline",
      prompt: "consent",
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }

  private getDiscordAuthUrl(config: OAuthProviderConfig, state: string): string {
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: "code",
      scope: "identify email",
      state,
    });
    return `https://discord.com/api/oauth2/authorize?${params}`;
  }

  private getMastodonAuthUrl(config: OAuthProviderConfig, state: string): string {
    if (!config.instanceUrl) {
      throw new Error("Mastodon instance URL is required");
    }
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: "code",
      scope: "read:accounts",
      state,
    });
    return `${config.instanceUrl}/oauth/authorize?${params}`;
  }

  /**
   * Exchange authorization code for tokens and get user profile
   */
  async handleCallback(
    provider: OAuthProvider,
    code: string,
  ): Promise<{ tokens: OAuthTokenResponse; profile: OAuthUserProfile }> {
    const config = this.configs[provider];
    if (!config) {
      throw new Error(`OAuth provider ${provider} is not configured`);
    }

    // Exchange code for tokens
    const tokens = await this.exchangeCode(provider, config, code);

    // Get user profile
    const profile = await this.getUserProfile(provider, config, tokens.access_token);

    return { tokens, profile };
  }

  private async exchangeCode(
    provider: OAuthProvider,
    config: OAuthProviderConfig,
    code: string,
  ): Promise<OAuthTokenResponse> {
    switch (provider) {
      case "github":
        return this.exchangeGitHubCode(config, code);
      case "google":
        return this.exchangeGoogleCode(config, code);
      case "discord":
        return this.exchangeDiscordCode(config, code);
      case "mastodon":
        return this.exchangeMastodonCode(config, code);
      default:
        throw new Error(`Unknown OAuth provider: ${provider}`);
    }
  }

  private async exchangeGitHubCode(
    config: OAuthProviderConfig,
    code: string,
  ): Promise<OAuthTokenResponse> {
    const response = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        redirect_uri: config.redirectUri,
      }),
    });

    if (!response.ok) {
      throw new Error(`GitHub token exchange failed: ${response.status}`);
    }

    const data = (await response.json()) as OAuthTokenResponse & OAuthErrorResponse;
    if (data.error) {
      throw new Error(`GitHub OAuth error: ${data.error_description || data.error}`);
    }

    return data as OAuthTokenResponse;
  }

  private async exchangeGoogleCode(
    config: OAuthProviderConfig,
    code: string,
  ): Promise<OAuthTokenResponse> {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        redirect_uri: config.redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!response.ok) {
      throw new Error(`Google token exchange failed: ${response.status}`);
    }

    const data = (await response.json()) as OAuthTokenResponse & OAuthErrorResponse;
    if (data.error) {
      throw new Error(`Google OAuth error: ${data.error_description || data.error}`);
    }

    return data as OAuthTokenResponse;
  }

  private async exchangeDiscordCode(
    config: OAuthProviderConfig,
    code: string,
  ): Promise<OAuthTokenResponse> {
    const response = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        redirect_uri: config.redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!response.ok) {
      throw new Error(`Discord token exchange failed: ${response.status}`);
    }

    const data = (await response.json()) as OAuthTokenResponse & OAuthErrorResponse;
    if (data.error) {
      throw new Error(`Discord OAuth error: ${data.error_description || data.error}`);
    }

    return data as OAuthTokenResponse;
  }

  private async exchangeMastodonCode(
    config: OAuthProviderConfig,
    code: string,
  ): Promise<OAuthTokenResponse> {
    if (!config.instanceUrl) {
      throw new Error("Mastodon instance URL is required");
    }

    const response = await fetch(`${config.instanceUrl}/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        redirect_uri: config.redirectUri,
        grant_type: "authorization_code",
        scope: "read:accounts",
      }),
    });

    if (!response.ok) {
      throw new Error(`Mastodon token exchange failed: ${response.status}`);
    }

    const data = (await response.json()) as OAuthTokenResponse & OAuthErrorResponse;
    if (data.error) {
      throw new Error(`Mastodon OAuth error: ${data.error_description || data.error}`);
    }

    return data as OAuthTokenResponse;
  }

  private async getUserProfile(
    provider: OAuthProvider,
    config: OAuthProviderConfig,
    accessToken: string,
  ): Promise<OAuthUserProfile> {
    switch (provider) {
      case "github":
        return this.getGitHubProfile(accessToken);
      case "google":
        return this.getGoogleProfile(accessToken);
      case "discord":
        return this.getDiscordProfile(accessToken);
      case "mastodon":
        return this.getMastodonProfile(config, accessToken);
      default:
        throw new Error(`Unknown OAuth provider: ${provider}`);
    }
  }

  private async getGitHubProfile(accessToken: string): Promise<OAuthUserProfile> {
    // Get user info
    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!userResponse.ok) {
      throw new Error(`Failed to get GitHub user profile: ${userResponse.status}`);
    }

    const user = (await userResponse.json()) as GitHubUser;

    // Only trust emails that GitHub reports as verified. The public profile
    // email carries no verification flag, so always consult /user/emails.
    let email: string | null = null;
    const emailResponse = await fetch("https://api.github.com/user/emails", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (emailResponse.ok) {
      const emails = (await emailResponse.json()) as GitHubEmail[];
      email = selectVerifiedGitHubEmail(user.email, emails);
    }

    return {
      id: String(user.id),
      username: user.login,
      email,
      displayName: user.name || null,
      avatarUrl: user.avatar_url || null,
    };
  }

  private async getGoogleProfile(accessToken: string): Promise<OAuthUserProfile> {
    const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get Google user profile: ${response.status}`);
    }

    const user = (await response.json()) as GoogleUser;

    return {
      id: user.id,
      username: user.email?.split("@")[0] || user.id,
      email: isGoogleEmailVerified(user) ? user.email || null : null,
      displayName: user.name || null,
      avatarUrl: user.picture || null,
    };
  }

  private async getDiscordProfile(accessToken: string): Promise<OAuthUserProfile> {
    const response = await fetch("https://discord.com/api/users/@me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get Discord user profile: ${response.status}`);
    }

    const user = (await response.json()) as DiscordUser;

    // Discord avatar URL
    let avatarUrl: string | null = null;
    if (user.avatar) {
      const ext = user.avatar.startsWith("a_") ? "gif" : "png";
      avatarUrl = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}`;
    }

    return {
      id: user.id,
      username: user.username,
      email: user.verified === true ? user.email || null : null,
      displayName: user.global_name || user.username,
      avatarUrl,
    };
  }

  private async getMastodonProfile(
    config: OAuthProviderConfig,
    accessToken: string,
  ): Promise<OAuthUserProfile> {
    if (!config.instanceUrl) {
      throw new Error("Mastodon instance URL is required");
    }

    const response = await fetch(`${config.instanceUrl}/api/v1/accounts/verify_credentials`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get Mastodon user profile: ${response.status}`);
    }

    const user = (await response.json()) as MastodonUser;

    return {
      id: user.id,
      username: user.username,
      email: null, // Mastodon doesn't expose email
      displayName: user.display_name || null,
      avatarUrl: user.avatar || null,
    };
  }

  /**
   * Find or create a user from an OAuth profile.
   *
   * Security rules:
   * - A provider identity is only ever resolved through an existing OAuth link row.
   * - It is never auto-linked to an existing local account by email. Rox does not
   *   verify local emails, and some providers report unverified emails, so an email
   *   match is not proof of ownership. Users must log in and link explicitly.
   * - New accounts are subject to the same registration gating as password sign-up
   *   (registration enabled, invite-only mode, blocked usernames, plugin veto).
   *
   * @param provider - OAuth provider
   * @param profile - Normalized provider profile (email is only set when verified)
   * @param tokens - Provider token response
   * @param policy - Current instance registration policy
   * @returns The user, whether it was newly created, and the OAuth account link
   * @throws {OAuthError} When an account with the same email exists, or sign-up is not allowed
   */
  async findOrCreateUser(
    provider: OAuthProvider,
    profile: OAuthUserProfile,
    tokens: OAuthTokenResponse,
    policy: OAuthRegistrationPolicy,
  ): Promise<{ user: User; isNew: boolean; oauthAccount: OAuthAccount }> {
    // Check if OAuth account already exists
    const existingOAuthAccount = await this.oauthAccountRepository.findByProviderAccount(
      provider,
      profile.id,
    );

    if (existingOAuthAccount) {
      // Update tokens
      const updatedAccount = await this.oauthAccountRepository.updateTokens(
        existingOAuthAccount.id,
        {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || null,
          tokenExpiresAt: tokens.expires_in
            ? new Date(Date.now() + tokens.expires_in * 1000)
            : null,
          scope: tokens.scope || null,
        },
      );

      const user = await this.userRepository.findById(existingOAuthAccount.userId);
      if (!user) {
        throw new Error("User not found for OAuth account");
      }

      logger.info({ provider, userId: user.id }, "OAuth login: existing user");
      return { user, isNew: false, oauthAccount: updatedAccount };
    }

    // Never auto-link by email: refuse if a local account already uses this email.
    if (profile.email) {
      const emailOwner = await this.userRepository.findByEmail(profile.email);
      if (emailOwner) {
        logger.warn(
          { provider, userId: emailOwner.id },
          "OAuth login refused: email already belongs to an existing account",
        );
        throw new OAuthError(
          "email_exists",
          "An account with this email already exists. Log in and link the provider from settings.",
        );
      }
    }

    // New account: apply registration gating
    if (!policy.registrationEnabled) {
      throw new OAuthError("registration_disabled", "Registration is currently disabled");
    }
    if (policy.inviteOnly) {
      throw new OAuthError(
        "invite_only",
        "Registration on this server requires an invitation code. Sign up with an invitation code first, then link the provider from settings.",
      );
    }

    const username = await this.pickAvailableUsername(profile.username);

    // Let plugins veto or adjust the registration (same hook as password sign-up)
    let displayName = profile.displayName;
    if (this.eventBus) {
      const beforeResult = await this.eventBus.emitBefore("user:beforeRegister", {
        username,
        displayName,
      });
      if (beforeResult.cancelled) {
        throw new OAuthError(
          "registration_cancelled",
          beforeResult.cancelReason || "Registration cancelled by plugin",
        );
      }
      if (beforeResult.modifiedPayload) {
        displayName = beforeResult.modifiedPayload.displayName ?? displayName;
      }
    }

    // Generate ActivityPub keypair for OAuth users
    const { publicKey, privateKey } = generateKeyPair();
    const baseUrl = process.env.URL || "http://localhost:3000";

    const user = await this.userRepository.create({
      id: generateId(),
      username,
      // Only verified provider emails are stored; otherwise use a non-routable placeholder
      // (the column is NOT NULL + UNIQUE).
      email: profile.email || `${profile.id}@${provider}.oauth`,
      // OAuth-only users get a random unusable password hash
      // This hash is not a valid bcrypt hash, so password login will always fail
      passwordHash: `${OAUTH_PASSWORD_HASH_PREFIX}${provider}:${generateId()}`,
      displayName,
      host: null, // Local user
      avatarUrl: profile.avatarUrl,
      bannerUrl: null,
      bio: null,
      isAdmin: false,
      isSuspended: false,
      isDeleted: false,
      deletedAt: null,
      isSystemUser: false,
      publicKey,
      privateKey,
      customCss: null,
      uiSettings: null,
      // ActivityPub fields for local users
      inbox: `${baseUrl}/users/${username}/inbox`,
      outbox: `${baseUrl}/users/${username}/outbox`,
      followersUrl: `${baseUrl}/users/${username}/followers`,
      followingUrl: `${baseUrl}/users/${username}/following`,
      uri: `${baseUrl}/users/${username}`,
      sharedInbox: null,
      // Account migration fields
      alsoKnownAs: [],
      movedTo: null,
      movedAt: null,
      // Profile emojis
      profileEmojis: [],
      // Storage quota
      storageQuotaMb: null,
      // Remote actor fetch status (not applicable to local users)
      goneDetectedAt: null,
      fetchFailureCount: 0,
      lastFetchAttemptAt: null,
      lastFetchError: null,
      // Follower/following counts start at 0
      followersCount: 0,
      followingCount: 0,
    });

    logger.info({ provider, userId: user.id, username }, "OAuth login: new user created");

    if (this.eventBus) {
      this.eventBus.emit("user:afterRegister", { user: toPluginUser(user) }).catch((error) => {
        logger.error({ err: error, userId: user.id }, "Failed to emit user:afterRegister event");
      });
    }

    const oauthAccount = await this.createLink(user.id, provider, profile, tokens);

    return { user, isNew: true, oauthAccount };
  }

  /**
   * Pick a unique, non-blocked username derived from the provider username.
   *
   * @param providerUsername - Username reported by the provider
   * @returns An available username
   * @throws {OAuthError} When no allowed username could be derived
   */
  private async pickAvailableUsername(providerUsername: string): Promise<string> {
    // Fallback base (random) is used if the derived name is blocked (e.g. reserved words)
    const candidates = [
      this.sanitizeUsername(providerUsername),
      this.sanitizeUsername(`user${generateId().substring(0, 8)}`),
    ];

    for (const baseUsername of candidates) {
      if (await this.isUsernameBlocked(baseUsername)) continue;

      let username = baseUsername;
      let attempt = 0;
      while (await this.userRepository.findByUsername(username)) {
        attempt++;
        const suffix = String(attempt);
        username = `${baseUsername.substring(0, 20 - suffix.length)}${suffix}`;
      }

      if (username === baseUsername || !(await this.isUsernameBlocked(username))) {
        return username;
      }
    }

    throw new OAuthError(
      "username_not_allowed",
      "Could not derive an allowed username from your account. Please register with a password instead.",
    );
  }

  /**
   * Check a username against the blocked/reserved username list.
   *
   * @param username - Candidate username
   * @returns True if the username must not be used
   */
  private async isUsernameBlocked(username: string): Promise<boolean> {
    if (!this.blockedUsernameService) return false;
    const result = await this.blockedUsernameService.isUsernameBlocked(username);
    return result.blocked;
  }

  /**
   * Persist an OAuth link row for a user.
   *
   * @param userId - Local user ID
   * @param provider - OAuth provider
   * @param profile - Provider profile
   * @param tokens - Provider token response
   * @returns The created OAuth account link
   */
  private createLink(
    userId: string,
    provider: OAuthProvider,
    profile: OAuthUserProfile,
    tokens: OAuthTokenResponse,
  ): Promise<OAuthAccount> {
    return this.oauthAccountRepository.create({
      id: generateId(),
      userId,
      provider,
      providerAccountId: profile.id,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || null,
      tokenExpiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
      scope: tokens.scope || null,
      tokenType: tokens.token_type || "Bearer",
      providerUsername: profile.username,
      providerEmail: profile.email,
    });
  }

  /**
   * Create a session for the user
   * @param userId - User ID
   * @param userAgent - Optional user agent string
   * @param ipAddress - Optional IP address
   */
  async createSession(userId: string, userAgent?: string, ipAddress?: string): Promise<string> {
    const sessionExpiryDays = parseInt(process.env.SESSION_EXPIRY_DAYS || "30", 10);
    const token = generateId() + generateId(); // 32 char token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + sessionExpiryDays);

    await this.sessionRepository.create({
      id: generateId(),
      userId,
      token,
      expiresAt,
      userAgent: userAgent || null,
      ipAddress: ipAddress || null,
    });

    return token;
  }

  /**
   * Link an OAuth account to an existing (authenticated) user by exchanging a code.
   *
   * @param userId - ID of the authenticated user
   * @param provider - OAuth provider
   * @param code - Authorization code returned by the provider
   * @returns The created OAuth account link
   */
  async linkAccount(userId: string, provider: OAuthProvider, code: string): Promise<OAuthAccount> {
    // Check if already linked (before spending the code)
    const existing = await this.oauthAccountRepository.findByUserAndProvider(userId, provider);
    if (existing) {
      throw new OAuthError("already_linked", `${provider} account is already linked`);
    }

    // Exchange code and get profile
    const { tokens, profile } = await this.handleCallback(provider, code);

    return this.linkProfile(userId, provider, profile, tokens);
  }

  /**
   * Link an already-fetched provider profile to an existing (authenticated) user.
   *
   * The caller is responsible for having authenticated `userId` and for having
   * verified the OAuth state that binds this callback to that user.
   *
   * @param userId - ID of the authenticated user
   * @param provider - OAuth provider
   * @param profile - Provider profile obtained from the callback
   * @param tokens - Provider token response
   * @returns The created OAuth account link
   * @throws {OAuthError} When the user already has this provider linked, or the
   *   provider account is linked to another user
   */
  async linkProfile(
    userId: string,
    provider: OAuthProvider,
    profile: OAuthUserProfile,
    tokens: OAuthTokenResponse,
  ): Promise<OAuthAccount> {
    const existing = await this.oauthAccountRepository.findByUserAndProvider(userId, provider);
    if (existing) {
      throw new OAuthError("already_linked", `${provider} account is already linked`);
    }

    // Check if this provider account is linked to another user
    const otherLink = await this.oauthAccountRepository.findByProviderAccount(provider, profile.id);
    if (otherLink) {
      throw new OAuthError(
        "linked_to_other_user",
        `This ${provider} account is already linked to another user`,
      );
    }

    const oauthAccount = await this.createLink(userId, provider, profile, tokens);

    logger.info({ provider, userId }, "OAuth account linked");
    return oauthAccount;
  }

  /**
   * Unlink OAuth account from user
   */
  async unlinkAccount(userId: string, provider: OAuthProvider): Promise<void> {
    // Check if user has other login methods before unlinking
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Count linked OAuth accounts
    const linkedAccounts = await this.oauthAccountRepository.countByUserId(userId);

    // User must have a usable password or at least one other OAuth account.
    // OAuth-created users carry a placeholder hash that can never be used to log in.
    if (!hasUsablePassword(user.passwordHash) && linkedAccounts <= 1) {
      throw new Error("Cannot unlink the only login method. Set a password first.");
    }

    await this.oauthAccountRepository.deleteByUserAndProvider(userId, provider);
    logger.info({ provider, userId }, "OAuth account unlinked");
  }

  /**
   * Get linked OAuth accounts for user
   */
  async getLinkedAccounts(userId: string): Promise<OAuthAccount[]> {
    return this.oauthAccountRepository.findByUserId(userId);
  }

  /**
   * Sanitize username for use in this system
   */
  private sanitizeUsername(username: string): string {
    // Remove non-alphanumeric characters except underscore
    let sanitized = username.replace(/[^a-zA-Z0-9_]/g, "");

    // Ensure it starts with a letter
    if (!/^[a-zA-Z]/.test(sanitized)) {
      sanitized = "user" + sanitized;
    }

    // Truncate to max length
    if (sanitized.length > 20) {
      sanitized = sanitized.substring(0, 20);
    }

    // Ensure minimum length
    if (sanitized.length < 3) {
      sanitized = sanitized + generateId().substring(0, 3 - sanitized.length);
    }

    return sanitized.toLowerCase();
  }
}
