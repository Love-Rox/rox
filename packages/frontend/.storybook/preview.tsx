import type { Preview } from "@storybook/react";
import { withProviders } from "./decorators";
import "../src/styles/globals.css";

const preview: Preview = {
  decorators: [withProviders],
  parameters: {
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
    layout: "centered",
    backgrounds: { disable: true },
  },
  globalTypes: {
    colorMode: {
      name: "Color Mode",
      description: "Light or dark mode",
      defaultValue: "light",
      toolbar: {
        icon: "mirror",
        items: [
          { value: "light", title: "Light" },
          { value: "dark", title: "Dark" },
        ],
        dynamicTitle: true,
      },
    },
    primaryColor: {
      name: "Primary Color",
      description: "Theme primary color",
      defaultValue: "#3b82f6",
      toolbar: {
        icon: "paintbrush",
        items: [
          { value: "#3b82f6", title: "Blue (default)" },
          { value: "#10b981", title: "Green" },
          { value: "#f59e0b", title: "Amber" },
          { value: "#ef4444", title: "Red" },
          { value: "#8b5cf6", title: "Purple" },
        ],
        dynamicTitle: true,
      },
    },
  },
};

export default preview;
