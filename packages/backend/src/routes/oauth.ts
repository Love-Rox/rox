/**
 * OAuth Authentication Routes
 *
 * Provides endpoints for OAuth authentication with external providers.
 * Supports GitHub, Google, Discord, and Mastodon.
 *
 * @module routes/oauth
 */

import { Hono } from "hono";
import { setCookie, getCookie } from "hono/cookie";
import { OAuthService, OAuthError } from "../services/OAuthService.js";
import { AuthService } from "../services/AuthService.js";
import { requireAuth } from "../middleware/auth.js";
import { rateLimit, RateLimitPresets } from "../middleware/rateLimit.js";
import { logger } from "../lib/logger.js";
import { getRegistrationPolicy } from "../lib/registrationPolicy.js";
import { generateId } from "shared";
import type { Context } from "hono";
import type { OAuthProvider } from "../interfaces/repositories/IOAuthAccountRepository.js";

const app = new Hono();

// State cookie name for CSRF protection (login / sign-up flow)
const STATE_COOKIE_NAME = "oauth_state";
// State cookie for the account-linking flow. Its value binds the state to the
// initiating session token, so it cannot be forged for another user.
const LINK_STATE_COOKIE_NAME = "oauth_link_state";
const STATE_COOKIE_MAX_AGE = 600; // 10 minutes

/**
 * Get OAuth service instance from the Hono context's DI container.
 *
 * @param c - Hono request context
 * @returns Configured OAuthService instance
 */
const getOAuthService = (c: Context): OAuthService => {
  const oauthAccountRepository = c.get("oauthAccountRepository");
  const userRepository = c.get("userRepository");
  const sessionRepository = c.get("sessionRepository");
  return new OAuthService(
    oauthAccountRepository,
    userRepository,
    sessionRepository,
    c.get("blockedUsernameService"),
    c.get("eventBus"),
  );
};

/**
 * Validate that a string is a supported OAuth provider.
 *
 * @param provider - Provider name to validate
 * @returns True if the provider is supported
 */
const isValidProvider = (provider: string): provider is OAuthProvider => {
  return ["github", "google", "discord", "mastodon"].includes(provider);
};

/**
 * Set (or clear, when maxAge is 0) a short-lived httpOnly OAuth state cookie.
 *
 * @param c - Hono request context
 * @param name - Cookie name
 * @param value - Cookie value
 * @param maxAge - Lifetime in seconds
 */
const setStateCookie = (c: Context, name: string, value: string, maxAge: number): void => {
  setCookie(c, name, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Lax",
    maxAge,
    path: "/",
  });
};

/**
 * Build the link-state cookie value binding a state to a session token.
 *
 * @param state - Random OAuth state
 * @param sessionToken - Session token of the user who initiated linking
 * @returns Cookie value
 */
const buildLinkStateValue = (state: string, sessionToken: string): string =>
  `${state}.${sessionToken}`;

/**
 * Parse a link-state cookie value.
 *
 * @param value - Cookie value
 * @returns State and session token, or null if malformed
 */
const parseLinkStateValue = (
  value: string | undefined,
): { state: string; sessionToken: string } | null => {
  if (!value) return null;
  const idx = value.indexOf(".");
  if (idx <= 0 || idx === value.length - 1) return null;
  return { state: value.substring(0, idx), sessionToken: value.substring(idx + 1) };
};

/**
 * Get a user-safe message for an OAuth failure.
 *
 * @param error - Caught error
 * @param fallback - Message to use for unexpected errors
 * @returns Message safe to show to end users
 */
const toUserMessage = (error: unknown, fallback: string): string =>
  error instanceof OAuthError ? error.message : fallback;

/**
 * Get enabled OAuth providers
 *
 * GET /api/auth/oauth/providers
 *
 * Returns list of enabled OAuth providers based on environment configuration.
 */
app.get("/providers", async (c) => {
  const oauthService = getOAuthService(c);
  const providers = oauthService.getEnabledProviders();

  return c.json({
    providers: providers.map((provider) => ({
      id: provider,
      name: provider.charAt(0).toUpperCase() + provider.slice(1),
    })),
  });
});

/**
 * Initiate OAuth authorization
 *
 * GET /api/auth/oauth/:provider/authorize
 *
 * Redirects user to OAuth provider's authorization page.
 * Sets a state cookie for CSRF protection.
 */
app.get("/:provider/authorize", rateLimit(RateLimitPresets.login), async (c) => {
  const provider = c.req.param("provider")!;

  if (!isValidProvider(provider)) {
    return c.json({ error: "Invalid OAuth provider" }, 400);
  }

  try {
    const oauthService = getOAuthService(c);

    if (!oauthService.isProviderEnabled(provider)) {
      return c.json({ error: `${provider} OAuth is not configured` }, 400);
    }

    // Generate state for CSRF protection
    const state = generateId();
    setStateCookie(c, STATE_COOKIE_NAME, state, STATE_COOKIE_MAX_AGE);
    // A plain login must never be mistaken for a pending link flow
    setStateCookie(c, LINK_STATE_COOKIE_NAME, "", 0);

    // Get authorization URL
    const authUrl = oauthService.getAuthorizationUrl(provider, state);

    // Redirect to provider
    return c.redirect(authUrl);
  } catch (error) {
    logger.error({ err: error, provider }, "OAuth authorize error");
    return c.json(
      { error: error instanceof Error ? error.message : "OAuth authorization failed" },
      500,
    );
  }
});

/**
 * Initiate OAuth account linking for the authenticated user
 *
 * POST /api/auth/oauth/:provider/link/authorize
 *
 * Returns the provider authorization URL (the client navigates to it) and sets an
 * httpOnly state cookie bound to the caller's session token. When the provider
 * redirects back to the callback, the provider account is linked to that session's
 * user instead of performing a login. Requires authentication.
 */
app.post(
  "/:provider/link/authorize",
  requireAuth(),
  rateLimit(RateLimitPresets.login),
  async (c) => {
    const provider = c.req.param("provider")!;
    const session = c.get("session")!;

    if (!isValidProvider(provider)) {
      return c.json({ error: "Invalid OAuth provider" }, 400);
    }

    const oauthService = getOAuthService(c);
    if (!oauthService.isProviderEnabled(provider)) {
      return c.json({ error: `${provider} OAuth is not configured` }, 400);
    }

    const state = generateId();
    setStateCookie(
      c,
      LINK_STATE_COOKIE_NAME,
      buildLinkStateValue(state, session.token),
      STATE_COOKIE_MAX_AGE,
    );
    // Ensure a stale login state can't be combined with this flow
    setStateCookie(c, STATE_COOKIE_NAME, "", 0);

    return c.json({ url: oauthService.getAuthorizationUrl(provider, state), state });
  },
);

/**
 * OAuth callback handler
 *
 * GET /api/auth/oauth/:provider/callback
 *
 * Handles the OAuth callback from the provider.
 * Verifies state, exchanges code for tokens, then either links the provider to the
 * user who initiated a link flow, or logs in / signs up.
 */
app.get("/:provider/callback", rateLimit(RateLimitPresets.login), async (c) => {
  const provider = c.req.param("provider")!;
  const code = c.req.query("code");
  const state = c.req.query("state");
  const error = c.req.query("error");
  const errorDescription = c.req.query("error_description");

  // Handle OAuth error from provider
  if (error) {
    logger.warn({ provider, error, errorDescription }, "OAuth provider returned error");
    return c.redirect(`/login?error=${encodeURIComponent(errorDescription || error)}`);
  }

  if (!isValidProvider(provider)) {
    return c.redirect("/login?error=Invalid+OAuth+provider");
  }

  if (!code || !state) {
    return c.redirect("/login?error=Missing+OAuth+parameters");
  }

  const storedState = getCookie(c, STATE_COOKIE_NAME);
  const linkState = parseLinkStateValue(getCookie(c, LINK_STATE_COOKIE_NAME));

  // Clear both state cookies (single use)
  setStateCookie(c, STATE_COOKIE_NAME, "", 0);
  setStateCookie(c, LINK_STATE_COOKIE_NAME, "", 0);

  // ---- Link flow (state bound to an authenticated session) ----
  if (linkState && linkState.state === state) {
    try {
      const authService = new AuthService(c.get("userRepository"), c.get("sessionRepository"));
      const auth = await authService.validateSession(linkState.sessionToken);
      if (!auth) {
        return c.redirect("/login?error=Session+expired.+Log+in+and+try+linking+again.");
      }

      const oauthService = getOAuthService(c);
      const { tokens, profile } = await oauthService.handleCallback(provider, code);
      await oauthService.linkProfile(auth.user.id, provider, profile, tokens);

      return c.redirect(`/settings?oauth_linked=${encodeURIComponent(provider)}`);
    } catch (err) {
      logger.error({ err, provider }, "OAuth link callback error");
      const message = toUserMessage(err, "Failed to link OAuth account");
      return c.redirect(`/settings?error=${encodeURIComponent(message)}`);
    }
  }

  // ---- Login / sign-up flow ----
  if (!storedState || storedState !== state) {
    logger.warn({ provider }, "OAuth state mismatch");
    return c.redirect("/login?error=Invalid+OAuth+state");
  }

  try {
    const oauthService = getOAuthService(c);

    // Exchange code for tokens and get user profile
    const { tokens, profile } = await oauthService.handleCallback(provider, code);

    // Find existing linked user, or create one subject to registration policy
    const policy = await getRegistrationPolicy(c.get("instanceSettingsService"));
    const { user, isNew } = await oauthService.findOrCreateUser(provider, profile, tokens, policy);

    // Check if user is suspended
    if (user.isSuspended) {
      logger.warn({ userId: user.id, provider }, "Suspended user attempted OAuth login");
      return c.redirect("/login?error=Account+is+suspended");
    }

    // Create session
    const userAgent = c.req.header("User-Agent") || undefined;
    const forwardedFor = c.req.header("X-Forwarded-For");
    const ipAddress =
      (forwardedFor ? forwardedFor.split(",")[0]?.trim() : undefined) ||
      c.req.header("X-Real-IP") ||
      undefined;
    const sessionToken = await oauthService.createSession(user.id, userAgent, ipAddress);

    // Set session cookie
    const sessionExpiryDays = parseInt(process.env.SESSION_EXPIRY_DAYS || "30", 10);
    setCookie(c, "session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Lax",
      maxAge: sessionExpiryDays * 24 * 60 * 60,
      path: "/",
    });

    logger.info({ userId: user.id, provider, isNew }, "OAuth login successful");

    // Redirect to home or onboarding for new users
    const redirectUrl = isNew ? "/settings/profile" : "/";
    return c.redirect(redirectUrl);
  } catch (error) {
    if (error instanceof OAuthError) {
      logger.warn({ provider, code: error.code }, "OAuth login refused");
    } else {
      logger.error({ err: error, provider }, "OAuth callback error");
    }
    const message = error instanceof Error ? error.message : "OAuth authentication failed";
    return c.redirect(`/login?error=${encodeURIComponent(message)}`);
  }
});

/**
 * Link OAuth account to existing user (code exchange from a client-side callback)
 *
 * POST /api/auth/oauth/:provider/link
 *
 * Links an OAuth provider account to the currently authenticated user.
 * The `state` must match the httpOnly link-state cookie issued by
 * `POST /:provider/link/authorize` for the same session.
 * Requires authentication.
 */
app.post("/:provider/link", requireAuth(), rateLimit(RateLimitPresets.login), async (c) => {
  const provider = c.req.param("provider")!;
  const user = c.get("user")!;
  const session = c.get("session")!;

  if (!isValidProvider(provider)) {
    return c.json({ error: "Invalid OAuth provider" }, 400);
  }

  try {
    const body = await c.req.json<{ code?: string; state?: string }>();

    if (!body.code || typeof body.code !== "string") {
      return c.json({ error: "Missing authorization code" }, 400);
    }

    const linkState = parseLinkStateValue(getCookie(c, LINK_STATE_COOKIE_NAME));
    setStateCookie(c, LINK_STATE_COOKIE_NAME, "", 0);
    if (
      !linkState ||
      typeof body.state !== "string" ||
      linkState.state !== body.state ||
      linkState.sessionToken !== session.token
    ) {
      logger.warn({ provider, userId: user.id }, "OAuth link state mismatch");
      return c.json({ error: "Invalid OAuth state" }, 400);
    }

    const oauthService = getOAuthService(c);
    const oauthAccount = await oauthService.linkAccount(user.id, provider, body.code);

    logger.info({ userId: user.id, provider }, "OAuth account linked");

    return c.json({
      success: true,
      account: {
        provider: oauthAccount.provider,
        providerUsername: oauthAccount.providerUsername,
        createdAt: oauthAccount.createdAt,
      },
    });
  } catch (error) {
    logger.error({ err: error, provider, userId: user.id }, "OAuth link error");
    return c.json({ error: toUserMessage(error, "Failed to link OAuth account") }, 400);
  }
});

/**
 * Unlink OAuth account from user
 *
 * DELETE /api/auth/oauth/:provider
 *
 * Removes an OAuth provider link from the authenticated user.
 * Requires authentication.
 */
app.delete("/:provider", requireAuth(), rateLimit(RateLimitPresets.login), async (c) => {
  const provider = c.req.param("provider")!;
  const user = c.get("user")!;

  if (!isValidProvider(provider)) {
    return c.json({ error: "Invalid OAuth provider" }, 400);
  }

  try {
    const oauthService = getOAuthService(c);
    await oauthService.unlinkAccount(user.id, provider);

    logger.info({ userId: user.id, provider }, "OAuth account unlinked");

    return c.json({ success: true });
  } catch (error) {
    logger.error({ err: error, provider, userId: user.id }, "OAuth unlink error");
    return c.json(
      { error: error instanceof Error ? error.message : "Failed to unlink OAuth account" },
      400,
    );
  }
});

/**
 * Get linked OAuth accounts
 *
 * GET /api/auth/oauth/accounts
 *
 * Returns list of OAuth providers linked to the authenticated user.
 * Requires authentication.
 */
app.get("/accounts", requireAuth(), async (c) => {
  const user = c.get("user")!;

  try {
    const oauthService = getOAuthService(c);
    const accounts = await oauthService.getLinkedAccounts(user.id);

    return c.json({
      accounts: accounts.map((account) => ({
        provider: account.provider,
        providerUsername: account.providerUsername,
        providerEmail: account.providerEmail,
        createdAt: account.createdAt,
      })),
    });
  } catch (error) {
    logger.error({ err: error, userId: user.id }, "Get OAuth accounts error");
    return c.json(
      { error: error instanceof Error ? error.message : "Failed to get linked accounts" },
      500,
    );
  }
});

export default app;
