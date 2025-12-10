import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { lingui } from "@lingui/vite-plugin";
import { defineConfig } from "waku/config";

/**
 * Waku configuration
 * Configures Vite settings for Tailwind CSS v4 (via Vite plugin) and Lingui integration
 */
export default defineConfig({
  /** Vite configuration for all environments */
  vite: {
    plugins: [
      tailwindcss(),
      react({
        babel: {
          // Temporarily disabled react-compiler to debug browser freeze issue
          plugins: ["@lingui/babel-plugin-lingui-macro"],
        },
      }),
      lingui(),
    ],
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
      rollupOptions: {
        output: {
          /** Manual chunk splitting for better caching */
          manualChunks: {
            /** React core libraries */
            "react-vendor": ["react", "react-dom"],
            /** UI component libraries */
            "ui-vendor": ["react-aria-components"],
            /** i18n libraries */
            "i18n-vendor": ["@lingui/react", "@lingui/core"],
            /** State management */
            "state-vendor": ["jotai"],
          },
        },
      },
    },
  },
});
