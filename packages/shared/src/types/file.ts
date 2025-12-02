import type { ID, Timestamps } from "./common.js";

export interface DriveFile extends Timestamps {
  id: ID;
  userId: ID;
  name: string;
  type: string; // MIME type
  size: number;
  md5: string;
  url: string;
  thumbnailUrl: string | null;
  blurhash: string | null;
  comment: string | null;
  isSensitive: boolean;
  storageKey: string; // Internal storage identifier
}

export interface FileMetadata {
  name: string;
  type: string;
  size: number;
  userId: ID;
}
