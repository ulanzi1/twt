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
  opts: { district?: string; actorId?: string } = {},
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
    mobileBlindIndex: `fixture-${randomUUID()}`,
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
 * Story 13.1c review (CR10) — SUSPEND (`under_review`) or REACTIVATE a worker through the PUBLIC commands on `client`, under the
 * act's own key at the district the row holds now. Like `moveTestFieldWorker`, the row lock is held until the caller's transaction
 * ends — a race leg commits it while a request waits.
 */
export async function actTestFieldWorker(client: pg.PoolClient, pariwarId: string, id: ids.FieldWorkerId, act: 'suspend' | 'reactivate'): Promise<void> {
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
  if (act === 'suspend') await fieldWorker.suspendFieldWorker(client, { ...base, reasonCode: 'under_review' });
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
