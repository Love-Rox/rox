/**
 * Reject Activity Handler
 *
 * Processes Reject activities (e.g., follow request rejected).
 *
 * @module services/ap/inbox/handlers/RejectHandler
 */

import type { Activity, HandlerContext, HandlerResult } from "../types.js";
import { BaseHandler } from "./BaseHandler.js";

/**
 * Handler for Reject activities
 *
 * Currently a stub - will handle:
 * - Reject Follow: Our follow request was rejected
 */
export class RejectHandler extends BaseHandler {
  readonly activityType = "Reject";

  async handle(activity: Activity, context: HandlerContext): Promise<HandlerResult> {
    const { c } = context;

    try {
      const object = activity.object;

      if (!object || typeof object !== "object") {
        this.warn("Invalid Reject activity: missing or invalid object");
        return this.failure("Invalid Reject activity: missing or invalid object");
      }

      const actorUri = this.getActorUri(activity);
      const remoteActor = await this.resolveActor(actorUri, c);

      const objectType = (object as { type?: string }).type;

      // Handle Reject Follow (our follow request was rejected)
      if (objectType === "Follow") {
        this.log(
          "📥",
          `Reject Follow: ${remoteActor.username}@${remoteActor.host} rejected our follow request`,
        );

        // Get the Follow object to find who sent it
        const followObject = object as { actor?: string; object?: string };
        const followerUri = followObject.actor;

        if (!followerUri) {
          this.warn("Reject Follow: missing actor in Follow object");
          return this.failure("Invalid Reject Follow: missing actor");
        }

        // Find the local user who was trying to follow
        const userRepository = c.get("userRepository");
        const followRepository = c.get("followRepository");

        // Extract username from follower URI (our local user)
        const localUser = await this.findLocalUserFromUri(followerUri, userRepository, context.baseUrl);

        if (localUser) {
          // Delete the follow relationship since it was rejected
          // Note: delete() returns void, so we just call it and assume success
          await followRepository.delete(localUser.id, remoteActor.id);

          this.log(
            "✅",
            `Follow rejected: removed follow from ${localUser.username} to ${remoteActor.username}@${remoteActor.host}`,
          );
          return this.success("Follow rejected and removed");
        } else {
          this.warn(`Could not find local user for URI: ${followerUri}`);
          return this.failure("Could not find local user");
        }
      }

      this.log("ℹ️", `Unsupported Reject object type: ${objectType}`);
      return this.success(`Unsupported Reject object type: ${objectType}`);
    } catch (error) {
      this.error("Failed to handle Reject activity:", error as Error);
      return this.failure("Failed to handle Reject activity", error as Error);
    }
  }

  /**
   * Find local user from their ActivityPub URI
   *
   * @param uri - The user's ActivityPub URI
   * @param userRepository - User repository instance
   * @param baseUrl - The instance base URL
   */
  private async findLocalUserFromUri(
    uri: string,
    userRepository: any,
    baseUrl: string,
  ): Promise<{ id: string; username: string } | null> {
    // Local user URIs are typically: https://domain/users/username
    if (!uri.startsWith(baseUrl)) {
      return null;
    }

    const match = uri.match(/\/users\/([^/]+)$/);
    if (!match) {
      return null;
    }

    const username = match[1];
    return await userRepository.findByUsername(username, null);
  }
}
