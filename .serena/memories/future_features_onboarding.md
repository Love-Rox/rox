# Future Feature: Server Onboarding

## Overview

A server onboarding wizard should be implemented to guide administrators through initial server setup.

## Priority

Medium - Should be implemented before public release

## Requirements

### First-run Detection
- Detect if the server has been configured (e.g., check if admin user exists)
- Redirect to onboarding wizard if not configured

### Onboarding Steps

1. **Admin Account Creation**
   - Username, email, password
   - First user becomes admin automatically

2. **Instance Settings**
   - Instance name
   - Instance description
   - Contact email
   - Terms of Service URL (optional)
   - Privacy Policy URL (optional)

3. **Registration Settings**
   - Enable/disable open registration
   - Invitation-only mode
   - Email verification requirement

4. **Storage Configuration**
   - Storage type selection (local/S3)
   - S3 credentials if applicable
   - Max file size limits

5. **Federation Settings**
   - Enable/disable federation
   - Blocked instances (initial blocklist)
   - Allowed instances (allowlist mode)

6. **SMTP Configuration** (optional)
   - Email server settings for notifications
   - Test email functionality

### UI/UX Considerations
- Step-by-step wizard with progress indicator
- Skip optional steps
- Validate each step before proceeding
- Summary page before finalizing
- Ability to change settings later in admin panel

### Technical Implementation
- Backend: `/api/onboarding/*` endpoints
- Frontend: `/onboarding` route (accessible only when not configured)
- Database: `instance_settings` table with `onboarding_completed` flag
- Middleware to check onboarding status and redirect

## Related Files
- `packages/backend/src/routes/instance.ts` - Instance settings
- `packages/backend/src/services/InstanceSettingsService.ts` - Settings management
- `packages/frontend/src/pages/admin/` - Admin panel

## Notes
- Recorded on: 2025-11-28
- Context: After implementing SSE notifications and Nginx deployment guide
