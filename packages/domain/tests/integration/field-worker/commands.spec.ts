// The seven field-worker commands against the live DB — Story 13.1 (AC5; QE5, QE7, QE12, QE13, QE17, QE18, QE20; I4–I7).
// Per-test ROLLBACK, as twt_app under the Pariwar's scope (RLS is live). After EVERY successful command the row equals the
// fold of its stream (I4). Every refusal: its typed error, no event, the row unchanged — and the CONTROL that the caller's
// transaction is still usable ([[feedback_assertion_after_savepoint_rollback_is_vacuous]]).

import { randomUUID } from 'node:crypto';

import type pg from 'pg';
import { describe, expect, it } from 'vitest';

import {
  activateFieldWorker,
  postFieldWorker,
  reactivateFieldWorker,
  recordFieldWorkerKycCompleted,
  registerFieldWorker,
  suspendFieldWorker,
  terminateFieldWorker,
} from '../../../src/field-worker/commands.js';
import {
  FieldWorkerAuthorizationStaleError,
  FieldWorkerDistrictUnchangedError,
  FieldWorkerEndedOnInvalidError,
  FieldWorkerGenesisAlreadyExistsError,
  FieldWorkerGenesisMissingError,
  FieldWorkerIllegalTransitionError,
  FieldWorkerKycAlreadyCompletedError,
  FieldWorkerKycNotCompletedError,
  FieldWorkerMobileAlreadyRegisteredError,
  FieldWorkerProjectorInputError,
  FieldWorkerReasonInvalidError,
} from '../../../src/field-worker/errors.js';
import { fieldWorkerId as toFieldWorkerId, pariwarId as toPariwarId, type FieldWorkerId } from '../../../src/ids/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppScope } from '../_helpers.js';
import { caught, expectRowMatchesStream, registerAuthorization, registerReal, streamTypes } from './_fixtures.js';

const A = toPariwarId(PARIWAR_A);
const ACTOR = randomUUID();
const staff = (id: FieldWorkerId) => ({ pariwarId: A, fieldWorkerId: id, auditId: randomUUID(), actor: 'operator' as const, actorId: ACTOR });

async function rowOf(client: pg.PoolClient, id: string) {
  return (
    await client.query(
      'SELECT current_state, state_event_version::int AS v, kyc_status, state_reason_code, district, ended_on::text AS ended_on, audit_id, registered_by_user_id FROM field_workers WHERE field_worker_id = $1',
      [id],
    )
  ).rows[0];
}

/** A refusal leaves no event and the row unchanged, and the transaction still works (CONTROL: a fresh registration). */
async function expectRefusedCleanly(client: pg.PoolClient, id: string, before: unknown, typesBefore: string[]): Promise<void> {
  expect(await rowOf(client, id)).toEqual(before);
  expect(await streamTypes(client, id)).toEqual(typesBefore);
  const control = await registerReal(client, PARIWAR_A);
  expect(await streamTypes(client, control)).toEqual(['field_worker.registered']);
}

/** Drive a fresh worker to `state` through the real commands. */
async function workerIn(client: pg.PoolClient, state: 'pending_kyc' | 'kyc_done' | 'active' | 'suspended' | 'terminated'): Promise<FieldWorkerId> {
  const id = await registerReal(client, PARIWAR_A, { actorId: ACTOR });
  if (state === 'pending_kyc') return id;
  await recordFieldWorkerKycCompleted(client, staff(id));
  if (state === 'kyc_done') return id;
  await activateFieldWorker(client, staff(id));
  if (state === 'active') return id;
  if (state === 'suspended') {
    await suspendFieldWorker(client, { ...staff(id), reasonCode: 'under_review' });
    return id;
  }
  await terminateFieldWorker(client, { ...staff(id), reasonCode: 'inactive', endedOn: (await istToday(client)) });
  return id;
}

async function istToday(client: pg.PoolClient): Promise<string> {
  return (await client.query<{ d: string }>("SELECT (now() AT TIME ZONE 'Asia/Kolkata')::date::text AS d")).rows[0]!.d;
}

describe.skipIf(!hasDatabase)('field-worker commands, live (AC5)', () => {
  setupLiveDb();

  it('the genesis: pending_kyc / pending / version 1 / district; registered_by_user_id = events_log.actor_id (one input); I4', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const id = await registerReal(client, PARIWAR_A, { district: 'Gaya', actorId: ACTOR });
    expect(await rowOf(client, id)).toMatchObject({ current_state: 'pending_kyc', v: 1, kyc_status: 'pending', state_reason_code: null, district: 'Gaya', ended_on: null, registered_by_user_id: ACTOR });
    const ev = (await client.query('SELECT actor_id, pariwar_id, payload FROM events_log WHERE stream_id = $1', [id])).rows[0];
    expect(ev.actor_id).toBe(ACTOR);
    expect(ev.pariwar_id).toBe(PARIWAR_A);
    expect(ev.payload).toMatchObject({ from_state: null, to_state: 'pending_kyc', trigger: 'field_worker.register', actor: 'operator', district: 'Gaya' });
    expect(ev.payload.authorization).toMatchObject({ permission_key: 'field_worker.register', role: 'pariwar_admin', target: { dimension: 'district', value: 'Gaya' } });
    await expectRowMatchesStream(client, id);
  });

  it('the whole life, I4 after EVERY command: kyc → activate → suspend → post (suspended keeps its reason) → reactivate → post → terminate', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const id = await registerReal(client, PARIWAR_A, { actorId: ACTOR });
    await recordFieldWorkerKycCompleted(client, staff(id));
    await expectRowMatchesStream(client, id);
    await activateFieldWorker(client, staff(id));
    await expectRowMatchesStream(client, id);
    await suspendFieldWorker(client, { ...staff(id), reasonCode: 'at_worker_request' });
    await expectRowMatchesStream(client, id);
    await postFieldWorker(client, { ...staff(id), toDistrict: 'Gaya', reasonCode: 'reassigned', authorization: registerAuthorization(PARIWAR_A, 'Gaya', ACTOR) });
    expect(await rowOf(client, id)).toMatchObject({ current_state: 'suspended', state_reason_code: 'at_worker_request', district: 'Gaya' });
    await expectRowMatchesStream(client, id);
    await reactivateFieldWorker(client, staff(id));
    expect(await rowOf(client, id)).toMatchObject({ current_state: 'active', state_reason_code: null });
    await expectRowMatchesStream(client, id);
    // A target equal to the CURRENT district (the sending end) is accepted too.
    await postFieldWorker(client, { ...staff(id), toDistrict: 'Nalanda', reasonCode: 'at_worker_request', authorization: registerAuthorization(PARIWAR_A, 'Gaya', ACTOR) });
    await expectRowMatchesStream(client, id);
    const today = await istToday(client);
    const audit = randomUUID();
    await terminateFieldWorker(client, { ...staff(id), auditId: audit, reasonCode: 'left_voluntarily', endedOn: today });
    expect(await rowOf(client, id)).toMatchObject({ current_state: 'terminated', state_reason_code: 'left_voluntarily', ended_on: today, district: 'Nalanda', audit_id: audit, v: 8 });
    await expectRowMatchesStream(client, id);
    expect(await streamTypes(client, id)).toEqual([
      'field_worker.registered',
      'field_worker.kyc_completed',
      'field_worker.activated',
      'field_worker.suspended',
      'field_worker.posted',
      'field_worker.reactivated',
      'field_worker.posted',
      'field_worker.terminated',
    ]);
  });

  it('a terminated row: ANYTHING out of it — posted included — ⇒ IllegalTransition, no event, the row unchanged, the tx usable', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const id = await workerIn(client, 'terminated');
    const before = await rowOf(client, id);
    const types = await streamTypes(client, id);
    for (const run of [
      () => activateFieldWorker(client, staff(id)),
      () => reactivateFieldWorker(client, staff(id)),
      () => suspendFieldWorker(client, { ...staff(id), reasonCode: 'under_review' }),
      () => terminateFieldWorker(client, { ...staff(id), reasonCode: 'bogus', endedOn: '2026-11-01' }), // (2) beats (4)
      () => postFieldWorker(client, { ...staff(id), toDistrict: 'Gaya', reasonCode: 'reassigned', authorization: registerAuthorization(PARIWAR_A, 'Gaya', ACTOR) }),
    ]) {
      expect(await caught(run)).toBeInstanceOf(FieldWorkerIllegalTransitionError);
    }
    await expectRefusedCleanly(client, id, before, types);
  });

  it('KYC guards: twice ⇒ KycAlreadyCompleted; on an ACTIVE worker ⇒ IllegalTransition (guard ORDER); activate before KYC ⇒ KycNotCompleted', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const done = await workerIn(client, 'kyc_done');
    expect(await caught(() => recordFieldWorkerKycCompleted(client, staff(done)))).toBeInstanceOf(FieldWorkerKycAlreadyCompletedError);
    const active = await workerIn(client, 'active');
    expect(await caught(() => recordFieldWorkerKycCompleted(client, staff(active)))).toBeInstanceOf(FieldWorkerIllegalTransitionError);
    const pending = await workerIn(client, 'pending_kyc');
    const before = await rowOf(client, pending);
    expect(await caught(() => activateFieldWorker(client, staff(pending)))).toBeInstanceOf(FieldWorkerKycNotCompletedError);
    await expectRefusedCleanly(client, pending, before, ['field_worker.registered']);
  });

  it('unknown id, or another Pariwar’s worker ⇒ GenesisMissing', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_B);
    const inB = await registerReal(client, PARIWAR_B, { actorId: ACTOR });
    await enterAppScope(client, PARIWAR_A);
    expect(await caught(() => activateFieldWorker(client, staff(toFieldWorkerId(randomUUID()))))).toBeInstanceOf(FieldWorkerGenesisMissingError);
    expect(await caught(() => activateFieldWorker(client, staff(inB)))).toBeInstanceOf(FieldWorkerGenesisMissingError);
  });

  it('QE7: a system / member actor or a null actorId on any command ⇒ ProjectorInputError', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const id = await workerIn(client, 'active');
    for (const bad of [{ actor: 'system' }, { actor: 'member' }, { actorId: null }]) {
      expect(await caught(() => suspendFieldWorker(client, { ...staff(id), reasonCode: 'under_review', ...bad } as never))).toBeInstanceOf(
        FieldWorkerProjectorInputError,
      );
    }
    await expectRowMatchesStream(client, id);
  });

  it('QE12: suspend / terminate / post reasons from their own lists — else ReasonInvalid', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const id = await workerIn(client, 'active');
    const before = await rowOf(client, id);
    const types = await streamTypes(client, id);
    expect(await caught(() => suspendFieldWorker(client, { ...staff(id), reasonCode: 'reassigned' }))).toBeInstanceOf(FieldWorkerReasonInvalidError);
    expect(await caught(() => terminateFieldWorker(client, { ...staff(id), reasonCode: 'under_review', endedOn: '2026-11-01' }))).toBeInstanceOf(
      FieldWorkerReasonInvalidError,
    );
    for (const reasonCode of [undefined, 'bogus', 'inactive']) {
      expect(
        await caught(() =>
          postFieldWorker(client, { ...staff(id), toDistrict: 'Gaya', reasonCode: reasonCode as string, authorization: registerAuthorization(PARIWAR_A, 'Gaya', ACTOR) }),
        ),
      ).toBeInstanceOf(FieldWorkerReasonInvalidError);
    }
    await expectRefusedCleanly(client, id, before, types);
  });

  it('QE17: a move to the SAME district ⇒ DistrictUnchanged; a target that is NEITHER end ⇒ AuthorizationStale', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const id = await workerIn(client, 'active');
    expect(
      await caught(() => postFieldWorker(client, { ...staff(id), toDistrict: 'Patna', reasonCode: 'reassigned', authorization: registerAuthorization(PARIWAR_A, 'Patna', ACTOR) })),
    ).toBeInstanceOf(FieldWorkerDistrictUnchangedError);
    expect(
      await caught(() => postFieldWorker(client, { ...staff(id), toDistrict: 'Gaya', reasonCode: 'reassigned', authorization: registerAuthorization(PARIWAR_A, 'Nalanda', ACTOR) })),
    ).toBeInstanceOf(FieldWorkerAuthorizationStaleError);
    // A target made stale by a committed move: authorized at the OLD district (Patna), the worker since moved to Gaya.
    const stale = registerAuthorization(PARIWAR_A, 'Patna', ACTOR);
    await postFieldWorker(client, { ...staff(id), toDistrict: 'Gaya', reasonCode: 'reassigned', authorization: registerAuthorization(PARIWAR_A, 'Gaya', ACTOR) });
    expect(await caught(() => postFieldWorker(client, { ...staff(id), toDistrict: 'Nalanda', reasonCode: 'reassigned', authorization: stale }))).toBeInstanceOf(
      FieldWorkerAuthorizationStaleError,
    );
    expect((await rowOf(client, id)).district).toBe('Gaya');
    await expectRowMatchesStream(client, id);
  });

  it('QE18: register refuses an unverified / foreign / wrong-target authorization — no event, no row', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const base = {
      pariwarId: A,
      auditId: randomUUID(),
      actor: 'operator' as const,
      actorId: ACTOR,
      nameCiphertext: 'n',
      mobileCiphertext: 'm',
      mobileBlindIndex: `idx-${randomUUID()}`,
      registeredByDisplay: 'Asha Verma',
      district: 'Patna',
    };
    for (const authorization of [
      { ...registerAuthorization(PARIWAR_A, 'Patna', ACTOR) },
      registerAuthorization(PARIWAR_B, 'Patna', ACTOR),
      registerAuthorization(PARIWAR_A, 'Patna', randomUUID()),
      registerAuthorization(PARIWAR_A, 'Gaya', ACTOR),
    ]) {
      const id = toFieldWorkerId(randomUUID());
      expect(await caught(() => registerFieldWorker(client, { ...base, fieldWorkerId: id, authorization: authorization as never }))).toBeInstanceOf(
        FieldWorkerProjectorInputError,
      );
      expect(await streamTypes(client, id)).toEqual([]);
    }
  });

  it('the genesis twice ⇒ GenesisAlreadyExists; the same LIVE mobile twice ⇒ MobileAlreadyRegistered BY NAME — each leaves the tx usable and no loser event', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const id = await registerReal(client, PARIWAR_A, { mobileBlindIndex: 'dup-mobile', actorId: ACTOR });
    expect(await caught(() => registerReal(client, PARIWAR_A, { fieldWorkerId: id, actorId: ACTOR }))).toBeInstanceOf(FieldWorkerGenesisAlreadyExistsError);
    const loser = randomUUID();
    expect(await caught(() => registerReal(client, PARIWAR_A, { fieldWorkerId: loser, mobileBlindIndex: 'dup-mobile', actorId: ACTOR }))).toBeInstanceOf(
      FieldWorkerMobileAlreadyRegisteredError,
    );
    expect(await streamTypes(client, loser)).toEqual([]);
    // Terminated ⇒ the mobile may register again (a new id).
    await recordFieldWorkerKycCompleted(client, staff(id));
    await terminateFieldWorker(client, { ...staff(id), reasonCode: 'registered_in_error', endedOn: await istToday(client) });
    const again = await registerReal(client, PARIWAR_A, { mobileBlindIndex: 'dup-mobile', actorId: ACTOR });
    expect(again).not.toBe(id);
  });
});

describe.skipIf(!hasDatabase)('QE20 — the LOWER bound, live (the registration day in IST)', () => {
  setupLiveDb();

  it('a worker registered at 00:30 IST of day D: ended_on = D−1 ⇒ before_registration; ended_on = D ⇒ accepted', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const id = await registerReal(client, PARIWAR_A, { actorId: ACTOR });
    // Move created_at to 00:30 IST of a past IST day D (= 19:00 UTC of D−1) — owner role, replica mode (the trigger's I2
    // forbids it otherwise). The stream is untouched, so `terminate`'s HEAD check still passes.
    await client.query('RESET ROLE');
    await client.query("SET LOCAL session_replication_role = 'replica'");
    await client.query("UPDATE field_workers SET created_at = '2026-10-14 19:00:00+00' WHERE field_worker_id = $1", [id]);
    await client.query("SET LOCAL session_replication_role = 'origin'");
    await enterAppScope(client, PARIWAR_A);
    const err = await caught(() => terminateFieldWorker(client, { ...staff(id), reasonCode: 'inactive', endedOn: '2026-10-14' }));
    expect(err).toBeInstanceOf(FieldWorkerEndedOnInvalidError);
    expect(err).toMatchObject({ reason: 'before_registration' });
    await terminateFieldWorker(client, { ...staff(id), reasonCode: 'inactive', endedOn: '2026-10-15' });
    expect((await rowOf(client, id)).ended_on).toBe('2026-10-15');
  });

  it('an ended_on after the IST today ⇒ in_future', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const id = await registerReal(client, PARIWAR_A, { actorId: ACTOR });
    const tomorrow = (await client.query<{ d: string }>("SELECT ((now() AT TIME ZONE 'Asia/Kolkata')::date + 1)::text AS d")).rows[0]!.d;
    expect(await caught(() => terminateFieldWorker(client, { ...staff(id), reasonCode: 'inactive', endedOn: tomorrow }))).toMatchObject({ reason: 'in_future' });
  });
});
