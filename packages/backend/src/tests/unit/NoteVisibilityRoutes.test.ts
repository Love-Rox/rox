/**
 * Note Visibility Route Tests
 *
 * Verifies that note-returning endpoints enforce Misskey-compatible
 * visibility (followers-only / specified notes must not leak).
 * The real route modules are mounted with mocked repositories.
 */

import { describe, test, expect, mock, beforeEach } from "bun:test";
import { Hono } from "hono";
import type { Context, Next } from "hono";
import type { Note } from "shared";
import notesRoute from "../../routes/notes.js";
import noteAPRoute from "../../routes/ap/note.js";
import outboxRoute from "../../routes/ap/outbox.js";
import { NoteService } from "../../services/NoteService.js";
import type { INoteRepository } from "../../interfaces/repositories/INoteRepository.js";
import type { IDriveFileRepository } from "../../interfaces/repositories/IDriveFileRepository.js";
import type { IFollowRepository } from "../../interfaces/repositories/IFollowRepository.js";
import type { IUserRepository } from "../../interfaces/repositories/IUserRepository.js";
import type { IListRepository } from "../../interfaces/repositories/IListRepository.js";
import type { ActivityPubDeliveryService } from "../../services/ap/ActivityPubDeliveryService.js";
import type { NotificationService } from "../../services/NotificationService.js";

const AUTHOR_ID = "author";
const FOLLOWER_ID = "follower";
const STRANGER_ID = "stranger";
const RECIPIENT_ID = "recipient";

function makeNote(id: string, overrides: Partial<Note> = {}): Note {
  return {
    id,
    userId: AUTHOR_ID,
    text: `text of ${id}`,
    cw: null,
    visibility: "public",
    localOnly: false,
    replyId: null,
    renoteId: null,
    fileIds: [],
    mentions: [],
    emojis: [],
    tags: [],
    uri: null,
    repliesCount: 0,
    renoteCount: 0,
    isDeleted: false,
    deletedAt: null,
    deletedById: null,
    deletionReason: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

const authorUser = {
  id: AUTHOR_ID,
  username: "author",
  host: null,
  displayName: "Author",
  avatarUrl: null,
  profileEmojis: [],
  uri: null,
  followersUrl: null,
};

const notesById = new Map<string, Note>();

function setNotes(list: Note[]): void {
  notesById.clear();
  for (const n of list) notesById.set(n.id, n);
}

let noteRepo: {
  findById: ReturnType<typeof mock>;
  findByUserId: ReturnType<typeof mock>;
  findReplies: ReturnType<typeof mock>;
};
let followRepo: {
  exists: ReturnType<typeof mock>;
  findByFollowerId: ReturnType<typeof mock>;
  findByFolloweeId: ReturnType<typeof mock>;
};
let userRepo: {
  findById: ReturnType<typeof mock>;
  findByUsername: ReturnType<typeof mock>;
};

/**
 * Build an app that mounts the real routers with mocked dependencies.
 *
 * @param viewerId - Authenticated viewer ID, or null for anonymous
 */
function buildApp(viewerId: string | null): Hono {
  const app = new Hono();
  app.use("*", async (c: Context, next: Next) => {
    if (viewerId) {
      c.set("user", { id: viewerId, username: viewerId, host: null } as never);
    }
    c.set("noteRepository", noteRepo as never);
    c.set("followRepository", followRepo as never);
    c.set("userRepository", userRepo as never);
    c.set("driveFileRepository", { findByIds: mock(() => Promise.resolve([])) } as never);
    c.set("customEmojiRepository", {
      findManyByNames: mock(() => Promise.resolve(new Map())),
    } as never);
    c.set("activityPubDeliveryService", {} as never);
    c.set("cacheService", { isAvailable: () => false } as never);
    await next();
  });
  app.route("/api/notes", notesRoute);
  app.route("/", noteAPRoute);
  app.route("/users", outboxRoute);
  return app;
}

beforeEach(() => {
  setNotes([]);
  noteRepo = {
    findById: mock((id: string) => Promise.resolve(notesById.get(id) ?? null)),
    findByUserId: mock(() => Promise.resolve([...notesById.values()])),
    findReplies: mock(() => Promise.resolve([])),
  };
  followRepo = {
    exists: mock((followerId: string, followeeId: string) =>
      Promise.resolve(followerId === FOLLOWER_ID && followeeId === AUTHOR_ID),
    ),
    findByFollowerId: mock(() => Promise.resolve([])),
    findByFolloweeId: mock(() => Promise.resolve([])),
  };
  userRepo = {
    findById: mock(() => Promise.resolve(authorUser)),
    findByUsername: mock(() => Promise.resolve(authorUser)),
  };
});

async function show(viewerId: string | null, noteId: string): Promise<Response> {
  return buildApp(viewerId).request("/api/notes/show", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ noteId }),
  });
}

describe("POST /api/notes/show", () => {
  test("public note is visible to anonymous viewers", async () => {
    setNotes([makeNote("n1", { visibility: "public" })]);
    expect((await show(null, "n1")).status).toBe(200);
  });

  test("home note is visible to anonymous viewers", async () => {
    setNotes([makeNote("n1", { visibility: "home" })]);
    expect((await show(null, "n1")).status).toBe(200);
  });

  test("followers-only note returns 404 to anonymous viewers", async () => {
    setNotes([makeNote("n1", { visibility: "followers" })]);
    const res = await show(null, "n1");
    expect(res.status).toBe(404);
    expect(await res.text()).not.toContain("text of n1");
  });

  test("followers-only note returns 404 to non-followers", async () => {
    setNotes([makeNote("n1", { visibility: "followers" })]);
    expect((await show(STRANGER_ID, "n1")).status).toBe(404);
  });

  test("followers-only note is visible to followers", async () => {
    setNotes([makeNote("n1", { visibility: "followers" })]);
    expect((await show(FOLLOWER_ID, "n1")).status).toBe(200);
  });

  test("followers-only note is visible to its author", async () => {
    setNotes([makeNote("n1", { visibility: "followers" })]);
    expect((await show(AUTHOR_ID, "n1")).status).toBe(200);
  });

  test("specified note returns 404 to followers who are not recipients", async () => {
    setNotes([makeNote("n1", { visibility: "specified", mentions: [RECIPIENT_ID] })]);
    expect((await show(FOLLOWER_ID, "n1")).status).toBe(404);
    expect((await show(null, "n1")).status).toBe(404);
  });

  test("specified note is visible to recipients", async () => {
    setNotes([makeNote("n1", { visibility: "specified", mentions: [RECIPIENT_ID] })]);
    expect((await show(RECIPIENT_ID, "n1")).status).toBe(200);
  });
});

describe("GET /api/notes/user-notes", () => {
  test("passes anonymous visibility filter to the repository", async () => {
    await buildApp(null).request(`/api/notes/user-notes?userId=${AUTHOR_ID}`);
    const options = noteRepo.findByUserId.mock.calls[0]?.[1] as { visibleTo?: unknown };
    expect(options.visibleTo).toEqual({ viewerId: null });
  });

  test("passes the authenticated viewer to the repository", async () => {
    await buildApp(STRANGER_ID).request(`/api/notes/user-notes?userId=${AUTHOR_ID}`);
    const options = noteRepo.findByUserId.mock.calls[0]?.[1] as { visibleTo?: unknown };
    expect(options.visibleTo).toEqual({ viewerId: STRANGER_ID });
  });

  test("does not embed renoted followers-only notes for anonymous viewers", async () => {
    const hidden = makeNote("hidden", { visibility: "followers", userId: "other" });
    const renote = makeNote("renote", { renoteId: "hidden", text: null });
    setNotes([hidden]);
    noteRepo.findByUserId = mock(() => Promise.resolve([renote]));

    const res = await buildApp(null).request(`/api/notes/user-notes?userId=${AUTHOR_ID}`);
    const body = (await res.json()) as Array<{ renote?: unknown }>;
    expect(body).toHaveLength(1);
    expect(body[0]?.renote).toBeUndefined();
    expect(JSON.stringify(body)).not.toContain("text of hidden");
  });
});

describe("GET /api/notes/replies", () => {
  test("returns nothing when the parent note is not visible", async () => {
    setNotes([makeNote("parent", { visibility: "followers" })]);
    noteRepo.findReplies = mock(() => Promise.resolve([makeNote("reply", { replyId: "parent" })]));

    const res = await buildApp(STRANGER_ID).request("/api/notes/replies?noteId=parent");
    expect(await res.json()).toEqual([]);
    expect(noteRepo.findReplies).not.toHaveBeenCalled();
  });

  test("passes the viewer filter when the parent is visible", async () => {
    setNotes([makeNote("parent", { visibility: "public" })]);
    await buildApp(null).request("/api/notes/replies?noteId=parent");
    const options = noteRepo.findReplies.mock.calls[0]?.[1] as { visibleTo?: unknown };
    expect(options.visibleTo).toEqual({ viewerId: null });
  });
});

describe("GET /notes/:id (ActivityPub)", () => {
  async function fetchAP(noteId: string): Promise<Response> {
    return buildApp(null).request(`/notes/${noteId}`, {
      headers: { Accept: "application/activity+json" },
    });
  }

  test("serves public notes", async () => {
    setNotes([makeNote("n1", { visibility: "public" })]);
    expect((await fetchAP("n1")).status).toBe(200);
  });

  test("serves home notes", async () => {
    setNotes([makeNote("n1", { visibility: "home" })]);
    expect((await fetchAP("n1")).status).toBe(200);
  });

  test("returns 404 for followers-only notes", async () => {
    setNotes([makeNote("n1", { visibility: "followers" })]);
    const res = await fetchAP("n1");
    expect(res.status).toBe(404);
    expect(await res.text()).not.toContain("text of n1");
  });

  test("returns 404 for specified notes", async () => {
    setNotes([makeNote("n1", { visibility: "specified", mentions: [RECIPIENT_ID] })]);
    expect((await fetchAP("n1")).status).toBe(404);
  });

  test("returns 404 for local-only notes", async () => {
    setNotes([makeNote("n1", { visibility: "public", localOnly: true })]);
    expect((await fetchAP("n1")).status).toBe(404);
  });
});

describe("GET /users/:username/outbox", () => {
  test("only requests publicly visible notes and addresses them correctly", async () => {
    noteRepo.findByUserId = mock(() =>
      Promise.resolve([
        makeNote("pub", { visibility: "public" }),
        makeNote("home", { visibility: "home" }),
        makeNote("local", { visibility: "public", localOnly: true }),
      ]),
    );

    const res = await buildApp(null).request("/users/author/outbox?page=1");
    expect(res.status).toBe(200);

    const options = noteRepo.findByUserId.mock.calls[0]?.[1] as { visibleTo?: unknown };
    expect(options.visibleTo).toEqual({ viewerId: null });

    const body = (await res.json()) as {
      orderedItems: Array<{ object: { id: string }; to: string[]; cc: string[] }>;
    };
    const ids = body.orderedItems.map((i) => i.object.id.split("/").pop());
    expect(ids).toEqual(["pub", "home"]);

    const AS_PUBLIC = "https://www.w3.org/ns/activitystreams#Public";
    const [pub, home] = body.orderedItems;
    expect(pub?.to).toEqual([AS_PUBLIC]);
    expect(home?.to).not.toContain(AS_PUBLIC);
    expect(home?.cc).toContain(AS_PUBLIC);
  });
});

describe("NoteService visibility enforcement", () => {
  function createService(listRepository?: Partial<IListRepository>) {
    const notificationService = {
      createListNoteNotification: mock(() => Promise.resolve()),
    };
    const service = new NoteService(
      noteRepo as unknown as INoteRepository,
      { findByIds: mock(() => Promise.resolve([])) } as unknown as IDriveFileRepository,
      followRepo as unknown as IFollowRepository,
      {
        ...userRepo,
        findByUsername: mock(() => Promise.resolve(null)),
      } as unknown as IUserRepository,
      {
        deliverCreateNote: mock(() => Promise.resolve()),
        deliverAnnounceActivity: mock(() => Promise.resolve()),
      } as unknown as ActivityPubDeliveryService,
      undefined,
      notificationService as unknown as NotificationService,
      listRepository as IListRepository | undefined,
    );
    return { service, notificationService };
  }

  test("findById without options keeps legacy (unfiltered) behavior", async () => {
    setNotes([makeNote("n1", { visibility: "followers" })]);
    const { service } = createService();
    expect(await service.findById("n1")).not.toBeNull();
    expect(await service.findById("n1", { viewerId: null })).toBeNull();
  });

  test("rejects replying to a note the author cannot see", async () => {
    setNotes([makeNote("secret", { visibility: "specified", mentions: [RECIPIENT_ID] })]);
    const { service } = createService();
    await expect(
      service.create({ userId: STRANGER_ID, text: "hi", replyId: "secret" }),
    ).rejects.toThrow("Reply target note not found");
  });

  test("rejects renoting another user's followers-only note", async () => {
    setNotes([makeNote("fo", { visibility: "followers" })]);
    const { service } = createService();
    await expect(service.create({ userId: FOLLOWER_ID, renoteId: "fo" })).rejects.toThrow(
      "Cannot renote a non-public note",
    );
  });

  test("list notifications are only sent to owners who can see the note", async () => {
    (noteRepo as unknown as { create: ReturnType<typeof mock> }).create = mock(
      (input: Partial<Note>) => Promise.resolve(makeNote("created", input)),
    );
    const listRepository = {
      findListsWithNotificationsForMember: mock(() =>
        Promise.resolve([
          { id: "list-stranger", userId: STRANGER_ID, notifyLevel: "all" },
          { id: "list-follower", userId: FOLLOWER_ID, notifyLevel: "all" },
        ]),
      ),
      findListsForMember: mock(() => Promise.resolve([])),
    };
    const { service, notificationService } = createService(
      listRepository as unknown as Partial<IListRepository>,
    );

    await service.create({ userId: AUTHOR_ID, text: "followers only", visibility: "followers" });
    // List notifications are dispatched asynchronously
    await new Promise((resolve) => setTimeout(resolve, 20));

    const notifiedOwners = notificationService.createListNoteNotification.mock.calls.map(
      (call) => (call as unknown[])[0],
    );
    expect(notifiedOwners).toEqual([FOLLOWER_ID]);
  });

  test("home timeline passes the viewer filter", async () => {
    const getTimeline = mock(() => Promise.resolve([]));
    (noteRepo as unknown as { getTimeline: typeof getTimeline }).getTimeline = getTimeline;
    const { service } = createService();
    await service.getHomeTimeline(FOLLOWER_ID);
    const options = (getTimeline.mock.calls[0] as unknown[] | undefined)?.[0] as {
      visibleTo?: unknown;
    };
    expect(options.visibleTo).toEqual({ viewerId: FOLLOWER_ID });
  });
});
