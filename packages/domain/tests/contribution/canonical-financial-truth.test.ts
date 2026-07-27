// The CANONICAL-FINANCIAL-TRUTH fence — Story 9.5 (Task 3; AC-Fence, AC2), DB-free.
//
// The load-bearing invariant of Epic 9's read side: **confirmed-contribution truth derives EXCLUSIVELY
// from the `contribution.confirmed` event-derived state** (Story 9.4 producer). No surface may
// independently claim a contribution is "confirmed" by inferring it from a yellow pill, a UTR attestation,
// or any other proxy; the ONLY un-confirm path is the trustee-attested `reconciliation.confirmation-reversed`
// compensating event (Story 9.8). This file makes that invariant EXECUTABLE — the sibling of Story 8.10's
// `no-ingest-path.test.ts` (source-scan + self-check + named offenders), with the SEMANTIC teeth living in
// the live-DB reversal-consumer proof (`tests/integration/contribution/reversal-consumer.spec.ts`).
//
// Decision D1 (LOCKED) chose THIS focused domain-co-located fence over a repo-wide `scripts/*-invariant/`
// CI gate: the confirmed-only invariant is ALREADY structurally enforced (the reads hard-filter the exact
// `CONFIRMED_EVENT_TYPE` with no status/state parameter), so a broad "no surface promotes to confirmed"
// scan would be largely vacuous ([[feedback_gate_scope_semantic_coverage]], [[project_access_wrapper_gate_pending_scope]]).
// The MEANINGFUL teeth are the two below.
//
// Three assertions:
//   (a) SINGLE AUTHORITY — the string `'contribution.confirmed'` appears as a CODE literal EXACTLY ONCE
//       across the confirmed-truth roots: its `CONFIRMED_EVENT_TYPE` definition in `read.ts`. Every other
//       confirmed/contributor/raised surface imports that constant; a re-spelled literal (a second source
//       of confirmed truth) fails here.
//   (b) NO YELLOW IN A CONFIRMED AGGREGATE — the confirmed-contributor read never admits the yellow
//       `contribution.utr-attested` type into its confirmed set (the `listActedMemberIdsForPool`
//       two-separate-sets discipline is the pattern); the two event-type constants are distinct.
//   (c) NO ALTERNATE INFERENCE PATH — the confirmed-reading functions expose no `status`/`state` parameter
//       that could admit a non-confirmed row (the existing structural guard in `read.ts`), pinned so a
//       future widening fails the fence.
//
// Revert-sanity proven (a re-spelled `'contribution.confirmed'` planted in a confirmed surface + a
// yellow-into-confirmed mix → red → revert → green); see the Dev Agent Record.

import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { CONTRIBUTION_MISMATCH_EVENT_TYPE } from '../../src/contribution/history.js';
import { CONFIRMED_EVENT_TYPE } from '../../src/contribution/read.js';
import { CONTRIBUTION_UTR_ATTESTED_EVENT_TYPE as ATTESTED_EVENT_TYPE } from '../../src/contribution/write.js';
import { RECONCILIATION_CONFIRMATION_REVERSED_EVENT_TYPE } from '../../src/reconciliation/events.js';

// ─── source-scan plumbing (the 8.10 pattern) ─────────────────────────────────────────────────────

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');

/**
 * The confirmed-truth roots the fence scans: the domain contribution reads (where the constant lives +
 * the confirmed/aggregate surfaces) and the apps/api member-pool boundary (the contributor list + the My
 * Pool card + the Yogdaan history handler that populate from them). DELIBERATELY NOT `apps/jobs/src/matcher`
 * (the legitimate 9.4 PRODUCER — a green scan over a producer's own emit proves nothing) nor
 * `apps/api/src/modules/reconciliation` (Story 9.8's future trustee-confirm action — its author re-decides
 * this scope deliberately when it lands, see the story's forward-note, not reflexively widened here).
 */
const CONFIRMED_TRUTH_ROOTS = [
  'packages/domain/src/contribution',
  'apps/api/src/modules/member-pool',
];

const SCANNED_EXTENSIONS = ['.ts', '.mts', '.cts'];

function collectSourceFiles(rel: string): string[] {
  const abs = path.join(repoRoot, rel);
  const entries = readdirSync(abs, { withFileTypes: true, recursive: true });
  return entries
    .filter((e) => e.isFile() && SCANNED_EXTENSIONS.some((ext) => e.name.endsWith(ext)))
    .map((e) => path.relative(repoRoot, path.join(e.parentPath ?? abs, e.name)));
}

const scannedFiles: string[] = CONFIRMED_TRUTH_ROOTS.flatMap((rel) => collectSourceFiles(rel));
const read = (rel: string): string => readFileSync(path.join(repoRoot, rel), 'utf8');

/** A line that is a pure comment (prose mentioning the literal is not a re-spelled CODE source of truth). */
function isCommentLine(line: string): boolean {
  const t = line.trim();
  return t.startsWith('//') || t.startsWith('*') || t.startsWith('/*');
}

/**
 * The source of ONE confirmed-truth function body — from its declaration to the EARLIEST of the next
 * top-level `export ` or the next JSDoc block `\n/**` (which introduces the next declaration). Cutting at
 * the JSDoc too keeps the NEXT function's doc comment (which may legitimately mention the yellow type) out
 * of this body, so the scoped (b)/(c) assertions bind to exactly this function and cannot leak.
 */
function functionBody(src: string, declaration: string): string {
  const start = src.indexOf(declaration);
  if (start === -1) return '';
  const rest = src.slice(start + declaration.length);
  const markers = ['\nexport ', '\n/**'].map((m) => rest.indexOf(m)).filter((i) => i !== -1);
  return markers.length === 0 ? rest : rest.slice(0, Math.min(...markers));
}

// ─── (a) single authority: exactly one CODE literal, the definition ───────────────────────────────

describe('AC-Fence(a) — `contribution.confirmed` has a SINGLE authority (the imported constant, never re-spelled)', () => {
  it('the string appears as a CODE literal exactly once — the CONFIRMED_EVENT_TYPE definition in read.ts', () => {
    const occurrences: string[] = [];
    for (const file of scannedFiles) {
      read(file)
        .split('\n')
        .forEach((line, i) => {
          if (isCommentLine(line)) return; // prose mentions are not a source of truth
          if (/['"]contribution\.confirmed['"]/.test(line)) occurrences.push(`${file}:${i + 1}`);
        });
    }

    // Exactly one code occurrence, and it is the constant DEFINITION (the single source of truth). Any other
    // is a re-spelled literal — a second, drift-prone source of confirmed truth. Name offenders (the gate contract).
    expect(
      occurrences,
      `re-spelled 'contribution.confirmed' literal(s) — import CONFIRMED_EVENT_TYPE instead:\n  ${occurrences.join('\n  ')}`,
    ).toHaveLength(1);
    const [only] = occurrences;
    expect(only, 'the single confirmed literal must live in read.ts').toContain(
      'packages/domain/src/contribution/read.ts',
    );
    const [file, lineNo] = only!.split(':');
    const definitionLine = read(file!).split('\n')[Number(lineNo) - 1] ?? '';
    expect(definitionLine).toContain('CONFIRMED_EVENT_TYPE');
    expect(definitionLine).toContain("'contribution.confirmed'");
  });

  it('the scan actually reached the confirmed-truth roots (a scan over zero files proves nothing)', () => {
    // The 8.10 self-check pattern — a mis-pointed root would empty the scan and make (a) vacuously pass.
    expect(scannedFiles.length).toBeGreaterThan(8);
    const corpus = scannedFiles.map(read).join('\n');
    expect(corpus, 'the scan never saw the confirmed reads — the roots are wrong').toContain(
      'listConfirmedContributorsForPool',
    );
    expect(corpus, 'the scan never saw the constant definition — the roots are wrong').toContain(
      "CONFIRMED_EVENT_TYPE = 'contribution.confirmed'",
    );
  });
});

// ─── (b) no yellow in a confirmed aggregate ───────────────────────────────────────────────────────

describe('AC-Fence(b) — the yellow attestation type never enters a confirmed aggregate', () => {
  it('the confirmed and attested event-type constants are distinct (a rename cannot collapse them)', () => {
    expect(CONFIRMED_EVENT_TYPE).toBe('contribution.confirmed');
    expect(ATTESTED_EVENT_TYPE).toBe('contribution.utr-attested');
    expect(CONFIRMED_EVENT_TYPE).not.toBe(ATTESTED_EVENT_TYPE);
  });

  it('listConfirmedContributorsForPool derives ONLY from confirmed (+ reversal) — never the attested type', () => {
    const src = read('packages/domain/src/contribution/read.ts');
    const body = functionBody(src, 'export async function listConfirmedContributorsForPool');
    expect(body.length).toBeGreaterThan(0); // the scoped extraction actually found the function
    // The confirmed contributor read may reference the confirmed + reversal types only — a yellow/attested
    // reference in THIS function would mean an attestation could reach the confirmed set (the exact leak).
    expect(body, 'the confirmed contributor read must not reference the yellow attested type').not.toMatch(
      /utr-attested|ATTESTED_EVENT_TYPE/,
    );
    expect(body).toContain('CONFIRMED_EVENT_TYPE');
    expect(body).toContain('RECONCILIATION_CONFIRMATION_REVERSED_EVENT_TYPE');
  });

  it('listActedMemberIdsForPool keeps confirmed and attested as SEPARATE sets (the 8.8 D2 discipline)', () => {
    const src = read('packages/domain/src/contribution/read.ts');
    const body = functionBody(src, 'export async function listActedMemberIdsForPool');
    expect(body.length).toBeGreaterThan(0);
    // Two distinct accumulators; the return shape carries both keys separately — never a merged "acted" set.
    expect(body).toMatch(/confirmed\.add\(/);
    expect(body).toMatch(/attested\.add\(/);
    expect(body).toMatch(/return \{ confirmed:.*attested:/s);
  });
});

// ─── (c) no alternate inference path (no status/state parameter) ──────────────────────────────────

describe('AC-Fence(c) — the confirmed-reading surfaces expose no status/state parameter', () => {
  it('ListConfirmedContributorsParams admits no `status`/`state` field (structural guard, pinned)', () => {
    const src = read('packages/domain/src/contribution/read.ts');
    const start = src.indexOf('export interface ListConfirmedContributorsParams');
    const paramsBlock = src.slice(start, src.indexOf('}', start) + 1);
    expect(paramsBlock.length).toBeGreaterThan(0);
    // A `status`/`state` field would let a caller admit a non-confirmed row into the confirmed list.
    expect(paramsBlock).not.toMatch(/\b(status|state)\b\s*\??:/);
  });

  it('the confirmed contributor read hard-filters the event type in-query (no widenable parameter)', () => {
    const src = read('packages/domain/src/contribution/read.ts');
    const body = functionBody(src, 'export async function listConfirmedContributorsForPool');
    // The event-type filter is an in-query `inArray([CONFIRMED, REVERSAL])` on the shipped constants — not a
    // parameterized/interpolated event type a caller could steer toward a non-confirmed value.
    expect(body).toMatch(/inArray\(\s*eventsLog\.eventType/);
    expect(body).not.toMatch(/eventsLog\.eventType,\s*(params|opts|status|state)\b/);
  });
});

// ─── the fence stays coherent with the 8.10 vocabulary fence ──────────────────────────────────────

describe('AC-Fence — coherent with the Story 8.10 vocabulary fence (9.5 adds NO contribution.* type)', () => {
  it('held is a STATUS tone, and the reversal is `reconciliation.*` — not a fourth contribution.* type', () => {
    // 9.5 adds no `contribution.*` event type (the 8.10 fence must stay green verbatim). The reversal lives
    // in the reconciliation.* namespace by Story 9.4 D1, precisely to stay off that fence.
    expect(RECONCILIATION_CONFIRMATION_REVERSED_EVENT_TYPE).toBe('reconciliation.confirmation-reversed');
    expect(RECONCILIATION_CONFIRMATION_REVERSED_EVENT_TYPE.startsWith('reconciliation.')).toBe(true);
    // The three contribution.* types the 8.10 fence pins remain exactly the confirmed / attested / mismatch set.
    expect([CONFIRMED_EVENT_TYPE, ATTESTED_EVENT_TYPE, CONTRIBUTION_MISMATCH_EVENT_TYPE].sort()).toEqual([
      'contribution.confirmed',
      'contribution.reconciliation-mismatch',
      'contribution.utr-attested',
    ]);
  });
});
