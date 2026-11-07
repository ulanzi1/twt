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
import { actAuthorization, approveAuthorization, caught, expectRowMatchesStream, moveAuthorization, registerReal, streamTypes, type FieldWorkerActKey } from './_fixtures.js';

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

/** QE6's computed trigger per type (`events.ts` refuses any other value since review R3-16). */
const TRIGGER: Record<string, (p: Record<string, unknown>) => string> = {
  'field_worker.kyc_completed': () => 'field_worker.kyc_complete',
  'field_worker.activated': () => 'field_worker.activate',
  'field_worker.terminated': (p) => `field_worker.terminate:${String(p['reason_code'])}`,
  'field_worker.posted': () => 'field_worker.post',
};

/** Story 13.1a AD3 — `kyc_completed` / `activated` payloads carry the approval's authorization snapshot (a worker in Patna). */
const approve = approveAuthorization(PARIWAR_A, 'Patna', ACTOR);
const APPROVE_SNAPSHOT = {
  permission_key: approve.permissionKey,
  role: approve.role,
  grant: { dimension: approve.grant.dimension, value: approve.grant.value },
  target: { dimension: 'district', value: 'Patna' },
  catalog_version: approve.catalogVersion,
};
/** Story 13.1c AD3 — `suspended` / `reactivated` / `terminated` carry their OWN key's snapshot (a worker in Patna). */
const actSnapshot = (key: FieldWorkerActKey) => {
  const a = actAuthorization(key, PARIWAR_A, 'Patna', ACTOR);
  return { permission_key: a.permissionKey, role: a.role, grant: { dimension: a.grant.dimension, value: a.grant.value }, target: { dimension: 'district', value: 'Patna' }, catalog_version: a.catalogVersion };
};
/** The snapshot each transition type carries, added by `input` (a `posted` payload brings its own — its target is an end of the move). */
const SNAPSHOT_BY_TYPE: Record<string, unknown> = {
  'field_worker.kyc_completed': APPROVE_SNAPSHOT,
  'field_worker.activated': APPROVE_SNAPSHOT,
  'field_worker.suspended': actSnapshot('field_worker.suspend'),
  'field_worker.reactivated': actSnapshot('field_worker.reactivate'),
  'field_worker.terminated': actSnapshot('field_worker.terminate'),
};

const input = (
  id: FieldWorkerId,
  lockedRow: FieldWorkerLockedRow,
  eventType: string,
  payload: Record<string, unknown>,
  who: { actor?: string; actorId?: string | null } = {},
) => ({
  pariwarId: A,
  fieldWorkerId: id,
  eventType: eventType as never,
  payload: {
    trigger: TRIGGER[eventType]?.(payload) ?? 'field_worker.unknown',
    actor: 'operator',
    ...(eventType in SNAPSHOT_BY_TYPE ? { authorization: SNAPSHOT_BY_TYPE[eventType] } : {}),
    ...payload,
  },
  auditId: randomUUID(),
  actor: (who.actor ?? 'operator') as 'operator',
  actorId: (who.actorId === undefined ? ACTOR : who.actorId) as string,
  lockedRow,
  ...(eventType === 'field_worker.activated' ? { approvedByDisplay: 'Meera Pariwar-Admin' } : {}),
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
    // ⛔ a savepoint (review R3-11): read the stream BEFORE any rollback, or "nothing appended" holds by construction. The drift is
    // refused before any statement fails, so the transaction stays usable without one.
    expect(await caught(() => projectFieldWorkerTransition(client, input(id, row, 'field_worker.kyc_completed', { from_state: 'pending_kyc', to_state: 'pending_kyc' })))).toBeInstanceOf(
      FieldWorkerStreamConcurrencyError,
    );
    expect(await streamTypes(client, id)).toEqual(['field_worker.registered']);
  });

  // Review R3-14 — a from/to mismatch the payload SCHEMA accepts (a termination may come from `active`), so ONLY the projector's own
  // cross-check against the locked row can refuse it; read before any rollback (R3-11).
  it('a from_state the schema allows but the LOCKED ROW contradicts ⇒ ProjectorInputError (the cross-check, not the schema), nothing appended', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const id = await registerReal(client, PARIWAR_A, { actorId: ACTOR });
    const row = await locked(client, id); // pending_kyc
    const err = await caught(() =>
      projectFieldWorkerTransition(client, input(id, row, 'field_worker.terminated', { from_state: 'active', to_state: 'terminated', reason_code: 'inactive', ended_on: '2026-11-01' })),
    );
    expect(err).toBeInstanceOf(FieldWorkerProjectorInputError);
    expect((err as Error).message).toMatch(/disagree with the locked row/);
    expect(await streamTypes(client, id)).toEqual(['field_worker.registered']);
  });

  // Review R3-15 — the projector's OWN human-actor check (QE7's third place): every command calls the same check first, so only a direct
  // call reaches it. `actorId: null` is caught ONLY here (the payload never carries the actor id; `events_log.actor_id` NULL means "system").
  it('the projector’s own actor check: a system actor; an operator with NO actorId ⇒ ProjectorInputError, nothing appended', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const id = await registerReal(client, PARIWAR_A, { actorId: ACTOR });
    const row = await locked(client, id);
    const kycPayload = { from_state: 'pending_kyc', to_state: 'pending_kyc' };
    for (const who of [{ actor: 'system' }, { actorId: null }, { actorId: '' }]) {
      const err = await caught(() => projectFieldWorkerTransition(client, input(id, row, 'field_worker.kyc_completed', { ...kycPayload, actor: who.actor ?? 'operator' }, who)));
      expect(err, JSON.stringify(who)).toBeInstanceOf(FieldWorkerProjectorInputError);
      expect((err as Error).message, JSON.stringify(who)).toMatch(/QE7/);
    }
    expect(await streamTypes(client, id)).toEqual(['field_worker.registered']);
  });

  it('a payload that disagrees with the locked row ⇒ ProjectorInputError: from/to state, the actor, a posted from_district', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const id = await registerReal(client, PARIWAR_A, { actorId: ACTOR });
    const row = await locked(client, id);
    const auth = moveAuthorization(PARIWAR_A, 'Gaya', ACTOR);
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

  // Story 13.1a AD3 / `-447` item 2 — a direct call that skips the commands still cannot write an approval without its snapshot or approver.
  it('kyc_completed / activated WITHOUT the authorization snapshot ⇒ ProjectorInputError; activated without an approver name, or an approver on another type ⇒ ProjectorInputError', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const id = await registerReal(client, PARIWAR_A, { actorId: ACTOR });
    const row = await locked(client, id);
    const noAuth = { ...input(id, row, 'field_worker.kyc_completed', { from_state: 'pending_kyc', to_state: 'pending_kyc' }) };
    noAuth.payload = Object.fromEntries(Object.entries(noAuth.payload).filter(([k]) => k !== 'authorization')) as typeof noAuth.payload;
    expect(await caught(() => projectFieldWorkerTransition(client, noAuth))).toBeInstanceOf(FieldWorkerProjectorInputError);
    const approverOnKyc = { ...input(id, row, 'field_worker.kyc_completed', { from_state: 'pending_kyc', to_state: 'pending_kyc' }), approvedByDisplay: 'Meera' };
    expect(await caught(() => projectFieldWorkerTransition(client, approverOnKyc))).toBeInstanceOf(FieldWorkerProjectorInputError);
    expect(((await caught(() => projectFieldWorkerTransition(client, approverOnKyc))) as Error).message).toMatch(/belongs to field_worker\.activated only/);
    expect(await streamTypes(client, id)).toEqual(['field_worker.registered']);
    // CONTROL — the snapshot-carrying kyc_completed is accepted; then activated without an approver name is refused, with one it passes.
    await projectFieldWorkerTransition(client, input(id, row, 'field_worker.kyc_completed', { from_state: 'pending_kyc', to_state: 'pending_kyc' }));
    const afterKyc = await locked(client, id);
    const noName = { ...input(id, afterKyc, 'field_worker.activated', { from_state: 'pending_kyc', to_state: 'active' }), approvedByDisplay: undefined };
    expect(((await caught(() => projectFieldWorkerTransition(client, noName))) as Error).message).toMatch(/display name is missing/);
    await projectFieldWorkerTransition(client, input(id, afterKyc, 'field_worker.activated', { from_state: 'pending_kyc', to_state: 'active' }));
    expect((await client.query('SELECT approved_by_display FROM field_workers WHERE field_worker_id = $1', [id])).rows[0]).toEqual({ approved_by_display: 'Meera Pariwar-Admin' });
    await expectRowMatchesStream(client, id);
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
