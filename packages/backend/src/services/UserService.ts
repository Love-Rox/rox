/**
 * User Management Service
 *
 * Handles user profile operations and ActivityPub delivery.
 *
 * @module services/UserService
 */

import type { IUserRepository } from '../interfaces/repositories/IUserRepository.js';
import type { IFollowRepository } from '../interfaces/repositories/IFollowRepository.js';
import type { User } from '../db/schema/pg.js';
import { ActivityPubDeliveryService } from './ap/ActivityPubDeliveryService.js';

/**
 * User profile update input data
 */
export interface UserUpdateInput {
  /** Display name */
  displayName?: string;
  /** Bio/description */
  bio?: string;
  /** Avatar URL */
  avatarUrl?: string;
  /** Header/banner URL */
  headerUrl?: string;
}

/**
 * User Service
 *
 * Provides business logic for user operations including:
 * - Profile updates with ActivityPub delivery
 * - User information retrieval
 *
 * @remarks
 * When a local user updates their profile, Update activity is delivered
 * to all remote followers.
 */
export class UserService {
  private readonly deliveryService: ActivityPubDeliveryService;

  /**
   * UserService Constructor
   *
   * @param userRepository - User repository
   * @param followRepository - Follow repository
   * @param activityDeliveryQueue - Activity delivery queue
   */
  constructor(
    private readonly userRepository: IUserRepository,
    followRepository: IFollowRepository,
    activityDeliveryQueue: any,
  ) {
    this.deliveryService = new ActivityPubDeliveryService(
      userRepository,
      followRepository,
      activityDeliveryQueue
    );
  }

  /**
   * Update user profile
   *
   * Updates user profile information and delivers Update activity to remote followers.
   *
   * @param userId - User ID
   * @param updateData - Profile update data
   * @returns Updated User record
   *
   * @example
   * ```typescript
   * const updatedUser = await userService.updateProfile('user123', {
   *   displayName: 'New Name',
   *   bio: 'Updated bio',
   * });
   * ```
   *
   * @remarks
   * - Only provided fields will be updated
   * - If user is local, Update activity is delivered to all remote followers
   * - Delivery is non-blocking (fire-and-forget)
   */
  async updateProfile(userId: string, updateData: UserUpdateInput): Promise<User> {
    // Update user in database
    const updatedUser = await this.userRepository.update(userId, updateData);

    // Deliver Update activity to remote followers (async, non-blocking)
    if (updatedUser && !updatedUser.host) {
      // Only deliver if user is local
      this.deliveryService.deliverUpdate(updatedUser).catch((error) => {
        console.error(`Failed to deliver Update activity for user ${userId}:`, error);
      });
    }

    return updatedUser;
  }

  /**
   * Get user by ID
   *
   * @param userId - User ID
   * @returns User record or null if not found
   */
  async findById(userId: string): Promise<User | null> {
    return await this.userRepository.findById(userId);
  }

  /**
   * Get user by username
   *
   * @param username - Username
   * @returns User record or null if not found
   */
  async findByUsername(username: string): Promise<User | null> {
    return await this.userRepository.findByUsername(username);
  }
}
