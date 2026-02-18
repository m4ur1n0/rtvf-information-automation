/* eslint-disable import/no-anonymous-default-export */
import {
    classifyWithLLM,
    classify,
    htmlToPlainText,
    stripQuotedEmail,
    parseCsv,
    extractDateCandidates,
    extractContacts,
    parseISOToEpochSeconds,
} from "./classify.js";

export default {
    async fetch(req, env) {
        const url = new URL(req.url);

        // Health
        if (req.method === "GET" && url.pathname === "/health") {
            return jsonResponse({ ok: true });
        }

        // ─── GET /api/emails ──────────────────────────────────────────────────────
        if (req.method === "GET" && url.pathname === "/api/emails") {
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

            if (!includeDoNotCare) where.push(`category != 'DO_NOT_CARE'`);
            if (category) { where.push(`category = ?`); args.push(category); }
            if (since) { where.push(`sent_at >= ?`); args.push(Number(since)); }
            if (until) { where.push(`sent_at <= ?`); args.push(Number(until)); }
            if (q) { where.push(`(subject LIKE ? OR body_text LIKE ?)`); args.push(`%${q}%`, `%${q}%`); }
            if (tag) { where.push(`tags_json LIKE ?`); args.push(`%"${tag}"%`); }

            const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

            const stmt = env.DATABASE_BINDING.prepare(
                `SELECT
                    id, subject, body_text, body_html,
                    from_email, from_name, reply_to, sent_at,
                    category, tags_json, confidence, reasons_json,
                    is_bump, thread_key, canonical_id,
                    film_title, logline, production_type,
                    roles_json, shoot_dates_text, petition_location, deadline_at,
                    grant_amount, grant_status, application_url, eligibility_text, grant_scope,
                    event_date_text, event_location, rsvp_url,
                    llm_reasoning, classifier_version,
                    deadlines_json, contacts_json
                FROM emails
                ${whereSql}
                ORDER BY sent_at DESC
                LIMIT ? OFFSET ?`
            );

            const res = await stmt.bind(...args, limit, offset).all();
            return jsonResponse({ ok: true, rows: res.results, limit, offset });
        }

        // ─── POST /webhook/email ──────────────────────────────────────────────────
        if (req.method === "POST" && url.pathname === "/webhook/email") {
            if (!authOk(req, env)) return unauthorized();

            const ct = (req.headers.get("content-type") || "").toLowerCase();

            // ── EmailEngine JSON webhook ──────────────────────────────────────────
            if (ct.includes("application/json")) {
                let payload;
                try {
                    payload = await req.json();
                } catch {
                    return badRequest("invalid JSON body");
                }

                // Only process new message events
                if (payload.event !== "messageNew") {
                    return jsonResponse({ ok: true, skipped: true, reason: `event=${payload.event}` });
                }

                const data = payload.data;
                if (!data) return badRequest("missing data field");

                const subject = data.subject ?? "(no subject)";
                const fromEmail = data.from?.address ?? null;
                const fromName = data.from?.name ?? null;
                const replyTo = data.replyTo?.[0]?.address ?? null;
                const toEmails = Array.isArray(data.to)
                    ? data.to.map((t) => t.address).filter(Boolean)
                    : null;
                const bodyHtml = data.text?.html ?? null;
                const bodyTextRaw = data.text?.plain ?? (bodyHtml ? htmlToPlainText(bodyHtml) : "");
                const bodyText = stripQuotedEmail(bodyTextRaw);
                const providerMessageId = data.messageId ?? data.id ?? null;
                const sentAt = parseSentAtToEpochSeconds(data.date);
                const listserv = payload.account ?? "emailengine";

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
                });

                return jsonResponse({ ok: true, ...result });
            }

            // ── Legacy CSV bulk import ────────────────────────────────────────────
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

                for (const r of dataRows) {
                    try {
                        const obj = {};
                        for (let i = 0; i < header.length; i++) obj[header[i]] = r[i] ?? "";

                        const subject = pick(obj, ["subject", "Subject"]) ?? "(no subject)";
                        const bodyTextRaw = pick(obj, ["body_text", "body", "text", "Body", "content"]) ?? "";
                        const bodyText = stripQuotedEmail(bodyTextRaw);
                        const bodyHtml = pick(obj, ["body_html", "html", "BodyHTML"]) ?? null;

                        const fromEmail = pick(obj, ["from_email", "from", "From", "sender"]) ?? null;
                        const fromName = pick(obj, ["from_name", "FromName", "sender_name"]) ?? null;
                        const replyTo = pick(obj, ["reply_to", "ReplyTo"]) ?? null;
                        const listserv = pick(obj, ["listserv", "Listserv", "list", "list_id"]) ?? "csv-import";
                        const source = pick(obj, ["source", "Source"]) ?? "manual";
                        const providerMessageId =
                            pick(obj, ["provider_message_id", "message_id", "Message-Id", "message-id"]) ?? null;

                        const sentAt = parseSentAtToEpochSeconds(
                            pick(obj, ["sent_at", "SentAt", "date", "Date", "timestamp", "Timestamp"])
                        );

                        if (sentAt < oldestAllowed) { skippedOld++; continue; }

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
                        });

                        if (result.deduped) deduped++;
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
                    total: dataRows.length,
                });
            }

            return badRequest("expected application/json (EmailEngine webhook) or text/csv (bulk import)");
        }

        return jsonResponse({ ok: false, error: "not found" }, { status: 404 });
    },

    async scheduled(_event, env) {
        const n = nowSec();
        const cutoff = n - 150 * 24 * 60 * 60;

        await env.DATABASE_BINDING.prepare(`DELETE FROM emails WHERE sent_at < ?1`).bind(cutoff).run();
        await env.DATABASE_BINDING.prepare(`DELETE FROM opportunities WHERE status = 'closed'`).run();
        await env.DATABASE_BINDING.prepare(
            `DELETE FROM opportunities WHERE deadline_at IS NOT NULL AND deadline_at < ?1`
        ).bind(n).run();
        await env.DATABASE_BINDING.prepare(
            `DELETE FROM opportunities WHERE email_id NOT IN (SELECT id FROM emails)`
        ).run();
    },
};

/* =============================================================================
   Core ingest — classifies and stores one message
============================================================================= */

async function ingestOneMessage(env, m) {
    const threadKey = makeThreadKey(m.subject);
    const createdAt = nowSec();

    const id = await (m.providerMessageId
        ? sha256Hex(m.providerMessageId)
        : sha256Hex(`${m.listserv}|${m.sentAt}|${threadKey}|${(m.bodyText || "").slice(0, 256)}`));

    // Dedup
    const existing = await env.DATABASE_BINDING.prepare(`SELECT id FROM emails WHERE id = ?1`).bind(id).first();
    if (existing) {
        await env.DATABASE_BINDING.prepare(`UPDATE emails SET updated_at = ?2 WHERE id = ?1`).bind(id, createdAt).run();
        return { id, deduped: true };
    }

    // ── Classification: LLM first, regex fallback ──────────────────────────

    let llmResult = null;
    let classifierVersion = "v1_regex";

    try {
        llmResult = await classifyWithLLM(env.NVIDIA_API_KEY, m.subject, m.bodyText);
        classifierVersion = "v2_llm";
    } catch (llmErr) {
        console.error("[ingest] LLM classification failed, falling back to regex:", llmErr?.message ?? llmErr);
        classifierVersion = "v2_llm_fallback";
    }

    // ── Merge into canonical result ──────────────────────────────────────

    let category, tags, confidence, reasons;
    let film_title, logline, production_type, roles_mentioned;
    let shoot_dates_text, petition_location, pay;
    let grant_amount, grant_status, deadline_text, deadline_iso, application_url, eligibility_text, grant_scope;
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
        roles_mentioned = llmResult.roles_mentioned ?? null;
        shoot_dates_text = llmResult.shoot_dates_text ?? null;
        petition_location = llmResult.petition_location ?? null;
        pay = llmResult.pay ?? null;
        grant_amount = llmResult.grant_amount ?? null;
        grant_status = llmResult.grant_status ?? null;
        deadline_text = llmResult.deadline_text ?? null;
        deadline_iso = llmResult.deadline_iso ?? null;
        application_url = llmResult.application_url ?? null;
        eligibility_text = llmResult.eligibility_text ?? null;
        grant_scope = llmResult.grant_scope ?? null;
        event_date_text = llmResult.event_date_text ?? null;
        event_location = llmResult.event_location ?? null;
        rsvp_url = llmResult.rsvp_url ?? null;
    } else {
        // Regex fallback
        const regexResult = classify(m.subject, m.bodyText);
        category = regexResult.category;
        tags = [...regexResult.tags];
        confidence = regexResult.confidence;
        reasons = regexResult.reasons;
        llm_reasoning = null;

        film_title = null;
        logline = null;
        production_type = null;
        roles_mentioned = null;
        shoot_dates_text = null;
        petition_location = null;
        pay = null;
        grant_amount = null;
        grant_status = regexResult.grant_status ?? null;
        deadline_text = regexResult.deadline_text ?? null;
        deadline_iso = regexResult.deadline_iso ?? null;
        application_url = null;
        eligibility_text = null;
        grant_scope = regexResult.grant_scope ?? null;
        event_date_text = null;
        event_location = null;
        rsvp_url = null;
    }

    // ── Bump detection (LLM or heuristic) ────────────────────────────────

    const heuristicBump = detectBump(m.subject, m.bodyText);
    const isBump = (llmResult?.is_bump ?? false) || heuristicBump.isBump;

    if (isBump) {
        if (!tags.includes("BUMP")) tags.push("BUMP");
        if (heuristicBump.bumpReasons.length) reasons.push(...heuristicBump.bumpReasons);

        const canonical = await resolveCanonicalForBump(env, threadKey, m.sentAt);
        if (canonical.canonicalId) {
            const noNewInfo = category === "OTHER" || (tags.length === 1 && tags[0] === "BUMP");
            if (noNewInfo && canonical.canonicalCategory && canonical.canonicalTags) {
                category = canonical.canonicalCategory;
                tags = Array.from(new Set([...(canonical.canonicalTags ?? []), "BUMP"]));
                confidence = Math.max(confidence, (canonical.canonicalConfidence ?? confidence) * 0.9);
                reasons.push("bump: inherited category from canonical email");
            }
        }
    }

    // ── Resolve deadline_at (epoch seconds) ───────────────────────────────

    let deadline_at = null;
    if (deadline_iso) {
        deadline_at = parseISOToEpochSeconds(deadline_iso);
    }
    if (!deadline_at) {
        const combined = `${m.subject}\n${m.bodyText}`;
        const extracted = extractDateCandidates(combined);
        if (extracted.length > 0) {
            deadline_at = parseISOToEpochSeconds(extracted[0].iso ?? null);
        }
    }
    if (deadline_at && tags.indexOf("HAS_DEADLINE") === -1) tags.push("HAS_DEADLINE");

    // ── Extract contacts (reliable regex) ────────────────────────────────

    const contacts = extractContacts(`${m.subject}\n${m.bodyText}`);
    if (contacts.length > 0 && !tags.includes("HAS_CONTACT_INFO")) tags.push("HAS_CONTACT_INFO");

    // ── Extract dates for legacy deadlines_json ────────────────────────────

    const deadlines = extractDateCandidates(`${m.subject}\n${m.bodyText}`);

    // ── INSERT into emails table ──────────────────────────────────────────

    const toEmailsJson = m.toEmails ? JSON.stringify(m.toEmails) : null;

    await env.DATABASE_BINDING.prepare(
        `INSERT INTO emails (
            id, provider_message_id, source, listserv,
            from_email, from_name, reply_to, to_emails_json,
            subject, body_text, body_html, sent_at,
            category, tags_json, confidence, reasons_json,
            is_bump, thread_key, canonical_id,
            deadlines_json, dates_mentioned_json, contacts_json,
            film_title, logline, production_type,
            roles_json, shoot_dates_text, petition_location, deadline_at,
            grant_amount, grant_status, application_url, eligibility_text, grant_scope,
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
            ?23, ?24, ?25,
            ?26, ?27, ?28, ?29,
            ?30, ?31, ?32, ?33, ?34,
            ?35, ?36, ?37,
            ?38, ?39,
            ?40, ?41
        )`
    ).bind(
        id,
        m.providerMessageId,
        m.source,
        m.listserv,
        m.fromEmail,
        m.fromName,
        m.replyTo,
        toEmailsJson,
        m.subject,
        m.bodyText || "",
        m.bodyHtml ?? null,
        m.sentAt,
        category,
        JSON.stringify(tags),
        confidence,
        JSON.stringify(reasons),
        isBump ? 1 : 0,
        threadKey || null,
        null, // canonical_id (resolved on read for bump chains)
        deadlines.length ? JSON.stringify(deadlines) : null,
        deadlines.length ? JSON.stringify(deadlines) : null,
        contacts.length ? JSON.stringify(contacts) : null,
        film_title,
        logline,
        production_type,
        roles_mentioned ? JSON.stringify(roles_mentioned) : null,
        shoot_dates_text,
        petition_location,
        deadline_at,
        grant_amount,
        grant_status,
        application_url,
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

    // ── Upsert opportunities for grants ──────────────────────────────────

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

/* =============================================================================
   Helpers (worker-only — not shared with the test harness)
============================================================================= */

function nowSec() {
    return Math.floor(Date.now() / 1000);
}

function jsonResponse(data, init) {
    return new Response(JSON.stringify(data, null, 2), {
        headers: { "content-type": "application/json; charset=utf-8" },
        ...(init || {}),
    });
}

function badRequest(msg) {
    return jsonResponse({ ok: false, error: msg }, { status: 400 });
}

function unauthorized() {
    return jsonResponse({ ok: false, error: "unauthorized" }, { status: 401 });
}

function authOk(req, env) {
    const got = req.headers.get("x-webhook-secret") ?? req.headers.get("X-Webhook-Secret");
    return Boolean(got && env.WEBHOOK_SECRET && got === env.WEBHOOK_SECRET);
}

function pick(row, keys) {
    for (const k of keys) {
        const v = row[k];
        if (typeof v === "string" && v.trim() !== "") return v;
    }
    return null;
}

function parseSentAtToEpochSeconds(v) {
    if (!v) return nowSec();
    const trimmed = String(v).trim();
    if (/^\d+$/.test(trimmed)) return Number(trimmed);
    const ms = Date.parse(trimmed);
    return Number.isNaN(ms) ? nowSec() : Math.floor(ms / 1000);
}

function normalizeSubject(subject) {
    return String(subject ?? "").replace(/\s+/g, " ").trim();
}

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

async function resolveCanonicalForBump(env, threadKey, sentAt) {
    const row = await env.DATABASE_BINDING.prepare(
        `SELECT id, category, tags_json, confidence
         FROM emails
         WHERE thread_key = ?1
           AND sent_at >= ?2
           AND category != 'DO_NOT_CARE'
         ORDER BY sent_at DESC
         LIMIT 1`
    ).bind(threadKey, sentAt - 60 * 24 * 60 * 60).first();

    if (!row) return { canonicalId: null, canonicalCategory: null, canonicalTags: null, canonicalConfidence: null };

    let tags = null;
    try { tags = JSON.parse(row.tags_json); } catch { tags = null; }

    return {
        canonicalId: String(row.id),
        canonicalCategory: row.category,
        canonicalTags: tags,
        canonicalConfidence: typeof row.confidence === "number" ? row.confidence : null,
    };
}

async function sha256Hex(message) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(message));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
