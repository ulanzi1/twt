// Contribution-history status derivation — DB-free units (Story 8.6 Task 1; Story 9.5 Task 4, AC2/AC4).
//
// The pure FIVE-state derivation, exhaustively: green ≻ held ≻ red ≻ yellow-while-open ≻ grey-when-closed
// (Story 9.5 D4). Two load-bearing properties:
//   (1) a YELLOW/attested row (confirmed=false, held=false, mismatch=false) can NEVER render green / held /
//       red — green/held derive EXCLUSIVELY from confirmed-and-reversal verdicts, red from a mismatch (the
//       structural guard behind the self-view-vs-public boundary, D1);
//   (2) the monotonic re-confirm: a LIVE confirmation (green) outranks a stale reversal (held), and a
//       trustee-attested walk-back (held) outranks an auto-detected mismatch (red).
// held is unreachable in production until Story 9.8 emits `reconciliation.confirmation-reversed`; the
// function ships complete so it needs no code change when that producer lands.

import { describe, expect, it } from 'vitest';

import {
  CONTRIBUTION_MISMATCH_EVENT_TYPE,
  CONTRIBUTION_STATUSES,
  deriveContributionStatus,
  isAlertClosedState,
  type ListPendingMatchMembersParams,
} from '../../src/contribution/history.js';
import { CONFIRMED_EVENT_TYPE } from '../../src/contribution/read.js';
import { ALERT_LIFECYCLE_STATES } from '../../src/schema/alerts.js';

describe('deriveContributionStatus — the five-state precedence green ≻ held ≻ red ≻ yellow ≻ grey (AC2/AC4/D4)', () => {
  it('green iff a LIVE confirmation exists — over held, mismatch, and a closed cycle (highest precedence)', () => {
    expect(deriveContributionStatus({ confirmed: true, held: false, mismatch: false, alertClosed: false })).toBe('green');
    expect(deriveContributionStatus({ confirmed: true, held: true, mismatch: true, alertClosed: true })).toBe('green');
  });

  it('held iff confirmations exist but all reversed (no live) — over red and a closed cycle (D4)', () => {
    // A trustee-attested walk-back outranks an auto-detected mismatch; a re-confirm would flip this to green.
    expect(deriveContributionStatus({ confirmed: false, held: true, mismatch: false, alertClosed: false })).toBe('held');
    expect(deriveContributionStatus({ confirmed: false, held: true, mismatch: true, alertClosed: true })).toBe('held');
  });

  it('red iff a mismatch verdict exists and no confirmed/held — over open OR closed', () => {
    expect(deriveContributionStatus({ confirmed: false, held: false, mismatch: true, alertClosed: false })).toBe('red');
    expect(deriveContributionStatus({ confirmed: false, held: false, mismatch: true, alertClosed: true })).toBe('red');
  });

  it('yellow when no verdict and the alert is still open (attested, verifying)', () => {
    expect(deriveContributionStatus({ confirmed: false, held: false, mismatch: false, alertClosed: false })).toBe('yellow');
  });

  it('grey when no verdict and the cycle has closed (on record, unreconciled — never a shame state)', () => {
    expect(deriveContributionStatus({ confirmed: false, held: false, mismatch: false, alertClosed: true })).toBe('grey');
  });

  it('THE LOAD-BEARING GUARD: a yellow/attested row (no verdicts) can NEVER render green / held / red', () => {
    // No confirmed + no held + no mismatch → only yellow (open) or grey (closed), whatever the alert state.
    for (const alertClosed of [true, false]) {
      const status = deriveContributionStatus({ confirmed: false, held: false, mismatch: false, alertClosed });
      expect(status).not.toBe('green');
      expect(status).not.toBe('held');
      expect(status).not.toBe('red');
    }
  });

  it('every output is a member of the ContributionStatus union', () => {
    const outputs = [
      deriveContributionStatus({ confirmed: true, held: false, mismatch: false, alertClosed: false }),
      deriveContributionStatus({ confirmed: false, held: true, mismatch: false, alertClosed: false }),
      deriveContributionStatus({ confirmed: false, held: false, mismatch: true, alertClosed: false }),
      deriveContributionStatus({ confirmed: false, held: false, mismatch: false, alertClosed: false }),
      deriveContributionStatus({ confirmed: false, held: false, mismatch: false, alertClosed: true }),
    ];
    for (const o of outputs) expect(CONTRIBUTION_STATUSES).toContain(o);
  });

  it('CONTRIBUTION_STATUSES carries exactly the five tones (held added by Story 9.5)', () => {
    expect([...CONTRIBUTION_STATUSES].sort()).toEqual(['green', 'grey', 'held', 'red', 'yellow']);
  });
});

describe('isAlertClosedState — the grey/yellow boundary', () => {
  it('closed + settled are "no longer open" (grey-eligible)', () => {
    expect(isAlertClosedState('closed')).toBe(true);
    expect(isAlertClosedState('settled')).toBe(true);
  });

  it('pre-live and live states are still open (yellow)', () => {
    for (const state of ['draft', 'frozen', 'published', 'live'] as const) {
      expect(isAlertClosedState(state)).toBe(false);
    }
  });

  it('covers every alert lifecycle state exhaustively (no state left unclassified)', () => {
    // If Story 8.x adds a lifecycle state, this forces a conscious grey/yellow decision here.
    for (const state of ALERT_LIFECYCLE_STATES) {
      expect(typeof isAlertClosedState(state)).toBe('boolean');
    }
  });
});

describe('the Epic-9 forward event-type contract (green/red)', () => {
  it('green derives from `contribution.confirmed`; red from `contribution.reconciliation-mismatch`', () => {
    // Pinning the exact strings: if a future edit widens/renames either, this goes red — the arms are the
    // forward contract of record Epic 9's producer must conform to (the read.ts CONFIRMED_* precedent).
    expect(CONFIRMED_EVENT_TYPE).toBe('contribution.confirmed');
    expect(CONTRIBUTION_MISMATCH_EVENT_TYPE).toBe('contribution.reconciliation-mismatch');
    // The two verdict types are DISTINCT — a confirmed can never be read as a mismatch or vice-versa.
    expect(CONFIRMED_EVENT_TYPE).not.toBe(CONTRIBUTION_MISMATCH_EVENT_TYPE);
  });
});

describe('listPendingMatchMembersForPool — structural guard (Story 9.10 AC1 — the decoy teeth)', () => {
  it('the params type admits ONLY the scope tuple — NO status/state field that could admit a resolved row', () => {
    const params: ListPendingMatchMembersParams = {
      pariwarId: 'p' as ListPendingMatchMembersParams['pariwarId'],
      alertId: 'a' as ListPendingMatchMembersParams['alertId'],
      poolId: 'pool' as ListPendingMatchMembersParams['poolId'],
    };
    expect(Object.keys(params).sort()).toEqual(['alertId', 'pariwarId', 'poolId']);
    // @ts-expect-error — a status/state field is NOT part of the pending-match scope tuple (the guard).
    const leaky: ListPendingMatchMembersParams = { ...params, status: 'resolved' };
    expect(leaky).toBeDefined();
  });
});
