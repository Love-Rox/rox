import type { ID, Timestamps } from './common.js';

export interface User extends Timestamps {
  id: ID;
  username: string;
  email: string;
  passwordHash: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  isAdmin: boolean;
  isSuspended: boolean;
  publicKey: string | null;
  privateKey: string | null;
  host: string | null; // null for local users, domain for remote users
}

export interface UserProfile {
  id: ID;
  username: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  host: string | null;
  createdAt: Date;
}

export interface Follow extends Timestamps {
  id: ID;
  followerId: ID;
  followeeId: ID;
}
