// The claim-correction REMINDERS — the sweep, the family SMS child and the staff push against the live DB (Story
// 6.19b; AC2, AC3, AC4, AC9b, AC11b "schedule", "runs", "races and crashes", "the record", "pause tiers", "send
// safety", "retries", "staff push", "D30", "letters", "-271"). Own-committing (the sweep reads COMMITTED runs across
// tenants), an INJECTED clock, a fake SMS gateway and a capturing queue. ⭐ ISOLATED: every sweep here runs with
// `pariwarAllowlist` = this suite's own random Pariwars, so its far-future clocks (day + 90, + 33) can ⛔ never end or
// finalise ANOTHER suite's runs in the shared database. Assertions still key on OUR claim ids (membership).

import { randomUUID } from 'node:crypto';

import {
  SmsSendError,
  type AuditPort,
  type ChannelProvider,
  type ProviderRegistry,
  type RenderedMessage,
  type SendTarget,
  type SmsAppClient,
  type SmsGatewayMessage,
} from '@twt/channels';
import { bindScopedDb, claim, cycleCalendar, deviceToken, encryption, ids, withPariwarScope } from '@twt/domain';
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
import { cleanupClaims, encryptField, onOwnTx, seedReturnedClaim, type SeedReturnedClaimOptions } from './_claim-correction-seed.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);
const PARIWAR = randomUUID();
const OTHER_PARIWAR = randomUUID();
/** The staff fixtures' Pariwar — its Pariwar Admins must ⛔ not change the escalation recipients of PARIWAR's tests. */
const STAFF_PARIWAR = randomUUID();
const HELPLINE = '+911800123456';
const enc = buildJobsEncryptionDeps('claim-correction-live-pepper');
/** The SAME deps with the HMAC failing (a KMS blip on the number hash) — the decrypt still works. */
const hmacDown: encryption.FieldCryptoDeps = {
  kekRef: enc.kekRef,
  hmacKeyRef: enc.hmacKeyRef,
  kms: {
    encryptDek: (dek, kekRef, aad) => enc.kms.encryptDek(dek, kekRef, aad),
    decryptDek: (dek, kekRef, aad) => enc.kms.decryptDek(dek, kekRef, aad),
    computeHmac: () => Promise.reject(new Error('kms hmac unavailable')),
  },
};

/** 10:00 IST on `date` (the sweep's hour). */
const tenAmIst = (date: string) => new Date(Date.parse(`${date}T10:00:00+05:30`));

describe.skipIf(!hasDatabase)('Story 6.19b — the claim-correction reminders (live DB, own-committing)', () => {
  let pool: pg.Pool;
  const claims: string[] = [];
  const members: string[] = [];
  const staffUsers: string[] = [];

  beforeAll(() => {
    pool = new pg.Pool({ connectionString: DATABASE_URL, max: 8, ssl: false, connectionTimeoutMillis: 5000 });
    pool.on('error', (err) => console.error('[claim-correction-reminders-live] idle client error:', err.message));
  });
  afterAll(async () => {
    // ⚠ The cleanup THROWS on a leftover — `pool.end()` must still run (an open pool hangs the worker).
    try {
      await cleanupClaims(pool, claims, members, { userIds: staffUsers });
    } finally {
      await pool.end();
    }
  });

  // ── Harness ─────────────────────────────────────────────────────────────────────────────────────────────────
  interface Harness {
    deps: ClaimCorrectionReminderDeps;
    enqueued: { queue: string; data: JobEnvelope<unknown>; opts: unknown }[];
    sent: SmsGatewayMessage[];
    alarms: string[];
    audits: unknown[];
    setNow: (d: Date) => void;
  }
  function harness(
    opts: {
      gateway?: (m: SmsGatewayMessage) => Promise<string>;
      configured?: boolean;
      config?: Record<string, string | null>;
      /** The staff push's provider registry (absent ⇒ `dispatch()`'s stub registry). */
      providers?: ProviderRegistry;
      /** The crypto deps (absent ⇒ the suite's real fake-KMS deps) — e.g. `hmacDown` to fail every number hash. */
      encryption?: encryption.FieldCryptoDeps;
      runLimit?: number;
      maxRuns?: number;
    } = {},
  ): Harness {
    const enqueued: Harness['enqueued'] = [];
    const sent: SmsGatewayMessage[] = [];
    const alarms: string[] = [];
    const audits: unknown[] = [];
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
      encryption: opts.encryption ?? enc,
      ...(opts.runLimit !== undefined ? { runLimit: opts.runLimit } : {}),
      ...(opts.maxRuns !== undefined ? { maxRuns: opts.maxRuns } : {}),
      smsAppClient,
      resolveConfig: async (key) => {
        if (opts.config && key in opts.config) return opts.config[key]!;
        if (key.startsWith('sms.dlt.template_id.claim_correction.')) return 'TPL-1';
        if (key === `sms.claim_correction.helpline_number.${PARIWAR}`) return HELPLINE;
        return null;
      },
      push: {
        // `dispatch()`'s audit port is a FUNCTION (one call per line) — a capture, never the real chain.
        audit: ((input) => {
          audits.push(input);
          return Promise.resolve();
        }) satisfies AuditPort,
        hashRendered: () => Promise.resolve('a'.repeat(64)),
        ...(opts.providers ? { resolveProviders: () => Promise.resolve(opts.providers!) } : {}),
      },
      now: () => now,
      onAlarm: (m) => alarms.push(m),
      pariwarAllowlist: [PARIWAR, OTHER_PARIWAR, STAFF_PARIWAR],
    };
    return { deps, enqueued, sent, alarms, audits, setNow: (d) => (now = d) };
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
  const payloadOf = (e: Harness['enqueued'][number]) => e.data.payload as CorrectionFamilySmsPayload;
  const day = (day0: string, n: number) => cycleCalendar.addCalendarDays(day0, n);

  // ── Staff fixtures (raw, on the owner pool — the domain has ⛔ no writer for users / grants / a test shepherd) ──
  async function staffUser(displayName: string): Promise<string> {
    const id = randomUUID();
    await pool.query(`INSERT INTO users (id, identity_type, status, display_name) VALUES ($1, 'admin', 'active', $2)`, [id, displayName]);
    staffUsers.push(id);
    return id;
  }
  async function grantPariwarAdmin(userId: string, pariwarId: string): Promise<void> {
    await pool.query(
      `INSERT INTO role_grants (user_id, pariwar_id, role, scope_dimension, scope_value) VALUES ($1, $2, 'pariwar_admin', 'pariwar', NULL)`,
      [userId, pariwarId],
    );
  }
  async function assignShepherd(claimCaseId: string, pariwarId: string, userId: string): Promise<void> {
    await pool.query(
      `INSERT INTO claim_shepherd_assignments (claim_case_id, pariwar_id, shepherd_actor_id, shepherd_display, assignment_reason)
       VALUES ($1, $2, $3, 'Test District Admin', 'initial')`,
      [claimCaseId, pariwarId, userId],
    );
  }
  /** A raw fixture write on the owner pool with triggers off (a state the domain writers would refuse to build). */
  async function asOwner(statement: string, params: unknown[]): Promise<void> {
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      await c.query("SET LOCAL session_replication_role = 'replica'");
      await c.query(statement, params);
      await c.query('COMMIT');
    } catch (err) {
      await c.query('ROLLBACK').catch(() => undefined);
      throw err;
    } finally {
      c.release();
    }
  }
  async function recordDeliveredLetter(pariwarId: string, claimCaseId: string, personKey: string, postedOn: string, deliveredOn: string) {
    const pid = ids.pariwarId(pariwarId);
    const cid = ids.claimId(claimCaseId);
    const letter = await onOwnTx(pool, pariwarId, (client) =>
      claim.recordCorrectionLetter(client, {
        pariwarId: pid, claimCaseId: cid, personKey, postedOn,
        trackingNumberCiphertext: 'enc:v1:t', actorId: randomUUID(), actorDisplay: 'District Admin',
      }),
    );
    await onOwnTx(pool, pariwarId, (client) =>
      claim.recordCorrectionLetterDelivery(client, {
        pariwarId: pid, claimCaseId: cid, letterId: letter.letterId, deliveredOn,
        screenshotStorageKey: `k/${letter.letterId}`, screenshotContentType: 'image/png', screenshotSizeBytes: 10,
        actorId: randomUUID(), actorDisplay: 'District Admin',
      }),
    );
    return letter;
  }
  /** A fake provider registry for the staff push: counts every send per channel and captures the push. */
  function fakeProviders() {
    const sends: { channel: string; rendered: RenderedMessage; target: SendTarget }[] = [];
    const provider = (id: ChannelProvider['id'], channel: ChannelProvider['channel']): ChannelProvider => ({
      id,
      channel,
      scope: 'global',
      send: (rendered, target) => {
        sends.push({ channel, rendered, target });
        return Promise.resolve({ channel, provider: id, status: 'accepted' as const, providerMessageId: `${id}-msg` });
      },
      getStatus: (messageId: string) => Promise.resolve({ providerMessageId: messageId, state: 'unknown' as const }),
    });
    const registry: ProviderRegistry = {
      push: [provider('fcm', 'push'), provider('apns', 'push')],
      whatsapp: [provider('whatsapp-business', 'whatsapp')],
      sms: [provider('sms-dlt', 'sms')],
      telegram: [provider('telegram', 'telegram')],
    };
    return { registry, sends };
  }

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
  // ── Third-pass review (2026-10-01) ─────────────────────────────────────────────────────────────────────────────

  it('⭐ a back-to-back DOUBLE sweep before any child runs enqueues the slot twice — and the table still makes it ONE send', async () => {
    const s = await seed();
    const { day0 } = await runOf(s.runId!);
    const h = harness();
    h.setNow(tenAmIst(day(day0, 1)));
    await runCorrectionReminderSweep(h.deps, boss(h));
    await runCorrectionReminderSweep(h.deps, boss(h));
    const jobs = smsFor(h, s.claimCaseId);
    // ⚠ The sweep writes ⛔ no family row (the child claims it), so both ticks enqueue — the singletonKey is a label.
    expect(jobs.map((j) => payloadOf(j).slotDay)).toEqual([1, 1]);
    expect(await child(h, jobs[0]!)).toEqual({ status: 'sent', outcome: 'accepted' });
    expect(await child(h, jobs[1]!)).toEqual({ status: 'noop', reason: 'already_final' });
    expect(h.sent).toHaveLength(1);
    expect((await rowsOf(s.claimCaseId)).filter((r) => r.purpose === 'family_sms')).toEqual([
      expect.objectContaining({ slot_day: 1, outcome: 'accepted', attempt_count: 1 }),
    ]);
  });

  it('⭐ a STALE child (enqueued for an earlier IST day) is skipped `stale_slot` — ⛔ no send, ⛔ no marker for a slot it never claimed', async () => {
    const s = await seed();
    const { day0 } = await runOf(s.runId!);
    const h = harness();
    h.setNow(tenAmIst(day(day0, 1)));
    await runCorrectionReminderSweep(h.deps, boss(h));
    const [job] = smsFor(h, s.claimCaseId);
    h.setNow(tenAmIst(day(day0, 2)));
    expect(await child(h, job!)).toEqual({ status: 'skipped', reason: 'stale_slot' });
    expect(h.sent).toHaveLength(0);
    expect((await rowsOf(s.claimCaseId)).filter((r) => r.purpose === 'family_sms')).toEqual([]);
    // Today's sweep owns today: its catch-up sends the latest due slot ONCE (slot 2), the missed slot 1 skipped.
    await runCorrectionReminderSweep(h.deps, boss(h));
    expect(smsFor(h, s.claimCaseId).map((j) => payloadOf(j).slotDay)).toEqual([1, 2]);
  });

  it('⭐ I4 — a letter DELIVERED to number A, then a 6.20 correction to number B: the sweep re-plans the person AND the child sends to B', async () => {
    const A = '9811111111';
    const B = '9811111112';
    const s = await seed({ nomineeMobiles: ['9812345678'], claimantMobile: A });
    const { day0 } = await runOf(s.runId!);
    const h = harness({
      gateway: (m) => (m.to === `+91${A}` ? Promise.reject(new SmsSendError('x', 'INVALID_NUMBER', 400)) : Promise.resolve('gw-ok')),
    });
    h.setNow(tenAmIst(day(day0, 1)));
    await runCorrectionReminderSweep(h.deps, boss(h));
    for (const j of smsFor(h, s.claimCaseId)) await child(h, j);
    // The claimant (number A) is dead ⇒ letter-eligible; a letter is posted and DELIVERED.
    await recordDeliveredLetter(PARIWAR, s.claimCaseId, 'claimant', day(day0, 2), day(day0, 2));
    h.setNow(tenAmIst(day(day0, 3)));
    await runCorrectionReminderSweep(h.deps, boss(h));
    const claimantJobs = () => smsFor(h, s.claimCaseId).filter((j) => payloadOf(j).personKey === 'claimant');
    expect(claimantJobs().map((j) => payloadOf(j).slotDay)).toEqual([1]); // the delivery stops A's reminders
    // The 6.20 correction: the claimant block's mobile becomes B (the claimant has ⛔ no version — the hash decides).
    await asOwner('UPDATE claim_contacts SET claimant_mobile_ciphertext = $2 WHERE claim_case_id = $1', [
      s.claimCaseId,
      await encryptField(B, PARIWAR, 'claim_contact', enc),
    ]);
    h.setNow(tenAmIst(day(day0, 4)));
    await runCorrectionReminderSweep(h.deps, boss(h));
    const toB = claimantJobs().find((j) => payloadOf(j).slotDay === 4);
    expect(toB).toBeDefined();
    // ⭐ The child's re-check hashes the CURRENT number (I4) — ⛔ never `letter_delivered` off A's letter.
    expect(await child(h, toB!)).toEqual({ status: 'sent', outcome: 'accepted' });
    expect(h.sent.at(-1)!.to).toBe(`+91${B}`);
    const claimantRows = (await rowsOf(s.claimCaseId)).filter((r) => r.purpose === 'family_sms' && r.recipient_key === 'claimant');
    expect(claimantRows.find((r) => r.slot_day === 4)).toMatchObject({ outcome: 'accepted' });
  });

  it('⭐ a delivery dated far BEFORE the run (a wrong-year typo) ⇒ the second-letter slot is negative: skipped + alarmed, and the REST of the plan still lands', async () => {
    const s = await seed({ nomineeMobiles: ['12345', '9812345678'] });
    const { day0 } = await runOf(s.runId!);
    const h = harness();
    h.setNow(tenAmIst(day(day0, 1)));
    await runCorrectionReminderSweep(h.deps, boss(h));
    for (const j of smsFor(h, s.claimCaseId)) await child(h, j);
    const deadKey = (await rowsOf(s.claimCaseId)).find((r) => r.purpose === 'family_sms' && r.outcome === 'no_target')!.recipient_key;
    const letter = await recordDeliveredLetter(PARIWAR, s.claimCaseId, deadKey, day(day0, 1), day(day0, 1));
    // The domain now refuses a letter posted before the run — so the typo is planted raw, as an older row would hold it.
    await asOwner('UPDATE claim_correction_letters SET posted_on = $2, delivered_on = $3 WHERE letter_id = $1', [
      letter.letterId,
      day(day0, -60),
      day(day0, -50),
    ]);
    h.setNow(tenAmIst(day(day0, 5)));
    await runCorrectionReminderSweep(h.deps, boss(h));
    const secondLetterAlarms = () => h.alarms.filter((a) => a.includes(s.claimCaseId) && a.includes('second-letter'));
    expect(secondLetterAlarms()).toHaveLength(1);
    expect(h.alarms.some((a) => a.includes(s.runId!) && a.includes('failed'))).toBe(false);
    const rows = await rowsOf(s.claimCaseId);
    // ⭐ The decision is RECORDED once — a `skipped_superseded` marker at today's slot (⛔ `recorded`: ⛔ no push, ⛔ no
    // queue item) — so tomorrow's sweep sees it and does ⛔ not re-alarm.
    expect(rows.filter((r) => r.purpose === 'letter_second_due')).toEqual([
      expect.objectContaining({ slot_day: 5, subject_key: deadKey, outcome: 'skipped_superseded', detail: 'delivery_before_run' }),
    ]);
    // ⛔ No rollback: the District Admin's reminder and the other person's SMS for day 5 are still planned.
    expect(rows.filter((r) => r.purpose === 'staff_reminder').map((r) => r.slot_day)).toContain(5);
    expect(smsFor(h, s.claimCaseId).some((j) => payloadOf(j).slotDay === 5 && payloadOf(j).personKey !== deadKey)).toBe(true);
    // The next day: ⛔ no second alarm, ⛔ no second marker.
    h.setNow(tenAmIst(day(day0, 6)));
    await runCorrectionReminderSweep(h.deps, boss(h));
    expect(secondLetterAlarms()).toHaveLength(1);
    expect((await rowsOf(s.claimCaseId)).filter((r) => r.purpose === 'letter_second_due')).toHaveLength(1);
  });

  it('⭐ D30 BY PURPOSE — "cannot remind" stops the family SMS and the letter chase ONLY: the + 13 escalation and `letter_second_due` still land', async () => {
    const s = await seed({ nomineeMobiles: ['12345', '12346'] });
    const { day0 } = await runOf(s.runId!);
    const h = harness();
    h.setNow(tenAmIst(day(day0, 1)));
    await runCorrectionReminderSweep(h.deps, boss(h));
    for (const j of smsFor(h, s.claimCaseId)) await child(h, j); // both no_target ⇒ found dead on day 1
    const keys = (await rowsOf(s.claimCaseId)).filter((r) => r.purpose === 'family_sms').map((r) => r.recipient_key).sort();
    const [lettered, unlettered] = keys as [string, string];
    await recordDeliveredLetter(PARIWAR, s.claimCaseId, lettered, day(day0, 2), day(day0, 3));
    // D30 arrives: the contact record is gone (`no_contact_record`).
    await pool.query('DELETE FROM claim_contacts WHERE claim_case_id = $1', [s.claimCaseId]);
    const smsBefore = smsFor(h, s.claimCaseId).length;
    h.setNow(tenAmIst(day(day0, 14))); // found-dead + 13
    await runCorrectionReminderSweep(h.deps, boss(h));
    h.setNow(tenAmIst(day(day0, 33))); // the delivery (day 3) + 30
    await runCorrectionReminderSweep(h.deps, boss(h));
    expect(smsFor(h, s.claimCaseId)).toHaveLength(smsBefore); // ⛔ no family SMS
    const rows = await rowsOf(s.claimCaseId);
    expect(rows.filter((r) => r.purpose === 'letter_chase')).toEqual([]); // ⛔ no letter chase
    expect(rows.filter((r) => r.purpose === 'escalation')).toEqual([
      expect.objectContaining({ slot_day: 14, subject_key: unlettered }),
    ]);
    expect(rows.filter((r) => r.purpose === 'letter_second_due')).toEqual([
      expect.objectContaining({ slot_day: 33, subject_key: lettered }),
    ]);
    // The District Admin is still reminded (D21 needs a recipient set; under D30 there is none).
    expect(rows.filter((r) => r.purpose === 'staff_reminder').map((r) => r.slot_day)).toEqual(expect.arrayContaining([14, 31]));
  });

  it('⭐ D2 — tier (b) stops the letter chase AND its + 13 escalation; the STAFF run\'s day-12 escalation is ⛔ not tier (b)\'s', async () => {
    const s = await seed({ nomineeMobiles: ['12345'] });
    const { day0 } = await runOf(s.runId!);
    const h = harness();
    h.setNow(tenAmIst(day(day0, 1)));
    await runCorrectionReminderSweep(h.deps, boss(h));
    await child(h, smsFor(h, s.claimCaseId)[0]!); // no_target ⇒ found dead on day 1
    const staffCase = await seed({ mustAct: 'staff' });
    // The family's part is done on both claims (every account rewritten after the return).
    await pool.query(
      "UPDATE claim_nominee_bank_accounts SET updated_at = now() + interval '1 minute' WHERE claim_case_id = ANY($1)",
      [[s.claimCaseId, staffCase.claimCaseId]],
    );
    for (const n of [8, 14]) {
      h.setNow(tenAmIst(day(day0, n)));
      await runCorrectionReminderSweep(h.deps, boss(h));
    }
    const rows = await rowsOf(s.claimCaseId);
    expect(rows.filter((r) => r.purpose === 'letter_chase')).toEqual([]);
    expect(rows.filter((r) => r.purpose === 'escalation')).toEqual([]);
    expect(rows.filter((r) => r.purpose === 'staff_reminder').map((r) => r.slot_day)).toContain(14); // the DA still is
    // The staff run, swept by ITS OWN day 14 (its day 0 can differ across an IST midnight): the day-12 escalation lands.
    h.setNow(tenAmIst(day((await runOf(staffCase.runId!)).day0, 14)));
    await runCorrectionReminderSweep(h.deps, boss(h));
    expect((await rowsOf(staffCase.claimCaseId)).filter((r) => r.purpose === 'escalation').map((r) => r.slot_day)).toEqual([12]);
  });

  it('⭐ the sweep\'s STAFF happy path — a live shepherd ⇒ `recorded` District Admin rows + their push; two Pariwar Admins ⇒ ONE day-12 escalation EACH, each pushed', async () => {
    const s = await seed({ pariwarId: STAFF_PARIWAR, mustAct: 'staff' });
    const { day0 } = await runOf(s.runId!);
    const da = await staffUser('Shepherd District Admin');
    const pa1 = await staffUser('Pariwar Admin A');
    const pa2 = await staffUser('Pariwar Admin B');
    for (const pa of [pa1, pa2]) await grantPariwarAdmin(pa, STAFF_PARIWAR);
    await assignShepherd(s.claimCaseId, STAFF_PARIWAR, da);
    const h = harness();
    const pushUsers = (sentOn: string) =>
      pushesFor(h, s.claimCaseId)
        .map((e) => e.data.payload as CorrectionStaffPushPayload)
        .filter((p) => p.sentOn === sentOn)
        .map((p) => p.userId);

    h.setNow(tenAmIst(day(day0, 1)));
    await runCorrectionReminderSweep(h.deps, boss(h));
    expect((await rowsOf(s.claimCaseId)).filter((r) => r.purpose === 'staff_reminder')).toEqual([
      expect.objectContaining({ slot_day: 1, recipient_key: `staff:${da}`, outcome: 'recorded', late: false }),
    ]);
    expect(pushUsers(day(day0, 1))).toEqual([da]);
    expect(h.alarms.filter((a) => a.includes(s.claimCaseId))).toEqual([]); // ⛔ no "no shepherd" alarm

    h.setNow(tenAmIst(day(day0, 12)));
    await runCorrectionReminderSweep(h.deps, boss(h));
    await runCorrectionReminderSweep(h.deps, boss(h)); // a same-day re-run writes ⛔ no second escalation
    const esc = (await rowsOf(s.claimCaseId)).filter((r) => r.purpose === 'escalation');
    expect(esc.map((r) => r.recipient_key).sort()).toEqual([`staff:${pa1}`, `staff:${pa2}`].sort());
    expect(esc.every((r) => r.outcome === 'recorded' && r.slot_day === 12 && r.subject_key === '')).toBe(true);
    // Each staff member with a row today is pushed (the push dedups on its own row, so a re-run re-enqueues).
    expect(new Set(pushUsers(day(day0, 12)))).toEqual(new Set([da, pa1, pa2]));
  });

  it('⭐ the staff push ACCEPTED path — an admin device token + a fake push provider: ONE push to that device, ⛔ no other channel, the row `accepted`', async () => {
    const s = await seed({ pariwarId: STAFF_PARIWAR, mustAct: 'staff' });
    const { day0 } = await runOf(s.runId!);
    const userId = await staffUser('Pushed District Admin');
    const today = day(day0, 1);
    await onOwnTx(pool, STAFF_PARIWAR, async (client) => {
      await claim.insertFinalCorrectionReminder(bindScopedDb(client), {
        pariwarId: ids.pariwarId(STAFF_PARIWAR),
        claimCaseId: ids.claimId(s.claimCaseId),
        runId: s.runId!,
        slotDay: 1,
        sentOn: today,
        recipientKey: `staff:${userId}`,
        purpose: 'staff_reminder',
        subjectKey: '',
        outcome: 'recorded',
      });
    });
    // The admin's device token, registered exactly as apps/api's `registerAdmin` does (the admin-global namespace).
    const NS = encryption.ADMIN_GLOBAL_NAMESPACE;
    const token = `fcm-token-${randomUUID()}`;
    await onOwnTx(pool, NS, async (client) => {
      await deviceToken.upsertActiveToken(bindScopedDb(client), {
        pariwarId: NS as never,
        principalType: 'admin',
        principalId: userId,
        memberId: null,
        platform: 'android',
        tokenCiphertext: await encryption.encryptDeviceToken(token, NS, enc),
        tokenBlindIndex: await encryption.deviceTokenBlindIndex(token, NS, enc),
      });
    });
    const fake = fakeProviders();
    const h = harness({ providers: fake.registry });
    h.setNow(tenAmIst(today));
    const env: JobEnvelope<CorrectionStaffPushPayload> = {
      pariwarId: STAFF_PARIWAR,
      requestId: 'r',
      actorId: null,
      traceId: 't',
      payload: { claimCaseId: s.claimCaseId, runId: s.runId!, slotDay: 1, userId, sentOn: today },
    };
    expect(await runCorrectionStaffPush(h.deps, env, 'push-accepted')).toEqual({ status: 'pushed', outcome: 'accepted' });
    // ONE push, to THIS admin's device, carrying the claim's reference — ⛔ no WhatsApp / SMS / Telegram attempt.
    expect(fake.sends.map((x) => x.channel)).toEqual(['push']);
    expect(fake.sends[0]!.target.address).toBe(token);
    expect(fake.sends[0]!.rendered.title).toContain(claim.claimShortReference(s.claimCaseId));
    expect(fake.sends[0]!.rendered.body).toContain('correction queue');
    expect((await rowsOf(s.claimCaseId)).filter((r) => r.purpose === 'staff_push')).toEqual([
      expect.objectContaining({ outcome: 'accepted', provider_message_id: 'fcm-msg', detail: null }),
    ]);
    expect(h.audits.length).toBeGreaterThan(0); // `dispatch()` audited the push line
    // A re-run the same day is a no-op (the `staff_push` row is the dedup).
    expect(await runCorrectionStaffPush(h.deps, env, 'push-again')).toEqual({ status: 'noop', reason: 'already_final' });
    expect(fake.sends).toHaveLength(1);
  });

  // ── Fourth-pass review (2026-10-01) ───────────────────────────────────────────────────────────────────────────

  it('⭐ keyset paging past page 1 — runLimit 2: EVERY one of four new runs planned exactly ONCE; runLimit 2 + maxRuns 3 ⇒ the bound ALARMED', async () => {
    const seeded = [];
    for (let i = 0; i < 4; i += 1) seeded.push(await seed());
    const { day0 } = await runOf(seeded[0]!.runId!);
    const h = harness({ runLimit: 2, maxRuns: 10_000 });
    h.setNow(tenAmIst(day(day0, 1)));
    const result = await runCorrectionReminderSweep(h.deps, boss(h));
    expect(result.scannedRuns).toBeGreaterThanOrEqual(4);
    for (const s of seeded) {
      // ONE nominee each ⇒ exactly one SMS per run: planned once, ⛔ never re-read at a page edge.
      expect(smsFor(h, s.claimCaseId).map((j) => payloadOf(j).slotDay)).toEqual([1]);
    }
    expect(h.alarms.some((a) => a.includes('hard bound'))).toBe(false);

    const bounded = harness({ runLimit: 2, maxRuns: 3 });
    bounded.setNow(tenAmIst(day(day0, 1)));
    expect((await runCorrectionReminderSweep(bounded.deps, boss(bounded))).scannedRuns).toBe(3);
    expect(bounded.alarms.filter((a) => a.includes('hard bound of 3'))).toHaveLength(1);
  });

  it('⭐ I6 in the sweep — a person\'s current number cannot be HASHED ⇒ ALARMED by ids (⛔ never the number), and the plan still lands', async () => {
    const A = '9811111131';
    const s = await seed({ nomineeMobiles: ['9812345678'], claimantMobile: A });
    const { day0 } = await runOf(s.runId!);
    const h = harness();
    h.setNow(tenAmIst(day(day0, 1)));
    await runCorrectionReminderSweep(h.deps, boss(h));
    for (const j of smsFor(h, s.claimCaseId)) await child(h, j); // the claimant now has an evidential row ⇒ hashed daily
    const down = harness({ encryption: hmacDown });
    down.setNow(tenAmIst(day(day0, 2)));
    await runCorrectionReminderSweep(down.deps, boss(down));
    const hashAlarms = down.alarms.filter((a) => a.includes(s.claimCaseId) && a.includes('could not be hashed'));
    expect(hashAlarms).toHaveLength(1);
    expect(hashAlarms[0]).toContain('claimant');
    expect(JSON.stringify(down.alarms)).not.toContain(A);
    // The fallback is the last row's number — the claimant's day-2 reminder is still planned.
    expect(smsFor(down, s.claimCaseId).some((j) => payloadOf(j).personKey === 'claimant' && payloadOf(j).slotDay === 2)).toBe(true);
  });

  it('⭐ the child — the re-check cannot hash the current number while only an OLD epoch\'s delivered letter would stop the send ⇒ TRANSIENT, ⛔ no row; with the hash back ⇒ `letter_delivered`', async () => {
    const A = '9811111141';
    const s = await seed({ nomineeMobiles: ['9812345678'], claimantMobile: A });
    const { day0 } = await runOf(s.runId!);
    const h = harness({
      gateway: (m) => (m.to === `+91${A}` ? Promise.reject(new SmsSendError('x', 'INVALID_NUMBER', 400)) : Promise.resolve('gw-ok')),
    });
    h.setNow(tenAmIst(day(day0, 1)));
    await runCorrectionReminderSweep(h.deps, boss(h));
    for (const j of smsFor(h, s.claimCaseId)) await child(h, j);
    await recordDeliveredLetter(PARIWAR, s.claimCaseId, 'claimant', day(day0, 2), day(day0, 2));
    const job = {
      queue: 'claim.correction.family_sms',
      data: {
        pariwarId: PARIWAR,
        requestId: 'r',
        actorId: null,
        traceId: 't',
        payload: { runId: s.runId!, claimCaseId: s.claimCaseId, slotDay: 3, personKey: 'claimant', sentOn: day(day0, 3), late: false },
      } satisfies JobEnvelope<CorrectionFamilySmsPayload>,
      opts: undefined,
    };
    const down = harness({ encryption: hmacDown });
    down.setNow(tenAmIst(day(day0, 3)));
    await expect(child(down, job, 'job-hash')).rejects.toBeInstanceOf(ClaimCorrectionTransientError);
    expect(down.alarms.filter((a) => a.includes('could not be hashed'))).toHaveLength(1);
    expect(down.sent).toHaveLength(0);
    // The begin's transaction rolled back ⇒ ⛔ no row for the slot (a retry re-runs the re-check).
    const slot3 = () => rowsOf(s.claimCaseId).then((rows) => rows.filter((r) => r.recipient_key === 'claimant' && r.slot_day === 3));
    expect(await slot3()).toEqual([]);
    // Control: with the hash back, the SAME job is stopped by the delivered letter (the number did ⛔ not move).
    h.setNow(tenAmIst(day(day0, 3)));
    expect(await child(h, job, 'job-hash')).toEqual({ status: 'skipped', reason: 'letter_delivered' });
  });

  it('⭐ J8 — a retry that crossed IST midnight still `attempting` ⇒ `error` (exhausted:crossed_midnight), `first_detail` KEPT, alarmed; ⛔ no catch-up for it', async () => {
    const s = await seed();
    const { day0 } = await runOf(s.runId!);
    const h = harness({ gateway: () => Promise.reject(new SmsSendError('down', null, 503)) });
    h.setNow(tenAmIst(day(day0, 1)));
    await runCorrectionReminderSweep(h.deps, boss(h));
    const [job] = smsFor(h, s.claimCaseId);
    await expect(child(h, job!, 'job-midnight')).rejects.toBeInstanceOf(ClaimCorrectionTransientError);
    h.setNow(tenAmIst(day(day0, 2)));
    expect(await child(h, job!, 'job-midnight')).toEqual({ status: 'skipped', reason: 'stale_slot' });
    expect((await rowsOf(s.claimCaseId)).filter((r) => r.purpose === 'family_sms')).toEqual([
      expect.objectContaining({
        slot_day: 1,
        outcome: 'error',
        detail: 'exhausted:crossed_midnight',
        first_detail: 'api_unavailable:http_503',
      }),
    ]);
    expect(h.alarms.filter((a) => a.includes('crossed_midnight') && a.includes(s.runId!))).toHaveLength(1);
    expect(h.sent).toHaveLength(1); // the one transient attempt — ⛔ no second send
    // Today's sweep: slot 1 is FINAL (⛔ re-sent), slot 2 goes out on its own.
    await runCorrectionReminderSweep(h.deps, boss(h));
    expect(smsFor(h, s.claimCaseId).map((j) => payloadOf(j).slotDay)).toEqual([1, 2]);
  });
});
