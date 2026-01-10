/**
 * ActivityPub Note Object Endpoint
 *
 * Serves individual notes as ActivityPub Note objects.
 * Also serves Open Graph Protocol (OGP) HTML for embed crawlers (Discord, Slack, etc.)
 * to enable rich link previews when note URLs are shared.
 *
 * @module routes/ap/note
 */

import { Hono } from "hono";
import type { Context } from "hono";
import { logger } from "../../lib/logger.js";
import {
  isActivityPubRequest,
} from "../../lib/crawlerDetection.js";
import { textToHtml } from "../../lib/ogp.js";

const note = new Hono();

/**
 * GET /notes/:id
 *
 * Returns an ActivityPub Note object for the specified note ID.
 * Also serves OGP HTML for embed crawlers (Discord, Slack, etc.)
 *
 * @param id - Note ID
 * @returns ActivityPub Note object (application/activity+json) or OGP HTML
 *
 * @example
 * ```bash
 * # ActivityPub request
 * curl -H "Accept: application/activity+json" \
 *   https://example.com/notes/abc123
 *
 * # Discord/Slack crawler (returns OGP HTML)
 * curl -H "User-Agent: Discordbot/2.0" \
 *   https://example.com/notes/abc123
 * ```
 */
note.get("/notes/:id", async (c: Context) => {
  const { id } = c.req.param();
  const accept = c.req.header("Accept") || "";

  // Non-ActivityPub requests should be routed to frontend by the reverse proxy
  // Return 404 so nginx can fall through to Waku SSR for OGP meta tags
  if (!isActivityPubRequest(accept)) {
    return c.text("", 404);
  }

  // Get note from repository
  const noteRepository = c.get("noteRepository");
  const noteData = await noteRepository.findById(id as string);

  if (!noteData) {
    return c.notFound();
  }

  const baseUrl = process.env.URL || "http://localhost:3000";

  // 410 Gone if note is deleted (ActivityPub spec compliance)
  if (noteData.isDeleted) {
    // Return a Tombstone object for deleted notes
    return c.json(
      {
        "@context": "https://www.w3.org/ns/activitystreams",
        id: noteData.uri || `${baseUrl}/notes/${noteData.id}`,
        type: "Tombstone",
        deleted: noteData.deletedAt?.toISOString(),
      },
      410,
      {
        "Content-Type": "application/activity+json; charset=utf-8",
      },
    );
  }

  // Get note author
  const userRepository = c.get("userRepository");
  const author = await userRepository.findById(noteData.userId);

  if (!author) {
    logger.error({ userId: noteData.userId }, "Note author not found");
    return c.notFound();
  }

  // Construct author URI and followers URL
  let authorUri: string;
  let followersUrl: string;

  if (author.host) {
    // Remote user - require stored URI (different servers use different URL patterns)
    // Synthesizing URIs is unsafe as Misskey uses UUIDs, PeerTube uses /accounts/, etc.
    if (!author.uri) {
      logger.error(
        { userId: author.id, username: author.username, host: author.host },
        "Remote user missing URI - cannot serve ActivityPub Note without canonical actor URI"
      );
      return c.json(
        { error: "Remote actor URI unavailable" },
        500,
        { "Content-Type": "application/json" }
      );
    }
    authorUri = author.uri;

    // followersUrl is less critical but still prefer stored value
    followersUrl = author.followersUrl || `${authorUri}/followers`;
  } else {
    // Local user - construct from baseUrl
    authorUri = `${baseUrl}/users/${author.username}`;
    followersUrl = `${baseUrl}/users/${author.username}/followers`;
  }

  // Build reply information
  let inReplyTo: string | null = null;
  if (noteData.replyId) {
    const replyTo = await noteRepository.findById(noteData.replyId);
    if (replyTo) {
      inReplyTo = replyTo.uri || `${baseUrl}/notes/${replyTo.id}`;
    }
  }

  // Build mentions/tags
  const tags: any[] = [];
  if (noteData.mentions && noteData.mentions.length > 0) {
    const mentionedUsers = await Promise.all(
      noteData.mentions.map((userId) => userRepository.findById(userId)),
    );

    for (const u of mentionedUsers) {
      if (u) {
        // Use stored URI for remote users, fallback to constructed URL
        const href = u.uri
          ?? (u.host ? `https://${u.host}/users/${u.username}` : `${baseUrl}/users/${u.username}`);
        tags.push({
          type: "Mention",
          href,
          name: `@${u.username}${u.host ? `@${u.host}` : ""}`,
        });
      }
    }
  }

  // Build file attachments
  const attachments: any[] = [];
  if (noteData.fileIds && noteData.fileIds.length > 0) {
    const driveFileRepository = c.get("driveFileRepository");
    const files = await Promise.all(
      noteData.fileIds.map((fileId) => driveFileRepository.findById(fileId)),
    );

    for (const f of files) {
      if (f) {
        attachments.push({
          type: "Document",
          mediaType: f.type,
          url: f.url,
          name: f.name || undefined,
        });
      }
    }
  }

  // Build custom emoji tags (batch query to avoid N+1)
  if (noteData.emojis && noteData.emojis.length > 0) {
    const customEmojiRepository = c.get("customEmojiRepository");
    // Use batch query instead of individual lookups per emoji
    const emojiMap = await customEmojiRepository.findManyByNames(noteData.emojis, null);

    for (const [, emoji] of emojiMap) {
      // Infer media type from URL extension, default to image/png
      // Parse URL to handle query parameters (e.g., emoji.png?v=123)
      let pathname: string;
      try {
        pathname = new URL(emoji.url).pathname.toLowerCase();
      } catch {
        // Fallback to simple lowercase if URL parsing fails
        pathname = emoji.url.toLowerCase();
      }
      let mediaType = "image/png";
      if (pathname.endsWith(".gif")) mediaType = "image/gif";
      else if (pathname.endsWith(".webp")) mediaType = "image/webp";
      else if (pathname.endsWith(".svg")) mediaType = "image/svg+xml";
      else if (pathname.endsWith(".jpg") || pathname.endsWith(".jpeg")) mediaType = "image/jpeg";

      tags.push({
        id: `${baseUrl}/emojis/${emoji.name}`,
        type: "Emoji",
        name: `:${emoji.name}:`,
        updated: emoji.updatedAt?.toISOString() || emoji.createdAt.toISOString(),
        icon: {
          type: "Image",
          mediaType,
          url: emoji.url,
        },
      });
    }
  }

  // Build ActivityPub Note object (matching Misskey.io structure)
  const apNote: any = {
    "@context": [
      "https://www.w3.org/ns/activitystreams",
      "https://w3id.org/security/v1",
    ],
    id: noteData.uri || `${baseUrl}/notes/${noteData.id}`,
    type: "Note",
    attributedTo: authorUri,
    url: `${baseUrl}/notes/${noteData.id}`,
    content: noteData.text ? textToHtml(noteData.text) : "",
    published: noteData.createdAt.toISOString(),
    to: ["https://www.w3.org/ns/activitystreams#Public"],
    cc: [followersUrl],
    inReplyTo: inReplyTo,
    attachment: attachments,
    sensitive: noteData.cw ? true : false,
    tag: tags,
  };

  // Add content warning if present (plain text for Fediverse interoperability)
  // Note: ActivityPub spec allows HTML, but Mastodon/Misskey treat summary as plain text CW
  if (noteData.cw) {
    apNote.summary = noteData.cw;
  }

  return c.json(apNote, 200, {
    "Content-Type": "application/activity+json; charset=utf-8",
  });
});

export default note;
