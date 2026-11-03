// The composite FK onto Story 13.2's registry, and the deletion legs by role — Story 13.1 (AC7; C1, I10, TR14). Per-test
// ROLLBACK. ⛔ No leg runs under `session_replication_role = 'replica'` (replica disables the FK's RI trigger, so a
// replica leg would pass with a missing holder).

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppScope, lockTruncateSetNowait } from '../_helpers.js';
import { expectSqlRejected, seedFieldWorker } from './_fixtures.js';

const INSERT_CODE = `INSERT INTO field_worker_attribution_codes (pariwar_id, field_worker_id, code, allocation_attempts) VALUES ($1, $2, $3, 1)`;

describe.skipIf(!hasDatabase)('field_worker_attribution_codes_worker_fk (AC7)', () => {
  setupLiveDb();

  it('the catalog: the named composite FK → field_workers (pariwar_id, field_worker_id), ON DELETE NO ACTION (confdeltype a)', async () => {
    const { client } = getTx();
    const r = await client.query<{ def: string; confdeltype: string; target: string }>(
      `SELECT pg_get_constraintdef(oid) AS def, confdeltype, confrelid::regclass::text AS target FROM pg_constraint
        WHERE conname = 'field_worker_attribution_codes_worker_fk' AND conrelid = 'field_worker_attribution_codes'::regclass`,
    );
    expect(r.rows).toEqual([
      {
        def: 'FOREIGN KEY (pariwar_id, field_worker_id) REFERENCES field_workers(pariwar_id, field_worker_id)',
        confdeltype: 'a',
        target: 'field_workers',
      },
    ]);
  });

  it('a code for a worker that does not exist ⇒ 23503 by name — CONTROL: a real worker’s code is accepted', async () => {
    const { client } = getTx();
    await expectSqlRejected(client, INSERT_CODE, [PARIWAR_A, randomUUID(), '731101'], '23503', 'field_worker_attribution_codes_worker_fk');
    const w = await seedFieldWorker(client, PARIWAR_A);
    await client.query(INSERT_CODE, [PARIWAR_A, w, '731101']);
  });

  it('a code naming a worker of ANOTHER Pariwar ⇒ 23503 (the composite key, ⛔ a single-column FK that bypasses RLS)', async () => {
    const { client } = getTx();
    const inB = await seedFieldWorker(client, PARIWAR_B);
    await expectSqlRejected(client, INSERT_CODE, [PARIWAR_A, inB, '731102'], '23503', 'field_worker_attribution_codes_worker_fk');
  });

  it('as twt_app: DELETE and TRUNCATE of field_workers ⇒ 42501 (⛔ grant)', async () => {
    const { client } = getTx();
    const w = await seedFieldWorker(client, PARIWAR_A);
    await client.query(INSERT_CODE, [PARIWAR_A, w, '731103']);
    await enterAppScope(client, PARIWAR_A);
    await expectSqlRejected(client, 'DELETE FROM field_workers WHERE field_worker_id = $1', [w], '42501');
    await expectSqlRejected(client, 'TRUNCATE field_workers', [], '42501');
  });

  it('as the OWNER: a DELETE of a worker holding a code ⇒ P0001 from the BEFORE DELETE trigger (I10) — before the FK is asked', async () => {
    const { client } = getTx();
    const w = await seedFieldWorker(client, PARIWAR_A);
    await client.query(INSERT_CODE, [PARIWAR_A, w, '731104']);
    await expectSqlRejected(client, 'DELETE FROM field_workers WHERE field_worker_id = $1', [w], 'P0001');
  });

  it('as the OWNER: a plain TRUNCATE ⇒ 0A000 (referenced by a foreign key — checked before any trigger)', async () => {
    const { client } = getTx();
    await expectSqlRejected(client, 'TRUNCATE field_workers', [], '0A000');
  });

  it('as the OWNER: TRUNCATE … CASCADE ⇒ P0001 from THIS table’s BEFORE TRUNCATE trigger — the FK set locked FIRST (TR14)', async () => {
    const { client } = getTx();
    // ⚠ A CASCADE locks parent then child; 13.2's specs in parallel forks take the child then the parent through the FK
    // check — so lock the whole FK set up front, NOWAIT with retry (the helper issues its own SAVEPOINT).
    const locked = await lockTruncateSetNowait(client, 'field_workers');
    expect(locked).toEqual(expect.arrayContaining(['field_workers', 'field_worker_attribution_codes']));
    await client.query('SAVEPOINT cascade_leg');
    let caught: { code?: string; message?: string } | null = null;
    try {
      await client.query('TRUNCATE field_workers CASCADE');
    } catch (e) {
      caught = e as { code?: string; message?: string };
    }
    await client.query('ROLLBACK TO SAVEPOINT cascade_leg');
    expect(caught?.code).toBe('P0001');
    expect(caught?.message).toMatch(/^field_workers direct write rejected/);
  });
});
