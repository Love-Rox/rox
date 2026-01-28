"use client";

import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import { FileText, Trash2 } from "lucide-react";
import { Button } from "../ui/Button";
import type { DraftData } from "../../hooks/useDraft";

/**
 * Props for NoteComposerDrafts component
 */
export interface NoteComposerDraftsProps {
  /** List of saved drafts */
  drafts: DraftData[];
  /** ID of the currently active draft */
  currentDraftId: string | null;
  /** Whether the dropdown is visible */
  isOpen: boolean;
  /** Whether the composer is submitting */
  isDisabled: boolean;
  /** Toggle dropdown visibility */
  onToggle: () => void;
  /** Load a draft by ID */
  onLoadDraft: (id: string) => void;
  /** Delete a draft by ID */
  onDeleteDraft: (id: string, e: React.MouseEvent) => void;
  /** Create a new draft */
  onNewDraft: () => void;
}

/**
 * Component for displaying and managing drafts in the note composer
 */
export function NoteComposerDrafts({
  drafts,
  currentDraftId,
  isOpen,
  isDisabled,
  onToggle,
  onLoadDraft,
  onDeleteDraft,
  onNewDraft,
}: NoteComposerDraftsProps) {
  return (
    <div className="relative">
      <Button
        variant="ghost"
        onPress={onToggle}
        isDisabled={isDisabled}
        className={`p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 ${
          isOpen
            ? "bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400"
            : "text-gray-600 dark:text-gray-400"
        }`}
        aria-label={t`Drafts`}
        aria-expanded={isOpen}
      >
        <FileText className="w-5 h-5" />
        {drafts.length > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-4 h-4 px-1 text-[10px] font-bold text-white bg-primary-500 rounded-full">
            {drafts.length}
          </span>
        )}
      </Button>

      {/* Drafts dropdown */}
      {isOpen && (
        <div className="absolute bottom-full left-0 sm:left-auto sm:right-0 mb-2 w-[calc(100vw-2rem)] sm:w-72 max-w-72 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg overflow-hidden z-50">
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              <Trans>Drafts</Trans> ({drafts.length})
            </span>
            <Button
              variant="ghost"
              size="sm"
              onPress={onNewDraft}
              className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
            >
              <Trans>New</Trans>
            </Button>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {drafts.length === 0 ? (
              <div className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                <Trans>No drafts saved</Trans>
              </div>
            ) : (
              drafts.map((draft) => (
                <div
                  key={draft.id}
                  onClick={() => onLoadDraft(draft.id)}
                  onKeyDown={(e) => e.key === "Enter" && onLoadDraft(draft.id)}
                  className={`flex items-start justify-between px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                    currentDraftId === draft.id
                      ? "bg-primary-50 dark:bg-primary-900/20"
                      : ""
                  }`}
                  role="button"
                  tabIndex={0}
                >
                  <div className="flex-1 min-w-0 mr-2">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {draft.title || draft.text.slice(0, 30) || t`Empty draft`}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(draft.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onPress={(e) => onDeleteDraft(draft.id, e as unknown as React.MouseEvent)}
                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400 hover:text-red-500"
                    aria-label={t`Delete draft`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
