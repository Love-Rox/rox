import type { PasskeyCredential, NewPasskeyCredential } from "../../db/schema/pg.js";

/**
 * Passkey Credential Repository Interface
 *
 * Handles WebAuthn credential storage and retrieval for passkey authentication.
 * Each user can have multiple passkeys registered.
 */
export interface IPasskeyCredentialRepository {
  /**
   * Create a new passkey credential
   *
   * @param credential - Credential data to store
   * @returns Created credential
   */
  create(credential: NewPasskeyCredential): Promise<PasskeyCredential>;

  /**
   * Find credential by ID
   *
   * @param id - Credential primary key ID
   * @returns Credential if found, null otherwise
   */
  findById(id: string): Promise<PasskeyCredential | null>;

  /**
   * Find credential by WebAuthn credential ID
   *
   * @param credentialId - Base64url-encoded WebAuthn credential ID
   * @returns Credential if found, null otherwise
   */
  findByCredentialId(credentialId: string): Promise<PasskeyCredential | null>;

  /**
   * Find all credentials for a user
   *
   * @param userId - User ID
   * @returns Array of credentials registered to the user
   */
  findByUserId(userId: string): Promise<PasskeyCredential[]>;

  /**
   * Update credential counter after successful authentication
   * Important for detecting cloned authenticators
   *
   * @param id - Credential ID
   * @param counter - New counter value
   * @param lastUsedAt - Timestamp of last use
   * @returns Updated credential
   */
  updateCounter(id: string, counter: number, lastUsedAt: Date): Promise<PasskeyCredential>;

  /**
   * Update credential name (user-friendly label)
   *
   * @param id - Credential ID
   * @param name - New name for the credential
   * @returns Updated credential
   */
  updateName(id: string, name: string): Promise<PasskeyCredential>;

  /**
   * Delete a credential
   *
   * @param id - Credential ID
   */
  delete(id: string): Promise<void>;

  /**
   * Delete all credentials for a user
   *
   * @param userId - User ID
   */
  deleteByUserId(userId: string): Promise<void>;

  /**
   * Count credentials for a user
   *
   * @param userId - User ID
   * @returns Number of registered credentials
   */
  countByUserId(userId: string): Promise<number>;
}
