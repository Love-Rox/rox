/**
 * Safe URL utilities
 *
 * Guards against remote-controlled URLs (e.g. ActivityPub `note.uri`, MFM links)
 * with dangerous schemes such as `javascript:` or `data:` being placed into
 * `href`, `window.open`, `location`, or the clipboard.
 */

/**
 * Return the URL only if it is an absolute `http:` or `https:` URL.
 *
 * @param url - Untrusted URL string
 * @returns The normalized URL string, or null if it is missing, unparsable, or
 *   uses any other scheme
 *
 * @example
 * ```ts
 * toSafeHttpUrl("https://example.com/notes/1"); // "https://example.com/notes/1"
 * toSafeHttpUrl("javascript:alert(1)"); // null
 * ```
 */
export function toSafeHttpUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.href;
  } catch {
    return null;
  }
}
