/**
 * Metadata for a user-uploaded file.
 */
export interface FileMetadata {
  /** Original file name */
  name: string;
  /** MIME type of the file */
  type: string;
  /** File size in bytes */
  size: number;
  /** ID of the user who uploaded the file */
  userId: string;
}

/**
 * Emoji file metadata (not associated with any user)
 */
export interface EmojiFileMetadata {
  name: string;
  type: string;
  size: number;
}

/**
 * Abstract file storage interface.
 *
 * Implementations handle saving, deleting, and resolving URLs for uploaded files.
 * Supports both user-uploaded files and instance-owned emoji files.
 */
export interface IFileStorage {
  /**
   * Save a file to storage.
   *
   * @param file - File contents as a Buffer
   * @param metadata - File metadata including name, type, size, and owner
   * @returns Relative path or key of the saved file
   */
  save(file: Buffer, metadata: FileMetadata): Promise<string>;

  /**
   * Save emoji file to dedicated emoji directory.
   *
   * Not associated with any user - instance-owned resource.
   *
   * @param file - File buffer
   * @param metadata - Emoji file metadata
   * @returns Relative path of the saved file
   */
  saveEmoji(file: Buffer, metadata: EmojiFileMetadata): Promise<string>;

  /**
   * Delete a file from storage.
   *
   * @param filePath - Relative path or key of the file to delete
   */
  delete(filePath: string): Promise<void>;

  /**
   * Get the publicly accessible URL for a stored file.
   *
   * @param filePath - Relative path or key of the file
   * @returns Publicly accessible URL
   */
  getUrl(filePath: string): string;
}
