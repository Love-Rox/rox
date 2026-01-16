/**
 * Error Handling Utilities
 *
 * Provides consistent error message extraction and handling across the application.
 *
 * @module lib/utils/errors
 */

/**
 * Extracts a user-friendly error message from an unknown error.
 *
 * This utility handles the common pattern of extracting error messages
 * from caught exceptions that could be Error instances or other types.
 *
 * @param error - The caught error (could be Error, string, or unknown)
 * @param fallback - Fallback message if error message cannot be extracted
 * @returns A string error message suitable for display to users
 *
 * @example
 * ```tsx
 * try {
 *   await apiClient.post("/endpoint", data);
 * } catch (error) {
 *   addToast({
 *     type: "error",
 *     message: getErrorMessage(error, "Failed to save data"),
 *   });
 * }
 * ```
 */
export function getErrorMessage(
  error: unknown,
  fallback = "An unexpected error occurred"
): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return fallback;
}

/**
 * Type guard to check if an error has a message property.
 *
 * Useful for handling errors that may not be Error instances but still
 * have a message property (e.g., API error responses).
 *
 * @param error - The value to check
 * @returns True if the error has a string message property
 *
 * @example
 * ```tsx
 * if (hasErrorMessage(error)) {
 *   console.log(error.message);
 * }
 * ```
 */
export function hasErrorMessage(
  error: unknown
): error is { message: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  );
}
