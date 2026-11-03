// Story 13.1 (AC4, AC10; QE5, QE11) — the pure field-worker reducer, the fold and the FR-85 predicate. DB-free.

import { describe, expect, it } from 'vitest';

import { FIELD_WORKER_EVENT_TYPES } from '../../src/field-worker/events.js';
import {
  FIELD_WORKER_STATES,
  FIELD_WORKER_TRANSITION_TABLE,
  acceptsNewAttributions,
  fieldWorkerStateMachine,
  foldFieldWorkerProjection,
  nextFieldWorkerState,
  type FieldWorkerReplayEvent,
} from '../../src/field-worker/state.js';

const AUTH = {
  permission_key: 'field_worker.register',
  role: 'pariwar_admin',
  grant: { dimension: 'pariwar', value: '11111111-1111-1111-1111-111111111111' },
  target: { dimension: 'district', value: 'Patna' },
  catalog_version: 59,
};
const base = { trigger: 't', actor: 'operator' as const };
let v = 0;
const ev = (type: string, payload: Record<string, unknown>): FieldWorkerReplayEvent => ({ type, payload: { ...base, ...payload }, eventVersion: ++v });
const registered = (district = 'Patna') => ev('field_worker.registered', { from_state: null, to_state: 'pending_kyc', authorization: AUTH, district });
const kyc = () => ev('field_worker.kyc_completed', { from_state: 'pending_kyc', to_state: 'pending_kyc' });
const activated = () => ev('field_worker.activated', { from_state: 'pending_kyc', to_state: 'active' });
const suspended = (reason_code = 'under_review') => ev('field_worker.suspended', { from_state: 'active', to_state: 'suspended', reason_code });
const reactivated = () => ev('field_worker.reactivated', { from_state: 'suspended', to_state: 'active' });
const terminated = (from_state: string, reason_code = 'inactive', ended_on = '2026-11-01') =>
  ev('field_worker.terminated', { from_state, to_state: 'terminated', reason_code, ended_on });
const posted = (state: string, from_district: string, to_district: string, reason_code = 'reassigned') =>
  ev('field_worker.posted', { from_state: state, to_state: state, authorization: AUTH, from_district, to_district, reason_code });

describe('the transition table and the reducer AGREE on every (state × event type) pair (AC4)', () => {
  it('nextFieldWorkerState returns the arm’s `to` or null — for all 4 × 7 pairs', () => {
    let legal = 0;
    for (const state of FIELD_WORKER_STATES) {
      for (const type of FIELD_WORKER_EVENT_TYPES) {
        const arm = FIELD_WORKER_TRANSITION_TABLE.find((t) => t.from === state && t.event === type);
        expect(nextFieldWorkerState(state, type), `${state} × ${type}`).toBe(arm ? arm.to : null);
        expect(fieldWorkerStateMachine.step(state, { type, payload: {} }), `${state} × ${type}`).toBe(arm ? arm.to : state);
        if (arm) legal += 1;
      }
    }
    expect(legal).toBe(10); // QE5: kyc, activate, suspend, reactivate, 3 × posted, 3 × terminated
  });

  it('QE5 specifics: `registered` has NO arm; nothing leaves `terminated` (`posted` included); `suspended` only from `active`', () => {
    for (const s of FIELD_WORKER_STATES) expect(nextFieldWorkerState(s, 'field_worker.registered')).toBeNull();
    for (const t of FIELD_WORKER_EVENT_TYPES) expect(nextFieldWorkerState('terminated', t)).toBeNull();
    expect(nextFieldWorkerState('pending_kyc', 'field_worker.suspended')).toBeNull();
    expect(nextFieldWorkerState('active', 'field_worker.kyc_completed')).toBeNull();
    expect(fieldWorkerStateMachine.initial).toBe('pending_kyc');
  });

  it('TR1: the same-state legal events are legal — legality is `!== null`, ⛔ `to !== from`', () => {
    expect(nextFieldWorkerState('pending_kyc', 'field_worker.kyc_completed')).toBe('pending_kyc');
    for (const s of ['pending_kyc', 'active', 'suspended'] as const) expect(nextFieldWorkerState(s, 'field_worker.posted')).toBe(s);
  });
});

describe('foldFieldWorkerProjection — pure, never throws (AC4, I4)', () => {
  it('an empty stream is the initial pending_kyc, version 0', () => {
    expect(foldFieldWorkerProjection([])).toEqual({ state: 'pending_kyc', version: 0, kycStatus: 'pending', reasonCode: null, district: null, endedOn: null });
  });

  it('the full life: registered → kyc → activated → suspended → posted → reactivated → terminated', () => {
    v = 0;
    const s = [registered('Patna'), kyc(), activated(), suspended('at_worker_request'), posted('suspended', 'Patna', 'Gaya'), reactivated(), terminated('active', 'left_voluntarily', '2026-10-31')];
    expect(foldFieldWorkerProjection(s.slice(0, 1))).toMatchObject({ state: 'pending_kyc', kycStatus: 'pending', district: 'Patna', version: 1 });
    expect(foldFieldWorkerProjection(s.slice(0, 2))).toMatchObject({ state: 'pending_kyc', kycStatus: 'completed' });
    expect(foldFieldWorkerProjection(s.slice(0, 4))).toMatchObject({ state: 'suspended', reasonCode: 'at_worker_request' });
    // A `posted` event NEVER changes the reason — a suspended worker who is moved keeps their suspension reason.
    expect(foldFieldWorkerProjection(s.slice(0, 5))).toMatchObject({ state: 'suspended', reasonCode: 'at_worker_request', district: 'Gaya' });
    expect(foldFieldWorkerProjection(s.slice(0, 6))).toMatchObject({ state: 'active', reasonCode: null, district: 'Gaya' });
    expect(foldFieldWorkerProjection(s)).toEqual({
      state: 'terminated',
      version: 7,
      kycStatus: 'completed',
      reasonCode: 'left_voluntarily',
      district: 'Gaya',
      endedOn: '2026-10-31',
    });
  });

  it('the LAST posted event wins the district', () => {
    v = 0;
    const s = [registered('Patna'), posted('pending_kyc', 'Patna', 'Gaya'), posted('pending_kyc', 'Gaya', 'Nalanda')];
    expect(foldFieldWorkerProjection(s).district).toBe('Nalanda');
  });

  it('never throws: malformed payloads and inapplicable events change nothing they cannot read', () => {
    v = 0;
    const junk: FieldWorkerReplayEvent[] = [
      { type: 'field_worker.registered', payload: null, eventVersion: 1 },
      { type: 'field_worker.activated', payload: 'x', eventVersion: 2 }, // inapplicable from pending_kyc (KYC is a command guard, the fold applies the arm)
      { type: 'field_worker.suspended', payload: { reason_code: 'bogus' }, eventVersion: 3 },
      { type: 'field_worker.unknown', payload: {}, eventVersion: 4 },
    ];
    expect(() => foldFieldWorkerProjection(junk)).not.toThrow();
    expect(foldFieldWorkerProjection(junk)).toMatchObject({ district: null, state: 'suspended', reasonCode: null, version: 4 });
  });
});

describe('acceptsNewAttributions — the FR-85 contract (QE11, AC10)', () => {
  it('true for `active` ONLY — all four states asserted', () => {
    expect(Object.fromEntries(FIELD_WORKER_STATES.map((s) => [s, acceptsNewAttributions(s)]))).toEqual({
      pending_kyc: false,
      active: true,
      suspended: false,
      terminated: false,
    });
  });
});
