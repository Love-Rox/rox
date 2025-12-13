import type { PageProps } from "waku/router";
import { ListDetailPageClient } from "../../components/pages/ListDetailPageClient";

/**
 * List detail page (Server Component)
 *
 * Renders the client component with dynamic routing configuration.
 * Displays timeline and details for a specific list.
 *
 * @module pages/lists/[listId]
 */
export default function ListDetailPage({ listId }: PageProps<"/lists/[listId]">) {
  if (!listId) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">List not found</h1>
        </div>
      </div>
    );
  }

  return <ListDetailPageClient listId={listId} />;
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
