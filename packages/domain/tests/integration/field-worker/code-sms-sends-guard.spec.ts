// The `field_worker_code_sms_sends_guard_update` trigger — Story 13.1b (Task 1.4; AC4 (g); AD8). Every allowed move lands, every refused
// move is refused, every finished outcome is frozen, and each identity column refuses a change on a LIVE row. It binds the superuser this
// spec runs as, which is the proof it binds "every role at default settings". ⭐ Each refused leg on a LIVE row has a landing sibling, because
// an assertion after a savepoint rollback proves nothing on its own ([[feedback_assertion_after_savepoint_rollback_is_vacuous]]): the control
// is the same row, the same statement shape, with a legal value. A FINISHED row has no legal update, so the frozen legs can have no sibling:
// each is proved by the refusal itself, its SQLSTATE and its own message (code review CB48). Live DB only; per-test ROLLBACK (setupLiveDb).

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { seedFieldWorker } from '../attribution-code/_fixtures.js';
import { PARIWAR_A } from '../_helpers.js';

type Client = ReturnType<typeof getTx>['client'];

const TABLE = 'field_worker_code_sms_sends';

/** A row in `outcome`, seeded by raw INSERT (the guard governs UPDATE only). */
async function seedRow(client: Client, outcome: string): Promise<string> {
  const worker = await seedFieldWorker(client, PARIWAR_A);
  const sendId = randomUUID();
  await client.query(
    `INSERT INTO ${TABLE} (send_id, pariwar_id, field_worker_id, activated_audit_id, outcome, claim_token, provider_message_id)
     VALUES ($1, $2, $3, $4, $5, 'token', $6)`,
    [sendId, PARIWAR_A, worker, randomUUID(), outcome, outcome === 'accepted' ? 'abc' : null],
  );
  return sendId;
}

async function refused(client: Client, sendId: string, set: string, message: RegExp): Promise<void> {
  await client.query('SAVEPOINT guard');
  await expect(client.query(`UPDATE ${TABLE} SET ${set} WHERE send_id = $1`, [sendId])).rejects.toMatchObject({ code: '23000', message: expect.stringMatching(message) });
  await client.query('ROLLBACK TO SAVEPOINT guard');
}

async function lands(client: Client, sendId: string, set: string): Promise<void> {
  await client.query('SAVEPOINT guard');
  expect((await client.query(`UPDATE ${TABLE} SET ${set} WHERE send_id = $1`, [sendId])).rowCount).toBe(1);
  await client.query('ROLLBACK TO SAVEPOINT guard');
}

const FINALS = ['accepted', 'rejected_invalid_number', 'rejected_unreachable', 'skipped_not_active', 'error'] as const;

describe.skipIf(!hasDatabase)('the send row guard trigger (AC4 (g))', { timeout: 20000 }, () => {
  setupLiveDb();

  it('the allowed moves land: due → attempting, due → error, attempting → due, attempting → every final', async () => {
    const { client } = getTx();
    const due = await seedRow(client, 'due');
    await lands(client, due, `outcome = 'attempting', claim_token = 'c'`);
    await lands(client, due, `outcome = 'error', detail = 'exhausted:expired'`);
    const held = await seedRow(client, 'attempting');
    await lands(client, held, `outcome = 'due', detail = 'api_unavailable:kms'`);
    for (const final of FINALS) {
      await lands(client, held, `outcome = '${final}', provider_message_id = 'abc'`);
    }
  });

  it('⭐ a due row moves ONLY to attempting or error: ⛔ due → due, ⛔ a final without a send', async () => {
    const { client } = getTx();
    const due = await seedRow(client, 'due');
    await refused(client, due, `updated_at = clock_timestamp()`, /a due row moves only/);
    for (const final of ['accepted', 'rejected_invalid_number', 'rejected_unreachable', 'skipped_not_active']) {
      await refused(client, due, `outcome = '${final}', provider_message_id = 'abc'`, /a due row moves only/);
    }
    await lands(client, due, `outcome = 'attempting', claim_token = 'c'`);
  });

  it('⭐ a held row is never re-claimed: ⛔ attempting → attempting', async () => {
    const { client } = getTx();
    const held = await seedRow(client, 'attempting');
    await refused(client, held, `claim_token = 'other'`, /a held row is never re-claimed/);
    await refused(client, held, `attempt_count = attempt_count + 1`, /a held row is never re-claimed/);
    await lands(client, held, `outcome = 'error', detail = 'exhausted:outcome_unknown'`);
  });

  it.each(FINALS)('⭐ %s is FROZEN: every update is refused, a metadata touch included', async (final) => {
    const { client } = getTx();
    const sendId = await seedRow(client, final);
    // Code review R4-7: the seed is checked BEFORE any savepoint, so this read can fail (CB48 removed the vacuous one after the refusals).
    const { rows } = await client.query<{ outcome: string }>(`SELECT outcome FROM ${TABLE} WHERE send_id = $1`, [sendId]);
    expect(rows[0]?.outcome).toBe(final);
    await refused(client, sendId, `updated_at = clock_timestamp()`, /a finished row/);
    await refused(client, sendId, `outcome = 'due'`, /a finished row/);
    await refused(client, sendId, `detail = 'no_code'`, /a finished row/);
    await refused(client, sendId, `attempt_count = 0`, /a finished row/);
    // ⛔ A read of the outcome HERE: it would run after every ROLLBACK TO SAVEPOINT and could not fail (CB48). The refusals are the proof.
  });

  const IDENTITY = [
    ['send_id', `send_id = gen_random_uuid()`],
    ['pariwar_id', `pariwar_id = gen_random_uuid()`],
    ['field_worker_id', `field_worker_id = gen_random_uuid()`],
    ['activated_audit_id', `activated_audit_id = gen_random_uuid()`],
    ['created_at', `created_at = clock_timestamp()`],
  ] as const;

  it.each(IDENTITY)('⭐ the identity column %s is refused on a LIVE row, due and attempting, even on a legal move', async (_name, set) => {
    const { client } = getTx();
    const due = await seedRow(client, 'due');
    const held = await seedRow(client, 'attempting');
    await refused(client, due, `outcome = 'attempting', claim_token = 'c', ${set}`, /an identity column/);
    await refused(client, held, `outcome = 'error', detail = 'no_code', ${set}`, /an identity column/);
    await lands(client, due, `outcome = 'attempting', claim_token = 'c'`);
    await lands(client, held, `outcome = 'error', detail = 'no_code'`);
  });
});
