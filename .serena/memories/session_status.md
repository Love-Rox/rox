# Session Handoff - 2025-11-28

## Current Status

### Completed Features

#### Phase 5: Moderation System ✅
- **Moderator Dashboard** (`/mod/*`)
  - Reports management (`/mod/reports`)
  - Note moderation with soft-delete (`/mod/notes`)
  - User suspension management (`/mod/users`)
  - Instance blocking (`/mod/instances`)
  - Audit log viewer (`/mod/audit-logs`)

- **User Warning System**
  - Database: `user_warnings` table (migration 0017)
  - Repository: `IUserWarningRepository` + PostgreSQL implementation
  - API endpoints for warnings
  - Frontend UI on `/mod/users` page

#### Account Migration ✅
- Move activity handler
- Alias management (alsoKnownAs)
- Migration initiation/validation
- 30-day cooldown enforcement

#### Redis Caching ✅
- InstanceSettingsService caching
- RoleService policy caching
- Public key caching for HTTP signatures

#### Rate Limiting ✅
- Rate limit middleware with role-based adjustments
- Presets: `follow`, `reaction`, `fileUpload`, `write`
- Integration with RoleService `rateLimitFactor`

#### Notification System ✅ (Latest)
- Database: `notifications` table (migration 0018)
- Repository: `INotificationRepository` + PostgreSQL implementation
- Service: `NotificationService` with methods for all notification types
- API endpoints:
  - `GET /api/notifications` - List notifications
  - `GET /api/notifications/unread-count` - Get unread count
  - `POST /api/notifications/mark-as-read` - Mark single as read
  - `POST /api/notifications/mark-all-as-read` - Mark all as read
  - `POST /api/notifications/mark-as-read-until` - Mark as read until ID
  - `POST /api/notifications/delete` - Delete notification
  - `POST /api/notifications/delete-all` - Delete all
- Integration with:
  - FollowService (local follow notifications)
  - FollowHandler (remote follow notifications)
  - ReactionService (local reaction notifications)
  - LikeHandler (remote reaction notifications)
- Notification types: `follow`, `mention`, `reply`, `reaction`, `renote`, `quote`, `warning`, `follow_request_accepted`

### Test Status
- **407 unit tests** passing
- All typecheck passing

### Recent Work
- Notification system implementation complete
- Follow and reaction notifications integrated

## Next Steps (Priority Order)

1. **Mention/Reply notifications** - Parse notes for @mentions and replies
2. **Renote/Quote notifications** - Notify when notes are renoted or quoted
3. **Frontend notification UI** - Display notifications in the client
4. **Image optimization** improvements
5. **WebSocket/SSE** for real-time notifications

## Development Environment

```bash
# Standard dev command
DB_TYPE=postgres \
DATABASE_URL="postgresql://rox:rox_dev_password@localhost:5432/rox" \
STORAGE_TYPE=local LOCAL_STORAGE_PATH=./uploads \
PORT=3000 NODE_ENV=development URL=http://localhost:3000 \
bun run dev
```

## Repository Interfaces (Complete List)

1. IUserRepository
2. INoteRepository
3. IDriveFileRepository
4. ISessionRepository
5. IReactionRepository
6. IFollowRepository
7. IInstanceBlockRepository
8. IInvitationCodeRepository
9. IUserReportRepository
10. IRoleRepository
11. IRoleAssignmentRepository
12. IInstanceSettingsRepository
13. ICustomEmojiRepository
14. IModerationAuditLogRepository
15. IUserWarningRepository
16. INotificationRepository ← Latest addition
