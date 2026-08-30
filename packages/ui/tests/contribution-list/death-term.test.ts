// AC5 (b) — THE LIFECYCLE-TERM SCAN, over RAW TEXT, in TWO SCOPES, asserting ⛔ ABSENCE IN BOTH.
//
// ⛔⛔ TWO TESTS, TWO MECHANISMS — ⛔ DO NOT MERGE THIS WITH `forbidden-imports.test.ts`. That one scans
// PARSED IMPORT SPECIFIERS; one of these terms is NEVER an import specifier, so merging them would make this
// half true for every possible source file, forever — the vacuous-fence class commit `38a2d8b` closed en
// masse, re-created inside the test written to prevent it ([[feedback_gate_scope_semantic_coverage]]).
//
// ⭐⛔ WHY THIS FENCE EXISTS — THE C-5 CORRECTION INVERTS ON A CONTRIBUTOR READ.
// The epic instructs authors to ADD the account-lifecycle overlay conjunct to predicates that lack it,
// because Story 11a.3 wrongly PUBLISHED a member it should not have. ⚠ The SAME correction applied to a
// CONTRIBUTOR read silently DELETES people from the historical record — "the right conjunct in the wrong
// read" (`2026-08-24-159` cl.11), which rules that NO lifecycle-derived predicate may filter, mask or
// anonymize a contributor row, on any surface, at any tier. A contribution made while a member was alive
// stays in the record with their name on it.
//
// ⚠⛔ THE COMMENT SCOPE IS THE POINT, AND IT IS NOT DECORATION. The idea enters as a COMMENT ("we should
// exclude these contributors here") long before it enters as a conjunct, and a doc-block is where it lands
// first.
//
// ⛔⛔ NOTHING IN THIS FILE EVER ASSERTS A TERM IS *PRESENT*. There is ONE direction — ABSENCE — over TWO
// SCOPES. An earlier wording ("assert them in the comments too") parses as *assert them present*; a dev who
// takes that reading writes `expect(comments).toContain(...)`, watches it red-fail, and reaches the cheapest
// green — ADDING the term to a doc-block, manufacturing the exact artefact this test exists to keep out.

import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const MODULE_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../src/contribution-list',
);

const COMMENT_RE = /\/\*[\s\S]*?\*\/|\/\/.*$/gm;

/** Split a source file into its code (comments removed) and its comments (code removed). */
function scopes(file: string): { code: string; comments: string } {
  const raw = readFileSync(path.join(MODULE_DIR, file), 'utf8');
  return {
    code: raw.replace(COMMENT_RE, ''),
    comments: (raw.match(COMMENT_RE) ?? []).join('\n'),
  };
}

// ⭐ readdirSync, ⛔ never a hardcoded file list.
const moduleFiles = readdirSync(MODULE_DIR).filter((f) => f.endsWith('.ts'));

const FORBIDDEN_TERMS = [
  'account-frozen',
  'account_frozen',
  'deceased',
  'members.state',
  'date_of_death',
] as const;

describe('AC5 (b) — ⛔ no lifecycle-overlay term reaches this module, in code OR in comments', () => {
  it('the module is non-empty and both scopes carry text (the scan is not vacuous)', () => {
    expect(moduleFiles.length).toBeGreaterThanOrEqual(4);
    const all = moduleFiles.map(scopes);
    expect(all.some((s) => s.code.trim().length > 0)).toBe(true);
    expect(all.some((s) => s.comments.trim().length > 0)).toBe(true);
  });

  for (const file of moduleFiles) {
    for (const term of FORBIDDEN_TERMS) {
      it(`${file} — '${term}' is ABSENT from the code`, () => {
        expect(
          scopes(file).code.toLowerCase().includes(term),
          `${file}'s CODE references '${term}' — a lifecycle-derived predicate on a contributor read deletes people from the historical record`,
        ).toBe(false);
      });

      it(`${file} — '${term}' is ABSENT from the comments`, () => {
        expect(
          scopes(file).comments.toLowerCase().includes(term),
          `${file}'s COMMENTS reference '${term}' — the wrong conjunct arrives as an idea before it arrives as code`,
        ).toBe(false);
      });
    }
  }
});
