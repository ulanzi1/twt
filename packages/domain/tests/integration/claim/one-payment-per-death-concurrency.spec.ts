// Story 6.28 — "one payment per death" as TRUE two-connection races (own-committing). `2026-10-11-319`.
//
//   OP8 — two final approvals of ONE death through two DIFFERENT writers (the freeze vote on X, the R9 finalize on Y — two
//         different outer keys) in flight together ⇒ exactly one commits `state_trustee_approved`; the other is STOPPED
//         (`DeathAlreadyFinallyApprovedError`). They serialise on RF15's per-death key, which the gate takes BEFORE OP2's
//         read (Fact 3); the loser's backend is proven BLOCKED on a lock (`pg_stat_activity`, ⛔ never a sleep).
//
// ⚠ WHY OWN-COMMITTING: a race needs REAL concurrent transactions on SEPARATE pool clients. A FRESH random Pariwar per
// test; cleanup table by table in replica mode — fixture cleanup ONLY ([[project_live_db_test_gotchas]]).

import { randomUUID } from 'node:crypto';

import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { bindScopedDb, setPariwarScope } from '../../../src/db.js';
import {
  DeathAlreadyFinallyApprovedError,
  castR9Vote,
  finalizeR9Outcome,
  openR9VotingSession,
  prepareR9VoteCiphertext,
  routeToR9,
  voteOnFrozenClaim,
} from '../../../src/claim/index.js';
import { memberId as toMemberId, pariwarId as toPariwarId } from '../../../src/ids/index.js';
import type { PariwarId } from '../../../src/ids/index.js';
import { seedClauseVersion, seedRoleGrant } from '../_helpers.js';
import { claimAt } from './_one-payment-fixtures.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);
const TIMEOUT = 60_000;
const PA = 'a9a9a9a9-0000-4000-8000-000000000002';
const V1 = 'b9b9b9b9-0000-4000-8000-000000000011';
const V2 = 'b9b9b9b9-0000-4000-8000-000000000012';
const V3 = 'b9b9b9b9-0000-4000-8000-000000000013';
const PANEL = [V1, V2, V3];
const R9_CLAUSE = 'niy.special-death.r9';

describe.skipIf(!hasDatabase)('Story 6.28 — one payment per death (two connections, own-committing)', () => {
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
        await c.query(`DELETE FROM idempotency_keys WHERE ${pariwars.map((_, i) => `key LIKE '%' || $${i + 1} || '%'`).join(' OR ')}`, pariwars);
        await c.query('COMMIT');
      } catch (e) {
        await c.query('ROLLBACK').catch(() => undefined);
        console.error('[one-payment-per-death-concurrency.spec] cleanup:', (e as Error).message);
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

  /** `fn` in its OWN committed transaction — as `twt_app` under `pid`, or as the superuser (fixtures RLS forbids). */
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

  async function seedR9(pid: PariwarId): Promise<void> {
    await onOwnTx(
      pid,
      async (c) => {
        const tx = bindScopedDb(c);
        await seedClauseVersion(tx, pid, {
          clauseId: R9_CLAUSE,
          payload: { rule_code: 'R9', voting_required: true, majority_required: true, on_pass: 'route_r9_voting' },
        });
        for (const uid of PANEL) await seedRoleGrant(tx, pid, { userId: uid, role: 'pariwar_admin', scopeDimension: 'pariwar', scopeValue: pid });
      },
      { superuser: true },
    );
  }

  it('OP8 — the freeze vote on X and the R9 finalize on Y of ONE death in flight together ⇒ exactly one is finally approved; the other is STOPPED', { timeout: TIMEOUT }, async () => {
    const pid = freshPariwar();
    await seedR9(pid);
    const mid = toMemberId(randomUUID());
    const x = await onOwnTx(pid, (c) => claimAt(c, pid, mid, 'verifier_approved'));
    const y = await onOwnTx(pid, (c) => claimAt(c, pid, mid, 'verifier_approved'));
    await onOwnTx(pid, async (c) => {
      await routeToR9(c, { claimCaseId: y, pariwarId: pid, reasonCode: 'r9_special_case', rationaleCiphertext: null, actorId: PA, actorDisplay: 'Pariwar Admin', actor: 'trustee' });
      await openR9VotingSession(c, { claimCaseId: y, pariwarId: pid, clauseId: R9_CLAUSE, panelActorIds: PANEL, actorId: PA, actorDisplay: 'Pariwar Admin', actor: 'trustee' });
      for (const voter of [V1, V2]) {
        await castR9Vote(c, {
          claimCaseId: y, pariwarId: pid, vote: 'approve', rationaleCiphertext: prepareR9VoteCiphertext(`enc:v1:vote-${voter.slice(-2)}`),
          warningReasonCode: null, actorId: voter, actorDisplay: `Panelist ${voter.slice(-2)}`, actor: 'trustee',
        });
      }
    });

    const a = await openTx(pid);
    const voted = await voteOnFrozenClaim(a.client, {
      claimCaseId: x, pariwarId: pid, outcome: 'approved', reasonCode: null, rationaleCiphertext: 'enc:v1:why', actorId: PA, actorDisplay: 'Pariwar Admin', actor: 'trustee',
    });
    expect(voted.claimState).toBe('state_trustee_approved');
    const b = await openTx(pid);
    const finalizing = settle(finalizeR9Outcome(b.client, { claimCaseId: y, pariwarId: pid, actorId: V1, actorDisplay: 'Finalizer', actor: 'trustee' }));
    await waitUntilBlocked(b.backendPid); // ⭐ B waits on RF15's per-death key, which A holds
    await a.commit();
    const out = await finalizing;
    if (out.ok) await b.commit();
    else await b.rollback();

    const states = await onOwnTx(pid, async (c) =>
      Object.fromEntries((await c.query<{ id: string; s: string }>('SELECT claim_case_id::text AS id, current_state::text AS s FROM claims WHERE claim_case_id = ANY($1)', [[x, y]])).rows.map((r) => [r.id, r.s])),
    );
    expect(out.ok, 'the second final approval must be STOPPED').toBe(false);
    expect((out as { error: unknown }).error).toBeInstanceOf(DeathAlreadyFinallyApprovedError);
    expect(((out as { error: DeathAlreadyFinallyApprovedError }).error).approvedClaimCaseId).toBe(x);
    // Exactly ONE of the death's claims is finally approved — X; Y is left where R9 parked it (⛔ never denied).
    expect(states[x]).toBe('state_trustee_approved');
    expect(states[y]).toBe('verifier_approved');
  });
});
