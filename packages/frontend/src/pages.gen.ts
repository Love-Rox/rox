// deno-fmt-ignore-file
// biome-ignore format: generated types do not need formatting
// prettier-ignore
import type { PathsForPages, GetConfigResponse } from 'waku/router';

// prettier-ignore
import type { getConfig as File_UsernameIndex_getConfig } from './pages/[username]/index';
// prettier-ignore
import type { getConfig as File_ContactThreadId_getConfig } from './pages/contact/[threadId]';
// prettier-ignore
import type { getConfig as File_ListsListId_getConfig } from './pages/lists/[listId]';
// prettier-ignore
import type { getConfig as File_MessagesPartnerId_getConfig } from './pages/messages/[partnerId]';
// prettier-ignore
import type { getConfig as File_NotesNoteId_getConfig } from './pages/notes/[noteId]';

// prettier-ignore
type Page =
| { path: '/403'; render: 'static' }
| { path: '/404'; render: 'static' }
| { path: '/410'; render: 'static' }
| { path: '/500'; render: 'static' }
| { path: '/503'; render: 'static' }
| ({ path: '/[username]' } & GetConfigResponse<typeof File_UsernameIndex_getConfig>)
| { path: '/admin/blocked-usernames'; render: 'static' }
| { path: '/admin/blocks'; render: 'static' }
| { path: '/admin/contacts'; render: 'static' }
| { path: '/admin/emojis'; render: 'static' }
| { path: '/admin/federation'; render: 'static' }
| { path: '/admin/gone-users'; render: 'static' }
| { path: '/admin/invitations'; render: 'static' }
| { path: '/admin/plugins'; render: 'static' }
| { path: '/admin/queue'; render: 'static' }
| { path: '/admin/reports'; render: 'static' }
| { path: '/admin/roles'; render: 'static' }
| { path: '/admin/settings'; render: 'static' }
| { path: '/admin/storage'; render: 'static' }
| { path: '/admin/system-follows'; render: 'static' }
| { path: '/admin/users'; render: 'static' }
| ({ path: '/contact/[threadId]' } & GetConfigResponse<typeof File_ContactThreadId_getConfig>)
| { path: '/contact'; render: 'static' }
| { path: '/'; render: 'static' }
| { path: '/interact'; render: 'static' }
| { path: '/legal/licenses'; render: 'static' }
| { path: '/legal/privacy'; render: 'static' }
| { path: '/legal/terms'; render: 'static' }
| ({ path: '/lists/[listId]' } & GetConfigResponse<typeof File_ListsListId_getConfig>)
| { path: '/lists'; render: 'static' }
| { path: '/login'; render: 'static' }
| { path: '/mentions'; render: 'static' }
| ({ path: '/messages/[partnerId]' } & GetConfigResponse<typeof File_MessagesPartnerId_getConfig>)
| { path: '/messages'; render: 'static' }
| { path: '/mod/audit-logs'; render: 'static' }
| { path: '/mod/instances'; render: 'static' }
| { path: '/mod/notes'; render: 'static' }
| { path: '/mod/reports'; render: 'static' }
| { path: '/mod/users'; render: 'static' }
| ({ path: '/notes/[noteId]' } & GetConfigResponse<typeof File_NotesNoteId_getConfig>)
| { path: '/notifications'; render: 'static' }
| { path: '/onboarding'; render: 'static' }
| { path: '/search'; render: 'static' }
| { path: '/settings'; render: 'static' }
| { path: '/signup'; render: 'static' }
| { path: '/timeline'; render: 'static' };

// prettier-ignore
declare module 'waku/router' {
  interface RouteConfig {
    paths: PathsForPages<Page>;
  }
  interface CreatePagesConfig {
    pages: Page;
  }
}
