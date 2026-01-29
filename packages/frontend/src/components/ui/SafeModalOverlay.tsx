"use client";

/**
 * Safe Modal Overlay Component
 *
 * Wraps React Aria's ModalOverlay with a stable portal container
 * and automatic registration to the modal registry for safe cleanup
 * during navigation.
 *
 * @module components/ui/SafeModalOverlay
 */

import { useEffect, useId } from "react";
import { useSetAtom } from "jotai";
import {
  ModalOverlay,
  type ModalOverlayProps,
} from "react-aria-components";
import { registerModalAtom, unregisterModalAtom } from "../../lib/atoms/modals";
import { getModalContainer } from "../../lib/utils/modalContainer";

/**
 * Props for SafeModalOverlay component
 */
export interface SafeModalOverlayProps extends ModalOverlayProps {
  /** Callback when the modal should close */
  onClose: () => void;
}

/**
 * Safe Modal Overlay
 *
 * A wrapper around React Aria's ModalOverlay that:
 * 1. Uses a stable portal container that persists across navigations
 * 2. Registers itself with the modal registry for coordinated cleanup
 * 3. Ensures modals are properly closed before navigation occurs
 *
 * @example
 * ```tsx
 * <SafeModalOverlay
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   isDismissable
 *   className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
 * >
 *   <Modal>...</Modal>
 * </SafeModalOverlay>
 * ```
 */
export function SafeModalOverlay({
  isOpen,
  onClose,
  onOpenChange,
  children,
  ...props
}: SafeModalOverlayProps) {
  const modalId = useId();
  const registerModal = useSetAtom(registerModalAtom);
  const unregisterModal = useSetAtom(unregisterModalAtom);

  // Register/unregister modal with the registry
  useEffect(() => {
    if (isOpen) {
      registerModal({ id: modalId, close: onClose });
      return () => {
        unregisterModal(modalId);
      };
    }
    return undefined;
  }, [isOpen, modalId, onClose, registerModal, unregisterModal]);

  // Handle open change from React Aria
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
    onOpenChange?.(open);
  };

  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      UNSTABLE_portalContainer={getModalContainer()}
      {...props}
    >
      {children}
    </ModalOverlay>
  );
}
