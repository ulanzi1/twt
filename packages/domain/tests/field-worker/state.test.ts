// Story 13.1 (AC4, AC10; QE5, QE11) — the pure field-worker reducer, the fold and the FR-85 predicate. DB-free.

import { describe, expect, it } from 'vitest';

import { FIELD_WORKER_EVENT_TYPES } from '../../src/field-worker/events.js';
import {
  FIELD_WORKER_STATES,
  FIELD_WORKER_TRANSITION_TABLE,
  FIELD_WORKER_UNDO_TRANSITIONS,
  acceptsNewAttributions,
  fieldWorkerStateMachine,
  foldFieldWorkerProjection,
  nextFieldWorkerState,
  replayFieldWorkerState,
  type FieldWorkerReplayEvent,
} from '../../src/field-worker/state.js';

const AUTH = {
  permission_key: 'field_worker.register',
  role: 'pariwar_admin',
  grant: { dimension: 'pariwar', value: '11111111-1111-1111-1111-111111111111' },
  target: { dimension: 'district', value: 'Patna' },
  catalog_version: 59,
};
/** The trigger each command computes (QE6; the WRITE schemas in `events.ts` refuse any other value since review R3-16 — the FOLD ignores it, R4-10). */
const TRIGGER: Record<string, (p: Record<string, unknown>) => string> = {
  'field_worker.registered': () => 'field_worker.register',
  'field_worker.kyc_completed': () => 'field_worker.kyc_complete',
  'field_worker.activated': () => 'field_worker.activate',
  'field_worker.suspended': (p) => `field_worker.suspend:${String(p['reason_code'])}`,
  'field_worker.reactivated': () => 'field_worker.reactivate',
  'field_worker.terminated': (p) => `field_worker.terminate:${String(p['reason_code'])}`,
  'field_worker.posted': () => 'field_worker.post',
  'field_worker.ending_undone': (p) => `field_worker.undo_ending:${String(p['cause'] ?? 'mistake')}`,
};
let v = 0;
const ev = (type: string, payload: Record<string, unknown>): FieldWorkerReplayEvent => ({
  type,
  payload: { trigger: TRIGGER[type]!(payload), actor: 'operator', ...payload },
  eventVersion: ++v,
});
const registered = (district = 'Patna') => ev('field_worker.registered', { from_state: null, to_state: 'pending_kyc', authorization: AUTH, district });
const kyc = () => ev('field_worker.kyc_completed', { from_state: 'pending_kyc', to_state: 'pending_kyc' });
const activated = () => ev('field_worker.activated', { from_state: 'pending_kyc', to_state: 'active' });
const suspended = (reason_code = 'under_review') => ev('field_worker.suspended', { from_state: 'active', to_state: 'suspended', reason_code });
const reactivated = () => ev('field_worker.reactivated', { from_state: 'suspended', to_state: 'active' });
const terminated = (from_state: string, reason_code = 'inactive', ended_on = '2026-11-01') =>
  ev('field_worker.terminated', { from_state, to_state: 'terminated', reason_code, ended_on });
/** Story 13.1f (AD2) — the undo; the fold reads only `to_state` and `reason_code` (its fold-only shape). */
const undone = (to_state: string, reason_code: string | null = null, undone_ending_version = v) =>
  ev('field_worker.ending_undone', { from_state: 'terminated', to_state, cause: 'mistake', appeal_id: null, undone_ending_version, reason_code });
/** Story 13.1c AD4 — a move carries a `field_worker.move` snapshot (the fold ignores it; ⛔ the registrar's key). */
const posted = (state: string, from_district: string, to_district: string, reason_code = 'reassigned') =>
  ev('field_worker.posted', { from_state: state, to_state: state, authorization: { ...AUTH, permission_key: 'field_worker.move', catalog_version: 62 }, from_district, to_district, reason_code });

describe('the transition table and the reducer AGREE on every (state × event type) pair (AC4)', () => {
  // Review R3-13 — the table and the reducer read the SAME constant, so "agree" alone is true by construction; QE5's ten arms are
  // written out HERE, independently, so a wrong arm fails whatever the count.
  it('the table IS QE5’s ten arms — written out literally, independent of the source', () => {
    const arms = (rows: ReadonlyArray<{ from: string; event: string; to: string }>) => rows.map((r) => `${r.from} --${r.event}--> ${r.to}`).sort();
    expect(arms(FIELD_WORKER_TRANSITION_TABLE)).toEqual(
      arms([
        { from: 'pending_kyc', event: 'field_worker.kyc_completed', to: 'pending_kyc' },
        { from: 'pending_kyc', event: 'field_worker.activated', to: 'active' },
        { from: 'active', event: 'field_worker.suspended', to: 'suspended' },
        { from: 'suspended', event: 'field_worker.reactivated', to: 'active' },
        { from: 'pending_kyc', event: 'field_worker.posted', to: 'pending_kyc' },
        { from: 'active', event: 'field_worker.posted', to: 'active' },
        { from: 'suspended', event: 'field_worker.posted', to: 'suspended' },
        { from: 'pending_kyc', event: 'field_worker.terminated', to: 'terminated' },
        { from: 'active', event: 'field_worker.terminated', to: 'terminated' },
        { from: 'suspended', event: 'field_worker.terminated', to: 'terminated' },
      ]),
    );
  });

  it('nextFieldWorkerState returns the arm’s `to` or null — for all 4 × 7 TABLE pairs (the undo is payload-dependent — its own legs below, TR1)', () => {
    let legal = 0;
    for (const state of FIELD_WORKER_STATES) {
      for (const type of FIELD_WORKER_EVENT_TYPES.filter((t) => t !== 'field_worker.ending_undone')) {
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

  // Review R4-10 — the fold reads ONLY the fields it projects: a stored event whose `trigger` is not today's text (a later rename) still folds
  // its district, reason and last day — it must not silently null them while the row keeps the real value.
  it('an event whose trigger is NOT today’s text still folds its district, reason and last day (the fold ignores the audit note)', () => {
    v = 0;
    const renamed = (e: FieldWorkerReplayEvent): FieldWorkerReplayEvent => ({ ...e, payload: { ...(e.payload as object), trigger: 'field_worker.renamed_later' } });
    const s = [renamed(registered('Patna')), kyc(), activated(), renamed(posted('active', 'Patna', 'Gaya')), renamed(terminated('active', 'left_voluntarily', '2026-10-31'))];
    expect(foldFieldWorkerProjection(s)).toEqual({ state: 'terminated', version: 5, kycStatus: 'completed', reasonCode: 'left_voluntarily', district: 'Gaya', endedOn: '2026-10-31' });
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
      { type: 'field_worker.activated', payload: 'x', eventVersion: 2 }, // APPLIED: the arm is legal from pending_kyc (KYC is a command guard, not the fold's) — the junk payload is simply never read
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

// Story 13.1f (AD3; AC1 (f); TR1) — the ONE payload-dependent arm: `field_worker.ending_undone` from `terminated` answers its payload's target.
describe('the undo arm — payload-dependent, answered BEFORE the table (AD3)', () => {
  it('the undo rows are DOCUMENTATION, ⛔ in the table: three, all from terminated; the table count stays 10 (above)', () => {
    expect(FIELD_WORKER_UNDO_TRANSITIONS.map((r) => `${r.from}>${r.to}`).sort()).toEqual(['terminated>active', 'terminated>pending_kyc', 'terminated>suspended']);
    expect(FIELD_WORKER_TRANSITION_TABLE.some((r) => r.event === 'field_worker.ending_undone')).toBe(false);
  });

  it('with no payload, or a bad one, it is null (every two-argument caller is unchanged); with each valid payload, that target', () => {
    expect(nextFieldWorkerState('terminated', 'field_worker.ending_undone')).toBeNull();
    for (const bad of [null, {}, 'x', { to_state: 'terminated', reason_code: null }, { to_state: 'active' }, { to_state: 'suspended', reason_code: 'inactive' }]) {
      expect(nextFieldWorkerState('terminated', 'field_worker.ending_undone', bad), JSON.stringify(bad)).toBeNull();
    }
    for (const row of FIELD_WORKER_UNDO_TRANSITIONS) {
      const payload = { to_state: row.to, reason_code: row.to === 'suspended' ? 'under_review' : null };
      expect(nextFieldWorkerState('terminated', 'field_worker.ending_undone', payload), row.to).toBe(row.to);
      // Only from `terminated`.
      for (const s of ['pending_kyc', 'active', 'suspended'] as const) expect(nextFieldWorkerState(s, 'field_worker.ending_undone', payload)).toBeNull();
    }
    // A table event never reads the payload.
    expect(nextFieldWorkerState('terminated', 'field_worker.posted', { to_state: 'active' })).toBeNull();
  });

  // Code review round 2, R2B-15: the old agreement loop above filters the undo out, and the fold has its own malformed-undo leg, but nothing asserted
  // the REDUCER's side of TR1: "a bad payload => null, and the reducer's identity" - `step` returns the state it was given, never another one.
  it('TR1: `fieldWorkerStateMachine.step` is the IDENTITY for an undo with no payload or a bad one, and for an undo from any state but `terminated`; with a valid one it answers the target', () => {
    for (const bad of [undefined, null, {}, 'x', 7, { to_state: 'terminated', reason_code: null }, { to_state: 'active' }, { to_state: 'suspended', reason_code: 'inactive' }]) {
      expect(fieldWorkerStateMachine.step('terminated', { type: 'field_worker.ending_undone', payload: bad as never }), JSON.stringify(bad) ?? 'undefined').toBe('terminated');
    }
    for (const row of FIELD_WORKER_UNDO_TRANSITIONS) {
      const payload = { to_state: row.to, reason_code: row.to === 'suspended' ? 'under_review' : null };
      expect(fieldWorkerStateMachine.step('terminated', { type: 'field_worker.ending_undone', payload }), row.to).toBe(row.to); // CONTROL — a valid payload moves
      for (const s of ['pending_kyc', 'active', 'suspended'] as const) {
        expect(fieldWorkerStateMachine.step(s, { type: 'field_worker.ending_undone', payload }), `${s} + undo`).toBe(s);
      }
    }
  });

  it('the state machine and replayFieldWorkerState fold the undo (reduce passes the payload)', () => {
    v = 0;
    const s = [registered(), kyc(), activated(), terminated('active'), undone('active', null, 4)];
    expect(fieldWorkerStateMachine.fold(s)).toBe('active');
    const rows = s.map((e) => ({ eventType: e.type, payload: e.payload, eventVersion: e.eventVersion })) as unknown as Parameters<typeof replayFieldWorkerState>[0];
    expect(replayFieldWorkerState(rows)).toBe('active');
  });
});

describe('foldFieldWorkerProjection folds the undo — its OWN legality call passes the payload (G17 (g); AC1 (f))', () => {
  it('per from-state: as they were — the state, the suspension reason, KYC, district; no last day', () => {
    v = 0;
    const pend = [registered('Patna'), terminated('pending_kyc', 'registered_in_error'), undone('pending_kyc', null, 2)];
    expect(foldFieldWorkerProjection(pend)).toEqual({ state: 'pending_kyc', version: 3, kycStatus: 'pending', reasonCode: null, district: 'Patna', endedOn: null });
    v = 0;
    const act = [registered('Patna'), kyc(), activated(), terminated('active', 'died'), undone('active', null, 4)];
    expect(foldFieldWorkerProjection(act)).toEqual({ state: 'active', version: 5, kycStatus: 'completed', reasonCode: null, district: 'Patna', endedOn: null });
    v = 0;
    const sus = [registered('Patna'), kyc(), activated(), suspended('at_worker_request'), posted('suspended', 'Patna', 'Gaya'), terminated('suspended'), undone('suspended', 'at_worker_request', 6)];
    expect(foldFieldWorkerProjection(sus)).toEqual({ state: 'suspended', version: 7, kycStatus: 'completed', reasonCode: 'at_worker_request', district: 'Gaya', endedOn: null });
  });

  it('two endings and one undo: the second ending stands; the prefix before it (with the undo) folds to the right state', () => {
    v = 0;
    const s = [registered(), kyc(), activated(), suspended('under_review'), terminated('suspended'), undone('suspended', 'under_review', 5), reactivated(), terminated('active', 'left_voluntarily', '2026-11-05')];
    expect(foldFieldWorkerProjection(s)).toMatchObject({ state: 'terminated', reasonCode: 'left_voluntarily', endedOn: '2026-11-05', version: 8 });
    expect(foldFieldWorkerProjection(s.slice(0, 7))).toMatchObject({ state: 'active', reasonCode: null, endedOn: null });
    expect(foldFieldWorkerProjection(s.slice(0, 6))).toMatchObject({ state: 'suspended', reasonCode: 'under_review', endedOn: null });
  });

  it('a malformed undo is not applied (pure, never throws)', () => {
    v = 0;
    const s = [registered(), terminated('pending_kyc'), ev('field_worker.ending_undone', { to_state: 'nonsense' })];
    expect(() => foldFieldWorkerProjection(s)).not.toThrow();
    expect(foldFieldWorkerProjection(s)).toMatchObject({ state: 'terminated', endedOn: '2026-11-01' });
  });
});
