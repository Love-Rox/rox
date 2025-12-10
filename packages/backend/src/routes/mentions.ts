/**
 * Mentions API Routes
 *
 * Provides endpoints for retrieving mentions and replies to the authenticated user.
 *
 * @module routes/mentions
 */

import { Hono } from "hono";
import type { Context } from "hono";
import { requireAuth } from "../middleware/auth.js";

const mentions = new Hono();

/**
 * GET /api/mentions
 *
 * Get mentions and replies for the authenticated user
 *
 * Returns notes that mention the user or are replies to the user's notes.
 *
 * @auth Required
 * @query {number} [limit=20] - Maximum number of notes (max: 100)
 * @query {string} [sinceId] - Get notes newer than this ID
 * @query {string} [untilId] - Get notes older than this ID
 * @returns {Note[]} List of mentions and replies
 */
mentions.get("/", requireAuth(), async (c: Context) => {
  const user = c.get("user")!;
  const noteRepository = c.get("noteRepository");

  const limit = Math.min(
    c.req.query("limit") ? Number.parseInt(c.req.query("limit")!, 10) : 20,
    100,
  );
  const sinceId = c.req.query("sinceId");
  const untilId = c.req.query("untilId");

  try {
    const notes = await noteRepository.findMentionsAndReplies(user.id, {
      limit,
      sinceId,
      untilId,
    });

    return c.json(notes);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get mentions";
    return c.json({ error: message }, 500);
  }
});

export default mentions;
