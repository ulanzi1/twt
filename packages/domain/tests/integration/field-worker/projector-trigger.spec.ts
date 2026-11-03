// The field-worker projector called DIRECTLY — Story 13.1 (AC2, AC5; QE13; I1, I13). Per-test ROLLBACK, as twt_app. The
// commands are the public writers; these legs prove what the projector itself refuses when a caller skips them: drift
// between the locked row and the stream head, a payload that disagrees with the locked row, `registered` as a transition,
// and the trigger's rejection surfacing as the typed direct-write error.

import { randomUUID } from 'node:crypto';

import type pg from 'pg';
import { describe, expect, it } from 'vitest';

import { FIELD_WORKER_GUARD_COLUMNS } from '../../../src/field-worker/commands.js';
import {
  FieldWorkerGenesisAlreadyExistsError,
  FieldWorkerProjectorInputError,
  FieldWorkerStateDirectWriteError,
  FieldWorkerStreamConcurrencyError,
  isFieldWorkerStateDirectWriteError,
} from '../../../src/field-worker/errors.js';
import { mapFieldWorkerWriteError, projectFieldWorkerTransition, type FieldWorkerLockedRow } from '../../../src/field-worker/project.js';
import { pariwarId as toPariwarId, type FieldWorkerId } from '../../../src/ids/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, enterAppScope } from '../_helpers.js';
import { caught, expectRowMatchesStream, registerAuthorization, registerReal, streamTypes } from './_fixtures.js';

const A = toPariwarId(PARIWAR_A);
const ACTOR = randomUUID();

async function locked(client: pg.PoolClient, id: string): Promise<FieldWorkerLockedRow> {
  const r = (await client.query(`SELECT ${FIELD_WORKER_GUARD_COLUMNS} FROM field_workers WHERE field_worker_id = $1 FOR UPDATE`, [id])).rows[0];
  return {
    currentState: r.current_state,
    stateEventVersion: Number(r.state_event_version),
    kycStatus: r.kyc_status,
    stateReasonCode: r.state_reason_code,
    district: r.district,
    endedOn: r.ended_on,
    registeredOn: r.registered_on,
  };
}

const input = (id: FieldWorkerId, lockedRow: FieldWorkerLockedRow, eventType: string, payload: Record<string, unknown>) => ({
  pariwarId: A,
  fieldWorkerId: id,
  eventType: eventType as never,
  payload: { trigger: 't', actor: 'operator', ...payload },
  auditId: randomUUID(),
  actor: 'operator' as const,
  actorId: ACTOR,
  lockedRow,
});

describe.skipIf(!hasDatabase)('projectFieldWorkerTransition, direct (AC2, AC5)', () => {
  setupLiveDb();

  it('the success path re-projects the I1 columns and I4 holds; the FIELD_WORKER_GUARD_COLUMNS lock reads the IST registration day', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const id = await registerReal(client, PARIWAR_A, { actorId: ACTOR });
    const row = await locked(client, id);
    expect(row.registeredOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    await projectFieldWorkerTransition(client, input(id, row, 'field_worker.kyc_completed', { from_state: 'pending_kyc', to_state: 'pending_kyc' }));
    await expectRowMatchesStream(client, id);
  });

  it('DRIFT: a locked version that is not the stream head ⇒ FieldWorkerStreamConcurrencyError, nothing appended', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const id = await registerReal(client, PARIWAR_A, { actorId: ACTOR });
    const row = { ...(await locked(client, id)), stateEventVersion: 5 };
    await client.query('SAVEPOINT drift');
    expect(await caught(() => projectFieldWorkerTransition(client, input(id, row, 'field_worker.kyc_completed', { from_state: 'pending_kyc', to_state: 'pending_kyc' })))).toBeInstanceOf(
      FieldWorkerStreamConcurrencyError,
    );
    await client.query('ROLLBACK TO SAVEPOINT drift');
    expect(await streamTypes(client, id)).toEqual(['field_worker.registered']);
  });

  it('a payload that disagrees with the locked row ⇒ ProjectorInputError: from/to state, the actor, a posted from_district', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const id = await registerReal(client, PARIWAR_A, { actorId: ACTOR });
    const row = await locked(client, id);
    const auth = registerAuthorization(PARIWAR_A, 'Gaya', ACTOR);
    const snapshot = { permission_key: auth.permissionKey, role: auth.role, grant: { dimension: auth.grant.dimension, value: auth.grant.value }, target: { dimension: 'district', value: 'Gaya' }, catalog_version: auth.catalogVersion };
    for (const [type, payload] of [
      ['field_worker.kyc_completed', { from_state: 'active', to_state: 'pending_kyc' }],
      ['field_worker.kyc_completed', { from_state: 'pending_kyc', to_state: 'pending_kyc', actor: 'trustee' }],
      ['field_worker.posted', { from_state: 'pending_kyc', to_state: 'pending_kyc', authorization: snapshot, from_district: 'Nalanda', to_district: 'Gaya', reason_code: 'reassigned' }],
      ['field_worker.kyc_completed', { from_state: 'pending_kyc', to_state: 'pending_kyc', name: 'Vikram' }], // .strict(): no PII key
    ] as const) {
      expect(await caught(() => projectFieldWorkerTransition(client, input(id, row, type, payload))), `${type} ${JSON.stringify(payload)}`).toBeInstanceOf(
        FieldWorkerProjectorInputError,
      );
    }
    expect(await caught(() => projectFieldWorkerTransition(client, input(id, row, 'field_worker.registered', {})))).toBeInstanceOf(FieldWorkerGenesisAlreadyExistsError);
    expect(await streamTypes(client, id)).toEqual(['field_worker.registered']);
  });

  it('the trigger’s rejection is detected and surfaced as the typed FieldWorkerStateDirectWriteError (message prefixed, no PII)', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const id = await registerReal(client, PARIWAR_A, { actorId: ACTOR });
    await client.query('SAVEPOINT unguarded');
    const raw = await caught(() => client.query("UPDATE field_workers SET kyc_status = 'completed', state_event_version = 2 WHERE field_worker_id = $1", [id]));
    await client.query('ROLLBACK TO SAVEPOINT unguarded');
    expect(isFieldWorkerStateDirectWriteError(raw)).toBe(true);
    const mapped = mapFieldWorkerWriteError(raw, id, 2);
    expect(mapped).toBeInstanceOf(FieldWorkerStateDirectWriteError);
    expect((mapped as Error).message).toMatch(/^field_workers direct write rejected: /);
    expect(isFieldWorkerStateDirectWriteError(new Error('field_workers direct write rejected'))).toBe(false); // ⛔ a plain Error (no SQLSTATE)
  });
});
