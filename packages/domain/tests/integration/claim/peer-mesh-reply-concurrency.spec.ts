// Story 6.27a (Task 3; AC4; Invariant 9, Trap 13) — a neighbour's save racing an approval or 6.28's closure, as TRUE
// two-connection races (own-committing, separate pool clients; the loser proven BLOCKED on a lock — ⛔ never a sleep).
//
//   · save ↔ approval, BOTH orders: the save and the approval serialize on the CLAIM row (the save takes claim → ping →
//     reply; every approval writer takes the claim row first — F31). ⇒ ⛔ no `eventVersion` collision
//     (`ClaimStreamConcurrencyError`), ⛔ no deadlock (40P01), and a save that waits for the approval commits with
//     `saved_at` AFTER the approval (6.27b's queue arm sees it late). The approval is reproduced by its LOCK + APPEND
//     order (`lockClaimCase`, then `projectClaimState`) — the subject is the save's order, ⛔ not the approval gate.
//   · save ↔ 6.28 OP4's closure (`closeClaimsOfPaidDeath` — the REAL writer: the death's intake key FIRST, then claim
//     rows), BOTH orders: the save ⛔ never takes the intake key, so ⛔ no cycle; a save that waits for the closure is
//     refused (no longer open); a closure that waits for a save closes the claim after it.
// A FRESH random Pariwar per test; cleanup in replica mode — fixture cleanup ONLY ([[project_live_db_test_gotchas]]).

import { randomUUID } from 'node:crypto';

import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { bindScopedDb, setPariwarScope } from '../../../src/db.js';
import {
  closeClaimsOfPaidDeath,
  lockClaimCase,
  PeerRequestNoLongerOpenError,
  projectClaimState,
  savePeerAnswer,
} from '../../../src/claim/index.js';
import { claimId as toClaimId, memberId as toMemberId, pariwarId as toPariwarId, peerMeshPingId as toPingId } from '../../../src/ids/index.js';
import type { ClaimId, MemberId, PariwarId, PeerMeshPingId } from '../../../src/ids/index.js';
import { driveClaimTo } from '../_helpers.js';
import { claimAt } from './_one-payment-fixtures.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);
const TIMEOUT = 60_000;
const ACTOR = 'a0a0a0a0-0000-4000-8000-0000000000bb';

describe.skipIf(!hasDatabase)('Story 6.27a — a save racing an approval or a closure (two connections)', () => {
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
        for (const { table_name } of rows) await c.query(`DELETE FROM "${table_name}" WHERE pariwar_id::text = ANY($1)`, [pariwars]);
        await c.query('COMMIT');
      } catch (e) {
        await c.query('ROLLBACK').catch(() => undefined);
        console.error('[peer-mesh-reply-concurrency.spec] cleanup:', (e as Error).message);
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

  async function asSuperuser<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
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

  async function waitUntilBlocked(backendPid: number): Promise<void> {
    for (let i = 0; i < 200; i += 1) {
      const { rows } = await pool.query<{ n: number }>(`SELECT count(*)::int AS n FROM pg_stat_activity WHERE pid = $1 AND wait_event_type = 'Lock'`, [backendPid]);
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

  /** A claim of a fresh death in `verifier_approved` (or `verification_in_progress`), a selection and ONE texted ping. */
  async function seedRequest(pid: PariwarId, state: 'verifier_approved' | 'verification_in_progress') {
    return asSuperuser(async (c) => {
      const mid = toMemberId(randomUUID());
      const cid = toClaimId(randomUUID());
      await driveClaimTo(c, pid, cid, mid, state);
      const neighbour = toMemberId(randomUUID());
      const selectionId = randomUUID();
      await c.query(
        `INSERT INTO claim_peer_mesh_selections (selection_id, claim_case_id, pariwar_id, deceased_member_id, deceased_created_at, metric_id,
           metric_version, selected_member_ids, candidate_snapshot, response_window_expires_at)
         VALUES ($1, $2, $3, $4, now(), 'm', 1, ARRAY[$5]::uuid[], '[]'::jsonb, now() + interval '72 hours')`,
        [selectionId, cid, pid, mid, neighbour],
      );
      const pingId = toPingId(randomUUID());
      await c.query(
        `INSERT INTO claim_peer_mesh_pings (ping_id, selection_id, pariwar_id, member_id, send_outcome, attempt_count, send_updated_at)
         VALUES ($1, $2, $3, $4, 'accepted', 1, clock_timestamp())`,
        [pingId, selectionId, pid, neighbour],
      );
      return { cid, mid, neighbour, pingId };
    });
  }

  const saveHasDied = (client: pg.PoolClient, pid: PariwarId, pingId: PeerMeshPingId, neighbour: MemberId) =>
    savePeerAnswer(client, {
      pariwarId: pid,
      pingId,
      memberId: neighbour,
      questionKey: 'has_died',
      value: { codes: ['not_died'] },
      prepared: { form: 'codes', codes: ['not_died'] },
      decryptedLive: new Map(),
      savedVia: 'member_app',
      savedByActorId: neighbour,
      todayIst: '2026-10-12',
    });

  /** The approval's ORDER: the claim row first, then the append (every approval writer — F31). Stays in `verifier_approved`
   *  → `state_trustee_freeze` so the claim remains in the answer window either way. */
  async function approve(client: pg.PoolClient, pid: PariwarId, cid: ClaimId, mid: MemberId) {
    const row = await lockClaimCase(bindScopedDb(client), pid, cid);
    await projectClaimState(client, {
      claimCaseId: cid,
      pariwarId: pid,
      deceasedMemberId: mid,
      intakeChannels: row!.intakeChannels,
      claimantActorId: null,
      eventType: 'claim.state_trustee_frozen',
      payload: { from_state: 'verifier_approved', to_state: 'state_trustee_freeze', trigger: 'test', actor: 'trustee' },
      actorId: ACTOR,
    });
  }

  async function streamOf(cid: ClaimId) {
    const { rows } = await pool.query<{ event_type: string; event_version: number; occurred_at: Date; payload: Record<string, unknown> }>(
      `SELECT event_type, event_version::int AS event_version, occurred_at, payload FROM events_log WHERE stream_id = $1 ORDER BY event_version`,
      [cid],
    );
    return rows;
  }

  it('the approval FIRST, the save waits on the claim row ⇒ ⛔ collision, ⛔ deadlock; the save lands AFTER it (CURRENT state)', { timeout: TIMEOUT }, async () => {
    const pid = freshPariwar();
    const r = await seedRequest(pid, 'verifier_approved');
    const a = await openTx(pid);
    const s = await openTx(pid);
    try {
      await approve(a.client, pid, r.cid, r.mid);
      const saving = settle(saveHasDied(s.client, pid, r.pingId, r.neighbour));
      await waitUntilBlocked(s.backendPid);
      await a.commit();
      const out = await saving;
      expect(out.ok, String(!out.ok && (out.error as Error).message)).toBe(true);
      await s.commit();
    } catch (e) {
      await a.rollback();
      await s.rollback();
      throw e;
    }
    const stream = await streamOf(r.cid);
    const frozen = stream.find((e) => e.event_type === 'claim.state_trustee_frozen')!;
    const responded = stream.find((e) => e.event_type === 'claim.peer_mesh_responded')!;
    expect(responded.event_version).toBe(frozen.event_version + 1);
    expect(responded.payload).toMatchObject({ from_state: 'state_trustee_freeze' });
    const { rows } = await pool.query<{ saved_at: Date }>(`SELECT saved_at FROM claim_peer_mesh_reply_answers WHERE claim_case_id = $1`, [r.cid]);
    expect(rows[0]!.saved_at.getTime()).toBeGreaterThan(frozen.occurred_at.getTime());
  });

  it('the save FIRST, the approval waits on the claim row ⇒ ⛔ collision, ⛔ deadlock; the approval appends after it', { timeout: TIMEOUT }, async () => {
    const pid = freshPariwar();
    const r = await seedRequest(pid, 'verifier_approved');
    const s = await openTx(pid);
    const a = await openTx(pid);
    try {
      await saveHasDied(s.client, pid, r.pingId, r.neighbour);
      const approving = settle(approve(a.client, pid, r.cid, r.mid));
      await waitUntilBlocked(a.backendPid);
      await s.commit();
      const out = await approving;
      expect(out.ok, String(!out.ok && (out.error as Error).message)).toBe(true);
      await a.commit();
    } catch (e) {
      await s.rollback();
      await a.rollback();
      throw e;
    }
    const stream = await streamOf(r.cid);
    const responded = stream.find((e) => e.event_type === 'claim.peer_mesh_responded')!;
    const frozen = stream.find((e) => e.event_type === 'claim.state_trustee_frozen')!;
    expect(frozen.event_version).toBe(responded.event_version + 1);
    expect(responded.payload).toMatchObject({ from_state: 'verifier_approved' });
  });

  async function paidDeathWithOpenRequest(pid: PariwarId) {
    const r = await seedRequest(pid, 'verification_in_progress');
    await asSuperuser((c) => claimAt(c, pid, r.mid, 'approved', { bare: true }));
    return r;
  }

  it("6.28's closure FIRST (intake key, then claim rows), the save waits ⇒ ⛔ deadlock; the save is refused (no longer open)", { timeout: TIMEOUT }, async () => {
    const pid = freshPariwar();
    const r = await paidDeathWithOpenRequest(pid);
    const k = await openTx(pid);
    const s = await openTx(pid);
    try {
      const closed = await closeClaimsOfPaidDeath(k.client, { pariwarId: pid, deceasedMemberId: r.mid, actor: 'system', actorId: ACTOR });
      expect(closed.closed).toContain(r.cid);
      const saving = settle(saveHasDied(s.client, pid, r.pingId, r.neighbour));
      await waitUntilBlocked(s.backendPid);
      await k.commit();
      const out = await saving;
      expect(out.ok).toBe(false);
      expect(!out.ok && out.error).toBeInstanceOf(PeerRequestNoLongerOpenError);
      await s.rollback();
    } catch (e) {
      await k.rollback();
      await s.rollback();
      throw e;
    }
  });

  it("the save FIRST, 6.28's closure waits on the claim row ⇒ ⛔ deadlock; the claim is closed after the save", { timeout: TIMEOUT }, async () => {
    const pid = freshPariwar();
    const r = await paidDeathWithOpenRequest(pid);
    const s = await openTx(pid);
    const k = await openTx(pid);
    try {
      await saveHasDied(s.client, pid, r.pingId, r.neighbour);
      const closing = settle(closeClaimsOfPaidDeath(k.client, { pariwarId: pid, deceasedMemberId: r.mid, actor: 'system', actorId: ACTOR }));
      await waitUntilBlocked(k.backendPid);
      await s.commit();
      const out = await closing;
      expect(out.ok, String(!out.ok && (out.error as Error).message)).toBe(true);
      expect(out.ok && out.value.closed).toContain(r.cid);
      await k.commit();
    } catch (e) {
      await s.rollback();
      await k.rollback();
      throw e;
    }
    const { rows } = await pool.query(`SELECT current_state FROM claims WHERE claim_case_id = $1`, [r.cid]);
    expect(rows[0]!.current_state).toBe('closed');
  });
});
