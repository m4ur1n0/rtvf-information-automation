# Petition Creation Feature

This document describes the "+ New Petition" feature implementation.

## Overview

The petition creation feature allows users to create and submit new crew call petitions directly through the web interface. These petitions are sent to the RTVF listserv and automatically appear in the petitions dashboard.

## User Flow

1. User clicks "+ New Petition" button on the /petitions page
2. Fill out petition form (3-step process):
   - **Step 1: Petition Details** - Contact info, film details, roles, deadline
   - **Step 2: Email Editor** - Customize email body with Tiptap rich text editor
   - **Step 3: Review** - Preview and submit
3. Email is sent to listserv with special header `X-ListService-ID: user-created-petition`
4. Petition is inserted into database
5. User is redirected to their new petition via hash navigation

## Technical Implementation

### Frontend Components

**`components/CreatePetitionModal.tsx`**
- 3-step modal wizard (form → email → review)
- Form validation
- State management for all petition data
- Calls API endpoint on submit

**`components/EmailBodyEditor.tsx`**
- Tiptap rich text editor
- Image paste/upload support
- Toolbar with formatting options
- Converts editor content to HTML and plain text

**`lib/petition-types.ts`**
- TypeScript types for petition form data
- Email template generator
- Form validation logic
- Common roles and production types

### Backend Services

**Email Sending**

Two implementations provided:

1. **Stub (Development)**: `lib/email-stub.ts`
   - Logs email to console
   - Returns fake success
   - No external dependencies

2. **Production**: `lib/email-sender.ts`
   - Uses Resend API
   - Handles image attachments
   - Adds required headers
   - Appends petition link to email

**API Route**: `app/api/petitions/create/route.ts`
- Validates form data
- Generates unique opportunity ID (UUID)
- Sends email via configured sender
- Inserts petition into database
- Returns success/error response

**Database Writer**: `lib/db-writer.ts`
- Calls worker endpoint with petition data
- Handles authentication
- Error handling

**Worker Endpoint**: `listserv-poc/worker.js`
- New endpoint: `POST /api/petitions/insert`
- Requires `X-Webhook-Secret` authentication
- Inserts into `emails` table
- Inserts into `petition_posts` table
- Inserts roles into `email_roles` table

### URL Hash Navigation

- Petitions can be linked directly via `/#<opportunityId>`
- Page automatically scrolls to and selects petition
- Selection state updates URL hash
- Works with both existing and newly created petitions

## Environment Variables

Required in `.env.local`:

```env
# Site configuration
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Email recipient (hard-coded)
PETITION_RECIPIENT_EMAIL=rtvf-l@list.northwestern.edu

# ListService ID (non-negotiable header)
LISTSERVICE_ID=user-created-petition

# Production email sending (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxx
PETITION_FROM_EMAIL=petitions@yourdomain.com
```

## Switching from Stub to Production

To enable real email sending:

1. Get Resend API key from https://resend.com/api-keys
2. Verify sender domain in Resend dashboard
3. Add environment variables to `.env.local`:
   ```env
   RESEND_API_KEY=re_xxxxxxxxxxxx
   PETITION_FROM_EMAIL=petitions@yourdomain.com
   ```
4. Update API route to use production sender:
   ```typescript
   // In app/api/petitions/create/route.ts
   import { sendPetitionEmail } from '@/lib/email-sender'; // Change from email-stub
   ```

## Database Schema

User-created petitions are stored identically to ingested emails:

**`emails` table:**
- `source` = 'user_submission'
- `category` = 'CREW_CALL'
- `reasons_json` = ['USER_CREATED']
- `confidence` = 1.0
- All extracted fields populated from form

**`petition_posts` table:**
- Standard crew call fields
- `is_casting` determined from roles
- `is_bump` = 0 (user petitions never bumps)

**`email_roles` table:**
- One row per role

## Email Format

**Subject:** `[PETITION] {Film Title}`

**Headers:**
- `From:` Configured sender (e.g., petitions@yourdomain.com)
- `Reply-To:` User's email address
- `X-ListService-ID:` user-created-petition (non-negotiable)

**Body:**
- User-customized HTML content
- Appended footer with link: `{site}/petitions/#{opportunityId}`

**Attachments:**
- Any images pasted/uploaded in the editor

## Form Fields

### Required
- Your Name
- Your Email
- Film Title
- Logline

### Optional
- Production Type (572, 590, Thesis, Independent, Other)
- Director Name
- Shoot Dates (free text)
- Location
- Application URL
- Deadline (date picker)
- Roles (checkboxes + custom input)

## Image Support

Users can add images via:
1. Paste (Cmd+V / Ctrl+V)
2. Click "Add Image" button
3. Images stored as base64 data URLs
4. Converted to email attachments on send

## Styling

All styles in `app/globals.css` under "PETITION CREATION FORM STYLES" section.

Key classes:
- `.petition-form-modal` - Modal overlay
- `.petition-form-content` - Modal container
- `.email-body-editor` - Tiptap editor wrapper
- `.editor-toolbar` - Editor formatting buttons
- `.review-section` - Review step layout

## Security Notes

1. **Email validation**: Basic regex check for valid email format
2. **URL validation**: Ensures application URLs start with http:// or https://
3. **Database auth**: Worker endpoint requires `X-Webhook-Secret` header
4. **Input sanitization**: Tiptap handles HTML sanitization
5. **Rate limiting**: Not implemented (consider adding in production)

## Future Enhancements

Potential improvements:
- [ ] Email preview before submit
- [ ] Draft saving
- [ ] File upload for attachments (vs paste only)
- [ ] Template selection
- [ ] Duplicate petition detection
- [ ] Rate limiting per user
- [ ] Success toast notification
- [ ] Email confirmation to sender
- [ ] Moderation queue

## Testing

### Development Testing (Stub)
1. Start dev server: `npm run dev`
2. Navigate to `/petitions`
3. Click "+ New Petition"
4. Fill out form and submit
5. Check console for email stub output
6. Check database for inserted petition

### Production Testing (Resend)
1. Configure Resend API key
2. Update import in `app/api/petitions/create/route.ts`
3. Submit test petition
4. Verify email received at `PETITION_RECIPIENT_EMAIL`
5. Verify petition appears in dashboard
6. Verify hash navigation works

## Files Created/Modified

### New Files
- `components/CreatePetitionModal.tsx`
- `components/EmailBodyEditor.tsx`
- `lib/petition-types.ts`
- `lib/email-stub.ts`
- `lib/email-sender.ts`
- `lib/db-writer.ts`
- `app/api/petitions/create/route.ts`

### Modified Files
- `app/petitions/page.tsx` - Added button, modal, hash navigation
- `components/PetitionsDashboard.tsx` - Added selectedId prop, hash updates
- `app/globals.css` - Added form and editor styles
- `listserv-poc/worker.js` - Added `/api/petitions/insert` endpoint
- `.env.local` - Added petition configuration variables

## Dependencies Added

```json
{
  "resend": "^latest",
  "uuid": "^latest",
  "@tiptap/react": "^latest",
  "@tiptap/starter-kit": "^latest",
  "@tiptap/extension-image": "^latest",
  "@tiptap/extension-link": "^latest"
}
```
