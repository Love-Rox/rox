import react from "@vitejs/plugin-react";
import { defineConfig } from "waku/config";
import { getSharedVitePlugins } from "./vite-plugins";

/**
 * Waku configuration
 * Configures Vite settings for Tailwind CSS v4 (via Vite plugin) and Lingui integration
 *
 * Lingui macro transformation is handled via @rolldown/plugin-babel.
 */
export default defineConfig({
  /** Vite configuration for all environments */
  vite: {
    plugins: [...getSharedVitePlugins(), react()],
    /** Proxy API requests to backend server */
    server: {
      port: 3001,
      proxy: {
        "/api": {
          target: "http://localhost:3000",
          changeOrigin: true,
        },
      },
    },
    ssr: {
      /** Allow Lingui macros to work with SSR by not externalizing them */
      noExternal: ["@lingui/macro", "babel-plugin-macros"],
    },
    optimizeDeps: {
      /** Optimize Lingui macro for ESM compatibility */
      include: ["@lingui/macro", "@lingui/react", "babel-plugin-macros"],
    },
    build: {
      /** Suppress chunk size warnings (500kB -> 1MB threshold) */
      chunkSizeWarningLimit: 1000,
      rolldownOptions: {
        /** Suppress plugin timing warnings (all listed plugins are required framework plugins) */
        checks: {
          pluginTimings: false,
        },
        output: {
          /** Manual chunk splitting for better caching (Rolldown requires function form) */
          manualChunks: (id: string) => {
            if (id.includes("node_modules/react-dom") || id.includes("node_modules/react/")) {
              return "react-vendor";
            }
            if (id.includes("node_modules/react-aria-components")) {
              return "ui-vendor";
            }
            if (
              id.includes("node_modules/@lingui/react") ||
              id.includes("node_modules/@lingui/core")
            ) {
              return "i18n-vendor";
            }
            if (id.includes("node_modules/jotai")) {
              return "state-vendor";
            }
          },
        },
      },
    },
  },
});
