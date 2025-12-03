/**
 * Passkey (WebAuthn) Service
 *
 * Handles WebAuthn registration and authentication flows using
 * the @simplewebauthn/server library.
 *
 * @module services/PasskeyService
 */

import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type VerifiedRegistrationResponse,
  type VerifiedAuthenticationResponse,
} from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import type { AuthenticatorTransportFuture } from "@simplewebauthn/types";
import type { IPasskeyCredentialRepository } from "../interfaces/repositories/IPasskeyCredentialRepository.js";
import type { IPasskeyChallengeRepository } from "../interfaces/repositories/IPasskeyChallengeRepository.js";
import type { IUserRepository } from "../interfaces/repositories/IUserRepository.js";
import type { ISessionRepository } from "../interfaces/repositories/ISessionRepository.js";
import type { PasskeyCredential } from "../db/schema/pg.js";
import type { Session, User } from "shared";
import { generateId } from "shared";
import { generateSessionToken, calculateSessionExpiry } from "../utils/session.js";

/**
 * WebAuthn credential response types from browser
 */
interface RegistrationCredential {
  id: string;
  rawId: string;
  type: string;
  response: {
    clientDataJSON: string;
    attestationObject: string;
  };
}

interface AuthenticationCredential {
  id: string;
  rawId: string;
  type: string;
  response: {
    clientDataJSON: string;
    authenticatorData: string;
    signature: string;
    userHandle: string | null;
  };
}

/**
 * Registration options returned to browser
 */
interface RegistrationOptionsResponse {
  challenge: string;
  userId: string;
  rp: {
    id: string;
    name: string;
  };
  user: {
    id: string;
    name: string;
    displayName: string;
  };
  pubKeyCredParams: Array<{ type: "public-key"; alg: number }>;
  timeout: number;
  authenticatorSelection: {
    authenticatorAttachment?: string;
    residentKey: string;
    userVerification: string;
  };
  attestation: string;
  excludeCredentials: Array<{
    id: string;
    type: "public-key";
    transports?: string[];
  }>;
}

/**
 * Authentication options returned to browser
 */
interface AuthenticationOptionsResponse {
  challenge: string;
  allowCredentials?: Array<{
    id: string;
    type: "public-key";
    transports?: string[];
  }>;
  timeout: number;
  rpId: string;
  userVerification: string;
}

/**
 * PasskeyService
 *
 * Manages WebAuthn/Passkey registration and authentication flows.
 */
export class PasskeyService {
  private rpID: string;
  private rpName: string;
  private origin: string;

  constructor(
    private passkeyCredentialRepository: IPasskeyCredentialRepository,
    private passkeyChallengeRepository: IPasskeyChallengeRepository,
    private userRepository: IUserRepository,
    private sessionRepository: ISessionRepository,
  ) {
    // Get RP configuration from environment
    const url = process.env.URL || "http://localhost:3000";
    const urlObj = new URL(url);
    this.rpID = urlObj.hostname;
    this.rpName = "Rox";
    this.origin = url;
  }

  /**
   * Generate registration options for a user
   * Used when a logged-in user wants to add a passkey
   *
   * @param userId - The user's ID
   * @returns Registration options to pass to browser
   */
  async generateRegistrationOptions(userId: string): Promise<RegistrationOptionsResponse> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Get existing passkeys to exclude
    const existingPasskeys = await this.passkeyCredentialRepository.findByUserId(userId);

    const options = await generateRegistrationOptions({
      rpName: this.rpName,
      rpID: this.rpID,
      userName: user.username,
      userDisplayName: user.displayName || user.username,
      attestationType: "none", // Don't require attestation
      excludeCredentials: existingPasskeys.map((passkey) => ({
        id: passkey.credentialId,
        transports: (passkey.transports as AuthenticatorTransportFuture[]) || undefined,
      })),
      authenticatorSelection: {
        residentKey: "required", // Required for passkeys
        userVerification: "preferred",
        authenticatorAttachment: "platform", // Prefer platform authenticators
      },
      timeout: 60000,
    });

    // Store challenge for verification
    const challengeExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    await this.passkeyChallengeRepository.create({
      id: generateId(),
      challenge: options.challenge,
      userId,
      type: "registration",
      expiresAt: challengeExpiry,
    });

    return {
      challenge: options.challenge,
      userId: options.user.id,
      rp: {
        id: this.rpID,
        name: this.rpName,
      },
      user: {
        id: options.user.id,
        name: user.username,
        displayName: user.displayName || user.username,
      },
      pubKeyCredParams: options.pubKeyCredParams as Array<{ type: "public-key"; alg: number }>,
      timeout: options.timeout || 60000,
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        residentKey: "required",
        userVerification: "preferred",
      },
      attestation: "none",
      excludeCredentials: existingPasskeys.map((passkey) => ({
        id: passkey.credentialId,
        type: "public-key" as const,
        transports: passkey.transports as string[] | undefined,
      })),
    };
  }

  /**
   * Verify and store registration response
   *
   * @param userId - The user's ID
   * @param credential - The credential from browser
   * @param name - Optional name for the passkey
   * @returns The created passkey credential
   */
  async verifyRegistration(
    userId: string,
    credential: RegistrationCredential,
    name?: string,
  ): Promise<PasskeyCredential> {
    // We need to decode clientDataJSON to get the challenge
    const clientDataJSON = JSON.parse(
      Buffer.from(credential.response.clientDataJSON, "base64url").toString("utf-8"),
    );
    const challenge = clientDataJSON.challenge;

    const storedChallenge = await this.passkeyChallengeRepository.findByChallenge(challenge);
    if (!storedChallenge || storedChallenge.userId !== userId) {
      throw new Error("Invalid or expired challenge");
    }

    // Build the response object for verification
    const response = {
      id: credential.id,
      rawId: credential.rawId,
      type: credential.type as "public-key",
      response: {
        clientDataJSON: credential.response.clientDataJSON,
        attestationObject: credential.response.attestationObject,
      },
      clientExtensionResults: {},
    };

    let verification: VerifiedRegistrationResponse;
    try {
      verification = await verifyRegistrationResponse({
        response,
        expectedChallenge: challenge,
        expectedOrigin: this.origin,
        expectedRPID: this.rpID,
        requireUserVerification: false, // Be lenient for better UX
      });
    } catch (error) {
      // Clean up challenge
      await this.passkeyChallengeRepository.deleteByChallenge(challenge);
      throw new Error(`Verification failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }

    if (!verification.verified || !verification.registrationInfo) {
      await this.passkeyChallengeRepository.deleteByChallenge(challenge);
      throw new Error("Registration verification failed");
    }

    const { credential: verifiedCredential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

    // Store the credential
    const passkeyCredential = await this.passkeyCredentialRepository.create({
      id: generateId(),
      userId,
      credentialId: verifiedCredential.id,
      publicKey: isoBase64URL.fromBuffer(verifiedCredential.publicKey),
      counter: verifiedCredential.counter,
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
      transports: verifiedCredential.transports || [],
      name: name || `Passkey ${new Date().toLocaleDateString()}`,
    });

    // Clean up challenge
    await this.passkeyChallengeRepository.deleteByChallenge(challenge);

    return passkeyCredential;
  }

  /**
   * Generate authentication options
   * Can be called with or without a username
   *
   * @param username - Optional username to filter credentials
   * @returns Authentication options to pass to browser
   */
  async generateAuthenticationOptions(username?: string): Promise<AuthenticationOptionsResponse> {
    let allowCredentials: Array<{ id: string; transports?: AuthenticatorTransportFuture[] }> | undefined;

    if (username) {
      const user = await this.userRepository.findByUsername(username);
      if (user) {
        const passkeys = await this.passkeyCredentialRepository.findByUserId(user.id);
        if (passkeys.length > 0) {
          allowCredentials = passkeys.map((passkey) => ({
            id: passkey.credentialId,
            transports: (passkey.transports as AuthenticatorTransportFuture[]) || undefined,
          }));
        }
      }
    }

    const options = await generateAuthenticationOptions({
      rpID: this.rpID,
      allowCredentials,
      userVerification: "preferred",
      timeout: 60000,
    });

    // Store challenge for verification
    const challengeExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    await this.passkeyChallengeRepository.create({
      id: generateId(),
      challenge: options.challenge,
      userId: null, // Authentication doesn't require pre-known user
      type: "authentication",
      expiresAt: challengeExpiry,
    });

    return {
      challenge: options.challenge,
      allowCredentials: allowCredentials?.map((cred) => ({
        id: cred.id,
        type: "public-key" as const,
        transports: cred.transports as string[] | undefined,
      })),
      timeout: options.timeout || 60000,
      rpId: this.rpID,
      userVerification: "preferred",
    };
  }

  /**
   * Verify authentication response and create session
   *
   * @param credential - The credential from browser
   * @returns User and session if authentication successful
   */
  async verifyAuthentication(credential: AuthenticationCredential): Promise<{ user: User; session: Session }> {
    // Decode clientDataJSON to get the challenge
    const clientDataJSON = JSON.parse(
      Buffer.from(credential.response.clientDataJSON, "base64url").toString("utf-8"),
    );
    const challenge = clientDataJSON.challenge;

    const storedChallenge = await this.passkeyChallengeRepository.findByChallenge(challenge);
    if (!storedChallenge) {
      throw new Error("Invalid or expired challenge");
    }

    // Find the passkey by credential ID
    const passkey = await this.passkeyCredentialRepository.findByCredentialId(credential.id);
    if (!passkey) {
      await this.passkeyChallengeRepository.deleteByChallenge(challenge);
      throw new Error("Passkey not found");
    }

    // Get the user
    const user = await this.userRepository.findById(passkey.userId);
    if (!user) {
      await this.passkeyChallengeRepository.deleteByChallenge(challenge);
      throw new Error("User not found");
    }

    // Check if user is suspended
    if (user.isSuspended) {
      await this.passkeyChallengeRepository.deleteByChallenge(challenge);
      throw new Error("Account is suspended");
    }

    // Build the response object for verification
    const response = {
      id: credential.id,
      rawId: credential.rawId,
      type: credential.type as "public-key",
      response: {
        clientDataJSON: credential.response.clientDataJSON,
        authenticatorData: credential.response.authenticatorData,
        signature: credential.response.signature,
        userHandle: credential.response.userHandle || undefined,
      },
      clientExtensionResults: {},
    };

    let verification: VerifiedAuthenticationResponse;
    try {
      verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge: challenge,
        expectedOrigin: this.origin,
        expectedRPID: this.rpID,
        credential: {
          id: passkey.credentialId,
          publicKey: isoBase64URL.toBuffer(passkey.publicKey),
          counter: passkey.counter,
          transports: passkey.transports as AuthenticatorTransportFuture[] | undefined,
        },
        requireUserVerification: false,
      });
    } catch (error) {
      await this.passkeyChallengeRepository.deleteByChallenge(challenge);
      throw new Error(`Authentication failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }

    if (!verification.verified) {
      await this.passkeyChallengeRepository.deleteByChallenge(challenge);
      throw new Error("Authentication verification failed");
    }

    // Update the counter
    const { newCounter } = verification.authenticationInfo;
    await this.passkeyCredentialRepository.updateCounter(passkey.id, newCounter, new Date());

    // Clean up challenge
    await this.passkeyChallengeRepository.deleteByChallenge(challenge);

    // Create session
    const sessionExpiryDays = Number.parseInt(process.env.SESSION_EXPIRY_DAYS || "30", 10);
    const session = await this.sessionRepository.create({
      id: generateId(),
      userId: user.id,
      token: generateSessionToken(),
      expiresAt: calculateSessionExpiry(sessionExpiryDays),
      userAgent: null,
      ipAddress: null,
    });

    return { user, session };
  }

  /**
   * Get all passkeys for a user
   *
   * @param userId - The user's ID
   * @returns List of passkey credentials
   */
  async getUserPasskeys(userId: string): Promise<PasskeyCredential[]> {
    return this.passkeyCredentialRepository.findByUserId(userId);
  }

  /**
   * Delete a passkey
   *
   * @param userId - The user's ID
   * @param passkeyId - The passkey ID to delete
   */
  async deletePasskey(userId: string, passkeyId: string): Promise<void> {
    const passkey = await this.passkeyCredentialRepository.findById(passkeyId);
    if (!passkey || passkey.userId !== userId) {
      throw new Error("Passkey not found");
    }

    // Check if this is the last passkey and user has no password
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const remainingPasskeys = await this.passkeyCredentialRepository.countByUserId(userId);
    if (remainingPasskeys <= 1 && !user.passwordHash) {
      throw new Error("Cannot delete the last passkey when no password is set");
    }

    await this.passkeyCredentialRepository.delete(passkeyId);
  }

  /**
   * Rename a passkey
   *
   * @param userId - The user's ID
   * @param passkeyId - The passkey ID
   * @param name - New name for the passkey
   */
  async renamePasskey(userId: string, passkeyId: string, name: string): Promise<PasskeyCredential> {
    const passkey = await this.passkeyCredentialRepository.findById(passkeyId);
    if (!passkey || passkey.userId !== userId) {
      throw new Error("Passkey not found");
    }

    return this.passkeyCredentialRepository.updateName(passkeyId, name);
  }
}
