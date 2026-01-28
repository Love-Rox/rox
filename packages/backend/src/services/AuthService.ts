/**
 * Authentication Service
 *
 * Provides user registration, login, logout, and session management.
 * Passwords are hashed with Argon2id, and sessions are managed with cryptographically secure tokens.
 *
 * @module services/AuthService
 */

import type { IUserRepository } from "../interfaces/repositories/IUserRepository.js";
import type { ISessionRepository } from "../interfaces/repositories/ISessionRepository.js";
import type { BlockedUsernameService } from "./BlockedUsernameService.js";
import type { User, Session } from "shared";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { generateSessionToken, calculateSessionExpiry } from "../utils/session.js";
import { generateId } from "shared";
import { generateKeyPair } from "../utils/crypto.js";
import type { EventBus } from "../lib/events.js";
import { toPluginUser } from "../plugins/utils.js";
import { logger } from "../lib/logger.js";

/**
 * User Registration Input Data
 */
export interface RegisterInput {
  /** Username (3-20 characters, alphanumeric and underscores only) */
  username: string;
  /** Email address */
  email: string;
  /** Password (minimum 8 characters) */
  password: string;
  /** Display name (defaults to username if omitted) */
  name?: string;
}

/**
 * Login Input Data
 */
export interface LoginInput {
  /** Username */
  username: string;
  /** Password */
  password: string;
}

/**
 * Authentication Service
 *
 * Provides business logic related to user authentication.
 */
export class AuthService {
  /**
   * AuthService Constructor
   *
   * @param userRepository - User repository
   * @param sessionRepository - Session repository
   * @param blockedUsernameService - Optional blocked username service
   * @param eventBus - Optional event bus for plugin events
   */
  constructor(
    private userRepository: IUserRepository,
    private sessionRepository: ISessionRepository,
    private blockedUsernameService?: BlockedUsernameService,
    private eventBus?: EventBus,
  ) {}

  /**
   * Register New User
   *
   * Checks for duplicate username and email, hashes the password, and creates the user.
   * Automatically creates and returns a session upon successful registration.
   *
   * @param input - User registration information
   * @returns Created user and session
   * @throws When username or email already exists
   *
   * @example
   * ```typescript
   * const { user, session } = await authService.register({
   *   username: 'alice',
   *   email: 'alice@example.com',
   *   password: 'securePassword123',
   *   name: 'Alice Smith'
   * });
   * ```
   */
  async register(input: RegisterInput): Promise<{ user: User; session: Session }> {
    // Check if username is blocked (reserved or custom pattern)
    if (this.blockedUsernameService) {
      const blockCheck = await this.blockedUsernameService.isUsernameBlocked(input.username);
      if (blockCheck.blocked) {
        throw new Error(blockCheck.reason || "This username is not allowed");
      }
    }

    // ユーザー名の重複チェック
    const existingUsername = await this.userRepository.findByUsername(input.username);
    if (existingUsername) {
      throw new Error("Username already exists");
    }

    // メールアドレスの重複チェック
    const existingEmail = await this.userRepository.findByEmail(input.email);
    if (existingEmail) {
      throw new Error("Email already exists");
    }

    // Emit user:beforeRegister event (plugins can cancel or modify)
    // Note: email is intentionally excluded as it is PII
    // Note: username cannot be modified as it affects duplicate checks and ActivityPub URIs
    let displayName = input.name || null;

    if (this.eventBus) {
      const beforeResult = await this.eventBus.emitBefore("user:beforeRegister", {
        username: input.username,
        displayName,
      });

      if (beforeResult.cancelled) {
        throw new Error(beforeResult.cancelReason || "Registration cancelled by plugin");
      }

      // Apply modifications from plugins (only displayName can be modified)
      if (beforeResult.modifiedPayload) {
        displayName = beforeResult.modifiedPayload.displayName ?? displayName;
      }
    }

    // パスワードをハッシュ化
    const passwordHash = await hashPassword(input.password);

    // ActivityPub用の鍵ペア生成（ローカルユーザー用）
    const { publicKey, privateKey } = generateKeyPair();

    // Check if this is the first local user (make them admin)
    const localUserCount = await this.userRepository.count(true);
    const isFirstUser = localUserCount === 0;

    // ユーザー作成
    const baseUrl = process.env.URL || "http://localhost:3000";
    const user = await this.userRepository.create({
      id: generateId(),
      username: input.username,
      email: input.email,
      passwordHash,
      displayName: displayName || input.username,
      host: null, // ローカルユーザー
      avatarUrl: null,
      bannerUrl: null,
      bio: null,
      isAdmin: isFirstUser, // First user becomes admin
      isSuspended: false,
      isDeleted: false,
      deletedAt: null,
      isSystemUser: false,
      publicKey,
      privateKey,
      customCss: null, // Custom CSS for profile page
      uiSettings: null, // Default UI settings
      // ActivityPub fields for local users
      inbox: `${baseUrl}/users/${input.username}/inbox`,
      outbox: `${baseUrl}/users/${input.username}/outbox`,
      followersUrl: `${baseUrl}/users/${input.username}/followers`,
      followingUrl: `${baseUrl}/users/${input.username}/following`,
      uri: `${baseUrl}/users/${input.username}`,
      sharedInbox: null, // Local users don't have shared inbox
      // Account migration fields
      alsoKnownAs: [],
      movedTo: null,
      movedAt: null,
      // Profile emojis (for remote users)
      profileEmojis: [],
      // Storage quota (null means use role default)
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

    // セッション作成
    const session = await this.createSession(user.id);

    // Emit user:afterRegister event (async, non-blocking)
    if (this.eventBus) {
      this.eventBus
        .emit("user:afterRegister", {
          user: toPluginUser(user),
        })
        .catch((error) => {
          logger.error({ err: error, userId: user.id }, "Failed to emit user:afterRegister event");
        });
    }

    return { user, session };
  }

  /**
   * User Login
   *
   * Validates username and password, and creates a new session upon success.
   * Throws an error if the account is suspended.
   *
   * @param input - Login information (username and password)
   * @returns User and newly created session
   * @throws When username or password is invalid, or when account is suspended
   *
   * @example
   * ```typescript
   * const { user, session } = await authService.login({
   *   username: 'alice',
   *   password: 'securePassword123'
   * });
   * ```
   */
  async login(input: LoginInput, context?: { ipAddress?: string; userAgent?: string }): Promise<{ user: User; session: Session }> {
    // Emit user:beforeLogin event (plugins can cancel)
    // Note: ipAddress and userAgent are excluded as PII
    if (this.eventBus) {
      const beforeResult = await this.eventBus.emitBefore("user:beforeLogin", {
        username: input.username,
      });

      if (beforeResult.cancelled) {
        throw new Error(beforeResult.cancelReason || "Login cancelled by plugin");
      }
    }

    // ユーザー検索
    const user = await this.userRepository.findByUsername(input.username);
    if (!user) {
      throw new Error("Invalid username or password");
    }

    // システムアカウントはログイン不可
    if (user.isSystemUser) {
      throw new Error("System account cannot be used for login");
    }

    // パスワード検証
    const isValid = await verifyPassword(input.password, user.passwordHash);
    if (!isValid) {
      throw new Error("Invalid username or password");
    }

    // アカウント停止チェック
    if (user.isSuspended) {
      throw new Error("Account is suspended");
    }

    // セッション作成
    const session = await this.createSession(user.id);

    // Emit user:afterLogin event (async, non-blocking)
    if (this.eventBus) {
      this.eventBus
        .emit("user:afterLogin", {
          user: toPluginUser(user),
          ipAddress: context?.ipAddress || null,
          userAgent: context?.userAgent || null,
        })
        .catch((error) => {
          logger.error({ err: error, userId: user.id }, "Failed to emit user:afterLogin event");
        });
    }

    return { user, session };
  }

  /**
   * User Logout
   *
   * Deletes the session for the specified token and emits a logout event.
   *
   * @param token - Token of the session to delete
   *
   * @example
   * ```typescript
   * await authService.logout(sessionToken);
   * ```
   */
  async logout(token: string): Promise<void> {
    // Get session and user info before deletion for event emission
    let user: User | null = null;
    if (this.eventBus) {
      const session = await this.sessionRepository.findByToken(token);
      if (session) {
        user = await this.userRepository.findById(session.userId);
      }
    }

    await this.sessionRepository.deleteByToken(token);

    // Emit user:afterLogout event (async, non-blocking)
    if (this.eventBus && user) {
      this.eventBus
        .emit("user:afterLogout", {
          user: toPluginUser(user),
        })
        .catch((error) => {
          logger.error({ err: error, userId: user!.id }, "Failed to emit user:afterLogout event");
        });
    }
  }

  /**
   * Validate Session
   *
   * Verifies the validity of a session token and returns user and session information if valid.
   * Returns null if the session doesn't exist, is expired, or the user is suspended.
   *
   * @param token - Session token to validate
   * @returns User and session if valid, null if invalid
   *
   * @example
   * ```typescript
   * const result = await authService.validateSession(token);
   * if (result) {
   *   const { user, session } = result;
   *   // Session valid
   * } else {
   *   // Session invalid - re-login required
   * }
   * ```
   */
  async validateSession(token: string): Promise<{ user: User; session: Session } | null> {
    const session = await this.sessionRepository.findByToken(token);
    if (!session) {
      return null;
    }

    // 有効期限チェック
    if (new Date() > session.expiresAt) {
      await this.sessionRepository.delete(token);
      return null;
    }

    const user = await this.userRepository.findById(session.userId);
    if (!user) {
      await this.sessionRepository.delete(token);
      return null;
    }

    // アカウント停止チェック
    if (user.isSuspended) {
      await this.sessionRepository.delete(token);
      return null;
    }

    return { user, session };
  }

  /**
   * Create Session (Internal Method)
   */
  private async createSession(userId: string): Promise<Session> {
    const sessionExpiryDays = Number.parseInt(process.env.SESSION_EXPIRY_DAYS || "30", 10);

    const session = await this.sessionRepository.create({
      id: generateId(),
      userId,
      token: generateSessionToken(),
      expiresAt: calculateSessionExpiry(sessionExpiryDays),
      userAgent: null,
      ipAddress: null,
    });

    return session;
  }
}
