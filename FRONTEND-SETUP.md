# Frontend Setup & Usage Guide

## Overview

This Next.js frontend displays the 4 key foci from the RTVF listserv, powered by the refactored Cloudflare Worker classification system:

1. **💰 Grants** - Funding opportunities (filtered by open/upcoming/closed status)
2. **🎬 Crew Calls** - Non-casting crew recruitment (DP, sound, editor, etc.)
3. **🎭 Casting Calls** - Actor recruitment and auditions (separated from crew calls)
4. **🔧 Resource Requests** - Equipment, props, costumes, locations

## Prerequisites

- Node.js 18+ installed
- Cloudflare Worker deployed with the refactored classification logic
- Worker API accessible via URL

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file in the project root:

```env
# Cloudflare Worker URL (for server-side requests)
WEBHOOK_URL=https://your-worker.your-subdomain.workers.dev

# Public API URL (optional, for client-side requests)
NEXT_PUBLIC_API_URL=https://your-worker.your-subdomain.workers.dev
```

**Note**: Use `WEBHOOK_URL` for server-side fetching (recommended for security). Use `NEXT_PUBLIC_API_URL` if you need client-side API access.

### 3. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` to see the app.

### 4. Build for Production

```bash
npm run build
npm start
```

## How It Works

### Data Fetching Strategy

The frontend uses **Server-Side Rendering (SSR)** with Next.js App Router to fetch data on the server:

1. **Parallel Fetching**: All 4 sections are fetched simultaneously for fast page loads
2. **Filtered Queries**: Each section uses specific API parameters:
   - Grants: `?category=GRANT&limit=25`
   - Crew Calls: `?category=CREW_CALL&limit=25` (then filters out CASTING_* tags)
   - Casting Calls: `?category=CREW_CALL&tag=CASTING_ROLES&limit=25`
   - Resource Requests: `?category=RESOURCE&limit=25`
3. **60-Second Cache**: Data is cached for 60 seconds using Next.js revalidation

### API Endpoints Used

All requests go to the Worker's `/api/emails` endpoint with query parameters:

**GET /api/emails**

Query Parameters:
- `category` - Filter by category (GRANT, CREW_CALL, RESOURCE, etc.)
- `tag` - Filter by tag (CASTING_ROLES, GRANT_OPEN, etc.)
- `limit` - Max results (default: 50, max: 200)
- `offset` - Pagination offset (default: 0)
- `includeDoNotCare` - Include DO_NOT_CARE category (default: false)
- `q` - Search query (searches subject and body)
- `since` - Unix timestamp for filtering by date
- `until` - Unix timestamp for filtering by date

**Example Requests:**

```bash
# Get open grants
curl "https://your-worker.workers.dev/api/emails?category=GRANT&tag=GRANT_OPEN&limit=25"

# Get casting calls
curl "https://your-worker.workers.dev/api/emails?category=CREW_CALL&tag=CASTING_ROLES&limit=25"

# Get all crew calls (casting + non-casting)
curl "https://your-worker.workers.dev/api/emails?category=CREW_CALL&limit=50"

# Search for "grant" in subject/body
curl "https://your-worker.workers.dev/api/emails?q=grant&limit=25"
```

## UI Components

### EmailCard Component

Displays individual emails with:
- **Collapsed View**: Shows type, date, status badge, and BUMP indicator
- **Expanded View**: Shows full subject, sender, body, tags, confidence, and classification reasons

**Status Badges:**
- **Grants**: Open (green), Upcoming (yellow), Closed (red), Status Unclear (gray)
- **Crew Calls**: Paid (green), Unpaid (gray), Pay Unclear (yellow)
- **Casting Calls**: Roles (purple), Extras (purple)
- **Resource Requests**: Props/Costumes, Equipment, Location (blue)

### EmailSection Component

Groups emails by category with:
- Section title and description
- Item count
- Error handling (shows error message if fetch fails)
- Empty state (shows "No items found" if category is empty)

## Customization

### Adjusting Fetch Limits

Edit `app/page.tsx` to change the number of items fetched per section:

```typescript
const emails = await fetchEmails({ category: "GRANT", limit: 50 }); // Change 25 → 50
```

### Filtering by Date Range

Add `since` and `until` parameters to fetch only recent items:

```typescript
const oneWeekAgo = Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60);
const emails = await fetchEmails({
  category: "GRANT",
  since: oneWeekAgo,
  limit: 25
});
```

### Showing Only Open Grants

Update `fetchGrantsData()` in `app/page.tsx`:

```typescript
async function fetchGrantsData(): Promise<{ emails: ParsedEmailRow[]; error?: string }> {
  try {
    // Fetch ONLY open grants
    const emails = await fetchEmails({ category: "GRANT", tag: "GRANT_OPEN", limit: 25 });
    return { emails };
  } catch (error) {
    return { emails: [], error: error instanceof Error ? error.message : "Unknown error" };
  }
}
```

### Adding Pagination

To add pagination, update the fetch functions to accept an offset parameter:

```typescript
const [page, setPage] = useState(0);
const limit = 25;
const offset = page * limit;

const emails = await fetchEmails({ category: "GRANT", limit, offset });
```

## Troubleshooting

### Issue: "API URL not configured"

**Cause**: Missing environment variables
**Fix**: Ensure `.env.local` has `WEBHOOK_URL` or `NEXT_PUBLIC_API_URL`

### Issue: "Failed to fetch emails: 401 Unauthorized"

**Cause**: Worker requires authentication but frontend isn't sending credentials
**Fix**: The `/api/emails` endpoint should be public. If your worker requires auth for GET requests, update the worker to allow unauthenticated reads:

```javascript
if (req.method === "GET" && url.pathname === "/api/emails") {
  // No authOk() check for GET requests
  // ...
}
```

### Issue: Emails showing "Email body not available"

**Cause**: Worker's SQL SELECT statement may be missing `body_text` field
**Fix**: Verified in refactored worker.js - `body_text` is included in the SELECT

### Issue: Low number of resource requests (1-3%)

**Note**: This is expected! Most equipment/prop requests happen off-listserv or in private channels. The classification is working correctly, but the data naturally has fewer resource requests.

### Issue: Classification seems incorrect

**Debug Steps:**
1. Check the `confidence` score (shown in expanded view)
2. Read the `Classification Reasons` (shown in expanded view)
3. Review the `tags` to see what signals were detected
4. If consistently wrong, update the classification keywords in `worker.js`

## Performance

### Caching Strategy

- **Server-side cache**: 60 seconds (Next.js ISR)
- **Worker-side cache**: None (real-time data)

To adjust server cache duration, edit `lib/api.ts`:

```typescript
const response = await fetch(url.toString(), {
  next: { revalidate: 120 }, // Change 60 → 120 seconds
});
```

### Optimizing for Large Datasets

If the listserv grows significantly:

1. **Implement pagination** to avoid fetching all items at once
2. **Add client-side filtering** to avoid re-fetching when filtering/sorting
3. **Use incremental static regeneration** (ISR) to pre-render pages
4. **Add a search bar** with debounced API calls

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Connect repo to Vercel
3. Add environment variables in Vercel dashboard:
   - `WEBHOOK_URL=https://your-worker.workers.dev`
4. Deploy

### Other Platforms

Compatible with any platform that supports Next.js:
- Netlify
- AWS Amplify
- Google Cloud Run
- Self-hosted with PM2

## API Response Format

The Worker returns this JSON structure:

```json
{
  "ok": true,
  "rows": [
    {
      "id": "abc123...",
      "subject": "CASTING CALL FOR OPALINE",
      "body_text": "We are seeking actors...",
      "from_email": "student@example.com",
      "from_name": "John Doe",
      "sent_at": 1706745600,
      "category": "CREW_CALL",
      "tags_json": "[\"CASTING_ROLES\",\"PAY_UNCLEAR\"]",
      "confidence": 0.8,
      "reasons_json": "[\"CREW_CALL: subject contains casting signal: 'casting call'\"]",
      "is_bump": 0,
      "thread_key": "casting call for opaline",
      "canonical_id": null
    }
  ],
  "limit": 25,
  "offset": 0
}
```

The frontend parses `tags_json` and `reasons_json` into arrays for easier use.

## Future Enhancements

Potential improvements:

1. **Search bar** - Add text search across all categories
2. **Date filters** - Filter by sent date range
3. **Tag filters** - Filter by multiple tags (e.g., "Show only paid crew calls")
4. **Sorting** - Sort by date, confidence, or alphabetically
5. **Detail pages** - Click email to see full thread/conversation
6. **RSS feeds** - Subscribe to specific categories
7. **Email notifications** - Get notified when new grants/castings are posted
8. **Admin panel** - Manually reclassify emails if needed

## Architecture Diagram

```
┌─────────────┐
│  CSV Data   │
│ (5000 rows) │
└──────┬──────┘
       │
       │ POST /webhook/email
       │
       ▼
┌──────────────────────────┐
│  Cloudflare Worker       │
│  - stripQuotedEmail()    │
│  - classify() (3-layer)  │
│  - Stores in D1 database │
└──────────┬───────────────┘
           │
           │ GET /api/emails?category=...
           │
           ▼
┌──────────────────────────┐
│  Next.js Frontend (SSR)  │
│  - fetchEmails()         │
│  - 4 parallel requests   │
│  - Renders EmailCards    │
└──────────────────────────┘
```

## Support

For issues or questions:
1. Check the Worker logs in Cloudflare dashboard
2. Run the classification test harness: `node listserv-poc/classify-test-harness.js`
3. Review the `CLASSIFICATION-IMPROVEMENTS.md` document
4. Check the browser console for fetch errors
