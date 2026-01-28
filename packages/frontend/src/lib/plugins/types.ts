/**
 * Frontend Plugin Type Definitions
 *
 * Defines the interfaces for frontend plugins including
 * slot components, pages, and plugin metadata.
 *
 * @module lib/plugins/types
 */

import type { ComponentType } from "react";
import type { Atom } from "jotai";
import type { SlotName } from "./slots";

// =============================================================================
// Slot Props
// =============================================================================

/**
 * Base props passed to all slot components
 */
export interface BaseSlotProps {
  /** Plugin ID */
  pluginId: string;
}

/**
 * Props for note-related slots
 */
export interface NoteSlotProps extends BaseSlotProps {
  /** Note ID */
  noteId: string;
  /** Note author ID */
  authorId: string;
  /** Note text content */
  text: string | null;
  /** Content warning */
  cw: string | null;
  /** Visibility level */
  visibility: string;
}

/**
 * Props for compose-related slots
 */
export interface ComposeSlotProps extends BaseSlotProps {
  /** Current text in compose area */
  text: string;
  /** Current content warning */
  cw: string | null;
  /** Current visibility setting */
  visibility: string;
  /** Callback to update text */
  onTextChange?: (text: string) => void;
  /** Callback to update CW */
  onCwChange?: (cw: string | null) => void;
}

/**
 * Props for profile-related slots
 */
export interface ProfileSlotProps extends BaseSlotProps {
  /** Profile user ID */
  userId: string;
  /** Profile username */
  username: string;
  /** Whether viewing own profile */
  isOwnProfile: boolean;
}

/**
 * Props for settings-related slots
 */
export interface SettingsSlotProps extends BaseSlotProps {
  /** Current user ID */
  userId: string;
}

/**
 * Props for admin-related slots
 */
export interface AdminSlotProps extends BaseSlotProps {
  /** Admin user ID */
  adminId: string;
}

/**
 * Props for navigation/layout slots
 */
export interface NavigationSlotProps extends BaseSlotProps {
  /** Current route path */
  currentPath: string;
}

/**
 * Props for timeline-related slots
 */
export interface TimelineSlotProps extends BaseSlotProps {
  /** Timeline type (home, local, global, etc.) */
  timelineType: string;
}

/**
 * Map slot names to their props types
 */
export interface SlotPropsMap {
  // Note slots
  "note:header:before": NoteSlotProps;
  "note:header:after": NoteSlotProps;
  "note:content:after": NoteSlotProps;
  "note:actions": NoteSlotProps;
  "note:footer": NoteSlotProps;

  // Compose slots
  "compose:toolbar": ComposeSlotProps;
  "compose:footer": ComposeSlotProps;

  // Profile slots
  "profile:header": ProfileSlotProps;
  "profile:tabs": ProfileSlotProps;
  "profile:sidebar": ProfileSlotProps;

  // Settings slots
  "settings:tabs": SettingsSlotProps;
  "settings:footer": SettingsSlotProps;

  // Admin slots
  "admin:sidebar": AdminSlotProps;
  "admin:dashboard": AdminSlotProps;

  // Navigation slots
  "sidebar:top": NavigationSlotProps;
  "sidebar:bottom": NavigationSlotProps;
  "header:actions": NavigationSlotProps;

  // Timeline slots
  "timeline:header": TimelineSlotProps;
  "timeline:filters": TimelineSlotProps;
}

/**
 * Get props type for a specific slot
 */
export type SlotProps<T extends SlotName> = T extends keyof SlotPropsMap
  ? SlotPropsMap[T]
  : BaseSlotProps;

// =============================================================================
// Plugin Definition
// =============================================================================

/**
 * Plugin page definition
 */
export interface PluginPage {
  /** Route path (e.g., "/x/my-plugin/dashboard") */
  path: string;
  /** Page component */
  component: ComponentType;
  /** Page title for navigation */
  title?: string;
  /** Whether page requires authentication */
  requiresAuth?: boolean;
}

/**
 * Plugin i18n messages
 */
export interface PluginMessages {
  /** Language code -> message key -> message value */
  [locale: string]: {
    [key: string]: string;
  };
}

/**
 * Frontend Plugin Interface
 *
 * Defines the structure of a frontend plugin that can be loaded by Rox.
 *
 * @example
 * ```typescript
 * const myPlugin: FrontendPlugin = {
 *   id: 'my-plugin',
 *   name: 'My Plugin',
 *   version: '1.0.0',
 *
 *   slots: {
 *     'note:footer': ({ noteId }) => <MyNoteFooter noteId={noteId} />,
 *   },
 *
 *   pages: [
 *     { path: '/x/my-plugin', component: MyPluginPage },
 *   ],
 * };
 * ```
 */
export interface FrontendPlugin {
  /** Unique plugin identifier (must match backend plugin ID) */
  id: string;

  /** Human-readable plugin name */
  name: string;

  /** Plugin version (semver) */
  version: string;

  /** Plugin description */
  description?: string;

  /**
   * Components to inject into slots
   * Key is slot name, value is React component
   */
  slots?: {
    [K in SlotName]?: ComponentType<SlotProps<K>>;
  };

  /**
   * Custom pages/routes provided by plugin
   * Routes are mounted under /x/{pluginId}/
   */
  pages?: PluginPage[];

  /**
   * Jotai atoms for plugin state
   * Atoms are namespaced by plugin ID
   */
  atoms?: Record<string, Atom<unknown>>;

  /**
   * i18n messages for the plugin
   */
  messages?: PluginMessages;

  /**
   * Called when plugin is loaded (client-side only)
   */
  onLoad?: () => void | Promise<void>;

  /**
   * Called when plugin is unloaded
   */
  onUnload?: () => void | Promise<void>;
}

/**
 * Loaded plugin with runtime state
 */
export interface LoadedFrontendPlugin {
  /** Plugin definition */
  plugin: FrontendPlugin;
  /** Whether the plugin is enabled */
  enabled: boolean;
  /** Load timestamp */
  loadedAt: Date;
  /** Error if plugin failed to load */
  error?: string;
}

/**
 * Plugin manifest from backend API
 */
export interface PluginManifestResponse {
  /** Plugin ID */
  id: string;
  /** Plugin name */
  name: string;
  /** Plugin version */
  version: string;
  /** Plugin description */
  description?: string;
  /** Whether plugin is enabled */
  enabled: boolean;
  /** Whether plugin has frontend component */
  hasFrontend: boolean;
  /** Frontend bundle URL (if hasFrontend is true) */
  frontendUrl?: string;
}

/**
 * Plugin system status from backend API
 */
export interface PluginSystemStatus {
  /** Whether plugin system is enabled */
  enabled: boolean;
  /** Number of loaded plugins */
  loaded: number;
  /** List of plugins */
  plugins: PluginManifestResponse[];
}
