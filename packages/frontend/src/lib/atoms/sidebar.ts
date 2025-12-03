/**
 * Sidebar state atoms
 *
 * Manages sidebar collapsed state globally for layout coordination.
 */

import { atom } from "jotai";

const SIDEBAR_COLLAPSED_KEY = "rox_sidebar_collapsed";

/**
 * Get initial collapsed state from localStorage
 */
const getInitialCollapsedState = (): boolean => {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
};

/**
 * Sidebar collapsed state atom
 */
export const sidebarCollapsedAtom = atom<boolean>(getInitialCollapsedState());

/**
 * Writable atom that persists collapsed state to localStorage
 */
export const sidebarCollapsedWithPersistenceAtom = atom(
  (get) => get(sidebarCollapsedAtom),
  (_get, set, newValue: boolean) => {
    set(sidebarCollapsedAtom, newValue);
    if (typeof window !== "undefined") {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(newValue));
    }
  }
);
