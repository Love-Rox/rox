"use client";

/**
 * Admin Dashboard Page
 *
 * Provides an at-a-glance overview of the instance:
 * - Summary cards for users, notes, federation, moderation and invitations
 *   (from `/api/admin/stats`).
 * - Time-series charts for users, notes and active users (from the optional
 *   `/api/charts/*` endpoints), rendered with the lightweight SVG `LineChart`.
 *
 * When the charts subsystem is disabled, the chart section gracefully degrades
 * to a placeholder instead of failing.
 */

import { useState, useEffect, useCallback } from "react";
import { useAtom } from "jotai";
import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import {
  Users,
  MessageSquare,
  Globe,
  AlertTriangle,
  Ticket,
  BarChart3,
  Activity,
} from "lucide-react";
import { currentUserAtom } from "../../lib/atoms/auth";
import { useApi } from "../../hooks/useApi";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";
import { Spinner } from "../../components/ui/Spinner";
import { InlineError } from "../../components/ui/ErrorMessage";
import { AdminLayout } from "../../components/admin/AdminLayout";
import { LineChart } from "../../components/charts/LineChart";
import type { ChartResponse, ChartSeries } from "shared";

/**
 * Shape of the `/api/admin/stats` response.
 */
interface AdminStats {
  users: { total: number; local: number; remote: number };
  notes: { total: number };
  federation: { blockedInstances: number };
  invitations: { total: number; unused: number };
  moderation: { pendingReports: number };
}

/**
 * A chart endpoint result paired with display metadata.
 */
interface ChartCard {
  /** Title shown above the chart. */
  title: string;
  /** Loaded chart response, or `null` while loading / on error. */
  data: ChartResponse | null;
  /** Color for the primary series. */
  color: string;
}

/**
 * Pick the first series from a chart response (the cumulative total metric).
 */
function primarySeries(data: ChartResponse | null): ChartSeries | undefined {
  return data?.series[0];
}

export default function AdminDashboardPage() {
  const api = useApi();
  const [currentUser, setCurrentUser] = useAtom(currentUserAtom);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [usersChart, setUsersChart] = useState<ChartResponse | null>(null);
  const [notesChart, setNotesChart] = useState<ChartResponse | null>(null);
  const [activeUsersChart, setActiveUsersChart] = useState<ChartResponse | null>(null);

  const loadData = useCallback(async () => {
    if (!api.token) return;

    try {
      // Stats は必須。チャートは任意機能なので個別に失敗を握りつぶす。
      const statsData = await api.get<AdminStats>("/api/admin/stats");
      setStats(statsData);

      const [users, notes, activeUsers] = await Promise.all([
        api.get<ChartResponse>("/api/charts/users?span=day").catch(() => null),
        api.get<ChartResponse>("/api/charts/notes?span=day").catch(() => null),
        api.get<ChartResponse>("/api/charts/active-users?span=day").catch(() => null),
      ]);
      setUsersChart(users);
      setNotesChart(notes);
      setActiveUsersChart(activeUsers);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
      setError("Failed to load dashboard statistics");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [api]);

  // Check admin access and load data
  useEffect(() => {
    const checkAccess = async () => {
      if (!api.token) {
        window.location.href = "/login";
        return;
      }

      try {
        const sessionResponse = await api.get<{ user: any }>("/api/auth/session");
        if (!sessionResponse.user?.isAdmin) {
          window.location.href = "/timeline";
          return;
        }
        setCurrentUser(sessionResponse.user);
        await loadData();
      } catch (err) {
        console.error("Access check failed:", err);
        setError("Access denied");
        setIsLoading(false);
      }
    };

    checkAccess();
  }, [api, loadData, setCurrentUser]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
  };

  const formatNumber = (num: number) => num.toLocaleString();

  // チャート機能が全エンドポイントで無効、または取得失敗のときはプレースホルダ表示。
  const chartsEnabled =
    usersChart?.enabled || notesChart?.enabled || activeUsersChart?.enabled || false;

  const chartCards: ChartCard[] = [
    { title: t`Users`, data: usersChart, color: "#6366f1" },
    { title: t`Notes`, data: notesChart, color: "#10b981" },
    { title: t`Active Users`, data: activeUsersChart, color: "#f59e0b" },
  ];

  if (isLoading || !currentUser) {
    return (
      <AdminLayout
        currentPath="/admin/dashboard"
        title={<Trans>Dashboard</Trans>}
        subtitle={<Trans>Instance overview and statistics</Trans>}
      >
        <div className="flex items-center justify-center min-h-64">
          <Spinner size="lg" />
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout
        currentPath="/admin/dashboard"
        title={<Trans>Dashboard</Trans>}
        subtitle={<Trans>Instance overview and statistics</Trans>}
      >
        <InlineError message={error} />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      currentPath="/admin/dashboard"
      title={<Trans>Dashboard</Trans>}
      subtitle={<Trans>Instance overview and statistics</Trans>}
      showReload
      onReload={handleRefresh}
      isReloading={isRefreshing}
    >
      <div className="space-y-6">
        {/* Summary Cards */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Users className="w-8 h-8 text-primary-500" />
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {formatNumber(stats.users.total)}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      <Trans>Total Users</Trans>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Users className="w-8 h-8 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {formatNumber(stats.users.local)}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      <Trans>Local Users</Trans>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Globe className="w-8 h-8 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {formatNumber(stats.users.remote)}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      <Trans>Remote Users</Trans>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-8 h-8 text-purple-500" />
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {formatNumber(stats.notes.total)}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      <Trans>Total Notes</Trans>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Globe className="w-8 h-8 text-red-500" />
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {formatNumber(stats.federation.blockedInstances)}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      <Trans>Blocked Instances</Trans>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-8 h-8 text-yellow-500" />
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {formatNumber(stats.moderation.pendingReports)}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      <Trans>Pending Reports</Trans>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Invitations summary */}
        {stats && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Ticket className="w-6 h-6 text-gray-500" />
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  <Trans>
                    Invitations: {formatNumber(stats.invitations.total)} total,{" "}
                    {formatNumber(stats.invitations.unused)} unused
                  </Trans>
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Charts Section */}
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
            <BarChart3 className="w-5 h-5" />
            <Trans>Trends (daily)</Trans>
          </h2>

          {chartsEnabled ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {chartCards.map((card) => {
                const series = primarySeries(card.data);
                const points = series?.points ?? [];
                const latest = points.length > 0 ? points[points.length - 1]?.total : undefined;

                return (
                  <Card key={card.title}>
                    <CardHeader className="px-4 pt-4 mb-0">
                      <CardTitle className="flex items-center justify-between text-base">
                        <span>{card.title}</span>
                        {latest !== undefined && (
                          <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                            {formatNumber(latest)}
                          </span>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                      {card.data?.enabled ? (
                        <LineChart
                          points={points}
                          color={card.color}
                          ariaLabel={t`${card.title} daily trend chart`}
                        />
                      ) : (
                        <p className="flex items-center justify-center h-[120px] text-sm text-gray-400 dark:text-gray-500">
                          <Trans>No data</Trans>
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Activity className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  <Trans>Statistics collection is disabled</Trans>
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  <Trans>
                    Time-series charts are not available because the charts subsystem is not enabled
                    on this instance.
                  </Trans>
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
