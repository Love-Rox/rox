/**
 * Plugin Slot Component
 *
 * Renders plugin components at designated slot locations.
 * Handles error boundaries and empty state gracefully.
 *
 * @module lib/plugins/PluginSlot
 */

"use client";

import React, { Component, Suspense, useSyncExternalStore, type ReactNode } from "react";
import type { SlotName } from "./slots";
import type { SlotProps } from "./types";
import { getPluginRegistry } from "./registry";

/**
 * Error boundary for plugin components
 */
class PluginErrorBoundary extends Component<
  { pluginId: string; children: ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { pluginId: string; children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(
      `Plugin ${this.props.pluginId} error:`,
      error,
      errorInfo.componentStack,
    );
  }

  render() {
    if (this.state.hasError) {
      // Render nothing on error - don't break the UI
      return null;
    }
    return this.props.children;
  }
}

/**
 * Loading fallback for plugin components
 */
function PluginLoading() {
  return null; // Silent loading - don't show loading indicators for plugins
}

/**
 * Props for PluginSlot component
 */
interface PluginSlotProps<T extends SlotName> {
  /** Slot name to render */
  name: T;
  /** Props to pass to slot components */
  props: Omit<SlotProps<T>, "pluginId">;
  /** Wrapper element for each plugin component */
  wrapper?: "div" | "span" | "fragment";
  /** CSS class for wrapper */
  className?: string;
  /** Render when no plugins registered for slot */
  fallback?: ReactNode;
}

/**
 * Plugin Slot Component
 *
 * Renders all plugin components registered for a specific slot.
 * Each plugin component is wrapped in an error boundary.
 *
 * @example
 * ```tsx
 * // In NoteCard component
 * <PluginSlot
 *   name="note:footer"
 *   props={{ noteId, authorId, text, cw, visibility }}
 * />
 *
 * // With wrapper and fallback
 * <PluginSlot
 *   name="note:actions"
 *   props={{ noteId, authorId, text, cw, visibility }}
 *   wrapper="div"
 *   className="flex gap-2"
 *   fallback={null}
 * />
 * ```
 */
export function PluginSlot<T extends SlotName>({
  name,
  props,
  wrapper = "fragment",
  className,
  fallback = null,
}: PluginSlotProps<T>) {
  // Subscribe to registry changes
  const registry = getPluginRegistry();
  const components = useSyncExternalStore(
    (callback) => registry.subscribe(callback),
    () => registry.getSlotComponents(name),
    () => [], // Server snapshot - return empty array
  );

  // No components registered
  if (components.length === 0) {
    return <>{fallback}</>;
  }

  // Render all plugin components
  // Note: Using type assertion for dynamic component rendering
  // TypeScript can't fully track the relationship between slot names and their props
  const rendered = components.map(({ pluginId, component }) => {
    const DynamicComponent = component as unknown as React.ComponentType<Record<string, unknown>>;
    return (
      <PluginErrorBoundary key={pluginId} pluginId={pluginId}>
        <Suspense fallback={<PluginLoading />}>
          <DynamicComponent {...props} pluginId={pluginId} />
        </Suspense>
      </PluginErrorBoundary>
    );
  });

  // Wrap based on wrapper prop
  if (wrapper === "fragment") {
    return <>{rendered}</>;
  }

  if (wrapper === "div") {
    return <div className={className}>{rendered}</div>;
  }

  if (wrapper === "span") {
    return <span className={className}>{rendered}</span>;
  }

  return <>{rendered}</>;
}

/**
 * Hook to check if a slot has any components
 *
 * @example
 * ```tsx
 * const hasFooterPlugins = useHasSlotComponents('note:footer');
 * if (hasFooterPlugins) {
 *   // Show plugin section header
 * }
 * ```
 */
export function useHasSlotComponents(name: SlotName): boolean {
  const registry = getPluginRegistry();
  return useSyncExternalStore(
    (callback) => registry.subscribe(callback),
    () => registry.hasSlotComponents(name),
    () => false, // Server snapshot
  );
}

/**
 * Hook to get all registered plugins
 */
export function usePlugins() {
  const registry = getPluginRegistry();
  return useSyncExternalStore(
    (callback) => registry.subscribe(callback),
    () => registry.getPlugins(),
    () => [], // Server snapshot
  );
}

/**
 * Hook to get plugin pages
 */
export function usePluginPages() {
  const registry = getPluginRegistry();
  return useSyncExternalStore(
    (callback) => registry.subscribe(callback),
    () => registry.getAllPages(),
    () => [], // Server snapshot
  );
}
