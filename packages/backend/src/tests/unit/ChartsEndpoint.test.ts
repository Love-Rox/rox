/**
 * Charts API Endpoint Unit Tests
 *
 * Tests the /api/charts/* public statistics endpoints, covering the enabled
 * (repository present) and disabled (repository absent) paths as well as
 * span / limit query parsing.
 */

import { describe, test, expect, mock, beforeEach } from "bun:test";
import { Hono } from "hono";
import { CHART_ENDPOINT_METRICS } from "shared";
import type { ChartPoint, ChartResponse, ChartSpan } from "shared";
import chartsApp from "../../routes/charts.js";
import type {
  ChartSnapshotInput,
  IChartRepository,
} from "../../interfaces/repositories/IChartRepository.js";

/**
 * Minimal stub of {@link IChartRepository} for endpoint tests.
 *
 * `getSeries` returns a fixed two-point series and records its call arguments
 * so query-parsing behavior can be asserted.
 */
interface ChartRepoStub extends IChartRepository {
  calls: Array<{ metric: string; span: ChartSpan; limit: number; until?: Date }>;
}

const fixedPoints: ChartPoint[] = [
  { t: "2026-06-26T00:00:00.000Z", total: 10, delta: 1 },
  { t: "2026-06-27T00:00:00.000Z", total: 12, delta: 2 },
];

function createStub(): ChartRepoStub {
  const calls: ChartRepoStub["calls"] = [];
  return {
    backend: "postgres",
    recordSnapshot: mock((_input: ChartSnapshotInput) => Promise.resolve()),
    recordSnapshots: mock((_inputs: ChartSnapshotInput[]) => Promise.resolve()),
    getSeries: mock((metric: string, span: ChartSpan, limit: number, until?: Date) => {
      calls.push({ metric, span, limit, until });
      return Promise.resolve(fixedPoints);
    }),
    calls,
  };
}

/**
 * Build a Hono app that injects the given chart repository into context.
 *
 * @param repo - Repository stub, or `null`/`undefined` to simulate the disabled state.
 */
function createApp(repo: IChartRepository | null | undefined): Hono {
  const app = new Hono();
  app.use("*", async (c, next) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    c.set("chartRepository" as any, repo as any);
    await next();
  });
  app.route("/", chartsApp);
  return app;
}

describe("Charts API", () => {
  let stub: ChartRepoStub;

  beforeEach(() => {
    stub = createStub();
  });

  describe("enabled (repository present)", () => {
    const endpoints = Object.keys(CHART_ENDPOINT_METRICS) as Array<
      keyof typeof CHART_ENDPOINT_METRICS
    >;

    for (const endpoint of endpoints) {
      test(`GET /${endpoint} returns enabled series for each metric`, async () => {
        const app = createApp(stub);
        const res = await app.request(`/${endpoint}`);
        expect(res.status).toBe(200);

        const body = (await res.json()) as ChartResponse;
        const expectedMetrics = CHART_ENDPOINT_METRICS[endpoint];

        expect(body.enabled).toBe(true);
        expect(body.backend).toBe("postgres");
        expect(body.span).toBe("day");
        expect(body.series).toHaveLength(expectedMetrics.length);

        expectedMetrics.forEach((metric, i) => {
          const series = body.series[i];
          expect(series).toBeDefined();
          expect(series?.metric).toBe(metric);
          expect(series?.span).toBe("day");
          expect(series?.points).toEqual(fixedPoints);
        });
      });
    }
  });

  describe("disabled (repository absent)", () => {
    test("GET /users returns enabled:false with empty series when repo is null", async () => {
      const app = createApp(null);
      const res = await app.request("/users");
      expect(res.status).toBe(200);

      const body = (await res.json()) as ChartResponse;
      expect(body.enabled).toBe(false);
      expect(body.backend).toBeUndefined();
      expect(body.span).toBe("day");
      expect(body.series).toEqual([]);
    });

    test("GET /notes returns enabled:false when repo is undefined", async () => {
      const app = createApp(undefined);
      const res = await app.request("/notes");
      expect(res.status).toBe(200);

      const body = (await res.json()) as ChartResponse;
      expect(body.enabled).toBe(false);
      expect(body.series).toEqual([]);
    });
  });

  describe("query parsing", () => {
    test("defaults to span=day and limit=30", async () => {
      const app = createApp(stub);
      await app.request("/federation");
      expect(stub.calls).toHaveLength(CHART_ENDPOINT_METRICS.federation.length);
      expect(stub.calls[0]?.span).toBe("day");
      expect(stub.calls[0]?.limit).toBe(30);
      expect(stub.calls[0]?.until).toBeUndefined();
    });

    test("parses span=hour", async () => {
      const app = createApp(stub);
      const res = await app.request("/users?span=hour");
      const body = (await res.json()) as ChartResponse;
      expect(body.span).toBe("hour");
      expect(stub.calls[0]?.span).toBe("hour");
    });

    test("falls back to span=day for invalid span", async () => {
      const app = createApp(stub);
      await app.request("/users?span=week");
      expect(stub.calls[0]?.span).toBe("day");
    });

    test("parses limit and clamps to max 500", async () => {
      const app = createApp(stub);
      await app.request("/users?limit=99");
      expect(stub.calls[0]?.limit).toBe(99);

      stub.calls.length = 0;
      await app.request("/users?limit=9999");
      expect(stub.calls[0]?.limit).toBe(500);
    });

    test("ignores non-positive / invalid limit and uses default", async () => {
      const app = createApp(stub);
      await app.request("/users?limit=0");
      expect(stub.calls[0]?.limit).toBe(30);

      stub.calls.length = 0;
      await app.request("/users?limit=abc");
      expect(stub.calls[0]?.limit).toBe(30);
    });

    test("parses until as a Date and ignores invalid values", async () => {
      const app = createApp(stub);
      await app.request("/users?until=2026-06-27T00%3A00%3A00.000Z");
      expect(stub.calls[0]?.until).toBeInstanceOf(Date);
      expect(stub.calls[0]?.until?.toISOString()).toBe("2026-06-27T00:00:00.000Z");

      stub.calls.length = 0;
      await app.request("/users?until=not-a-date");
      expect(stub.calls[0]?.until).toBeUndefined();
    });
  });

  describe("index", () => {
    test("GET / lists available endpoints", async () => {
      const app = createApp(stub);
      const res = await app.request("/");
      expect(res.status).toBe(200);
      const body = (await res.json()) as { endpoints: string[] };
      expect(body.endpoints).toEqual(Object.keys(CHART_ENDPOINT_METRICS));
    });
  });
});
