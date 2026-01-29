/**
 * Modal Container Utility
 *
 * Provides a stable DOM container for React Aria modals/portals.
 * This prevents "removeChild" errors during navigation by ensuring
 * all modals use the same persistent container.
 *
 * @module lib/utils/modalContainer
 */

/**
 * Get or create the stable modal container element.
 * Must be called only on client-side (not during SSR).
 *
 * @returns The modal container element
 * @throws Error if called during SSR
 */
export function getModalContainer(): HTMLElement {
  if (typeof document === "undefined") {
    throw new Error("Cannot get modal container during SSR");
  }
  let container = document.getElementById("modal-root");
  if (!container) {
    container = document.createElement("div");
    container.id = "modal-root";
    document.body.appendChild(container);
  }
  return container;
}
