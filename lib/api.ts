import type { Category, Tag } from "@/app/types/schema";

export interface EmailRow {
  // Identity
  id: string;
  thread_key: string | null;
  canonical_id: string | null;

  // Sender
  from_email: string | null;
  from_name: string | null;
  reply_to: string | null;

  // Content
  subject: string;
  body_text: string;
  body_html: string | null;     // HTML version of the email body (for iframe rendering)
  sent_at: number;              // epoch seconds

  // Classification
  category: Category;
  tags_json: string;            // JSON string[] — use `tags` on ParsedEmailRow
  confidence: number;
  reasons_json: string;         // JSON string[] — use `reasons` on ParsedEmailRow
  is_bump: number;              // 0 | 1

  // LLM-extracted: general
  film_title: string | null;
  logline: string | null;
  production_type: string | null;

  // LLM-extracted: crew calls
  roles_json: string | null;        // JSON string[] of roles mentioned
  shoot_dates_text: string | null;
  petition_location: string | null;

  // Unified deadline (epoch seconds) — works for crew deadlines, grant deadlines, event dates
  deadline_at: number | null;

  // LLM-extracted: grants
  grant_amount: string | null;
  grant_status: string | null;      // open | upcoming | closed | unclear
  application_url: string | null;
  eligibility_text: string | null;
  grant_scope: string | null;       // production | post | equipment | travel | unclear

  // LLM-extracted: events
  event_date_text: string | null;
  event_location: string | null;
  rsvp_url: string | null;

  // Classifier metadata
  llm_reasoning: string | null;
  classifier_version: string | null;

  // Legacy extracted arrays
  deadlines_json: string | null;    // JSON { text, iso }[]
  contacts_json: string | null;     // JSON { type, value }[]
}

export interface ParsedEmailRow extends Omit<EmailRow, "tags_json" | "reasons_json" | "roles_json"> {
  tags: Tag[];
  reasons: string[];
  roles_mentioned: string[] | null;
}

interface FetchEmailsParams {
  category?: Category;
  tag?: string;
  limit?: number;
  offset?: number;
  includeDoNotCare?: boolean;
  q?: string;
  since?: number;
  until?: number;
}

interface ApiResponse {
  ok: boolean;
  rows: EmailRow[];
  limit?: number;
  offset?: number;
  error?: string;
}

function getApiUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL || process.env.WEBHOOK_URL;
  if (!url) {
    throw new Error("API URL not configured. Set NEXT_PUBLIC_API_URL or WEBHOOK_URL in .env.local");
  }
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

function parseJsonSafe<T>(json: string | null | undefined, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

export async function fetchEmails(params: FetchEmailsParams = {}): Promise<ParsedEmailRow[]> {
  const { category, tag, limit = 25, offset, includeDoNotCare = false, q, since, until } = params;

  try {
    const baseUrl = getApiUrl();
    const url = new URL(`${baseUrl}/api/emails`);

    if (category) url.searchParams.set("category", category);
    if (tag) url.searchParams.set("tag", tag);
    if (q) url.searchParams.set("q", q);
    if (since !== undefined) url.searchParams.set("since", since.toString());
    if (until !== undefined) url.searchParams.set("until", until.toString());
    url.searchParams.set("limit", limit.toString());
    if (offset !== undefined) url.searchParams.set("offset", offset.toString());
    if (includeDoNotCare) url.searchParams.set("includeDoNotCare", "true");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url.toString(), {
      next: { revalidate: 60 },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(`Worker API error (${response.status}): ${errorText}`);
    }

    const data: ApiResponse = await response.json();

    if (!data.ok) {
      throw new Error(data.error || "API returned ok: false");
    }

    if (!Array.isArray(data.rows)) {
      throw new Error("Invalid API response format: rows is not an array");
    }

    const parsedEmails = data.rows.map((row) => ({
      ...row,
      tags: parseJsonSafe<Tag[]>(row.tags_json, []),
      reasons: parseJsonSafe<string[]>(row.reasons_json, []),
      roles_mentioned: parseJsonSafe<string[] | null>(row.roles_json, null),
    }));

    if (process.env.NODE_ENV === "development" && parsedEmails.length > 0) {
      console.log(`[API] Fetched ${parsedEmails.length} emails (category: ${category || "all"}, tag: ${tag || "none"})`);
    }

    return parsedEmails;
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw new Error("Request timeout - Worker API took too long to respond");
      }
      throw error;
    }
    throw new Error("Unknown error fetching emails");
  }
}

export async function fetchEmailsWithRetry(
  params: FetchEmailsParams = {},
  maxRetries = 2
): Promise<ParsedEmailRow[]> {
  let lastError: Error | null = null;

  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fetchEmails(params);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown error");
      if (i < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, i) * 1000));
      }
    }
  }

  throw lastError || new Error("Failed after retries");
}
