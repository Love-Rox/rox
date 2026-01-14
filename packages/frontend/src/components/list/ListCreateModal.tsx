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
import { Loader2 } from "lucide-react";
import { TextField, Label, Input } from "react-aria-components";
import { FormModal } from "../ui/FormModal";
import { Switch } from "../ui/Switch";
import { Button } from "../ui/Button";
import { listsApi, type List } from "../../lib/api/lists";
import { useAtom } from "jotai";
import { addToastAtom } from "../../lib/atoms/toast";
import { getErrorMessage } from "../../lib/utils/errors";

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
export function ListCreateModal({
  isOpen,
  onClose,
  onCreated,
}: ListCreateModalProps) {
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
        message: getErrorMessage(error, "Failed to create list"),
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
    <FormModal
      isOpen={isOpen}
      onClose={handleClose}
      title={<Trans>Create List</Trans>}
      footer={
        <>
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
        </>
      }
    >
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
    </FormModal>
  );
}
