/**
 * Chart / time-series statistics API routes.
 *
 * Exposes Misskey-compatible public chart endpoints that read periodic metric
 * snapshots from the optional charts subsystem. Each endpoint returns a fixed
 * group of metrics (see {@link CHART_ENDPOINT_METRICS}) as a {@link ChartResponse}.
 *
 * The charts subsystem is optional: the underlying repository is injected into
 * the Hono context as `chartRepository` during Phase C wiring. When it is
 * absent (feature disabled), every endpoint responds with `enabled: false` and
 * an empty series list (HTTP 200) so clients can gracefully hide chart UI.
 *
 * These are public statistics and therefore require no authentication, matching
 * Misskey's chart API behavior.
 *
 * @module routes/charts
 */

import { Hono } from "hono";
import type { Context } from "hono";
import { CHART_ENDPOINT_METRICS } from "shared";
import type { ChartEndpoint, ChartResponse, ChartSeries, ChartSpan } from "shared";
import type { IChartRepository } from "../interfaces/repositories/IChartRepository.js";

const charts = new Hono();

/** Default number of points returned when `limit` is not specified. */
const DEFAULT_LIMIT = 30;

/** Maximum number of points a single request may retrieve. */
const MAX_LIMIT = 500;

/**
 * Parsed and validated common chart query parameters.
 */
interface ChartQuery {
  /** Aggregation granularity. */
  span: ChartSpan;
  /** Number of points to return, clamped to `[1, MAX_LIMIT]`. */
  limit: number;
  /** Optional upper time bound for the returned points. */
  until?: Date;
}

/**
 * Parse the common chart query parameters from a request.
 *
 * - `span`: `hour` or `day` (defaults to `day`; any other value falls back to `day`).
 * - `limit`: positive integer, defaults to {@link DEFAULT_LIMIT}, clamped to {@link MAX_LIMIT}.
 * - `until`: optional ISO-8601 timestamp; ignored when unparseable.
 *
 * @param c - Hono request context.
 * @returns Normalized chart query parameters.
 */
function parseChartQuery(c: Context): ChartQuery {
  const spanParam = c.req.query("span");
  const span: ChartSpan = spanParam === "hour" ? "hour" : "day";

  const limitParam = c.req.query("limit");
  let limit = DEFAULT_LIMIT;
  if (limitParam !== undefined) {
    const parsed = Number.parseInt(limitParam, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      limit = Math.min(parsed, MAX_LIMIT);
    }
  }

  const untilParam = c.req.query("until");
  let until: Date | undefined;
  if (untilParam !== undefined) {
    const parsed = new Date(untilParam);
    if (!Number.isNaN(parsed.getTime())) {
      until = parsed;
    }
  }

  return { span, limit, until };
}

/**
 * Build a {@link ChartResponse} for a chart endpoint.
 *
 * Looks up the chart repository from the context. When it is absent the charts
 * subsystem is disabled and an empty, `enabled: false` response is returned.
 * Otherwise each metric for the endpoint is fetched and assembled into a series.
 *
 * @param c - Hono request context.
 * @param endpoint - Chart endpoint whose metric group should be served.
 * @returns A {@link ChartResponse} describing the requested series.
 */
async function buildChartResponse(c: Context, endpoint: ChartEndpoint): Promise<ChartResponse> {
  const { span, limit, until } = parseChartQuery(c);

  // chartRepository は Phase C で DI に追加される。未定義のときは機能無効として扱う。
  const chartRepository = c.get("chartRepository") as IChartRepository | undefined | null;

  if (!chartRepository) {
    return { enabled: false, span, series: [] };
  }

  const metrics = CHART_ENDPOINT_METRICS[endpoint];
  const series: ChartSeries[] = await Promise.all(
    metrics.map(async (metric) => {
      const points = await chartRepository.getSeries(metric, span, limit, until ?? undefined);
      return { metric, span, points };
    }),
  );

  return { enabled: true, backend: chartRepository.backend, span, series };
}

/**
 * GET /
 *
 * Returns the list of available chart endpoint names.
 */
charts.get("/", (c) => {
  return c.json({ endpoints: Object.keys(CHART_ENDPOINT_METRICS) });
});

/**
 * GET /users
 *
 * User count metrics (total / local / remote).
 */
charts.get("/users", async (c) => {
  return c.json(await buildChartResponse(c, "users"));
});

/**
 * GET /notes
 *
 * Note count metrics (total / local / remote).
 */
charts.get("/notes", async (c) => {
  return c.json(await buildChartResponse(c, "notes"));
});

/**
 * GET /active-users
 *
 * Active user metrics (month / halfyear).
 */
charts.get("/active-users", async (c) => {
  return c.json(await buildChartResponse(c, "active-users"));
});

/**
 * GET /federation
 *
 * Federation metrics (known instances).
 */
charts.get("/federation", async (c) => {
  return c.json(await buildChartResponse(c, "federation"));
});

/**
 * GET /drive
 *
 * Drive usage metrics (total files / total bytes).
 */
charts.get("/drive", async (c) => {
  return c.json(await buildChartResponse(c, "drive"));
});

export default charts;
