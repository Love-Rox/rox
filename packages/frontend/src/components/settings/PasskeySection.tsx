"use client";

/**
 * Passkey Settings Section Component
 *
 * Allows users to manage their WebAuthn passkeys:
 * - View registered passkeys
 * - Add new passkeys
 * - Rename passkeys
 * - Delete passkeys
 */

import { useState, useEffect, useCallback } from "react";
import { useAtom } from "jotai";
import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import { Key, Plus, Trash2, Pencil, Check, X, Smartphone, Monitor } from "lucide-react";
import { startRegistration } from "@simplewebauthn/browser";
import { useApi } from "../../hooks/useApi";
import { Button } from "../ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { Spinner } from "../ui/Spinner";
import { addToastAtom } from "../../lib/atoms/toast";

/**
 * Passkey credential from the API
 */
interface PasskeyCredential {
  id: string;
  name: string;
  deviceType: string | null;
  backedUp: boolean;
  createdAt: string;
  lastUsedAt: string | null;
}

/**
 * Passkey settings section component.
 *
 * Provides UI for managing WebAuthn passkeys including viewing registered
 * passkeys, registering new ones, renaming, and deleting existing passkeys.
 * Requires browser WebAuthn support.
 */
export function PasskeySection() {
  const api = useApi();
  const [, addToast] = useAtom(addToastAtom);

  const [passkeys, setPasskeys] = useState<PasskeyCredential[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  /**
   * Fetch user's passkeys
   */
  const fetchPasskeys = useCallback(async () => {
    if (!api.isAuthenticated) return;

    try {
      const response = await api.get<{ passkeys: PasskeyCredential[] }>("/api/auth/passkey");
      setPasskeys(response.passkeys);
    } catch (err) {
      console.error("Failed to fetch passkeys:", err);
      addToast({
        type: "error",
        message: t`Failed to load passkeys`,
      });
    } finally {
      setIsLoading(false);
    }
  }, [api, addToast]);

  useEffect(() => {
    fetchPasskeys();
  }, [fetchPasskeys]);

  /**
   * Register a new passkey
   */
  const handleRegister = async () => {
    if (!api.isAuthenticated) return;

    setIsRegistering(true);
    try {
      // 1. Get registration options from server
      const options = await api.post<any>("/api/auth/passkey/register/begin", {});

      // 2. Start browser WebAuthn registration
      const attestationResponse = await startRegistration({
        optionsJSON: options,
      });

      // 3. Send attestation to server for verification
      await api.post("/api/auth/passkey/register/finish", {
        credential: attestationResponse,
        name: t`Passkey ${new Date().toLocaleDateString()}`,
      });

      addToast({
        type: "success",
        message: t`Passkey registered successfully`,
      });

      // Refresh the passkey list
      await fetchPasskeys();
    } catch (err: any) {
      console.error("Passkey registration failed:", err);

      // Handle specific WebAuthn errors
      if (err.name === "NotAllowedError") {
        addToast({
          type: "error",
          message: t`Passkey registration was cancelled or not allowed`,
        });
      } else if (err.name === "InvalidStateError") {
        addToast({
          type: "error",
          message: t`This passkey is already registered`,
        });
      } else {
        addToast({
          type: "error",
          message: err.message || t`Failed to register passkey`,
        });
      }
    } finally {
      setIsRegistering(false);
    }
  };

  /**
   * Start editing a passkey name
   */
  const handleStartEdit = (passkey: PasskeyCredential) => {
    setEditingId(passkey.id);
    setEditingName(passkey.name);
  };

  /**
   * Cancel editing
   */
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName("");
  };

  /**
   * Save the edited passkey name
   */
  const handleSaveEdit = async () => {
    if (!api.isAuthenticated || !editingId || !editingName.trim()) return;

    try {
      await api.patch(`/api/auth/passkey/${editingId}`, {
        name: editingName.trim(),
      });

      addToast({
        type: "success",
        message: t`Passkey renamed`,
      });

      setEditingId(null);
      setEditingName("");
      await fetchPasskeys();
    } catch (err: any) {
      addToast({
        type: "error",
        message: err.message || t`Failed to rename passkey`,
      });
    }
  };

  /**
   * Delete a passkey
   */
  const handleDelete = async (passkeyId: string) => {
    if (!api.isAuthenticated) return;

    setDeletingId(passkeyId);
    try {
      await api.delete(`/api/auth/passkey/${passkeyId}`);

      addToast({
        type: "success",
        message: t`Passkey deleted`,
      });

      await fetchPasskeys();
    } catch (err: any) {
      addToast({
        type: "error",
        message: err.message || t`Failed to delete passkey`,
      });
    } finally {
      setDeletingId(null);
    }
  };

  /**
   * Format date for display
   */
  const formatDate = (dateString: string | null) => {
    if (!dateString) return t`Never`;
    return new Date(dateString).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  /**
   * Get device icon based on device type
   */
  const getDeviceIcon = (deviceType: string | null) => {
    if (deviceType === "singleDevice") {
      return <Smartphone className="w-4 h-4" />;
    }
    return <Monitor className="w-4 h-4" />;
  };

  // Check if browser supports WebAuthn
  const supportsWebAuthn =
    typeof window !== "undefined" &&
    window.PublicKeyCredential !== undefined;

  if (!supportsWebAuthn) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            <Trans>Passkeys</Trans>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            <Trans>Your browser does not support passkeys.</Trans>
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="w-5 h-5" />
          <Trans>Passkeys</Trans>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 pt-0 space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          <Trans>
            Passkeys allow you to sign in securely without a password using your device's
            biometrics or security key.
          </Trans>
        </p>

        {isLoading ? (
          <div className="flex justify-center py-4">
            <Spinner size="md" />
          </div>
        ) : (
          <>
            {/* Passkey List */}
            {passkeys.length > 0 ? (
              <div className="space-y-3">
                {passkeys.map((passkey) => (
                  <div
                    key={passkey.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-gray-500 dark:text-gray-400">
                        {getDeviceIcon(passkey.deviceType)}
                      </div>
                      <div>
                        {editingId === passkey.id ? (
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveEdit();
                              if (e.key === "Escape") handleCancelEdit();
                            }}
                          />
                        ) : (
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {passkey.name}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          <Trans>Added {formatDate(passkey.createdAt)}</Trans>
                          {passkey.lastUsedAt && (
                            <>
                              {" "}
                              &middot; <Trans>Last used {formatDate(passkey.lastUsedAt)}</Trans>
                            </>
                          )}
                          {passkey.backedUp && (
                            <>
                              {" "}
                              &middot;{" "}
                              <span className="text-green-600 dark:text-green-400">
                                <Trans>Synced</Trans>
                              </span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {editingId === passkey.id ? (
                        <>
                          <button
                            type="button"
                            onClick={handleSaveEdit}
                            className="p-1.5 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-md transition-colors"
                            title={t`Save`}
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                            title={t`Cancel`}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleStartEdit(passkey)}
                            className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                            title={t`Rename`}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(passkey.id)}
                            disabled={deletingId === passkey.id}
                            className="p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-md transition-colors disabled:opacity-50"
                            title={t`Delete`}
                          >
                            {deletingId === passkey.id ? (
                              <Spinner size="xs" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                <Key className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">
                  <Trans>No passkeys registered yet</Trans>
                </p>
              </div>
            )}

            {/* Add Passkey Button */}
            <Button
              onPress={handleRegister}
              isDisabled={isRegistering}
              variant="secondary"
              className="w-full"
            >
              {isRegistering ? (
                <div className="flex items-center gap-2">
                  <Spinner size="xs" />
                  <span>
                    <Trans>Registering...</Trans>
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  <span>
                    <Trans>Add Passkey</Trans>
                  </span>
                </div>
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
