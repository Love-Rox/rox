import type { Decorator } from "@storybook/react";
import { Provider as JotaiProvider } from "jotai";
import { I18nProvider } from "../src/components/I18nProvider";
import { ThemeProvider } from "../src/components/ThemeProvider";

/**
 * Global decorator providing ThemeProvider, Jotai, and I18n for all stories.
 * Reads colorMode and primaryColor from Storybook toolbar globals.
 */
export const withProviders: Decorator = (Story, context) => {
  const colorMode = context.globals.colorMode || "light";
  const primaryColor = context.globals.primaryColor || "#3b82f6";

  return (
    <JotaiProvider>
      <I18nProvider>
        <ThemeProvider theme={{ primaryColor, darkMode: colorMode }}>
          <Story />
        </ThemeProvider>
      </I18nProvider>
    </JotaiProvider>
  );
};
