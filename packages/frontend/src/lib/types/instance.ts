/**
 * Instance Information Types
 *
 * Types for instance metadata, registration settings, and theme configuration
 */

/**
 * Theme settings for the instance
 */
export interface ThemeSettings {
  primaryColor: string;
  darkMode: "light" | "dark" | "system";
}

/**
 * Registration settings
 */
export interface RegistrationSettings {
  enabled: boolean;
  inviteOnly: boolean;
  approvalRequired: boolean;
}

/**
 * Software information
 */
export interface SoftwareInfo {
  name: string;
  version: string;
  /** CI build counter (incrementing integer); "local" for non-CI builds. */
  buildNumber?: string;
  /** Short git SHA of the build (e.g. "a1b2c3d"); "local" for non-CI builds. */
  build?: string;
  /** Source ref the build came from (e.g. "dev", "main", a tag); "local" otherwise. */
  channel?: string;
  repository: string;
}

/**
 * Public instance information returned by /api/instance
 */
export interface InstanceInfo {
  name: string;
  description: string;
  url: string;
  maintainerEmail: string | null;
  iconUrl: string | null;
  darkIconUrl: string | null;
  bannerUrl: string | null;
  faviconUrl: string | null;
  tosUrl: string | null;
  privacyPolicyUrl: string | null;
  sourceCodeUrl: string | null;
  registration: RegistrationSettings;
  theme: ThemeSettings;
  software: SoftwareInfo;
}
