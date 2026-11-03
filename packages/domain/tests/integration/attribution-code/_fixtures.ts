// Shared fixtures for the attribution-code live-DB specs (Story 13.2, Task 6.1). Every seed runs as the OWNER role inside the
// spec's rolled-back tx (setupLiveDb), BEFORE `enterAppScope` — ⛔ committed row.

import { randomUUID } from 'node:crypto';

import type pg from 'pg';
import { expect } from 'vitest';

import type { Db } from '../../../src/db.js';
import { fieldWorkerId as toFieldWorkerId, type FieldWorkerId } from '../../../src/ids/index.js';
import { seedMember } from '../_helpers.js';

/** Run `text` and expect it refused with SQLSTATE `code` (and, when given, by the named constraint) — the tx stays usable. */
export async function expectSqlRejected(
  client: pg.PoolClient,
  text: string,
  params: unknown[],
  code: string,
  constraint?: string,
): Promise<void> {
  await client.query('SAVEPOINT expect_rejected');
  let caught: { code?: string; constraint?: string } | null = null;
  try {
    await client.query(text, params);
  } catch (e) {
    caught = e as { code?: string; constraint?: string };
  }
  await client.query('ROLLBACK TO SAVEPOINT expect_rejected');
  await client.query('RELEASE SAVEPOINT expect_rejected');
  expect(caught, `expected ${code} from: ${text}`).not.toBeNull();
  expect(caught!.code).toBe(code);
  if (constraint !== undefined) expect(caught!.constraint).toBe(constraint);
}

/** ⛔ allocator savepoint is left on the caller's tx (review R6): RELEASE of the name finds none ⇒ 3B001. */
export async function expectNoAllocatorSavepoint(client: pg.PoolClient): Promise<void> {
  await expectSqlRejected(client, 'RELEASE SAVEPOINT allocate_attribution_code', [], '3B001');
}

/** Await `fn` expecting a rejection; returns the error. The domain functions leave the caller's tx usable on a pure / guard error. */
export async function caught(fn: () => Promise<unknown>): Promise<unknown> {
  try {
    await fn();
  } catch (e) {
    return e;
  }
  throw new Error('expected a rejection');
}

/**
 * ⭐ Story 13.1 (Task 10 (1)) — seed a REAL `field_workers` row: the composite FK `field_worker_attribution_codes_worker_fk`
 * (migration 0200) refuses a code whose holder does not exist in the SAME Pariwar, so a made-up worker id no longer works
 * (TR6). An OWNER-role INSERT under `app.field_worker_state_writer = 'on'` in the genesis shape (`pending_kyc`, `pending`,
 * version 1, no reason, no `ended_on`, a non-blank district) — ⛔ the projector (a projector call appends to `events_log`,
 * which a committing spec cannot clean without replica mode). ROLE-AWARE: called after `enterAppScope`, it steps out of
 * `twt_app` for the INSERT and back in, so the caller's role and `app.pariwar_id` are unchanged. Every call writes a FRESH
 * `mobile_blind_index` (a constant collides on the partial unique `field_workers_pariwar_mobile_live_uq`). The writer var is
 * set back to `'off'` afterwards. Lives under `tests/` — ⛔ `src/test-utils/`, which the state-invariant gate scans.
 * Returns the worker id.
 */
export async function seedFieldWorker(
  client: pg.PoolClient,
  pariwarId: string,
  opts: { fieldWorkerId?: string; district?: string } = {},
): Promise<FieldWorkerId> {
  const fieldWorkerId = opts.fieldWorkerId ?? randomUUID();
  const { rows } = await client.query<{ u: string }>('SELECT current_user AS u');
  const asApp = rows[0]!.u === 'twt_app';
  if (asApp) await client.query('RESET ROLE');
  await client.query("SET LOCAL app.field_worker_state_writer = 'on'");
  await client.query(
    `INSERT INTO field_workers (field_worker_id, pariwar_id, name_ciphertext, mobile_ciphertext, mobile_blind_index,
                                registered_by_user_id, registered_by_display, current_state, state_event_version, kyc_status,
                                district, audit_id)
       VALUES ($1, $2, 'enc:v1:seed-name', 'enc:v1:seed-mobile', $3, $4, 'Seed Admin', 'pending_kyc', 1, 'pending', $5, $6)`,
    [fieldWorkerId, pariwarId, `seed-${randomUUID()}`, randomUUID(), opts.district ?? 'Patna', randomUUID()],
  );
  await client.query("SET LOCAL app.field_worker_state_writer = 'off'");
  if (asApp) await client.query('SET LOCAL ROLE twt_app');
  return toFieldWorkerId(fieldWorkerId);
}

/**
 * Seed a code row as the owner. With `allocatedAt` (a `timestamptz` LITERAL — ⛔ a JS Date, which keeps milliseconds only, TR10)
 * the row is written under `session_replication_role = 'replica'` so the stamp trigger does not overwrite it (TR11), then the
 * role is switched back to `'origin'`. Returns the field worker id — a REAL `field_workers` row (`seedFieldWorker`) unless the
 * caller passes one it seeded itself.
 */
export async function seedCode(
  client: pg.PoolClient,
  pariwarId: string,
  code: string,
  opts: { fieldWorkerId?: string; allocatedAt?: string } = {},
): Promise<string> {
  // ⭐ Story 13.1: ALWAYS a real holder — the `replica` arm below disables the new FK's RI trigger too, so a made-up id
  // would keep passing there (Task 10 (1)). Seeded under `origin`, BEFORE any replica switch.
  const fieldWorkerId = opts.fieldWorkerId ?? (await seedFieldWorker(client, pariwarId));
  if (opts.allocatedAt === undefined) {
    await client.query(
      `INSERT INTO field_worker_attribution_codes (pariwar_id, field_worker_id, code, allocation_attempts) VALUES ($1, $2, $3, 1)`,
      [pariwarId, fieldWorkerId, code],
    );
    return fieldWorkerId;
  }
  await client.query("SET LOCAL session_replication_role = 'replica'");
  await client.query(
    `INSERT INTO field_worker_attribution_codes (pariwar_id, field_worker_id, code, allocation_attempts, allocated_at)
       VALUES ($1, $2, $3, 1, $4::timestamptz)`,
    [pariwarId, fieldWorkerId, code, opts.allocatedAt],
  );
  await client.query("SET LOCAL session_replication_role = 'origin'");
  return fieldWorkerId;
}

/**
 * Seed one member and ONE `member_attribution` capture of `code` (`UNIQUE (member_id)` ⇒ a member per capture). `capturedAt` is a
 * `timestamptz` LITERAL or SQL expression text (default `clock_timestamp()` — ⛔ the column's `now()` default, which is the tx
 * START and so predates every allocation in the same test, TR10). Returns the capture id.
 */
export async function seedCapture(
  tx: Db,
  client: pg.PoolClient,
  pariwarId: string,
  code: string,
  capturedAt?: string,
): Promise<string> {
  const memberId = await seedMember(tx, pariwarId);
  const { rows } = await client.query<{ attribution_id: string }>(
    capturedAt === undefined
      ? `INSERT INTO member_attribution (member_id, pariwar_id, attribution_source, captured_at)
           VALUES ($1, $2, $3, clock_timestamp()) RETURNING attribution_id`
      : `INSERT INTO member_attribution (member_id, pariwar_id, attribution_source, captured_at)
           VALUES ($1, $2, $3, $4::timestamptz) RETURNING attribution_id`,
    capturedAt === undefined ? [memberId, pariwarId, code] : [memberId, pariwarId, code, capturedAt],
  );
  return rows[0]!.attribution_id;
}

/** A generator that returns `codes` in order, then repeats the last; counts its draws. */
export function scripted(...codes: string[]): { generate: () => string; draws: () => number } {
  let n = 0;
  return {
    generate: () => codes[Math.min(n++, codes.length - 1)]!,
    draws: () => n,
  };
}
