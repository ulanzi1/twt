// Niyamavali draft-store PURE-logic unit tests — Story 2.4 (Task 8). No DB.
//
// Covers the content-binding decision that is THIS story's load-bearing subtlety
// (Dev Notes §"The sign-off is content-bound — but the gate is not"):
//   · draftContentHash — deterministic, order-insensitive (RFC 8785 JCS).
//   · signoffFromDraftRow — returns a ToneReviewSignoff ONLY for a signed_off draft
//     whose stored hash matches the CURRENT payload; null otherwise (stale hash,
//     non-signed-off status, missing reviewer/hash).
// The DB-backed transitions (edit clears sign-off; self-review rejection; publish
// gating) are exercised by the live-DB + API integration specs.

import { describe, expect, it } from 'vitest';

import { clauseId as toClauseId, pariwarId as toPariwarId } from '../../src/ids/index.js';
import {
  draftContentHash,
  draftResourceLocator,
  signoffFromDraftRow,
} from '../../src/niyamavali/drafts.js';
import type { ClauseDraftRow } from '../../src/schema/clause_drafts.js';

const PAYLOAD = { rule_code: 'R7(A)', title_en: 'Restoration', restoration_window_days: 30 };
const PARIWAR = toPariwarId('11111111-1111-1111-1111-111111111111');
const AUTHOR = '22222222-2222-2222-2222-222222222222';
const REVIEWER = '33333333-3333-3333-3333-333333333333';

/** Build a signed_off draft row whose stored hash matches its payload (the happy case). */
function signedOffRow(overrides: Partial<ClauseDraftRow> = {}): ClauseDraftRow {
  const payload = overrides.payload ?? PAYLOAD;
  const now = new Date('2026-06-21T00:00:00Z');
  return {
    draftId: '44444444-4444-4444-4444-444444444444' as ClauseDraftRow['draftId'],
    pariwarId: PARIWAR,
    clauseId: toClauseId('niy.contribution-discipline.r7-a'),
    operation: 'amend',
    payload,
    effectiveDate: now,
    benefitMechanism: 'pool',
    affectedMemberScope: { kind: 'past_lockin' },
    status: 'signed_off',
    authoredByActor: AUTHOR,
    toneReviewedBy: REVIEWER,
    toneReviewedAt: now,
    toneReviewContentHash: draftContentHash(payload),
    publishedClauseVersionId: null,
    createdAt: now,
    updatedAt: now,
    auditId: null,
    ...overrides,
  };
}

describe('draftContentHash (content-binding hash)', () => {
  it('is a SHA-256 hex digest', () => {
    expect(draftContentHash(PAYLOAD)).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic + order-insensitive (RFC 8785 JCS)', () => {
    const a = draftContentHash({ a: 1, b: 2, nested: { x: 1, y: 2 } });
    const b = draftContentHash({ nested: { y: 2, x: 1 }, b: 2, a: 1 });
    expect(a).toBe(b);
  });

  it('changes when the payload content changes', () => {
    expect(draftContentHash({ v: 1 })).not.toBe(draftContentHash({ v: 2 }));
  });
});

describe('draftResourceLocator', () => {
  it('keys to the clause (not the draft row)', () => {
    expect(draftResourceLocator(toClauseId('niy.a.b'))).toBe('niyamavali:clause:niy.a.b');
  });
});

describe('signoffFromDraftRow (content-bound resolver decision)', () => {
  it('signed_off + matching hash → returns a resource-bound, non-author sign-off', () => {
    const signoff = signoffFromDraftRow(signedOffRow());
    expect(signoff).not.toBeNull();
    expect(signoff?.reviewedBy).toBe(REVIEWER);
    expect(signoff?.resourceLocator).toBe('niyamavali:clause:niy.contribution-discipline.r7-a');
    expect(signoff?.contentHash).toBe(draftContentHash(PAYLOAD));
  });

  it('signed_off + STALE hash (payload changed after sign-off) → null', () => {
    // Stored hash is for the old payload; the current payload differs → gate denies.
    const row = signedOffRow({ payload: { ...PAYLOAD, restoration_window_days: 45 } });
    row.toneReviewContentHash = draftContentHash(PAYLOAD); // hash of the OLD payload
    expect(signoffFromDraftRow(row)).toBeNull();
  });

  it('non-signed-off status → null', () => {
    expect(signoffFromDraftRow(signedOffRow({ status: 'in_review' }))).toBeNull();
    expect(signoffFromDraftRow(signedOffRow({ status: 'draft' }))).toBeNull();
  });

  it('missing reviewer or hash → null', () => {
    expect(signoffFromDraftRow(signedOffRow({ toneReviewedBy: null }))).toBeNull();
    expect(signoffFromDraftRow(signedOffRow({ toneReviewContentHash: null }))).toBeNull();
  });
});
