import {
    classifyWithNvidia,
    classifyWithLLM,
    classify,
    extractDateCandidates,
    extractContacts,
    parseISOToEpochSeconds,
    stripQuotedEmail,
} from "./classify.js";
import {
    nowSec,
    normalizeSenderFields,
    normalizeEmailAddress,
    normalizeMessageId,
    parsePositiveInt,
    normalizeContentId,
} from "./worker-helpers.js";


/* =============================================================================
   Core ingest — classifies and stores one message
============================================================================= */

export async function ingestOneMessage(env, m) {
    // Skip ingest for user-created petitions that embed a stable list_service_id marker.
    const bodyText = String(m.bodyText || "");
    const listServiceIdPattern = /list_service_id:\s*([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;
    if (listServiceIdPattern.test(bodyText)) {
        console.log("[INGEST] Skipping user-created petition with embedded listServiceId");
        return { id: null, skipped: true, reason: "user_created_petition" };
    }

    const subjectThreadKey = makeThreadKey(m.subject);
    const rfcMessageId = normalizeMessageId(m.rfcMessageId ?? m.providerMessageId);
    const inReplyTo = normalizeMessageId(m.inReplyTo);
    const references = uniqueStrings(
        (Array.isArray(m.references) ? m.references : [])
            .map((value) => normalizeMessageId(value))
            .filter(Boolean)
    );
    const threadKey = await resolveThreadKeyFromRfc(env, inReplyTo, references) ?? subjectThreadKey;
    const createdAt = nowSec();
    const normalizedSender = normalizeSenderFields(m.fromEmail, m.fromName);
    const normalizedReplyTo = normalizeEmailAddress(m.replyTo);
    const attachments = Array.isArray(m.attachments) ? m.attachments : [];

    const id = await (m.providerMessageId
        ? sha256Hex(m.providerMessageId)
        : sha256Hex(`${m.listserv}|${m.sentAt}|${threadKey}|${(m.bodyText || "").slice(0, 256)}`));

    // Dedup
    const existing = await env.DATABASE_BINDING.prepare(`SELECT id FROM emails WHERE id = ?1`).bind(id).first();
    if (existing) {
        await env.DATABASE_BINDING.prepare(`UPDATE emails SET updated_at = ?2 WHERE id = ?1`).bind(id, createdAt).run();
        if (attachments.length > 0) {
            await writeEmailAttachments(env, id, m.listserv, attachments, createdAt);
        }
        return { id, deduped: true };
    }

    // ── Classification: NVIDIA first, Cerebras fallback, then regex ───────

    let llmResult = null;
    let classifierVersion = "v5_nvidia_regex_fallback";

    try {
        llmResult = await classifyWithNvidia(
            env.NVIDIA_API_KEY,
            m.subject,
            m.bodyText,
            {
                model: env.NVIDIA_MODEL,
                maxAttempts: parsePositiveInt(env.NVIDIA_MAX_ATTEMPTS),
            }
        );
        classifierVersion = "v5_nvidia";
    } catch (nvidiaErr) {
        console.error("[ingest] NVIDIA classification failed, trying Cerebras fallback:", nvidiaErr?.message ?? nvidiaErr);
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
            classifierVersion = "v5_nvidia_cerebras_fallback";
        } catch (llmErr) {
            console.error("[ingest] Cerebras fallback failed, falling back to regex:", llmErr?.message ?? llmErr);
            classifierVersion = "v5_nvidia_regex_fallback";
        }
    }

    // ── Merge into canonical result ──────────────────────────────────────

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
        script_url = null;
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
            id, provider_message_id, rfc_message_id, in_reply_to, references_json, source, listserv,
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
            ?1,  ?2,  ?3,  ?4,  ?5,  ?6,  ?7,
            ?8,  ?9,  ?10, ?11,
            ?12, ?13, ?14, ?15,
            ?16, ?17, ?18, ?19,
            ?20, ?21, ?22,
            ?23, ?24, ?25,
            ?26, ?27, ?28, ?29,
            ?30, ?31, ?32, ?33,
            ?34, ?35, ?36, ?37, ?38, ?39,
            ?40, ?41, ?42,
            ?43, ?44,
            ?45, ?46
        )`
    ).bind(
        id,
        m.providerMessageId,
        rfcMessageId,
        inReplyTo,
        references.length > 0 ? JSON.stringify(references) : null,
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
        toEmails,
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

export function normalizeBodyForIngest(subject, bodyTextRaw) {
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

async function resolveThreadKeyFromRfc(env, inReplyTo, references) {
    const candidates = [];

    if (inReplyTo) candidates.push(inReplyTo);
    if (Array.isArray(references)) {
        for (let i = references.length - 1; i >= 0; i--) {
            if (references[i]) candidates.push(references[i]);
        }
    }

    const uniqueCandidates = uniqueStrings(candidates);
    for (const messageId of uniqueCandidates) {
        const row = await env.DATABASE_BINDING.prepare(
            `SELECT thread_key, subject
             FROM emails
             WHERE rfc_message_id = ?1
             ORDER BY sent_at DESC
             LIMIT 1`
        ).bind(messageId).first();

        if (!row) continue;

        const existingThreadKey = typeof row.thread_key === "string" ? row.thread_key.trim() : "";
        if (existingThreadKey) return existingThreadKey;
        return makeThreadKey(row.subject);
    }

    return null;
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
