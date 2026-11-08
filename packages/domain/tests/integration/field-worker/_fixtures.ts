// Shared fixtures for the field-worker live-DB specs (Story 13.1, Task 11). Raw INSERTs set the writer guard so the 0200
// trigger steps aside; ⛔ a projector call (which would append to `events_log`). Lives under `tests/` — ⛔ `src/test-utils/`,
// which the state-invariant gate scans.

import { randomUUID } from 'node:crypto';

import type pg from 'pg';
import { expect } from 'vitest';

import { registerFieldWorker } from '../../../src/field-worker/commands.js';
import { foldFieldWorkerProjection } from '../../../src/field-worker/state.js';
import { fieldWorkerId as toFieldWorkerId, pariwarId as toPariwarId, type FieldWorkerId } from '../../../src/ids/index.js';
import { authorize, type VerifiedAuthorization } from '../../../src/rbac/check.js';

export { caught, expectSqlRejected, seedFieldWorker } from '../attribution-code/_fixtures.js';

export const GUARD_ON = "SET LOCAL app.field_worker_state_writer = 'on'";
export const GUARD_OFF = "SET LOCAL app.field_worker_state_writer = 'off'";
/** The P0001 message prefix every 0200 trigger raise carries (`FIELD_WORKER_STATE_DIRECT_WRITE_MESSAGE_PREFIX`). */
export const DIRECT_WRITE_PREFIX = 'field_workers direct write rejected';

/** A raw genesis-shaped INSERT — 12 parameters, in `rawInsertParams` order. */
export const RAW_INSERT_SQL = `INSERT INTO field_workers
  (field_worker_id, pariwar_id, name_ciphertext, mobile_ciphertext, mobile_blind_index, registered_by_user_id,
   registered_by_display, current_state, state_event_version, kyc_status, district, audit_id)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`;

export interface RawInsertOverrides {
  readonly mobileBlindIndex?: string;
  readonly registeredByDisplay?: string;
  readonly currentState?: string;
  readonly stateEventVersion?: number;
  readonly kycStatus?: string;
  readonly district?: string;
}

export function rawInsertParams(fieldWorkerId: string, pariwarId: string, o: RawInsertOverrides = {}): unknown[] {
  return [
    fieldWorkerId,
    pariwarId,
    'enc:v1:raw-name',
    'enc:v1:raw-mobile',
    o.mobileBlindIndex ?? `raw-${randomUUID()}`,
    randomUUID(),
    o.registeredByDisplay ?? 'Raw Admin',
    o.currentState ?? 'pending_kyc',
    o.stateEventVersion ?? 1,
    o.kycStatus ?? 'pending',
    o.district ?? 'Patna',
    randomUUID(),
  ];
}

/** Guarded raw UPDATE of the projected columns (a projector-shaped write) — `sets` is SQL text, e.g. `current_state = 'active'`. */
export async function guardedUpdate(client: pg.PoolClient, fieldWorkerId: string, sets: string): Promise<void> {
  await client.query(GUARD_ON);
  await client.query(`UPDATE field_workers SET ${sets} WHERE field_worker_id = $1`, [fieldWorkerId]);
  await client.query(GUARD_OFF);
}

/** Await `fn`, expecting a pg error; returns `{ code, constraint, message }` (`code ?? cause.code` — AC6). */
export async function pgErrorOf(fn: () => Promise<unknown>): Promise<{ code?: string; constraint?: string; message: string }> {
  try {
    await fn();
  } catch (e) {
    const err = e as { code?: string; constraint?: string; message?: string; cause?: { code?: string; constraint?: string } };
    return { code: err.code ?? err.cause?.code, constraint: err.constraint ?? err.cause?.constraint, message: err.message ?? '' };
  }
  throw new Error('expected a rejection');
}

/** A VERIFIED `field_worker.register` result for `actorId` at `district` in `pariwarId` — minted by the REAL check (QE18). */
export function registerAuthorization(pariwarId: string, district: string, actorId: string): VerifiedAuthorization {
  const result = authorize({
    actorId,
    grants: [{ pariwarId, role: 'pariwar_admin', scopeDimension: 'pariwar', scopeValue: pariwarId }],
    key: 'field_worker.register',
    resource: { dimension: 'district', value: district, pariwarId },
  });
  if (result === null) throw new Error('registerAuthorization: the real check refused a pariwar_admin grant');
  return result;
}

/**
 * A VERIFIED `field_worker.approve` result (Story 13.1a AD3) for `actorId` at `district` in `pariwarId` — minted by the REAL check
 * from a pariwar_admin grant. ⚠ This file is exempt from the `authorize` fence BY EXACT PATH: keep the helper here (TR20).
 */
export function approveAuthorization(pariwarId: string, district: string, actorId: string): VerifiedAuthorization {
  const result = authorize({
    actorId,
    grants: [{ pariwarId, role: 'pariwar_admin', scopeDimension: 'pariwar', scopeValue: pariwarId }],
    key: 'field_worker.approve',
    resource: { dimension: 'district', value: district, pariwarId },
  });
  if (result === null) throw new Error('approveAuthorization: the real check refused a pariwar_admin grant');
  return result;
}

/** The keys Story 13.1c minted for its acts (AD5) — `field_worker.read_log` gates a read, ⛔ a command, so it is ⛔ here. */
export type FieldWorkerActKey = 'field_worker.move' | 'field_worker.suspend' | 'field_worker.reactivate' | 'field_worker.terminate';

/**
 * A VERIFIED result for one of Story 13.1c's act keys (AD3, AD4) for `actorId` at `district` in `pariwarId` — minted by the REAL
 * check from a pariwar_admin grant (it holds all four). ⚠ This file is exempt from the `authorize` fence BY EXACT PATH: keep the
 * helper here (TR6).
 */
export function actAuthorization(key: FieldWorkerActKey, pariwarId: string, district: string, actorId: string): VerifiedAuthorization {
  const result = authorize({
    actorId,
    grants: [{ pariwarId, role: 'pariwar_admin', scopeDimension: 'pariwar', scopeValue: pariwarId }],
    key,
    resource: { dimension: 'district', value: district, pariwarId },
  });
  if (result === null) throw new Error(`actAuthorization: the real check refused a pariwar_admin grant for ${key}`);
  return result;
}

/**
 * Story 13.1d — a VERIFIED result for ANY key from ONE grant (a District Admin's exact district grant, or a Pariwar Admin's), minted by
 * the REAL check; null when the check refuses it (a non-holder — the caller asserts that). ⚠ This file is exempt from the `authorize`
 * fence BY EXACT PATH: keep the helper here (TR5).
 */
export function grantAuthorization(
  key: string,
  grant: { role: 'district_admin'; district: string } | { role: 'pariwar_admin' },
  pariwarId: string,
  district: string,
  actorId: string,
): VerifiedAuthorization | null {
  return authorize({
    actorId,
    grants: [
      grant.role === 'district_admin'
        ? { pariwarId, role: 'district_admin', scopeDimension: 'district', scopeValue: grant.district }
        : { pariwarId, role: 'pariwar_admin', scopeDimension: 'pariwar', scopeValue: pariwarId },
    ],
    key,
    resource: { dimension: 'district', value: district, pariwarId },
  });
}

/** A VERIFIED `field_worker.move` result (13.1c AD4) — what `postFieldWorker` accepts (⛔ `field_worker.register`). */
export function moveAuthorization(pariwarId: string, district: string, actorId: string): VerifiedAuthorization {
  return actAuthorization('field_worker.move', pariwarId, district, actorId);
}

/** The approval inputs both commands take, for a worker in `district` (13.1a AD3; `-447` item 2). */
export function approval(pariwarId: string, district: string, actorId: string): { authorization: VerifiedAuthorization; approvedByDisplay: string } {
  return { authorization: approveAuthorization(pariwarId, district, actorId), approvedByDisplay: 'Meera Pariwar-Admin' };
}

// ── Command-level helpers (the projector path — these APPEND to events_log; per-test ROLLBACK specs only, or clean up
//    under replica mode in an own-committing spec) ──

/** Register a worker through `registerFieldWorker` (the genesis projector) on `client`, already scoped to `pariwarId`. */
export async function registerReal(
  client: pg.PoolClient,
  pariwarId: string,
  opts: { fieldWorkerId?: string; district?: string; mobileBlindIndex?: string; actorId?: string } = {},
): Promise<FieldWorkerId> {
  const id = toFieldWorkerId(opts.fieldWorkerId ?? randomUUID());
  const district = opts.district ?? 'Patna';
  const actorId = opts.actorId ?? randomUUID();
  await registerFieldWorker(client, {
    pariwarId: toPariwarId(pariwarId),
    fieldWorkerId: id,
    auditId: randomUUID(),
    actor: 'operator',
    actorId,
    nameCiphertext: 'enc:v1:name',
    mobileCiphertext: 'enc:v1:mobile',
    mobileBlindIndex: opts.mobileBlindIndex ?? `idx-${randomUUID()}`,
    registeredByDisplay: 'Asha Verma',
    district,
    authorization: registerAuthorization(pariwarId, district, actorId),
  });
  return id;
}

/** I4 — the row equals the fold of its stream on { state, version, kycStatus, reasonCode, district, endedOn }. */
export async function expectRowMatchesStream(client: pg.PoolClient, id: string): Promise<void> {
  const row = (
    await client.query<{ current_state: string; state_event_version: string; kyc_status: string; state_reason_code: string | null; district: string; ended_on: string | null }>(
      'SELECT current_state, state_event_version, kyc_status, state_reason_code, district, ended_on::text AS ended_on FROM field_workers WHERE field_worker_id = $1',
      [id],
    )
  ).rows[0];
  expect(row, `no field_workers row for ${id}`).toBeDefined();
  const events = (
    await client.query<{ event_type: string; payload: unknown; event_version: string }>(
      'SELECT event_type, payload, event_version FROM events_log WHERE stream_id = $1 ORDER BY event_version',
      [id],
    )
  ).rows;
  const fold = foldFieldWorkerProjection(events.map((e) => ({ type: e.event_type, payload: e.payload, eventVersion: Number(e.event_version) })));
  expect({
    state: row!.current_state,
    version: Number(row!.state_event_version),
    kycStatus: row!.kyc_status,
    reasonCode: row!.state_reason_code,
    district: row!.district,
    endedOn: row!.ended_on,
  }).toEqual(fold);
  // Versions run 1…n with no gap.
  expect(events.map((e) => Number(e.event_version))).toEqual(events.map((_e, i) => i + 1));
}

/** The event types of a stream, in version order. */
export async function streamTypes(client: pg.PoolClient, id: string): Promise<string[]> {
  return (await client.query<{ event_type: string }>('SELECT event_type FROM events_log WHERE stream_id = $1 ORDER BY event_version', [id])).rows.map(
    (r) => r.event_type,
  );
}
