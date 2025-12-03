"use client";

/**
 * Profile Image Section Component
 *
 * Allows users to upload and manage their avatar and banner images.
 */

import { useState, useRef } from "react";
import { useAtom } from "jotai";
import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import { Camera, X, Upload, ImageIcon } from "lucide-react";
import { currentUserAtom, tokenAtom } from "../../lib/atoms/auth";
import { usersApi } from "../../lib/api/users";
import { apiClient } from "../../lib/api/client";
import { Button } from "../ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { Spinner } from "../ui/Spinner";
import { addToastAtom } from "../../lib/atoms/toast";
import { Avatar } from "../ui/Avatar";

export function ProfileImageSection() {
  const [currentUser, setCurrentUser] = useAtom(currentUserAtom);
  const [token] = useAtom(tokenAtom);
  const [, addToast] = useAtom(addToastAtom);

  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [isDeletingAvatar, setIsDeletingAvatar] = useState(false);
  const [isDeletingBanner, setIsDeletingBanner] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  if (!currentUser || !token) {
    return null;
  }

  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      addToast({
        type: "error",
        message: t`Please select an image file`,
      });
      return;
    }

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      addToast({
        type: "error",
        message: t`Image must be less than 2MB`,
      });
      return;
    }

    setIsUploadingAvatar(true);
    try {
      apiClient.setToken(token);
      const result = await usersApi.uploadAvatar(file);

      // Update current user with new avatar URL
      setCurrentUser({
        ...currentUser,
        avatarUrl: result.avatarUrl,
      });

      addToast({
        type: "success",
        message: t`Avatar updated successfully`,
      });
    } catch (err: any) {
      addToast({
        type: "error",
        message: err.message || t`Failed to upload avatar`,
      });
    } finally {
      setIsUploadingAvatar(false);
      // Reset input
      if (avatarInputRef.current) {
        avatarInputRef.current.value = "";
      }
    }
  };

  const handleBannerSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      addToast({
        type: "error",
        message: t`Please select an image file`,
      });
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      addToast({
        type: "error",
        message: t`Image must be less than 5MB`,
      });
      return;
    }

    setIsUploadingBanner(true);
    try {
      apiClient.setToken(token);
      const result = await usersApi.uploadBanner(file);

      // Update current user with new banner URL
      setCurrentUser({
        ...currentUser,
        bannerUrl: result.bannerUrl,
      });

      addToast({
        type: "success",
        message: t`Banner updated successfully`,
      });
    } catch (err: any) {
      addToast({
        type: "error",
        message: err.message || t`Failed to upload banner`,
      });
    } finally {
      setIsUploadingBanner(false);
      // Reset input
      if (bannerInputRef.current) {
        bannerInputRef.current.value = "";
      }
    }
  };

  const handleDeleteAvatar = async () => {
    setIsDeletingAvatar(true);
    try {
      apiClient.setToken(token);
      await usersApi.deleteAvatar();

      // Update current user
      setCurrentUser({
        ...currentUser,
        avatarUrl: null,
      });

      addToast({
        type: "success",
        message: t`Avatar removed`,
      });
    } catch (err: any) {
      addToast({
        type: "error",
        message: err.message || t`Failed to remove avatar`,
      });
    } finally {
      setIsDeletingAvatar(false);
    }
  };

  const handleDeleteBanner = async () => {
    setIsDeletingBanner(true);
    try {
      apiClient.setToken(token);
      await usersApi.deleteBanner();

      // Update current user
      setCurrentUser({
        ...currentUser,
        bannerUrl: null,
      });

      addToast({
        type: "success",
        message: t`Banner removed`,
      });
    } catch (err: any) {
      addToast({
        type: "error",
        message: err.message || t`Failed to remove banner`,
      });
    } finally {
      setIsDeletingBanner(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="w-5 h-5" />
          <Trans>Profile Images</Trans>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 pt-0 space-y-6">
        {/* Avatar Section */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            <Trans>Avatar</Trans>
          </label>
          <div className="flex items-center gap-4">
            {/* Current Avatar */}
            <div className="relative group">
              <Avatar
                src={currentUser.avatarUrl}
                alt={currentUser.displayName || currentUser.username}
                fallback={(currentUser.displayName || currentUser.username || "?").charAt(0).toUpperCase()}
                size="xl"
              />
              {currentUser.avatarUrl && (
                <button
                  type="button"
                  onClick={handleDeleteAvatar}
                  disabled={isDeletingAvatar}
                  className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                  title={t`Remove avatar`}
                >
                  {isDeletingAvatar ? (
                    <Spinner size="xs" variant="white" />
                  ) : (
                    <X className="w-3 h-3" />
                  )}
                </button>
              )}
            </div>

            {/* Upload Button */}
            <div className="flex-1">
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarSelect}
                className="hidden"
                id="avatar-upload"
              />
              <Button
                variant="secondary"
                onPress={() => avatarInputRef.current?.click()}
                isDisabled={isUploadingAvatar}
              >
                {isUploadingAvatar ? (
                  <div className="flex items-center gap-2">
                    <Spinner size="xs" />
                    <span>
                      <Trans>Uploading...</Trans>
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    <span>
                      <Trans>Upload Avatar</Trans>
                    </span>
                  </div>
                )}
              </Button>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                <Trans>Recommended: Square image, max 2MB</Trans>
              </p>
            </div>
          </div>
        </div>

        {/* Banner Section */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            <Trans>Banner</Trans>
          </label>

          {/* Current Banner */}
          <div className="relative group">
            <div className="w-full h-32 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
              {currentUser.bannerUrl ? (
                <img
                  src={currentUser.bannerUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <ImageIcon className="w-12 h-12" />
                </div>
              )}
            </div>
            {currentUser.bannerUrl && (
              <button
                type="button"
                onClick={handleDeleteBanner}
                disabled={isDeletingBanner}
                className="absolute top-2 right-2 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                title={t`Remove banner`}
              >
                {isDeletingBanner ? (
                  <Spinner size="xs" variant="white" />
                ) : (
                  <X className="w-4 h-4" />
                )}
              </button>
            )}
          </div>

          {/* Upload Button */}
          <div>
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/*"
              onChange={handleBannerSelect}
              className="hidden"
              id="banner-upload"
            />
            <Button
              variant="secondary"
              onPress={() => bannerInputRef.current?.click()}
              isDisabled={isUploadingBanner}
            >
              {isUploadingBanner ? (
                <div className="flex items-center gap-2">
                  <Spinner size="xs" />
                  <span>
                    <Trans>Uploading...</Trans>
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  <span>
                    <Trans>Upload Banner</Trans>
                  </span>
                </div>
              )}
            </Button>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              <Trans>Recommended: 1500x500 pixels, max 5MB</Trans>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
