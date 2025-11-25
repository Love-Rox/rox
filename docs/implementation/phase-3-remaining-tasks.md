# Phase 3 Remaining Tasks - Work Plan

**Last Updated:** 2025-11-25
**Current Progress:** 75% → 100% (Target)

---

## 📋 Task Execution Order

### ✅ Completed (75%)
- WebFinger, Actor, HTTP Signatures
- Inbox (Follow, Create, Like, Announce, Undo)
- Outbox basic + BullMQ delivery queue
- Collections (Followers/Following)
- Automatic note/reaction delivery

---

## 🚧 Week 1: Outbound Activities Implementation (Priority: 🔴 Critical)

### Task 1.1: Undo Follow Delivery ⏳ IN PROGRESS
**Status:** Starting now
**File:** `packages/backend/src/services/FollowService.ts`
**Estimated Time:** 2-3 hours

**Current Implementation:**
```typescript
async unfollow(followerId: string, followeeId: string): Promise<void> {
  await this.followRepository.delete(followerId, followeeId);
}
```

**Required Changes:**
1. Check if followee is remote user
2. If remote, create Undo { Follow } activity
3. Call ActivityPubDeliveryService.deliverUndoFollow()
4. Send to followee's inbox

**Expected Behavior:**
- User unfollows someone
- Local DB delete
- Send `Undo { Follow }` to remote server

**Verification:**
- Manual test with local server
- Check delivery queue logs
- Verify HTTP signature

---

### Task 1.2: Undo Like Delivery
**Status:** Pending
**File:** `packages/backend/src/services/ReactionService.ts`
**Estimated Time:** 2-3 hours

**Current Implementation:**
```typescript
async delete(userId: string, noteId: string): Promise<void> {
  await this.reactionRepository.delete(userId, noteId);
}
```

**Required Changes:**
1. Get note info to check if remote
2. If remote note, create Undo { Like } activity
3. Call ActivityPubDeliveryService.deliverUndoLike()
4. Send to note author's inbox

**Dependencies:** Task 1.1 completion

---

### Task 1.3: Delete Activity Delivery
**Status:** Pending
**File:** `packages/backend/src/services/NoteService.ts`
**Estimated Time:** 3-4 hours

**Current Implementation:**
```typescript
async delete(noteId: string, userId: string): Promise<void> {
  // DB delete only, no delivery
}
```

**Required Changes:**
1. Get note followers
2. Create Delete { Note } activity
3. Deliver to all followers' inboxes
4. Handle tombstone (optional)

**Dependencies:** Task 1.1 completion

---

### Task 1.4: Update Activity Delivery
**Status:** Pending
**File:** New or existing `packages/backend/src/services/UserService.ts`
**Estimated Time:** 4-5 hours

**Required Changes:**
1. Create profile update endpoint/service
2. Create Update { Person } activity
3. Deliver to all followers
4. Update Actor document cache

**Dependencies:** Task 1.3 completion

---

## 🚧 Week 2: Robustness Enhancement (Priority: 🟡 High)

### Task 2.1: Activity Deduplication
**Status:** Pending
**File:** `packages/backend/src/routes/ap/inbox.ts`
**Estimated Time:** 3-4 hours

**Implementation:**
1. Add `received_activities` table to schema
2. Check activity ID on receipt
3. Return 202 if duplicate, skip processing
4. Clean old entries (>7 days)

**Schema Addition:**
```typescript
export const receivedActivities = pgTable('received_activities', {
  activityId: text('activity_id').primaryKey(),
  receivedAt: timestamp('received_at').notNull().defaultNow(),
});
```

---

### Task 2.2: Enhanced Activity Validation
**Status:** Pending
**File:** `packages/backend/src/routes/ap/inbox.ts`
**Estimated Time:** 2-3 hours

**Validations:**
- Required fields check
- Actor/keyId consistency check
- Timestamp validation (reject old/future)
- Better error responses (400, 401, 422)

---

### Task 2.3: Remote Object Fetching Improvement
**Status:** Pending
**Files:**
- `packages/backend/src/services/ap/RemoteNoteService.ts`
- `packages/backend/src/services/ap/RemoteActorService.ts`
**Estimated Time:** 3-4 hours

**Improvements:**
- Retry logic for failed fetches
- Better cache strategy
- Enhanced error handling

---

## 🚧 Week 3: Performance Optimization (Priority: 🟡 Medium)

### Task 3.1: Shared Inbox Support
**Status:** Pending
**File:** `packages/backend/src/services/ap/ActivityPubDeliveryService.ts`
**Estimated Time:** 1 day

**Implementation:**
1. Check remote actor's `sharedInbox`
2. Group followers by server
3. Deliver to shared inbox once per server
4. Fallback to individual inbox if no shared inbox

**Expected Impact:** Reduce delivery jobs by 50-90%

---

### Task 3.2: Rate Limiting
**Status:** Pending
**File:** `packages/backend/src/services/ap/ActivityDeliveryQueue.ts`
**Estimated Time:** 1 day

**Implementation:**
- Per-server rate limits
- Delivery priority (Accept > Create > Delete)
- Backpressure handling

---

### Task 3.3: Delivery Success Rate Monitoring
**Status:** Pending
**File:** `packages/backend/src/services/ap/ActivityDeliveryQueue.ts`
**Estimated Time:** Half day

**Implementation:**
- Track success/failure metrics
- Log statistics
- Prometheus metrics (optional)
- Target: 95% success rate

---

## 🚧 Week 4: Real-Server Federation Testing (Priority: 🔴 Critical)

### Task 4.1: Test Environment Setup
**Status:** Pending
**Estimated Time:** 1 day

**Requirements:**
1. Mastodon test instance (Docker or existing)
2. Misskey test instance (Docker or existing)
3. Public URL for Rox (ngrok/localtunnel or VPS)

---

### Task 4.2: Mastodon Federation Tests
**Status:** Pending
**Estimated Time:** 2-3 days

**Test Checklist:**
- [ ] Mastodon → Rox follow
- [ ] Rox → Mastodon follow
- [ ] Rox post → Mastodon receives
- [ ] Mastodon post → Rox receives
- [ ] Mastodon → Rox like
- [ ] Rox → Mastodon like
- [ ] Mastodon → Rox boost
- [ ] Rox → Mastodon renote
- [ ] Unfollow (both directions)
- [ ] Unlike (both directions)
- [ ] Delete notifications

---

### Task 4.3: Misskey Federation Tests
**Status:** Pending
**Estimated Time:** 2-3 days

**Test Checklist:**
- [ ] Misskey → Rox follow
- [ ] Rox → Misskey follow
- [ ] Rox post → Misskey receives
- [ ] Misskey post → Rox receives
- [ ] Misskey → Rox reaction (emoji)
- [ ] Rox → Misskey reaction
- [ ] Renote (both directions)
- [ ] Unfollow (both directions)
- [ ] Unreaction (both directions)

---

### Task 4.4: Bug Fixes and Improvements
**Status:** Pending
**Estimated Time:** 2-3 days

**Actions:**
- Fix compatibility issues found in testing
- Performance tuning
- Error handling improvements

---

## 🚧 Week 5: Final Polish (Priority: 🟢 Medium)

### Task 5.1: Debug Tools (Optional)
**Status:** Pending
**Estimated Time:** 2-3 days

**Tools:**
- [ ] Activity Inspector UI/CLI
- [ ] Delivery log viewer
- [ ] Signature verification debugger

---

### Task 5.2: Documentation Updates
**Status:** Pending
**Estimated Time:** 1 day

**Documents to Update:**
- [ ] `docs/implementation/phase-3-federation.md` (mark complete)
- [ ] `docs/activitypub-test-results.md` (add real-server results)
- [ ] `README.md` (update Phase 3 status to ✅)
- [ ] Create deployment guide (VPS/Edge)

---

## 📈 Progress Tracking

| Week | Tasks | Estimated Hours | Status |
|------|-------|----------------|--------|
| Week 1 | Outbound Activities (4 tasks) | 11-15h | ⏳ In Progress (1/4 complete) |
| Week 2 | Robustness (3 tasks) | 8-11h | 📅 Planned |
| Week 3 | Performance (3 tasks) | 16-20h | 📅 Planned |
| Week 4 | Testing (3 tasks) | 40-56h | 📅 Planned |
| Week 5 | Polish (2 tasks) | 8-32h | 📅 Planned |

**Total Estimated Time:** 83-134 hours (10-17 days of full-time work)
**Completed:** ~1.5 hours

---

## ✅ Completed Task: Task 1.1 - Undo Follow Delivery

**Started:** 2025-11-25
**Completed:** 2025-11-25
**Assignee:** Claude Code
**Status:** ✅ Complete
**Actual Time:** ~1.5 hours

**Implementation Steps:**
1. ✅ Review current FollowService.unfollow() implementation
2. ✅ Add remote user check
3. ✅ Create Undo Follow activity generator (deliverUndoFollow)
4. ✅ Integrate with ActivityPubDeliveryService
5. ✅ Add error handling (fire-and-forget with error logging)
6. ⏳ Write tests (optional, can be done later)
7. ⏳ Manual verification (requires server restart)

**Files Modified:**
- `packages/backend/src/services/ap/ActivityPubDeliveryService.ts` - Added `deliverUndoFollow()` method
- `packages/backend/src/services/FollowService.ts` - Updated `unfollow()` to send Undo Follow activities
- `packages/backend/src/routes/following.ts` - Injected ActivityPubDeliveryService into FollowService

**Implementation Details:**
- Undo Follow activity is sent to remote users' inboxes when local user unfollows
- Delivery is fire-and-forget (non-blocking) to avoid UI delays
- Proper null safety checks for private keys and remote users
- ActivityPub-compliant Undo { Follow } structure
- Type checking: ✅ Pass
- Linting: ✅ Pass

---

## 🎯 Next Task: Task 1.2 - Undo Like Delivery

**Status:** Ready to start

---

## 📝 Notes

- All TSDoc comments must be in English (per CLAUDE.md)
- Run `bun run lint && bun run typecheck && bun test` before committing
- Follow Conventional Commits format
- Update this document after each task completion
