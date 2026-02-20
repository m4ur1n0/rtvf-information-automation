/**
 * classify.js — shared classification module
 *
 * Exported by both worker.js (Cloudflare Worker) and llm-test-harness.mjs
 * (Node.js test script). Keep this file free of any runtime-specific APIs.
 *
 * Exports:
 *   LLM_SYSTEM_PROMPT   — system prompt string
 *   LLM_JSON_SCHEMA     — JSON schema used for structured model output
 *   classifyWithLLM     — async (apiKey, subject, bodyText) → parsed result
 *   classify            — sync  (subject, bodyText) → parsed result (regex fallback)
 *   stripQuotedEmail    — strip reply chains from plain text
 *   htmlToPlainText     — strip HTML tags to readable plain text
 *   parseCsv            — parse RFC-4180 CSV text into string[][]
 *   extractDateCandidates  — extract { text, iso }[] from free text
 *   extractContacts        — extract { type, value }[] (emails, URLs) from free text
 */

// ─── System prompt ────────────────────────────────────────────────────────────

export const LLM_SYSTEM_PROMPT = `You are an email classifier for the Northwestern University RTVF (Radio/TV/Film) department listserv. Your entire response must be a single JSON object. Do NOT add any fields that are not listed below. Fill in EVERY field — never skip a field or leave an array empty if something applies.

═══ RTVF CONTEXT ═══
- "Petitioning" = in-person application to join a film crew (at Shakesmart, Norris, Louis Hall, etc.)
- "PPSL" = Pre-Production Student Lab student film program
- "MAG" / "Media Arts Grant" = Northwestern RTVF production funding
- "Senior Directing Film" / "ATP" = senior thesis film
- "Sitcom Production Grant" = grant for sitcom pilots
- "The Cage" = RTVF Equipment Resource Center — hiring here is ADMIN, not CREW_CALL
- "Self-tapes" = remote audition video submissions
- "BUMP" / "BUMPING THIS" = re-posting an earlier announcement to boost visibility

═══ CATEGORY — pick exactly one ═══
CREW_CALL   Seeking crew (DP, editor, sound, gaffer, grip, PA, producer, etc.) OR actors/extras for a student film
GRANT       Funding opportunities, grant announcements, application deadlines
EVENT       Screenings, workshops, panels, info sessions, writer's circles, club meetings
RESOURCE    Requests to borrow items, seeking filming locations, sourcing props/costumes/equipment
ADMIN       Official dept communications, program announcements, The Cage hiring, faculty notices
DO_NOT_CARE Pure social events (game nights, watch parties, hangouts) with zero film-production relevance
OTHER       Doesn't fit any above

═══ TAGS — include EVERY tag that applies; never return [] if any apply ═══

BUMP DETECTION (check first — applies across all categories):
  BUMP          Body opens with "BUMP", "BUMPING THIS", "bumping", "re-posting", "signal boost", or the subject has "Re:" on an older announcement. ALWAYS set is_bump=true when using this tag.
  REPLY_CHAIN   Email is a reply chain (subject starts with "Re:") but is NOT a bump — it's a new discussion

CREW_CALL tags:
  CASTING_ROLES    Seeking actors for named speaking roles (casting call, auditions, voice actors, self-tapes)
  CASTING_EXTRAS   Seeking background extras or "extras"
  SHOOT_DATES_PRESENT  Specific filming dates are stated (e.g. "Spring Weekend 1", "April 3-5", "Winter Week 5")
  CREW_DP          Director of Photography role mentioned
  CREW_SOUND       Sound designer/mixer/boom role mentioned
  CREW_EDITOR      Editor role mentioned
  CREW_GAFF_GRIP   Gaffer or grip role mentioned
  CREW_PROD        Producer or production manager role mentioned
  HAS_CONTACT_INFO Email address or application link present

GRANT tags:
  GRANT_OPEN / GRANT_UPCOMING / GRANT_CLOSED / GRANT_STATUS_UNCLEAR   Always include exactly one
  HAS_DEADLINE     A deadline date is stated
  ELIG_UNDERGRAD / ELIG_GRAD / ELIG_BOTH / ELIG_UNCLEAR   Always include exactly one
  SCOPE_PRODUCTION / SCOPE_POST / SCOPE_EQUIPMENT / SCOPE_TRAVEL / SCOPE_UNCLEAR   Always include exactly one

EVENT tags:
  SCREENING    Film screening
  WORKSHOP     Workshop or hands-on session
  PANEL        Panel discussion
  MEETING      Club or committee meeting
  INFO_SESSION Informational session about a program or grant
  RSVP         A link or instruction to RSVP is present

RESOURCE tags:
  PROPS_COSTUMES   Seeking props, costumes, or wardrobe
  EQUIPMENT        Seeking cameras, lenses, lights, or other production gear
  LOCATION         Seeking a filming location

═══ FIELDS — fill every one, use null only if genuinely not mentioned ═══
category        (required, one of the category values above)
tags            (required array, see tag rules above — never empty if anything applies)
confidence      (0.0–1.0 float — be precise, not always 0.75)
is_bump         (true if BUMP tag applies, false otherwise)
reasoning       (required: 1–2 sentences explaining your category + confidence)
film_title      Film name extracted from body (not the email subject line), or null
logline         Logline/synopsis if explicitly written in the email, or null
production_type e.g. "PPSL Film", "MAG-funded", "Senior Directing Film", "Sitcom Production Grant", "Wildcat Animate Film", "MultiCulti Studios Film", or null
director_name   Film director name if explicitly stated in the message body (e.g. "Director: Jane Doe"), or null
roles_mentioned Array of all specific job titles mentioned, or null (e.g. ["DP","Sound Designer","Editor"])
shoot_dates_text Filming schedule as written in the email, or null
petition_location How/where to apply for crew (e.g. "Petitions at Shakesmart", "Fill out this form: URL"), or null
grant_amount    e.g. "up to $750" or "$750–$3,000", or null
grant_status    "open", "upcoming", "closed", or "unclear" for GRANTs, null otherwise
deadline_text   Deadline as written in the email, or null
deadline_iso    Deadline in YYYY-MM-DD format if parseable, or null
application_url Direct URL to apply/petition, or null
eligibility_text Who is eligible as stated, or null
grant_scope     "production", "post", "equipment", "travel", or "unclear" for GRANTs, null otherwise
event_date_text When the event happens, or null
event_location  Where the event is, or null
rsvp_url        RSVP URL or instructions, or null

═══ LINK RULES (VERY IMPORTANT) ═══
- Ignore listserv unsubscribe/admin links (for example links containing SUBED1=RTVF, wa.exe unsubscribe pages, or "To unsubscribe from the RTVF list").
- Never use unsubscribe links for application_url, rsvp_url, or petition_location.
- Prefer direct destination links (Google Form, SignUpGenius, official application page), not security-wrapper URLs.
- If no valid action link exists, set application_url / rsvp_url to null.`;

// ─── response_json schema ─────────────────────────────────────────────────────
// Passed to Cerebras as response_format.json_schema.schema.
// The model returns JSON text matching this schema.

export const LLM_JSON_SCHEMA = {
  type: "object",
  properties: {
    // ── Core classification ──────────────────────────────────────────────
    category: {
      type: "string",
      enum: [
        "CREW_CALL",
        "GRANT",
        "EVENT",
        "RESOURCE",
        "ADMIN",
        "DO_NOT_CARE",
        "OTHER",
      ],
    },
    tags: {
      type: "array",
      items: {
        type: "string",
        enum: [
          // Grant
          "GRANT_OPEN",
          "GRANT_UPCOMING",
          "GRANT_CLOSED",
          "GRANT_STATUS_UNCLEAR",
          "ELIG_UNDERGRAD",
          "ELIG_GRAD",
          "ELIG_BOTH",
          "ELIG_UNCLEAR",
          "SCOPE_PRODUCTION",
          "SCOPE_POST",
          "SCOPE_EQUIPMENT",
          "SCOPE_TRAVEL",
          "SCOPE_UNCLEAR",
          // Crew / casting
          "CASTING_EXTRAS",
          "CASTING_ROLES",
          "CREW_DP",
          "CREW_SOUND",
          "CREW_EDITOR",
          "CREW_GAFF_GRIP",
          "CREW_PROD",
          "SHOOT_DATES_PRESENT",
          // Event
          "RSVP",
          "SCREENING",
          "WORKSHOP",
          "MEETING",
          "PANEL",
          "INFO_SESSION",
          // Resource
          "EQUIPMENT",
          "LOCATION",
          "PROPS_COSTUMES",
          "EDITING_SERVICES",
          // Meta
          "HAS_DEADLINE",
          "HAS_CONTACT_INFO",
          "BUMP",
          "REPLY_CHAIN",
        ],
      },
    },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    is_bump: { type: "boolean" },
    reasoning: { type: "string" },

    // ── General production info ──────────────────────────────────────────
    film_title: { anyOf: [{ type: "string" }, { type: "null" }] },
    logline: { anyOf: [{ type: "string" }, { type: "null" }] },
    production_type: { anyOf: [{ type: "string" }, { type: "null" }] },
    director_name: { anyOf: [{ type: "string" }, { type: "null" }] },

    // ── Crew-call specifics ──────────────────────────────────────────────
    roles_mentioned: {
      anyOf: [{ type: "array", items: { type: "string" } }, { type: "null" }],
    },
    shoot_dates_text: { anyOf: [{ type: "string" }, { type: "null" }] },
    petition_location: { anyOf: [{ type: "string" }, { type: "null" }] },

    // ── Grant specifics ──────────────────────────────────────────────────
    grant_amount: { anyOf: [{ type: "string" }, { type: "null" }] },
    grant_status: {
      anyOf: [
        { type: "string", enum: ["open", "upcoming", "closed", "unclear"] },
        { type: "null" },
      ],
    },
    deadline_text: { anyOf: [{ type: "string" }, { type: "null" }] },
    deadline_iso: { anyOf: [{ type: "string" }, { type: "null" }] },
    application_url: { anyOf: [{ type: "string" }, { type: "null" }] },
    eligibility_text: { anyOf: [{ type: "string" }, { type: "null" }] },
    grant_scope: {
      anyOf: [
        {
          type: "string",
          enum: ["production", "post", "equipment", "travel", "unclear"],
        },
        { type: "null" },
      ],
    },

    // ── Event specifics ──────────────────────────────────────────────────
    event_date_text: { anyOf: [{ type: "string" }, { type: "null" }] },
    event_location: { anyOf: [{ type: "string" }, { type: "null" }] },
    rsvp_url: { anyOf: [{ type: "string" }, { type: "null" }] },
  },
  required: [
    "category",
    "tags",
    "confidence",
    "is_bump",
    "reasoning",
    "film_title",
    "logline",
    "production_type",
    "director_name",
    "roles_mentioned",
    "shoot_dates_text",
    "petition_location",
    "grant_amount",
    "grant_status",
    "deadline_text",
    "deadline_iso",
    "application_url",
    "eligibility_text",
    "grant_scope",
    "event_date_text",
    "event_location",
    "rsvp_url",
  ],
  additionalProperties: false,
};

export const LLM_MODEL = "gpt-oss-120b";
const CEREBRAS_API_BASE = "https://api.cerebras.ai/v1";
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);
const DEFAULT_MAX_ATTEMPTS = 4;
const INITIAL_MAX_OUTPUT_TOKENS = 2048;
const MAX_OUTPUT_TOKENS = 4096;

// ─── LLM classifier (primary path) ───────────────────────────────────────────

/**
 * @param {string} apiKey  Cerebras API key
 * @param {string} subject Email subject line
 * @param {string} bodyText Plain-text email body (pre-processed with stripQuotedEmail)
 * @param {object} [options]
 * @param {string} [options.model]
 * @param {number} [options.maxAttempts]
 * @param {number} [options.maxOutputTokens]
 * @returns {Promise<object>} Validated classification result
 */
export async function classifyWithLLM(apiKey, subject, bodyText, options = {}) {
  if (!apiKey) throw new Error("CEREBRAS_API_KEY not configured");

  const model =
    typeof options.model === "string" && options.model.trim()
      ? options.model.trim()
      : LLM_MODEL;
  const maxAttempts = Number.isFinite(options.maxAttempts)
    ? Math.max(1, Math.trunc(options.maxAttempts))
    : DEFAULT_MAX_ATTEMPTS;

  let maxOutputTokens = Number.isFinite(options.maxOutputTokens)
    ? Math.min(MAX_OUTPUT_TOKENS, Math.max(512, Math.trunc(options.maxOutputTokens)))
    : INITIAL_MAX_OUTPUT_TOKENS;

  const truncBody = (bodyText || "").slice(0, 2500);
  const prompt = `Subject: ${subject}\n\nBody:\n${truncBody}`;
  let parsed;
  let usageMetadata = null;
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(
        `${CEREBRAS_API_BASE}/chat/completions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: "system",
                content: LLM_SYSTEM_PROMPT,
              },
              {
                role: "user",
                content: prompt,
              },
            ],
            temperature: 0.1,
            top_p: 0.95,
            max_tokens: maxOutputTokens,
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "rtvf_email_classifier",
                strict: true,
                schema: LLM_JSON_SCHEMA,
              },
            },
          }),
        },
      );

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        const retryable = RETRYABLE_STATUS_CODES.has(response.status);
        if (retryable && attempt < maxAttempts) {
          await _sleep(_retryDelayMs(attempt));
          continue;
        }
        throw new Error(`Cerebras API ${response.status}: ${errText.slice(0, 300)}`);
      }

      const data = await response.json();
      usageMetadata = data.usage ?? null;
      const finishReason = data.choices?.[0]?.finish_reason ?? null;
      const rawContent = data.choices?.[0]?.message?.content ?? "";
      const content =
        typeof rawContent === "string"
          ? rawContent
          : Array.isArray(rawContent)
            ? rawContent
                .map((part) => {
                  if (typeof part === "string") return part;
                  if (part && typeof part === "object" && typeof part.text === "string") {
                    return part.text;
                  }
                  return "";
                })
                .join("")
                .trim()
            : rawContent && typeof rawContent === "object"
              ? JSON.stringify(rawContent)
              : "";
      if (!content) {
        throw new Error(
          `Cerebras returned empty content (finishReason=${finishReason ?? "unknown"})`,
        );
      }

      try {
        parsed = _parseModelJson(content);
      } catch (parseErr) {
        const parseMsg = parseErr instanceof Error ? parseErr.message : String(parseErr);
        const looksTruncated =
          finishReason === "length" || /Unexpected end of JSON input/i.test(parseMsg);
        if (attempt < maxAttempts) {
          if (looksTruncated) {
            maxOutputTokens = Math.min(MAX_OUTPUT_TOKENS, maxOutputTokens * 2);
          }
          await _sleep(_retryDelayMs(attempt));
          continue;
        }
        throw new Error(
          `LLM returned non-JSON (finishReason=${finishReason ?? "unknown"}): ${content.slice(0, 200)}`,
        );
      }

      break;
    } catch (err) {
      lastError = err;
      if (attempt >= maxAttempts) break;
      if (err instanceof Error && /Cerebras API \d+:/.test(err.message)) {
        // Non-retryable API errors are already thrown above.
        if (!/Cerebras API (429|500|502|503|504):/.test(err.message)) break;
      }
      await _sleep(_retryDelayMs(attempt));
    }
  }

  if (!parsed) {
    throw lastError instanceof Error ? lastError : new Error("LLM classification failed");
  }

  // ── Coerce / fill missing fields ─────────────────────────────────────────
  // Model sometimes invents a "metadata" wrapper or top-level extra keys; ignore them.

  const validCats = [
    "CREW_CALL",
    "GRANT",
    "EVENT",
    "RESOURCE",
    "ADMIN",
    "DO_NOT_CARE",
    "OTHER",
  ];
  if (!validCats.includes(parsed.category)) parsed.category = "OTHER";

  if (!Array.isArray(parsed.tags)) parsed.tags = [];
  // Discard any tags the model hallucinated outside the allowed enum
  const ALLOWED_TAGS = new Set([
    "GRANT_OPEN",
    "GRANT_UPCOMING",
    "GRANT_CLOSED",
    "GRANT_STATUS_UNCLEAR",
    "ELIG_UNDERGRAD",
    "ELIG_GRAD",
    "ELIG_BOTH",
    "ELIG_UNCLEAR",
    "SCOPE_PRODUCTION",
    "SCOPE_POST",
    "SCOPE_EQUIPMENT",
    "SCOPE_TRAVEL",
    "SCOPE_UNCLEAR",
    "CASTING_EXTRAS",
    "CASTING_ROLES",
    "CREW_DP",
    "CREW_SOUND",
    "CREW_EDITOR",
    "CREW_GAFF_GRIP",
    "CREW_PROD",
    "SHOOT_DATES_PRESENT",
    "HAS_DEADLINE",
    "HAS_CONTACT_INFO",
    "RSVP",
    "SCREENING",
    "WORKSHOP",
    "MEETING",
    "PANEL",
    "INFO_SESSION",
    "EQUIPMENT",
    "LOCATION",
    "PROPS_COSTUMES",
    "EDITING_SERVICES",
    "BUMP",
    "REPLY_CHAIN",
  ]);
  parsed.tags = parsed.tags.filter(
    (t) => typeof t === "string" && ALLOWED_TAGS.has(t),
  );

  if (
    typeof parsed.confidence !== "number" ||
    parsed.confidence < 0 ||
    parsed.confidence > 1
  ) {
    parsed.confidence = 0.75;
  }

  // Sync is_bump with BUMP tag presence — whichever signal fires, both should agree
  if (parsed.tags.includes("BUMP")) parsed.is_bump = true;
  if (parsed.is_bump && !parsed.tags.includes("BUMP")) parsed.tags.push("BUMP");
  parsed.is_bump = Boolean(parsed.is_bump);

  if (
    !Array.isArray(parsed.roles_mentioned) ||
    parsed.roles_mentioned.length === 0
  ) {
    parsed.roles_mentioned = null;
  }
  if (typeof parsed.director_name !== "string" || !parsed.director_name.trim()) {
    parsed.director_name = null;
  }

  if (typeof parsed.reasoning !== "string" || !parsed.reasoning.trim()) {
    parsed.reasoning = null;
  }

  parsed.application_url = _sanitizeActionUrl(parsed.application_url);
  parsed.rsvp_url = _sanitizeActionUrl(parsed.rsvp_url);

  // Attach raw token usage for observability
  parsed._usage = usageMetadata;

  return parsed;
}

function _retryDelayMs(attempt) {
  const base = Math.min(8000, 400 * Math.pow(2, attempt - 1));
  const jitter = Math.floor(Math.random() * 200);
  return base + jitter;
}

function _sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function _parseModelJson(content) {
  try {
    return JSON.parse(content);
  } catch {
    const fence = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (fence) {
      try {
        return JSON.parse(fence[1]);
      } catch {
        // Keep trying.
      }
    }

    const s = content.indexOf("{");
    const e = content.lastIndexOf("}");
    if (s !== -1 && e > s) {
      try {
        return JSON.parse(content.slice(s, e + 1));
      } catch {
        // Keep trying.
      }
    }
  }

  throw new Error("Could not parse model response as JSON");
}

// ─── Regex / heuristic classifier (fallback) ─────────────────────────────────

export function classify(subject, bodyText) {
  const subRaw = String(subject ?? "");
  const bodRaw = String(bodyText ?? "");
  const sub = subRaw.toLowerCase();
  const bod = bodRaw.toLowerCase();
  const combined = `${sub}\n${bod}`;

  const reasons = [];
  const tags = new Set();
  const deadlines = extractDateCandidates(combined);
  const contacts = extractContacts(`${subRaw}\n${bodRaw}`);

  // L1: strong subject patterns
  const doNotCareSubject = [
    "game night",
    "watch party",
    "oscars watch party",
    "hangout",
    "come chill",
    "party",
    "karaoke",
    "free food",
    "speed dating",
    "lost and found",
    "sublet",
    "roommate",
    "rideshare",
    "ride share",
    "buy/sell",
    "join us for",
    "good vibes",
  ];
  if (_hasAny(sub, doNotCareSubject)) {
    reasons.push("DO_NOT_CARE: social/off-topic subject");
    return _pack("DO_NOT_CARE", tags, 0.9, reasons, deadlines, contacts);
  }

  const grantSubject = [
    "grant",
    "grants",
    "funding",
    "call for proposals",
    "submissions open",
    "grant deadline",
    "grant application",
    "applications are due",
    "apply by",
  ];
  if (_hasAny(sub, grantSubject)) {
    tags.add("GRANT_STATUS_UNCLEAR");
    reasons.push("GRANT: subject contains grant signal");
    return _finalize("GRANT", tags, reasons, combined, deadlines, contacts);
  }

  const castingSubject = [
    "casting call",
    "auditions",
    "audition",
    "extras needed",
    "extras call",
    "seeking extras",
    "self tapes",
    "voice actors",
    "seeking actors",
  ];
  if (_hasAny(sub, castingSubject)) {
    tags.add("CASTING_ROLES");
    if (sub.includes("extras")) tags.add("CASTING_EXTRAS");
    reasons.push("CREW_CALL: casting signal in subject");
    return _finalize("CREW_CALL", tags, reasons, combined, deadlines, contacts);
  }

  const crewSubject = [
    "crew call",
    "crew heads",
    "seeking crew",
    "looking for crew",
    "hiring",
    "petitions",
  ];
  if (_hasAny(sub, crewSubject)) {
    reasons.push("CREW_CALL: crew recruitment signal in subject");
    return _finalize("CREW_CALL", tags, reasons, combined, deadlines, contacts);
  }

  const resourceSubject = [
    "sourcing",
    "borrow",
    "does anyone have",
    "looking to borrow",
    "need a ",
    "need an ",
  ];
  if (_hasAny(sub, resourceSubject)) {
    reasons.push("RESOURCE: resource request signal in subject");
    return _finalize("RESOURCE", tags, reasons, combined, deadlines, contacts);
  }

  const eventSubject = [
    "screening",
    "workshop",
    "panel",
    "info session",
    "infosession",
    "writer's circle",
    "writers circle",
    "masterclass",
  ];
  if (_hasAny(sub, eventSubject)) {
    reasons.push("EVENT: event signal in subject");
    return _finalize("EVENT", tags, reasons, combined, deadlines, contacts);
  }

  // L2: weighted scoring
  const W = 5;
  const scores = {
    GRANT:
      W * _count(sub, ["grant", "funding", "apply", "award", "submissions"]) +
      _count(bod, ["grant", "funding", "apply", "award", "submissions"]),
    CREW_CALL:
      W *
        _count(sub, [
          "crew",
          "hiring",
          "seeking",
          "dp",
          "editor",
          "sound",
          "producer",
          "gaffer",
        ]) +
      _count(bod, [
        "crew",
        "hiring",
        "seeking",
        "dp",
        "editor",
        "sound",
        "producer",
        "gaffer",
      ]),
    EVENT:
      W * _count(sub, ["screening", "workshop", "panel", "meeting", "rsvp"]) +
      _count(bod, ["screening", "workshop", "panel", "meeting", "rsvp"]),
    RESOURCE:
      W *
        _count(sub, [
          "borrow",
          "sourcing",
          "equipment",
          "camera",
          "location",
          "props",
          "costume",
        ]) +
      _count(bod, [
        "borrow",
        "sourcing",
        "equipment",
        "camera",
        "location",
        "props",
        "costume",
      ]),
    DO_NOT_CARE:
      W * _count(sub, ["game night", "watch party", "free food"]) +
      _count(bod, ["game night", "watch party", "free food"]),
  };

  const maxScore = Math.max(...Object.values(scores));
  if (maxScore === 0) {
    reasons.push("L2: no matches → OTHER");
    return _pack("OTHER", tags, 0.35, reasons, deadlines, contacts);
  }

  const winner =
    Object.keys(scores).find((k) => scores[k] === maxScore) ?? "OTHER";
  reasons.push(`L2: ${winner} scored highest (${maxScore})`);
  return _finalize(winner, tags, reasons, combined, deadlines, contacts, 0.65);
}

// internal regex helpers
function _hasAny(text, kws) {
  return kws.some((k) => text.includes(k));
}
function _count(text, kws) {
  let n = 0;
  for (const k of kws) if (text.includes(k)) n++;
  return n;
}

function _pack(category, tags, confidence, reasons, deadlines, contacts) {
  return {
    category,
    tags: [...tags],
    confidence,
    reasons,
    deadlines,
    contacts,
    // null out all LLM-specific extracted fields
    film_title: null,
    logline: null,
    production_type: null,
    director_name: null,
    roles_mentioned: null,
    shoot_dates_text: null,
    petition_location: null,
    grant_amount: null,
    grant_status: null,
    deadline_text: null,
    deadline_iso: null,
    application_url: null,
    eligibility_text: null,
    grant_scope: null,
    event_date_text: null,
    event_location: null,
    rsvp_url: null,
    reasoning: reasons[0] ?? null,
    is_bump: false,
  };
}

function _finalize(
  category,
  tags,
  reasons,
  combined,
  deadlines,
  contacts,
  baseConf,
) {
  const confidence = Math.min(0.95, Math.max(0.55, baseConf ?? 0.8));

  if (category === "CREW_CALL") {
    if (
      _hasAny(combined, [
        "casting",
        "audition",
        "extras",
        "self tape",
        "actors",
      ])
    ) {
      tags.add("CASTING_ROLES");
      if (combined.includes("extras")) tags.add("CASTING_EXTRAS");
    }
    if (contacts.length) tags.add("HAS_CONTACT_INFO");
  }

  if (category === "RESOURCE") {
    if (_hasAny(combined, ["props", "costume", "wardrobe"]))
      tags.add("PROPS_COSTUMES");
    if (_hasAny(combined, ["location"])) tags.add("LOCATION");
    if (_hasAny(combined, ["camera", "lens", "equipment", "gear"]))
      tags.add("EQUIPMENT");
  }

  if (category === "EVENT") {
    if (combined.includes("screening")) tags.add("SCREENING");
    if (combined.includes("workshop")) tags.add("WORKSHOP");
    if (combined.includes("panel")) tags.add("PANEL");
    if (combined.includes("rsvp")) tags.add("RSVP");
  }

  let grantStatus = null;
  if (category === "GRANT") {
    tags.add("GRANT_STATUS_UNCLEAR");
    if (deadlines.length) {
      const epoch = parseISOToEpochSeconds(deadlines[0].iso ?? null);
      if (epoch) {
        grantStatus =
          epoch >= Math.floor(Date.now() / 1000) ? "open" : "closed";
        tags.delete("GRANT_STATUS_UNCLEAR");
        tags.add(grantStatus === "open" ? "GRANT_OPEN" : "GRANT_CLOSED");
        tags.add("HAS_DEADLINE");
      }
    }
    const elig = combined.includes("undergrad")
      ? "undergrad"
      : combined.includes("grad")
        ? "grad"
        : "unclear";
    const scope = combined.includes("post")
      ? "post"
      : combined.includes("equipment")
        ? "equipment"
        : combined.includes("travel")
          ? "travel"
          : "production";
    tags.add(`ELIG_${elig.toUpperCase()}`);
    tags.add(`SCOPE_${scope.toUpperCase()}`);
  }

  return _pack(category, tags, confidence, reasons, deadlines, contacts);
}

// ─── Shared text utilities ────────────────────────────────────────────────────

/** Strip HTML tags and decode common entities → readable plain text */
export function htmlToPlainText(html) {
  return (
    String(html ?? "")
      // Preserve anchor href values inline: <a href="URL">label</a> → "label (URL)"
      // Handles urldefense.com proxy URLs by extracting the real destination URL
      .replace(
        /<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
        (_match, href, label) => {
          const cleanLabel = label.replace(/<[^>]+>/g, "").trim();
          const realUrl = _normalizeUrl(href);
          if (!realUrl || _isUnsubscribeNoiseUrl(realUrl)) return cleanLabel;
          // Don't duplicate if label already is the URL, or if label is empty
          if (!cleanLabel || cleanLabel === realUrl) return realUrl;
          return `${cleanLabel} (${realUrl})`;
        },
      )
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<\/div>/gi, "\n")
      .replace(/<\/li>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      // Collapse runs of blank lines left by stripped tags
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

/** Unwrap Proofpoint/urldefense.com proxy URLs to get the real destination */
function _unwrapUrlDefense(url) {
  try {
    // urldefense v3: https://urldefense.com/v3/__REAL_URL__;!!GIBBERISH
    // The real URL sits literally between __ and __; — no encoding, just extract it.
    const v3 = url.match(/urldefense\.com\/v3\/__(.+?)__;/);
    if (v3) return v3[1];

    // urldefense v2: https://urldefense.proofpoint.com/v2/url?u=ENCODED&...
    // Encoding: - → %, _ → /
    const v2 = url.match(
      /urldefense(?:\.proofpoint)?\.com\/v2\/url\?u=([^&]+)/,
    );
    if (v2) {
      return decodeURIComponent(v2[1].replace(/-/g, "%").replace(/_/g, "/"));
    }
  } catch {
    // decoding failed — fall through to return the raw URL
  }
  return url;
}

function _normalizeUrl(rawUrl) {
  if (typeof rawUrl !== "string") return null;
  const stripped = rawUrl
    .trim()
    .replace(/^[(<\[]+/, "")
    .replace(/[)\]>,.;!?]+$/, "");
  if (!stripped) return null;

  const unwrapped = _unwrapUrlDefense(stripped);
  try {
    const parsed = new URL(unwrapped);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:")
      return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function _isUnsubscribeNoiseUrl(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    const path = u.pathname.toLowerCase();
    const query = u.search.toLowerCase();

    if (path.includes("unsubscribe") || query.includes("unsubscribe"))
      return true;
    if (query.includes("subed1=")) return true;
    if (host.includes("listserv.") && path.includes("/wa.exe")) return true;
    return false;
  } catch {
    return false;
  }
}

function _sanitizeActionUrl(rawUrl) {
  if (typeof rawUrl !== "string" || !rawUrl.trim()) return null;
  const normalized = _normalizeUrl(rawUrl);
  if (!normalized) return null;
  if (_isUnsubscribeNoiseUrl(normalized)) return null;
  return normalized;
}

/** Remove quoted reply chains so the LLM only sees the "new content" portion */
export function stripQuotedEmail(text) {
  const t = String(text ?? "");
  const cutPatterns = [
    /\nOn .* wrote:\n/i,
    /\n&gt;.*wrote:\n/i,
    /\nFrom: .*?\nSent: .*?\nTo: .*?\nSubject: .*?\n/i,
    /\n-----Original Message-----\n/i,
    /\n_{2,}\n/i,
    /\n-{3,}\n/i,
    /\n> .*\n(> .*\n)+/,
    /\n&gt; .*\n(&gt; .*\n)+/,
  ];
  let cutAt = t.length;
  for (const re of cutPatterns) {
    const m = re.exec(t);
    if (m && typeof m.index === "number") cutAt = Math.min(cutAt, m.index);
  }
  const trimmed = t
    .slice(0, cutAt)
    .replace(/#{4,}\s*To unsubscribe from[\s\S]*$/i, "")
    .trim();
  return trimmed.slice(0, 8000);
}

/** Minimal RFC-4180 CSV parser */
export function parseCsv(csvText) {
  const rows = [];
  let row = [],
    field = "",
    inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const c = csvText[i],
      next = csvText[i + 1];
    if (inQuotes) {
      if (c === '"' && next === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      continue;
    }
    if (c === ",") {
      row.push(field);
      field = "";
      continue;
    }
    if (c === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
      continue;
    }
    field += c;
  }
  row.push(field.replace(/\r$/, ""));
  rows.push(row);
  return rows.filter((r) => r.some((x) => String(x ?? "").trim() !== ""));
}

/** Extract ISO-parseable date candidates from free text */
export function extractDateCandidates(text) {
  const out = [];
  const months = {
    jan: "01",
    january: "01",
    feb: "02",
    february: "02",
    mar: "03",
    march: "03",
    apr: "04",
    april: "04",
    may: "05",
    jun: "06",
    june: "06",
    jul: "07",
    july: "07",
    aug: "08",
    august: "08",
    sep: "09",
    sept: "09",
    september: "09",
    oct: "10",
    october: "10",
    nov: "11",
    november: "11",
    dec: "12",
    december: "12",
  };

  const isoRe =
    /\b(20\d{2}-\d{2}-\d{2})(?:[tT ](\d{2}:\d{2}(?::\d{2})?)\s*(Z|[+-]\d{2}:\d{2})?)?\b/g;
  for (const m of text.matchAll(isoRe)) {
    const iso = m[2] ? `${m[1]}T${m[2]}${m[3] ?? "Z"}` : `${m[1]}T00:00:00Z`;
    out.push({ text: m[0], iso });
  }

  const monthRe =
    /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,)?\s+(20\d{2})\b/gi;
  for (const m of text.matchAll(monthRe)) {
    const mon = months[m[1].toLowerCase()];
    if (!mon) continue;
    out.push({
      text: m[0],
      iso: `${m[3]}-${mon}-${m[2].padStart(2, "0")}T23:59:59Z`,
    });
  }

  return out;
}

/** Extract email addresses and URLs from text */
export function extractContacts(text) {
  const out = [];
  const seenEmails = new Set();
  const seenUrls = new Set();

  for (const m of text.matchAll(
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
  )) {
    const email = m[0].toLowerCase();
    if (seenEmails.has(email)) continue;
    seenEmails.add(email);
    out.push({ type: "email", value: m[0] });
  }

  for (const m of text.matchAll(/\bhttps?:\/\/[^\s)>]+/gi)) {
    const url = _sanitizeActionUrl(m[0]);
    if (!url || seenUrls.has(url)) continue;
    seenUrls.add(url);
    out.push({ type: "url", value: url });
  }

  return out;
}

/** Parse an ISO-8601 date string to epoch seconds (returns null on failure) */
export function parseISOToEpochSeconds(iso) {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : Math.floor(ms / 1000);
}
