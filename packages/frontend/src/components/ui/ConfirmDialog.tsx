"use client";

import { Trans } from "@lingui/react/macro";
import { Button } from "./Button";

/**
 * Props for the ConfirmDialog component
 */
export interface ConfirmDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Callback when dialog is closed */
  onClose: () => void;
  /** Callback when action is confirmed */
  onConfirm: () => void;
  /** Dialog title */
  title: React.ReactNode;
  /** Dialog message */
  message: React.ReactNode;
  /** Confirm button text */
  confirmText?: React.ReactNode;
  /** Cancel button text */
  cancelText?: React.ReactNode;
  /** Confirm button variant */
  confirmVariant?: "primary" | "danger";
  /** Whether the action is in progress */
  isLoading?: boolean;
  /** Loading text */
  loadingText?: React.ReactNode;
}

/**
 * A reusable confirmation dialog component
 *
 * @example
 * ```tsx
 * <ConfirmDialog
 *   isOpen={showDeleteConfirm}
 *   onClose={() => setShowDeleteConfirm(false)}
 *   onConfirm={handleDelete}
 *   title={<Trans>Delete Note</Trans>}
 *   message={<Trans>Are you sure you want to delete this note?</Trans>}
 *   confirmText={<Trans>Delete</Trans>}
 *   confirmVariant="danger"
 *   isLoading={isDeleting}
 *   loadingText={<Trans>Deleting...</Trans>}
 * />
 * ```
 */
export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = <Trans>Confirm</Trans>,
  cancelText = <Trans>Cancel</Trans>,
  confirmVariant = "primary",
  isLoading = false,
  loadingText,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-lg bg-white dark:bg-gray-800 shadow-xl p-6">
        <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-gray-100">
          {title}
        </h2>
        <p className="mb-6 text-gray-700 dark:text-gray-300">{message}</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onPress={onClose} isDisabled={isLoading}>
            {cancelText}
          </Button>
          <Button
            variant={confirmVariant}
            onPress={onConfirm}
            isDisabled={isLoading}
          >
            {isLoading && loadingText ? loadingText : confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
