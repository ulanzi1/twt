// Vyawastha Shulk renewal-status derivation — pure, DB-free unit tests (Story 3.8, Task 1; AC4/AC5).
//
// `getVyawasthaShulkStatus` issues two targeted reads (getMemberStateAt + getLatestReceipt) and maps
// the result via the pure `deriveVyawasthaShulkStatus` seam — the same shape as `getMemberStateAt`
// delegating to `replayMemberState`. The DB composition is exercised end-to-end by the API integration
// test (renewal-status.spec.ts); HERE we replay the derivation with fixtures across every lifecycle
// position, asserting the boundary arithmetic (validThrough + 91d), the state-is-authority grace flag,
// and AS-OF correctness (AC5 — a member who was in grace at T reads in_renewal_grace=true at T even
// after later lapsing).

import { describe, expect, it } from 'vitest';

import { deriveVyawasthaShulkStatus } from '../../src/member/renewal-read.js';

/** `validThrough` anchor: the renewal-due instant. Grace-end boundary = this + 91 days. */
const validThrough = new Date('2026-06-01T00:00:00.000Z');
/** validThrough + 91 days (leap-safe calendar arithmetic) — the lapse boundary. */
const graceEnd = new Date('2026-08-31T00:00:00.000Z'); // Jun(30) + Jul(31) + Aug(30) past Jun 1 = +91d
/** A day offset from validThrough, as a Date. */
const at = (days: number): Date => new Date(validThrough.getTime() + days * 24 * 60 * 60 * 1000);

describe('deriveVyawasthaShulkStatus (Story 3.8 renewal status — AC4/AC5)', () => {
  it('active pre-grace (validThrough in the future) → not in grace, daysUntilGraceEnds > 90', () => {
    const status = deriveVyawasthaShulkStatus({ state: 'active', validThrough }, at(-10));
    expect(status.inRenewalGrace).toBe(false);
    expect(status.graceRemainingDays).toBeNull();
    expect(status.paidThrough).toEqual(validThrough);
    // 10 days before validThrough → 91 + 10 = 101 days until the grace-end boundary.
    expect(status.daysUntilGraceEnds).toBe(101);
  });

  it('active at Day 0 (validThrough reached, not yet grace) → still active, countdown = 91', () => {
    const status = deriveVyawasthaShulkStatus({ state: 'active', validThrough }, validThrough);
    expect(status.inRenewalGrace).toBe(false);
    expect(status.daysUntilGraceEnds).toBe(91);
    expect(status.graceRemainingDays).toBeNull();
  });

  it('active-in-grace at +30 → in grace, graceRemainingDays counts down (61)', () => {
    const status = deriveVyawasthaShulkStatus({ state: 'active-in-grace', validThrough }, at(30));
    expect(status.inRenewalGrace).toBe(true);
    expect(status.daysUntilGraceEnds).toBe(61);
    expect(status.graceRemainingDays).toBe(61);
  });

  it('active-in-grace at +60 → graceRemainingDays = 31', () => {
    const status = deriveVyawasthaShulkStatus({ state: 'active-in-grace', validThrough }, at(60));
    expect(status.inRenewalGrace).toBe(true);
    expect(status.graceRemainingDays).toBe(31);
  });

  it('active-in-grace at +89 → graceRemainingDays = 2', () => {
    const status = deriveVyawasthaShulkStatus({ state: 'active-in-grace', validThrough }, at(89));
    expect(status.graceRemainingDays).toBe(2);
  });

  it('lapsed-unpaid at +91 (boundary reached) → daysUntilGraceEnds clamped to 0, not in grace', () => {
    const status = deriveVyawasthaShulkStatus({ state: 'lapsed-unpaid', validThrough }, at(91));
    expect(status.inRenewalGrace).toBe(false);
    expect(status.daysUntilGraceEnds).toBe(0);
    expect(status.graceRemainingDays).toBeNull();
  });

  it('lapsed-unpaid well past +91 → daysUntilGraceEnds stays clamped at 0 (never negative)', () => {
    const status = deriveVyawasthaShulkStatus({ state: 'lapsed-unpaid', validThrough }, at(200));
    expect(status.daysUntilGraceEnds).toBe(0);
  });

  it('the grace-end boundary is validThrough + 91 calendar days (leap-safe)', () => {
    // One ms before the boundary → ceil to 1 day remaining; at the boundary → 0.
    const justBefore = new Date(graceEnd.getTime() - 1);
    expect(
      deriveVyawasthaShulkStatus({ state: 'active-in-grace', validThrough }, justBefore)
        .graceRemainingDays,
    ).toBe(1);
    expect(
      deriveVyawasthaShulkStatus({ state: 'lapsed-unpaid', validThrough }, graceEnd)
        .daysUntilGraceEnds,
    ).toBe(0);
  });

  it('never paid (validThrough null) → all figures null/false', () => {
    const status = deriveVyawasthaShulkStatus({ state: 'pending-fee', validThrough: null }, at(0));
    expect(status).toEqual({
      paidThrough: null,
      daysUntilGraceEnds: null,
      inRenewalGrace: false,
      graceRemainingDays: null,
    });
  });

  it('AS-OF correctness (AC5): a member who was in grace at T reads in_renewal_grace=true at T', () => {
    // The caller passes the state AS REPLAYED at T (getMemberStateAt replays ≤ T). Even if the member
    // later lapsed, the as-of read at T (state='active-in-grace') is a truthful historical snapshot.
    const atDeath = at(45);
    const status = deriveVyawasthaShulkStatus(
      { state: 'active-in-grace', validThrough },
      atDeath,
    );
    expect(status.inRenewalGrace).toBe(true);
    expect(status.graceRemainingDays).toBe(46); // 91 - 45 = 46 days of grace remained at T
  });
});
