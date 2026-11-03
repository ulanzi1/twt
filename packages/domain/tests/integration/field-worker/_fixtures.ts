// Shared fixtures for the field-worker live-DB specs (Story 13.1, Task 11). Raw INSERTs set the writer guard so the 0200
// trigger steps aside; ⛔ a projector call (which would append to `events_log`). Lives under `tests/` — ⛔ `src/test-utils/`,
// which the state-invariant gate scans.

import { randomUUID } from 'node:crypto';

import type pg from 'pg';

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
