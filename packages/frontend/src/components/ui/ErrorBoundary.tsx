"use client";

import { Component, type ReactNode } from "react";
import { Trans } from "@lingui/react/macro";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "./Button";

/**
 * Props for the ErrorBoundary component
 */
interface ErrorBoundaryProps {
  /** Child components to wrap */
  children: ReactNode;
  /** Optional fallback to render on error */
  fallback?: ReactNode;
  /** Whether to show a simple inline error instead of full-page */
  inline?: boolean;
  /** Callback when error is caught */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

/**
 * State for the ErrorBoundary component
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary component to catch and handle React errors gracefully.
 *
 * Prevents errors in child components from breaking the entire page.
 * Provides a fallback UI and recovery options.
 *
 * @example
 * ```tsx
 * <ErrorBoundary>
 *   <ComponentThatMightError />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error to console for debugging
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    // Call optional error callback
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Inline error (for smaller components)
      if (this.props.inline) {
        return (
          <div className="flex items-center gap-2 p-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              <Trans>Something went wrong</Trans>
            </span>
            <Button
              variant="ghost"
              size="sm"
              onPress={this.handleRetry}
              className="ml-auto"
            >
              <Trans>Retry</Trans>
            </Button>
          </div>
        );
      }

      // Full error page
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            <Trans>Something went wrong</Trans>
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
            <Trans>
              An unexpected error occurred. Try refreshing the page or going back.
            </Trans>
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" onPress={this.handleRetry}>
              <Trans>Try Again</Trans>
            </Button>
            <Button variant="primary" onPress={this.handleReload}>
              <RefreshCw className="w-4 h-4 mr-2" />
              <Trans>Refresh Page</Trans>
            </Button>
          </div>
          {process.env.NODE_ENV === "development" && this.state.error && (
            <details className="mt-6 w-full max-w-lg text-left">
              <summary className="cursor-pointer text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                <Trans>Error details</Trans>
              </summary>
              <pre className="mt-2 p-3 text-xs bg-gray-100 dark:bg-gray-800 rounded overflow-x-auto">
                {this.state.error.message}
                {"\n\n"}
                {this.state.error.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
