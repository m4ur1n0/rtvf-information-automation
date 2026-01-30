import type { Category, Tag } from "@/app/types/schema";

export interface EmailRow {
  id: string;
  subject: string;
  body_text: string;
  sent_at: number; // epoch seconds
  category: Category;
  tags_json: string; // JSON array
  confidence: number;
  reasons_json: string; // JSON array
  is_bump: number;
  thread_key: string | null;
  canonical_id: string | null;
  from_email: string | null;
  from_name: string | null;
  reply_to: string | null;
  [key: string]: any; // Allow additional fields from API
}

export interface ParsedEmailRow extends Omit<EmailRow, "tags_json" | "reasons_json"> {
  tags: Tag[];
  reasons: string[];
}

interface FetchEmailsParams {
  category?: Category;
  tag?: string;
  limit?: number;
  offset?: number;
  includeDoNotCare?: boolean;
}

interface ApiResponse {
  ok: boolean;
  rows: EmailRow[];
  limit?: number;
  offset?: number;
  error?: string;
}

function getApiUrl(): string {
  // Try NEXT_PUBLIC_API_URL first (client-accessible), then WEBHOOK_URL (server-only)
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
  const { category, tag, limit = 25, offset, includeDoNotCare = false } = params;

  try {
    const baseUrl = getApiUrl();
    const url = new URL(`${baseUrl}/api/emails`);

    // Build query parameters
    if (category) url.searchParams.set("category", category);
    if (tag) url.searchParams.set("tag", tag);
    url.searchParams.set("limit", limit.toString());
    if (offset !== undefined) url.searchParams.set("offset", offset.toString());
    if (includeDoNotCare) url.searchParams.set("includeDoNotCare", "true");

    // Fetch with timeout and caching
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(url.toString(), {
      next: { revalidate: 60 }, // Cache for 60 seconds
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

    // Parse JSON fields and validate
    const parsedEmails = data.rows.map((row) => ({
      ...row,
      tags: parseJsonSafe<Tag[]>(row.tags_json, []),
      reasons: parseJsonSafe<string[]>(row.reasons_json, []),
    }));

    // Log for debugging (only in development)
    if (process.env.NODE_ENV === "development" && parsedEmails.length > 0) {
      console.log(`[API] Fetched ${parsedEmails.length} emails (category: ${category || "all"}, tag: ${tag || "none"})`);
    }

    return parsedEmails;
  } catch (error) {
    // Enhanced error handling
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw new Error("Request timeout - Worker API took too long to respond");
      }
      throw error;
    }
    throw new Error("Unknown error fetching emails");
  }
}

// Helper: Fetch emails with retry logic
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
        // Wait before retry (exponential backoff)
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, i) * 1000));
      }
    }
  }

  throw lastError || new Error("Failed after retries");
}
