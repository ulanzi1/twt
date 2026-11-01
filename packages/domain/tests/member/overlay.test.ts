// account-frozen overlay evaluator — pure, DB-free unit tests (Story 3.1, Task 9; AC5).
//
// Covers the deterministic, replay-safe evaluation of the governance overlay over an
// ordered list of claim-lifecycle events (the seam the live query feeds). DB-free.

import { describe, expect, it } from 'vitest';

import {
  ACCOUNT_STICKY_FREEZE_EVENT_TYPE,
  ACCOUNT_UNFREEZE_EVENT_TYPES,
  type AccountOverlayEventInput,
  evaluateAccountOverlay,
} from '../../src/member/overlay.js';

const at = (iso: string): Date => new Date(iso);
const intake = (iso: string): AccountOverlayEventInput => ({ type: 'claim.intake_initiated', occurredAt: at(iso) });
const settled = (iso: string): AccountOverlayEventInput => ({ type: 'claim.settled', occurredAt: at(iso) });
const denied = (iso: string): AccountOverlayEventInput => ({ type: 'claim.denied_no_appeal', occurredAt: at(iso) });

describe('evaluateAccountOverlay — derived governance overlay (AC5)', () => {
  it('no events → not frozen', () => {
    expect(evaluateAccountOverlay([])).toEqual({ accountFrozen: false, frozenSince: null });
  });

  it('claim.intake_initiated → frozen, frozenSince = intake instant', () => {
    const r = evaluateAccountOverlay([intake('2026-01-01T00:00:00Z')]);
    expect(r.accountFrozen).toBe(true);
    expect(r.frozenSince).toEqual(at('2026-01-01T00:00:00Z'));
  });

  it('intake then settled → overlay removed (not frozen)', () => {
    const r = evaluateAccountOverlay([intake('2026-01-01T00:00:00Z'), settled('2026-02-01T00:00:00Z')]);
    expect(r).toEqual({ accountFrozen: false, frozenSince: null });
  });

  it('intake then denied_no_appeal → overlay removed', () => {
    const r = evaluateAccountOverlay([intake('2026-01-01T00:00:00Z'), denied('2026-03-01T00:00:00Z')]);
    expect(r.accountFrozen).toBe(false);
  });

  it('re-freeze after resolution → frozen again (last applicable event wins)', () => {
    const r = evaluateAccountOverlay([
      intake('2026-01-01T00:00:00Z'),
      settled('2026-02-01T00:00:00Z'),
      intake('2026-04-01T00:00:00Z'),
    ]);
    expect(r.accountFrozen).toBe(true);
    expect(r.frozenSince).toEqual(at('2026-04-01T00:00:00Z'));
  });

  it('replay-safe + deterministic: evaluating the same ordered list twice is identical', () => {
    const events = [intake('2026-01-01T00:00:00Z'), settled('2026-02-01T00:00:00Z'), intake('2026-04-01T00:00:00Z')];
    expect(evaluateAccountOverlay(events)).toEqual(evaluateAccountOverlay([...events]));
  });

  it('ignores unrelated event types', () => {
    const r = evaluateAccountOverlay([
      { type: 'member.signup_initiated', occurredAt: at('2026-01-01T00:00:00Z') },
      intake('2026-02-01T00:00:00Z'),
      { type: 'pool.spawned', occurredAt: at('2026-03-01T00:00:00Z') },
    ]);
    expect(r.accountFrozen).toBe(true);
    expect(r.frozenSince).toEqual(at('2026-02-01T00:00:00Z'));
  });

  // ── AGGREGATE over multiple claim streams (Story 6.4 — ICP override safety) ──
  // With more than one claim for one deceased member (e.g. an ICP-overridden separate case),
  // the account stays frozen while ANY associated claim is non-terminal; a single claim's
  // settle/deny must NOT clear the freeze another claim still needs.

  const intakeS = (streamId: string, iso: string): AccountOverlayEventInput => ({ type: 'claim.intake_initiated', occurredAt: at(iso), streamId });
  const settledS = (streamId: string, iso: string): AccountOverlayEventInput => ({ type: 'claim.settled', occurredAt: at(iso), streamId });
  const deniedS = (streamId: string, iso: string): AccountOverlayEventInput => ({ type: 'claim.denied_no_appeal', occurredAt: at(iso), streamId });

  it('two claims, one settled + one still open → STAYS frozen (aggregate)', () => {
    const r = evaluateAccountOverlay([
      intakeS('claim-A', '2026-01-01T00:00:00Z'),
      intakeS('claim-B', '2026-01-02T00:00:00Z'),
      settledS('claim-A', '2026-02-01T00:00:00Z'),
    ]);
    expect(r.accountFrozen).toBe(true);
    // frozenSince = the earliest still-active freeze (claim-B's intake).
    expect(r.frozenSince).toEqual(at('2026-01-02T00:00:00Z'));
  });

  it('two claims, BOTH terminal → unfrozen (aggregate)', () => {
    const r = evaluateAccountOverlay([
      intakeS('claim-A', '2026-01-01T00:00:00Z'),
      intakeS('claim-B', '2026-01-02T00:00:00Z'),
      settledS('claim-A', '2026-02-01T00:00:00Z'),
      deniedS('claim-B', '2026-03-01T00:00:00Z'),
    ]);
    expect(r).toEqual({ accountFrozen: false, frozenSince: null });
  });

  it("aggregate frozenSince tracks the earliest active claim, not a later-settled one's", () => {
    const r = evaluateAccountOverlay([
      intakeS('claim-A', '2026-01-01T00:00:00Z'),
      settledS('claim-A', '2026-01-15T00:00:00Z'),
      intakeS('claim-B', '2026-02-01T00:00:00Z'),
    ]);
    expect(r.accountFrozen).toBe(true);
    expect(r.frozenSince).toEqual(at('2026-02-01T00:00:00Z'));
  });
});

// ── Story 6.22 (DL13, N7) — the STICKY freeze: a stream carrying `claim.member_found_guilty` stays frozen ──
// ⭐ Named for the Panel's Q1: if Q1 is ruled A (a guilty member's locks lift), the sticky constant is removed and these
// "stays frozen" legs flip — visibly — together with the leaf.
describe('evaluateAccountOverlay — Story 6.22 sticky freeze (PQ1 — built B: a guilty member stays frozen)', () => {
  const ev = (type: string, streamId: string, iso: string): AccountOverlayEventInput => ({ type, occurredAt: at(iso), streamId });

  it('the constant is the guilty annotation, and it is ⛔ an unfreeze type', () => {
    expect(ACCOUNT_STICKY_FREEZE_EVENT_TYPE).toBe('claim.member_found_guilty');
    expect(ACCOUNT_UNFREEZE_EVENT_TYPES as readonly string[]).not.toContain(ACCOUNT_STICKY_FREEZE_EVENT_TYPE);
  });

  it('guilty then closed in the SAME instant (one transaction) → STAYS frozen since the intake', () => {
    const r = evaluateAccountOverlay([
      ev('claim.intake_initiated', 'claim-A', '2026-01-01T00:00:00Z'),
      ev('claim.member_found_guilty', 'claim-A', '2026-02-01T00:00:00Z'),
      ev('claim.closed', 'claim-A', '2026-02-01T00:00:00Z'),
    ]);
    expect(r).toEqual({ accountFrozen: true, frozenSince: at('2026-01-01T00:00:00Z') });
  });

  it('guilty AFTER denied_no_appeal had already unfrozen the stream → frozen again (since the intake)', () => {
    const r = evaluateAccountOverlay([
      ev('claim.intake_initiated', 'claim-A', '2026-01-01T00:00:00Z'),
      ev('claim.denied_no_appeal', 'claim-A', '2026-03-01T00:00:00Z'),
      ev('claim.member_found_guilty', 'claim-A', '2026-04-01T00:00:00Z'),
    ]);
    expect(r).toEqual({ accountFrozen: true, frozenSince: at('2026-01-01T00:00:00Z') });
  });

  it('guilty on a claim ALREADY closed (no new close) → frozen; a later settled on that stream does ⛔ unfreeze it', () => {
    const r = evaluateAccountOverlay([
      ev('claim.intake_initiated', 'claim-A', '2026-01-01T00:00:00Z'),
      ev('claim.closed', 'claim-A', '2026-02-01T00:00:00Z'),
      ev('claim.member_found_guilty', 'claim-A', '2026-03-01T00:00:00Z'),
      ev('claim.settled', 'claim-A', '2026-04-01T00:00:00Z'),
    ]);
    expect(r.accountFrozen).toBe(true);
  });

  it('an INNOCENT close (`claim.closed`, no guilty annotation) unfreezes as any close does', () => {
    const r = evaluateAccountOverlay([
      ev('claim.intake_initiated', 'claim-A', '2026-01-01T00:00:00Z'),
      ev('claim.nominee_lock_released', 'claim-A', '2026-02-01T00:00:00Z'),
      ev('claim.closed', 'claim-A', '2026-02-01T00:00:00Z'),
    ]);
    expect(r).toEqual({ accountFrozen: false, frozenSince: null });
  });

  it('per stream: a guilty finding on claim A keeps the account frozen though claim B settled', () => {
    const r = evaluateAccountOverlay([
      ev('claim.intake_initiated', 'claim-A', '2026-01-02T00:00:00Z'),
      ev('claim.intake_initiated', 'claim-B', '2026-01-01T00:00:00Z'),
      ev('claim.settled', 'claim-B', '2026-01-10T00:00:00Z'),
      ev('claim.member_found_guilty', 'claim-A', '2026-02-01T00:00:00Z'),
      ev('claim.closed', 'claim-A', '2026-02-01T00:00:00Z'),
    ]);
    expect(r).toEqual({ accountFrozen: true, frozenSince: at('2026-01-02T00:00:00Z') });
  });
});
