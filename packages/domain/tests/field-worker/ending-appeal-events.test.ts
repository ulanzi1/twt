// Story 13.1f - the appeal's event vocabulary, its state table and its pure checks, DB-free (code review round 2, R2B-3).
//
// Until this file NOTHING reached these three modules except the registry's object-identity test and the happy paths of the commands, which
// pre-check the hearer and the actor kind BEFORE a payload is built - so deleting a `hearerMatches` refinement, a `.strict()`, the human-actor
// rule, a projector cross-check or the head-version check left every spec green, although the projector is re-exported by the barrel and a
// direct caller could append a `refused` signed with the OTHER hearer's key (the DB guard stops the row update, never the event's contents).
// AC11 (the spec): "every `field_worker_ending_appeal.*` schema refuses a snapshot signed with another key".

import type pg from 'pg';
import { describe, expect, it } from 'vitest';

import {
  FIELD_WORKER_ENDING_APPEAL_EVENT_PAYLOAD_SCHEMAS,
  FIELD_WORKER_ENDING_APPEAL_EVENT_TYPES,
  FIELD_WORKER_HEAR_KEY_BY_HEARER,
  FIELD_WORKER_UNDO_ENDING_PERMISSION_KEY,
  type FieldWorkerEndingAppealEventType,
} from '../../src/field-worker/ending-appeal-events.js';
import type { EndingAppealLockedRow } from '../../src/field-worker/ending-appeal-lock.js';
import { projectEndingAppealTransition } from '../../src/field-worker/ending-appeal-project.js';
import { assertAppealActorKind, assertAppealHearer, nextEndingAppealState } from '../../src/field-worker/ending-appeal-state.js';
import { FieldWorkerAppealStreamConcurrencyError, FieldWorkerAppealWrongHearerError, FieldWorkerProjectorInputError } from '../../src/field-worker/errors.js';
import { fieldWorkerEndingAppealId, fieldWorkerId, pariwarId } from '../../src/ids/index.js';
import { authorize, type EffectiveGrant } from '../../src/rbac/check.js';

type Hearer = 'pariwar_admin' | 'trustee_panel';
const HEARERS: readonly Hearer[] = ['pariwar_admin', 'trustee_panel'];
const OTHER: Record<Hearer, Hearer> = { pariwar_admin: 'trustee_panel', trustee_panel: 'pariwar_admin' };
const KEY = FIELD_WORKER_HEAR_KEY_BY_HEARER;
const P = pariwarId('11111111-1111-1111-1111-111111111111');
const WORKER = fieldWorkerId('6ba7b810-9dad-41d1-80b4-00c04fd430c8');
const APPEAL = fieldWorkerEndingAppealId('4f3e2d1c-0b9a-4f8e-9d7c-6b5a4f3e2d1c');
const UNDONE_EVENT = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const ACTOR = '2c1f0a9e-8b7d-4c6e-9f5a-3b2c1d0e9f8a';

const snapshot = (permission_key: string) => ({
  permission_key,
  role: 'pariwar_admin',
  grant: { dimension: 'pariwar', value: P },
  target: { dimension: 'district', value: 'Patna' },
  catalog_version: 63,
});
const kindOf = (h: Hearer) => (h === 'trustee_panel' ? 'trustee' : 'operator');
const common = (h: Hearer) => ({ actor: kindOf(h), field_worker_id: WORKER, heard_by: h });

/** One VALID payload per event type, for a hearer. `superseded` is signed with the slip's undo key, whoever the hearer. */
const VALID: Record<FieldWorkerEndingAppealEventType, (h: Hearer) => Record<string, unknown>> = {
  'field_worker_ending_appeal.lodged': (h) => ({
    from_state: null,
    to_state: 'open',
    ...common(h),
    authorization: snapshot(KEY[h]),
    ending_event_version: 4,
    received_on: '2026-11-02',
    received_via: 'phone',
  }),
  'field_worker_ending_appeal.allowed': (h) => ({
    from_state: 'open',
    to_state: 'allowed',
    ...common(h),
    authorization: snapshot(KEY[h]),
    decided_on: '2026-11-03',
    undone_event_id: UNDONE_EVENT,
  }),
  'field_worker_ending_appeal.refused': (h) => ({ from_state: 'open', to_state: 'refused', ...common(h), authorization: snapshot(KEY[h]), decided_on: '2026-11-03' }),
  'field_worker_ending_appeal.withdrawn': (h) => ({ from_state: 'open', to_state: 'withdrawn', ...common(h), authorization: snapshot(KEY[h]), decided_on: '2026-11-03' }),
  // Review R3-29: the undo is never the Panel's act (`assertAppealActorKind` refuses a `trustee` with the undo key), so the VALID payload is the
  // operator's whoever heard the appeal - it carried `actor: 'trustee'` for a Panel-heard one, a payload the command never writes.
  'field_worker_ending_appeal.superseded': (h) => ({
    from_state: 'open',
    to_state: 'superseded',
    ...common(h),
    actor: 'operator',
    authorization: snapshot(FIELD_WORKER_UNDO_ENDING_PERMISSION_KEY),
    decided_on: '2026-11-03',
    undone_event_id: UNDONE_EVENT,
  }),
};
const HEAR_TYPES = FIELD_WORKER_ENDING_APPEAL_EVENT_TYPES.filter((t) => t !== 'field_worker_ending_appeal.superseded');
const parse = (type: FieldWorkerEndingAppealEventType, payload: unknown) => FIELD_WORKER_ENDING_APPEAL_EVENT_PAYLOAD_SCHEMAS[type].safeParse(payload);
const withOver = (type: FieldWorkerEndingAppealEventType, h: Hearer, over: Record<string, unknown>) => ({ ...VALID[type](h), ...over });

describe('the appeal event payload schemas (AD7, AD9, AD15; AC11)', () => {
  it('there is exactly one schema per event type, and each type\'s valid payload parses (the control for every refusal below)', () => {
    expect(Object.keys(FIELD_WORKER_ENDING_APPEAL_EVENT_PAYLOAD_SCHEMAS).sort()).toEqual([...FIELD_WORKER_ENDING_APPEAL_EVENT_TYPES].sort());
    expect(FIELD_WORKER_ENDING_APPEAL_EVENT_TYPES).toHaveLength(5);
    for (const type of FIELD_WORKER_ENDING_APPEAL_EVENT_TYPES) {
      for (const h of HEARERS) expect(parse(type, VALID[type](h)).success, `${type} / ${h}`).toBe(true);
    }
  });

  it('AC11: a lodged / allowed / refused / withdrawn event signed with the OTHER hearer\'s key is refused, at authorization.permission_key', () => {
    for (const type of HEAR_TYPES) {
      for (const h of HEARERS) {
        const r = parse(type, withOver(type, h, { authorization: snapshot(KEY[OTHER[h]]) }));
        expect(r.success, `${type} heard by ${h}, signed ${KEY[OTHER[h]]}`).toBe(false);
        expect(JSON.stringify(r.error?.issues ?? []), `${type} / ${h}`).toContain('permission_key');
      }
    }
  });

  it('AC11: those four also refuse a key that is neither hear key (a terminate key, the undo key, the read key)', () => {
    for (const type of HEAR_TYPES) {
      for (const key of ['field_worker.terminate', FIELD_WORKER_UNDO_ENDING_PERMISSION_KEY, 'field_worker.read_ending_appeals', 'field_worker.register']) {
        for (const h of HEARERS) expect(parse(type, withOver(type, h, { authorization: snapshot(key) })).success, `${type} / ${h} / ${key}`).toBe(false);
      }
    }
  });

  it('AC11: `superseded` is signed with the slip\'s undo key and with nothing else - not a hear key, whoever heard the appeal', () => {
    const t = 'field_worker_ending_appeal.superseded';
    for (const h of HEARERS) {
      expect(parse(t, VALID[t](h)).success, `undo key / ${h}`).toBe(true); // CONTROL
      for (const key of [KEY.pariwar_admin, KEY.trustee_panel, 'field_worker.terminate']) {
        expect(parse(t, withOver(t, h, { authorization: snapshot(key) })).success, `${h} / ${key}`).toBe(false);
      }
    }
  });

  it('every event is a HUMAN act (QE7): `system`, `member`, a missing actor and an unknown one are refused', () => {
    for (const type of FIELD_WORKER_ENDING_APPEAL_EVENT_TYPES) {
      for (const actor of ['system', 'member', 'service', undefined]) {
        expect(parse(type, withOver(type, 'pariwar_admin', { actor })).success, `${type} / ${String(actor)}`).toBe(false);
      }
    }
  });

  it('every schema is STRICT: a name, a mobile, a code or free text is refused - the appeal records ids, dates, the hearer and the channel only (I6)', () => {
    for (const type of FIELD_WORKER_ENDING_APPEAL_EVENT_TYPES) {
      for (const extra of [{ name: 'Ramesh' }, { mobile: '+919876543210' }, { grounds: 'free text' }, { code: 'ABC123' }]) {
        expect(parse(type, withOver(type, 'pariwar_admin', extra)).success, `${type} / ${Object.keys(extra)[0]}`).toBe(false);
      }
    }
  });

  it('the states are literals: each transition schema accepts ONLY `open` as from_state and its own to_state', () => {
    for (const type of FIELD_WORKER_ENDING_APPEAL_EVENT_TYPES.filter((t) => t !== 'field_worker_ending_appeal.lodged')) {
      for (const from_state of ['refused', 'allowed', 'withdrawn', 'superseded', null]) {
        expect(parse(type, withOver(type, 'pariwar_admin', { from_state })).success, `${type} from ${String(from_state)}`).toBe(false);
      }
      for (const to_state of ['open', 'closed']) expect(parse(type, withOver(type, 'pariwar_admin', { to_state })).success, `${type} to ${to_state}`).toBe(false);
    }
    const lodged = 'field_worker_ending_appeal.lodged';
    expect(parse(lodged, withOver(lodged, 'pariwar_admin', { from_state: 'open' })).success).toBe(false); // a lodging has no earlier state
    expect(parse(lodged, withOver(lodged, 'pariwar_admin', { to_state: 'allowed' })).success).toBe(false);
  });

  it('the lodged event names an ending (version >= 2: a worker is first ended after its genesis), a real received_on and a known channel', () => {
    const t = 'field_worker_ending_appeal.lodged';
    for (const v of [1, 0, -3, 2.5, '4', null]) expect(parse(t, withOver(t, 'pariwar_admin', { ending_event_version: v })).success, `version ${String(v)}`).toBe(false);
    expect(parse(t, withOver(t, 'pariwar_admin', { ending_event_version: 2 })).success).toBe(true); // the boundary is in
    for (const d of ['2026-02-30', '2026-13-01', '02-11-2026', '', undefined]) expect(parse(t, withOver(t, 'pariwar_admin', { received_on: d })).success, `received ${String(d)}`).toBe(false);
    for (const via of ['email', 'carrier pigeon', '', undefined]) expect(parse(t, withOver(t, 'pariwar_admin', { received_via: via })).success, `via ${String(via)}`).toBe(false);
  });

  it('a decision carries a real decided_on; an allowed or superseded one also names the undo event it rode with', () => {
    for (const type of ['allowed', 'refused', 'withdrawn', 'superseded'] as const) {
      const t = `field_worker_ending_appeal.${type}` as FieldWorkerEndingAppealEventType;
      for (const d of ['2026-02-30', '31-12-2026', '', undefined]) expect(parse(t, withOver(t, 'pariwar_admin', { decided_on: d })).success, `${type} decided ${String(d)}`).toBe(false);
    }
    for (const type of ['allowed', 'superseded'] as const) {
      const t = `field_worker_ending_appeal.${type}` as FieldWorkerEndingAppealEventType;
      for (const id of ['not-a-uuid', '', undefined]) expect(parse(t, withOver(t, 'pariwar_admin', { undone_event_id: id })).success, `${type} undone ${String(id)}`).toBe(false);
    }
  });
});

describe('the appeal state table (AD7): only an OPEN appeal moves, and only to a final state', () => {
  const TRANSITIONS = {
    'field_worker_ending_appeal.allowed': 'allowed',
    'field_worker_ending_appeal.refused': 'refused',
    'field_worker_ending_appeal.withdrawn': 'withdrawn',
    'field_worker_ending_appeal.superseded': 'superseded',
  } as const;

  it('an open appeal moves to the state each transition names', () => {
    for (const [type, to] of Object.entries(TRANSITIONS)) expect(nextEndingAppealState('open', type), type).toBe(to);
  });

  it('a FINAL appeal never moves again, by any event; the lodging is not a transition; an unknown event is nothing', () => {
    for (const state of ['allowed', 'refused', 'withdrawn', 'superseded'] as const) {
      for (const type of Object.keys(TRANSITIONS)) expect(nextEndingAppealState(state, type), `${state} + ${type}`).toBeNull();
    }
    expect(nextEndingAppealState('open', 'field_worker_ending_appeal.lodged')).toBeNull();
    expect(nextEndingAppealState('open', 'field_worker.terminated')).toBeNull();
    expect(nextEndingAppealState('open', '')).toBeNull();
  });
});

describe('the actor-kind rule (AD9) and the hearer check', () => {
  it('an act under the Panel key is `trustee`; every other act in this story is `operator`; a mismatch is refused either way', () => {
    const cases: [string, 'operator' | 'trustee'][] = [
      [KEY.trustee_panel, 'trustee'],
      [KEY.pariwar_admin, 'operator'],
      [FIELD_WORKER_UNDO_ENDING_PERMISSION_KEY, 'operator'],
    ];
    for (const [key, ok] of cases) {
      const bad = ok === 'trustee' ? 'operator' : 'trustee';
      expect(() => assertAppealActorKind('field_worker_ending_appeal.refused', ok, key), `${key} / ${ok}`).not.toThrow();
      expect(() => assertAppealActorKind('field_worker_ending_appeal.refused', bad, key), `${key} / ${bad}`).toThrow(FieldWorkerProjectorInputError);
    }
  });

  const TRUSTEE: EffectiveGrant = { pariwarId: P, role: 'trustee_panel', scopeDimension: 'pariwar', scopeValue: P };
  const PARIWAR_ADMIN: EffectiveGrant = { pariwarId: P, role: 'pariwar_admin', scopeDimension: 'pariwar', scopeValue: P };
  const SUPER: EffectiveGrant = { pariwarId: P, role: 'super_admin', scopeDimension: 'global', scopeValue: null };
  const auth = (key: string, grant: EffectiveGrant) =>
    authorize({ actorId: ACTOR, grants: [grant], key, resource: { dimension: 'district', value: 'Patna', pariwarId: P } })!;

  it('AD9: the verified key must be the one `heardBy` names - each key refused for the other hearer - and the Panel\'s key never from a GLOBAL grant', () => {
    expect(() => assertAppealHearer(WORKER, 'pariwar_admin', auth(KEY.pariwar_admin, PARIWAR_ADMIN))).not.toThrow(); // CONTROL
    expect(() => assertAppealHearer(WORKER, 'trustee_panel', auth(KEY.trustee_panel, TRUSTEE))).not.toThrow(); // CONTROL
    expect(() => assertAppealHearer(WORKER, 'trustee_panel', auth(KEY.pariwar_admin, PARIWAR_ADMIN))).toThrow(FieldWorkerAppealWrongHearerError);
    expect(() => assertAppealHearer(WORKER, 'pariwar_admin', auth(KEY.trustee_panel, TRUSTEE))).toThrow(FieldWorkerAppealWrongHearerError);
    // A super admin DERIVES every key and never acts as the Panel (Q4 A).
    expect(auth(KEY.trustee_panel, SUPER).grant.dimension).toBe('global'); // non-vacuity: the grant really is global
    expect(() => assertAppealHearer(WORKER, 'trustee_panel', auth(KEY.trustee_panel, SUPER))).toThrow(FieldWorkerAppealWrongHearerError);
    // ... but a super admin MAY hear a Pariwar-Admin-heard appeal.
    expect(() => assertAppealHearer(WORKER, 'pariwar_admin', auth(KEY.pariwar_admin, SUPER))).not.toThrow();
  });
});

describe('projectEndingAppealTransition - its checks that run BEFORE any statement, and the head-version check', () => {
  const locked = (over: Partial<EndingAppealLockedRow> = {}): EndingAppealLockedRow => ({
    appealId: APPEAL,
    fieldWorkerId: WORKER,
    state: 'open',
    stateEventVersion: 3,
    endingEventVersion: 4,
    heardBy: 'pariwar_admin',
    receivedOn: '2026-11-02',
    lodgedByUserId: ACTOR,
    endedByUserId: ACTOR,
    ...over,
  });
  /** A client that records every statement and answers the head read with `head`; one that must NOT be reached throws. */
  const client = (head: number | null, onInsert: 'stop' = 'stop') => {
    const calls: string[] = [];
    const query = async (text: string): Promise<{ rows: unknown[] }> => {
      calls.push(text.trim().split('\n')[0]!.slice(0, 40));
      if (text.startsWith('SELECT max(event_version)')) return { rows: [{ max: head === null ? null : String(head) }] };
      if (onInsert === 'stop') throw new Error('STOP: the projector reached its write');
      return { rows: [] };
    };
    return { client: { query } as unknown as pg.PoolClient, calls };
  };
  const run = (c: pg.PoolClient, payload: unknown, row = locked(), type: Parameters<typeof projectEndingAppealTransition>[1]['eventType'] = 'field_worker_ending_appeal.refused') =>
    projectEndingAppealTransition(c, { pariwarId: P, eventType: type, payload, actorId: ACTOR, auditId: UNDONE_EVENT, lockedRow: row });
  const refused = VALID['field_worker_ending_appeal.refused']('pariwar_admin');
  const caught = async (fn: () => Promise<unknown>): Promise<unknown> => fn().then(() => undefined, (e: unknown) => e);

  it('each pre-SQL refusal is a FieldWorkerProjectorInputError with NOTHING sent: a final appeal, a payload that disagrees with the locked row, a payload that fails its schema', async () => {
    const cases: [string, unknown, EndingAppealLockedRow | undefined, RegExp][] = [
      ['a FINAL appeal does not move', refused, locked({ state: 'refused' }), /does not apply to a 'refused' appeal/],
      ['from_state disagrees with the row', { ...refused, from_state: 'allowed' }, undefined, /disagree with the locked row/],
      ['to_state disagrees with the event', { ...refused, to_state: 'allowed' }, undefined, /disagree with the locked row/],
      ['another worker', { ...refused, field_worker_id: '99999999-9999-4999-8999-999999999999' }, undefined, /disagree with the locked appeal/],
      ['another hearer', { ...refused, heard_by: 'trustee_panel', authorization: snapshot(KEY.trustee_panel), actor: 'trustee' }, undefined, /disagree with the locked appeal/],
      ['a payload that fails its schema', { ...refused, decided_on: '2026-02-30' }, undefined, /fails its schema/],
      ['a name smuggled in (strict)', { ...refused, name: 'Ramesh' }, undefined, /fails its schema/],
      ['the other hearer\'s key (AD15)', { ...refused, authorization: snapshot(KEY.trustee_panel) }, undefined, /fails its schema/],
    ];
    for (const [label, payload, row, message] of cases) {
      const { client: c, calls } = client(3);
      const e = await caught(() => run(c, payload, row));
      expect(e, label).toBeInstanceOf(FieldWorkerProjectorInputError);
      expect((e as Error).message, label).toMatch(message);
      expect(calls, label).toEqual([]);
    }
  });

  // Review R3-30: heads BELOW the row (2) and an empty stream (null) too - with only heads above it, a `!==` -> `>` mutant stayed green.
  it('the head-version check: a stream that is not AT the locked row (past it, behind it, or empty) is FieldWorkerAppealStreamConcurrencyError, and the write is never sent', async () => {
    for (const head of [4, 9, 2, null]) {
      const { client: c, calls } = client(head);
      const e = await caught(() => run(c, refused, locked({ stateEventVersion: 3 })));
      expect(e, `head ${head}`).toBeInstanceOf(FieldWorkerAppealStreamConcurrencyError);
      expect(calls, `head ${head}`).toHaveLength(1); // the head read and nothing after it
      expect(calls[0], `head ${head}`).toContain('SELECT max(event_version)');
    }
    // CONTROL - the head AT the row's version passes the check and reaches the INSERT (the stub stops it there).
    const { client: c, calls } = client(3);
    const e = await caught(() => run(c, refused, locked({ stateEventVersion: 3 })));
    expect((e as Error).message).toMatch(/STOP: the projector reached its write/);
    expect(calls[0]).toContain('SELECT max(event_version)');
    expect(calls[1]).toContain('INSERT INTO events_log');
  });
});
