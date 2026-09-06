// The per-Pariwar DRIVE TARGET — the PURE bounds + predicate (Story 11b.13, Task 5; AC1, AC4).
//
// ⚠ No database. The live-DB behaviour (versioning, the authority split, `expectedVersion`, RLS)
// lives in `tests/integration/pool/drive-target.spec.ts` and
// `tests/integration/rls/drive-target-policy-regression.spec.ts`. ⛔ Nothing is duplicated here.

import { describe, expect, it } from 'vitest';

import {
  DEFAULT_DRIVE_TARGET_VISIBILITY,
  MAX_DRIVE_TARGET_INR,
  isRevealCombinationAllowed,
  isValidDriveTargetInr,
} from '../../src/pool/drive-target.js';
import { MAX_POOL_FIXED_AMOUNT_INR } from '../../src/pool/fixed-amount.js';

describe('isValidDriveTargetInr', () => {
  it.each([1, 500, 500_000, MAX_DRIVE_TARGET_INR])('accepts %s', (v) => {
    expect(isValidDriveTargetInr(v)).toBe(true);
  });

  it('⭐⭐ REJECTS 0 — ⛔ it is not a boundary pass and ⛔ not a synonym for "unset"', () => {
    // ⛔⛔ Story 11b.14's meter is `amountRaisedInr / target`, so a ₹0 target is a DIVISION BY ZERO.
    // That story's ruled "⛔ no target ⇒ ⛔ no bar" covers UNSET — the ABSENCE of a schedule row —
    // ⛔ not zero-and-set. A `>= 0` bound would have collapsed two different states into one.
    expect(isValidDriveTargetInr(0)).toBe(false);
  });

  it.each([
    ['negative', -1],
    ['a float', 500.5],
    ['just above the ceiling', MAX_DRIVE_TARGET_INR + 1],
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
  ])('rejects %s', (_label, v) => {
    expect(isValidDriveTargetInr(v)).toBe(false);
  });

  it.each([
    ['a numeric string', '500'],
    ['null', null],
    ['undefined', undefined],
    ['an object', {}],
  ])('rejects %s — total over `unknown`, so a caller cannot pre-narrow past the check', (_l, v) => {
    expect(isValidDriveTargetInr(v)).toBe(false);
  });

  it('⭐ the ceiling is DISTINCT from MAX_POOL_FIXED_AMOUNT_INR — ⛔ do not "align" them', () => {
    // ⚠ They bound DIFFERENT quantities: `MAX_POOL_FIXED_AMOUNT_INR` caps what ONE member
    // contributes; this caps what a WHOLE DRIVE aims to raise. ⛔ A future "consistency" pass that
    // makes them equal is making a meaningless coincidence, not a fix.
    expect(MAX_DRIVE_TARGET_INR).not.toBe(MAX_POOL_FIXED_AMOUNT_INR);
    expect(MAX_DRIVE_TARGET_INR).toBeGreaterThan(MAX_POOL_FIXED_AMOUNT_INR);
  });
});

describe('isRevealCombinationAllowed — `member ≥ public` (2026-09-04-189 cl.3)', () => {
  it.each([
    ['both hidden', false, false],
    ['members only', true, false],
    ['both revealed', true, true],
  ])('allows %s', (_l, revealToMembers, revealToPublic) => {
    expect(isRevealCombinationAllowed({ revealToMembers, revealToPublic })).toBe(true);
  });

  it('⛔⛔ REFUSES public-revealed-while-member-hidden — the ONE forbidden combination', () => {
    // It would show the unauthenticated public MORE than a member of the Pariwar the figure belongs
    // to. ⚠ ENFORCED at the write path AND by a DB CHECK — ⛔ not documented.
    expect(isRevealCombinationAllowed({ revealToMembers: false, revealToPublic: true })).toBe(false);
  });

  it('⭐ the ordering is ONE-WAY — members-without-public is the ordinary case, ⛔ never refused', () => {
    expect(isRevealCombinationAllowed({ revealToMembers: true, revealToPublic: false })).toBe(true);
  });
});

describe('DEFAULT_DRIVE_TARGET_VISIBILITY', () => {
  it('⭐⭐ is HIDDEN FROM EVERYONE — cl.7(b), FAIL-CLOSED', () => {
    // ⚠⛔ Deliberately the OPPOSITE of the nominee-bank masking schedule's `D8-default`, which the
    // Panel ruled FAIL-OPEN (`2026-09-02-179` cl.1). ⛔ Do not "align" the two on the strength of
    // their shared shape: there an absent row governed data already lawfully published; here cl.7(b)
    // makes invisibility the ruled state and a reveal an affirmative act of the Trust.
    expect(DEFAULT_DRIVE_TARGET_VISIBILITY).toEqual({
      revealToMembers: false,
      revealToPublic: false,
    });
  });

  it('is itself a LEGAL combination — the default can never trip the member ≥ public guard', () => {
    expect(isRevealCombinationAllowed(DEFAULT_DRIVE_TARGET_VISIBILITY)).toBe(true);
  });
});
