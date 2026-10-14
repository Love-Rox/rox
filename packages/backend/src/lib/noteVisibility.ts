/**
 * Note Visibility Rules
 *
 * Central implementation of Misskey-compatible note visibility semantics.
 * Every code path that returns note content to a viewer (API, ActivityPub,
 * oEmbed, streaming) must go through these helpers (or the equivalent
 * repository-level `visibleTo` filter) so that followers-only and
 * specified (direct) notes are never exposed to unauthorized viewers.
 *
 * Rules:
 * - `public` / `home`: visible to anyone, including unauthenticated viewers
 * - `followers`: visible to the author, users who follow the author,
 *   users mentioned in the note, and the author of the note being replied to
 * - `specified`: visible to the author and the recipients
 *   (stored in the note's `mentions` array, which holds `visibleUserIds`)
 *
 * @module lib/noteVisibility
 */

import type { IFollowRepository } from "../interfaces/repositories/IFollowRepository.js";
import type { INoteRepository } from "../interfaces/repositories/INoteRepository.js";

/**
 * Minimal note shape required to evaluate visibility.
 */
export interface NoteVisibilityFields {
  /** Author user ID */
  userId: string;
  /** Visibility level (public, home, followers, specified) */
  visibility: string;
  /** Mentioned user IDs (for `specified` notes, the recipient user IDs) */
  mentions?: string[] | null;
  /** ID of the note this note replies to */
  replyId?: string | null;
}

/**
 * Additional relationship facts between the viewer and the note,
 * used to evaluate `followers` visibility.
 */
export interface NoteViewerRelation {
  /** Whether the viewer follows the note author */
  isFollowing: boolean;
  /** Whether the viewer is the author of the note being replied to */
  isReplyTargetAuthor?: boolean;
}

/**
 * Check whether a note is visible to everyone (including unauthenticated viewers).
 *
 * @param note - Note to check
 * @returns True for `public` and `home` notes
 */
export function isPubliclyVisible(note: Pick<NoteVisibilityFields, "visibility">): boolean {
  return note.visibility === "public" || note.visibility === "home";
}

/**
 * Pure visibility check for a note and a viewer.
 *
 * @param note - Note to check
 * @param viewerId - Viewing user ID, or null for unauthenticated viewers
 * @param relation - Whether the viewer follows the author (boolean shorthand),
 *   or a full relation object
 * @returns True if the viewer may see the note
 *
 * @example
 * ```typescript
 * const isFollowing = await followRepository.exists(viewerId, note.userId);
 * if (!canViewNote(note, viewerId, isFollowing)) {
 *   return c.json({ error: "Note not found" }, 404);
 * }
 * ```
 */
export function canViewNote(
  note: NoteVisibilityFields,
  viewerId: string | null | undefined,
  relation: boolean | NoteViewerRelation = false,
): boolean {
  if (isPubliclyVisible(note)) return true;
  if (!viewerId) return false;
  if (note.userId === viewerId) return true;

  const rel: NoteViewerRelation =
    typeof relation === "boolean" ? { isFollowing: relation } : relation;
  const isMentioned = (note.mentions ?? []).includes(viewerId);

  if (note.visibility === "specified") {
    return isMentioned;
  }

  if (note.visibility === "followers") {
    return rel.isFollowing || isMentioned || rel.isReplyTargetAuthor === true;
  }

  // Unknown visibility values are treated as private
  return false;
}

/**
 * Dependencies required by {@link isNoteVisibleTo}.
 */
export interface NoteVisibilityDeps {
  /** Follow repository used to check whether the viewer follows the author */
  followRepository: Pick<IFollowRepository, "exists">;
  /** Optional note repository used to resolve the reply target author */
  noteRepository?: Pick<INoteRepository, "findById">;
}

/**
 * Asynchronous visibility check that resolves relationship facts on demand.
 *
 * Only performs database lookups when the result cannot be determined
 * from the note itself (i.e. `followers` notes viewed by a non-author
 * who is not mentioned).
 *
 * @param note - Note to check
 * @param viewerId - Viewing user ID, or null for unauthenticated viewers
 * @param deps - Repositories used to resolve relationships
 * @returns True if the viewer may see the note
 */
export async function isNoteVisibleTo(
  note: NoteVisibilityFields,
  viewerId: string | null | undefined,
  deps: NoteVisibilityDeps,
): Promise<boolean> {
  if (canViewNote(note, viewerId, false)) return true;
  if (!viewerId || note.visibility !== "followers") return false;

  if (await deps.followRepository.exists(viewerId, note.userId)) {
    return true;
  }

  if (note.replyId && deps.noteRepository) {
    const parent = await deps.noteRepository.findById(note.replyId);
    if (parent && parent.userId === viewerId) {
      return true;
    }
  }

  return false;
}
