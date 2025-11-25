import { NoteDetailPageClient } from '../../components/pages/NoteDetailPageClient';

/**
 * Note detail page (Server Component)
 * Renders the client component with dynamic routing configuration
 */
export default function NoteDetailPage({ noteId }: { noteId: string }) {
  return <NoteDetailPageClient noteId={noteId} />;
}

/**
 * Page configuration for Waku
 * Dynamic rendering for parameterized routes
 */
export const getConfig = async () => {
  return {
    render: 'dynamic',
  } as const;
};
