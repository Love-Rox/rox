import tailwindcss from "@tailwindcss/vite";
import babelPlugin from "@rolldown/plugin-babel";
import { lingui } from "@lingui/vite-plugin";

/**
 * Shared Vite plugins for Tailwind CSS, Lingui i18n macro compilation.
 * Used by both waku.config.ts and .storybook/main.ts.
 */
export function getSharedVitePlugins() {
  return [
    tailwindcss(),
    babelPlugin({
      plugins: ["@lingui/babel-plugin-lingui-macro"],
    }),
    lingui(),
  ];
}
