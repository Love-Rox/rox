import type { ID, Timestamps } from "./common.js";

/** A reaction (emoji or custom emoji) attached to a note by a user. */
export interface Reaction extends Timestamps {
  id: ID;
  userId: ID;
  noteId: ID;
  reaction: string; // Emoji name or Unicode emoji
  customEmojiUrl?: string; // URL for custom emoji image (for remote reactions)
}
