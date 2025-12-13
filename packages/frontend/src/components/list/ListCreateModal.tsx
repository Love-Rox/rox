"use client";

/**
 * List Create Modal Component
 *
 * Modal dialog for creating a new user list.
 * Built with React Aria Components for accessibility.
 *
 * @module components/list/ListCreateModal
 */

import { useState } from "react";
import { Trans } from "@lingui/react/macro";
import { X, Loader2 } from "lucide-react";
import {
  Dialog,
  Modal,
  ModalOverlay,
  Heading,
  Button as AriaButton,
  TextField,
  Label,
  Input,
} from "react-aria-components";
import { Switch } from "../ui/Switch";
import { Button } from "../ui/Button";
import { listsApi, type List } from "../../lib/api/lists";
import { useAtom } from "jotai";
import { addToastAtom } from "../../lib/atoms/toast";

/**
 * Props for ListCreateModal component
 */
export interface ListCreateModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when the modal should close */
  onClose: () => void;
  /** Callback when list is successfully created */
  onCreated?: (list: List) => void;
}

/**
 * Modal dialog for creating a new list
 *
 * Features:
 * - Text input for list name (required, max 100 chars)
 * - Switch for public/private visibility
 * - Create/Cancel buttons
 * - Loading state during API call
 * - Error handling with toast notifications
 *
 * @example
 * ```tsx
 * <ListCreateModal
 *   isOpen={showCreate}
 *   onClose={() => setShowCreate(false)}
 *   onCreated={(list) => handleListCreated(list)}
 * />
 * ```
 */
export function ListCreateModal({ isOpen, onClose, onCreated }: ListCreateModalProps) {
  const [name, setName] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [, addToast] = useAtom(addToastAtom);

  const handleSubmit = async () => {
    if (!name.trim()) return;

    setIsLoading(true);
    try {
      const list = await listsApi.create(name.trim(), isPublic);
      addToast({
        type: "success",
        message: "List created successfully",
      });
      onCreated?.(list);
      handleClose();
    } catch (error) {
      addToast({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to create list",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setName("");
    setIsPublic(false);
    onClose();
  };

  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={(open) => !open && handleClose()}
      isDismissable
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
    >
      <Modal className="w-full max-w-md bg-(--card-bg) rounded-xl shadow-xl overflow-hidden flex flex-col outline-none">
        <Dialog className="flex flex-col outline-none">
          {({ close }) => (
            <>
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-(--border-color)">
                <Heading slot="title" className="text-lg font-semibold text-(--text-primary)">
                  <Trans>Create List</Trans>
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
              <div className="p-4 space-y-4">
                {/* List name input */}
                <TextField
                  value={name}
                  onChange={setName}
                  maxLength={100}
                  isRequired
                  autoFocus
                  className="flex flex-col gap-1"
                >
                  <Label className="text-sm font-medium text-(--text-secondary)">
                    <Trans>List Name</Trans>
                  </Label>
                  <Input
                    placeholder="My List"
                    className="w-full px-3 py-2 border border-(--border-color) rounded-lg bg-(--input-bg) text-(--text-primary) placeholder:text-(--text-muted) focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </TextField>

                {/* Public/Private switch */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-(--text-secondary)">
                      <Trans>Public</Trans>
                    </p>
                    <p className="text-xs text-(--text-muted)">
                      <Trans>Anyone can see this list</Trans>
                    </p>
                  </div>
                  <Switch isSelected={isPublic} onChange={setIsPublic} aria-label="Public list" />
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 p-4 border-t border-(--border-color)">
                <Button variant="secondary" onPress={handleClose} isDisabled={isLoading}>
                  <Trans>Cancel</Trans>
                </Button>
                <Button
                  variant="primary"
                  onPress={handleSubmit}
                  isDisabled={!name.trim() || isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <Trans>Creating...</Trans>
                    </div>
                  ) : (
                    <Trans>Create</Trans>
                  )}
                </Button>
              </div>
            </>
          )}
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
