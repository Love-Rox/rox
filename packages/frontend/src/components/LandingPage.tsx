'use client';

import { Trans } from '@lingui/react/macro';
import { Button } from './ui/Button';
import { LanguageSwitcher } from './LanguageSwitcher';
import type { User } from '../lib/types/user';

/**
 * Landing page component
 * Shows server introduction, features, and context-aware actions
 *
 * @param currentUser - Currently logged in user, or null if not logged in
 */
export function LandingPage({ currentUser }: { currentUser: User | null }) {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header with language switcher */}
      <div className="flex justify-end mb-8">
        <LanguageSwitcher />
      </div>

      {/* Hero Section */}
      <div className="text-center mb-16">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">
          Rox
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          <Trans>A lightweight, federated social network powered by ActivityPub</Trans>
        </p>
        <div className="flex gap-4 justify-center">
          {currentUser ? (
            // Logged in: Show "Go to Timeline" button
            <Button
              onPress={() => window.location.href = '/timeline'}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold text-lg"
            >
              <Trans>Go to Timeline</Trans>
            </Button>
          ) : (
            // Not logged in: Show "Get Started" and "Log In" buttons
            <>
              <Button
                onPress={() => window.location.href = '/signup'}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold text-lg"
              >
                <Trans>Get Started</Trans>
              </Button>
              <Button
                onPress={() => window.location.href = '/login'}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-8 py-3 rounded-lg font-semibold text-lg"
              >
                <Trans>Log In</Trans>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Features Section */}
      <div className="grid md:grid-cols-3 gap-8 mb-16">
        <div className="text-center p-6">
          <div className="text-4xl mb-4">🌐</div>
          <h3 className="text-xl font-semibold mb-2">
            <Trans>Federated</Trans>
          </h3>
          <p className="text-gray-600">
            <Trans>Connect with users across the fediverse using ActivityPub protocol</Trans>
          </p>
        </div>
        <div className="text-center p-6">
          <div className="text-4xl mb-4">⚡</div>
          <h3 className="text-xl font-semibold mb-2">
            <Trans>Lightweight</Trans>
          </h3>
          <p className="text-gray-600">
            <Trans>Fast and efficient with minimal resource usage</Trans>
          </p>
        </div>
        <div className="text-center p-6">
          <div className="text-4xl mb-4">🔒</div>
          <h3 className="text-xl font-semibold mb-2">
            <Trans>Privacy First</Trans>
          </h3>
          <p className="text-gray-600">
            <Trans>Control your data and choose who sees your posts</Trans>
          </p>
        </div>
      </div>

      {/* About Section */}
      <div className="bg-white rounded-lg shadow-md p-8 mb-16">
        <h2 className="text-3xl font-bold mb-4">
          <Trans>About This Server</Trans>
        </h2>
        <p className="text-gray-700 mb-4">
          <Trans>
            This is a Rox instance - a modern, lightweight ActivityPub server that connects you to a decentralized social network.
          </Trans>
        </p>
        <p className="text-gray-700">
          <Trans>
            Share your thoughts, connect with friends, and join conversations across the fediverse. Your data stays with you, and you control who sees what you share.
          </Trans>
        </p>
      </div>

      {/* Footer */}
      <div className="text-center text-gray-500 text-sm">
        <p>
          <Trans>Powered by</Trans> <a href="https://github.com/Love-rox/rox" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">Rox</a>
        </p>
      </div>
    </div>
  );
}
