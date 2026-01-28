/**
 * Event Bus for Plugin System
 *
 * Provides a typed event emitter for plugin hooks. Supports both
 * synchronous and asynchronous event handlers with proper error handling.
 *
 * @module lib/events
 */

import type { PluginEvents, PluginEventPayload } from "../plugins/types.js";
import { logger } from "./logger.js";

/**
 * Event handler function type
 */
export type EventHandler<T> = (payload: T) => void | Promise<void>;

/**
 * Before event handler that can cancel or modify the operation
 */
export type BeforeEventHandler<T> = (
  payload: T
) => BeforeEventResult<T> | Promise<BeforeEventResult<T>>;

/**
 * Result from a before event handler
 */
export interface BeforeEventResult<T> {
  /** Whether to cancel the operation */
  cancelled?: boolean;
  /** Reason for cancellation (for logging) */
  cancelReason?: string;
  /** Modified payload to use instead */
  modifiedPayload?: T;
}

/**
 * Internal handler storage
 */
interface HandlerEntry<T> {
  handler: EventHandler<T> | BeforeEventHandler<T>;
  pluginId: string;
  priority: number;
}

/**
 * EventBus - Central event management for the plugin system
 *
 * Features:
 * - Type-safe event emission and subscription
 * - Support for "before" events that can cancel/modify operations
 * - Priority-based handler execution
 * - Error isolation (one handler failure doesn't affect others)
 * - Plugin-scoped handler management
 *
 * @example
 * ```typescript
 * const eventBus = new EventBus();
 *
 * // Subscribe to an event
 * eventBus.on('note:afterCreate', (payload) => {
 *   console.log('Note created:', payload.note.id);
 * }, 'my-plugin');
 *
 * // Emit an event
 * await eventBus.emit('note:afterCreate', { note, author });
 *
 * // Before events can cancel operations
 * eventBus.onBefore('note:beforeCreate', async (payload) => {
 *   if (containsSpam(payload.text)) {
 *     return { cancelled: true, cancelReason: 'Spam detected' };
 *   }
 *   return {};
 * }, 'spam-filter-plugin');
 * ```
 */
export class EventBus {
  private handlers: Map<string, HandlerEntry<unknown>[]>;
  private beforeHandlers: Map<string, HandlerEntry<unknown>[]>;

  constructor() {
    this.handlers = new Map();
    this.beforeHandlers = new Map();
  }

  /**
   * Subscribe to an event
   *
   * @param event - Event name to subscribe to
   * @param handler - Handler function to call when event is emitted
   * @param pluginId - ID of the plugin registering this handler
   * @param priority - Handler priority (higher = runs first, default: 0)
   */
  on<K extends keyof PluginEvents>(
    event: K,
    handler: EventHandler<PluginEventPayload<K>>,
    pluginId: string,
    priority = 0
  ): void {
    const handlers = this.handlers.get(event) || [];
    handlers.push({
      handler: handler as EventHandler<unknown>,
      pluginId,
      priority,
    });
    // Sort by priority (descending)
    handlers.sort((a, b) => b.priority - a.priority);
    this.handlers.set(event, handlers);

    logger.debug(`[EventBus] Handler registered for ${event} by ${pluginId}`);
  }

  /**
   * Subscribe to a "before" event that can cancel or modify operations
   *
   * @param event - Before event name (e.g., 'note:beforeCreate')
   * @param handler - Handler that returns cancellation/modification result
   * @param pluginId - ID of the plugin registering this handler
   * @param priority - Handler priority (higher = runs first, default: 0)
   */
  onBefore<K extends keyof PluginEvents>(
    event: K,
    handler: BeforeEventHandler<PluginEventPayload<K>>,
    pluginId: string,
    priority = 0
  ): void {
    const handlers = this.beforeHandlers.get(event) || [];
    handlers.push({
      handler: handler as BeforeEventHandler<unknown>,
      pluginId,
      priority,
    });
    handlers.sort((a, b) => b.priority - a.priority);
    this.beforeHandlers.set(event, handlers);

    logger.debug(
      `[EventBus] Before handler registered for ${event} by ${pluginId}`
    );
  }

  /**
   * Unsubscribe all handlers for a specific plugin
   *
   * @param pluginId - Plugin ID to remove handlers for
   */
  offPlugin(pluginId: string): void {
    for (const [event, handlers] of this.handlers.entries()) {
      const filtered = handlers.filter((h) => h.pluginId !== pluginId);
      if (filtered.length === 0) {
        this.handlers.delete(event);
      } else {
        this.handlers.set(event, filtered);
      }
    }

    for (const [event, handlers] of this.beforeHandlers.entries()) {
      const filtered = handlers.filter((h) => h.pluginId !== pluginId);
      if (filtered.length === 0) {
        this.beforeHandlers.delete(event);
      } else {
        this.beforeHandlers.set(event, filtered);
      }
    }

    logger.debug(`[EventBus] All handlers removed for plugin ${pluginId}`);
  }

  /**
   * Emit an event to all subscribed handlers
   *
   * Handlers are executed in priority order. Errors in one handler
   * don't prevent other handlers from running.
   *
   * @param event - Event name to emit
   * @param payload - Event payload
   */
  async emit<K extends keyof PluginEvents>(
    event: K,
    payload: PluginEventPayload<K>
  ): Promise<void> {
    const handlers = this.handlers.get(event);
    if (!handlers || handlers.length === 0) {
      return;
    }

    for (const entry of handlers) {
      try {
        await entry.handler(payload);
      } catch (error) {
        logger.error(
          { err: error, event, pluginId: entry.pluginId },
          `[EventBus] Error in handler for ${event} (plugin: ${entry.pluginId})`
        );
      }
    }
  }

  /**
   * Emit a "before" event and collect cancellation/modification results
   *
   * Handlers are executed in priority order. If any handler cancels,
   * the operation should be aborted.
   *
   * @param event - Before event name
   * @param payload - Event payload
   * @returns Combined result from all handlers. When handlers exist:
   *   - If cancelled: `{ cancelled: true, cancelReason?: string }`
   *   - If not cancelled: `{ modifiedPayload: T }` (always includes payload, even if unchanged)
   *   - If no handlers: `{}` (empty object)
   *
   * @remarks
   * If a handler throws an error, it is logged but processing continues.
   * This means security-critical plugins should handle their own errors
   * and return `{ cancelled: true }` explicitly rather than throwing.
   */
  async emitBefore<K extends keyof PluginEvents>(
    event: K,
    payload: PluginEventPayload<K>
  ): Promise<BeforeEventResult<PluginEventPayload<K>>> {
    const handlers = this.beforeHandlers.get(event);
    if (!handlers || handlers.length === 0) {
      return {};
    }

    let currentPayload = payload;

    for (const entry of handlers) {
      try {
        const handler = entry.handler as BeforeEventHandler<
          PluginEventPayload<K>
        >;
        const result = await handler(currentPayload);

        if (result.cancelled) {
          logger.info(
            `[EventBus] Event ${event} cancelled by ${entry.pluginId}: ${result.cancelReason || "No reason provided"}`
          );
          return {
            cancelled: true,
            cancelReason: result.cancelReason,
          };
        }

        if (result.modifiedPayload) {
          currentPayload = result.modifiedPayload;
        }
      } catch (error) {
        logger.error(
          { err: error, event, pluginId: entry.pluginId },
          `[EventBus] Error in before handler for ${event} (plugin: ${entry.pluginId})`
        );
      }
    }

    return { modifiedPayload: currentPayload };
  }

  /**
   * Check if any handlers are registered for an event
   */
  hasHandlers(event: keyof PluginEvents): boolean {
    const handlers = this.handlers.get(event);
    const beforeHandlers = this.beforeHandlers.get(event);
    return (
      (handlers !== undefined && handlers.length > 0) ||
      (beforeHandlers !== undefined && beforeHandlers.length > 0)
    );
  }

  /**
   * Get count of registered handlers for an event
   */
  getHandlerCount(event: keyof PluginEvents): number {
    const handlers = this.handlers.get(event) || [];
    const beforeHandlers = this.beforeHandlers.get(event) || [];
    return handlers.length + beforeHandlers.length;
  }

  /**
   * Get all registered events
   */
  getRegisteredEvents(): string[] {
    const events = new Set<string>();
    for (const event of this.handlers.keys()) {
      events.add(event);
    }
    for (const event of this.beforeHandlers.keys()) {
      events.add(event);
    }
    return Array.from(events);
  }

  /**
   * Clear all handlers (mainly for testing)
   */
  clear(): void {
    this.handlers.clear();
    this.beforeHandlers.clear();
  }
}

/**
 * Global EventBus instance
 */
export const eventBus = new EventBus();
