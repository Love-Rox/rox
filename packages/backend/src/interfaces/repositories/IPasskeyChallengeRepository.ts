import type { PasskeyChallenge, NewPasskeyChallenge } from "../../db/schema/pg.js";

/**
 * Passkey Challenge Repository Interface
 *
 * Handles temporary storage of WebAuthn challenges during registration and authentication.
 * Challenges are short-lived and should be cleaned up after use or expiration.
 */
export interface IPasskeyChallengeRepository {
  /**
   * Create a new challenge
   *
   * @param challenge - Challenge data to store
   * @returns Created challenge
   */
  create(challenge: NewPasskeyChallenge): Promise<PasskeyChallenge>;

  /**
   * Find challenge by challenge string
   *
   * @param challenge - Base64url-encoded challenge
   * @returns Challenge if found and not expired, null otherwise
   */
  findByChallenge(challenge: string): Promise<PasskeyChallenge | null>;

  /**
   * Delete a challenge after use
   *
   * @param id - Challenge ID
   */
  delete(id: string): Promise<void>;

  /**
   * Delete challenge by challenge string
   *
   * @param challenge - Base64url-encoded challenge
   */
  deleteByChallenge(challenge: string): Promise<void>;

  /**
   * Delete all expired challenges
   * Should be called periodically for cleanup
   *
   * @returns Number of deleted challenges
   */
  deleteExpired(): Promise<number>;
}
