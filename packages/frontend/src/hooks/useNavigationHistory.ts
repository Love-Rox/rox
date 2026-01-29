import { useCallback } from "react";
import { useRouter } from "waku";

const HISTORY_KEY = "rox-navigation-history";

/**
 * Get full path including search params and hash
 */
function getFullPath(): string {
  if (typeof window === "undefined") return "";
  return window.location.pathname + window.location.search + window.location.hash;
}

/**
 * Hook to provide proper "back" functionality using tracked navigation history.
 *
 * Since Waku's useRouter doesn't have a back() method and using
 * window.history.back() bypasses Waku's client-side routing (causing
 * the URL to change without page content updates), this hook uses
 * globally tracked navigation history and router.push() for back navigation.
 *
 * Note: History is tracked globally by useNavigationTracker in AppProviders.
 *
 * @param fallbackPath - Path to navigate to if no history exists (default: "/timeline")
 * @returns Object with goBack function and canGoBack boolean
 *
 * @example
 * ```tsx
 * function ProfilePage() {
 *   const { goBack, canGoBack } = useNavigationHistory();
 *
 *   return (
 *     <button onClick={goBack}>
 *       {canGoBack ? "Go Back" : "Go to Timeline"}
 *     </button>
 *   );
 * }
 * ```
 */
export function useNavigationHistory(fallbackPath = "/timeline") {
  const router = useRouter();

  const goBack = useCallback(() => {
    const history = getHistory();
    const currentPath = getFullPath();

    // Find current page in history and get the one before it
    const currentIndex = history.lastIndexOf(currentPath);

    let previousPath: string = fallbackPath;
    const prevFromIndex = currentIndex > 0 ? history[currentIndex - 1] : undefined;
    const lastEntry = history.length > 0 ? history[history.length - 1] : undefined;

    if (prevFromIndex) {
      previousPath = prevFromIndex;
    } else if (lastEntry && lastEntry !== currentPath) {
      // Current page not in history yet, use last entry
      previousPath = lastEntry;
    }

    // Use router.push to ensure Waku handles the navigation properly
    // Cast to route type to satisfy Waku's strict typing
    router.push((previousPath || fallbackPath) as `/${string}`);
  }, [router, fallbackPath]);

  const canGoBack = useCallback(() => {
    const history = getHistory();
    const currentPath = getFullPath();
    const currentIndex = history.lastIndexOf(currentPath);
    return currentIndex > 0 || (history.length > 0 && history[history.length - 1] !== currentPath);
  }, []);

  return {
    goBack,
    canGoBack: canGoBack(),
  };
}

const MAX_HISTORY_LENGTH = 20;

/**
 * Get navigation history from sessionStorage
 */
function getHistory(): string[] {
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
    // Ignore errors (e.g., private browsing mode)
  }
  return [];
}

/**
 * Save navigation history to sessionStorage
 */
function saveHistory(history: string[]): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch {
    // Ignore errors (e.g., private browsing mode)
  }
}

/**
 * Record current path to navigation history.
 * Should be called on every page navigation.
 */
export function recordNavigation(path: string): void {
  const history = getHistory();

  // Don't add duplicate consecutive entries
  if (history[history.length - 1] !== path) {
    history.push(path);

    // Keep history bounded
    if (history.length > MAX_HISTORY_LENGTH) {
      history.shift();
    }

    saveHistory(history);
  }
}

/**
 * Clear navigation history (useful for logout or session reset)
 */
export function clearNavigationHistory(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(HISTORY_KEY);
  } catch {
    // Ignore errors (e.g., private browsing mode)
  }
}
