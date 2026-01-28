/**
 * Drive API client
 * Provides functions for interacting with the drive/file upload API endpoints
 */

import { withToken } from "./client";

/**
 * Drive file data structure
 */
export interface DriveFile {
  id: string;
  userId: string;
  folderId: string | null;
  name: string;
  type: string;
  md5: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  blurhash?: string;
  isSensitive: boolean;
  comment?: string;
  properties: {
    width?: number;
    height?: number;
  };
  createdAt: string;
}

/**
 * Drive folder data structure
 */
export interface DriveFolder {
  id: string;
  userId: string;
  parentId: string | null;
  name: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * File upload parameters
 */
export interface UploadFileParams {
  file: File;
  isSensitive?: boolean;
  comment?: string;
  folderId?: string | null;
}

/**
 * Upload a file to the drive
 *
 * @param params - Upload parameters
 * @param token - Authentication token
 * @returns Uploaded file information
 */
export async function uploadFile(params: UploadFileParams, token: string): Promise<DriveFile> {
  const formData = new FormData();
  formData.append("file", params.file);

  if (params.isSensitive !== undefined) {
    formData.append("isSensitive", String(params.isSensitive));
  }

  if (params.comment) {
    formData.append("comment", params.comment);
  }

  if (params.folderId) {
    formData.append("folderId", params.folderId);
  }

  return withToken(token).upload<DriveFile>("/api/drive/files/create", formData);
}

/**
 * List query options
 */
export interface ListFilesOptions {
  limit?: number;
  sinceId?: string;
  untilId?: string;
  folderId?: string | null;
}

/**
 * List user's files
 *
 * @param options - Query options
 * @param token - Authentication token
 * @returns List of files
 */
export async function listFiles(options: ListFilesOptions, token: string): Promise<DriveFile[]> {
  const params = new URLSearchParams();

  if (options.limit) {
    params.append("limit", options.limit.toString());
  }
  if (options.sinceId) {
    params.append("sinceId", options.sinceId);
  }
  if (options.untilId) {
    params.append("untilId", options.untilId);
  }
  if (options.folderId !== undefined) {
    params.append("folderId", options.folderId === null ? "null" : options.folderId);
  }

  return withToken(token).get<DriveFile[]>(`/api/drive/files?${params}`);
}

/**
 * Get file information
 *
 * @param fileId - File ID
 * @param token - Authentication token
 * @returns File information
 */
export async function getFile(fileId: string, token: string): Promise<DriveFile> {
  const params = new URLSearchParams({ fileId });
  return withToken(token).get<DriveFile>(`/api/drive/files/show?${params}`);
}

/**
 * Delete a file
 *
 * @param fileId - File ID to delete
 * @param token - Authentication token
 */
export async function deleteFile(fileId: string, token: string): Promise<void> {
  await withToken(token).post<void>("/api/drive/files/delete", { fileId });
}

/**
 * Get storage usage
 *
 * @param token - Authentication token
 * @returns Storage usage in bytes and MB
 */
export async function getStorageUsage(token: string): Promise<{ usage: number; usageMB: number }> {
  return withToken(token).get<{ usage: number; usageMB: number }>("/api/drive/usage");
}

// ===== Folder API =====

/**
 * List folders options
 */
export interface ListFoldersOptions {
  parentId?: string | null;
  limit?: number;
}

/**
 * List user's folders
 *
 * @param options - Query options
 * @param token - Authentication token
 * @returns List of folders
 */
export async function listFolders(
  options: ListFoldersOptions,
  token: string,
): Promise<DriveFolder[]> {
  const params = new URLSearchParams();

  if (options.limit) {
    params.append("limit", options.limit.toString());
  }
  if (options.parentId !== undefined) {
    params.append("parentId", options.parentId === null ? "null" : options.parentId);
  }

  return withToken(token).get<DriveFolder[]>(`/api/drive/folders?${params}`);
}

/**
 * Create a new folder
 *
 * @param name - Folder name
 * @param parentId - Optional parent folder ID
 * @param token - Authentication token
 * @returns Created folder
 */
export async function createFolder(
  name: string,
  parentId: string | null,
  token: string,
): Promise<DriveFolder> {
  return withToken(token).post<DriveFolder>("/api/drive/folders/create", { name, parentId });
}

/**
 * Get folder information
 *
 * @param folderId - Folder ID
 * @param token - Authentication token
 * @returns Folder information with counts
 */
export async function getFolder(
  folderId: string,
  token: string,
): Promise<DriveFolder & { childFolderCount: number; fileCount: number }> {
  const params = new URLSearchParams({ folderId });
  return withToken(token).get<DriveFolder & { childFolderCount: number; fileCount: number }>(
    `/api/drive/folders/show?${params}`,
  );
}

/**
 * Update folder
 *
 * @param folderId - Folder ID
 * @param updates - Fields to update
 * @param token - Authentication token
 * @returns Updated folder
 */
export async function updateFolder(
  folderId: string,
  updates: { name?: string; parentId?: string | null },
  token: string,
): Promise<DriveFolder> {
  return withToken(token).post<DriveFolder>("/api/drive/folders/update", { folderId, ...updates });
}

/**
 * Delete a folder
 *
 * @param folderId - Folder ID to delete
 * @param token - Authentication token
 */
export async function deleteFolder(folderId: string, token: string): Promise<void> {
  await withToken(token).post<void>("/api/drive/folders/delete", { folderId });
}

/**
 * Get folder path (breadcrumb)
 *
 * @param folderId - Folder ID
 * @param token - Authentication token
 * @returns Array of folders from root to target
 */
export async function getFolderPath(folderId: string, token: string): Promise<DriveFolder[]> {
  const params = new URLSearchParams({ folderId });
  return withToken(token).get<DriveFolder[]>(`/api/drive/folders/path?${params}`);
}

/**
 * Move a file to a different folder
 *
 * @param fileId - File ID
 * @param folderId - Target folder ID (null for root)
 * @param token - Authentication token
 * @returns Updated file
 */
export async function moveFile(
  fileId: string,
  folderId: string | null,
  token: string,
): Promise<DriveFile> {
  return withToken(token).post<DriveFile>("/api/drive/files/move", { fileId, folderId });
}
