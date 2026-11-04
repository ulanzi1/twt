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
 * Story 13.1a — MOVE a worker to `toDistrict` through the PUBLIC `postFieldWorker` on `client` (it takes the row lock `FOR UPDATE`
 * and holds it until the caller's transaction ends — the race legs commit it while a request waits). Until 13.1c / 13.1d mint the
 * move keys, the command accepts any verified district-dimension key (13.1 C5): the registration key, targeting the destination.
 */
export async function moveTestFieldWorker(client: pg.PoolClient, pariwarId: string, id: ids.FieldWorkerId, toDistrict: string): Promise<void> {
  const actorId = randomUUID();
  const authorization = rbac.authorize({
    actorId,
    grants: [{ pariwarId, role: 'pariwar_admin', scopeDimension: 'pariwar', scopeValue: pariwarId }],
    key: 'field_worker.register',
    resource: { dimension: 'district', value: toDistrict, pariwarId },
  });
  if (authorization === null) throw new Error('[_field-worker-fixture] the real check refused a pariwar_admin grant');
  await fieldWorker.postFieldWorker(client, {
    pariwarId: ids.pariwarId(pariwarId),
    fieldWorkerId: id,
    auditId: randomUUID(),
    actor: 'operator',
    actorId,
    toDistrict,
    reasonCode: 'reassigned',
    authorization,
  });
}
