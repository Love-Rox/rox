import { useEffect } from "react";
import type { Decorator } from "@storybook/react";
import { Provider as JotaiProvider } from "jotai";
import { I18nProvider } from "../src/components/I18nProvider";
import { ThemeProvider } from "../src/components/ThemeProvider";

/**
 * Global decorator providing ThemeProvider, Jotai, and I18n for all stories.
 * Reads colorMode and primaryColor from Storybook toolbar globals.
 *
 * Manually applies the dark class to documentElement since ThemeProvider's
 * useEffect may not re-run when Storybook globals change.
 */
export const withProviders: Decorator = (Story, context) => {
  const colorMode = context.globals.colorMode || "light";
  const primaryColor = context.globals.primaryColor || "#3b82f6";

  // Apply dark class directly on the iframe's documentElement
  useEffect(() => {
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(colorMode);
  }, [colorMode]);

  return (
    <JotaiProvider>
      <I18nProvider>
        <ThemeProvider theme={{ primaryColor, darkMode: colorMode }}>
          <div className="min-h-screen bg-(--bg-primary) text-(--text-primary) p-4">
            <Story />
          </div>
        </ThemeProvider>
      </I18nProvider>
    </JotaiProvider>
  );
};
