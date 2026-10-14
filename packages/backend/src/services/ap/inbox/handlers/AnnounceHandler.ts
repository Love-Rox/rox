/**
 * Announce Activity Handler
 *
 * Processes Announce activities (boosts/reblogs/renotes).
 *
 * @module services/ap/inbox/handlers/AnnounceHandler
 */

import type { Activity, HandlerContext, HandlerResult } from "../types.js";
import { getObjectUri } from "../types.js";
import { BaseHandler } from "./BaseHandler.js";
import { RemoteFetchService, type SignatureConfig } from "../../RemoteFetchService.js";
import { logger } from "../../../../lib/logger.js";
import {
  extractRefUri,
  isHttpUrl,
  isLocalUrl,
  isSameOrigin,
  normalizeUrl,
} from "../../../../utils/federationUrl.js";

/** ActivityStreams public collection identifiers */
const PUBLIC_ADDRESSES = new Set([
  "https://www.w3.org/ns/activitystreams#Public",
  "as:Public",
  "Public",
]);

/**
 * Handler for Announce activities
 *
 * Creates renotes/boosts of existing notes.
 * Will fetch remote notes if not already in local database.
 */
export class AnnounceHandler extends BaseHandler {
  readonly activityType = "Announce";

  /**
   * Get signature configuration for authenticated fetches
   * Uses a local admin user's credentials for signing requests
   */
  private async getSignatureConfig(
    c: import("hono").Context,
    baseUrl: string,
  ): Promise<SignatureConfig | null> {
    try {
      const userRepository = this.getUserRepository(c);

      // Find a local admin user with a private key
      const adminUser = await userRepository.findFirstLocalAdmin();

      if (!adminUser || !adminUser.privateKey) {
        logger.warn("No admin user with private key found for signed fetch");
        return null;
      }

      const keyId = `${baseUrl}/users/${adminUser.username}#main-key`;

      return {
        keyId,
        privateKey: adminUser.privateKey,
      };
    } catch (error) {
      logger.error({ err: error }, "Failed to get signature config");
      return null;
    }
  }

  /**
   * Fetch a remote object, retrying with an HTTP Signature for Authorized Fetch servers.
   *
   * @returns The fetched document and the URL it was served from, or null on failure
   */
  private async fetchRemoteObject(
    url: string,
    c: import("hono").Context,
    baseUrl: string,
  ): Promise<{ data: any; finalUrl: string } | null> {
    const fetchService = new RemoteFetchService();

    // Try unsigned fetch first
    let result = await fetchService.fetchActivityPubObject(url);

    // If failed with 401/403/404, try with HTTP Signature (Authorized Fetch)
    if (
      !result.success &&
      result.error?.statusCode &&
      [401, 403, 404].includes(result.error.statusCode)
    ) {
      logger.debug(
        { noteUri: url, statusCode: result.error.statusCode },
        "Unsigned fetch failed, retrying with HTTP Signature",
      );

      // Get a local user's credentials for signing
      const signatureConfig = await this.getSignatureConfig(c, baseUrl);

      if (signatureConfig) {
        result = await fetchService.fetchActivityPubObject(url, {
          signature: signatureConfig,
        });
      }
    }

    if (!result.success) {
      // 404 errors are common (deleted notes) - log at debug level
      // Other errors (network issues, auth failures) are logged at warn level
      const is404 = result.error?.statusCode === 404;
      const logLevel = is404 ? "debug" : "warn";
      logger[logLevel](
        { noteUri: url, err: result.error },
        is404 ? "Remote note not found (possibly deleted)" : "Failed to fetch remote note",
      );
      return null;
    }

    const finalUrl = result.finalUrl ?? url;
    if (!isSameOrigin(finalUrl, url)) {
      logger.warn({ noteUri: url, finalUrl }, "Remote note served from a different origin");
      return null;
    }

    return { data: result.data, finalUrl };
  }

  /**
   * Derive the renote visibility from the Announce addressing.
   *
   * - Public collection in `to` → public
   * - Public collection in `cc` → home (unlisted)
   * - Otherwise → followers
   */
  private determineRenoteVisibility(activity: Activity): "public" | "home" | "followers" {
    const toArray = (v: unknown): string[] =>
      Array.isArray(v) ? v.filter((x) => typeof x === "string") : typeof v === "string" ? [v] : [];
    const isPublic = (uri: string) => PUBLIC_ADDRESSES.has(uri);

    if (toArray(activity.to).some(isPublic)) return "public";
    if (toArray(activity.cc).some(isPublic)) return "home";
    return "followers";
  }

  async handle(activity: Activity, context: HandlerContext): Promise<HandlerResult> {
    const { c } = context;

    try {
      const objectUri = getObjectUri(activity.object);

      if (!objectUri) {
        this.warn("Invalid Announce activity: missing object");
        return this.failure("Invalid Announce activity: missing object");
      }

      this.log("📥", `Announce: ${activity.actor} → ${objectUri}`);

      const actorUri = this.getActorUri(activity);

      // Announce の id は renote の URI として保存されるため、actor と同一オリジンの
      // http(s) URL のみ許可する (javascript: や他サーバー URI の乗っ取りを防ぐ)
      if (!isHttpUrl(activity.id) || !isSameOrigin(activity.id, actorUri)) {
        this.warn(`Announce rejected: invalid activity id ${String(activity.id)}`);
        return this.failure("Invalid Announce activity: id must be on the actor's origin");
      }

      // Resolve remote actor
      const remoteActor = await this.resolveActor(actorUri, c);

      // Find or fetch the note being announced
      const noteRepository = this.getNoteRepository(c);
      const remoteNoteService = this.getRemoteNoteService(c);
      let targetNote = await noteRepository.findByUri(objectUri);

      // ローカルノートは HTTP で自サーバーを取得せず、ID で直接検索する
      if (!targetNote && isLocalUrl(objectUri)) {
        const localId = new URL(objectUri).pathname.match(/^\/notes\/([^/]+)$/)?.[1];
        targetNote = localId ? await noteRepository.findById(localId) : null;
        if (!targetNote) {
          this.warn(`Local note not found: ${objectUri}`);
          return this.failure(`Local note not found: ${objectUri}`);
        }
      }

      // If note doesn't exist locally, fetch it from remote
      if (!targetNote) {
        this.log("ℹ️", `Target note not found locally, fetching: ${objectUri}`);

        let fetched = await this.fetchRemoteObject(objectUri, c, context.baseUrl);
        if (!fetched) {
          return this.failure(`Failed to fetch remote note: ${objectUri}`);
        }

        let noteObject = fetched.data;
        if (!noteObject || typeof noteObject !== "object" || !isHttpUrl(noteObject.id)) {
          this.warn(`Announce rejected: fetched object has no valid id (${objectUri})`);
          return this.failure("Fetched object id origin does not match requested URI");
        }

        // The fetched document must be the object we asked for. If it claims a
        // different id, refetch it from that id once and require an exact match.
        if (normalizeUrl(noteObject.id) !== normalizeUrl(objectUri)) {
          const canonicalUri: string = noteObject.id;
          this.log("ℹ️", `Fetched id differs (${canonicalUri}), refetching canonical object`);
          fetched = await this.fetchRemoteObject(canonicalUri, c, context.baseUrl);
          noteObject = fetched?.data;
          if (
            !noteObject ||
            typeof noteObject !== "object" ||
            typeof noteObject.id !== "string" ||
            normalizeUrl(noteObject.id) !== normalizeUrl(canonicalUri)
          ) {
            this.warn(`Announce rejected: canonical object id mismatch for ${canonicalUri}`);
            return this.failure("Fetched object id origin does not match requested URI");
          }
        }

        if (isLocalUrl(extractRefUri(noteObject.attributedTo))) {
          this.warn("Announce rejected: fetched object claims a local author");
          return this.failure("Fetched object claims a local author");
        }

        targetNote = await remoteNoteService.processNote(noteObject);
      }

      // 公開範囲の確認: public / home 以外 (followers / specified / localOnly) は renote 不可
      if (
        targetNote.isDeleted ||
        targetNote.localOnly ||
        (targetNote.visibility !== "public" && targetNote.visibility !== "home")
      ) {
        this.warn(`Announce rejected: target note ${targetNote.id} is not publicly renotable`);
        return this.failure("Target note cannot be renoted");
      }

      // Create a renote (quote without text = pure boost)
      const id = this.generateId();
      await noteRepository.create({
        id,
        userId: remoteActor.id,
        text: null, // No text = pure boost
        cw: null,
        visibility: this.determineRenoteVisibility(activity),
        localOnly: false,
        replyId: null,
        renoteId: targetNote.id,
        fileIds: [],
        mentions: [],
        emojis: [],
        tags: [],
        uri: activity.id, // Use the Announce activity ID as the note URI (validated above)
        isDeleted: false,
        deletedAt: null,
        deletedById: null,
        deletionReason: null,
        // Counters use database defaults
      });

      // Increment renote count on target note
      await noteRepository.incrementRenoteCount(targetNote.id);

      this.log(
        "✅",
        `Renote created: ${remoteActor.username}@${remoteActor.host} announced note ${targetNote.id}`,
      );
      return this.success(`Renote created for note ${targetNote.id}`);
    } catch (error) {
      this.error("Failed to handle Announce activity:", error as Error);
      return this.failure("Failed to handle Announce activity", error as Error);
    }
  }
}
