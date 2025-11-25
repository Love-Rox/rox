import { useEffect, useCallback } from 'react';
import { useAtom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import type { NoteVisibility } from '../lib/api/notes';

/**
 * Draft data structure
 */
export interface DraftData {
  text: string;
  cw: string;
  showCw: boolean;
  visibility: NoteVisibility;
  timestamp: number;
}

/**
 * Atom for storing draft data in localStorage
 * Automatically syncs with localStorage
 */
const draftAtom = atomWithStorage<DraftData | null>('note-composer-draft', null);

/**
 * Hook for managing note composer drafts
 *
 * Features:
 * - Auto-save draft to localStorage
 * - Load draft on mount
 * - Clear draft when note is posted
 * - Debounced save to avoid excessive writes
 *
 * @param options - Configuration options
 * @returns Draft management functions
 *
 * @example
 * ```tsx
 * const { saveDraft, loadDraft, clearDraft, hasDraft } = useDraft({
 *   autosaveDelay: 1000,
 * });
 *
 * // Save draft
 * saveDraft({ text, cw, showCw, visibility });
 *
 * // Load draft
 * const draft = loadDraft();
 *
 * // Clear draft
 * clearDraft();
 * ```
 */
export function useDraft(_options: { autosaveDelay?: number } = {}) {
  const [draft, setDraft] = useAtom(draftAtom);

  /**
   * Save draft to localStorage
   */
  const saveDraft = useCallback(
    (data: Omit<DraftData, 'timestamp'>) => {
      // Only save if there's actual content
      if (!data.text.trim() && !data.cw.trim()) {
        setDraft(null);
        return;
      }

      setDraft({
        ...data,
        timestamp: Date.now(),
      });
    },
    [setDraft]
  );

  /**
   * Load draft from localStorage
   */
  const loadDraft = useCallback(() => {
    return draft;
  }, [draft]);

  /**
   * Clear draft from localStorage
   */
  const clearDraft = useCallback(() => {
    setDraft(null);
  }, [setDraft]);

  /**
   * Check if there's a draft available
   */
  const hasDraft = draft !== null && (draft.text.trim() !== '' || draft.cw.trim() !== '');

  return {
    saveDraft,
    loadDraft,
    clearDraft,
    hasDraft,
    draft,
  };
}

/**
 * Hook for auto-saving drafts with debounce
 *
 * @param data - Draft data to save
 * @param delay - Debounce delay in milliseconds
 *
 * @example
 * ```tsx
 * const { saveDraft } = useDraft();
 *
 * useAutosaveDraft(
 *   { text, cw, showCw, visibility },
 *   1000 // autosave every 1 second after user stops typing
 * );
 * ```
 */
export function useAutosaveDraft(
  data: Omit<DraftData, 'timestamp'>,
  delay = 1000
) {
  const { saveDraft } = useDraft();

  useEffect(() => {
    const timer = setTimeout(() => {
      saveDraft(data);
    }, delay);

    return () => clearTimeout(timer);
  }, [data.text, data.cw, data.showCw, data.visibility, delay, saveDraft]);
}
