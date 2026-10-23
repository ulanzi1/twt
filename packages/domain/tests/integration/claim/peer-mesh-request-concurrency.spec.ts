// Story 6.27c (Task 3.10; AC2, Trap 13) — the neighbours' text under TRUE two-connection races (own-committing). The shape of
// 6.24b's `suspicion-notice-concurrency.spec.ts`:
//   · ⭐ ONCE-EVER — two children begin the SAME ping at once: the claim-row `FOR UPDATE` serialises them; the winner begins it, the
//     loser (the winner's row within the lease) is `held_by_other` — exactly ONE `attempting` row, attempt 1, ONE link code;
//   · a neighbour's SAVE racing a SEND of another ping of the same claim, in BOTH orders — each takes claim → ping (the order
//     every reply / approval writer uses), so the second WAITS on the claim row and then succeeds: ⛔ deadlock, ⛔ lost write.
// ⚠ WHY OWN-COMMITTING: a race needs real concurrent transactions on separate clients. Each test proves WHERE the loser blocks (its
// backend in a `Lock` wait — ⛔ a fixed sleep), then the one allowed outcome. A FRESH random Pariwar per test; cleanup table by
// table in replica mode, bounded by `lock_timeout`, then a leftover check — fixture cleanup ONLY ([[project_live_db_test_gotchas]]).

import { randomUUID } from 'node:crypto';

import pg from 'pg';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { setPariwarScope } from '../../../src/db.js';
import { beginPeerMeshRequest, recordPeerMeshResponse } from '../../../src/claim/index.js';
import { claimId as toClaimId, memberId as toMemberId, pariwarId as toPariwarId, peerMeshPingId as toPingId } from '../../../src/ids/index.js';
import type { ClaimId, MemberId, PariwarId, PeerMeshPingId } from '../../../src/ids/index.js';
import { driveClaimTo } from '../_helpers.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);
const TIMEOUT = 60_000;
const WAIT_DEADLINE_MS = 10_000;

describe.skipIf(!hasDatabase)('Story 6.27c — the neighbours\' text under two connections (own-committing)', () => {
  let pool: pg.Pool;
  const pariwars: string[] = [];
  const open = new Set<{ rollback: () => Promise<void> }>();

  beforeAll(() => {
    pool = new pg.Pool({ connectionString: DATABASE_URL, max: 6, ssl: false, connectionTimeoutMillis: 5000 });
  });

  afterAll(async () => {
    if (pariwars.length === 0) {
      await pool.end();
      return;
    }
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      await c.query("SET LOCAL lock_timeout = '5s'");
      await c.query("SET LOCAL session_replication_role = 'replica'");
      const { rows } = await c.query<{ table_name: string }>(
        `SELECT c.table_name FROM information_schema.columns c
           JOIN information_schema.tables t ON t.table_schema = c.table_schema AND t.table_name = c.table_name
          WHERE c.table_schema = 'public' AND c.column_name = 'pariwar_id' AND t.table_type = 'BASE TABLE'`,
      );
      for (const { table_name } of rows) await c.query(`DELETE FROM "${table_name}" WHERE pariwar_id::text = ANY($1)`, [pariwars]);
      await c.query('COMMIT');
      const { rows: left } = await c.query<{ n: string }>(
        `SELECT (SELECT count(*) FROM claims WHERE pariwar_id::text = ANY($1))
              + (SELECT count(*) FROM claim_peer_mesh_pings WHERE pariwar_id::text = ANY($1)) AS n`,
        [pariwars],
      );
      if (Number(left[0]!.n) !== 0) throw new Error(`cleanup left ${left[0]!.n} row(s) of this spec's Pariwars`);
    } catch (e) {
      await c.query('ROLLBACK').catch(() => undefined);
      throw new Error(`[peer-mesh-request-concurrency.spec] cleanup failed: ${(e as Error).message}`);
    } finally {
      c.release();
      await pool.end();
    }
  });

  afterEach(async () => {
    for (const tx of [...open]) await tx.rollback();
    open.clear();
  });

  /** An OPEN transaction as `twt_app` under `pid`, with its backend pid. Registered in `open` until committed or rolled back. */
  async function openTx(pid: PariwarId) {
    const client = await pool.connect();
    let done = false;
    const finish = async (stmt: 'COMMIT' | 'ROLLBACK') => {
      if (done) return;
      done = true;
      open.delete(tx);
      try {
        await client.query(stmt);
      } finally {
        client.release();
      }
    };
    const tx = { client, backendPid: 0, commit: () => finish('COMMIT'), rollback: () => finish('ROLLBACK').catch(() => undefined) };
    open.add(tx);
    try {
      await client.query('BEGIN');
      await client.query('SET LOCAL ROLE twt_app');
      await setPariwarScope(client, pid);
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

  /** COMMITTED, as the superuser: a claim in the window (through the projector), two active neighbours with identities, a selection and their pings. */
  async function seed(): Promise<{ pid: PariwarId; cid: ClaimId; pings: { pingId: PeerMeshPingId; memberId: MemberId }[] }> {
    const pid = toPariwarId(randomUUID());
    pariwars.push(pid);
    const cid = toClaimId(randomUUID());
    const deceased = randomUUID();
    const neighbours = [randomUUID(), randomUUID()];
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      // 📌 Story 6.35 — a fresh begin resolves the recipient's language (LS8), which reads the passport (removed by the cleanup).
      await c.query(
        `INSERT INTO pariwar_passport (pariwar_id, display_name_en, display_name_hi, legal_name, branding_bundle, locale_default)
         VALUES ($1, 'P', 'प', 'T', '{}'::jsonb, 'hi')`,
        [pid],
      );
      for (const m of neighbours) {
        await c.query(`INSERT INTO members (member_id, pariwar_id, state, state_event_version) VALUES ($1, $2, 'active', 1)`, [m, pid]);
        await c.query(`INSERT INTO member_identities (member_id, pariwar_id, mobile_ciphertext, mobile_blind_index) VALUES ($1, $2, 'enc:test:x', $3)`, [
          m,
          pid,
          `idx-${randomUUID()}`,
        ]);
      }
      // Through the PROJECTOR (it replays the stream — a directly inserted row would replay to ⛔ state on the next event).
      await driveClaimTo(c, pid, cid, deceased, 'verification_in_progress');
      const selectionId = randomUUID();
      await c.query(
        `INSERT INTO claim_peer_mesh_selections (selection_id, claim_case_id, pariwar_id, deceased_member_id, deceased_created_at, metric_id,
           metric_version, selected_member_ids, candidate_snapshot, response_window_expires_at)
         VALUES ($1, $2, $3, $4, now(), 'm', 1, $5::uuid[], '[]'::jsonb, now() + interval '72 hours')`,
        [selectionId, cid, pid, deceased, neighbours],
      );
      const pings = [];
      for (const m of neighbours) {
        const pingId = randomUUID();
        await c.query(`INSERT INTO claim_peer_mesh_pings (ping_id, selection_id, pariwar_id, member_id) VALUES ($1, $2, $3, $4)`, [pingId, selectionId, pid, m]);
        pings.push({ pingId: toPingId(pingId), memberId: toMemberId(m) });
      }
      await c.query('COMMIT');
      return { pid, cid, pings };
    } catch (err) {
      await c.query('ROLLBACK').catch(() => undefined);
      throw err;
    } finally {
      c.release();
    }
  }

  const begin = (client: pg.PoolClient, s: { pid: PariwarId; cid: ClaimId }, pingId: PeerMeshPingId, jobId: string) =>
    beginPeerMeshRequest(client, { pariwarId: s.pid, claimCaseId: s.cid, pingId, jobId, now: new Date(), nameFault: null, unusableLocales: [], nomineeMatch: { mobileIndexes: [], memberIds: [] } });

  it('⭐ ONCE-EVER — two children begin the SAME ping at once: ONE begins it, the other is `held_by_other`', { timeout: TIMEOUT }, async () => {
    const s = await seed();
    const ping = s.pings[0]!.pingId;
    const a = await openTx(s.pid);
    const b = await openTx(s.pid);
    expect((await begin(a.client, s, ping, 'job-a')).kind).toBe('begun');
    const fromB = begin(b.client, s, ping, 'job-b');
    expect(await waitingOn(b.backendPid)).toMatch(/FROM claims .* FOR UPDATE/);
    await a.commit();
    expect((await fromB).kind).toBe('held_by_other');
    await b.commit();
    const { rows } = await pool.query<{ send_outcome: string; attempt_count: number; claimed_by_job: string; link_code: string }>(
      `SELECT send_outcome, attempt_count, claimed_by_job, link_code FROM claim_peer_mesh_pings WHERE ping_id = $1`,
      [ping],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ send_outcome: 'attempting', attempt_count: 1, claimed_by_job: 'job-a' });
  });

  it('a neighbour\'s SAVE (claim → ping) racing a SEND of another ping — the send waits on the claim row, then begins (⛔ deadlock)', { timeout: TIMEOUT }, async () => {
    const s = await seed();
    const [answered, due] = s.pings;
    const save = await openTx(s.pid);
    const send = await openTx(s.pid);
    await recordPeerMeshResponse(save.client, { claimCaseId: s.cid, pariwarId: s.pid, responderMemberId: answered!.memberId, response: 'confirmed' });
    const fromSend = begin(send.client, s, due!.pingId, 'job-a');
    expect(await waitingOn(send.backendPid)).toMatch(/FROM claims .* FOR UPDATE/);
    await save.commit();
    expect((await fromSend).kind).toBe('begun');
    await send.commit();
  });

  it('a SEND holding claim → ping racing a SAVE — the save waits on the claim row, then records (⛔ deadlock)', { timeout: TIMEOUT }, async () => {
    const s = await seed();
    const [due, answered] = s.pings;
    const send = await openTx(s.pid);
    const save = await openTx(s.pid);
    expect((await begin(send.client, s, due!.pingId, 'job-a')).kind).toBe('begun');
    const fromSave = recordPeerMeshResponse(save.client, { claimCaseId: s.cid, pariwarId: s.pid, responderMemberId: answered!.memberId, response: 'confirmed' });
    expect(await waitingOn(save.backendPid)).toMatch(/claims/);
    await send.commit();
    await fromSave;
    await save.commit();
    const { rows } = await pool.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM events_log WHERE stream_id = $1 AND event_type = 'claim.peer_mesh_responded'`,
      [s.cid],
    );
    expect(rows[0]!.n).toBe(1);
  });
});
