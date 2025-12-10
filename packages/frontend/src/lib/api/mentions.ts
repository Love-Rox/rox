/**
 * Mentions API client
 *
 * Provides methods for retrieving mentions and replies to the current user.
 */

import { apiClient } from "./client";
import type { Note, TimelineOptions } from "../types/note";

/**
 * Mentions API operations
 */
export const mentionsApi = {
  /**
   * Get mentions and replies for the current user
   *
   * @param options - Timeline options for pagination
   * @returns Array of notes mentioning or replying to the user
   */
  async getMentions(options: TimelineOptions = {}): Promise<Note[]> {
    const params = new URLSearchParams();
    if (options.limit) params.set("limit", options.limit.toString());
    if (options.sinceId) params.set("sinceId", options.sinceId);
    if (options.untilId) params.set("untilId", options.untilId);

    const query = params.toString();
    return apiClient.get<Note[]>(`/api/mentions${query ? `?${query}` : ""}`);
  },
};
