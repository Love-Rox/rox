"use client";

import { useCallback, useRef, useEffect } from "react";
import { useAtom, useAtomValue } from "jotai";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Trans } from "@lingui/react/macro";
import { mobileActiveColumnIndexAtom } from "../../lib/atoms/deck";
import { currentUserAtom } from "../../lib/atoms/auth";
import { useDeckProfiles } from "../../hooks/useDeckProfiles";
import { sidebarCollapsedAtom } from "../../lib/atoms/sidebar";
import { Sidebar } from "../layout/Sidebar";
import { MobileAppBar } from "../layout/MobileAppBar";
import { ComposeModal } from "../note/ComposeModal";
import { useUISettings } from "../../lib/hooks/useUISettings";
import { DeckColumn } from "./DeckColumn";
import { AddColumnButton } from "./AddColumnButton";
import { DeckProfileSwitcher } from "./DeckProfileSwitcher";
import type { DeckColumnWidth } from "../../lib/types/deck";

/**
 * Props for the DeckLayout component
 */
export interface DeckLayoutProps {
  /** Whether to show the add column button */
  showAddColumn?: boolean;
  /** Whether to show the profile switcher */
  showProfileSwitcher?: boolean;
}

/**
 * Get Tailwind width class for column width setting
 */
function getColumnWidthClass(width: DeckColumnWidth): string {
  switch (width) {
    case "narrow":
      return "w-80";
    case "wide":
      return "w-[480px]";
    default:
      return "w-96";
  }
}

/**
 * Main deck layout component
 *
 * Displays multiple columns side-by-side with horizontal scrolling.
 * Supports drag-and-drop reordering and mobile swipe navigation.
 */
export function DeckLayout({ showAddColumn = true, showProfileSwitcher = true }: DeckLayoutProps) {
  const currentUser = useAtomValue(currentUserAtom);
  const isCollapsed = useAtomValue(sidebarCollapsedAtom);
  const { activeProfile, updateActiveColumns } = useDeckProfiles();
  const columns = activeProfile?.columns ?? [];
  const [mobileColumnIndex, setMobileColumnIndex] = useAtom(mobileActiveColumnIndexAtom);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Apply UI settings (CSS variables, theme, custom CSS)
  useUISettings();

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Handle drag end for column reordering
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        const oldIndex = columns.findIndex((col) => col.id === active.id);
        const newIndex = columns.findIndex((col) => col.id === over.id);

        // Reorder columns array
        const newColumns = [...columns];
        const [removed] = newColumns.splice(oldIndex, 1);
        if (removed) {
          newColumns.splice(newIndex, 0, removed);
          // Sync to server (optimistic update handled in hook)
          updateActiveColumns(newColumns);
        }
      }
    },
    [columns, updateActiveColumns],
  );

  // Mobile carousel: a native CSS scroll-snap track. The browser handles the
  // finger-following swipe, momentum, axis locking (vertical scroll inside a
  // column vs horizontal swipe between columns) and snapping — far smoother
  // than the previous custom touch handlers.
  const mobileScrollRef = useRef<HTMLDivElement>(null);
  const mobileScrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Update the active column index only AFTER the swipe settles. Updating React
  // state mid-scroll re-renders the deck during the gesture and makes the snap
  // stutter; debouncing to scroll-end keeps the swipe itself purely native and
  // CSS-smooth, and the (cheap) index update lands once the motion has stopped.
  const handleMobileScroll = useCallback(() => {
    if (mobileScrollTimer.current != null) clearTimeout(mobileScrollTimer.current);
    mobileScrollTimer.current = setTimeout(() => {
      mobileScrollTimer.current = null;
      const el = mobileScrollRef.current;
      if (!el || el.clientWidth === 0) return;
      const index = Math.round(el.scrollLeft / el.clientWidth);
      if (index >= 0 && index < columns.length && index !== mobileColumnIndex) {
        setMobileColumnIndex(index);
      }
    }, 140);
  }, [columns.length, mobileColumnIndex, setMobileColumnIndex]);

  // Clear any pending scroll-settle timer on unmount.
  useEffect(() => {
    return () => {
      if (mobileScrollTimer.current != null) clearTimeout(mobileScrollTimer.current);
    };
  }, []);

  // Smoothly scroll the carousel to a column (used by the indicator dots).
  const scrollToColumn = useCallback((index: number) => {
    const el = mobileScrollRef.current;
    if (!el) return;
    el.scrollTo({ left: index * el.clientWidth, behavior: "smooth" });
  }, []);

  // Ensure mobile index stays within bounds when columns change
  useEffect(() => {
    if (columns.length > 0 && mobileColumnIndex >= columns.length) {
      setMobileColumnIndex(columns.length - 1);
    }
  }, [columns.length, mobileColumnIndex, setMobileColumnIndex]);

  // Reset scroll position to start when the profile changes or on initial load.
  // Instant (no smooth) so the carousel does not visibly slide on appear.
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = 0;
    }
    if (mobileScrollRef.current) {
      mobileScrollRef.current.scrollLeft = 0;
    }
    setMobileColumnIndex(0);
  }, [activeProfile?.id, setMobileColumnIndex]);

  // Sidebar margin for desktop
  const sidebarMarginClass = currentUser ? (isCollapsed ? "lg:ml-16" : "lg:ml-64") : "";

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <p className="text-(--text-muted)">
          <Trans>Please log in to use the deck.</Trans>
        </p>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-100 dark:bg-gray-950 transition-colors overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Deck Area */}
      <main
        className={`h-screen flex flex-col transition-all duration-300 ${sidebarMarginClass} pt-mobile-header lg:pt-0`}
      >
        {/* Deck Header - Profile Switcher (Responsive) */}
        {showProfileSwitcher && (
          <div className="shrink-0 sticky top-0 z-20 bg-gray-100 dark:bg-gray-950 border-b border-(--border-color) px-2 py-1.5 lg:px-4 lg:py-2">
            <DeckProfileSwitcher />
          </div>
        )}

        {/* Desktop: Horizontal scrolling columns */}
        {/* Uses flex-1 to fill remaining space, min-h-0 prevents flex item from overflowing */}
        <div className="hidden lg:block flex-1 min-h-0 overflow-hidden">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={columns.map((col) => col.id)}
              strategy={horizontalListSortingStrategy}
            >
              {/*
                NOTE: do not add `scroll-smooth` here. With smooth scroll
                behavior, the programmatic `scrollLeft = 0` reset (and the
                snap-mandatory layout settling) on mount/profile change is
                animated, which makes the deck visibly slide to the right for a
                moment on appear. Horizontal deck scrolling is intentionally
                instant.
              */}
              <div
                ref={scrollContainerRef}
                className="flex h-full overflow-x-auto overflow-y-hidden snap-x snap-mandatory gap-1 p-2"
                style={{ scrollbarWidth: "thin" }}
              >
                {columns.map((column) => (
                  <div
                    key={column.id}
                    className={`shrink-0 h-full ${getColumnWidthClass(column.width)} snap-start`}
                  >
                    <DeckColumn column={column} />
                  </div>
                ))}

                {/* Add Column Button */}
                {showAddColumn && (
                  <div className="shrink-0 w-16 snap-start flex items-center justify-center">
                    <AddColumnButton />
                  </div>
                )}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        {/* Mobile: native scroll-snap carousel (one column per screen).
            The browser handles finger-following swipe, momentum and snapping;
            overscroll-x-contain prevents the horizontal swipe from triggering
            the browser's back/forward navigation. */}
        <div
          className="lg:hidden flex-1 min-h-0"
          style={{
            // Subtract the mobile app bar height (3.5rem + safe-area)
            marginBottom: "calc(3.5rem + env(safe-area-inset-bottom, 0px))",
          }}
        >
          {columns.length > 0 ? (
            <div
              ref={mobileScrollRef}
              onScroll={handleMobileScroll}
              className="flex h-full overflow-x-auto overflow-y-hidden snap-x snap-mandatory overscroll-x-contain"
              style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
            >
              {columns.map((column) => (
                <div key={column.id} className="w-full shrink-0 snap-start snap-always h-full">
                  <DeckColumn column={column} isMobile />
                </div>
              ))}
            </div>
          ) : (
            /* Empty state when no columns */
            <div className="h-full flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 p-4">
              <div className="text-4xl mb-4">📊</div>
              <p className="text-center mb-4">
                <Trans>No columns yet. Add your first column to get started.</Trans>
              </p>
              <AddColumnButton />
            </div>
          )}

          {/* Mobile Column Indicators - positioned above AppBar (h-14 = 3.5rem)
              z-30 ensures indicators are below mobile header (z-40) and sidebar (z-50) */}
          {columns.length > 1 && (
            <div
              className="fixed left-0 right-0 flex justify-center gap-2 pb-2 z-30"
              style={{ bottom: "calc(3.5rem + env(safe-area-inset-bottom, 0px) + 0.5rem)" }}
            >
              {columns.map((col, index) => (
                <button
                  key={col.id}
                  onClick={() => scrollToColumn(index)}
                  className={`w-2.5 h-2.5 rounded-full transition-all duration-200 ${
                    index === mobileColumnIndex
                      ? "bg-(--accent-color) scale-110"
                      : "bg-gray-400 dark:bg-gray-600 hover:bg-gray-500 dark:hover:bg-gray-500"
                  }`}
                  aria-label={`Go to column ${index + 1}`}
                />
              ))}
            </div>
          )}

          {/* Swipe hint for first-time users - positioned above indicators
              z-30 ensures hint is below mobile header (z-40) and sidebar (z-50) */}
          {columns.length > 1 && mobileColumnIndex === 0 && (
            <div
              className="fixed left-0 right-0 flex justify-center pointer-events-none z-30"
              style={{ bottom: "calc(3.5rem + env(safe-area-inset-bottom, 0px) + 2rem)" }}
            >
              <div className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                <span>←</span>
                <Trans>Swipe to navigate</Trans>
                <span>→</span>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileAppBar />

      {/* Compose Modal */}
      <ComposeModal />
    </div>
  );
}
