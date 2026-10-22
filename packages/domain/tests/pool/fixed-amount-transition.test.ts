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
  type FixedAmountTransitionInput,
} from '../../src/pool/index.js';

const ist = (local: string): Date => new Date(`${local}+05:30`);

// A pool committed 2027-01-10 at ₹500; the change under test is to ₹600 unless a leg says otherwise.
const BASE: FixedAmountTransitionInput = {
  poolFixedAmount: 500,
  poolCommittedAt: ist('2027-01-10T09:00:00'),
  now: ist('2027-01-15T12:00:00'),
  upcoming: null,
  isFirstCycle: false,
};

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
      selectFixedAmountTransition({ ...BASE, upcoming: upcoming(ist('2027-01-12T00:00:00'), 650) }),
    ).toEqual({ stage: 'next_cycle', newAmount: 650 });
    // The boundary: effective EXACTLY at now is in force → next_cycle.
    expect(selectFixedAmountTransition({ ...BASE, upcoming: upcoming(BASE.now) })?.stage).toBe('next_cycle');
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
    ['scheduled', '2027-04-14T00:00:00'],
    ['next_month', '2027-02-20T00:00:00'],
    ['next_cycle', '2027-01-12T00:00:00'],
  ] as const)('D7: an upcoming %s wins over first_cycle — one line only', (stage, eff) => {
    const out = selectFixedAmountTransition({ ...BASE, isFirstCycle: true, upcoming: upcoming(ist(eff)) });
    expect(out?.stage).toBe(stage);
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
