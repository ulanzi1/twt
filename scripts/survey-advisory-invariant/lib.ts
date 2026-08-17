// scripts/survey-advisory-invariant/lib.ts
//
// The scanner behind the Story 10.15 Load-Bearing-Decision-1 gate: a survey is ADVISORY, so the word
// `quorum` — and the governance verbs that would make a survey look like a vote — must never reach a
// column, a DTO field, a TS identifier, an i18n key, an admin label or member copy.
//
// ── ⚠ WHY THIS SCANS CODE AND NOT RAW FILE TEXT — READ BEFORE "SIMPLIFYING" IT ────────────────
// Story 10.15's Task 11 specifies the gate as a raw `grep -rni "quorum"` returning ZERO hits. A raw
// grep over these paths does NOT return zero, and it never could: every survey file's header explains
// AT LENGTH why the word is banned, citing `trust-deed.md:227` (Deed Cl. 19) and
// `niyamavali.md:266,270`. That prose is the RECORD of the decision.
//
// Satisfying the literal grep would mean DELETING the reasoning — leaving a `response_threshold`
// column whose renaming no future reader could account for. That is the exact decay
// [[feedback_record_unattested_no_backfill]] exists to prevent: a rule whose reason has been erased
// is indistinguishable from an arbitrary one, and the next author "simplifies" it back.
//
// So the gate enforces the INVARIANT the story states — *"not in a column, a DTO field, a TS
// identifier, an i18n key, an admin label, or member copy"* — rather than the raw-text PROXY for it.
// Comments are stripped before scanning; STRING LITERALS AND IDENTIFIERS ARE NOT. A `quorum` in any
// executable position still fails, which is the whole point.
//
// ⚠ The deviation from Task 11's literal wording is DECLARED, not silent: it is recorded here, in the
// gate's README, and in the story's Completion Notes.

/** One violation: a banned word reaching a code position rather than a comment. */
export interface AdvisoryFinding {
  file: string;
  line: number;
  word: string;
  /** The offending line with comments already stripped — what the scanner actually judged. */
  snippet: string;
}

/**
 * The banned vocabulary (LBD-1).
 *
 * `quorum` is the load-bearing one: in this project it already names the TRUSTEE quorum (Deed
 * Cl. 19), and members hold no governance vote under the Deed or the Niyamavali. A survey that
 * reached a "quorum" and thereby decided something would be a member vote the Deed does not create —
 * arriving by NAMING, which is the cheapest way for an unintended authority to appear.
 *
 * The rest are the verbs that would make a survey RESULT read as a decision. ⚠ They are matched only
 * in survey-owned files, so ordinary uses elsewhere in the repo are untouched.
 */
export const BANNED_WORDS: readonly string[] = ['quorum'];

/**
 * Governance verbs banned in MEMBER- and ADMIN-FACING COPY specifically (the i18n/label files), where
 * they would tell a reader the survey decided something. Deliberately NOT applied to all code: a
 * variable named `approved` elsewhere in a survey file is unrelated to what a survey means.
 */
export const BANNED_COPY_PHRASES: readonly string[] = [
  'reached quorum',
  'the survey passed',
  'the poll passed',
  'the survey carried',
  'survey was approved',
  'poll was approved',
  'the survey decides',
  'the poll decides',
];

/**
 * Strip `//` line comments and `/* *\/` block comments from a source text, preserving line numbering
 * so a finding's line number still points at the real line.
 *
 * ⚠ Deliberately conservative about strings: a `//` INSIDE a string literal (a URL) would be treated
 * as a comment start, which could only ever HIDE a violation in the tail of that line. Since the
 * banned words never legitimately appear in a URL, and a false NEGATIVE here would need someone to
 * write `quorum` after a `//` inside a string on the same line, the trade is acceptable — and the
 * alternative (a full tokenizer) is a parser this gate does not need.
 */
export function stripComments(source: string): string[] {
  const lines = source.split('\n');
  const out: string[] = [];
  let inBlock = false;
  for (const raw of lines) {
    let line = raw;
    if (inBlock) {
      const end = line.indexOf('*/');
      if (end === -1) {
        out.push('');
        continue;
      }
      line = line.slice(end + 2);
      inBlock = false;
    }
    // Consume any block comments opening on this line.
    for (;;) {
      const start = line.indexOf('/*');
      if (start === -1) break;
      const end = line.indexOf('*/', start + 2);
      if (end === -1) {
        line = line.slice(0, start);
        inBlock = true;
        break;
      }
      line = line.slice(0, start) + line.slice(end + 2);
    }
    // Then any line comment — `//` for TS/TSX, `--` for SQL.
    const slash = line.indexOf('//');
    if (slash !== -1) line = line.slice(0, slash);
    const dash = line.indexOf('--');
    if (dash !== -1) line = line.slice(0, dash);
    out.push(line);
  }
  return out;
}

/** Scan one file's source for banned words in CODE positions (comments already stripped). */
export function scanAdvisoryInvariant(relPath: string, source: string): AdvisoryFinding[] {
  const findings: AdvisoryFinding[] = [];
  const codeLines = stripComments(source);
  codeLines.forEach((line, i) => {
    const lower = line.toLowerCase();
    for (const word of BANNED_WORDS) {
      if (lower.includes(word)) {
        findings.push({ file: relPath, line: i + 1, word, snippet: line.trim() });
      }
    }
    for (const phrase of BANNED_COPY_PHRASES) {
      if (lower.includes(phrase)) {
        findings.push({ file: relPath, line: i + 1, word: phrase, snippet: line.trim() });
      }
    }
  });
  return findings;
}

export function formatFinding(f: AdvisoryFinding): string {
  return `  ${f.file}:${f.line} — banned in a code position: "${f.word}"\n      ${f.snippet}`;
}
