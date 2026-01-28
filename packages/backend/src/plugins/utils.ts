/**
 * Plugin Utility Functions
 *
 * Shared conversion utilities for transforming database entities
 * into plugin-safe types that exclude sensitive fields.
 *
 * @module plugins/utils
 */

import type { User } from "../../../shared/src/types/user.js";
import type { Note } from "../../../shared/src/types/note.js";
import type { PluginUser, PluginNote } from "./types.js";

/**
 * Convert User to PluginUser (excluding sensitive fields)
 *
 * Creates a safe representation of a user for plugin consumption,
 * excluding fields like password hashes, email addresses, and other
 * sensitive data that plugins should not have access to.
 *
 * @param user - The full User object from the database
 * @returns A PluginUser with only safe fields exposed
 *
 * @example
 * ```typescript
 * const pluginUser = toPluginUser(dbUser);
 * eventBus.emit('user:afterLogin', { user: pluginUser });
 * ```
 */
export function toPluginUser(user: User): PluginUser {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    host: user.host,
    isAdmin: user.isAdmin,
    isSuspended: user.isSuspended,
    isSystemUser: user.isSystemUser,
    uri: user.uri,
    createdAt: user.createdAt,
  };
}

/**
 * Convert Note to PluginNote
 *
 * Creates a representation of a note for plugin consumption.
 * Note objects don't contain sensitive data, but this provides
 * a consistent interface for plugins.
 *
 * @param note - The full Note object from the database
 * @returns A PluginNote with the standard note fields
 *
 * @example
 * ```typescript
 * const pluginNote = toPluginNote(dbNote);
 * eventBus.emit('note:afterCreate', { note: pluginNote, author: pluginUser });
 * ```
 */
export function toPluginNote(note: Note): PluginNote {
  return {
    id: note.id,
    userId: note.userId,
    text: note.text,
    cw: note.cw,
    visibility: note.visibility,
    localOnly: note.localOnly,
    replyId: note.replyId,
    renoteId: note.renoteId,
    fileIds: note.fileIds,
    mentions: note.mentions,
    uri: note.uri,
    createdAt: note.createdAt,
  };
}
