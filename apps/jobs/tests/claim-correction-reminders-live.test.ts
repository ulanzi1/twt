// The claim-correction REMINDERS — the sweep, the family SMS child and the staff push against the live DB (Story
// 6.19b; AC2, AC3, AC4, AC9b, AC11b "schedule", "runs", "races and crashes", "the record", "pause tiers", "send
// safety", "retries", "staff push", "D30", "letters", "-271"). Own-committing (the sweep reads COMMITTED runs across
// tenants), an INJECTED clock, a fake SMS gateway and a capturing queue. Assertions key on OUR claim ids — the sweep
// sees every open run in the database ([[project_live_db_test_gotchas]]: membership, ⛔ never counts).

import { randomUUID } from 'node:crypto';

import { SmsSendError, type SmsAppClient, type SmsGatewayMessage } from '@twt/channels';
import { claim, cycleCalendar, ids, withPariwarScope } from '@twt/domain';
import type { JobEnvelope } from '@twt/queue';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildJobsEncryptionDeps } from '../src/deps.js';
import {
  ClaimCorrectionTransientError,
  runCorrectionFamilySmsChild,
  runCorrectionReminderSweep,
  runCorrectionStaffPush,
  type ClaimCorrectionReminderDeps,
  type CorrectionFamilySmsPayload,
  type CorrectionStaffPushPayload,
} from '../src/scheduler/claim-correction-reminders.js';
import { cleanupClaims, onOwnTx, seedReturnedClaim, type SeedReturnedClaimOptions } from './_claim-correction-seed.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);
const PARIWAR = randomUUID();
const OTHER_PARIWAR = randomUUID();
const HELPLINE = '+911800123456';
const enc = buildJobsEncryptionDeps('claim-correction-live-pepper');

/** 10:00 IST on `date` (the sweep's hour). */
const tenAmIst = (date: string) => new Date(Date.parse(`${date}T10:00:00+05:30`));

describe.skipIf(!hasDatabase)('Story 6.19b — the claim-correction reminders (live DB, own-committing)', () => {
  let pool: pg.Pool;
  const claims: string[] = [];
  const members: string[] = [];

  beforeAll(() => {
    pool = new pg.Pool({ connectionString: DATABASE_URL, max: 8, ssl: false, connectionTimeoutMillis: 5000 });
    pool.on('error', (err) => console.error('[claim-correction-reminders-live] idle client error:', err.message));
  });
  afterAll(async () => {
    await cleanupClaims(pool, claims, members);
    await pool.end();
  });

  // ── Harness ─────────────────────────────────────────────────────────────────────────────────────────────────
  interface Harness {
    deps: ClaimCorrectionReminderDeps;
    enqueued: { queue: string; data: JobEnvelope<unknown>; opts: unknown }[];
    sent: SmsGatewayMessage[];
    alarms: string[];
    setNow: (d: Date) => void;
  }
  function harness(
    opts: {
      gateway?: (m: SmsGatewayMessage) => Promise<string>;
      configured?: boolean;
      config?: Record<string, string | null>;
    } = {},
  ): Harness {
    const enqueued: Harness['enqueued'] = [];
    const sent: SmsGatewayMessage[] = [];
    const alarms: string[] = [];
    let now = new Date();
    const smsAppClient: SmsAppClient = {
      isConfigured: () => opts.configured ?? true,
      messaging: () => ({
        send: (m) => {
          sent.push(m);
          return (opts.gateway ?? (() => Promise.resolve(`gw-${randomUUID()}`)))(m);
        },
      }),
    };
    const deps: ClaimCorrectionReminderDeps = {
      pool,
      encryption: enc,
      smsAppClient,
      resolveConfig: async (key) => {
        if (opts.config && key in opts.config) return opts.config[key]!;
        if (key.startsWith('sms.dlt.template_id.claim_correction.')) return 'TPL-1';
        if (key === `sms.claim_correction.helpline_number.${PARIWAR}`) return HELPLINE;
        return null;
      },
      push: { audit: { write: () => Promise.resolve() } as never, hashRendered: () => Promise.resolve('h') as never },
      now: () => now,
      onAlarm: (m) => alarms.push(m),
    };
    return { deps, enqueued, sent, alarms, setNow: (d) => (now = d) };
  }
  /** A capturing queue — records every `send` (the payload is asserted PII-free below). */
  const boss = (h: Harness) =>
    ({
      send: (queue: string, data: object, o?: unknown) => {
        h.enqueued.push({ queue, data: data as JobEnvelope<unknown>, opts: o });
        return Promise.resolve(randomUUID());
      },
    }) as unknown as Parameters<typeof runCorrectionReminderSweep>[1];
  const smsFor = (h: Harness, cid: string) =>
    h.enqueued.filter((e) => e.queue === 'claim.correction.family_sms' && (e.data.payload as CorrectionFamilySmsPayload).claimCaseId === cid);
  const pushesFor = (h: Harness, cid: string) =>
    h.enqueued.filter((e) => e.queue === 'claim.correction.staff_push' && (e.data.payload as CorrectionStaffPushPayload).claimCaseId === cid);

  async function seed(opts: SeedReturnedClaimOptions & { pariwarId?: string } = {}) {
    const s = await seedReturnedClaim(pool, opts.pariwarId ?? PARIWAR, enc, opts);
    claims.push(s.claimCaseId);
    members.push(s.deceasedMemberId);
    return s;
  }
  async function rowsOf(cid: string) {
    const { rows } = await pool.query<{
      slot_day: number;
      purpose: string;
      recipient_key: string;
      subject_key: string;
      outcome: string;
      late: boolean;
      detail: string | null;
      first_detail: string | null;
      attempt_count: number;
      recipient_number_hash: string | null;
      delivered_at: Date | null;
      provider_message_id: string | null;
    }>('SELECT * FROM claim_correction_reminders WHERE claim_case_id = $1 ORDER BY slot_day, purpose, recipient_key', [cid]);
    return rows;
  }
  async function runOf(runId: string) {
    const { rows } = await pool.query<{ ended_at: Date | null; end_reason: string | null; day0: string }>(
      "SELECT ended_at, end_reason, to_char(day0, 'YYYY-MM-DD') AS day0 FROM claim_correction_runs WHERE run_id = $1",
      [runId],
    );
    return rows[0]!;
  }
  const child = (h: Harness, e: Harness['enqueued'][number], jobId: string = randomUUID()) =>
    runCorrectionFamilySmsChild(h.deps, e.data as JobEnvelope<CorrectionFamilySmsPayload>, jobId);

  // ── The schedule and the send ───────────────────────────────────────────────────────────────────────────────

  it('⭐ G4 — ⛔ no send on day 0; day 1 sends each person ONCE (hi, name-free, reference + helpline), recorded `accepted`, ⛔ never delivered', async () => {
    const s = await seed({ nomineeMobiles: ['9812345678', '9812345679'] });
    const { day0 } = await runOf(s.runId!);
    const h = harness();
    h.setNow(tenAmIst(day0));
    await runCorrectionReminderSweep(h.deps, boss(h));
    expect(smsFor(h, s.claimCaseId)).toHaveLength(0);

    h.setNow(tenAmIst(cycleCalendar.addCalendarDays(day0, 1)));
    await runCorrectionReminderSweep(h.deps, boss(h));
    const jobs = smsFor(h, s.claimCaseId);
    expect(jobs).toHaveLength(2);
    expect(jobs.every((j) => (j.data.payload as CorrectionFamilySmsPayload).slotDay === 1 && !(j.data.payload as CorrectionFamilySmsPayload).late)).toBe(true);
    // ⭐ AC9b — the job carries ids, ⛔ never a number.
    expect(JSON.stringify(jobs)).not.toContain('9812345678');
    expect((jobs[0]!.opts as { retryLimit: number }).retryLimit).toBe(4);

    for (const j of jobs) expect(await child(h, j)).toEqual({ status: 'sent', outcome: 'accepted' });
    expect(h.sent.map((m) => m.to).sort()).toEqual(['+919812345678', '+919812345679']);
    const ref = claim.claimShortReference(s.claimCaseId);
    expect(h.sent[0]!.body).toContain(ref);
    expect(h.sent[0]!.body).toContain(HELPLINE);
    expect(h.sent[0]!.body.startsWith('दावा')).toBe(true);
    expect(h.sent[0]!.body).not.toContain('Nominee');
    const family = (await rowsOf(s.claimCaseId)).filter((r) => r.purpose === 'family_sms');
    expect(family).toHaveLength(2);
    expect(family.every((r) => r.outcome === 'accepted' && r.delivered_at === null && r.recipient_number_hash !== null && r.provider_message_id !== null)).toBe(true);
    // The two people's numbers hash differently, and ⛔ neither is the login-key blind index.
    expect(new Set(family.map((r) => r.recipient_number_hash)).size).toBe(2);
  });

  it('⭐ a second sweep the same day enqueues ⛔ nothing new for a recorded slot; a second delivery of the child is a no-op', async () => {
    const s = await seed();
    const { day0 } = await runOf(s.runId!);
    const h = harness();
    h.setNow(tenAmIst(cycleCalendar.addCalendarDays(day0, 1)));
    await runCorrectionReminderSweep(h.deps, boss(h));
    const [job] = smsFor(h, s.claimCaseId);
    await child(h, job!);
    await runCorrectionReminderSweep(h.deps, boss(h));
    expect(smsFor(h, s.claimCaseId)).toHaveLength(1);
    expect(await child(h, job!)).toEqual({ status: 'noop', reason: 'already_final' });
    expect(h.sent).toHaveLength(1);
  });

  it('⭐ D3 catch-up after an outage: ONE late send of the latest missed slot, the older ones skipped — ⛔ no burst', async () => {
    const s = await seed();
    const { day0 } = await runOf(s.runId!);
    const h = harness();
    h.setNow(tenAmIst(cycleCalendar.addCalendarDays(day0, 9)));
    await runCorrectionReminderSweep(h.deps, boss(h));
    const jobs = smsFor(h, s.claimCaseId);
    expect(jobs).toHaveLength(1);
    expect(jobs[0]!.data.payload).toMatchObject({ slotDay: 7, late: true });
    const skipped = (await rowsOf(s.claimCaseId)).filter((r) => r.purpose === 'family_sms' && r.outcome === 'skipped_superseded');
    expect(skipped.map((r) => r.slot_day)).toEqual([1, 2, 3, 4, 5, 6]);
    // The District Admin's reminder is ONE (D34), late, and ⛔ no live shepherd ⇒ no_target + alarm.
    const staff = (await rowsOf(s.claimCaseId)).filter((r) => r.purpose === 'staff_reminder');
    expect(staff).toEqual([expect.objectContaining({ slot_day: 7, recipient_key: 'staff:unassigned', outcome: 'no_target', late: true })]);
    expect(h.alarms.some((a) => a.includes(s.claimCaseId) && a.includes('live shepherd'))).toBe(true);
    expect(pushesFor(h, s.claimCaseId)).toHaveLength(0);
  });

  it('⭐ a switch to staff between enqueue and send ⇒ ⛔ no SMS (skipped_superseded, ⛔ no throw)', async () => {
    const s = await seed();
    const { day0 } = await runOf(s.runId!);
    const h = harness();
    h.setNow(tenAmIst(cycleCalendar.addCalendarDays(day0, 1)));
    await runCorrectionReminderSweep(h.deps, boss(h));
    const [job] = smsFor(h, s.claimCaseId);
    await onOwnTx(pool, PARIWAR, (client) =>
      claim.writeCorrectionMark(client, {
        pariwarId: ids.pariwarId(PARIWAR),
        claimCaseId: ids.claimId(s.claimCaseId),
        mustAct: 'staff',
        actorId: randomUUID(),
        actorDisplay: 'District Admin',
        setByRole: 'district_admin',
        noteCiphertext: 'enc:v1:note',
      }),
    );
    expect(await child(h, job!)).toEqual({ status: 'skipped', reason: 'run_ended' });
    expect(h.sent).toHaveLength(0);
  });

  it('⭐ a transient failure then a retry of the SAME job ⇒ re-claimed at once and sent (attempt_count 2, first_detail kept)', async () => {
    const s = await seed();
    const { day0 } = await runOf(s.runId!);
    let calls = 0;
    const h = harness({ gateway: () => (calls++ === 0 ? Promise.reject(new SmsSendError('down', null, 503)) : Promise.resolve('gw-ok')) });
    h.setNow(tenAmIst(cycleCalendar.addCalendarDays(day0, 1)));
    await runCorrectionReminderSweep(h.deps, boss(h));
    const [job] = smsFor(h, s.claimCaseId);
    await expect(child(h, job!, 'job-1')).rejects.toBeInstanceOf(ClaimCorrectionTransientError);
    expect((await rowsOf(s.claimCaseId)).find((r) => r.purpose === 'family_sms')).toMatchObject({ outcome: 'attempting', detail: 'api_unavailable:http_503' });
    expect(await child(h, job!, 'job-1')).toEqual({ status: 'sent', outcome: 'accepted' });
    expect((await rowsOf(s.claimCaseId)).find((r) => r.purpose === 'family_sms')).toMatchObject({
      outcome: 'accepted',
      attempt_count: 2,
      first_detail: 'api_unavailable:http_503',
    });
  });

  it('⭐ the exhausted-row finaliser: an `attempting` row from a previous IST day becomes `error` + alarm, ⛔ no catch-up for it', async () => {
    const s = await seed();
    const { day0 } = await runOf(s.runId!);
    const h = harness({ gateway: () => Promise.reject(new SmsSendError('down', null, 503)) });
    h.setNow(tenAmIst(cycleCalendar.addCalendarDays(day0, 1)));
    await runCorrectionReminderSweep(h.deps, boss(h));
    await expect(child(h, smsFor(h, s.claimCaseId)[0]!)).rejects.toBeInstanceOf(ClaimCorrectionTransientError);
    h.setNow(tenAmIst(cycleCalendar.addCalendarDays(day0, 2)));
    await runCorrectionReminderSweep(h.deps, boss(h));
    const day1 = (await rowsOf(s.claimCaseId)).find((r) => r.purpose === 'family_sms' && r.slot_day === 1);
    expect(day1).toMatchObject({ outcome: 'error', detail: 'exhausted:attempting_past_day' });
    expect(h.alarms.some((a) => a.includes('previous') && a.includes(s.claimCaseId))).toBe(true);
    // Day 2 is sent on its own; day 1 is ⛔ re-sent.
    expect(smsFor(h, s.claimCaseId).map((j) => (j.data.payload as CorrectionFamilySmsPayload).slotDay)).toEqual([1, 2]);
  });

  it('⭐ `-269` §4 — carrier_reject ⇒ rejected_unreachable and letter-eligible; invalid_number ⇒ rejected_invalid_number', async () => {
    const s = await seed({ nomineeMobiles: ['9812345678', '9812345679'] });
    const { day0 } = await runOf(s.runId!);
    const h = harness({
      gateway: (m) => Promise.reject(new SmsSendError('x', m.to.endsWith('78') ? 'CARRIER_REJECT' : 'INVALID_NUMBER', 400)),
    });
    h.setNow(tenAmIst(cycleCalendar.addCalendarDays(day0, 1)));
    await runCorrectionReminderSweep(h.deps, boss(h));
    for (const j of smsFor(h, s.claimCaseId)) await child(h, j);
    const outcomes = (await rowsOf(s.claimCaseId)).filter((r) => r.purpose === 'family_sms').map((r) => r.outcome).sort();
    expect(outcomes).toEqual(['rejected_invalid_number', 'rejected_unreachable']);
    const recipients = await withPariwarScope(pool, PARIWAR, (db) => claim.readCorrectionRecipients(db, ids.pariwarId(PARIWAR), ids.claimId(s.claimCaseId)));
    const run = await withPariwarScope(pool, PARIWAR, (db) => claim.readCorrectionRun(db, ids.pariwarId(PARIWAR), s.runId!));
    const states = await withPariwarScope(pool, PARIWAR, (db) => claim.readRunPersonStates(db, ids.pariwarId(PARIWAR), run!, recipients.people));
    expect(states.map((x) => x.state.deadKind).sort()).toEqual(['dead', 'unreachable']);
  });

  it('⭐ a number that is ⛔ not a valid mobile ⇒ `no_target` WITHOUT a send; the letter chase runs 7 → 12 → escalated on 13', async () => {
    const s = await seed({ nomineeMobiles: ['12345'] });
    const { day0 } = await runOf(s.runId!);
    const h = harness();
    h.setNow(tenAmIst(cycleCalendar.addCalendarDays(day0, 1)));
    await runCorrectionReminderSweep(h.deps, boss(h));
    expect(await child(h, smsFor(h, s.claimCaseId)[0]!)).toEqual({ status: 'sent', outcome: 'no_target' });
    expect(h.sent).toHaveLength(0);
    const foundDead = cycleCalendar.addCalendarDays(day0, 1);
    for (const off of [6, 7, 12, 13]) {
      h.setNow(tenAmIst(cycleCalendar.addCalendarDays(foundDead, off)));
      await runCorrectionReminderSweep(h.deps, boss(h));
    }
    const rows = await rowsOf(s.claimCaseId);
    const chase = rows.filter((r) => r.purpose === 'letter_chase').map((r) => r.slot_day);
    expect(chase).toEqual([1 + 7, 1 + 12]); // run days of found-dead + 7 and + 12 (⛔ none at + 6)
    const esc = rows.filter((r) => r.purpose === 'escalation');
    expect(esc).toEqual([expect.objectContaining({ slot_day: 1 + 13, subject_key: expect.stringMatching(/^nominee:/) })]);
    expect(rows.every((r) => r.subject_key === '' || r.purpose !== 'family_sms')).toBe(true);
  });

  it('⭐ a recorded delivery stops that person\'s reminders (⛔ not before); D21 stops the District Admin\'s; ONE letter_second_due at delivery + 30', async () => {
    const s = await seed({ nomineeMobiles: ['12345'] });
    const { day0 } = await runOf(s.runId!);
    const h = harness();
    h.setNow(tenAmIst(cycleCalendar.addCalendarDays(day0, 1)));
    await runCorrectionReminderSweep(h.deps, boss(h));
    await child(h, smsFor(h, s.claimCaseId)[0]!); // no_target ⇒ letter-eligible, found-dead = day 1
    const pid = ids.pariwarId(PARIWAR);
    const cid = ids.claimId(s.claimCaseId);
    const [person] = (await withPariwarScope(pool, PARIWAR, (db) => claim.readCorrectionRecipients(db, pid, cid))).people;
    const posted = cycleCalendar.addCalendarDays(day0, 2);
    const letter = await onOwnTx(pool, PARIWAR, (client) =>
      claim.recordCorrectionLetter(client, {
        pariwarId: pid, claimCaseId: cid, personKey: person!.personKey, postedOn: posted,
        trackingNumberCiphertext: 'enc:v1:t', actorId: randomUUID(), actorDisplay: 'District Admin',
      }),
    );
    // A POSTED letter does ⛔ not stop the reminders.
    h.setNow(tenAmIst(cycleCalendar.addCalendarDays(day0, 3)));
    await runCorrectionReminderSweep(h.deps, boss(h));
    expect(smsFor(h, s.claimCaseId).map((j) => (j.data.payload as CorrectionFamilySmsPayload).slotDay)).toEqual([1, 3]);
    await child(h, smsFor(h, s.claimCaseId)[1]!);
    const delivered = cycleCalendar.addCalendarDays(day0, 4);
    await onOwnTx(pool, PARIWAR, (client) =>
      claim.recordCorrectionLetterDelivery(client, {
        pariwarId: pid, claimCaseId: cid, letterId: letter.letterId, deliveredOn: delivered,
        screenshotStorageKey: `k/${letter.letterId}`, screenshotContentType: 'image/png', screenshotSizeBytes: 10,
        actorId: randomUUID(), actorDisplay: 'District Admin',
      }),
    );
    // After the recorded delivery: ⛔ no family SMS; every recipient delivered ⇒ ⛔ no District Admin reminder (D21).
    const before = (await rowsOf(s.claimCaseId)).filter((r) => r.purpose === 'staff_reminder').length;
    h.setNow(tenAmIst(cycleCalendar.addCalendarDays(day0, 5)));
    await runCorrectionReminderSweep(h.deps, boss(h));
    expect(smsFor(h, s.claimCaseId)).toHaveLength(2);
    expect((await rowsOf(s.claimCaseId)).filter((r) => r.purpose === 'staff_reminder')).toHaveLength(before);
    // ONE second-letter reminder at the delivery + 30 days.
    for (const d of [33, 34, 35]) {
      h.setNow(tenAmIst(cycleCalendar.addCalendarDays(day0, d)));
      await runCorrectionReminderSweep(h.deps, boss(h));
    }
    const second = (await rowsOf(s.claimCaseId)).filter((r) => r.purpose === 'letter_second_due');
    expect(second).toEqual([expect.objectContaining({ slot_day: 34, subject_key: person!.personKey })]);
  });

  it('⭐ tier (b): the family\'s part is done ⇒ ⛔ no family SMS, the District Admin still reminded', async () => {
    const s = await seed();
    const { day0 } = await runOf(s.runId!);
    await pool.query("UPDATE claim_nominee_bank_accounts SET updated_at = now() + interval '1 minute' WHERE claim_case_id = $1", [s.claimCaseId]);
    const h = harness();
    h.setNow(tenAmIst(cycleCalendar.addCalendarDays(day0, 1)));
    await runCorrectionReminderSweep(h.deps, boss(h));
    expect(smsFor(h, s.claimCaseId)).toHaveLength(0);
    expect((await rowsOf(s.claimCaseId)).map((r) => r.purpose)).toEqual(['staff_reminder']);
  });

  it('⭐ D30 — ⛔ no contact record ⇒ ⛔ no family send and ⛔ no family row; the staff reminder still runs', async () => {
    const s = await seed({ withContact: false });
    const { day0 } = await runOf(s.runId!);
    const h = harness();
    h.setNow(tenAmIst(cycleCalendar.addCalendarDays(day0, 1)));
    await runCorrectionReminderSweep(h.deps, boss(h));
    expect(smsFor(h, s.claimCaseId)).toHaveLength(0);
    expect((await rowsOf(s.claimCaseId)).map((r) => r.purpose)).toEqual(['staff_reminder']);
  });

  it('⭐ a staff-marked return sends the family ⛔ nothing; the staff run escalates on day 12', async () => {
    const s = await seed({ mustAct: 'staff' });
    const { day0 } = await runOf(s.runId!);
    const h = harness();
    for (const d of [1, 12]) {
      h.setNow(tenAmIst(cycleCalendar.addCalendarDays(day0, d)));
      await runCorrectionReminderSweep(h.deps, boss(h));
    }
    expect(smsFor(h, s.claimCaseId)).toHaveLength(0);
    const rows = await rowsOf(s.claimCaseId);
    expect(rows.filter((r) => r.purpose === 'family_sms')).toHaveLength(0);
    expect(rows.filter((r) => r.purpose === 'escalation').map((r) => r.slot_day)).toEqual([12]);
    expect(rows.filter((r) => r.purpose === 'staff_reminder').map((r) => r.slot_day)).toEqual([1, 10]);
  });

  it('⭐ the run ends at day 90, and when its return is superseded — through end-run', async () => {
    const s = await seed();
    const { day0 } = await runOf(s.runId!);
    const h = harness();
    h.setNow(tenAmIst(cycleCalendar.addCalendarDays(day0, 90)));
    await runCorrectionReminderSweep(h.deps, boss(h));
    expect(await runOf(s.runId!)).toMatchObject({ end_reason: 'day_90' });
    expect(smsFor(h, s.claimCaseId)).toHaveLength(0);

    const t = await seed();
    await pool.query('UPDATE claim_state_trustee_decisions SET superseded_at = now() WHERE decision_id = $1', [t.returnId]);
    await runCorrectionReminderSweep(h.deps, boss(h));
    expect(await runOf(t.runId!)).toMatchObject({ end_reason: 'superseded' });
  });

  it('⛔ fail closed — an unset helpline number for THIS Pariwar and an unconfigured gateway record `error` + alarm, ⛔ never accepted', async () => {
    const s = await seed({ pariwarId: OTHER_PARIWAR });
    const { day0 } = await runOf(s.runId!);
    const h = harness();
    h.setNow(tenAmIst(cycleCalendar.addCalendarDays(day0, 1)));
    await runCorrectionReminderSweep(h.deps, boss(h));
    expect(await child(h, smsFor(h, s.claimCaseId)[0]!)).toEqual({ status: 'sent', outcome: 'error' });
    expect((await rowsOf(s.claimCaseId)).find((r) => r.purpose === 'family_sms')).toMatchObject({ outcome: 'error', detail: 'config:helpline_number_missing' });
    expect(h.alarms.some((a) => a.includes('helpline_number_missing'))).toBe(true);
    expect(h.sent).toHaveLength(0);

    const u = await seed();
    const h2 = harness({ configured: false });
    h2.setNow(tenAmIst(cycleCalendar.addCalendarDays((await runOf(u.runId!)).day0, 1)));
    await runCorrectionReminderSweep(h2.deps, boss(h2));
    await child(h2, smsFor(h2, u.claimCaseId)[0]!);
    expect((await rowsOf(u.claimCaseId)).find((r) => r.purpose === 'family_sms')).toMatchObject({ outcome: 'error', detail: 'config:sms_gateway_unconfigured' });
  });

  it('⭐ the staff push: ONE per (claim, staff member, day); a re-run is a no-op; ⛔ no device token ⇒ no_target, ⛔ no alarm', async () => {
    const s = await seed();
    const { day0 } = await runOf(s.runId!);
    const userId = randomUUID();
    const today = cycleCalendar.addCalendarDays(day0, 1);
    await onOwnTx(pool, PARIWAR, async (client) => {
      const db = (await import('@twt/domain')).bindScopedDb(client);
      for (const purpose of ['staff_reminder', 'letter_chase'] as const) {
        await claim.insertFinalCorrectionReminder(db, {
          pariwarId: ids.pariwarId(PARIWAR),
          claimCaseId: ids.claimId(s.claimCaseId),
          runId: s.runId!,
          slotDay: 1,
          sentOn: today,
          recipientKey: `staff:${userId}`,
          purpose,
          subjectKey: purpose === 'letter_chase' ? 'nominee:x' : '',
          outcome: 'recorded',
        });
      }
    });
    const h = harness();
    h.setNow(tenAmIst(today));
    const env: JobEnvelope<CorrectionStaffPushPayload> = {
      pariwarId: PARIWAR,
      requestId: 'r',
      actorId: null,
      traceId: 't',
      payload: { claimCaseId: s.claimCaseId, runId: s.runId!, slotDay: 1, userId, sentOn: today },
    };
    expect(await runCorrectionStaffPush(h.deps, env, 'push-1')).toEqual({ status: 'pushed', outcome: 'no_target' });
    expect(await runCorrectionStaffPush(h.deps, env, 'push-2')).toEqual({ status: 'noop', reason: 'already_final' });
    expect((await rowsOf(s.claimCaseId)).filter((r) => r.purpose === 'staff_push')).toEqual([
      expect.objectContaining({ outcome: 'no_target', detail: 'no_target:no_admin_device_token' }),
    ]);
    expect(h.alarms).toEqual([]);
  });

  it('⭐ `-271` §1 / the reset — a new number behind a key is detected by version, then hash; the SAME number resets ⛔ nothing', async () => {
    const s = await seed({ nomineeMobiles: ['9812345678'] });
    const { day0 } = await runOf(s.runId!);
    const h = harness({ gateway: () => Promise.reject(new SmsSendError('x', 'INVALID_NUMBER', 400)) });
    h.setNow(tenAmIst(cycleCalendar.addCalendarDays(day0, 1)));
    await runCorrectionReminderSweep(h.deps, boss(h));
    await child(h, smsFor(h, s.claimCaseId)[0]!);
    const pid = ids.pariwarId(PARIWAR);
    const run = (await withPariwarScope(pool, PARIWAR, (db) => claim.readCorrectionRun(db, pid, s.runId!)))!;
    const [person] = (await withPariwarScope(pool, PARIWAR, (db) => claim.readCorrectionRecipients(db, pid, ids.claimId(s.claimCaseId)))).people;
    const { encryptField } = await import('./_claim-correction-seed.js');
    // A 6.20 correction's new version: SAME person key, a different version id.
    const sameNumber = { ...person!, versionId: randomUUID(), mobileCiphertext: await encryptField('9812345678', PARIWAR, 'member_nominee', enc) };
    const newNumber = { ...person!, versionId: randomUUID(), mobileCiphertext: await encryptField('9898989898', PARIWAR, 'member_nominee', enc) };
    const [kept] = await withPariwarScope(pool, PARIWAR, (db) => claim.readRunPersonStates(db, pid, run, [sameNumber], { crypto: enc }));
    const [reset] = await withPariwarScope(pool, PARIWAR, (db) => claim.readRunPersonStates(db, pid, run, [newNumber], { crypto: enc }));
    expect(kept!.state).toMatchObject({ reset: false, deadKind: 'dead' });
    expect(reset!.state).toMatchObject({ reset: true, foundDeadOn: null });
    // The resolver exposes the CURRENT hash — the dead number's, here — for 6.19c's "reached".
    const chase = await withPariwarScope(pool, PARIWAR, (db) => claim.resolveCorrectionChase(db, pid, ids.claimId(s.claimCaseId), { crypto: enc }));
    const row = (await rowsOf(s.claimCaseId)).find((r) => r.purpose === 'family_sms');
    expect(chase.currentNumberHashes?.get(person!.personKey)).toBe(row!.recipient_number_hash);
  });

  it('⭐ AC9b — the recipient\'s mobile and address appear in ⛔ no job payload and ⛔ no alarm', async () => {
    const MOBILE = '9811122233';
    const ADDRESS = 'SENTINEL-ADDRESS-6-19b';
    const s = await seed({ nomineeMobiles: [MOBILE], address: ADDRESS, contactLocale: 'en' });
    const { day0 } = await runOf(s.runId!);
    const h = harness({ gateway: () => Promise.reject(new SmsSendError('x', 'AUTH_FAILED', 401)) });
    h.setNow(tenAmIst(cycleCalendar.addCalendarDays(day0, 1)));
    await runCorrectionReminderSweep(h.deps, boss(h));
    await child(h, smsFor(h, s.claimCaseId)[0]!);
    const surfaces = JSON.stringify({ enqueued: h.enqueued, alarms: h.alarms, rows: await rowsOf(s.claimCaseId) });
    expect(surfaces).not.toContain(MOBILE);
    expect(surfaces).not.toContain(ADDRESS);
    expect(h.sent[0]!.body.startsWith('Claim ')).toBe(true); // `en` per contact_locale
  });
});
