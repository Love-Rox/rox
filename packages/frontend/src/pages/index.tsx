"use client";

import { useAtom } from "jotai";
import { useEffect, useState } from "react";
import { LandingPage } from "../components/LandingPage";
import { currentUserAtom, tokenAtom } from "../lib/atoms/auth";
import { apiClient } from "../lib/api/client";

/**
 * Home page component
 * Shows landing page with context-aware actions based on authentication status
 */
export default function HomePage() {
  const [currentUser, setCurrentUser] = useAtom(currentUserAtom);
  const [token] = useAtom(tokenAtom);
  const [isLoading, setIsLoading] = useState(true);

  // Check if onboarding is needed (server not yet configured)
  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const response = await apiClient.get<{ needsOnboarding: boolean }>(
          "/api/onboarding/status"
        );
        if (response.needsOnboarding) {
          window.location.href = "/onboarding";
          return;
        }
      } catch (error) {
        console.error("Failed to check onboarding status:", error);
      }
    };
    checkOnboarding();
  }, []);

  // Restore user session if token exists
  useEffect(() => {
    const restoreSession = async () => {
      if (token && !currentUser) {
        try {
          apiClient.setToken(token);
          const response = await apiClient.get<{ user: any }>("/api/auth/session");
          setCurrentUser(response.user);
        } catch (error) {
          console.error("Failed to restore session:", error);
          // Token is invalid, stay on landing page as guest
        }
      }
      setIsLoading(false);
    };
    restoreSession();
  }, [token, currentUser, setCurrentUser]);

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Show landing page with user context
  return <LandingPage currentUser={currentUser} />;
}
