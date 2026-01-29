import { atom } from "jotai";

/**
 * Registration data for a modal in the registry.
 */
export interface ModalRegistration {
  /** Unique identifier for the modal */
  id: string;
  /** Function to close the modal */
  close: () => void;
}

/**
 * Atom storing the registry of all open modals.
 * Maps modal IDs to their registration data.
 */
export const modalRegistryAtom = atom<Map<string, ModalRegistration>>(
  new Map()
);

/**
 * Write-only atom to register a modal in the registry.
 */
export const registerModalAtom = atom(
  null,
  (get, set, registration: ModalRegistration) => {
    const registry = new Map(get(modalRegistryAtom));
    registry.set(registration.id, registration);
    set(modalRegistryAtom, registry);
  }
);

/**
 * Write-only atom to unregister a modal from the registry.
 */
export const unregisterModalAtom = atom(null, (get, set, id: string) => {
  const registry = new Map(get(modalRegistryAtom));
  registry.delete(id);
  set(modalRegistryAtom, registry);
});

/**
 * Write-only atom to close all registered modals.
 * Used before navigation to prevent portal cleanup errors.
 */
export const closeAllModalsAtom = atom(null, (get, set) => {
  const registry = get(modalRegistryAtom);
  registry.forEach((modal) => modal.close());
  set(modalRegistryAtom, new Map());
});
