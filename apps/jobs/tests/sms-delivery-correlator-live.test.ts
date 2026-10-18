// MSG91's SMS delivery reports — the correlator, the prune and the silence check, LIVE (Story 6.37b, Task 5 / Task 6;
// AC5–AC10; DR4, DR6–DR8, DR11, DR12; I1, I2, I6). Own-committing on the service-pool login (as jobs runs).
//
// ⚠ The inbox is GLOBAL and other suites commit into the shared database. Every report here is inserted RECEIVED and DUE
// in the year 2000 and every tick runs at a year-2000 clock, so ⛔ another suite's (present-day) report is ever due here;
// the silence check reads a year-2000 window for the same reason. The send rows are REAL rows of the four send tables
// (on claims built by `seedReturnedClaim`); the correlator only READS them (I2 — AC8 asserts it byte for byte).

import { randomUUID } from 'node:crypto';

import { smsDelivery } from '@twt/domain';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { buildJobsEncryptionDeps } from '../src/deps.js';
import { runSmsDeliveryCorrelatorTick } from '../src/sms-delivery-correlator.js';
import { runSmsDeliveryPrune } from '../src/sms-delivery-prune.js';
import { runSmsDeliverySilenceCheck } from '../src/sms-delivery-silence.js';
import { cleanupClaims, seedReturnedClaim } from './_claim-correction-seed.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);
const PARIWAR: string = randomUUID();
const OTHER_PARIWAR: string = randomUUID();
const enc = buildJobsEncryptionDeps('sms-delivery-correlator-live-pepper');

const T0 = new Date('2000-01-01T00:00:00.000Z');
const at = (minutes: number) => new Date(T0.getTime() + minutes * 60_000);
const H72 = 72 * 60;
const rid = () => randomUUID().replace(/-/g, '').slice(0, 24);
const hex = (uuid: string) => uuid.replace(/-/g, '');

type Kind = 'cr' | 'ce' | 'sn' | 'pm';
const TABLE: Record<Kind, { table: string; id: string }> = {
  cr: { table: 'claim_correction_reminders', id: 'reminder_id' },
  ce: { table: 'claim_certificate_reminders', id: 'reminder_id' },
  sn: { table: 'claim_suspicion_notices', id: 'notice_id' },
  pm: { table: 'claim_peer_mesh_pings', id: 'ping_id' },
};

describe.skipIf(!hasDatabase)('Story 6.37b — the SMS delivery-report correlator (live DB, own-committing)', { timeout: 60_000 }, () => {
  let pool: pg.Pool;
  const claims: string[] = [];
  const members: string[] = [];
  const requestIds: string[] = [];
  const sendRows: { kind: Kind; id: string }[] = [];

  /** A claim context: its family run, a missing-certificate run, its peer-mesh selection, its unused suspicion purposes. */
  interface ClaimCtx {
    claimCaseId: string;
    pariwarId: string;
    runId: string;
    certRunId: string;
    selectionId: string;
    snPurposes: string[];
  }
  const ctxs: ClaimCtx[] = [];
  let slot = 0;

  async function newClaim(pariwarId = PARIWAR): Promise<ClaimCtx> {
    const s = await seedReturnedClaim(pool, pariwarId, enc, {});
    claims.push(s.claimCaseId);
    members.push(s.deceasedMemberId);
    const cert = await pool.query<{ run_id: string }>(
      `INSERT INTO claim_certificate_reminder_runs (claim_case_id, pariwar_id, cause, day0) VALUES ($1, $2, 'missing', '2000-01-01') RETURNING run_id`,
      [s.claimCaseId, pariwarId],
    );
    const existing = await pool.query<{ selection_id: string }>(`SELECT selection_id FROM claim_peer_mesh_selections WHERE claim_case_id = $1`, [s.claimCaseId]);
    const selectionId =
      existing.rows[0]?.selection_id ??
      (
        await pool.query<{ selection_id: string }>(
          `INSERT INTO claim_peer_mesh_selections (claim_case_id, pariwar_id, deceased_member_id, deceased_created_at, metric_id, metric_version,
             selected_member_ids, candidate_snapshot, response_window_expires_at)
           VALUES ($1, $2, $3, '2000-01-01', 'test_v1', 1, '{}'::uuid[], '{}'::jsonb, '2000-01-08') RETURNING selection_id`,
          [s.claimCaseId, pariwarId, s.deceasedMemberId],
        )
      ).rows[0]!.selection_id;
    const ctx = {
      claimCaseId: s.claimCaseId,
      pariwarId,
      runId: s.runId!,
      certRunId: cert.rows[0]!.run_id,
      selectionId,
      snPurposes: ['suspicion_refusal', 'closed_after_appeal', 'refusal_appeal_notice'],
    };
    ctxs.push(ctx);
    return ctx;
  }

  /** A send row of `kind`, as its finaliser would leave it. Returns its uuid. */
  async function sendRow(
    kind: Kind,
    o: { outcome?: string | null; providerMessageId?: string | null; purpose?: string; updatedAt?: Date; pariwarId?: string; subjectKey?: string } = {},
  ): Promise<string> {
    const pariwarId = o.pariwarId ?? PARIWAR;
    let ctx = ctxs.find((c) => c.pariwarId === pariwarId && (kind !== 'sn' || c.snPurposes.length > 0));
    ctx ??= await newClaim(pariwarId);
    const outcome = o.outcome === undefined ? 'accepted' : o.outcome;
    const pmid = o.providerMessageId === undefined ? (outcome === 'accepted' ? rid() : null) : o.providerMessageId;
    const updatedAt = o.updatedAt ?? T0;
    const attempting = outcome === 'attempting';
    slot += 1;
    let id: string;
    if (kind === 'cr') {
      const purpose = o.purpose ?? 'family_sms';
      const recipient = purpose === 'staff_push' || purpose === 'ladder_escalation' ? `staff:${randomUUID()}` : `nominee:${randomUUID()}`;
      id = (
        await pool.query<{ reminder_id: string }>(
          `INSERT INTO claim_correction_reminders (run_id, claim_case_id, pariwar_id, slot_day, sent_on, recipient_key, purpose, subject_key, outcome,
             provider_message_id, claimed_at, claimed_by_job, updated_at)
           VALUES ($1, $2, $3, $4, '2000-01-01', $5, $6, $12, $7, $8, $9, $10, $11) RETURNING reminder_id`,
          [ctx.runId, ctx.claimCaseId, pariwarId, slot, recipient, purpose, outcome, pmid, attempting ? T0 : null, attempting ? 'job' : null, updatedAt, o.subjectKey ?? ''],
        )
      ).rows[0]!.reminder_id;
    } else if (kind === 'ce') {
      const purpose = o.purpose ?? 'family_sms';
      id = (
        await pool.query<{ reminder_id: string }>(
          `INSERT INTO claim_certificate_reminders (run_id, claim_case_id, pariwar_id, slot_day, sent_on, recipient_key, purpose, subject_key, outcome,
             provider_message_id, claimed_at, claimed_by_job, updated_at)
           VALUES ($1, $2, $3, $4, '2000-01-01', $5, $11, $12, $6, $7, $8, $9, $10) RETURNING reminder_id`,
          [
            ctx.certRunId,
            ctx.claimCaseId,
            pariwarId,
            slot,
            purpose === 'ladder_escalation' ? `staff:${randomUUID()}` : `nominee:${randomUUID()}`,
            outcome,
            pmid,
            attempting ? T0 : null,
            attempting ? 'job' : null,
            updatedAt,
            purpose,
            o.subjectKey ?? '',
          ],
        )
      ).rows[0]!.reminder_id;
    } else if (kind === 'sn') {
      const purpose = ctx.snPurposes.shift()!;
      id = (
        await pool.query<{ notice_id: string }>(
          `INSERT INTO claim_suspicion_notices (pariwar_id, claim_case_id, purpose, outcome, provider_message_id, claimed_at, claimed_by_job, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING notice_id`,
          [pariwarId, ctx.claimCaseId, purpose, outcome, pmid, attempting ? T0 : null, attempting ? 'job' : null, updatedAt],
        )
      ).rows[0]!.notice_id;
    } else {
      id = (
        await pool.query<{ ping_id: string }>(
          `INSERT INTO claim_peer_mesh_pings (selection_id, pariwar_id, member_id, send_outcome, attempt_count, provider_message_id,
             claimed_at, claimed_by_job, aging_since, send_updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING ping_id`,
          [ctx.selectionId, pariwarId, randomUUID(), outcome, outcome === null ? 0 : 1, pmid, attempting ? T0 : null, attempting ? 'job' : null, attempting ? T0 : null, outcome === null ? null : updatedAt],
        )
      ).rows[0]!.ping_id;
    }
    sendRows.push({ kind, id });
    return id;
  }

  async function pmidOf(kind: Kind, id: string): Promise<string | null> {
    const { table, id: col } = TABLE[kind];
    return (await pool.query<{ provider_message_id: string | null }>(`SELECT provider_message_id FROM ${table} WHERE ${col} = $1`, [id])).rows[0]!
      .provider_message_id;
  }

  /** A report as the webhook persisted it — received and due at `receivedAt` (year 2000). */
  async function inbox(o: { requestId?: string; crqid?: string | null; status?: string | null; failureReason?: string | null; receivedAt?: Date }) {
    const requestId = o.requestId ?? rid();
    requestIds.push(requestId);
    const receivedAt = o.receivedAt ?? T0;
    const { rows } = await pool.query<{ report_id: string }>(
      `INSERT INTO sms_delivery_report_inbox (request_id, crqid, status_code, failure_reason, received_at, next_attempt_at)
       VALUES ($1, $2, $3, $4, $5, $5) RETURNING report_id`,
      [requestId, o.crqid === undefined ? null : o.crqid, o.status === undefined ? '1' : o.status, o.failureReason ?? null, receivedAt],
    );
    return rows[0]!.report_id;
  }

  async function inboxRow(reportId: string) {
    return (
      await pool.query<{ match_state: string; match_detail: string | null; attempts: number; lease_until: Date | null; next_attempt_at: Date; settled_at: Date | null }>(
        `SELECT match_state, match_detail, attempts, lease_until, next_attempt_at, settled_at FROM sms_delivery_report_inbox WHERE report_id = $1`,
        [reportId],
      )
    ).rows[0]!;
  }

  async function deliveries(kind: Kind, id: string) {
    return (await pool.query(`SELECT * FROM sms_send_deliveries WHERE send_kind = $1 AND send_row_id = $2`, [kind, id])).rows;
  }

  /** AC6 — a delivery record read back under a Pariwar's OWN scope as `twt_app` (RLS), as the send's tenant would see it. */
  async function scopedDeliveries(kind: Kind, id: string, scope: string) {
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      await c.query('SET LOCAL ROLE twt_app');
      await c.query(`SELECT set_config('app.pariwar_id', $1, true)`, [scope]);
      return (await c.query(`SELECT * FROM sms_send_deliveries WHERE send_kind = $1 AND send_row_id = $2`, [kind, id])).rows;
    } finally {
      await c.query('ROLLBACK');
      c.release();
    }
  }

  async function allDeliveries() {
    const ids = sendRows.map((r) => r.id);
    return (await pool.query(`SELECT * FROM sms_send_deliveries WHERE send_row_id = ANY($1) ORDER BY send_kind, send_row_id`, [ids])).rows;
  }

  async function tick(now: Date, extra: { onAlarm?: (m: string) => void; pool?: pg.Pool } = {}) {
    const alarms: string[] = [];
    const summary = await runSmsDeliveryCorrelatorTick({ pool: extra.pool ?? pool, now: () => now, onAlarm: extra.onAlarm ?? ((m) => alarms.push(m)) });
    return { summary, alarms };
  }

  /** A pool whose clients RECORD every statement (AC8) and can be made to fail one (AC7). */
  function recordingPool(failOn?: (text: string) => boolean): { pool: pg.Pool; statements: string[] } {
    const statements: string[] = [];
    const wrapped = new Proxy(pool, {
      get(target, prop) {
        // Everything but the promise-style `connect()` goes to the real pool (its `query` uses a callback `connect`).
        if (prop !== 'connect') {
          const v = Reflect.get(target, prop, target) as unknown;
          return typeof v === 'function' ? (v as (...a: unknown[]) => unknown).bind(target) : v;
        }
        return async (...args: unknown[]) => {
          if (args.length > 0) return (target.connect as (...a: unknown[]) => unknown)(...args);
          const client = await target.connect();
          const query = client.query.bind(client) as (...a: unknown[]) => Promise<unknown>;
          const release = client.release.bind(client);
          (client as unknown as { query: unknown }).query = (text: unknown, ...rest: unknown[]) => {
            if (typeof text === 'string') {
              statements.push(text);
              if (failOn?.(text)) return Promise.reject(new Error('forced failure'));
            }
            return query(text, ...rest);
          };
          (client as unknown as { release: unknown }).release = (err?: unknown) => {
            (client as unknown as { query: unknown }).query = query;
            release(err as boolean | Error | undefined);
          };
          return client;
        };
      },
    });
    return { pool: wrapped, statements };
  }

  // I9 / AC13 — ⛔ MSG91 (or any network) from the correlator, the prune or the silence check: a global-fetch RECORDER.
  const globalFetch = vi.fn();
  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: DATABASE_URL, max: 6 });
    vi.stubGlobal('fetch', globalFetch);
  });

  afterAll(async () => {
    vi.unstubAllGlobals();
    expect(globalFetch).not.toHaveBeenCalled();
    try {
      // (cleanup of claims and their cascade can take a while — the hook's own timeout is set below)
      if (sendRows.length > 0) await pool.query('DELETE FROM sms_send_deliveries WHERE send_row_id = ANY($1)', [sendRows.map((r) => r.id)]);
      if (requestIds.length > 0) await pool.query('DELETE FROM sms_delivery_report_inbox WHERE request_id = ANY($1)', [requestIds]);
      await cleanupClaims(pool, claims, members);
    } finally {
      await pool.end();
    }
  }, 120_000);

  describe('AC6 — matching, one leg per DR6 row', () => {
    it('(1) ⛔ CRQID ⇒ unmatched:no_crqid + the LOUD alarm; ⛔ delivery write', async () => {
      const before = await allDeliveries();
      const r = await inbox({ crqid: null });
      const { alarms } = await tick(at(1));
      expect(await inboxRow(r)).toMatchObject({ match_state: 'unmatched', match_detail: 'no_crqid' });
      expect(alarms).toEqual(['[jobs] sms-delivery-correlator: sms_report.no_crqid (count 1)']);
      expect(await allDeliveries()).toEqual(before);
    });

    it('(2) an `ot` report ⇒ otp:<result>, ⛔ lookup of any send table (a statement recorder), ⛔ delivery write', async () => {
      const before = await allDeliveries();
      const rec = recordingPool();
      const r = await inbox({ crqid: `ot${hex(randomUUID())}`, status: '2' });
      await tick(at(1), { pool: rec.pool });
      expect(await inboxRow(r)).toMatchObject({ match_state: 'otp', match_detail: 'undelivered' });
      expect(rec.statements.filter((s) => /claim_(correction_reminders|certificate_reminders|suspicion_notices|peer_mesh_pings)/.test(s))).toEqual([]);
      expect(await allDeliveries()).toEqual(before);
    });

    it('(3) a row that does not yet exist ⇒ pending, retried on the backoff; unmatched:no_row + alarm at 72 h', async () => {
      const before = await allDeliveries();
      const r = await inbox({ crqid: `ce${hex(randomUUID())}` });
      await tick(at(1));
      expect(await inboxRow(r)).toMatchObject({ match_state: 'pending', attempts: 1, lease_until: null, next_attempt_at: at(2) });
      // ⛔ due before the backoff
      expect((await tick(at(1.5))).summary.claimed).toBe(0);
      await tick(at(2));
      expect(await inboxRow(r)).toMatchObject({ match_state: 'pending', attempts: 2, next_attempt_at: at(7) });
      const { alarms } = await tick(at(H72));
      expect(await inboxRow(r)).toMatchObject({ match_state: 'unmatched', match_detail: 'no_row', settled_at: at(H72) });
      expect(alarms).toEqual(['[jobs] sms-delivery-correlator: sms_report.unmatched:ce (count 1)']);
      expect(await allDeliveries()).toEqual(before);
    });

    it('(4) a CRQID naming a `staff_push` row ⇒ unmatched:not_sms; ⛔ delivery row', async () => {
      const id = await sendRow('cr', { purpose: 'staff_push', providerMessageId: 'projects/x/messages/fcm-1' });
      const r = await inbox({ crqid: `cr${hex(id)}` });
      const before = await allDeliveries();
      const { alarms } = await tick(at(1));
      expect(await inboxRow(r)).toMatchObject({ match_state: 'unmatched', match_detail: 'not_sms' });
      expect(alarms).toEqual(['[jobs] sms-delivery-correlator: sms_report.not_sms (count 1)']);
      expect(await deliveries('cr', id)).toEqual([]);
      expect(await allDeliveries()).toEqual(before);
    });

    it('(5) a ping never begun ⇒ retried, then unmatched:not_begun', async () => {
      const id = await sendRow('pm', { outcome: null });
      const r = await inbox({ crqid: `pm${hex(id)}` });
      const before = await allDeliveries();
      await tick(at(1));
      expect(await inboxRow(r)).toMatchObject({ match_state: 'pending' });
      await tick(at(H72));
      expect(await inboxRow(r)).toMatchObject({ match_state: 'unmatched', match_detail: 'not_begun' });
      expect(await deliveries('pm', id)).toEqual([]);
      expect(await allDeliveries()).toEqual(before);
    });

    it('(6) an `attempting` row ⇒ retried, then matched once it is finalised `accepted`', async () => {
      const id = await sendRow('cr', { outcome: 'attempting' });
      const req = rid();
      const r = await inbox({ crqid: `cr${hex(id)}`, requestId: req, status: '2' });
      await tick(at(1));
      expect(await inboxRow(r)).toMatchObject({ match_state: 'pending' });
      // the finaliser commits (as 6.19b's compare-and-set would)
      await pool.query(`UPDATE claim_correction_reminders SET outcome = 'accepted', provider_message_id = $2 WHERE reminder_id = $1`, [id, req]);
      await tick(at(2));
      expect(await inboxRow(r)).toMatchObject({ match_state: 'matched', match_detail: 'undelivered' });
      expect(await deliveries('cr', id)).toEqual([expect.objectContaining({ delivery_state: 'undelivered', request_id: req })]);
    });

    it('(6b) still `attempting` at 72 h ⇒ unmatched:still_attempting (⛔ other_attempt)', async () => {
      const id = await sendRow('sn', { outcome: 'attempting' });
      const r = await inbox({ crqid: `sn${hex(id)}` });
      const before = await allDeliveries();
      await tick(at(1));
      const { alarms } = await tick(at(H72));
      expect(await inboxRow(r)).toMatchObject({ match_state: 'unmatched', match_detail: 'still_attempting' });
      expect(alarms).toEqual(['[jobs] sms-delivery-correlator: sms_report.unmatched:sn (count 1)']);
      expect(await deliveries('sn', id)).toEqual([]);
      expect(await allDeliveries()).toEqual(before);
    });

    it('(7) a DIFFERENT request id for the row, and a report for an `error` row ⇒ other_attempt:<kind> + ONE alarm each tick; ⛔ delivery change', async () => {
      const a = await sendRow('ce');
      const b = await sendRow('cr', { outcome: 'error' });
      const before = await allDeliveries();
      const ra = await inbox({ crqid: `ce${hex(a)}`, requestId: rid(), status: '2' });
      const rb = await inbox({ crqid: `cr${hex(b)}`, status: '1' });
      const { alarms } = await tick(at(1));
      expect(await inboxRow(ra)).toMatchObject({ match_state: 'other_attempt', match_detail: 'ce' });
      expect(await inboxRow(rb)).toMatchObject({ match_state: 'other_attempt', match_detail: 'cr' });
      expect(alarms).toEqual([
        '[jobs] sms-delivery-correlator: sms_report.second_request_for_one_send:ce (count 1)',
        '[jobs] sms-delivery-correlator: sms_report.second_request_for_one_send:cr (count 1)',
      ]);
      expect(await allDeliveries()).toEqual(before);
    });

    it('(8) ⭐ each kind MATCHED — the cr reminder, the cr closure notice, ce, sn, pm — readable under its OWN Pariwar only', async () => {
      const rows = [
        { kind: 'cr' as const, id: await sendRow('cr') },
        { kind: 'cr' as const, id: await sendRow('cr', { purpose: 'closure_notice' }) },
        { kind: 'ce' as const, id: await sendRow('ce') },
        { kind: 'sn' as const, id: await sendRow('sn') },
        { kind: 'pm' as const, id: await sendRow('pm', { pariwarId: OTHER_PARIWAR }) },
      ];
      for (const r of rows) await inbox({ crqid: `${r.kind}${hex(r.id)}`, requestId: (await pmidOf(r.kind, r.id))!, status: '1' });
      const { summary } = await tick(at(1));
      expect(summary.settled['matched:delivered']).toBe(5);
      for (const r of rows) {
        const pid = r.kind === 'pm' ? OTHER_PARIWAR : PARIWAR;
        const other = r.kind === 'pm' ? PARIWAR : OTHER_PARIWAR;
        const read = async (scope: string) => {
          const c = await pool.connect();
          try {
            await c.query('BEGIN');
            await c.query('SET LOCAL ROLE twt_app');
            await c.query(`SELECT set_config('app.pariwar_id', $1, true)`, [scope]);
            const { rows: got } = await c.query(`SELECT delivery_state, report_count FROM sms_send_deliveries WHERE send_kind = $1 AND send_row_id = $2`, [r.kind, r.id]);
            return got;
          } finally {
            await c.query('ROLLBACK');
            c.release();
          }
        };
        expect(await read(pid)).toEqual([{ delivery_state: 'delivered', report_count: 1 }]);
        expect(await read(other)).toEqual([]);
      }
    });

    it('⭐ Story 6.37c (AC10) — a `cr` and a `ce` `ladder_sms` report ⇒ matched + a delivery row; a `ladder_escalation` (⛔ CRQID) ⇒ unmatched:not_sms on both', async () => {
      const ladder = randomUUID();
      const sms = [
        { kind: 'cr' as const, id: await sendRow('cr', { purpose: 'ladder_sms', subjectKey: `ladder:${ladder}:2` }) },
        { kind: 'ce' as const, id: await sendRow('ce', { purpose: 'ladder_sms', subjectKey: `ladder:${ladder}:2` }) },
      ];
      const asks = [
        { kind: 'cr' as const, id: await sendRow('cr', { purpose: 'ladder_escalation', subjectKey: `ladder:${ladder}`, outcome: 'recorded', providerMessageId: rid() }) },
        { kind: 'ce' as const, id: await sendRow('ce', { purpose: 'ladder_escalation', subjectKey: `ladder:${ladder}`, outcome: 'recorded', providerMessageId: rid() }) },
      ];
      const reports = [];
      for (const r of [...sms, ...asks]) reports.push(await inbox({ crqid: `${r.kind}${hex(r.id)}`, requestId: (await pmidOf(r.kind, r.id))!, status: '2' }));
      await tick(at(1));
      for (const r of sms) expect((await deliveries(r.kind, r.id)).map((d) => d.delivery_state)).toEqual(['undelivered']);
      for (const r of asks) expect(await deliveries(r.kind, r.id)).toEqual([]);
      expect((await inboxRow(reports[0]!)).match_state).toBe('matched');
      expect((await inboxRow(reports[1]!)).match_state).toBe('matched');
      for (const rep of reports.slice(2)) expect(await inboxRow(rep)).toMatchObject({ match_state: 'unmatched', match_detail: 'not_sms' });
    });

    it('(9) status 0, and an unknown status (7), on a matching row ⇒ ignored:*, ⛔ delivery write; the unknown one alarms', async () => {
      const id = await sendRow('cr');
      const req = (await pmidOf('cr', id))!;
      const r0 = await inbox({ crqid: `cr${hex(id)}`, requestId: req, status: '0' });
      const r7 = await inbox({ crqid: `cr${hex(id)}`, requestId: req, status: '7' });
      const before = await allDeliveries();
      const { alarms } = await tick(at(1));
      expect(await inboxRow(r0)).toMatchObject({ match_state: 'ignored', match_detail: 'intermediate' });
      expect(await inboxRow(r7)).toMatchObject({ match_state: 'ignored', match_detail: 'unknown_status' });
      expect(alarms).toEqual(['[jobs] sms-delivery-correlator: sms_report.unknown_status:7 (count 1)']);
      expect(await deliveries('cr', id)).toEqual([]);
      expect(await allDeliveries()).toEqual(before);
    });
  });

  describe('AC5 — the status mapping end to end (DR4)', () => {
    it.each([
      ['1', 'matched', 'delivered'],
      ['2', 'matched', 'undelivered'],
      ['9', 'matched', 'undelivered'],
      ['16', 'matched', 'undelivered'],
      ['17', 'matched', 'undelivered'],
      ['20', 'matched', 'undelivered'],
      ['25', 'matched', 'undelivered'],
      ['0', 'ignored', 'intermediate'],
      [null, 'ignored', 'unknown_status'],
      ['7', 'ignored', 'unknown_status'],
    ] as const)('status %s ⇒ %s:%s', async (status, state, detail) => {
      const id = await sendRow('cr');
      const r = await inbox({ crqid: `cr${hex(id)}`, requestId: (await pmidOf('cr', id))!, status });
      await tick(at(1));
      expect(await inboxRow(r)).toMatchObject({ match_state: state, match_detail: detail });
    });

    it('an `ot` report with an unknown code raises the SAME unknown_status alarm', async () => {
      await inbox({ crqid: `ot${hex(randomUUID())}`, status: '42' });
      const { alarms } = await tick(at(1));
      expect(alarms).toEqual(['[jobs] sms-delivery-correlator: sms_report.unknown_status:42 (count 1)']);
    });
  });

  describe('AC6 (8f), (8g), (8i) — the counting contract through the drain', () => {
    it('(8f) two POSTs with the same key but a different reason ⇒ ONE inbox row, report_count 1, the FIRST reason', async () => {
      const id = await sendRow('cr');
      const req = (await pmidOf('cr', id))!;
      const persisted = await smsDelivery.persistSmsDeliveryReports(pool, [
        { requestId: req, crqid: `cr${hex(id)}`, statusCode: '2', eventName: 'failed', failureReason: 'first', reportedDeliveryTime: null },
      ]);
      const again = await smsDelivery.persistSmsDeliveryReports(pool, [
        { requestId: req, crqid: `cr${hex(id)}`, statusCode: '2', eventName: 'other', failureReason: 'second', reportedDeliveryTime: '2025-07-09T11:30:00Z' },
      ]);
      requestIds.push(req);
      expect([persisted, again]).toEqual([1, 0]);
      // these two rows are present-day — make them due at the year-2000 clock
      await pool.query(`UPDATE sms_delivery_report_inbox SET received_at = $2, next_attempt_at = $2 WHERE request_id = $1`, [req, T0]);
      await tick(at(1));
      expect(await deliveries('cr', id)).toEqual([expect.objectContaining({ report_count: 1, failure_reason: 'first', delivery_state: 'undelivered' })]);
      expect(await scopedDeliveries('cr', id, PARIWAR)).toEqual([expect.objectContaining({ report_count: 1, failure_reason: 'first' })]);
      expect(await scopedDeliveries('cr', id, OTHER_PARIWAR)).toEqual([]);
    });

    it('(8g) status 0 then status 1 for the same send ⇒ report_count 1', async () => {
      const id = await sendRow('pm');
      const req = (await pmidOf('pm', id))!;
      await inbox({ crqid: `pm${hex(id)}`, requestId: req, status: '0' });
      await tick(at(1));
      await inbox({ crqid: `pm${hex(id)}`, requestId: req, status: '1', receivedAt: at(2) });
      await tick(at(3));
      expect(await deliveries('pm', id)).toEqual([expect.objectContaining({ report_count: 1, delivery_state: 'delivered' })]);
      expect(await scopedDeliveries('pm', id, PARIWAR)).toEqual([expect.objectContaining({ report_count: 1, delivery_state: 'delivered' })]);
      expect(await scopedDeliveries('pm', id, OTHER_PARIWAR)).toEqual([]);
    });

    it('(8i) ⭐ a settle replayed after its lease lapsed ⇒ ⛔ counted twice (the CAS rolls the upsert back)', async () => {
      const id = await sendRow('sn');
      const req = (await pmidOf('sn', id))!;
      const report = await inbox({ crqid: `sn${hex(id)}`, requestId: req, status: '2' });
      // Drain A claims, stalls past its lease; drain B re-claims and settles; then A's settle arrives.
      const [claimedByA] = await smsDelivery.claimDueSmsDeliveryReports(pool, { now: at(1) });
      expect(claimedByA?.reportId).toBe(report);
      await tick(at(10));
      const after = await deliveries('sn', id);
      const c = await pool.connect();
      try {
        await c.query('BEGIN');
        await smsDelivery.upsertSmsSendDelivery(c, {
          pariwarId: PARIWAR,
          kind: 'sn',
          rowId: id,
          requestId: req,
          state: 'undelivered',
          statusCode: '2',
          failureReason: null,
          receivedAt: T0,
        });
        const moved = await smsDelivery.settleSmsDeliveryReport(c, {
          reportId: report,
          claimedAttempts: claimedByA!.attempts,
          settlement: { kind: 'settle', matchState: 'matched', matchDetail: 'undelivered' },
          now: at(11),
        });
        expect(moved).toBe(false);
        await c.query('ROLLBACK');
      } finally {
        c.release();
      }
      expect(await deliveries('sn', id)).toEqual(after);
      expect(after).toEqual([expect.objectContaining({ report_count: 1 })]);
      expect(await scopedDeliveries('sn', id, PARIWAR)).toEqual([expect.objectContaining({ report_count: 1 })]);
      expect(await scopedDeliveries('sn', id, OTHER_PARIWAR)).toEqual([]);
    });
  });

  describe('AC7 — the drain is at-least-once (DR8, T2)', () => {
    it('a worker that throws mid-row leaves it RE-CLAIMABLE after the lease (⛔ before); the other rows still settle', async () => {
      const bad = await sendRow('cr');
      const good = await sendRow('cr');
      const rb = await inbox({ crqid: `cr${hex(bad)}`, requestId: (await pmidOf('cr', bad))! });
      const rg = await inbox({ crqid: `cr${hex(good)}`, requestId: (await pmidOf('cr', good))! });
      const failing = recordingPool((s) => s.includes('INSERT INTO sms_send_deliveries') && failingOnce.armed && !(failingOnce.armed = false));
      const failingOnce = { armed: true };
      const first = await tick(at(1), { pool: failing.pool });
      expect(first.summary.failed).toBe(1);
      const failedRow = (await inboxRow(rb)).match_state === 'pending' ? rb : rg;
      const okRow = failedRow === rb ? rg : rb;
      expect(await inboxRow(okRow)).toMatchObject({ match_state: 'matched' });
      expect(await inboxRow(failedRow)).toMatchObject({ match_state: 'pending', attempts: 1 });
      expect((await inboxRow(failedRow)).lease_until).not.toBeNull();
      expect((await tick(at(3))).summary.claimed).toBe(0); // still leased (5 min)
      await tick(at(7));
      expect(await inboxRow(failedRow)).toMatchObject({ match_state: 'matched', attempts: 2 });
      for (const id of [bad, good]) expect(await deliveries('cr', id)).toEqual([expect.objectContaining({ report_count: 1 })]);
    });

    it('⭐ the settle and the delivery write are ATOMIC — a failure AFTER the upsert leaves BOTH unchanged', async () => {
      const id = await sendRow('ce');
      const r = await inbox({ crqid: `ce${hex(id)}`, requestId: (await pmidOf('ce', id))!, status: '2' });
      const failing = recordingPool((s) => s.includes('UPDATE sms_delivery_report_inbox SET match_state'));
      expect((await tick(at(1), { pool: failing.pool })).summary.failed).toBe(1);
      expect(await deliveries('ce', id)).toEqual([]);
      expect(await inboxRow(r)).toMatchObject({ match_state: 'pending' });
    });

    it('a row that fails EVERY time is settled unmatched:row_failed after 5 attempts AND 72 h (⛔ re-claimed forever; ⛔ on its first failure late)', async () => {
      const id = await sendRow('cr');
      const r = await inbox({ crqid: `cr${hex(id)}`, requestId: (await pmidOf('cr', id))! });
      const failing = recordingPool((s) => s.includes('INSERT INTO sms_send_deliveries'));
      const first = await tick(at(1), { pool: failing.pool });
      expect(first.summary.failed).toBe(1);
      expect(first.alarms).toEqual(['[jobs] sms-delivery-correlator: sms_report.row_failed (count 1; Error×1) — left to the lease']);
      // ⭐ Past 72 h but only its 2nd attempt (an outage backlog's first try): ⛔ given up — left to the lease.
      await tick(at(H72), { pool: failing.pool });
      expect(await inboxRow(r)).toMatchObject({ match_state: 'pending', attempts: 2 });
      // Attempts 3, 4 (each after the 5-minute lease), then the 5th gives up.
      await tick(at(H72 + 6), { pool: failing.pool });
      await tick(at(H72 + 12), { pool: failing.pool });
      expect(await inboxRow(r)).toMatchObject({ match_state: 'pending', attempts: 4 });
      const last = await tick(at(H72 + 18), { pool: failing.pool });
      expect(await inboxRow(r)).toMatchObject({ match_state: 'unmatched', match_detail: 'row_failed', attempts: 5 });
      expect(last.summary.settled['unmatched:row_failed']).toBeGreaterThanOrEqual(1);
      // ⚠ An earlier leg's still-pending row can come due at these late ticks (the suite shares one clock) — counts ≥ 1, ⛔ exact.
      expect(last.alarms.some((a) => /^\[jobs\] sms-delivery-correlator: sms_report\.row_failed_final:Error \(count [1-9]\d*\)$/.test(a))).toBe(true);
      expect(await deliveries('cr', id)).toEqual([]);
    });

    it('two CONCURRENT drains settle each row ONCE (SKIP LOCKED) — every report counted once', async () => {
      const ids: string[] = [];
      for (let i = 0; i < 8; i += 1) {
        const id = await sendRow('cr');
        ids.push(id);
        await inbox({ crqid: `cr${hex(id)}`, requestId: (await pmidOf('cr', id))! });
      }
      // A limit of 4 each: BOTH drains must claim, and together exactly the 8 (code review round 2 — `>= 0` was vacuous).
      const drain = () => runSmsDeliveryCorrelatorTick({ pool, now: () => at(1), limit: 4, onAlarm: () => undefined });
      const [a, b] = await Promise.all([drain(), drain()]);
      expect(a.lostRace + b.lostRace).toBe(0);
      expect([a.claimed, b.claimed]).toEqual([4, 4]);
      for (const id of ids) expect(await deliveries('cr', id)).toEqual([expect.objectContaining({ report_count: 1 })]);
      const { rows } = await pool.query<{ attempts: number; match_state: string }>(
        `SELECT attempts, match_state FROM sms_delivery_report_inbox WHERE crqid = ANY($1)`,
        [ids.map((id) => `cr${hex(id)}`)],
      );
      // each row claimed by exactly ONE of the two drains (attempts 1), and settled
      expect(rows.map((r) => [r.attempts, r.match_state])).toEqual(ids.map(() => [1, 'matched']));
    });

    it('the tick STOPS before the claim\'s lease lapses — a later row is left to the next tick (code review round 2)', async () => {
      const a = await sendRow('cr');
      const b = await sendRow('cr');
      const ra = await inbox({ crqid: `cr${hex(a)}`, requestId: (await pmidOf('cr', a))!, receivedAt: at(-2) });
      const rb = await inbox({ crqid: `cr${hex(b)}`, requestId: (await pmidOf('cr', b))!, receivedAt: at(-1) });
      // The clock: the claim at 1 min, the first row at 1 min, the second row 5 min later (the lease's end).
      const clocks = [at(1), at(1), at(6)];
      const summary = await runSmsDeliveryCorrelatorTick({ pool, now: () => clocks.shift() ?? at(6), onAlarm: () => undefined });
      expect(summary.claimed).toBeGreaterThanOrEqual(2);
      expect(summary.leftToLease).toBe(summary.claimed - 1);
      expect(await inboxRow(ra)).toMatchObject({ match_state: 'matched' });
      expect(await inboxRow(rb)).toMatchObject({ match_state: 'pending', attempts: 1 });
      await tick(at(7));
      expect(await inboxRow(rb)).toMatchObject({ match_state: 'matched', attempts: 2 });
    });

    it('the claim\'s limit is honoured (a tick of limit 1 takes ONE row)', async () => {
      await inbox({ crqid: null });
      await inbox({ crqid: null });
      const summary = await runSmsDeliveryCorrelatorTick({ pool, now: () => at(1), limit: 1, onAlarm: () => undefined });
      expect(summary.claimed).toBe(1);
      await tick(at(1));
    });
  });

  describe('AC8 — the send tables are untouched (I2)', () => {
    it('⭐ every send row byte-identical before / after correlation; `delivered_at` NULL; ⛔ write statement on a send table', async () => {
      const rows = [
        { kind: 'cr' as const, id: await sendRow('cr') },
        { kind: 'cr' as const, id: await sendRow('cr', { purpose: 'closure_notice' }) },
        { kind: 'ce' as const, id: await sendRow('ce') },
        { kind: 'sn' as const, id: await sendRow('sn') },
        { kind: 'pm' as const, id: await sendRow('pm') },
        { kind: 'cr' as const, id: await sendRow('cr', { outcome: 'error' }) },
      ];
      const snapshot = async () => {
        const out: string[] = [];
        for (const r of rows) {
          const { table, id } = TABLE[r.kind];
          out.push((await pool.query<{ j: string }>(`SELECT row_to_json(t)::text AS j FROM ${table} t WHERE ${id} = $1`, [r.id])).rows[0]!.j);
        }
        return out;
      };
      const before = await snapshot();
      for (const r of rows) {
        const req = (await pmidOf(r.kind, r.id)) ?? rid();
        await inbox({ crqid: `${r.kind}${hex(r.id)}`, requestId: req, status: '2' });
        await inbox({ crqid: `${r.kind}${hex(r.id)}`, requestId: req, status: '1' });
      }
      const rec = recordingPool();
      await tick(at(1), { pool: rec.pool });
      expect(await snapshot()).toEqual(before);
      for (const j of before) {
        const row = JSON.parse(j) as { delivered_at?: unknown };
        if ('delivered_at' in row) expect(row.delivered_at).toBeNull();
      }
      const writes = rec.statements.filter((s) =>
        /\b(UPDATE|INSERT\s+INTO|DELETE\s+FROM)\s+claim_(correction_reminders|certificate_reminders|suspicion_notices|peer_mesh_pings)\b/i.test(s),
      );
      expect(writes).toEqual([]);
      expect(rec.statements.some((s) => /FROM claim_correction_reminders WHERE reminder_id/.test(s))).toBe(true); // it DID read
    });
  });

  describe('AC9 — silence and the login-code line (DR11, DR12)', () => {
    // The silence window is (now − 7 days, now − 48 h]; `now` here is year 2000, so ⛔ a present-day row is in it.
    const NOW = new Date('2000-03-01T00:00:00.000Z');
    const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000);

    it('⭐ one accepted send per table 49 h old with ⛔ report is counted; with a report, 47 h old, 8 days old, a staff push ⇒ ⛔', async () => {
      const silent: { kind: Kind; id: string }[] = [];
      silent.push({ kind: 'cr', id: await sendRow('cr', { updatedAt: hoursAgo(49) }) });
      silent.push({ kind: 'cr', id: await sendRow('cr', { purpose: 'closure_notice', updatedAt: hoursAgo(49) }) });
      silent.push({ kind: 'ce', id: await sendRow('ce', { updatedAt: hoursAgo(49) }) });
      silent.push({ kind: 'sn', id: await sendRow('sn', { updatedAt: hoursAgo(49) }) });
      silent.push({ kind: 'pm', id: await sendRow('pm', { updatedAt: hoursAgo(49) }) });
      // ⛔ counted:
      const reported = await sendRow('cr', { updatedAt: hoursAgo(50) });
      await inbox({ crqid: `cr${hex(reported)}`, status: '0' }); // ANY report carrying its CRQID (even an unmatched one)
      await sendRow('ce', { updatedAt: hoursAgo(47) });
      await sendRow('sn', { updatedAt: hoursAgo(24 * 8) });
      await sendRow('cr', { purpose: 'staff_push', providerMessageId: 'fcm-x', updatedAt: hoursAgo(49) });
      await sendRow('pm', { outcome: 'error', updatedAt: hoursAgo(49) });
      const delivered = await sendRow('pm', { updatedAt: hoursAgo(60) });
      await smsDelivery.upsertSmsSendDelivery(pool, {
        pariwarId: PARIWAR,
        kind: 'pm',
        rowId: delivered,
        requestId: (await pmidOf('pm', delivered))!,
        state: 'delivered',
        statusCode: '1',
        failureReason: null,
        receivedAt: T0,
      });

      const alarms: string[] = [];
      const lines: string[] = [];
      const out = await runSmsDeliverySilenceCheck({ pool, now: () => NOW, onAlarm: (m) => alarms.push(m), log: (m) => lines.push(m) });
      expect(out.silent).toEqual({ cr: 2, ce: 1, sn: 1, pm: 1 });
      expect(alarms).toHaveLength(1);
      expect(alarms[0]).toContain('sms_report.silence:5');
      expect(alarms[0]).toContain('cr 2, ce 1, sn 1, pm 1');
      for (const s of silent) expect(alarms[0]).not.toContain(hex(s.id));
      expect(lines).toHaveLength(1);
    });

    it('⭐ Story 6.37c (AC10) — an accepted `ladder_sms` with ⛔ report is silent on BOTH kinds; its ask (`ladder_escalation`) ⛔', async () => {
      const LATE = new Date('2000-05-01T00:00:00.000Z');
      const hrs = (h: number) => new Date(LATE.getTime() - h * 3_600_000);
      const ladder = randomUUID();
      await sendRow('cr', { purpose: 'ladder_sms', subjectKey: `ladder:${ladder}:3`, updatedAt: hrs(49) });
      await sendRow('ce', { purpose: 'ladder_sms', subjectKey: `ladder:${ladder}:3`, updatedAt: hrs(49) });
      await sendRow('cr', { purpose: 'ladder_escalation', subjectKey: `ladder:${ladder}x`, outcome: 'recorded', providerMessageId: null, updatedAt: hrs(49) });
      const out = await runSmsDeliverySilenceCheck({ pool, now: () => LATE, onAlarm: () => undefined, log: () => undefined });
      expect(out.silent.cr).toBe(1);
      expect(out.silent.ce).toBe(1);
    });

    it('⛔ silent send ⇒ ⛔ alarm; the login-code line counts `otp:*` settled in the last 24 h by result, ⛔ an id', async () => {
      const LATER = new Date('2000-06-01T00:00:00.000Z');
      const crqids = [`ot${hex(randomUUID())}`, `ot${hex(randomUUID())}`, `ot${hex(randomUUID())}`, `ot${hex(randomUUID())}`];
      const recent = new Date(LATER.getTime() - 3_600_000);
      for (const [i, status] of ['1', '1', '2', '0'].entries()) await inbox({ crqid: crqids[i]!, status, receivedAt: recent });
      await inbox({ crqid: `ot${hex(randomUUID())}`, status: '42', receivedAt: recent });
      await runSmsDeliveryCorrelatorTick({ pool, now: () => recent, onAlarm: () => undefined });
      const alarms: string[] = [];
      const lines: string[] = [];
      const out = await runSmsDeliverySilenceCheck({ pool, now: () => LATER, onAlarm: (m) => alarms.push(m), log: (m) => lines.push(m) });
      expect(out.otp).toEqual({ delivered: 2, undelivered: 1, intermediate: 1, unknown: 1 });
      expect(lines).toEqual(['[jobs] sms-delivery: otp delivery: delivered 2, undelivered 1, intermediate 1, unknown 1']);
      for (const c of crqids) expect(lines[0]).not.toContain(c);
      expect(alarms).toEqual([]);
    });
  });

  it('AC10 — the daily prune deletes reports settled > 30 days ago (by settled_at); pending rows and deliveries stay', async () => {
    const id = await sendRow('cr');
    const req = (await pmidOf('cr', id))!;
    const old = await inbox({ crqid: `cr${hex(id)}`, requestId: req });
    const pending = await inbox({ crqid: `ce${hex(randomUUID())}` }); // ⛔ row ⇒ stays pending
    await tick(at(1));
    expect(await inboxRow(old)).toMatchObject({ match_state: 'matched' });
    await runSmsDeliveryPrune({ pool, now: () => new Date(at(1).getTime() + 31 * 24 * 3_600_000) });
    expect((await pool.query('SELECT 1 FROM sms_delivery_report_inbox WHERE report_id = $1', [old])).rows).toHaveLength(0);
    expect(await inboxRow(pending)).toMatchObject({ match_state: 'pending' });
    expect(await deliveries('cr', id)).toHaveLength(1);
  });
});
