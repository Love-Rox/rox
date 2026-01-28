"use client";

import { useMemo } from "react";
import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import { Clock } from "lucide-react";
import { Button } from "../ui/Button";

/**
 * Props for NoteComposerSchedulePicker component
 */
export interface NoteComposerSchedulePickerProps {
  /** Scheduled date/time in ISO format */
  scheduledAt: string | null;
  /** Whether the picker is open */
  isOpen: boolean;
  /** Whether the picker is disabled */
  isDisabled: boolean;
  /** Whether the submit button should be disabled */
  isSubmitDisabled: boolean;
  /** Toggle picker visibility */
  onToggle: () => void;
  /** Set scheduled date */
  onScheduledAtChange: (value: string | null) => void;
  /** Submit the scheduled post */
  onScheduleSubmit: () => void;
  /** Cancel scheduling */
  onCancel: () => void;
}

/**
 * Component for scheduling posts in the note composer
 */
export function NoteComposerSchedulePicker({
  scheduledAt,
  isOpen,
  isDisabled,
  isSubmitDisabled,
  onToggle,
  onScheduledAtChange,
  onScheduleSubmit,
  onCancel,
}: NoteComposerSchedulePickerProps) {
  // Compute min datetime in local timezone (datetime-local expects local time, not UTC)
  const minDateTime = useMemo(() => {
    const date = new Date(Date.now() + 60000);
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 16);
  }, []);

  return (
    <div className="relative">
      <Button
        variant="ghost"
        onPress={onToggle}
        isDisabled={isDisabled}
        className={`p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 ${
          isOpen || scheduledAt
            ? "bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400"
            : "text-gray-600 dark:text-gray-400"
        }`}
        aria-label={t`Schedule post`}
        aria-expanded={isOpen}
      >
        <Clock className="w-5 h-5" />
      </Button>

      {/* Schedule picker dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 sm:left-auto sm:right-0 mt-2 w-[calc(100vw-2rem)] sm:w-80 max-w-80 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-60">
          <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              <Trans>Schedule post</Trans>
            </span>
          </div>
          <div className="p-3 space-y-3">
            <input
              type="datetime-local"
              value={scheduledAt || ""}
              onChange={(e) => onScheduledAtChange(e.target.value || null)}
              min={minDateTime}
              aria-label={t`Schedule date and time`}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            {scheduledAt && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                <Trans>
                  Will be posted at {new Date(scheduledAt).toLocaleString()}
                </Trans>
              </div>
            )}
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onPress={onCancel}
                className="flex-1"
              >
                <Trans>Cancel</Trans>
              </Button>
              <Button
                variant="primary"
                size="sm"
                onPress={onScheduleSubmit}
                isDisabled={!scheduledAt || isSubmitDisabled}
                className="flex-1"
              >
                <Trans>Schedule</Trans>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
