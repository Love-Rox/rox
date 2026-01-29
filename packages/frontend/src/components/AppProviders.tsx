"use client";

/**
 * Application Providers Component
 *
 * Combines all client-side providers (i18n, theme) into a single wrapper
 * for use in the root layout.
 */

import { type ReactNode, useEffect, useState, Component, type ErrorInfo } from "react";
import { useAtomValue } from "jotai";
import { I18nProvider } from "./I18nProvider.js";
import { ThemeProvider } from "./ThemeProvider.js";
import { tokenAtom } from "../lib/atoms/auth";
import { apiClient } from "../lib/api/client";
import type { ThemeSettings } from "../lib/types/instance";
import { recordNavigation } from "../hooks/useNavigationHistory";

/**
 * Global error boundary to catch React errors during navigation.
 * This prevents errors in portal cleanup from breaking the entire app.
 */
class GlobalErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, _errorInfo: ErrorInfo): void {
    // Log error but don't crash the app
    console.error("Global error boundary caught error:", error.message);

    // Check if this is the removeChild error during navigation
    if (error.message?.includes("removeChild") || error.message?.includes("null")) {
      // This is likely a portal cleanup issue - reset and continue
      console.warn("Portal cleanup error detected, attempting recovery...");
      this.setState({ hasError: false });
    }
  }

  render() {
    // Always render children - we don't want to show an error UI for navigation issues
    return this.props.children;
  }
}

interface AppProvidersProps {
  children: ReactNode;
}

/**
 * Combined application providers
 *
 * Wraps children with:
 * - I18nProvider for internationalization
 * - ThemeProvider for dynamic theming
 *
 * Fetches instance theme settings on mount
 */
export function AppProviders({ children }: AppProvidersProps) {
  const [theme, setTheme] = useState<ThemeSettings | undefined>(undefined);
  const [isLoaded, setIsLoaded] = useState(false);
  const token = useAtomValue(tokenAtom);

  // Sync token to apiClient whenever it changes
  useEffect(() => {
    apiClient.setToken(token);
  }, [token]);

  // Global error handler for portal cleanup errors during navigation
  // These errors are caused by Waku's RSC handling and are harmless
  useEffect(() => {
    const handleError = (event: ErrorEvent): void => {
      // Suppress Waku/React portal cleanup errors
      if (
        event.message?.includes("removeChild") ||
        event.message?.includes("Cannot read properties of null")
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener("error", handleError);
    return () => window.removeEventListener("error", handleError);
  }, []);

  // Track navigation history for proper back button functionality
  useEffect(() => {
    // Record initial path
    recordNavigation(window.location.pathname);

    // Listen for popstate events (browser back/forward)
    const handlePopState = () => {
      recordNavigation(window.location.pathname);
    };

    // Listen for pushstate/replacestate by patching history methods
    const originalPushState = history.pushState.bind(history);
    const originalReplaceState = history.replaceState.bind(history);

    history.pushState = (...args) => {
      originalPushState(...args);
      recordNavigation(window.location.pathname);
    };

    history.replaceState = (...args) => {
      originalReplaceState(...args);
      // Don't record replaceState as it's typically used for in-place updates
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
    };
  }, []);

  useEffect(() => {
    // Fetch instance theme settings
    const fetchTheme = async () => {
      try {
        const response = await fetch("/api/instance/theme");
        if (response.ok) {
          const data = await response.json();
          setTheme(data);
          // Cache theme in localStorage for instant loading on next visit
          try {
            localStorage.setItem("rox-instance-theme", JSON.stringify(data));
          } catch {
            // Ignore localStorage errors (e.g., private browsing)
          }
        }
      } catch (error) {
        console.error("Failed to fetch theme settings:", error);
      } finally {
        setIsLoaded(true);
      }
    };

    fetchTheme();
  }, []);

  // Hide PWA splash screen when app is loaded
  useEffect(() => {
    if (!isLoaded) return;

    // Small delay to ensure content is rendered
    const timer = setTimeout(() => {
      const splash = document.getElementById("rox-splash-screen");
      if (splash) {
        splash.classList.add("hidden");
        // Remove from DOM after transition completes
        setTimeout(() => {
          splash.remove();
        }, 300);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [isLoaded]);

  // Show nothing until theme is loaded to prevent flash
  // But still render children to avoid layout shift
  return (
    <GlobalErrorBoundary>
      <I18nProvider>
        <ThemeProvider theme={theme}>
          <div
            className="min-h-screen bg-(--bg-secondary) text-(--text-primary) transition-colors duration-200"
            style={{ opacity: isLoaded ? 1 : 0.99 }}
          >
            {children}
          </div>
          {/* Note: modal-root is created dynamically by getModalContainer()
              and appended to document.body to keep it OUTSIDE the React tree.
              This prevents portal cleanup errors during navigation. */}
        </ThemeProvider>
      </I18nProvider>
    </GlobalErrorBoundary>
  );
}
