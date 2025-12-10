"use client";

import { Trans } from "@lingui/react/macro";
import { ErrorPage } from "../components/ErrorPage";

/**
 * 503 Service Unavailable page
 * Displayed during maintenance or when the service is temporarily unavailable
 */
export default function ServiceUnavailablePage() {
  return (
    <ErrorPage
      statusCode={503}
      title={<Trans>Service Unavailable</Trans>}
      description={
        <Trans>
          The server is temporarily unavailable due to maintenance or high load. Please try again in a few minutes.
        </Trans>
      }
      showBackButton={false}
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

export const getConfig = async () => {
  return {
    render: "static",
  };
};
