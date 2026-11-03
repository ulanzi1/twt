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
