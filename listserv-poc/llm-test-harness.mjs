#!/usr/bin/env node
/**
 * LLM Classification Test Harness
 *
 * Runs real rtvf_data.csv rows through the shared classify.js pipeline
 * and shows a detailed pass/fail report for each classification.
 *
 * Usage:
 *   CEREBRAS_API_KEY=... node llm-test-harness.mjs
 *   CEREBRAS_API_KEY=... node llm-test-harness.mjs --rows=5
 *   CEREBRAS_API_KEY=... node llm-test-harness.mjs --verbose
 *
 * Options:
 *   --rows=N        Run only the first N test cases (default: all)
 *   --model=NAME    Model name (default: CEREBRAS_MODEL env or classify.js default)
 *   --verbose       Print the full JSON response object for every case
 *   --delay=MS      Milliseconds to wait between API calls (default: 300)
 *   --out=FILE      Write full JSON results to FILE (default: test-results.json)
 *   --no-out        Skip writing the results file
 */

import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  classifyWithLLM,
  LLM_MODEL,
  parseCsv,
  stripQuotedEmail,
  htmlToPlainText,
} from "./classify.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Config ───────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const VERBOSE = args.includes("--verbose");
const NO_OUT = args.includes("--no-out");
const MAX_ROWS = parseInt(
  args.find((a) => a.startsWith("--rows="))?.split("=")[1] ?? "999",
  10,
);
const DELAY_MS = parseInt(
  args.find((a) => a.startsWith("--delay="))?.split("=")[1] ?? "300",
  10,
);
const OUT_FILE =
  args.find((a) => a.startsWith("--out="))?.split("=")[1] ??
  "test-results.json";
const API_KEY = process.env.CEREBRAS_API_KEY;
const MODEL =
  args.find((a) => a.startsWith("--model="))?.split("=")[1] ??
  process.env.CEREBRAS_MODEL ??
  LLM_MODEL;
const CSV_PATH = join(__dirname, "../data/rtvf_data.csv");
const OUT_PATH = join(__dirname, OUT_FILE);

// ─── ANSI colors ──────────────────────────────────────────────────────────────

const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  gray: "\x1b[90m",
};
const bold = (s) => `${C.bold}${s}${C.reset}`;
const dim = (s) => `${C.dim}${s}${C.reset}`;
const green = (s) => `${C.green}${s}${C.reset}`;
const red = (s) => `${C.red}${s}${C.reset}`;
const yellow = (s) => `${C.yellow}${s}${C.reset}`;
const cyan = (s) => `${C.cyan}${s}${C.reset}`;
const gray = (s) => `${C.gray}${s}${C.reset}`;
const magenta = (s) => `${C.magenta}${s}${C.reset}`;

// ─── Handpicked test cases with expected labels ───────────────────────────────

const TEST_CASES = [
  {
    idx: 1,
    expected: "RESOURCE",
    tags: ["BUMP"],
    note: "Sourcing lamps/chair bump for 'If The Hand Fits'",
  },
  {
    idx: 2,
    expected: "CREW_CALL",
    tags: ["BUMP"],
    note: "Crew heads bump for WingDad sitcom pilot",
  },
  {
    idx: 3,
    expected: "DO_NOT_CARE",
    tags: [],
    note: "Game night social event bump",
  },
  {
    idx: 4,
    expected: "CREW_CALL",
    tags: [],
    note: "Petition bump for Opaline crew call",
  },
  {
    idx: 5,
    expected: "CREW_CALL",
    tags: ["CASTING_EXTRAS"],
    note: "Extras needed for 'Direction of Sunlight'",
  },
  {
    idx: 6,
    expected: "CREW_CALL",
    tags: ["SHOOT_DATES_PRESENT"],
    note: "Grief Mug full crew call with shoot dates",
  },
  {
    idx: 9,
    expected: "CREW_CALL",
    tags: ["CASTING_ROLES"],
    note: "Casting call for Hangtown animated short (voice actors)",
  },
  {
    idx: 13,
    expected: "CREW_CALL",
    tags: ["CASTING_ROLES"],
    note: "Remember Her casting call still open",
  },
  {
    idx: 18,
    expected: "ADMIN",
    tags: [],
    note: "The Cage RTVF equipment room hiring",
  },
  {
    idx: 20,
    expected: "EVENT",
    tags: [],
    note: "Virtual Writer's Circle (script workshop)",
  },
  {
    idx: 21,
    expected: "CREW_CALL",
    tags: [],
    note: "School's Out crew call, sitcom pilot",
  },
  {
    idx: 23,
    expected: "OTHER",
    tags: [],
    note: "Course project team survey (not film production)",
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // Preflight checks
  if (!API_KEY) {
    console.error(red("✗ CEREBRAS_API_KEY environment variable is not set."));
    console.error(
      dim("  Usage: CEREBRAS_API_KEY=... node llm-test-harness.mjs"),
    );
    process.exit(1);
  }

  if (!existsSync(CSV_PATH)) {
    console.error(red(`✗ CSV not found: ${CSV_PATH}`));
    process.exit(1);
  }

  // Load CSV
  const csvText = readFileSync(CSV_PATH, "utf8");
  const rows = parseCsv(csvText);
  if (rows.length < 2) {
    console.error(red("✗ CSV has no data rows."));
    process.exit(1);
  }

  const header = rows[0].map((h) => String(h ?? "").trim());
  const dataRows = rows.slice(1);

  const colIdx = (names) => {
    for (const n of names) {
      const i = header.indexOf(n);
      if (i !== -1) return i;
    }
    return -1;
  };

  const subjectCol = colIdx(["subject", "Subject"]);
  const bodyCol = colIdx(["body_text", "body", "text", "Body", "content"]);
  const bodyHtmlCol = colIdx(["body_html", "html", "BodyHTML"]);
  const fromCol = colIdx(["from_email", "from", "From", "sender"]);

  if (subjectCol === -1) {
    console.error(
      red("✗ CSV has no 'subject' column. Available columns:"),
      header.join(", "),
    );
    process.exit(1);
  }

  const casesToRun = TEST_CASES.slice(0, MAX_ROWS);

  console.log(
    bold(`\n🎬  RTVF LLM Test Harness  (${casesToRun.length} cases)\n`),
  );
  console.log(dim(`   Model:   ${MODEL}`));
  console.log(dim(`   Schema:  response_format=json_schema (strict)`));
  console.log(dim(`   CSV:     ${CSV_PATH}  (${dataRows.length} data rows)\n`));
  console.log("─".repeat(72));

  const stats = { pass: 0, fail: 0, error: 0 };
  const latencies = [];
  const byCategory = {};
  const allResults = []; // collected for the JSON results file

  for (let i = 0; i < casesToRun.length; i++) {
    const tc = casesToRun[i];
    const dataRowIndex = tc.idx - 1; // 0-based into dataRows

    if (dataRowIndex < 0 || dataRowIndex >= dataRows.length) {
      console.log(
        `\n${yellow(`[${i + 1}/${casesToRun.length}] ⚠`)} Row ${tc.idx} out of range (CSV has ${dataRows.length} data rows)`,
      );
      stats.error++;
      allResults.push({
        caseIndex: i + 1,
        csvRow: tc.idx,
        note: tc.note,
        status: "error",
        error: "row out of range",
      });
      continue;
    }

    const row = dataRows[dataRowIndex];
    const subject = row[subjectCol] ?? "(no subject)";
    const bodyRaw = bodyCol !== -1 ? (row[bodyCol] ?? "") : "";
    const bodyHtml = bodyHtmlCol !== -1 ? (row[bodyHtmlCol] ?? null) : null;
    const from = fromCol !== -1 ? (row[fromCol] ?? "") : "";
    const bodyPlain = bodyRaw || (bodyHtml ? htmlToPlainText(bodyHtml) : "");
    const bodyText = stripQuotedEmail(bodyPlain);

    const label = `[${i + 1}/${casesToRun.length}] ${tc.note}`;
    process.stdout.write(`\n${bold(label)}\n`);
    process.stdout.write(`  ${dim("From:")}    ${from || "(unknown)"}\n`);
    process.stdout.write(`  ${dim("Subject:")} ${subject}\n`);

    const t0 = Date.now();
    let result;

    try {
      result = await classifyWithLLM(API_KEY, subject, bodyText, { model: MODEL });
    } catch (err) {
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(
        `  ${red(`✗ ERROR`)} ${dim(`(${elapsed}s)`)}  ${err.message}`,
      );
      stats.error++;
      byCategory[tc.expected] ??= { pass: 0, fail: 0, error: 0 };
      byCategory[tc.expected].error++;
      allResults.push({
        caseIndex: i + 1,
        csvRow: tc.idx,
        note: tc.note,
        from,
        subject,
        bodyTextSent: bodyText.slice(0, 500),
        expected: { category: tc.expected, tags: tc.tags },
        status: "error",
        error: err.message,
      });
      if (DELAY_MS > 0 && i < casesToRun.length - 1) await sleep(DELAY_MS);
      continue;
    }

    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    const elapsedMs = Date.now() - t0;
    latencies.push(elapsedMs);

    const catMatch = result.category === tc.expected;
    const missingTags = tc.tags.filter((t) => !result.tags.includes(t));
    const tagsOk = missingTags.length === 0;
    const overall = catMatch && tagsOk;

    if (overall) stats.pass++;
    else stats.fail++;

    byCategory[tc.expected] ??= { pass: 0, fail: 0, error: 0 };
    byCategory[tc.expected][overall ? "pass" : "fail"]++;

    // Collect full result for JSON output
    allResults.push({
      caseIndex: i + 1,
      csvRow: tc.idx,
      note: tc.note,
      from,
      subject,
      bodyTextSent: bodyText.slice(0, 600),
      expected: { category: tc.expected, tags: tc.tags },
      status: overall ? "pass" : "fail",
      catMatch,
      missingTags,
      elapsedMs,
      llm: { ...result },
    });

    // ── Status line ──────────────────────────────────────────────────────
    const statusIcon = overall ? green("✓ PASS") : red("✗ FAIL");
    const catIcon = catMatch
      ? green(`✓ ${result.category}`)
      : red(`✗ ${result.category} (expected ${tc.expected})`);
    const conf = Math.round((result.confidence ?? 0) * 100);
    const tokenCount =
      result._usage?.totalTokenCount ?? result._usage?.total_tokens ?? null;
    const tokens = tokenCount != null ? dim(` ${tokenCount}tok`) : "";

    process.stdout.write(
      `  ${statusIcon}  ${catIcon}  ${dim(`(${elapsed}s, conf:${conf}%${tokens})`)}\n`,
    );

    // ── Tags — always show the full list; colour by role ─────────────────
    //   green  = expected AND present  (correct)
    //   red    = expected BUT absent   (missed)
    //   gray   = present but not expected (extra info)
    const presentTagDisplay = result.tags.map((t) =>
      tc.tags.includes(t) ? green(t) : gray(t),
    );
    const absentExpected = tc.tags.filter((t) => !result.tags.includes(t));
    const absentDisplay = absentExpected.map((t) => red(`[missing:${t}]`));
    const allTagsDisplay = [...presentTagDisplay, ...absentDisplay];

    if (allTagsDisplay.length) {
      process.stdout.write(
        `  ${dim("Tags:")}      ${allTagsDisplay.join("  ")}\n`,
      );
    } else {
      process.stdout.write(`  ${dim("Tags:")}      ${dim("(none)")}\n`);
    }

    // ── Extracted fields ─────────────────────────────────────────────────
    if (result.film_title)
      process.stdout.write(
        `  ${dim("Film:")}      ${cyan(result.film_title)}` +
          (result.production_type ? gray(` [${result.production_type}]`) : "") +
          "\n",
      );
    if (result.logline)
      process.stdout.write(
        `  ${dim("Logline:")}   ${result.logline.slice(0, 120)}\n`,
      );
    if (result.roles_mentioned?.length)
      process.stdout.write(
        `  ${dim("Roles:")}     ${result.roles_mentioned.join(", ")}\n`,
      );
    if (result.shoot_dates_text)
      process.stdout.write(
        `  ${dim("Filming:")}   ${result.shoot_dates_text}\n`,
      );
    if (result.petition_location)
      process.stdout.write(
        `  ${dim("Petition:")}  ${result.petition_location}\n`,
      );
    if (result.pay)
      process.stdout.write(`  ${dim("Pay:")}       ${result.pay}\n`);
    if (result.grant_amount)
      process.stdout.write(`  ${dim("Amount:")}    ${result.grant_amount}\n`);
    if (result.grant_status)
      process.stdout.write(`  ${dim("Status:")}    ${result.grant_status}\n`);
    if (result.deadline_text)
      process.stdout.write(
        `  ${dim("Deadline:")}  ${result.deadline_text}` +
          (result.deadline_iso ? gray(` (${result.deadline_iso})`) : "") +
          "\n",
      );
    if (result.application_url)
      process.stdout.write(
        `  ${dim("Apply:")}     ${result.application_url}\n`,
      );
    if (result.eligibility_text)
      process.stdout.write(
        `  ${dim("Elig:")}      ${result.eligibility_text}\n`,
      );
    if (result.event_date_text)
      process.stdout.write(
        `  ${dim("Date:")}      ${result.event_date_text}\n`,
      );
    if (result.event_location)
      process.stdout.write(`  ${dim("Location:")}  ${result.event_location}\n`);
    if (result.rsvp_url)
      process.stdout.write(`  ${dim("RSVP:")}      ${result.rsvp_url}\n`);

    if (result.is_bump) {
      process.stdout.write(`  ${magenta("⟳ BUMP detected")}\n`);
    }

    if (result.reasoning) {
      process.stdout.write(`  ${dim("Reasoning:")} ${result.reasoning}\n`);
    }

    if (VERBOSE) {
      const clean = { ...result };
      delete clean._usage;
      process.stdout.write(
        `\n  ${dim("Full JSON:")}\n${JSON.stringify(clean, null, 2)
          .split("\n")
          .map((l) => `  ${l}`)
          .join("\n")}\n`,
      );
    }

    if (DELAY_MS > 0 && i < casesToRun.length - 1) await sleep(DELAY_MS);
  }

  // ─── Summary ──────────────────────────────────────────────────────────────

  console.log("\n" + "─".repeat(72));
  console.log(bold("\nSummary"));

  const total = stats.pass + stats.fail + stats.error;
  const passRate = total > 0 ? Math.round((stats.pass / total) * 100) : 0;
  const passCol = passRate >= 80 ? green : passRate >= 60 ? yellow : red;

  console.log(
    `  Overall: ${passCol(bold(`${stats.pass}/${total} (${passRate}%)`))}   ${stats.fail} fail   ${stats.error} error`,
  );

  if (latencies.length > 0) {
    const avg = Math.round(
      latencies.reduce((a, b) => a + b, 0) / latencies.length,
    );
    const max = Math.max(...latencies);
    console.log(`  Latency: avg ${avg}ms · max ${max}ms`);
  }

  if (Object.keys(byCategory).length > 1) {
    console.log(`\n  By category:`);
    for (const [cat, s] of Object.entries(byCategory)) {
      const catTotal = s.pass + s.fail + s.error;
      const catRate = catTotal > 0 ? Math.round((s.pass / catTotal) * 100) : 0;
      const col = catRate === 100 ? green : catRate >= 50 ? yellow : red;
      console.log(`    ${cat.padEnd(14)} ${col(`${s.pass}/${catTotal}`)}`);
    }
  }

  // ─── Write JSON results file ──────────────────────────────────────────
  if (!NO_OUT) {
    const output = {
      ran_at: new Date().toISOString(),
      model: MODEL,
      schema: "json_schema_strict",
      summary: {
        total: stats.pass + stats.fail + stats.error,
        ...stats,
        pass_rate: `${Math.round((stats.pass / Math.max(1, stats.pass + stats.fail + stats.error)) * 100)}%`,
      },
      latency: latencies.length
        ? {
            avg_ms: Math.round(
              latencies.reduce((a, b) => a + b, 0) / latencies.length,
            ),
            max_ms: Math.max(...latencies),
          }
        : null,
      by_category: byCategory,
      cases: allResults,
    };
    writeFileSync(OUT_PATH, JSON.stringify(output, null, 2), "utf8");
    console.log(`\n  ${dim(`Results written → ${OUT_PATH}`)}`);
  }

  console.log();
  process.exit(stats.fail > 0 || stats.error > 0 ? 1 : 0);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

main().catch((err) => {
  console.error(red("\nFatal error:"), err);
  process.exit(1);
});
