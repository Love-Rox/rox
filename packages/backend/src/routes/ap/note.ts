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

  // Route non-ActivityPub requests to frontend (Waku SSR with OGP meta tags)
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

  // Construct author URI
  const authorUri = author.host
    ? `https://${author.host}/users/${author.username}` // Remote user
    : `${baseUrl}/users/${author.username}`; // Local user

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
        tags.push({
          type: "Mention",
          href: u.host
            ? `https://${u.host}/users/${u.username}`
            : `${baseUrl}/users/${u.username}`,
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

  // Build custom emoji tags
  if (noteData.emojis && noteData.emojis.length > 0) {
    const customEmojiRepository = c.get("customEmojiRepository");
    for (const emojiName of noteData.emojis) {
      const emoji = await customEmojiRepository.findByName(emojiName, null);
      if (emoji) {
        // Infer media type from URL extension, default to image/png
        const urlLower = emoji.url.toLowerCase();
        let mediaType = "image/png";
        if (urlLower.endsWith(".gif")) mediaType = "image/gif";
        else if (urlLower.endsWith(".webp")) mediaType = "image/webp";
        else if (urlLower.endsWith(".svg")) mediaType = "image/svg+xml";
        else if (urlLower.endsWith(".jpg") || urlLower.endsWith(".jpeg")) mediaType = "image/jpeg";

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
  }

  // Escape HTML special characters to prevent XSS
  const escapeHtml = (text: string): string => {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  // Convert plain text to HTML (escape + newlines to <br> tags)
  const textToHtml = (text: string): string => {
    return `<p>${escapeHtml(text).replace(/\n/g, "<br>")}</p>`;
  };

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
    cc: [`${authorUri}/followers`],
    inReplyTo: inReplyTo,
    attachment: attachments,
    sensitive: noteData.cw ? true : false,
    tag: tags,
  };

  // Add content warning if present (wrapped in <p> tag like Mastodon/Misskey)
  if (noteData.cw) {
    apNote.summary = textToHtml(noteData.cw);
  }

  return c.json(apNote, 200, {
    "Content-Type": "application/activity+json; charset=utf-8",
  });
});

export default note;
