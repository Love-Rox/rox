"use client";

/**
 * About Section Component
 *
 * Displays application information:
 * - Software name and version
 * - Repository link
 * - Instance information
 */

import { Trans } from "@lingui/react/macro";
import { Info, Server, Globe } from "lucide-react";
import { Link } from "react-aria-components";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { useInstanceInfo } from "../../hooks/useInstanceInfo";

/**
 * Extract hostname from URL with fallback
 */
function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

/**
 * About section for Settings page
 *
 * Shows version information, repository link, and instance details.
 */
export function AboutSection() {
  const { instanceInfo, isLoading, error } = useInstanceInfo();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="w-5 h-5" />
          <Trans>About</Trans>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 pt-0 space-y-4">
        {isLoading ? (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            <Trans>Loading...</Trans>
          </div>
        ) : error ? (
          <div className="text-sm text-red-500">
            <Trans>Failed to load instance information</Trans>
          </div>
        ) : (
          <>
            {/* Software Info */}
            {instanceInfo?.software && (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="p-2 bg-primary-100 dark:bg-primary-900 rounded-lg">
                    <Server className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {instanceInfo.software.name}
                    </div>
                    <div className="text-lg font-semibold text-primary-600 dark:text-primary-400">
                      v{instanceInfo.software.version}
                    </div>
                  </div>
                </div>

                {instanceInfo.software.repository && (
                  <Link
                    href={instanceInfo.software.repository}
                    target="_blank"
                    className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                  >
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.338c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z" />
                    </svg>
                    <Trans>View source on GitHub</Trans>
                    <span className="sr-only">
                      <Trans>(opens in new window)</Trans>
                    </span>
                  </Link>
                )}
              </div>
            )}

            {/* Instance Info */}
            {instanceInfo && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-3">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  <Trans>Instance Information</Trans>
                </h3>

                <dl className="grid grid-cols-1 gap-2 text-sm">
                  {instanceInfo.name && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500 dark:text-gray-400">
                        <Trans>Name</Trans>
                      </dt>
                      <dd className="text-gray-900 dark:text-gray-100 font-medium">
                        {instanceInfo.name}
                      </dd>
                    </div>
                  )}

                  {instanceInfo.url && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500 dark:text-gray-400">
                        <Trans>Domain</Trans>
                      </dt>
                      <dd className="text-gray-900 dark:text-gray-100">
                        {extractDomain(instanceInfo.url)}
                      </dd>
                    </div>
                  )}

                  {instanceInfo.registration && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500 dark:text-gray-400">
                        <Trans>Registration</Trans>
                      </dt>
                      <dd className="text-gray-900 dark:text-gray-100">
                        {instanceInfo.registration.enabled ? (
                          instanceInfo.registration.inviteOnly ? (
                            <span className="text-yellow-600 dark:text-yellow-400">
                              <Trans>Invite only</Trans>
                            </span>
                          ) : (
                            <span className="text-green-600 dark:text-green-400">
                              <Trans>Open</Trans>
                            </span>
                          )
                        ) : (
                          <span className="text-gray-500 dark:text-gray-400">
                            <Trans>Closed</Trans>
                          </span>
                        )}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
