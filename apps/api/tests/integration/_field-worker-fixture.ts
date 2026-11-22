// A REAL field worker for the apps/api specs — Story 13.1 (Task 10 (2)). Since migration 0200 a code's holder must be a
// `field_workers` row of the SAME Pariwar (the composite FK), so a made-up id no longer works. `apps/api` tests cannot import
// `packages/domain/tests`, and a `ScopeTx` is twt_app (⛔ an owner-role seed) — so this registers through the PUBLIC command
// `fieldWorker.registerFieldWorker` on the caller's scoped client, with dummy ciphertext strings, a random audit id and an
// authorization minted by the REAL check (the command refuses anything else — there is ⛔ test-only mint). One of the three
// files the `authorize(` source fence allows (`packages/domain/tests/rbac/check.test.ts`).
// ⚠ It APPENDS to events_log — use it inside a transaction that rolls back, or clean up under replica mode.

import { randomUUID } from 'node:crypto';

import { fieldWorker, ids, rbac } from '@twt/domain';
import type pg from 'pg';

/** Register a `pending_kyc` worker in `pariwarId` on `client` (already scoped to it); returns its id. */
export async function registerTestFieldWorker(
  client: pg.PoolClient,
  pariwarId: string,
  opts: { district?: string; actorId?: string; mobileBlindIndex?: string } = {},
): Promise<ids.FieldWorkerId> {
  const district = opts.district ?? 'Patna';
  const actorId = opts.actorId ?? randomUUID();
  const authorization = rbac.authorize({
    actorId,
    grants: [{ pariwarId, role: 'pariwar_admin', scopeDimension: 'pariwar', scopeValue: pariwarId }],
    key: 'field_worker.register',
    resource: { dimension: 'district', value: district, pariwarId },
  });
  if (authorization === null) throw new Error('[_field-worker-fixture] the real check refused a pariwar_admin grant');
  const id = ids.fieldWorkerId(randomUUID());
  await fieldWorker.registerFieldWorker(client, {
    pariwarId: ids.pariwarId(pariwarId),
    fieldWorkerId: id,
    auditId: randomUUID(),
    actor: 'operator',
    actorId, // the SAME actor the authorization was minted for — the command refuses another
    nameCiphertext: 'enc:v1:fixture-name',
    mobileCiphertext: 'enc:v1:fixture-mobile',
    // Story 13.1f — a race leg registers a SECOND row with an existing worker's number (the live-number index).
    mobileBlindIndex: opts.mobileBlindIndex ?? `fixture-${randomUUID()}`,
    registeredByDisplay: 'Fixture Admin',
    district,
    authorization,
  });
  return id;
}

/**
 * Story 13.1a — a VERIFIED `field_worker.approve` result for `actorId` at `district`, minted by the REAL check from a pariwar_admin
 * grant (the commands refuse anything else). ⚠ This file is exempt from the `authorize(` fence by exact path — keep it here (TR20).
 */
export function approveAuthorization(pariwarId: string, district: string, actorId: string) {
  const authorization = rbac.authorize({
    actorId,
    grants: [{ pariwarId, role: 'pariwar_admin', scopeDimension: 'pariwar', scopeValue: pariwarId }],
    key: 'field_worker.approve',
    resource: { dimension: 'district', value: district, pariwarId },
  });
  if (authorization === null) throw new Error('[_field-worker-fixture] the real check refused field_worker.approve for a pariwar_admin grant');
  return authorization;
}

/** Story 13.1a — approve a worker through the two PUBLIC commands on `client` (one transaction — the caller's). */
export async function approveTestFieldWorker(client: pg.PoolClient, pariwarId: string, id: ids.FieldWorkerId, district = 'Patna'): Promise<void> {
  const actorId = randomUUID();
  const authorization = approveAuthorization(pariwarId, district, actorId);
  const base = { pariwarId: ids.pariwarId(pariwarId), fieldWorkerId: id, actor: 'operator' as const, actorId, authorization };
  await fieldWorker.recordFieldWorkerKycCompleted(client, { ...base, auditId: randomUUID() });
  await fieldWorker.activateFieldWorker(client, { ...base, auditId: randomUUID(), approvedByDisplay: 'Fixture Approver' });
}

/**
 * Story 13.1c (AD3, AD4) — a VERIFIED result for one of the act keys (`field_worker.move` / `.suspend` / `.reactivate` /
 * `.terminate`) for `actorId` at `district`, minted by the REAL check from a pariwar_admin grant (it holds all four). ⚠ This file is
 * exempt from the `authorize(` fence by exact path — keep it here.
 */
export function actAuthorization(
  key: 'field_worker.move' | 'field_worker.suspend' | 'field_worker.reactivate' | 'field_worker.terminate',
  pariwarId: string,
  district: string,
  actorId: string,
) {
  const authorization = rbac.authorize({
    actorId,
    grants: [{ pariwarId, role: 'pariwar_admin', scopeDimension: 'pariwar', scopeValue: pariwarId }],
    key,
    resource: { dimension: 'district', value: district, pariwarId },
  });
  if (authorization === null) throw new Error(`[_field-worker-fixture] the real check refused ${key} for a pariwar_admin grant`);
  return authorization;
}

/**
 * Story 13.1c review (CR10) — SUSPEND (`under_review` by default) or REACTIVATE a worker through the PUBLIC commands on `client`, under
 * the act's own key at the district the row holds now. Like `moveTestFieldWorker`, the row lock is held until the caller's transaction
 * ends — a race leg commits it while a request waits. Story 3.15 (AC4) — `reason` picks the suspension's reason (`at_worker_request`).
 */
export async function actTestFieldWorker(
  client: pg.PoolClient,
  pariwarId: string,
  id: ids.FieldWorkerId,
  act: 'suspend' | 'reactivate',
  reason: 'under_review' | 'at_worker_request' = 'under_review',
): Promise<void> {
  const actorId = randomUUID();
  const { rows } = await client.query<{ district: string }>('SELECT district FROM field_workers WHERE field_worker_id = $1', [id]);
  if (rows[0] === undefined) throw new Error('[_field-worker-fixture] actTestFieldWorker: no such worker');
  const base = {
    pariwarId: ids.pariwarId(pariwarId),
    fieldWorkerId: id,
    auditId: randomUUID(),
    actor: 'operator' as const,
    actorId,
    authorization: actAuthorization(act === 'suspend' ? 'field_worker.suspend' : 'field_worker.reactivate', pariwarId, rows[0].district, actorId),
  };
  if (act === 'suspend') await fieldWorker.suspendFieldWorker(client, { ...base, reasonCode: reason });
  else await fieldWorker.reactivateFieldWorker(client, base);
}

/**
 * Story 13.1a — MOVE a worker to `toDistrict` through the PUBLIC `postFieldWorker` on `client` (it takes the row lock `FOR UPDATE`
 * and holds it until the caller's transaction ends — the race legs commit it while a request waits). Story 13.1c AD4: under the
 * `field_worker.move` key (targeting the destination), from the district the row holds NOW (the expected source — what an admin
 * opening the worker would have seen).
 */
export async function moveTestFieldWorker(client: pg.PoolClient, pariwarId: string, id: ids.FieldWorkerId, toDistrict: string): Promise<void> {
  const actorId = randomUUID();
  const { rows } = await client.query<{ district: string }>('SELECT district FROM field_workers WHERE field_worker_id = $1', [id]);
  if (rows[0] === undefined) throw new Error('[_field-worker-fixture] moveTestFieldWorker: no such worker');
  await fieldWorker.postFieldWorker(client, {
    pariwarId: ids.pariwarId(pariwarId),
    fieldWorkerId: id,
    auditId: randomUUID(),
    actor: 'operator',
    actorId,
    toDistrict,
    expectedFromDistrict: rows[0].district,
    reasonCode: 'reassigned',
    authorization: actAuthorization('field_worker.move', pariwarId, toDistrict, actorId),
  });
}

/**
 * Story 13.1d (AD4) — ACCEPT a move request through the PUBLIC `acceptFieldWorkerMoveRequest` on `client`, as a District Admin of its
 * counterpart district (the answer key minted by the REAL check from a district grant). It takes the WORKER's lock first and holds it
 * until the caller's transaction ends — the race legs commit it while a request waits.
 */
export async function acceptTestMoveRequest(client: pg.PoolClient, pariwarId: string, moveRequestId: string, counterpartDistrict: string): Promise<void> {
  const actorId = randomUUID();
  const authorization = rbac.authorize({
    actorId,
    grants: [{ pariwarId, role: 'district_admin', scopeDimension: 'district', scopeValue: counterpartDistrict }],
    key: 'field_worker.answer_move_request',
    resource: { dimension: 'district', value: counterpartDistrict, pariwarId },
  });
  if (authorization === null) throw new Error('[_field-worker-fixture] the real check refused field_worker.answer_move_request for a district grant');
  await fieldWorker.acceptFieldWorkerMoveRequest(client, {
    pariwarId: ids.pariwarId(pariwarId),
    moveRequestId: ids.fieldWorkerMoveRequestId(moveRequestId),
    auditId: randomUUID(),
    actor: 'operator',
    actorId,
    authorization,
  });
}

// ── Story 13.1f — the undo and the appeal, through the PUBLIC commands, for the race legs (each takes the WORKER's row lock first and
// holds it until the caller's transaction ends). Authorizations minted by the REAL check (this file is exempt from the `authorize(`
// fence by exact path). ──

type Hearer = 'pariwar_admin' | 'trustee_panel';
function hearAuthorization(hearer: Hearer, pariwarId: string, district: string, actorId: string) {
  const authorization = rbac.authorize({
    actorId,
    grants: [{ pariwarId, role: hearer, scopeDimension: 'pariwar', scopeValue: pariwarId }],
    key: hearer === 'trustee_panel' ? 'field_worker.hear_ending_appeal_as_panel' : 'field_worker.hear_ending_appeal',
    resource: { dimension: 'district', value: district, pariwarId },
  });
  if (authorization === null) throw new Error(`[_field-worker-fixture] the real check refused the hear key for ${hearer}`);
  return { authorization, actor: hearer === 'trustee_panel' ? ('trustee' as const) : ('operator' as const) };
}
async function districtAndVersion(client: pg.PoolClient, id: string): Promise<{ district: string; version: number }> {
  const { rows } = await client.query<{ district: string; v: string }>('SELECT district, state_event_version::text AS v FROM field_workers WHERE field_worker_id = $1', [id]);
  if (rows[0] === undefined) throw new Error('[_field-worker-fixture] no such worker');
  return { district: rows[0].district, version: Number(rows[0].v) };
}
const istToday = async (client: pg.PoolClient) => (await client.query<{ d: string }>("SELECT ((now() AT TIME ZONE 'Asia/Kolkata')::date)::text AS d")).rows[0]!.d;

/** END a worker (`inactive`, today IST) through `terminateFieldWorker`; `heardBy` as the terminate route would fix it. */
export async function terminateTestFieldWorker(client: pg.PoolClient, pariwarId: string, id: ids.FieldWorkerId, heardBy: Hearer = 'trustee_panel'): Promise<void> {
  const actorId = randomUUID();
  const { district, version } = await districtAndVersion(client, id);
  await fieldWorker.terminateFieldWorker(client, {
    pariwarId: ids.pariwarId(pariwarId),
    fieldWorkerId: id,
    auditId: randomUUID(),
    actor: 'operator',
    actorId,
    reasonCode: 'inactive',
    endedOn: await istToday(client),
    authorization: actAuthorization('field_worker.terminate', pariwarId, district, actorId),
    appealHeardBy: heardBy,
    expectedStateEventVersion: version, // R2A-2 — the version the "screen" (this read) showed
  });
}

/** UNDO the worker's current ending (a slip) through `undoFieldWorkerEnding`, as a Pariwar Admin. */
export async function undoTestEnding(client: pg.PoolClient, pariwarId: string, id: ids.FieldWorkerId): Promise<void> {
  const actorId = randomUUID();
  const { district, version } = await districtAndVersion(client, id);
  const authorization = rbac.authorize({
    actorId,
    grants: [{ pariwarId, role: 'pariwar_admin', scopeDimension: 'pariwar', scopeValue: pariwarId }],
    key: 'field_worker.undo_ending',
    resource: { dimension: 'district', value: district, pariwarId },
  });
  if (authorization === null) throw new Error('[_field-worker-fixture] the real check refused field_worker.undo_ending');
  await fieldWorker.undoFieldWorkerEnding(client, { pariwarId: ids.pariwarId(pariwarId), fieldWorkerId: id, auditId: randomUUID(), actor: 'operator', actorId, authorization, expectedEndingVersion: version });
}

/** LODGE an appeal against the worker's current ending through `lodgeFieldWorkerEndingAppeal`, by the given hearer; returns its id. */
export async function lodgeTestAppeal(client: pg.PoolClient, pariwarId: string, id: ids.FieldWorkerId, hearer: Hearer = 'trustee_panel'): Promise<string> {
  const actorId = randomUUID();
  const { district, version } = await districtAndVersion(client, id);
  const appealId = ids.fieldWorkerEndingAppealId(randomUUID());
  await fieldWorker.lodgeFieldWorkerEndingAppeal(client, {
    pariwarId: ids.pariwarId(pariwarId),
    fieldWorkerId: id,
    appealId,
    auditId: randomUUID(),
    actorId,
    ...hearAuthorization(hearer, pariwarId, district, actorId),
    expectedEndingVersion: version,
    receivedOn: await istToday(client),
    receivedVia: 'phone',
  });
  return appealId;
}

/** DECIDE (allow / refuse) or WITHDRAW an appeal through its PUBLIC command, by the given hearer (never the ender — a fresh actor). */
export async function closeTestAppeal(
  client: pg.PoolClient,
  pariwarId: string,
  appealId: string,
  act: 'allowed' | 'refused' | 'withdrawn',
  hearer: Hearer = 'trustee_panel',
  district = 'Patna',
): Promise<void> {
  const actorId = randomUUID();
  const input = {
    pariwarId: ids.pariwarId(pariwarId),
    appealId: ids.fieldWorkerEndingAppealId(appealId),
    auditId: randomUUID(),
    actorId,
    ...hearAuthorization(hearer, pariwarId, district, actorId),
    decidedOn: await istToday(client),
  };
  if (act === 'allowed') await fieldWorker.allowFieldWorkerEndingAppeal(client, input);
  else if (act === 'refused') await fieldWorker.refuseFieldWorkerEndingAppeal(client, input);
  else await fieldWorker.withdrawFieldWorkerEndingAppeal(client, input);
}
