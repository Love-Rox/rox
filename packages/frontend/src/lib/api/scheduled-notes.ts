import { apiClient } from "./client";
import type { NoteVisibility } from "../types/note";

/**
 * Scheduled note status
 */
export type ScheduledNoteStatus = "pending" | "published" | "failed" | "cancelled";

/**
 * Scheduled note data
 */
export interface ScheduledNote {
  id: string;
  userId: string;
  text: string | null;
  cw: string | null;
  visibility: NoteVisibility;
  localOnly: boolean;
  replyId: string | null;
  renoteId: string | null;
  fileIds: string[];
  scheduledAt: string;
  status: ScheduledNoteStatus;
  publishedNoteId: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Parameters for creating a scheduled note
 */
export interface CreateScheduledNoteParams {
  text?: string;
  cw?: string;
  visibility?: NoteVisibility;
  localOnly?: boolean;
  replyId?: string;
  renoteId?: string;
  fileIds?: string[];
  scheduledAt: string; // ISO 8601 date string
}

/**
 * Parameters for updating a scheduled note
 */
export interface UpdateScheduledNoteParams {
  id: string;
  text?: string;
  cw?: string;
  visibility?: NoteVisibility;
  localOnly?: boolean;
  replyId?: string;
  renoteId?: string;
  fileIds?: string[];
  scheduledAt?: string;
}

/**
 * List options for scheduled notes
 */
export interface ListScheduledNotesOptions {
  limit?: number;
  offset?: number;
  status?: ScheduledNoteStatus;
}

/**
 * Count response for scheduled notes
 */
export interface ScheduledNoteCountResponse {
  count: number;
  limit: number;
  remaining: number;
}

/**
 * Scheduled Notes API client
 */
export class ScheduledNotesApi {
  /**
   * Create a new scheduled note
   */
  async create(params: CreateScheduledNoteParams): Promise<ScheduledNote> {
    return apiClient.post<ScheduledNote>("/api/scheduled-notes/create", params);
  }

  /**
   * List scheduled notes
   */
  async list(options: ListScheduledNotesOptions = {}): Promise<ScheduledNote[]> {
    const params = new URLSearchParams();
    if (options.limit) params.set("limit", options.limit.toString());
    if (options.offset) params.set("offset", options.offset.toString());
    if (options.status) params.set("status", options.status);

    const query = params.toString();
    return apiClient.get<ScheduledNote[]>(`/api/scheduled-notes/list${query ? `?${query}` : ""}`);
  }

  /**
   * Get a specific scheduled note
   */
  async show(id: string): Promise<ScheduledNote> {
    return apiClient.get<ScheduledNote>(`/api/scheduled-notes/show?id=${id}`);
  }

  /**
   * Update a scheduled note
   */
  async update(params: UpdateScheduledNoteParams): Promise<ScheduledNote> {
    return apiClient.post<ScheduledNote>("/api/scheduled-notes/update", params);
  }

  /**
   * Cancel a scheduled note
   */
  async cancel(id: string): Promise<ScheduledNote> {
    return apiClient.post<ScheduledNote>("/api/scheduled-notes/cancel", { id });
  }

  /**
   * Delete a scheduled note (only cancelled or failed)
   */
  async delete(id: string): Promise<void> {
    await apiClient.post("/api/scheduled-notes/delete", { id });
  }

  /**
   * Get count of pending scheduled notes
   */
  async count(): Promise<ScheduledNoteCountResponse> {
    return apiClient.get<ScheduledNoteCountResponse>("/api/scheduled-notes/count");
  }
}

/**
 * Default scheduled notes API instance
 */
export const scheduledNotesApi = new ScheduledNotesApi();
