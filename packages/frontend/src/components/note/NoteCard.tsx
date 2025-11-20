'use client';

import { useState } from 'react';
import type { Note, NoteFile } from '../../lib/types/note';
import { Trans } from '@lingui/react/macro';
import { Card, CardContent } from '../ui/Card';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { notesApi } from '../../lib/api/notes';

/**
 * Props for the NoteCard component
 */
export interface NoteCardProps {
  /** Note data to display */
  note: Note;
  /** Optional callback when note is deleted */
  onDelete?: () => void;
}

/**
 * NoteCard component for displaying a single note/post
 * Shows user info, content, attachments, and interaction buttons
 *
 * @param note - Note data to display
 * @param onDelete - Callback when note is deleted
 */
export function NoteCard({ note, onDelete: _onDelete }: NoteCardProps) {
  const [showCw, setShowCw] = useState(false);
  const [isReacting, setIsReacting] = useState(false);

  const handleReaction = async (reaction: string) => {
    if (isReacting) return;
    setIsReacting(true);

    try {
      await notesApi.createReaction(note.id, reaction);
      // TODO: Update local state or refetch
    } catch (error) {
      console.error('Failed to react:', error);
    } finally {
      setIsReacting(false);
    }
  };

  const handleRenote = async () => {
    try {
      await notesApi.renote(note.id);
      // TODO: Show success message
    } catch (error) {
      console.error('Failed to renote:', error);
    }
  };

  // Get user initials for avatar fallback
  const userInitials = note.user.name
    ? note.user.name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : note.user.username.slice(0, 2).toUpperCase();

  return (
    <Card hover className="transition-all">
      <CardContent className="p-4">
        {/* User Info */}
        <div className="mb-3 flex items-start gap-3">
          <Avatar
            src={note.user.avatarUrl}
            alt={note.user.name || note.user.username}
            fallback={userInitials}
            size="md"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900 truncate">
                {note.user.name || note.user.username}
              </span>
              <span className="text-sm text-gray-500 truncate">
                @{note.user.username}
              </span>
            </div>
            <div className="text-xs text-gray-500">
              {new Date(note.createdAt).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Renote Indicator */}
        {note.renote && (
          <div className="mb-2 text-sm text-gray-600">
            <Trans>Renoted</Trans>
          </div>
        )}

        {/* Content Warning */}
        {note.cw && !showCw && (
          <div className="mb-3">
            <div className="rounded-md bg-yellow-50 p-3">
              <div className="text-sm font-medium text-yellow-800">
                <Trans>Content Warning</Trans>: {note.cw}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onPress={() => setShowCw(true)}
                className="mt-2"
              >
                <Trans>Show content</Trans>
              </Button>
            </div>
          </div>
        )}

        {/* Note Content */}
        {(!note.cw || showCw) && (
          <>
            {/* Text */}
            {note.text && (
              <div className="mb-3 whitespace-pre-wrap wrap-break-word text-gray-900">
                {note.text}
              </div>
            )}

            {/* Attachments */}
            {note.files && note.files.length > 0 && (
              <div className={`mb-3 grid gap-2 ${
                note.files.length === 1
                  ? 'grid-cols-1'
                  : note.files.length === 2
                  ? 'grid-cols-2'
                  : note.files.length === 3
                  ? 'grid-cols-3'
                  : 'grid-cols-2'
              }`}>
                {note.files.map((file: NoteFile) => (
                  <div key={file.id} className="relative overflow-hidden rounded-lg">
                    <img
                      src={file.thumbnailUrl || file.url}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Renoted Note */}
            {note.renote && (
              <div className="mb-3 rounded-lg border border-gray-200 p-3">
                <div className="mb-2 flex items-center gap-2">
                  <Avatar
                    src={note.renote.user.avatarUrl}
                    alt={note.renote.user.name || note.renote.user.username}
                    size="sm"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    {note.renote.user.name || note.renote.user.username}
                  </span>
                  <span className="text-xs text-gray-500">
                    @{note.renote.user.username}
                  </span>
                </div>
                {note.renote.text && (
                  <div className="text-sm text-gray-700 whitespace-pre-wrap wrap-break-word">
                    {note.renote.text}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Interaction Buttons */}
        <div className="flex items-center gap-4 border-t border-gray-100 pt-3">
          <Button variant="ghost" size="sm" className="text-gray-600 hover:text-primary-600">
            💬 {note.repliesCount || 0}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onPress={handleRenote}
            className="text-gray-600 hover:text-green-600"
          >
            🔁 {note.renoteCount || 0}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onPress={() => handleReaction('❤️')}
            isDisabled={isReacting}
            className="text-gray-600 hover:text-red-600"
          >
            ❤️ {note.reactions ? Object.keys(note.reactions).length : 0}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
