/**
 * Note Visibility Unit Tests
 *
 * Tests the Misskey-compatible visibility rules in lib/noteVisibility.ts.
 */

import { describe, test, expect, mock } from "bun:test";
import {
  canViewNote,
  isNoteVisibleTo,
  isPubliclyVisible,
  type NoteVisibilityFields,
} from "../../lib/noteVisibility.js";

const AUTHOR = "author";
const FOLLOWER = "follower";
const STRANGER = "stranger";
const RECIPIENT = "recipient";

function note(
  visibility: string,
  overrides: Partial<NoteVisibilityFields> = {},
): NoteVisibilityFields {
  return { userId: AUTHOR, visibility, mentions: [], replyId: null, ...overrides };
}

describe("isPubliclyVisible", () => {
  test("public and home are publicly visible", () => {
    expect(isPubliclyVisible(note("public"))).toBe(true);
    expect(isPubliclyVisible(note("home"))).toBe(true);
  });

  test("followers and specified are not publicly visible", () => {
    expect(isPubliclyVisible(note("followers"))).toBe(false);
    expect(isPubliclyVisible(note("specified"))).toBe(false);
  });
});

describe("canViewNote", () => {
  describe("public / home", () => {
    test("visible to unauthenticated viewers", () => {
      expect(canViewNote(note("public"), null, false)).toBe(true);
      expect(canViewNote(note("home"), null, false)).toBe(true);
    });

    test("visible to any authenticated viewer", () => {
      expect(canViewNote(note("public"), STRANGER, false)).toBe(true);
      expect(canViewNote(note("home"), STRANGER, false)).toBe(true);
    });
  });

  describe("followers", () => {
    test("hidden from unauthenticated viewers", () => {
      expect(canViewNote(note("followers"), null, false)).toBe(false);
      expect(canViewNote(note("followers"), undefined, true)).toBe(false);
    });

    test("visible to the author", () => {
      expect(canViewNote(note("followers"), AUTHOR, false)).toBe(true);
    });

    test("visible to followers", () => {
      expect(canViewNote(note("followers"), FOLLOWER, true)).toBe(true);
    });

    test("hidden from non-followers", () => {
      expect(canViewNote(note("followers"), STRANGER, false)).toBe(false);
    });

    test("visible to mentioned users", () => {
      expect(canViewNote(note("followers", { mentions: [STRANGER] }), STRANGER, false)).toBe(true);
    });

    test("visible to the reply target author", () => {
      expect(
        canViewNote(note("followers"), STRANGER, { isFollowing: false, isReplyTargetAuthor: true }),
      ).toBe(true);
    });
  });

  describe("specified", () => {
    test("hidden from unauthenticated viewers", () => {
      expect(canViewNote(note("specified", { mentions: [RECIPIENT] }), null, false)).toBe(false);
    });

    test("visible to the author", () => {
      expect(canViewNote(note("specified", { mentions: [RECIPIENT] }), AUTHOR, false)).toBe(true);
    });

    test("visible to recipients", () => {
      expect(canViewNote(note("specified", { mentions: [RECIPIENT] }), RECIPIENT, false)).toBe(
        true,
      );
    });

    test("hidden from followers who are not recipients", () => {
      expect(canViewNote(note("specified", { mentions: [RECIPIENT] }), FOLLOWER, true)).toBe(false);
    });

    test("hidden from strangers", () => {
      expect(canViewNote(note("specified", { mentions: [RECIPIENT] }), STRANGER, false)).toBe(
        false,
      );
    });

    test("handles null mentions", () => {
      expect(canViewNote(note("specified", { mentions: null }), STRANGER, false)).toBe(false);
    });
  });

  test("unknown visibility is treated as private", () => {
    expect(canViewNote(note("weird"), STRANGER, true)).toBe(false);
    expect(canViewNote(note("weird"), AUTHOR, false)).toBe(true);
  });
});

describe("isNoteVisibleTo", () => {
  test("does not query follows for public notes", async () => {
    const exists = mock(() => Promise.resolve(false));
    const visible = await isNoteVisibleTo(note("public"), null, {
      followRepository: { exists },
    });
    expect(visible).toBe(true);
    expect(exists).not.toHaveBeenCalled();
  });

  test("does not query follows for unauthenticated viewers", async () => {
    const exists = mock(() => Promise.resolve(true));
    const visible = await isNoteVisibleTo(note("followers"), null, {
      followRepository: { exists },
    });
    expect(visible).toBe(false);
    expect(exists).not.toHaveBeenCalled();
  });

  test("does not query follows for specified notes", async () => {
    const exists = mock(() => Promise.resolve(true));
    const visible = await isNoteVisibleTo(note("specified", { mentions: [RECIPIENT] }), FOLLOWER, {
      followRepository: { exists },
    });
    expect(visible).toBe(false);
    expect(exists).not.toHaveBeenCalled();
  });

  test("allows followers of the author for followers-only notes", async () => {
    const exists = mock((followerId: string, followeeId: string) =>
      Promise.resolve(followerId === FOLLOWER && followeeId === AUTHOR),
    );
    expect(
      await isNoteVisibleTo(note("followers"), FOLLOWER, { followRepository: { exists } }),
    ).toBe(true);
    expect(exists).toHaveBeenCalledWith(FOLLOWER, AUTHOR);
  });

  test("rejects non-followers for followers-only notes", async () => {
    const exists = mock(() => Promise.resolve(false));
    expect(
      await isNoteVisibleTo(note("followers"), STRANGER, { followRepository: { exists } }),
    ).toBe(false);
  });

  test("allows the reply target author for followers-only replies", async () => {
    const exists = mock(() => Promise.resolve(false));
    const findById = mock(() => Promise.resolve({ id: "parent", userId: STRANGER } as never));
    expect(
      await isNoteVisibleTo(note("followers", { replyId: "parent" }), STRANGER, {
        followRepository: { exists },
        noteRepository: { findById },
      }),
    ).toBe(true);
    expect(findById).toHaveBeenCalledWith("parent");
  });

  test("rejects when the reply target belongs to someone else", async () => {
    const exists = mock(() => Promise.resolve(false));
    const findById = mock(() => Promise.resolve({ id: "parent", userId: "other" } as never));
    expect(
      await isNoteVisibleTo(note("followers", { replyId: "parent" }), STRANGER, {
        followRepository: { exists },
        noteRepository: { findById },
      }),
    ).toBe(false);
  });
});
