/**
 * Validation Constants
 *
 * Shared validation rules and limits used by both frontend and backend.
 * These constants ensure consistency between client-side and server-side validation.
 *
 * @module constants/validation
 */

// ============================================
// Username Validation
// ============================================

/** Minimum allowed username length. */
export const USERNAME_MIN_LENGTH = 3;
/** Maximum allowed username length. */
export const USERNAME_MAX_LENGTH = 20;
/** Allowed characters in a username: alphanumeric and underscore. */
export const USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/;

/**
 * Default reserved usernames (hardcoded)
 * These usernames cannot be registered regardless of admin settings.
 * Includes system accounts, ActivityPub routes, and common technical names.
 */
export const DEFAULT_RESERVED_USERNAMES: readonly string[] = [
  // System accounts (reserved for Issue #44)
  "system",
  "admin",
  "administrator",
  "root",
  "moderator",
  "support",

  // Development/Technical
  "dev",
  "developer",
  "test",
  "debug",

  // Project-specific
  "rox",
  "love_rox",
  "lovrox",
  "hono_rox",
  "waku_rox",

  // ActivityPub routes
  "inbox",
  "outbox",
  "followers",
  "following",
  "featured",
  "collections",

  // Web routes / API paths
  "api",
  "auth",
  "login",
  "logout",
  "register",
  "signup",
  "signin",
  "settings",
  "notifications",
  "timeline",
  "explore",
  "search",
  "about",
  "help",
  "terms",
  "privacy",
  "instance",

  // Technical names
  "null",
  "undefined",
  "anonymous",
  "guest",
  "bot",
  "official",

  // Well-known paths (underscores for valid username format)
  "well_known",
  "webfinger",
  "nodeinfo",
  "host_meta",
] as const;

/**
 * Check if a username is in the default reserved list
 * Case-insensitive comparison
 *
 * @param username - Username to check
 * @returns true if the username is reserved
 */
export function isDefaultReservedUsername(username: string): boolean {
  const lowerUsername = username.toLowerCase();
  return DEFAULT_RESERVED_USERNAMES.some((reserved) => reserved === lowerUsername);
}

// ============================================
// Password Validation
// ============================================

/** Minimum allowed password length. */
export const PASSWORD_MIN_LENGTH = 8;

// ============================================
// Note Validation
// ============================================

/** Maximum character length for note text. */
export const NOTE_TEXT_MAX_LENGTH = 3000;
/** Maximum character length for a content warning. */
export const NOTE_CW_MAX_LENGTH = 100;
/** Maximum number of files attachable to a single note. */
export const NOTE_MAX_FILES = 4;

// ============================================
// User Profile Validation
// ============================================

/** Maximum character length for a user's display name. */
export const DISPLAY_NAME_MAX_LENGTH = 100;
/** Maximum character length for a user's bio. */
export const BIO_MAX_LENGTH = 500;

// ============================================
// Reaction Validation
// ============================================

/** Maximum character length for a reaction string. */
export const REACTION_MAX_LENGTH = 50;

// ============================================
// File Validation
// ============================================

/** Maximum character length for a file comment (alt text). */
export const FILE_COMMENT_MAX_LENGTH = 512;

// ============================================
// Pagination Defaults
// ============================================

/** Default number of items per page in paginated queries. */
export const DEFAULT_PAGE_LIMIT = 20;
/** Maximum allowed items per page in paginated queries. */
export const MAX_PAGE_LIMIT = 100;
