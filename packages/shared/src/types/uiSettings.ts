/**
 * UI Settings Types
 *
 * Shared type definitions for user UI customization options.
 */

/** Available font size options for the UI. */
export type FontSize = "small" | "medium" | "large" | "xlarge";
/** Line height density options. */
export type LineHeight = "compact" | "normal" | "relaxed";
/** Content area width options. */
export type ContentWidth = "narrow" | "normal" | "wide";
/** Color theme preference. */
export type Theme = "light" | "dark" | "system";

/** User-configurable UI display preferences. */
export interface UISettings {
  fontSize?: FontSize;
  lineHeight?: LineHeight;
  contentWidth?: ContentWidth;
  theme?: Theme;
  appCustomCss?: string;
  /** Enable deck mode (multi-column view) */
  deckEnabled?: boolean;
}
