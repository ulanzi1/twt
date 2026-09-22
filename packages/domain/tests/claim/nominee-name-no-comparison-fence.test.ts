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

/**
 * The files that carry the name check. A new one belongs HERE, not outside the fence.
 *
 * ⚠⚠ THIS LIST WENT STALE ONCE AND THE FENCE SILENTLY STOPPED COVERING THE VERDICT LOGIC.
 * The second implementation pass split two modules out of `nominee-name-check.ts` (to break an
 * import cycle) and did NOT add them here. Both compute `current` / `passing` / `differenceReasons`
 * — the derivation `-226` cl.5 exists to constrain — and both declare in their OWN headers that
 * Traps 1 and 4 apply to them, while sitting outside the guard that enforces it. The file-existence
 * test below still passed, because it only checks that the LISTED files exist.
 * ⇒ when a `nominee-name-*` or correction-read module is added, it belongs in this array in the
 *    SAME commit. The floor below is raised with it, so a silent deletion cannot re-open the hole.
 */
const FENCED_FILES = [
  'packages/domain/src/claim/nominee-name-check.ts',
  'packages/domain/src/claim/nominee-name-check-persist.ts',
  'packages/domain/src/claim/nominee-name-check-read.ts',
  'packages/domain/src/claim/correction-queue-read.ts',
  'packages/contracts/src/claims/nominee-name-check.ts',
  'apps/api/src/modules/claims/claims.nominee-name-check.handlers.ts',
  'apps/api/src/modules/claims/claims.nominee-name-check.routes.ts',
  // ⭐ THE THREE AC4 GATE CALL SITES (Task 7 sub-item 1: "the read, the write and THE GATES").
  // Each calls `assertNomineeNameCheckForApproval`. They are the places an author under deadline
  // would most plausibly reach for a name to "just check" before approving — so the prohibition
  // has to reach them, ⛔ not stop at the modules that record the verdict.
  'packages/domain/src/claim/verifier-decision-persist.ts',
  'packages/domain/src/claim/state-trustee-decision-persist.ts',
  'packages/domain/src/claim/r9-voting-persist.ts',
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
  { re: /normali[sz]e[A-Za-z]*Name|canonicali[sz]e[A-Za-z]*Name/i, why: 'name normalisation (the prelude to comparing)' },
  // ⭐ ADDED because the four patterns above were KEYWORDS, ⛔ not the RULE. `-226` cl.5 forbids the
  // SYSTEM forming an opinion about two names — and the cheapest way to do that ⛔ never mentions
  // "name" at all. ⚠ Note the British spelling is now covered above: this repo writes `normalise`.
  { re: /localeCompare|Intl\.Collator/i, why: 'a locale comparison — an opinion about two strings' },
  // ⚠ 2026-09-22 (code review): the `trim()===` alternative required the character right after
  // `===` to be a bare lowercase letter, so `holder.trim() === "priya sharma"` (a QUOTED literal —
  // at least as realistic as a bare identifier) slipped past every alternative in this pattern.
  // Widened to also match a quote immediately followed by a letter (a quoted name-shaped literal) —
  // ⚠ NOT a bare quote pair, or `actorDisplay.trim() === ''` (a legitimate blank-string check,
  // `nominee-name-check-persist.ts:109`) would false-positive as a name comparison.
  { re: /toLowerCase\(\)\s*===|toUpperCase\(\)\s*===|trim\(\)\s*===\s*(['"][a-z]|[a-z])/i, why: 'a normalise-then-equals comparison' },
  { re: /names_match|name_matches|similarity_score|match_score/i, why: 'a snake_case comparison field on the wire' },
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
    expect(FENCED_FILES.length).toBeGreaterThanOrEqual(10);
  });

  it('⭐⭐ POSITIVE CONTROL — the scanner actually FIRES on a planted violation of every pattern', () => {
    // ⚠⚠ WITHOUT THIS THE WHOLE FENCE IS UNFALSIFIABLE. Every other assertion here is of the form
    // "this pattern did NOT match" — which is exactly what a broken regex, an over-eager
    // `stripComments`, or a typo'd character class also produces. A green fence would then prove
    // ⛔ nothing, which is the failure mode [[feedback_gate_scope_semantic_coverage]] describes:
    // a scan is only worth its green if at least one input is known to turn it red.
    //
    // ⭐ Each specimen is a REAL shape someone could plausibly write while "just being helpful",
    // ⛔ not a keyword pasted to satisfy the regex.
    const SPECIMENS: readonly { readonly src: string; readonly why: string }[] = [
      { src: 'const d = levenshtein(a, b);', why: 'a string-similarity algorithm' },
      { src: 'const matchScore = score(a, b);', why: 'a similarity score' },
      { src: 'if (namesMatch(declared, holder)) return true;', why: 'a name-match predicate' },
      // ⭐ British spelling on purpose: this repo writes `normalise`, and the original pattern only
      // covered `normalize`. That gap is what this specimen exists to keep closed.
      { src: 'const x = normaliseNomineeName(n);', why: 'name normalisation (the prelude to comparing)' },
      { src: 'if (a.localeCompare(b) === 0) return true;', why: 'a locale comparison — an opinion about two strings' },
      { src: 'if (a.toLowerCase() === b.toLowerCase()) return true;', why: 'a normalise-then-equals comparison' },
      { src: 'type Wire = { names_match: boolean };', why: 'a snake_case comparison field on the wire' },
    ];

    // ⭐ Every pattern must be exercised — otherwise a pattern could rot unnoticed behind the others.
    expect(SPECIMENS.length).toBe(FORBIDDEN_PATTERNS.length);

    for (const { src, why } of SPECIMENS) {
      const pattern = FORBIDDEN_PATTERNS.find((p) => p.why === why);
      expect(pattern, `no FORBIDDEN_PATTERNS entry has why='${why}' — specimen and pattern have drifted apart`).toBeDefined();
      expect(
        pattern?.re.test(stripComments(src)),
        `the fence FAILED TO CATCH a planted violation (${why}): ${src}`,
      ).toBe(true);
    }

    // ⛔ And the comment-stripper must not be how a violation hides: the same shape inside a comment
    // is legitimately invisible, which is WHY the specimens above are bare code.
    expect(stripComments('// const d = levenshtein(a, b);').trim()).toBe('');
    // ⭐ 2026-09-22 (code review): the `//` case above only exercises HALF of `stripComments`' own
    // regex (`.replace(/\/\*[\s\S]*?\*\//g, ...)` for block comments, `.replace(/^\s*\/\/.*$/gm,
    // ...)` for line comments) — the `/* … */` branch was never proven. A regression there (a
    // greedy match eating real code, or an unterminated-block edge case) could hide or wrongly
    // strip production code with nothing here to notice.
    expect(stripComments('/* const d = levenshtein(a, b); */').trim()).toBe('');
  });

  it('⭐⭐ EVERY ALTERNATIVE inside a multi-way pattern fires on its own — ⛔ not just the ONE the pattern-level control above happens to exercise', () => {
    // ⚠⚠ ADDED 2026-09-22 (code review). The positive control above pairs exactly one specimen with
    // each `FORBIDDEN_PATTERNS` entry, so it proves each ENTRY can fire — but every entry here is
    // itself a `|`-separated alternation, and a typo or scoping mistake in an UNTESTED alternative
    // (e.g. `soundex` inside the string-similarity pattern) would disable detection of that one
    // shape while every other assertion in this file stays green.
    const ALTERNATIVE_SPECIMENS: readonly { readonly pattern: RegExp; readonly src: string }[] = [
      // string-similarity algorithm — `levenshtein` alone is covered by the control above.
      { pattern: FORBIDDEN_PATTERNS[0]!.re, src: 'const d = damerau(a, b);' },
      { pattern: FORBIDDEN_PATTERNS[0]!.re, src: 'const d = jaroWinkler(a, b);' },
      { pattern: FORBIDDEN_PATTERNS[0]!.re, src: 'const d = soundex(a);' },
      { pattern: FORBIDDEN_PATTERNS[0]!.re, src: 'const d = metaphone(a);' },
      { pattern: FORBIDDEN_PATTERNS[0]!.re, src: 'if (fuzzy(a, b)) return true;' },
      // similarity score — `matchScore` alone is covered by the control above.
      { pattern: FORBIDDEN_PATTERNS[1]!.re, src: 'const s = similarityScore(a, b);' },
      { pattern: FORBIDDEN_PATTERNS[1]!.re, src: 'const s = nameScore(a, b);' },
      { pattern: FORBIDDEN_PATTERNS[1]!.re, src: 'const similarity = 0.9;' },
      // name-match predicate — `namesMatch` alone is covered by the control above.
      { pattern: FORBIDDEN_PATTERNS[2]!.re, src: 'if (nameMatches(a, b)) return true;' },
      { pattern: FORBIDDEN_PATTERNS[2]!.re, src: 'if (isNameMatch(a, b)) return true;' },
      { pattern: FORBIDDEN_PATTERNS[2]!.re, src: 'if (looksDifferent(a, b)) return true;' },
      { pattern: FORBIDDEN_PATTERNS[2]!.re, src: 'if (probablyMatch(a, b)) return true;' },
      // name normalisation — the `normalise…Name` spelling alone is covered by the control above.
      { pattern: FORBIDDEN_PATTERNS[3]!.re, src: 'const x = normalizeNomineeName(n);' }, // US spelling
      { pattern: FORBIDDEN_PATTERNS[3]!.re, src: 'const x = canonicaliseHolderName(n);' },
      { pattern: FORBIDDEN_PATTERNS[3]!.re, src: 'const x = canonicalizeHolderName(n);' },
      // locale comparison — `localeCompare` alone is covered by the control above.
      { pattern: FORBIDDEN_PATTERNS[4]!.re, src: 'if (new Intl.Collator().compare(a, b) === 0) return true;' },
      // normalise-then-equals — `toLowerCase() ===` alone is covered by the control above.
      { pattern: FORBIDDEN_PATTERNS[5]!.re, src: 'if (a.toUpperCase() === b.toUpperCase()) return true;' },
      { pattern: FORBIDDEN_PATTERNS[5]!.re, src: "if (holder.trim() === nominee.trim()) return true;" },
      // ⭐ the quoted-literal gap the widened pattern above exists to close.
      { pattern: FORBIDDEN_PATTERNS[5]!.re, src: 'if (holder.trim() === "priya sharma") return true;' },
      // snake_case comparison field on the wire — `names_match` alone is covered by the control above.
      { pattern: FORBIDDEN_PATTERNS[6]!.re, src: 'type Wire = { name_matches: boolean };' },
      { pattern: FORBIDDEN_PATTERNS[6]!.re, src: 'type Wire = { similarity_score: number };' },
      { pattern: FORBIDDEN_PATTERNS[6]!.re, src: 'type Wire = { match_score: number };' },
    ];

    for (const { pattern, src } of ALTERNATIVE_SPECIMENS) {
      expect(pattern.test(stripComments(src)), `an alternative of ${pattern} failed to catch: ${src}`).toBe(true);
    }
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
