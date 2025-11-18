import type { ID, Timestamps } from './common.js';

export interface Reaction extends Timestamps {
  id: ID;
  userId: ID;
  noteId: ID;
  reaction: string; // Emoji name or Unicode emoji
}
