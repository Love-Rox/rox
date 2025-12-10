"use client";

import { Trans } from "@lingui/react/macro";
import { ErrorPage } from "../components/ErrorPage";

/**
 * 500 Internal Server Error page
 * Displayed when an unexpected server error occurs
 */
export default function ServerErrorPage() {
  return (
    <ErrorPage
      statusCode={500}
      title={<Trans>Server Error</Trans>}
      description={
        <Trans>Something went wrong on our end. Please try again later or contact support if the problem persists.</Trans>
      }
    >
      {/* Retry button */}
      <div className="mb-6">
        <button
          onClick={() => window.location.reload()}
          className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 underline text-sm"
        >
          <Trans>Refresh page</Trans>
        </button>
      </div>
    </ErrorPage>
  );
}
