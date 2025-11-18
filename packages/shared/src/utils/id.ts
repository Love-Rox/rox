/**
 * Generate a unique ID using timestamp-based approach
 * Format: {timestamp}-{random}
 */
export function generateId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}${random}`;
}

/**
 * Extract timestamp from ID
 */
export function getTimestampFromId(id: string): number {
  const timestampPart = id.substring(0, 9);
  return parseInt(timestampPart, 36);
}
