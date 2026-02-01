/**
 * Plugin Test Helpers
 *
 * Factory functions for creating test data for plugin-related tests.
 * These helpers reduce repetition and ensure consistent test data.
 *
 * @module tests/helpers/pluginTestHelpers
 */

import type { PluginUser, PluginNote } from "../../plugins/types.js";
import type { NoteBeforeCreatePayload, NoteAfterCreatePayload } from "../../plugins/types.js";

/**
 * Create a test PluginUser with default values
 *
 * @param overrides - Partial user data to override defaults
 * @returns A complete PluginUser object
 *
 * @example
 * ```typescript
 * const user = createTestPluginUser({ username: "alice" });
 * // user.id = "user-test-1", user.username = "alice", ...
 * ```
 */
export function createTestPluginUser(overrides: Partial<PluginUser> = {}): PluginUser {
  return {
    id: "user-test-1",
    username: "testuser",
    displayName: null,
    avatarUrl: null,
    host: null,
    isAdmin: false,
    isSuspended: false,
    isSystemUser: false,
    uri: null,
    createdAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a test PluginNote with default values
 *
 * @param overrides - Partial note data to override defaults
 * @returns A complete PluginNote object
 *
 * @example
 * ```typescript
 * const note = createTestPluginNote({ text: "Hello world" });
 * // note.id = "note-test-1", note.text = "Hello world", ...
 * ```
 */
export function createTestPluginNote(overrides: Partial<PluginNote> = {}): PluginNote {
  return {
    id: "note-test-1",
    userId: "user-test-1",
    text: "Test note content",
    cw: null,
    visibility: "public",
    localOnly: false,
    replyId: null,
    renoteId: null,
    fileIds: [],
    mentions: [],
    uri: null,
    createdAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a note:beforeCreate event payload with default values
 *
 * @param overrides - Partial payload data to override defaults
 * @returns A complete NoteBeforeCreatePayload object
 */
export function createNoteBeforeCreatePayload(
  overrides: Partial<NoteBeforeCreatePayload> = {}
): NoteBeforeCreatePayload {
  return {
    text: "Test note content",
    cw: null,
    visibility: "public",
    localOnly: false,
    replyId: null,
    renoteId: null,
    fileIds: [],
    author: createTestPluginUser(),
    ...overrides,
  };
}

/**
 * Create a note:afterCreate event payload with default values
 *
 * @param overrides - Partial payload data to override defaults
 * @returns A complete NoteAfterCreatePayload object
 */
export function createNoteAfterCreatePayload(
  overrides: Partial<NoteAfterCreatePayload> = {}
): NoteAfterCreatePayload {
  return {
    note: createTestPluginNote(),
    author: createTestPluginUser(),
    ...overrides,
  };
}
