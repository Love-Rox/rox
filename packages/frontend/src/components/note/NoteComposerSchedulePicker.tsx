"use client";

import { useMemo } from "react";
import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import { Clock } from "lucide-react";
import {
  DialogTrigger,
  Popover,
  Dialog,
  Heading,
} from "react-aria-components";
import { Button } from "../ui/Button";
import { TextField } from "../ui/TextField";
import { getModalContainer } from "../../lib/utils/modalContainer";

/**
 * Props for NoteComposerSchedulePicker component
 */
export interface NoteComposerSchedulePickerProps {
  /** Scheduled local date/time string (YYYY-MM-DDTHH:mm) for datetime-local input */
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
 * Component for scheduling posts in the note composer.
 * Uses React Aria DialogTrigger + Popover for accessible dropdown.
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
  // Recalculate when picker is opened to ensure the minimum time is always current
  const minDateTime = useMemo(() => {
    const date = new Date(Date.now() + 60000);
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 16);
  }, [isOpen]);

  return (
    <DialogTrigger isOpen={isOpen} onOpenChange={(open) => !open && onCancel()}>
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
      >
        <Clock className="w-5 h-5" />
      </Button>
      <Popover
        UNSTABLE_portalContainer={getModalContainer()}
        placement="bottom end"
        className="w-[calc(100vw-2rem)] sm:w-80 max-w-80 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-60"
      >
        <Dialog className="outline-none">
          <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
            <Heading
              slot="title"
              className="text-sm font-medium text-gray-900 dark:text-gray-100"
            >
              <Trans>Schedule post</Trans>
            </Heading>
          </div>
          <div className="p-3 space-y-3">
            <TextField
              type="datetime-local"
              value={scheduledAt || ""}
              onChange={(value) => onScheduledAtChange(value || null)}
              min={minDateTime}
              aria-label={t`Schedule date and time`}
              className="w-full"
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
        </Dialog>
      </Popover>
    </DialogTrigger>
  );
}
