// The seven field-worker commands against the live DB — Story 13.1 (AC5; QE5, QE7, QE12, QE13, QE17, QE18, QE20; I4–I7).
// Per-test ROLLBACK, as twt_app under the Pariwar's scope (RLS is live) — except the one OWNER-role leg that pins the lock's
// explicit `pariwar_id` (review R3-21). After EVERY successful command the row equals the fold of its stream (I4). Every
// refusal on an EXISTING worker: its typed error, no event, the row unchanged — and the CONTROL that the caller's transaction
// is still usable (`expectRefusedCleanly`; [[feedback_assertion_after_savepoint_rollback_is_vacuous]]). A refusal on an id
// with no row asserts no event and no row (review R3-22).

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
import { actAuthorization, approval, caught, expectRowMatchesStream, moveAuthorization, registerAuthorization, registerReal, streamTypes } from './_fixtures.js';

const A = toPariwarId(PARIWAR_A);
const ACTOR = randomUUID();
const staff = (id: FieldWorkerId) => ({ pariwarId: A, fieldWorkerId: id, auditId: randomUUID(), actor: 'operator' as const, actorId: ACTOR });
/** Story 13.1a AD3 — the two approval commands take a verified `field_worker.approve` result (+ the approver's name, `-447` item 2). */
const approve = (id: FieldWorkerId, district = 'Patna') => ({ ...staff(id), ...approval(PARIWAR_A, district, ACTOR) });
/** Story 13.1c AD3 — suspend / reactivate / terminate take a verified result for THEIR key, targeting the worker's district. */
const act = (id: FieldWorkerId, key: 'suspend' | 'reactivate' | 'terminate', district = 'Patna') => ({
  ...staff(id),
  authorization: actAuthorization(`field_worker.${key}`, PARIWAR_A, district, ACTOR),
});
/** Story 13.1c AD4 — a move: the `field_worker.move` key (target = an end) and the district the admin saw (`expectedFromDistrict`). */
const move = (id: FieldWorkerId, from: string, to: string, target = to) => ({
  ...staff(id),
  toDistrict: to,
  expectedFromDistrict: from,
  authorization: moveAuthorization(PARIWAR_A, target, ACTOR),
});

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
  await recordFieldWorkerKycCompleted(client, approve(id));
  if (state === 'kyc_done') return id;
  await activateFieldWorker(client, approve(id));
  if (state === 'active') return id;
  if (state === 'suspended') {
    await suspendFieldWorker(client, { ...act(id, 'suspend'), reasonCode: 'under_review' });
    return id;
  }
  await terminateFieldWorker(client, { ...act(id, 'terminate'), reasonCode: 'inactive', endedOn: (await istToday(client)) });
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
    await recordFieldWorkerKycCompleted(client, approve(id));
    await expectRowMatchesStream(client, id);
    await activateFieldWorker(client, approve(id));
    await expectRowMatchesStream(client, id);
    await suspendFieldWorker(client, { ...act(id, 'suspend'), reasonCode: 'at_worker_request' });
    await expectRowMatchesStream(client, id);
    await postFieldWorker(client, { ...move(id, 'Patna', 'Gaya'), reasonCode: 'reassigned' });
    expect(await rowOf(client, id)).toMatchObject({ current_state: 'suspended', state_reason_code: 'at_worker_request', district: 'Gaya' });
    await expectRowMatchesStream(client, id);
    await reactivateFieldWorker(client, act(id, 'reactivate', 'Gaya'));
    expect(await rowOf(client, id)).toMatchObject({ current_state: 'active', state_reason_code: null });
    await expectRowMatchesStream(client, id);
    // A target equal to the CURRENT district (the sending end) is accepted too.
    await postFieldWorker(client, { ...move(id, 'Gaya', 'Nalanda', 'Gaya'), reasonCode: 'at_worker_request' });
    await expectRowMatchesStream(client, id);
    const today = await istToday(client);
    const audit = randomUUID();
    await terminateFieldWorker(client, { ...act(id, 'terminate', 'Nalanda'), auditId: audit, reasonCode: 'left_voluntarily', endedOn: today });
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
      () => activateFieldWorker(client, approve(id)),
      () => reactivateFieldWorker(client, act(id, 'reactivate')),
      () => suspendFieldWorker(client, { ...act(id, 'suspend'), reasonCode: 'under_review' }),
      () => terminateFieldWorker(client, { ...act(id, 'terminate'), reasonCode: 'bogus', endedOn: '2026-11-01' }), // (2) beats (4)
      () => postFieldWorker(client, { ...move(id, 'Patna', 'Gaya'), reasonCode: 'reassigned' }),
      () => recordFieldWorkerKycCompleted(client, approve(id)), // review R3-22 — the title says ANYTHING
    ]) {
      expect(await caught(run)).toBeInstanceOf(FieldWorkerIllegalTransitionError);
    }
    await expectRefusedCleanly(client, id, before, types);
  });

  it('KYC guards: twice ⇒ KycAlreadyCompleted; on an ACTIVE worker ⇒ IllegalTransition (guard ORDER); activate before KYC ⇒ KycNotCompleted', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const done = await workerIn(client, 'kyc_done');
    const doneBefore = await rowOf(client, done);
    expect(await caught(() => recordFieldWorkerKycCompleted(client, approve(done)))).toBeInstanceOf(FieldWorkerKycAlreadyCompletedError);
    await expectRefusedCleanly(client, done, doneBefore, ['field_worker.registered', 'field_worker.kyc_completed']); // review R3-22
    const active = await workerIn(client, 'active');
    const activeBefore = await rowOf(client, active);
    const activeTypes = await streamTypes(client, active);
    expect(await caught(() => recordFieldWorkerKycCompleted(client, approve(active)))).toBeInstanceOf(FieldWorkerIllegalTransitionError);
    await expectRefusedCleanly(client, active, activeBefore, activeTypes);
    const pending = await workerIn(client, 'pending_kyc');
    const before = await rowOf(client, pending);
    expect(await caught(() => activateFieldWorker(client, approve(pending)))).toBeInstanceOf(FieldWorkerKycNotCompletedError);
    await expectRefusedCleanly(client, pending, before, ['field_worker.registered']);
  });

  it('unknown id, or another Pariwar’s worker ⇒ GenesisMissing', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_B);
    const inB = await registerReal(client, PARIWAR_B, { actorId: ACTOR });
    await enterAppScope(client, PARIWAR_A);
    expect(await caught(() => activateFieldWorker(client, approve(toFieldWorkerId(randomUUID()))))).toBeInstanceOf(FieldWorkerGenesisMissingError);
    expect(await caught(() => activateFieldWorker(client, approve(inB)))).toBeInstanceOf(FieldWorkerGenesisMissingError);
  });

  // Review R3-21 — the leg above runs as twt_app under A's scope, so RLS alone hides B's row: it passes with the lock's
  // `AND pariwar_id = $2` deleted. As the OWNER (RLS bypassed, 13.2 TR3) only that predicate keeps A's command off B's worker —
  // without it the lock would find B's pending row and answer KycNotCompleted, not GenesisMissing.
  it('the row lock carries its OWN pariwar_id — as the OWNER role (RLS bypassed), a command for Pariwar A on B’s worker ⇒ GenesisMissing, B untouched', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_B);
    const inB = await registerReal(client, PARIWAR_B, { actorId: ACTOR });
    await client.query('RESET ROLE'); // the owner — RLS is NOT the filter
    expect(await caught(() => activateFieldWorker(client, approve(inB)))).toBeInstanceOf(FieldWorkerGenesisMissingError);
    expect(await caught(() => recordFieldWorkerKycCompleted(client, approve(inB)))).toBeInstanceOf(FieldWorkerGenesisMissingError);
    expect(await streamTypes(client, inB)).toEqual(['field_worker.registered']);
    expect((await rowOf(client, inB)).kyc_status).toBe('pending');
  });

  it('QE7: a system / member actor or a null actorId on any command ⇒ ProjectorInputError', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const id = await workerIn(client, 'active');
    const before = await rowOf(client, id);
    const types = await streamTypes(client, id);
    for (const bad of [{ actor: 'system' }, { actor: 'member' }, { actorId: null }]) {
      expect(await caught(() => suspendFieldWorker(client, { ...act(id, 'suspend'), reasonCode: 'under_review', ...bad } as never))).toBeInstanceOf(
        FieldWorkerProjectorInputError,
      );
    }
    await expectRowMatchesStream(client, id);
    await expectRefusedCleanly(client, id, before, types); // review R4-13
  });

  it('QE12: suspend / terminate / post reasons from their own lists — else ReasonInvalid', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const id = await workerIn(client, 'active');
    const before = await rowOf(client, id);
    const types = await streamTypes(client, id);
    expect(await caught(() => suspendFieldWorker(client, { ...act(id, 'suspend'), reasonCode: 'reassigned' }))).toBeInstanceOf(FieldWorkerReasonInvalidError);
    expect(await caught(() => terminateFieldWorker(client, { ...act(id, 'terminate'), reasonCode: 'under_review', endedOn: '2026-11-01' }))).toBeInstanceOf(
      FieldWorkerReasonInvalidError,
    );
    for (const reasonCode of [undefined, 'bogus', 'inactive']) {
      expect(
        await caught(() =>
          postFieldWorker(client, { ...move(id, 'Patna', 'Gaya'), reasonCode: reasonCode as string }),
        ),
      ).toBeInstanceOf(FieldWorkerReasonInvalidError);
    }
    await expectRefusedCleanly(client, id, before, types);
  });

  it('QE17: a move to the SAME district ⇒ DistrictUnchanged; a target that is NEITHER end ⇒ AuthorizationStale', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const id = await workerIn(client, 'active');
    const before = await rowOf(client, id);
    const types = await streamTypes(client, id);
    expect(
      await caught(() => postFieldWorker(client, { ...move(id, 'Patna', 'Patna'), reasonCode: 'reassigned' })),
    ).toBeInstanceOf(FieldWorkerDistrictUnchangedError);
    expect(
      await caught(() => postFieldWorker(client, { ...move(id, 'Patna', 'Gaya', 'Nalanda'), reasonCode: 'reassigned' })),
    ).toBeInstanceOf(FieldWorkerAuthorizationStaleError);
    await expectRefusedCleanly(client, id, before, types); // review R3-22
    // A target made stale by a committed move: authorized at the OLD district (Patna), the worker since moved to Gaya.
    // (Its expected source is the CURRENT district, so only the target is stale — the D7 source guard is the next test.)
    const stale = moveAuthorization(PARIWAR_A, 'Patna', ACTOR);
    await postFieldWorker(client, { ...move(id, 'Patna', 'Gaya'), reasonCode: 'reassigned' });
    const afterMove = await rowOf(client, id);
    const afterMoveTypes = await streamTypes(client, id);
    expect(
      await caught(() => postFieldWorker(client, { ...staff(id), toDistrict: 'Nalanda', expectedFromDistrict: 'Gaya', reasonCode: 'reassigned', authorization: stale })),
    ).toBeInstanceOf(FieldWorkerAuthorizationStaleError);
    await expectRefusedCleanly(client, id, afterMove, afterMoveTypes); // review R4-13
    expect((await rowOf(client, id)).district).toBe('Gaya');
    await expectRowMatchesStream(client, id);
  });

  // Story 13.1c AD3 (`-443` Q3 A) — every act records WHICH authorization allowed it, by its OWN key.
  it('13.1c AD3: suspend / reactivate / terminate / post each write the verified snapshot of THEIR key, targeting the locked district', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const id = await workerIn(client, 'active');
    await suspendFieldWorker(client, { ...act(id, 'suspend'), reasonCode: 'under_review' });
    await reactivateFieldWorker(client, act(id, 'reactivate'));
    await postFieldWorker(client, { ...move(id, 'Patna', 'Gaya'), reasonCode: 'reassigned' });
    await terminateFieldWorker(client, { ...act(id, 'terminate', 'Gaya'), reasonCode: 'left_voluntarily', endedOn: await istToday(client) });
    const rows = (
      await client.query<{ event_type: string; payload: { authorization?: { permission_key: string; role: string; target: { value: string } } } }>(
        'SELECT event_type, payload FROM events_log WHERE stream_id = $1 AND event_version > 3 ORDER BY event_version',
        [id],
      )
    ).rows;
    expect(rows.map((r) => [r.event_type, r.payload.authorization?.permission_key, r.payload.authorization?.target.value])).toEqual([
      ['field_worker.suspended', 'field_worker.suspend', 'Patna'],
      ['field_worker.reactivated', 'field_worker.reactivate', 'Patna'],
      ['field_worker.posted', 'field_worker.move', 'Gaya'],
      ['field_worker.terminated', 'field_worker.terminate', 'Gaya'],
    ]);
    for (const r of rows) expect(r.payload.authorization?.role).toBe('pariwar_admin');
    await expectRowMatchesStream(client, id);
  });

  it('13.1c AD3 (3d): a target made stale by a committed move ⇒ AuthorizationStale for suspend, reactivate and terminate — no event, the row unchanged', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const active = await workerIn(client, 'active');
    const suspended = await workerIn(client, 'suspended');
    // The gate read Patna; the worker moved to Gaya before the lock.
    for (const id of [active, suspended]) await postFieldWorker(client, { ...move(id, 'Patna', 'Gaya'), reasonCode: 'reassigned' });
    const today = await istToday(client);
    for (const [id, run] of [
      [active, () => suspendFieldWorker(client, { ...act(active, 'suspend', 'Patna'), reasonCode: 'under_review' })],
      [suspended, () => reactivateFieldWorker(client, act(suspended, 'reactivate', 'Patna'))],
      [active, () => terminateFieldWorker(client, { ...act(active, 'terminate', 'Patna'), reasonCode: 'inactive', endedOn: today })],
    ] as const) {
      const before = await rowOf(client, id);
      const types = await streamTypes(client, id);
      expect(await caught(run)).toBeInstanceOf(FieldWorkerAuthorizationStaleError);
      await expectRefusedCleanly(client, id, before, types);
    }
    // CONTROL — the same acts, authorized at Gaya, pass.
    await suspendFieldWorker(client, { ...act(active, 'suspend', 'Gaya'), reasonCode: 'under_review' });
    await reactivateFieldWorker(client, act(suspended, 'reactivate', 'Gaya'));
    expect((await rowOf(client, active)).current_state).toBe('suspended');
    expect((await rowOf(client, suspended)).current_state).toBe('active');
    // …and terminate's control too (review CR7): it leaves a suspended worker, authorized at Gaya.
    await terminateFieldWorker(client, { ...act(active, 'terminate', 'Gaya'), reasonCode: 'inactive', endedOn: today });
    expect((await rowOf(client, active)).current_state).toBe('terminated');
  });

  // Story 13.1c AD4 / 13.1 D7 — two moves from the same screen: the second is refused, ⛔ fulfilled.
  it('13.1c AD4 (3a): a move whose expected source is not the locked district ⇒ AuthorizationStale, BEFORE DistrictUnchanged; the worker stays', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const id = await workerIn(client, 'active');
    // Both admins saw Patna; the first moves Patna → Gaya.
    await postFieldWorker(client, { ...move(id, 'Patna', 'Gaya'), reasonCode: 'reassigned' });
    const before = await rowOf(client, id);
    const types = await streamTypes(client, id);
    // The second's Patna → Nalanda (target = the destination, so (3c) alone would accept it).
    expect(await caught(() => postFieldWorker(client, { ...move(id, 'Patna', 'Nalanda'), reasonCode: 'reassigned' }))).toBeInstanceOf(
      FieldWorkerAuthorizationStaleError,
    );
    // Patna → Gaya again: (3a) beats (3b) — stale, ⛔ DistrictUnchanged.
    expect(await caught(() => postFieldWorker(client, { ...move(id, 'Patna', 'Gaya'), reasonCode: 'reassigned' }))).toBeInstanceOf(
      FieldWorkerAuthorizationStaleError,
    );
    await expectRefusedCleanly(client, id, before, types);
    expect(before.district).toBe('Gaya');
  });

  it('13.1c AD4 (I2): a move under a VERIFIED field_worker.register result is refused before any statement; the move key at the same target passes', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const id = await workerIn(client, 'active');
    const before = await rowOf(client, id);
    const types = await streamTypes(client, id);
    const err = await caught(() =>
      postFieldWorker(client, { ...staff(id), toDistrict: 'Gaya', expectedFromDistrict: 'Patna', reasonCode: 'reassigned', authorization: registerAuthorization(PARIWAR_A, 'Gaya', ACTOR) }),
    );
    expect(err).toBeInstanceOf(FieldWorkerProjectorInputError);
    expect((err as Error).message).toMatch(/the authorization is for 'field_worker\.register', not this act/);
    await expectRefusedCleanly(client, id, before, types);
    await postFieldWorker(client, { ...move(id, 'Patna', 'Gaya'), reasonCode: 'reassigned' });
    expect((await rowOf(client, id)).district).toBe('Gaya');
  });

  // `-455` (the Panel's `-454` Q5 A) — migrations 0203 + 0204 admit `died`; `ended_on` is the date of death, IST bounds.
  it('-455: an active worker ended `died` with today as the date of death ⇒ terminated / died / ended_on; a future date of death ⇒ in_future', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const id = await workerIn(client, 'active');
    const tomorrow = (await client.query<{ d: string }>("SELECT ((now() AT TIME ZONE 'Asia/Kolkata')::date + 1)::text AS d")).rows[0]!.d;
    const before = await rowOf(client, id);
    const types = await streamTypes(client, id);
    expect(await caught(() => terminateFieldWorker(client, { ...act(id, 'terminate'), reasonCode: 'died', endedOn: tomorrow }))).toMatchObject({ reason: 'in_future' });
    await expectRefusedCleanly(client, id, before, types);
    const today = await istToday(client);
    await terminateFieldWorker(client, { ...act(id, 'terminate'), reasonCode: 'died', endedOn: today });
    expect(await rowOf(client, id)).toMatchObject({ current_state: 'terminated', state_reason_code: 'died', ended_on: today });
    const ev = (await client.query("SELECT payload FROM events_log WHERE stream_id = $1 AND event_type = 'field_worker.terminated'", [id])).rows[0];
    expect(ev.payload).toMatchObject({ reason_code: 'died', ended_on: today, trigger: 'field_worker.terminate:died' });
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
      expect(await rowOf(client, id)).toBeUndefined(); // review R3-22 — the title says "no row" too
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
    await recordFieldWorkerKycCompleted(client, approve(id));
    await terminateFieldWorker(client, { ...act(id, 'terminate'), reasonCode: 'registered_in_error', endedOn: await istToday(client) });
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
    const before = await rowOf(client, id);
    const err = await caught(() => terminateFieldWorker(client, { ...act(id, 'terminate'), reasonCode: 'inactive', endedOn: '2026-10-14' }));
    expect(err).toBeInstanceOf(FieldWorkerEndedOnInvalidError);
    expect(err).toMatchObject({ reason: 'before_registration' });
    await expectRefusedCleanly(client, id, before, ['field_worker.registered']); // review R4-13
    await terminateFieldWorker(client, { ...act(id, 'terminate'), reasonCode: 'inactive', endedOn: '2026-10-15' });
    expect((await rowOf(client, id)).ended_on).toBe('2026-10-15');
  });

  it('an ended_on after the IST today ⇒ in_future', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const id = await registerReal(client, PARIWAR_A, { actorId: ACTOR });
    const tomorrow = (await client.query<{ d: string }>("SELECT ((now() AT TIME ZONE 'Asia/Kolkata')::date + 1)::text AS d")).rows[0]!.d;
    const before = await rowOf(client, id);
    expect(await caught(() => terminateFieldWorker(client, { ...act(id, 'terminate'), reasonCode: 'inactive', endedOn: tomorrow }))).toMatchObject({ reason: 'in_future' });
    await expectRefusedCleanly(client, id, before, ['field_worker.registered']); // review R4-13
  });
});

// Story 13.1a AD2 / AD3 / TR4 — the approval: `kyc_completed` then `activated`, on ONE client in ONE transaction, under ONE verified
// `field_worker.approve` result. (The as-of cut over the pair — both in or both out — is `read.spec.ts` (b).)
describe.skipIf(!hasDatabase)('the approval pair in ONE transaction (Story 13.1a AD2, AD3; TR3, TR4)', () => {
  setupLiveDb();

  it('two events at n+1 and n+2 with EQUAL occurred_at, the SAME authorization snapshot; the row active / completed with its approver; I4', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const id = await registerReal(client, PARIWAR_A, { actorId: ACTOR, district: 'Gaya' });
    const one = approval(PARIWAR_A, 'Gaya', ACTOR); // ONE object for both commands
    const kyc = await recordFieldWorkerKycCompleted(client, { ...staff(id), authorization: one.authorization });
    const act = await activateFieldWorker(client, { ...staff(id), ...one });
    expect([kyc.eventVersion, act.eventVersion]).toEqual([2, 3]);
    expect(act).toMatchObject({ fromState: 'pending_kyc', state: 'active', kycStatus: 'completed', district: 'Gaya' });
    const events = (
      await client.query<{ event_type: string; event_version: string; occurred_at: Date; payload: { authorization: unknown } }>(
        "SELECT event_type, event_version, occurred_at, payload FROM events_log WHERE stream_id = $1 AND event_version > 1 ORDER BY event_version",
        [id],
      )
    ).rows;
    expect(events.map((e) => e.event_type)).toEqual(['field_worker.kyc_completed', 'field_worker.activated']);
    expect(events[0]!.occurred_at.getTime()).toBe(events[1]!.occurred_at.getTime()); // TR3 — the transaction-start now()
    expect(events[0]!.payload.authorization).toEqual(events[1]!.payload.authorization);
    expect(events[0]!.payload.authorization).toMatchObject({ permission_key: 'field_worker.approve', role: 'pariwar_admin', target: { dimension: 'district', value: 'Gaya' } });
    expect((await client.query('SELECT approved_by_display FROM field_workers WHERE field_worker_id = $1', [id])).rows[0]).toEqual({ approved_by_display: 'Meera Pariwar-Admin' });
    await expectRowMatchesStream(client, id);
  });

  it('TR4: a failed SECOND command rolls back only ITS savepoint — the kyc event is still in the open transaction until the CALLER rolls back; then nothing survives (control: a re-approval succeeds)', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const id = await registerReal(client, PARIWAR_A, { actorId: ACTOR });
    await client.query('SAVEPOINT caller_tx'); // stands in for the handler's scope transaction
    await recordFieldWorkerKycCompleted(client, approve(id));
    // The second command fails UNDER the lock (a stale target), so its own savepoint is the only thing it rolls back.
    const err = await caught(() => activateFieldWorker(client, approve(id, 'Nalanda')));
    expect(err).toBeInstanceOf(FieldWorkerAuthorizationStaleError);
    // The half-approved worker IS in the open transaction — the reason the handler must let the error propagate.
    expect(await streamTypes(client, id)).toEqual(['field_worker.registered', 'field_worker.kyc_completed']);
    expect(await rowOf(client, id)).toMatchObject({ current_state: 'pending_kyc', kyc_status: 'completed' });
    await client.query('ROLLBACK TO SAVEPOINT caller_tx');
    expect(await streamTypes(client, id)).toEqual(['field_worker.registered']);
    expect(await rowOf(client, id)).toMatchObject({ current_state: 'pending_kyc', kyc_status: 'pending', v: 1 });
    // CONTROL — the same worker approves cleanly afterwards, so the rollback (not a broken row) is what emptied the stream.
    await recordFieldWorkerKycCompleted(client, approve(id));
    await activateFieldWorker(client, approve(id));
    expect(await streamTypes(client, id)).toEqual(['field_worker.registered', 'field_worker.kyc_completed', 'field_worker.activated']);
    await expectRowMatchesStream(client, id);
  });
});
