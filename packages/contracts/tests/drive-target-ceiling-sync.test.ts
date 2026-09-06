// The drive-target CEILING, and the sync obligation Trap 4 imposes on it (Story 11b.13).
//
// ⭐⭐ WHY THIS FILE EXISTS — code review Pass 2 / chunk G2.
//
// Trap 4 rules the ceiling is a NAMED CONSTANT with a KEEP-IN-SYNC obligation. That constant is
// written down in FOUR places:
//
//   1. `packages/domain/src/pool/drive-target.ts`  — `MAX_DRIVE_TARGET_INR`   (the source of truth)
//   2. the drizzle table declaration                — DERIVES it from (1)      ✅ mechanized
//   3. migration `0115`                             — a HAND-AUTHORED literal, in a file explicitly
//                                                     frozen and never regenerated
//   4. `packages/contracts/src/drive-target/…`      — a THIRD literal, because a wire contract
//                                                     ⛔ cannot import `@twt/domain` (it would drag
//                                                     `pg` into the Metro bundle — the
//                                                     contracts↔domain bundle boundary)
//
// G1's review MECHANIZED the (1)↔(3) leg: `drive-target-policy-regression.spec.ts` asks the live
// database for `pg_get_constraintdef` and asserts it contains the domain constant, so a bump that
// leaves the applied CHECK stale FAILS rather than staying green.
//
// ⚠⛔ THE (1)↔(4) LEG WAS PROTECTED BY PROSE ALONE — a comment reading *"LOCKSTEP: if it moves in
// the domain it moves here"*. That is precisely the discipline the other leg's mechanization was
// built to replace, and [[feedback_mechanization_split_commitment]] says the un-mechanized half is
// where decay concentrates. On drift the WIRE bound and the DB CHECK disagree, and a target between
// the two either dies at Postgres as a bare `23514` — ⛔ NOT in the error-mapping registry, so an
// opaque 500, which is the exact `2026-09-05-201` failure mode this story exists not to repeat — or
// is refused at the boundary for a figure the database would happily accept.
//
// ⭐ THE SOURCE cannot import the domain; A TEST CAN. That asymmetry is the whole point of this file.
// ⛔ Do not "simplify" it by inlining the expected number — then it asserts nothing.

import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { MAX_DRIVE_TARGET_INR as CONTRACT_MAX, DriveTargetInr } from '../src/drive-target/index.js';

/**
 * Read `MAX_DRIVE_TARGET_INR` out of the DOMAIN SOURCE, ⛔ not by importing it.
 *
 * ⚠⛔ `@twt/domain` is deliberately ⛔ NOT a dependency of `@twt/contracts` — importing it here
 * would add the edge the contracts↔domain bundle boundary exists to forbid (its namespaces reach
 * `pg`, which must never enter the Metro bundle), and `@twt/domain/pool/drive-target` is not an
 * exported subpath in any case. ⭐ Reading the file keeps the assertion pointed at the real source
 * of truth while adding ⛔ no dependency at all.
 */
function domainCeiling(): number {
  const src = readFileSync(
    new URL('../../domain/src/pool/drive-target.ts', import.meta.url),
    'utf8',
  );
  const m = /export const MAX_DRIVE_TARGET_INR\s*=\s*([0-9_]+)\s*;/.exec(src);
  if (m?.[1] === undefined) {
    throw new Error(
      'MAX_DRIVE_TARGET_INR not found in packages/domain/src/pool/drive-target.ts — if it was ' +
        'renamed or moved, FIX THIS TEST rather than deleting it: it is the only thing keeping the ' +
        'wire ceiling and the domain ceiling in step.',
    );
  }
  return Number(m[1].replaceAll('_', ''));
}

const DOMAIN_MAX = domainCeiling();

describe('drive-target ceiling — the contracts↔domain sync obligation (Trap 4)', () => {
  it('⭐⭐ the CONTRACT ceiling IS the DOMAIN ceiling — ⛔ not merely "also 100000000"', () => {
    // ⚠ Compared to the imported constant, ⛔ never to a literal: a literal here would drift in
    // lockstep with nothing and would pass while the two packages disagreed.
    expect(CONTRACT_MAX).toBe(DOMAIN_MAX);
  });

  it('the wire schema ACCEPTS exactly the domain ceiling — the bound is `<=`, ⛔ not `<`', () => {
    expect(DriveTargetInr.safeParse(DOMAIN_MAX).success).toBe(true);
  });

  it('…and REFUSES one rupee above it', () => {
    expect(DriveTargetInr.safeParse(DOMAIN_MAX + 1).success).toBe(false);
  });

  it('⛔ REFUSES 0 — a division by zero for the meter, ⛔ not a synonym for "unset"', () => {
    // Story 11b.14's meter is `amountRaisedInr / target`. "No target" is the ABSENCE of a schedule
    // row, ⛔ never a zero one — a `>= 0` bound would have collapsed two different states into one.
    expect(DriveTargetInr.safeParse(0).success).toBe(false);
  });
});
