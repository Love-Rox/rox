"use client";

import { Trans } from "@lingui/react/macro";
import { ErrorPage } from "../components/ErrorPage";

/**
 * 404 Not Found page
 * Displayed when a requested page or resource cannot be found
 */
export default function NotFoundPage() {
  return (
    <ErrorPage
      statusCode={404}
      title={<Trans>Page Not Found</Trans>}
      description={<Trans>The page you're looking for doesn't exist or has been moved.</Trans>}
    />
  );
}
