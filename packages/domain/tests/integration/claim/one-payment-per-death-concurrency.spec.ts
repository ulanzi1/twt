// Story 6.28 — "one payment per death" as TRUE two-connection races (own-committing). `2026-10-11-319`.
//
//   OP8 — two final approvals of ONE death through two DIFFERENT writers (the freeze vote on X, the R9 finalize on Y — two
//         different outer keys) in flight together ⇒ exactly one commits `state_trustee_approved`; the other is STOPPED
//         (`DeathAlreadyFinallyApprovedError`). They serialise on RF15's per-death key, which the gate takes BEFORE OP2's
//         read (Fact 3); the loser's backend is proven BLOCKED on a lock (`pg_stat_activity`, ⛔ never a sleep).
//   AC9 — an ALLOWED suspicion appeal (S) and the cycle commit on a voted X of the same death, in flight together, in BOTH
//         orders ⇒ X ends EXACTLY one of {`closed`, `approved`} — ⛔ never both, ⛔ never neither; ⛔ two payments never.
//   AC4 H(ii) — the paid death's closure (H(i)'s entry) and a MINT for the same death in flight together, in both orders ⇒
//         the minted claim ends `closed` (⛔ never left open beside the paid claim); and a mint that commits WHILE the
//         commit is uncommitted (it takes ⛔ no intake key) is closed by H(i) afterwards.
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
  closeClaimsOfPaidDeath,
  commitCycleFreeze,
  reviewAppealStage1,
  tryConverge,
  finalizeR9Outcome,
  openR9VotingSession,
  prepareR9VoteCiphertext,
  routeToR9,
  voteOnFrozenClaim,
} from '../../../src/claim/index.js';
import { memberId as toMemberId, pariwarId as toPariwarId } from '../../../src/ids/index.js';
import type { ClaimId, CycleFreezeCommitId, MemberId, PariwarId } from '../../../src/ids/index.js';
import { seedClauseVersion, seedRoleGrant } from '../_helpers.js';
import { claimAt, overriddenApart } from './_one-payment-fixtures.js';
import { CIPHER, REVIEWER, openAppeal, refusedClaim } from './_suspicion-refusal-fixtures.js';

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

  // ── AC9 — the allowed appeal × the cycle commit ─────────────────────────────────────────────────────────────────
  const TRUSTEE = 'f9f9f9f9-0000-4000-8000-000000000003';
  const commit = (client: pg.PoolClient, pid: PariwarId) =>
    commitCycleFreeze(client, {
      pariwarId: pid, commitId: randomUUID() as unknown as CycleFreezeCommitId, actorId: TRUSTEE, actorDisplay: 'Trustee One', actor: 'trustee',
    });
  const reverse = (client: pg.PoolClient, pid: PariwarId, s: ClaimId) =>
    reviewAppealStage1(client, {
      claimCaseId: s, pariwarId: pid, decision: 'reversed', dispositionCategory: 'reconsideration_on_merits',
      reviewerActorId: REVIEWER, reviewerDisplay: 'Another District Admin', rationaleCiphertext: CIPHER, actor: 'operator',
    });
  const statesOf = (pid: PariwarId, cids: string[]) =>
    onOwnTx(pid, async (c) =>
      Object.fromEntries(
        (await c.query<{ id: string; s: string }>('SELECT claim_case_id::text AS id, current_state::text AS s FROM claims WHERE claim_case_id = ANY($1)', [cids])).rows.map((r) => [r.id, r.s]),
      ),
    );

  /** X voted; S refused on `-239` with its appeal OPEN (path (a)'s shape), all COMMITTED. */
  async function votedAndAppealing(pid: PariwarId): Promise<{ x: ClaimId; s: ClaimId }> {
    const mid = toMemberId(randomUUID());
    const x = await onOwnTx(pid, (c) => claimAt(c, pid, mid, 'state_trustee_approved'));
    const s = await onOwnTx(pid, async (c) => {
      const id = await refusedClaim(c, pid, mid);
      await openAppeal(c, pid, id);
      return id;
    });
    return { x, s };
  }

  for (const first of ['commit', 'appeal'] as const) {
    it(`AC9 — the ${first === 'commit' ? 'COMMIT' : 'allowed APPEAL'} holds X first, the other BLOCKS ⇒ X ends exactly one of {closed, approved}`, { timeout: TIMEOUT }, async () => {
      const pid = freshPariwar();
      const { x, s } = await votedAndAppealing(pid);
      const a = await openTx(pid);
      if (first === 'commit') await commit(a.client, pid);
      else await reverse(a.client, pid, s);
      const b = await openTx(pid);
      const second = settle(first === 'commit' ? reverse(b.client, pid, s) : commit(b.client, pid));
      await waitUntilBlocked(b.backendPid); // ⭐ on X's trustee key, which A holds
      await a.commit();
      const out = await second;
      expect(out.ok, String((out as { error?: unknown }).error)).toBe(true);
      await b.commit();
      const states = await statesOf(pid, [x, s]);
      expect(['closed', 'approved']).toContain(states[x]);
      // ⛔ never two payments: if X were approved, S could ⛔ not be live beside it (H(iii) closes it).
      if (states[x] === 'approved') expect(states[s]).toBe('closed');
      else expect(states[s]).toBe('reversed');
    });
  }

  // ── AC4 H(ii) — the paid death's closure × a mint ───────────────────────────────────────────────────────────────
  const intake = (pid: PariwarId, mid: MemberId) => ({
    pariwarId: pid, deceasedMemberId: mid, intakeChannel: 'member_app' as const, actor: 'member' as const, claimantActorId: null,
    trigger: 'test_intake', actorId: null, auditId: randomUUID(),
  });

  /** X `state` (paid or voted), kept APART from later filings (so a new filing MINTS), COMMITTED. */
  async function paidApart(pid: PariwarId, state: 'approved' | 'state_trustee_approved'): Promise<{ x: ClaimId; mid: MemberId }> {
    const mid = toMemberId(randomUUID());
    const x = await onOwnTx(pid, async (c) => {
      const id = await claimAt(c, pid, mid, state);
      await overriddenApart(c, pid, mid, id);
      return id;
    });
    return { x, mid };
  }

  for (const first of ['closure', 'mint'] as const) {
    it(`AC4 H(ii) — the ${first === 'closure' ? 'CLOSURE' : 'MINT'} holds the intake key first, the other BLOCKS ⇒ the minted claim ends \`closed\``, { timeout: TIMEOUT }, async () => {
      const pid = freshPariwar();
      const { x, mid } = await paidApart(pid, 'approved');
      const a = await openTx(pid);
      const firstOut = first === 'closure'
        ? await closeClaimsOfPaidDeath(a.client, { pariwarId: pid, deceasedMemberId: mid, actor: 'system', actorId: TRUSTEE })
        : await tryConverge(a.client, intake(pid, mid));
      const b = await openTx(pid);
      const second = settle(
        first === 'closure'
          ? tryConverge(b.client, intake(pid, mid))
          : closeClaimsOfPaidDeath(b.client, { pariwarId: pid, deceasedMemberId: mid, actor: 'system', actorId: TRUSTEE }),
      );
      await waitUntilBlocked(b.backendPid); // ⭐ on the death's intake key
      await a.commit();
      const out = await second;
      expect(out.ok, String((out as { error?: unknown }).error)).toBe(true);
      await b.commit();
      const minted = first === 'closure' ? (out as { value: { claimCaseId: string } }).value.claimCaseId : (firstOut as { claimCaseId: string }).claimCaseId;
      expect(minted).not.toBe(x);
      expect((await statesOf(pid, [minted]))[minted]).toBe('closed');
    });
  }

  it('AC4 H(ii) × H(i) — a mint COMMITTED while the commit is uncommitted is OPEN; the commit\'s closure (H(i)) then closes it', { timeout: TIMEOUT }, async () => {
    const pid = freshPariwar();
    const { x, mid } = await paidApart(pid, 'state_trustee_approved');
    const a = await openTx(pid);
    expect((await commit(a.client, pid)).committedClaimIds).toEqual([x]);
    // The mint does ⛔ not block on the commit (the commit takes ⛔ no intake key) and sees X still voted ⇒ OPEN.
    const minted = await onOwnTx(pid, (c) => tryConverge(c, intake(pid, mid)));
    expect(minted).toMatchObject({ minted: true, state: 'intake_converged' });
    await a.commit();
    // H(i) — after the commit, in its own transaction.
    const closed = await onOwnTx(pid, (c) => closeClaimsOfPaidDeath(c, { pariwarId: pid, deceasedMemberId: mid, actor: 'system', actorId: TRUSTEE }));
    expect(closed).toMatchObject({ paidClaimCaseId: x, closed: [minted.claimCaseId] });
    expect((await statesOf(pid, [minted.claimCaseId]))[minted.claimCaseId]).toBe('closed');
  });
});
