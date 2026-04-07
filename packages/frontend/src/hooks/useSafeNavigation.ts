"use client";

/**
 * Safe Navigation Hook
 *
 * Provides navigation functions that close modals before navigating.
 * Avoids flushSync and requestAnimationFrame to prevent interfering
 * with Waku's RSC routing transitions.
 *
 * @module hooks/useSafeNavigation
 */

import { useCallback, useState } from "react";
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
  const currentPath =
    typeof window !== "undefined"
      ? window.location.pathname + window.location.search + window.location.hash
      : "";

  const currentIndex = history.lastIndexOf(currentPath);

  if (currentIndex > 0) {
    return history[currentIndex - 1] || fallback;
  }

  if (history.length > 0 && history[history.length - 1] !== currentPath) {
    return history[history.length - 1] || fallback;
  }

  return fallback;
}

/**
 * Close all open popovers using DOM events
 */
function closeUncontrolledPopovers(): void {
  const escapeEvent = new KeyboardEvent("keydown", {
    key: "Escape",
    code: "Escape",
    keyCode: 27,
    bubbles: true,
    cancelable: true,
  });

  document.querySelectorAll('[data-open], button[aria-expanded="true"]').forEach((el) => {
    el.dispatchEvent(escapeEvent);
  });

  document.querySelectorAll("[data-react-aria-top-layer]").forEach((el) => {
    el.dispatchEvent(escapeEvent);
  });
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
 * Hook for safe navigation that closes modals before navigating.
 *
 * Closes modals via normal React state updates (no flushSync) to avoid
 * interfering with Waku's startTransition-based RSC routing. Then uses
 * router.push for SPA navigation with a content-change check to detect
 * and recover from failed navigations.
 *
 * @returns Navigation functions and state
 */
export function useSafeNavigation(): SafeNavigationResult {
  const router = useRouter();
  const closeAllModals = useSetAtom(closeAllModalsAtom);
  const [isNavigating, setIsNavigating] = useState(false);

  /**
   * Close all modals without blocking React's concurrent rendering.
   * Uses normal state updates instead of flushSync to preserve
   * Waku router's startTransition context.
   */
  const closeModals = useCallback(() => {
    closeAllModals();
    closeUncontrolledPopovers();
    setIsNavigating(true);
  }, [closeAllModals]);

  /**
   * Navigate using router.push with content-change verification.
   * If the page content doesn't change within a timeout, falls back
   * to window.location.href.
   */
  const navigateWithVerification = useCallback(
    (path: string) => {
      const currentContent = document.querySelector("main")?.innerHTML || "";

      try {
        router.push(path as `/${string}`);

        // Notify navigation history tracker
        requestAnimationFrame(() => {
          window.dispatchEvent(new Event("rox-navigation"));
        });

        // Verify navigation actually updated the content
        setTimeout(() => {
          const newContent = document.querySelector("main")?.innerHTML || "";
          const urlMatches = window.location.pathname === path.split("?")[0];

          if (urlMatches && newContent === currentContent && currentContent !== "") {
            // URL changed but content didn't — RSC fetch was skipped, fall back
            window.location.href = path;
          } else {
            setIsNavigating(false);
          }
        }, 500);
      } catch {
        window.location.href = path;
      }
    },
    [router, setIsNavigating],
  );

  /**
   * Navigate to a path after closing all modals
   */
  const navigate = useCallback(
    (path: string) => {
      closeModals();
      navigateWithVerification(path);
    },
    [closeModals, navigateWithVerification],
  );

  /**
   * Go back to the previous page.
   *
   * Uses window.location.href directly for reliable back navigation.
   * Waku's router.push fails to trigger RSC re-fetch in production builds
   * when used after modal state changes, so back navigation uses full
   * page navigation for reliability. Forward navigation (navigate) still
   * attempts router.push with fallback verification.
   */
  const goBack = useCallback(() => {
    closeModals();
    const previousPath = getPreviousPath("/timeline");
    window.location.href = previousPath;
  }, [closeModals]);

  return {
    isNavigating,
    navigate,
    goBack,
  };
}
