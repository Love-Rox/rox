"use client";

/**
 * UserDisplayName component
 *
 * Renders a user's display name with MFM support for custom emojis.
 * This is a shared component to avoid duplicating the profileEmojis -> emoji map
 * conversion and MfmRenderer usage across the codebase.
 */

import { useMemo } from "react";
import { MfmRenderer } from "../mfm/MfmRenderer";

/**
 * Profile emoji structure from user data
 */
export interface ProfileEmoji {
  name: string;
  url: string;
}

/**
 * Props for UserDisplayName component
 */
export interface UserDisplayNameProps {
  /** User's display name (name field) */
  name?: string | null;
  /** Fallback username if name is not available */
  username: string;
  /** Profile emojis array from user data */
  profileEmojis?: ProfileEmoji[] | null;
  /** Whether to render as plain text (no MFM formatting) */
  plain?: boolean;
  /** Additional CSS class name */
  className?: string;
}

/**
 * Converts profileEmojis array to emoji map for MfmRenderer
 */
function useEmojiMap(profileEmojis?: ProfileEmoji[] | null): Record<string, string> {
  return useMemo(() => {
    if (!profileEmojis || profileEmojis.length === 0) return {};
    return profileEmojis.reduce(
      (acc, emoji) => {
        acc[emoji.name] = emoji.url;
        return acc;
      },
      {} as Record<string, string>,
    );
  }, [profileEmojis]);
}

/**
 * UserDisplayName component
 *
 * Renders a user's display name with optional MFM custom emoji support.
 * Falls back to username if name is not available.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <UserDisplayName name={user.name} username={user.username} profileEmojis={user.profileEmojis} />
 *
 * // Plain text (no MFM)
 * <UserDisplayName name={user.name} username={user.username} plain />
 *
 * // With custom className
 * <UserDisplayName
 *   name={user.name}
 *   username={user.username}
 *   profileEmojis={user.profileEmojis}
 *   className="font-semibold"
 * />
 * ```
 */
export function UserDisplayName({
  name,
  username,
  profileEmojis,
  plain = false,
  className,
}: UserDisplayNameProps) {
  const emojiMap = useEmojiMap(profileEmojis);
  const displayName = name || username;

  // If no name or plain mode, just show text
  if (!name || plain) {
    return <span className={className}>{displayName}</span>;
  }

  return (
    <span className={className}>
      <MfmRenderer text={displayName} plain customEmojis={emojiMap} />
    </span>
  );
}

/**
 * Hook to convert profileEmojis to emoji map
 * Useful when you need the emoji map for other MfmRenderer usages
 *
 * @example
 * ```tsx
 * const emojiMap = useProfileEmojiMap(user.profileEmojis);
 * <MfmRenderer text={user.bio} customEmojis={emojiMap} />
 * ```
 */
export { useEmojiMap as useProfileEmojiMap };
