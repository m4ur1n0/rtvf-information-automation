/* eslint-disable import/no-anonymous-default-export */
import {
    htmlToPlainText,
    parseCsv,
    parseISOToEpochSeconds,
} from "./classify.js";
import {
    appendSearchWhereClauses,
    authOk,
    badRequest,
    buildSearchSnippetSelect,
    corsHeaders,
    fetchEmailEngineAttachmentsForMessage,
    jsonResponse,
    listProjectedEmails,
    logApiRequest,
    normalizeContentId,
    normalizeSearchTerms,
    nowSec,
    parseSentAtToEpochSeconds,
    pick,
    resolveEmailEngineAccessToken,
    resolveEmailEngineBaseUrl,
    rewriteInlineCidSources,
    rewriteInlineCidSourcesForRows,
    unauthorized,
} from "./worker-helpers.js";
import {
    ingestOneMessage,
    normalizeBodyForIngest,
} from "./worker-ingest.js";

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

        const inlineImageMatch = req.method === "GET"
            ? url.pathname.match(/^\/api\/email\/([^/]+)\/inline\/(.+)$/)
            : null;
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
                headers: { Authorization: `Bearer ${accessToken}` },
            });

            if (!upstream.ok) {
                return jsonResponse({
                    ok: false,
                    error: `EmailEngine attachment fetch failed (${upstream.status})`,
                }, { status: 502 });
            }

            const headers = {
                ...corsHeaders(),
                "cache-control": "public, max-age=3600, stale-while-revalidate=86400",
                "content-type": upstream.headers.get("content-type") ?? row.content_type ?? "application/octet-stream",
            };
            return new Response(upstream.body, {
                status: 200,
                headers,
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
                    (
                        SELECT COUNT(1)
                        FROM emails eb
                        WHERE eb.thread_key = e.thread_key
                          AND COALESCE(eb.is_bump, 0) = 1
                    ) AS bump_count,
                    NULL AS search_snippets,
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

        if (req.method === "GET" && url.pathname === "/api/thread") {
            const threadKey = url.searchParams.get("thread_key");
            if (!threadKey) return badRequest("missing thread_key");

            const limit = Math.min(Number(url.searchParams.get("limit") ?? "200") || 200, 500);
            const rowsResult = await env.DATABASE_BINDING.prepare(
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
                    (
                        SELECT COUNT(1)
                        FROM emails eb
                        WHERE eb.thread_key = e.thread_key
                          AND COALESCE(eb.is_bump, 0) = 1
                    ) AS bump_count,
                    NULL AS search_snippets,
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
                WHERE e.thread_key = ?1
                ORDER BY e.sent_at ASC
                LIMIT ?2`
            ).bind(threadKey, limit).all();

            const rows = rewriteInlineCidSourcesForRows(rowsResult.results, url.origin);
            return jsonResponse({ ok: true, rows, limit, offset: 0 });
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
                origin: url.origin,
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
                origin: url.origin,
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
                origin: url.origin,
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
            const groupBumps = url.searchParams.get("groupBumps") !== "false";
            const since = url.searchParams.get("since");
            const until = url.searchParams.get("until");
            const searchTerms = normalizeSearchTerms(q);

            const where = [];
            const args = [];

            if (!includeDoNotCare) where.push(`e.category != 'DO_NOT_CARE'`);
            if (category) { where.push(`e.category = ?`); args.push(category); }
            if (since) { where.push(`e.sent_at >= ?`); args.push(Number(since)); }
            if (until) { where.push(`e.sent_at <= ?`); args.push(Number(until)); }
            if (groupBumps) where.push(`COALESCE(e.is_bump, 0) = 0`);
            if (searchTerms.length > 0) {
                appendSearchWhereClauses(where, args, searchTerms, "e", {
                    includeThreadMatches: groupBumps,
                    threadAlias: "e",
                    nestedAlias: "es",
                });
            }
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
            const searchSnippetSelect = buildSearchSnippetSelect("e", searchTerms);

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
                    (
                        SELECT COUNT(1)
                        FROM emails eb
                        WHERE eb.thread_key = e.thread_key
                          AND COALESCE(eb.is_bump, 0) = 1
                    ) AS bump_count,
                    ${searchSnippetSelect},
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
                source: "emails",
            });
            return jsonResponse({ ok: true, rows, limit, offset });
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
                    attachments,
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
                            attachments: [],
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
                    total: dataRows.length,
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
    },
};
