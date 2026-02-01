/**
 * Hook for authenticated API access
 * Automatically sets the token before each request
 */

import { useMemo, useCallback } from "react";
import { useAtomValue } from "jotai";
import { tokenAtom } from "../lib/atoms/auth";
import { apiClient, ApiError } from "../lib/api/client";

export { ApiError };

/**
 * Authenticated API interface
 * Provides type-safe HTTP methods with automatic token authentication
 */
export interface AuthenticatedApi {
  /** Perform authenticated GET request */
  get: <T>(path: string) => Promise<T>;
  /** Perform authenticated POST request */
  post: <T>(path: string, data?: unknown) => Promise<T>;
  /** Perform authenticated PATCH request */
  patch: <T>(path: string, data?: unknown) => Promise<T>;
  /** Perform authenticated DELETE request */
  delete: <T>(path: string, body?: unknown) => Promise<T>;
  /** Perform authenticated file upload */
  upload: <T>(path: string, formData: FormData, timeout?: number) => Promise<T>;
  /** Current authentication token */
  token: string | null;
  /** Whether user is authenticated */
  isAuthenticated: boolean;
}

/**
 * Hook for authenticated API access
 *
 * Eliminates the need to manually call `apiClient.setToken(token)` before each request.
 * The token is automatically synchronized from the auth atom.
 *
 * @returns Authenticated API methods and auth state
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const api = useApi();
 *
 *   const fetchData = async () => {
 *     // No need to call apiClient.setToken(token) manually
 *     const user = await api.get<User>('/api/users/@me');
 *   };
 *
 *   if (!api.isAuthenticated) {
 *     return <div>Please log in</div>;
 *   }
 *
 *   return <button onClick={fetchData}>Fetch Data</button>;
 * }
 * ```
 */
export function useApi(): AuthenticatedApi {
  const token = useAtomValue(tokenAtom);

  const get = useCallback(
    async <T>(path: string): Promise<T> => {
      apiClient.setToken(token);
      return apiClient.get<T>(path);
    },
    [token],
  );

  const post = useCallback(
    async <T>(path: string, data?: unknown): Promise<T> => {
      apiClient.setToken(token);
      return apiClient.post<T>(path, data);
    },
    [token],
  );

  const patch = useCallback(
    async <T>(path: string, data?: unknown): Promise<T> => {
      apiClient.setToken(token);
      return apiClient.patch<T>(path, data);
    },
    [token],
  );

  const del = useCallback(
    async <T>(path: string, body?: unknown): Promise<T> => {
      apiClient.setToken(token);
      return apiClient.delete<T>(path, body);
    },
    [token],
  );

  const upload = useCallback(
    async <T>(path: string, formData: FormData, timeout?: number): Promise<T> => {
      apiClient.setToken(token);
      return apiClient.upload<T>(path, formData, timeout);
    },
    [token],
  );

  return useMemo(
    () => ({
      get,
      post,
      patch,
      delete: del,
      upload,
      token,
      isAuthenticated: Boolean(token),
    }),
    [get, post, patch, del, upload, token],
  );
}
