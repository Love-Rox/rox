"use client";

/**
 * Admin Plugins Page
 *
 * Allows administrators to view and manage installed plugins:
 * - View list of loaded plugins
 * - Enable/disable plugins
 * - View plugin details
 */

import { useState, useEffect, useCallback } from "react";
import { useAtom } from "jotai";
import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import { Plug, Power, PowerOff, RefreshCw, ExternalLink, AlertCircle, CheckCircle } from "lucide-react";
import { currentUserAtom, tokenAtom } from "../../lib/atoms/auth";
import { apiClient } from "../../lib/api/client";
import { Button } from "../../components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";
import { Spinner } from "../../components/ui/Spinner";
import { InlineError } from "../../components/ui/ErrorMessage";
import { addToastAtom } from "../../lib/atoms/toast";
import { Layout } from "../../components/layout/Layout";
import { AdminLayout } from "../../components/admin/AdminLayout";

interface Plugin {
  id: string;
  name: string;
  version: string;
  description?: string;
  enabled: boolean;
}

interface PluginSystemStatus {
  enabled: boolean;
  loaded: number;
  plugins: Plugin[];
}

export default function AdminPluginsPage() {
  const [currentUser] = useAtom(currentUserAtom);
  const [token] = useAtom(tokenAtom);
  const [, addToast] = useAtom(addToastAtom);
  const [status, setStatus] = useState<PluginSystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchPlugins = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      apiClient.setToken(token);
      const response = await apiClient.get<PluginSystemStatus>("/api/plugins");
      setStatus(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch plugins");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchPlugins();
  }, [fetchPlugins]);

  const togglePlugin = async (pluginId: string, enable: boolean) => {
    if (!token) return;

    setActionLoading(pluginId);

    try {
      apiClient.setToken(token);
      const action = enable ? "enable" : "disable";
      await apiClient.post(`/api/plugins/${pluginId}/${action}`, {});
      addToast({
        type: "success",
        message: enable
          ? t`Plugin "${pluginId}" enabled`
          : t`Plugin "${pluginId}" disabled`,
      });
      await fetchPlugins();
    } catch (err) {
      addToast({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to toggle plugin",
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Check if user is admin
  if (!currentUser?.isAdmin) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto py-8 px-4">
          <InlineError message={t`You don't have permission to access this page`} />
        </div>
      </Layout>
    );
  }

  return (
    <AdminLayout
      currentPath="/admin/plugins"
      title={<Trans>Plugins</Trans>}
      subtitle={<Trans>Manage installed plugins</Trans>}
    >

      {/* Plugin System Status */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>
              <Trans>Plugin System</Trans>
            </span>
            <Button
              variant="secondary"
              size="sm"
              onPress={() => fetchPlugins()}
              isDisabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} />
              <Trans>Refresh</Trans>
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading && !status ? (
            <div className="flex justify-center py-8">
              <Spinner size="lg" />
            </div>
          ) : error ? (
            <InlineError message={error} />
          ) : status ? (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {status.enabled ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-green-600 dark:text-green-400">
                      <Trans>Enabled</Trans>
                    </span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-5 h-5 text-yellow-500" />
                    <span className="text-yellow-600 dark:text-yellow-400">
                      <Trans>Disabled</Trans>
                    </span>
                  </>
                )}
              </div>
              <span className="text-(--text-secondary)">|</span>
              <span>
                <Trans>{status.loaded} plugins loaded</Trans>
              </span>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Plugin List */}
      {status && status.plugins.length > 0 ? (
        <div className="space-y-4">
          {status.plugins.map((plugin) => (
            <Card key={plugin.id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg">{plugin.name}</h3>
                      <span className="text-sm text-(--text-secondary) bg-(--bg-tertiary) px-2 py-0.5 rounded">
                        v{plugin.version}
                      </span>
                      {plugin.enabled ? (
                        <span className="text-xs text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded">
                          <Trans>Enabled</Trans>
                        </span>
                      ) : (
                        <span className="text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                          <Trans>Disabled</Trans>
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-(--text-secondary) mb-2">
                      ID: <code className="bg-(--bg-tertiary) px-1 rounded">{plugin.id}</code>
                    </p>
                    {plugin.description && (
                      <p className="text-sm text-(--text-secondary)">{plugin.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant={plugin.enabled ? "secondary" : "primary"}
                      size="sm"
                      onPress={() => togglePlugin(plugin.id, !plugin.enabled)}
                      isDisabled={actionLoading === plugin.id}
                    >
                      {actionLoading === plugin.id ? (
                        <Spinner size="sm" />
                      ) : plugin.enabled ? (
                        <>
                          <PowerOff className="w-4 h-4 mr-1" />
                          <Trans>Disable</Trans>
                        </>
                      ) : (
                        <>
                          <Power className="w-4 h-4 mr-1" />
                          <Trans>Enable</Trans>
                        </>
                      )}
                    </Button>
                    <a
                      href={`/api/x/${plugin.id}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
                    >
                      <Trans>API</Trans>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : status && status.plugins.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Plug className="w-12 h-12 mx-auto mb-4 text-(--text-secondary)" />
            <p className="text-(--text-secondary)">
              <Trans>No plugins installed</Trans>
            </p>
            <p className="text-sm text-(--text-secondary) mt-2">
              <Trans>Place plugins in the /plugins directory to install them</Trans>
            </p>
          </CardContent>
        </Card>
      ) : null}

      {/* Documentation Link */}
      <Card className="mt-6">
        <CardContent className="py-4">
          <h3 className="font-medium mb-2">
            <Trans>Plugin Development</Trans>
          </h3>
          <p className="text-sm text-(--text-secondary) mb-3">
            <Trans>
              Learn how to create plugins for Rox by reading the plugin documentation.
            </Trans>
          </p>
          <a
            href="https://github.com/Love-Rox/rox/blob/main/plugins/README.md"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
          >
            <Trans>View Documentation</Trans>
            <ExternalLink className="w-3 h-3" />
          </a>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
