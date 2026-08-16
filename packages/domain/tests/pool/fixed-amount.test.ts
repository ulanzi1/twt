// Fixed-amount schedule — DB-free unit suite (Story 7.5, Task 7; AC1/AC3/AC5).
//
// The PURE core of the effective-dated fixed-amount schedule: the window-resolution boundary
// semantics (`effective_from` INCLUSIVE, `effective_until` EXCLUSIVE — pinned, the getEffectiveTc
// contract), the 90-day notice-floor accept/reject + emergency bypass, and the emergency-write
// validation guards (reason/panel/amount required) that throw BEFORE any DB call. The DB shell
// (resolveEffectiveFixedAmountRow / the head-supersede mechanics / non-retroactivity) is exercised
// by the live-DB integration spec.

import { describe, expect, it } from 'vitest';

import {
  FIXED_AMOUNT_NOTICE_DAYS,
  MAX_POOL_FIXED_AMOUNT_INR,
  POOL_FIXED_AMOUNT_MIN_PANEL_SIZE,
  applyEmergencyOverride,
  meetsEmergencyBackdatingFloor,
  meetsNoticeFloor,
  PoolFixedAmountAttestationRequiredError,
  PoolFixedAmountInvalidError,
  PoolFixedAmountPanelDuplicateActorError,
  PoolFixedAmountPanelTooSmallError,
  PoolFixedAmountReasonRequiredError,
  scheduleStandardChange,
  selectEffectiveFixedAmountRow,
} from '../../src/pool/index.js';
import { pariwarId } from '../../src/ids/index.js';

const PARIWAR = pariwarId('11111111-1111-4111-8111-111111111111');
const DAY_MS = 24 * 60 * 60 * 1000;

/** A minimal schedule-window fixture for the pure selector. */
function win(version: number, from: string, until: string | null) {
  return { version, effectiveFrom: new Date(from), effectiveUntil: until === null ? null : new Date(until) };
}

// A `db` that MUST NOT be touched — the validation guards throw before any DB access. Any property
// access explodes, proving the guard short-circuited before the shell.
const forbiddenDb = new Proxy(
  {},
  {
    get() {
      throw new Error('DB was accessed — a validation guard should have thrown first (DB-free)');
    },
  },
) as never;

describe('selectEffectiveFixedAmountRow — window boundary semantics (the contract)', () => {
  const rows = [
    win(1, '2026-01-01T00:00:00Z', '2026-06-01T00:00:00Z'),
    win(2, '2026-06-01T00:00:00Z', null), // open head
  ];

  it('effective_from is INCLUSIVE — asOf == effective_from resolves that row', () => {
    const r = selectEffectiveFixedAmountRow(rows, new Date('2026-06-01T00:00:00Z'));
    expect(r?.version).toBe(2);
  });

  it('effective_until is EXCLUSIVE — asOf == effective_until does NOT resolve the closing row', () => {
    // At exactly 2026-06-01, v1 (until=2026-06-01) is EXCLUDED and v2 (from=2026-06-01) is INCLUDED.
    const at = selectEffectiveFixedAmountRow(rows, new Date('2026-06-01T00:00:00Z'));
    expect(at?.version).toBe(2);
    // One ms before, v1 (its window [Jan-01, Jun-01)) is still the sole in-force row.
    const before = selectEffectiveFixedAmountRow(rows, new Date(new Date('2026-06-01T00:00:00Z').getTime() - 1));
    expect(before?.version).toBe(1);
  });

  it('mid-window resolves the containing row; the open head has no upper bound', () => {
    expect(selectEffectiveFixedAmountRow(rows, new Date('2026-03-15T00:00:00Z'))?.version).toBe(1);
    expect(selectEffectiveFixedAmountRow(rows, new Date('2030-01-01T00:00:00Z'))?.version).toBe(2);
  });

  it('before the first effective_from → null (no entry effective)', () => {
    expect(selectEffectiveFixedAmountRow(rows, new Date('2025-12-31T23:59:59Z'))).toBeNull();
  });

  it('empty schedule → null', () => {
    expect(selectEffectiveFixedAmountRow([], new Date('2026-06-01T00:00:00Z'))).toBeNull();
  });

  it('ties broken by newest effective_from then highest version', () => {
    const overlapping = [
      win(1, '2026-01-01T00:00:00Z', null),
      win(2, '2026-01-01T00:00:00Z', null), // same from, higher version wins
      win(3, '2025-01-01T00:00:00Z', null), // older from, loses
    ];
    expect(selectEffectiveFixedAmountRow(overlapping, new Date('2026-06-01T00:00:00Z'))?.version).toBe(2);
  });
});

describe('meetsNoticeFloor — the 90-day DB-authoritative floor (D6)', () => {
  const now = new Date('2026-01-01T00:00:00Z');

  it('rejects exactly one day short of the floor', () => {
    const effectiveFrom = new Date(now.getTime() + (FIXED_AMOUNT_NOTICE_DAYS - 1) * DAY_MS);
    expect(meetsNoticeFloor(effectiveFrom, now)).toBe(false);
  });

  it('accepts exactly at the floor (inclusive)', () => {
    const effectiveFrom = new Date(now.getTime() + FIXED_AMOUNT_NOTICE_DAYS * DAY_MS);
    expect(meetsNoticeFloor(effectiveFrom, now)).toBe(true);
  });

  it('accepts well beyond the floor', () => {
    const effectiveFrom = new Date(now.getTime() + 400 * DAY_MS);
    expect(meetsNoticeFloor(effectiveFrom, now)).toBe(true);
  });

  it('rejects a past / immediate effective_from (the emergency-only case)', () => {
    expect(meetsNoticeFloor(new Date(now.getTime() - DAY_MS), now)).toBe(false);
    expect(meetsNoticeFloor(now, now)).toBe(false);
  });

  // ⛔ AC10 REVERT-SANITY ANCHOR (Story 7.11, Decision `2026-08-16-124` clause 1).
  // Every case above is written against FIXED_AMOUNT_NOTICE_DAYS, so it passes at ANY floor value —
  // which is correct for boundary semantics and USELESS as evidence that the number moved. These two
  // pin the RULED VALUE itself: restore the constant to 365 (or 60) and they go red.
  it('pins the RULED floor at 90 days — the value, not just the boundary', () => {
    expect(FIXED_AMOUNT_NOTICE_DAYS).toBe(90);
  });

  it('accepts 120 days out — a change the superseded 365-day floor would have REJECTED', () => {
    expect(meetsNoticeFloor(new Date(now.getTime() + 120 * DAY_MS), now)).toBe(true);
  });
});

describe('meetsEmergencyBackdatingFloor — the in-force bound (Decisions 2026-08-16-124 cl.6 / -125)', () => {
  const inForce = new Date('2026-01-01T00:00:00Z');

  it('accepts exactly at the in-force effective_from (inclusive)', () => {
    expect(meetsEmergencyBackdatingFloor(inForce, inForce)).toBe(true);
  });

  it('rejects one millisecond before the in-force effective_from', () => {
    expect(meetsEmergencyBackdatingFloor(new Date(inForce.getTime() - 1), inForce)).toBe(false);
  });

  it('rejects a day before the in-force effective_from', () => {
    expect(meetsEmergencyBackdatingFloor(new Date(inForce.getTime() - DAY_MS), inForce)).toBe(false);
  });

  it('accepts after the in-force effective_from, including far in the future', () => {
    expect(meetsEmergencyBackdatingFloor(new Date(inForce.getTime() + DAY_MS), inForce)).toBe(true);
    expect(meetsEmergencyBackdatingFloor(new Date(inForce.getTime() + 400 * DAY_MS), inForce)).toBe(true);
  });

  // ⛔ Vacuous at genesis — nothing is in force, so ANY instant is accepted.
  it('accepts anything when no amount is in force (genesis)', () => {
    expect(meetsEmergencyBackdatingFloor(new Date('1999-01-01T00:00:00Z'), null)).toBe(true);
  });

  // ⚠ NOT a notice floor: an emergency taking effect NOW, over an older in-force amount, passes.
  it('does not impose a notice period — an immediate emergency over an older amount is accepted', () => {
    const now = new Date(inForce.getTime() + 200 * DAY_MS);
    expect(meetsEmergencyBackdatingFloor(now, inForce)).toBe(true);
  });

  // ⛔ THE DISTINCTION Decision `2026-08-16-125` settles, pinned as a unit case so a later reader
  // cannot re-bind the predicate to the OPEN HEAD without going red. A pending future standard change
  // is the open head; the amount IN FORCE is still the older row. An emergency firing NOW must pass.
  it('accepts an emergency that precedes a PENDING future change — the bound is in-force, not open-head', () => {
    const pendingFutureHead = new Date(inForce.getTime() + 120 * DAY_MS);
    const emergencyNow = new Date(inForce.getTime() + 10 * DAY_MS);
    expect(meetsEmergencyBackdatingFloor(emergencyNow, inForce)).toBe(true);
    // …and had the bound been the open head, this is the comparison that would have rejected it:
    expect(meetsEmergencyBackdatingFloor(emergencyNow, pendingFutureHead)).toBe(false);
  });
});

describe('scheduleStandardChange — DB-free validation guards (throw before any DB touch)', () => {
  it('rejects a non-positive amount with PoolFixedAmountInvalidError', async () => {
    await expect(
      scheduleStandardChange(forbiddenDb, {
        pariwarId: PARIWAR,
        fixedAmount: 0,
        effectiveFrom: new Date('2030-01-01T00:00:00Z'),
        actorId: 'actor-1',
      }),
    ).rejects.toBeInstanceOf(PoolFixedAmountInvalidError);
  });

  it('rejects a non-integer amount with PoolFixedAmountInvalidError', async () => {
    await expect(
      scheduleStandardChange(forbiddenDb, {
        pariwarId: PARIWAR,
        fixedAmount: 500.5,
        effectiveFrom: new Date('2030-01-01T00:00:00Z'),
        actorId: 'actor-1',
      }),
    ).rejects.toBeInstanceOf(PoolFixedAmountInvalidError);
  });

  it('rejects an amount over the guard-rail ceiling with PoolFixedAmountInvalidError', async () => {
    await expect(
      scheduleStandardChange(forbiddenDb, {
        pariwarId: PARIWAR,
        fixedAmount: MAX_POOL_FIXED_AMOUNT_INR + 1,
        effectiveFrom: new Date('2030-01-01T00:00:00Z'),
        actorId: 'actor-1',
      }),
    ).rejects.toBeInstanceOf(PoolFixedAmountInvalidError);
  });

  it('accepts an amount exactly at the guard-rail ceiling (the floor+ceiling boundary, DB-free up to the throw)', async () => {
    // The ceiling itself is inclusive — only a value STRICTLY above it is rejected. This assertion
    // only proves assertPositiveAmount doesn't throw for the boundary value; the DB call after it
    // hits forbiddenDb and throws, which is the observable stopping point here.
    await expect(
      scheduleStandardChange(forbiddenDb, {
        pariwarId: PARIWAR,
        fixedAmount: MAX_POOL_FIXED_AMOUNT_INR,
        effectiveFrom: new Date('2030-01-01T00:00:00Z'),
        actorId: 'actor-1',
      }),
    ).rejects.toThrow('DB was accessed');
  });
});

describe('applyEmergencyOverride — DB-free validation guards (throw before any DB touch)', () => {
  const base = {
    pariwarId: PARIWAR,
    fixedAmount: 600,
    effectiveFrom: new Date('2026-01-01T00:00:00Z'),
    attestedByActor: 'actor-1',
    attestedDisplay: 'Trustee One',
  };

  it('rejects a non-positive amount', async () => {
    await expect(
      applyEmergencyOverride(forbiddenDb, {
        ...base,
        fixedAmount: -1,
        documentedReason: 'reserve adequacy',
        panel: [{ actor_id: 'a', actor_display: 'A' }],
      }),
    ).rejects.toBeInstanceOf(PoolFixedAmountInvalidError);
  });

  it('rejects a blank documented_reason with PoolFixedAmountReasonRequiredError', async () => {
    await expect(
      applyEmergencyOverride(forbiddenDb, {
        ...base,
        documentedReason: '   ',
        panel: [{ actor_id: 'a', actor_display: 'A' }],
      }),
    ).rejects.toBeInstanceOf(PoolFixedAmountReasonRequiredError);
  });

  it('rejects an empty panel with PoolFixedAmountAttestationRequiredError', async () => {
    await expect(
      applyEmergencyOverride(forbiddenDb, {
        ...base,
        documentedReason: 'inflation adjustment',
        panel: [],
      }),
    ).rejects.toBeInstanceOf(PoolFixedAmountAttestationRequiredError);
  });

  it('rejects a non-empty panel below the minimum size with PoolFixedAmountPanelTooSmallError', async () => {
    expect(POOL_FIXED_AMOUNT_MIN_PANEL_SIZE).toBeGreaterThan(1); // the guard is only meaningful if > 1
    await expect(
      applyEmergencyOverride(forbiddenDb, {
        ...base,
        documentedReason: 'inflation adjustment',
        panel: [{ actor_id: 'solo-actor', actor_display: 'Solo Actor' }],
      }),
    ).rejects.toBeInstanceOf(PoolFixedAmountPanelTooSmallError);
  });

  it('rejects a panel with a duplicate actor id with PoolFixedAmountPanelDuplicateActorError', async () => {
    await expect(
      applyEmergencyOverride(forbiddenDb, {
        ...base,
        documentedReason: 'inflation adjustment',
        panel: [
          { actor_id: 'dup-actor', actor_display: 'Dup Actor' },
          { actor_id: 'dup-actor', actor_display: 'Dup Actor (again)' },
        ],
      }),
    ).rejects.toBeInstanceOf(PoolFixedAmountPanelDuplicateActorError);
  });

  it('rejects an amount over the guard-rail ceiling with PoolFixedAmountInvalidError', async () => {
    await expect(
      applyEmergencyOverride(forbiddenDb, {
        ...base,
        fixedAmount: MAX_POOL_FIXED_AMOUNT_INR + 1,
        documentedReason: 'inflation adjustment',
        panel: [
          { actor_id: 'a', actor_display: 'A' },
          { actor_id: 'b', actor_display: 'B' },
        ],
      }),
    ).rejects.toBeInstanceOf(PoolFixedAmountInvalidError);
  });
});
