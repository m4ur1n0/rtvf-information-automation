# Frontend Refactoring Summary

## What Changed

The Next.js frontend has been refactored to properly integrate with the improved Worker API classification system.

## Key Improvements

### 1. **Fixed Worker API SQL Syntax Error**

**Issue**: The GET `/api/emails` endpoint had a trailing comma in the SQL SELECT statement (line 39).

**Before**:
```sql
SELECT
  id, subject, body_text, from_email, from_name, sent_at,
  category, tags_json, confidence, is_bump, thread_key, canonical_id,  -- trailing comma!
FROM emails
```

**After**:
```sql
SELECT
  id, subject, body_text, from_email, from_name, sent_at,
  category, tags_json, confidence, reasons_json, is_bump, thread_key, canonical_id
FROM emails
```

**Impact**: API requests now work correctly. Also added `reasons_json` to the SELECT so users can see why emails were classified.

---

### 2. **Enhanced EmailCard Component**

Improved status badges to show more granular information:

**Grants**:
- ✅ Open (green)
- 🟡 Upcoming (yellow)
- ❌ Closed (red)
- ❓ Status Unclear (gray)

**Crew Calls**:
- 💰 Paid (green)
- 🔓 Unpaid (gray)
- 🟡 Pay Unclear (yellow)

**Casting Calls**:
- 🎭 Roles (purple)
- 👥 Extras (purple)

**Resource Requests**:
- 🎨 Props/Costumes (blue)
- 📹 Equipment (blue)
- 📍 Location (blue)

**Additional Indicators**:
- 🔔 BUMP badge (orange) for bumped posts

**Before**: Only showed "Closed" or "Open/Unknown" for grants
**After**: Shows detailed status for all 4 foci types

---

### 3. **Improved EmailSection Component**

Added:
- Section descriptions explaining what each category contains
- Item count ("Showing 5 items")
- Better empty state messaging

**Before**:
```tsx
<h2>Grants</h2>
```

**After**:
```tsx
<h2>💰 Grants</h2>
<p>Funding opportunities and grant applications for film projects</p>
<p>Showing 5 items</p>
```

---

### 4. **Enhanced Home Page**

Added:
- Stats header showing total items and open grants count
- Emoji icons for visual clarity
- Better ordering (Grants → Crew → Casting → Resources)
- Descriptive text for each section

**Example**:
```
RTVF Opportunities
Latest grants, crew calls, resources, and casting calls from the RTVF listserv

[Total: 57]  [Open Grants: 12]

💰 Grants
Funding opportunities and grant applications for film projects
Showing 25 items
```

---

### 5. **Improved API Error Handling**

Enhanced `lib/api.ts` with:
- **10-second timeout** for requests (prevents hanging)
- **Better error messages** with context
- **Retry logic** via `fetchEmailsWithRetry()` helper
- **AbortController** for cancelling slow requests
- **Development logging** to help debug issues

**Before**:
```typescript
if (!response.ok) {
  throw new Error(`Failed to fetch emails: ${response.status}`);
}
```

**After**:
```typescript
if (!response.ok) {
  const errorText = await response.text().catch(() => "Unknown error");
  throw new Error(`Worker API error (${response.status}): ${errorText}`);
}
```

---

### 6. **Better Type Safety**

Updated TypeScript interfaces:
- Added `error` field to `ApiResponse`
- Added `description` prop to `EmailSectionProps`
- All props properly typed

---

## Files Changed

### Modified Files:

1. **`listserv-poc/worker.js`** (line 35-40)
   - Fixed SQL syntax error (removed trailing comma)
   - Added `reasons_json` to SELECT statement

2. **`components/EmailCard.tsx`**
   - Added `getStatusBadge()` function for granular status badges
   - Added BUMP indicator
   - Improved subject display (always shows, even if empty)

3. **`components/EmailSection.tsx`**
   - Added `description` prop
   - Added item count display
   - Better layout and spacing

4. **`app/page.tsx`**
   - Added stats header (total items, open grants)
   - Added emoji icons to section titles
   - Added section descriptions
   - Reordered sections for better UX

5. **`lib/api.ts`**
   - Added timeout handling (10s)
   - Added retry logic
   - Improved error messages
   - Added development logging
   - Updated `ApiResponse` interface

### New Files Created:

1. **`FRONTEND-SETUP.md`**
   - Complete setup and usage guide
   - API documentation
   - Troubleshooting tips
   - Deployment instructions

2. **`FRONTEND-REFACTORING-SUMMARY.md`** (this file)
   - Summary of changes
   - Before/after comparisons

---

## How to Use

### Development

```bash
# 1. Create .env.local
echo "WEBHOOK_URL=https://your-worker.workers.dev" > .env.local

# 2. Install dependencies
npm install

# 3. Run dev server
npm run dev

# 4. Visit http://localhost:3000
```

### Production

```bash
# Build and run
npm run build
npm start

# Or deploy to Vercel
vercel deploy --prod
```

---

## Testing

### Manual Testing

1. **Test Grant Status Badges**:
   - Look for grants with GRANT_OPEN tag → should show green "Open" badge
   - Look for grants with GRANT_CLOSED tag → should show red "Closed" badge
   - Look for grants with GRANT_UPCOMING tag → should show yellow "Upcoming" badge

2. **Test Casting Separation**:
   - "🎭 Casting Calls" section should only show CREW_CALL emails with CASTING_ROLES tag
   - "🎬 Crew Calls" section should exclude casting-tagged posts

3. **Test Resource Requests**:
   - "🔧 Resource Requests" section should show RESOURCE category emails
   - Should display specific badges: Props/Costumes, Equipment, or Location

4. **Test BUMP Detection**:
   - Emails with `is_bump === 1` should show orange "BUMP" badge

5. **Test Error Handling**:
   - Invalid API URL → should show error message in section
   - Slow API → should timeout after 10 seconds with clear message

### Integration Testing

```bash
# Test the Worker API directly
curl "https://your-worker.workers.dev/api/emails?category=GRANT&limit=5"

# Should return:
# {
#   "ok": true,
#   "rows": [...],
#   "limit": 5,
#   "offset": 0
# }
```

---

## API Usage Examples

### Get Open Grants Only

```typescript
const openGrants = await fetchEmails({
  category: "GRANT",
  tag: "GRANT_OPEN",
  limit: 25
});
```

### Get Casting Calls

```typescript
const castingCalls = await fetchEmails({
  category: "CREW_CALL",
  tag: "CASTING_ROLES",
  limit: 25
});
```

### Get Crew Calls (Non-Casting)

```typescript
const allCrewCalls = await fetchEmails({
  category: "CREW_CALL",
  limit: 50
});

// Filter out casting on frontend
const crewOnly = allCrewCalls.filter(
  email => !email.tags.includes("CASTING_ROLES") && !email.tags.includes("CASTING_EXTRAS")
);
```

### Search Across All Categories

```typescript
const results = await fetchEmails({
  q: "grant",
  limit: 50
});
```

### With Retry Logic

```typescript
import { fetchEmailsWithRetry } from "@/lib/api";

const emails = await fetchEmailsWithRetry(
  { category: "GRANT", limit: 25 },
  3 // max 3 retries
);
```

---

## Performance Considerations

### Current Settings

- **SSR Cache**: 60 seconds (Next.js ISR)
- **API Timeout**: 10 seconds
- **Max Retries**: 2 (configurable)
- **Items per Section**: 25 (configurable)

### Optimization Tips

1. **Increase cache duration** for less frequently changing data:
   ```typescript
   next: { revalidate: 300 } // 5 minutes
   ```

2. **Reduce items per section** for faster loads:
   ```typescript
   limit: 10 // instead of 25
   ```

3. **Add pagination** for large datasets:
   ```typescript
   const page = 1;
   const limit = 25;
   const offset = page * limit;
   fetchEmails({ category: "GRANT", limit, offset });
   ```

4. **Use edge runtime** for faster response:
   ```typescript
   export const runtime = 'edge';
   ```

---

## Troubleshooting

### Common Issues

**Q: Emails showing "Email body not available"**
A: Check that Worker's SQL SELECT includes `body_text` field. ✅ Fixed in this refactor.

**Q: Getting 401 Unauthorized errors**
A: Make sure GET `/api/emails` doesn't require authentication. POST endpoints should require auth, but GET should be public.

**Q: Status badges not showing correctly**
A: Verify that Worker is adding the correct tags (GRANT_OPEN, GRANT_CLOSED, CASTING_ROLES, etc.). Check the "Tags" section when expanding an email.

**Q: "API URL not configured" error**
A: Create `.env.local` with `WEBHOOK_URL=https://your-worker.workers.dev`

**Q: Request timeout errors**
A: Worker may be slow. Check Worker logs in Cloudflare dashboard. Consider increasing timeout in `lib/api.ts`.

---

## Next Steps

Potential future enhancements:

1. **Client-side filtering** - Add filter toggles for tags, status, etc.
2. **Search bar** - Full-text search across all categories
3. **Pagination** - Load more items without re-fetching
4. **Sorting** - Sort by date, confidence, or alphabetically
5. **Detail pages** - Click email to see full thread
6. **Notifications** - Email/push alerts for new grants/castings
7. **Admin panel** - Manually reclassify emails if needed

---

## Summary

The frontend is now properly integrated with the refactored Worker classification system:

✅ **SQL syntax error fixed** - API requests work correctly
✅ **Better status badges** - Grants show Open/Upcoming/Closed, Crew Calls show Paid/Unpaid
✅ **Casting separation** - Casting calls are clearly distinguished from crew calls
✅ **Improved UX** - Section descriptions, item counts, better error messages
✅ **Enhanced error handling** - Timeouts, retries, better error messages
✅ **Proper typing** - All TypeScript types updated
✅ **Documentation** - Complete setup guide and API docs

The 4 key foci are now accurately displayed with detailed metadata from the improved classification system! 🎉
