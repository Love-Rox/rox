"use client";

/**
 * Mentions hook for fetching and managing mentions/replies
 */

import { useState, useCallback } from "react";
import { useAtomValue } from "jotai";
import { isAuthenticatedAtom } from "../lib/atoms/auth";
import { mentionsApi } from "../lib/api/mentions";
import type { Note, TimelineOptions } from "../lib/types/note";

/**
 * Hook to fetch and manage mentions and replies
 */
export function useMentions() {
  const [mentions, setMentions] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);

  /**
   * Fetch mentions from API
   */
  const fetchMentions = useCallback(
    async (options: TimelineOptions = {}) => {
      if (!isAuthenticated) return;

      setLoading(true);
      try {
        const data = await mentionsApi.getMentions({ limit: 20, ...options });

        if (options.untilId) {
          // Pagination: append to existing
          setMentions((prev) => [...prev, ...data]);
        } else {
          // Initial load or refresh: replace
          setMentions(data);
        }

        // Check if there are more items
        setHasMore(data.length >= (options.limit || 20));
      } catch (error) {
        console.error("Failed to fetch mentions:", error);
      } finally {
        setLoading(false);
      }
    },
    [isAuthenticated],
  );

  /**
   * Load more mentions (pagination)
   */
  const loadMore = useCallback(async () => {
    if (mentions.length === 0 || loading || !hasMore) return;

    const lastMention = mentions[mentions.length - 1];
    if (lastMention) {
      await fetchMentions({ untilId: lastMention.id });
    }
  }, [mentions, loading, hasMore, fetchMentions]);

  /**
   * Refresh mentions (reload from the beginning)
   */
  const refresh = useCallback(async () => {
    setHasMore(true);
    await fetchMentions();
  }, [fetchMentions]);

  return {
    mentions,
    loading,
    hasMore,
    fetchMentions,
    loadMore,
    refresh,
  };
}
