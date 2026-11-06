// The code SMS accessors, live — Story 13.1b (Task 2.6; AC1, AC4 (h), (j), (k), AC10). Two halves:
//   1. Per-test ROLLBACK: AC1 at the command level (one row in the approval's transaction, gone with a rollback; ⛔ `pending_kyc`), settle's
//      compare-and-set, the release gate, the statuses read.
//   2. OWN-COMMITTING: the claim, the lapse and the backoff. ⚠ This package runs spec files in parallel forks, and `read.spec.ts` and
//      `stream-concurrency.spec.ts` hold committed `due` rows of their own, so a claim here can take a foreign row. Every row of this half is
//      seeded by raw INSERT with an old `updated_at` and `created_at`, so it sorts first and the assertions name its ids; a foreign row a
//      claim takes is handed back. Raw INSERT, because the guard refuses `due → due`: a released row's shape cannot be made by UPDATE.
// ⛔ `FOR UPDATE` by a sweep-shaped overlap in the first half: `claim` needs a second connection (the SKIP LOCKED leg, second half).

import { randomUUID } from 'node:crypto';

import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { setPariwarScope } from '../../../src/db.js';
import {
  claimNextFieldWorkerCodeSms,
  enqueueFieldWorkerCodeSms,
  FIELD_WORKER_CODE_SMS_LEASE_MS,
  FIELD_WORKER_CODE_SMS_MAX_AGE_MS,
  getFieldWorkerCodeSmsStatuses,
  lapseFieldWorkerCodeSms,
  releaseFieldWorkerCodeSms,
  settleFieldWorkerCodeSms,
} from '../../../src/field-worker/code-sms.js';
import { activateFieldWorker, recordFieldWorkerKycCompleted } from '../../../src/field-worker/commands.js';
import { getFieldWorkerForCodeSms } from '../../../src/field-worker/read.js';
import { fieldWorkerId as toFieldWorkerId, pariwarId as toPariwarId } from '../../../src/ids/index.js';
import { DATABASE_URL, getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { seedFieldWorker } from '../attribution-code/_fixtures.js';
import { PARIWAR_A, PARIWAR_B, enterAppScope } from '../_helpers.js';
import { approval, registerReal } from './_fixtures.js';

const TABLE = 'field_worker_code_sms_sends';
const ACTOR = randomUUID();

describe.skipIf(!hasDatabase)('the code SMS accessors (per-test ROLLBACK)', { timeout: 20000 }, () => {
  setupLiveDb();

  async function approved(client: ReturnType<typeof getTx>['client'], pariwarId: string) {
    const P = toPariwarId(pariwarId);
    await setPariwarScope(client, P);
    const id = await registerReal(client, pariwarId, { actorId: ACTOR });
    const base = { pariwarId: P, fieldWorkerId: id, actor: 'operator' as const, actorId: ACTOR, ...approval(pariwarId, 'Patna', ACTOR) };
    await recordFieldWorkerKycCompleted(client, { ...base, auditId: randomUUID() });
    const auditId = randomUUID();
    await activateFieldWorker(client, { ...base, auditId });
    return { id, auditId };
  }

  it('⭐ AC1 — the activation command writes ONE `due` row: attempt 0, naming the activated audit line', async () => {
    const { client } = getTx();
    const { id, auditId } = await approved(client, PARIWAR_A);
    const { rows } = await client.query(`SELECT * FROM ${TABLE} WHERE field_worker_id = $1`, [id]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      pariwar_id: PARIWAR_A,
      outcome: 'due',
      attempt_count: 0,
      activated_audit_id: auditId,
      detail: null,
      provider_message_id: null,
      claim_token: null,
      locale: null,
    });
  });

  it('⭐ AC1 (a) — an approval that rolls back leaves NO row: the row is in the event’s transaction', async () => {
    const { client } = getTx();
    await client.query('SAVEPOINT approval');
    const { id } = await approved(client, PARIWAR_A);
    expect((await client.query(`SELECT 1 FROM ${TABLE} WHERE field_worker_id = $1`, [id])).rows).toHaveLength(1);
    await client.query('ROLLBACK TO SAVEPOINT approval');
    expect((await client.query(`SELECT 1 FROM ${TABLE} WHERE field_worker_id = $1`, [id])).rows).toHaveLength(0);
  });

  it('AC1 (d) — a `pending_kyc` worker has no row, a KYC-only worker neither', async () => {
    const { client } = getTx();
    const P = toPariwarId(PARIWAR_A);
    await setPariwarScope(client, P);
    const id = await registerReal(client, PARIWAR_A, { actorId: ACTOR });
    expect((await client.query(`SELECT 1 FROM ${TABLE} WHERE field_worker_id = $1`, [id])).rows).toHaveLength(0);
    await recordFieldWorkerKycCompleted(client, { pariwarId: P, fieldWorkerId: id, auditId: randomUUID(), actor: 'operator', actorId: ACTOR, ...approval(PARIWAR_A, 'Patna', ACTOR) });
    expect((await client.query(`SELECT 1 FROM ${TABLE} WHERE field_worker_id = $1`, [id])).rows).toHaveLength(0);
  });

  it('a second row for one worker fails loudly: ⛔ `ON CONFLICT` (AD1)', async () => {
    const { client } = getTx();
    const { id } = await approved(client, PARIWAR_A);
    await client.query('SAVEPOINT twice');
    await expect(enqueueFieldWorkerCodeSms(client, { pariwarId: PARIWAR_A, fieldWorkerId: id, activatedAuditId: randomUUID() })).rejects.toMatchObject({
      code: '23505',
    });
    await client.query('ROLLBACK TO SAVEPOINT twice');
  });

  it('`getFieldWorkerForCodeSms` returns the state and the sealed mobile, ⛔ the name; another Pariwar’s worker is null', async () => {
    const { client, tx } = getTx();
    const id = await seedFieldWorker(client, PARIWAR_A);
    const read = await getFieldWorkerForCodeSms(tx, toPariwarId(PARIWAR_A), toFieldWorkerId(id));
    expect(read).toEqual({ currentState: 'pending_kyc', mobileCiphertext: 'enc:v1:seed-mobile' });
    expect(await getFieldWorkerForCodeSms(tx, toPariwarId(PARIWAR_B), toFieldWorkerId(id))).toBeNull();
    expect(await getFieldWorkerForCodeSms(tx, toPariwarId(PARIWAR_A), toFieldWorkerId(randomUUID()))).toBeNull();
  });

  async function seedRow(client: ReturnType<typeof getTx>['client'], pariwarId: string, over: Record<string, unknown> = {}) {
    const fieldWorkerId = await seedFieldWorker(client, pariwarId);
    const sendId = randomUUID();
    const v: Record<string, unknown> = { send_id: sendId, pariwar_id: pariwarId, field_worker_id: fieldWorkerId, activated_audit_id: randomUUID(), ...over };
    const cols = Object.keys(v);
    await client.query(`INSERT INTO ${TABLE} (${cols.join(', ')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')})`, Object.values(v));
    return { sendId, fieldWorkerId };
  }

  it('settle: compare-and-set on the claim token; the wrong token and a moved row are `false`; `detail` is always written', async () => {
    const { client } = getTx();
    const { sendId } = await seedRow(client, PARIWAR_A, { outcome: 'attempting', claim_token: 'mine', detail: 'api_unavailable:kms' });
    const key = { pariwarId: PARIWAR_A, sendId };
    expect(await settleFieldWorkerCodeSms(client, { ...key, claimToken: 'theirs', outcome: 'error', detail: 'no_code' })).toBe(false);
    expect(await settleFieldWorkerCodeSms(client, { ...key, claimToken: 'mine', outcome: 'accepted', detail: null, providerMessageId: 'abc', locale: 'hi' })).toBe(true);
    const { rows } = await client.query(`SELECT outcome, detail, provider_message_id, locale FROM ${TABLE} WHERE send_id = $1`, [sendId]);
    expect(rows[0]).toEqual({ outcome: 'accepted', detail: null, provider_message_id: 'abc', locale: 'hi' });
    expect(await settleFieldWorkerCodeSms(client, { ...key, claimToken: 'mine', outcome: 'error', detail: 'no_code' })).toBe(false);
  });

  it('settle refuses, before any statement: a detail outside the grammar, and `accepted` with no request id', async () => {
    const { client } = getTx();
    const { sendId } = await seedRow(client, PARIWAR_A, { outcome: 'attempting', claim_token: 'mine' });
    const key = { pariwarId: PARIWAR_A, sendId, claimToken: 'mine' };
    await expect(settleFieldWorkerCodeSms(client, { ...key, outcome: 'error', detail: 'unknown:123456' })).rejects.toThrow(/outside the grammar/);
    await expect(settleFieldWorkerCodeSms(client, { ...key, outcome: 'accepted', detail: null })).rejects.toThrow(/request id/);
    expect((await client.query(`SELECT outcome FROM ${TABLE} WHERE send_id = $1`, [sendId])).rows[0]).toEqual({ outcome: 'attempting' });
  });

  it('⭐ release: only a detail that proves the gateway was not reached; the wrong token is `false`', async () => {
    const { client } = getTx();
    const { sendId } = await seedRow(client, PARIWAR_A, { outcome: 'attempting', claim_token: 'mine' });
    const key = { pariwarId: PARIWAR_A, sendId };
    for (const detail of ['exhausted:outcome_unknown', 'unknown:http_500', 'auth:http_401', 'no_code']) {
      await expect(releaseFieldWorkerCodeSms(client, { ...key, claimToken: 'mine', detail })).rejects.toThrow(/does not prove/);
    }
    expect(await releaseFieldWorkerCodeSms(client, { ...key, claimToken: 'theirs', detail: 'api_unavailable:kms' })).toBe(false);
    for (const detail of ['rate_limited:http_429', 'config_unavailable:secret_manager', 'api_unavailable:kms', 'api_unavailable:audit', 'api_unavailable:db']) {
      await client.query('SAVEPOINT release');
      expect(await releaseFieldWorkerCodeSms(client, { ...key, claimToken: 'mine', detail })).toBe(true);
      expect((await client.query(`SELECT outcome, detail FROM ${TABLE} WHERE send_id = $1`, [sendId])).rows[0]).toEqual({ outcome: 'due', detail });
      await client.query('ROLLBACK TO SAVEPOINT release');
    }
  });

  it('⭐ AC10 — the statuses read: one statement keyed on the page, the report joined, another Pariwar’s row invisible, ⛔ detail', async () => {
    const { client } = getTx();
    const due = await seedRow(client, PARIWAR_A);
    const accepted = await seedRow(client, PARIWAR_A, { outcome: 'accepted', provider_message_id: 'req1' });
    const delivered = await seedRow(client, PARIWAR_A, { outcome: 'accepted', provider_message_id: 'req2' });
    const failed = await seedRow(client, PARIWAR_A, { outcome: 'accepted', provider_message_id: 'req3' });
    const unknown = await seedRow(client, PARIWAR_A, { outcome: 'error', detail: 'exhausted:outcome_unknown:api_unavailable:timeout' });
    const refused = await seedRow(client, PARIWAR_A, { outcome: 'error', detail: 'config:dlt_template_id_missing' });
    const other = await seedRow(client, PARIWAR_B, { outcome: 'accepted', provider_message_id: 'req4' });
    const none = await seedFieldWorker(client, PARIWAR_A);
    for (const [row, state, request] of [[delivered, 'delivered', 'req2'], [failed, 'undelivered', 'req3']] as const) {
      await client.query(
        `INSERT INTO sms_send_deliveries (send_kind, send_row_id, pariwar_id, request_id, delivery_state, status_code, first_reported_at, reported_at)
         VALUES ('fw', $1, $2, $3, $4, '1', now(), now())`,
        [row.sendId, PARIWAR_A, request, state],
      );
    }
    await enterAppScope(client, PARIWAR_A);
    const ids = [due, accepted, delivered, failed, unknown, refused, other].map((r) => r.fieldWorkerId);
    const map = await getFieldWorkerCodeSmsStatuses(client, PARIWAR_A, [...ids, none]);
    expect(Object.fromEntries(map)).toEqual({
      [due.fieldWorkerId]: 'sending',
      [accepted.fieldWorkerId]: 'sent',
      [delivered.fieldWorkerId]: 'delivered',
      [failed.fieldWorkerId]: 'not_delivered',
      [unknown.fieldWorkerId]: 'not_confirmed',
      [refused.fieldWorkerId]: 'not_delivered',
    });
    // Under an RLS-free handle the explicit predicate holds on its own.
    await client.query('RESET ROLE');
    expect((await getFieldWorkerCodeSmsStatuses(client, PARIWAR_A, [other.fieldWorkerId])).size).toBe(0);
  });

  it('empty input answers without SQL', async () => {
    const q = { query: () => Promise.reject(new Error('no statement may run')) };
    expect((await getFieldWorkerCodeSmsStatuses(q, PARIWAR_A, [])).size).toBe(0);
  });
});

describe.skipIf(!hasDatabase)('the claim, the backoff and the lapse (own-committing)', { timeout: 30000 }, () => {
  const PARIWAR = randomUUID();
  let pool: pg.Pool;
  const workers: string[] = [];
  const mine = new Set<string>();

  beforeAll(() => {
    pool = new pg.Pool({ connectionString: DATABASE_URL, max: 4, ssl: false });
    pool.on('error', (err) => console.error('[code-sms.spec pool]', err.message));
  });

  afterAll(async () => {
    if (!pool) return;
    const admin = await pool.connect();
    try {
      await admin.query('BEGIN');
      await admin.query("SET LOCAL session_replication_role = 'replica'");
      await admin.query(`DELETE FROM ${TABLE} WHERE pariwar_id = $1`, [PARIWAR]);
      await admin.query('DELETE FROM field_workers WHERE pariwar_id = $1', [PARIWAR]);
      await admin.query('COMMIT');
    } catch (e) {
      await admin.query('ROLLBACK').catch(() => undefined);
      console.error('[code-sms.spec] cleanup:', (e as Error).message);
    } finally {
      admin.release();
      await pool.end();
    }
  });

  /** A committed row aged by raw INSERT. The clocks are minutes ago. Sorted FAR behind every foreign row's `updated_at`, by `ageDays`. */
  async function seedRow(o: { updatedAgoMs: number; createdAgoMs?: number; attemptCount?: number; outcome?: string; claimToken?: string | null }): Promise<string> {
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      const worker = await seedFieldWorker(c as pg.PoolClient, PARIWAR);
      await c.query('COMMIT');
      workers.push(worker);
      const sendId = randomUUID();
      await c.query(
        `INSERT INTO ${TABLE} (send_id, pariwar_id, field_worker_id, activated_audit_id, outcome, claim_token, attempt_count, updated_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7,
                 clock_timestamp() - ($8::bigint * interval '1 millisecond'),
                 clock_timestamp() - ($9::bigint * interval '1 millisecond'))`,
        [sendId, PARIWAR, worker, randomUUID(), o.outcome ?? 'due', o.claimToken ?? null, o.attemptCount ?? 0, o.updatedAgoMs, o.createdAgoMs ?? o.updatedAgoMs],
      );
      mine.add(sendId);
      return sendId;
    } finally {
      c.release();
    }
  }

  /** Claim until a row of THIS spec comes back (or none): a foreign row taken from a sibling fork is returned to `due`. */
  async function claimMine(): Promise<{ sendId: string; attemptCount: number } | null> {
    for (;;) {
      const token = randomUUID();
      const row = await claimNextFieldWorkerCodeSms(pool, { claimToken: token });
      if (row === null) return null;
      if (mine.has(row.sendId)) return row;
      await releaseFieldWorkerCodeSms(pool, { pariwarId: row.pariwarId, sendId: row.sendId, claimToken: token, detail: 'api_unavailable:db' });
    }
  }

  const outcomeOf = async (sendId: string) =>
    (await pool.query<{ outcome: string; detail: string | null; attempt_count: number }>(`SELECT outcome, detail, attempt_count FROM ${TABLE} WHERE send_id = $1`, [sendId])).rows[0];

  /** End a row of this spec so a later test's claim does not find it. */
  async function finish(sendId: string): Promise<void> {
    await pool.query(`UPDATE ${TABLE} SET outcome = 'error', detail = 'no_code' WHERE send_id = $1 AND outcome IN ('due', 'attempting')`, [sendId]);
  }

  it('⭐ the claim: one row, `attempting`, a new token, attempt + 1, and `updated_at` moves (the lease starts here)', async () => {
    const sendId = await seedRow({ updatedAgoMs: 3_000_000_000 });
    const before = (await pool.query<{ updated_at: Date }>(`SELECT updated_at FROM ${TABLE} WHERE send_id = $1`, [sendId])).rows[0]!;
    const claimed = await claimMine();
    expect(claimed).toMatchObject({ sendId, pariwarId: PARIWAR, attemptCount: 1 });
    const row = (await pool.query(`SELECT outcome, claim_token, attempt_count, updated_at FROM ${TABLE} WHERE send_id = $1`, [sendId])).rows[0];
    expect(row).toMatchObject({ outcome: 'attempting', attempt_count: 1 });
    expect(row.claim_token).toEqual(expect.any(String));
    expect(row.updated_at.getTime()).toBeGreaterThan(before.updated_at.getTime());
    await finish(sendId);
  });

  it('⭐ AC4 (a) at the row — SKIP LOCKED: a row locked by another transaction is passed over, and a second claim never takes a held row', async () => {
    const locked = await seedRow({ updatedAgoMs: 3_100_000_000 });
    const next = await seedRow({ updatedAgoMs: 3_000_000_000 });
    const holder = await pool.connect();
    try {
      await holder.query('BEGIN');
      await holder.query(`SELECT 1 FROM ${TABLE} WHERE send_id = $1 FOR UPDATE`, [locked]);
      const claimed = await claimMine();
      expect(claimed?.sendId).toBe(next);
      await holder.query('ROLLBACK');
    } finally {
      holder.release();
    }
    expect((await claimMine())?.sendId).toBe(locked);
    expect(await claimMine()).toBeNull();
    await finish(locked);
    await finish(next);
  });

  it('⭐ AC4 (h) — the claim returns at most one row: N due rows take N claims', async () => {
    const a = await seedRow({ updatedAgoMs: 3_000_000_000 });
    const b = await seedRow({ updatedAgoMs: 2_900_000_000 });
    const first = await claimMine();
    expect(first?.sendId).toBe(a);
    expect((await outcomeOf(b))?.outcome).toBe('due');
    const second = await claimMine();
    expect(second?.sendId).toBe(b);
    await finish(a);
    await finish(b);
  });

  it.each([
    ['attempt 1, 50 s after the release: not yet', 1, 50_000, false],
    ['attempt 1, 70 s after the release: claimable', 1, 70_000, true],
    ['attempt 9, 255 min after the release: not yet', 9, 255 * 60_000, false],
    ['attempt 9, 257 min after the release: claimable', 9, 257 * 60_000, true],
    ['attempt 0: claimable at once', 0, 0, true],
  ] as const)('⭐ AC4 (k) the backoff — %s', async (_label, attemptCount, agoMs, claimable) => {
    const sendId = await seedRow({ updatedAgoMs: agoMs, createdAgoMs: 60_000, attemptCount });
    const claimed = await claimMine();
    if (claimable) expect(claimed?.sendId).toBe(sendId);
    else expect(claimed).toBeNull();
    await finish(sendId);
  });

  it('⭐ AC4 (j) — a row that always releases does not hold up a younger row: behind K such rows the younger is delayed K claims at most', async () => {
    const K = 3;
    const released: string[] = [];
    for (let i = 0; i < K; i += 1) released.push(await seedRow({ updatedAgoMs: 3_000_000_000 - i * 1000, attemptCount: 1 }));
    const younger = await seedRow({ updatedAgoMs: 2_000_000_000 });
    let claims = 0;
    for (;;) {
      const token = randomUUID();
      const row = await claimNextFieldWorkerCodeSms(pool, { claimToken: token });
      expect(row).not.toBeNull();
      if (!mine.has(row!.sendId)) {
        await releaseFieldWorkerCodeSms(pool, { pariwarId: row!.pariwarId, sendId: row!.sendId, claimToken: token, detail: 'api_unavailable:db' });
        continue;
      }
      claims += 1;
      if (row!.sendId === younger) break;
      await releaseFieldWorkerCodeSms(pool, { pariwarId: PARIWAR, sendId: row!.sendId, claimToken: token, detail: 'api_unavailable:kms' });
      expect(claims).toBeLessThanOrEqual(K);
    }
    expect(claims).toBe(K + 1);
    // Each released row went to the back and started its backoff: nothing is claimable now.
    expect(await claimMine()).toBeNull();
    await finish(younger);
    for (const id of released) await finish(id);
  });

  // Review finding CB14 (TR11, AD3 "a release sets updated_at, so a released row goes behind every waiting row"). In every leg above each seeded row
  // has `created_at` equal to `updated_at`, and in (j) the released rows are still inside their backoff, so `ORDER BY created_at, send_id` passed
  // them all. Here the released row is OLDEST by `created_at` and NEWEST by `updated_at`, with its one-minute backoff long past, so it is eligible:
  // only the real key puts the waiting row first. ⚠ WRITTEN, NOT RUN: no database was available to the review that added it.
  it('⭐ TR11 — a released row whose backoff has passed goes BEHIND an older-updated waiting row, whatever its `created_at` says', async () => {
    const waiting = await seedRow({ updatedAgoMs: 3_000_000_000 }); // never claimed: created = updated
    const released = await seedRow({ updatedAgoMs: 2_900_000_000, createdAgoMs: 3_100_000_000, attemptCount: 1 });
    try {
      expect((await claimMine())?.sendId, 'the waiting row first: its `updated_at` is the older').toBe(waiting);
      expect((await claimMine())?.sendId, 'then the released row, which is eligible').toBe(released);
      expect(await claimMine()).toBeNull();
    } finally {
      // Review finding CB42: in a `finally`, so a failed `expect` does not leave two `due` rows, the OLDEST in the table and in `mine`, for every
      // later test's `claimMine()` to return.
      await finish(waiting);
      await finish(released);
    }
  });

  // The tie-break: two rows with the SAME `updated_at` are claimed in `send_id` order. `session_replication_role = 'replica'` (as this file's
  // cleanup uses) lets the owner pool copy one timestamp onto the other without tripping the guard trigger.
  // ⚠ Review finding CB42 - WHAT THIS LEG CAN AND CANNOT DETECT: the partial index on `(updated_at, send_id)` may hand tied rows back in
  // `send_id` order even if the ORDER BY loses `send_id`, and otherwise the heap order (a, then b) is compared with a random UUID order, so the
  // leg catches that mutation in about half of the runs at best. The DETERMINISTIC pin is the source pin in
  // `tests/field-worker/code-sms.test.ts` ("the statement orders by updated_at then send_id"); this leg shows only that a tie is claimed in
  // `send_id` order against a real database. WRITTEN, NOT RUN.
  it('⭐ TR11 — equal `updated_at` falls back to `send_id`', async () => {
    const a = await seedRow({ updatedAgoMs: 3_200_000_000 });
    const b = await seedRow({ updatedAgoMs: 3_200_000_000 });
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      await c.query("SET LOCAL session_replication_role = 'replica'");
      await c.query(`UPDATE ${TABLE} SET updated_at = (SELECT updated_at FROM ${TABLE} WHERE send_id = $1) WHERE send_id = $2`, [a, b]);
      await c.query('COMMIT');
    } catch (e) {
      await c.query('ROLLBACK').catch(() => undefined);
      throw e;
    } finally {
      c.release();
    }
    const [first, second] = [a, b].sort();
    try {
      expect((await claimMine())?.sendId).toBe(first);
      expect((await claimMine())?.sendId).toBe(second);
    } finally {
      await finish(a);
      await finish(b);
    }
  });

  it('⭐ AC4 (b) the lapse: `attempting` past the lease ends `exhausted:outcome_unknown`; inside it is left alone', async () => {
    const stale = await seedRow({ updatedAgoMs: FIELD_WORKER_CODE_SMS_LEASE_MS + 5_000, outcome: 'attempting', claimToken: 't' });
    const fresh = await seedRow({ updatedAgoMs: FIELD_WORKER_CODE_SMS_LEASE_MS - 60_000, outcome: 'attempting', claimToken: 't' });
    const lapsed = await lapseFieldWorkerCodeSms(pool);
    expect(lapsed).toContainEqual({ sendId: stale, pariwarId: PARIWAR, detail: 'exhausted:outcome_unknown' });
    expect(lapsed.map((r) => r.sendId)).not.toContain(fresh);
    expect(await outcomeOf(stale)).toMatchObject({ outcome: 'error', detail: 'exhausted:outcome_unknown' });
    expect((await outcomeOf(fresh))?.outcome).toBe('attempting');
    await finish(fresh);
  });

  it('⭐ AC4 (f), (k) two clocks: `due` expires on `created_at`, whatever `updated_at` says, and a released row’s `updated_at` does not save it', async () => {
    const old = await seedRow({ updatedAgoMs: 1000, createdAgoMs: FIELD_WORKER_CODE_SMS_MAX_AGE_MS + 5_000, attemptCount: 3 });
    const young = await seedRow({ updatedAgoMs: FIELD_WORKER_CODE_SMS_MAX_AGE_MS + 5_000, createdAgoMs: FIELD_WORKER_CODE_SMS_MAX_AGE_MS - 60_000, attemptCount: 3 });
    const lapsed = await lapseFieldWorkerCodeSms(pool);
    expect(lapsed).toContainEqual({ sendId: old, pariwarId: PARIWAR, detail: 'exhausted:expired' });
    expect(lapsed.map((r) => r.sendId)).not.toContain(young);
    expect(await outcomeOf(old)).toMatchObject({ outcome: 'error', detail: 'exhausted:expired', attempt_count: 3 });
    expect((await outcomeOf(young))?.outcome).toBe('due');
    await finish(young);
  });

  it('a lapse does not cross a held row’s lease by `created_at`: an old `attempting` row with a fresh `updated_at` stays', async () => {
    const held = await seedRow({ updatedAgoMs: 1000, createdAgoMs: FIELD_WORKER_CODE_SMS_MAX_AGE_MS + 60_000, outcome: 'attempting', claimToken: 't' });
    expect((await lapseFieldWorkerCodeSms(pool)).map((r) => r.sendId)).not.toContain(held);
    await finish(held);
  });
});
