"use client";

/**
 * Notification list component
 *
 * Displays a list of notifications with infinite scroll
 */

import { useState } from "react";
import { Trans } from "@lingui/react/macro";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { NotificationItem } from "./NotificationItem";
import { useNotifications } from "../../hooks/useNotifications";
import { useInfiniteScroll } from "../../hooks/useInfiniteScroll";
import { useRouter } from "../ui/SpaLink";
import type { Notification } from "../../lib/types/notification";

/**
 * Props for the NotificationList component.
 */
interface NotificationListProps {
  /** Optional callback when a notification is clicked (overrides default navigation) */
  onNotificationClick?: (notification: Notification) => void;
}

/**
 * Notification list component with infinite scroll.
 *
 * Displays a scrollable list of notifications with support for:
 * - Marking individual notifications as read
 * - Marking all notifications as read
 * - Infinite scroll loading for older notifications
 * - Default navigation to note or user profile on click
 */
export function NotificationList({ onNotificationClick }: NotificationListProps) {
  const { notifications, loading, markAsRead, markAllAsRead, loadMore } = useNotifications();
  const router = useRouter();

  const [hasMore, setHasMore] = useState(true);

  const loadMoreRef = useInfiniteScroll({
    onLoadMore: async () => {
      const prevCount = notifications.length;
      await loadMore();
      // If no new notifications loaded, we've reached the end
      if (notifications.length === prevCount) {
        setHasMore(false);
      }
    },
    isLoading: loading,
    hasMore,
  });

  const handleNotificationClick = (notification: Notification) => {
    // Navigate based on notification type
    if (onNotificationClick) {
      onNotificationClick(notification);
      return;
    }

    // Default navigation using SPA router
    if (notification.noteId) {
      router.push(`/notes/${notification.noteId}`);
    } else if (notification.notifier) {
      const host = notification.notifier.host;
      const username = notification.notifier.username;
      if (host) {
        router.push(`/@${username}@${host}`);
      } else {
        router.push(`/@${username}`);
      }
    }
  };

  if (notifications.length === 0 && !loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-(--text-muted)">
        <Bell className="w-12 h-12 mb-4 opacity-50" />
        <p className="text-lg font-medium">
          <Trans>No notifications</Trans>
        </p>
        <p className="text-sm mt-1">
          <Trans>You're all caught up!</Trans>
        </p>
      </div>
    );
  }

  const hasUnread = notifications.some((n) => !n.isRead);

  return (
    <div className="flex flex-col">
      {/* Header */}
      {hasUnread && (
        <div className="flex items-center justify-end p-3 border-b border-(--border-color)">
          <button
            type="button"
            onClick={markAllAsRead}
            className="flex items-center gap-1 text-xs text-(--text-muted) hover:text-(--text-primary) transition-colors"
          >
            <CheckCheck className="w-4 h-4" />
            <Trans>Mark all as read</Trans>
          </button>
        </div>
      )}

      {/* Notification items */}
      <div className="divide-y divide-(--border-color)">
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onMarkAsRead={markAsRead}
            onClick={handleNotificationClick}
          />
        ))}
      </div>

      {/* Load more trigger */}
      <div ref={loadMoreRef} className="h-10 flex items-center justify-center">
        {loading && <Loader2 className="w-5 h-5 animate-spin text-(--text-muted)" />}
      </div>
    </div>
  );
}
