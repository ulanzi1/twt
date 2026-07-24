// The NO-INGEST-PATH fence — Story 8.10 (AC5), DB-free.
//
// "The trust system does not track, audit, or reconcile out-of-band contributions" (epics.md:3037) is
// a STRUCTURAL commitment, and the correct engineering artefact for it is the demonstrable ABSENCE of
// a data path — not a new one. This file makes that absence executable, in two halves:
//
//   (1) THE COMPLETE INGEST VOCABULARY IS THREE. Every contribution fact a member can ever see —
//       a yellow pill, a green confirmation, a red mismatch, a pool progress meter, a contributor
//       list, a Yogdaan Bahi row — is derived from exactly three event types:
//         · contribution.utr-attested            (8.4, member claim / yellow)
//         · contribution.confirmed               (Epic 9, reconciliation verdict / green)
//         · contribution.reconciliation-mismatch (Epic 9, reconciliation verdict / red)
//       Pinned against the SHIPPED constants (imported, never re-declared) AND against a source scan,
//       so a fourth `contribution.*` literal introduced anywhere in the vocabulary fails here. There is
//       no fourth door through which an out-of-band gift could reach a pool stat.
//
//   (2) NO OUT-OF-BAND-SHAPED SURFACE EXISTS. No table, column, event type, or identifier named
//       out_of_band / direct_gift / outside_payment / gift_* anywhere in the schema or the event
//       vocabularies — the schema-diff gate's zero-surface posture, expressed as a unit test.
//
// Adding an "out-of-band gift" field/table/event is unsafe operation (a) of epics.md:3039. This fence is
// the thing that makes it fail at PR time rather than in a review comment. Revert-sanity proven (a
// planted fourth event type + a planted schema column → red → revert → green); see the Dev Agent Record.
//
// Policy of record: docs/policies/out-of-band-contributions.md.

import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  CONTRIBUTION_EVENT_PAYLOAD_SCHEMAS,
  CONTRIBUTION_EVENT_TYPES,
} from '../../src/contribution/events.js';
import { CONTRIBUTION_MISMATCH_EVENT_TYPE } from '../../src/contribution/history.js';
import { CONFIRMED_EVENT_TYPE } from '../../src/contribution/read.js';
import { CONTRIBUTION_UTR_ATTESTED_EVENT_TYPE } from '../../src/contribution/write.js';

/**
 * The COMPLETE set of contribution-bearing event types — the only ingest paths that exist. Built from
 * the shipped constants (not restated string literals) so a rename cannot drift this fence.
 */
const ADMITTED_EVENT_TYPES: readonly string[] = [
  CONTRIBUTION_UTR_ATTESTED_EVENT_TYPE,
  CONFIRMED_EVENT_TYPE,
  CONTRIBUTION_MISMATCH_EVENT_TYPE,
];

// ─── source-scan plumbing ────────────────────────────────────────────────────────────────────────

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');

/**
 * Repo-relative source roots that carry the contribution vocabulary + the persisted schema.
 * `packages/events/src` (not just `registry.ts`) so a sibling module that declares a literal and
 * is merely re-exported by `registry.ts` doesn't evade the scan. `packages/domain/migrations` is
 * the raw-SQL surface: schema changes are Drizzle-authored (TS-first, already covered by the
 * `src/schema` root above), but a hand-written migration could in principle add a column without
 * ever touching the TS schema, so the fence also scans the generated SQL directly.
 */
const SCANNED_ROOTS = [
  'packages/domain/src/contribution',
  'packages/domain/src/schema',
  'packages/domain/migrations',
  'packages/events/src',
];

/** Source-file extensions the fence reads. `.sql` covers hand-written/generated migrations. */
const SCANNED_EXTENSIONS = ['.ts', '.mts', '.cts', '.sql'];

function collectSourceFiles(rel: string): string[] {
  const abs = path.join(repoRoot, rel);
  const entries = readdirSync(abs, { withFileTypes: true, recursive: true });
  return entries
    .filter((e) => e.isFile() && SCANNED_EXTENSIONS.some((ext) => e.name.endsWith(ext)))
    .map((e) => path.relative(repoRoot, path.join(e.parentPath ?? abs, e.name)));
}

/** Every scanned source file, repo-relative. */
const scannedFiles: string[] = SCANNED_ROOTS.flatMap((rel) => collectSourceFiles(rel));

const read = (rel: string): string => readFileSync(path.join(repoRoot, rel), 'utf8');

// ─── (1) the ingest vocabulary is exactly three ──────────────────────────────────────────────────

describe('AC5 — the contribution ingest vocabulary admits exactly three event types', () => {
  it('the admitted set is precisely yellow / green / red', () => {
    expect([...ADMITTED_EVENT_TYPES].sort()).toEqual([
      'contribution.confirmed',
      'contribution.reconciliation-mismatch',
      'contribution.utr-attested',
    ]);
  });

  it('the three are distinct — no constant aliases another (a rename cannot collapse the set)', () => {
    expect(new Set(ADMITTED_EVENT_TYPES).size).toBe(3);
  });

  it('the WRITE vocabulary carries exactly the one type the app itself may emit', () => {
    // Green + red are Epic 9's exclusive producers and are deliberately absent from the write map (D11).
    expect([...CONTRIBUTION_EVENT_TYPES]).toEqual(['contribution.utr-attested']);
    expect(Object.keys(CONTRIBUTION_EVENT_PAYLOAD_SCHEMAS)).toEqual([...CONTRIBUTION_EVENT_TYPES]);
  });

  it('no FOURTH contribution.* event type exists anywhere in the vocabulary or the schema', () => {
    // The one non-event-type `contribution.*` literal in the tree: the payload's `trigger` name (the
    // underscore form), which is provenance metadata INSIDE the yellow payload, not an event type.
    const KNOWN_NON_EVENT_LITERALS = new Set(['contribution.utr_attested']);

    // Single- AND double-quoted forms — a literal isn't always single-quoted. NOT backtick: this
    // codebase uses backtick-quoted `code.refs` inside prose comments for illustrative examples
    // (e.g. events_log.ts's own doc comment lists `contribution.matched` as a hypothetical naming
    // pattern, never a real literal); matching backticks turned that into a live false positive.
    const offenders: string[] = [];
    for (const file of scannedFiles) {
      for (const line of read(file).split('\n')) {
        for (const m of line.matchAll(/['"](contribution\.[A-Za-z0-9._-]+)['"]/g)) {
          const literal = m[1]!;
          if (ADMITTED_EVENT_TYPES.includes(literal)) continue;
          if (KNOWN_NON_EVENT_LITERALS.has(literal)) continue;
          offenders.push(`${file}: ${literal}`);
        }
      }
    }

    // Name the offender on failure (the gate contract) — a bare `toHaveLength(0)` is unactionable.
    expect(offenders, `unrecognised contribution.* event type(s):\n  ${offenders.join('\n  ')}`).toEqual([]);
  });

  it('the scan actually reached the vocabulary (a scan over zero files proves nothing)', () => {
    expect(scannedFiles.length).toBeGreaterThan(20);
    const corpus = scannedFiles.map(read).join('\n');
    for (const type of ADMITTED_EVENT_TYPES) {
      expect(corpus, `the scan never saw ${type} — the roots are wrong`).toContain(`'${type}'`);
    }
  });
});

// ─── (2) no out-of-band-shaped surface exists ────────────────────────────────────────────────────

describe('AC5 — the system has no out-of-band gift surface (the absence, asserted)', () => {
  // Deliberately narrow + high-signal: the identifier shapes a "record the gift" feature would take.
  // NOTE the missing TRAILING `\b` — `_` is a word character, so `\bout_of_band\b` would NOT match a
  // table literally named `out_of_band_gifts`, i.e. the exact thing this fence exists to catch. The
  // pattern anchors on the LEFT only, and the self-check below is what surfaced that (it failed first).
  // Case-insensitive with an optional `_` separator so snake_case, camelCase, PascalCase, and
  // SCREAMING_SNAKE_CASE forms of the same identifier all match one alternative instead of needing
  // a spelled-out variant per case convention. Deliberately NOT hyphen-separated: unlike the other
  // three case conventions, this codebase's DB/TS identifiers are never kebab-case, and "out-of-band"
  // is also ordinary English idiom used in unrelated comments elsewhere in this tree (e.g.
  // member_search_projection.ts's "any out-of-band write" — outside the normal write path, nothing
  // to do with this policy's gifts); matching hyphens turned that into a live false positive.
  const FORBIDDEN_IDENTIFIERS = /\b(out_?of_?band|direct_?gift|outside_?payment|gift)[A-Za-z_]*/gi;

  it('no out_of_band / direct_gift / outside_payment / gift_* table, column, or event type exists', () => {
    const offenders: string[] = [];
    for (const file of scannedFiles) {
      read(file)
        .split('\n')
        .forEach((line, i) => {
          for (const m of line.matchAll(FORBIDDEN_IDENTIFIERS)) {
            offenders.push(`${file}:${i + 1} — ${m[0]}`);
          }
        });
    }

    expect(
      offenders,
      `an out-of-band gift surface appeared — this is unsafe operation (a) of epics.md:3039.\n` +
        `The trust does not track, audit, or reconcile out-of-band gifts; see\n` +
        `docs/policies/out-of-band-contributions.md before adding any such path.\n  ${offenders.join('\n  ')}`,
    ).toEqual([]);
  });

  it('the forbidden-identifier pattern is itself live (it matches its own targets)', () => {
    // Otherwise a typo'd regex would make the assertion above vacuously green forever.
    for (const sample of [
      'out_of_band_gifts', // a table (snake_case)
      'outOfBandGiftId', // a column / field (camelCase)
      'OutOfBandGift', // a type / interface (PascalCase)
      'OUT_OF_BAND_TYPE', // a constant (SCREAMING_SNAKE_CASE)
      'directGift',
      'outside_payment',
      'gift_amount',
      'gifts',
    ]) {
      expect(sample.match(new RegExp(FORBIDDEN_IDENTIFIERS.source, 'i')), sample).not.toBeNull();
    }
  });
});
