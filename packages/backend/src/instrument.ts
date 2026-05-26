/**
 * Sentry instrumentation entry point.
 *
 * This module is imported via a side-effect import as the very first line of
 * `src/index.ts`. ESM evaluates imports in order, so isolating Sentry init in
 * its own module guarantees `Sentry.init` runs before `hono` and the rest of
 * the application graph are imported — required for OpenTelemetry-based
 * auto-instrumentation (`@sentry/bun` depends on `@sentry/node` which uses
 * `import-in-the-middle`).
 *
 * @module instrument
 */

import { initSentry } from "./lib/sentry.js";

initSentry();
