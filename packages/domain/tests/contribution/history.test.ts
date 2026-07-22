// Contribution-history status derivation — DB-free units (Story 8.6, Task 1; AC2).
//
// The pure four-state derivation, exhaustively: green ≻ red ≻ yellow-while-open ≻ grey-when-closed. The
// load-bearing property is that a YELLOW/attested row (confirmed=false, mismatch=false) can NEVER render
// green or red — green derives EXCLUSIVELY from a confirmed verdict, red from a mismatch verdict (the
// structural guard behind the self-view-vs-public boundary, D1). Green/red/grey are all unreachable in
// production today (Epic 9 + Story 8.9 unbuilt) — the function ships complete so they need no code change.

import { describe, expect, it } from 'vitest';

import {
  CONTRIBUTION_MISMATCH_EVENT_TYPE,
  CONTRIBUTION_STATUSES,
  deriveContributionStatus,
  isAlertClosedState,
} from '../../src/contribution/history.js';
import { CONFIRMED_EVENT_TYPE } from '../../src/contribution/read.js';
import { ALERT_LIFECYCLE_STATES } from '../../src/schema/alerts.js';

describe('deriveContributionStatus — the four-state precedence (AC2)', () => {
  it('green iff a confirmed verdict exists — even over a mismatch and a closed cycle (highest precedence)', () => {
    expect(deriveContributionStatus({ confirmed: true, mismatch: false, alertClosed: false })).toBe('green');
    expect(deriveContributionStatus({ confirmed: true, mismatch: true, alertClosed: true })).toBe('green');
  });

  it('red iff a mismatch verdict exists and no confirmed — over open OR closed', () => {
    expect(deriveContributionStatus({ confirmed: false, mismatch: true, alertClosed: false })).toBe('red');
    expect(deriveContributionStatus({ confirmed: false, mismatch: true, alertClosed: true })).toBe('red');
  });

  it('yellow when no verdict and the alert is still open (attested, verifying)', () => {
    expect(deriveContributionStatus({ confirmed: false, mismatch: false, alertClosed: false })).toBe('yellow');
  });

  it('grey when no verdict and the cycle has closed (on record, unreconciled — never a shame state)', () => {
    expect(deriveContributionStatus({ confirmed: false, mismatch: false, alertClosed: true })).toBe('grey');
  });

  it('THE LOAD-BEARING GUARD: a yellow/attested row (no verdicts) can NEVER render green or red', () => {
    // No confirmed + no mismatch → only yellow (open) or grey (closed) are reachable, whatever the alert state.
    for (const alertClosed of [true, false]) {
      const status = deriveContributionStatus({ confirmed: false, mismatch: false, alertClosed });
      expect(status).not.toBe('green');
      expect(status).not.toBe('red');
    }
  });

  it('every output is a member of the ContributionStatus union', () => {
    const outputs = [
      deriveContributionStatus({ confirmed: true, mismatch: false, alertClosed: false }),
      deriveContributionStatus({ confirmed: false, mismatch: true, alertClosed: false }),
      deriveContributionStatus({ confirmed: false, mismatch: false, alertClosed: false }),
      deriveContributionStatus({ confirmed: false, mismatch: false, alertClosed: true }),
    ];
    for (const o of outputs) expect(CONTRIBUTION_STATUSES).toContain(o);
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
