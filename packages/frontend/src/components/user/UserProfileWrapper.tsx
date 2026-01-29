"use client";

import { ErrorBoundary } from "../ui/ErrorBoundary";
import { UserProfile, type UserProfileProps } from "./UserProfile";

/**
 * Wrapper component for UserProfile that includes error boundary.
 * Catches and handles errors gracefully during rendering and navigation.
 */
export function UserProfileWrapper(props: UserProfileProps) {
  return (
    <ErrorBoundary>
      <UserProfile {...props} />
    </ErrorBoundary>
  );
}
