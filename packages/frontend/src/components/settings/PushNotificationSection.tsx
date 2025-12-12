"use client";

/**
 * Push Notification Settings Section
 *
 * Allows users to manage push notification subscriptions
 */

import { useState, useEffect, useCallback } from "react";
import { useAtom } from "jotai";
import { Trans, useLingui } from "@lingui/react/macro";
import { msg } from "@lingui/core/macro";
import type { MessageDescriptor } from "@lingui/core";
import {
  Bell,
  BellOff,
  Smartphone,
  Send,
  AlertCircle,
  Check,
  UserPlus,
  AtSign,
  MessageSquare,
  Heart,
  Repeat,
  Quote,
  ShieldAlert,
  UserCheck,
  Mail,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { usePushNotifications } from "../../hooks/usePushNotifications";
import { Button } from "../ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { Spinner } from "../ui/Spinner";
import { Switch } from "../ui/Switch";
import { currentUserAtom } from "../../lib/atoms/auth";
import { usersApi } from "../../lib/api/users";
import { addToastAtom } from "../../lib/atoms/toast";

/**
 * Notification type configuration
 */
interface NotificationTypeConfig {
  type: string;
  label: MessageDescriptor;
  description: MessageDescriptor;
  icon: LucideIcon;
}

/**
 * Available notification types with labels and icons
 */
const NOTIFICATION_TYPES: NotificationTypeConfig[] = [
  {
    type: "follow",
    label: msg`New followers`,
    description: msg`When someone follows you`,
    icon: UserPlus,
  },
  {
    type: "mention",
    label: msg`Mentions`,
    description: msg`When someone mentions you`,
    icon: AtSign,
  },
  {
    type: "reply",
    label: msg`Replies`,
    description: msg`When someone replies to your post`,
    icon: MessageSquare,
  },
  {
    type: "reaction",
    label: msg`Reactions`,
    description: msg`When someone reacts to your post`,
    icon: Heart,
  },
  {
    type: "renote",
    label: msg`Renotes`,
    description: msg`When someone renotes your post`,
    icon: Repeat,
  },
  {
    type: "quote",
    label: msg`Quotes`,
    description: msg`When someone quotes your post`,
    icon: Quote,
  },
  {
    type: "follow_request_accepted",
    label: msg`Follow requests accepted`,
    description: msg`When your follow request is accepted`,
    icon: UserCheck,
  },
  {
    type: "dm",
    label: msg`Direct messages`,
    description: msg`When you receive a direct message`,
    icon: Mail,
  },
  {
    type: "warning",
    label: msg`Warnings`,
    description: msg`When you receive a moderation warning`,
    icon: ShieldAlert,
  },
];

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Get device name from user agent
 */
function getDeviceName(userAgent?: string): string {
  if (!userAgent) return "Unknown device";

  if (userAgent.includes("Mobile")) {
    if (userAgent.includes("iPhone")) return "iPhone";
    if (userAgent.includes("Android")) return "Android";
    return "Mobile";
  }
  if (userAgent.includes("Mac")) return "Mac";
  if (userAgent.includes("Windows")) return "Windows";
  if (userAgent.includes("Linux")) return "Linux";

  return "Browser";
}

export function PushNotificationSection() {
  const { t } = useLingui();
  const [currentUser, setCurrentUser] = useAtom(currentUserAtom);
  const [, addToast] = useAtom(addToastAtom);
  const {
    isSupported,
    isAvailable,
    permission,
    isSubscribed,
    subscriptions,
    loading,
    error,
    subscribe,
    unsubscribe,
    sendTest,
  } = usePushNotifications();

  // Track disabled notification types
  const [disabledTypes, setDisabledTypes] = useState<string[]>([]);
  const [savingTypes, setSavingTypes] = useState(false);

  // Load disabled types from user settings
  useEffect(() => {
    if (currentUser?.uiSettings?.disabledPushNotificationTypes) {
      setDisabledTypes(currentUser.uiSettings.disabledPushNotificationTypes);
    }
  }, [currentUser?.uiSettings?.disabledPushNotificationTypes]);

  /**
   * Toggle a notification type on/off
   */
  const toggleNotificationType = useCallback(
    async (type: string, enabled: boolean) => {
      const newDisabledTypes = enabled
        ? disabledTypes.filter((t) => t !== type)
        : [...disabledTypes, type];

      setDisabledTypes(newDisabledTypes);
      setSavingTypes(true);

      try {
        const updatedUser = await usersApi.updateMe({
          uiSettings: {
            ...currentUser?.uiSettings,
            disabledPushNotificationTypes: newDisabledTypes,
          },
        });
        setCurrentUser(updatedUser);
      } catch {
        // Revert on error
        setDisabledTypes(disabledTypes);
        addToast({
          type: "error",
          message: t(msg`Failed to update notification settings`),
        });
      } finally {
        setSavingTypes(false);
      }
    },
    [disabledTypes, currentUser?.uiSettings, setCurrentUser, addToast, t],
  );

  // Not supported by browser
  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            <Trans>Push Notifications</Trans>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-amber-700 dark:text-amber-300">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm">
              <Trans>Your browser does not support push notifications.</Trans>
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Not available on server
  if (!isAvailable && !loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            <Trans>Push Notifications</Trans>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-400">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm">
              <Trans>Push notifications are not configured on this server.</Trans>
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          <Trans>Push Notifications</Trans>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Error message */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-700 dark:text-red-300">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Permission denied warning */}
        {permission === "denied" && (
          <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-amber-700 dark:text-amber-300">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium">
                <Trans>Notifications are blocked</Trans>
              </p>
              <p className="mt-1">
                <Trans>
                  Please enable notifications in your browser settings to receive push
                  notifications.
                </Trans>
              </p>
            </div>
          </div>
        )}

        {/* Subscription status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isSubscribed ? (
              <>
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="font-medium text-(--text-primary)">
                    <Trans>Push notifications enabled</Trans>
                  </p>
                  <p className="text-sm text-(--text-muted)">
                    <Trans>You will receive notifications even when the browser is closed.</Trans>
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <BellOff className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </div>
                <div>
                  <p className="font-medium text-(--text-primary)">
                    <Trans>Push notifications disabled</Trans>
                  </p>
                  <p className="text-sm text-(--text-muted)">
                    <Trans>Enable to receive notifications in the background.</Trans>
                  </p>
                </div>
              </>
            )}
          </div>

          <Button
            onPress={isSubscribed ? unsubscribe : subscribe}
            isDisabled={loading || permission === "denied"}
            variant={isSubscribed ? "secondary" : "primary"}
          >
            {loading ? (
              <Spinner size="sm" />
            ) : isSubscribed ? (
              <Trans>Disable</Trans>
            ) : (
              <Trans>Enable</Trans>
            )}
          </Button>
        </div>

        {/* Test notification button */}
        {isSubscribed && (
          <div className="pt-4 border-t border-(--border-color)">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-(--text-primary)">
                  <Trans>Test notification</Trans>
                </p>
                <p className="text-sm text-(--text-muted)">
                  <Trans>Send a test notification to verify your setup.</Trans>
                </p>
              </div>
              <Button onPress={sendTest} isDisabled={loading} variant="secondary" size="sm">
                {loading ? <Spinner size="sm" /> : <Send className="w-4 h-4" />}
                <span className="ml-2">
                  <Trans>Send test</Trans>
                </span>
              </Button>
            </div>
          </div>
        )}

        {/* Subscription list */}
        {subscriptions.length > 0 && (
          <div className="pt-4 border-t border-(--border-color)">
            <h4 className="text-sm font-medium text-(--text-primary) mb-3">
              <Trans>Registered devices</Trans>
            </h4>
            <ul className="space-y-2">
              {subscriptions.map((sub) => (
                <li
                  key={sub.id}
                  className="flex items-center justify-between p-3 bg-(--bg-secondary) rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Smartphone className="w-5 h-5 text-(--text-muted)" />
                    <div>
                      <p className="text-sm font-medium text-(--text-primary)">
                        {getDeviceName(sub.userAgent)}
                      </p>
                      <p className="text-xs text-(--text-muted)">{formatDate(sub.createdAt)}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Notification type settings */}
        {isSubscribed && (
          <div className="pt-4 border-t border-(--border-color)">
            <h4 className="text-sm font-medium text-(--text-primary) mb-3">
              <Trans>Notification types</Trans>
            </h4>
            <p className="text-sm text-(--text-muted) mb-4">
              <Trans>Choose which types of notifications you want to receive.</Trans>
            </p>
            <ul className="space-y-3">
              {NOTIFICATION_TYPES.map((config) => {
                const Icon = config.icon;
                const isEnabled = !disabledTypes.includes(config.type);
                return (
                  <li
                    key={config.type}
                    className="flex items-center justify-between p-3 bg-(--bg-secondary) rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5 text-(--text-muted)" />
                      <div>
                        <p className="text-sm font-medium text-(--text-primary)">{t(config.label)}</p>
                        <p className="text-xs text-(--text-muted)">{t(config.description)}</p>
                      </div>
                    </div>
                    <Switch
                      isSelected={isEnabled}
                      onChange={(enabled) => toggleNotificationType(config.type, enabled)}
                      isDisabled={savingTypes}
                      aria-label={t(config.label)}
                    />
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
