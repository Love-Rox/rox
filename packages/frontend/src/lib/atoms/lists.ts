/**
 * Lists state management atoms
 *
 * Jotai atoms for managing user lists and list timeline state
 *
 * @module lib/atoms/lists
 */

import { atom } from "jotai";
import type { ListWithMemberCount, List } from "../api/lists";
import type { Note } from "../types/note";

/**
 * User's own lists atom
 * Stores all lists owned by the current user
 */
export const myListsAtom = atom<ListWithMemberCount[]>([]);

/**
 * My lists loading state
 */
export const myListsLoadingAtom = atom<boolean>(false);

/**
 * My lists error state
 */
export const myListsErrorAtom = atom<string | null>(null);

/**
 * Currently selected/viewed list
 */
export const selectedListAtom = atom<ListWithMemberCount | null>(null);

/**
 * List timeline notes atom
 */
export const listTimelineNotesAtom = atom<Note[]>([]);

/**
 * List timeline loading state
 */
export const listTimelineLoadingAtom = atom<boolean>(false);

/**
 * List timeline error state
 */
export const listTimelineErrorAtom = atom<string | null>(null);

/**
 * List timeline has more items indicator
 */
export const listTimelineHasMoreAtom = atom<boolean>(true);

/**
 * Derived atom: Get the last note ID for pagination
 */
export const listTimelineLastNoteIdAtom = atom((get) => {
  const notes = get(listTimelineNotesAtom);
  return notes.length > 0 ? (notes[notes.length - 1]?.id ?? null) : null;
});

/**
 * Cache of lists containing specific users
 * Map of userId -> list IDs that contain the user
 */
export const userInListsMapAtom = atom<Map<string, string[]>>(new Map());

/**
 * Action atom: Add a list to myLists
 */
export const addListAtom = atom(null, (get, set, list: ListWithMemberCount) => {
  const lists = get(myListsAtom);
  set(myListsAtom, [...lists, list]);
});

/**
 * Action atom: Update a list in myLists
 */
export const updateListAtom = atom(null, (get, set, updatedList: List) => {
  const lists = get(myListsAtom);
  set(
    myListsAtom,
    lists.map((list) => (list.id === updatedList.id ? { ...list, ...updatedList } : list)),
  );
});

/**
 * Action atom: Remove a list from myLists
 */
export const removeListAtom = atom(null, (get, set, listId: string) => {
  const lists = get(myListsAtom);
  set(
    myListsAtom,
    lists.filter((list) => list.id !== listId),
  );
});

/**
 * Action atom: Update member count for a list
 */
export const updateListMemberCountAtom = atom(null, (get, set, listId: string, delta: number) => {
  const lists = get(myListsAtom);
  set(
    myListsAtom,
    lists.map((list) =>
      list.id === listId ? { ...list, memberCount: Math.max(0, list.memberCount + delta) } : list,
    ),
  );
});

/**
 * Action atom: Clear list timeline state
 */
export const clearListTimelineAtom = atom(null, (_get, set) => {
  set(listTimelineNotesAtom, []);
  set(listTimelineLoadingAtom, false);
  set(listTimelineErrorAtom, null);
  set(listTimelineHasMoreAtom, true);
});
