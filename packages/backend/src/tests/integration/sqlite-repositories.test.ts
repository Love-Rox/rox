/**
 * SQLite Repository Integration Tests (Bun version - skipped)
 *
 * This file is for Bun's test runner. Since Bun doesn't support better-sqlite3,
 * all tests are skipped here. The actual tests run via Node.js/Vitest in:
 * sqlite-repositories.node.test.ts
 *
 * Run SQLite tests with: bun run test:sqlite (uses Node.js + Vitest)
 */

import { describe, test } from "bun:test";

describe("SQLite Repository Integration Tests", () => {
  test.skip("SKIPPED: better-sqlite3 is not supported in Bun - run 'bun run test:sqlite' instead", () => {
    // These tests run in Node.js via sqlite-repositories.node.test.ts
  });
});
