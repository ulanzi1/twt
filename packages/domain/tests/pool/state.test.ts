// Pool lifecycle reducer — pure, DB-free unit tests (Story 7.1, Task 3; AC2).
//
// Covers: every legal transition; identity on an inapplicable event from EVERY state;
// unknown / forward-compat event → identity; and the load-bearing determinism +
// idempotency + prefix-replay property. Tests construct PoolEventInput objects
// directly (no DB, no EventRow needed) — the claims/members test pattern.

import { describe, expect, it } from 'vitest';

import {
  POOL_LIFECYCLE_STATES,
  type PoolEventInput,
  type PoolLifecycleState,
  poolStateMachine,
} from '../../src/pool/state.js';

/** A reducer input. Payload defaults to {} (the pool reducer reads NO payload content). */
const ev = (type: string, payload: unknown = {}): PoolEventInput => ({ type, payload });

/** Fold a sequence from the machine's initial state. */
const fold = (events: PoolEventInput[]): PoolLifecycleState => poolStateMachine.fold(events);

const step = (s: PoolLifecycleState, e: PoolEventInput): PoolLifecycleState =>
  poolStateMachine.step(s, e);

// The canonical full lifecycle path, reused across tests.
const fullPath: PoolEventInput[] = [
  ev('pool.spawned'),
  ev('pool.opened_for_contributions'),
  ev('pool.closed'),
  ev('pool.settled'),
];

describe('pool lifecycle reducer — transitions', () => {
  it('initial state is spawned; pool.spawned keeps spawned', () => {
    expect(poolStateMachine.initial).toBe('spawned');
    expect(fold([ev('pool.spawned')])).toBe('spawned');
  });

  it('happy path: spawned → live → closed → settled', () => {
    expect(fold(fullPath)).toBe('settled');
  });

  it('each single transition advances exactly one step', () => {
    expect(step('spawned', ev('pool.opened_for_contributions'))).toBe('live');
    expect(step('live', ev('pool.closed'))).toBe('closed');
    expect(step('closed', ev('pool.settled'))).toBe('settled');
  });
});

describe('pool lifecycle reducer — identity on inapplicable events', () => {
  // For every (state, eventType) pair NOT on the legal edge set, the reducer must be
  // identity. Build the legal edge set and assert identity everywhere else.
  const eventTypes = [
    'pool.spawned',
    'pool.opened_for_contributions',
    'pool.closed',
    'pool.settled',
  ] as const;

  const legalEdges = new Set([
    'spawned|pool.opened_for_contributions',
    'live|pool.closed',
    'closed|pool.settled',
  ]);

  for (const state of POOL_LIFECYCLE_STATES) {
    for (const type of eventTypes) {
      const isLegal = legalEdges.has(`${state}|${type}`);
      if (isLegal) continue;
      it(`identity: ${type} from '${state}' is a no-op`, () => {
        expect(step(state, ev(type))).toBe(state);
      });
    }
  }

  it('pool.spawned is identity from every state (creation event, never regresses a live pool)', () => {
    for (const state of POOL_LIFECYCLE_STATES) {
      expect(step(state, ev('pool.spawned'))).toBe(state);
    }
  });

  it('settled is terminal — no event advances it further', () => {
    for (const type of eventTypes) {
      expect(step('settled', ev(type))).toBe('settled');
    }
  });
});

describe('pool lifecycle reducer — forward-compat + purity', () => {
  it('unknown / forward-compat event type → identity from every state', () => {
    for (const state of POOL_LIFECYCLE_STATES) {
      expect(step(state, ev('pool.some_future_event'))).toBe(state);
      expect(step(state, ev('member.signup_initiated'))).toBe(state);
    }
  });

  it('the reducer is total — payload content is never read (garbage payload is safe)', () => {
    expect(step('spawned', ev('pool.opened_for_contributions', { to_state: 'settled' }))).toBe('live');
    expect(step('spawned', ev('pool.opened_for_contributions', null))).toBe('live');
    expect(step('spawned', ev('pool.opened_for_contributions', undefined))).toBe('live');
  });

  it('deterministic + idempotent: folding the full stream twice yields the same state', () => {
    expect(fold(fullPath)).toBe(fold(fullPath));
  });

  it('prefix-replay: folding each prefix matches stepping incrementally', () => {
    let incremental: PoolLifecycleState = poolStateMachine.initial;
    for (let i = 0; i < fullPath.length; i++) {
      incremental = step(incremental, fullPath[i]!);
      expect(fold(fullPath.slice(0, i + 1))).toBe(incremental);
    }
  });
});
