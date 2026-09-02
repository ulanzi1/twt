// Story 11b.3a — MECHANIZES **AC6**, both halves.
//
// ⭐ WHY A GATE AND NOT A CONVENTION, and why it is SHARPER here than on its 10.30 sibling.
// This knob has a MULTI-MINUTE FLOOR by construction: `/sahyog-vivran/[poolCanonicalIdentifier]` is
// declared `cache_policy: edge_cacheable` with `s-maxage=300`, so the PREVIOUS projection keeps being
// served from every warm edge PoP until those entries expire. ⚠⛔ AND WHAT IS SERVED STALE HERE IS A
// **FULL ACCOUNT NUMBER** — where the directory kill switch leaks a name, this leaks the account the
// money is paid into.
//
// ⛔ AND AC6 HAS A SECOND PROHIBITION THE SIBLING GATE DOES NOT CARRY: *"direct SQL is NOT offered as
// the operational fallback, in the copy or anywhere else."* An operator told to "just run an UPDATE"
// bypasses the rationale, the actor snapshot and the §1.5 audit anchor that ARE the accountability
// `2026-08-28-160` cl.10 requires — and `2026-08-21-147` cl.1(c) already withdrew hand-run SQL as an
// acceptable answer for the sibling control.
//
// ⚠ AND IT WOULD DECAY SILENTLY WITHOUT THIS. Copy gets "tightened" — a later editor who has never
// read cl.10 rewrites the success line to something crisper, breaks no test, changes no behaviour,
// and re-introduces exactly the claim AC6 forbids. That is precisely the failure mode a gate catches
// and review does not.
//
// ⚠ SELF-REFERENCE: this file necessarily carries the banned terms as its own search needles, so it
// EXCLUDES ITSELF from the scan by name AND assembles each needle at runtime rather than writing it
// as a quoted literal (the `directory-publication-terminology.test.ts` defence, both halves). ⛔ Do
// not "simplify" either away — the scan would then hit itself and look like a real violation.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../../..');

/**
 * The surfaces this story INTRODUCED. ⛔ Deliberately narrow: AC6 binds what THIS control says about
 * itself, ⛔ not every use of the English language in the monorepo. A gate scoped so wide it must be
 * suppressed is a gate nobody keeps.
 *
 * ⭐ ALL THREE OF AC6'S PLACES ARE IN SCOPE, and that is the point of the list: the admin copy, the
 * SCHEMA FILE and the PUBLIC ROUTE HEADER. AC6 requires the statement in all three *"because this is
 * the property most likely to be discovered during an incident rather than before one"* — so a gate
 * covering only the console would let two of the three rot.
 * ⛔ The API module and the contracts are in scope too: a comment claiming the change takes effect at
 * once misleads the next engineer just as effectively as a label misleads the next operator.
 */
const SCAN_TARGETS = [
  'apps/admin/src/modules/nominee-bank-masking',
  'apps/admin/src/routes/NomineeBankMaskingRoute.tsx',
  'apps/api/src/modules/nominee-bank-masking',
  'packages/contracts/src/nominee-bank-masking',
  'packages/domain/src/schema/pariwar_nominee_bank_masking_schedule.ts',
  'packages/domain/src/claim/nominee-bank-masking-policy.ts',
  'apps/api/src/modules/public-pages/routes.ts',
];

const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', '.turbo', 'coverage', '.git']);
const SCAN_EXT = new Set(['.ts', '.tsx']);

/** This file carries the banned terms as needles; excluding it is what stops a self-hit. */
const SELF = path.basename(fileURLToPath(import.meta.url));

/**
 * ⛔ THE FORBIDDEN TERMS (AC6, on `2026-08-21-147` cl.1(d)'s model).
 *
 * Assembled by concatenation so this module does not itself contain the literal tokens — belt and
 * braces alongside the self-exclusion above, and it keeps a repo grep for these terms pointing at
 * real violations rather than at this file.
 *
 * ⚠ The last two are AC6's SECOND prohibition: ⛔ direct SQL may ⛔ not be offered as the operational
 * fallback, in the copy or anywhere else.
 */
const FORBIDDEN = [
  ['immed', 'iately'].join(''),
  ['insta', 'ntly'].join(''),
  ['right', 'away'].join(' '),
  ['run a ', 'SQL'].join(''),
  ['direct ', 'database access'].join(''),
] as const;

/**
 * The disclosure that must be PRESENT in EACH of AC6's three places — the other half of the mandate.
 * ⛔ Assembled at runtime for the same reason as the needles above.
 */
const REQUIRED_DISCLOSURE_NEEDLE = ['s-max', 'age=300'].join('');

/** AC6's three places, each of which must carry the disclosure on its own. */
const REQUIRED_DISCLOSURE_SITES = [
  'apps/admin/src/modules/nominee-bank-masking',
  'packages/domain/src/schema/pariwar_nominee_bank_masking_schedule.ts',
  'apps/api/src/modules/public-pages/routes.ts',
] as const;

/**
 * A token guaranteed ABSENT from every scanned file — ⛔ assembled at runtime, never a quoted
 * literal, or the revert-sanity assertion below would find itself.
 */
const ABSENT_SENTINEL = ['no', 'such', 'token', 'in', 'any', 'scanned', 'file'].join('-');

function walk(entry: string, out: string[] = []): string[] {
  let stats;
  try {
    stats = statSync(entry);
  } catch {
    return out; // a target that does not exist yet is not a violation
  }
  if (!stats.isDirectory()) {
    if (SCAN_EXT.has(path.extname(entry)) && path.basename(entry) !== SELF) out.push(entry);
    return out;
  }
  for (const child of readdirSync(entry)) {
    if (SKIP_DIRS.has(child)) continue;
    walk(path.join(entry, child), out);
  }
  return out;
}

/** Every scanned file, repo-absolute. */
function scannedFiles(): string[] {
  const files: string[] = [];
  for (const target of SCAN_TARGETS) walk(path.join(repoRoot, target), files);
  return files;
}

/** Repo-relative paths of scanned files containing `needle` (case-insensitive). */
function filesContaining(needle: string): string[] {
  const lowered = needle.toLowerCase();
  return scannedFiles()
    .filter((file) => readFileSync(file, 'utf8').toLowerCase().includes(lowered))
    .map((file) => path.relative(repoRoot, file))
    .sort();
}

describe('Story 11b.3a — the masking knob is NOT described as immediate, and SQL is not offered (AC6)', () => {
  for (const term of FORBIDDEN) {
    it(`⛔ no nominee-bank-masking source or copy file uses '${term}'`, () => {
      const hits = filesContaining(term);
      expect(
        hits,
        `'${term}' is FORBIDDEN by Story 11b.3a AC6. Found in: ${hits.join(', ')}.\n` +
          `This control is NOT immediate and cannot be made so from here: ` +
          `/sahyog-vivran/[poolCanonicalIdentifier] is declared cache_policy: edge_cacheable with ` +
          `s-maxage=300, so the PREVIOUS projection keeps being served from every warm edge PoP ` +
          `until those entries expire — and here that projection can be a FULL ACCOUNT NUMBER.\n` +
          `And direct SQL is NOT the operational fallback: it bypasses the required rationale, the ` +
          `actor snapshot and the §1.5 audit anchor that ARE the accountability 2026-08-28-160 ` +
          `cl.10 requires, and 2026-08-21-147 cl.1(c) already withdrew hand-run SQL as an ` +
          `acceptable answer for the sibling control.\n` +
          `An operator who believes otherwise closes the tab and reports the change as done while ` +
          `the account number is still public. Say what actually happens — the change is saved now ` +
          `and the public pages catch up as their cached copies expire.\n` +
          `If the floor itself is ever reduced, that is a change to the public-pages caching policy ` +
          `and a governance question, NOT a licence to rewrite this copy.`,
      ).toEqual([]);
    });
  }

  // ⛔ FORBIDDING THE WRONG WORDS IS ONLY HALF THE MANDATE. Without this, deleting the disclosure
  // outright would pass every assertion above — silence about the delay satisfies a ban on claiming
  // immediacy while failing AC6's actual requirement, which is that it is STATED, in THREE places.
  for (const site of REQUIRED_DISCLOSURE_SITES) {
    it(`⭐ the propagation floor is DISCLOSED at '${site}' (AC6 names THREE places)`, () => {
      const hits = filesContaining(REQUIRED_DISCLOSURE_NEEDLE).filter((f) => f.startsWith(site));
      expect(
        hits.length,
        `AC6 requires the non-immediacy statement in THREE places — the admin surface, the schema ` +
          `file and the route header — "because this is the property most likely to be discovered ` +
          `during an incident rather than before one". Nothing under '${site}' names it. Removing ` +
          `the disclosure is not a way to satisfy the ban on the word "immediate".`,
      ).toBeGreaterThan(0);
    });
  }

  it('the gate can actually FAIL — the scanner is not vacuous', () => {
    // ⛔ Revert-sanity. A scan that silently matches nothing would pass forever and prove nothing.
    // A token known to exist in every scanned tree must be found, and a token known not to must not.
    expect(scannedFiles().length, 'the scan must reach every declared target').toBeGreaterThan(5);
    expect(filesContaining('masking').length).toBeGreaterThan(0);
    expect(filesContaining(ABSENT_SENTINEL)).toEqual([]);
    // ⛔ And each scan target must be individually reachable — a mistyped path would silently shrink
    // the gate to the trees that still resolve, which is the exact way this kind of gate goes hollow.
    for (const target of SCAN_TARGETS) {
      expect(
        walk(path.join(repoRoot, target)).length,
        `scan target '${target}' resolved to ZERO files — the gate is not covering it`,
      ).toBeGreaterThan(0);
    }
  });
});
