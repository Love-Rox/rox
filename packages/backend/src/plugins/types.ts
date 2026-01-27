/**
 * Plugin System Type Definitions
 *
 * Defines the plugin interface, event types, and context for the Rox plugin system.
 *
 * @module plugins/types
 */

import type { Hono, MiddlewareHandler } from "hono";
import type { EventBus } from "../lib/events.js";
import type { Visibility } from "shared";

/**
 * Minimal user information for event payloads
 * Excludes sensitive fields like passwordHash, privateKey
 */
export interface PluginUser {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  host: string | null;
  isAdmin: boolean;
  isSuspended: boolean;
  isSystemUser: boolean;
  uri: string | null;
  createdAt: Date;
}

/**
 * Minimal note information for event payloads
 */
export interface PluginNote {
  id: string;
  userId: string;
  text: string | null;
  cw: string | null;
  visibility: Visibility;
  localOnly: boolean;
  replyId: string | null;
  renoteId: string | null;
  fileIds: string[];
  mentions: string[];
  uri: string | null;
  createdAt: Date;
}

/**
 * Follow relationship for event payloads
 */
export interface PluginFollow {
  id: string;
  followerId: string;
  followeeId: string;
  createdAt: Date;
}

/**
 * ActivityPub activity for event payloads
 */
export interface PluginActivity {
  id?: string;
  type: string;
  actor: string;
  object?: unknown;
  target?: unknown;
  [key: string]: unknown;
}

// =============================================================================
// Event Payloads
// =============================================================================

/**
 * Note creation event payloads
 */
export interface NoteBeforeCreatePayload {
  /** Note text content */
  text: string | null;
  /** Content warning */
  cw: string | null;
  /** Visibility level */
  visibility: Visibility;
  /** Local only flag */
  localOnly: boolean;
  /** Reply target note ID */
  replyId: string | null;
  /** Renote target note ID */
  renoteId: string | null;
  /** Attached file IDs */
  fileIds: string[];
  /** Author user */
  author: PluginUser;
}

export interface NoteAfterCreatePayload {
  /** Created note */
  note: PluginNote;
  /** Author user */
  author: PluginUser;
}

export interface NoteBeforeDeletePayload {
  /** Note to be deleted */
  note: PluginNote;
  /** User performing deletion */
  deletedBy: PluginUser;
  /** Reason for deletion (if provided) */
  reason: string | null;
}

export interface NoteAfterDeletePayload {
  /** Deleted note ID */
  noteId: string;
  /** User who deleted */
  deletedBy: PluginUser;
  /** Reason for deletion */
  reason: string | null;
}

/**
 * User event payloads
 */
export interface UserBeforeRegisterPayload {
  /** Username */
  username: string;
  /**
   * Display name (optional)
   *
   * Note: Email is intentionally excluded from this payload
   * as it is PII and should not be exposed to plugins.
   */
  displayName: string | null;
}

export interface UserAfterRegisterPayload {
  /** Registered user */
  user: PluginUser;
}

export interface UserBeforeLoginPayload {
  /**
   * Username used for login
   *
   * Note: ipAddress and userAgent are intentionally excluded from this payload
   * as they are PII. Plugins can only see the username to decide whether to
   * cancel the login attempt.
   */
  username: string;
}

export interface UserAfterLoginPayload {
  /** Logged in user */
  user: PluginUser;
  /** IP address of request */
  ipAddress: string | null;
  /** User agent string */
  userAgent: string | null;
}

export interface UserAfterLogoutPayload {
  /** User who logged out */
  user: PluginUser;
}

/**
 * Follow event payloads
 */
export interface FollowAfterCreatePayload {
  /** Follow relationship */
  follow: PluginFollow;
  /** Follower user */
  follower: PluginUser;
  /** Followee user */
  followee: PluginUser;
}

export interface FollowAfterDeletePayload {
  /**
   * Follow relationship ID
   *
   * For delete events, this is a composite format: `${followerId}:${followeeId}`
   * since the original follow record has been deleted and its ID is no longer available.
   */
  followId: string;
  /** Follower user */
  follower: PluginUser;
  /** Followee user */
  followee: PluginUser;
}

/**
 * ActivityPub event payloads
 */
export interface ApBeforeInboxPayload {
  /** Incoming activity */
  activity: PluginActivity;
  /** Actor URI */
  actorUri: string;
}

export interface ApAfterInboxPayload {
  /** Processed activity */
  activity: PluginActivity;
  /** Actor URI */
  actorUri: string;
  /** Processing result */
  result: "accepted" | "rejected" | "ignored";
}

export interface ApBeforeDeliveryPayload {
  /** Activity to deliver */
  activity: PluginActivity;
  /** Target inbox URLs */
  inboxUrls: string[];
}

export interface ApAfterDeliveryPayload {
  /** Delivered activity */
  activity: PluginActivity;
  /** Delivery results per inbox */
  results: Array<{
    inboxUrl: string;
    success: boolean;
    error?: string;
  }>;
}

/**
 * Moderation event payloads
 */
export interface ModUserSuspendedPayload {
  /** Suspended user */
  user: PluginUser;
  /** Admin who performed suspension */
  suspendedBy: PluginUser;
  /** Reason for suspension */
  reason: string | null;
}

export interface ModNoteDeletedPayload {
  /** Deleted note ID */
  noteId: string;
  /** Original author */
  author: PluginUser;
  /** Moderator who deleted */
  deletedBy: PluginUser;
  /** Reason for deletion */
  reason: string | null;
}

// =============================================================================
// Event Type Map
// =============================================================================

/**
 * Map of all plugin events and their payload types
 */
export interface PluginEvents {
  // Note lifecycle events
  "note:beforeCreate": NoteBeforeCreatePayload;
  "note:afterCreate": NoteAfterCreatePayload;
  "note:beforeDelete": NoteBeforeDeletePayload;
  "note:afterDelete": NoteAfterDeletePayload;

  // User lifecycle events
  "user:beforeRegister": UserBeforeRegisterPayload;
  "user:afterRegister": UserAfterRegisterPayload;
  "user:beforeLogin": UserBeforeLoginPayload;
  "user:afterLogin": UserAfterLoginPayload;
  "user:afterLogout": UserAfterLogoutPayload;

  // Follow lifecycle events
  "follow:afterCreate": FollowAfterCreatePayload;
  "follow:afterDelete": FollowAfterDeletePayload;

  // ActivityPub events
  "ap:beforeInbox": ApBeforeInboxPayload;
  "ap:afterInbox": ApAfterInboxPayload;
  "ap:beforeDelivery": ApBeforeDeliveryPayload;
  "ap:afterDelivery": ApAfterDeliveryPayload;

  // Moderation events
  "mod:userSuspended": ModUserSuspendedPayload;
  "mod:noteDeleted": ModNoteDeletedPayload;
}

/**
 * Helper type to get payload type for an event
 */
export type PluginEventPayload<K extends keyof PluginEvents> = PluginEvents[K];

/**
 * All available event names
 */
export type PluginEventName = keyof PluginEvents;

// =============================================================================
// Plugin Interface
// =============================================================================

/**
 * Plugin configuration schema (for admin UI)
 */
export interface PluginConfigSchema {
  type: "object";
  properties: Record<
    string,
    {
      type: "string" | "number" | "boolean" | "array";
      title: string;
      description?: string;
      default?: unknown;
      enum?: unknown[];
    }
  >;
  required?: string[];
}

/**
 * Plugin context provided to plugins during initialization
 */
export interface PluginContext {
  /** Event bus for subscribing to events */
  events: EventBus;
  /** Logger scoped to the plugin */
  logger: {
    debug: (message: string, ...args: unknown[]) => void;
    info: (message: string, ...args: unknown[]) => void;
    warn: (message: string, ...args: unknown[]) => void;
    error: (message: string, ...args: unknown[]) => void;
  };
  /** Plugin configuration storage */
  config: {
    get: <T>(key: string, defaultValue?: T) => Promise<T | undefined>;
    set: <T>(key: string, value: T) => Promise<void>;
    delete: (key: string) => Promise<void>;
  };
  /** Instance base URL */
  baseUrl: string;
  /** Instance name */
  instanceName: string;
}

/**
 * Plugin manifest (package.json or plugin.json)
 */
export interface PluginManifest {
  /** Unique plugin identifier */
  id: string;
  /** Plugin display name */
  name: string;
  /** Plugin version (semver) */
  version: string;
  /** Plugin description */
  description?: string;
  /** Plugin author */
  author?: string;
  /** Plugin homepage/repository URL */
  homepage?: string;
  /** Minimum Rox version required */
  minRoxVersion?: string;
  /** Plugin dependencies (other plugin IDs) */
  dependencies?: string[];
  /** Plugin permissions required */
  permissions?: PluginPermission[];
}

/**
 * Plugin permissions
 */
export type PluginPermission =
  | "notes:read"
  | "notes:write"
  | "users:read"
  | "users:write"
  | "follows:read"
  | "follows:write"
  | "admin:read"
  | "admin:write"
  | "activitypub:read"
  | "activitypub:write"
  | "storage:read"
  | "storage:write"
  | "config:read"
  | "config:write";

/**
 * Rox Plugin Interface
 *
 * Plugins must implement this interface to be loaded by Rox.
 *
 * @example
 * ```typescript
 * const myPlugin: RoxPlugin = {
 *   id: 'my-plugin',
 *   name: 'My Plugin',
 *   version: '1.0.0',
 *
 *   async onLoad(context) {
 *     context.events.on('note:afterCreate', (payload) => {
 *       context.logger.info(`Note created: ${payload.note.id}`);
 *     }, this.id);
 *   },
 *
 *   async onUnload() {
 *     // Cleanup
 *   }
 * };
 * ```
 */
export interface RoxPlugin {
  /** Unique plugin identifier */
  id: string;
  /** Plugin display name */
  name: string;
  /** Plugin version (semver) */
  version: string;
  /** Plugin description */
  description?: string;
  /** Minimum Rox version required */
  minRoxVersion?: string;
  /** Plugin dependencies (other plugin IDs) */
  dependencies?: string[];

  /**
   * Called when the plugin is loaded
   * Register event handlers and initialize resources here
   */
  onLoad?(context: PluginContext): Promise<void> | void;

  /**
   * Called when the plugin is unloaded
   * Clean up resources and unregister handlers here
   */
  onUnload?(): Promise<void> | void;

  /**
   * Custom API routes to register
   * Routes are mounted at /api/x/{pluginId}/
   */
  routes?: (app: Hono) => void;

  /**
   * Custom middleware to add to the request pipeline
   */
  middleware?: MiddlewareHandler[];

  /**
   * Custom ActivityPub activity handlers
   * Key is the activity type (e.g., 'Like', 'Announce')
   */
  activityHandlers?: Record<
    string,
    (activity: PluginActivity, context: PluginContext) => Promise<void>
  >;

  /**
   * Admin UI configuration
   */
  adminUI?: {
    /** Configuration schema for settings UI */
    configSchema?: PluginConfigSchema;
    /** Icon for admin sidebar (Lucide icon name) */
    icon?: string;
  };
}

/**
 * Loaded plugin instance with runtime state
 */
export interface LoadedPlugin {
  /** Plugin definition */
  plugin: RoxPlugin;
  /** Plugin manifest */
  manifest: PluginManifest;
  /** Whether the plugin is currently enabled */
  enabled: boolean;
  /** Load timestamp */
  loadedAt: Date;
  /** Error if plugin failed to load */
  error?: string;
}
