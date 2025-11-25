/**
 * ActivityPub Inbox Routes
 *
 * Handles incoming ActivityPub activities from remote servers.
 * Implements server-to-server (S2S) ActivityPub protocol.
 *
 * @module routes/ap/inbox
 */

import { Hono } from 'hono';
import type { Context } from 'hono';
import { verifySignatureMiddleware } from '../../middleware/verifySignature.js';
import { RemoteActorService } from '../../services/ap/RemoteActorService.js';
import { ActivityDeliveryService } from '../../services/ap/ActivityDeliveryService.js';
import { RemoteNoteService } from '../../services/ap/RemoteNoteService.js';
import { RemoteFetchService } from '../../services/ap/RemoteFetchService.js';
import { getDatabase } from '../../db/index.js';
import { receivedActivities } from '../../db/schema/pg.js';
import {
  validateActivity,
  formatValidationErrors,
  ValidationErrorType,
} from '../../utils/activityValidation.js';

const inbox = new Hono();

/**
 * POST /users/:username/inbox
 *
 * Receives ActivityPub activities from remote servers.
 * All requests must be signed with HTTP Signatures.
 *
 * @param username - Username of the recipient
 * @returns 202 Accepted (activity queued for processing)
 *
 * @example
 * ```bash
 * curl -X POST https://example.com/users/alice/inbox \
 *   -H "Content-Type: application/activity+json" \
 *   -H "Signature: ..." \
 *   -d '{"type":"Follow","actor":"...","object":"..."}'
 * ```
 */
inbox.post('/users/:username/inbox', verifySignatureMiddleware, async (c: Context) => {
  const { username } = c.req.param();

  // Verify recipient exists
  const userRepository = c.get('userRepository');
  const user = await userRepository.findByUsername(username as string);

  if (!user || user.host !== null) {
    return c.notFound();
  }

  // Parse activity
  let activity: any;
  try {
    // Body may have been pre-read by signature verification middleware
    const preReadBody = c.get('requestBody');
    if (preReadBody) {
      activity = JSON.parse(preReadBody);
    } else {
      activity = await c.req.json();
    }
  } catch (error) {
    console.error('Failed to parse activity JSON:', error);
    return c.json({ error: 'Invalid JSON' }, 400);
  }

  // Enhanced activity validation
  const signatureKeyId = c.get('signatureKeyId');
  const validationResult = validateActivity(activity, signatureKeyId);

  if (!validationResult.valid) {
    console.warn('Activity validation failed:', {
      activity: activity.type,
      actor: activity.actor,
      errors: validationResult.errors,
    });

    // Determine appropriate status code based on error type
    const hasAuthError = validationResult.errors.some(
      e => e.type === ValidationErrorType.ACTOR_MISMATCH
    );
    const statusCode = hasAuthError ? 401 : 422; // Unprocessable Entity

    return c.json(
      {
        error: 'Validation failed',
        message: formatValidationErrors(validationResult.errors),
        details: validationResult.errors,
      },
      statusCode
    );
  }

  console.log(`📥 Inbox: Received ${activity.type} from ${activity.actor} for ${username}`);

  // Check for duplicate activity (deduplication)
  const activityId = activity.id;
  if (activityId) {
    try {
      const db = getDatabase();
      const { eq } = await import('drizzle-orm');

      // Check if we've already received this activity
      const existing = await db
        .select()
        .from(receivedActivities)
        .where(eq(receivedActivities.activityId, activityId))
        .limit(1);

      if (existing.length > 0) {
        console.log(`⚠️  Duplicate activity detected (ID: ${activityId}), skipping`);
        return c.json({ status: 'accepted' }, 202);
      }

      // Record this activity as received
      await db.insert(receivedActivities).values({
        activityId,
        receivedAt: new Date(),
      });
    } catch (error) {
      console.error('Deduplication check failed:', error);
      // Continue processing even if deduplication fails
    }
  }

  // Handle activity based on type
  try {
    await handleActivity(c, activity, user.id);
  } catch (error) {
    console.error('Activity handling error:', error);
    // Return 202 even on errors (don't reveal internal errors to remote servers)
  }

  // Always return 202 Accepted
  return c.json({ status: 'accepted' }, 202);
});

/**
 * Handle incoming activity
 *
 * Routes activity to appropriate handler based on type.
 *
 * @param c - Hono context
 * @param activity - ActivityPub activity
 * @param recipientId - Local user ID
 */
async function handleActivity(c: Context, activity: any, recipientId: string): Promise<void> {
  switch (activity.type) {
    case 'Follow':
      await handleFollow(c, activity, recipientId);
      break;

    case 'Accept':
      await handleAccept(c, activity, recipientId);
      break;

    case 'Reject':
      await handleReject(c, activity, recipientId);
      break;

    case 'Create':
      await handleCreate(c, activity, recipientId);
      break;

    case 'Update':
      await handleUpdate(c, activity, recipientId);
      break;

    case 'Delete':
      await handleDelete(c, activity, recipientId);
      break;

    case 'Like':
      await handleLike(c, activity, recipientId);
      break;

    case 'Announce':
      await handleAnnounce(c, activity, recipientId);
      break;

    case 'Undo':
      await handleUndo(c, activity, recipientId);
      break;

    default:
      console.log(`Unsupported activity type: ${activity.type}`);
  }
}

/**
 * Handle Follow activity
 *
 * Processes incoming follow requests from remote users.
 * Creates a follow relationship and sends an Accept activity back.
 */
async function handleFollow(c: Context, activity: any, recipientId: string): Promise<void> {
  try {
    // Resolve remote actor
    const userRepository = c.get('userRepository');
    const remoteActorService = new RemoteActorService(userRepository);

    const actorUri = typeof activity.actor === 'string' ? activity.actor : activity.actor.id;
    const remoteActor = await remoteActorService.resolveActor(actorUri);

    console.log(`📥 Follow: ${remoteActor.username}@${remoteActor.host} → recipient ${recipientId}`);

    // Check if follow already exists
    const followRepository = c.get('followRepository');
    const alreadyFollowing = await followRepository.exists(remoteActor.id, recipientId);

    if (alreadyFollowing) {
      console.log(`⚠️  Follow already exists, skipping`);
      return;
    }

    // Create follow relationship
    const { generateId } = await import('shared');
    await followRepository.create({
      id: generateId(),
      followerId: remoteActor.id,
      followeeId: recipientId,
    });

    console.log(`✅ Follow created: ${remoteActor.username}@${remoteActor.host} → recipient`);

    // Send Accept activity back to remote server
    const recipient = await userRepository.findById(recipientId);
    if (!recipient || !recipient.privateKey) {
      console.error('Recipient not found or missing private key');
      return;
    }

    const baseUrl = process.env.URL || 'http://localhost:3000';
    const recipientUri = `${baseUrl}/users/${recipient.username}`;
    const keyId = `${recipientUri}#main-key`;

    const deliveryService = new ActivityDeliveryService();
    const acceptActivity = deliveryService.createAcceptActivity(activity, recipientUri);

    if (!remoteActor.inbox) {
      console.error('Remote actor has no inbox URL');
      return;
    }

    await deliveryService.deliver(
      acceptActivity,
      remoteActor.inbox,
      keyId,
      recipient.privateKey
    );

    console.log(`📤 Accept activity sent to ${remoteActor.inbox}`);
  } catch (error) {
    console.error('Failed to handle Follow activity:', error);
    throw error;
  }
}

/**
 * Handle Accept activity
 *
 * Processes acceptance of follow requests.
 */
async function handleAccept(c: Context, activity: any, _recipientId: string): Promise<void> {
  try {
    const object = activity.object;

    if (!object || typeof object !== 'object') {
      console.warn('Invalid Accept activity: missing or invalid object');
      return;
    }

    const userRepository = c.get('userRepository');
    const remoteActorService = new RemoteActorService(userRepository);

    const actorUri = typeof activity.actor === 'string' ? activity.actor : activity.actor.id;
    const remoteActor = await remoteActorService.resolveActor(actorUri);

    // Handle Accept Follow (our follow request was accepted)
    if (object.type === 'Follow') {
      console.log(`📥 Accept Follow: ${remoteActor.username}@${remoteActor.host} accepted our follow request`);

      // In the current implementation, follows are created immediately when we send the Follow activity.
      // The Accept just confirms it was successful.
      // Future enhancement: track pending follow requests and only finalize on Accept.

      console.log(`✅ Follow confirmed: now following ${remoteActor.username}@${remoteActor.host}`);
    } else {
      console.log(`Unsupported Accept object type: ${object.type}`);
    }
  } catch (error) {
    console.error('Failed to handle Accept activity:', error);
    throw error;
  }
}

/**
 * Handle Reject activity
 *
 * Processes rejection of follow requests.
 */
async function handleReject(_c: Context, _activity: any, _recipientId: string): Promise<void> {
  console.log('TODO: Implement Reject handler');
}

/**
 * Handle Create activity
 *
 * Processes creation of new objects (notes, etc).
 * Stores remote posts in the local database.
 */
async function handleCreate(c: Context, activity: any, _recipientId: string): Promise<void> {
  try {
    // Extract object from activity
    const object = activity.object;

    if (!object || typeof object !== 'object') {
      console.warn('Invalid Create activity: missing or invalid object');
      return;
    }

    // Only handle Note objects for now
    if (object.type !== 'Note' && object.type !== 'Article') {
      console.log(`Unsupported object type: ${object.type}`);
      return;
    }

    console.log(`📥 Create: Receiving ${object.type} from ${activity.actor}`);

    // Process the note
    const noteRepository = c.get('noteRepository');
    const userRepository = c.get('userRepository');

    const remoteNoteService = new RemoteNoteService(noteRepository, userRepository);
    const note = await remoteNoteService.processNote(object);

    console.log(`✅ Note created: ${note.id} (URI: ${note.uri})`);
  } catch (error) {
    console.error('Failed to handle Create activity:', error);
    throw error;
  }
}

/**
 * Handle Update activity
 *
 * Processes updates to existing objects.
 */
async function handleUpdate(c: Context, activity: any, _recipientId: string): Promise<void> {
  try {
    const object = activity.object;
    if (!object || typeof object !== 'object') {
      console.warn('Invalid Update activity: missing or invalid object');
      return;
    }

    const userRepository = c.get('userRepository');
    const remoteActorService = new RemoteActorService(userRepository);
    const actorUri = typeof activity.actor === 'string' ? activity.actor : activity.actor.id;
    const remoteActor = await remoteActorService.resolveActor(actorUri);

    // Handle Person update (profile update)
    if (object.type === 'Person' || object.type === 'Service' || object.type === 'Application') {
      const objectUri = object.id;
      if (!objectUri) {
        console.warn('Invalid Update Person: missing object id');
        return;
      }

      // Verify the actor is updating their own profile
      if (objectUri !== actorUri) {
        console.warn(`Actor ${actorUri} cannot update another actor ${objectUri}`);
        return;
      }

      console.log(`📥 Update Person: ${remoteActor.username}@${remoteActor.host}`);

      // Extract profile fields from the Person object
      const updateData: Record<string, any> = {};
      
      if (object.name !== undefined) {
        updateData.name = object.name || null;
      }
      if (object.summary !== undefined) {
        updateData.description = object.summary || null;
      }
      if (object.icon && typeof object.icon === 'object' && object.icon.url) {
        updateData.avatarUrl = object.icon.url;
      } else if (object.icon && typeof object.icon === 'string') {
        updateData.avatarUrl = object.icon;
      }
      if (object.image && typeof object.image === 'object' && object.image.url) {
        updateData.bannerUrl = object.image.url;
      } else if (object.image && typeof object.image === 'string') {
        updateData.bannerUrl = object.image;
      }
      if (object.publicKey && object.publicKey.publicKeyPem) {
        updateData.publicKey = object.publicKey.publicKeyPem;
      }

      if (Object.keys(updateData).length > 0) {
        await userRepository.update(remoteActor.id, updateData);
        console.log(`✅ Profile updated: ${remoteActor.username}@${remoteActor.host}`, Object.keys(updateData));
      } else {
        console.log(`ℹ️ No profile fields to update for ${remoteActor.username}@${remoteActor.host}`);
      }
      return;
    }

    // Handle Note update (note edit)
    if (object.type === 'Note') {
      const noteUri = object.id;
      if (!noteUri) {
        console.warn('Invalid Update Note: missing object id');
        return;
      }

      console.log(`📥 Update Note: ${remoteActor.username}@${remoteActor.host} → ${noteUri}`);

      const noteRepository = c.get('noteRepository');
      const note = await noteRepository.findByUri(noteUri);

      if (!note) {
        console.warn(`Note not found: ${noteUri}`);
        return;
      }

      // Verify the actor owns the note
      if (note.userId !== remoteActor.id) {
        console.warn(`Actor ${remoteActor.id} does not own note ${note.id}`);
        return;
      }

      // Extract note fields
      const updateData: Record<string, any> = {};
      
      if (object.content !== undefined) {
        updateData.text = object.content || '';
      }
      if (object.summary !== undefined) {
        updateData.cw = object.summary || null;
      }

      if (Object.keys(updateData).length > 0) {
        await noteRepository.update(note.id, updateData);
        console.log(`✅ Note updated: ${note.id}`, Object.keys(updateData));
      } else {
        console.log(`ℹ️ No note fields to update for ${note.id}`);
      }
      return;
    }

    console.log(`Unsupported Update object type: ${object.type}`);
  } catch (error) {
    console.error('Failed to handle Update activity:', error);
    throw error;
  }
}

/**
 * Handle Delete activity
 *
 * Processes deletion of objects.
 */
async function handleDelete(c: Context, activity: any, _recipientId: string): Promise<void> {
  try {
    const object = activity.object;

    // Get the object URI - can be string or object with id
    let objectUri: string;
    if (typeof object === 'string') {
      objectUri = object;
    } else if (object && typeof object === 'object') {
      objectUri = object.id;
    } else {
      console.warn('Invalid Delete activity: missing or invalid object');
      return;
    }

    if (!objectUri) {
      console.warn('Invalid Delete activity: missing object URI');
      return;
    }

    const userRepository = c.get('userRepository');
    const remoteActorService = new RemoteActorService(userRepository);

    const actorUri = typeof activity.actor === 'string' ? activity.actor : activity.actor.id;
    const remoteActor = await remoteActorService.resolveActor(actorUri);

    console.log(`📥 Delete: ${remoteActor.username}@${remoteActor.host} → ${objectUri}`);

    // Try to find and delete the note
    const noteRepository = c.get('noteRepository');
    const note = await noteRepository.findByUri(objectUri);

    if (note) {
      // Verify the actor owns this note
      if (note.userId !== remoteActor.id) {
        console.warn(`Actor ${remoteActor.id} does not own note ${note.id}`);
        return;
      }

      // Delete the note
      await noteRepository.delete(note.id);
      console.log(`✅ Note deleted: ${remoteActor.username}@${remoteActor.host} deleted note ${note.id}`);
      return;
    }

    // If not a note, it might be an actor deletion (account deletion)
    // For now, log and ignore actor deletions
    console.log(`Delete target not found or not supported: ${objectUri}`);
  } catch (error) {
    console.error('Failed to handle Delete activity:', error);
    throw error;
  }
}

/**
 * Handle Like activity
 *
 * Processes likes/reactions to posts from remote users.
 */
async function handleLike(c: Context, activity: any, _recipientId: string): Promise<void> {
  try {
    // Extract object (the note being liked)
    const objectUri = typeof activity.object === 'string' ? activity.object : activity.object?.id;

    if (!objectUri) {
      console.warn('Invalid Like activity: missing object');
      return;
    }

    console.log(`📥 Like: ${activity.actor} → ${objectUri}`);

    // Resolve remote actor
    const userRepository = c.get('userRepository');
    const remoteActorService = new RemoteActorService(userRepository);

    const actorUri = typeof activity.actor === 'string' ? activity.actor : activity.actor.id;
    const remoteActor = await remoteActorService.resolveActor(actorUri);

    // Find the note being liked
    const noteRepository = c.get('noteRepository');
    const note = await noteRepository.findByUri(objectUri);

    if (!note) {
      console.warn(`Note not found: ${objectUri}`);
      return;
    }

    // Check if reaction already exists
    const reactionRepository = c.get('reactionRepository');
    const existingReaction = await reactionRepository.findByUserNoteAndReaction(
      remoteActor.id,
      note.id,
      '❤️' // Default to heart emoji for ActivityPub Like
    );

    if (existingReaction) {
      console.log(`⚠️  Reaction already exists, skipping`);
      return;
    }

    // Create reaction
    const { generateId } = await import('shared');
    await reactionRepository.create({
      id: generateId(),
      userId: remoteActor.id,
      noteId: note.id,
      reaction: '❤️', // ActivityPub Like maps to heart emoji
    });

    console.log(`✅ Reaction created: ${remoteActor.username}@${remoteActor.host} ❤️ note ${note.id}`);
  } catch (error) {
    console.error('Failed to handle Like activity:', error);
    throw error;
  }
}

/**
 * Handle Announce activity
 *
 * Processes boosts/reblogs/renotes from remote users.
 */
async function handleAnnounce(c: Context, activity: any, _recipientId: string): Promise<void> {
  try {
    // Extract object (the note being announced/boosted)
    const objectUri = typeof activity.object === 'string' ? activity.object : activity.object?.id;

    if (!objectUri) {
      console.warn('Invalid Announce activity: missing object');
      return;
    }

    console.log(`📥 Announce: ${activity.actor} → ${objectUri}`);

    // Resolve remote actor
    const userRepository = c.get('userRepository');
    const remoteActorService = new RemoteActorService(userRepository);

    const actorUri = typeof activity.actor === 'string' ? activity.actor : activity.actor.id;
    const remoteActor = await remoteActorService.resolveActor(actorUri);

    // Find or fetch the note being announced
    const noteRepository = c.get('noteRepository');
    let targetNote = await noteRepository.findByUri(objectUri);

    // If note doesn't exist locally, fetch it from remote
    if (!targetNote) {
      console.log(`Target note not found locally, fetching: ${objectUri}`);
      const remoteNoteService = new RemoteNoteService(noteRepository, userRepository);
      const fetchService = new RemoteFetchService();

      // Fetch the remote note object with retry logic
      const result = await fetchService.fetchActivityPubObject(objectUri);

      if (!result.success) {
        console.warn(`Failed to fetch remote note: ${objectUri}`, result.error);
        return;
      }

      const noteObject = result.data as any;
      targetNote = await remoteNoteService.processNote(noteObject);
    }

    // Create a renote (quote without text = pure boost)
    const { generateId } = await import('shared');
    await noteRepository.create({
      id: generateId(),
      userId: remoteActor.id,
      text: null, // No text = pure boost
      cw: null,
      visibility: 'public',
      localOnly: false,
      replyId: null,
      renoteId: targetNote.id,
      fileIds: [],
      mentions: [],
      emojis: [],
      tags: [],
      uri: activity.id, // Use the Announce activity ID as the note URI
    });

    console.log(`✅ Renote created: ${remoteActor.username}@${remoteActor.host} announced note ${targetNote.id}`);
  } catch (error) {
    console.error('Failed to handle Announce activity:', error);
    throw error;
  }
}

/**
 * Handle Undo activity
 *
 * Processes undo operations (unfollow, unlike, etc).
 */
async function handleUndo(c: Context, activity: any, recipientId: string): Promise<void> {
  try {
    const object = activity.object;

    if (!object || typeof object !== 'object') {
      console.warn('Invalid Undo activity: missing or invalid object');
      return;
    }

    const userRepository = c.get('userRepository');
    const remoteActorService = new RemoteActorService(userRepository);

    const actorUri = typeof activity.actor === 'string' ? activity.actor : activity.actor.id;
    const remoteActor = await remoteActorService.resolveActor(actorUri);

    // Handle Undo Follow (unfollow)
    if (object.type === 'Follow') {
      console.log(`📥 Undo Follow: ${remoteActor.username}@${remoteActor.host} → recipient ${recipientId}`);

      // Delete follow relationship
      const followRepository = c.get('followRepository');
      await followRepository.delete(remoteActor.id, recipientId);

      console.log(`✅ Follow deleted: ${remoteActor.username}@${remoteActor.host} unfollowed recipient`);
    }
    // Handle Undo Like (unlike)
    else if (object.type === 'Like') {
      const objectUri = typeof object.object === 'string' ? object.object : object.object?.id;

      if (!objectUri) {
        console.warn('Invalid Undo Like: missing object');
        return;
      }

      console.log(`📥 Undo Like: ${remoteActor.username}@${remoteActor.host} → ${objectUri}`);

      // Find the note
      const noteRepository = c.get('noteRepository');
      const note = await noteRepository.findByUri(objectUri);

      if (!note) {
        console.warn(`Note not found: ${objectUri}`);
        return;
      }

      // Delete reaction
      const reactionRepository = c.get('reactionRepository');
      await reactionRepository.deleteByUserNoteAndReaction(remoteActor.id, note.id, '❤️');

      console.log(`✅ Reaction deleted: ${remoteActor.username}@${remoteActor.host} unliked note ${note.id}`);
    }
    // Handle Undo Announce (unboost/unrenote)
    else if (object.type === 'Announce') {
      const announceUri = object.id;

      if (!announceUri) {
        console.warn('Invalid Undo Announce: missing object id');
        return;
      }

      console.log(`📥 Undo Announce: ${remoteActor.username}@${remoteActor.host} → ${announceUri}`);

      // Find the renote by URI (the Announce activity URI is stored as the note's uri)
      const noteRepository = c.get('noteRepository');
      const renote = await noteRepository.findByUri(announceUri);

      if (!renote) {
        console.warn(`Renote not found: ${announceUri}`);
        return;
      }

      // Verify the actor owns this renote
      if (renote.userId !== remoteActor.id) {
        console.warn(`Actor ${remoteActor.id} does not own renote ${renote.id}`);
        return;
      }

      // Delete the renote
      await noteRepository.delete(renote.id);

      console.log(`✅ Renote deleted: ${remoteActor.username}@${remoteActor.host} unannounced note`);
    } else {
      console.log(`Unsupported Undo object type: ${object.type}`);
    }
  } catch (error) {
    console.error('Failed to handle Undo activity:', error);
    throw error;
  }
}

export default inbox;
