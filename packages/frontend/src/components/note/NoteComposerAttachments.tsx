"use client";

import { useEffect, useMemo } from "react";
import { X, HardDrive } from "lucide-react";
import { t } from "@lingui/core/macro";
import { Button } from "../ui/Button";
import type { DriveFile } from "../../lib/api/drive";
import { getProxiedImageUrl } from "../../lib/utils/imageProxy";

/**
 * Props for NoteComposerAttachments component
 */
export interface NoteComposerAttachmentsProps {
  /** New files to be uploaded */
  files: File[];
  /** Files already in the drive */
  driveFiles: DriveFile[];
  /** Callback to remove a new file by index */
  onRemoveFile: (index: number) => void;
  /** Callback to remove a drive file by ID */
  onRemoveDriveFile: (fileId: string) => void;
}

/**
 * Component for displaying file attachment previews in the note composer
 * Shows both new uploads and files selected from drive
 */
export function NoteComposerAttachments({
  files,
  driveFiles,
  onRemoveFile,
  onRemoveDriveFile,
}: NoteComposerAttachmentsProps) {
  const totalFileCount = files.length + driveFiles.length;

  // Memoize object URLs to prevent recreation on every render
  const filePreviews = useMemo(
    () => files.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [files]
  );

  // Cleanup object URLs when component unmounts or files change
  useEffect(() => {
    return () => {
      filePreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [filePreviews]);

  if (totalFileCount === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {/* New upload files */}
      {filePreviews.map(({ url }, index) => (
        <div key={`new-${index}`} className="relative group">
          <img
            src={url}
            alt={`Upload ${index + 1}`}
            className="w-full h-32 object-cover rounded-md"
          />
          <Button
            variant="ghost"
            size="sm"
            onPress={() => onRemoveFile(index)}
            className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label={t`Remove image ${index + 1}`}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ))}
      {/* Drive files */}
      {driveFiles.map((file) => (
        <div key={`drive-${file.id}`} className="relative group">
          <img
            src={getProxiedImageUrl(file.thumbnailUrl || file.url) || ""}
            alt={file.name}
            className="w-full h-32 object-cover rounded-md"
          />
          {/* Drive badge */}
          <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-primary-500/80 rounded text-[10px] text-white font-medium flex items-center gap-0.5">
            <HardDrive className="w-3 h-3" />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onPress={() => onRemoveDriveFile(file.id)}
            className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label={t`Remove ${file.name}`}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}
