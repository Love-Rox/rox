/**
 * ActivityPub Activity Validation Utilities
 *
 * Provides comprehensive validation for incoming ActivityPub activities.
 * Ensures activities meet specification requirements and security standards.
 *
 * @module utils/activityValidation
 */

import { isHttpUrl, isLocalUrl, isSameOrigin } from "./federationUrl.js";

/**
 * Validation error types
 */
export enum ValidationErrorType {
  MISSING_FIELD = "missing_field",
  INVALID_FORMAT = "invalid_format",
  INVALID_TIMESTAMP = "invalid_timestamp",
  ACTOR_MISMATCH = "actor_mismatch",
  INVALID_URI = "invalid_uri",
}

/**
 * Validation error details
 */
export interface ValidationError {
  type: ValidationErrorType;
  field: string;
  message: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Extract actor URI from activity
 *
 * Handles both string and object format for actor field.
 *
 * @param activity - ActivityPub activity
 * @returns Actor URI or null
 */
export function extractActorUri(activity: any): string | null {
  if (!activity.actor) {
    return null;
  }

  if (typeof activity.actor === "string") {
    return activity.actor;
  }

  if (typeof activity.actor === "object" && activity.actor.id) {
    return activity.actor.id;
  }

  return null;
}

/**
 * Extract object URI from activity
 *
 * Handles both string and object format for object field.
 *
 * @param activity - ActivityPub activity
 * @returns Object URI or null
 */
export function extractObjectUri(activity: any): string | null {
  if (!activity.object) {
    return null;
  }

  if (typeof activity.object === "string") {
    return activity.object;
  }

  if (typeof activity.object === "object" && activity.object.id) {
    return activity.object.id;
  }

  return null;
}

/**
 * Validate URI format
 *
 * Checks if a string is a valid HTTP(S) URI.
 *
 * @param uri - URI string to validate
 * @returns True if valid URI
 */
export function isValidUri(uri: string): boolean {
  try {
    const url = new URL(uri);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Validate timestamp
 *
 * Checks if a timestamp is valid and within acceptable range.
 * Rejects timestamps that are:
 * - Too far in the past (> 24 hours)
 * - In the future (> 1 hour clock skew tolerance)
 *
 * @param timestamp - ISO 8601 timestamp string
 * @returns True if valid
 */
export function isValidTimestamp(timestamp: string): boolean {
  try {
    const date = new Date(timestamp);

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return false;
    }

    const now = Date.now();
    const activityTime = date.getTime();

    // Reject if too old (> 24 hours)
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    if (now - activityTime > maxAge) {
      return false;
    }

    // Reject if too far in the future (> 1 hour clock skew)
    const maxSkew = 60 * 60 * 1000; // 1 hour
    if (activityTime - now > maxSkew) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Validate required fields for activity
 *
 * Checks that all required fields are present based on activity type.
 *
 * @param activity - ActivityPub activity
 * @returns Validation result
 */
export function validateRequiredFields(activity: any): ValidationResult {
  const errors: ValidationError[] = [];

  // All activities must have these fields
  if (!activity.type) {
    errors.push({
      type: ValidationErrorType.MISSING_FIELD,
      field: "type",
      message: "Activity type is required",
    });
  }

  if (!activity.actor) {
    errors.push({
      type: ValidationErrorType.MISSING_FIELD,
      field: "actor",
      message: "Activity actor is required",
    });
  }

  // Validate actor URI format
  const actorUri = extractActorUri(activity);
  if (actorUri && !isValidUri(actorUri)) {
    errors.push({
      type: ValidationErrorType.INVALID_URI,
      field: "actor",
      message: "Actor must be a valid HTTP(S) URI",
    });
  }

  // Activity id (when present) must be an http(s) URI on the actor's origin.
  // Prevents `javascript:` ids and squatting of other servers' activity ids
  // (which are persisted as note URIs and used for deduplication).
  if (activity.id !== undefined && activity.id !== null) {
    if (!isHttpUrl(activity.id) || (actorUri && !isSameOrigin(activity.id, actorUri))) {
      errors.push({
        type: ValidationErrorType.INVALID_URI,
        field: "id",
        message: "Activity id must be an HTTP(S) URI on the actor's origin",
      });
    }
  }

  // Type-specific validation
  switch (activity.type) {
    case "Create":
    case "Update":
    case "Delete":
    case "Announce":
      if (!activity.object) {
        errors.push({
          type: ValidationErrorType.MISSING_FIELD,
          field: "object",
          message: `${activity.type} activity requires an object`,
        });
      }
      break;

    case "Follow":
    case "Like":
      if (!activity.object) {
        errors.push({
          type: ValidationErrorType.MISSING_FIELD,
          field: "object",
          message: `${activity.type} activity requires an object`,
        });
      } else {
        const objectUri = extractObjectUri(activity);
        if (objectUri && !isValidUri(objectUri)) {
          errors.push({
            type: ValidationErrorType.INVALID_URI,
            field: "object",
            message: "Object must be a valid HTTP(S) URI",
          });
        }
      }
      break;

    case "Accept":
    case "Reject":
    case "Undo":
      if (!activity.object) {
        errors.push({
          type: ValidationErrorType.MISSING_FIELD,
          field: "object",
          message: `${activity.type} activity requires an object`,
        });
      }
      // For these types, object should be another activity
      if (activity.object && typeof activity.object === "object" && !activity.object.type) {
        errors.push({
          type: ValidationErrorType.INVALID_FORMAT,
          field: "object",
          message: `${activity.type} activity object must be an activity with a type`,
        });
      }
      break;
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate timestamp fields
 *
 * Checks published and updated timestamps if present.
 *
 * @param activity - ActivityPub activity
 * @returns Validation result
 */
export function validateTimestamps(activity: any): ValidationResult {
  const errors: ValidationError[] = [];

  if (activity.published && !isValidTimestamp(activity.published)) {
    errors.push({
      type: ValidationErrorType.INVALID_TIMESTAMP,
      field: "published",
      message: "Published timestamp is invalid or outside acceptable range",
    });
  }

  if (activity.updated && !isValidTimestamp(activity.updated)) {
    errors.push({
      type: ValidationErrorType.INVALID_TIMESTAMP,
      field: "updated",
      message: "Updated timestamp is invalid or outside acceptable range",
    });
  }

  // Check object timestamps for Create/Update activities
  if (
    (activity.type === "Create" || activity.type === "Update") &&
    typeof activity.object === "object"
  ) {
    if (activity.object.published && !isValidTimestamp(activity.object.published)) {
      errors.push({
        type: ValidationErrorType.INVALID_TIMESTAMP,
        field: "object.published",
        message: "Object published timestamp is invalid or outside acceptable range",
      });
    }

    if (activity.object.updated && !isValidTimestamp(activity.object.updated)) {
      errors.push({
        type: ValidationErrorType.INVALID_TIMESTAMP,
        field: "object.updated",
        message: "Object updated timestamp is invalid or outside acceptable range",
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate actor/signature consistency
 *
 * Ensures that the activity actor is exactly the owner of the key that signed
 * the request, as verified by the signature middleware against the fetched
 * key document. A string prefix comparison between keyId and actor is NOT
 * sufficient (e.g. `.../users/bob2#main-key` or `.../users/bob/../eve#main-key`).
 *
 * Also rejects activities whose actor is on the local host: local users never
 * deliver to our own inbox over HTTP.
 *
 * @param activity - ActivityPub activity
 * @param keyId - KeyId from HTTP Signature
 * @param signatureActor - Key owner verified by the signature middleware
 * @returns Validation result
 */
export function validateActorKeyIdConsistency(
  activity: any,
  keyId: string | undefined,
  signatureActor?: string,
): ValidationResult {
  const errors: ValidationError[] = [];

  const actorUri = extractActorUri(activity);
  if (!actorUri) {
    // Actor validation is handled by validateRequiredFields
    return { valid: true, errors: [] };
  }

  if (isLocalUrl(actorUri)) {
    errors.push({
      type: ValidationErrorType.ACTOR_MISMATCH,
      field: "actor",
      message: "Activity actor must not be a local user",
    });
    return { valid: false, errors };
  }

  if (!keyId && !signatureActor) {
    // If no signature info provided, skip this validation
    // (signature verification middleware should handle this)
    return { valid: true, errors: [] };
  }

  // Exact comparison against the verified key owner
  if (!signatureActor || actorUri !== signatureActor) {
    errors.push({
      type: ValidationErrorType.ACTOR_MISMATCH,
      field: "actor",
      message: "Activity actor does not match signature key owner",
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate complete activity
 *
 * Performs all validation checks on an activity.
 *
 * @param activity - ActivityPub activity
 * @param keyId - Optional keyId from HTTP Signature
 * @param signatureActor - Optional key owner verified by the signature middleware
 * @returns Validation result
 */
export function validateActivity(
  activity: any,
  keyId?: string,
  signatureActor?: string,
): ValidationResult {
  const results: ValidationResult[] = [
    validateRequiredFields(activity),
    validateTimestamps(activity),
    validateActorKeyIdConsistency(activity, keyId, signatureActor),
  ];

  const allErrors = results.flatMap((r) => r.errors);

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
  };
}

/**
 * Format validation errors for HTTP response
 *
 * Creates a user-friendly error message from validation errors.
 *
 * @param errors - Validation errors
 * @returns Error message string
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  if (errors.length === 0) {
    return "Invalid activity";
  }

  if (errors.length === 1) {
    return errors[0]?.message ?? "Invalid activity";
  }

  return `Multiple validation errors: ${errors.map((e) => e.message).join("; ")}`;
}
