"use client";

import { useState, useRef, useEffect } from "react";
import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import { MoreHorizontal, Share, Copy, ExternalLink, Trash2, Flag } from "lucide-react";
import { Button } from "../ui/Button";

/**
 * Props for the NoteCardMenu component
 */
export interface NoteCardMenuProps {
  /** Note ID */
  noteId: string;
  /** Note URI (for remote notes) */
  noteUri?: string | null;
  /** Note text for sharing */
  noteText?: string | null;
  /** Note author username */
  authorUsername: string;
  /** Whether the current user is the author */
  isOwnNote: boolean;
  /** Whether the user is logged in */
  isLoggedIn: boolean;
  /** Callback when delete is requested */
  onDeleteRequest: () => void;
  /** Callback when report is requested */
  onReportRequest: () => void;
  /** Callback for toast notifications */
  onToast: (type: "success" | "error", message: string) => void;
}

/**
 * Menu component for note actions (share, delete, report)
 */
export function NoteCardMenu({
  noteId,
  noteUri,
  noteText,
  authorUsername,
  isOwnNote,
  isLoggedIn,
  onDeleteRequest,
  onReportRequest,
  onToast,
}: NoteCardMenuProps) {
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    if (!showMoreMenu) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false);
        setShowShareMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMoreMenu]);

  /**
   * Get the public URL for this note
   */
  const getNoteUrl = (): string => {
    if (noteUri) {
      return noteUri;
    }
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    return `${baseUrl}/notes/${noteId}`;
  };

  /**
   * Copy note URL to clipboard
   */
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getNoteUrl());
      onToast("success", t`Link copied to clipboard`);
    } catch {
      onToast("error", t`Failed to copy link`);
    }
    setShowShareMenu(false);
    setShowMoreMenu(false);
  };

  /**
   * Open note in new tab
   */
  const handleOpenInNewTab = () => {
    window.open(getNoteUrl(), "_blank", "noopener,noreferrer");
    setShowShareMenu(false);
    setShowMoreMenu(false);
  };

  /**
   * Share using Web Share API (if available)
   */
  const handleNativeShare = async () => {
    const url = getNoteUrl();
    const text = noteText || "";
    const title = t`Note by @${authorUsername}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: text.length > 100 ? `${text.slice(0, 100)}...` : text,
          url,
        });
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("Share failed:", err);
        }
      }
    } else {
      await handleCopyLink();
      return;
    }
    setShowShareMenu(false);
    setShowMoreMenu(false);
  };

  const canUseNativeShare = typeof navigator !== "undefined" && "share" in navigator;

  return (
    <div ref={menuRef} className="relative ml-auto">
      <Button
        variant="ghost"
        size="sm"
        onPress={() => {
          setShowMoreMenu(!showMoreMenu);
          setShowShareMenu(false);
        }}
        className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
        aria-label={t`More options`}
        aria-expanded={showMoreMenu}
      >
        <MoreHorizontal className="w-4 h-4" />
      </Button>
      {showMoreMenu && (
        <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border border-(--border-color) bg-(--bg-primary) shadow-lg z-10">
          {/* Share submenu trigger */}
          <div className="relative">
            <Button
              variant="ghost"
              onPress={() => setShowShareMenu(!showShareMenu)}
              className="flex items-center justify-between gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-(--bg-secondary) rounded-t-lg"
              aria-expanded={showShareMenu}
              aria-haspopup="menu"
            >
              <span className="flex items-center gap-2">
                <Share className="w-4 h-4" />
                <Trans>Share</Trans>
              </span>
              <span
                className={`text-gray-400 transition-transform ${showShareMenu ? "rotate-90" : ""}`}
              >
                ›
              </span>
            </Button>
            {/* Share submenu */}
            {showShareMenu && (
              <div className="border-t border-(--border-color)" role="menu">
                <Button
                  variant="ghost"
                  onPress={handleCopyLink}
                  className="flex items-center gap-2 w-full px-3 py-2 pl-7 text-sm text-gray-700 dark:text-gray-300 hover:bg-(--bg-secondary)"
                  aria-label={t`Copy link`}
                >
                  <Copy className="w-4 h-4" />
                  <Trans>Copy link</Trans>
                </Button>
                <Button
                  variant="ghost"
                  onPress={handleOpenInNewTab}
                  className="flex items-center gap-2 w-full px-3 py-2 pl-7 text-sm text-gray-700 dark:text-gray-300 hover:bg-(--bg-secondary)"
                  aria-label={t`Open in new tab`}
                >
                  <ExternalLink className="w-4 h-4" />
                  <Trans>Open in new tab</Trans>
                </Button>
                {canUseNativeShare && (
                  <Button
                    variant="ghost"
                    onPress={handleNativeShare}
                    className="flex items-center gap-2 w-full px-3 py-2 pl-7 text-sm text-gray-700 dark:text-gray-300 hover:bg-(--bg-secondary)"
                    aria-label={t`Share via`}
                  >
                    <Share className="w-4 h-4" />
                    <Trans>Share via...</Trans>
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Divider if user actions available */}
          {isLoggedIn && <div className="border-t border-(--border-color)" />}

          {/* Delete option (own notes) */}
          {isLoggedIn && isOwnNote && (
            <Button
              variant="ghost"
              onPress={() => {
                setShowMoreMenu(false);
                setShowShareMenu(false);
                onDeleteRequest();
              }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-(--bg-secondary) rounded-b-lg"
              aria-label={t`Delete note`}
            >
              <Trash2 className="w-4 h-4" />
              <Trans>Delete</Trans>
            </Button>
          )}

          {/* Report option (other's notes) */}
          {isLoggedIn && !isOwnNote && (
            <Button
              variant="ghost"
              onPress={() => {
                setShowMoreMenu(false);
                setShowShareMenu(false);
                onReportRequest();
              }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-(--bg-secondary) rounded-b-lg"
              aria-label={t`Report note`}
            >
              <Flag className="w-4 h-4" />
              <Trans>Report</Trans>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
