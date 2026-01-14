"use client";

/**
 * Form Modal Base Component
 *
 * Provides a consistent modal structure for forms and dialogs.
 * Built with React Aria Components for accessibility.
 *
 * @module components/ui/FormModal
 */

import type { ReactNode } from "react";
import { X } from "lucide-react";
import {
  Dialog,
  Modal,
  ModalOverlay,
  Heading,
  Button as AriaButton,
} from "react-aria-components";

/**
 * Props for FormModal component
 */
export interface FormModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when the modal should close */
  onClose: () => void;
  /** Modal title displayed in the header */
  title: ReactNode;
  /** Modal content (form fields, etc.) */
  children: ReactNode;
  /** Footer content (action buttons) */
  footer?: ReactNode;
  /** Maximum width of the modal */
  maxWidth?: "sm" | "md" | "lg" | "xl";
  /** Whether clicking outside closes the modal */
  isDismissable?: boolean;
}

const maxWidthClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
};

/**
 * Base Modal Component for Forms
 *
 * Provides a consistent structure with:
 * - Header with title and close button
 * - Scrollable content area
 * - Optional footer for action buttons
 *
 * @example
 * ```tsx
 * <FormModal
 *   isOpen={isOpen}
 *   onClose={handleClose}
 *   title={<Trans>Create List</Trans>}
 *   footer={
 *     <>
 *       <Button variant="secondary" onPress={handleClose}>Cancel</Button>
 *       <Button variant="primary" onPress={handleSubmit}>Create</Button>
 *     </>
 *   }
 * >
 *   <TextField value={name} onChange={setName}>
 *     <Label>Name</Label>
 *     <Input />
 *   </TextField>
 * </FormModal>
 * ```
 */
export function FormModal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = "md",
  isDismissable = true,
}: FormModalProps) {
  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={(open) => !open && onClose()}
      isDismissable={isDismissable}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
    >
      <Modal
        className={`w-full ${maxWidthClasses[maxWidth]} bg-(--card-bg) rounded-xl shadow-xl overflow-hidden flex flex-col outline-none max-h-[90vh]`}
      >
        <Dialog className="flex flex-col outline-none overflow-hidden">
          {({ close }) => (
            <>
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-(--border-color) shrink-0">
                <Heading
                  slot="title"
                  className="text-lg font-semibold text-(--text-primary)"
                >
                  {title}
                </Heading>
                <AriaButton
                  onPress={close}
                  className="p-2 hover:bg-(--bg-secondary) rounded-full transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                  aria-label="Close"
                >
                  <X className="w-5 h-5 text-(--text-muted)" />
                </AriaButton>
              </div>

              {/* Content */}
              <div className="p-4 space-y-4 overflow-y-auto">{children}</div>

              {/* Footer */}
              {footer && (
                <div className="flex items-center justify-end gap-3 p-4 border-t border-(--border-color) shrink-0">
                  {footer}
                </div>
              )}
            </>
          )}
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
