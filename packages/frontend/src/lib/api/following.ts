/**
 * Following API client
 * Provides functions for interacting with the following API endpoints
 */

import { apiClient, withToken } from "./client";

/**
 * Follow relationship data structure
 */
export interface Follow {
  id: string;
  followerId: string;
  followeeId: string;
  createdAt: string;
}

/**
 * Follow a user
 *
 * @param userId - User ID to follow
 * @param token - Authentication token
 * @returns Created follow relationship
 */
export async function followUser(userId: string, token: string): Promise<Follow> {
  return withToken(token).post<Follow>("/api/following/create", { userId });
}

/**
 * Unfollow a user
 *
 * @param userId - User ID to unfollow
 * @param token - Authentication token
 */
export async function unfollowUser(userId: string, token: string): Promise<void> {
  await withToken(token).post<void>("/api/following/delete", { userId });
}

/**
 * Get followers list for a user
 *
 * @param userId - User ID
 * @param limit - Maximum number of followers to retrieve
 * @returns List of followers
 */
export async function getFollowers(userId: string, limit?: number): Promise<Follow[]> {
  const params = new URLSearchParams({ userId });
  if (limit) {
    params.append("limit", limit.toString());
  }
  return apiClient.get<Follow[]>(`/api/users/followers?${params}`);
}

/**
 * Get following list for a user
 *
 * @param userId - User ID
 * @param limit - Maximum number of following to retrieve
 * @returns List of following
 */
export async function getFollowing(userId: string, limit?: number): Promise<Follow[]> {
  const params = new URLSearchParams({ userId });
  if (limit) {
    params.append("limit", limit.toString());
  }
  return apiClient.get<Follow[]>(`/api/users/following?${params}`);
}

/**
 * Check if current user is following a specific user
 *
 * @param userId - User ID to check
 * @returns True if following, false otherwise
 */
export async function isFollowing(userId: string): Promise<boolean> {
  try {
    const following = await getFollowing(userId);
    return following.length > 0;
  } catch (error) {
    console.error("Failed to check follow status:", error);
    return false;
  }
}
