// The staged fixed-amount transition selector — DB-free unit suite (Story 8.15, Task 2; AC1/AC7).
//
// `selectFixedAmountTransition` is the ONE place the My Pool card's transition stage is decided. The
// boundaries ARE the contract: the stages are anchored to IST CALENDAR MONTHS of `effective_from` (D2 —
// cycles are not counted, so no copy may count them), `next_cycle` covers a change that took effect
// inside the live window (Trap 4), and an emergency change is shown as plain facts only — dated, ⛔ never
// "from next month" (Decision `2026-10-22-383`, PQ1 = B).

import { describe, expect, it } from 'vitest';

import {
  selectFixedAmountTransition,
  selectUpcomingStage,
  type FixedAmountTransitionInput,
} from '../../src/pool/index.js';

const ist = (local: string): Date => new Date(`${local}+05:30`);

// A pool committed 2027-01-10 at ₹500; the change under test is to ₹600 unless a leg says otherwise.
// `inForceNow` is the amount IN FORCE at `now` (Review D1): ₹500 = nothing has changed since the snapshot.
const BASE: FixedAmountTransitionInput = {
  poolFixedAmount: 500,
  poolCommittedAt: ist('2027-01-10T09:00:00'),
  now: ist('2027-01-15T12:00:00'),
  upcoming: null,
  inForceNow: { fixedAmount: 500 },
  memberNextLivePool: null,
  isFirstCycle: false,
};

/** The amount in force at `now` differs from the pool's snapshot — the card's `next_cycle` condition. */
const inForce = (fixedAmount: number): FixedAmountTransitionInput['inForceNow'] => ({ fixedAmount });

function upcoming(
  effectiveFrom: Date,
  fixedAmount = 600,
  changeType: 'standard' | 'emergency' = 'standard',
): FixedAmountTransitionInput['upcoming'] {
  return { effectiveFrom, fixedAmount, changeType };
}

describe('selectFixedAmountTransition — the stages (AC1)', () => {
  it.each([
    // [label, now, effectiveFrom, expected]
    ['distance ≥ 2 IST months → scheduled (Month−3 fires on announcement)', '2027-01-15T12:00:00', '2027-04-14T00:00:00', 'scheduled'],
    ['distance exactly 2 → scheduled', '2027-01-15T12:00:00', '2027-03-01T00:00:00', 'scheduled'],
    ['distance 1 → next_month', '2027-01-15T12:00:00', '2027-02-20T00:00:00', 'next_month'],
    ['distance 0 (later THIS month) → scheduled, dated — "from next month" would be false', '2027-01-15T12:00:00', '2027-01-28T00:00:00', 'scheduled'],
    ['year rollover Dec → Jan → next_month', '2026-12-20T12:00:00', '2027-01-05T00:00:00', 'next_month'],
    ['year rollover Nov → Jan → scheduled', '2026-11-20T12:00:00', '2027-01-05T00:00:00', 'scheduled'],
  ] as const)('%s', (_label, now, eff, expected) => {
    const out = selectFixedAmountTransition({
      ...BASE,
      poolCommittedAt: ist('2026-11-01T09:00:00'),
      now: ist(now),
      upcoming: upcoming(ist(eff)),
    });
    expect(out?.stage).toBe(expected);
  });

  it('scheduled / next_month carry the IST calendar date and the new amount', () => {
    expect(
      selectFixedAmountTransition({ ...BASE, upcoming: upcoming(ist('2027-04-14T00:00:00'), 650) }),
    ).toEqual({ stage: 'scheduled', effectiveOn: '2027-04-14', newAmount: 650 });
    expect(
      selectFixedAmountTransition({ ...BASE, upcoming: upcoming(ist('2027-02-20T00:00:00'), 650) }),
    ).toEqual({ stage: 'next_month', effectiveOn: '2027-02-20', newAmount: 650 });
  });

  it('effectiveOn is the IST day even when the UTC day differs (00:30 IST = previous UTC day)', () => {
    const out = selectFixedAmountTransition({ ...BASE, upcoming: upcoming(ist('2027-04-14T00:30:00')) });
    expect(out).toMatchObject({ effectiveOn: '2027-04-14' });
  });

  it('next_cycle: the change took effect AFTER the pool was committed but by now (Trap 4) — no date', () => {
    expect(
      selectFixedAmountTransition({
        ...BASE,
        upcoming: upcoming(ist('2027-01-12T00:00:00'), 650),
        inForceNow: inForce(650),
      }),
    ).toEqual({ stage: 'next_cycle', newAmount: 650 });
    // The boundary: effective EXACTLY at now is in force (the resolver is `effective_from ≤ now`) → next_cycle.
    expect(
      selectFixedAmountTransition({ ...BASE, upcoming: upcoming(BASE.now), inForceNow: inForce(600) })?.stage,
    ).toBe('next_cycle');
  });

  // Review round 2 RP1(ii): the leg above takes `next_cycle` from `inForceNow` whatever `upcoming` is, so it
  // cannot see the `> now` guard. These two isolate it: a row EXACTLY at now is never a dated stage.
  it('a row EXACTLY at now is never dated: in-force = pool → null; one ms later → dated', () => {
    expect(selectFixedAmountTransition({ ...BASE, upcoming: upcoming(BASE.now) })).toBeNull();
    expect(
      selectFixedAmountTransition({ ...BASE, upcoming: upcoming(new Date(BASE.now.getTime() + 1)) })?.stage,
    ).toBe('scheduled'); // same IST month as now → dated (distance 0)
  });

  it('a row at or before the pool commit is never a transition for this pool (the read is anchored at C)', () => {
    expect(selectFixedAmountTransition({ ...BASE, upcoming: upcoming(BASE.poolCommittedAt) })).toBeNull();
  });

  it('first_cycle: the note on the first pool at a new amount, when nothing is upcoming', () => {
    expect(selectFixedAmountTransition({ ...BASE, isFirstCycle: true })).toEqual({ stage: 'first_cycle' });
  });

  it('null when nothing is upcoming and the pool is not a first cycle ("subsequent cycles")', () => {
    expect(selectFixedAmountTransition(BASE)).toBeNull();
  });
});

describe('selectFixedAmountTransition — the IST month boundary (AC7)', () => {
  const MARCH_1 = ist('2027-03-01T00:00:00');

  it('seen at 2027-02-28 23:59 IST → next_month', () => {
    const out = selectFixedAmountTransition({
      ...BASE,
      now: ist('2027-02-28T23:59:00'),
      poolCommittedAt: ist('2027-02-20T09:00:00'),
      upcoming: upcoming(MARCH_1),
    });
    expect(out?.stage).toBe('next_month');
  });

  it('seen at 2027-01-31 23:59 IST → scheduled (two IST months away)', () => {
    const out = selectFixedAmountTransition({
      ...BASE,
      now: ist('2027-01-31T23:59:00'),
      poolCommittedAt: ist('2027-01-20T09:00:00'),
      upcoming: upcoming(MARCH_1),
    });
    expect(out?.stage).toBe('scheduled');
  });

  it('IST, not UTC: 2027-02-28T18:40Z is already 1 March in IST → distance 0 → scheduled', () => {
    // In UTC this instant is still February (distance 1 → next_month). A UTC/process-TZ month read
    // would say "from next month" on the day the change lands.
    const out = selectFixedAmountTransition({
      ...BASE,
      now: new Date('2027-02-28T18:40:00Z'),
      poolCommittedAt: ist('2027-02-20T09:00:00'),
      upcoming: upcoming(ist('2027-03-01T12:00:00')),
    });
    expect(out?.stage).toBe('scheduled');
  });

  it('process-TZ independent by construction: the result does not move with TZ', () => {
    const input: FixedAmountTransitionInput = {
      ...BASE,
      now: ist('2027-02-28T23:59:00'),
      poolCommittedAt: ist('2027-02-20T09:00:00'),
      upcoming: upcoming(MARCH_1),
    };
    const before = process.env.TZ;
    try {
      process.env.TZ = 'America/Los_Angeles';
      const la = selectFixedAmountTransition(input);
      process.env.TZ = 'Pacific/Kiritimati';
      const kiri = selectFixedAmountTransition(input);
      expect(la).toEqual(kiri);
      expect(la?.stage).toBe('next_month');
    } finally {
      if (before === undefined) delete process.env.TZ;
      else process.env.TZ = before;
    }
  });
});

describe('selectFixedAmountTransition — D6 / D7', () => {
  it('D6: a "change" to the amount the pool already holds is no change → null', () => {
    expect(
      selectFixedAmountTransition({ ...BASE, upcoming: upcoming(ist('2027-02-20T00:00:00'), 500) }),
    ).toBeNull();
    expect(
      selectFixedAmountTransition({ ...BASE, upcoming: upcoming(ist('2027-01-12T00:00:00'), 500) }),
    ).toBeNull();
  });

  it('D6: a same-amount upcoming row does not suppress the first-cycle note', () => {
    expect(
      selectFixedAmountTransition({
        ...BASE,
        isFirstCycle: true,
        upcoming: upcoming(ist('2027-02-20T00:00:00'), 500),
      }),
    ).toEqual({ stage: 'first_cycle' });
  });

  it.each([
    ['scheduled', { upcoming: upcoming(ist('2027-04-14T00:00:00')) }],
    ['next_month', { upcoming: upcoming(ist('2027-02-20T00:00:00')) }],
    ['next_cycle', { upcoming: upcoming(ist('2027-01-12T00:00:00')), inForceNow: inForce(600) }],
  ] as const)('D7: an upcoming %s wins over first_cycle — one line only', (stage, patch) => {
    const out = selectFixedAmountTransition({ ...BASE, isFirstCycle: true, ...patch });
    expect(out?.stage).toBe(stage);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// ⭐ REVIEW D1 (Option A) — `next_cycle` names the amount IN FORCE at `now`, ⛔ not the nearest row
// ═══════════════════════════════════════════════════════════════════════════════════════════════
// The as-of-C read returns only the NEAREST row after C (`LIMIT 1`). Three real sequences fooled it.
describe('selectFixedAmountTransition — next_cycle names the amount in force NOW (Review D1)', () => {
  const R2 = ist('2027-01-12T00:00:00'); // C < R2 ≤ now — the NEAREST change after C (what the as-of-C read returns)

  it('TWO changes inside the live window: the line names the LATER one (the amount the next cycle will carry)', () => {
    // Pool ₹500; ₹600 from R2; ₹700 from R3. The nearest-row read returns R2 (₹600) — the old selector
    // announced "from the next cycle ₹600" while the next cycle asks ₹700.
    expect(
      selectFixedAmountTransition({ ...BASE, upcoming: upcoming(R2, 600), inForceNow: inForce(700) }),
    ).toEqual({ stage: 'next_cycle', newAmount: 700 });
  });

  it('a later change that REVERTS to the pool\'s amount: the next cycle is unchanged → nothing is announced', () => {
    // ₹600 from R2, back to ₹500 from R3. `excludeAmount` drops R3, so the read returns R2 — the old
    // selector announced a change that was already undone.
    expect(selectFixedAmountTransition({ ...BASE, upcoming: upcoming(R2, 600), inForceNow: inForce(500) })).toBeNull();
    // …and the first-cycle note, if it applies, is still reachable (the reverted row is not "upcoming").
    expect(
      selectFixedAmountTransition({
        ...BASE,
        isFirstCycle: true,
        upcoming: upcoming(R2, 600),
        inForceNow: inForce(500),
      }),
    ).toEqual({ stage: 'first_cycle' });
  });

  it('a BACKDATED emergency (effective_from ≤ C) the as-of-C read cannot see → next_cycle from the in-force amount', () => {
    // Pool ₹500 spawned at C; an emergency ₹600 written later, effective BEFORE C. `gt(effective_from, C)`
    // misses it (upcoming = null), but ₹600 is in force now and the next cycle will carry it.
    expect(selectFixedAmountTransition({ ...BASE, upcoming: null, inForceNow: inForce(600) })).toEqual({
      stage: 'next_cycle',
      newAmount: 600,
    });
  });

  it('negative: the amount in force equals the pool\'s snapshot and nothing is upcoming → null', () => {
    expect(selectFixedAmountTransition({ ...BASE, upcoming: null, inForceNow: inForce(500) })).toBeNull();
  });

  it('negative: no in-force row resolved (null) → falls through to the future stages / null', () => {
    expect(selectFixedAmountTransition({ ...BASE, inForceNow: null })).toBeNull();
    expect(
      selectFixedAmountTransition({ ...BASE, inForceNow: null, upcoming: upcoming(ist('2027-02-20T00:00:00')) })?.stage,
    ).toBe('next_month');
  });

  it('D7: next_cycle outranks a FUTURE change — one line, naming what is in force now', () => {
    const out = selectFixedAmountTransition({
      ...BASE,
      upcoming: upcoming(ist('2027-02-20T00:00:00'), 800),
      inForceNow: inForce(600),
    });
    expect(out).toEqual({ stage: 'next_cycle', newAmount: 600 });
  });

  it('a row at or before `now` is never announced as scheduled / next_month — only the in-force amount speaks', () => {
    // Same amount in force → silent; the row is already accounted for (or moot).
    expect(selectFixedAmountTransition({ ...BASE, upcoming: upcoming(R2, 650), inForceNow: inForce(500) })).toBeNull();
  });

  // Review rounds 2–3 (RD2/RD3): when the member is already in a LATER live cycle, THAT pool is their next
  // cycle, at its own snapshot — the line names its amount, never the in-force one.
  it('RD3: the member\'s next pool at a NEW amount → next_cycle names IT (the in-force amount may differ)', () => {
    // Pool ₹500; the member's next pool ₹600; ₹700 in force since that pool was committed.
    expect(
      selectFixedAmountTransition({ ...BASE, inForceNow: inForce(700), memberNextLivePool: { fixedAmount: 600 } }),
    ).toEqual({ stage: 'next_cycle', newAmount: 600 });
    // The reverse case: the change was reverted (in force = the pool's ₹500), but the next pool was
    // committed at ₹600 meanwhile — the member's next cycle DOES ask ₹600.
    expect(
      selectFixedAmountTransition({ ...BASE, inForceNow: inForce(500), memberNextLivePool: { fixedAmount: 600 } }),
    ).toEqual({ stage: 'next_cycle', newAmount: 600 });
  });

  it('RD2/RD3: the member\'s next pool at THIS pool\'s amount → no next_cycle (and only next_cycle goes)', () => {
    const SAME = { fixedAmount: 500 } as const;
    expect(selectFixedAmountTransition({ ...BASE, inForceNow: inForce(600), memberNextLivePool: SAME })).toBeNull();
    // A future change is still announced dated; the first-cycle note still applies to this pool.
    expect(
      selectFixedAmountTransition({
        ...BASE,
        inForceNow: inForce(600),
        memberNextLivePool: SAME,
        upcoming: upcoming(ist('2027-04-14T00:00:00'), 700),
      }),
    ).toEqual({ stage: 'scheduled', effectiveOn: '2027-04-14', newAmount: 700 });
    expect(
      selectFixedAmountTransition({ ...BASE, inForceNow: inForce(600), memberNextLivePool: SAME, isFirstCycle: true }),
    ).toEqual({ stage: 'first_cycle' });
    // Control: no later pool → the same input IS next_cycle, from the in-force amount.
    expect(selectFixedAmountTransition({ ...BASE, inForceNow: inForce(600) })).toEqual({
      stage: 'next_cycle',
      newAmount: 600,
    });
  });

  it('RD3: an UNRESOLVED next pool → no next_cycle; a dated stage and the first-cycle note still stand', () => {
    expect(
      selectFixedAmountTransition({ ...BASE, inForceNow: inForce(600), memberNextLivePool: 'unresolved' }),
    ).toBeNull();
    expect(
      selectFixedAmountTransition({
        ...BASE,
        inForceNow: inForce(600),
        memberNextLivePool: 'unresolved',
        upcoming: upcoming(ist('2027-04-14T00:00:00'), 700),
      })?.stage,
    ).toBe('scheduled');
    expect(
      selectFixedAmountTransition({ ...BASE, memberNextLivePool: 'unresolved', isFirstCycle: true }),
    ).toEqual({ stage: 'first_cycle' });
  });

  // Review round 3 (F5): RD1 at selector level. The anchor itself is the handler's (pinned in the API unit
  // legs); this pins WHY it must be in SQL: given the row a read at C returns (past), the selector says
  // nothing; given the row a read at max(C, now) returns (future), it announces it dated.
  it('RD1: the row a read at C returns (past) says nothing; the row a read at max(C, now) returns (future) is dated', () => {
    const pastFromReadAtC = upcoming(R2, 600); // C < R2 ≤ now, reverted since (in force = the pool's ₹500)
    const futureFromReadAtNow = upcoming(ist('2027-04-14T00:00:00'), 700);
    expect(selectFixedAmountTransition({ ...BASE, upcoming: pastFromReadAtC })).toBeNull();
    expect(selectFixedAmountTransition({ ...BASE, upcoming: futureFromReadAtNow })).toEqual({
      stage: 'scheduled',
      effectiveOn: '2027-04-14',
      newAmount: 700,
    });
  });

  it('selectUpcomingStage never returns first_cycle (Review P3 — the handler skips the first-cycle read when it is non-null)', () => {
    expect(selectUpcomingStage({ ...BASE })).toBeNull();
    expect(selectFixedAmountTransition({ ...BASE, isFirstCycle: true })).toEqual({ stage: 'first_cycle' });
    expect(selectUpcomingStage({ ...BASE, inForceNow: inForce(600) })).toEqual({
      stage: 'next_cycle',
      newAmount: 600,
    });
    expect(selectUpcomingStage({ ...BASE, upcoming: upcoming(ist('2027-04-14T00:00:00')) })?.stage).toBe('scheduled');
  });
});

describe('selectFixedAmountTransition — emergency changes (PQ1 = B, Decision 2026-10-22-383)', () => {
  it('a future-dated emergency is shown DATED — ⛔ never "from next month", whatever the distance', () => {
    expect(
      selectFixedAmountTransition({
        ...BASE,
        upcoming: upcoming(ist('2027-02-20T00:00:00'), 650, 'emergency'),
      }),
    ).toEqual({ stage: 'scheduled', effectiveOn: '2027-02-20', newAmount: 650 });
    // The same instant as a STANDARD change would be next_month — the change type alone decides.
    expect(
      selectFixedAmountTransition({ ...BASE, upcoming: upcoming(ist('2027-02-20T00:00:00'), 650) })?.stage,
    ).toBe('next_month');
  });

  it.each([
    ['distance 0', '2027-01-28T00:00:00'],
    ['distance 2', '2027-03-05T00:00:00'],
  ] as const)('a future-dated emergency at %s → scheduled', (_l, eff) => {
    expect(
      selectFixedAmountTransition({ ...BASE, upcoming: upcoming(ist(eff), 650, 'emergency') })?.stage,
    ).toBe('scheduled');
  });

  it('an emergency that took effect inside the live window → next_cycle (case iii)', () => {
    expect(
      selectFixedAmountTransition({
        ...BASE,
        upcoming: upcoming(ist('2027-01-12T00:00:00'), 650, 'emergency'),
        inForceNow: inForce(650),
      }),
    ).toEqual({ stage: 'next_cycle', newAmount: 650 });
  });

  it('an emergency same-amount row is still no change (D6) → null', () => {
    expect(
      selectFixedAmountTransition({
        ...BASE,
        upcoming: upcoming(ist('2027-02-20T00:00:00'), 500, 'emergency'),
      }),
    ).toBeNull();
  });
});
