/**
 * AnnounceHandler Unit Tests
 *
 * Tests the Announce activity handler including:
 * - Renote creation
 * - Remote note fetching
 * - Error handling
 */

import { describe, test, expect, beforeEach, mock } from "bun:test";
import { AnnounceHandler } from "../../../services/ap/inbox/handlers/AnnounceHandler";
import type { Activity, HandlerContext } from "../../../services/ap/inbox/types";
import type { Context } from "hono";

// Document returned by the mocked RemoteFetchService (overridable per test)
const defaultFetchedNote = {
  type: "Note",
  id: "https://another.example.com/notes/1",
  content: "<p>Test note</p>",
  attributedTo: "https://another.example.com/users/author",
};
let fetchedNote: Record<string, unknown> = { ...defaultFetchedNote };
// Per-URL documents (take precedence over fetchedNote) and recorded fetch URLs
let fetchedDocs: Record<string, unknown> = {};
let fetchCalls: string[] = [];
let fetchedFinalUrls: Record<string, string> = {};

// Mock the RemoteFetchService
mock.module("../../../services/ap/RemoteFetchService", () => ({
  RemoteFetchService: class {
    fetchActivityPubObject = mock((url: string) => {
      fetchCalls.push(url);
      return Promise.resolve({
        success: true,
        data: fetchedDocs[url] ?? fetchedNote,
        finalUrl: fetchedFinalUrls[url] ?? url,
      });
    });
  },
}));

const renotable = { visibility: "public", localOnly: false, isDeleted: false };

describe("AnnounceHandler", () => {
  let handler: AnnounceHandler;
  let mockContext: HandlerContext;
  let mockNoteRepository: any;
  let mockRemoteNoteService: any;
  let mockRemoteActorService: any;

  const createMockHonoContext = (): Partial<Context> => {
    const contextMap = new Map<string, any>();

    mockNoteRepository = {
      findByUri: mock(() =>
        Promise.resolve({
          id: "note-123",
          uri: "http://localhost:3000/notes/note-123",
          text: "Original note",
          ...renotable,
        }),
      ),
      create: mock(() => Promise.resolve({ id: "renote-456" })),
      incrementRenoteCount: mock(() => Promise.resolve()),
    };

    mockRemoteNoteService = {
      processNote: mock(() =>
        Promise.resolve({
          id: "remote-note-789",
          uri: "https://remote.example.com/notes/1",
          text: "Remote note",
          ...renotable,
        }),
      ),
    };

    mockRemoteActorService = {
      resolveActor: mock(() =>
        Promise.resolve({
          id: "remote-user-456",
          username: "remoteuser",
          host: "remote.example.com",
        }),
      ),
    };

    contextMap.set("noteRepository", mockNoteRepository);
    contextMap.set("remoteNoteService", mockRemoteNoteService);
    contextMap.set("remoteActorService", mockRemoteActorService);

    return {
      get: (key: string) => contextMap.get(key),
    };
  };

  beforeEach(() => {
    fetchedNote = { ...defaultFetchedNote };
    fetchedDocs = {};
    fetchCalls = [];
    fetchedFinalUrls = {};
    process.env.URL = "http://localhost:3000";
    handler = new AnnounceHandler();
    const honoContext = createMockHonoContext() as Context;

    mockContext = {
      c: honoContext,
      recipientId: "local-user-123",
      baseUrl: "http://localhost:3000",
    };
  });

  test("should have correct activity type", () => {
    expect(handler.activityType).toBe("Announce");
  });

  test("should create renote for valid Announce activity", async () => {
    const activity: Activity = {
      "@context": "https://www.w3.org/ns/activitystreams",
      type: "Announce",
      id: "https://remote.example.com/activities/announce-1",
      actor: "https://remote.example.com/users/remoteuser",
      object: "http://localhost:3000/notes/note-123",
    };

    const result = await handler.handle(activity, mockContext);

    expect(result.success).toBe(true);
    expect(result.message).toContain("Renote created");
    expect(mockNoteRepository.create).toHaveBeenCalled();

    const createCall = mockNoteRepository.create.mock.calls[0];
    expect(createCall[0].userId).toBe("remote-user-456");
    expect(createCall[0].renoteId).toBe("note-123");
    expect(createCall[0].text).toBe(null); // Pure boost
    expect(createCall[0].uri).toBe("https://remote.example.com/activities/announce-1");
  });

  test("should fetch remote note if not in local database", async () => {
    mockNoteRepository.findByUri = mock(() => Promise.resolve(null));

    const activity: Activity = {
      "@context": "https://www.w3.org/ns/activitystreams",
      type: "Announce",
      id: "https://remote.example.com/activities/announce-1",
      actor: "https://remote.example.com/users/remoteuser",
      object: "https://another.example.com/notes/1",
    };

    const result = await handler.handle(activity, mockContext);

    expect(result.success).toBe(true);
    expect(mockRemoteNoteService.processNote).toHaveBeenCalled();
  });

  test("should not trust a cross-origin id served by the requested origin", async () => {
    mockNoteRepository.findByUri = mock(() => Promise.resolve(null));
    // another.example.com serves a document claiming to be victim's note
    fetchedDocs = {
      "https://another.example.com/notes/1": {
        ...defaultFetchedNote,
        id: "https://victim.example.com/notes/1",
        attributedTo: "https://victim.example.com/users/bob",
        content: "<p>forged</p>",
      },
      // victim.example.com's real document for that id
      "https://victim.example.com/notes/1": {
        ...defaultFetchedNote,
        id: "https://victim.example.com/notes/1",
        attributedTo: "https://victim.example.com/users/bob",
        content: "<p>real</p>",
      },
    };

    const activity: Activity = {
      "@context": "https://www.w3.org/ns/activitystreams",
      type: "Announce",
      id: "https://remote.example.com/activities/announce-1",
      actor: "https://remote.example.com/users/remoteuser",
      object: "https://another.example.com/notes/1",
    };

    const result = await handler.handle(activity, mockContext);

    expect(result.success).toBe(true);
    expect(fetchCalls).toEqual([
      "https://another.example.com/notes/1",
      "https://victim.example.com/notes/1",
    ]);
    // Only the document fetched from the victim's own origin is processed
    expect(mockRemoteNoteService.processNote.mock.calls[0][0].content).toBe("<p>real</p>");
  });

  test("should reject a fetch whose final URL is on another origin", async () => {
    mockNoteRepository.findByUri = mock(() => Promise.resolve(null));
    fetchedFinalUrls = { "https://another.example.com/notes/1": "https://evil.example.com/x" };

    const activity: Activity = {
      "@context": "https://www.w3.org/ns/activitystreams",
      type: "Announce",
      id: "https://remote.example.com/activities/announce-1",
      actor: "https://remote.example.com/users/remoteuser",
      object: "https://another.example.com/notes/1",
    };

    const result = await handler.handle(activity, mockContext);

    expect(result.success).toBe(false);
    expect(mockRemoteNoteService.processNote).not.toHaveBeenCalled();
    expect(mockNoteRepository.create).not.toHaveBeenCalled();
  });

  test("should reject fetched note attributed to a local user", async () => {
    mockNoteRepository.findByUri = mock(() => Promise.resolve(null));
    fetchedNote = {
      ...defaultFetchedNote,
      attributedTo: "http://localhost:3000/users/alice",
    };

    const activity: Activity = {
      "@context": "https://www.w3.org/ns/activitystreams",
      type: "Announce",
      id: "https://remote.example.com/activities/announce-1",
      actor: "https://remote.example.com/users/remoteuser",
      object: "https://another.example.com/notes/1",
    };

    const result = await handler.handle(activity, mockContext);

    expect(result.success).toBe(false);
    expect(result.message).toContain("local author");
    expect(mockRemoteNoteService.processNote).not.toHaveBeenCalled();
  });

  test("should resolve local note by id without fetching when uri lookup misses", async () => {
    mockNoteRepository.findByUri = mock(() => Promise.resolve(null));
    mockNoteRepository.findById = mock(() =>
      Promise.resolve({ id: "note-123", uri: null, text: "Local note", ...renotable }),
    );

    const activity: Activity = {
      "@context": "https://www.w3.org/ns/activitystreams",
      type: "Announce",
      id: "https://remote.example.com/activities/announce-1",
      actor: "https://remote.example.com/users/remoteuser",
      object: "http://localhost:3000/notes/note-123",
    };

    const result = await handler.handle(activity, mockContext);

    expect(result.success).toBe(true);
    expect(mockNoteRepository.findById).toHaveBeenCalledWith("note-123");
    expect(mockRemoteNoteService.processNote).not.toHaveBeenCalled();
  });

  test("should reject activity with missing object", async () => {
    const activity: Activity = {
      "@context": "https://www.w3.org/ns/activitystreams",
      type: "Announce",
      id: "https://remote.example.com/activities/announce-1",
      actor: "https://remote.example.com/users/remoteuser",
    };

    const result = await handler.handle(activity, mockContext);

    expect(result.success).toBe(false);
    expect(result.message).toContain("missing object");
  });

  test("should handle object as nested object with id", async () => {
    const activity: Activity = {
      "@context": "https://www.w3.org/ns/activitystreams",
      type: "Announce",
      id: "https://remote.example.com/activities/announce-1",
      actor: "https://remote.example.com/users/remoteuser",
      object: {
        id: "http://localhost:3000/notes/note-123",
        type: "Note",
      },
    };

    const result = await handler.handle(activity, mockContext);

    expect(result.success).toBe(true);
    expect(mockNoteRepository.findByUri).toHaveBeenCalledWith(
      "http://localhost:3000/notes/note-123",
    );
  });

  test("should handle actor resolution failure", async () => {
    // Create new context with failing mock
    const contextMap = new Map<string, any>();
    const failingRemoteActorService = {
      resolveActor: mock(async () => {
        throw new Error("Actor resolution failed");
      }),
    };
    contextMap.set("noteRepository", mockNoteRepository);
    contextMap.set("remoteNoteService", mockRemoteNoteService);
    contextMap.set("remoteActorService", failingRemoteActorService);

    const failingContext: HandlerContext = {
      c: { get: (key: string) => contextMap.get(key) } as Context,
      recipientId: "local-user-123",
      baseUrl: "http://localhost:3000",
    };

    const activity: Activity = {
      "@context": "https://www.w3.org/ns/activitystreams",
      type: "Announce",
      id: "https://remote.example.com/activities/announce-1",
      actor: "https://remote.example.com/users/remoteuser",
      object: "http://localhost:3000/notes/note-123",
    };

    const result = await handler.handle(activity, failingContext);

    expect(result.success).toBe(false);
    expect(result.message).toContain("Failed to handle Announce activity");
  });

  describe("security checks", () => {
    const announce = (overrides: Partial<Activity> = {}): Activity => ({
      "@context": "https://www.w3.org/ns/activitystreams",
      type: "Announce",
      id: "https://remote.example.com/activities/announce-1",
      actor: "https://remote.example.com/users/remoteuser",
      object: "http://localhost:3000/notes/note-123",
      ...overrides,
    });

    test("should refetch by canonical id when fetched id differs, and accept exact match", async () => {
      mockNoteRepository.findByUri = mock(() => Promise.resolve(null));
      const requested = "https://another.example.com/@author/1";
      const canonical = "https://another.example.com/notes/1";
      fetchedDocs = {
        [requested]: { ...defaultFetchedNote, id: canonical },
        [canonical]: { ...defaultFetchedNote, id: canonical },
      };

      const result = await handler.handle(announce({ object: requested }), mockContext);

      expect(result.success).toBe(true);
      expect(fetchCalls).toEqual([requested, canonical]);
      expect(mockRemoteNoteService.processNote.mock.calls[0][0].id).toBe(canonical);
    });

    test("should reject when the canonical refetch returns yet another id", async () => {
      mockNoteRepository.findByUri = mock(() => Promise.resolve(null));
      const requested = "https://another.example.com/@author/1";
      const canonical = "https://another.example.com/notes/1";
      fetchedDocs = {
        [requested]: { ...defaultFetchedNote, id: canonical },
        [canonical]: { ...defaultFetchedNote, id: "https://another.example.com/notes/2" },
      };

      const result = await handler.handle(announce({ object: requested }), mockContext);

      expect(result.success).toBe(false);
      expect(mockRemoteNoteService.processNote).not.toHaveBeenCalled();
    });

    test("should reject renote of a followers-only local note", async () => {
      mockNoteRepository.findByUri = mock(() =>
        Promise.resolve({ id: "note-123", ...renotable, visibility: "followers" }),
      );

      const result = await handler.handle(announce(), mockContext);

      expect(result.success).toBe(false);
      expect(mockNoteRepository.create).not.toHaveBeenCalled();
    });

    test("should reject renote of a specified (DM) note found via id fallback", async () => {
      mockNoteRepository.findByUri = mock(() => Promise.resolve(null));
      mockNoteRepository.findById = mock(() =>
        Promise.resolve({ id: "note-123", uri: null, ...renotable, visibility: "specified" }),
      );

      const result = await handler.handle(announce(), mockContext);

      expect(result.success).toBe(false);
      expect(mockNoteRepository.create).not.toHaveBeenCalled();
    });

    test("should reject renote of a localOnly note", async () => {
      mockNoteRepository.findByUri = mock(() =>
        Promise.resolve({ id: "note-123", ...renotable, localOnly: true }),
      );

      const result = await handler.handle(announce(), mockContext);

      expect(result.success).toBe(false);
      expect(mockNoteRepository.create).not.toHaveBeenCalled();
    });

    test("should derive renote visibility from to/cc", async () => {
      const PUBLIC = "https://www.w3.org/ns/activitystreams#Public";

      await handler.handle(announce({ to: [PUBLIC] }), mockContext);
      await handler.handle(
        announce({ to: ["https://remote.example.com/users/remoteuser/followers"], cc: [PUBLIC] }),
        mockContext,
      );
      await handler.handle(
        announce({ to: ["https://remote.example.com/users/remoteuser/followers"] }),
        mockContext,
      );

      const visibilities = mockNoteRepository.create.mock.calls.map((c: any[]) => c[0].visibility);
      expect(visibilities).toEqual(["public", "home", "followers"]);
    });

    test("should reject a javascript: activity id", async () => {
      const result = await handler.handle(announce({ id: "javascript:alert(1)" }), mockContext);

      expect(result.success).toBe(false);
      expect(mockNoteRepository.create).not.toHaveBeenCalled();
    });

    test("should reject an activity id on another origin (URI squatting)", async () => {
      const result = await handler.handle(
        announce({ id: "https://victim.example.com/notes/42" }),
        mockContext,
      );

      expect(result.success).toBe(false);
      expect(mockNoteRepository.create).not.toHaveBeenCalled();
    });
  });
});
