// Confirmed-contributor read — DB-free units (Story 8.3, Task 1/Task 7).
//
// Two load-bearing DB-free checks:
//   1. `computePendingAggregate` boundaries — 0-confirmed, all-confirmed, empty-roster, over-confirmed.
//   2. The STRUCTURAL confirmed-only guard (Task 5): the read hard-filters `contribution.confirmed`
//      exactly, and its param type carries NO status/state field that could admit a non-confirmed row.
//      This is the decoy-teeth for the invariant that yellow/pending can never reach the confirmed list
//      ([[feedback_gate_scope_semantic_coverage]]) — encoded before yellow (8.4) or green (Epic 9) exist.

import { describe, expect, it } from 'vitest';

import {
  CONFIRMED_EVENT_TYPE,
  CONFIRMED_PAYLOAD_MEMBER_KEY,
  CONFIRMED_PAYLOAD_POOL_KEY,
  computePendingAggregate,
  type ListConfirmedContributorsParams,
} from '../../src/contribution/read.js';

describe('computePendingAggregate — the AGGREGATE pending signal (AC2 / D3)', () => {
  it('0 confirmed of N roster → all pending, 100%', () => {
    expect(computePendingAggregate({ rosterSize: 48, confirmedCount: 0 })).toEqual({
      pendingCount: 48,
      pendingPercentage: 100,
    });
  });

  it('all confirmed → 0 pending, 0%', () => {
    expect(computePendingAggregate({ rosterSize: 48, confirmedCount: 48 })).toEqual({
      pendingCount: 0,
      pendingPercentage: 0,
    });
  });

  it('partial confirmed → integer-rounded percentage (Latin, never a float)', () => {
    // 30 of 48 confirmed → 18 pending → 18/48 = 37.5% → rounds to 38.
    expect(computePendingAggregate({ rosterSize: 48, confirmedCount: 30 })).toEqual({
      pendingCount: 18,
      pendingPercentage: 38,
    });
  });

  it('empty roster → 0 of 0 → 0% (never a divide-by-zero)', () => {
    expect(computePendingAggregate({ rosterSize: 0, confirmedCount: 0 })).toEqual({
      pendingCount: 0,
      pendingPercentage: 0,
    });
  });

  it('defensive: confirmed > roster clamps pending to 0 (never a negative count)', () => {
    expect(computePendingAggregate({ rosterSize: 5, confirmedCount: 9 })).toEqual({
      pendingCount: 0,
      pendingPercentage: 0,
    });
  });
});

describe('confirmed-only structural guard (AC1/AC4 — the decoy teeth)', () => {
  it('the read filters on EXACTLY `contribution.confirmed` — never a set, never a parameter', () => {
    // If a future dev widens the confirmed source (e.g. to include yellow/attested), this exact-string
    // assertion goes red — the invariant genuinely bites (epics.md:2911-2915).
    expect(CONFIRMED_EVENT_TYPE).toBe('contribution.confirmed');
  });

  it('the params type admits ONLY the scope tuple — NO status/state field to carry a non-confirmed row', () => {
    // Type-level teeth: `ListConfirmedContributorsParams` is exactly { pariwarId, cycleId, poolId }. A
    // `status`/`state`/`pending`/`yellow` field is a compile error here (below), so yellow is structurally
    // unable to reach the read. This assertion documents the shape at runtime; the compile check is the guard.
    const params: ListConfirmedContributorsParams = {
      pariwarId: 'p' as ListConfirmedContributorsParams['pariwarId'],
      cycleId: 'c' as ListConfirmedContributorsParams['cycleId'],
      poolId: 'pool' as ListConfirmedContributorsParams['poolId'],
    };
    expect(Object.keys(params).sort()).toEqual(['cycleId', 'pariwarId', 'poolId']);
    // @ts-expect-error — a status/state field is NOT part of the confirmed-only scope tuple (the guard).
    const leaky: ListConfirmedContributorsParams = { ...params, status: 'yellow' };
    expect(leaky).toBeDefined();
  });

  it('the forward Epic-9 payload contract keys are stable (poolId + memberId)', () => {
    expect(CONFIRMED_PAYLOAD_POOL_KEY).toBe('poolId');
    expect(CONFIRMED_PAYLOAD_MEMBER_KEY).toBe('memberId');
  });
});
