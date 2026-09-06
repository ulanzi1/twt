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
import {
  DRIVE_TARGET_PERMISSION_KEY,
  DRIVE_TARGET_VISIBILITY_PERMISSION_KEY,
} from '../../src/pool/drive-target-policy.js';
import { isDriveTargetScheduleUniqueViolation } from '../../src/pool/errors.js';
import { MAX_POOL_FIXED_AMOUNT_INR } from '../../src/pool/fixed-amount.js';
import { isCatalogKey } from '../../src/rbac/permissions.js';

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

  it('⭐⭐ is FROZEN — the fail-closed default cannot be flipped process-wide by a mutating caller', () => {
    // ⚠⛔ `resolveDriveTargetVisibility` returns THIS OBJECT on the zero-row path, ⛔ not a copy, and
    // `readonly` on the interface is compile-time only. Unfrozen, one `vis.revealToPublic = true`
    // anywhere in the process makes every Pariwar with no visibility row resolve to REVEALED, until
    // restart — the fail-closed property inverted silently, with ⛔ no row anywhere to explain it.
    expect(Object.isFrozen(DEFAULT_DRIVE_TARGET_VISIBILITY)).toBe(true);
    expect(() => {
      (DEFAULT_DRIVE_TARGET_VISIBILITY as { revealToPublic: boolean }).revealToPublic = true;
    }).toThrow();
    expect(DEFAULT_DRIVE_TARGET_VISIBILITY.revealToPublic).toBe(false);
  });
});

describe('the drive-target permission-key constants', () => {
  // ⭐ MOVED HERE from `tests/integration/pool/drive-target.spec.ts` (code review Pass 2). It asserted
  // the OPPOSITE of its own name — each constant compared to a HAND-TYPED LITERAL, i.e. exactly the
  // "re-typed literal" the title disclaimed, so renaming a catalog key left it green while every
  // `hasPermission` check silently denied. ⚠ And being DB-free it still sat inside that file's
  // `describe.skipIf(!hasDatabase)`, so it did not run at all without a live database.
  it('⭐ are REAL CATALOG KEYS, ⛔ not re-typed literals', () => {
    expect(isCatalogKey(DRIVE_TARGET_PERMISSION_KEY)).toBe(true);
    expect(isCatalogKey(DRIVE_TARGET_VISIBILITY_PERMISSION_KEY)).toBe(true);
  });

  it('⭐ are two DISTINCT keys — the authority split is in the catalog, ⛔ not in a route handler', () => {
    expect(DRIVE_TARGET_PERMISSION_KEY).not.toBe(DRIVE_TARGET_VISIBILITY_PERMISSION_KEY);
  });
});

describe('isDriveTargetScheduleUniqueViolation — the 23505 backstop predicate', () => {
  // ⚠⛔ WHY A UNIT TEST AND ⛔ NOT AN INTEGRATION ONE (family 10, closure honesty). The `catch` this
  // predicate guards is ⛔ UNREACHABLE while the advisory lock stands — that is exactly what makes it
  // defence-in-depth rather than the primary guard. Its live path opens only if the lock is removed,
  // and `drive-target-concurrency.spec.ts` now FAILS in that case by asserting `actualVersion`.
  // ⇒ what is constructible here is the predicate itself, which was otherwise pinned by ⛔ nothing:
  // deleting the whole `catch` left all four suites green.
  it('matches a 23505 carried on `err.cause` (the driver shape this repo actually sees)', () => {
    // ⚠ `extractPgError` requires a STRING `message` on the unwrapped cause — a bare `{ code }` is
    // rejected as not-a-pg-error, so the fixture must carry both, as the driver does.
    const err = new Error('duplicate key value violates unique constraint', {
      cause: {
        code: '23505',
        message: 'duplicate key value violates unique constraint',
        constraint: 'pariwar_drive_target_schedule_pariwar_current_uq',
      },
    });
    expect(isDriveTargetScheduleUniqueViolation(err)).toBe(true);
  });

  it.each([
    ['23514 (a CHECK violation — the ceiling / positivity backstops)', '23514'],
    ['22P02 (an invalid uuid — a malformed audit anchor)', '22P02'],
    ['25P02 (an already-aborted transaction)', '25P02'],
  ])('⛔ does NOT match %s', (_label, code) => {
    // ⚠ A predicate that swallowed these would convert an unrelated integrity failure into a "somebody
    // else changed it" 409 the operator can never resolve by re-reading.
    const err = new Error('x', { cause: { code, message: 'some postgres failure' } });
    expect(isDriveTargetScheduleUniqueViolation(err)).toBe(false);
  });

  it('⛔ does NOT match a non-Postgres error', () => {
    expect(isDriveTargetScheduleUniqueViolation(new Error('boom'))).toBe(false);
    expect(isDriveTargetScheduleUniqueViolation(null)).toBe(false);
  });
});
