import { atom } from "jotai";
import { atomWithStorage, createJSONStorage } from "jotai/utils";
import type { User } from "../types/user";

/**
 * Custom storage that handles SSR gracefully
 * Returns null on server, uses localStorage on client
 */
const createClientStorage = <T>() => {
  const storage = createJSONStorage<T>(() => {
    if (typeof window === "undefined") {
      // Return a dummy storage for SSR that does nothing
      return {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      };
    }
    return localStorage;
  });
  return storage;
};

/**
 * Authentication token atom with localStorage sync
 * Uses atomWithStorage for proper SSR hydration handling
 */
export const tokenAtom = atomWithStorage<string | null>(
  "token",
  null,
  createClientStorage<string | null>(),
  { getOnInit: true },
);

/**
 * Current user atom
 */
export const currentUserAtom = atom<User | null>(null);

/**
 * Derived atom: is user authenticated?
 */
export const isAuthenticatedAtom = atom((get) => {
  return get(tokenAtom) !== null && get(currentUserAtom) !== null;
});
