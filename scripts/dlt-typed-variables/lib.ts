// scripts/dlt-typed-variables/lib.ts
//
// Pure scanner for the Story 6.34 invariant (TV7; `2026-10-10-313`, rules per `2026-10-12-322` C2): every SMS
// template we register on DLT declares a TRAI type for each variable, so ⛔ a variable can ship untyped.
//
// The PE registers on STPL's SmartPing portal, where the template TEXT keeps the untyped marker `{#var#}` and each
// variable's TYPE is picked in a separate tagging section. So the types live beside the text, in `slots`, in a
// handful of shape-tested REGISTRY files; this gate keeps it that way:
//
//   (i)   ⛔ braced tag other than `{#var#}` inside REGISTERED TEXT — the registration sheet's template table rows
//         (`docs/launch-gate-inventory/*.md`, lines `| <n> | …`) and the CODE lines of the registry files. A typed
//         tag written into the text (the Jio / Vi in-text form) would be registered on SmartPing as literal text
//         and never match a send. Prose, headings, bullets and comment lines are ⛔ scanned — by house rule they
//         spell a type WITHOUT braces (the TYPE SPELLING RULE).
//   (ii)  the literal `{#var#}` only in a registry file — a template text anywhere else escapes its shape test.
//   (iii) the identifier `DLT_VAR` and the literal `sms.dlt.template_id.` only in a registry file (+ the allowlist:
//         `apps/api/src/deps.ts`, for its startup error string) — a new template that imports the marker, or a new
//         DLT send keyed on a new id, cannot ship outside a shape-tested registry. Comments count (a whole-word /
//         literal match on every line).
//
// SHAPE (slot count, ≤ 3 variables, adjacency, ≥ 30 % fixed) is checked by each registry's unit test via
// `checkDltTemplateShape` (`packages/channels/src/dlt-variables.ts`) — ⛔ here. Line-based, ⛔ a TS parse: a "code
// line" is one whose first non-blank characters are ⛔ `//`, `/*` or `*` — a cheap stand-in, enough for registry
// files whose texts are single-line string literals.

/** The marker every registered text carries (SmartPing's). A gate-local literal — scripts/ cannot import a package's TS by bare name. */
export const DLT_MARKER = '{#var#}';

/** Any braced hash tag. The closing brace is escaped (`#\}`) so a source line holding this regex never matches it. */
const BRACED_TAG = /\{#[^#{}\s]*#\}/g;

/** The identifier of the marker constant — whole word. */
const MARKER_IDENTIFIER = /\bDLT_VAR\b/;

/** The config-key prefix of every DLT template id. */
const TEMPLATE_ID_PREFIX = 'sms.dlt.template_id.';

/** A registration-sheet template table row: `| <number> | …`. */
const SHEET_TEMPLATE_ROW = /^\|\s*\d+\s*\|/;

/**
 * The registry modules whose unit tests run `checkDltTemplateShape` over every entry (the alert registry's test,
 * whose five entries are dark since TV6, asserts `null` + `unregistrableReason` + empty `slots` instead). A new
 * registry joins this list in the same change that adds it (Story 6.27c adds its file — TV11).
 */
export const REGISTRY_FILES: readonly string[] = [
  'packages/channels/src/dlt-variables.ts',
  'packages/channels/src/otp-sms-template.ts',
  'packages/channels/src/sms-dlt-registry.ts',
  'apps/jobs/src/scheduler/claim-correction-sms-templates.ts',
  'apps/jobs/src/scheduler/suspicion-notice-sms-templates.ts',
];

/** Rule (iii) only — files that may hold the template-id prefix without being a registry. */
export const TEMPLATE_ID_ALLOWLIST: readonly string[] = ['apps/api/src/deps.ts'];

export type DltRule = 'i' | 'ii' | 'iii';

export interface DltFinding {
  readonly file: string;
  readonly line: number;
  readonly rule: DltRule;
  readonly message: string;
}

/** True iff the line is code — its first non-blank characters are ⛔ a comment opener / continuation. */
export function isCodeLine(line: string): boolean {
  const t = line.trimStart();
  return t !== '' && !t.startsWith('//') && !t.startsWith('/*') && !t.startsWith('*');
}

function foreignTags(line: string): string[] {
  return (line.match(BRACED_TAG) ?? []).filter((tag) => tag !== DLT_MARKER);
}

/**
 * Scan one tracked file. `file` is repo-relative and forward-slashed; a `.md` file is read as a registration sheet
 * (rule (i) on its template rows only), anything else as source (rules (i) on registry code lines, (ii), (iii)).
 */
export function scanDltText(file: string, text: string): DltFinding[] {
  const findings: DltFinding[] = [];
  const lines = text.split('\n');

  if (file.endsWith('.md')) {
    lines.forEach((line, i) => {
      if (!SHEET_TEMPLATE_ROW.test(line)) return;
      for (const tag of foreignTags(line)) {
        findings.push({
          file,
          line: i + 1,
          rule: 'i',
          message: `a template row carries the typed tag ${tag} — on SmartPing the text keeps ${DLT_MARKER}; put the type in the "Variable types" column`,
        });
      }
    });
    return findings;
  }

  const isRegistry = REGISTRY_FILES.includes(file);
  const mayHoldTemplateId = isRegistry || TEMPLATE_ID_ALLOWLIST.includes(file);
  lines.forEach((line, i) => {
    const at = i + 1;
    if (isRegistry && isCodeLine(line)) {
      for (const tag of foreignTags(line)) {
        findings.push({
          file,
          line: at,
          rule: 'i',
          message: `registered text carries the typed tag ${tag} — keep ${DLT_MARKER} and declare the type in \`slots\``,
        });
      }
    }
    if (!isRegistry && line.includes(DLT_MARKER)) {
      findings.push({
        file,
        line: at,
        rule: 'ii',
        message: `${DLT_MARKER} outside a shape-tested registry — move the template into one (and onto REGISTRY_FILES)`,
      });
    }
    if (!isRegistry && MARKER_IDENTIFIER.test(line)) {
      findings.push({
        file,
        line: at,
        rule: 'iii',
        message: 'the marker identifier DLT_VAR outside a shape-tested registry',
      });
    }
    if (!mayHoldTemplateId && line.includes(TEMPLATE_ID_PREFIX)) {
      findings.push({
        file,
        line: at,
        rule: 'iii',
        message: `the DLT template-id key prefix ${TEMPLATE_ID_PREFIX} outside a shape-tested registry`,
      });
    }
  });
  return findings;
}

/**
 * The scan's own coverage check — so a renamed registry or a glob that matches nothing can ⛔ silently drop out.
 * Returns the problems (empty ⇒ covered).
 */
export function checkScanCoverage(scannedSourceFiles: readonly string[], scannedSheets: readonly string[]): string[] {
  const problems: string[] = [];
  if (scannedSourceFiles.length === 0) problems.push('scanned ZERO source files — the pathspecs match nothing');
  if (scannedSheets.length === 0) problems.push('scanned ZERO registration sheets under docs/launch-gate-inventory/');
  const scanned = new Set(scannedSourceFiles);
  for (const file of REGISTRY_FILES) {
    if (!scanned.has(file)) {
      problems.push(`REGISTRY_FILES path ${file} is ⛔ in the scanned set (renamed? not yet \`git add\`-ed?)`);
    }
  }
  return problems;
}

export function formatFinding(f: DltFinding): string {
  return `${f.file}:${f.line} [rule ${f.rule}] ${f.message}`;
}
