/**
 * UI Settings Types
 *
 * Defines the structure for user UI customization options.
 */

/** Available font size options */
export type FontSize = "small" | "medium" | "large" | "xlarge";

/** Available line height options */
export type LineHeight = "compact" | "normal" | "relaxed";

/** Available content width options */
export type ContentWidth = "narrow" | "normal" | "wide";

/** Available theme options */
export type Theme = "light" | "dark" | "system";

/** Available notification sound options */
export type NotificationSound =
  | "none"
  | "default"
  | "soft"
  | "bell"
  | "pop"
  | "chirp"
  | "synth"
  | "wood"
  | "drop";

/**
 * Notification types that can have individual sound settings
 */
export type NotificationSoundType =
  | "follow"
  | "mention"
  | "reply"
  | "reaction"
  | "renote"
  | "quote";

/**
 * Per-notification-type sound settings
 */
export interface NotificationSoundSettings {
  sound: NotificationSound;
  volume: number; // 0-100
}

/**
 * Map of notification type to sound settings
 */
export type NotificationSoundsByType = Partial<Record<NotificationSoundType, NotificationSoundSettings>>;

/**
 * User interface customization settings.
 */
export interface UISettings {
  /** Text size for content display */
  fontSize?: FontSize;
  /** Spacing between lines of text */
  lineHeight?: LineHeight;
  /** Maximum width for content area */
  contentWidth?: ContentWidth;
  /** Color theme preference */
  theme?: Theme;
  /** Custom CSS to apply to the application */
  appCustomCss?: string;
  /** Default notification sound effect */
  notificationSound?: NotificationSound;
  /** Notification volume level (0-100) */
  notificationVolume?: number;
  /** Per-notification-type sound settings (overrides default) */
  notificationSoundsByType?: NotificationSoundsByType;
  /** Enable deck mode (multi-column view) */
  deckEnabled?: boolean;
}

/**
 * Default UI settings
 */
export const defaultUISettings: Required<Omit<UISettings, "appCustomCss" | "notificationSoundsByType" | "deckEnabled">> & {
  appCustomCss: string;
  notificationSoundsByType: NotificationSoundsByType | undefined;
  deckEnabled: boolean;
} = {
  fontSize: "medium",
  lineHeight: "normal",
  contentWidth: "normal",
  theme: "system",
  appCustomCss: "",
  notificationSound: "default",
  notificationVolume: 50,
  notificationSoundsByType: undefined,
  deckEnabled: false,
};

/** CSS pixel values for each font size option */
export const fontSizeValues: Record<FontSize, string> = {
  small: "12px",
  medium: "14px",
  large: "16px",
  xlarge: "18px",
};

/** CSS line-height values for each option */
export const lineHeightValues: Record<LineHeight, string> = {
  compact: "1.4",
  normal: "1.6",
  relaxed: "1.8",
};

/** CSS max-width values for each content width option */
export const contentWidthValues: Record<ContentWidth, string> = {
  narrow: "600px",
  normal: "800px",
  wide: "1000px",
};

/** Human-readable labels for font size options */
export const fontSizeLabels: Record<FontSize, string> = {
  small: "Small (12px)",
  medium: "Medium (14px)",
  large: "Large (16px)",
  xlarge: "Extra Large (18px)",
};

/** Human-readable labels for line height options */
export const lineHeightLabels: Record<LineHeight, string> = {
  compact: "Compact",
  normal: "Normal",
  relaxed: "Relaxed",
};

/** Human-readable labels for content width options */
export const contentWidthLabels: Record<ContentWidth, string> = {
  narrow: "Narrow (600px)",
  normal: "Normal (800px)",
  wide: "Wide (1000px)",
};

/** Human-readable labels for theme options */
export const themeLabels: Record<Theme, string> = {
  light: "Light",
  dark: "Dark",
  system: "System",
};

/** Human-readable labels for notification sound options */
export const notificationSoundLabels: Record<NotificationSound, string> = {
  none: "Off",
  default: "Default",
  soft: "Soft",
  bell: "Bell",
  pop: "Pop",
  chirp: "Chirp",
  synth: "Synth",
  wood: "Wood",
  drop: "Drop",
};

/**
 * Labels for notification types (for display)
 */
export const notificationTypeLabels: Record<NotificationSoundType, string> = {
  follow: "Follow",
  mention: "Mention",
  reply: "Reply",
  reaction: "Reaction",
  renote: "Renote",
  quote: "Quote",
};
