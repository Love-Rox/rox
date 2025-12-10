"use client";

import { Trans } from "@lingui/react/macro";
import { ErrorPage } from "../components/ErrorPage";

/**
 * 403 Forbidden page
 * Displayed when access to a resource is denied
 */
export default function ForbiddenPage() {
  return (
    <ErrorPage
      statusCode={403}
      title={<Trans>Access Denied</Trans>}
      description={<Trans>You don't have permission to access this page or resource.</Trans>}
    />
  );
}
