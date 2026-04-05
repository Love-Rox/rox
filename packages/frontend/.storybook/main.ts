import type { StorybookConfig } from "@storybook/react-vite";
import { getSharedVitePlugins } from "../vite-plugins";

const config: StorybookConfig = {
  stories: ["../src/components/ui/__stories__/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-a11y"],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  viteFinal: async (config) => {
    config.plugins = config.plugins || [];
    config.plugins.push(...getSharedVitePlugins());
    return config;
  },
};

export default config;
