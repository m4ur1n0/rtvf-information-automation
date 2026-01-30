#!/usr/bin/env node

/**
 * Classification Sanity Check Harness
 *
 * Tests the refactored email classification logic on sample CSV data.
 * Run with: node classify-test-harness.js [--sample-size=100] [--debug]
 *
 * Outputs:
 * - Distribution counts for each category
 * - Examples of uncertain/low-confidence classifications
 * - Sample classifications for each of the 4 key foci
 */

const fs = require('fs');
const path = require('path');

// ========== Configuration ==========
const args = process.argv.slice(2);
const SAMPLE_SIZE = parseInt(args.find(a => a.startsWith('--sample-size='))?.split('=')[1] || '200', 10);
const DEBUG_MODE = args.includes('--debug');
const CSV_PATH = path.join(__dirname, '../data/rtvf_data.csv');

// ========== Copy classification functions from worker.js ==========
// (We extract just the classification logic for standalone testing)

function nowSec() {
    return Math.floor(Date.now() / 1000);
}

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

function stripQuotedEmail(text) {
    const t = String(text ?? "");

    // Common reply separators - expanded to catch more patterns
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

    return t.slice(0, cutAt).trim().slice(0, 8000);
}

function packResult(category, tags, confidence, reasons, deadlines, datesMentioned, contacts) {
    return {
        category,
        tags: [...tags],
        confidence,
        reasons,
        deadlines: deadlines || [],
        datesMentioned: datesMentioned || [],
        contacts,
        grantStatus: null,
        grantDeadlineAt: null,
        eligibility: null,
        scope: null,
    };
}

function finalize(category, tags, reasons, combined, deadlines, datesMentioned, contacts, baseConfidence) {
    let confidence = baseConfidence ?? 0.80;

    let grantStatus = null;
    let grantDeadlineAt = null;
    let eligibility = null;
    let scope = null;

    if (category === "CREW_CALL") {
        if (hasAny(combined, ["casting call", "audition", "auditions", "extras", "casting", "self tape", "actors"])) {
            tags.add("CASTING_ROLES");
            if (hasAny(combined, ["extras"])) tags.add("CASTING_EXTRAS");
        }

        const hasPaidSignals = hasAny(combined, ["paid", "$", "compensation", "wage", "salary"]);
        const hasUnpaidSignals = hasAny(combined, ["unpaid", "volunteer", "no pay", "for experience"]);

        if (hasPaidSignals && !hasUnpaidSignals) {
            tags.add("PAID");
        } else if (hasUnpaidSignals && !hasPaidSignals) {
            tags.add("UNPAID");
        } else {
            tags.add("PAY_UNCLEAR");
        }

        if (contacts.length > 0) {
            tags.add("HAS_CONTACT_INFO");
        }
    }

    if (category === "RESOURCE") {
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
        if (deadlines.length > 0) {
            const epoch = parseISOToEpochSeconds(deadlines[0].iso ?? null);
            if (epoch) {
                grantDeadlineAt = epoch;
                tags.add("HAS_DEADLINE");
            }
        }

        const hasUndergrad = combined.includes("undergrad") || combined.includes("undergraduate");
        const hasGrad = combined.includes("grad") || combined.includes("graduate");
        eligibility = hasUndergrad && hasGrad ? "both" : hasUndergrad ? "undergrad" : hasGrad ? "grad" : "unclear";

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

        const n = nowSec();
        const openSignals = ["now open", "applications open", "submissions open", "apply by", "due", "deadline"];
        const upcomingSignals = ["opens", "opening", "will open", "coming soon"];
        const closedSignals = ["closed", "deadline passed", "submissions closed"];

        if (grantDeadlineAt != null) {
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

    confidence = Math.min(0.95, Math.max(0.35, confidence));

    return {
        category,
        tags: [...tags],
        confidence,
        reasons,
        deadlines: deadlines || [],
        datesMentioned: datesMentioned || [],
        contacts,
        grantStatus,
        grantDeadlineAt,
        eligibility,
        scope,
    };
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

    // L1: Strong Subject Patterns
    const doNotCareSubjectStrong = [
        "game night", "watch party", "oscars watch party", "hangout", "come chill",
        "party", "karaoke", "free food", "speed dating", "lost and found",
        "sublet", "roommate", "rideshare", "ride share", "buy/sell", "buy sell",
        "join us for", "good vibes",
    ];
    const explicitOffTopic = ["not film related", "off topic", "unrelated"];

    if (hasAny(sub, doNotCareSubjectStrong) || hasAny(combined, explicitOffTopic)) {
        reasons.push(`DO_NOT_CARE: subject contains social/off-topic signal`);
        return packResult("DO_NOT_CARE", tags, 0.9, reasons, deadlines, datesMentioned, contacts);
    }

    const grantSubjectStrong = [
        "grant", "grants", "funding", "call for proposals", "submissions for",
        "submissions open", "grant deadline", "grant application", "applications are due", "apply by",
    ];

    if (hasAny(sub, grantSubjectStrong)) {
        const matched = grantSubjectStrong.find(k => sub.includes(k));
        reasons.push(`GRANT: subject contains strong grant signal: "${matched}"`);
        return finalize("GRANT", tags, reasons, combined, deadlines, datesMentioned, contacts);
    }

    const castingSubjectStrong = [
        "casting call", "auditions", "audition", "extras needed", "extras call",
        "seeking extras", "self tapes", "voice actors", "seeking actors",
    ];

    if (hasAny(sub, castingSubjectStrong)) {
        const matched = castingSubjectStrong.find(k => sub.includes(k));
        reasons.push(`CREW_CALL: subject contains casting signal: "${matched}"`);
        tags.add("CASTING_ROLES");
        if (sub.includes("extras")) tags.add("CASTING_EXTRAS");
        return finalize("CREW_CALL", tags, reasons, combined, deadlines, datesMentioned, contacts);
    }

    const crewSubjectStrong = [
        "crew call", "crew heads", "seeking crew", "looking for crew", "hiring", "petitions",
    ];

    if (hasAny(sub, crewSubjectStrong)) {
        const matched = crewSubjectStrong.find(k => sub.includes(k));
        reasons.push(`CREW_CALL: subject contains crew recruitment signal: "${matched}"`);
        if (hasAny(sub, ["casting", "audition", "extras"])) {
            tags.add("CASTING_ROLES");
            if (sub.includes("extras")) tags.add("CASTING_EXTRAS");
        }
        return finalize("CREW_CALL", tags, reasons, combined, deadlines, datesMentioned, contacts);
    }

    const resourceSubjectStrong = [
        "sourcing", "borrow", "does anyone have", "looking to borrow", "need a ", "need an ",
        "seeking costume designer", "seeking marketing director", "be a costume designer",
    ];

    if (hasAny(sub, resourceSubjectStrong)) {
        const matched = resourceSubjectStrong.find(k => sub.includes(k));
        reasons.push(`RESOURCE: subject contains resource request signal: "${matched}"`);

        if (hasAny(combined, ["props", "costume", "costumes", "wardrobe"])) tags.add("PROPS_COSTUMES");
        if (hasAny(combined, ["location"])) tags.add("LOCATION");
        if (hasAny(combined, ["camera", "lens", "tripod", "equipment"])) tags.add("EQUIPMENT");

        return finalize("RESOURCE", tags, reasons, combined, deadlines, datesMentioned, contacts);
    }

    const eventSubjectStrong = [
        "screening", "workshop", "panel", "info session", "infosession",
        "writer's circle", "writers circle", "masterclass", "q&a event",
    ];

    if (hasAny(sub, eventSubjectStrong)) {
        const matched = eventSubjectStrong.find(k => sub.includes(k));
        reasons.push(`EVENT: subject contains event signal: "${matched}"`);
        return finalize("EVENT", tags, reasons, combined, deadlines, datesMentioned, contacts);
    }

    const adminSubjectStrong = [
        "policy", "department", "program requirements", "official", "forms",
    ];

    if (hasAny(sub, adminSubjectStrong)) {
        const matched = adminSubjectStrong.find(k => sub.includes(k));
        reasons.push(`ADMIN: subject contains admin signal: "${matched}"`);
        return finalize("ADMIN", tags, reasons, combined, deadlines, datesMentioned, contacts);
    }

    // L2: Weighted Scoring
    const SUBJECT_WEIGHT = 5;

    const grantKw = ["grant", "funding", "apply", "application", "award", "call for proposals", "submissions"];
    const crewKw = ["looking for", "seeking", "hiring", "crew", "dp", "cinematographer", "sound", "editor", "gaffer", "grip", "producer", "pa", "production assistant"];
    const castingKw = ["casting", "extras", "audition", "actors", "self tape"];
    const resourceKw = ["borrow", "does anyone have", "sourcing", "equipment", "camera", "lens", "tripod", "location", "props", "costume", "wardrobe"];
    const eventKw = ["screening", "workshop", "panel", "info session", "meeting", "rsvp"];
    const adminKw = ["policy", "deadline reminder", "program", "requirements", "forms", "official"];
    const doNotCareBodyKw = ["game night", "watch party", "free food", "come hang", "speed dating", "good vibes"];

    const grantScore = SUBJECT_WEIGHT * countHits(sub, grantKw) + countHits(bod, grantKw);
    const crewScore = SUBJECT_WEIGHT * countHits(sub, crewKw) + countHits(bod, crewKw);
    const castingScore = SUBJECT_WEIGHT * countHits(sub, castingKw) + countHits(bod, castingKw);
    const resourceScore = SUBJECT_WEIGHT * countHits(sub, resourceKw) + countHits(bod, resourceKw);
    const eventScore = SUBJECT_WEIGHT * countHits(sub, eventKw) + countHits(bod, eventKw);
    const adminScore = SUBJECT_WEIGHT * countHits(sub, adminKw) + countHits(bod, adminKw);
    const doNotCareScore = SUBJECT_WEIGHT * countHits(sub, doNotCareBodyKw) + countHits(bod, doNotCareBodyKw);

    const maxScore = Math.max(grantScore, crewScore, castingScore, resourceScore, eventScore, adminScore, doNotCareScore);

    if (maxScore === 0) {
        reasons.push("L2: no keyword matches → OTHER");
        return packResult("OTHER", tags, 0.35, reasons, deadlines, datesMentioned, contacts);
    }

    let category = null;
    let confidence = 0.70;

    if (doNotCareScore === maxScore && doNotCareScore > 0) {
        category = "DO_NOT_CARE";
        reasons.push(`L2: DO_NOT_CARE scored highest (${doNotCareScore})`);
    } else if (grantScore === maxScore) {
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

// ========== CSV Parser ==========
function parseCsvLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const next = line[i + 1];

        if (inQuotes) {
            if (char === '"' && next === '"') {
                current += '"';
                i++;
            } else if (char === '"') {
                inQuotes = false;
            } else {
                current += char;
            }
        } else {
            if (char === '"') {
                inQuotes = true;
            } else if (char === ',') {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
    }
    result.push(current);
    return result;
}

// ========== Main Test Harness ==========
function main() {
    console.log('========================================');
    console.log('Email Classification Sanity Check');
    console.log('========================================\n');

    if (!fs.existsSync(CSV_PATH)) {
        console.error(`Error: CSV file not found at ${CSV_PATH}`);
        process.exit(1);
    }

    const content = fs.readFileSync(CSV_PATH, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim());

    console.log(`Total rows in CSV: ${lines.length - 1}`);
    console.log(`Sampling ${SAMPLE_SIZE} rows...\n`);

    const header = parseCsvLine(lines[0]);
    const results = {
        GRANT: [],
        CREW_CALL: [],
        RESOURCE: [],
        EVENT: [],
        ADMIN: [],
        OTHER: [],
        DO_NOT_CARE: [],
    };

    const lowConfidence = [];

    // Sample evenly across the CSV
    const step = Math.max(1, Math.floor((lines.length - 1) / SAMPLE_SIZE));

    for (let i = 1; i < lines.length && results.GRANT.length + results.CREW_CALL.length + results.RESOURCE.length + results.EVENT.length + results.ADMIN.length + results.OTHER.length + results.DO_NOT_CARE.length < SAMPLE_SIZE; i += step) {
        try {
            const row = parseCsvLine(lines[i]);
            const subject = row[0] || '';
            const bodyRaw = row[4] || '';
            const bodyText = stripQuotedEmail(bodyRaw);

            const result = classify(subject, bodyText);

            results[result.category].push({
                subject,
                bodyPreview: bodyText.substring(0, 150).replace(/<br>/g, ' ').replace(/\s+/g, ' '),
                category: result.category,
                tags: result.tags,
                confidence: result.confidence,
                reasons: result.reasons,
                lineNum: i + 1,
            });

            if (result.confidence < 0.6) {
                lowConfidence.push({
                    subject,
                    category: result.category,
                    confidence: result.confidence,
                    reasons: result.reasons,
                    lineNum: i + 1,
                });
            }
        } catch (e) {
            // Skip malformed rows
        }
    }

    // ========== Report ==========
    console.log('========================================');
    console.log('CLASSIFICATION DISTRIBUTION');
    console.log('========================================\n');

    const total = Object.values(results).reduce((sum, arr) => sum + arr.length, 0);
    for (const [cat, items] of Object.entries(results)) {
        const pct = ((items.length / total) * 100).toFixed(1);
        console.log(`${cat.padEnd(15)} ${items.length.toString().padStart(4)} (${pct}%)`);
    }
    console.log(`${'TOTAL'.padEnd(15)} ${total.toString().padStart(4)}\n`);

    // Key foci breakdown
    const grantCount = results.GRANT.length;
    const crewNonCasting = results.CREW_CALL.filter(r => !r.tags.includes('CASTING_ROLES')).length;
    const castingCount = results.CREW_CALL.filter(r => r.tags.includes('CASTING_ROLES')).length;
    const resourceCount = results.RESOURCE.length;

    console.log('========================================');
    console.log('4 KEY FOCI BREAKDOWN');
    console.log('========================================\n');
    console.log(`Grants:            ${grantCount}`);
    console.log(`Crew Calls:        ${crewNonCasting} (non-casting)`);
    console.log(`Casting Calls:     ${castingCount}`);
    console.log(`Resource Requests: ${resourceCount}\n`);

    // Examples for each key focus
    console.log('========================================');
    console.log('SAMPLE CLASSIFICATIONS');
    console.log('========================================\n');

    console.log('--- GRANTS ---');
    results.GRANT.slice(0, 5).forEach((r, i) => {
        console.log(`[${i + 1}] "${r.subject}"`);
        console.log(`    Tags: ${r.tags.join(', ')}`);
        console.log(`    Confidence: ${r.confidence.toFixed(2)}`);
        console.log(`    Reason: ${r.reasons[0]}\n`);
    });

    console.log('--- CREW CALLS (non-casting) ---');
    results.CREW_CALL.filter(r => !r.tags.includes('CASTING_ROLES')).slice(0, 5).forEach((r, i) => {
        console.log(`[${i + 1}] "${r.subject}"`);
        console.log(`    Tags: ${r.tags.join(', ')}`);
        console.log(`    Confidence: ${r.confidence.toFixed(2)}`);
        console.log(`    Reason: ${r.reasons[0]}\n`);
    });

    console.log('--- CASTING CALLS ---');
    results.CREW_CALL.filter(r => r.tags.includes('CASTING_ROLES')).slice(0, 5).forEach((r, i) => {
        console.log(`[${i + 1}] "${r.subject}"`);
        console.log(`    Tags: ${r.tags.join(', ')}`);
        console.log(`    Confidence: ${r.confidence.toFixed(2)}`);
        console.log(`    Reason: ${r.reasons[0]}\n`);
    });

    console.log('--- RESOURCE REQUESTS ---');
    results.RESOURCE.slice(0, 5).forEach((r, i) => {
        console.log(`[${i + 1}] "${r.subject}"`);
        console.log(`    Tags: ${r.tags.join(', ')}`);
        console.log(`    Confidence: ${r.confidence.toFixed(2)}`);
        console.log(`    Reason: ${r.reasons[0]}\n`);
    });

    console.log('--- DO_NOT_CARE (Social/Off-topic) ---');
    results.DO_NOT_CARE.slice(0, 5).forEach((r, i) => {
        console.log(`[${i + 1}] "${r.subject}"`);
        console.log(`    Confidence: ${r.confidence.toFixed(2)}`);
        console.log(`    Reason: ${r.reasons[0]}\n`);
    });

    // Low confidence examples
    if (lowConfidence.length > 0) {
        console.log('========================================');
        console.log('LOW CONFIDENCE CLASSIFICATIONS');
        console.log('========================================\n');
        lowConfidence.slice(0, 10).forEach((r, i) => {
            console.log(`[${i + 1}] "${r.subject}"`);
            console.log(`    Category: ${r.category}`);
            console.log(`    Confidence: ${r.confidence.toFixed(2)}`);
            console.log(`    Reason: ${r.reasons[0]}\n`);
        });
    }

    console.log('========================================');
    console.log('Done!');
    console.log('========================================');
}

main();
