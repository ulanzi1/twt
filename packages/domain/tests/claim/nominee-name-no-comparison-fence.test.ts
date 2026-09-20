// ⛔⛔ THE NO-COMPARISON FENCE — Story 6.18 (Trap 1, AC4). Pure, DB-free, SOURCE-scanning.
//
// `2026-09-19-226` cl.5 (Trustee-ratified — Dhiraj Rahul + Kalpana Bharti): *"System shouldn't act
// for name mismatch at any time, but display/highlight that approved named is mismatched for
// District Admin, Pariwar Admin, Super Admin."* The highlight comes from the District Admin's
// RECORDED judgement — ⛔ never from a computer comparing two strings.
//
// ⭐ WHY A SOURCE SCAN AND NOT A BEHAVIOURAL TEST. Every other test here asserts what the code DOES.
// This one asserts what it may never CONTAIN, because the failure mode is a future author adding a
// well-meant convenience — a normalize-and-compare, a similarity score, a "looks different" hint —
// that no behavioural test would think to look for. The ruling is a prohibition, so the guard has to
// be one too.
//
// ⚠ It is deliberately NARROW: it scans the files this story owns, for name-comparison shapes only.
// It is ⛔ not a general-purpose linter and must not grow into one.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../../../..');

/** The files that carry the name check. A new one belongs HERE, not outside the fence. */
const FENCED_FILES = [
  'packages/domain/src/claim/nominee-name-check.ts',
  'packages/domain/src/claim/nominee-name-check-persist.ts',
  'packages/contracts/src/claims/nominee-name-check.ts',
  'apps/api/src/modules/claims/claims.nominee-name-check.handlers.ts',
  'apps/api/src/modules/claims/claims.nominee-name-check.routes.ts',
] as const;

/**
 * Shapes that would mean the SYSTEM formed an opinion about two names.
 *
 * Each pattern names a real way this could go wrong, ⛔ not a keyword blocklist for its own sake:
 *   · `levenshtein` / `jaro` / `soundex` / `metaphone` / `fuzzy` — an explicit similarity algorithm.
 *   · `similarity` / `matchScore` — a score, which is a comparison with a number attached.
 *   · `normaliz…(…name…)` then compare — the subtle one: lowercase-and-strip-spaces, then `===`.
 *   · `namesMatch` / `isMatch` / `looksDifferent` — a predicate whose VALUE is the system's opinion.
 */
const FORBIDDEN_PATTERNS: readonly { readonly re: RegExp; readonly why: string }[] = [
  { re: /levenshtein|damerau|jaro|winkler|soundex|metaphone|\bfuzzy\b/i, why: 'a string-similarity algorithm' },
  { re: /similarityScore|matchScore|nameScore|\bsimilarity\s*[:=]/i, why: 'a similarity score' },
  { re: /namesMatch|nameMatches|isNameMatch|looksDifferent|probablyMatch/i, why: 'a name-match predicate' },
  { re: /normalize[A-Za-z]*Name|canonicaliz[A-Za-z]*Name/i, why: 'name normalisation (the prelude to comparing)' },
];

function read(rel: string): string {
  return readFileSync(path.join(repoRoot, rel), 'utf-8');
}

/** Strip comments — the doc-blocks legitimately DISCUSS comparison in order to forbid it. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

describe('⛔ the no-comparison fence (Trap 1, `-226` cl.5)', () => {
  it('every fenced file exists — a renamed file must be re-listed, never silently dropped', () => {
    // ⭐ Without this, deleting a path from FENCED_FILES would make the whole fence vacuous and
    // every assertion below would still pass.
    for (const f of FENCED_FILES) {
      expect(() => read(f), `fenced file missing: ${f}`).not.toThrow();
    }
    expect(FENCED_FILES.length).toBeGreaterThanOrEqual(5);
  });

  it('⛔ no fenced file contains a name-comparison shape', () => {
    for (const f of FENCED_FILES) {
      const code = stripComments(read(f));
      for (const { re, why } of FORBIDDEN_PATTERNS) {
        expect(re.test(code), `${f} contains ${why} — the system must never form an opinion about two names`).toBe(
          false,
        );
      }
    }
  });

  it('⛔⛔ the WRITE PATH never reads a name at all — it cannot compare what it cannot reach', () => {
    // ⭐ This is the structural half of Trap 1/Trap 4: `recordNomineeNameCheck` records a human's
    // judgement, and it is built so that reaching a name would require a NEW import. The
    // `nominee/declaration-ref.ts` accessor projects only `(rank, created_at)` precisely so this
    // property is a fact about the TYPES, not about the author's discipline.
    const code = stripComments(read('packages/domain/src/claim/nominee-name-check-persist.ts'));
    for (const forbidden of [
      'nameCiphertext',
      'accountHolderNameCiphertext',
      'decrypt',
      'getMemberNominees(',
    ]) {
      expect(code.includes(forbidden), `the check writer reached for '${forbidden}'`).toBe(false);
    }
    // And it uses the ref-only accessor, which has no name field to reach for.
    expect(code).toContain('getMemberNomineeDeclarationRefs');
  });

  it('⛔ the APPROVAL GATES decide on recorded verdicts and timestamps — never on names', () => {
    const code = stripComments(read('packages/domain/src/claim/nominee-name-check.ts'));
    // The gate's vocabulary: verdicts, tokens, timestamps.
    expect(code).toContain('nomineeNameCheckPasses');
    expect(code).toContain('isNomineeNameCheckCurrent');
    // ⛔ And no decryption anywhere in the module that owns the gate.
    expect(code.includes('decrypt')).toBe(false);
    expect(code.includes('nameCiphertext')).toBe(false);
  });

  it('⛔ the clerical vocabulary carries no escape hatch and no transliteration', () => {
    // A future `other` would let a District Admin approve past the judgement cl.6 asked them to
    // make; a future `transliteration` would reverse `-227` cl.9 outright.
    const code = read('packages/domain/src/claim/nominee-name-check.ts');
    const tuple = /NOMINEE_NAME_CLERICAL_REASONS = \[([^\]]*)\]/.exec(code);
    expect(tuple, 'the clerical-reason tuple could not be found').not.toBeNull();
    const values = tuple![1]!;
    expect(values).toContain('initial');
    expect(values).toContain('married_name');
    expect(values).toContain('bank_shortened_name');
    expect(values).not.toContain('other');
    expect(values).not.toContain('transliteration');
  });
});
