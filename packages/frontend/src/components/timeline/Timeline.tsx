'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAtom } from 'jotai';
import { Trans } from '@lingui/react/macro';
import {
  timelineNotesAtom,
  timelineLoadingAtom,
  timelineErrorAtom,
  timelineHasMoreAtom,
  timelineLastNoteIdAtom,
} from '../../lib/atoms/timeline';
import { notesApi } from '../../lib/api/notes';
import { NoteCard } from '../note/NoteCard';
import { Button } from '../ui/Button';

/**
 * Props for the Timeline component
 */
export interface TimelineProps {
  /** Initial notes data (from Server Component) */
  initialNotes?: any[];
  /** Timeline type: 'local' | 'social' | 'home' */
  type?: 'local' | 'social' | 'home';
}

/**
 * Timeline component for displaying a feed of notes
 * Supports infinite scroll pagination and real-time updates
 *
 * @param initialNotes - Initial notes from server-side rendering
 * @param type - Timeline type (local/social/home)
 */
export function Timeline({ initialNotes = [], type = 'local' }: TimelineProps) {
  const [notes, setNotes] = useAtom(timelineNotesAtom);
  const [loading, setLoading] = useAtom(timelineLoadingAtom);
  const [error, setError] = useAtom(timelineErrorAtom);
  const [hasMore, setHasMore] = useAtom(timelineHasMoreAtom);
  const [lastNoteId] = useAtom(timelineLastNoteIdAtom);

  const observerTarget = useRef<HTMLDivElement>(null);

  // Initialize with initial notes
  useEffect(() => {
    if (initialNotes.length > 0 && notes.length === 0) {
      setNotes(initialNotes);
    }
  }, [initialNotes, notes.length, setNotes]);

  // Load more notes for pagination
  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    setError(null);

    try {
      const fetchFunction =
        type === 'home'
          ? notesApi.getHomeTimeline
          : type === 'social'
          ? notesApi.getSocialTimeline
          : notesApi.getLocalTimeline;

      const newNotes = await fetchFunction({
        limit: 20,
        untilId: lastNoteId || undefined,
      });

      if (newNotes.length === 0) {
        setHasMore(false);
      } else {
        setNotes((prev) => [...prev, ...newNotes]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notes');
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, lastNoteId, type, setLoading, setError, setHasMore, setNotes]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !loading && hasMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [loading, hasMore, loadMore]);

  // Handle note deletion
  const handleNoteDelete = useCallback(
    (noteId: string) => {
      setNotes((prev) => prev.filter((note) => note.id !== noteId));
    },
    [setNotes]
  );

  return (
    <div className="space-y-4">
      {/* Error Message */}
      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-red-600">
          <Trans>Error loading timeline</Trans>: {error}
        </div>
      )}

      {/* Notes List */}
      {notes.map((note) => (
        <NoteCard key={note.id} note={note} onDelete={() => handleNoteDelete(note.id)} />
      ))}

      {/* Loading Indicator */}
      {loading && (
        <div className="flex justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent"></div>
        </div>
      )}

      {/* Load More Trigger (Intersection Observer Target) */}
      <div ref={observerTarget} className="h-4" />

      {/* End of Timeline */}
      {!hasMore && notes.length > 0 && (
        <div className="py-8 text-center text-gray-500">
          <Trans>You've reached the end of the timeline</Trans>
        </div>
      )}

      {/* Empty State */}
      {!loading && notes.length === 0 && (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <div className="text-4xl mb-4">📭</div>
          <h3 className="mb-2 text-lg font-semibold text-gray-900">
            <Trans>No notes yet</Trans>
          </h3>
          <p className="text-gray-600">
            <Trans>Be the first to post something!</Trans>
          </p>
        </div>
      )}

      {/* Manual Load More Button (fallback) */}
      {hasMore && !loading && notes.length > 0 && (
        <div className="flex justify-center py-4">
          <Button variant="secondary" onPress={loadMore}>
            <Trans>Load more</Trans>
          </Button>
        </div>
      )}
    </div>
  );
}
