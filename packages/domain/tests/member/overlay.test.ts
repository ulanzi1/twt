// account-frozen overlay evaluator — pure, DB-free unit tests (Story 3.1, Task 9; AC5).
//
// Covers the deterministic, replay-safe evaluation of the governance overlay over an
// ordered list of claim-lifecycle events (the seam the live query feeds). DB-free.

import { describe, expect, it } from 'vitest';

import {
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
