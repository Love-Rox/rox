"use client";

import { Trans } from "@lingui/react/macro";
import { Button } from "./ui/Button";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { DarkModeToggle } from "./ui/DarkModeToggle";

interface ErrorPageProps {
  statusCode: number;
  title: React.ReactNode;
  description: React.ReactNode;
  showHomeButton?: boolean;
  showBackButton?: boolean;
  children?: React.ReactNode;
}

/**
 * Reusable error page component with consistent styling
 *
 * @param statusCode - HTTP status code to display
 * @param title - Error title text
 * @param description - Error description text
 * @param showHomeButton - Whether to show "Go Home" button (default: true)
 * @param showBackButton - Whether to show "Go Back" button (default: true)
 * @param children - Additional content to render below the description
 */
export function ErrorPage({
  statusCode,
  title,
  description,
  showHomeButton = true,
  showBackButton = true,
  children,
}: ErrorPageProps) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b bg-(--card-bg)">
        <div className="container mx-auto px-4 py-4 max-w-5xl flex justify-between items-center">
          <a href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <span className="font-semibold text-lg text-(--text-primary)">Rox</span>
          </a>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <DarkModeToggle />
          </div>
        </div>
      </header>

      {/* Error Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          {/* Status Code */}
          <div className="mb-6">
            <span className="text-8xl md:text-9xl font-bold text-primary-500/20">{statusCode}</span>
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-bold text-(--text-primary) mb-4">{title}</h1>

          {/* Description */}
          <p className="text-lg text-(--text-secondary) mb-8">{description}</p>

          {/* Additional Content */}
          {children}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {showBackButton && (
              <Button
                variant="secondary"
                onPress={() => {
                  if (typeof window !== "undefined" && window.history.length > 1) {
                    window.history.back();
                  } else {
                    window.location.href = "/";
                  }
                }}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
                <Trans>Go Back</Trans>
              </Button>
            )}
            {showHomeButton && (
              <Button
                variant="primary"
                onPress={() => {
                  window.location.href = "/";
                }}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
                </svg>
                <Trans>Go Home</Trans>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t bg-(--card-bg) py-4">
        <div className="container mx-auto px-4 max-w-5xl text-center text-sm text-(--text-tertiary)">
          <Trans>Powered by Rox - Lightweight ActivityPub Server</Trans>
        </div>
      </footer>
    </div>
  );
}
