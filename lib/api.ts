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
  director_name: string | null;

  // LLM-extracted: crew calls
  roles_json: string | null;        // JSON string[] of roles mentioned
  shoot_dates_text: string | null;
  petition_location: string | null;

  // Unified deadline (epoch seconds) — works for crew deadlines, grant deadlines, event dates
  deadline_at: number | null;
  script_url: string | null;

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
  summary?: boolean;
  q?: string;
  since?: number;
  until?: number;
}

interface FetchListParams {
  limit?: number;
  offset?: number;
  summary?: boolean;
  q?: string;
  since?: number;
  until?: number;
}

interface FetchPetitionsParams extends FetchListParams {
  casting?: boolean;
}

interface ApiResponse {
  ok: boolean;
  rows: EmailRow[];
  limit?: number;
  offset?: number;
  error?: string;
}

export interface CategoryCounts {
  all: number;
  all_messages?: number;
  grants: number;
  crew_calls: number;
  casting: number;
  events: number;
  resources: number;
}

interface CountsResponse {
  ok: boolean;
  counts?: CategoryCounts;
  error?: string;
}

interface TotalMessagesResponse {
  ok: boolean;
  total?: number;
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

function parseEmailRows(data: ApiResponse): ParsedEmailRow[] {
  return data.rows.map((row) => ({
    ...row,
    tags: parseJsonSafe<Tag[]>(row.tags_json, []),
    reasons: parseJsonSafe<string[]>(row.reasons_json, []),
    roles_mentioned: parseJsonSafe<string[] | null>(row.roles_json, null),
  }));
}

function shouldLogServerFetches(): boolean {
  if (typeof window !== "undefined") return false;
  if (process.env.API_DEBUG_LOGS === "true") return true;
  return process.env.NODE_ENV === "development";
}

function logServerFetch(payload: Record<string, unknown>): void {
  if (!shouldLogServerFetches()) return;
  // This logs in the Next.js server runtime, not browser devtools.
  console.log(`[next-server-fetch] ${JSON.stringify(payload)}`);
}

async function fetchEmailRows(
  path: string,
  params: Record<string, string | number | boolean | undefined>
): Promise<ParsedEmailRow[]> {
  const baseUrl = getApiUrl();
  const url = new URL(`${baseUrl}${path}`);
  const startedAt = Date.now();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    url.searchParams.set(key, String(value));
  }

  logServerFetch({
    stage: "start",
    path,
    query: Object.fromEntries(url.searchParams.entries()),
  });

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url.toString(), {
      cache: "no-store",
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

    const parsedEmails = parseEmailRows(data);

    logServerFetch({
      stage: "success",
      path,
      query: Object.fromEntries(url.searchParams.entries()),
      rows: parsedEmails.length,
      duration_ms: Date.now() - startedAt,
    });

    return parsedEmails;
  } catch (error) {
    logServerFetch({
      stage: "error",
      path,
      query: Object.fromEntries(url.searchParams.entries()),
      duration_ms: Date.now() - startedAt,
      message: error instanceof Error ? error.message : "Unknown error",
    });
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw new Error("Request timeout - Worker API took too long to respond");
      }
      throw error;
    }
    throw new Error("Unknown error fetching emails");
  }
}

export async function fetchEmails(params: FetchEmailsParams = {}): Promise<ParsedEmailRow[]> {
  const { category, tag, limit = 25, offset, includeDoNotCare = false, summary, q, since, until } = params;
  return fetchEmailRows("/api/emails", {
    category,
    tag,
    q,
    since,
    until,
    summary: summary ? "true" : undefined,
    limit,
    offset,
    includeDoNotCare: includeDoNotCare ? "true" : undefined,
  });
}

export async function fetchGrants(params: FetchListParams = {}): Promise<ParsedEmailRow[]> {
  const { limit = 25, offset, summary, q, since, until } = params;
  return fetchEmailRows("/api/grants", { limit, offset, summary: summary ? "true" : undefined, q, since, until });
}

export async function fetchPetitions(params: FetchPetitionsParams = {}): Promise<ParsedEmailRow[]> {
  const { limit = 25, offset, summary, q, since, until, casting } = params;
  return fetchEmailRows("/api/petitions", {
    limit,
    offset,
    summary: summary ? "true" : undefined,
    q,
    since,
    until,
    casting: casting === undefined ? undefined : casting ? "true" : "false",
  });
}

export async function fetchEvents(params: FetchListParams = {}): Promise<ParsedEmailRow[]> {
  const { limit = 25, offset, summary, q, since, until } = params;
  return fetchEmailRows("/api/timeline", { limit, offset, summary: summary ? "true" : undefined, q, since, until });
}

export async function fetchResources(params: FetchListParams = {}): Promise<ParsedEmailRow[]> {
  const { limit = 25, offset, summary, q, since, until } = params;
  return fetchEmailRows("/api/resources", { limit, offset, summary: summary ? "true" : undefined, q, since, until });
}

export async function fetchAdmin(params: FetchListParams = {}): Promise<ParsedEmailRow[]> {
  const { limit = 25, offset, summary, q, since, until } = params;
  return fetchEmailRows("/api/admin", { limit, offset, summary: summary ? "true" : undefined, q, since, until });
}

export async function fetchEmailById(id: string): Promise<ParsedEmailRow> {
  const rows = await fetchEmailRows("/api/email", { id });
  if (!rows.length) throw new Error(`Email not found: ${id}`);
  return rows[0];
}

export async function fetchCategoryCounts(): Promise<CategoryCounts> {
  const baseUrl = getApiUrl();
  const url = new URL(`${baseUrl}/api/counts`);

  const response = await fetch(url.toString(), { cache: "no-store" });
  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(`Worker API error (${response.status}): ${errorText}`);
  }

  const data: CountsResponse = await response.json();
  if (!data.ok || !data.counts) {
    throw new Error(data.error || "Invalid counts response");
  }
  return data.counts;
}

export async function fetchTotalMessages(includeDoNotCare = false): Promise<number> {
  const baseUrl = getApiUrl();
  const url = new URL(`${baseUrl}/api/messages/count`);
  if (includeDoNotCare) url.searchParams.set("includeDoNotCare", "true");

  const response = await fetch(url.toString(), { cache: "no-store" });
  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(`Worker API error (${response.status}): ${errorText}`);
  }

  const data: TotalMessagesResponse = await response.json();
  if (!data.ok || typeof data.total !== "number") {
    throw new Error(data.error || "Invalid total messages response");
  }
  return data.total;
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
