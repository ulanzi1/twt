// Story 6.31 (Task 4; AC3; I1, T10) — the WhatsApp reminder under TRUE two-connection races (own-committing). The shape of 6.27c's
// `peer-mesh-request-concurrency.spec.ts`:
//   · ⭐ ONCE EVER — two children begin the SAME ping's reminder at once: the claim-row `FOR UPDATE` serialises them; the winner
//     begins it, the loser (the winner's row within the lease) is `held_by_other` — exactly ONE reminder row, attempt 1;
//   · a neighbour's SUBMIT racing a reminder BEGIN of the same ping — the submit takes claim → ping (the order every reply writer
//     uses), so the begin WAITS on the claim row and then judges `skipped_answered`: ⛔ deadlock, ⛔ a reminder to someone who
//     answered.
// ⚠ WHY OWN-COMMITTING: a race needs real concurrent transactions on separate clients. Each test proves WHERE the loser blocks (its
// backend in a `Lock` wait — ⛔ a fixed sleep), then the one allowed outcome. A FRESH random Pariwar per test; cleanup table by
// table in replica mode, bounded by `lock_timeout`, then a leftover check — fixture cleanup ONLY ([[project_live_db_test_gotchas]]).

import { randomUUID } from 'node:crypto';

import pg from 'pg';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { setPariwarScope } from '../../../src/db.js';
import {
  CORRECTION_SEND_LEASE_MS,
  beginPeerMeshWaReminder,
  finishLapsedInFlightPeerMeshWaReminders,
  generatePeerRequestLinkCode,
} from '../../../src/claim/index.js';
import { claimId as toClaimId, memberId as toMemberId, pariwarId as toPariwarId, peerMeshPingId as toPingId } from '../../../src/ids/index.js';
import type { ClaimId, MemberId, PariwarId, PeerMeshPingId } from '../../../src/ids/index.js';
import { driveClaimTo } from '../_helpers.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);
const TIMEOUT = 60_000;
const WAIT_DEADLINE_MS = 10_000;
const TEMPLATE = { name: 'peer_mesh_reminder_en_v1', locale: 'en', localeSource: 'pariwar_default' } as const;

describe.skipIf(!hasDatabase)('Story 6.31 — the WhatsApp reminder under two connections (own-committing)', () => {
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
              + (SELECT count(*) FROM claim_peer_mesh_wa_reminders WHERE pariwar_id::text = ANY($1)) AS n`,
        [pariwars],
      );
      if (Number(left[0]!.n) !== 0) throw new Error(`cleanup left ${left[0]!.n} row(s) of this spec's Pariwars`);
    } catch (e) {
      await c.query('ROLLBACK').catch(() => undefined);
      throw new Error(`[peer-mesh-wa-reminder-concurrency.spec] cleanup failed: ${(e as Error).message}`);
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

  /** COMMITTED, as the superuser: a claim in the window (through the projector), one opted-in neighbour whose text went 49 h ago. */
  async function seed(): Promise<{ pid: PariwarId; cid: ClaimId; selectionId: string; pingId: PeerMeshPingId; memberId: MemberId }> {
    const pid = toPariwarId(randomUUID());
    pariwars.push(pid);
    const cid = toClaimId(randomUUID());
    const deceased = randomUUID();
    const neighbour = randomUUID();
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      // 📌 Story 6.35 — the begin resolves the recipient's language (the passport's default; removed by the cleanup).
      await c.query(
        `INSERT INTO pariwar_passport (pariwar_id, display_name_en, display_name_hi, legal_name, branding_bundle, locale_default)
         VALUES ($1, 'P', 'प', 'T', '{}'::jsonb, 'en')`,
        [pid],
      );
      await c.query(`INSERT INTO members (member_id, pariwar_id, state, state_event_version) VALUES ($1, $2, 'active', 1)`, [neighbour, pid]);
      await c.query(`INSERT INTO member_identities (member_id, pariwar_id, mobile_ciphertext, mobile_blind_index) VALUES ($1, $2, 'enc:test:x', $3)`, [
        neighbour,
        pid,
        `idx-${randomUUID()}`,
      ]);
      const consentId = randomUUID();
      await c.query(
        `INSERT INTO consent_records (consent_id, subject_id, pariwar_id, consent_type, granted_via_actor, consent_payload)
         VALUES ($1, $2, $3, 'whatsapp_opt_in', 'member_self', '{}'::jsonb)`,
        [consentId, neighbour, pid],
      );
      await c.query(
        `INSERT INTO member_wa_opt_in (pariwar_id, member_id, state, verification_phrase, mobile_blind_index, window_expires_at, consent_id, matched_at)
         VALUES ($1, $2, 'ACTIVE', $3, $4, clock_timestamp() + interval '20 hours', $5, clock_timestamp())`,
        [pid, neighbour, `TWT-${randomUUID().slice(0, 8)}`, `blind-${randomUUID()}`, consentId],
      );
      await c.query(`INSERT INTO pariwar_wa_config (pariwar_id, enabled, phone_number_id, access_token_secret_name) VALUES ($1, true, '123', 'tok')`, [pid]);
      // Through the PROJECTOR (it replays the stream — a directly inserted row would replay to ⛔ state on the next event).
      await driveClaimTo(c, pid, cid, deceased, 'verification_in_progress');
      const selectionId = randomUUID();
      await c.query(
        `INSERT INTO claim_peer_mesh_selections (selection_id, claim_case_id, pariwar_id, deceased_member_id, deceased_created_at, metric_id,
           metric_version, selected_member_ids, candidate_snapshot, response_window_expires_at)
         VALUES ($1, $2, $3, $4, now(), 'm', 1, ARRAY[$5]::uuid[], '[]'::jsonb, now() + interval '72 hours')`,
        [selectionId, cid, pid, deceased, neighbour],
      );
      const pingId = randomUUID();
      await c.query(
        `INSERT INTO claim_peer_mesh_pings (ping_id, selection_id, pariwar_id, member_id, send_outcome, attempt_count, claimed_at, claimed_by_job,
           aging_since, link_code, locale_source, send_updated_at)
         VALUES ($1, $2, $3, $4, 'accepted', 1, now(), 'job-text', now(), $5, 'pariwar_default', clock_timestamp() - interval '49 hours')`,
        [pingId, selectionId, pid, neighbour, generatePeerRequestLinkCode()],
      );
      await c.query('COMMIT');
      return { pid, cid, selectionId, pingId: toPingId(pingId), memberId: toMemberId(neighbour) };
    } catch (err) {
      await c.query('ROLLBACK').catch(() => undefined);
      throw err;
    } finally {
      c.release();
    }
  }

  const begin = (client: pg.PoolClient, s: { pid: PariwarId; cid: ClaimId; pingId: PeerMeshPingId }, jobId: string) =>
    beginPeerMeshWaReminder(client, { pariwarId: s.pid, claimCaseId: s.cid, pingId: s.pingId, jobId, now: new Date(), nameFault: null, templates: { hi: null, en: TEMPLATE.name } });

  it('⭐ ONCE EVER — two children begin the SAME ping\'s reminder at once: ONE begins it, the other is `held_by_other`', { timeout: TIMEOUT }, async () => {
    const s = await seed();
    const a = await openTx(s.pid);
    const b = await openTx(s.pid);
    expect((await begin(a.client, s, 'job-a')).kind).toBe('begun');
    const fromB = begin(b.client, s, 'job-b');
    expect(await waitingOn(b.backendPid)).toMatch(/FROM claims .* FOR UPDATE/);
    await a.commit();
    expect((await fromB).kind).toBe('held_by_other');
    await b.commit();
    const { rows } = await pool.query<{ send_outcome: string; attempt_count: number; claimed_by_job: string }>(
      `SELECT send_outcome, attempt_count, claimed_by_job FROM claim_peer_mesh_wa_reminders WHERE ping_id = $1`,
      [s.pingId],
    );
    expect(rows).toEqual([{ send_outcome: 'attempting', attempt_count: 1, claimed_by_job: 'job-a' }]);
  });

  it('a neighbour\'s SUBMIT holding claim → ping racing a BEGIN — the begin waits on the claim row, then judges skipped_answered (⛔ deadlock)', { timeout: TIMEOUT }, async () => {
    const s = await seed();
    const submit = await openTx(s.pid);
    const send = await openTx(s.pid);
    // The reply writers' order: the claim row, then the ping row (Trap 13), then the reply.
    await submit.client.query(`SELECT 1 FROM claims WHERE pariwar_id = $1 AND claim_case_id = $2 FOR UPDATE`, [s.pid, s.cid]);
    await submit.client.query(`SELECT 1 FROM claim_peer_mesh_pings WHERE pariwar_id = $1 AND ping_id = $2 FOR UPDATE`, [s.pid, s.pingId]);
    await submit.client.query(
      `INSERT INTO claim_peer_mesh_replies (pariwar_id, claim_case_id, selection_id, ping_id, responder_member_id, questionnaire_version_id, submitted_at)
       VALUES ($1, $2, $3, $4, $5, 'peer_mesh.v1', clock_timestamp() + interval '1 second')`,
      [s.pid, s.cid, s.selectionId, s.pingId, s.memberId],
    );
    const fromSend = begin(send.client, s, 'job-a');
    expect(await waitingOn(send.backendPid)).toMatch(/FROM claims .* FOR UPDATE/);
    await submit.commit();
    expect(await fromSend).toEqual({ kind: 'skipped', outcome: 'skipped_answered' });
    await send.commit();
  });

  it(
    '⭐ R3 — SKIP LOCKED: a single locked lapsed row ⛔ stalls the maintenance pass; it is skipped now and swept once released',
    { timeout: TIMEOUT },
    async () => {
      const a = await seed();
      const b = await seed();
      const old = new Date(Date.now() - CORRECTION_SEND_LEASE_MS - 60_000);
      for (const s of [a, b]) {
        await pool.query(
          `INSERT INTO claim_peer_mesh_wa_reminders
             (ping_id, pariwar_id, claim_case_id, selection_id, member_id, send_outcome, attempt_count, claimed_at, claimed_by_job, aging_since, send_started_at)
           VALUES ($1, $2, $3, $4, $5, 'attempting', 1, $6, 'job-x', $6, $6)`,
          [s.pingId, s.pid, s.cid, s.selectionId, s.memberId, old],
        );
      }
      const locker = await openTx(a.pid);
      await locker.client.query(`SELECT 1 FROM claim_peer_mesh_wa_reminders WHERE ping_id = $1 FOR UPDATE`, [a.pingId]);

      // ⛔ `waitingOn` — SKIP LOCKED must never reach a lock wait at all; a bounded race against a short timer proves it.
      const TIMED_OUT = Symbol('timed out');
      const result = await Promise.race([
        finishLapsedInFlightPeerMeshWaReminders(pool, { now: new Date(), allow: [a.pid, b.pid] }),
        new Promise<typeof TIMED_OUT>((resolve) => setTimeout(() => resolve(TIMED_OUT), 1_000)),
      ]);
      expect(result, 'a locked row must ⛔ stall the whole batch (SKIP LOCKED)').not.toBe(TIMED_OUT);
      expect((result as Awaited<ReturnType<typeof finishLapsedInFlightPeerMeshWaReminders>>).map((r) => r.claimCaseId)).toEqual([b.cid]);

      await locker.commit();
      const after = await finishLapsedInFlightPeerMeshWaReminders(pool, { now: new Date(), allow: [a.pid, b.pid] });
      expect(after.map((r) => r.claimCaseId)).toEqual([a.cid]); // swept once the lock is released — ⛔ stranded
    },
  );
});
