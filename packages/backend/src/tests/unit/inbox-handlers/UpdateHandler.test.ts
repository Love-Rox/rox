/**
 * UpdateHandler Unit Tests
 *
 * Tests the Update activity handler including:
 * - Remote profile updates
 * - Rejection of updates targeting local users / other actors
 * - Note edit ownership checks
 */

import { describe, test, expect, beforeEach, mock } from "bun:test";
import { UpdateHandler } from "../../../services/ap/inbox/handlers/UpdateHandler";
import type { Activity, HandlerContext } from "../../../services/ap/inbox/types";
import type { Context } from "hono";

describe("UpdateHandler", () => {
  let handler: UpdateHandler;
  let mockContext: HandlerContext;
  let mockUserRepository: any;
  let mockNoteRepository: any;
  let mockRemoteActorService: any;
  let resolvedActor: { id: string; username: string; host: string | null };

  const actorUri = "https://remote.example.com/users/remoteuser";

  beforeEach(() => {
    handler = new UpdateHandler();
    resolvedActor = { id: "remote-user-456", username: "remoteuser", host: "remote.example.com" };

    mockUserRepository = {
      update: mock(() => Promise.resolve()),
    };
    mockNoteRepository = {
      findByUri: mock(() =>
        Promise.resolve({
          id: "note-1",
          userId: "remote-user-456",
          uri: "https://remote.example.com/notes/1",
        }),
      ),
      update: mock(() => Promise.resolve()),
    };
    mockRemoteActorService = {
      resolveActor: mock(() => Promise.resolve(resolvedActor)),
    };

    const contextMap = new Map<string, any>();
    contextMap.set("userRepository", mockUserRepository);
    contextMap.set("noteRepository", mockNoteRepository);
    contextMap.set("remoteActorService", mockRemoteActorService);

    mockContext = {
      c: { get: (key: string) => contextMap.get(key) } as Context,
      recipientId: null,
      baseUrl: "http://localhost:3000",
    };
  });

  test("should update the actor's own remote profile", async () => {
    const activity: Activity = {
      type: "Update",
      id: `${actorUri}#updates/1`,
      actor: actorUri,
      object: { type: "Person", id: actorUri, name: "New Name" },
    };

    const result = await handler.handle(activity, mockContext);

    expect(result.success).toBe(true);
    expect(mockUserRepository.update).toHaveBeenCalledWith("remote-user-456", {
      name: "New Name",
    });
  });

  test("should reject Update of a local user", async () => {
    resolvedActor = { id: "local-user-1", username: "alice", host: null };
    const localUri = "http://localhost:3000/users/alice";

    const activity: Activity = {
      type: "Update",
      id: `${localUri}#updates/1`,
      actor: localUri,
      object: { type: "Person", id: localUri, name: "pwned" },
    };

    const result = await handler.handle(activity, mockContext);

    expect(result.success).toBe(false);
    expect(mockUserRepository.update).not.toHaveBeenCalled();
  });

  test("should reject Update of another actor", async () => {
    const activity: Activity = {
      type: "Update",
      id: `${actorUri}#updates/1`,
      actor: actorUri,
      object: { type: "Person", id: "https://remote.example.com/users/other", name: "x" },
    };

    const result = await handler.handle(activity, mockContext);

    expect(result.success).toBe(false);
    expect(mockUserRepository.update).not.toHaveBeenCalled();
  });

  test("should reject Note update by a non-owner", async () => {
    mockNoteRepository.findByUri = mock(() =>
      Promise.resolve({ id: "note-1", userId: "someone-else", uri: "https://x/notes/1" }),
    );

    const activity: Activity = {
      type: "Update",
      id: `${actorUri}#updates/2`,
      actor: actorUri,
      object: { type: "Note", id: "https://remote.example.com/notes/1", content: "edited" },
    };

    const result = await handler.handle(activity, mockContext);

    expect(result.success).toBe(false);
    expect(mockNoteRepository.update).not.toHaveBeenCalled();
  });

  test("should reject Note update when the actor resolves to a local user", async () => {
    resolvedActor = { id: "remote-user-456", username: "alice", host: null };

    const activity: Activity = {
      type: "Update",
      id: `${actorUri}#updates/3`,
      actor: actorUri,
      object: { type: "Note", id: "http://localhost:3000/notes/1", content: "edited" },
    };

    const result = await handler.handle(activity, mockContext);

    expect(result.success).toBe(false);
    expect(mockNoteRepository.update).not.toHaveBeenCalled();
  });
});
