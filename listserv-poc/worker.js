var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// classify.js
var LLM_SYSTEM_PROMPT = `You are an email classifier for the Northwestern University RTVF (Radio/TV/Film) department listserv. Your entire response must be a single JSON object. Do NOT add any fields that are not listed below. Fill in EVERY field \u2014 never skip a field or leave an array empty if something applies.

You will be provided with:
- Current time (CST timezone) \u2014 CRITICAL: Use this to interpret ALL dates. When you see "Feb 20th" and current time shows Feb 20, 2026, the date is 2026-02-20, NOT the day before. When you see relative dates like "this week", "next Monday", "tonight", calculate based on the current time provided.
- Email subject line
- Email body text

\u2550\u2550\u2550 RTVF CONTEXT \u2550\u2550\u2550
- "Petitioning" = in-person application to join a film crew (at Shakesmart, Norris, Louis Hall, etc.)
- "PPSL" = Pre-Production Student Lab student film program
- "MAG" / "Media Arts Grant" = Northwestern RTVF production funding
- "Senior Directing Film" / "ATP" = senior thesis film
- "Sitcom Production Grant" = grant for sitcom pilots
- "The Cage" = RTVF Equipment Resource Center \u2014 hiring here is ADMIN, not CREW_CALL
- "Self-tapes" = remote audition video submissions
- "BUMP" / "BUMPING THIS" = re-posting an earlier announcement to boost visibility

\u2550\u2550\u2550 CATEGORY \u2014 pick exactly one \u2550\u2550\u2550
CREW_CALL   Seeking crew (DP, editor, sound, gaffer, grip, PA, producer, etc.) OR actors/extras for a student film
GRANT       Funding opportunities, grant announcements, application deadlines
EVENT       Screenings, workshops, panels, info sessions, writer's circles, club meetings
RESOURCE    Requests to borrow items, seeking filming locations, sourcing props/costumes/equipment
ADMIN       Official dept communications, program announcements, The Cage hiring, faculty notices
DO_NOT_CARE Pure social events (game nights, watch parties, hangouts) with zero film-production relevance
OTHER       Doesn't fit any above

\u2550\u2550\u2550 TAGS \u2014 include EVERY tag that applies; never return [] if any apply \u2550\u2550\u2550

BUMP DETECTION (check first \u2014 applies across all categories):
  BUMP          Body opens with "BUMP", "BUMPING THIS", "bumping", "re-posting", "signal boost", or the subject has "Re:" on an older announcement. ALWAYS set is_bump=true when using this tag.
  REPLY_CHAIN   Email is a reply chain (subject starts with "Re:") but is NOT a bump \u2014 it's a new discussion

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

\u2550\u2550\u2550 FIELDS \u2014 fill every one, use null only if genuinely not mentioned \u2550\u2550\u2550
category        (required, one of the category values above)
tags            (required array, see tag rules above \u2014 never empty if anything applies)
confidence      (0.0\u20131.0 float \u2014 be precise, not always 0.75)
is_bump         (true if BUMP tag applies, false otherwise)
reasoning       (required: 1\u20132 sentences explaining your category + confidence)
film_title      Film name extracted from body (not the email subject line), or null
logline         Logline/synopsis if explicitly written in the email, or null
production_type e.g. "PPSL Film", "MAG-funded", "Senior Directing Film", "Sitcom Production Grant", "Wildcat Animate Film", "MultiCulti Studios Film", or null
director_name   Film director name if explicitly stated in the message body (e.g. "Director: Jane Doe"), or null
roles_mentioned Array of all specific job titles mentioned, or null (e.g. ["DP","Sound Designer","Editor"])
shoot_dates_text Filming schedule as written in the email, or null
petition_location Where/when petitions happen (e.g. "Petitions at Shakesmart"), or null. Do NOT put links here.
grant_amount    e.g. "up to $750" or "$750\u2013$3,000", or null
grant_status    "open", "upcoming", "closed", or "unclear" for GRANTs, null otherwise
deadline_text   Deadline as written in the email, or null
deadline_iso    Deadline in ISO-8601 format if parseable, or null. If time is present in the email, include full datetime (e.g. 2026-02-25T23:59:00). If only a date is present, YYYY-MM-DD is acceptable. IMPORTANT: Use the provided current time (CST) to interpret relative dates. For example, if current time shows Feb 20, 2026 and email says "by Feb 20th", the deadline is 2026-02-20, NOT 2026-02-19. If it says "this Friday" or "next week", calculate based on current time.
application_url Direct URL to apply/petition, or null. MUST be a full http(s) URL (never plain text like "apply here").
script_url      Direct URL to script/sides/treatment for a petition, or null. MUST be a full http(s) URL.
eligibility_text Who is eligible as stated, or null
grant_scope     "production", "post", "equipment", "travel", or "unclear" for GRANTs, null otherwise
event_date_text When the event happens, or null
event_location  Where the event is, or null
rsvp_url        RSVP URL or instructions, or null

\u2550\u2550\u2550 LINK RULES (VERY IMPORTANT) \u2550\u2550\u2550
- Ignore listserv unsubscribe/admin links (for example links containing SUBED1=RTVF, wa.exe unsubscribe pages, or "To unsubscribe from the RTVF list").
- Never use unsubscribe links for application_url, script_url, or rsvp_url.
- Prefer direct destination links (Google Form, SignUpGenius, official application page), not security-wrapper URLs.
- If no valid action link exists, set application_url / script_url / rsvp_url to null.`;
var LLM_JSON_SCHEMA = {
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
        "OTHER"
      ]
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
          "REPLY_CHAIN"
        ]
      }
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
      anyOf: [{ type: "array", items: { type: "string" } }, { type: "null" }]
    },
    shoot_dates_text: { anyOf: [{ type: "string" }, { type: "null" }] },
    petition_location: { anyOf: [{ type: "string" }, { type: "null" }] },
    // ── Grant specifics ──────────────────────────────────────────────────
    grant_amount: { anyOf: [{ type: "string" }, { type: "null" }] },
    grant_status: {
      anyOf: [
        { type: "string", enum: ["open", "upcoming", "closed", "unclear"] },
        { type: "null" }
      ]
    },
    deadline_text: { anyOf: [{ type: "string" }, { type: "null" }] },
    deadline_iso: { anyOf: [{ type: "string" }, { type: "null" }] },
    application_url: { anyOf: [{ type: "string" }, { type: "null" }] },
    script_url: { anyOf: [{ type: "string" }, { type: "null" }] },
    eligibility_text: { anyOf: [{ type: "string" }, { type: "null" }] },
    grant_scope: {
      anyOf: [
        {
          type: "string",
          enum: ["production", "post", "equipment", "travel", "unclear"]
        },
        { type: "null" }
      ]
    },
    // ── Event specifics ──────────────────────────────────────────────────
    event_date_text: { anyOf: [{ type: "string" }, { type: "null" }] },
    event_location: { anyOf: [{ type: "string" }, { type: "null" }] },
    rsvp_url: { anyOf: [{ type: "string" }, { type: "null" }] }
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
    "script_url",
    "eligibility_text",
    "grant_scope",
    "event_date_text",
    "event_location",
    "rsvp_url"
  ],
  additionalProperties: false
};
var LLM_MODEL = "gpt-oss-120b";
var CEREBRAS_API_BASE = "https://api.cerebras.ai/v1";
var RETRYABLE_STATUS_CODES = /* @__PURE__ */ new Set([429, 500, 502, 503, 504]);
var DEFAULT_MAX_ATTEMPTS = 4;
var INITIAL_MAX_OUTPUT_TOKENS = 2048;
var MAX_OUTPUT_TOKENS = 4096;
async function classifyWithLLM(apiKey, subject, bodyText, options = {}) {
  if (!apiKey) throw new Error("CEREBRAS_API_KEY not configured");
  const model = typeof options.model === "string" && options.model.trim() ? options.model.trim() : LLM_MODEL;
  const maxAttempts = Number.isFinite(options.maxAttempts) ? Math.max(1, Math.trunc(options.maxAttempts)) : DEFAULT_MAX_ATTEMPTS;
  let maxOutputTokens = Number.isFinite(options.maxOutputTokens) ? Math.min(MAX_OUTPUT_TOKENS, Math.max(512, Math.trunc(options.maxOutputTokens))) : INITIAL_MAX_OUTPUT_TOKENS;
  const truncBody = (bodyText || "").slice(0, 2500);
  const currentTime = (/* @__PURE__ */ new Date()).toLocaleString("en-US", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
  const prompt = `Current time (CST): ${currentTime}

Subject: ${subject}

Body:
${truncBody}`;
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
            Authorization: `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: "system",
                content: LLM_SYSTEM_PROMPT
              },
              {
                role: "user",
                content: prompt
              }
            ],
            temperature: 0.1,
            top_p: 0.95,
            max_tokens: maxOutputTokens,
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "rtvf_email_classifier",
                strict: true,
                schema: LLM_JSON_SCHEMA
              }
            }
          })
        }
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
      const content = typeof rawContent === "string" ? rawContent : Array.isArray(rawContent) ? rawContent.map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && typeof part.text === "string") {
          return part.text;
        }
        return "";
      }).join("").trim() : rawContent && typeof rawContent === "object" ? JSON.stringify(rawContent) : "";
      if (!content) {
        throw new Error(
          `Cerebras returned empty content (finishReason=${finishReason ?? "unknown"})`
        );
      }
      try {
        parsed = _parseModelJson(content);
      } catch (parseErr) {
        const parseMsg = parseErr instanceof Error ? parseErr.message : String(parseErr);
        const looksTruncated = finishReason === "length" || /Unexpected end of JSON input/i.test(parseMsg);
        if (attempt < maxAttempts) {
          if (looksTruncated) {
            maxOutputTokens = Math.min(MAX_OUTPUT_TOKENS, maxOutputTokens * 2);
          }
          await _sleep(_retryDelayMs(attempt));
          continue;
        }
        throw new Error(
          `LLM returned non-JSON (finishReason=${finishReason ?? "unknown"}): ${content.slice(0, 200)}`
        );
      }
      break;
    } catch (err) {
      lastError = err;
      if (attempt >= maxAttempts) break;
      if (err instanceof Error && /Cerebras API \d+:/.test(err.message)) {
        if (!/Cerebras API (429|500|502|503|504):/.test(err.message)) break;
      }
      await _sleep(_retryDelayMs(attempt));
    }
  }
  if (!parsed) {
    throw lastError instanceof Error ? lastError : new Error("LLM classification failed");
  }
  const validCats = [
    "CREW_CALL",
    "GRANT",
    "EVENT",
    "RESOURCE",
    "ADMIN",
    "DO_NOT_CARE",
    "OTHER"
  ];
  if (!validCats.includes(parsed.category)) parsed.category = "OTHER";
  if (!Array.isArray(parsed.tags)) parsed.tags = [];
  const ALLOWED_TAGS = /* @__PURE__ */ new Set([
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
    "REPLY_CHAIN"
  ]);
  parsed.tags = parsed.tags.filter(
    (t) => typeof t === "string" && ALLOWED_TAGS.has(t)
  );
  if (typeof parsed.confidence !== "number" || parsed.confidence < 0 || parsed.confidence > 1) {
    parsed.confidence = 0.75;
  }
  if (parsed.tags.includes("BUMP")) parsed.is_bump = true;
  if (parsed.is_bump && !parsed.tags.includes("BUMP")) parsed.tags.push("BUMP");
  parsed.is_bump = Boolean(parsed.is_bump);
  if (!Array.isArray(parsed.roles_mentioned) || parsed.roles_mentioned.length === 0) {
    parsed.roles_mentioned = null;
  }
  if (typeof parsed.director_name !== "string" || !parsed.director_name.trim()) {
    parsed.director_name = null;
  }
  if (typeof parsed.reasoning !== "string" || !parsed.reasoning.trim()) {
    parsed.reasoning = null;
  }
  parsed.application_url = _sanitizeActionUrl(parsed.application_url);
  if (!parsed.application_url && typeof parsed.petition_location === "string") {
    parsed.application_url = _extractFirstActionUrl(parsed.petition_location);
  }
  parsed.script_url = _sanitizeActionUrl(parsed.script_url);
  parsed.rsvp_url = _sanitizeActionUrl(parsed.rsvp_url);
  parsed._usage = usageMetadata;
  return parsed;
}
__name(classifyWithLLM, "classifyWithLLM");
function _retryDelayMs(attempt) {
  const base = Math.min(8e3, 400 * Math.pow(2, attempt - 1));
  const jitter = Math.floor(Math.random() * 200);
  return base + jitter;
}
__name(_retryDelayMs, "_retryDelayMs");
function _sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
__name(_sleep, "_sleep");
function _parseModelJson(content) {
  try {
    return JSON.parse(content);
  } catch {
    const fence = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (fence) {
      try {
        return JSON.parse(fence[1]);
      } catch {
      }
    }
    const s = content.indexOf("{");
    const e = content.lastIndexOf("}");
    if (s !== -1 && e > s) {
      try {
        return JSON.parse(content.slice(s, e + 1));
      } catch {
      }
    }
  }
  throw new Error("Could not parse model response as JSON");
}
__name(_parseModelJson, "_parseModelJson");
function classify(subject, bodyText) {
  const subRaw = String(subject ?? "");
  const bodRaw = String(bodyText ?? "");
  const sub = subRaw.toLowerCase();
  const bod = bodRaw.toLowerCase();
  const combined = `${sub}
${bod}`;
  const reasons = [];
  const tags = /* @__PURE__ */ new Set();
  const deadlines = extractDateCandidates(combined);
  const contacts = extractContacts(`${subRaw}
${bodRaw}`);
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
    "good vibes"
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
    "apply by"
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
    "seeking actors"
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
    "petitions"
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
    "need an "
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
    "masterclass"
  ];
  if (_hasAny(sub, eventSubject)) {
    reasons.push("EVENT: event signal in subject");
    return _finalize("EVENT", tags, reasons, combined, deadlines, contacts);
  }
  const W = 5;
  const scores = {
    GRANT: W * _count(sub, ["grant", "funding", "apply", "award", "submissions"]) + _count(bod, ["grant", "funding", "apply", "award", "submissions"]),
    CREW_CALL: W * _count(sub, [
      "crew",
      "hiring",
      "seeking",
      "dp",
      "editor",
      "sound",
      "producer",
      "gaffer"
    ]) + _count(bod, [
      "crew",
      "hiring",
      "seeking",
      "dp",
      "editor",
      "sound",
      "producer",
      "gaffer"
    ]),
    EVENT: W * _count(sub, ["screening", "workshop", "panel", "meeting", "rsvp"]) + _count(bod, ["screening", "workshop", "panel", "meeting", "rsvp"]),
    RESOURCE: W * _count(sub, [
      "borrow",
      "sourcing",
      "equipment",
      "camera",
      "location",
      "props",
      "costume"
    ]) + _count(bod, [
      "borrow",
      "sourcing",
      "equipment",
      "camera",
      "location",
      "props",
      "costume"
    ]),
    DO_NOT_CARE: W * _count(sub, ["game night", "watch party", "free food"]) + _count(bod, ["game night", "watch party", "free food"])
  };
  const maxScore = Math.max(...Object.values(scores));
  if (maxScore === 0) {
    reasons.push("L2: no matches \u2192 OTHER");
    return _pack("OTHER", tags, 0.35, reasons, deadlines, contacts);
  }
  const winner = Object.keys(scores).find((k) => scores[k] === maxScore) ?? "OTHER";
  reasons.push(`L2: ${winner} scored highest (${maxScore})`);
  return _finalize(winner, tags, reasons, combined, deadlines, contacts, 0.65);
}
__name(classify, "classify");
function _hasAny(text, kws) {
  return kws.some((k) => text.includes(k));
}
__name(_hasAny, "_hasAny");
function _count(text, kws) {
  let n = 0;
  for (const k of kws) if (text.includes(k)) n++;
  return n;
}
__name(_count, "_count");
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
    script_url: null,
    eligibility_text: null,
    grant_scope: null,
    event_date_text: null,
    event_location: null,
    rsvp_url: null,
    reasoning: reasons[0] ?? null,
    is_bump: false
  };
}
__name(_pack, "_pack");
function _finalize(category, tags, reasons, combined, deadlines, contacts, baseConf) {
  const confidence = Math.min(0.95, Math.max(0.55, baseConf ?? 0.8));
  if (category === "CREW_CALL") {
    if (_hasAny(combined, [
      "casting",
      "audition",
      "extras",
      "self tape",
      "actors"
    ])) {
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
        grantStatus = epoch >= Math.floor(Date.now() / 1e3) ? "open" : "closed";
        tags.delete("GRANT_STATUS_UNCLEAR");
        tags.add(grantStatus === "open" ? "GRANT_OPEN" : "GRANT_CLOSED");
        tags.add("HAS_DEADLINE");
      }
    }
    const elig = combined.includes("undergrad") ? "undergrad" : combined.includes("grad") ? "grad" : "unclear";
    const scope = combined.includes("post") ? "post" : combined.includes("equipment") ? "equipment" : combined.includes("travel") ? "travel" : "production";
    tags.add(`ELIG_${elig.toUpperCase()}`);
    tags.add(`SCOPE_${scope.toUpperCase()}`);
  }
  return _pack(category, tags, confidence, reasons, deadlines, contacts);
}
__name(_finalize, "_finalize");
function htmlToPlainText(html) {
  return String(html ?? "").replace(
    /<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
    (_match, href, label) => {
      const cleanLabel = label.replace(/<[^>]+>/g, "").trim();
      const realUrl = _normalizeUrl(href);
      if (!realUrl || _isUnsubscribeNoiseUrl(realUrl)) return cleanLabel;
      if (!cleanLabel || cleanLabel === realUrl) return realUrl;
      return `${cleanLabel} (${realUrl})`;
    }
  ).replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n\n").replace(/<\/div>/gi, "\n").replace(/<\/li>/gi, "\n").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\n{3,}/g, "\n\n").trim();
}
__name(htmlToPlainText, "htmlToPlainText");
function _unwrapUrlDefense(url) {
  try {
    const v3 = url.match(/urldefense\.com\/v3\/__(.+?)__;/);
    if (v3) return v3[1];
    const v2 = url.match(
      /urldefense(?:\.proofpoint)?\.com\/v2\/url\?u=([^&]+)/
    );
    if (v2) {
      return decodeURIComponent(v2[1].replace(/-/g, "%").replace(/_/g, "/"));
    }
  } catch {
  }
  return url;
}
__name(_unwrapUrlDefense, "_unwrapUrlDefense");
function _normalizeUrl(rawUrl) {
  if (typeof rawUrl !== "string") return null;
  const stripped = rawUrl.trim().replace(/^[(<\[]+/, "").replace(/[)\]>,.;!?]+$/, "");
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
__name(_normalizeUrl, "_normalizeUrl");
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
__name(_isUnsubscribeNoiseUrl, "_isUnsubscribeNoiseUrl");
function _sanitizeActionUrl(rawUrl) {
  if (typeof rawUrl !== "string" || !rawUrl.trim()) return null;
  const normalized = _normalizeUrl(rawUrl);
  if (!normalized) return null;
  if (_isUnsubscribeNoiseUrl(normalized)) return null;
  return normalized;
}
__name(_sanitizeActionUrl, "_sanitizeActionUrl");
function _extractFirstActionUrl(text) {
  if (typeof text !== "string" || !text.trim()) return null;
  const match = text.match(/\bhttps?:\/\/[^\s)<>"']+/i);
  if (!match) return null;
  return _sanitizeActionUrl(match[0]);
}
__name(_extractFirstActionUrl, "_extractFirstActionUrl");
function stripQuotedEmail(text) {
  const t = String(text ?? "");
  const cutPatterns = [
    /\nOn .* wrote:\n/i,
    /\n&gt;.*wrote:\n/i,
    /\nFrom: .*?\nSent: .*?\nTo: .*?\nSubject: .*?\n/i,
    /\n-----Original Message-----\n/i,
    /\n_{2,}\n/i,
    /\n-{3,}\n/i,
    /\n> .*\n(> .*\n)+/,
    /\n&gt; .*\n(&gt; .*\n)+/
  ];
  let cutAt = t.length;
  for (const re of cutPatterns) {
    const m = re.exec(t);
    if (m && typeof m.index === "number") cutAt = Math.min(cutAt, m.index);
  }
  const trimmed = t.slice(0, cutAt).replace(/#{4,}\s*To unsubscribe from[\s\S]*$/i, "").trim();
  return trimmed.slice(0, 8e3);
}
__name(stripQuotedEmail, "stripQuotedEmail");
function parseCsv(csvText) {
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < csvText.length; i++) {
    const c = csvText[i], next = csvText[i + 1];
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
__name(parseCsv, "parseCsv");
function extractDateCandidates(text) {
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
    december: "12"
  };
  const isoRe = /\b(20\d{2}-\d{2}-\d{2})(?:[tT ](\d{2}:\d{2}(?::\d{2})?)\s*(Z|[+-]\d{2}:\d{2})?)?\b/g;
  for (const m of text.matchAll(isoRe)) {
    const iso = m[2] ? `${m[1]}T${m[2]}${m[3] ?? "Z"}` : `${m[1]}T23:59:59Z`;
    out.push({ text: m[0], iso });
  }
  const monthRe = /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,)?\s+(20\d{2})(?:\s*,?\s*(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(AM|PM))?\b/gi;
  for (const m of text.matchAll(monthRe)) {
    const mon = months[m[1].toLowerCase()];
    if (!mon) continue;
    let hh = "23";
    let mm = "59";
    let ss = "59";
    if (m[4]) {
      const hour12 = Number.parseInt(m[4], 10);
      const minute = Number.parseInt(m[5] ?? "0", 10);
      const ampm = String(m[6] ?? "").toLowerCase();
      if (Number.isFinite(hour12) && hour12 >= 1 && hour12 <= 12 && Number.isFinite(minute) && minute >= 0 && minute <= 59) {
        const hour24 = ampm === "am" ? hour12 % 12 : hour12 % 12 + 12;
        hh = String(hour24).padStart(2, "0");
        mm = String(minute).padStart(2, "0");
        ss = "00";
      }
    }
    out.push({
      text: m[0],
      iso: `${m[3]}-${mon}-${m[2].padStart(2, "0")}T${hh}:${mm}:${ss}Z`
    });
  }
  return out;
}
__name(extractDateCandidates, "extractDateCandidates");
function extractContacts(text) {
  const out = [];
  const seenEmails = /* @__PURE__ */ new Set();
  const seenUrls = /* @__PURE__ */ new Set();
  for (const m of text.matchAll(
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi
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
__name(extractContacts, "extractContacts");
function parseISOToEpochSeconds(iso) {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : Math.floor(ms / 1e3);
}
__name(parseISOToEpochSeconds, "parseISOToEpochSeconds");

// worker.js
var worker_default = {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders()
      });
    }
    if (req.method === "GET" && url.pathname === "/health") {
      return jsonResponse({ ok: true });
    }
    if (req.method === "GET" && url.pathname === "/api/messages/count") {
      const startedAt = Date.now();
      const includeDoNotCare = url.searchParams.get("includeDoNotCare") === "true";
      const row = await env.DATABASE_BINDING.prepare(
        `SELECT COUNT(*) AS total
                 FROM emails
                 ${includeDoNotCare ? "" : "WHERE category != 'DO_NOT_CARE'"}`
      ).first();
      const total = Number(row?.total ?? 0);
      logApiRequest(env, {
        path: url.pathname,
        query: Object.fromEntries(url.searchParams.entries()),
        total,
        duration_ms: Date.now() - startedAt,
        source: "messages_count"
      });
      return jsonResponse({ ok: true, total });
    }
    if (req.method === "GET" && url.pathname === "/api/counts") {
      const startedAt = Date.now();
      const row = await env.DATABASE_BINDING.prepare(
        `SELECT
                    (SELECT COUNT(*) FROM emails WHERE category != 'DO_NOT_CARE') AS all_messages,
                    (SELECT COUNT(*) FROM grant_posts) AS grants,
                    (SELECT COUNT(*) FROM petition_posts WHERE is_casting = 0) AS crew_calls,
                    (SELECT COUNT(*) FROM petition_posts WHERE is_casting = 1) AS casting,
                    (SELECT COUNT(*) FROM event_posts) AS events,
                    (SELECT COUNT(*) FROM resource_posts) AS resources`
      ).first();
      const counts = {
        all_messages: Number(row?.all_messages ?? 0),
        grants: Number(row?.grants ?? 0),
        crew_calls: Number(row?.crew_calls ?? 0),
        casting: Number(row?.casting ?? 0),
        events: Number(row?.events ?? 0),
        resources: Number(row?.resources ?? 0)
      };
      const all = counts.all_messages;
      logApiRequest(env, {
        path: url.pathname,
        query: Object.fromEntries(url.searchParams.entries()),
        counts: { ...counts, all },
        duration_ms: Date.now() - startedAt,
        source: "counts"
      });
      return jsonResponse({ ok: true, counts: { ...counts, all } });
    }
    const inlineImageMatch = req.method === "GET" ? url.pathname.match(/^\/api\/email\/([^/]+)\/inline\/(.+)$/) : null;
    if (inlineImageMatch) {
      let emailId = null;
      let cid = null;
      try {
        emailId = decodeURIComponent(inlineImageMatch[1]);
        cid = normalizeContentId(decodeURIComponent(inlineImageMatch[2]));
      } catch {
        return badRequest("invalid inline image path");
      }
      if (!emailId || !cid) return badRequest("missing email id or cid");
      const row = await env.DATABASE_BINDING.prepare(
        `SELECT account, attachment_id, content_type
                 FROM email_attachments
                 WHERE email_id = ?1
                   AND cid_normalized = ?2
                   AND (embedded = 1 OR inline = 1)
                 ORDER BY updated_at DESC
                 LIMIT 1`
      ).bind(emailId, cid).first();
      if (!row) return jsonResponse({ ok: false, error: "inline image not found" }, { status: 404 });
      const baseUrl = resolveEmailEngineBaseUrl(env);
      const accessToken = resolveEmailEngineAccessToken(env);
      if (!baseUrl || !accessToken) {
        return jsonResponse({ ok: false, error: "EmailEngine not configured" }, { status: 503 });
      }
      const upstreamUrl = `${baseUrl}/v1/account/${encodeURIComponent(String(row.account))}/attachment/${encodeURIComponent(String(row.attachment_id))}`;
      const upstream = await fetch(upstreamUrl, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!upstream.ok) {
        return jsonResponse({
          ok: false,
          error: `EmailEngine attachment fetch failed (${upstream.status})`
        }, { status: 502 });
      }
      const headers = {
        ...corsHeaders(),
        "cache-control": "public, max-age=3600, stale-while-revalidate=86400",
        "content-type": upstream.headers.get("content-type") ?? row.content_type ?? "application/octet-stream"
      };
      return new Response(upstream.body, {
        status: 200,
        headers
      });
    }
    if (req.method === "GET" && url.pathname === "/api/email") {
      const id = url.searchParams.get("id");
      if (!id) return badRequest("missing id");
      const row = await env.DATABASE_BINDING.prepare(
        `SELECT
                    e.id, e.subject, e.body_text, e.body_html,
                    e.from_email, e.from_name, e.reply_to, e.sent_at,
                    e.category,
                    COALESCE(
                        (SELECT json_group_array(tag) FROM (SELECT tag FROM email_tags WHERE email_id = e.id ORDER BY tag)),
                        e.tags_json,
                        '[]'
                    ) AS tags_json,
                    e.confidence,
                    COALESCE(
                        (SELECT json_group_array(reason) FROM (SELECT reason FROM email_reasons WHERE email_id = e.id ORDER BY position)),
                        e.reasons_json,
                        '[]'
                    ) AS reasons_json,
                    e.is_bump, e.thread_key, e.canonical_id,
                    e.film_title, e.logline, e.production_type, e.director_name,
                    COALESCE(
                        (SELECT json_group_array(role) FROM (SELECT role FROM email_roles WHERE email_id = e.id ORDER BY position)),
                        e.roles_json
                    ) AS roles_json,
                    e.shoot_dates_text, e.petition_location, e.deadline_at,
                    e.grant_amount, e.grant_status, e.application_url, e.script_url, e.eligibility_text, e.grant_scope,
                    e.event_date_text, e.event_location, e.rsvp_url,
                    e.llm_reasoning, e.classifier_version,
                    COALESCE(
                        (
                            SELECT json_group_array(json_object('text', date_text, 'iso', date_iso))
                            FROM (
                                SELECT date_text, date_iso
                                FROM email_dates
                                WHERE email_id = e.id AND kind = 'deadline'
                                ORDER BY position
                            )
                        ),
                        e.deadlines_json
                    ) AS deadlines_json,
                    COALESCE(
                        (
                            SELECT json_group_array(json_object('type', contact_type, 'value', contact_value))
                            FROM (
                                SELECT contact_type, contact_value
                                FROM email_contacts
                                WHERE email_id = e.id
                                ORDER BY position
                            )
                        ),
                        e.contacts_json
                    ) AS contacts_json
                FROM emails e
                WHERE e.id = ?1
                LIMIT 1`
      ).bind(id).first();
      if (!row) return jsonResponse({ ok: false, error: "not found" }, { status: 404 });
      row.body_html = rewriteInlineCidSources(row.body_html, row.id, url.origin);
      return jsonResponse({ ok: true, rows: [row] });
    }
    if (req.method === "GET" && url.pathname === "/api/grants") {
      const summary = url.searchParams.get("summary") === "true";
      const rows = await listProjectedEmails(env, url, {
        category: "GRANT",
        table: "grant_posts",
        alias: "gp",
        summary,
        origin: url.origin,
        projection: {
          deadline_at: "gp.deadline_at",
          grant_amount: "gp.grant_amount",
          grant_status: "gp.grant_status",
          application_url: "gp.application_url",
          eligibility_text: "gp.eligibility_text",
          grant_scope: "gp.grant_scope"
        }
      });
      return jsonResponse(rows);
    }
    if (req.method === "GET" && url.pathname === "/api/petitions") {
      const summary = url.searchParams.get("summary") === "true";
      const castingParam = url.searchParams.get("casting");
      const projectionWhere = [];
      if (castingParam === "true") projectionWhere.push("pp.is_casting = 1");
      if (castingParam === "false") projectionWhere.push("pp.is_casting = 0");
      const rows = await listProjectedEmails(env, url, {
        category: "CREW_CALL",
        table: "petition_posts",
        alias: "pp",
        summary,
        origin: url.origin,
        projectionWhere,
        projection: {
          film_title: "pp.film_title",
          logline: "pp.logline",
          production_type: "pp.production_type",
          director_name: "pp.director_name",
          shoot_dates_text: "pp.shoot_dates_text",
          petition_location: "pp.petition_location",
          application_url: "pp.application_url",
          script_url: "pp.script_url",
          deadline_at: "pp.deadline_at"
        }
      });
      return jsonResponse(rows);
    }
    if (req.method === "GET" && url.pathname === "/api/timeline") {
      const summary = url.searchParams.get("summary") === "true";
      const rows = await listProjectedEmails(env, url, {
        category: "EVENT",
        table: "event_posts",
        alias: "ep",
        summary,
        origin: url.origin,
        projection: {
          deadline_at: "ep.deadline_at",
          event_date_text: "ep.event_date_text",
          event_location: "ep.event_location",
          rsvp_url: "ep.rsvp_url"
        }
      });
      return jsonResponse(rows);
    }
    if (req.method === "GET" && url.pathname === "/api/resources") {
      const summary = url.searchParams.get("summary") === "true";
      const rows = await listProjectedEmails(env, url, {
        category: "RESOURCE",
        table: "resource_posts",
        alias: "rp",
        summary,
        origin: url.origin
      });
      return jsonResponse(rows);
    }
    if (req.method === "GET" && url.pathname === "/api/admin") {
      const summary = url.searchParams.get("summary") === "true";
      const rows = await listProjectedEmails(env, url, {
        category: "ADMIN",
        table: "admin_posts",
        alias: "ap",
        summary,
        origin: url.origin
      });
      return jsonResponse(rows);
    }
    if (req.method === "GET" && url.pathname === "/api/emails") {
      const startedAt = Date.now();
      const summary = url.searchParams.get("summary") === "true";
      const includeDoNotCare = url.searchParams.get("includeDoNotCare") === "true";
      const limit = Math.min(Number(url.searchParams.get("limit") ?? "50") || 50, 200);
      const offset = Math.max(Number(url.searchParams.get("offset") ?? "0") || 0, 0);
      const category = url.searchParams.get("category");
      const tag = url.searchParams.get("tag");
      const q = url.searchParams.get("q");
      const since = url.searchParams.get("since");
      const until = url.searchParams.get("until");
      const where = [];
      const args = [];
      if (!includeDoNotCare) where.push(`e.category != 'DO_NOT_CARE'`);
      if (category) {
        where.push(`e.category = ?`);
        args.push(category);
      }
      if (since) {
        where.push(`e.sent_at >= ?`);
        args.push(Number(since));
      }
      if (until) {
        where.push(`e.sent_at <= ?`);
        args.push(Number(until));
      }
      if (q) {
        where.push(`(e.subject LIKE ? OR e.body_text LIKE ?)`);
        args.push(`%${q}%`, `%${q}%`);
      }
      if (tag) {
        where.push(`EXISTS (SELECT 1 FROM email_tags et WHERE et.email_id = e.id AND et.tag = ?)`);
        args.push(tag);
      }
      const bodyTextSelect = summary ? `'' AS body_text` : `e.body_text`;
      const bodyHtmlSelect = summary ? `NULL AS body_html` : `e.body_html`;
      const reasonsSelect = summary ? `'[]' AS reasons_json` : `COALESCE(
                        (SELECT json_group_array(reason) FROM (SELECT reason FROM email_reasons WHERE email_id = e.id ORDER BY position)),
                        e.reasons_json,
                        '[]'
                    ) AS reasons_json`;
      const rolesSelect = summary ? `NULL AS roles_json` : `COALESCE(
                        (SELECT json_group_array(role) FROM (SELECT role FROM email_roles WHERE email_id = e.id ORDER BY position)),
                        e.roles_json
                    ) AS roles_json`;
      const deadlinesSelect = summary ? `NULL AS deadlines_json` : `COALESCE(
                        (
                            SELECT json_group_array(json_object('text', date_text, 'iso', date_iso))
                            FROM (
                                SELECT date_text, date_iso
                                FROM email_dates
                                WHERE email_id = e.id AND kind = 'deadline'
                                ORDER BY position
                            )
                        ),
                        e.deadlines_json
                    ) AS deadlines_json`;
      const contactsSelect = summary ? `NULL AS contacts_json` : `COALESCE(
                        (
                            SELECT json_group_array(json_object('type', contact_type, 'value', contact_value))
                            FROM (
                                SELECT contact_type, contact_value
                                FROM email_contacts
                                WHERE email_id = e.id
                                ORDER BY position
                            )
                        ),
                        e.contacts_json
                    ) AS contacts_json`;
      const llmReasoningSelect = summary ? `NULL AS llm_reasoning` : `e.llm_reasoning`;
      const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
      const stmt = env.DATABASE_BINDING.prepare(
        `SELECT
                    e.id, e.subject, ${bodyTextSelect}, ${bodyHtmlSelect},
                    e.from_email, e.from_name, e.reply_to, e.sent_at,
                    e.category,
                    COALESCE(
                        (SELECT json_group_array(tag) FROM (SELECT tag FROM email_tags WHERE email_id = e.id ORDER BY tag)),
                        e.tags_json,
                        '[]'
                    ) AS tags_json,
                    e.confidence,
                    ${reasonsSelect},
                    e.is_bump, e.thread_key, e.canonical_id,
                    e.film_title, e.logline, e.production_type, e.director_name,
                    ${rolesSelect},
                    e.shoot_dates_text, e.petition_location, e.deadline_at,
                    e.grant_amount, e.grant_status, e.application_url, e.script_url, e.eligibility_text, e.grant_scope,
                    e.event_date_text, e.event_location, e.rsvp_url,
                    ${llmReasoningSelect}, e.classifier_version,
                    ${deadlinesSelect},
                    ${contactsSelect}
                FROM emails e
                ${whereSql}
                ORDER BY e.sent_at DESC
                LIMIT ? OFFSET ?`
      );
      const res = await stmt.bind(...args, limit, offset).all();
      const rows = rewriteInlineCidSourcesForRows(res.results, url.origin);
      logApiRequest(env, {
        path: url.pathname,
        query: Object.fromEntries(url.searchParams.entries()),
        rows: Array.isArray(rows) ? rows.length : 0,
        duration_ms: Date.now() - startedAt,
        source: "emails"
      });
      return jsonResponse({ ok: true, rows, limit, offset });
    }
    if (req.method === "POST" && url.pathname === "/webhook/email") {
      if (!authOk(req, env)) return unauthorized();
      const ct = (req.headers.get("content-type") || "").toLowerCase();
      if (ct.includes("application/json")) {
        let payload;
        try {
          payload = await req.json();
        } catch {
          return badRequest("invalid JSON body");
        }
        if (payload.event !== "messageNew") {
          return jsonResponse({ ok: true, skipped: true, reason: `event=${payload.event}` });
        }
        const data = payload.data;
        if (!data) return badRequest("missing data field");
        const subject = data.subject ?? "(no subject)";
        const fromEmail = data.from?.address ?? null;
        const fromName = data.from?.name ?? null;
        const replyTo = data.replyTo?.[0]?.address ?? null;
        const toEmails = Array.isArray(data.to) ? data.to.map((t) => t.address).filter(Boolean) : null;
        const bodyHtml = data.text?.html ?? null;
        const bodyTextRaw = data.text?.plain ?? (bodyHtml ? htmlToPlainText(bodyHtml) : "");
        const bodyText = normalizeBodyForIngest(subject, bodyTextRaw);
        const providerMessageId = data.messageId ?? data.id ?? null;
        const sentAt = parseSentAtToEpochSeconds(data.date);
        const listserv = payload.account ?? "emailengine";
        let attachments = Array.isArray(data.attachments) ? data.attachments : [];
        if (attachments.length === 0 && bodyHtml && /cid:/i.test(bodyHtml) && data.id) {
          attachments = await fetchEmailEngineAttachmentsForMessage(env, listserv, data.id);
        }
        const FIVE_MONTHS_SEC = 5 * 30 * 24 * 60 * 60;
        const oldestAllowed = nowSec() - FIVE_MONTHS_SEC;
        if (sentAt < oldestAllowed) {
          return jsonResponse({ ok: true, skipped: true, reason: "too_old" });
        }
        const result = await ingestOneMessage(env, {
          providerMessageId,
          source: "emailengine",
          listserv,
          fromEmail,
          fromName,
          replyTo,
          toEmails,
          subject,
          bodyText,
          bodyHtml,
          sentAt,
          attachments
        });
        return jsonResponse({ ok: true, ...result });
      }
      if (ct.includes("text/csv") || ct.includes("application/octet-stream")) {
        const csvText = await req.text();
        const rows = parseCsv(csvText);
        if (rows.length < 2) return badRequest("csv needs header + at least 1 row");
        const header = rows[0].map((h) => (h ?? "").trim());
        const dataRows = rows.slice(1);
        let inserted = 0;
        let deduped = 0;
        let failed = 0;
        const FIVE_MONTHS_SEC = 5 * 30 * 24 * 60 * 60;
        const oldestAllowed = nowSec() - FIVE_MONTHS_SEC;
        let skippedOld = 0;
        let skippedUserCreated = 0;
        for (const r of dataRows) {
          try {
            const obj = {};
            for (let i = 0; i < header.length; i++) obj[header[i]] = r[i] ?? "";
            const subject = pick(obj, ["subject", "Subject"]) ?? "(no subject)";
            const bodyTextRaw = pick(obj, ["body_text", "body", "text", "Body", "content"]) ?? "";
            const bodyText = normalizeBodyForIngest(subject, bodyTextRaw);
            const bodyHtml = pick(obj, ["body_html", "html", "BodyHTML"]) ?? null;
            const fromEmail = pick(obj, ["from_email", "from", "From", "sender"]) ?? null;
            const fromName = pick(obj, ["from_name", "FromName", "sender_name"]) ?? null;
            const replyTo = pick(obj, ["reply_to", "ReplyTo"]) ?? null;
            const listserv = pick(obj, ["listserv", "Listserv", "list", "list_id"]) ?? "csv-import";
            const source = pick(obj, ["source", "Source"]) ?? "manual";
            const providerMessageId = pick(obj, ["provider_message_id", "message_id", "Message-Id", "message-id"]) ?? null;
            const sentAt = parseSentAtToEpochSeconds(
              pick(obj, ["sent_at", "SentAt", "date", "Date", "timestamp", "Timestamp"])
            );
            if (sentAt < oldestAllowed) {
              skippedOld++;
              continue;
            }
            const result = await ingestOneMessage(env, {
              providerMessageId,
              source,
              listserv,
              fromEmail,
              fromName,
              replyTo,
              toEmails: null,
              subject,
              bodyText,
              bodyHtml,
              sentAt,
              attachments: []
            });
            if (result.skipped) skippedUserCreated++;
            else if (result.deduped) deduped++;
            else inserted++;
          } catch {
            failed++;
          }
        }
        return jsonResponse({
          ok: true,
          mode: "csv_bulk_import",
          inserted,
          deduped,
          failed,
          skippedOld,
          skippedUserCreated,
          total: dataRows.length
        });
      }
      return badRequest("expected application/json (EmailEngine webhook) or text/csv (bulk import)");
    }

    // ─── POST /api/petitions/insert ────────────────────────────────────────────
    if (req.method === "POST" && url.pathname === "/api/petitions/insert") {
      if (!authOk(req, env)) return unauthorized();

      let data;
      try {
        data = await req.json();
      } catch {
        return badRequest("invalid JSON body");
      }

      // Validate required fields
      if (!data.id || !data.senderEmail || !data.filmTitle) {
        return badRequest("missing required fields: id, senderEmail, filmTitle");
      }

      const now = nowSec();

      try {
        // Parse deadline
        const deadlineAt = data.deadline ? parseISOToEpochSeconds(data.deadline) : null;

        // Insert into emails table
        await env.DATABASE_BINDING.prepare(`
          INSERT OR REPLACE INTO emails (
            id, subject, body_text, body_html, from_email, from_name, reply_to,
            sent_at, category, tags_json, confidence, reasons_json, is_bump,
            film_title, logline, production_type, director_name, shoot_dates_text,
            petition_location, deadline_at, application_url, roles_json,
            created_at, updated_at, source, listserv, provider_message_id
          ) VALUES (
            ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14,
            ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23, ?24, ?25, ?26, ?27
          )
        `).bind(
          data.id,
          `[PETITION] ${data.filmTitle}`,
          data.emailBodyText || '',
          data.emailBodyHtml || '',
          data.senderEmail,
          data.senderName || '',
          data.senderEmail, // replyTo same as sender
          data.sentAt || now,
          'CREW_CALL', // category
          JSON.stringify([]), // tags_json (empty for user-created)
          1.0, // confidence (user-created = 100%)
          JSON.stringify(['USER_CREATED']), // reasons_json
          0, // is_bump
          data.filmTitle,
          data.logline || '',
          data.productionType || '',
          data.directorName || '',
          data.shootDates || '',
          data.location || '',
          deadlineAt,
          data.applicationUrl || '',
          JSON.stringify(data.roles || []),
          now, // created_at
          now, // updated_at
          'user_submission', // source
          'rtvf-l', // listserv
          data.messageId || '' // provider_message_id
        ).run();

        // Determine if casting
        const isCasting = (data.roles || []).some(role =>
          ['Actor', 'Extras'].includes(role)
        ) ? 1 : 0;

        // Insert into petition_posts table
        await env.DATABASE_BINDING.prepare(`
          INSERT OR REPLACE INTO petition_posts (
            email_id, title, film_title, production_type, logline,
            shoot_dates_text, petition_location, is_casting, is_bump,
            deadline_at, classifier_confidence, created_at, updated_at
          ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)
        `).bind(
          data.id,
          data.filmTitle,
          data.filmTitle,
          data.productionType || '',
          data.logline || '',
          data.shootDates || '',
          data.location || '',
          isCasting,
          0, // is_bump
          deadlineAt,
          1.0, // classifier_confidence
          now,
          now
        ).run();

        // Insert roles
        if (data.roles && Array.isArray(data.roles)) {
          for (const role of data.roles) {
            await env.DATABASE_BINDING.prepare(`
              INSERT OR REPLACE INTO email_roles (email_id, role) VALUES (?1, ?2)
            `).bind(data.id, role).run();
          }
        }

        return jsonResponse({ ok: true, id: data.id });

      } catch (error) {
        console.error('Database insert error:', error);
        return jsonResponse(
          { ok: false, error: error.message || 'Database insert failed' },
          { status: 500 }
        );
      }
    }

    return jsonResponse({ ok: false, error: "not found" }, { status: 404 });
  },
  async scheduled(_event, env) {
    const n = nowSec();
    const cutoff = n - 150 * 24 * 60 * 60;
    await env.DATABASE_BINDING.prepare(`DELETE FROM emails WHERE sent_at < ?1`).bind(cutoff).run();
    await env.DATABASE_BINDING.prepare(
      `DELETE FROM email_tags WHERE email_id NOT IN (SELECT id FROM emails)`
    ).run();
    await env.DATABASE_BINDING.prepare(
      `DELETE FROM email_reasons WHERE email_id NOT IN (SELECT id FROM emails)`
    ).run();
    await env.DATABASE_BINDING.prepare(
      `DELETE FROM email_roles WHERE email_id NOT IN (SELECT id FROM emails)`
    ).run();
    await env.DATABASE_BINDING.prepare(
      `DELETE FROM email_contacts WHERE email_id NOT IN (SELECT id FROM emails)`
    ).run();
    await env.DATABASE_BINDING.prepare(
      `DELETE FROM email_dates WHERE email_id NOT IN (SELECT id FROM emails)`
    ).run();
    await env.DATABASE_BINDING.prepare(
      `DELETE FROM email_recipients WHERE email_id NOT IN (SELECT id FROM emails)`
    ).run();
    await env.DATABASE_BINDING.prepare(
      `DELETE FROM email_attachments WHERE email_id NOT IN (SELECT id FROM emails)`
    ).run();
    await env.DATABASE_BINDING.prepare(
      `DELETE FROM grant_posts WHERE email_id NOT IN (SELECT id FROM emails)`
    ).run();
    await env.DATABASE_BINDING.prepare(
      `DELETE FROM petition_posts WHERE email_id NOT IN (SELECT id FROM emails)`
    ).run();
    await env.DATABASE_BINDING.prepare(
      `DELETE FROM event_posts WHERE email_id NOT IN (SELECT id FROM emails)`
    ).run();
    await env.DATABASE_BINDING.prepare(
      `DELETE FROM resource_posts WHERE email_id NOT IN (SELECT id FROM emails)`
    ).run();
    await env.DATABASE_BINDING.prepare(
      `DELETE FROM admin_posts WHERE email_id NOT IN (SELECT id FROM emails)`
    ).run();
    await env.DATABASE_BINDING.prepare(`DELETE FROM opportunities WHERE status = 'closed'`).run();
    await env.DATABASE_BINDING.prepare(
      `DELETE FROM opportunities WHERE deadline_at IS NOT NULL AND deadline_at < ?1`
    ).bind(n).run();
    await env.DATABASE_BINDING.prepare(
      `DELETE FROM opportunities WHERE email_id NOT IN (SELECT id FROM emails)`
    ).run();
  }
};
async function ingestOneMessage(env, m) {
  // Skip processing emails with embedded listServiceId (user-created petitions)
  // These are already saved to the database via the API endpoint
  const bodyText = String(m.bodyText || '');
  const listServiceIdPattern = /list_service_id:\s*([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;
  if (listServiceIdPattern.test(bodyText)) {
    console.log('[INGEST] Skipping user-created petition with embedded listServiceId');
    return { id: null, skipped: true, reason: 'user_created_petition' };
  }

  const threadKey = makeThreadKey(m.subject);
  const createdAt = nowSec();
  const normalizedSender = normalizeSenderFields(m.fromEmail, m.fromName);
  const normalizedReplyTo = normalizeEmailAddress(m.replyTo);
  const attachments = Array.isArray(m.attachments) ? m.attachments : [];
  const id = await (m.providerMessageId ? sha256Hex(m.providerMessageId) : sha256Hex(`${m.listserv}|${m.sentAt}|${threadKey}|${(m.bodyText || "").slice(0, 256)}`));
  const existing = await env.DATABASE_BINDING.prepare(`SELECT id FROM emails WHERE id = ?1`).bind(id).first();
  if (existing) {
    await env.DATABASE_BINDING.prepare(`UPDATE emails SET updated_at = ?2 WHERE id = ?1`).bind(id, createdAt).run();
    if (attachments.length > 0) {
      await writeEmailAttachments(env, id, m.listserv, attachments, createdAt);
    }
    return { id, deduped: true };
  }
  let llmResult = null;
  let classifierVersion = "v1_regex";
  try {
    llmResult = await classifyWithLLM(
      env.CEREBRAS_API_KEY,
      m.subject,
      m.bodyText,
      {
        model: env.CEREBRAS_MODEL,
        maxAttempts: parsePositiveInt(env.CEREBRAS_MAX_ATTEMPTS)
      }
    );
    classifierVersion = "v4_cerebras";
  } catch (llmErr) {
    console.error("[ingest] LLM classification failed, falling back to regex:", llmErr?.message ?? llmErr);
    classifierVersion = "v4_cerebras_fallback";
  }
  let category, tags, confidence, reasons;
  let film_title, logline, production_type, director_name, roles_mentioned;
  let shoot_dates_text, petition_location;
  let grant_amount, grant_status, deadline_text, deadline_iso, application_url, script_url, eligibility_text, grant_scope;
  let event_date_text, event_location, rsvp_url, llm_reasoning;
  if (llmResult) {
    category = llmResult.category;
    tags = [...llmResult.tags];
    confidence = llmResult.confidence;
    llm_reasoning = llmResult.reasoning ?? null;
    reasons = llm_reasoning ? [llm_reasoning] : ["LLM classification"];
    film_title = llmResult.film_title ?? null;
    logline = llmResult.logline ?? null;
    production_type = llmResult.production_type ?? null;
    director_name = llmResult.director_name ?? null;
    roles_mentioned = llmResult.roles_mentioned ?? null;
    shoot_dates_text = llmResult.shoot_dates_text ?? null;
    petition_location = llmResult.petition_location ?? null;
    grant_amount = llmResult.grant_amount ?? null;
    grant_status = llmResult.grant_status ?? null;
    deadline_text = llmResult.deadline_text ?? null;
    deadline_iso = llmResult.deadline_iso ?? null;
    application_url = llmResult.application_url ?? null;
    script_url = llmResult.script_url ?? null;
    eligibility_text = llmResult.eligibility_text ?? null;
    grant_scope = llmResult.grant_scope ?? null;
    event_date_text = llmResult.event_date_text ?? null;
    event_location = llmResult.event_location ?? null;
    rsvp_url = llmResult.rsvp_url ?? null;
  } else {
    const regexResult = classify(m.subject, m.bodyText);
    category = regexResult.category;
    tags = [...regexResult.tags];
    confidence = regexResult.confidence;
    reasons = regexResult.reasons;
    llm_reasoning = null;
    film_title = null;
    logline = null;
    production_type = null;
    director_name = null;
    roles_mentioned = null;
    shoot_dates_text = null;
    petition_location = null;
    grant_amount = null;
    grant_status = regexResult.grant_status ?? null;
    deadline_text = regexResult.deadline_text ?? null;
    deadline_iso = regexResult.deadline_iso ?? null;
    application_url = null;
    script_url = null;
    eligibility_text = null;
    grant_scope = regexResult.grant_scope ?? null;
    event_date_text = null;
    event_location = null;
    rsvp_url = null;
  }
  roles_mentioned = normalizeRoles(roles_mentioned);
  if (!roles_mentioned || roles_mentioned.length === 0) {
    roles_mentioned = inferRolesFromText(m.subject, m.bodyText, tags);
  }
  const heuristicBump = detectBump(m.subject, m.bodyText);
  const isBump = (llmResult?.is_bump ?? false) || heuristicBump.isBump;
  if (isBump) {
    if (!tags.includes("BUMP")) tags.push("BUMP");
    if (heuristicBump.bumpReasons.length) reasons.push(...heuristicBump.bumpReasons);
    const canonical = await resolveCanonicalForBump(env, threadKey, m.sentAt);
    if (canonical.canonicalId) {
      const noNewInfo = category === "OTHER" || tags.length === 1 && tags[0] === "BUMP";
      if (noNewInfo && canonical.canonicalCategory && canonical.canonicalTags) {
        category = canonical.canonicalCategory;
        tags = Array.from(/* @__PURE__ */ new Set([...canonical.canonicalTags ?? [], "BUMP"]));
        confidence = Math.max(confidence, (canonical.canonicalConfidence ?? confidence) * 0.9);
        reasons.push("bump: inherited category from canonical email");
      }
    }
  }
  const combined = `${m.subject}
${m.bodyText}`;
  let deadline_at = resolveDeadlineAt(deadline_iso, deadline_text, combined);
  if (!deadline_at) {
    const extracted = extractDateCandidates(combined);
    if (extracted.length > 0) {
      deadline_at = parseISOToEpochSeconds(extracted[0].iso ?? null);
    }
  }
  if (deadline_at && tags.indexOf("HAS_DEADLINE") === -1) tags.push("HAS_DEADLINE");
  const contacts = extractContacts(`${m.subject}
${m.bodyText}`);
  if (contacts.length > 0 && !tags.includes("HAS_CONTACT_INFO")) tags.push("HAS_CONTACT_INFO");
  const deadlines = extractDateCandidates(`${m.subject}
${m.bodyText}`);
  const toEmails = Array.isArray(m.toEmails) ? m.toEmails : [];
  await env.DATABASE_BINDING.prepare(
    `INSERT INTO emails (
            id, provider_message_id, source, listserv,
            from_email, from_name, reply_to, to_emails_json,
            subject, body_text, body_html, sent_at,
            category, tags_json, confidence, reasons_json,
            is_bump, thread_key, canonical_id,
            deadlines_json, dates_mentioned_json, contacts_json,
            film_title, logline, production_type, director_name,
            roles_json, shoot_dates_text, petition_location, deadline_at,
            grant_amount, grant_status, application_url, script_url, eligibility_text, grant_scope,
            event_date_text, event_location, rsvp_url,
            llm_reasoning, classifier_version,
            created_at, updated_at
        ) VALUES (
            ?1,  ?2,  ?3,  ?4,
            ?5,  ?6,  ?7,  ?8,
            ?9,  ?10, ?11, ?12,
            ?13, ?14, ?15, ?16,
            ?17, ?18, ?19,
            ?20, ?21, ?22,
            ?23, ?24, ?25, ?26,
            ?27, ?28, ?29, ?30,
            ?31, ?32, ?33, ?34, ?35, ?36,
            ?37, ?38, ?39,
            ?40, ?41,
            ?42, ?43
        )`
  ).bind(
    id,
    m.providerMessageId,
    m.source,
    m.listserv,
    normalizedSender.fromEmail,
    normalizedSender.fromName,
    normalizedReplyTo,
    null,
    m.subject,
    m.bodyText || "",
    m.bodyHtml ?? null,
    m.sentAt,
    category,
    "[]",
    confidence,
    "[]",
    isBump ? 1 : 0,
    threadKey || null,
    null,
    // canonical_id (resolved on read for bump chains)
    null,
    null,
    null,
    film_title,
    logline,
    production_type,
    director_name,
    null,
    shoot_dates_text,
    petition_location,
    deadline_at,
    grant_amount,
    grant_status,
    application_url,
    script_url,
    eligibility_text,
    grant_scope,
    event_date_text,
    event_location,
    rsvp_url,
    llm_reasoning,
    classifierVersion,
    createdAt,
    createdAt
  ).run();
  await writeEmailRelations(env, id, {
    tags,
    reasons,
    roles: roles_mentioned,
    contacts,
    deadlines,
    datesMentioned: deadlines,
    toEmails
  });
  if (attachments.length > 0) {
    await writeEmailAttachments(env, id, m.listserv, attachments, createdAt);
  }
  await upsertCategoryProjection(env, {
    emailId: id,
    category,
    subject: m.subject,
    bodyText: m.bodyText || "",
    tags,
    confidence,
    isBump,
    filmTitle: film_title,
    productionType: production_type,
    directorName: director_name,
    logline,
    shootDatesText: shoot_dates_text,
    petitionLocation: petition_location,
    deadlineAt: deadline_at,
    grantAmount: grant_amount,
    grantStatus: grant_status,
    deadlineText: deadline_text,
    applicationUrl: application_url,
    scriptUrl: script_url,
    eligibilityText: eligibility_text,
    grantScope: grant_scope,
    eventDateText: event_date_text,
    eventLocation: event_location,
    rsvpUrl: rsvp_url,
    createdAt
  });
  if (category === "GRANT") {
    const status = grant_status ?? "unclear";
    const eligibility = eligibility_text ?? "unclear";
    const scope = grant_scope ?? "unclear";
    const deadlineAt = deadline_at ?? null;
    await env.DATABASE_BINDING.prepare(
      `INSERT INTO opportunities (id, email_id, title, status, deadline_at, eligibility, scope, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
             ON CONFLICT(email_id) DO UPDATE SET
               title=excluded.title, status=excluded.status,
               deadline_at=excluded.deadline_at, eligibility=excluded.eligibility,
               scope=excluded.scope, updated_at=excluded.updated_at`
    ).bind(id, id, m.subject, status, deadlineAt, eligibility, scope, createdAt, createdAt).run();
  }
  return { id, deduped: false, category, classifierVersion };
}
__name(ingestOneMessage, "ingestOneMessage");
function nowSec() {
  return Math.floor(Date.now() / 1e3);
}
__name(nowSec, "nowSec");
function corsHeaders() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type,x-webhook-secret,X-Webhook-Secret"
  };
}
__name(corsHeaders, "corsHeaders");
function jsonResponse(data, init) {
  const headers = {
    "content-type": "application/json; charset=utf-8",
    ...corsHeaders(),
    ...init && init.headers ? init.headers : {}
  };
  return new Response(JSON.stringify(data, null, 2), {
    headers,
    ...init || {}
  });
}
__name(jsonResponse, "jsonResponse");
function badRequest(msg) {
  return jsonResponse({ ok: false, error: msg }, { status: 400 });
}
__name(badRequest, "badRequest");
function unauthorized() {
  return jsonResponse({ ok: false, error: "unauthorized" }, { status: 401 });
}
__name(unauthorized, "unauthorized");
function authOk(req, env) {
  const got = req.headers.get("x-webhook-secret") ?? req.headers.get("X-Webhook-Secret");
  return Boolean(got && env.WEBHOOK_SECRET && got === env.WEBHOOK_SECRET);
}
__name(authOk, "authOk");
function pick(row, keys) {
  for (const k of keys) {
    const v = row[k];
    if (typeof v === "string" && v.trim() !== "") return v;
  }
  return null;
}
__name(pick, "pick");
function splitMailbox(value) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return { name: null, email: null };
  const match = raw.match(/^\s*"?([^"<]*)"?\s*<\s*([^>]+)\s*>\s*$/);
  if (match) {
    const name = match[1].trim().replace(/^"|"$/g, "");
    const email = match[2].trim();
    return { name: name || null, email: email || null };
  }
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) {
    return { name: null, email: raw };
  }
  return { name: raw, email: null };
}
__name(splitMailbox, "splitMailbox");
function normalizeEmailAddress(value) {
  const parsed = splitMailbox(value);
  if (parsed.email) return parsed.email;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) ? trimmed : null;
}
__name(normalizeEmailAddress, "normalizeEmailAddress");
function normalizeSenderFields(fromEmailRaw, fromNameRaw) {
  const parsedEmail = splitMailbox(fromEmailRaw);
  const parsedName = splitMailbox(fromNameRaw);
  const fromEmail = parsedEmail.email || parsedName.email || null;
  const explicitName = typeof fromNameRaw === "string" && fromNameRaw.trim() !== "" && !parsedName.email ? fromNameRaw.trim() : null;
  const fromName = explicitName || parsedEmail.name || parsedName.name || null;
  return { fromEmail, fromName };
}
__name(normalizeSenderFields, "normalizeSenderFields");
function parseSentAtToEpochSeconds(v) {
  if (!v) return nowSec();
  const trimmed = String(v).trim();
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  const ms = Date.parse(trimmed);
  return Number.isNaN(ms) ? nowSec() : Math.floor(ms / 1e3);
}
__name(parseSentAtToEpochSeconds, "parseSentAtToEpochSeconds");
function normalizeBodyForIngest(subject, bodyTextRaw) {
  const raw = String(bodyTextRaw ?? "");
  const stripped = stripQuotedEmail(raw);
  if (!shouldPreserveQuotedThreadContent(subject, raw, stripped)) {
    return stripped;
  }
  return raw.replace(/#{4,}\s*To unsubscribe from[\s\S]*$/i, "").trim().slice(0, 8e3);
}
__name(normalizeBodyForIngest, "normalizeBodyForIngest");
function shouldPreserveQuotedThreadContent(subject, rawBody, strippedBody) {
  const s = String(subject ?? "");
  const b = String(rawBody ?? "");
  const sLower = s.toLowerCase();
  const bLower = b.toLowerCase();
  const isReplyOrForward = /^\s*(re|fw|fwd)\s*:/i.test(s);
  const hasBumpSignal = /\bbump(?:ing)?\b|repost(?:ing)?|signal boost/i.test(sLower) || /^\s*(bump|bumping|reposting|signal boost)\b/m.test(bLower);
  const hasQuotedHeader = /\non .* wrote:\n/i.test(b) || /\nfrom:\s.*\nsent:\s.*\n(?:to:\s.*\n)?subject:\s.*\n/i.test(b) || /\n-----original message-----\n/i.test(b);
  const rawLen = b.trim().length;
  const strippedLen = String(strippedBody ?? "").trim().length;
  const mostlyStripped = rawLen > 0 && strippedLen / rawLen < 0.35;
  return (isReplyOrForward || hasBumpSignal) && hasQuotedHeader && (strippedLen < 600 || mostlyStripped);
}
__name(shouldPreserveQuotedThreadContent, "shouldPreserveQuotedThreadContent");
function parseTimeFromText(text) {
  const t = String(text ?? "");
  if (!t) return null;
  const ampm = t.match(/\b(1[0-2]|0?[1-9])(?::([0-5]\d))?\s*([aApP])\.?[mM]\.?\b/);
  if (ampm) {
    const hour12 = Number.parseInt(ampm[1], 10);
    const minute = Number.parseInt(ampm[2] ?? "0", 10);
    if (Number.isFinite(hour12) && Number.isFinite(minute)) {
      const isPm = ampm[3].toLowerCase() === "p";
      const hour24 = isPm ? hour12 % 12 + 12 : hour12 % 12;
      return { hour: hour24, minute, second: 0 };
    }
  }
  const twentyFour = t.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (twentyFour) {
    const hour = Number.parseInt(twentyFour[1], 10);
    const minute = Number.parseInt(twentyFour[2], 10);
    if (Number.isFinite(hour) && Number.isFinite(minute)) {
      return { hour, minute, second: 0 };
    }
  }
  return null;
}
__name(parseTimeFromText, "parseTimeFromText");
function resolveDeadlineAt(deadlineIso, deadlineText, fallbackText) {
  const iso = String(deadlineIso ?? "").trim();
  if (!iso) return null;
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(iso);
  if (isDateOnly) {
    const parsedTime = parseTimeFromText(deadlineText) || parseTimeFromText(fallbackText);
    const hour = String(parsedTime?.hour ?? 23).padStart(2, "0");
    const minute = String(parsedTime?.minute ?? 59).padStart(2, "0");
    const second = String(parsedTime?.second ?? 59).padStart(2, "0");
    return parseISOToEpochSeconds(`${iso}T${hour}:${minute}:${second}Z`);
  }
  const hasTimeNoZone = /^\d{4}-\d{2}-\d{2}[tT]\d{2}:\d{2}/.test(iso) && !/(Z|[+-]\d{2}:\d{2})$/i.test(iso);
  if (hasTimeNoZone) {
    return parseISOToEpochSeconds(`${iso}Z`);
  }
  return parseISOToEpochSeconds(iso);
}
__name(resolveDeadlineAt, "resolveDeadlineAt");
function parsePositiveInt(v) {
  if (v == null) return void 0;
  const n = Number.parseInt(String(v), 10);
  if (!Number.isFinite(n) || n <= 0) return void 0;
  return n;
}
__name(parsePositiveInt, "parsePositiveInt");
function normalizeContentId(value) {
  if (typeof value !== "string") return null;
  let out = value.trim();
  if (!out) return null;
  out = out.replace(/^cid:/i, "").trim();
  out = out.replace(/^<+/, "").replace(/>+$/, "").trim();
  if (!out) return null;
  return out.toLowerCase();
}
__name(normalizeContentId, "normalizeContentId");
function makeInlineImageUrl(origin, emailId, cid) {
  return `${origin}/api/email/${encodeURIComponent(String(emailId))}/inline/${encodeURIComponent(cid)}`;
}
__name(makeInlineImageUrl, "makeInlineImageUrl");
function rewriteInlineCidSources(html, emailId, origin) {
  if (typeof html !== "string" || !html) return html ?? null;
  if (!emailId || !origin) return html;
  return html.replace(/src\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/gi, (_m, _all, dquote, squote, bare) => {
    const rawSrc = dquote ?? squote ?? bare ?? "";
    const normalized = normalizeContentId(rawSrc);
    if (!normalized) return `src="${rawSrc}"`;
    if (!/^cid:/i.test(rawSrc.trim())) return `src="${rawSrc}"`;
    return `src="${makeInlineImageUrl(origin, emailId, normalized)}"`;
  });
}
__name(rewriteInlineCidSources, "rewriteInlineCidSources");
function rewriteInlineCidSourcesForRows(rows, origin) {
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => {
    if (!row || typeof row !== "object") return row;
    if (!row.body_html || !row.id) return row;
    return {
      ...row,
      body_html: rewriteInlineCidSources(row.body_html, row.id, origin)
    };
  });
}
__name(rewriteInlineCidSourcesForRows, "rewriteInlineCidSourcesForRows");
function resolveEmailEngineBaseUrl(env) {
  const raw = String(
    env.EMAILENGINE_API_BASE_URL ?? env.EMAILENGINE_BASE_URL ?? env.EMAILENGINE_URL ?? ""
  ).trim();
  if (!raw) return null;
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}
__name(resolveEmailEngineBaseUrl, "resolveEmailEngineBaseUrl");
function resolveEmailEngineAccessToken(env) {
  const token = String(
    env.EMAILENGINE_ACCESS_TOKEN ?? env.EMAILENGINE_API_TOKEN ?? env.EMAILENGINE_TOKEN ?? ""
  ).trim();
  return token || null;
}
__name(resolveEmailEngineAccessToken, "resolveEmailEngineAccessToken");
async function fetchEmailEngineAttachmentsForMessage(env, account, messageId) {
  const baseUrl = resolveEmailEngineBaseUrl(env);
  const accessToken = resolveEmailEngineAccessToken(env);
  if (!baseUrl || !accessToken) return [];
  const normalizedAccount = String(account ?? "").trim();
  const normalizedMessageId = String(messageId ?? "").trim();
  if (!normalizedAccount || !normalizedMessageId) return [];
  const endpoint = `${baseUrl}/v1/account/${encodeURIComponent(normalizedAccount)}/message/${encodeURIComponent(normalizedMessageId)}`;
  try {
    const response = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!response.ok) return [];
    const payload = await response.json();
    return Array.isArray(payload?.attachments) ? payload.attachments : [];
  } catch {
    return [];
  }
}
__name(fetchEmailEngineAttachmentsForMessage, "fetchEmailEngineAttachmentsForMessage");
function shouldLogApiRequests(env) {
  return String(env.API_DEBUG_LOGS ?? "").toLowerCase() === "true";
}
__name(shouldLogApiRequests, "shouldLogApiRequests");
function logApiRequest(env, payload) {
  if (!shouldLogApiRequests(env)) return;
  console.log(`[api] ${JSON.stringify(payload)}`);
}
__name(logApiRequest, "logApiRequest");
async function listProjectedEmails(env, url, opts) {
  const startedAt = Date.now();
  const summary = opts.summary === true;
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "50") || 50, 200);
  const offset = Math.max(Number(url.searchParams.get("offset") ?? "0") || 0, 0);
  const q = url.searchParams.get("q");
  const sinceRaw = url.searchParams.get("since");
  const untilRaw = url.searchParams.get("until");
  const since = sinceRaw == null ? null : Number(sinceRaw);
  const until = untilRaw == null ? null : Number(untilRaw);
  const where = [`e.category = ?`];
  const args = [opts.category];
  if (Number.isFinite(since)) {
    where.push("e.sent_at >= ?");
    args.push(since);
  }
  if (Number.isFinite(until)) {
    where.push("e.sent_at <= ?");
    args.push(until);
  }
  if (q) {
    where.push("(e.subject LIKE ? OR e.body_text LIKE ?)");
    args.push(`%${q}%`, `%${q}%`);
  }
  for (const clause of opts.projectionWhere ?? []) {
    where.push(clause);
  }
  const projection = opts.projection ?? {};
  const col = /* @__PURE__ */ __name((name, fallback) => `${projection[name] ?? fallback} AS ${name}`, "col");
  const bodyTextSelect = summary ? `'' AS body_text` : `e.body_text`;
  const bodyHtmlSelect = summary ? `NULL AS body_html` : `e.body_html`;
  const reasonsSelect = summary ? `'[]' AS reasons_json` : `COALESCE(
                (SELECT json_group_array(reason) FROM (SELECT reason FROM email_reasons WHERE email_id = e.id ORDER BY position)),
                e.reasons_json,
                '[]'
            ) AS reasons_json`;
  const rolesSelect = summary ? `NULL AS roles_json` : `COALESCE(
                (SELECT json_group_array(role) FROM (SELECT role FROM email_roles WHERE email_id = e.id ORDER BY position)),
                e.roles_json
            ) AS roles_json`;
  const deadlinesSelect = summary ? `NULL AS deadlines_json` : `COALESCE(
                (
                    SELECT json_group_array(json_object('text', date_text, 'iso', date_iso))
                    FROM (
                        SELECT date_text, date_iso
                        FROM email_dates
                        WHERE email_id = e.id AND kind = 'deadline'
                        ORDER BY position
                    )
                ),
                e.deadlines_json
            ) AS deadlines_json`;
  const contactsSelect = summary ? `NULL AS contacts_json` : `COALESCE(
                (
                    SELECT json_group_array(json_object('type', contact_type, 'value', contact_value))
                    FROM (
                        SELECT contact_type, contact_value
                        FROM email_contacts
                        WHERE email_id = e.id
                        ORDER BY position
                    )
                ),
                e.contacts_json
            ) AS contacts_json`;
  const llmReasoningSelect = summary ? `NULL AS llm_reasoning` : `e.llm_reasoning`;
  const whereSql = `WHERE ${where.join(" AND ")}`;
  const stmt = env.DATABASE_BINDING.prepare(
    `SELECT
            e.id, e.subject, ${bodyTextSelect}, ${bodyHtmlSelect},
            e.from_email, e.from_name, e.reply_to, e.sent_at,
            e.category,
            COALESCE(
                (SELECT json_group_array(tag) FROM (SELECT tag FROM email_tags WHERE email_id = e.id ORDER BY tag)),
                e.tags_json,
                '[]'
            ) AS tags_json,
            e.confidence,
            ${reasonsSelect},
            e.is_bump, e.thread_key, e.canonical_id,
            ${col("film_title", "e.film_title")},
            ${col("logline", "e.logline")},
            ${col("production_type", "e.production_type")},
            ${col("director_name", "e.director_name")},
            ${rolesSelect},
            ${col("shoot_dates_text", "e.shoot_dates_text")},
            ${col("petition_location", "e.petition_location")},
            ${col("deadline_at", "e.deadline_at")},
            ${col("grant_amount", "e.grant_amount")},
            ${col("grant_status", "e.grant_status")},
            ${col("application_url", "e.application_url")},
            ${col("script_url", "e.script_url")},
            ${col("eligibility_text", "e.eligibility_text")},
            ${col("grant_scope", "e.grant_scope")},
            ${col("event_date_text", "e.event_date_text")},
            ${col("event_location", "e.event_location")},
            ${col("rsvp_url", "e.rsvp_url")},
            ${llmReasoningSelect}, e.classifier_version,
            ${deadlinesSelect},
            ${contactsSelect}
         FROM ${opts.table} ${opts.alias}
         JOIN emails e ON e.id = ${opts.alias}.email_id
         ${whereSql}
         ORDER BY e.sent_at DESC
         LIMIT ? OFFSET ?`
  );
  const res = await stmt.bind(...args, limit, offset).all();
  const rows = rewriteInlineCidSourcesForRows(res.results, opts.origin ?? url.origin);
  logApiRequest(env, {
    path: url.pathname,
    query: Object.fromEntries(url.searchParams.entries()),
    category: opts.category,
    table: opts.table,
    rows: Array.isArray(rows) ? rows.length : 0,
    duration_ms: Date.now() - startedAt,
    source: "projection"
  });
  return { ok: true, rows, limit, offset };
}
__name(listProjectedEmails, "listProjectedEmails");
function normalizeSubject(subject) {
  return String(subject ?? "").replace(/\s+/g, " ").trim();
}
__name(normalizeSubject, "normalizeSubject");
function makeThreadKey(subject) {
  let s = normalizeSubject(subject).toLowerCase();
  while (true) {
    const next = s.replace(/^(re|fwd|fw)\s*:\s*/i, "");
    if (next === s) break;
    s = next;
  }
  s = s.replace(/^\[[^\]]+\]\s*/, "");
  s = s.replace(/\(\s*bump\s*\)\s*$/i, "").replace(/\bbump\b\s*$/i, "");
  return s.replace(/\s+/g, " ").trim();
}
__name(makeThreadKey, "makeThreadKey");
function detectBump(subject, bodyText) {
  const s = String(subject ?? "").toLowerCase();
  const b = String(bodyText ?? "").toLowerCase();
  const reasons = [];
  if (/\bbump(?:ing)?\b/.test(s)) reasons.push("subject contains bump/bumping");
  if (/^\s*(bump|bumping|reposting|signal boost)\b/m.test(b)) reasons.push("body contains standalone bump-like phrase");
  const isRe = /^\s*re\s*:/i.test(subject);
  if (isRe) {
    const trimmed = String(bodyText ?? "").trim();
    if (trimmed.length <= 200 && /(following up|any updates|ping|just checking|bumping)/i.test(trimmed)) {
      reasons.push("re: + short followup language");
    }
  }
  return { isBump: reasons.length > 0, bumpReasons: reasons };
}
__name(detectBump, "detectBump");
async function resolveCanonicalForBump(env, threadKey, sentAt) {
  const row = await env.DATABASE_BINDING.prepare(
    `SELECT
            e.id,
            e.category,
            e.confidence,
            (
                SELECT json_group_array(tag)
                FROM (SELECT tag FROM email_tags WHERE email_id = e.id ORDER BY tag)
            ) AS tags_json
         FROM emails e
         WHERE e.thread_key = ?1
           AND e.sent_at >= ?2
           AND e.category != 'DO_NOT_CARE'
         ORDER BY e.sent_at DESC
         LIMIT 1`
  ).bind(threadKey, sentAt - 60 * 24 * 60 * 60).first();
  if (!row) return { canonicalId: null, canonicalCategory: null, canonicalTags: null, canonicalConfidence: null };
  let tags = null;
  try {
    tags = JSON.parse(row.tags_json);
  } catch {
    tags = null;
  }
  return {
    canonicalId: String(row.id),
    canonicalCategory: row.category,
    canonicalTags: tags,
    canonicalConfidence: typeof row.confidence === "number" ? row.confidence : null
  };
}
__name(resolveCanonicalForBump, "resolveCanonicalForBump");
async function sha256Hex(message) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(message));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(sha256Hex, "sha256Hex");
async function upsertCategoryProjection(env, row) {
  await clearCategoryProjection(env, row.emailId);
  const tags = new Set(Array.isArray(row.tags) ? row.tags : []);
  if (row.category === "GRANT") {
    await env.DATABASE_BINDING.prepare(
      `INSERT INTO grant_posts (
                email_id, title, grant_amount, grant_status, deadline_at, deadline_text,
                application_url, eligibility_text, grant_scope, classifier_confidence, created_at, updated_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?11)
            ON CONFLICT(email_id) DO UPDATE SET
                title=excluded.title,
                grant_amount=excluded.grant_amount,
                grant_status=excluded.grant_status,
                deadline_at=excluded.deadline_at,
                deadline_text=excluded.deadline_text,
                application_url=excluded.application_url,
                eligibility_text=excluded.eligibility_text,
                grant_scope=excluded.grant_scope,
                classifier_confidence=excluded.classifier_confidence,
                updated_at=excluded.updated_at`
    ).bind(
      row.emailId,
      row.subject,
      row.grantAmount ?? null,
      row.grantStatus ?? "unclear",
      row.deadlineAt ?? null,
      row.deadlineText ?? null,
      row.applicationUrl ?? null,
      row.eligibilityText ?? null,
      row.grantScope ?? "unclear",
      row.confidence,
      row.createdAt
    ).run();
    return;
  }
  if (row.category === "CREW_CALL") {
    const isCasting = tags.has("CASTING_ROLES") || tags.has("CASTING_EXTRAS");
    await env.DATABASE_BINDING.prepare(
      `INSERT INTO petition_posts (
                email_id, title, film_title, production_type, logline, director_name, shoot_dates_text,
                petition_location, application_url, script_url, is_casting, is_bump, deadline_at,
                classifier_confidence, created_at, updated_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?15)
            ON CONFLICT(email_id) DO UPDATE SET
                title=excluded.title,
                film_title=excluded.film_title,
                production_type=excluded.production_type,
                logline=excluded.logline,
                director_name=excluded.director_name,
                shoot_dates_text=excluded.shoot_dates_text,
                petition_location=excluded.petition_location,
                application_url=excluded.application_url,
                script_url=excluded.script_url,
                is_casting=excluded.is_casting,
                is_bump=excluded.is_bump,
                deadline_at=excluded.deadline_at,
                classifier_confidence=excluded.classifier_confidence,
                updated_at=excluded.updated_at`
    ).bind(
      row.emailId,
      row.subject,
      row.filmTitle ?? null,
      row.productionType ?? null,
      row.logline ?? null,
      row.directorName ?? null,
      row.shootDatesText ?? null,
      row.petitionLocation ?? null,
      row.applicationUrl ?? null,
      row.scriptUrl ?? null,
      isCasting ? 1 : 0,
      row.isBump ? 1 : 0,
      row.deadlineAt ?? null,
      row.confidence,
      row.createdAt
    ).run();
    return;
  }
  if (row.category === "EVENT") {
    await env.DATABASE_BINDING.prepare(
      `INSERT INTO event_posts (
                email_id, title, event_date_text, event_location, rsvp_url,
                deadline_at, is_bump, classifier_confidence, created_at, updated_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?9)
            ON CONFLICT(email_id) DO UPDATE SET
                title=excluded.title,
                event_date_text=excluded.event_date_text,
                event_location=excluded.event_location,
                rsvp_url=excluded.rsvp_url,
                deadline_at=excluded.deadline_at,
                is_bump=excluded.is_bump,
                classifier_confidence=excluded.classifier_confidence,
                updated_at=excluded.updated_at`
    ).bind(
      row.emailId,
      row.subject,
      row.eventDateText ?? null,
      row.eventLocation ?? null,
      row.rsvpUrl ?? null,
      row.deadlineAt ?? null,
      row.isBump ? 1 : 0,
      row.confidence,
      row.createdAt
    ).run();
    return;
  }
  if (row.category === "RESOURCE") {
    const needsEquipment = tags.has("EQUIPMENT");
    const needsLocation = tags.has("LOCATION");
    const needsPropsCostumes = tags.has("PROPS_COSTUMES");
    await env.DATABASE_BINDING.prepare(
      `INSERT INTO resource_posts (
                email_id, title, details_text, needs_equipment, needs_location,
                needs_props_costumes, is_bump, classifier_confidence, created_at, updated_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?9)
            ON CONFLICT(email_id) DO UPDATE SET
                title=excluded.title,
                details_text=excluded.details_text,
                needs_equipment=excluded.needs_equipment,
                needs_location=excluded.needs_location,
                needs_props_costumes=excluded.needs_props_costumes,
                is_bump=excluded.is_bump,
                classifier_confidence=excluded.classifier_confidence,
                updated_at=excluded.updated_at`
    ).bind(
      row.emailId,
      row.subject,
      row.bodyText.slice(0, 500),
      needsEquipment ? 1 : 0,
      needsLocation ? 1 : 0,
      needsPropsCostumes ? 1 : 0,
      row.isBump ? 1 : 0,
      row.confidence,
      row.createdAt
    ).run();
    return;
  }
  if (row.category === "ADMIN") {
    await env.DATABASE_BINDING.prepare(
      `INSERT INTO admin_posts (
                email_id, title, is_bump, classifier_confidence, created_at, updated_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?5)
            ON CONFLICT(email_id) DO UPDATE SET
                title=excluded.title,
                is_bump=excluded.is_bump,
                classifier_confidence=excluded.classifier_confidence,
                updated_at=excluded.updated_at`
    ).bind(row.emailId, row.subject, row.isBump ? 1 : 0, row.confidence, row.createdAt).run();
  }
}
__name(upsertCategoryProjection, "upsertCategoryProjection");
async function clearCategoryProjection(env, emailId) {
  await env.DATABASE_BINDING.prepare(`DELETE FROM grant_posts WHERE email_id = ?1`).bind(emailId).run();
  await env.DATABASE_BINDING.prepare(`DELETE FROM petition_posts WHERE email_id = ?1`).bind(emailId).run();
  await env.DATABASE_BINDING.prepare(`DELETE FROM event_posts WHERE email_id = ?1`).bind(emailId).run();
  await env.DATABASE_BINDING.prepare(`DELETE FROM resource_posts WHERE email_id = ?1`).bind(emailId).run();
  await env.DATABASE_BINDING.prepare(`DELETE FROM admin_posts WHERE email_id = ?1`).bind(emailId).run();
}
__name(clearCategoryProjection, "clearCategoryProjection");
async function writeEmailRelations(env, emailId, payload) {
  const tags = uniqueStrings(payload.tags);
  const reasons = uniqueStrings(payload.reasons);
  const roles = uniqueStrings(payload.roles);
  const toEmails = uniqueStrings(payload.toEmails);
  const contacts = uniqueContacts(payload.contacts);
  const deadlines = uniqueDateCandidates(payload.deadlines);
  const datesMentioned = uniqueDateCandidates(payload.datesMentioned);
  for (const tag of tags) {
    await env.DATABASE_BINDING.prepare(
      `INSERT OR IGNORE INTO email_tags (email_id, tag) VALUES (?1, ?2)`
    ).bind(emailId, tag).run();
  }
  for (let i = 0; i < reasons.length; i++) {
    await env.DATABASE_BINDING.prepare(
      `INSERT OR REPLACE INTO email_reasons (email_id, position, reason) VALUES (?1, ?2, ?3)`
    ).bind(emailId, i, reasons[i]).run();
  }
  for (let i = 0; i < roles.length; i++) {
    await env.DATABASE_BINDING.prepare(
      `INSERT OR REPLACE INTO email_roles (email_id, position, role) VALUES (?1, ?2, ?3)`
    ).bind(emailId, i, roles[i]).run();
  }
  for (let i = 0; i < contacts.length; i++) {
    await env.DATABASE_BINDING.prepare(
      `INSERT OR REPLACE INTO email_contacts (email_id, contact_type, contact_value, position) VALUES (?1, ?2, ?3, ?4)`
    ).bind(emailId, contacts[i].type, contacts[i].value, i).run();
  }
  for (let i = 0; i < deadlines.length; i++) {
    await env.DATABASE_BINDING.prepare(
      `INSERT OR REPLACE INTO email_dates (email_id, kind, position, date_text, date_iso, date_epoch)
             VALUES (?1, 'deadline', ?2, ?3, ?4, ?5)`
    ).bind(emailId, i, deadlines[i].text ?? null, deadlines[i].iso ?? null, parseISOToEpochSeconds(deadlines[i].iso)).run();
  }
  for (let i = 0; i < datesMentioned.length; i++) {
    await env.DATABASE_BINDING.prepare(
      `INSERT OR REPLACE INTO email_dates (email_id, kind, position, date_text, date_iso, date_epoch)
             VALUES (?1, 'mentioned', ?2, ?3, ?4, ?5)`
    ).bind(
      emailId,
      i,
      datesMentioned[i].text ?? null,
      datesMentioned[i].iso ?? null,
      parseISOToEpochSeconds(datesMentioned[i].iso)
    ).run();
  }
  for (let i = 0; i < toEmails.length; i++) {
    await env.DATABASE_BINDING.prepare(
      `INSERT OR REPLACE INTO email_recipients (email_id, position, recipient_email) VALUES (?1, ?2, ?3)`
    ).bind(emailId, i, toEmails[i]).run();
  }
}
__name(writeEmailRelations, "writeEmailRelations");
async function writeEmailAttachments(env, emailId, account, attachments, updatedAt) {
  if (!Array.isArray(attachments) || attachments.length === 0) return;
  const normalizedAccount = String(account ?? "").trim() || "emailengine";
  const timestamp = Number.isFinite(updatedAt) ? updatedAt : nowSec();
  for (const attachment of attachments) {
    if (!attachment || typeof attachment !== "object") continue;
    const attachmentId = String(attachment.id ?? "").trim();
    if (!attachmentId) continue;
    const contentId = typeof attachment.contentId === "string" ? attachment.contentId.trim() : null;
    const cidNormalized = normalizeContentId(contentId);
    const contentType = typeof attachment.contentType === "string" ? attachment.contentType.trim() : null;
    const filename = typeof attachment.filename === "string" ? attachment.filename.trim() : null;
    const encodedSizeRaw = Number.parseInt(String(attachment.encodedSize ?? ""), 10);
    const encodedSize = Number.isFinite(encodedSizeRaw) ? encodedSizeRaw : null;
    const isEmbedded = attachment.embedded === true ? 1 : 0;
    const isInline = attachment.inline === true ? 1 : 0;
    await env.DATABASE_BINDING.prepare(
      `INSERT INTO email_attachments (
                email_id, account, attachment_id, content_id, cid_normalized,
                content_type, filename, encoded_size, embedded, inline,
                created_at, updated_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?11)
            ON CONFLICT(email_id, attachment_id) DO UPDATE SET
                account=excluded.account,
                content_id=excluded.content_id,
                cid_normalized=excluded.cid_normalized,
                content_type=excluded.content_type,
                filename=excluded.filename,
                encoded_size=excluded.encoded_size,
                embedded=excluded.embedded,
                inline=excluded.inline,
                updated_at=excluded.updated_at`
    ).bind(
      emailId,
      normalizedAccount,
      attachmentId,
      contentId,
      cidNormalized,
      contentType,
      filename,
      encodedSize,
      isEmbedded,
      isInline,
      timestamp
    ).run();
  }
}
__name(writeEmailAttachments, "writeEmailAttachments");
function normalizeRoles(values) {
  const roles = uniqueStrings(values);
  return roles.length > 0 ? roles : null;
}
__name(normalizeRoles, "normalizeRoles");
function inferRolesFromText(subject, bodyText, tags) {
  const text = `${String(subject ?? "")}
${String(bodyText ?? "")}`;
  const lower = text.toLowerCase();
  const out = [];
  const addIf = /* @__PURE__ */ __name((label, re) => {
    if (re.test(lower)) out.push(label);
  }, "addIf");
  addIf("DP", /\bdp\b|director of photography|cinematograph/);
  addIf("Sound", /sound designer|sound mixer|\bboom\b|production sound/);
  addIf("Editor", /\beditor\b|editing/);
  addIf("Gaffer/Grip", /\bgaffer\b|\bgrip\b/);
  addIf("Producer", /\bproducer\b|production manager|line producer|\bupm\b/);
  addIf("AD", /assistant director|\b1st ad\b|\b2nd ad\b/);
  addIf("PA", /\bpa\b|production assistant/);
  const tagSet = new Set(Array.isArray(tags) ? tags : []);
  if (tagSet.has("CASTING_EXTRAS")) out.push("Extras");
  if (tagSet.has("CASTING_ROLES")) out.push("Actor");
  return normalizeRoles(out);
}
__name(inferRolesFromText, "inferRolesFromText");
function uniqueStrings(values) {
  if (!Array.isArray(values)) return [];
  const out = [];
  const seen = /* @__PURE__ */ new Set();
  for (const raw of values) {
    if (typeof raw !== "string") continue;
    const value = raw.trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}
__name(uniqueStrings, "uniqueStrings");
function uniqueContacts(values) {
  if (!Array.isArray(values)) return [];
  const out = [];
  const seen = /* @__PURE__ */ new Set();
  for (const c of values) {
    if (!c || typeof c !== "object") continue;
    const type = String(c.type ?? "").trim();
    const value = String(c.value ?? "").trim();
    if (!type || !value) continue;
    const key = `${type}|${value}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ type, value });
  }
  return out;
}
__name(uniqueContacts, "uniqueContacts");
function uniqueDateCandidates(values) {
  if (!Array.isArray(values)) return [];
  const out = [];
  const seen = /* @__PURE__ */ new Set();
  for (const d of values) {
    if (!d || typeof d !== "object") continue;
    const text = typeof d.text === "string" ? d.text.trim() : "";
    const iso = typeof d.iso === "string" ? d.iso.trim() : null;
    if (!text && !iso) continue;
    const key = `${text}|${iso ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ text: text || null, iso });
  }
  return out;
}
__name(uniqueDateCandidates, "uniqueDateCandidates");
export {
  worker_default as default
};
//# sourceMappingURL=worker.js.map
