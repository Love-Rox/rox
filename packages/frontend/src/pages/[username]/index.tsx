import type { PageProps } from 'waku/router';
import { UserProfile } from '../../components/user/UserProfile';

/**
 * User profile page
 * Dynamic route for displaying user profiles
 *
 * @example
 * /alice - Shows alice's profile
 * /bob - Shows bob's profile
 */
export default async function UserPage({ username }: PageProps<'/[username]'>) {
  if (!username) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">User not found</h1>
        </div>
      </div>
    );
  }

  return <UserProfile username={username} />;
}

/**
 * Waku configuration for user profile page
 * Marks this page as dynamically rendered at request time
 *
 * @returns Configuration object with render mode
 */
export const getConfig = async () => {
  return {
    render: 'dynamic',
  } as const;
};
