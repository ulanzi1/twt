// Story 6.22 — the finding's LOCK ORDER as true two-connection races (own-committing). AC5, AC6; DL3 step 1, DL12 (d).
//
//   AC6 (a) — the death's INTAKE key held elsewhere ⇒ the finding WAITS (`pg_stat_activity`, ⛔ a sleep); an UPPER-case
//             claim id reaches the same key.
//   AC6 (b) — the claim's `appeal:` key is built from the DB ROW's id (TR11): held under the lower-case id, a finding sent
//             with the UPPER-case id still waits — and, while it waits, it holds ⛔ the claim row (the keys come BEFORE the
//             row — AC5's 40P01 order, proven with a NOWAIT probe rather than a timing race).
//   AC6 (c) — a SECOND INTAKE racing an uncommitted finding waits on the intake key and then MINTS a new standing claim —
//             ⛔ never absorbed into the claim the finding closed (`tryConverge` (3b) / (3c) takes ⛔ claim-row lock, so
//             without the finding's intake key it would converge into it).
//   AC5     — the finding and an appeal writer (`initiateAppeal`) on ONE claim, both orders: one waits, ⛔ 40P01; finding
//             first ⇒ the appeal is REFUSED by its own state guard; appeal first ⇒ the finding closes the claim AND its
//             journey.
//
// ⚠ OWN-COMMITTING: a FRESH random Pariwar per test; cleanup table by table in replica mode — fixture cleanup ONLY.

import { randomUUID } from 'node:crypto';

import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { appealAdvisoryLockKey } from '../../../src/claim/appeal-lock.js';
import {
  flagClaimForFraudInvestigation,
  initiateAppeal,
  intakeAdvisoryLockKey,
  recordFraudFinding,
  tryConverge,
} from '../../../src/claim/index.js';
import { bindScopedDb, setPariwarScope } from '../../../src/db.js';
import {
  claimFraudInvestigationStepId as toStepId,
  claimId as toClaimId,
  claimNomineeFindingId as toFindingId,
  memberId as toMemberId,
  pariwarId as toPariwarId,
  type ClaimId,
  type PariwarId,
} from '../../../src/ids/index.js';
import { seedOpenMemberStream } from '../_helpers.js';
import { claimAt } from './_one-payment-fixtures.js';
import { refusedClaim } from './_suspicion-refusal-fixtures.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);
const TIMEOUT = 60_000;
const OPERATOR = 'a8a8a8a8-0000-4000-8000-000000000001';
const DA = 'd8d8d8d8-0000-4000-8000-000000000002';

describe.skipIf(!hasDatabase)('Story 6.22 — the finding\'s lock order (two connections, own-committing)', () => {
  let pool: pg.Pool;
  const pariwars: string[] = [];

  beforeAll(() => {
    pool = new pg.Pool({ connectionString: DATABASE_URL, max: 6, ssl: false, connectionTimeoutMillis: 5000 });
  });

  afterAll(async () => {
    if (pariwars.length > 0) {
      const c = await pool.connect();
      try {
        await c.query('BEGIN');
        await c.query("SET LOCAL session_replication_role = 'replica'");
        const { rows } = await c.query<{ table_name: string }>(
          `SELECT c.table_name FROM information_schema.columns c
             JOIN information_schema.tables t ON t.table_schema = c.table_schema AND t.table_name = c.table_name
            WHERE c.table_schema = 'public' AND c.column_name = 'pariwar_id' AND t.table_type = 'BASE TABLE'`,
        );
        for (const { table_name } of rows) {
          await c.query(`DELETE FROM "${table_name}" WHERE pariwar_id::text = ANY($1)`, [pariwars]);
        }
        await c.query('COMMIT');
      } catch (e) {
        await c.query('ROLLBACK').catch(() => undefined);
        console.error('[fraud-investigation-concurrency.spec] cleanup:', (e as Error).message);
      } finally {
        c.release();
      }
    }
    await pool.end();
  });

  function freshPariwar(): PariwarId {
    const pid = toPariwarId(randomUUID());
    pariwars.push(pid);
    return pid;
  }

  async function onOwnTx<T>(pid: PariwarId, fn: (client: pg.PoolClient) => Promise<T>, opts: { superuser?: boolean } = {}): Promise<T> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      if (!opts.superuser) {
        await client.query('SET LOCAL ROLE twt_app');
        await setPariwarScope(client, pid);
      }
      const out = await fn(client);
      await client.query('COMMIT');
      return out;
    } catch (err) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }
  }

  async function openTx(pid: PariwarId) {
    const client = await pool.connect();
    await client.query('BEGIN');
    await client.query('SET LOCAL ROLE twt_app');
    await setPariwarScope(client, pid);
    const { rows } = await client.query<{ pid: number }>('SELECT pg_backend_pid() AS pid');
    return {
      client,
      backendPid: rows[0]!.pid,
      commit: async () => {
        await client.query('COMMIT');
        client.release();
      },
      rollback: async () => {
        await client.query('ROLLBACK').catch(() => undefined);
        client.release();
      },
    };
  }

  /** Wait until `backendPid` is BLOCKED on a lock — proof the race is real, ⛔ never a sleep. */
  async function waitUntilBlocked(backendPid: number): Promise<void> {
    for (let i = 0; i < 200; i += 1) {
      const { rows } = await pool.query<{ n: number }>(
        `SELECT count(*)::int AS n FROM pg_stat_activity WHERE pid = $1 AND wait_event_type = 'Lock'`,
        [backendPid],
      );
      if (rows[0]!.n === 1) return;
      await new Promise((r) => setTimeout(r, 25));
    }
    throw new Error(`backend ${backendPid} never blocked on a lock`);
  }

  function settle<T>(p: Promise<T>) {
    return p.then(
      (value) => ({ ok: true as const, value }),
      (error: unknown) => ({ ok: false as const, error }),
    );
  }

  const flag = (c: pg.PoolClient, pid: PariwarId, cid: ClaimId) =>
    flagClaimForFraudInvestigation(c, {
      claimCaseId: cid, pariwarId: pid, stepId: toStepId(randomUUID()), noteCiphertext: 'enc:v1:flag',
      actorId: OPERATOR, actorDisplay: 'Helpline Operator', actor: 'operator',
    });
  const find = (c: pg.PoolClient, pid: PariwarId, cid: string) =>
    recordFraudFinding(c, {
      claimCaseId: cid as ClaimId, pariwarId: pid, outcome: 'innocent', aliveConfirmation: 'in_person',
      stepId: toStepId(randomUUID()), findingId: toFindingId(randomUUID()), noteCiphertext: 'enc:v1:find',
      actorId: DA, actorDisplay: 'District Admin', actor: 'operator',
    });
  const stateOf = (pid: PariwarId, cid: string) =>
    onOwnTx(pid, async (c) => (await c.query<{ s: string }>('SELECT current_state::text AS s FROM claims WHERE claim_case_id = $1', [cid])).rows[0]?.s);

  /** A flagged claim of a member with a real lifecycle (the intake door passes once the report is released — TR3). */
  async function flaggedClaim(pid: PariwarId, state: 'verifier_review' | 'denied' = 'verifier_review'): Promise<{ cid: ClaimId; mid: string }> {
    const mid = randomUUID();
    await onOwnTx(pid, async (c) => seedOpenMemberStream(bindScopedDb(c), pid, mid), { superuser: true });
    const cid =
      state === 'denied'
        ? await onOwnTx(pid, (c) => refusedClaim(c, pid, mid, { reason: 'other' }))
        : await onOwnTx(pid, (c) => claimAt(c, pid, mid, 'verifier_review', { bare: true }));
    await onOwnTx(pid, (c) => flag(c, pid, cid));
    return { cid, mid };
  }

  it('AC6 (a) — the INTAKE key held elsewhere ⇒ the finding WAITS, then commits; an UPPER-case claim id reaches the same key', { timeout: TIMEOUT }, async () => {
    const pid = freshPariwar();
    const { cid, mid } = await flaggedClaim(pid);
    const holder = await openTx(pid);
    await holder.client.query('SELECT pg_advisory_xact_lock($1)', [intakeAdvisoryLockKey(pid, toMemberId(mid.toUpperCase())).toString()]);
    const b = await openTx(pid);
    const finding = settle(find(b.client, pid, cid.toUpperCase()));
    await waitUntilBlocked(b.backendPid);
    // ⭐ The intake key comes FIRST: while the finding waits on it, it holds ⛔ the claim row (DL12's inner writer also
    // takes the key — but AFTER the row; without the finding's own key first this probe fails with 55P03).
    const probe = await openTx(pid);
    const rowFree = await probe.client.query('SELECT 1 FROM claims WHERE claim_case_id = $1 FOR UPDATE NOWAIT', [cid]).then(
      () => true,
      (e: { code?: string }) => e.code,
    );
    await probe.rollback();
    expect(rowFree).toBe(true);
    await holder.commit();
    const out = await finding;
    expect(out.ok).toBe(true);
    await b.commit();
    expect(await stateOf(pid, cid)).toBe('closed');
  });

  it('AC6 (b) — the `appeal:` key comes from the ROW\'s id (TR11): held under the lower-case id, an UPPER-case request still waits', { timeout: TIMEOUT }, async () => {
    const pid = freshPariwar();
    const { cid } = await flaggedClaim(pid);
    const holder = await openTx(pid);
    await holder.client.query('SELECT pg_advisory_xact_lock($1)', [appealAdvisoryLockKey(pid, toClaimId(cid)).toString()]);
    const b = await openTx(pid);
    const finding = settle(find(b.client, pid, cid.toUpperCase()));
    await waitUntilBlocked(b.backendPid);
    // ⭐ AC5's ORDER, proven deterministically: while the finding waits on the `appeal:` key it holds ⛔ the claim row yet —
    // a third connection can still take it NOWAIT. (Row-before-key — the 40P01 order — fails this with 55P03.)
    const probe = await openTx(pid);
    const rowFree = await probe.client.query('SELECT 1 FROM claims WHERE claim_case_id = $1 FOR UPDATE NOWAIT', [cid]).then(
      () => true,
      (e: { code?: string }) => e.code,
    );
    await probe.rollback();
    expect(rowFree).toBe(true);
    await holder.commit();
    expect((await finding).ok).toBe(true);
    await b.commit();
  });

  it('AC6 (c) — a SECOND INTAKE racing an uncommitted finding waits, then MINTS a new standing claim — ⛔ absorbed into the closed one', { timeout: TIMEOUT }, async () => {
    const pid = freshPariwar();
    const { cid, mid } = await flaggedClaim(pid);
    const a = await openTx(pid);
    await find(a.client, pid, cid); // holds the intake key, uncommitted
    const b = await openTx(pid);
    const intake = settle(
      tryConverge(b.client, {
        pariwarId: pid, deceasedMemberId: toMemberId(mid), intakeChannel: 'member_app', actor: 'member',
        claimantActorId: null, trigger: 'test_intake', actorId: null, auditId: randomUUID(),
      }),
    );
    await waitUntilBlocked(b.backendPid);
    await a.commit();
    const out = await intake;
    if (!out.ok) {
      await b.rollback();
      throw out.error;
    }
    await b.commit();
    expect(out.value.minted).toBe(true);
    expect(out.value.claimCaseId.toLowerCase()).not.toBe(cid.toLowerCase());
    expect(await stateOf(pid, cid)).toBe('closed');
  });

  it('AC5 — finding FIRST, then the appeal writer: the appeal waits, ⛔ 40P01, and is REFUSED by its own state guard', { timeout: TIMEOUT }, async () => {
    const pid = freshPariwar();
    const { cid } = await flaggedClaim(pid, 'denied');
    const a = await openTx(pid);
    await find(a.client, pid, cid);
    const b = await openTx(pid);
    const appeal = settle(initiateAppeal(b.client, { claimCaseId: cid, pariwarId: pid, initiatedByActor: randomUUID(), initiatedOnBehalf: true, actor: 'operator' }));
    await waitUntilBlocked(b.backendPid);
    await a.commit();
    const out = await appeal;
    await b.rollback();
    expect(out.ok).toBe(false);
    expect((out as { error: { code?: string } }).error.code).not.toBe('40P01');
    expect(await stateOf(pid, cid)).toBe('closed');
  });

  it('AC5 — the appeal writer FIRST, then the finding: the finding waits, ⛔ 40P01, then closes the claim AND its new journey', { timeout: TIMEOUT }, async () => {
    const pid = freshPariwar();
    const { cid } = await flaggedClaim(pid, 'denied');
    const a = await openTx(pid);
    await initiateAppeal(a.client, { claimCaseId: cid, pariwarId: pid, initiatedByActor: randomUUID(), initiatedOnBehalf: true, actor: 'operator' });
    const b = await openTx(pid);
    const finding = settle(find(b.client, pid, cid));
    await waitUntilBlocked(b.backendPid);
    await a.commit();
    const out = await finding;
    if (!out.ok) {
      await b.rollback();
      throw out.error;
    }
    await b.commit();
    expect(out.value.close).toEqual({ closed: true });
    expect(await stateOf(pid, cid)).toBe('closed');
    const journeys = await onOwnTx(pid, async (c) => (await c.query<{ status: string }>('SELECT status FROM claim_appeals WHERE claim_case_id = $1', [cid])).rows);
    expect(journeys.map((j) => j.status)).toEqual(['closed']);
  });
});
