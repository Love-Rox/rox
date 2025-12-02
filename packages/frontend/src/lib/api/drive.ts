/**
 * Drive API client
 * Provides functions for interacting with the drive/file upload API endpoints
 */

/**
 * Get the API base URL
 * In browser, uses same origin (proxy handles routing in dev)
 * In SSR, uses localhost
 */
function getApiBase(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "http://localhost:3000";
}

/**
 * Drive file data structure
 */
export interface DriveFile {
  id: string;
  userId: string;
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
 * File upload parameters
 */
export interface UploadFileParams {
  file: File;
  isSensitive?: boolean;
  comment?: string;
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

  const response = await fetch(`${getApiBase()}/api/drive/files/create`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to upload file");
  }

  return response.json();
}

/**
 * List query options
 */
export interface ListFilesOptions {
  limit?: number;
  sinceId?: string;
  untilId?: string;
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

  const response = await fetch(`${getApiBase()}/api/drive/files?${params}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to list files");
  }

  return response.json();
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

  const response = await fetch(`${getApiBase()}/api/drive/files/show?${params}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to get file");
  }

  return response.json();
}

/**
 * Delete a file
 *
 * @param fileId - File ID to delete
 * @param token - Authentication token
 */
export async function deleteFile(fileId: string, token: string): Promise<void> {
  const response = await fetch(`${getApiBase()}/api/drive/files/delete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ fileId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete file");
  }
}

/**
 * Get storage usage
 *
 * @param token - Authentication token
 * @returns Storage usage in bytes and MB
 */
export async function getStorageUsage(token: string): Promise<{ usage: number; usageMB: number }> {
  const response = await fetch(`${getApiBase()}/api/drive/usage`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to get storage usage");
  }

  return response.json();
}
