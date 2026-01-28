/**
 * Reaction API client
 * Provides functions for interacting with the reaction API endpoints
 */

import { apiClient, withToken } from "./client";

/**
 * Reaction data structure
 */
export interface Reaction {
  id: string;
  userId: string;
  noteId: string;
  reaction: string;
  customEmojiUrl?: string;
  createdAt: string;
}

/**
 * Create or update a reaction to a note
 *
 * @param noteId - Note ID to react to
 * @param reaction - Reaction emoji (Unicode or custom emoji name)
 * @param token - Authentication token
 * @returns Created reaction
 */
export async function createReaction(
  noteId: string,
  reaction: string,
  token: string,
): Promise<Reaction> {
  return withToken(token).post<Reaction>("/api/notes/reactions/create", { noteId, reaction });
}

/**
 * Delete a specific reaction from a note
 *
 * @param noteId - Note ID to remove reaction from
 * @param reaction - Reaction emoji to remove
 * @param token - Authentication token
 */
export async function deleteReaction(
  noteId: string,
  reaction: string,
  token: string,
): Promise<void> {
  await withToken(token).post<void>("/api/notes/reactions/delete", { noteId, reaction });
}

/**
 * Get all reactions for a note
 *
 * @param noteId - Note ID
 * @param limit - Maximum number of reactions to retrieve
 * @returns List of reactions
 */
export async function getReactions(noteId: string, limit?: number): Promise<Reaction[]> {
  const params = new URLSearchParams({ noteId });
  if (limit) {
    params.append("limit", limit.toString());
  }
  return apiClient.get<Reaction[]>(`/api/notes/reactions?${params}`);
}

/**
 * Get reaction counts for a note
 *
 * @param noteId - Note ID
 * @returns Reaction counts by emoji
 */
export async function getReactionCounts(noteId: string): Promise<Record<string, number>> {
  const params = new URLSearchParams({ noteId });
  return apiClient.get<Record<string, number>>(`/api/notes/reactions/counts?${params}`);
}

/**
 * Reaction counts with custom emoji URLs
 */
export interface ReactionCountsWithEmojis {
  counts: Record<string, number>;
  emojis: Record<string, string>;
}

/**
 * Get reaction counts with custom emoji URLs for a note
 *
 * @param noteId - Note ID
 * @param fetchRemote - Fetch reactions from remote server for remote notes (default: false)
 * @returns Reaction counts and custom emoji URLs
 */
export async function getReactionCountsWithEmojis(
  noteId: string,
  fetchRemote = false,
): Promise<ReactionCountsWithEmojis> {
  const params = new URLSearchParams({ noteId });
  if (fetchRemote) {
    params.append("fetchRemote", "true");
  }
  return apiClient.get<ReactionCountsWithEmojis>(`/api/notes/reactions/counts-with-emojis?${params}`);
}

/**
 * Get current user's reactions to a note
 *
 * @param noteId - Note ID
 * @param token - Authentication token
 * @returns User's reactions
 */
export async function getMyReactions(noteId: string, token: string): Promise<Reaction[]> {
  const params = new URLSearchParams({ noteId });
  return withToken(token).get<Reaction[]>(`/api/notes/reactions/my-reactions?${params}`);
}
