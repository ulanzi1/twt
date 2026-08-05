// Trustee-Lite pure-core unit tests — Story 10.11 (Task 7; AC1/AC2/AC3).
//
// The whole namespace is DB-free and clock-injected, so every property below is exhaustively
// testable without a database. What is under test is not "does it map fields" but the three
// governance properties the story is actually about:
//   · the two-tier order is TOTAL and DETERMINISTIC, and it never fabricates a deadline (AC2);
//   · severity exists only where a source defines one, and is STRUCTURALLY null on moderation and
//     violator rows — with a revert-sanity probe proving the pin has teeth (AC3);
//   · concealment is a FILTER over the cycle-freeze rows, not a second query, and the two sections
//     legitimately overlap (D6).

import { describe, expect, it } from 'vitest';

import type { CycleFreezePendingCase, CycleFreezePendingList } from '../../src/claim/cycle-freeze-read.js';
import { CONCEALMENT_REVIEW_REQUIRED_FLAG } from '../../src/claim/cycle-freeze-read.js';
import type { OpenAppealCase } from '../../src/claim/appeal-read.js';
import type { R9QueueItem } from '../../src/claim/r9-voting-read.js';
import type { ModeratedMemberEntry } from '../../src/member/moderation/read.js';
import type { ReconciliationCaseRow } from '../../src/reconciliation/reconciliation-review-read.js';
import {
  SEVERITY_FORBIDDEN_CATEGORIES,
  TRUSTEE_DUE_SOON_WINDOW_MS,
  TRUSTEE_SIGNAL_CATEGORIES,
  deriveSignalSeverity,
  normalizeAppealSignals,
  normalizeConcealmentSignals,
  normalizeCycleFreezeSignals,
  normalizeModerationSignals,
  normalizeR9VotingSignals,
  normalizeReconciliationSignals,
  normalizeTrusteeSignals,
  orderTrusteeSignals,
  type TrusteeSignalRow,
} from '../../src/trustee-lite/index.js';

const NOW = new Date('2026-08-05T12:00:00.000Z');
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

// ── Fixtures ─────────────────────────────────────────────────────────────────────────────────

function freezeCase(overrides: Partial<CycleFreezePendingCase> = {}): CycleFreezePendingCase {
  return {
    claimCaseId: '11111111-1111-4111-8111-111111111111',
    deceasedMemberId: '22222222-2222-4222-8222-222222222222',
    currentState: 'verifier_approved',
    verifierDecisionId: null,
    verifierActorDisplay: null,
    verifierReasonCode: null,
    verifierRationaleCiphertext: 'ENC(should-never-surface)',
    signalsSummary: 'state=verifier_approved; intake=app',
    concealmentFlags: [],
    routedToR9: false,
    ...overrides,
  };
}

const emptyList: CycleFreezePendingList = { readyToFreeze: [], escalated: [], votedPendingCommit: [] };

function reconRow(overrides: Partial<ReconciliationCaseRow> = {}): ReconciliationCaseRow {
  return {
    caseKey: 'mismatch:pool-a:member-a',
    caseType: 'mismatch',
    poolId: '33333333-3333-4333-8333-333333333333' as ReconciliationCaseRow['poolId'],
    alertId: null,
    memberId: null,
    mismatchReason: 'amount_mismatch',
    deadlineAt: new Date(NOW.getTime() + 5 * DAY),
    raisedAt: new Date(NOW.getTime() - 2 * DAY),
    screenshotObjectKey: null,
    overpaymentExcessPaise: null,
    ...overrides,
  };
}

function appealCase(overrides: Partial<OpenAppealCase> = {}): OpenAppealCase {
  return {
    appealId: '44444444-4444-4444-8444-444444444444',
    claimCaseId: '55555555-5555-4555-8555-555555555555',
    deceasedMemberId: '66666666-6666-4666-8666-666666666666',
    stage: '1',
    stageEnteredAt: new Date(NOW.getTime() - 3 * DAY),
    initiatedAt: new Date(NOW.getTime() - 3 * DAY),
    initiatedOnBehalf: false,
    ...overrides,
  };
}

function moderatedMember(overrides: Partial<ModeratedMemberEntry> = {}): ModeratedMemberEntry {
  return {
    memberId: '77777777-7777-4777-8777-777777777777' as ModeratedMemberEntry['memberId'],
    status: 'suspended',
    reasonCode: 'contribution_discipline',
    actorId: 'actor-1',
    actorDisplay: 'A. Trustee',
    since: new Date(NOW.getTime() - 10 * DAY),
    rejoinPermittedAt: null,
    ...overrides,
  };
}

function r9Item(overrides: Partial<R9QueueItem> = {}): R9QueueItem {
  return {
    claimCaseId: '88888888-8888-4888-8888-888888888888',
    deceasedMemberId: '99999999-9999-4999-8999-999999999999',
    routingActorDisplay: 'B. Trustee',
    routingReasonCode: 'r9_special_case',
    sessionOpen: false,
    ...overrides,
  };
}

/** A minimal hand-built row, for order/severity properties that need no source fixture. */
function row(over: Partial<TrusteeSignalRow> & Pick<TrusteeSignalRow, 'category' | 'sourceKey'>): TrusteeSignalRow {
  return {
    resourceId: 'r',
    claimCaseId: null,
    label: 'l',
    ageMs: null,
    raisedAt: null,
    deadlineAt: null,
    severity: null,
    crossLinkKind: 'member_record',
    ...over,
  };
}

// ── AC2 — the two-tier order ─────────────────────────────────────────────────────────────────

describe('orderTrusteeSignals — the two-tier order (AC2)', () => {
  it('puts every DATED row before every UNDATED row, whatever their ages', () => {
    const rows = [
      row({ category: 'moderation', sourceKey: 'undated-ancient', ageMs: 900 * DAY }),
      row({ category: 'reconciliation', sourceKey: 'dated-far', deadlineAt: new Date(NOW.getTime() + 400 * DAY) }),
    ];
    const ordered = orderTrusteeSignals(rows);
    // The undated row is 900 days old and the dated one is not due for another 400 — the tier still
    // wins. Deadline-proximity is the FIRST-CLASS signal; age is the fallback for rows without one.
    expect(ordered.map((r) => r.sourceKey)).toEqual(['dated-far', 'undated-ancient']);
  });

  it('orders dated rows by ASCENDING deadline (soonest first)', () => {
    const rows = [
      row({ category: 'appeal', sourceKey: 'c', deadlineAt: new Date(NOW.getTime() + 9 * DAY) }),
      row({ category: 'appeal', sourceKey: 'a', deadlineAt: new Date(NOW.getTime() - 1 * DAY) }),
      row({ category: 'appeal', sourceKey: 'b', deadlineAt: new Date(NOW.getTime() + 2 * DAY) }),
    ];
    expect(orderTrusteeSignals(rows).map((r) => r.sourceKey)).toEqual(['a', 'b', 'c']);
  });

  it('orders undated rows by DESCENDING age (longest-waiting first)', () => {
    const rows = [
      row({ category: 'moderation', sourceKey: 'young', ageMs: 1 * DAY }),
      row({ category: 'moderation', sourceKey: 'old', ageMs: 30 * DAY }),
      row({ category: 'moderation', sourceKey: 'middle', ageMs: 7 * DAY }),
    ];
    expect(orderTrusteeSignals(rows).map((r) => r.sourceKey)).toEqual(['old', 'middle', 'young']);
  });

  it('sorts UNKNOWN-age rows after every aged row in the undated tier (unknown ≠ new, ≠ old)', () => {
    const rows = [
      row({ category: 'cycle_freeze', sourceKey: 'unknown', ageMs: null }),
      row({ category: 'moderation', sourceKey: 'aged-young', ageMs: 1 }),
    ];
    expect(orderTrusteeSignals(rows).map((r) => r.sourceKey)).toEqual(['aged-young', 'unknown']);
  });

  it('breaks ties on (category, resourceId, sourceKey) so the order is TOTAL', () => {
    // Same tier, same (null) age → the tie-break must fully order them. `sourceKey` is load-bearing:
    // two reconciliation cases on ONE pool share both category and resourceId.
    const rows = [
      row({ category: 'reconciliation', sourceKey: 'manual_transcription:p1:', resourceId: 'p1' }),
      row({ category: 'cycle_freeze', sourceKey: 'cf:z', resourceId: 'z' }),
      row({ category: 'reconciliation', sourceKey: 'mismatch:p1:m1', resourceId: 'p1' }),
      row({ category: 'cycle_freeze', sourceKey: 'cf:a', resourceId: 'a' }),
    ];
    expect(orderTrusteeSignals(rows).map((r) => r.sourceKey)).toEqual([
      'cf:a',
      'cf:z',
      'manual_transcription:p1:',
      'mismatch:p1:m1',
    ]);
  });

  it('is DETERMINISTIC — every input permutation yields the identical output order', () => {
    const rows = [
      row({ category: 'appeal', sourceKey: 'd1', deadlineAt: new Date(NOW.getTime() + DAY) }),
      row({ category: 'reconciliation', sourceKey: 'd2', deadlineAt: new Date(NOW.getTime() + 2 * DAY) }),
      row({ category: 'moderation', sourceKey: 'u1', ageMs: 5 * DAY }),
      row({ category: 'r9_voting', sourceKey: 'u2', ageMs: null }),
      row({ category: 'cycle_freeze', sourceKey: 'u3', ageMs: null }),
    ];
    const expected = orderTrusteeSignals(rows).map((r) => r.sourceKey);
    // Rotations + a reversal — cheap, deterministic stand-ins for a shuffle (no RNG in a unit test).
    for (let shift = 0; shift < rows.length; shift += 1) {
      const rotated = [...rows.slice(shift), ...rows.slice(0, shift)];
      expect(orderTrusteeSignals(rotated).map((r) => r.sourceKey)).toEqual(expected);
      expect(orderTrusteeSignals([...rotated].reverse()).map((r) => r.sourceKey)).toEqual(expected);
    }
  });

  it('does not mutate its input', () => {
    const rows = [
      row({ category: 'moderation', sourceKey: 'b', ageMs: 1 }),
      row({ category: 'moderation', sourceKey: 'a', ageMs: 2 }),
    ];
    orderTrusteeSignals(rows);
    expect(rows.map((r) => r.sourceKey)).toEqual(['b', 'a']);
  });
});

// ── AC3 — severity ───────────────────────────────────────────────────────────────────────────

describe('deriveSignalSeverity — per-source-optional bands (AC3)', () => {
  it('derives breached / due_soon / on_track for the two DATED categories', () => {
    for (const category of ['reconciliation', 'appeal'] as const) {
      expect(
        deriveSignalSeverity({ category, deadlineAt: new Date(NOW.getTime() - 1) }, NOW),
        `${category} past due`,
      ).toBe('breached');
      expect(
        deriveSignalSeverity({ category, deadlineAt: new Date(NOW.getTime() + HOUR) }, NOW),
        `${category} within window`,
      ).toBe('due_soon');
      expect(
        deriveSignalSeverity({ category, deadlineAt: new Date(NOW.getTime() + 30 * DAY) }, NOW),
        `${category} far out`,
      ).toBe('on_track');
    }
  });

  it('treats the due-soon window boundary as INCLUSIVE, and one ms past it as on_track', () => {
    const atBoundary = new Date(NOW.getTime() + TRUSTEE_DUE_SOON_WINDOW_MS);
    expect(deriveSignalSeverity({ category: 'appeal', deadlineAt: atBoundary }, NOW)).toBe('due_soon');
    expect(
      deriveSignalSeverity({ category: 'appeal', deadlineAt: new Date(atBoundary.getTime() + 1) }, NOW),
    ).toBe('on_track');
  });

  it('is null for the three UNDATED non-moderation categories (nothing to run a timer against)', () => {
    for (const category of ['cycle_freeze', 'r9_voting', 'concealment'] as const) {
      expect(deriveSignalSeverity({ category, deadlineAt: null }, NOW), category).toBeNull();
    }
  });

  it('is STRUCTURALLY null on moderation + violator_flag EVEN IF a deadline is present', () => {
    // The load-bearing assertion: the null is not a consequence of "no deadline", it is a pin.
    // `epics.md:3587` — a severity score on a moderation row would itself be a recommendation.
    for (const category of ['moderation', 'violator_flag'] as const) {
      expect(
        deriveSignalSeverity({ category, deadlineAt: new Date(NOW.getTime() - 100 * DAY) }, NOW),
        `${category} with a long-past deadline must STILL be null`,
      ).toBeNull();
    }
  });

  it('REVERT-SANITY: the forbidden set is exactly {moderation, violator_flag}', () => {
    // Removing an entry from SEVERITY_FORBIDDEN_CATEGORIES flips this test AND the assertion above —
    // which is what makes the structural pin load-bearing rather than incidental.
    expect([...SEVERITY_FORBIDDEN_CATEGORIES].sort()).toEqual(['moderation', 'violator_flag']);
  });
});

// ── AC1 — per-source normalization ───────────────────────────────────────────────────────────

describe('normalizeCycleFreezeSignals (6.13)', () => {
  it('flattens all three buckets and records which bucket each row came from', () => {
    const rows = normalizeCycleFreezeSignals(
      {
        readyToFreeze: [freezeCase({ claimCaseId: 'c-ready' })],
        escalated: [freezeCase({ claimCaseId: 'c-esc', currentState: 'verifier_review' })],
        votedPendingCommit: [freezeCase({ claimCaseId: 'c-voted', currentState: 'state_trustee_approved' })],
      },
      NOW,
    );
    expect(rows).toHaveLength(3);
    expect(rows.map((r) => r.sourceKey)).toEqual([
      'cycle_freeze:ready_to_freeze:c-ready',
      'cycle_freeze:escalated:c-esc',
      'cycle_freeze:voted_pending_commit:c-voted',
    ]);
  });

  it('carries NO deadline, NO instant and NO severity — the source defines none (D2)', () => {
    const [r] = normalizeCycleFreezeSignals({ ...emptyList, readyToFreeze: [freezeCase()] }, NOW);
    expect(r!.deadlineAt).toBeNull();
    expect(r!.raisedAt).toBeNull();
    expect(r!.ageMs).toBeNull();
    expect(r!.severity).toBeNull();
  });

  it('never leaks the rationale CIPHERTEXT into the label (AC8)', () => {
    const [r] = normalizeCycleFreezeSignals({ ...emptyList, readyToFreeze: [freezeCase()] }, NOW);
    expect(r!.label).not.toContain('ENC(');
  });
});

describe('normalizeConcealmentSignals — a FILTER, not a query (D6)', () => {
  const list: CycleFreezePendingList = {
    readyToFreeze: [
      freezeCase({ claimCaseId: 'flagged-1', concealmentFlags: [CONCEALMENT_REVIEW_REQUIRED_FLAG] }),
      freezeCase({ claimCaseId: 'clean-1', concealmentFlags: [] }),
    ],
    escalated: [freezeCase({ claimCaseId: 'flagged-2', concealmentFlags: [CONCEALMENT_REVIEW_REQUIRED_FLAG] })],
    votedPendingCommit: [],
  };

  it('keeps only the cases whose flags include concealment_review_required', () => {
    const rows = normalizeConcealmentSignals(list, NOW);
    expect(rows.map((r) => r.resourceId).sort()).toEqual(['flagged-1', 'flagged-2']);
  });

  it('cross-links to the per-claim VERIFY surface, not to the freeze queue', () => {
    expect(normalizeConcealmentSignals(list, NOW)[0]!.crossLinkKind).toBe('claim_verify');
  });

  it('a claim appears in BOTH sections — they are lenses, not a partition (do not dedupe)', () => {
    const sections = normalizeTrusteeSignals({ cycleFreeze: list, concealment: list }, NOW);
    const inFreeze = sections.cycle_freeze!.map((r) => r.resourceId);
    const inConcealment = sections.concealment!.map((r) => r.resourceId);
    expect(inFreeze).toContain('flagged-1');
    expect(inConcealment).toContain('flagged-1');
  });
});

describe('normalizeR9VotingSignals (6.14)', () => {
  it('surfaces the session-open flag and is undated', () => {
    const [open] = normalizeR9VotingSignals([r9Item({ sessionOpen: true })], NOW);
    expect(open!.label).toContain('session_open');
    expect(open!.deadlineAt).toBeNull();
    expect(open!.severity).toBeNull();
    expect(normalizeR9VotingSignals([r9Item({ sessionOpen: false })], NOW)[0]!.label).toContain(
      'awaiting_session',
    );
  });
});

describe('normalizeAppealSignals (6.16) — the DERIVED deadline (AC2)', () => {
  it('derives stageEnteredAt + the per-stage SLA, per stage', () => {
    const entered = new Date('2026-08-01T00:00:00.000Z');
    for (const [stage, days] of [
      ['1', 14],
      ['2', 21],
      ['3', 14],
    ] as const) {
      const [r] = normalizeAppealSignals([appealCase({ stage, stageEnteredAt: entered })], NOW);
      expect(r!.deadlineAt!.getTime(), `stage ${stage}`).toBe(entered.getTime() + days * DAY);
      expect(r!.raisedAt!.getTime()).toBe(entered.getTime());
    }
  });

  it('honours a per-Pariwar SLA override', () => {
    const entered = new Date('2026-08-01T00:00:00.000Z');
    const [r] = normalizeAppealSignals([appealCase({ stageEnteredAt: entered })], NOW, {
      stage1: 3,
      stage2: 3,
      stage3: 3,
    });
    expect(r!.deadlineAt!.getTime()).toBe(entered.getTime() + 3 * DAY);
  });

  it('a long-overdue stage entry derives a breached severity', () => {
    const [r] = normalizeAppealSignals(
      [appealCase({ stage: '1', stageEnteredAt: new Date(NOW.getTime() - 60 * DAY) })],
      NOW,
    );
    expect(r!.severity).toBe('breached');
  });
});

describe('normalizeReconciliationSignals (9.8)', () => {
  it('passes through the real deadline + raisedAt and derives severity + age', () => {
    const [r] = normalizeReconciliationSignals([reconRow()], NOW);
    expect(r!.deadlineAt!.getTime()).toBe(NOW.getTime() + 5 * DAY);
    expect(r!.ageMs).toBe(2 * DAY);
    expect(r!.severity).toBe('on_track');
  });

  it('a NULL deadline degrades into the undated tier — the row is neither dropped nor back-filled', () => {
    const [r] = normalizeReconciliationSignals([reconRow({ deadlineAt: null })], NOW);
    expect(r!.deadlineAt).toBeNull();
    expect(r!.severity).toBeNull();
    // Still aged, because reconciliation DOES carry raisedAt — so it sorts meaningfully.
    expect(r!.ageMs).toBe(2 * DAY);
  });
});

describe('normalizeModerationSignals (10.10 D9)', () => {
  it('is aged from `since` but carries NO deadline and NO severity', () => {
    const [r] = normalizeModerationSignals([moderatedMember()], NOW);
    expect(r!.ageMs).toBe(10 * DAY);
    expect(r!.raisedAt).not.toBeNull();
    expect(r!.deadlineAt).toBeNull();
    expect(r!.severity).toBeNull();
  });

  it('describes the RECORD, never what to do about it (AC5)', () => {
    const [r] = normalizeModerationSignals([moderatedMember()], NOW);
    expect(r!.label).toContain('suspended');
    expect(r!.label).not.toMatch(/should|action|recommend|overdue/i);
  });
});

describe('ageMs derivation', () => {
  it('clamps a future-dated instant to 0 rather than reporting a negative age', () => {
    const [r] = normalizeModerationSignals([moderatedMember({ since: new Date(NOW.getTime() + DAY) })], NOW);
    expect(r!.ageMs).toBe(0);
  });
});

// ── AC1/AC6 — the composed normalizer ────────────────────────────────────────────────────────

describe('normalizeTrusteeSignals — absent input ≡ absent section (AC6)', () => {
  it('emits ONLY the sections whose source was supplied', () => {
    const sections = normalizeTrusteeSignals({ moderation: [moderatedMember()] }, NOW);
    expect(Object.keys(sections)).toEqual(['moderation']);
    expect(sections.r9_voting).toBeUndefined();
  });

  it('distinguishes a SUPPLIED-but-empty source (present, empty array) from an absent one', () => {
    // This is the whole AC6 contract in one assertion: `[]` means "you may see this and there is
    // nothing here"; `undefined` means "you may not see this at all".
    const sections = normalizeTrusteeSignals({ r9Voting: [], cycleFreeze: undefined }, NOW);
    expect(sections.r9_voting).toEqual([]);
    expect('cycle_freeze' in sections).toBe(false);
  });

  it('orders each section independently (the category IS the stage grouping)', () => {
    const sections = normalizeTrusteeSignals(
      {
        appeal: [
          appealCase({ appealId: 'late', stageEnteredAt: new Date(NOW.getTime() - 1 * DAY) }),
          appealCase({ appealId: 'soon', stageEnteredAt: new Date(NOW.getTime() - 13 * DAY) }),
        ],
      },
      NOW,
    );
    expect(sections.appeal!.map((r) => r.sourceKey)).toEqual(['appeal:soon', 'appeal:late']);
  });

  it('every emitted row carries a category from the declared set', () => {
    const sections = normalizeTrusteeSignals(
      {
        cycleFreeze: { ...emptyList, readyToFreeze: [freezeCase()] },
        r9Voting: [r9Item()],
        appeal: [appealCase()],
        reconciliation: [reconRow()],
        moderation: [moderatedMember()],
      },
      NOW,
    );
    for (const rows of Object.values(sections)) {
      for (const r of rows) expect(TRUSTEE_SIGNAL_CATEGORIES).toContain(r.category);
    }
  });
});
