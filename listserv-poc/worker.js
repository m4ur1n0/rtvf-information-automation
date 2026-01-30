/* eslint-disable import/no-anonymous-default-export */
export default {
    async fetch(req, env) {
        const url = new URL(req.url);

        // Health
        if (req.method === "GET" && url.pathname === "/health") {
            return jsonResponse({ ok: true });
        }

        if (req.method === "GET" && url.pathname === "/api/emails") {
            // Optional: block DO_NOT_CARE by default
            const includeDoNotCare = url.searchParams.get("includeDoNotCare") === "true";
            const limit = Math.min(Number(url.searchParams.get("limit") ?? "50") || 50, 200);
            const offset = Math.max(Number(url.searchParams.get("offset") ?? "0") || 0, 0);

            const category = url.searchParams.get("category"); // e.g. GRANT
            const tag = url.searchParams.get("tag"); // e.g. BUMP
            const q = url.searchParams.get("q"); // simple search
            const since = url.searchParams.get("since"); // epoch seconds
            const until = url.searchParams.get("until"); // epoch seconds

            const where = [];
            const args = [];

            if (!includeDoNotCare) where.push(`category != 'DO_NOT_CARE'`);
            if (category) { where.push(`category = ?`); args.push(category); }
            if (since) { where.push(`sent_at >= ?`); args.push(Number(since)); }
            if (until) { where.push(`sent_at <= ?`); args.push(Number(until)); }
            if (q) { where.push(`(subject LIKE ? OR body_text LIKE ?)`); args.push(`%${q}%`, `%${q}%`); }
            if (tag) { where.push(`tags_json LIKE ?`); args.push(`%"${tag}"%`); } // simple contains

            const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

            const stmt = env.DATABASE_BINDING
                .prepare(
                    `SELECT
                        id, subject, body_text, from_email, from_name, sent_at,
                        category, tags_json, confidence, reasons_json, is_bump, thread_key, canonical_id
                    FROM emails
                    ${whereSql}
                    ORDER BY sent_at DESC
                    LIMIT ? OFFSET ?`
                );

            const res = await stmt.bind(...args, limit, offset).all();

            return jsonResponse({ ok: true, rows: res.results, limit, offset });
        }


        // TEMP: CSV ingest via webhook endpoint
        if (req.method === "POST" && url.pathname === "/webhook/email") {
            if (!authOk(req, env)) return unauthorized();

            const ct = (req.headers.get("content-type") || "").toLowerCase();
            if (!ct.includes("text/csv") && !ct.includes("application/octet-stream")) {
                return badRequest("temporary csv mode: expected content-type text/csv");
            }

            const csvText = await req.text();
            const rows = parseCsv(csvText);
            if (rows.length < 2) return badRequest("csv needs header + at least 1 row");

            const header = rows[0].map((h) => (h ?? "").trim());
            const dataRows = rows.slice(1);

            let inserted = 0;
            let deduped = 0;
            let failed = 0;

            const FIVE_MONTHS_SEC = 5 * 30 * 24 * 60 * 60; // approx, good enough for POC
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

                    if (sentAt < oldestAllowed) {
                        skippedOld++;
                        continue; // ignore completely
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
                    });

                    if (result.deduped) deduped++;
                    else inserted++;
                } catch (e) {
                    failed++;
                }
            }

            return jsonResponse({
                ok: true,
                mode: "csv_via_webhook",
                inserted,
                deduped,
                failed,
                skippedOld,
                total: dataRows.length,
            });
        }

        return jsonResponse({ ok: false, error: "not found" }, { status: 404 });
    },

    async scheduled(_event, env) {
        const n = nowSec();
        const cutoff = n - 150 * 24 * 60 * 60;

        await env.DATABASE_BINDING.prepare(`DELETE FROM emails WHERE sent_at < ?1`).bind(cutoff).run();
        await env.DATABASE_BINDING.prepare(`DELETE FROM opportunities WHERE status = 'closed'`).run();
        await env.DATABASE_BINDING.prepare(`DELETE FROM opportunities WHERE deadline_at IS NOT NULL AND deadline_at < ?1`)
            .bind(n)
            .run();
        await env.DATABASE_BINDING.prepare(`DELETE FROM opportunities WHERE email_id NOT IN (SELECT id FROM emails)`).run();
    },
};

/* =========================
   Helpers (JS)
========================= */

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

function stripQuotedEmail(text) {
    const t = String(text ?? "");

    // Common reply separators - expanded to catch more patterns
    const cutPatterns = [
        /\nOn .* wrote:\n/i,                                    // Gmail: "On Mon, Jan 26, 2026 at 1:51 PM Name <email> wrote:"
        /\n&gt;.*wrote:\n/i,                                    // HTML-encoded Gmail
        /\nFrom: .*?\nSent: .*?\nTo: .*?\nSubject: .*?\n/i,   // Outlook
        /\n-----Original Message-----\n/i,                      // Outlook
        /\n_{2,}\n/i,                                           // Horizontal lines "____"
        /\n-{3,}\n/i,                                           // Horizontal lines "---"
        /\n> .*\n(> .*\n)+/,                                   // Quoted lines starting with >
        /\n&gt; .*\n(&gt; .*\n)+/,                            // HTML-encoded quoted lines
    ];

    let cutAt = t.length;
    for (const re of cutPatterns) {
        const m = re.exec(t);
        if (m && typeof m.index === "number") cutAt = Math.min(cutAt, m.index);
    }

    // Keep only the "new content" top part, cap to avoid giant bodies
    return t.slice(0, cutAt).trim().slice(0, 8000);
}

/* ===== CSV ===== */
function parseCsv(csvText) {
    const rows = [];
    let row = [];
    let field = "";
    let inQuotes = false;

    for (let i = 0; i < csvText.length; i++) {
        const c = csvText[i];
        const next = csvText[i + 1];

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

/* ===== Subject normalization / bump ===== */
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
    s = s.replace(/\s+/g, " ").trim();
    return s;
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

/* ===== Classifier - Refactored for subject-first accuracy ===== */

function hasAny(text, keywords) {
    return keywords.some((k) => text.includes(k));
}
function countHits(text, keywords) {
    let n = 0;
    for (const k of keywords) if (text.includes(k)) n++;
    return n;
}
function parseISOToEpochSeconds(iso) {
    if (!iso) return null;
    const ms = Date.parse(iso);
    if (Number.isNaN(ms)) return null;
    return Math.floor(ms / 1000);
}

function extractDateCandidates(text) {
    const out = [];

    const isoRe = /\b(20\d{2}-\d{2}-\d{2})(?:[tT ](\d{2}:\d{2}(?::\d{2})?)\s*(Z|[+-]\d{2}:\d{2})?)?\b/g;
    for (const m of text.matchAll(isoRe)) {
        const date = m[1];
        const time = m[2];
        const tz = m[3];
        const iso = time ? `${date}T${time}${tz ?? "Z"}` : `${date}T00:00:00Z`;
        out.push({ text: m[0], iso });
    }

    const monthRe =
        /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,)?\s+(20\d{2})\b/gi;

    const months = {
        jan: "01", january: "01",
        feb: "02", february: "02",
        mar: "03", march: "03",
        apr: "04", april: "04",
        may: "05",
        jun: "06", june: "06",
        jul: "07", july: "07",
        aug: "08", august: "08",
        sep: "09", sept: "09", september: "09",
        oct: "10", october: "10",
        nov: "11", november: "11",
        dec: "12", december: "12",
    };

    for (const m of text.matchAll(monthRe)) {
        const mon = months[m[1].toLowerCase()] ?? null;
        if (!mon) continue;
        const day = m[2].padStart(2, "0");
        const year = m[3];
        const iso = `${year}-${mon}-${day}T23:59:59Z`;
        out.push({ text: m[0], iso });
    }

    return out;
}

function extractContacts(text) {
    const out = [];
    const emailRe = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
    for (const m of text.matchAll(emailRe)) out.push({ type: "email", value: m[0] });
    const urlRe = /\bhttps?:\/\/[^\s)]+/gi;
    for (const m of text.matchAll(urlRe)) out.push({ type: "url", value: m[0] });
    const phoneRe = /\b(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
    for (const m of text.matchAll(phoneRe)) out.push({ type: "phone", value: m[0] });
    return out;
}

function nullToEmpty(v) {
    return v ?? [];
}

function classify(subject, bodyText) {
    const subRaw = String(subject ?? "");
    const bodRaw = String(bodyText ?? "");

    const sub = subRaw.toLowerCase();
    const bod = bodRaw.toLowerCase();
    const combined = `${sub}\n${bod}`;

    const reasons = [];
    const tags = new Set();

    const deadlines = extractDateCandidates(combined);
    const datesMentioned = deadlines;
    const contacts = extractContacts(`${subRaw}\n${bodRaw}`);

    // ========== LAYER 1: Strong Subject Patterns (Fast Routes) ==========
    // Trust subject line as the clearest signal - route directly when confident

    // L1.1: DO_NOT_CARE - social/community/off-topic (subject-first)
    const doNotCareSubjectStrong = [
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
        "buy sell",
        "join us for",
        "good vibes",
    ];
    const explicitOffTopic = ["not film related", "off topic", "unrelated"];

    if (hasAny(sub, doNotCareSubjectStrong) || hasAny(combined, explicitOffTopic)) {
        reasons.push(`DO_NOT_CARE: subject contains social/off-topic signal`);
        return packResult("DO_NOT_CARE", tags, 0.9, reasons, deadlines, datesMentioned, contacts);
    }

    // L1.2: GRANT - strong grant-specific subject patterns
    const grantSubjectStrong = [
        "grant",
        "grants",
        "funding",
        "call for proposals",
        "submissions for",
        "submissions open",
        "grant deadline",
        "grant application",
        "applications are due",
        "apply by",
    ];

    if (hasAny(sub, grantSubjectStrong)) {
        const matched = grantSubjectStrong.find(k => sub.includes(k));
        reasons.push(`GRANT: subject contains strong grant signal: "${matched}"`);
        return finalize("GRANT", tags, reasons, combined, deadlines, datesMentioned, contacts);
    }

    // L1.3: CASTING CALLS - separate from general crew calls
    const castingSubjectStrong = [
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

    if (hasAny(sub, castingSubjectStrong)) {
        const matched = castingSubjectStrong.find(k => sub.includes(k));
        reasons.push(`CREW_CALL: subject contains casting signal: "${matched}"`);
        tags.add("CASTING_ROLES");
        if (sub.includes("extras")) tags.add("CASTING_EXTRAS");
        return finalize("CREW_CALL", tags, reasons, combined, deadlines, datesMentioned, contacts);
    }

    // L1.4: CREW_CALL - general crew recruitment (non-casting)
    const crewSubjectStrong = [
        "crew call",
        "crew heads",
        "seeking crew",
        "looking for crew",
        "hiring",
        "petitions",  // NU-specific term for crew recruitment
    ];

    if (hasAny(sub, crewSubjectStrong)) {
        const matched = crewSubjectStrong.find(k => sub.includes(k));
        reasons.push(`CREW_CALL: subject contains crew recruitment signal: "${matched}"`);
        // Double-check for casting spillover in subject
        if (hasAny(sub, ["casting", "audition", "extras"])) {
            tags.add("CASTING_ROLES");
            if (sub.includes("extras")) tags.add("CASTING_EXTRAS");
        }
        return finalize("CREW_CALL", tags, reasons, combined, deadlines, datesMentioned, contacts);
    }

    // L1.5: RESOURCE - sourcing/borrowing/equipment requests
    const resourceSubjectStrong = [
        "sourcing",
        "borrow",
        "does anyone have",
        "looking to borrow",
        "need a ",  // Note: space after to avoid "need actors"
        "need an ",
        "seeking costume designer",
        "seeking marketing director",
        "be a costume designer",
    ];

    if (hasAny(sub, resourceSubjectStrong)) {
        const matched = resourceSubjectStrong.find(k => sub.includes(k));
        reasons.push(`RESOURCE: subject contains resource request signal: "${matched}"`);

        // Add specific resource tags based on content
        if (hasAny(combined, ["props", "costume", "costumes", "wardrobe"])) tags.add("PROPS_COSTUMES");
        if (hasAny(combined, ["location"])) tags.add("LOCATION");
        if (hasAny(combined, ["camera", "lens", "tripod", "equipment"])) tags.add("EQUIPMENT");

        return finalize("RESOURCE", tags, reasons, combined, deadlines, datesMentioned, contacts);
    }

    // L1.6: EVENT - screenings, workshops, panels, info sessions
    const eventSubjectStrong = [
        "screening",
        "workshop",
        "panel",
        "info session",
        "infosession",
        "writer's circle",
        "writers circle",
        "masterclass",
        "q&a event",
    ];

    if (hasAny(sub, eventSubjectStrong)) {
        const matched = eventSubjectStrong.find(k => sub.includes(k));
        reasons.push(`EVENT: subject contains event signal: "${matched}"`);
        return finalize("EVENT", tags, reasons, combined, deadlines, datesMentioned, contacts);
    }

    // L1.7: ADMIN - official department/program communications
    const adminSubjectStrong = [
        "policy",
        "department",
        "program requirements",
        "official",
        "forms",
    ];

    if (hasAny(sub, adminSubjectStrong)) {
        const matched = adminSubjectStrong.find(k => sub.includes(k));
        reasons.push(`ADMIN: subject contains admin signal: "${matched}"`);
        return finalize("ADMIN", tags, reasons, combined, deadlines, datesMentioned, contacts);
    }

    // ========== LAYER 2: Weighted Scoring (Subject 5x Body) ==========
    // Subject is still heavily weighted; body provides supporting evidence

    const grantKw = ["grant", "funding", "apply", "application", "award", "call for proposals", "submissions"];
    const crewKw = ["looking for", "seeking", "hiring", "crew", "dp", "cinematographer", "sound", "editor", "gaffer", "grip", "producer", "pa", "production assistant"];
    const castingKw = ["casting", "extras", "audition", "actors", "self tape"];
    const resourceKw = ["borrow", "does anyone have", "sourcing", "equipment", "camera", "lens", "tripod", "location", "props", "costume", "wardrobe"];
    const eventKw = ["screening", "workshop", "panel", "info session", "meeting", "rsvp"];
    const adminKw = ["policy", "deadline reminder", "program", "requirements", "forms", "official"];
    const doNotCareBodyKw = ["game night", "watch party", "free food", "come hang", "speed dating", "good vibes"];

    // Subject weight = 5x, body weight = 1x
    const SUBJECT_WEIGHT = 5;

    const grantScore = SUBJECT_WEIGHT * countHits(sub, grantKw) + countHits(bod, grantKw);
    const crewScore = SUBJECT_WEIGHT * countHits(sub, crewKw) + countHits(bod, crewKw);
    const castingScore = SUBJECT_WEIGHT * countHits(sub, castingKw) + countHits(bod, castingKw);
    const resourceScore = SUBJECT_WEIGHT * countHits(sub, resourceKw) + countHits(bod, resourceKw);
    const eventScore = SUBJECT_WEIGHT * countHits(sub, eventKw) + countHits(bod, eventKw);
    const adminScore = SUBJECT_WEIGHT * countHits(sub, adminKw) + countHits(bod, adminKw);
    const doNotCareScore = SUBJECT_WEIGHT * countHits(sub, doNotCareBodyKw) + countHits(bod, doNotCareBodyKw);

    const maxScore = Math.max(grantScore, crewScore, castingScore, resourceScore, eventScore, adminScore, doNotCareScore);

    // L2 fallback: if nothing scored, go to OTHER
    if (maxScore === 0) {
        reasons.push("L2: no keyword matches → OTHER");
        return packResult("OTHER", tags, 0.35, reasons, deadlines, datesMentioned, contacts);
    }

    // Determine winner by score
    let category = null;
    let confidence = 0.70; // L2 has moderate confidence

    if (doNotCareScore === maxScore && doNotCareScore > 0) {
        category = "DO_NOT_CARE";
        reasons.push(`L2: DO_NOT_CARE scored highest (${doNotCareScore})`);
    } else if (grantScore === maxScore) {
        // GRANT guard: require at least 2 grant keywords OR 1 strong grant keyword
        const strongGrantInCombined = hasAny(combined, ["grant", "funding", "call for proposals", "submissions"]);
        if (grantScore >= 2 || strongGrantInCombined) {
            category = "GRANT";
            reasons.push(`L2: GRANT scored highest (${grantScore})`);
        } else {
            reasons.push(`L2: GRANT guard failed (score=${grantScore}, no strong signal) → OTHER`);
            category = "OTHER";
            confidence = 0.4;
        }
    } else if (castingScore === maxScore) {
        category = "CREW_CALL";
        tags.add("CASTING_ROLES");
        if (hasAny(combined, ["extras"])) tags.add("CASTING_EXTRAS");
        reasons.push(`L2: CASTING scored highest (${castingScore})`);
    } else if (crewScore === maxScore) {
        category = "CREW_CALL";
        // Check if it's actually casting-related
        if (hasAny(combined, ["casting", "audition", "extras"])) {
            tags.add("CASTING_ROLES");
            if (hasAny(combined, ["extras"])) tags.add("CASTING_EXTRAS");
        }
        reasons.push(`L2: CREW_CALL scored highest (${crewScore})`);
    } else if (resourceScore === maxScore) {
        category = "RESOURCE";
        reasons.push(`L2: RESOURCE scored highest (${resourceScore})`);
    } else if (eventScore === maxScore) {
        category = "EVENT";
        reasons.push(`L2: EVENT scored highest (${eventScore})`);
    } else if (adminScore === maxScore) {
        category = "ADMIN";
        reasons.push(`L2: ADMIN scored highest (${adminScore})`);
    }

    if (!category) {
        category = "OTHER";
        reasons.push("L2: fallback to OTHER");
    }


    return finalize(category, tags, reasons, combined, deadlines, datesMentioned, contacts, confidence);
}

/* ---- helpers used by classify ---- */

function packResult(category, tags, confidence, reasons, deadlines, datesMentioned, contacts) {
    return {
        category,
        tags: [...tags],
        confidence,
        reasons,
        deadlines: nullToEmpty(deadlines),
        datesMentioned: nullToEmpty(datesMentioned),
        contacts,
        grantStatus: null,
        grantDeadlineAt: null,
        eligibility: null,
        scope: null,
    };
}

function finalize(category, tags, reasons, combined, deadlines, datesMentioned, contacts, baseConfidence) {
    // Add bump tag elsewhere; here we handle category-specific tags.
    let confidence = baseConfidence ?? 0.80; // L1 subject matches get higher confidence

    let grantStatus = null;
    let grantDeadlineAt = null;
    let eligibility = null;
    let scope = null;

    if (category === "CREW_CALL") {
        // Casting tagging (if not already tagged in L1)
        if (hasAny(combined, ["casting call", "audition", "auditions", "extras", "casting", "self tape", "actors"])) {
            tags.add("CASTING_ROLES");
            if (hasAny(combined, ["extras"])) tags.add("CASTING_EXTRAS");
        }

        // Paid/unpaid detection (lightweight heuristic)
        const hasPaidSignals = hasAny(combined, ["paid", "$", "compensation", "wage", "salary"]);
        const hasUnpaidSignals = hasAny(combined, ["unpaid", "volunteer", "no pay", "for experience"]);

        if (hasPaidSignals && !hasUnpaidSignals) {
            tags.add("PAID");
        } else if (hasUnpaidSignals && !hasPaidSignals) {
            tags.add("UNPAID");
        } else if (hasPaidSignals && hasUnpaidSignals) {
            tags.add("PAY_UNCLEAR"); // Conflicting signals
        } else {
            tags.add("PAY_UNCLEAR"); // No clear signal
        }

        // Contact info
        if (contacts.length > 0) {
            tags.add("HAS_CONTACT_INFO");
        }
    }

    if (category === "RESOURCE") {
        // Add specific resource tags if not already added
        if (hasAny(combined, ["props", "costume", "costumes", "wardrobe"])) tags.add("PROPS_COSTUMES");
        if (hasAny(combined, ["location", "locations", "shooting location"])) tags.add("LOCATION");
        if (hasAny(combined, ["camera", "lens", "tripod", "equipment", "gear"])) tags.add("EQUIPMENT");
    }

    if (category === "EVENT") {
        if (hasAny(combined, ["screening"])) tags.add("SCREENING");
        if (hasAny(combined, ["workshop"])) tags.add("WORKSHOP");
        if (hasAny(combined, ["panel"])) tags.add("PANEL");
        if (hasAny(combined, ["info session", "infosession"])) tags.add("INFO_SESSION");
        if (hasAny(combined, ["meeting"])) tags.add("MEETING");
        if (hasAny(combined, ["rsvp"])) tags.add("RSVP");
    }

    if (category === "GRANT") {
        // Improved deadline parsing and status detection
        if (deadlines.length > 0) {
            const epoch = parseISOToEpochSeconds(deadlines[0].iso ?? null);
            if (epoch) {
                grantDeadlineAt = epoch;
                tags.add("HAS_DEADLINE");
            }
        }

        // Eligibility detection
        const hasUndergrad = combined.includes("undergrad") || combined.includes("undergraduate");
        const hasGrad = combined.includes("grad") || combined.includes("graduate");
        eligibility = hasUndergrad && hasGrad ? "both" : hasUndergrad ? "undergrad" : hasGrad ? "grad" : "unclear";

        // Scope detection (what the grant is for)
        if (combined.includes("post-production") || combined.includes("post production") || combined.includes("post")) {
            scope = "post";
        } else if (combined.includes("equipment") || combined.includes("gear")) {
            scope = "equipment";
        } else if (combined.includes("travel")) {
            scope = "travel";
        } else if (combined.includes("production") || combined.includes("shoot") || combined.includes("filming")) {
            scope = "production";
        } else {
            scope = "unclear";
        }

        // Grant status detection (open/upcoming/closed/unclear)
        const n = nowSec();
        const openSignals = ["now open", "applications open", "submissions open", "apply by", "due", "deadline"];
        const upcomingSignals = ["opens", "opening", "will open", "coming soon"];
        const closedSignals = ["closed", "deadline passed", "submissions closed"];

        if (grantDeadlineAt != null) {
            // We have a parsed deadline - use it
            if (grantDeadlineAt >= n) {
                grantStatus = "open";
                tags.add("GRANT_OPEN");
            } else {
                grantStatus = "closed";
                tags.add("GRANT_CLOSED");
            }
        } else if (hasAny(combined, closedSignals)) {
            grantStatus = "closed";
            tags.add("GRANT_CLOSED");
        } else if (hasAny(combined, openSignals)) {
            grantStatus = "open";
            tags.add("GRANT_OPEN");
            reasons.push("grant appears open (no parseable deadline)");
        } else if (hasAny(combined, upcomingSignals)) {
            grantStatus = "upcoming";
            tags.add("GRANT_UPCOMING");
        } else {
            grantStatus = "unclear";
            tags.add("GRANT_STATUS_UNCLEAR");
        }

        if (scope === "production") tags.add("SCOPE_PRODUCTION");
        else if (scope === "post") tags.add("SCOPE_POST");
        else if (scope === "equipment") tags.add("SCOPE_EQUIPMENT");
        else if (scope === "travel") tags.add("SCOPE_TRAVEL");
        else tags.add("SCOPE_UNCLEAR");

        if (eligibility === "undergrad") tags.add("ELIG_UNDERGRAD");
        else if (eligibility === "grad") tags.add("ELIG_GRAD");
        else if (eligibility === "both") tags.add("ELIG_BOTH");
        else tags.add("ELIG_UNCLEAR");
    }

    // Confidence heuristic: subject-match gives higher confidence
    // (If you want: detect subject rule hit and set 0.85; leaving simple here)
    confidence = Math.min(0.95, Math.max(0.55, confidence));

    return {
        category,
        tags: [...tags],
        confidence,
        reasons,
        deadlines: nullToEmpty(deadlines),
        datesMentioned: nullToEmpty(datesMentioned),
        contacts,
        grantStatus,
        grantDeadlineAt,
        eligibility,
        scope,
    };
}



/* ===== D1 bump canonical lookup ===== */
async function resolveCanonicalForBump(env, threadKey, sentAt) {
    const sixtyDays = 60 * 24 * 60 * 60;
    const minSentAt = sentAt - sixtyDays;

    const row = await env.DATABASE_BINDING.prepare(
        `SELECT id, category, tags_json, confidence
     FROM emails
     WHERE thread_key = ?1
       AND sent_at >= ?2
       AND category != 'DO_NOT_CARE'
     ORDER BY sent_at DESC
     LIMIT 1`
    )
        .bind(threadKey, minSentAt)
        .first();

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

/* ===== Ingest one message into emails + opportunities ===== */
async function ingestOneMessage(env, m) {
    const threadKey = makeThreadKey(m.subject);
    const createdAt = nowSec();

    const id = await (m.providerMessageId
        ? sha256Hex(m.providerMessageId)
        : sha256Hex(`${m.listserv}|${m.sentAt}|${threadKey}|${m.bodyText.slice(0, 256)}`));

    const existing = await env.DATABASE_BINDING.prepare(`SELECT id FROM emails WHERE id = ?1`).bind(id).first();
    if (existing) {
        await env.DATABASE_BINDING.prepare(`UPDATE emails SET updated_at = ?2 WHERE id = ?1`).bind(id, createdAt).run();
        return { id, deduped: true };
    }

    const bump = detectBump(m.subject, m.bodyText);
    const base = classify(m.subject, m.bodyText);

    let category = base.category;
    let tags = base.tags;
    let confidence = base.confidence;
    const reasons = [...base.reasons];
    let canonicalId = null;

    if (bump.isBump) {
        tags = Array.from(new Set([...tags, "BUMP"]));
        reasons.push(...bump.bumpReasons);

        const canonical = await resolveCanonicalForBump(env, threadKey, m.sentAt);
        if (canonical.canonicalId) {
            canonicalId = canonical.canonicalId;

            const bumpLooksLikeNoNewInfo = category === "OTHER" || (tags.length === 1 && tags[0] === "BUMP");
            if (bumpLooksLikeNoNewInfo && canonical.canonicalCategory && canonical.canonicalTags) {
                category = canonical.canonicalCategory;
                tags = Array.from(new Set([...(canonical.canonicalTags ?? []), "BUMP"]));
                confidence = Math.max(confidence, (canonical.canonicalConfidence ?? confidence) * 0.9);
                reasons.push("bump resolved: copied canonical category/tags");
            }
        }
    }

    const toEmailsJson = m.toEmails ? JSON.stringify(m.toEmails) : null;

    await env.DATABASE_BINDING.prepare(
        `INSERT INTO emails (
      id, provider_message_id, source, listserv,
      from_email, from_name, reply_to, to_emails_json,
      subject, body_text, body_html, sent_at,
      category, tags_json, confidence, reasons_json,
      is_bump, thread_key, canonical_id,
      deadlines_json, dates_mentioned_json, contacts_json,
      created_at, updated_at
    ) VALUES (
      ?1, ?2, ?3, ?4,
      ?5, ?6, ?7, ?8,
      ?9, ?10, ?11, ?12,
      ?13, ?14, ?15, ?16,
      ?17, ?18, ?19,
      ?20, ?21, ?22,
      ?23, ?24
    )`
    )
        .bind(
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
            m.bodyHtml,
            m.sentAt,
            category,
            JSON.stringify(tags),
            confidence,
            JSON.stringify(reasons),
            bump.isBump ? 1 : 0,
            threadKey || null,
            canonicalId,
            base.deadlines.length ? JSON.stringify(base.deadlines) : null,
            base.datesMentioned.length ? JSON.stringify(base.datesMentioned) : null,
            base.contacts.length ? JSON.stringify(base.contacts) : null,
            createdAt,
            createdAt
        )
        .run();

    if (category === "GRANT") {
        const status = base.grantStatus ?? "unclear";
        const eligibility = base.eligibility ?? "unclear";
        const scope = base.scope ?? "unclear";
        const deadlineAt = base.grantDeadlineAt ?? null;

        await env.DATABASE_BINDING.prepare(
            `INSERT INTO opportunities (
        id, email_id, title, status, deadline_at, eligibility, scope, created_at, updated_at
      ) VALUES (
        ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9
      )
      ON CONFLICT(email_id) DO UPDATE SET
        title=excluded.title,
        status=excluded.status,
        deadline_at=excluded.deadline_at,
        eligibility=excluded.eligibility,
        scope=excluded.scope,
        updated_at=excluded.updated_at`
        )
            .bind(id, id, m.subject, status, deadlineAt, eligibility, scope, createdAt, createdAt)
            .run();
    }

    return { id, deduped: false };
}
async function sha256Hex(message) {
    // Encode the string as a Uint8Array (UTF-8 is standard for hashing)
    const msgBuffer = new TextEncoder().encode(message); //

    // Hash the message using SHA-256
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer); //

    // Convert the ArrayBuffer to a hexadecimal string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
        .map(b => b.toString(16).padStart(2, '0')) // Ensure each byte is two hex digits
        .join('');

    return hashHex;
}