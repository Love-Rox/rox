"use client";

/**
 * Timeline Stream Hook for real-time timeline updates
 *
 * Provides SSE-based real-time updates for timelines.
 * Uses a singleton pattern for SSE connection per timeline type.
 */

import { useEffect, useCallback, useRef } from "react";
import { useAtom, useAtomValue } from "jotai";
import { tokenAtom, isAuthenticatedAtom } from "../lib/atoms/auth";
import { timelineNotesAtom } from "../lib/atoms/timeline";
import type { Note } from "../lib/types/note";

/**
 * Timeline type
 */
export type TimelineType = "home" | "local" | "social";

/**
 * SSE connection state atom per timeline type
 */
import { atom } from "jotai";
export const timelineStreamConnectedAtom = atom<Record<TimelineType, boolean>>({
  home: false,
  local: false,
  social: false,
});

// --- Singleton SSE Connection Manager per Timeline ---

interface TimelineSSEConnection {
  eventSource: EventSource | null;
  reconnectTimeout: ReturnType<typeof setTimeout> | null;
  connectionCount: number;
}

const timelineConnections: Record<TimelineType, TimelineSSEConnection> = {
  home: { eventSource: null, reconnectTimeout: null, connectionCount: 0 },
  local: { eventSource: null, reconnectTimeout: null, connectionCount: 0 },
  social: { eventSource: null, reconnectTimeout: null, connectionCount: 0 },
};

/**
 * Get SSE endpoint URL for timeline type
 */
function getTimelineStreamUrl(timelineType: TimelineType, token: string | null): string {
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  switch (timelineType) {
    case "home":
      return `${baseUrl}/api/notes/timeline/stream?token=${encodeURIComponent(token || "")}`;
    case "local":
      return `${baseUrl}/api/notes/local-timeline/stream`;
    case "social":
      return token
        ? `${baseUrl}/api/notes/social-timeline/stream?token=${encodeURIComponent(token)}`
        : `${baseUrl}/api/notes/social-timeline/stream`;
    default:
      return `${baseUrl}/api/notes/local-timeline/stream`;
  }
}

/**
 * Connect to timeline SSE stream (singleton per timeline type)
 */
function connectTimelineSSE(
  timelineType: TimelineType,
  token: string | null,
  onNote: (note: Note) => void,
  onNoteDeleted: (noteId: string) => void,
  setConnected: (connected: boolean) => void,
) {
  const connection = timelineConnections[timelineType];

  // Already connected
  if (connection.eventSource) return;

  // Clear any pending reconnect
  if (connection.reconnectTimeout) {
    clearTimeout(connection.reconnectTimeout);
    connection.reconnectTimeout = null;
  }

  const url = getTimelineStreamUrl(timelineType, token);
  const eventSource = new EventSource(url);
  connection.eventSource = eventSource;

  eventSource.addEventListener("connected", () => {
    console.log(`Timeline SSE connected: ${timelineType}`);
    setConnected(true);
  });

  eventSource.addEventListener("note", (event) => {
    try {
      const note = JSON.parse(event.data) as Note;
      onNote(note);
    } catch (error) {
      console.error("Failed to parse note event:", error);
    }
  });

  eventSource.addEventListener("noteDeleted", (event) => {
    try {
      const { noteId } = JSON.parse(event.data);
      onNoteDeleted(noteId);
    } catch (error) {
      console.error("Failed to parse noteDeleted event:", error);
    }
  });

  eventSource.addEventListener("heartbeat", () => {
    // Heartbeat received, connection is alive
  });

  eventSource.onerror = () => {
    console.warn(`Timeline SSE connection error (${timelineType}), reconnecting...`);
    setConnected(false);
    eventSource.close();
    connection.eventSource = null;

    // Reconnect after delay (only if there are still subscribers)
    if (connection.connectionCount > 0) {
      connection.reconnectTimeout = setTimeout(() => {
        connectTimelineSSE(timelineType, token, onNote, onNoteDeleted, setConnected);
      }, 5000);
    }
  };
}

/**
 * Disconnect timeline SSE stream (singleton)
 */
function disconnectTimelineSSE(
  timelineType: TimelineType,
  setConnected: (connected: boolean) => void,
  force = false,
) {
  const connection = timelineConnections[timelineType];

  if (force || connection.connectionCount <= 0) {
    if (connection.reconnectTimeout) {
      clearTimeout(connection.reconnectTimeout);
      connection.reconnectTimeout = null;
    }

    if (connection.eventSource) {
      connection.eventSource.close();
      connection.eventSource = null;
      setConnected(false);
    }
  }
}

/**
 * Hook to subscribe to real-time timeline updates
 *
 * @param timelineType - Type of timeline to subscribe to
 * @param enabled - Whether to enable the stream (default: true)
 *
 * @example
 * ```tsx
 * // In a timeline component
 * const { connected } = useTimelineStream("home");
 *
 * // For local timeline (no auth required)
 * const { connected } = useTimelineStream("local");
 * ```
 */
export function useTimelineStream(timelineType: TimelineType, enabled = true) {
  const setNotes = useAtom(timelineNotesAtom)[1];
  const [connectionState, setConnectionState] = useAtom(timelineStreamConnectedAtom);
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);
  const token = useAtomValue(tokenAtom);

  // Track if this is the active timeline type
  const isActiveRef = useRef(false);

  /**
   * Set connected state for this timeline type
   */
  const setConnected = useCallback(
    (connected: boolean) => {
      setConnectionState((prev) => ({
        ...prev,
        [timelineType]: connected,
      }));
    },
    [timelineType, setConnectionState],
  );

  /**
   * Handle new note from stream
   */
  const handleNote = useCallback(
    (note: Note) => {
      // Only update if this is the active timeline
      if (!isActiveRef.current) return;

      // Add new note at the beginning, avoiding duplicates
      setNotes((prev) => {
        if (prev.some((n) => n.id === note.id)) {
          return prev;
        }
        return [note, ...prev];
      });
    },
    [setNotes],
  );

  /**
   * Handle note deletion from stream
   */
  const handleNoteDeleted = useCallback(
    (noteId: string) => {
      if (!isActiveRef.current) return;

      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    },
    [setNotes],
  );

  /**
   * Connect to stream
   */
  const connect = useCallback(() => {
    // Home timeline requires authentication
    if (timelineType === "home" && !isAuthenticated) return;

    connectTimelineSSE(timelineType, token, handleNote, handleNoteDeleted, setConnected);
  }, [timelineType, isAuthenticated, token, handleNote, handleNoteDeleted, setConnected]);

  /**
   * Disconnect from stream
   */
  const disconnect = useCallback(() => {
    disconnectTimelineSSE(timelineType, setConnected);
  }, [timelineType, setConnected]);

  // Manage SSE connection lifecycle
  useEffect(() => {
    if (!enabled) return;

    // Home timeline requires authentication
    if (timelineType === "home" && !isAuthenticated) return;

    isActiveRef.current = true;
    const connection = timelineConnections[timelineType];
    connection.connectionCount++;

    // Connect on first subscriber
    if (connection.connectionCount === 1) {
      connect();
    }

    return () => {
      isActiveRef.current = false;
      connection.connectionCount--;

      // Disconnect when last subscriber unmounts
      if (connection.connectionCount <= 0) {
        connection.connectionCount = 0;
        disconnectTimelineSSE(timelineType, setConnected, true);
      }
    };
  }, [enabled, timelineType, isAuthenticated, connect, setConnected]);

  // Handle auth state changes
  useEffect(() => {
    if (timelineType === "home" && !isAuthenticated) {
      const connection = timelineConnections[timelineType];
      connection.connectionCount = 0;
      disconnectTimelineSSE(timelineType, setConnected, true);
    }
  }, [timelineType, isAuthenticated, setConnected]);

  return {
    connected: connectionState[timelineType],
    connect,
    disconnect,
  };
}

/**
 * Hook to get timeline stream connection status
 */
export function useTimelineStreamStatus(timelineType: TimelineType) {
  const connectionState = useAtomValue(timelineStreamConnectedAtom);
  return connectionState[timelineType];
}
