import { apiClient } from "./client";
import { buildPaginationParams, buildUrlWithParams } from "./utils";
import type { Note, CreateNoteParams, TimelineOptions, NoteVisibility } from "../types/note";

// Re-export types for convenience
export type { Note, CreateNoteParams, TimelineOptions, NoteVisibility };

/**
 * Notes API client
 * Provides methods for interacting with notes/posts
 */
export class NotesApi {
  /**
   * Fetch local timeline
   *
   * @param options - Timeline fetch options
   * @returns Array of notes
   *
   * @example
   * ```ts
   * // Fetch initial timeline
   * const notes = await notesApi.getLocalTimeline({ limit: 20 });
   *
   * // Fetch more (pagination)
   * const moreNotes = await notesApi.getLocalTimeline({
   *   limit: 20,
   *   untilId: lastNote.id
   * });
   * ```
   */
  async getLocalTimeline(options: TimelineOptions = {}): Promise<Note[]> {
    const params = buildPaginationParams(options);
    return apiClient.get<Note[]>(buildUrlWithParams("/api/notes/local-timeline", params));
  }

  /**
   * Fetch social timeline (following + local)
   *
   * @param options - Timeline fetch options
   * @returns Array of notes
   */
  async getSocialTimeline(options: TimelineOptions = {}): Promise<Note[]> {
    const params = buildPaginationParams(options);
    return apiClient.get<Note[]>(buildUrlWithParams("/api/notes/social-timeline", params));
  }

  /**
   * Fetch global timeline (all public posts from local and remote users)
   *
   * @param options - Timeline fetch options
   * @returns Array of notes
   */
  async getGlobalTimeline(options: TimelineOptions = {}): Promise<Note[]> {
    const params = buildPaginationParams(options);
    return apiClient.get<Note[]>(buildUrlWithParams("/api/notes/global-timeline", params));
  }

  /**
   * Fetch home timeline (following only)
   *
   * @param options - Timeline fetch options
   * @returns Array of notes
   */
  async getHomeTimeline(options: TimelineOptions = {}): Promise<Note[]> {
    const params = buildPaginationParams(options);
    return apiClient.get<Note[]>(buildUrlWithParams("/api/notes/timeline", params));
  }

  /**
   * Fetch a single note by ID
   *
   * @param noteId - Note ID
   * @returns Note object
   */
  async getNote(noteId: string): Promise<Note> {
    return apiClient.post<Note>("/api/notes/show", { noteId });
  }

  /**
   * Create a new note
   *
   * @param params - Note creation parameters
   * @returns Created note
   *
   * @example
   * ```ts
   * // Simple text note
   * const note = await notesApi.createNote({
   *   text: 'Hello, world!',
   *   visibility: 'public'
   * });
   *
   * // Note with content warning and files
   * const note = await notesApi.createNote({
   *   text: 'Check out this image!',
   *   cw: 'Spoiler alert',
   *   fileIds: ['file_id_1', 'file_id_2'],
   *   visibility: 'home'
   * });
   * ```
   */
  async createNote(params: CreateNoteParams): Promise<Note> {
    return apiClient.post<Note>("/api/notes/create", params);
  }

  /**
   * Delete a note
   *
   * @param noteId - ID of note to delete
   */
  async deleteNote(noteId: string): Promise<void> {
    await apiClient.post("/api/notes/delete", { noteId });
  }

  /**
   * Create a reaction on a note
   *
   * @param noteId - Note ID
   * @param reaction - Reaction emoji (e.g., '👍', '❤️', ':custom_emoji:')
   */
  async createReaction(noteId: string, reaction: string): Promise<void> {
    await apiClient.post("/api/notes/reactions/create", { noteId, reaction });
  }

  /**
   * Delete a reaction from a note
   *
   * @param noteId - Note ID
   */
  async deleteReaction(noteId: string): Promise<void> {
    await apiClient.post("/api/notes/reactions/delete", { noteId });
  }

  /**
   * Renote (repost) a note
   *
   * @param noteId - ID of note to renote
   * @param text - Optional quote text
   * @returns Created renote
   */
  async renote(noteId: string, text?: string): Promise<Note> {
    return this.createNote({
      renoteId: noteId,
      text,
    });
  }

  /**
   * Get notes by a specific user
   *
   * @param userId - User ID
   * @param options - Timeline fetch options
   * @returns Array of notes
   */
  async getUserNotes(userId: string, options: TimelineOptions = {}): Promise<Note[]> {
    const params = buildPaginationParams(options);
    params.set("userId", userId);
    return apiClient.get<Note[]>(buildUrlWithParams("/api/notes/user-notes", params));
  }

  /**
   * Get replies to a specific note
   *
   * @param noteId - Note ID
   * @param options - Timeline fetch options
   * @returns Array of reply notes
   */
  async getReplies(noteId: string, options: TimelineOptions = {}): Promise<Note[]> {
    const params = buildPaginationParams(options);
    params.set("noteId", noteId);
    return apiClient.get<Note[]>(buildUrlWithParams("/api/notes/replies", params));
  }

  /**
   * Get conversation thread (ancestors and descendants)
   *
   * @param noteId - Note ID
   * @returns Object containing ancestors and descendants
   */
  async getConversation(noteId: string): Promise<{ ancestors: Note[]; descendants: Note[] }> {
    const note = await this.getNote(noteId);

    // Get ancestors (parent notes)
    const ancestors: Note[] = [];
    let currentNote = note;
    while (currentNote.replyId) {
      const parentNote = await this.getNote(currentNote.replyId);
      ancestors.unshift(parentNote);
      currentNote = parentNote;
    }

    // Get descendants (reply notes)
    const descendants = await this.getReplies(noteId, { limit: 100 });

    return { ancestors, descendants };
  }
}

/**
 * Default notes API instance
 */
export const notesApi = new NotesApi();
