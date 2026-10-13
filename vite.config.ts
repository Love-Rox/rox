/**
 * Vite+ workspace configuration.
 *
 * Only used by `vp fmt` / `vp lint` at the repository root. Each package keeps
 * its own build configuration (e.g. Waku for the frontend).
 *
 * @module vite.config
 */
import { defineConfig } from "vite-plus";

export default defineConfig({
  fmt: {
    // ツールが自動生成するファイルは再生成のたびに差分が出るため対象外にする
    ignorePatterns: [
      // drizzle-kit generate
      "packages/backend/drizzle/**/meta/**",
      // lingui compile
      "packages/frontend/src/locales/**/messages.ts",
    ],
  },
});
