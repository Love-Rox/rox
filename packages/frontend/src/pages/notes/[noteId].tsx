import type { PageProps } from "waku/router";
import { NoteDetailPageClient } from "../../components/pages/NoteDetailPageClient";
import { notesApi } from "../../lib/api/notes";
import { usersApi } from "../../lib/api/users";

/**
 * Note detail page (Server Component)
 * Renders the client component with dynamic routing configuration and OGP meta tags
 */
export default async function NoteDetailPage({ noteId }: PageProps<"/notes/[noteId]">) {
  if (!noteId) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Note not found</h1>
        </div>
      </div>
    );
  }

  // Fetch note data for OGP meta tags (Server Component can fetch directly)
  // Note: Server-side rendering needs to use internal Docker network
  // Environment variable INTERNAL_API_URL should be set to http://rox-backend:3000
  let note: Awaited<ReturnType<typeof notesApi.getNote>> | null = null;
  let user: Awaited<ReturnType<typeof usersApi.getById>> | null = null;
  try {
    // In SSR context, we need to use the internal API URL
    // This is handled by the API client's default baseUrl configuration
    note = await notesApi.getNote(noteId);
    if (note?.user?.id) {
      user = await usersApi.getById(note.user.id);
    }
  } catch (error) {
    console.error("[SSR] Failed to fetch note for OGP:", error);
    // Continue without fetched data - OGP will use fallback values
  }

  // Generate OGP meta tags if note data is available
  // Use public URL for OGP meta tags (not internal Docker URL)
  const baseUrl = process.env.URL || "https://rox.love-rox.cc";
  const instanceName = "Rox Origin"; // TODO: Fetch from instance settings
  const themeColor = "#f97316"; // TODO: Fetch from instance settings

  // Build title from author info (Misskey style: "DisplayName (@username)")
  const authorDisplayName = user?.displayName || user?.username || note?.user?.username || "User";
  const authorUsername = note?.user?.username || "user";
  const title = `${authorDisplayName} (@${authorUsername})`;

  // Description is the note content
  const description = note?.cw || note?.text?.substring(0, 200) || "View this note on Rox";
  const noteUrl = `${baseUrl}/notes/${noteId}`;

  // Get first image from attachments, or fallback to avatar for og:image
  const noteImageUrl = note?.fileIds && note.fileIds.length > 0
    ? `${baseUrl}/api/drive/files/${note.fileIds[0]}`
    : null;

  // Avatar URL for og:image (Misskey uses avatar when no note image)
  // Normalize to absolute URL - avatarUrl might be relative from remote servers
  let avatarUrl: string | null = null;
  if (user?.avatarUrl) {
    if (user.avatarUrl.startsWith("http://") || user.avatarUrl.startsWith("https://")) {
      avatarUrl = user.avatarUrl;
    } else {
      // Relative URL - resolve against baseUrl
      avatarUrl = new URL(user.avatarUrl, baseUrl).toString();
    }
  }

  // og:image should be note image if available, otherwise avatar (like Misskey.io)
  const ogImageUrl = noteImageUrl || avatarUrl;

  return (
    <>
      {/* OGP Meta Tags - always render basic meta tags for Discord/crawlers */}
      <meta name="application-name" content="Rox" />
      <meta name="referrer" content="origin" />
      <meta name="theme-color" content={themeColor} />
      <meta name="theme-color-orig" content={themeColor} />
      <meta property="og:site_name" content={instanceName} />
      <meta property="instance_url" content={baseUrl} />
      <meta name="format-detection" content="telephone=no,date=no,address=no,email=no,url=no" />
      <link rel="icon" href={`${baseUrl}/favicon.png`} type="image/png" />
      {/* ActivityPub alternate link for Discord Mastodon-style embeds */}
      <link rel="alternate" href={noteUrl} type="application/activity+json" />
      <title>{title} | {instanceName}</title>
      <meta name="description" content={description} />
      <meta property="og:type" content="article" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={noteUrl} />
      {/* og:image: note image if available, otherwise avatar (like Misskey.io) */}
      {ogImageUrl && (
        <meta property="og:image" content={ogImageUrl} />
      )}
      <meta property="twitter:card" content={noteImageUrl ? "summary_large_image" : "summary"} />

      <NoteDetailPageClient noteId={noteId} />
    </>
  );
}

/**
 * Page configuration for Waku
 * Dynamic rendering for parameterized routes
 */
export const getConfig = async () => {
  return {
    render: "dynamic",
  } as const;
};
