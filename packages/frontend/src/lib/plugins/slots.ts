/**
 * Plugin Slot Definitions
 *
 * Defines the available slots where plugins can inject React components.
 * Each slot has a unique identifier and description.
 *
 * @module lib/plugins/slots
 */

/**
 * Available plugin slot locations
 *
 * Slots are organized by the component/page they appear in.
 * Plugin components receive props specific to each slot location.
 */
export const PLUGIN_SLOTS = {
  // =========================================================================
  // Note Display
  // =========================================================================

  /** Before note header (above author info) */
  "note:header:before": "Before note header",

  /** After note header (below author info, above content) */
  "note:header:after": "After note header",

  /** After note content (below text, above actions) */
  "note:content:after": "After note content",

  /** Additional note action buttons */
  "note:actions": "Additional note action buttons",

  /** After note footer (below actions) */
  "note:footer": "After note footer",

  // =========================================================================
  // Compose (Note Creation)
  // =========================================================================

  /** Additional compose toolbar items */
  "compose:toolbar": "Additional compose toolbar items",

  /** Below compose textarea */
  "compose:footer": "Below compose textarea",

  // =========================================================================
  // User Profile
  // =========================================================================

  /** Additional profile header content (below banner) */
  "profile:header": "Additional profile header content",

  /** Additional profile tabs */
  "profile:tabs": "Additional profile tabs",

  /** Profile sidebar (if applicable) */
  "profile:sidebar": "Profile sidebar content",

  // =========================================================================
  // Settings
  // =========================================================================

  /** Additional settings tabs */
  "settings:tabs": "Additional settings tabs",

  /** Settings page footer */
  "settings:footer": "Settings page footer",

  // =========================================================================
  // Admin
  // =========================================================================

  /** Additional admin sidebar items */
  "admin:sidebar": "Additional admin sidebar items",

  /** Additional admin dashboard widgets */
  "admin:dashboard": "Additional admin dashboard widgets",

  // =========================================================================
  // Navigation / Layout
  // =========================================================================

  /** Before main sidebar content */
  "sidebar:top": "Before sidebar content",

  /** Before sidebar footer */
  "sidebar:bottom": "Before sidebar footer",

  /** Global header additions */
  "header:actions": "Global header action buttons",

  // =========================================================================
  // Timeline
  // =========================================================================

  /** Above timeline content */
  "timeline:header": "Above timeline content",

  /** Timeline filter/tab additions */
  "timeline:filters": "Timeline filter additions",
} as const;

/**
 * Slot name type (union of all slot keys)
 */
export type SlotName = keyof typeof PLUGIN_SLOTS;

/**
 * Get slot description by name
 */
export function getSlotDescription(slot: SlotName): string {
  return PLUGIN_SLOTS[slot];
}

/**
 * Get all available slot names
 */
export function getAllSlotNames(): SlotName[] {
  return Object.keys(PLUGIN_SLOTS) as SlotName[];
}
