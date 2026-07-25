// 90-second loop — off-device p95 aggregation unit tests (Story 8.12, Task 4; AC2).
//
// Pins the SHARED percentile convention: p95 must equal @twt/measured-validation's floor-indexed
// nearest-rank value for the sample (a different convention would report a different number for the same
// data — the whole point of the versioned-evidence discipline). Also proves incomplete sessions are
// dropped BEFORE aggregation, and that the budget gate has teeth (a breach flips `passesTwtBudget`).

import { describe, expect, it } from 'vitest';
import { percentile } from '@twt/measured-validation';

import {
  aggregateLoopSessions,
  TOTAL_BUDGET_MS,
  TWT_PORTION_BUDGET_MS,
  type ExportedLoopSession,
} from './loop-90s-aggregate';

/** A complete exported session with a given TWT-portion + total (ms). */
function complete(twtPortionMs: number, totalMs: number): ExportedLoopSession {
  return { twtPortionMs, totalMs, upiRoundTripMs: 30000, memberThinkMs: 8000, complete: true };
}

/** Ten complete sessions with TWT-portions 1000, 2000, … 10000 ms (well under the 60s budget). */
function tenGoodSessions(): ExportedLoopSession[] {
  return Array.from({ length: 10 }, (_, i) => complete((i + 1) * 1000, (i + 1) * 1000 + 38000));
}

describe('aggregateLoopSessions — the shared percentile convention (AC2)', () => {
  it('computes p95 TWT-portion as the floor-indexed nearest-rank value (pins the convention)', () => {
    const agg = aggregateLoopSessions(tenGoodSessions());
    const sortedTwt = tenGoodSessions()
      .map((s) => s.twtPortionMs as number)
      .sort((a, b) => a - b);
    // The SAME core the doc's number is produced by — not a hand-rolled percentile.
    expect(agg.twtPortion.p95).toBe(percentile(sortedTwt, 95));
    expect(agg.twtPortion.p95).toBe(10000); // floor(0.95 * 10) = 9 → sortedTwt[9]
    expect(agg.twtPortion.p50).toBe(6000); // floor(0.50 * 10) = 5 → sortedTwt[5]
  });

  it('reports p95 total the same way and counts complete sessions', () => {
    const agg = aggregateLoopSessions(tenGoodSessions());
    expect(agg.nComplete).toBe(10);
    expect(agg.total.p95).toBe(48000); // 10000 + 38000
  });

  it('passes both budgets when p95 TWT-portion ≤ 60s and p95 total ≤ 90s', () => {
    const agg = aggregateLoopSessions(tenGoodSessions());
    expect(TWT_PORTION_BUDGET_MS).toBe(60000);
    expect(TOTAL_BUDGET_MS).toBe(90000);
    expect(agg.passesTwtBudget).toBe(true);
    expect(agg.passesTotalBudget).toBe(true);
  });
});

describe('aggregateLoopSessions — incomplete exclusion + gate teeth', () => {
  it('drops incomplete sessions BEFORE aggregating (never a NaN in the p95)', () => {
    const sessions: ExportedLoopSession[] = [
      ...tenGoodSessions(),
      { twtPortionMs: null, totalMs: null, complete: false }, // already-attested shortcut (D1a)
      { twtPortionMs: null, totalMs: 999999, complete: false }, // out-of-order / partial
    ];
    const agg = aggregateLoopSessions(sessions);
    expect(agg.n).toBe(12);
    expect(agg.nComplete).toBe(10);
    expect(Number.isNaN(agg.twtPortion.p95)).toBe(false);
    expect(agg.twtPortion.p95).toBe(10000); // the two incompletes did not shift the percentile
  });

  it('FAILS the TWT budget when the p95 breaches 60s (the gate has teeth)', () => {
    // Nine fast sessions + one 65s TWT-portion → p95 (index 9) lands on the slow one.
    const sessions: ExportedLoopSession[] = [
      ...Array.from({ length: 9 }, (_, i) => complete((i + 1) * 1000, (i + 1) * 1000 + 38000)),
      complete(65000, 103000),
    ];
    const agg = aggregateLoopSessions(sessions);
    expect(agg.twtPortion.p95).toBe(65000);
    expect(agg.passesTwtBudget).toBe(false);
  });

  it('throws when there are no complete sessions to aggregate (honest empty, not a fake zero)', () => {
    expect(() => aggregateLoopSessions([{ twtPortionMs: null, totalMs: null, complete: false }])).toThrow();
  });

  it('throws below the ≥10 sample floor even with complete sessions (Review finding, 2026-07-25 — a 1-2 session run must not silently pass as a met gate)', () => {
    const fiveComplete = Array.from({ length: 5 }, (_, i) => complete((i + 1) * 1000, (i + 1) * 1000 + 38000));
    expect(() => aggregateLoopSessions(fiveComplete)).toThrow(/≥10/);
  });
});
