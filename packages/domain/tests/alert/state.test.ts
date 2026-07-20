// Alert lifecycle reducer — pure, DB-free unit tests (Story 8.1, Task 5; AC1).
//
// Covers: every legal transition; identity on an inapplicable event from EVERY state;
// unknown / forward-compat event → identity; and the load-bearing determinism +
// idempotency + prefix-replay property. Tests construct AlertEventInput objects directly
// (no DB, no EventRow needed) — the pool/claims/members test pattern. The reducer authors
// ALL six states; this story emits only frozen/published/live, but the closed/settled arms
// are exercised here (they exist even though 8.9 / Epic 9 own the emitters).

import { describe, expect, it } from 'vitest';

import {
  ALERT_LIFECYCLE_STATES,
  type AlertEventInput,
  type AlertLifecycleState,
  alertStateMachine,
} from '../../src/alert/state.js';

/** A reducer input. Payload defaults to {} (the alert reducer reads NO payload content). */
const ev = (type: string, payload: unknown = {}): AlertEventInput => ({ type, payload });

/** Fold a sequence from the machine's initial state. */
const fold = (events: AlertEventInput[]): AlertLifecycleState => alertStateMachine.fold(events);

const step = (s: AlertLifecycleState, e: AlertEventInput): AlertLifecycleState =>
  alertStateMachine.step(s, e);

// The canonical full lifecycle path, reused across tests.
const fullPath: AlertEventInput[] = [
  ev('alert.frozen'),
  ev('alert.published'),
  ev('alert.live'),
  ev('alert.closed'),
  ev('alert.settled'),
];

describe('alert lifecycle reducer — transitions', () => {
  it('initial state is draft; alert.frozen advances draft → frozen', () => {
    expect(alertStateMachine.initial).toBe('draft');
    expect(fold([ev('alert.frozen')])).toBe('frozen');
  });

  it('happy path: draft → frozen → published → live → closed → settled', () => {
    expect(fold(fullPath)).toBe('settled');
  });

  it('cycle-open path (this story emits): draft → frozen → published → live', () => {
    expect(fold([ev('alert.frozen'), ev('alert.published'), ev('alert.live')])).toBe('live');
  });

  it('each single transition advances exactly one step', () => {
    expect(step('draft', ev('alert.frozen'))).toBe('frozen');
    expect(step('frozen', ev('alert.published'))).toBe('published');
    expect(step('published', ev('alert.live'))).toBe('live');
    expect(step('live', ev('alert.closed'))).toBe('closed');
    expect(step('closed', ev('alert.settled'))).toBe('settled');
  });
});

describe('alert lifecycle reducer — identity on inapplicable events', () => {
  // For every (state, eventType) pair NOT on the legal edge set, the reducer must be
  // identity. Build the legal edge set and assert identity everywhere else.
  const eventTypes = [
    'alert.frozen',
    'alert.published',
    'alert.live',
    'alert.closed',
    'alert.settled',
  ] as const;

  const legalEdges = new Set([
    'draft|alert.frozen',
    'frozen|alert.published',
    'published|alert.live',
    'live|alert.closed',
    'closed|alert.settled',
  ]);

  for (const state of ALERT_LIFECYCLE_STATES) {
    for (const type of eventTypes) {
      const isLegal = legalEdges.has(`${state}|${type}`);
      if (isLegal) continue;
      it(`identity: ${type} from '${state}' is a no-op`, () => {
        expect(step(state, ev(type))).toBe(state);
      });
    }
  }

  it('alert.frozen is identity from every non-draft state (genesis never regresses a live alert)', () => {
    for (const state of ALERT_LIFECYCLE_STATES) {
      if (state === 'draft') continue;
      expect(step(state, ev('alert.frozen'))).toBe(state);
    }
  });

  it('settled is terminal — no event advances it further', () => {
    for (const type of eventTypes) {
      expect(step('settled', ev(type))).toBe('settled');
    }
  });
});

describe('alert lifecycle reducer — forward-compat + purity', () => {
  it('unknown / forward-compat event type → identity from every state', () => {
    for (const state of ALERT_LIFECYCLE_STATES) {
      expect(step(state, ev('alert.some_future_event'))).toBe(state);
      expect(step(state, ev('pool.spawned'))).toBe(state);
    }
  });

  it('the reducer is total — payload content is never read (garbage payload is safe)', () => {
    expect(step('draft', ev('alert.frozen', { to_state: 'settled' }))).toBe('frozen');
    expect(step('draft', ev('alert.frozen', null))).toBe('frozen');
    expect(step('draft', ev('alert.frozen', undefined))).toBe('frozen');
  });

  it('deterministic + idempotent: folding the full stream twice yields the same state', () => {
    expect(fold(fullPath)).toBe(fold(fullPath));
  });

  it('prefix-replay: folding each prefix matches stepping incrementally', () => {
    let incremental: AlertLifecycleState = alertStateMachine.initial;
    for (let i = 0; i < fullPath.length; i++) {
      incremental = step(incremental, fullPath[i]!);
      expect(fold(fullPath.slice(0, i + 1))).toBe(incremental);
    }
  });

  it('no regression from a corrupt/out-of-order replay (a stray published before frozen is identity)', () => {
    // draft --alert.published--> (identity: draft) --alert.frozen--> frozen
    expect(fold([ev('alert.published'), ev('alert.frozen')])).toBe('frozen');
    // A duplicated live event does not advance past live.
    expect(fold([ev('alert.frozen'), ev('alert.published'), ev('alert.live'), ev('alert.live')])).toBe('live');
  });
});
