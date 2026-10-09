// The STAFF EMAIL — the 15-minute sweep and the email child against the live DB (Story 6.25, Task 5.2; AC1–AC7; `2026-10-09-299`
// RE1–RE7, RE5-bis, RE10–RE12). Own-committing (the sweep reads COMMITTED rows across tenants), an INJECTED clock, a FAKE provider
// that captures `to`, a capturing queue. ⭐ ISOLATED: every test runs in a Pariwar of its OWN (`isolated()`) and every sweep's
// `pariwarAllowlist` is that Pariwar — a held pair writes ⛔ row, so it would stay due for every later sweep of a shared Pariwar.
// ⭐ REAL envelopes: each admin's address is encrypted under the admin email's Tier-1 context (`encryption.ADMIN_EMAIL_ENCRYPTION_
// CONTEXT`, the API's write context — the cross-check test in apps/api pins the two equal) with the SAME jobs KMS deps the child
// decrypts with. Every grant and decision instant is EXPLICIT, each in its OWN committed transaction
// ([[project_db_clock_ordering_tests_tie]]). Assertions key on OUR ids (membership, ⛔ counts of shared tables).
//
// ⚠ The world helpers are COPIED from `claim-suspicion-notices-live.test.ts` (they are closures there — Task 5.2's recommended
// option), cut down to what a refusal needs here (⛔ nominee versions, ⛔ KYC names, ⛔ determinations).

import { randomUUID } from 'node:crypto';

import { claim, encryption, ids } from '@twt/domain';
import { QUEUE_NAMES, type JobEnvelope } from '@twt/queue';
import pg from 'pg';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { buildJobsEncryptionDeps } from '../src/deps.js';
import { CLAIM_CORRECTION_TZ, CORRECTION_SWEEP_RETRY, ClaimCorrectionTransientError } from '../src/scheduler/claim-correction-reminders.js';
import {
  STAFF_EMAIL_SWEEP_BUDGET_MS,
  STAFF_EMAIL_SWEEP_CRON,
  STAFF_EMAIL_SWEEP_EXPIRE_SECONDS,
  registerClaimSuspicionStaffEmailWorkers,
  runSuspicionStaffEmailChild,
  runSuspicionStaffEmailSweep,
  type ClaimSuspicionStaffEmailDeps,
  type SuspicionStaffEmailPayload,
} from '../src/scheduler/claim-suspicion-staff-emails.js';
import { createFakeStaffEmailClient, type FakeStaffEmailClient, type StaffEmailSendResult } from '../src/scheduler/staff-email-client.js';
import { cleanupClaims, onOwnTx } from './_claim-correction-seed.js';

// ⭐ Round 4 — a switch to make the REAL template renderer throw (a deterministic `render_failed`); OFF ⇒ the real renderer.
const renderSwitch = vi.hoisted(() => ({ fail: false }));
vi.mock('../src/scheduler/suspicion-staff-email-templates.js', async (importActual) => {
  const actual = await importActual<typeof import('../src/scheduler/suspicion-staff-email-templates.js')>();
  return {
    ...actual,
    renderSuspicionStaffEmail: (p: Parameters<typeof actual.renderSuspicionStaffEmail>[0]) => {
      if (renderSwitch.fail) throw new Error('render failed (test switch)');
      return actual.renderSuspicionStaffEmail(p);
    },
  };
});

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);
const ORIGIN = 'https://admin.twt.example';
const DA = 'd2d2d2d2-0000-4000-8000-0000000000da';
const MIN = 60_000;
const SEND_QUEUE = QUEUE_NAMES.CLAIM_SUSPICION_STAFF_EMAIL_SEND;
/** The refusal instant the freeze legs are measured against. */
const REFUSED_AT = new Date('2026-09-01T06:00:00.000Z');
const BEFORE = new Date(REFUSED_AT.getTime() - 60 * MIN);
const AFTER = new Date(REFUSED_AT.getTime() + 60 * MIN);
const enc = buildJobsEncryptionDeps('claim-suspicion-staff-email-live-pepper');

describe.skipIf(!hasDatabase)('Story 6.25 — the staff email (live DB, own-committing)', { timeout: 60000 }, () => {
  let pool: pg.Pool;
  const claims: string[] = [];
  const members: string[] = [];
  const users: string[] = [];
  /** The current claim whose row-lock the KMS probe checks (AC7 — the decrypt happens AFTER the claiming commit). */
  const probe = { claim: null as { pariwarId: string; claimCaseId: string } | null, violations: [] as string[] };
  let probedEnc: encryption.FieldCryptoDeps;

  beforeAll(() => {
    pool = new pg.Pool({ connectionString: DATABASE_URL, max: 10, ssl: false, connectionTimeoutMillis: 5000 });
    pool.on('error', (err) => console.error('[claim-suspicion-staff-emails-live] idle client error:', err.message));
    // ⭐ AC7 — a KMS fake that, BEFORE every decrypt, tries to take the claim row on a SEPARATE connection with NOWAIT: a 55P03
    // means the claiming transaction still holds it ⇒ a decrypt under the lock ⇒ recorded (and the decrypt refused).
    probedEnc = {
      ...enc,
      kms: {
        ...enc.kms,
        encryptDek: enc.kms.encryptDek.bind(enc.kms),
        computeHmac: enc.kms.computeHmac.bind(enc.kms),
        decryptDek: async (dek, kekRef, aad) => {
          const c = probe.claim;
          if (c !== null) {
            const client = await pool.connect();
            try {
              await client.query('BEGIN');
              await client.query('SELECT 1 FROM claims WHERE pariwar_id = $1 AND claim_case_id = $2 FOR UPDATE NOWAIT', [c.pariwarId, c.claimCaseId]);
            } catch (e) {
              if ((e as { code?: string }).code === '55P03') {
                probe.violations.push(c.claimCaseId);
                throw new Error('decrypt under the claim-row lock');
              }
              throw e;
            } finally {
              await client.query('ROLLBACK').catch(() => undefined);
              client.release();
            }
          }
          return enc.kms.decryptDek(dek, kekRef, aad);
        },
      },
    };
  });
  afterEach(() => {
    probe.claim = null;
  });
  afterAll(async () => {
    try {
      await cleanupClaims(pool, claims, members, { userIds: users });
    } finally {
      await pool.end();
    }
  });

  // ── the world ───────────────────────────────────────────────────────────────────────────────────────────────────────────

  const isolated = (): string => randomUUID();

  /** A claim of a fresh death driven (events) to `verifier_review`. */
  async function claimOf(pariwarId: string): Promise<string> {
    const cid = ids.claimId(randomUUID());
    const mid = ids.memberId(randomUUID());
    claims.push(cid);
    members.push(mid);
    await onOwnTx(pool, pariwarId, async (client) => {
      await client.query(`INSERT INTO members (member_id, pariwar_id, state, state_event_version) VALUES ($1, $2, 'active', 1)`, [mid, pariwarId]);
      const emit = (from: string | null, next: string, eventType: string, extra: Record<string, unknown> = {}) =>
        claim.projectClaimState(client, {
          claimCaseId: cid,
          pariwarId: ids.pariwarId(pariwarId),
          deceasedMemberId: mid,
          intakeChannels: ['member_app'],
          claimantActorId: null,
          eventType: eventType as never,
          payload: { from_state: from, to_state: next, trigger: 'test', actor: 'system', ...extra } as never,
          actorId: null,
        });
      await emit(null, 'intake_pending', 'claim.intake_initiated', { deceased_member_id: mid, intake_channel: 'member_app', claimant_actor_id: null });
      await emit('intake_pending', 'intake_converged', 'claim.intake_converged');
      await emit('intake_converged', 'documents_pending', 'claim.documents_received');
      await emit('documents_pending', 'verification_in_progress', 'claim.peer_mesh_pinged', { selected_member_ids: [randomUUID()], metric_id: 'district_cohort_v1', metric_version: 1 });
      await emit('verification_in_progress', 'verifier_review', 'claim.verifier_reviewing');
    });
    return cid;
  }

  /** Refuse `cid` (`-239` unless `reason`) at `decidedAt` (EXPLICIT) — the projector + its LIVE decision row. */
  async function refuse(pariwarId: string, cid: string, o: { reason?: string; decidedAt?: Date } = {}): Promise<void> {
    await onOwnTx(pool, pariwarId, async (client) => {
      const { rows } = await client.query<{ deceased_member_id: string }>(`SELECT deceased_member_id FROM claims WHERE claim_case_id = $1`, [cid]);
      await claim.projectClaimState(client, {
        claimCaseId: ids.claimId(cid), pariwarId: ids.pariwarId(pariwarId), deceasedMemberId: ids.memberId(rows[0]!.deceased_member_id),
        intakeChannels: ['member_app'], claimantActorId: null, eventType: 'claim.verifier_denied',
        payload: { from_state: 'verifier_review', to_state: 'denied', trigger: 'test', actor: 'operator' } as never, actorId: DA,
      });
      await client.query(
        `INSERT INTO claim_verifier_decisions (claim_case_id, pariwar_id, outcome, reason_code, rationale_ciphertext, actor_id, actor_display, decided_at)
         VALUES ($1, $2, 'denied', $3, 'enc:v1:r', 'da', 'Anita (District Admin)', $4)`,
        [cid, pariwarId, o.reason ?? 'post_death_nominee_change', o.decidedAt ?? REFUSED_AT],
      );
    });
  }

  /** A refused claim in `pariwarId`. */
  async function refused(pariwarId: string, o: { reason?: string; decidedAt?: Date } = {}): Promise<string> {
    const cid = await claimOf(pariwarId);
    await refuse(pariwarId, cid, o);
    return cid;
  }

  /** Revise the live decision to `reason` at `at` (EXPLICIT) — supersede + a new live row (a note-only one keeps the reason). */
  async function revise(pariwarId: string, cid: string, reason: string, at: Date): Promise<void> {
    await onOwnTx(pool, pariwarId, async (client) => {
      const { rows } = await client.query<{ decision_id: string }>(
        `UPDATE claim_verifier_decisions SET superseded_at = $2 WHERE claim_case_id = $1 AND superseded_at IS NULL RETURNING decision_id`,
        [cid, at],
      );
      await client.query(
        `INSERT INTO claim_verifier_decisions (claim_case_id, pariwar_id, outcome, reason_code, rationale_ciphertext, actor_id, actor_display, supersedes_decision_id, decided_at)
         VALUES ($1, $2, 'denied', $3, 'enc:v1:r2', 'da', 'Anita (District Admin)', $4, $5)`,
        [cid, pariwarId, reason, rows[0]!.decision_id, at],
      );
    });
  }

  async function openAppeal(pariwarId: string, cid: string): Promise<void> {
    await onOwnTx(pool, pariwarId, (client) =>
      claim.initiateAppeal(client, { claimCaseId: ids.claimId(cid), pariwarId: ids.pariwarId(pariwarId), initiatedByActor: randomUUID(), initiatedOnBehalf: true, actor: 'operator' }),
    );
  }

  async function reverseAppeal(pariwarId: string, cid: string): Promise<void> {
    await openAppeal(pariwarId, cid);
    await onOwnTx(pool, pariwarId, (client) =>
      claim.reviewAppealStage1(client, {
        claimCaseId: ids.claimId(cid), pariwarId: ids.pariwarId(pariwarId), decision: 'reversed', dispositionCategory: 'reconsideration_on_merits',
        reviewerActorId: randomUUID(), reviewerDisplay: 'Another District Admin', rationaleCiphertext: claim.prepareAppealCiphertext('enc:v1:appeal'), actor: 'operator',
      }),
    );
  }

  /** Close `cid` directly (the projector's guard) — RF1 says a `closed` claim ⛔ stands. */
  async function close(pariwarId: string, cid: string): Promise<void> {
    await onOwnTx(pool, pariwarId, async (client) => {
      await client.query("SET LOCAL app.claim_state_writer = 'on'");
      await client.query(`UPDATE claims SET current_state = 'closed' WHERE claim_case_id = $1`, [cid]);
      await client.query("SET LOCAL app.claim_state_writer = 'off'");
    });
  }

  interface AdminOpts {
    readonly grantedAt?: Date;
    readonly status?: 'active' | 'suspended' | 'disabled';
    readonly credentials?: boolean;
    readonly role?: string;
    readonly scopeDimension?: string;
    readonly scopeValue?: string | null;
    readonly displayName?: string | null;
    /** The stored (encrypted) address — default a unique one. */
    readonly address?: string;
  }

  /** A staff user + ONE role grant (EXPLICIT `created_at`) + credentials with a REAL admin-email envelope. Own committed txs. */
  async function admin(pariwarId: string, o: AdminOpts = {}): Promise<{ id: string; address: string }> {
    const id = randomUUID();
    users.push(id);
    const address = o.address ?? `admin-${id.slice(0, 8)}@pariwar.example`;
    await pool.query(`INSERT INTO users (id, identity_type, status, display_name) VALUES ($1, 'admin', $2, $3)`, [
      id,
      o.status ?? 'active',
      o.displayName === undefined ? 'Priya (Pariwar Admin)' : o.displayName,
    ]);
    await pool.query(
      `INSERT INTO role_grants (user_id, pariwar_id, role, scope_dimension, scope_value, created_at)
       VALUES ($1, $2::uuid, $3, $4::scope_dimension, $5, $6)`,
      [id, pariwarId, o.role ?? 'pariwar_admin', o.scopeDimension ?? 'pariwar', o.scopeValue === undefined ? pariwarId : o.scopeValue, o.grantedAt ?? BEFORE],
    );
    if (o.credentials !== false) {
      const ct = await encryption.encryptTier1(Buffer.from(address, 'utf-8'), encryption.ADMIN_EMAIL_ENCRYPTION_CONTEXT, enc.kms, enc.kekRef);
      await pool.query(
        `INSERT INTO admin_credentials (user_id, email_ciphertext, email_blind_index, password_hash) VALUES ($1, $2, $3, 'hash')`,
        [id, encryption.serializeEnvelope(ct), `bidx-6-25-live-${id}`],
      );
    }
    return { id, address };
  }

  // ── the harness ─────────────────────────────────────────────────────────────────────────────────────────────────────────

  interface Harness {
    deps: ClaimSuspicionStaffEmailDeps;
    client: FakeStaffEmailClient;
    enqueued: { queue: string; data: JobEnvelope<SuspicionStaffEmailPayload> }[];
    alarms: string[];
    setNow: (d: Date) => void;
    origin: { value: string | undefined };
  }

  function harness(allow: readonly string[]): Harness {
    const enqueued: Harness['enqueued'] = [];
    const alarms: string[] = [];
    const client = createFakeStaffEmailClient();
    const origin = { value: ORIGIN as string | undefined };
    let now = new Date();
    const deps: ClaimSuspicionStaffEmailDeps = {
      pool,
      encryption: probedEnc,
      staffEmail: client,
      get adminAppOrigin() {
        return origin.value;
      },
      now: () => now,
      onAlarm: (m) => alarms.push(m),
      pariwarAllowlist: [...allow],
    };
    return { deps, client, enqueued, alarms, origin, setNow: (d) => (now = d) };
  }
  const boss = (h: Harness) =>
    ({
      send: (queue: string, data: object) => {
        h.enqueued.push({ queue, data: data as JobEnvelope<SuspicionStaffEmailPayload> });
        return Promise.resolve(randomUUID());
      },
    }) as unknown as Parameters<typeof runSuspicionStaffEmailSweep>[1];

  /** Sweep, then run every enqueued child (each a fresh job id). Returns the child results. */
  async function tick(h: Harness) {
    h.enqueued.length = 0;
    await runSuspicionStaffEmailSweep(h.deps, boss(h));
    const out = [];
    for (const e of [...h.enqueued]) {
      probe.claim = { pariwarId: e.data.pariwarId!, claimCaseId: e.data.payload.claimCaseId };
      out.push({ payload: e.data.payload, result: await runSuspicionStaffEmailChild(h.deps, e.data, randomUUID()) });
    }
    probe.claim = null;
    return out;
  }
  const envelope = (pariwarId: string, claimCaseId: string, recipientUserId: string | null): JobEnvelope<SuspicionStaffEmailPayload> => ({
    pariwarId, requestId: 'r', actorId: null, traceId: 't', payload: { claimCaseId, recipientUserId },
  });
  async function rowsOf(cid: string) {
    const { rows } = await pool.query<{
      notice_id: string; recipient_user_id: string | null; outcome: string; detail: string | null; first_detail: string | null;
      attempt_count: number; may_have_sent: boolean; provider_message_id: string | null; claimed_by_job: string | null;
    }>(
      `SELECT notice_id, recipient_user_id, outcome, detail, first_detail, attempt_count, may_have_sent, provider_message_id, claimed_by_job
         FROM claim_suspicion_staff_emails WHERE claim_case_id = $1 ORDER BY recipient_user_id NULLS FIRST`,
      [cid],
    );
    return rows;
  }
  const sentTo = (h: Harness) => h.client.sent.map((m) => m.to).sort();

  // ── AC1 / AC3 / AC7 — who, what, and ⛔ plaintext anywhere ─────────────────────────────────────────────────────────────────

  it('⭐ every eligible Pariwar Admin (a blank name INCLUDED) gets ONE email — Hindi then English, the list link only; ⛔ the excluded; ⛔ plaintext address anywhere but the provider', async () => {
    const P = isolated();
    const Q = isolated();
    const c = await refused(P);
    const named = await admin(P);
    const blank = await admin(P, { displayName: '  ' });
    const excluded = [
      await admin(P, { role: 'super_admin', scopeDimension: 'global', scopeValue: null }),
      await admin(P, { scopeDimension: 'district', scopeValue: 'Patna' }),
      await admin(P, { scopeValue: null }),
      await admin(P, { role: 'district_admin', scopeDimension: 'district', scopeValue: 'Patna' }),
      await admin(P, { status: 'suspended' }),
      await admin(P, { status: 'disabled' }),
      await admin(P, { grantedAt: AFTER }),
      await admin(P, { credentials: false }),
    ];
    // POSITIVE CONTROL in the same run: Q's admin, Q's refusal.
    const cq = await refused(Q);
    const qAdmin = await admin(Q);
    const h = harness([P, Q]);
    const logs: string[] = [];
    const spies = (['log', 'info', 'warn', 'error'] as const).map((k) => vi.spyOn(console, k).mockImplementation((...a: unknown[]) => void logs.push(JSON.stringify(a))));
    try {
      await tick(h);
    } finally {
      for (const s of spies) s.mockRestore();
    }
    expect(sentTo(h)).toEqual([named.address, blank.address, qAdmin.address].sort());
    for (const x of excluded) expect(sentTo(h)).not.toContain(x.address);
    expect((await rowsOf(c)).map((r) => [r.recipient_user_id, r.outcome]).sort()).toEqual([[named.id, 'accepted'], [blank.id, 'accepted']].sort());
    expect((await rowsOf(cq)).map((r) => r.recipient_user_id)).toEqual([qAdmin.id]);
    // AC3 — the message.
    const m = h.client.sent.find((x) => x.to === named.address)!;
    expect(m.subject).toBe('संदेह पर एक दावा अस्वीकार हुआ — सूची खोलें / A claim was refused on suspicion — open the list');
    expect(m.text).toContain(`${ORIGIN}/p/${P}/nominee-refusals`);
    expect(m.text.indexOf('आपके परिवार')).toBeLessThan(m.text.indexOf('A claim in your Pariwar'));
    expect(m.text).not.toContain(c);
    // ⭐ AC7 — the stringify sweep: payloads, alarms, console output, table rows ⇒ ⛔ address; ONLY the provider's `to` has it.
    const rows = (await pool.query(`SELECT * FROM claim_suspicion_staff_emails WHERE claim_case_id = ANY($1::uuid[])`, [[c, cq]])).rows;
    const artifacts = JSON.stringify({ enqueued: h.enqueued, alarms: h.alarms, logs, rows });
    for (const a of [named, blank, qAdmin]) expect(artifacts).not.toContain(a.address);
    expect(probe.violations).toEqual([]);
    // AC2 (viii) — a second sweep after all are finished ⇒ ⛔ new rows, ⛔ new sends.
    await tick(h);
    expect(h.client.sent).toHaveLength(3);
    expect(await rowsOf(c)).toHaveLength(2);
  });

  it('⭐ AC1 FREEZE (committed instants) — a note-only revision does ⛔ email L (granted after the refusal); away and back ⇒ L IS emailed, the first admin ⛔ again', async () => {
    const P = isolated();
    const c = await refused(P);
    const early = await admin(P);
    const l = await admin(P, { grantedAt: AFTER });
    const h = harness([P]);
    await revise(P, c, 'post_death_nominee_change', new Date(AFTER.getTime() + 60 * MIN)); // note-only
    await tick(h);
    expect(sentTo(h)).toEqual([early.address]);
    await revise(P, c, 'other', new Date(AFTER.getTime() + 120 * MIN));
    await revise(P, c, 'post_death_nominee_change', new Date(AFTER.getTime() + 180 * MIN));
    await tick(h);
    expect(sentTo(h)).toEqual([early.address, l.address].sort());
  });

  // ── AC2 — when ───────────────────────────────────────────────────────────────────────────────────────────────────────────

  it('AC2 — another reason, revised off, reversed on appeal, closed ⇒ ⛔ row; revised ONTO `-239`, an OPEN appeal ⇒ emailed', async () => {
    const P = isolated();
    const a = await admin(P, { grantedAt: new Date(REFUSED_AT.getTime() - 24 * 60 * MIN) });
    const other = await refused(P, { reason: 'other' });
    const off = await refused(P);
    await revise(P, off, 'other', AFTER);
    const reversed = await refused(P);
    await reverseAppeal(P, reversed);
    const closed = await refused(P);
    await close(P, closed);
    const onto = await refused(P, { reason: 'other' });
    await revise(P, onto, 'post_death_nominee_change', AFTER);
    const appealed = await refused(P);
    await openAppeal(P, appealed);
    const h = harness([P]);
    await tick(h);
    for (const cid of [other, off, reversed, closed]) expect(await rowsOf(cid), cid).toEqual([]);
    for (const cid of [onto, appealed]) expect((await rowsOf(cid)).map((r) => [r.recipient_user_id, r.outcome]), cid).toEqual([[a.id, 'accepted']]);
    expect(h.client.sent).toHaveLength(2);
  });

  it('AC2 (iv) — revised away and back AFTER the email ⇒ ⛔ second email to the same admin (once ever)', async () => {
    const P = isolated();
    const c = await refused(P);
    const a = await admin(P);
    const h = harness([P]);
    await tick(h);
    await revise(P, c, 'other', AFTER);
    await revise(P, c, 'post_death_nominee_change', new Date(AFTER.getTime() + MIN));
    await tick(h);
    expect(sentTo(h)).toEqual([a.address]);
  });

  // ── AC5 — nobody to email ────────────────────────────────────────────────────────────────────────────────────────────────

  it('⭐ AC5 — ⛔ eligible admin ⇒ ONE `no_target` row + ONE alarm (ids only); a second sweep and a duplicate child ⇒ ⛔ second row, ⛔ second alarm', async () => {
    const P = isolated();
    const c = await refused(P);
    await admin(P, { status: 'disabled' });
    const h = harness([P]);
    await tick(h);
    expect(await rowsOf(c)).toMatchObject([{ recipient_user_id: null, outcome: 'no_target', detail: 'no_pariwar_admin' }]);
    expect(h.alarms.filter((x) => x.includes('no_pariwar_admin'))).toEqual([expect.stringContaining(c)]);
    await tick(h);
    expect(await runSuspicionStaffEmailChild(h.deps, envelope(P, c, null), randomUUID())).toEqual({ status: 'skipped', reason: 'already_final' });
    expect(await rowsOf(c)).toHaveLength(1);
    expect(h.alarms.filter((x) => x.includes('no_pariwar_admin'))).toHaveLength(1);
    expect(h.client.sent).toHaveLength(0);
  });

  // ── AC6 — config gaps HOLD ───────────────────────────────────────────────────────────────────────────────────────────────

  it('⭐ AC6 — each config gap and a failing / sandboxed pre-flight ⇒ ⛔ enqueue, ⛔ row, ONE end-of-run alarm (count + ids); fixed ⇒ the next sweep sends', async () => {
    const P = isolated();
    const c = await refused(P);
    const a = await admin(P);
    const h = harness([P]);
    const legs: [string, () => void, () => void][] = [
      ['config:provider_unset', () => (h.client.state.gap = 'config:provider_unset'), () => (h.client.state.gap = null)],
      ['config:sender_missing', () => (h.client.state.gap = 'config:sender_missing'), () => (h.client.state.gap = null)],
      ['config:credentials_missing', () => (h.client.state.gap = 'config:credentials_missing'), () => (h.client.state.gap = null)],
      ['config:admin_app_origin_invalid', () => (h.origin.value = undefined), () => (h.origin.value = ORIGIN)],
      ['config:admin_app_origin_invalid', () => (h.origin.value = 'http://admin.twt.example'), () => (h.origin.value = ORIGIN)],
      ['config:admin_app_origin_invalid', () => (h.origin.value = `${ORIGIN}/admin`), () => (h.origin.value = ORIGIN)],
      ['preflight:sandbox', () => (h.client.state.preflight = { ok: false, detail: 'preflight:sandbox' }), () => (h.client.state.preflight = { ok: true })],
      ['preflight:sending_disabled', () => (h.client.state.preflight = { ok: false, detail: 'preflight:sending_disabled' }), () => (h.client.state.preflight = { ok: true })],
    ];
    for (const [word, breakIt, fixIt] of legs) {
      breakIt();
      h.alarms.length = 0;
      await tick(h);
      expect(h.enqueued, word).toEqual([]);
      expect(await rowsOf(c), word).toEqual([]);
      const held = h.alarms.filter((x) => x.includes('HELD'));
      expect(held, word).toHaveLength(1);
      expect(held[0], word).toContain(word);
      expect(held[0], word).toContain('1 email(s)');
      expect(held[0], word).toContain(c);
      fixIt();
    }
    // A pre-flight that ITSELF throws also holds.
    const realPreflight = h.client.preflight;
    (h.client as { preflight: unknown }).preflight = () => Promise.reject(new Error('boom'));
    h.alarms.length = 0;
    await tick(h);
    expect(h.enqueued).toEqual([]);
    expect(await rowsOf(c)).toEqual([]);
    expect(h.alarms.filter((x) => x.includes('HELD'))).toEqual([expect.stringContaining('preflight:failed')]);
    (h.client as { preflight: unknown }).preflight = realPreflight;
    // Fixed ⇒ the next sweep sends.
    await tick(h);
    expect(sentTo(h)).toEqual([a.address]);
  });

  it('AC6 — a child racing a config removal ⇒ `held_config`, ⛔ row, ⛔ decrypt; the pair stays DUE', async () => {
    const P = isolated();
    const c = await refused(P);
    const a = await admin(P);
    const h = harness([P]);
    const decrypts = vi.spyOn(probedEnc.kms, 'decryptDek');
    h.client.state.gap = 'config:secret_unresolvable';
    expect(await runSuspicionStaffEmailChild(h.deps, envelope(P, c, a.id), randomUUID())).toEqual({ status: 'held_config', reason: 'config:secret_unresolvable' });
    expect(decrypts).not.toHaveBeenCalled();
    decrypts.mockRestore();
    expect(await rowsOf(c)).toEqual([]);
    h.client.state.gap = null;
    await tick(h);
    expect(sentTo(h)).toEqual([a.address]);
  });

  it('⭐ round 3 (Decision 1 A) — a HOLD past the give-up horizon ⇒ the in-flight row is PARKED, ⛔ given up; fixed ⇒ re-claimed AT ONCE and sent', async () => {
    const P = isolated();
    const c = await refused(P);
    const a = await admin(P);
    const h = harness([P]);
    const now = new Date();
    h.setNow(now);
    // A row in flight since BEFORE the give-up horizon whose child is gone (a held fault, then the channel went down).
    await pool.query(
      `INSERT INTO claim_suspicion_staff_emails (pariwar_id, claim_case_id, recipient_user_id, outcome, claimed_at, claimed_by_job, created_at, detail, aging_since)
       VALUES ($1, $2, $3, 'attempting', $4, 'gone', $5, 'held:SendingPausedException', $5)`,
      [P, c, a.id, new Date(now.getTime() - 2 * claim.STAFF_EMAIL_SEND_LEASE_MS), new Date(claim.suspicionStaffEmailReclaimCutoff(now).getTime() - MIN)],
    );
    h.client.state.preflight = { ok: false, detail: 'preflight:sending_disabled' };
    await tick(h);
    expect(await rowsOf(c)).toMatchObject([{ outcome: 'attempting', claimed_by_job: claim.SUSPICION_STAFF_EMAIL_PARKED_BY, detail: 'held:SendingPausedException' }]);
    expect(h.alarms.filter((x) => x.includes('gave up'))).toEqual([]);
    expect(h.alarms.filter((x) => x.includes('HELD'))).toEqual([expect.stringContaining('1 in-flight row(s) newly parked')]);
    // Still held a day later ⇒ still parked, still ⛔ given up (⛔ re-parked — the alarm counts only NEW parks).
    h.setNow(new Date(now.getTime() + 24 * 60 * MIN));
    h.alarms.length = 0;
    await tick(h);
    expect(await rowsOf(c)).toMatchObject([{ outcome: 'attempting', claimed_by_job: claim.SUSPICION_STAFF_EMAIL_PARKED_BY }]);
    expect(h.alarms.filter((x) => x.includes('gave up'))).toEqual([]);
    expect(h.alarms.filter((x) => x.includes('HELD'))).toEqual([expect.stringContaining('0 in-flight row(s) newly parked')]);
    // Fixed ⇒ the very next tick re-claims the parked row (⛔ lease wait) and sends.
    h.client.state.preflight = { ok: true };
    h.setNow(new Date(now.getTime() + 24 * 60 * MIN + 15 * MIN));
    await tick(h);
    expect(sentTo(h)).toEqual([a.address]);
    expect(await rowsOf(c)).toMatchObject([{ outcome: 'accepted', attempt_count: 2, first_detail: 'held:SendingPausedException', may_have_sent: false }]);
    expect(h.alarms.filter((x) => x.includes('gave up'))).toEqual([]);
  });

  it('⭐ round 3 — RE3 (a) the scope value is compared EXACTLY (case-sensitive): an UPPER-cased copy of the Pariwar id is ⛔ emailed', async () => {
    let P = isolated();
    while (!/[a-f]/.test(P)) P = isolated(); // ⭐ a Pariwar id WITH letters (an all-digit one upper-cases to itself)
    const c = await refused(P);
    const exact = await admin(P);
    const upper = await admin(P, { scopeValue: P.toUpperCase() });
    const h = harness([P]);
    await tick(h);
    expect(sentTo(h)).toEqual([exact.address]);
    expect((await rowsOf(c)).map((r) => r.recipient_user_id)).toEqual([exact.id]);
    expect(sentTo(h)).not.toContain(upper.address);
  });

  it('⭐ round 3 — AC7 on the ERROR paths: a 5xx retry, a HELD fault, a `rejected`, an `error:invalid_address` ⇒ ⛔ address in rows, alarms, logs or thrown messages', async () => {
    const P = isolated();
    const h = harness([P]);
    const [c1, c2, c3] = [await refused(P), await refused(P), await refused(P)];
    const [a1, a2, a3] = [await admin(P), await admin(P), await admin(P)];
    const bad = await admin(P, { address: 'x"<priya.leak@pariwar.example>' });
    const cBad = await refused(P);
    const logs: string[] = [];
    const thrown: string[] = [];
    const spies = (['log', 'info', 'warn', 'error'] as const).map((k) => vi.spyOn(console, k).mockImplementation((...a: unknown[]) => void logs.push(JSON.stringify(a))));
    const run = async (cid: string, uid: string, job: string, respond: StaffEmailSendResult) => {
      h.client.state.respond = () => respond;
      probe.claim = { pariwarId: P, claimCaseId: cid };
      try {
        return await runSuspicionStaffEmailChild(h.deps, envelope(P, cid, uid), job);
      } catch (e) {
        thrown.push(`${(e as Error).name}: ${(e as Error).message}`);
        return null;
      }
    };
    try {
      await run(c1, a1.id, 'j1', { kind: 'transient', detail: 'transient:InternalFailure', held: false, mayHaveSent: true });
      await run(c1, a1.id, 'j1', { kind: 'final', outcome: 'accepted', providerMessageId: 'm1' });
      await run(c2, a2.id, 'j2', { kind: 'transient', detail: 'held:MessageRejected', held: true, mayHaveSent: false });
      await run(c3, a3.id, 'j3', { kind: 'final', outcome: 'rejected', detail: 'rejected:400:TM_4001.SM_113' });
      await run(cBad, bad.id, 'j4', { kind: 'final', outcome: 'accepted', providerMessageId: 'never' });
    } finally {
      for (const sp of spies) sp.mockRestore();
    }
    // EXACTLY the two transient paths threw (the 5xx and the HELD fault) — the designed retry signal.
    expect(thrown).toEqual([expect.stringMatching(/^ClaimCorrectionTransientError: /), expect.stringMatching(/^ClaimCorrectionTransientError: /)]);
    expect(await rowsOf(cBad)).toMatchObject([{ outcome: 'error', detail: 'error:invalid_address' }]);
    const rows = (await pool.query(`SELECT * FROM claim_suspicion_staff_emails WHERE claim_case_id = ANY($1::uuid[])`, [[c1, c2, c3, cBad]])).rows;
    const artifacts = JSON.stringify({ alarms: h.alarms, logs, thrown, rows });
    for (const x of [a1, a2, a3]) expect(artifacts).not.toContain(x.address);
    expect(artifacts).not.toContain('priya.leak');
    expect(h.client.sent.map((m) => m.to)).not.toContain(bad.address);
  });

  it('⭐ round 4 — a RENDER failure alarms ONCE per row (twice tried); a Q2 READ failure (a DB blip) is ⛔ alarmed; both stay `attempting`', async () => {
    const P = isolated();
    const h = harness([P]);
    const [cr, cq] = [await refused(P), await refused(P)];
    const [ar, aq] = [await admin(P), await admin(P)];
    renderSwitch.fail = true;
    try {
      probe.claim = { pariwarId: P, claimCaseId: cr };
      for (let i = 0; i < 2; i += 1) await expect(runSuspicionStaffEmailChild(h.deps, envelope(P, cr, ar.id), 'job-r')).rejects.toBeInstanceOf(ClaimCorrectionTransientError);
    } finally {
      renderSwitch.fail = false;
    }
    expect(await rowsOf(cr)).toMatchObject([{ outcome: 'attempting', detail: 'transient:render_failed', may_have_sent: false }]);
    expect(h.alarms.filter((x) => x.includes(cr) && x.includes('transient:render_failed'))).toHaveLength(1);
    // Q2's read fails — a pool whose clients reject that ONE statement (restored on release).
    const failing = Object.create(pool) as pg.Pool;
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
    probe.claim = { pariwarId: P, claimCaseId: cq };
    for (let i = 0; i < 2; i += 1) {
      await expect(runSuspicionStaffEmailChild({ ...h.deps, pool: failing }, envelope(P, cq, aq.id), 'job-q')).rejects.toBeInstanceOf(ClaimCorrectionTransientError);
    }
    expect(await rowsOf(cq)).toMatchObject([{ outcome: 'attempting', detail: 'transient:read_failed', may_have_sent: false }]);
    expect(h.alarms.filter((x) => x.includes(cq))).toEqual([]);
    expect(h.client.sent).toHaveLength(0);
  });

  // ── AC4 — once ever, at-least-once recorded ──────────────────────────────────────────────────────────────────────────────

  it('⭐ AC4 (i) — N concurrent children for ONE pair ⇒ ONE send, ONE `accepted` row', async () => {
    const P = isolated();
    const c = await refused(P);
    const a = await admin(P);
    const h = harness([P]);
    const results = await Promise.all(Array.from({ length: 4 }, () => runSuspicionStaffEmailChild(h.deps, envelope(P, c, a.id), randomUUID())));
    expect(results.filter((r) => r.status === 'sent')).toHaveLength(1);
    expect(results.filter((r) => r.status === 'skipped').length).toBe(3);
    expect(h.client.sent).toHaveLength(1);
    expect(await rowsOf(c)).toMatchObject([{ outcome: 'accepted', attempt_count: 1 }]);
  });

  it('AC4 (ii) — a crash-left row past the 30-min lease is re-claimed by the next sweep (attempt 2, first_detail kept); within it ⇒ held_by_other', async () => {
    const P = isolated();
    const c = await refused(P);
    const a = await admin(P);
    const h = harness([P]);
    const now = new Date();
    h.setNow(now);
    await pool.query(
      `INSERT INTO claim_suspicion_staff_emails (pariwar_id, claim_case_id, recipient_user_id, outcome, claimed_at, claimed_by_job, detail)
       VALUES ($1, $2, $3, 'attempting', $4, 'crashed', 'transient:TooManyRequestsException')`,
      [P, c, a.id, new Date(now.getTime() - claim.STAFF_EMAIL_SEND_LEASE_MS + MIN)],
    );
    const within = await tick(h);
    expect(within.map((x) => x.result)).toEqual([{ status: 'skipped', reason: 'held_by_other' }]);
    h.setNow(new Date(now.getTime() + 2 * MIN));
    await tick(h);
    expect(await rowsOf(c)).toMatchObject([{ outcome: 'accepted', attempt_count: 2, first_detail: 'transient:TooManyRequestsException', may_have_sent: false }]);
    expect(h.alarms.filter((x) => x.includes('may have sent'))).toEqual([]);
  });

  it('⭐ AC4 (iii) `-297` §2 — an `attempting` row whose re-check FAILS ⇒ `error` / `exhausted:recheck_*` + "may have sent" — at attempt_count 1 too', async () => {
    const P = isolated();
    const c = await refused(P);
    const a = await admin(P);
    const h = harness([P]);
    await pool.query(
      `INSERT INTO claim_suspicion_staff_emails (pariwar_id, claim_case_id, recipient_user_id, outcome, claimed_at, claimed_by_job)
       VALUES ($1, $2, $3, 'attempting', now() - interval '2 hours', 'crashed')`,
      [P, c, a.id],
    );
    await revise(P, c, 'other', AFTER);
    await tick(h);
    expect(await rowsOf(c)).toMatchObject([{ outcome: 'error', detail: 'exhausted:recheck_refusal_not_standing', attempt_count: 1, may_have_sent: true }]);
    expect(h.alarms.filter((x) => x.includes('may have sent') && x.includes(c))).toHaveLength(1);
    expect(h.client.sent).toHaveLength(0);
  });

  it('⭐ AC4 (iv) — the give-up after 3 IST days AND past the lease ⇒ `error` + ONE alarm "may have sent"; a row inside the lease is ⛔ given up', async () => {
    const P = isolated();
    const c = await refused(P);
    const [old, live] = [await admin(P), await admin(P)];
    const h = harness([P]);
    const now = new Date();
    h.setNow(now);
    const created = new Date(claim.suspicionStaffEmailReclaimCutoff(now).getTime() - MIN);
    await pool.query(
      `INSERT INTO claim_suspicion_staff_emails (pariwar_id, claim_case_id, recipient_user_id, outcome, claimed_at, claimed_by_job, created_at, detail, aging_since)
       VALUES ($1, $2, $3, 'attempting', $4, 'old', $6, 'held:SendingPausedException', $6),
              ($1, $2, $5, 'attempting', $7, 'live', $6, 'held:SendingPausedException', $6)`,
      [P, c, old.id, new Date(now.getTime() - claim.STAFF_EMAIL_SEND_LEASE_MS - MIN), live.id, created, new Date(now.getTime() - MIN)],
    );
    await tick(h);
    const rows = await rowsOf(c);
    expect(rows.find((r) => r.recipient_user_id === old.id)).toMatchObject({ outcome: 'error', detail: 'exhausted:attempting_three_days', may_have_sent: true });
    expect(rows.find((r) => r.recipient_user_id === live.id)).toMatchObject({ outcome: 'attempting' });
    expect(h.alarms.filter((x) => x.includes('gave up') && x.includes('may have sent'))).toHaveLength(1);
  });

  it('⭐ AC4 (vi) RE5-bis — ANY finish (`accepted` included) on a may_have_sent row alarms; after a 429, a HELD fault or a decrypt failure it does ⛔', async () => {
    const P = isolated();
    const h = harness([P]);
    const job = 'job-own';
    // (a) a provider 5xx, then accepted on the SAME job's retry ⇒ "may have sent".
    const c1 = await refused(P);
    const a1 = await admin(P);
    let n = 0;
    h.client.state.respond = (): StaffEmailSendResult =>
      (n += 1) === 1 ? { kind: 'transient', detail: 'transient:InternalFailure', held: false, mayHaveSent: true } : { kind: 'final', outcome: 'accepted', providerMessageId: 'm1' };
    probe.claim = { pariwarId: P, claimCaseId: c1 };
    await expect(runSuspicionStaffEmailChild(h.deps, envelope(P, c1, a1.id), job)).rejects.toBeInstanceOf(ClaimCorrectionTransientError);
    expect(await runSuspicionStaffEmailChild(h.deps, envelope(P, c1, a1.id), job)).toEqual({ status: 'sent', outcome: 'accepted' });
    expect(await rowsOf(c1)).toMatchObject([{ outcome: 'accepted', attempt_count: 2, may_have_sent: true, first_detail: 'transient:InternalFailure' }]);
    expect(h.alarms.filter((x) => x.includes(c1) && x.includes("finished 'accepted'") && x.includes('may have sent'))).toHaveLength(1);
    // (b) a clean 429, a held fault, then accepted ⇒ ⛔ "may have sent".
    const c2 = await refused(P);
    const a2 = await admin(P);
    const script: StaffEmailSendResult[] = [
      { kind: 'transient', detail: 'transient:TooManyRequestsException', held: false, mayHaveSent: false },
      { kind: 'transient', detail: 'held:SendingPausedException', held: true, mayHaveSent: false },
      { kind: 'final', outcome: 'accepted', providerMessageId: 'm2' },
    ];
    h.client.state.respond = () => script.shift()!;
    probe.claim = { pariwarId: P, claimCaseId: c2 };
    for (let i = 0; i < 2; i += 1) await expect(runSuspicionStaffEmailChild(h.deps, envelope(P, c2, a2.id), job)).rejects.toBeInstanceOf(ClaimCorrectionTransientError);
    expect(await runSuspicionStaffEmailChild(h.deps, envelope(P, c2, a2.id), job)).toEqual({ status: 'sent', outcome: 'accepted' });
    expect(await rowsOf(c2)).toMatchObject([{ outcome: 'accepted', attempt_count: 3, may_have_sent: false }]);
    expect(h.alarms.filter((x) => x.includes(c2) && x.includes('may have sent'))).toEqual([]);
    // (c) a decrypt failure (BEFORE the provider call), then accepted ⇒ ⛔ "may have sent".
    const c3 = await refused(P);
    const a3 = await admin(P);
    h.client.state.respond = () => ({ kind: 'final', outcome: 'accepted', providerMessageId: 'm3' });
    await pool.query(`UPDATE admin_credentials SET email_ciphertext = 'enc:v1:not-an-envelope' WHERE user_id = $1`, [a3.id]);
    probe.claim = { pariwarId: P, claimCaseId: c3 };
    await expect(runSuspicionStaffEmailChild(h.deps, envelope(P, c3, a3.id), job)).rejects.toBeInstanceOf(ClaimCorrectionTransientError);
    await expect(runSuspicionStaffEmailChild(h.deps, envelope(P, c3, a3.id), job)).rejects.toBeInstanceOf(ClaimCorrectionTransientError);
    expect(await rowsOf(c3)).toMatchObject([{ outcome: 'attempting', detail: 'transient:decrypt_failed', may_have_sent: false }]);
    // ⭐ Round 3 — a decrypt failure can be DETERMINISTIC (a wrong KEK) ⇒ alarmed like a HELD fault: ONCE across two attempts.
    expect(h.alarms.filter((x) => x.includes(c3) && x.includes('transient:decrypt_failed'))).toHaveLength(1);
    const ct = await encryption.encryptTier1(Buffer.from(a3.address, 'utf-8'), encryption.ADMIN_EMAIL_ENCRYPTION_CONTEXT, enc.kms, enc.kekRef);
    await pool.query(`UPDATE admin_credentials SET email_ciphertext = $2 WHERE user_id = $1`, [a3.id, encryption.serializeEnvelope(ct)]);
    expect(await runSuspicionStaffEmailChild(h.deps, envelope(P, c3, a3.id), job)).toEqual({ status: 'sent', outcome: 'accepted' });
    expect(h.alarms.filter((x) => x.includes(c3) && x.includes('may have sent'))).toEqual([]);
  });

  it('⭐ AC4 (vii) + (ix) — a transient retries on the SAME job id (own re-claim); a HELD fault stays `attempting`, ONE alarm per DISTINCT fault, ⛔ final; only a recorded recipient-specific name `rejected`', async () => {
    const P = isolated();
    const c = await refused(P);
    const a = await admin(P);
    const h = harness([P]);
    const faults: StaffEmailSendResult[] = [
      { kind: 'transient', detail: 'held:SendingPausedException', held: true, mayHaveSent: false },
      { kind: 'transient', detail: 'held:SendingPausedException', held: true, mayHaveSent: false },
      { kind: 'transient', detail: 'held:AccessDeniedException', held: true, mayHaveSent: false },
      { kind: 'transient', detail: 'held:unknown', held: true, mayHaveSent: false },
    ];
    h.client.state.respond = () => faults.shift()!;
    probe.claim = { pariwarId: P, claimCaseId: c };
    for (let i = 0; i < 4; i += 1) await expect(runSuspicionStaffEmailChild(h.deps, envelope(P, c, a.id), 'job-1')).rejects.toBeInstanceOf(ClaimCorrectionTransientError);
    expect(await rowsOf(c)).toMatchObject([{ outcome: 'attempting', attempt_count: 4, detail: 'held:unknown', claimed_by_job: 'job-1' }]);
    const heldAlarms = h.alarms.filter((x) => x.includes('HELD by an account'));
    expect(heldAlarms).toHaveLength(3); // SendingPaused ONCE (two tries), AccessDenied, unknown
    // A recorded recipient-specific name ⇒ `rejected` + alarm — the ONLY final failure.
    const c2 = await refused(P);
    const a2 = await admin(P);
    h.client.state.respond = () => ({ kind: 'final', outcome: 'rejected', detail: 'rejected:400:TM_4001.SM_113' });
    probe.claim = { pariwarId: P, claimCaseId: c2 };
    expect(await runSuspicionStaffEmailChild(h.deps, envelope(P, c2, a2.id), 'job-2')).toEqual({ status: 'sent', outcome: 'rejected' });
    expect(await rowsOf(c2)).toMatchObject([{ outcome: 'rejected', detail: 'rejected:400:TM_4001.SM_113' }]);
    expect(h.alarms.filter((x) => x.includes('REJECTED') && x.includes(c2))).toHaveLength(1);
  });

  it('⭐ AC4 (viii) OUTAGE-SHAPED — the owner retries through its backoff gaps with a sweep tick between each ⇒ every tick child is held_by_other, ⛔ a take-over', async () => {
    const P = isolated();
    const c = await refused(P);
    const a = await admin(P);
    const h = harness([P]);
    h.client.state.respond = () => ({ kind: 'transient', detail: 'transient:ServiceUnavailable', held: false, mayHaveSent: true });
    const t0 = Date.now();
    probe.claim = { pariwarId: P, claimCaseId: c };
    // pg-boss 12.19.1's backoff gaps at retryDelay 60 × 4 retries (upper bounds): 120 s, 240 s, 480 s, 960 s. ⭐ Each sweep tick
    // lands 30 s BEFORE the owner's next retry — the END of the gap, where a too-short lease (10 min) would let the tick take over.
    let at = t0;
    h.setNow(new Date(at));
    await expect(runSuspicionStaffEmailChild(h.deps, envelope(P, c, a.id), 'owner')).rejects.toBeInstanceOf(ClaimCorrectionTransientError);
    for (const gapS of [120, 240, 480, 960]) {
      h.setNow(new Date(at + gapS * 1000 - 30_000));
      const ticked = await tick(h);
      expect(ticked.map((x) => x.result), `gap ${String(gapS)}`).toEqual([{ status: 'skipped', reason: 'held_by_other' }]);
      at += gapS * 1000;
      h.setNow(new Date(at));
      await expect(runSuspicionStaffEmailChild(h.deps, envelope(P, c, a.id), 'owner')).rejects.toBeInstanceOf(ClaimCorrectionTransientError);
    }
    expect(await rowsOf(c)).toMatchObject([{ outcome: 'attempting', attempt_count: 5, claimed_by_job: 'owner', may_have_sent: true }]);
    expect(h.client.sent).toHaveLength(5);
  });

  it('⭐ AC4 (x) — ⛔ address after `begun` ⇒ `error` / `error:no_address` | `error:invalid_address` + alarm (⛔ a 23514)', async () => {
    const P = isolated();
    const h = harness([P]);
    const c1 = await refused(P);
    const gone = await admin(P);
    // (a) credentials deleted BETWEEN two attempts: the retry's locked re-check sees the recipient ineligible FIRST (RE3 (d)) ⇒
    // `-297` §2's `error` / `exhausted:recheck_recipient_not_eligible` (the pure read-after-commit leg is the next test).
    const begunAt = await onOwnTx(pool, P, (client) =>
      claim.beginSuspicionStaffEmail(client, { pariwarId: ids.pariwarId(P), claimCaseId: ids.claimId(c1), recipientUserId: ids.userId(gone.id), jobId: 'j1', now: new Date() }),
    );
    expect(begunAt.kind).toBe('begun');
    await pool.query(`DELETE FROM admin_credentials WHERE user_id = $1`, [gone.id]);
    expect((await runSuspicionStaffEmailChild(h.deps, envelope(P, c1, gone.id), 'j1')).status).toBe('skipped');
    expect(await rowsOf(c1)).toMatchObject([{ outcome: 'error', detail: 'exhausted:recheck_recipient_not_eligible' }]);
    // (b) blank and malformed decrypts ⇒ `error:no_address` / `error:invalid_address`.
    for (const [address, d] of [['   ', 'error:no_address'], ['not an address', 'error:invalid_address']] as const) {
      const c = await refused(P);
      const x = await admin(P, { address });
      probe.claim = { pariwarId: P, claimCaseId: c };
      expect(await runSuspicionStaffEmailChild(h.deps, envelope(P, c, x.id), randomUUID())).toEqual({ status: 'error', detail: d });
      expect(await rowsOf(c)).toMatchObject([{ outcome: 'error', detail: d }]);
      expect(h.alarms.filter((m) => m.includes(c) && m.includes(d))).toHaveLength(1);
    }
    expect(h.client.sent).toHaveLength(0);
  });

  it('AC4 (x) — credentials deleted BETWEEN the claiming commit and the Q2 read ⇒ `error:no_address` (the child\'s own read)', async () => {
    const P = isolated();
    const c = await refused(P);
    const a = await admin(P);
    const h = harness([P]);
    // Delete the credentials the moment the child's claiming transaction has committed — i.e. at its FIRST KMS-free step: we
    // hook the scoped reads by wrapping the pool's `connect` once the row exists.
    const realConnect = pool.connect.bind(pool);
    let armed = true;
    (pool as { connect: unknown }).connect = async (...args: unknown[]) => {
      if (armed) {
        // ⚠ Through the REAL connect — `pool.query` would re-enter this wrapper.
        const side = await realConnect();
        try {
          const { rows } = await side.query(`SELECT 1 FROM claim_suspicion_staff_emails WHERE claim_case_id = $1 AND outcome = 'attempting'`, [c]);
          if (rows.length > 0) {
            armed = false;
            await side.query(`DELETE FROM admin_credentials WHERE user_id = $1`, [a.id]);
          }
        } finally {
          side.release();
        }
      }
      return (realConnect as (...a: unknown[]) => Promise<pg.PoolClient>)(...args);
    };
    try {
      expect(await runSuspicionStaffEmailChild(h.deps, envelope(P, c, a.id), randomUUID())).toEqual({ status: 'error', detail: 'error:no_address' });
    } finally {
      (pool as { connect: unknown }).connect = realConnect;
    }
    expect(await rowsOf(c)).toMatchObject([{ outcome: 'error', detail: 'error:no_address' }]);
    expect(h.alarms.filter((m) => m.includes(c) && m.includes('error:no_address'))).toHaveLength(1);
  });
});

// ── Review Finding (round 2) — the SEND worker's catch around an unexpected (non-transient) throw. NO database needed: a
// malformed `claimCaseId` throws `InvalidBrandedIdError` out of `ids.claimId(...)`, before any DB/network call. ──────────────
describe('the CLAIM_SUSPICION_STAFF_EMAIL_SEND worker — an unexpected (non-transient) throw', () => {
  it('alarms once (ids + the error NAME only, ⛔ the bad value) and rethrows — pg-boss keeps its retry/failure bookkeeping', async () => {
    const createQueue = vi.fn(() => Promise.resolve());
    const schedule = vi.fn(() => Promise.resolve());
    const work = vi.fn().mockResolvedValue('w');
    const alarms: string[] = [];
    const deps = {
      pool: {} as pg.Pool,
      encryption: {} as ClaimSuspicionStaffEmailDeps['encryption'],
      staffEmail: createFakeStaffEmailClient(),
      adminAppOrigin: ORIGIN,
      onAlarm: (m: string) => alarms.push(m),
    } satisfies ClaimSuspicionStaffEmailDeps;
    await registerClaimSuspicionStaffEmailWorkers({ createQueue, schedule, work } as never, deps);
    const sendHandler = work.mock.calls[0]![2] as (jobs: { id: string; data: unknown }[]) => Promise<unknown>;

    const badJob = {
      id: 'job-x',
      data: { pariwarId: DA, requestId: 'r', actorId: null, traceId: 't', payload: { claimCaseId: 'not-a-uuid', recipientUserId: null } },
    };
    await expect(sendHandler([badJob])).rejects.toThrow(/InvalidBrandedIdError|must be a UUID/);

    expect(alarms).toHaveLength(1);
    expect(alarms[0]).toContain('job-x');
    expect(alarms[0]).toContain('InvalidBrandedIdError');
    expect(alarms[0]).not.toContain('not-a-uuid'); // ⛔ the bad value itself (Invariant 2) — ids + fixed words only.
  });
});

describe('the registration and the sweep guards (⛔ database)', () => {
  // ── AC2 (ix) — the schedule (⭐ round 3: ⛔ DB needed — outside the `skipIf(!hasDatabase)` block) ──────────────────────────

  it('⭐ AC2 (ix) — `*/15 * * * *` IST; budget < expiry < cadence, on BOTH createQueue and schedule; the send worker states batchSize 1; a boot alarm is raised once', async () => {
    const createQueue = vi.fn(() => Promise.resolve());
    const schedule = vi.fn(() => Promise.resolve());
    const work = vi.fn(() => Promise.resolve('w'));
    const alarms: string[] = [];
    await registerClaimSuspicionStaffEmailWorkers(
      { createQueue, schedule, work } as never,
      { pool: {} as pg.Pool, encryption: {} as ClaimSuspicionStaffEmailDeps['encryption'], staffEmail: createFakeStaffEmailClient(), adminAppOrigin: ORIGIN, onAlarm: (m) => alarms.push(m) },
      { bootAlarm: 'config:secret_unresolvable' },
    );
    expect(STAFF_EMAIL_SWEEP_CRON).toBe('*/15 * * * *');
    expect(STAFF_EMAIL_SWEEP_BUDGET_MS).toBeLessThan(STAFF_EMAIL_SWEEP_EXPIRE_SECONDS * 1000);
    expect(STAFF_EMAIL_SWEEP_EXPIRE_SECONDS * 1000).toBeLessThan(15 * 60 * 1000);
    expect(createQueue).toHaveBeenCalledWith(QUEUE_NAMES.CLAIM_SUSPICION_STAFF_EMAIL_SWEEP, { expireInSeconds: STAFF_EMAIL_SWEEP_EXPIRE_SECONDS });
    expect(createQueue).toHaveBeenCalledWith(SEND_QUEUE);
    expect(schedule).toHaveBeenCalledWith(QUEUE_NAMES.CLAIM_SUSPICION_STAFF_EMAIL_SWEEP, '*/15 * * * *', {}, {
      tz: CLAIM_CORRECTION_TZ,
      ...CORRECTION_SWEEP_RETRY,
      expireInSeconds: STAFF_EMAIL_SWEEP_EXPIRE_SECONDS,
    });
    expect(work).toHaveBeenCalledWith(SEND_QUEUE, { batchSize: 1 }, expect.any(Function));
    expect(alarms).toEqual([expect.stringContaining('config:secret_unresolvable')]);
  });

  it('⭐ round 4 — a CONFIGURED provider with an unusable `ADMIN_APP_ORIGIN` raises ONE boot alarm; an unset provider stays silent', async () => {
    const reg = async (staffEmail: ClaimSuspicionStaffEmailDeps['staffEmail'], adminAppOrigin: string | undefined) => {
      const alarms: string[] = [];
      const fn = () => Promise.resolve('w');
      await registerClaimSuspicionStaffEmailWorkers(
        { createQueue: fn, schedule: fn, work: fn } as never,
        { pool: {} as pg.Pool, encryption: {} as ClaimSuspicionStaffEmailDeps['encryption'], staffEmail, adminAppOrigin, onAlarm: (m) => alarms.push(m) },
      );
      return alarms;
    };
    expect(await reg(createFakeStaffEmailClient(), 'http://admin.twt.example')).toEqual([expect.stringContaining('config:admin_app_origin_invalid')]);
    expect(await reg(createFakeStaffEmailClient(), undefined)).toEqual([expect.stringContaining('config:admin_app_origin_invalid')]);
    expect(await reg(createFakeStaffEmailClient(), ORIGIN)).toEqual([]);
    const off = createFakeStaffEmailClient();
    off.state.gap = 'config:provider_unset';
    expect(await reg(off, undefined)).toEqual([]);
  });

  it('⭐ round 3 — RE11: an EMPTY allowlist, and ANY allowlist in production, are REFUSED (alarmed) — ⛔ statement runs', async () => {
    const alarms: string[] = [];
    const query = vi.fn(() => Promise.reject(new Error('the pool must not be touched')));
    const deps = (allow: readonly string[]) =>
      ({
        pool: { query, connect: query } as unknown as pg.Pool,
        encryption: {} as ClaimSuspicionStaffEmailDeps['encryption'],
        staffEmail: createFakeStaffEmailClient(),
        adminAppOrigin: ORIGIN,
        onAlarm: (m: string) => alarms.push(m),
        pariwarAllowlist: allow,
      }) satisfies ClaimSuspicionStaffEmailDeps;
    const send = vi.fn();
    const empty = { scannedPairs: 0, enqueued: 0, heldForConfig: 0, finalisedStuck: 0, budgetExhausted: false };
    expect(await runSuspicionStaffEmailSweep(deps([]), { send } as never)).toEqual(empty);
    expect(alarms).toEqual([expect.stringContaining('`pariwarAllowlist` is EMPTY')]);
    const prev = process.env['NODE_ENV'];
    process.env['NODE_ENV'] = 'production';
    try {
      expect(await runSuspicionStaffEmailSweep(deps([DA]), { send } as never)).toEqual(empty);
    } finally {
      if (prev === undefined) delete process.env['NODE_ENV'];
      else process.env['NODE_ENV'] = prev;
    }
    expect(alarms[1]).toContain('while NODE_ENV is production');
    expect(query).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });
});
