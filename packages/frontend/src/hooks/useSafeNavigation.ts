"use client";

/**
 * Safe Navigation Hook
 *
 * Provides navigation functions that properly close all modals
 * before navigating to prevent portal cleanup errors.
 *
 * Uses full page navigation to avoid Waku/React portal cleanup issues
 * during SPA transitions.
 *
 * @module hooks/useSafeNavigation
 */

import { useCallback, useState } from "react";
import { flushSync } from "react-dom";
import { useSetAtom } from "jotai";
import { closeAllModalsAtom } from "../lib/atoms/modals";
import { useRouter } from "../components/ui/SpaLink";

const HISTORY_KEY = "rox-navigation-history";

/**
 * Get navigation history from sessionStorage
 */
function getNavigationHistory(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = sessionStorage.getItem(HISTORY_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch {
    // Ignore errors
  }
  return [];
}

/**
 * Get the previous path from navigation history
 */
function getPreviousPath(fallback: string): string {
  const history = getNavigationHistory();
  // Use full path including search params and hash for accurate matching
  const currentPath =
    typeof window !== "undefined"
      ? window.location.pathname + window.location.search + window.location.hash
      : "";

  // Find current page in history and get the one before it
  const currentIndex = history.lastIndexOf(currentPath);

  if (currentIndex > 0) {
    return history[currentIndex - 1] || fallback;
  }

  // Current page not in history, use last entry if different
  if (history.length > 0 && history[history.length - 1] !== currentPath) {
    return history[history.length - 1] || fallback;
  }

  return fallback;
}

/**
 * Return type for useSafeNavigation hook
 */
interface SafeNavigationResult {
  /** Whether navigation is in progress */
  isNavigating: boolean;
  /** Navigate to a path after closing all modals */
  navigate: (path: string) => void;
  /** Go back in history after closing all modals */
  goBack: () => void;
}

/**
 * Close all open popovers using DOM events
 *
 * This handles uncontrolled MenuTrigger/Select popovers that aren't
 * in the modal registry. We dispatch an Escape key event to close them.
 */
function closeUncontrolledPopovers(): void {
  const escapeEvent = new KeyboardEvent("keydown", {
    key: "Escape",
    code: "Escape",
    keyCode: 27,
    bubbles: true,
    cancelable: true,
  });

  // Close any open Select/MenuTrigger popovers
  document
    .querySelectorAll('[data-open], button[aria-expanded="true"]')
    .forEach((el) => {
      el.dispatchEvent(escapeEvent);
    });

  // Close any React Aria top-layer overlays
  document
    .querySelectorAll("[data-react-aria-top-layer]")
    .forEach((el) => {
      el.dispatchEvent(escapeEvent);
    });
}

/**
 * Hook for safe navigation that closes all modals first
 *
 * This hook ensures that all React Aria modals are properly closed
 * before navigation occurs, preventing the "removeChild" portal
 * cleanup errors that occur when modals are unmounted during navigation.
 *
 * @returns Navigation functions and state
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isNavigating, navigate, goBack } = useSafeNavigation();
 *
 *   return (
 *     <Button onPress={goBack} isDisabled={isNavigating}>
 *       Back
 *     </Button>
 *   );
 * }
 * ```
 */
export function useSafeNavigation(): SafeNavigationResult {
  const router = useRouter();
  const closeAllModals = useSetAtom(closeAllModalsAtom);
  const [isNavigating, setIsNavigating] = useState(false);

  /**
   * Close all modals and wait for DOM updates to complete
   */
  const closeModalsAndWait = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      // Use flushSync to force synchronous state updates
      flushSync(() => {
        // Close registered modals via modal registry
        closeAllModals();
        // Close uncontrolled popovers via DOM events
        closeUncontrolledPopovers();
        setIsNavigating(true);
      });

      // Wait for two animation frames to ensure DOM is updated
      // First frame: React commits the changes
      // Second frame: Browser paints the changes
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          resolve();
        });
      });
    });
  }, [closeAllModals]);

  /**
   * Navigate to a path after closing all modals
   */
  const navigate = useCallback(
    async (path: string) => {
      await closeModalsAndWait();

      try {
        // Cast to any to allow dynamic paths with Waku's router
        router.push(path as `/${string}`);
      } catch {
        // Fallback to full page navigation if SPA navigation fails
        window.location.href = path;
      }
    },
    [closeModalsAndWait, router]
  );

  /**
   * Go back in history using full page navigation
   *
   * Uses window.location.href instead of history.back() to avoid
   * Waku/React portal cleanup errors during SPA transitions.
   */
  const goBack = useCallback(async () => {
    await closeModalsAndWait();

    // Get previous path from our tracked navigation history
    const previousPath = getPreviousPath("/timeline");

    // Use full page navigation to avoid Waku/React cleanup issues
    // This completely reloads the page, bypassing all portal cleanup
    window.location.href = previousPath;
  }, [closeModalsAndWait]);

  return {
    isNavigating,
    navigate,
    goBack,
  };
}
