// The OVER/UNDER SINGLE-SOURCE fence — Story 9.11 (AC2/AC8), DB-free.
//
// `classifyAmountMismatchDirection` (packages/domain/src/pool/contribution-binding.ts) is the CANONICAL,
// only-place-in-the-codebase definition of what "over-payment" and "under-payment" MEAN. The failure mode
// this fence prevents is concrete: six months out, someone writes `if (deposited > expected)` inline inside
// mobile / admin / reporting / analytics / helpdesk — and now the meaning of "over" has quietly forked
// across surfaces (one uses `>`, another `>=`; one compares INR, another paise). A forked "over" is a
// governance bug — an over-payment shown as an under-payment (or vice versa) misdirects a human's off-band
// recovery decision (Dev Notes → *classifyAmountMismatchDirection is the single source of truth*).
//
// So: the two comparison operands appear in a `<`/`>`/`<=`/`>=` comparison in EXACTLY ONE file —
// contribution-binding.ts, inside the helper. This fence makes that executable by scanning the whole
// source tree and FAILING if any OTHER file textually compares the two amount fields
// (`depositedAmountPaise`/`expectedAmountPaise`) or a locally-destructured deposited-vs-expected pair.
// Revert-sanity: a planted `if (depositedAmountPaise > expectedAmountPaise)` in any consumer turns this red.
//
// [[feedback_gate_scope_semantic_coverage]] — teeth, not a green happy path: the pattern's own self-check
// (below) proves it matches its targets and does NOT match arrow functions / generics (the false-positive
// traps the no-ingest-path fence documents).

import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');

/** The source roots every consumer of the over/under direction could live in. */
const SCANNED_ROOTS = ['packages', 'apps'];

const SCANNED_EXTENSIONS = ['.ts', '.tsx', '.mts', '.cts'];

/** The ONE file allowed to compare the two amounts — the canonical helper's own home. */
const CANONICAL_FILE_SUFFIX = 'packages/domain/src/pool/contribution-binding.ts';

/** Directory names PRUNED during the walk — never descended into (skipping them AFTER a recursive
 *  readdir would still traverse every node_modules, which is pathologically slow). */
const PRUNED_DIRS = new Set(['node_modules', 'dist', '.turbo', '.next', 'build', 'coverage']);

/** Skip tests + the canonical helper — only real shipping source is in scope. */
function isExcludedFile(rel: string): boolean {
  return (
    rel.endsWith(CANONICAL_FILE_SUFFIX) ||
    rel.includes('/tests/') ||
    rel.includes('/__tests__/') ||
    rel.endsWith('.test.ts') ||
    rel.endsWith('.test.tsx') ||
    rel.endsWith('.spec.ts') ||
    rel.endsWith('.spec.tsx')
  );
}

/** A manual recursive walk that PRUNES vendored/build dirs at the directory boundary (fast). */
function collectSourceFiles(rel: string): string[] {
  const out: string[] = [];
  const walk = (dirRel: string): void => {
    for (const e of readdirSync(path.join(repoRoot, dirRel), { withFileTypes: true })) {
      if (e.isDirectory()) {
        if (!PRUNED_DIRS.has(e.name)) walk(path.join(dirRel, e.name));
      } else if (e.isFile() && SCANNED_EXTENSIONS.some((ext) => e.name.endsWith(ext))) {
        const fileRel = path.join(dirRel, e.name);
        if (!isExcludedFile(fileRel)) out.push(fileRel);
      }
    }
  };
  walk(rel);
  return out;
}

const scannedFiles: string[] = SCANNED_ROOTS.flatMap((rel) => collectSourceFiles(rel));

const readRaw = (rel: string): string => readFileSync(path.join(repoRoot, rel), 'utf8');

/**
 * Blank out comment CONTENT (both `//` line comments and JSDoc-style block comments) while PRESERVING
 * newlines, so the scan sees only CODE and line numbers stay intact. This guard exists to catch a real inline
 * `deposited > expected`
 * COMPARISON — not documentation prose that merely mentions the concept (this file's own doc comments, and
 * the derivation helpers' comments, legitimately write "deposited > expected" as English). A comment cannot
 * fork the meaning of "over" — only executed code can. (Strings/regex literals holding `//` are an accepted
 * edge; the amount identifiers never appear in a string literal beside a comparison operator.)
 */
function stripComments(src: string): string {
  let out = '';
  let state: 'code' | 'line' | 'block' = 'code';
  for (let i = 0; i < src.length; i += 1) {
    const two = src.slice(i, i + 2);
    if (state === 'code') {
      if (two === '//') { state = 'line'; out += '  '; i += 1; continue; }
      if (two === '/*') { state = 'block'; out += '  '; i += 1; continue; }
      out += src[i];
    } else if (state === 'line') {
      if (src[i] === '\n') { state = 'code'; out += '\n'; continue; }
      out += src[i] === '\t' ? '\t' : ' ';
    } else {
      if (two === '*/') { state = 'code'; out += '  '; i += 1; continue; }
      out += src[i] === '\n' ? '\n' : ' ';
    }
  }
  return out;
}

const read = (rel: string): string => stripComments(readRaw(rel));

// A relational comparison (`<`/`>`/`<=`/`>=`) DIRECTLY between a deposited-amount token and an
// expected-amount token, in either order. Adjacency (only whitespace between the two operands) keeps the
// signal high and dodges the `=>` arrow / `Array<T>` generic false positives (there is always a `,`/`)`/`=`
// between the identifiers in those). Covers both the carried PAISE fields (`depositedAmountPaise` /
// `expectedAmountPaise`) and a locally-destructured `deposited`/`expected` pair.
const FORKED_OVER_UNDER_PATTERNS: readonly RegExp[] = [
  /deposited\w*\s*(?:<=?|>=?)\s*expected\w*/i,
  /expected\w*\s*(?:<=?|>=?)\s*deposited\w*/i,
];

describe('AC2/AC8 — over/under has exactly one definition (classifyAmountMismatchDirection)', () => {
  it('no source file OTHER than the canonical helper compares deposited vs expected amounts', () => {
    const offenders: string[] = [];
    for (const file of scannedFiles) {
      read(file)
        .split('\n')
        .forEach((line, i) => {
          for (const pat of FORKED_OVER_UNDER_PATTERNS) {
            const m = line.match(pat);
            if (m) offenders.push(`${file}:${i + 1} — ${m[0].trim()}`);
          }
        });
    }

    expect(
      offenders,
      `a second over/under comparison appeared — the meaning of "over" has forked.\n` +
        `Derive direction by calling classifyAmountMismatchDirection (packages/domain/src/pool/contribution-binding.ts);\n` +
        `never compare depositedAmountPaise vs expectedAmountPaise inline (Story 9.11, AC2).\n  ${offenders.join('\n  ')}`,
    ).toEqual([]);
  });

  it('the scan actually reached the shipping tree (a scan over zero files proves nothing)', () => {
    expect(scannedFiles.length).toBeGreaterThan(100);
    // The carried field names must appear SOMEWHERE (they are read + passed to the helper) — proof the
    // roots/extensions are right and the fence would see a real comparison if one were added.
    const corpus = scannedFiles.map(read).join('\n');
    expect(corpus).toContain('depositedAmountPaise');
    expect(corpus).toContain('expectedAmountPaise');
  });

  it('the forked-comparison pattern is itself live (matches its targets, ignores arrows/generics)', () => {
    // Must MATCH — the exact forks this fence exists to catch.
    for (const sample of [
      'if (depositedAmountPaise > expectedAmountPaise)',
      'return expectedAmountPaise <= depositedAmountPaise;',
      'const over = deposited > expected;',
      'expected < deposited',
    ]) {
      expect(
        FORKED_OVER_UNDER_PATTERNS.some((p) => p.test(sample)),
        sample,
      ).toBe(true);
    }
    // Must NOT match — arrow functions + generics that merely mention the tokens (the FP traps).
    for (const sample of [
      'const f = (deposited, expected) => deposited;',
      'function g(depositedAmountPaise: number, expectedAmountPaise: number) {}',
      'const pair: Array<{ deposited: number; expected: number }> = [];',
      'classifyAmountMismatchDirection({ depositedPaise, expectedPaise })',
    ]) {
      expect(
        FORKED_OVER_UNDER_PATTERNS.some((p) => p.test(sample)),
        sample,
      ).toBe(false);
    }
  });
});
