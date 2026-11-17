// Story 13.1f — the undo of an ending against the live DB (AC1–AC4, AC8; AD2–AD6; decision `2026-11-16-464`, the Panel's `2026-11-17-465`
// Q6 B). Per-test ROLLBACK, as twt_app under a FRESH Pariwar's scope each test (RLS is live). Every refusal: its typed error, and a CONTROL
// that the caller's transaction is still usable or that the same path writes when allowed. The races (two connections, committed rows)
// are the API's race spec; the HTTP shape, the audit lines and the as-of read across transactions are the API's specs.

import { randomUUID } from 'node:crypto';

import type pg from 'pg';
import { beforeEach, describe, expect, it } from 'vitest';

import * as fieldWorker from '../../../src/field-worker/index.js';
import {
  activateFieldWorker,
  allowFieldWorkerEndingAppeal,
  lockFieldWorkerRow,
  recordFieldWorkerKycCompleted,
  suspendFieldWorker,
  terminateFieldWorker,
  undoFieldWorkerEnding,
} from '../../../src/field-worker/commands.js';
import {
  lodgeFieldWorkerEndingAppeal,
  refuseFieldWorkerEndingAppeal,
  withdrawFieldWorkerEndingAppeal,
} from '../../../src/field-worker/ending-appeal-commands.js';
import { hasPanelRefusedAppealOnCurrentEnding } from '../../../src/field-worker/ending-appeal-read.js';
import {
  FieldWorkerAppealRefusedByPanelError,
  FieldWorkerAuthorizationStaleError,
  FieldWorkerEndingChangedError,
  FieldWorkerIllegalTransitionError,
  FieldWorkerNumberRegisteredAgainError,
  FieldWorkerProjectorInputError,
} from '../../../src/field-worker/errors.js';
import { openFieldWorkerMoveRequest } from '../../../src/field-worker/move-request-commands.js';
import { projectFieldWorkerTransition } from '../../../src/field-worker/project.js';
import { acceptsNewAttributions } from '../../../src/field-worker/state.js';
import { bindScopedDb } from '../../../src/db.js';
import {
  fieldWorkerEndingAppealId as toAppealId,
  fieldWorkerMoveRequestId as toRequestId,
  pariwarId as toPariwarId,
  type FieldWorkerEndingAppealId,
  type FieldWorkerId,
  type PariwarId,
} from '../../../src/ids/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { enterAppScope, seedRoleGrant, seedUser } from '../_helpers.js';
import { actAuthorization, approval, caught, expectRowMatchesStream, grantAuthorization, registerReal, streamTypes } from './_fixtures.js';

interface Cast {
  P: PariwarId;
  daPatna: string;
  pa: string;
  pa2: string;
  tp: string;
  tp2: string;
  sa: string;
}

async function seedCast(): Promise<Cast> {
  const { tx } = getTx();
  const P = toPariwarId(randomUUID());
  const daPatna = await seedRoleGrant(tx, P, { role: 'district_admin', scopeDimension: 'district', scopeValue: 'Patna' });
  const pa = await seedRoleGrant(tx, P, { role: 'pariwar_admin', scopeDimension: 'pariwar', scopeValue: P });
  const pa2 = await seedRoleGrant(tx, P, { role: 'pariwar_admin', scopeDimension: 'pariwar', scopeValue: P });
  const tp = await seedRoleGrant(tx, P, { role: 'trustee_panel', scopeDimension: 'pariwar', scopeValue: P });
  const tp2 = await seedRoleGrant(tx, P, { role: 'trustee_panel', scopeDimension: 'pariwar', scopeValue: P });
  const sa = await seedUser(tx);
  return { P, daPatna, pa, pa2, tp, tp2, sa };
}

type Grant = Parameters<typeof grantAuthorization>[1];
const PA: Grant = { role: 'pariwar_admin' };
const TP: Grant = { role: 'trustee_panel' };
const SA: Grant = { role: 'super_admin' };
const auth = (key: string, grant: Grant, P: string, actorId: string, district = 'Patna') => {
  const a = grantAuthorization(key, grant, P, district, actorId);
  if (a === null) throw new Error(`the real check refused ${key} for ${grant.role}`);
  return a;
};
const base = (P: PariwarId, actorId: string, actor: 'operator' | 'trustee' = 'operator') => ({ pariwarId: P, auditId: randomUUID(), actor, actorId });

async function istToday(c: pg.PoolClient): Promise<string> {
  return (await c.query<{ d: string }>("SELECT ((now() AT TIME ZONE 'Asia/Kolkata')::date)::text AS d")).rows[0]!.d;
}
async function row(c: pg.PoolClient, id: string): Promise<Record<string, unknown>> {
  return (
    await c.query(
      'SELECT current_state, state_reason_code, kyc_status, district, ended_on::text AS ended_on, state_event_version, approved_by_display FROM field_workers WHERE field_worker_id = $1',
      [id],
    )
  ).rows[0] as Record<string, unknown>;
}
async function version(c: pg.PoolClient, id: string): Promise<number> {
  return Number((await row(c, id)).state_event_version);
}
async function lastPayload(c: pg.PoolClient, id: string): Promise<Record<string, unknown>> {
  return (
    await c.query<{ payload: Record<string, unknown> }>('SELECT payload FROM events_log WHERE stream_id = $1 ORDER BY event_version DESC LIMIT 1', [id])
  ).rows[0]!.payload;
}

describe.skipIf(!hasDatabase)('Story 13.1f — the undo of an ending (live DB)', () => {
  setupLiveDb();
  let cast: Cast;
  let c: pg.PoolClient;
  let worker: FieldWorkerId;

  beforeEach(async () => {
    cast = await seedCast();
    c = getTx().client;
    await enterAppScope(c, cast.P);
    worker = await registerReal(c, cast.P, { district: 'Patna' });
  });

  async function activate(id: FieldWorkerId = worker): Promise<void> {
    await recordFieldWorkerKycCompleted(c, { ...base(cast.P, cast.pa), fieldWorkerId: id, ...approval(cast.P, 'Patna', cast.pa) });
    await activateFieldWorker(c, { ...base(cast.P, cast.pa), fieldWorkerId: id, ...approval(cast.P, 'Patna', cast.pa) });
  }
  async function end(
    o: { id?: FieldWorkerId; by?: string; reason?: string; heardBy?: 'pariwar_admin' | 'trustee_panel' } = {},
  ): Promise<number> {
    const id = o.id ?? worker;
    const by = o.by ?? cast.pa;
    await terminateFieldWorker(c, {
      ...base(cast.P, by),
      fieldWorkerId: id,
      reasonCode: o.reason ?? 'registered_in_error',
      endedOn: await istToday(c),
      authorization: actAuthorization('field_worker.terminate', cast.P, 'Patna', by),
      appealHeardBy: o.heardBy ?? 'trustee_panel',
    });
    return version(c, id);
  }
  const undo = (expectedEndingVersion: number, o: { id?: FieldWorkerId; by?: string; grant?: Grant } = {}) =>
    undoFieldWorkerEnding(c, {
      ...base(cast.P, o.by ?? cast.pa),
      fieldWorkerId: o.id ?? worker,
      expectedEndingVersion,
      authorization: auth('field_worker.undo_ending', o.grant ?? PA, cast.P, o.by ?? cast.pa),
    });
  async function lodge(endingVersion: number, o: { by?: string; panel?: boolean } = {}): Promise<FieldWorkerEndingAppealId> {
    const panel = o.panel ?? true;
    const by = o.by ?? (panel ? cast.tp : cast.pa2);
    const appealId = toAppealId(randomUUID());
    await lodgeFieldWorkerEndingAppeal(c, {
      ...base(cast.P, by, panel ? 'trustee' : 'operator'),
      fieldWorkerId: worker,
      appealId,
      expectedEndingVersion: endingVersion,
      receivedOn: await istToday(c),
      receivedVia: 'phone',
      authorization: panel
        ? auth('field_worker.hear_ending_appeal_as_panel', TP, cast.P, by)
        : auth('field_worker.hear_ending_appeal', PA, cast.P, by),
    });
    return appealId;
  }
  const decision = async (appealId: FieldWorkerEndingAppealId, o: { by?: string; panel?: boolean } = {}) => {
    const panel = o.panel ?? true;
    const by = o.by ?? (panel ? cast.tp2 : cast.pa2);
    return {
      ...base(cast.P, by, panel ? ('trustee' as const) : ('operator' as const)),
      appealId,
      decidedOn: await istToday(c),
      authorization: panel
        ? auth('field_worker.hear_ending_appeal_as_panel', TP, cast.P, by)
        : auth('field_worker.hear_ending_appeal', PA, cast.P, by),
    };
  };
  const appealRow = async (id: string) =>
    (await c.query('SELECT state, decided_by_user_id, decided_on::text AS decided_on FROM field_worker_ending_appeals WHERE appeal_id = $1', [id])).rows[0];

  describe('AC1 — undoing a mistaken ending, per from-state', () => {
    it('from pending_kyc: back to pending_kyc with its KYC status, ended_on null, the same district; one ending_undone (mistake, the undone version, the undo key); row = fold', async () => {
      const v = await end();
      const r = await undo(v);
      expect(r).toMatchObject({ fromState: 'terminated', state: 'pending_kyc', reasonCode: null, endedOn: null, district: 'Patna', kycStatus: 'pending' });
      expect(await row(c, worker)).toMatchObject({ current_state: 'pending_kyc', state_reason_code: null, kyc_status: 'pending', district: 'Patna', ended_on: null });
      expect(await streamTypes(c, worker)).toEqual(['field_worker.registered', 'field_worker.terminated', 'field_worker.ending_undone']);
      const p = await lastPayload(c, worker);
      expect(p).toMatchObject({ from_state: 'terminated', to_state: 'pending_kyc', cause: 'mistake', appeal_id: null, undone_ending_version: v, reason_code: null });
      expect((p['authorization'] as { permission_key: string }).permission_key).toBe('field_worker.undo_ending');
      expect(p['trigger']).toBe('field_worker.undo_ending:mistake');
      await expectRowMatchesStream(c, worker);
    });

    it('from active: back to active, approved_by_display unchanged; acceptsNewAttributions true again (AC1 (c))', async () => {
      await activate();
      const before = (await row(c, worker)).approved_by_display;
      const v = await end();
      expect(acceptsNewAttributions((await row(c, worker)).current_state as 'terminated')).toBe(false);
      await undo(v);
      const after = await row(c, worker);
      expect(after).toMatchObject({ current_state: 'active', kyc_status: 'completed', state_reason_code: null, ended_on: null });
      expect(after.approved_by_display).toBe(before);
      expect(acceptsNewAttributions(after.current_state as 'active')).toBe(true);
      await expectRowMatchesStream(c, worker);
    });

    it('from suspended: back to suspended with the SAME suspension reason (the payload carries it)', async () => {
      await activate();
      await suspendFieldWorker(c, { ...base(cast.P, cast.pa), fieldWorkerId: worker, reasonCode: 'at_worker_request', authorization: actAuthorization('field_worker.suspend', cast.P, 'Patna', cast.pa) });
      const v = await end({ reason: 'inactive' });
      const r = await undo(v);
      expect(r.reasonCode).toBe('at_worker_request');
      expect(await row(c, worker)).toMatchObject({ current_state: 'suspended', state_reason_code: 'at_worker_request', ended_on: null });
      expect(await lastPayload(c, worker)).toMatchObject({ to_state: 'suspended', reason_code: 'at_worker_request' });
      await expectRowMatchesStream(c, worker);
    });

    it('an ending for `died` is undone like any other (`-454` Q5 A)', async () => {
      await activate();
      const v = await end({ reason: 'died' });
      await undo(v);
      expect((await row(c, worker)).current_state).toBe('active');
      await expectRowMatchesStream(c, worker);
    });

    it('(b) a worker who is not terminated → FieldWorkerIllegalTransitionError, nothing written; CONTROL: the transaction is usable', async () => {
      expect(await caught(() => undo(2))).toBeInstanceOf(FieldWorkerIllegalTransitionError); // a well-formed version: the LOCKED state answers
      expect(await streamTypes(c, worker)).toEqual(['field_worker.registered']);
      expect((await c.query('SELECT 1 AS ok')).rows).toEqual([{ ok: 1 }]);
    });

    it('(e) undone, ended again, undone again: the second ending is normal and undoable; the fold of two endings and one undo restores the right state', async () => {
      await activate();
      const v1 = await end();
      await undo(v1);
      await suspendFieldWorker(c, { ...base(cast.P, cast.pa), fieldWorkerId: worker, reasonCode: 'under_review', authorization: actAuthorization('field_worker.suspend', cast.P, 'Patna', cast.pa) });
      const v2 = await end({ reason: 'inactive' });
      await expectRowMatchesStream(c, worker); // two endings, one undo — the fold says terminated
      await undo(v2);
      expect(await row(c, worker)).toMatchObject({ current_state: 'suspended', state_reason_code: 'under_review' });
      await expectRowMatchesStream(c, worker);
    });

    it('a wrong key, a non-human actor and the trustee actor kind are refused before any SQL; a District Admin does not hold the key', async () => {
      const v = await end();
      expect(grantAuthorization('field_worker.undo_ending', { role: 'district_admin', district: 'Patna' }, cast.P, 'Patna', cast.daPatna)).toBeNull();
      expect(grantAuthorization('field_worker.undo_ending', TP, cast.P, 'Patna', cast.tp)).toBeNull();
      expect(
        await caught(() =>
          undoFieldWorkerEnding(c, { ...base(cast.P, cast.pa), fieldWorkerId: worker, expectedEndingVersion: v, authorization: actAuthorization('field_worker.terminate', cast.P, 'Patna', cast.pa) }),
        ),
      ).toBeInstanceOf(FieldWorkerProjectorInputError);
      expect(
        await caught(() =>
          undoFieldWorkerEnding(c, { ...base(cast.P, cast.pa, 'trustee'), fieldWorkerId: worker, expectedEndingVersion: v, authorization: auth('field_worker.undo_ending', PA, cast.P, cast.pa) }),
        ),
      ).toBeInstanceOf(FieldWorkerProjectorInputError);
      await undo(v); // CONTROL — the same call with the undo key and the operator kind undoes
      expect((await row(c, worker)).current_state).toBe('pending_kyc');
    });

    it('(3d) an authorization targeting another district → FieldWorkerAuthorizationStaleError', async () => {
      const v = await end();
      expect(
        await caught(() =>
          undoFieldWorkerEnding(c, { ...base(cast.P, cast.pa), fieldWorkerId: worker, expectedEndingVersion: v, authorization: auth('field_worker.undo_ending', PA, cast.P, cast.pa, 'Gaya') }),
        ),
      ).toBeInstanceOf(FieldWorkerAuthorizationStaleError);
    });

    it('(h) the barrel does not expose the core or its stream read', () => {
      expect('undoEndingLocked' in fieldWorker).toBe(false);
      expect('readFieldWorkerStreamLocked' in fieldWorker).toBe(false);
      expect('undoFieldWorkerEnding' in fieldWorker).toBe(true); // CONTROL
    });
  });

  describe('AC2 — the number is live again (AD5)', () => {
    it('a new registration holds the number → the undo’s UPDATE 23505 maps BY NAME to FieldWorkerNumberRegisteredAgainError; that registration ended, the undo succeeds — the newer record stays terminated', async () => {
      const index = `idx-${randomUUID()}`;
      const old = await registerReal(c, cast.P, { district: 'Patna', mobileBlindIndex: index });
      const v = await end({ id: old });
      const newer = await registerReal(c, cast.P, { district: 'Patna', mobileBlindIndex: index });
      await c.query('SAVEPOINT s');
      expect(await caught(() => undo(v, { id: old }))).toBeInstanceOf(FieldWorkerNumberRegisteredAgainError);
      await c.query('ROLLBACK TO SAVEPOINT s');
      expect((await row(c, old)).current_state).toBe('terminated'); // the reason above, and the row did not move
      await end({ id: newer });
      await undo(v, { id: old });
      expect((await row(c, old)).current_state).toBe('pending_kyc');
      expect((await row(c, newer)).current_state).toBe('terminated');
      await expectRowMatchesStream(c, old);
    });
  });

  describe('AC3 — a stale undo', () => {
    it('undone and ended again: the old version → FieldWorkerEndingChangedError, the new ending stands; CONTROL: the current version undoes', async () => {
      const v1 = await end();
      await undo(v1);
      const v2 = await end({ by: cast.pa2 });
      expect(await caught(() => undo(v1))).toBeInstanceOf(FieldWorkerEndingChangedError);
      expect((await row(c, worker)).current_state).toBe('terminated');
      await undo(v2);
      expect((await row(c, worker)).current_state).toBe('pending_kyc');
    });
  });

  describe('AC4 — the projector’s check of the undone event (AD3)', () => {
    it('an ending_undone whose to_state is not the undone ending’s from_state → FieldWorkerProjectorInputError; one naming a non-ending version → refused', async () => {
      await activate();
      const v = await end();
      // The real undo's payload, captured inside a savepoint and rolled back — then fed back with one field wrong.
      await c.query('SAVEPOINT real');
      await undo(v);
      const real = await lastPayload(c, worker);
      await c.query('ROLLBACK TO SAVEPOINT real');
      const locked = await lockFieldWorkerRow(c, cast.P, worker);
      const payload = (to: string, undone = v) => ({ ...real, to_state: to, undone_ending_version: undone });
      const project = (p: unknown) =>
        projectFieldWorkerTransition(c, { pariwarId: cast.P, fieldWorkerId: worker, eventType: 'field_worker.ending_undone', payload: p, auditId: randomUUID(), actor: 'operator', actorId: cast.pa, lockedRow: locked! });
      await c.query('SAVEPOINT p');
      expect(await caught(() => project(payload('pending_kyc')))).toBeInstanceOf(FieldWorkerProjectorInputError);
      await c.query('ROLLBACK TO SAVEPOINT p');
      expect(await caught(() => project(payload('active', 1)))).toBeInstanceOf(FieldWorkerProjectorInputError);
      await c.query('ROLLBACK TO SAVEPOINT p');
      await project(payload('active')); // CONTROL — the true target projects
      expect((await row(c, worker)).current_state).toBe('active');
    });
  });

  describe('AC8 — the undo and the appeal', () => {
    it('a SLIP undone while an appeal is open supersedes it in the same transaction: `superseded`, signed with undo_ending, decided_on the undo’s IST day, decided_by the undoer', async () => {
      const v = await end();
      const appealId = await lodge(v);
      await undo(v);
      expect(await appealRow(appealId)).toEqual({ state: 'superseded', decided_by_user_id: cast.pa, decided_on: await istToday(c) });
      expect(await streamTypes(c, appealId)).toEqual(['field_worker_ending_appeal.lodged', 'field_worker_ending_appeal.superseded']);
      const p = await lastPayload(c, appealId);
      expect((p['authorization'] as { permission_key: string }).permission_key).toBe('field_worker.undo_ending');
    });

    it('an appeal_allowed undo supersedes nothing — its appeal becomes `allowed`, no `superseded` event', async () => {
      const v = await end();
      const appealId = await lodge(v);
      await allowFieldWorkerEndingAppeal(c, await decision(appealId));
      expect((await appealRow(appealId)).state).toBe('allowed');
      expect(await streamTypes(c, appealId)).toEqual(['field_worker_ending_appeal.lodged', 'field_worker_ending_appeal.allowed']);
      expect(await lastPayload(c, worker)).toMatchObject({ cause: 'appeal_allowed', appeal_id: appealId });
    });

    it('⭐ `-465` Q6 B: after the PANEL heard and REFUSED the appeal, a slip undo → FieldWorkerAppealRefusedByPanelError — the worker stays ended, a super admin is refused too; the pre-read says so', async () => {
      const v = await end();
      const appealId = await lodge(v);
      await refuseFieldWorkerEndingAppeal(c, await decision(appealId));
      expect(await hasPanelRefusedAppealOnCurrentEnding(bindScopedDb(c), cast.P, worker)).toBe(true);
      expect(await caught(() => undo(v))).toBeInstanceOf(FieldWorkerAppealRefusedByPanelError);
      expect(await caught(() => undo(v, { by: cast.sa, grant: SA }))).toBeInstanceOf(FieldWorkerAppealRefusedByPanelError);
      expect((await row(c, worker)).current_state).toBe('terminated');
      expect(await streamTypes(c, worker)).toEqual(['field_worker.registered', 'field_worker.terminated']);
    });

    it('`-465` CONTROL: a refusal heard by the PARIWAR ADMIN does not bar the slip undo (not covered — `-454` Q1 A stands)', async () => {
      const v = await end({ by: cast.daPatna, heardBy: 'pariwar_admin' });
      const appealId = await lodge(v, { panel: false });
      await refuseFieldWorkerEndingAppeal(c, await decision(appealId, { panel: false }));
      expect(await hasPanelRefusedAppealOnCurrentEnding(bindScopedDb(c), cast.P, worker)).toBe(false);
      await undo(v);
      expect((await row(c, worker)).current_state).toBe('pending_kyc');
    });

    it('`-465` CONTROL: a Panel-heard appeal WITHDRAWN does not bar the slip undo', async () => {
      const v = await end();
      const appealId = await lodge(v);
      await withdrawFieldWorkerEndingAppeal(c, await decision(appealId));
      expect(await hasPanelRefusedAppealOnCurrentEnding(bindScopedDb(c), cast.P, worker)).toBe(false);
      await undo(v);
      expect((await row(c, worker)).current_state).toBe('pending_kyc');
    });

    it('an ending supersedes the open move request; after the undo the request is still superseded and a new one can be opened (13.1d C3)', async () => {
      const req = toRequestId(randomUUID());
      const da = (district: string) => ({ role: 'district_admin' as const, district });
      const open = (id: typeof req) =>
        openFieldWorkerMoveRequest(c, {
          ...base(cast.P, cast.daPatna),
          moveRequestId: id,
          fieldWorkerId: worker,
          fromDistrict: 'Patna',
          toDistrict: 'Gaya',
          authorization: grantAuthorization('field_worker.request_move', da('Patna'), cast.P, 'Patna', cast.daPatna)!,
        });
      await open(req);
      const v = await end();
      await undo(v);
      expect((await c.query('SELECT state FROM field_worker_move_requests WHERE move_request_id = $1', [req])).rows[0]).toEqual({ state: 'superseded' });
      await open(toRequestId(randomUUID()));
    });
  });
});
