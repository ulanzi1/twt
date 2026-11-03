// Shared fixtures for the attribution-code live-DB specs (Story 13.2, Task 6.1). Every seed runs as the OWNER role inside the
// spec's rolled-back tx (setupLiveDb), BEFORE `enterAppScope` — ⛔ committed row.

import { randomUUID } from 'node:crypto';

import type pg from 'pg';
import { expect } from 'vitest';

import type { Db } from '../../../src/db.js';
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
 * Seed a code row as the owner. With `allocatedAt` (a `timestamptz` LITERAL — ⛔ a JS Date, which keeps milliseconds only, TR10)
 * the row is written under `session_replication_role = 'replica'` so the stamp trigger does not overwrite it (TR11), then the
 * role is switched back to `'origin'`. Returns the field worker id.
 */
export async function seedCode(
  client: pg.PoolClient,
  pariwarId: string,
  code: string,
  opts: { fieldWorkerId?: string; allocatedAt?: string } = {},
): Promise<string> {
  const fieldWorkerId = opts.fieldWorkerId ?? randomUUID();
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
