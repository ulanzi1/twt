// Verifier-console prior-decisions + recent-precedents read tests — Story 6.10 (Task 6; AC2e/AC2f, D6).
//
// DB-free: the pure ordering/selection helpers (the logic Story 6.11's producer will rely on) + the
// producer-gated reads that return `not_available_yet` (NOT []) until 6.11 ships the decision read model.

import { describe, expect, it } from 'vitest';

import {
  getPriorVerifierDecisions,
  getRecentInScopePrecedents,
  orderPriorDecisions,
  RECENT_PRECEDENTS_LIMIT,
  selectRecentInScopePrecedents,
  VERIFIER_DECISION_READ_MODEL_AVAILABLE,
  type VerifierDecisionRecord,
} from '../../src/claim/verifier-console-read.js';
import { ids } from '../../src/index.js';

const rec = (over: Partial<VerifierDecisionRecord>): VerifierDecisionRecord => ({
  claimCaseId: 'c-x',
  pariwarId: 'p-1',
  outcome: 'verifier_approved',
  reasonCode: 'rule.ok',
  rationale: 'looks good',
  actorDisplay: 'Anita (District Admin)',
  decidedAt: new Date('2026-06-01T00:00:00Z'),
  ...over,
});

describe('orderPriorDecisions — full ordered transcript (AC2e)', () => {
  it('orders oldest → newest, stable on ties', () => {
    const out = orderPriorDecisions([
      rec({ outcome: 'b', decidedAt: new Date('2026-06-03T00:00:00Z') }),
      rec({ outcome: 'a', decidedAt: new Date('2026-06-01T00:00:00Z') }),
      rec({ outcome: 'c', decidedAt: new Date('2026-06-02T00:00:00Z') }),
    ]);
    expect(out.map((d) => d.outcome)).toEqual(['a', 'c', 'b']);
  });

  it('never truncates the transcript', () => {
    const many = Array.from({ length: 10 }, (_, i) => rec({ outcome: `o${i}`, decidedAt: new Date(2026, 5, i + 1) }));
    expect(orderPriorDecisions(many)).toHaveLength(10);
  });
});

describe('selectRecentInScopePrecedents — latest-3, exclude-current, newest-first (AC2f)', () => {
  const records = [
    rec({ claimCaseId: 'current', decidedAt: new Date('2026-06-09T00:00:00Z') }),
    rec({ claimCaseId: 'p1', decidedAt: new Date('2026-06-01T00:00:00Z') }),
    rec({ claimCaseId: 'p2', decidedAt: new Date('2026-06-05T00:00:00Z') }),
    rec({ claimCaseId: 'p3', decidedAt: new Date('2026-06-03T00:00:00Z') }),
    rec({ claimCaseId: 'p4', decidedAt: new Date('2026-06-07T00:00:00Z') }),
  ];

  it('excludes the current claim and returns the latest 3 by decision timestamp', () => {
    const out = selectRecentInScopePrecedents(records, { excludeClaimCaseId: 'current' });
    expect(out.map((r) => r.claimCaseId)).toEqual(['p4', 'p2', 'p3']);
    expect(out).toHaveLength(RECENT_PRECEDENTS_LIMIT);
    expect(out.find((r) => r.claimCaseId === 'current')).toBeUndefined();
  });

  it('returns fewer than the cap when few precedents exist (a genuine short list, not padding)', () => {
    const out = selectRecentInScopePrecedents([rec({ claimCaseId: 'only' })], { excludeClaimCaseId: 'current' });
    expect(out.map((r) => r.claimCaseId)).toEqual(['only']);
  });
});

describe('producer-gated reads — not_available_yet until Story 6.11 (AC7, D6)', () => {
  it('the decision read model is NOT yet available (6.10 defines the consumer shape only)', () => {
    expect(VERIFIER_DECISION_READ_MODEL_AVAILABLE).toBe(false);
  });

  it('getPriorVerifierDecisions returns not_available_yet — NOT an empty [] (absence-is-signal)', async () => {
    const r = await getPriorVerifierDecisions({}, ids.pariwarId('11111111-1111-1111-1111-111111111111'), ids.claimId('22222222-2222-2222-2222-222222222222'));
    expect(r.status).toBe('not_available_yet');
  });

  it('getRecentInScopePrecedents returns not_available_yet — NOT an empty []', async () => {
    const r = await getRecentInScopePrecedents({}, ids.pariwarId('11111111-1111-1111-1111-111111111111'), ids.claimId('22222222-2222-2222-2222-222222222222'));
    expect(r.status).toBe('not_available_yet');
  });
});
