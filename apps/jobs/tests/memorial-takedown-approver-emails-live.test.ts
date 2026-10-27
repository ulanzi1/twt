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

  /** A staff user + (optionally) credentials holding a REAL admin-email envelope. */
  async function approver(o: { status?: 'active' | 'suspended' | 'disabled'; credentials?: boolean } = {}): Promise<{ id: string; address: string }> {
    const id = randomUUID();
    users.push(id);
    const address = `approver-${id.slice(0, 8)}@trust.example`;
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
    // ⭐ A request holding ANY row is ⛔ never due again — even once the approver is back.
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
});
