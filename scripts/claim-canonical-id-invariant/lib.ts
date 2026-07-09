// scripts/claim-canonical-id-invariant/lib.ts
//
// Pure scanner for the Story 6.4 AC6/AC8 invariant: after ICP convergence the ONLY id any
// downstream flow references is the canonical `claim_case_id`. The channel-originating
// `intake_attempt_id` (branded `IntakeAttemptId`) is a TEMPORARY id — AC7 discards it post-
// convergence (retained for audit, never a downstream lookup key). This gate mechanizes the
// boundary: NO downstream code path (verification / appeal / publication / notification) may
// reference the intake-attempt id AT ALL — the honest, mechanizable formulation of AC8 (Dev
// Notes "The AC8 gate — how to make it real, not theatre": "a narrower but real invariant beats
// a broad but hand-wavy one"). Twin structure of scripts/claim-state-invariant/lib.ts.
//
// FLAGGED forms (AST-detected → a token inside a COMMENT never matches; a token inside a STRING
// LITERAL does, because a downstream `.where(eq(col, x))` keyed on the string is exactly the smell):
//   · an identifier named `intakeAttemptId` OR `intake_attempt_id`  (param / variable / property
//     name / import / `.intakeAttemptId` / a raw snake_case property read `row.intake_attempt_id`
//     / an unquoted object-literal key `{ intake_attempt_id: id }` — all four are Identifier nodes
//     in the TS AST, not just the camelCase spelling)
//   · either spelling appearing ANYWHERE inside a string OR template literal — including embedded
//     in a larger literal (e.g. raw SQL `'WHERE intake_attempt_id = $1'`) or a template literal
//     WITH substitutions (`` `...${x} intake_attempt_id...` ``), not just an exact-match token
//
// The gate is SELF-GREEN by construction: it scans ONLY the downstream-flow roots (check.ts
// DOWNSTREAM_ROOTS), which reference `claim_case_id` and never the intake-attempt id. The ICP's
// own files (icp.ts, the convergence handlers/routes, the schema/ids/contracts, the intake
// handlers' audit provenance) are OUTSIDE the scanned roots — they legitimately name the id.

import * as ts from 'typescript';

export interface CanonicalIdFinding {
  file: string;
  line: number;
  detail: string;
}

/** Both spellings — the camelCase brand/field name AND the snake_case DB column / wire key.
 * Used for exact Identifier matches (a raw snake_case property read is still an Identifier
 * node in the TS AST, same as the camelCase form). */
const FORBIDDEN_NAMES = new Set(['intake_attempt_id', 'intakeAttemptId']);
/** Substring test for string/template literals — catches either spelling embedded inside a
 * larger literal (raw SQL, a template with substitutions), not just an exact-token match. */
const FORBIDDEN_PATTERN = /intake_attempt_id|intakeAttemptId/;

/** Scan one TypeScript source for any reference to the intake-attempt id. */
export function scanCanonicalIdViolations(file: string, source: string): CanonicalIdFinding[] {
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, /* setParentNodes */ true);
  const findings: CanonicalIdFinding[] = [];

  const push = (node: ts.Node, detail: string): void => {
    const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
    findings.push({ file, line: line + 1, detail });
  };

  const visit = (node: ts.Node): void => {
    // `intakeAttemptId` OR `intake_attempt_id` as an identifier — param, variable, object key
    // (quoted or bare), `.intakeAttemptId` / `.intake_attempt_id` property access, import.
    if (ts.isIdentifier(node) && FORBIDDEN_NAMES.has(node.text)) {
      push(node, `references the intake-attempt id (identifier \`${node.text}\`)`);
    }

    // Either spelling anywhere inside a string or template literal — an exact lookup-key
    // literal, a raw-SQL fragment it's embedded in, or a template literal with substitutions.
    if (
      (ts.isStringLiteral(node) ||
        ts.isNoSubstitutionTemplateLiteral(node) ||
        ts.isTemplateExpression(node)) &&
      FORBIDDEN_PATTERN.test(node.getText(sf))
    ) {
      push(node, `references the intake-attempt id (string/template literal ${node.getText(sf)})`);
    }

    ts.forEachChild(node, visit);
  };

  visit(sf);
  return findings;
}

export function formatFinding(f: CanonicalIdFinding): string {
  return (
    `${f.file}:${f.line} — ${f.detail}. ` +
    `Post-convergence the ONLY canonical id is claim_case_id (Story 6.4 AC6/AC7/AC8). ` +
    `The intake_attempt_id is a temporary channel-originating id, discarded downstream — ` +
    `key this path on claim_case_id instead. See scripts/claim-canonical-id-invariant/README.md.`
  );
}
