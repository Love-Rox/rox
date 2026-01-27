/**
 * EventBus Unit Tests
 *
 * Tests the EventBus class for plugin event management.
 *
 * @module tests/unit/EventBus.test
 */

import { describe, it, expect, beforeEach, mock } from "bun:test";
import { EventBus } from "../../lib/events.js";
import {
  createTestPluginUser,
  createTestPluginNote,
  createNoteBeforeCreatePayload,
  createNoteAfterCreatePayload,
} from "../helpers/pluginTestHelpers.js";

describe("EventBus", () => {
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
  });

  describe("on() and emit()", () => {
    it("should call handler when event is emitted", async () => {
      const handler = mock(() => {});

      eventBus.on("note:afterCreate", handler, "test-plugin");

      await eventBus.emit("note:afterCreate", createNoteAfterCreatePayload({
        note: createTestPluginNote({ id: "note1", text: "Hello" }),
        author: createTestPluginUser({ id: "user1", username: "alice", displayName: "Alice" }),
      }));

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it("should call handlers in priority order", async () => {
      const callOrder: number[] = [];

      eventBus.on(
        "note:afterCreate",
        () => {
          callOrder.push(1);
        },
        "plugin1",
        1
      );
      eventBus.on(
        "note:afterCreate",
        () => {
          callOrder.push(3);
        },
        "plugin3",
        3
      );
      eventBus.on(
        "note:afterCreate",
        () => {
          callOrder.push(2);
        },
        "plugin2",
        2
      );

      await eventBus.emit("note:afterCreate", createNoteAfterCreatePayload());

      expect(callOrder).toEqual([3, 2, 1]); // Higher priority first
    });

    it("should continue calling handlers even if one throws", async () => {
      const handler1 = mock(() => {
        throw new Error("Test error");
      });
      const handler2 = mock(() => {});

      eventBus.on("note:afterCreate", handler1, "plugin1", 2);
      eventBus.on("note:afterCreate", handler2, "plugin2", 1);

      await eventBus.emit("note:afterCreate", createNoteAfterCreatePayload());

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });
  });

  describe("onBefore() and emitBefore()", () => {
    it("should allow cancellation of operations", async () => {
      eventBus.onBefore(
        "note:beforeCreate",
        async () => ({
          cancelled: true,
          cancelReason: "Spam detected",
        }),
        "spam-filter"
      );

      const result = await eventBus.emitBefore("note:beforeCreate", createNoteBeforeCreatePayload({
        text: "Buy now! Click here!",
        author: createTestPluginUser({ username: "spammer" }),
      }));

      expect(result.cancelled).toBe(true);
      expect(result.cancelReason).toBe("Spam detected");
    });

    it("should allow modification of payload", async () => {
      eventBus.onBefore(
        "note:beforeCreate",
        async (payload) => ({
          modifiedPayload: {
            ...payload,
            text: payload.text?.toUpperCase() || null,
          },
        }),
        "modifier-plugin"
      );

      const result = await eventBus.emitBefore("note:beforeCreate", createNoteBeforeCreatePayload({
        text: "hello world",
      }));

      expect(result.cancelled).toBeUndefined();
      expect(result.modifiedPayload?.text).toBe("HELLO WORLD");
    });

    it("should stop processing after cancellation", async () => {
      const handler2 = mock(async () => ({}));

      eventBus.onBefore(
        "note:beforeCreate",
        async () => ({
          cancelled: true,
          cancelReason: "Blocked",
        }),
        "blocker",
        2
      );
      eventBus.onBefore("note:beforeCreate", handler2, "modifier", 1);

      const result = await eventBus.emitBefore("note:beforeCreate", createNoteBeforeCreatePayload({
        text: "test",
      }));

      expect(result.cancelled).toBe(true);
      expect(handler2).not.toHaveBeenCalled();
    });
  });

  describe("offPlugin()", () => {
    it("should remove all handlers for a plugin", async () => {
      const handler1 = mock(() => {});
      const handler2 = mock(() => {});

      eventBus.on("note:afterCreate", handler1, "plugin1");
      eventBus.on("note:afterCreate", handler2, "plugin2");

      eventBus.offPlugin("plugin1");

      await eventBus.emit("note:afterCreate", createNoteAfterCreatePayload());

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledTimes(1);
    });
  });

  describe("utility methods", () => {
    it("should report hasHandlers correctly", () => {
      expect(eventBus.hasHandlers("note:afterCreate")).toBe(false);

      eventBus.on("note:afterCreate", () => {}, "plugin1");

      expect(eventBus.hasHandlers("note:afterCreate")).toBe(true);
    });

    it("should report handler count correctly", () => {
      expect(eventBus.getHandlerCount("note:afterCreate")).toBe(0);

      eventBus.on("note:afterCreate", () => {}, "plugin1");
      eventBus.onBefore("note:beforeCreate", async () => ({}), "plugin2");

      expect(eventBus.getHandlerCount("note:afterCreate")).toBe(1);
      expect(eventBus.getHandlerCount("note:beforeCreate")).toBe(1);
    });

    it("should list registered events", () => {
      eventBus.on("note:afterCreate", () => {}, "plugin1");
      eventBus.onBefore("user:beforeRegister", async () => ({}), "plugin2");

      const events = eventBus.getRegisteredEvents();

      expect(events).toContain("note:afterCreate");
      expect(events).toContain("user:beforeRegister");
    });

    it("should clear all handlers", () => {
      eventBus.on("note:afterCreate", () => {}, "plugin1");
      eventBus.onBefore("note:beforeCreate", async () => ({}), "plugin2");

      eventBus.clear();

      expect(eventBus.getRegisteredEvents()).toHaveLength(0);
    });
  });
});
