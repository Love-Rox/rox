import type { StorybookConfig } from "@storybook/react-vite";
import tailwindcss from "@tailwindcss/vite";
import babelPlugin from "@rolldown/plugin-babel";
import { lingui } from "@lingui/vite-plugin";

const config: StorybookConfig = {
  stories: ["../src/components/ui/__stories__/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-a11y"],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  viteFinal: async (config) => {
    config.plugins = config.plugins || [];
    config.plugins.push(
      tailwindcss(),
      babelPlugin({
        plugins: ["@lingui/babel-plugin-lingui-macro"],
      }),
      lingui(),
    );
    return config;
  },
};

export default config;
