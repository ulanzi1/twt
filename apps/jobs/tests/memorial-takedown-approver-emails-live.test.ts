// The memorial take-down APPROVER EMAIL — the sweep and the child against the live DB (Story 11b.4a, Task 8.3; AC9;
// `2026-10-27-412` MP10 (b) / MP11; ADR-0043). The 6.25 harness's shape: own-committing (the sweep reads COMMITTED rows across
// tenants), an INJECTED clock, a FAKE provider that captures `to`, a capturing queue, a fresh Pariwar per test whose id is the
// sweep's `pariwarAllowlist`. ⭐ REAL envelopes: each approver's address is encrypted under the admin email's Tier-1 context with the
// SAME jobs KMS deps the child decrypts with. Each take-down runs through the REAL domain writer.

import { randomUUID } from 'node:crypto';

import { bindScopedDb, encryption, ids, memorial } from '@twt/domain';
import type { JobEnvelope } from '@twt/queue';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { buildJobsEncryptionDeps } from '../src/deps.js';
import { ClaimCorrectionTransientError } from '../src/scheduler/claim-correction-reminders.js';
import {
  MEMORIAL_TAKEDOWN_APPROVER_EMAIL_QUEUES,
  MEMORIAL_TAKEDOWN_APPROVER_EMAIL_SUBJECT,
  MEMORIAL_TAKEDOWN_APPROVER_EMAIL_TEXT,
  runMemorialTakedownApproverEmailChild,
  runMemorialTakedownApproverEmailSweep,
  type MemorialTakedownApproverEmailDeps,
  type MemorialTakedownApproverEmailPayload,
} from '../src/scheduler/memorial-takedown-approver-emails.js';
import { createFakeStaffEmailClient, type FakeStaffEmailClient } from '../src/scheduler/staff-email-client.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);
const MIN = 60_000;
const enc = buildJobsEncryptionDeps('memorial-takedown-approver-email-live-pepper');

describe.skipIf(!hasDatabase)('Story 11b.4a — the take-down approver email (live DB, own-committing)', { timeout: 60000 }, () => {
  let pool: pg.Pool;
  const pariwars: string[] = [];
  const users: string[] = [];

  beforeAll(() => {
    pool = new pg.Pool({ connectionString: DATABASE_URL, max: 8, ssl: false, connectionTimeoutMillis: 5000 });
    pool.on('error', (err) => console.error('[memorial-takedown-approver-emails-live] idle client error:', err.message));
  });
  afterAll(async () => {
    // ⚠ The memorial tables reference claims / pools with ⛔ no cascade ⇒ delete OUR Pariwars' rows with the FK triggers off.
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      await c.query("SET LOCAL session_replication_role = 'replica'");
      for (const table of [
        'memorial_takedown_approver_emails',
        'memorial_takedown_outcomes',
        'memorial_withdrawals',
        'memorial_takedown_requests',
        'memorial_review_decisions',
        'memorial_submissions',
        'pools',
        'claims',
        'members',
      ]) {
        await c.query(`DELETE FROM ${table} WHERE pariwar_id = ANY($1::uuid[])`, [pariwars]);
      }
      await c.query('DELETE FROM admin_credentials WHERE user_id = ANY($1::uuid[])', [users]);
      await c.query('DELETE FROM users WHERE id = ANY($1::uuid[])', [users]);
      await c.query('COMMIT');
    } catch (e) {
      await c.query('ROLLBACK').catch(() => undefined);
      throw e;
    } finally {
      c.release();
      await pool.end();
    }
  });

  const isolated = (): string => {
    const p = randomUUID();
    pariwars.push(p);
    return p;
  };

  /** A staff user + (optionally) credentials holding a REAL admin-email envelope (`address`: the STORED value — default a unique one). */
  async function approver(o: { status?: 'active' | 'suspended' | 'disabled'; credentials?: boolean; address?: string } = {}): Promise<{ id: string; address: string }> {
    const id = randomUUID();
    users.push(id);
    const address = o.address ?? `approver-${id.slice(0, 8)}@trust.example`;
    await pool.query(`INSERT INTO users (id, identity_type, status, display_name) VALUES ($1, 'admin', $2, 'Panel Member')`, [id, o.status ?? 'active']);
    if (o.credentials !== false) {
      const ct = await encryption.encryptTier1(Buffer.from(address, 'utf-8'), encryption.ADMIN_EMAIL_ENCRYPTION_CONTEXT, enc.kms, enc.kekRef);
      await pool.query(`INSERT INTO admin_credentials (user_id, email_ciphertext, email_blind_index, password_hash) VALUES ($1, $2, $3, 'hash')`, [
        id,
        encryption.serializeEnvelope(ct),
        `bidx-11b4a-live-${id}`,
      ]);
    }
    return { id, address };
  }

  let minute = 0;
  const at = (): Date => new Date(Date.parse('2026-09-01T00:00:00Z') + (minute += 1) * MIN);

  /** A taken-down memorial in `pariwarId` whose versions were approved by `approvers` (oldest first). Returns the request id. */
  async function takenDown(pariwarId: string, approvers: readonly string[], outcome: 'taken_down' | 'kept' = 'taken_down'): Promise<string> {
    const memberId = randomUUID();
    const claimCaseId = randomUUID();
    const poolId = randomUUID();
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      await c.query(`INSERT INTO members (member_id, pariwar_id, state, state_event_version) VALUES ($1, $2, 'active', 1)`, [memberId, pariwarId]);
      await c.query("SET LOCAL app.claim_state_writer = 'on'");
      await c.query(
        `INSERT INTO claims (claim_case_id, pariwar_id, deceased_member_id, intake_channels, current_state, state_event_version)
         VALUES ($1, $2, $3, ARRAY['member_app']::claim_intake_channel[], 'approved', 1)`,
        [claimCaseId, pariwarId, memberId],
      );
      await c.query("SET LOCAL app.pool_state_writer = 'on'");
      await c.query(
        `INSERT INTO pools (pool_id, pariwar_id, cycle_id, claim_case_id, pool_index, pool_canonical_identifier, support_category,
           benefit_mechanism, fixed_amount, current_state, state_event_version, public_token)
         VALUES ($1, $2, $3, $4, 0, $5, 'death_support', 'pool', 500, 'closed', 1, $6)`,
        [poolId, pariwarId, randomUUID(), claimCaseId, `P-2026-09-${poolId.slice(0, 8)}`, `tok-${randomUUID()}`],
      );
      let prev: string | null = null;
      for (const [i, actor] of approvers.entries()) {
        const id = randomUUID();
        await c.query(
          `INSERT INTO memorial_submissions (submission_id, pariwar_id, pool_id, claim_case_id, deceased_member_id, supersedes_submission_id,
             body_ciphertext, authorisation_copy_version, authorisation_locale, handover_recipient, handover_nominee_ref, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, 'enc:v1:body', '2026-10-25.v3-pending-hi-review', 'hi', 'latest', $7, $8)`,
          [id, pariwarId, poolId, claimCaseId, memberId, prev, randomUUID(), at()],
        );
        const action = i < approvers.length - 1 ? 'approved_with_omissions' : 'approved';
        await c.query(
          `INSERT INTO memorial_review_decisions (submission_id, pariwar_id, action, omissions, actor_id, actor_display, decided_at)
           VALUES ($1, $2, $3, $4, $5, 'Panel Member', $6)`,
          [id, pariwarId, action, action === 'approved' ? '[]' : '[{"field":"body","start":0,"end":3,"reason":"against_the_law"}]', actor, at()],
        );
        prev = id;
      }
      const db = bindScopedDb(c);
      const op = ids.userId(randomUUID());
      const req = await memorial.recordMemorialTakedownRequest(db, {
        pariwarId: ids.pariwarId(pariwarId),
        poolId: ids.poolId(poolId),
        shownSubmissionId: prev!, // the version on the page = the newest approved one (R1: the record names it)
        firstContactAt: new Date(Date.now() - 3_600_000),
        actorId: op,
        actorDisplay: 'Helpline Operator',
      });
      if (!req.ok) throw new Error(req.refusal);
      const out = await memorial.decideMemorialTakedown(db, { pariwarId: ids.pariwarId(pariwarId), requestId: req.request.requestId, outcome, actorId: op, actorDisplay: 'Helpline Operator' });
      if (!out.ok) throw new Error(out.refusal);
      await c.query('COMMIT');
      return req.request.requestId;
    } catch (e) {
      await c.query('ROLLBACK').catch(() => undefined);
      throw e;
    } finally {
      c.release();
    }
  }

  interface Harness {
    deps: MemorialTakedownApproverEmailDeps;
    client: FakeStaffEmailClient;
    enqueued: { queue: string; data: JobEnvelope<MemorialTakedownApproverEmailPayload> }[];
    alarms: string[];
    errors: { event: string; fields: Record<string, unknown> }[];
    setNow: (d: Date) => void;
  }
  function harness(allow: readonly string[]): Harness {
    const enqueued: Harness['enqueued'] = [];
    const alarms: string[] = [];
    const errors: Harness['errors'] = [];
    const client = createFakeStaffEmailClient();
    let now = new Date();
    const deps: MemorialTakedownApproverEmailDeps = {
      pool,
      encryption: enc,
      staffEmail: client,
      now: () => now,
      onAlarm: (m) => alarms.push(m),
      onError: (event, fields) => errors.push({ event, fields: { ...fields } }),
      pariwarAllowlist: [...allow],
    };
    return { deps, client, enqueued, alarms, errors, setNow: (d) => (now = d) };
  }
  const boss = (h: Harness) =>
    ({
      send: (queue: string, data: object) => {
        h.enqueued.push({ queue, data: data as JobEnvelope<MemorialTakedownApproverEmailPayload> });
        return Promise.resolve(randomUUID());
      },
    }) as unknown as Parameters<typeof runMemorialTakedownApproverEmailSweep>[1];
  async function sweep(h: Harness) {
    h.enqueued.length = 0;
    return runMemorialTakedownApproverEmailSweep(h.deps, boss(h));
  }
  async function tick(h: Harness) {
    await sweep(h);
    const out = [];
    for (const e of [...h.enqueued]) out.push(await runMemorialTakedownApproverEmailChild(h.deps, e.data, randomUUID()));
    return out;
  }
  async function rowsOf(requestId: string) {
    const { rows } = await pool.query<{ recipient_user_id: string | null; outcome: string; detail: string | null; may_have_sent: boolean }>(
      `SELECT recipient_user_id, outcome, detail, may_have_sent FROM memorial_takedown_approver_emails WHERE request_id = $1 ORDER BY recipient_user_id NULLS FIRST`,
      [requestId],
    );
    return rows;
  }
  async function attemptsOf(requestId: string) {
    const { rows } = await pool.query<{ recipient_user_id: string | null; attempt_count: number; first_detail: string | null; claimed_by_job: string | null }>(
      `SELECT recipient_user_id, attempt_count, first_detail, claimed_by_job FROM memorial_takedown_approver_emails WHERE request_id = $1 ORDER BY recipient_user_id NULLS FIRST`,
      [requestId],
    );
    return rows;
  }
  const envelope = (pariwarId: string, requestId: string, recipientUserId: string | null): JobEnvelope<MemorialTakedownApproverEmailPayload> => ({
    pariwarId,
    requestId: 'r',
    actorId: null,
    traceId: 't',
    payload: { requestId, recipientUserId },
  });

  it('⭐ an eligible approver gets ONE email — the approved text, ⛔ no name or words; a re-run sends ⛔ nothing more; ⛔ no address outside the provider', async () => {
    const P = isolated();
    const a = await approver();
    const r = await takenDown(P, [a.id]);
    const h = harness([P]);
    const logs: string[] = [];
    const spies = (['log', 'info', 'warn', 'error'] as const).map((k) => vi.spyOn(console, k).mockImplementation((...x: unknown[]) => void logs.push(JSON.stringify(x))));
    try {
      expect(await tick(h)).toEqual([{ status: 'sent', outcome: 'accepted' }]);
    } finally {
      for (const s of spies) s.mockRestore();
    }
    expect(h.enqueued[0]?.queue).toBe(MEMORIAL_TAKEDOWN_APPROVER_EMAIL_QUEUES.SEND);
    expect(h.client.sent).toHaveLength(1);
    expect(h.client.sent[0]).toMatchObject({ to: a.address, subject: MEMORIAL_TAKEDOWN_APPROVER_EMAIL_SUBJECT, text: MEMORIAL_TAKEDOWN_APPROVER_EMAIL_TEXT });
    expect(MEMORIAL_TAKEDOWN_APPROVER_EMAIL_TEXT).toBe(
      "A family memorial you approved for a Sahyog Vivran page has been taken down by the helpline at the nominee's request. You do not need to do anything. To see which, open Memorial reviews in the Trust console.",
    );
    expect(await rowsOf(r)).toEqual([{ recipient_user_id: a.id, outcome: 'accepted', detail: null, may_have_sent: false }]);
    expect(JSON.stringify({ enqueued: h.enqueued, alarms: h.alarms, logs, rows: await rowsOf(r) })).not.toContain(a.address);
    // Idempotent re-run.
    expect(await tick(h)).toEqual([]);
    expect(h.client.sent).toHaveLength(1);
  });

  it('⭐ MP10 (b) — TWO approvers of two withdrawn approvals ⇒ TWO rows, TWO emails (each approver once)', async () => {
    const P = isolated();
    const a = await approver();
    const b = await approver();
    const r = await takenDown(P, [a.id, b.id, a.id]);
    const h = harness([P]);
    await tick(h);
    expect(h.client.sent.map((m) => m.to).sort()).toEqual([a.address, b.address].sort());
    expect((await rowsOf(r)).map((x) => [x.recipient_user_id, x.outcome]).sort()).toEqual([[a.id, 'accepted'], [b.id, 'accepted']].sort());
  });

  it('⭐ MP11 — the approver LEFT before selection ⇒ ONE request-level `no_target` row + ONE error line (ids only); ⛔ no substitute; ⛔ never re-derived', async () => {
    const P = isolated();
    const gone = await approver({ status: 'suspended' });
    const r = await takenDown(P, [gone.id]);
    const h = harness([P]);
    expect(await tick(h)).toEqual([{ status: 'no_target' }]);
    expect(await rowsOf(r)).toEqual([{ recipient_user_id: null, outcome: 'no_target', detail: 'no_approver', may_have_sent: false }]);
    expect(h.errors).toEqual([{ event: 'memorial.takedown.approver_unreachable', fields: { pariwarId: P, requestId: r } }]);
    expect(h.client.sent).toEqual([]);
    // ⭐ A request holding the `no_target` row is ⛔ never due again — even once the approver is back.
    await pool.query(`UPDATE users SET status = 'active' WHERE id = $1`, [gone.id]);
    expect(await tick(h)).toEqual([]);
    expect(h.errors).toHaveLength(1);
    expect(h.client.sent).toEqual([]);
  });

  it('a FRESH pair whose approver leaves between the sweep and the child ⇒ `not_due`, ⛔ no row', async () => {
    const P = isolated();
    const a = await approver();
    const r = await takenDown(P, [a.id]);
    const h = harness([P]);
    await sweep(h);
    expect(h.enqueued).toHaveLength(1);
    await pool.query(`UPDATE users SET status = 'disabled' WHERE id = $1`, [a.id]);
    expect(await runMemorialTakedownApproverEmailChild(h.deps, h.enqueued[0]!.data, randomUUID())).toEqual({ status: 'skipped', reason: 'not_due' });
    expect(await rowsOf(r)).toEqual([]);
  });

  it('TRANSIENT — the row stays `attempting` (the detail recorded) and the job throws; its own retry re-claims and sends', async () => {
    const P = isolated();
    const a = await approver();
    const r = await takenDown(P, [a.id]);
    const h = harness([P]);
    await sweep(h);
    const env = h.enqueued[0]!.data;
    h.client.state.respond = () => ({ kind: 'transient', detail: 'transient:ServiceUnavailable', held: false, mayHaveSent: true });
    await expect(runMemorialTakedownApproverEmailChild(h.deps, env, 'job-1')).rejects.toBeInstanceOf(ClaimCorrectionTransientError);
    expect(await rowsOf(r)).toEqual([{ recipient_user_id: a.id, outcome: 'attempting', detail: 'transient:ServiceUnavailable', may_have_sent: true }]);
    h.client.state.respond = () => ({ kind: 'final', outcome: 'accepted', providerMessageId: 'ok-1' });
    expect(await runMemorialTakedownApproverEmailChild(h.deps, env, 'job-1')).toEqual({ status: 'sent', outcome: 'accepted' });
    expect((await rowsOf(r))[0]).toMatchObject({ outcome: 'accepted', may_have_sent: true });
    // ⭐ ANY finish on a may-have-sent row is alarmed (6.25's principle).
    expect(h.alarms.some((m) => m.includes('a prior attempt may have sent'))).toBe(true);
  });

  it('CLAIMED, then the approver leaves ⇒ the next claim past the lease re-checks and finishes the row `error` (alarmed: may have sent)', async () => {
    const P = isolated();
    const a = await approver();
    const r = await takenDown(P, [a.id]);
    const h = harness([P]);
    h.client.state.respond = () => ({ kind: 'transient', detail: 'transient:timeout', held: false, mayHaveSent: true });
    await sweep(h);
    await expect(runMemorialTakedownApproverEmailChild(h.deps, h.enqueued[0]!.data, 'job-1')).rejects.toBeInstanceOf(ClaimCorrectionTransientError);
    await pool.query(`DELETE FROM admin_credentials WHERE user_id = $1`, [a.id]);
    h.setNow(new Date(Date.now() + 31 * MIN));
    expect(await runMemorialTakedownApproverEmailChild(h.deps, envelope(P, r, a.id), 'job-2')).toEqual({ status: 'skipped', reason: 'recheck_failed' });
    expect(await rowsOf(r)).toEqual([{ recipient_user_id: a.id, outcome: 'error', detail: 'exhausted:recheck_recipient_not_eligible', may_have_sent: true }]);
    expect(h.alarms.some((m) => m.includes('a prior attempt may have sent'))).toBe(true);
  });

  it('HELD — a config gap holds every pair: ⛔ nothing enqueued, ⛔ no row written, ONE alarm; once fixed, the email goes', async () => {
    const P = isolated();
    const a = await approver();
    const r = await takenDown(P, [a.id]);
    const h = harness([P]);
    h.client.state.gap = 'config:provider_unset';
    const held = await sweep(h);
    expect(held).toMatchObject({ heldForConfig: 1, enqueued: 0 });
    expect(await rowsOf(r)).toEqual([]);
    expect(h.alarms.filter((m) => m.includes('HELD'))).toHaveLength(1);
    // The child's race guard holds too — ⛔ no row, ⛔ no decrypt.
    expect(await runMemorialTakedownApproverEmailChild(h.deps, envelope(P, r, a.id), 'j')).toEqual({ status: 'held_config', reason: 'config:provider_unset' });
    h.client.state.gap = null;
    expect(await tick(h)).toEqual([{ status: 'sent', outcome: 'accepted' }]);
  });

  it('a `kept` request emails ⛔ nobody', async () => {
    const P = isolated();
    const a = await approver();
    const r = await takenDown(P, [a.id], 'kept');
    const h = harness([P]);
    expect(await tick(h)).toEqual([]);
    expect(await rowsOf(r)).toEqual([]);
  });

  // ── R2 — the gate is PER (request, recipient): a sweep that stops between two approvers loses ⛔ neither ───────────────────────

  it('⭐ R2 — a sweep that STOPS between two approvers of one request (the pair bound, the budget) ⇒ the next tick emails the rest: each approver exactly once, ⛔ a third email', async () => {
    for (const stop of ['pairs', 'budget'] as const) {
      const P = isolated();
      const a = await approver();
      const b = await approver();
      const r = await takenDown(P, [a.id, b.id]);
      const h = harness([P]);
      const full = h.deps;
      let t = 0;
      h.deps = stop === 'pairs' ? { ...full, maxPairs: 1 } : { ...full, sweepBudgetMs: 1000, elapsedClockMs: () => (t += 600) };
      const first = await tick(h);
      expect(first, stop).toEqual([{ status: 'sent', outcome: 'accepted' }]);
      expect(h.alarms.some((m) => m.includes(stop === 'pairs' ? 'hard bound of 1 pairs' : 'ran out of its') && m.includes('the rest wait for the next tick')), stop).toBe(true);
      expect(h.client.sent, stop).toHaveLength(1);
      expect(await rowsOf(r), stop).toHaveLength(1);
      // The next, UNBOUNDED tick derives the sibling — ⭐ the old "any row hides the request" rule never did.
      h.deps = full;
      expect(await tick(h), stop).toEqual([{ status: 'sent', outcome: 'accepted' }]);
      expect(h.client.sent.map((m) => m.to).sort(), stop).toEqual([a.address, b.address].sort());
      expect((await rowsOf(r)).map((x) => [x.recipient_user_id, x.outcome]).sort(), stop).toEqual([[a.id, 'accepted'], [b.id, 'accepted']].sort());
      // ⛔ A third email: both pairs hold a row.
      expect(await tick(h), stop).toEqual([]);
      expect(h.client.sent, stop).toHaveLength(2);
    }
  });

  it('⭐ a MIXED pair — one approver reachable, one left ⇒ the reachable one is emailed ONCE; ⛔ a `no_target` row, ⛔ the unreachable-approver line, ⛔ a row for the one who left', async () => {
    const P = isolated();
    const a = await approver();
    const gone = await approver({ status: 'suspended' });
    const r = await takenDown(P, [gone.id, a.id]);
    const h = harness([P]);
    expect(await tick(h)).toEqual([{ status: 'sent', outcome: 'accepted' }]);
    expect(h.client.sent.map((m) => m.to)).toEqual([a.address]);
    expect(await rowsOf(r)).toEqual([{ recipient_user_id: a.id, outcome: 'accepted', detail: null, may_have_sent: false }]);
    expect(h.errors).toEqual([]);
    expect(await tick(h)).toEqual([]);
  });

  // ── Once ever, at-least-once recorded (6.25's AC4, on this outbox) ────────────────────────────────────────────────────────

  it('⭐ N concurrent children for ONE pair ⇒ ONE send, ONE `accepted` row (attempt 1)', async () => {
    const P = isolated();
    const a = await approver();
    const r = await takenDown(P, [a.id]);
    const h = harness([P]);
    const results = await Promise.all(Array.from({ length: 4 }, () => runMemorialTakedownApproverEmailChild(h.deps, envelope(P, r, a.id), randomUUID())));
    expect(results.filter((x) => x.status === 'sent')).toHaveLength(1);
    expect(results.filter((x) => x.status === 'skipped')).toHaveLength(3);
    expect(h.client.sent).toHaveLength(1);
    expect(await rowsOf(r)).toEqual([{ recipient_user_id: a.id, outcome: 'accepted', detail: null, may_have_sent: false }]);
    expect(await attemptsOf(r)).toMatchObject([{ attempt_count: 1 }]);
  });

  it('a crash-left `attempting` row past the 30-min lease is re-claimed by the next sweep (attempt 2, first_detail kept); within it ⇒ held_by_other', async () => {
    const P = isolated();
    const a = await approver();
    const r = await takenDown(P, [a.id]);
    const h = harness([P]);
    const now = new Date();
    h.setNow(now);
    await pool.query(
      `INSERT INTO memorial_takedown_approver_emails (pariwar_id, request_id, recipient_user_id, outcome, claimed_at, claimed_by_job, detail)
       VALUES ($1, $2, $3, 'attempting', $4, 'crashed', 'transient:TooManyRequestsException')`,
      [P, r, a.id, new Date(now.getTime() - memorial.MEMORIAL_TAKEDOWN_APPROVER_EMAIL_LEASE_MS + MIN)],
    );
    expect(await tick(h)).toEqual([{ status: 'skipped', reason: 'held_by_other' }]);
    expect(h.client.sent).toEqual([]);
    h.setNow(new Date(now.getTime() + 2 * MIN));
    expect(await tick(h)).toEqual([{ status: 'sent', outcome: 'accepted' }]);
    expect(await rowsOf(r)).toEqual([{ recipient_user_id: a.id, outcome: 'accepted', detail: null, may_have_sent: false }]);
    expect(await attemptsOf(r)).toMatchObject([{ attempt_count: 2, first_detail: 'transient:TooManyRequestsException' }]);
    expect(h.client.sent).toHaveLength(1);
    expect(h.alarms.filter((m) => m.includes('may have sent'))).toEqual([]);
  });

  it('⭐ the give-up — an `attempting` row past 3 IST days AND the lease ⇒ `error` + ONE alarm "may have sent"; a row inside the lease is ⛔ given up', async () => {
    const P = isolated();
    const [old, live] = [await approver(), await approver()];
    const r = await takenDown(P, [old.id, live.id]);
    const h = harness([P]);
    const now = new Date();
    h.setNow(now);
    const created = new Date(memorial.memorialTakedownApproverEmailReclaimCutoff(now).getTime() - MIN);
    await pool.query(
      `INSERT INTO memorial_takedown_approver_emails (pariwar_id, request_id, recipient_user_id, outcome, claimed_at, claimed_by_job, created_at, detail, aging_since)
       VALUES ($1, $2, $3, 'attempting', $4, 'old', $6, 'held:SendingPausedException', $6),
              ($1, $2, $5, 'attempting', $7, 'live', $6, 'held:SendingPausedException', $6)`,
      [P, r, old.id, new Date(now.getTime() - memorial.MEMORIAL_TAKEDOWN_APPROVER_EMAIL_LEASE_MS - MIN), live.id, created, new Date(now.getTime() - MIN)],
    );
    expect(await sweep(h)).toMatchObject({ finalisedStuck: 1 });
    const rows = await rowsOf(r);
    expect(rows.find((x) => x.recipient_user_id === old.id)).toMatchObject({ outcome: 'error', detail: 'exhausted:attempting_three_days', may_have_sent: true });
    expect(rows.find((x) => x.recipient_user_id === live.id)).toMatchObject({ outcome: 'attempting' });
    expect(h.alarms.filter((m) => m.includes('gave up') && m.includes('may have sent'))).toHaveLength(1);
    expect(h.client.sent).toEqual([]);
  });

  it('⭐ a HOLD past the give-up horizon ⇒ the in-flight row is PARKED, ⛔ given up; fixed ⇒ re-claimed AT ONCE and sent', async () => {
    const P = isolated();
    const a = await approver();
    const r = await takenDown(P, [a.id]);
    const h = harness([P]);
    const now = new Date();
    h.setNow(now);
    // A row in flight since BEFORE the give-up horizon whose child is gone (a held fault, then the channel went down).
    await pool.query(
      `INSERT INTO memorial_takedown_approver_emails (pariwar_id, request_id, recipient_user_id, outcome, claimed_at, claimed_by_job, created_at, detail, aging_since)
       VALUES ($1, $2, $3, 'attempting', $4, 'gone', $5, 'held:SendingPausedException', $5)`,
      [P, r, a.id, new Date(now.getTime() - 2 * memorial.MEMORIAL_TAKEDOWN_APPROVER_EMAIL_LEASE_MS), new Date(memorial.memorialTakedownApproverEmailReclaimCutoff(now).getTime() - MIN)],
    );
    h.client.state.preflight = { ok: false, detail: 'preflight:sending_disabled' };
    await tick(h);
    expect(await rowsOf(r)).toMatchObject([{ outcome: 'attempting', detail: 'held:SendingPausedException' }]);
    expect(await attemptsOf(r)).toMatchObject([{ claimed_by_job: memorial.MEMORIAL_TAKEDOWN_APPROVER_EMAIL_PARKED_BY }]);
    expect(h.alarms.filter((m) => m.includes('gave up'))).toEqual([]);
    expect(h.alarms.filter((m) => m.includes('HELD'))).toEqual([expect.stringContaining('1 in-flight row(s) newly parked')]);
    // Still held a day later ⇒ still parked, still ⛔ given up (⛔ re-parked — the alarm counts only NEW parks).
    h.setNow(new Date(now.getTime() + 24 * 60 * MIN));
    h.alarms.length = 0;
    await tick(h);
    expect(await attemptsOf(r)).toMatchObject([{ claimed_by_job: memorial.MEMORIAL_TAKEDOWN_APPROVER_EMAIL_PARKED_BY }]);
    expect(h.alarms.filter((m) => m.includes('gave up'))).toEqual([]);
    expect(h.alarms.filter((m) => m.includes('HELD'))).toEqual([expect.stringContaining('0 in-flight row(s) newly parked')]);
    // Fixed ⇒ the very next tick re-claims the parked row (⛔ lease wait) and sends.
    h.client.state.preflight = { ok: true };
    h.setNow(new Date(now.getTime() + 24 * 60 * MIN + 15 * MIN));
    await tick(h);
    expect(h.client.sent.map((m) => m.to)).toEqual([a.address]);
    expect(await rowsOf(r)).toEqual([{ recipient_user_id: a.id, outcome: 'accepted', detail: null, may_have_sent: false }]);
    expect(await attemptsOf(r)).toMatchObject([{ attempt_count: 2, first_detail: 'held:SendingPausedException' }]);
    expect(h.alarms.filter((m) => m.includes('gave up'))).toEqual([]);
  });

  // ── The terminal and the pre-call classes ─────────────────────────────────────────────────────────────────────────────────

  it('a provider `rejected` (a recorded recipient-specific name) ⇒ the ONLY final failure: `rejected` + ONE alarm; ⛔ re-derived', async () => {
    const P = isolated();
    const a = await approver();
    const r = await takenDown(P, [a.id]);
    const h = harness([P]);
    h.client.state.respond = () => ({ kind: 'final', outcome: 'rejected', detail: 'rejected:400:TM_4001.SM_113' });
    expect(await tick(h)).toEqual([{ status: 'sent', outcome: 'rejected' }]);
    expect(await rowsOf(r)).toEqual([{ recipient_user_id: a.id, outcome: 'rejected', detail: 'rejected:400:TM_4001.SM_113', may_have_sent: false }]);
    expect(h.alarms.filter((m) => m.includes('REJECTED') && m.includes(r))).toHaveLength(1);
    expect(await tick(h)).toEqual([]);
    expect(h.client.sent).toHaveLength(1);
  });

  it('⭐ ⛔ address after `begun` ⇒ `error` / `error:no_address` | `error:invalid_address` + alarm; ⛔ an address in rows, alarms or logs', async () => {
    const logs: string[] = [];
    const spies = (['log', 'info', 'warn', 'error'] as const).map((k) => vi.spyOn(console, k).mockImplementation((...x: unknown[]) => void logs.push(JSON.stringify(x))));
    // (`h.errors` is the `onError` sink, which the sweep feeds ONLY for a `no_target` request — empty here, so collecting it would prove nothing.)
    const seen: { alarms: string[]; rows: unknown[] } = { alarms: [], rows: [] };
    try {
      for (const [address, d] of [['   ', 'error:no_address'], ['x"<approver.leak@trust.example>', 'error:invalid_address']] as const) {
        const P = isolated();
        const x = await approver({ address });
        const r = await takenDown(P, [x.id]);
        const h = harness([P]);
        expect(await tick(h), d).toEqual([{ status: 'error', detail: d }]);
        expect(await rowsOf(r), d).toEqual([{ recipient_user_id: x.id, outcome: 'error', detail: d, may_have_sent: false }]);
        expect(h.alarms.filter((m) => m.includes(r) && m.includes(d)), d).toHaveLength(1);
        expect(h.client.sent, d).toEqual([]);
        // A final `error` is ⛔ re-derived.
        expect(await tick(h), d).toEqual([]);
        seen.alarms.push(...h.alarms);
        seen.rows.push(...(await rowsOf(r)));
      }
    } finally {
      for (const s of spies) s.mockRestore();
    }
    expect(JSON.stringify({ ...seen, logs })).not.toContain('approver.leak');
  });

  it('⭐ a DECRYPT failure (before the provider call) stays `attempting`, is alarmed ONCE across two attempts, ⛔ may-have-sent; repaired ⇒ the same job sends', async () => {
    const P = isolated();
    const a = await approver();
    const r = await takenDown(P, [a.id]);
    const h = harness([P]);
    const job = 'job-own';
    await pool.query(`UPDATE admin_credentials SET email_ciphertext = 'enc:v1:not-an-envelope' WHERE user_id = $1`, [a.id]);
    for (let i = 0; i < 2; i += 1) {
      await sweep(h);
      await expect(runMemorialTakedownApproverEmailChild(h.deps, h.enqueued[0]!.data, job)).rejects.toBeInstanceOf(ClaimCorrectionTransientError);
    }
    expect(await rowsOf(r)).toEqual([{ recipient_user_id: a.id, outcome: 'attempting', detail: 'transient:decrypt_failed', may_have_sent: false }]);
    // A decrypt failure can be DETERMINISTIC (a wrong KEK) ⇒ alarmed like a HELD fault: ONCE across the two attempts.
    expect(h.alarms.filter((m) => m.includes(r) && m.includes('transient:decrypt_failed'))).toHaveLength(1);
    expect(h.client.sent).toEqual([]);
    const ct = await encryption.encryptTier1(Buffer.from(a.address, 'utf-8'), encryption.ADMIN_EMAIL_ENCRYPTION_CONTEXT, enc.kms, enc.kekRef);
    await pool.query(`UPDATE admin_credentials SET email_ciphertext = $2 WHERE user_id = $1`, [a.id, encryption.serializeEnvelope(ct)]);
    expect(await runMemorialTakedownApproverEmailChild(h.deps, h.enqueued[0]!.data, job)).toEqual({ status: 'sent', outcome: 'accepted' });
    expect(await rowsOf(r)).toEqual([{ recipient_user_id: a.id, outcome: 'accepted', detail: null, may_have_sent: false }]);
    expect(h.alarms.filter((m) => m.includes(r) && m.includes('may have sent'))).toEqual([]);
  });

  it('a Q2 READ failure (a DB blip) stays `attempting` (`transient:read_failed`) and is ⛔ alarmed — a read that failed has not been a held fault', async () => {
    const P = isolated();
    const a = await approver();
    const r = await takenDown(P, [a.id]);
    const h = harness([P]);
    await sweep(h);
    const env = h.enqueued[0]!.data;
    // Q2's read fails — a pool whose clients reject that ONE statement (restored on release). 6.25's wrapper, as it stands.
    const failing = Object.create(pool) as pg.Pool;
    // ⚠ The child reaches the DB through `connect` only (withPariwarScope); a `pool.query` path would bypass the wrapper — fail LOUDLY.
    (failing as { query: unknown }).query = () => Promise.reject(new Error('the failing-pool wrapper only supports connect()'));
    failing.connect = (async () => {
      const c = await pool.connect();
      const realQuery = c.query.bind(c);
      const realRelease = c.release.bind(c);
      (c as { query: unknown }).query = (q: unknown, ...rest: unknown[]) => {
        const text = typeof q === 'string' ? q : ((q as { text?: string } | null)?.text ?? '');
        return text.includes('se_q2.email_ciphertext') ? Promise.reject(new Error('read failed (test)')) : (realQuery as (...a: unknown[]) => unknown)(q, ...rest);
      };
      (c as { release: unknown }).release = (...a: unknown[]) => {
        (c as { query: unknown }).query = realQuery;
        (c as { release: unknown }).release = realRelease;
        return (realRelease as (...x: unknown[]) => void)(...a);
      };
      return c;
    }) as never;
    const alarmsBefore = h.alarms.length;
    for (let i = 0; i < 2; i += 1) {
      await expect(runMemorialTakedownApproverEmailChild({ ...h.deps, pool: failing }, env, 'job-q')).rejects.toBeInstanceOf(ClaimCorrectionTransientError);
    }
    expect(await rowsOf(r)).toEqual([{ recipient_user_id: a.id, outcome: 'attempting', detail: 'transient:read_failed', may_have_sent: false }]);
    expect(h.alarms.slice(alarmsBefore)).toEqual([]); // ⛔ alarm of ANY shape for a read failure
    expect(h.client.sent).toEqual([]);
  });
});
