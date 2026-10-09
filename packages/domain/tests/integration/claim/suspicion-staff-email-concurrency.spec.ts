// Story 6.25 — the STAFF EMAIL's claiming transaction under TRUE two-connection races (own-committing). Task 3.4; AC4 (i), (iv);
// `2026-10-09-299` RE2, RE4, RE11. The 6.24b concurrency spec's harness (`suspicion-notice-concurrency.spec.ts`).
//
//   · N children of ONE (claim, recipient) at once — the claim-row `FOR UPDATE` serialises them: exactly ONE row, ONE `begun`,
//     the N−1 others `held_by_other` (the winner's row is within the lease) — ⛔ a second row, ⛔ a second claim;
//   · two children of the claim-level NULL pair at once (RE4) — ONE `no_target` row, the other `already_final` (⛔ a second alarm);
//   · the give-up (⛔ claim-row lock) finishing a row WHILE a child's claiming transaction re-claims it: the child's UPDATE waits on
//     the row, re-reads it `error` and reports `already_final` — ⛔ an outcome it did ⛔ write;
//   · ⭐ round 3 — a live holder's transient note committing WHILE another job takes over its stale-looking row: the taker's
//     re-claim UPDATE waits on the row, re-checks the lease the note just refreshed and reports `held_by_other` — ⛔ a take-over.
//
// ⚠ WHY OWN-COMMITTING: a race needs REAL concurrent transactions on SEPARATE pool clients (the per-test BEGIN/ROLLBACK envelope
// would serialise everything). Each test proves WHERE the loser blocks — its backend in a `Lock` wait (`pg_stat_activity`, ⛔ a
// fixed sleep) — then the single allowed outcome. Open transactions are rolled back after each test. A FRESH random Pariwar per
// test; cleanup by Pariwar in replica mode (+ this spec's users and credentials by id), then a leftover check.

import { randomUUID } from 'node:crypto';

import pg from 'pg';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import {
  STAFF_EMAIL_SEND_LEASE_MS,
  beginSuspicionStaffEmail,
  expireExhaustedSuspicionStaffEmails,
  noteSuspicionStaffEmailTransient,
  suspicionStaffEmailReclaimCutoff,
} from '../../../src/claim/index.js';
import { bindScopedDb, setPariwarScope } from '../../../src/db.js';
import { pariwarId as toPariwarId, type ClaimId, type PariwarId, type UserId } from '../../../src/ids/index.js';
import { refusedClaim } from './_suspicion-refusal-fixtures.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);
const TIMEOUT = 60_000;
const WAIT_DEADLINE_MS = 10_000;
const N = 4;

describe.skipIf(!hasDatabase)("Story 6.25 — the staff email's claiming transaction (two connections, own-committing)", () => {
  let pool: pg.Pool;
  const pariwars: string[] = [];
  const users: string[] = [];
  const open = new Set<{ rollback: () => Promise<void> }>();

  beforeAll(() => {
    pool = new pg.Pool({ connectionString: DATABASE_URL, max: N + 3, ssl: false, connectionTimeoutMillis: 5000 });
  });

  afterAll(async () => {
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      await c.query("SET LOCAL lock_timeout = '5s'");
      await c.query("SET LOCAL session_replication_role = 'replica'");
      if (pariwars.length > 0) {
        const { rows } = await c.query<{ table_name: string }>(
          `SELECT c.table_name FROM information_schema.columns c
             JOIN information_schema.tables t ON t.table_schema = c.table_schema AND t.table_name = c.table_name
            WHERE c.table_schema = 'public' AND c.column_name = 'pariwar_id' AND t.table_type = 'BASE TABLE'`,
        );
        for (const { table_name } of rows) await c.query(`DELETE FROM "${table_name}" WHERE pariwar_id::text = ANY($1)`, [pariwars]);
      }
      // ⚠ Under the replica role the users → admin_credentials cascade does ⛔ fire — delete both explicitly.
      await c.query('DELETE FROM admin_credentials WHERE user_id::text = ANY($1)', [users]);
      await c.query('DELETE FROM users WHERE id::text = ANY($1)', [users]);
      await c.query('COMMIT');
      const { rows: left } = await c.query<{ n: string }>(
        `SELECT (SELECT count(*) FROM claims WHERE pariwar_id::text = ANY($1))
              + (SELECT count(*) FROM claim_suspicion_staff_emails WHERE pariwar_id::text = ANY($1))
              + (SELECT count(*) FROM role_grants WHERE pariwar_id::text = ANY($1))
              + (SELECT count(*) FROM users WHERE id::text = ANY($2))
              + (SELECT count(*) FROM admin_credentials WHERE user_id::text = ANY($2)) AS n`,
        [pariwars, users],
      );
      if (Number(left[0]!.n) !== 0) throw new Error(`cleanup left ${left[0]!.n} row(s)`);
    } catch (e) {
      await c.query('ROLLBACK').catch(() => undefined);
      throw new Error(`[suspicion-staff-email-concurrency.spec] cleanup failed: ${(e as Error).message}`);
    } finally {
      c.release();
      await pool.end();
    }
  });

  afterEach(async () => {
    for (const tx of [...open]) await tx.rollback();
    open.clear();
  });

  function freshPariwar(): PariwarId {
    const pid = toPariwarId(randomUUID());
    pariwars.push(pid);
    return pid;
  }

  /** A committed `-239` refusal in `pid` (as the superuser — the fixtures' writers need no scope). */
  async function committedRefusal(pid: PariwarId): Promise<ClaimId> {
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      const cid = await refusedClaim(c, pid, randomUUID(), { decidedAt: new Date(Date.now() - 60_000) });
      await c.query('COMMIT');
      return cid;
    } catch (e) {
      await c.query('ROLLBACK').catch(() => undefined);
      throw e;
    } finally {
      c.release();
    }
  }

  /** A committed eligible Pariwar Admin of `pid`, granted well before any refusal here. */
  async function committedAdmin(pid: PariwarId): Promise<UserId> {
    const uid = randomUUID();
    users.push(uid);
    await pool.query(`INSERT INTO users (id, identity_type, status) VALUES ($1, 'admin', 'active')`, [uid]);
    await pool.query(
      `INSERT INTO role_grants (user_id, pariwar_id, role, scope_dimension, scope_value, created_at)
       VALUES ($1, $2::uuid, 'pariwar_admin', 'pariwar', $2::text, now() - interval '1 day')`,
      [uid, pid],
    );
    await pool.query(
      `INSERT INTO admin_credentials (user_id, email_ciphertext, email_blind_index, password_hash) VALUES ($1, 'enc:v1:x', $2, 'h')`,
      [uid, `bidx-6-25-race-${uid}`],
    );
    return uid as UserId;
  }

  async function openTx(pid: PariwarId | null) {
    const client = await pool.connect();
    let done = false;
    const finish = async (sql: 'COMMIT' | 'ROLLBACK') => {
      if (done) return;
      done = true;
      open.delete(tx);
      try {
        await client.query(sql);
      } finally {
        client.release();
      }
    };
    const tx = { client, backendPid: 0, commit: () => finish('COMMIT'), rollback: () => finish('ROLLBACK').catch(() => undefined) };
    open.add(tx);
    try {
      await client.query('BEGIN');
      if (pid !== null) {
        await client.query('SET LOCAL ROLE twt_app');
        await setPariwarScope(client, pid);
      }
      tx.backendPid = (await client.query<{ p: number }>('SELECT pg_backend_pid() AS p')).rows[0]!.p;
    } catch (err) {
      await tx.rollback();
      throw err;
    }
    return tx;
  }

  async function waitingOn(backendPid: number): Promise<string> {
    const deadline = Date.now() + WAIT_DEADLINE_MS;
    for (;;) {
      const { rows } = await pool.query<{ query: string }>(`SELECT query FROM pg_stat_activity WHERE pid = $1 AND wait_event_type = 'Lock'`, [backendPid]);
      if (rows[0]) return rows[0].query.replace(/\s+/g, ' ').trim();
      if (Date.now() > deadline) throw new Error(`backend ${String(backendPid)} never reached a lock wait`);
      await new Promise((r) => setTimeout(r, 25));
    }
  }

  const begin = (client: pg.PoolClient, pid: PariwarId, cid: ClaimId, recipient: UserId | null, jobId: string, now = new Date()) =>
    beginSuspicionStaffEmail(client, { pariwarId: pid, claimCaseId: cid, recipientUserId: recipient, jobId, now });

  async function rowsOf(cid: string) {
    const { rows } = await pool.query<{ outcome: string; detail: string | null; attempt_count: number; claimed_by_job: string | null }>(
      `SELECT outcome, detail, attempt_count, claimed_by_job FROM claim_suspicion_staff_emails WHERE claim_case_id = $1`,
      [cid],
    );
    return rows;
  }

  it(`⭐ ${String(N)} children of ONE (claim, recipient) at once ⇒ ONE row, ONE begun, the rest held_by_other`, { timeout: TIMEOUT }, async () => {
    const pid = freshPariwar();
    const cid = await committedRefusal(pid);
    const u = await committedAdmin(pid);
    const first = await openTx(pid);
    const firstResult = await begin(first.client, pid, cid, u, 'job-0');
    expect(firstResult.kind).toBe('begun');
    // The others queue on the claim-row lock while the first holds it.
    const others = await Promise.all(Array.from({ length: N - 1 }, () => openTx(pid)));
    // Each loser COMMITS as soon as it resolves — it holds the claim-row lock until then, which the next one waits on.
    const pending = others.map((o, i) =>
      begin(o.client, pid, cid, u, `job-${String(i + 1)}`).then(async (r) => {
        await o.commit();
        return r;
      }),
    );
    for (const o of others) expect(await waitingOn(o.backendPid)).toMatch(/FOR UPDATE/);
    await first.commit();
    const results = await Promise.all(pending);
    expect(results.map((r) => r.kind)).toEqual(Array.from({ length: N - 1 }, () => 'held_by_other'));
    expect(await rowsOf(cid)).toMatchObject([{ outcome: 'attempting', attempt_count: 1, claimed_by_job: 'job-0' }]);
  });

  it('⭐ RE4 — two children of the NULL pair at once ⇒ ONE `no_target` row, the loser `already_final` (⛔ a second alarm)', { timeout: TIMEOUT }, async () => {
    const pid = freshPariwar();
    const cid = await committedRefusal(pid);
    const a = await openTx(pid);
    const b = await openTx(pid);
    expect(await begin(a.client, pid, cid, null, 'job-a')).toEqual({ kind: 'no_target' });
    const loser = begin(b.client, pid, cid, null, 'job-b');
    expect(await waitingOn(b.backendPid)).toMatch(/FOR UPDATE/);
    await a.commit();
    // The loser re-reads the committed row under the lock ⇒ final.
    expect(await loser).toEqual({ kind: 'already_final' });
    await b.commit();
    expect(await rowsOf(cid)).toMatchObject([{ outcome: 'no_target', detail: 'no_pariwar_admin' }]);
  });

  it('⭐ the give-up (⛔ claim-row lock) finishes a row WHILE a child re-claims it ⇒ the child reports `already_final`', { timeout: TIMEOUT }, async () => {
    const pid = freshPariwar();
    const cid = await committedRefusal(pid);
    const u = await committedAdmin(pid);
    const now = new Date();
    const cutoff = suspicionStaffEmailReclaimCutoff(now);
    await pool.query(
      `INSERT INTO claim_suspicion_staff_emails (pariwar_id, claim_case_id, recipient_user_id, outcome, claimed_at, claimed_by_job, created_at, aging_since)
       VALUES ($1, $2, $3, 'attempting', $4, 'crashed', $5, $5)`,
      [pid, cid, u, new Date(now.getTime() - STAFF_EMAIL_SEND_LEASE_MS - 1), new Date(cutoff.getTime() - 1)],
    );
    // The give-up UPDATEs the row and holds its row lock (⛔ committed yet).
    const giveUp = await openTx(null);
    expect(await expireExhaustedSuspicionStaffEmails(giveUp.client, { cutoff, now, allow: [pid] })).toHaveLength(1);
    // The child (past the lease ⇒ a take-over) reaches its re-claim UPDATE and waits on that row.
    const child = await openTx(pid);
    const pending = begin(child.client, pid, cid, u, 'job-new', now);
    expect(await waitingOn(child.backendPid)).toMatch(/UPDATE claim_suspicion_staff_emails/);
    await giveUp.commit();
    expect(await pending).toEqual({ kind: 'already_final' });
    await child.commit();
    expect(await rowsOf(cid)).toMatchObject([{ outcome: 'error', detail: 'exhausted:attempting_three_days', attempt_count: 1 }]);
  });

  it('⭐ round 3 — a holder\'s note commits WHILE another job takes its stale-looking row over ⇒ the taker re-checks the lease: `held_by_other`', { timeout: TIMEOUT }, async () => {
    const pid = freshPariwar();
    const cid = await committedRefusal(pid);
    const u = await committedAdmin(pid);
    const now = new Date();
    const { rows } = await pool.query<{ notice_id: string }>(
      `INSERT INTO claim_suspicion_staff_emails (pariwar_id, claim_case_id, recipient_user_id, outcome, claimed_at, claimed_by_job)
       VALUES ($1, $2, $3, 'attempting', $4, 'job-live') RETURNING notice_id`,
      [pid, cid, u, new Date(now.getTime() - STAFF_EMAIL_SEND_LEASE_MS - 1)],
    );
    // The live holder's transient note refreshes the lease and holds the row lock (⛔ committed yet; it takes ⛔ claim lock).
    const holder = await openTx(pid);
    expect(
      await noteSuspicionStaffEmailTransient(bindScopedDb(holder.client), {
        pariwarId: pid,
        noticeId: rows[0]!.notice_id,
        jobId: 'job-live',
        detail: 'transient:TooManyRequestsException',
        mayHaveSent: false,
        now,
      }),
    ).toBe(1);
    // The taker reads the STALE claimed_at under the claim lock, decides "past the lease", and waits on the row in its UPDATE.
    const taker = await openTx(pid);
    const pending = begin(taker.client, pid, cid, u, 'job-new', now);
    expect(await waitingOn(taker.backendPid)).toMatch(/UPDATE claim_suspicion_staff_emails/);
    await holder.commit();
    expect(await pending).toEqual({ kind: 'held_by_other' });
    await taker.commit();
    expect(await rowsOf(cid)).toMatchObject([{ outcome: 'attempting', attempt_count: 1, claimed_by_job: 'job-live', detail: 'transient:TooManyRequestsException' }]);
  });
});
