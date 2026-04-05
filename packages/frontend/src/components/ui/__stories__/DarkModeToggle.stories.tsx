import type { Meta, StoryObj } from "@storybook/react";
import { DarkModeToggle } from "../DarkModeToggle";

const meta = {
  title: "UI/DarkModeToggle",
  component: DarkModeToggle,
  tags: ["autodocs"],
} satisfies Meta<typeof DarkModeToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default toggle. Uses the ThemeProvider from the global decorator.
 * Switch between Light and Dark using the Storybook toolbar "Color Mode" toggle
 * to see the icon change.
 */
export const Default: Story = {};

/**
 * Toggle rendered in light mode (moon icon visible).
 */
export const Light: Story = {
  globals: {
    colorMode: "light",
  },
};

/**
 * Toggle rendered in dark mode (sun icon visible).
 */
export const Dark: Story = {
  globals: {
    colorMode: "dark",
  },
};

/**
 * Toggle with a custom className applied.
 */
export const WithCustomClass: Story = {
  args: {
    className: "bg-gray-200 dark:bg-gray-700 rounded-full",
  },
};
