export function nowSec() {
    return Math.floor(Date.now() / 1000);
}

export function corsHeaders() {
    return {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET,POST,OPTIONS",
        "access-control-allow-headers": "content-type,x-webhook-secret,X-Webhook-Secret",
    };
}

export function jsonResponse(data, init) {
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

export function badRequest(msg) {
    return jsonResponse({ ok: false, error: msg }, { status: 400 });
}

export function unauthorized() {
    return jsonResponse({ ok: false, error: "unauthorized" }, { status: 401 });
}

export function authOk(req, env) {
    const got = req.headers.get("x-webhook-secret") ?? req.headers.get("X-Webhook-Secret");
    return Boolean(got && env.WEBHOOK_SECRET && got === env.WEBHOOK_SECRET);
}

export function pick(row, keys) {
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

export function normalizeEmailAddress(value) {
    const parsed = splitMailbox(value);
    if (parsed.email) return parsed.email;
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) ? trimmed : null;
}

export function normalizeSenderFields(fromEmailRaw, fromNameRaw) {
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

export function parseSentAtToEpochSeconds(v) {
    if (!v) return nowSec();
    const trimmed = String(v).trim();
    if (/^\d+$/.test(trimmed)) return Number(trimmed);
    const ms = Date.parse(trimmed);
    return Number.isNaN(ms) ? nowSec() : Math.floor(ms / 1000);
}

export function parsePositiveInt(v) {
    if (v == null) return undefined;
    const n = Number.parseInt(String(v), 10);
    if (!Number.isFinite(n) || n <= 0) return undefined;
    return n;
}

export function normalizeContentId(value) {
    if (typeof value !== "string") return null;
    let out = value.trim();
    if (!out) return null;
    out = out.replace(/^cid:/i, "").trim();
    out = out.replace(/^<+/, "").replace(/>+$/, "").trim();
    if (!out) return null;
    return out.toLowerCase();
}

function makeInlineImageUrl(origin, emailId, cid) {
    return `${origin}/api/email/${encodeURIComponent(String(emailId))}/inline/${encodeURIComponent(cid)}`;
}

export function rewriteInlineCidSources(html, emailId, origin) {
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

export function rewriteInlineCidSourcesForRows(rows, origin) {
    if (!Array.isArray(rows)) return [];
    return rows.map((row) => {
        if (!row || typeof row !== "object") return row;
        if (!row.body_html || !row.id) return row;
        return {
            ...row,
            body_html: rewriteInlineCidSources(row.body_html, row.id, origin),
        };
    });
}

export function resolveEmailEngineBaseUrl(env) {
    const raw = String(
        env.EMAILENGINE_API_BASE_URL ??
        env.EMAILENGINE_BASE_URL ??
        env.EMAILENGINE_URL ??
        ""
    ).trim();
    if (!raw) return null;
    return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

export function resolveEmailEngineAccessToken(env) {
    const token = String(
        env.EMAILENGINE_ACCESS_TOKEN ??
        env.EMAILENGINE_API_TOKEN ??
        env.EMAILENGINE_TOKEN ??
        ""
    ).trim();
    return token || null;
}

export async function fetchEmailEngineAttachmentsForMessage(env, account, messageId) {
    const baseUrl = resolveEmailEngineBaseUrl(env);
    const accessToken = resolveEmailEngineAccessToken(env);
    if (!baseUrl || !accessToken) return [];

    const normalizedAccount = String(account ?? "").trim();
    const normalizedMessageId = String(messageId ?? "").trim();
    if (!normalizedAccount || !normalizedMessageId) return [];

    const endpoint = `${baseUrl}/v1/account/${encodeURIComponent(normalizedAccount)}/message/${encodeURIComponent(normalizedMessageId)}`;
    try {
        const response = await fetch(endpoint, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!response.ok) return [];
        const payload = await response.json();
        return Array.isArray(payload?.attachments) ? payload.attachments : [];
    } catch {
        return [];
    }
}

export function shouldLogApiRequests(env) {
    return String(env.API_DEBUG_LOGS ?? "").toLowerCase() === "true";
}

export function logApiRequest(env, payload) {
    if (!shouldLogApiRequests(env)) return;
    console.log(`[api] ${JSON.stringify(payload)}`);
}

export function normalizeSearchTerms(rawQuery) {
    if (typeof rawQuery !== "string") return [];
    const normalized = rawQuery
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .map((token) => token.trim())
        .filter(Boolean);
    return Array.from(new Set(normalized));
}

function buildSearchMatchClause(args, searchTerms, alias) {
    const subjectExpr = `lower(COALESCE(${alias}.subject, ''))`;
    const bodyExpr = `lower(COALESCE(${alias}.body_text, ''))`;
    const subjectClauses = [];
    const bodyClauses = [];

    for (const term of searchTerms) {
        subjectClauses.push(`${subjectExpr} LIKE ?`);
        args.push(`%${term}%`);
    }
    for (const term of searchTerms) {
        bodyClauses.push(`${bodyExpr} LIKE ?`);
        args.push(`%${term}%`);
    }

    return `((${subjectClauses.join(" AND ")}) OR (${bodyClauses.join(" AND ")}))`;
}

export function appendSearchWhereClauses(where, args, searchTerms, alias, options = {}) {
    if (!Array.isArray(searchTerms) || searchTerms.length === 0) return;
    const selfMatch = buildSearchMatchClause(args, searchTerms, alias);

    if (options.includeThreadMatches) {
        const threadAlias = options.threadAlias ?? alias;
        const nestedAlias = options.nestedAlias ?? "es";
        const nestedMatch = buildSearchMatchClause(args, searchTerms, nestedAlias);
        where.push(
            `(${selfMatch} OR EXISTS (
                SELECT 1
                FROM emails ${nestedAlias}
                WHERE ${nestedAlias}.thread_key = ${threadAlias}.thread_key
                  AND ${nestedMatch}
            ))`
        );
        return;
    }

    where.push(selfMatch);
}

function sqlQuote(value) {
    return `'${String(value ?? "").replace(/'/g, "''")}'`;
}

export function buildSearchSnippetSelect(alias, searchTerms) {
    if (!Array.isArray(searchTerms) || searchTerms.length === 0) {
        return "NULL AS search_snippets";
    }

    const firstTerm = sqlQuote(searchTerms[0]);
    const haystack = `lower(COALESCE(${alias}.subject, '') || ' ' || COALESCE(${alias}.body_text, ''))`;
    const sourceText = `COALESCE(${alias}.subject, '') || char(10) || COALESCE(${alias}.body_text, '')`;

    return `CASE
        WHEN instr(${haystack}, ${firstTerm}) > 0 THEN substr(
            ${sourceText},
            max(1, instr(${haystack}, ${firstTerm}) - 50),
            100
        )
        ELSE NULL
    END AS search_snippets`;
}

export async function listProjectedEmails(env, url, opts) {
    const startedAt = Date.now();
    const summary = opts.summary === true;
    const limit = Math.min(Number(url.searchParams.get("limit") ?? "50") || 50, 200);
    const offset = Math.max(Number(url.searchParams.get("offset") ?? "0") || 0, 0);
    const q = url.searchParams.get("q");
    const groupBumps = url.searchParams.get("groupBumps") !== "false";
    const sinceRaw = url.searchParams.get("since");
    const untilRaw = url.searchParams.get("until");
    const since = sinceRaw == null ? null : Number(sinceRaw);
    const until = untilRaw == null ? null : Number(untilRaw);
    const searchTerms = normalizeSearchTerms(q);

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
    if (groupBumps) {
        where.push("COALESCE(e.is_bump, 0) = 0");
    }
    if (searchTerms.length > 0) {
        appendSearchWhereClauses(where, args, searchTerms, "e", {
            includeThreadMatches: groupBumps,
            threadAlias: "e",
            nestedAlias: "es",
        });
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
    const searchSnippetSelect = buildSearchSnippetSelect("e", searchTerms);

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
            (
                SELECT COUNT(1)
                FROM emails eb
                WHERE eb.thread_key = e.thread_key
                  AND COALESCE(eb.is_bump, 0) = 1
            ) AS bump_count,
            ${searchSnippetSelect},
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
        source: "projection",
    });
    return { ok: true, rows, limit, offset };
}
