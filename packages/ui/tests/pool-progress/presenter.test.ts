// The `<PoolProgressCard>` load-bearing gate — Story 9.12 (Task 3; AC2/AC3). DB-free, mock-free (the
// presenter is `(input) → view-model` and nothing else — the Story 9.6 `status-pill` precedent). This is
// the confirmed-only + anti-widening teeth ([[feedback_gate_scope_semantic_coverage]] — MEANINGFUL semantic
// coverage, not a green scan). It asserts:
//   (a) the view-model over representative inputs (empty 0/N → ₹0, 0%; partial; full → 100%, isComplete);
//   (b) `amountRaisedInr === confirmedCount × fixedAmount` across a matrix (Decision 3);
//   (c) `confirmedPercentage` rounding + the empty-roster 0% (no divide-by-zero);
//   (d) non-integer / negative / non-finite operands THROW (a corrupt figure surfaces, never renders as 0);
//   (e) the impossible over-count `confirmedCount > rosterSize` THROWS (never masked into a falsely-100%
//       meter) + the legitimate boundary `confirmedCount === rosterSize` → 100% + isComplete still passes;
//   (f) ANTI-WIDENING — the input surface has EXACTLY the Decision-2 keys (a `yellow`/`pending`/`attested`/
//       `projected`/`status` field breaks the compile-time exhaustive key map); and
//   (g) CONFIRMED-ONLY — attested-but-unconfirmed members change NOTHING (there is no yellow operand);
//   (h) the meter-fill token role exists in `@twt/tokens` `color` and is the confirmed (never danger) family.

import { color } from '@twt/tokens';
import { describe, expect, it } from 'vitest';

import { COLOR_TOKEN_STATUS_CONFIRMED, derivePoolProgressCardViewModel } from '../../src/pool-progress/index.js';
import type {
  PoolProgressCardInput,
  PoolProgressCardPoolIdentity,
  PoolProgressCardViewModel,
} from '../../src/pool-progress/index.js';

const POOL: PoolProgressCardPoolIdentity = {
  letterCode: 'F',
  name: 'Kurukshetra',
  canonicalIdentifier: 'P-2026-07-042',
};

/** A valid input with the given confirmed/roster/fixed (daysRemaining fixed at 7 unless overridden). */
function input(
  overrides: Partial<PoolProgressCardInput> & {
    confirmedCount: number;
    rosterSize: number;
    fixedAmount: number;
  },
): PoolProgressCardInput {
  return { pool: POOL, daysRemaining: 7, ...overrides };
}

describe('derivePoolProgressCardViewModel — representative inputs (AC4)', () => {
  it('empty pool (0 of N) → ₹0 raised, 0%, not complete', () => {
    const vm = derivePoolProgressCardViewModel(input({ confirmedCount: 0, rosterSize: 20, fixedAmount: 500 }));
    expect(vm.confirmedCount).toBe(0);
    expect(vm.rosterSize).toBe(20);
    expect(vm.amountRaisedInr).toBe(0);
    expect(vm.confirmedPercentage).toBe(0);
    expect(vm.isComplete).toBe(false);
    expect(vm.fixedAmount).toBe(500);
    expect(vm.daysRemaining).toBe(7);
    expect(vm.pool).toEqual(POOL);
  });

  it('partial pool (7 of 20) → 35%, ₹3500 raised, not complete', () => {
    const vm = derivePoolProgressCardViewModel(input({ confirmedCount: 7, rosterSize: 20, fixedAmount: 500 }));
    expect(vm.amountRaisedInr).toBe(3500);
    expect(vm.confirmedPercentage).toBe(35);
    expect(vm.isComplete).toBe(false);
  });

  it('full pool (20 of 20) → 100%, complete', () => {
    const vm = derivePoolProgressCardViewModel(input({ confirmedCount: 20, rosterSize: 20, fixedAmount: 500 }));
    expect(vm.confirmedPercentage).toBe(100);
    expect(vm.isComplete).toBe(true);
    expect(vm.amountRaisedInr).toBe(10000);
  });

  it('emits i18n KEYS (contribution namespace) + the meter-fill token role — no copy, no hex', () => {
    const vm = derivePoolProgressCardViewModel(input({ confirmedCount: 1, rosterSize: 2, fixedAmount: 100 }));
    expect(vm.progressLabelKey).toBe('active_contribution.progress');
    expect(vm.progressA11yKey).toBe('active_contribution.progress_a11y');
    expect(vm.daysLabelKey).toBe('active_contribution.days_a11y');
    expect(vm.amountRaisedLabelKey).toBe('pool_progress.amount_raised');
    expect(vm.meterFillTokenRole).toBe(COLOR_TOKEN_STATUS_CONFIRMED);
  });
});

describe('amount raised = confirmedCount × fixedAmount — the single canonical definition (AC3, Decision 3)', () => {
  const fixedAmount = 500;
  for (const confirmedCount of [0, 1, 5, 13, 20]) {
    it(`raised === ${confirmedCount} × ${fixedAmount}`, () => {
      const vm = derivePoolProgressCardViewModel(input({ confirmedCount, rosterSize: 20, fixedAmount }));
      expect(vm.amountRaisedInr).toBe(confirmedCount * fixedAmount);
    });
  }

  it('a different fixed amount scales exactly (no per-event sum)', () => {
    const vm = derivePoolProgressCardViewModel(input({ confirmedCount: 3, rosterSize: 10, fixedAmount: 1200 }));
    expect(vm.amountRaisedInr).toBe(3600);
  });
});

describe('confirmedPercentage rounding + empty roster (AC4)', () => {
  it('rounds to the nearest integer (1 of 3 → 33%)', () => {
    const vm = derivePoolProgressCardViewModel(input({ confirmedCount: 1, rosterSize: 3, fixedAmount: 100 }));
    expect(vm.confirmedPercentage).toBe(33);
  });

  it('rounds 2 of 3 → 67%', () => {
    const vm = derivePoolProgressCardViewModel(input({ confirmedCount: 2, rosterSize: 3, fixedAmount: 100 }));
    expect(vm.confirmedPercentage).toBe(67);
  });

  it('empty roster (0 of 0) → 0%, no divide-by-zero, not complete', () => {
    const vm = derivePoolProgressCardViewModel(input({ confirmedCount: 0, rosterSize: 0, fixedAmount: 100 }));
    expect(vm.confirmedPercentage).toBe(0);
    expect(vm.isComplete).toBe(false);
    expect(vm.amountRaisedInr).toBe(0);
  });
});

describe('a corrupt figure SURFACES — non-integer / negative / non-finite THROW (AC2)', () => {
  const bads: Array<[string, Partial<PoolProgressCardInput>]> = [
    ['non-integer confirmedCount', { confirmedCount: 1.5 }],
    ['negative confirmedCount', { confirmedCount: -1 }],
    ['NaN confirmedCount', { confirmedCount: Number.NaN }],
    ['Infinity rosterSize', { rosterSize: Number.POSITIVE_INFINITY }],
    ['non-integer rosterSize', { rosterSize: 2.2 }],
    ['negative fixedAmount', { fixedAmount: -500 }],
    ['non-integer fixedAmount', { fixedAmount: 99.99 }],
    ['negative daysRemaining', { daysRemaining: -3 }],
    ['non-integer daysRemaining', { daysRemaining: 1.1 }],
  ];
  for (const [name, patch] of bads) {
    it(`throws on ${name}`, () => {
      expect(() =>
        derivePoolProgressCardViewModel(
          input({ confirmedCount: 1, rosterSize: 5, fixedAmount: 500, ...patch }),
        ),
      ).toThrow();
    });
  }
});

describe('the impossible over-count SURFACES, never masks into a falsely-full meter (AC2/AC3)', () => {
  it('confirmedCount > rosterSize THROWS (6 of 5) — the min(100,…) clamp never covers an over-count', () => {
    expect(() =>
      derivePoolProgressCardViewModel(input({ confirmedCount: 6, rosterSize: 5, fixedAmount: 500 })),
    ).toThrow(/cannot exceed/);
  });

  it('the legitimate boundary confirmedCount === rosterSize still yields 100% + isComplete', () => {
    const vm = derivePoolProgressCardViewModel(input({ confirmedCount: 5, rosterSize: 5, fixedAmount: 500 }));
    expect(vm.confirmedPercentage).toBe(100);
    expect(vm.isComplete).toBe(true);
  });
});

describe('ANTI-WIDENING — the input carries confirmed-only fields, no yellow/pending operand (Decision 2)', () => {
  // The compile-half teeth: an exhaustive key map over `keyof PoolProgressCardInput`. Adding a
  // `yellowCount`/`pendingCount`/`attestedCount`/`projectedTotal`/`status`/`utr` field to the INPUT type
  // breaks this literal (a missing key); removing a real key breaks it (an excess key). Since the input is a
  // TS type (not a zod schema), this `Record<keyof …, true>` is the analog of `pool-contributor-list`'s
  // `.strict()` decoy-teeth — the one change this presenter exists to forbid.
  const INPUT_KEYS: Record<keyof PoolProgressCardInput, true> = {
    pool: true,
    confirmedCount: true,
    rosterSize: true,
    fixedAmount: true,
    daysRemaining: true,
  };
  const POOL_KEYS: Record<keyof PoolProgressCardPoolIdentity, true> = {
    letterCode: true,
    name: true,
    canonicalIdentifier: true,
  };
  const VIEW_MODEL_KEYS: Record<keyof PoolProgressCardViewModel, true> = {
    pool: true,
    confirmedCount: true,
    rosterSize: true,
    amountRaisedInr: true,
    fixedAmount: true,
    daysRemaining: true,
    confirmedPercentage: true,
    isComplete: true,
    meterFillTokenRole: true,
    progressLabelKey: true,
    progressA11yKey: true,
    amountRaisedLabelKey: true,
    daysLabelKey: true,
  };

  it('the input surface is EXACTLY the five confirmed-only keys (no yellow/pending/attested/projected/status)', () => {
    expect(Object.keys(INPUT_KEYS).sort()).toEqual(
      ['confirmedCount', 'daysRemaining', 'fixedAmount', 'pool', 'rosterSize'].sort(),
    );
    for (const banned of ['yellowCount', 'pendingCount', 'attestedCount', 'projectedTotal', 'status', 'utr']) {
      expect(INPUT_KEYS).not.toHaveProperty(banned);
    }
  });

  it('the pool identity is EXACTLY the Story 7.2 dual-identifier triple', () => {
    expect(Object.keys(POOL_KEYS).sort()).toEqual(
      ['canonicalIdentifier', 'letterCode', 'name'].sort(),
    );
  });

  it('the view-model exposes no yellow/pending/projected total (Decision 2)', () => {
    for (const banned of [
      'attestedCount',
      'pendingCount',
      'yellowCount',
      'projectedTotal',
      'attestedTotal',
      'status',
    ]) {
      expect(VIEW_MODEL_KEYS).not.toHaveProperty(banned);
    }
  });
});

describe('CONFIRMED-ONLY — attested-but-unconfirmed members change NOTHING (Decision 2/3, the 9.5 invariant)', () => {
  it('there is no yellow operand: a pool where members ONLY attested renders identically to nobody acting', () => {
    // The presenter can ONLY be fed confirmed figures. "3 members attested but 0 confirmed" is representable
    // ONLY as confirmedCount: 0 — the attestation cannot leak into the meter or the raised amount. So it is
    // byte-for-byte identical to "nobody did anything" (also confirmedCount: 0). That IDENTITY is the proof
    // the meter cannot be inflated by intent (Story 9.5 canonical financial truth as arithmetic).
    const attestedButNoneConfirmed = derivePoolProgressCardViewModel(
      input({ confirmedCount: 0, rosterSize: 10, fixedAmount: 500 }),
    );
    const nobodyActed = derivePoolProgressCardViewModel(
      input({ confirmedCount: 0, rosterSize: 10, fixedAmount: 500 }),
    );
    expect(attestedButNoneConfirmed).toEqual(nobodyActed);
    expect(attestedButNoneConfirmed.amountRaisedInr).toBe(0);
    expect(attestedButNoneConfirmed.confirmedCount).toBe(0);
    expect(attestedButNoneConfirmed.confirmedPercentage).toBe(0);
  });

  it('only a CONFIRMED contribution moves the meter — 2 confirmed of 10 → 20%, ₹1000', () => {
    const vm = derivePoolProgressCardViewModel(input({ confirmedCount: 2, rosterSize: 10, fixedAmount: 500 }));
    expect(vm.confirmedPercentage).toBe(20);
    expect(vm.amountRaisedInr).toBe(1000);
  });
});

describe('no dangling token reference — the meter-fill role exists in @twt/tokens (AC1/AC5)', () => {
  it('resolves the meter-fill colorTokenRole against the @twt/tokens color group', () => {
    expect(color, `dangling token role ${COLOR_TOKEN_STATUS_CONFIRMED}`).toHaveProperty(
      COLOR_TOKEN_STATUS_CONFIRMED,
    );
  });

  it('the meter fill is the confirmed (green) family, NEVER a mismatch/danger role (AC5, Story 2.2)', () => {
    expect(COLOR_TOKEN_STATUS_CONFIRMED).toBe('status-confirmed');
    expect(COLOR_TOKEN_STATUS_CONFIRMED).not.toBe('status-mismatch');
  });
});
