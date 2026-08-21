// Story 10.30 — MECHANIZES the non-immediacy mandate (Decision `2026-08-21-147` clause 1(d)).
//
// ⭐ WHY A GATE AND NOT A CONVENTION. This kill switch has a MULTI-MINUTE FLOOR by construction:
// `/members` is declared `cache_policy: edge_cacheable` with `s-maxage=300`, so a Pariwar an operator
// has just unpublished keeps being served real member names from every warm edge PoP — separately
// PER PAGE NUMBER — until those entries expire (`2026-08-21-145` cl.5(e)). The Panel therefore ruled
// that the word may not be used about this control at all.
//
// ⛔ AND THE COPY IS THE WHOLE POINT. An operator who reads "the directory is now hidden" and closes
// the tab believes a Pariwar's members are off the open internet when they demonstrably are not. That
// is not a wording preference; it is the difference between an operator who waits and verifies and an
// operator who reports the pull as complete to the family who asked for it.
//
// ⚠ AND IT WOULD DECAY SILENTLY WITHOUT THIS. Copy gets "tightened" — a later editor who has never
// read `-147` rewrites the success line to something crisper, breaks no test, changes no behaviour,
// and re-introduces exactly the claim the Panel forbade. That is precisely the failure mode a gate
// catches and review does not.
//
// ⚠ SELF-REFERENCE: this file necessarily carries the banned terms as its own search needles, so it
// EXCLUDES ITSELF from the scan by name AND assembles each needle at runtime rather than writing it
// as a quoted literal (the `delivery-terminology-gate.test.ts` defence, both halves). ⛔ Do not
// "simplify" either away — the scan would then hit itself and look like a real violation.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../../..');

/**
 * The surfaces this story INTRODUCED. ⛔ Deliberately narrow: `-147` cl.1(d) binds what this control
 * says about itself, ⛔ not every use of the English language in the monorepo (`immediately` is a
 * perfectly correct word about, say, a synchronous validation error elsewhere). A gate scoped so wide
 * it must be suppressed is a gate nobody keeps.
 *
 * ⛔ `apps/api/src/modules/directory-publication` IS IN SCOPE. AC5 binds the handler/route COMMENTS
 * too, not only the UI strings — a comment claiming the flip takes effect at once misleads the next
 * engineer just as effectively as a label misleads the next operator.
 */
const SCAN_TARGETS = [
  'apps/admin/src/modules/directory-publication',
  'apps/api/src/modules/directory-publication',
  'packages/contracts/src/directory-publication',
  'apps/admin/src/routes/DirectoryPublicationRoute.tsx',
];

/**
 * Review Finding, this story: `apps/admin/src/api/{hooks,client}.ts` are SHARED files this story
 * also added prose to (the query/mutation hooks + typed fetch wrappers), but they carry dozens of
 * OTHER modules' comments too — scanning either file WHOLE hits unrelated, legitimate uses of
 * "immediately" elsewhere in the same file (e.g. the News/Blog "publish immediately" action, a
 * data-rights export comment) and would force this gate to be suppressed, which is the exact
 * failure mode this file's own header warns a wide gate invites. Instead, extract just the section
 * THIS STORY added — bounded by its own section-header comment and the next section's — and scan
 * that snippet only.
 */
const SECTION_TARGETS = [
  {
    file: 'apps/admin/src/api/hooks.ts',
    start: '── Directory-publication kill switch (Story 10.30)',
    end: '── Verifier-console surface (Story 6.10)',
  },
  {
    file: 'apps/admin/src/api/client.ts',
    start: '── Directory-publication kill switch (Story 10.30)',
    end: '── Auth surface (Story 1.9',
  },
] as const;

/** ⛔ Returns '' (never throws) if a marker stops matching — the sanity check below then fails
 *  loudly rather than this gate silently scanning zero content forever. */
function extractSection(target: (typeof SECTION_TARGETS)[number]): string {
  const full = readFileSync(path.join(repoRoot, target.file), 'utf8');
  const startIdx = full.indexOf(target.start);
  if (startIdx === -1) return '';
  const endIdx = full.indexOf(target.end, startIdx + target.start.length);
  if (endIdx === -1) return '';
  return full.slice(startIdx, endIdx);
}

const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', '.turbo', 'coverage', '.git']);
const SCAN_EXT = new Set(['.ts', '.tsx']);

/** This file carries the banned terms as needles; excluding it is what stops a self-hit. */
const SELF = path.basename(fileURLToPath(import.meta.url));

/**
 * ⛔ THE FORBIDDEN TERMS (Decision `2026-08-21-147` clause 1(d)).
 *
 * Assembled by concatenation so this module does not itself contain the literal tokens — belt and
 * braces alongside the self-exclusion above, and it keeps a repo grep for these terms pointing at
 * real violations rather than at this file.
 */
const FORBIDDEN = [
  ['immed', 'iately'].join(''),
  ['insta', 'ntly'].join(''),
  ['right', 'away'].join(' '),
] as const;

/** The disclosure that must be PRESENT — the other half of the mandate (see the assertion below). */
const REQUIRED_DISCLOSURE_NEEDLE = ['s-max', 'age=300'].join('');

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

/**
 * A token guaranteed ABSENT from every scanned file — ⛔ ASSEMBLED AT RUNTIME, never written as a
 * quoted literal, or the revert-sanity assertion below would find itself.
 */
const ABSENT_SENTINEL = ['no', 'such', 'token', 'in', 'any', 'scanned', 'file'].join('-');

describe('Story 10.30 — the kill switch is NOT described as immediate (Decision 2026-08-21-147 cl.1(d))', () => {
  for (const term of FORBIDDEN) {
    it(`⛔ no directory-publication source or copy file uses '${term}'`, () => {
      const hits = filesContaining(term);
      const sectionHits = SECTION_TARGETS.filter((t) =>
        extractSection(t).toLowerCase().includes(term.toLowerCase()),
      ).map((t) => `${t.file}#directory-publication-section`);
      const allHits = [...hits, ...sectionHits];
      expect(
        allHits,
        `'${term}' is FORBIDDEN by Decision 2026-08-21-147 clause 1(d). Found in: ${allHits.join(', ')}.\n` +
          `This control is NOT immediate and cannot be made so from here: /members is declared ` +
          `cache_policy: edge_cacheable with s-maxage=300, so a Pariwar that has just been ` +
          `unpublished keeps being served real member names from every warm edge PoP, PER PAGE ` +
          `NUMBER, until those entries expire (2026-08-21-145 cl.5(e)).\n` +
          `An operator who believes otherwise closes the tab and reports the pull as done while the ` +
          `names are still public. Say what actually happens — the change is saved now and the ` +
          `public pages catch up as their cached copies expire.\n` +
          `If the floor itself is ever reduced, that is a change to the public-pages caching policy ` +
          `and a governance question, NOT a licence to rewrite this copy.`,
      ).toEqual([]);
    });
  }

  // ⛔ FORBIDDING THE WRONG WORDS IS ONLY HALF THE MANDATE. Without this, deleting the disclosure
  // outright would pass every assertion above — silence about the delay satisfies a ban on claiming
  // immediacy while failing AC5's actual requirement, which is that the operator is TOLD.
  it('⭐ the propagation floor is actually DISCLOSED in the operator copy', () => {
    const hits = filesContaining(REQUIRED_DISCLOSURE_NEEDLE).filter((f) =>
      f.startsWith('apps/admin/src/modules/directory-publication'),
    );
    expect(
      hits.length,
      `AC5 requires the console to DISCLOSE the edge-cache propagation floor as standing copy near ` +
        `the toggle — visible before the operator acts, not only after. No file under ` +
        `apps/admin/src/modules/directory-publication names it. Removing the disclosure is not a ` +
        `way to satisfy the ban on the word "immediate".`,
    ).toBeGreaterThan(0);
  });

  it('the gate can actually FAIL — the scanner is not vacuous', () => {
    // ⛔ Revert-sanity. A scan that silently matches nothing would pass forever and prove nothing.
    // A token known to exist in every scanned tree must be found, and a token known not to must not.
    expect(scannedFiles().length, 'the scan must reach at least the four new modules').toBeGreaterThan(4);
    expect(filesContaining('directoryPublication').length).toBeGreaterThan(0);
    expect(filesContaining(ABSENT_SENTINEL)).toEqual([]);
    // ⛔ And each scan target must be individually reachable — a mistyped path would silently shrink
    // the gate to the trees that still resolve, which is the exact way this kind of gate goes hollow.
    for (const target of SCAN_TARGETS) {
      expect(
        walk(path.join(repoRoot, target)).length,
        `scan target '${target}' resolved to ZERO files — the gate is not covering it`,
      ).toBeGreaterThan(0);
    }
    // ⛔ Same discipline for the two extracted shared-file sections: if either marker stops matching
    // (the section is renamed, or its bounding neighbour changes), extraction silently returns '' and
    // the FORBIDDEN checks above would vacuously pass forever.
    for (const section of SECTION_TARGETS) {
      expect(
        extractSection(section).length,
        `section extraction for '${section.file}' (start: '${section.start}') resolved to EMPTY — ` +
          `either marker has drifted and this gate is no longer covering that file's directory-` +
          `publication prose`,
      ).toBeGreaterThan(0);
    }
  });
});
