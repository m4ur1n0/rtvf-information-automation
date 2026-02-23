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

        if (req.method === "OPTIONS") {
            return new Response(null, {
                status: 204,
                headers: corsHeaders(),
            });
        }

        // Health
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
                source: "messages_count",
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
                resources: Number(row?.resources ?? 0),
            };
            const all = counts.all_messages;

            logApiRequest(env, {
                path: url.pathname,
                query: Object.fromEntries(url.searchParams.entries()),
                counts: { ...counts, all },
                duration_ms: Date.now() - startedAt,
                source: "counts",
            });
            return jsonResponse({ ok: true, counts: { ...counts, all } });
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
                    e.grant_amount, e.grant_status, e.application_url, e.eligibility_text, e.grant_scope,
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
            return jsonResponse({ ok: true, rows: [row] });
        }

        if (req.method === "GET" && url.pathname === "/api/grants") {
            const summary = url.searchParams.get("summary") === "true";
            const rows = await listProjectedEmails(env, url, {
                category: "GRANT",
                table: "grant_posts",
                alias: "gp",
                summary,
                projection: {
                    deadline_at: "gp.deadline_at",
                    grant_amount: "gp.grant_amount",
                    grant_status: "gp.grant_status",
                    application_url: "gp.application_url",
                    eligibility_text: "gp.eligibility_text",
                    grant_scope: "gp.grant_scope",
                },
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
                projectionWhere,
                projection: {
                    film_title: "pp.film_title",
                    logline: "pp.logline",
                    production_type: "pp.production_type",
                    director_name: "pp.director_name",
                    shoot_dates_text: "pp.shoot_dates_text",
                    petition_location: "pp.petition_location",
                    deadline_at: "pp.deadline_at",
                },
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
                projection: {
                    deadline_at: "ep.deadline_at",
                    event_date_text: "ep.event_date_text",
                    event_location: "ep.event_location",
                    rsvp_url: "ep.rsvp_url",
                },
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
            });
            return jsonResponse(rows);
        }

        // ─── GET /api/emails ──────────────────────────────────────────────────────
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
            if (category) { where.push(`e.category = ?`); args.push(category); }
            if (since) { where.push(`e.sent_at >= ?`); args.push(Number(since)); }
            if (until) { where.push(`e.sent_at <= ?`); args.push(Number(until)); }
            if (q) { where.push(`(e.subject LIKE ? OR e.body_text LIKE ?)`); args.push(`%${q}%`, `%${q}%`); }
            if (tag) {
                where.push(`EXISTS (SELECT 1 FROM email_tags et WHERE et.email_id = e.id AND et.tag = ?)`);
                args.push(tag);
            }

            const bodyTextSelect = summary ? `'' AS body_text` : `e.body_text`;
            const bodyHtmlSelect = summary ? `NULL AS body_html` : `e.body_html`;
            const reasonsSelect = summary
                ? `'[]' AS reasons_json`
                : `COALESCE(
                        (SELECT json_group_array(reason) FROM (SELECT reason FROM email_reasons WHERE email_id = e.id ORDER BY position)),
                        e.reasons_json,
                        '[]'
                    ) AS reasons_json`;
            const rolesSelect = summary
                ? `NULL AS roles_json`
                : `COALESCE(
                        (SELECT json_group_array(role) FROM (SELECT role FROM email_roles WHERE email_id = e.id ORDER BY position)),
                        e.roles_json
                    ) AS roles_json`;
            const deadlinesSelect = summary
                ? `NULL AS deadlines_json`
                : `COALESCE(
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
            const contactsSelect = summary
                ? `NULL AS contacts_json`
                : `COALESCE(
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
                    e.grant_amount, e.grant_status, e.application_url, e.eligibility_text, e.grant_scope,
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
            logApiRequest(env, {
                path: url.pathname,
                query: Object.fromEntries(url.searchParams.entries()),
                rows: Array.isArray(res.results) ? res.results.length : 0,
                duration_ms: Date.now() - startedAt,
                source: "emails",
            });
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
                const bodyText = normalizeBodyForIngest(subject, bodyTextRaw);
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
                        const bodyText = normalizeBodyForIngest(subject, bodyTextRaw);
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
    },
};

/* =============================================================================
   Core ingest — classifies and stores one message
============================================================================= */

async function ingestOneMessage(env, m) {
    const threadKey = makeThreadKey(m.subject);
    const createdAt = nowSec();
    const normalizedSender = normalizeSenderFields(m.fromEmail, m.fromName);
    const normalizedReplyTo = normalizeEmailAddress(m.replyTo);

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
        llmResult = await classifyWithLLM(
            env.CEREBRAS_API_KEY,
            m.subject,
            m.bodyText,
            {
                model: env.CEREBRAS_MODEL,
                maxAttempts: parsePositiveInt(env.CEREBRAS_MAX_ATTEMPTS),
            }
        );
        classifierVersion = "v4_cerebras";
    } catch (llmErr) {
        console.error("[ingest] LLM classification failed, falling back to regex:", llmErr?.message ?? llmErr);
        classifierVersion = "v4_cerebras_fallback";
    }

    // ── Merge into canonical result ──────────────────────────────────────

    let category, tags, confidence, reasons;
    let film_title, logline, production_type, director_name, roles_mentioned;
    let shoot_dates_text, petition_location;
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
        director_name = llmResult.director_name ?? null;
        roles_mentioned = llmResult.roles_mentioned ?? null;
        shoot_dates_text = llmResult.shoot_dates_text ?? null;
        petition_location = llmResult.petition_location ?? null;
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
        director_name = null;
        roles_mentioned = null;
        shoot_dates_text = null;
        petition_location = null;
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

    // If the model misses roles, infer them from subject/body text so role filters still work.
    roles_mentioned = normalizeRoles(roles_mentioned);
    if (!roles_mentioned || roles_mentioned.length === 0) {
        roles_mentioned = inferRolesFromText(m.subject, m.bodyText, tags);
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

    const combined = `${m.subject}\n${m.bodyText}`;
    let deadline_at = resolveDeadlineAt(deadline_iso, deadline_text, combined);
    if (!deadline_at) {
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
            ?23, ?24, ?25, ?26,
            ?27, ?28, ?29, ?30,
            ?31, ?32, ?33, ?34, ?35,
            ?36, ?37, ?38,
            ?39, ?40,
            ?41, ?42
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
        null, // canonical_id (resolved on read for bump chains)
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
        toEmails,
    });

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
        eligibilityText: eligibility_text,
        grantScope: grant_scope,
        eventDateText: event_date_text,
        eventLocation: event_location,
        rsvpUrl: rsvp_url,
        createdAt,
    });

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

function corsHeaders() {
    return {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET,POST,OPTIONS",
        "access-control-allow-headers": "content-type,x-webhook-secret,X-Webhook-Secret",
    };
}

function jsonResponse(data, init) {
    const headers = {
        "content-type": "application/json; charset=utf-8",
        ...corsHeaders(),
        ...((init && init.headers) ? init.headers : {}),
    };
    return new Response(JSON.stringify(data, null, 2), {
        headers,
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

function normalizeEmailAddress(value) {
    const parsed = splitMailbox(value);
    if (parsed.email) return parsed.email;
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) ? trimmed : null;
}

function normalizeSenderFields(fromEmailRaw, fromNameRaw) {
    const parsedEmail = splitMailbox(fromEmailRaw);
    const parsedName = splitMailbox(fromNameRaw);

    const fromEmail = parsedEmail.email || parsedName.email || null;

    const explicitName =
        typeof fromNameRaw === "string" && fromNameRaw.trim() !== "" && !parsedName.email
            ? fromNameRaw.trim()
            : null;
    const fromName = explicitName || parsedEmail.name || parsedName.name || null;

    return { fromEmail, fromName };
}

function parseSentAtToEpochSeconds(v) {
    if (!v) return nowSec();
    const trimmed = String(v).trim();
    if (/^\d+$/.test(trimmed)) return Number(trimmed);
    const ms = Date.parse(trimmed);
    return Number.isNaN(ms) ? nowSec() : Math.floor(ms / 1000);
}

function normalizeBodyForIngest(subject, bodyTextRaw) {
    const raw = String(bodyTextRaw ?? "");
    const stripped = stripQuotedEmail(raw);
    if (!shouldPreserveQuotedThreadContent(subject, raw, stripped)) {
        return stripped;
    }

    // Keep thread content for bump/reply reposts while still removing listserv footer noise.
    return raw
        .replace(/#{4,}\s*To unsubscribe from[\s\S]*$/i, "")
        .trim()
        .slice(0, 8000);
}

function shouldPreserveQuotedThreadContent(subject, rawBody, strippedBody) {
    const s = String(subject ?? "");
    const b = String(rawBody ?? "");
    const sLower = s.toLowerCase();
    const bLower = b.toLowerCase();

    const isReplyOrForward = /^\s*(re|fw|fwd)\s*:/i.test(s);
    const hasBumpSignal =
        /\bbump(?:ing)?\b|repost(?:ing)?|signal boost/i.test(sLower) ||
        /^\s*(bump|bumping|reposting|signal boost)\b/m.test(bLower);
    const hasQuotedHeader =
        /\non .* wrote:\n/i.test(b) ||
        /\nfrom:\s.*\nsent:\s.*\n(?:to:\s.*\n)?subject:\s.*\n/i.test(b) ||
        /\n-----original message-----\n/i.test(b);

    const rawLen = b.trim().length;
    const strippedLen = String(strippedBody ?? "").trim().length;
    const mostlyStripped = rawLen > 0 && strippedLen / rawLen < 0.35;

    return (isReplyOrForward || hasBumpSignal) &&
        hasQuotedHeader &&
        (strippedLen < 600 || mostlyStripped);
}

function parseTimeFromText(text) {
    const t = String(text ?? "");
    if (!t) return null;

    const ampm = t.match(/\b(1[0-2]|0?[1-9])(?::([0-5]\d))?\s*([aApP])\.?[mM]\.?\b/);
    if (ampm) {
        const hour12 = Number.parseInt(ampm[1], 10);
        const minute = Number.parseInt(ampm[2] ?? "0", 10);
        if (Number.isFinite(hour12) && Number.isFinite(minute)) {
            const isPm = ampm[3].toLowerCase() === "p";
            const hour24 = isPm ? ((hour12 % 12) + 12) : (hour12 % 12);
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

    const hasTimeNoZone =
        /^\d{4}-\d{2}-\d{2}[tT]\d{2}:\d{2}/.test(iso) &&
        !/(Z|[+-]\d{2}:\d{2})$/i.test(iso);
    if (hasTimeNoZone) {
        return parseISOToEpochSeconds(`${iso}Z`);
    }

    return parseISOToEpochSeconds(iso);
}

function parsePositiveInt(v) {
    if (v == null) return undefined;
    const n = Number.parseInt(String(v), 10);
    if (!Number.isFinite(n) || n <= 0) return undefined;
    return n;
}

function shouldLogApiRequests(env) {
    return String(env.API_DEBUG_LOGS ?? "").toLowerCase() === "true";
}

function logApiRequest(env, payload) {
    if (!shouldLogApiRequests(env)) return;
    console.log(`[api] ${JSON.stringify(payload)}`);
}

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
    const col = (name, fallback) => `${projection[name] ?? fallback} AS ${name}`;
    const bodyTextSelect = summary ? `'' AS body_text` : `e.body_text`;
    const bodyHtmlSelect = summary ? `NULL AS body_html` : `e.body_html`;
    const reasonsSelect = summary
        ? `'[]' AS reasons_json`
        : `COALESCE(
                (SELECT json_group_array(reason) FROM (SELECT reason FROM email_reasons WHERE email_id = e.id ORDER BY position)),
                e.reasons_json,
                '[]'
            ) AS reasons_json`;
    const rolesSelect = summary
        ? `NULL AS roles_json`
        : `COALESCE(
                (SELECT json_group_array(role) FROM (SELECT role FROM email_roles WHERE email_id = e.id ORDER BY position)),
                e.roles_json
            ) AS roles_json`;
    const deadlinesSelect = summary
        ? `NULL AS deadlines_json`
        : `COALESCE(
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
    const contactsSelect = summary
        ? `NULL AS contacts_json`
        : `COALESCE(
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
    logApiRequest(env, {
        path: url.pathname,
        query: Object.fromEntries(url.searchParams.entries()),
        category: opts.category,
        table: opts.table,
        rows: Array.isArray(res.results) ? res.results.length : 0,
        duration_ms: Date.now() - startedAt,
        source: "projection",
    });
    return { ok: true, rows: res.results, limit, offset };
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
                petition_location, is_casting, is_bump, deadline_at,
                classifier_confidence, created_at, updated_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?13)
            ON CONFLICT(email_id) DO UPDATE SET
                title=excluded.title,
                film_title=excluded.film_title,
                production_type=excluded.production_type,
                logline=excluded.logline,
                director_name=excluded.director_name,
                shoot_dates_text=excluded.shoot_dates_text,
                petition_location=excluded.petition_location,
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

async function clearCategoryProjection(env, emailId) {
    await env.DATABASE_BINDING.prepare(`DELETE FROM grant_posts WHERE email_id = ?1`).bind(emailId).run();
    await env.DATABASE_BINDING.prepare(`DELETE FROM petition_posts WHERE email_id = ?1`).bind(emailId).run();
    await env.DATABASE_BINDING.prepare(`DELETE FROM event_posts WHERE email_id = ?1`).bind(emailId).run();
    await env.DATABASE_BINDING.prepare(`DELETE FROM resource_posts WHERE email_id = ?1`).bind(emailId).run();
    await env.DATABASE_BINDING.prepare(`DELETE FROM admin_posts WHERE email_id = ?1`).bind(emailId).run();
}

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


function normalizeRoles(values) {
    const roles = uniqueStrings(values);
    return roles.length > 0 ? roles : null;
}

function inferRolesFromText(subject, bodyText, tags) {
    const text = `${String(subject ?? "")}
${String(bodyText ?? "")}`;
    const lower = text.toLowerCase();
    const out = [];

    const addIf = (label, re) => {
        if (re.test(lower)) out.push(label);
    };

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

function uniqueStrings(values) {
    if (!Array.isArray(values)) return [];
    const out = [];
    const seen = new Set();
    for (const raw of values) {
        if (typeof raw !== "string") continue;
        const value = raw.trim();
        if (!value || seen.has(value)) continue;
        seen.add(value);
        out.push(value);
    }
    return out;
}

function uniqueContacts(values) {
    if (!Array.isArray(values)) return [];
    const out = [];
    const seen = new Set();
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

function uniqueDateCandidates(values) {
    if (!Array.isArray(values)) return [];
    const out = [];
    const seen = new Set();
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
