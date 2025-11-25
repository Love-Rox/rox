import { atom } from 'jotai';
import type { User } from '../types/user';

/**
 * Get token from localStorage (client-side only)
 */
const getTokenFromStorage = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem('token');
  } catch {
    return null;
  }
};

/**
 * Save token to localStorage (client-side only)
 */
const saveTokenToStorage = (token: string | null) => {
  if (typeof window === 'undefined') return;
  try {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  } catch (error) {
    console.error('Failed to save token to localStorage:', error);
  }
};

/**
 * Authentication token atom with localStorage sync
 * Reads from localStorage on initialization, writes on updates
 */
export const tokenAtom = atom<string | null>(
  // Read: Get initial value from localStorage
  getTokenFromStorage(),
  // Write: Save to both atom and localStorage
  (get, set, newValue: string | null) => {
    set(tokenAtom, newValue);
    saveTokenToStorage(newValue);
  }
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
