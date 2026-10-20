// The claimant's WHATSAPP STEP end to end — the quarter-hourly sweep and the child against the live DB (Story 6.37d, Tasks 5–6;
// AC3–AC6, AC12; WS5–WS9, WS12; I1–I5, I10). Own-committing (the sweeps read COMMITTED rows across tenants), an INJECTED clock for
// the window and the lease, the DB clock for origin + 4 h (the origin row's `created_at` is moved back — T5), a capturing queue, and
// ⭐ the REAL WhatsApp client (`createWhatsappAppCache`) over an INJECTED fetch (⛔ network — a global-fetch spy stays at ZERO), so
// the request body, the timeout and the classifier are the shipped ones. ⭐ ISOLATED: every sweep runs with `pariwarAllowlist` =
// this suite's own random Pariwars. The chases' REAL sweeps and children send the origin reminders (real envelopes, real hashes).

import { randomUUID } from 'node:crypto';

import { createWhatsappAppCache, type FetchInit, type FetchLike, type SmsAppClient } from '@twt/channels';
import { claim, cycleCalendar, smsDelivery } from '@twt/domain';
import type { JobEnvelope } from '@twt/queue';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { buildJobsEncryptionDeps } from '../src/deps.js';
import { runContactLadderSweep, runCorrectionLadderSmsChild, type LadderSmsPayload } from '../src/scheduler/claim-contact-ladder.js';
import {
  nextDailyLadderRunOn,
  runContactLadderWhatsappChild,
  runContactLadderWhatsappSweep,
  type ContactLadderWhatsappDeps,
  type ContactLadderWhatsappPayload,
} from '../src/scheduler/claim-contact-ladder-whatsapp.js';
import {
  ClaimCorrectionTransientError,
  runCorrectionFamilySmsChild,
  runCorrectionReminderSweep,
  type ClaimCorrectionReminderDeps,
  type CorrectionFamilySmsPayload,
} from '../src/scheduler/claim-correction-reminders.js';
import { cleanupClaims, seedReturnedClaim, type SeedReturnedClaimOptions } from './_claim-correction-seed.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);
const PARIWAR = randomUUID();
const BURST_PARIWAR = randomUUID();
const HELPLINE = '1800123456';
const TEMPLATE = 'claim_correction_reminder_en_v1';
const enc = buildJobsEncryptionDeps('claim-contact-ladder-whatsapp-live-pepper');
const istAt = (date: string, hhmm: string) => new Date(Date.parse(`${date}T${hhmm}:00+05:30`));
const day = (d0: string, n: number) => cycleCalendar.addCalendarDays(d0, n);
const LEASE_MS = claim.CONTACT_LADDER_WA_LEASE_MS;
const WA_SEND = 'claim.contact_ladder.wa_send';

describe.skipIf(!hasDatabase)('Story 6.37d — the claimant\'s WhatsApp step (live DB, own-committing)', { timeout: 120000 }, () => {
  let pool: pg.Pool;
  const claims: string[] = [];
  const members: string[] = [];
  const fetchSpy = vi.spyOn(globalThis, 'fetch');

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: DATABASE_URL, max: 8, ssl: false, connectionTimeoutMillis: 5000 });
    pool.on('error', (err) => console.error('[claim-contact-ladder-whatsapp-live] idle client error:', err.message));
    for (const pid of [PARIWAR, BURST_PARIWAR]) {
      await pool.query(
        `INSERT INTO pariwar_wa_config (pariwar_id, enabled, phone_number_id, access_token_secret_name)
         VALUES ($1, true, 'pnid-live', 'wa-token-live') ON CONFLICT (pariwar_id) DO NOTHING`,
        [pid],
      );
    }
  });
  afterAll(async () => {
    // ⭐ AC12 — ⛔ a call to graph.facebook.com (or any network) outside the injected fake.
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
    try {
      await pool.query('DELETE FROM claim_contact_wa_stops WHERE pariwar_id = ANY($1::uuid[])', [[PARIWAR, BURST_PARIWAR]]);
      await pool.query('DELETE FROM whatsapp_send_status WHERE pariwar_id = ANY($1::uuid[])', [[PARIWAR, BURST_PARIWAR]]);
      await pool.query('DELETE FROM sms_send_deliveries WHERE pariwar_id = ANY($1::uuid[])', [[PARIWAR, BURST_PARIWAR]]);
      await pool.query('DELETE FROM pariwar_wa_config WHERE pariwar_id = ANY($1::uuid[])', [[PARIWAR, BURST_PARIWAR]]);
      await cleanupClaims(pool, claims, members);
    } finally {
      await pool.end();
    }
  });

  // ── Harness ─────────────────────────────────────────────────────────────────────────────────────────────────

  type MetaAnswer = { readonly status: number; readonly body: unknown } | { readonly throw: Error };
  interface Harness {
    readonly chase: ClaimCorrectionReminderDeps;
    readonly wa: ContactLadderWhatsappDeps;
    readonly enqueued: { queue: string; data: JobEnvelope<unknown>; startAfter?: Date }[];
    readonly requests: { url: string; init: FetchInit }[];
    readonly alarms: string[];
    setNow(d: Date): void;
    answer(a: MetaAnswer): void;
  }
  function harness(o: { readonly allowlist?: readonly string[]; readonly resolveConfig?: (key: string) => Promise<string | null> } = {}): Harness {
    const enqueued: Harness['enqueued'] = [];
    const requests: Harness['requests'] = [];
    const alarms: string[] = [];
    let now = new Date();
    let next: MetaAnswer = { status: 200, body: { messages: [{ id: `wamid.${randomUUID()}` }] } };
    const fakeFetch: FetchLike = async (url, init) => {
      requests.push({ url, init });
      const a = next;
      if ('throw' in a) throw a.throw;
      return { ok: a.status >= 200 && a.status < 300, status: a.status, json: async () => a.body };
    };
    const smsAppClient: SmsAppClient = {
      isConfigured: () => true,
      messaging: () => ({ send: () => Promise.resolve(`gw${randomUUID().replace(/-/g, '')}`) }),
    };
    const resolveConfig =
      o.resolveConfig ??
      (async (key: string) => {
        if (key.startsWith('sms.dlt.template_id.claim_correction.')) return '64b0c0ffee0123456789a0c1';
        if (key.startsWith('sms.claim_correction.helpline_number.')) return HELPLINE;
        if (key.startsWith('wa.template.claim_contact.correction_reminder.')) return TEMPLATE;
        return null;
      });
    const base = {
      pool,
      encryption: enc,
      smsAppClient,
      resolveConfig,
      now: () => now,
      onAlarm: (m: string) => alarms.push(m),
      pariwarAllowlist: o.allowlist ?? [PARIWAR],
    };
    return {
      chase: { ...base, push: { audit: () => Promise.resolve(), hashRendered: () => Promise.resolve('a'.repeat(64)) } },
      wa: {
        ...base,
        nomineeCallsCleared: false,
        whatsappAppCache: createWhatsappAppCache(fakeFetch, { timeoutSignal: () => new AbortController().signal }),
        resolveSecret: async () => 'test-token',
      },
      enqueued,
      requests,
      alarms,
      setNow: (d) => (now = d),
      answer: (a) => (next = a),
    };
  }
  const boss = (h: Harness) =>
    ({
      send: (queue: string, data: object, opts?: { startAfter?: Date }) => {
        h.enqueued.push({ queue, data: data as JobEnvelope<unknown>, ...(opts?.startAfter !== undefined ? { startAfter: opts.startAfter } : {}) });
        return Promise.resolve(randomUUID());
      },
    }) as unknown as Parameters<typeof runContactLadderSweep>[1];
  const take = (h: Harness, queue: string, cid?: string) => {
    const mine = h.enqueued.filter((e) => e.queue === queue && (cid === undefined || (e.data.payload as { claimCaseId: string }).claimCaseId === cid));
    h.enqueued.splice(0, h.enqueued.length, ...h.enqueued.filter((e) => !mine.includes(e)));
    return mine;
  };

  async function seed(opts: SeedReturnedClaimOptions & { readonly pariwarId?: string; readonly basis?: 'v2_en' | 'old' } = {}) {
    const pariwarId = opts.pariwarId ?? PARIWAR;
    const s = await seedReturnedClaim(pool, pariwarId, enc, opts);
    claims.push(s.claimCaseId);
    members.push(s.deceasedMemberId);
    const { rows } = await pool.query<{ day0: string }>(`SELECT to_char(day0, 'YYYY-MM-DD') AS day0 FROM claim_correction_runs WHERE run_id = $1`, [s.runId]);
    if ((opts.basis ?? 'v2_en') === 'v2_en') {
      await pool.query(
        `UPDATE consent_records SET consent_payload = $2::jsonb
          WHERE consent_id = (SELECT agreement_consent_id FROM claim_contacts WHERE claim_case_id = $1)`,
        [s.claimCaseId, JSON.stringify({ checkboxTextShown: 'v2', locale: 'en', copyVersion: claim.CLAIM_CONTACT_AGREEMENT_COPY_VERSION })],
      );
    }
    await pool.query(`UPDATE claim_contacts SET contact_locale = 'en' WHERE claim_case_id = $1`, [s.claimCaseId]);
    return { ...s, day0: rows[0]!.day0, pariwarId };
  }
  type Seeded = Awaited<ReturnType<typeof seed>>;

  /** The correction chase's own day at 10:00 — the origin reminder(s) go; returns the accepted family rows of that day. */
  async function chaseDay(h: Harness, s: Seeded, n: number): Promise<string[]> {
    h.setNow(istAt(day(s.day0, n), '10:00'));
    await runCorrectionReminderSweep(h.chase, boss(h));
    for (const e of take(h, 'claim.correction.family_sms', s.claimCaseId)) {
      await runCorrectionFamilySmsChild(h.chase, e.data as JobEnvelope<CorrectionFamilySmsPayload>, randomUUID());
    }
    const { rows } = await pool.query<{ reminder_id: string }>(
      `SELECT reminder_id FROM claim_correction_reminders WHERE claim_case_id = $1 AND purpose = 'family_sms' AND sent_on = $2 AND outcome = 'accepted'`,
      [s.claimCaseId, day(s.day0, n)],
    );
    return rows.map((r) => r.reminder_id);
  }
  async function reportUndelivered(rowId: string, pariwarId: string = PARIWAR) {
    const { rows } = await pool.query<{ provider_message_id: string }>(`SELECT provider_message_id FROM claim_correction_reminders WHERE reminder_id = $1`, [rowId]);
    await smsDelivery.upsertSmsSendDelivery(pool, {
      pariwarId,
      kind: 'cr',
      rowId,
      requestId: rows[0]!.provider_message_id,
      state: 'undelivered',
      statusCode: '2',
      failureReason: null,
      receivedAt: new Date(),
    });
  }
  /** T5 — the step is due at the ORIGIN row's created_at + 4 h on the DB clock: move it back. */
  const ageOrigin = (rowId: string, hours = 5) =>
    pool.query(`UPDATE claim_correction_reminders SET created_at = clock_timestamp() - make_interval(hours => $2) WHERE reminder_id = $1`, [rowId, hours]);
  async function ladderOf(cid: string) {
    const { rows } = await pool.query<{ ladder_id: string; whatsapp_step: string; state: string; end_detail: string | null; sms2_due_on: string; sms2_state: string }>(
      `SELECT ladder_id, whatsapp_step, state, end_detail, to_char(sms2_due_on, 'YYYY-MM-DD') AS sms2_due_on, sms2_state FROM claim_contact_ladders WHERE claim_case_id = $1`,
      [cid],
    );
    return rows;
  }
  async function sendRowOf(ladderId: string) {
    const { rows } = await pool.query<{ send_outcome: string; detail: string | null; first_detail: string | null; provider_message_id: string | null; send_started_at: Date | null; template_name: string; locale: string }>(
      `SELECT send_outcome, detail, first_detail, provider_message_id, send_started_at, template_name, locale FROM claim_contact_wa_sends WHERE ladder_id = $1`,
      [ladderId],
    );
    return rows[0] ?? null;
  }
  /** A claim whose origin text (day 10) was reported undelivered, its ladder started by a quarter-hourly tick, and the step DUE. */
  async function dueStep(h: Harness, opts: Parameters<typeof seed>[0] = {}) {
    const s = await seed(opts);
    const [origin] = await chaseDay(h, s, 10);
    await reportUndelivered(origin!, s.pariwarId);
    h.setNow(istAt(day(s.day0, 10), '10:30'));
    await runContactLadderWhatsappSweep(h.wa, boss(h));
    const [l] = await ladderOf(s.claimCaseId);
    await ageOrigin(origin!);
    return { s, origin: origin!, ladderId: l!.ladder_id };
  }
  /** The 14:30 tick, then the child(ren) it enqueued for the claim. */
  async function waTick(h: Harness, s: Seeded, at = istAt(day(s.day0, 10), '14:30'), o: { readonly final?: boolean } = {}) {
    h.setNow(at);
    const out = await runContactLadderWhatsappSweep(h.wa, boss(h));
    const results = [];
    for (const e of take(h, WA_SEND, s.claimCaseId)) {
      results.push(
        await runContactLadderWhatsappChild(h.wa, boss(h), e.data as JobEnvelope<ContactLadderWhatsappPayload>, `job-${randomUUID()}`, o.final === true ? { retryCount: 4, retryLimit: 4 } : { retryCount: 0, retryLimit: 4 }),
      );
    }
    return { out, results };
  }

  // ── AC4 / AC5 — the happy path ──────────────────────────────────────────────────────────────────────────────

  it('⭐ a reported failure starts the ladder within the quarter hour (⛔ `advance` — SMS 2 by the late-start rule, the step PENDING); 4 h after the origin, inside the window, ONE template goes through the REAL client — the number without `+`, the template name, `en`, the reference and the helpline, the 10 s bound; the row `accepted` with the wamid; ⛔ a second send', async () => {
    const h = harness();
    const { s, ladderId } = await dueStep(h);
    const [l] = await ladderOf(s.claimCaseId);
    // A start at 10:30 (after the 10:00 run) ⇒ SMS 2 is origin + 2 (≥ the next run, day 11).
    expect(l).toMatchObject({ whatsapp_step: 'pending', state: 'running', sms2_due_on: day(s.day0, 12), sms2_state: 'pending' });
    expect(h.requests).toHaveLength(0);
    const { results } = await waTick(h, s);
    expect(results).toEqual([{ status: 'sent', outcome: 'accepted' }]);
    expect(h.requests).toHaveLength(1);
    const body = JSON.parse(h.requests[0]!.init.body) as { to: string; template: { name: string; language: { code: string }; components: { parameters: { text: string }[] }[] } };
    expect(h.requests[0]!.url).toBe('https://graph.facebook.com/v21.0/pnid-live/messages');
    expect(body.to).toMatch(/^91\d{10}$/);
    expect(body.template.name).toBe(TEMPLATE);
    expect(body.template.language.code).toBe('en');
    expect(body.template.components[0]!.parameters.map((p) => p.text)).toEqual([claim.claimShortReference(s.claimCaseId), HELPLINE]);
    expect(h.requests[0]!.init.signal).toBeDefined();
    const row = (await sendRowOf(ladderId))!;
    expect(row).toMatchObject({ send_outcome: 'accepted', template_name: TEMPLATE, locale: 'en' });
    expect(row.provider_message_id).toMatch(/^wamid\./);
    expect((await ladderOf(s.claimCaseId))[0]!.whatsapp_step).toBe('sent');
    // I4 — a second tick sends ⛔ thing.
    expect((await waTick(h, s, istAt(day(s.day0, 10), '14:45'))).results).toEqual([]);
    expect(h.requests).toHaveLength(1);
  });

  it('⭐ at night: the start still happens (around the clock) but ⛔ child is enqueued; a child that runs at night DEFERS to the next 09:00 BEFORE touching anything', async () => {
    const h = harness();
    const { s, ladderId } = await dueStep(h);
    const night = istAt(day(s.day0, 10), '21:30');
    const { out } = await waTick(h, s, night);
    expect(out.inWindow).toBe(false);
    expect(out.enqueued).toBe(0);
    const payload: ContactLadderWhatsappPayload = { ladderId, claimCaseId: s.claimCaseId, chase: 'correction' };
    const r = await runContactLadderWhatsappChild(h.wa, boss(h), { pariwarId: PARIWAR, requestId: 'r', actorId: null, traceId: 't', payload }, 'job-night');
    expect(r).toEqual({ status: 'deferred', startAfter: istAt(day(s.day0, 11), '09:00') });
    expect(take(h, WA_SEND, s.claimCaseId)).toHaveLength(1);
    expect(await sendRowOf(ladderId)).toBeNull();
    expect((await ladderOf(s.claimCaseId))[0]!.whatsapp_step).toBe('pending');
  });

  // ── AC5 (1) / (6) — the config verdicts and every classifier kind through the REAL client ───────────────────

  it('⭐ the OLD wording ⇒ `skipped:old_wording` (I2 / G3), ⛔ request', async () => {
    const h = harness();
    const { s } = await dueStep(h, { basis: 'old' });
    expect((await waTick(h, s)).results).toEqual([{ status: 'skipped', reason: 'old_wording', where: 'step' }]);
    expect(h.requests).toHaveLength(0);
  });

  it.each<[string, (key: string) => Promise<string | null>, string, boolean]>([
    ['the template name unset ⇒ `whatsapp_not_configured`, ⛔ alarm', async (k) => (k.startsWith('sms.claim_correction.helpline_number.') ? HELPLINE : null), 'whatsapp_not_configured', false],
    ['a template-name read that THROWS ⇒ `whatsapp_config_unreadable` + the fault alarm', async (k) => {
      if (k.startsWith('wa.template.')) throw new Error('INVALID_ARGUMENT');
      return k.startsWith('sms.claim_correction.helpline_number.') ? HELPLINE : null;
    }, 'whatsapp_config_unreadable', true],
    ['a malformed template name ⇒ `whatsapp_template_invalid` + the fault alarm', async (k) => (k.startsWith('wa.template.') ? 'Bad-Name' : k.startsWith('sms.claim_correction.helpline_number.') ? HELPLINE : null), 'whatsapp_template_invalid', true],
    ['T27 — a helpline Meta would refuse (four spaces) ⇒ `helpline_unreadable` + the fault alarm', async (k) => (k.startsWith('wa.template.') ? TEMPLATE : k.startsWith('sms.claim_correction.helpline_number.') ? '1800    123' : null), 'helpline_unreadable', true],
  ])('%s', async (_l, resolveConfig, reason, alarmed) => {
    const seedHarness = harness();
    const { s } = await dueStep(seedHarness);
    const h = harness({ resolveConfig });
    expect((await waTick(h, s)).results).toEqual([{ status: 'skipped', reason, where: 'step' }]);
    expect(h.requests).toHaveLength(0);
    expect(h.alarms.some((a) => a.includes('contact_ladder.whatsapp_config_fault'))).toBe(alarmed);
  });

  it.each<[string, MetaAnswer, string, string]>([
    ['a 400 with 131026 (the recipient) ⇒ `rejected_recipient`', { status: 400, body: { error: { code: 131026 } } }, 'rejected_recipient', 'rejected_recipient:meta_131026'],
    ['a 401 / 131031 (the account — scope) ⇒ `refused` + ALARM, ⛔ parked', { status: 400, body: { error: { code: 131031 } } }, 'refused', 'refused:meta_131031'],
    ['a 132001 (every 132xxx is scope) ⇒ `refused` + ALARM', { status: 400, body: { error: { code: 132001 } } }, 'refused', 'refused:template_not_approved'],
    ['a code of unknown scope (131008) ⇒ `refused` + ALARM', { status: 400, body: { error: { code: 131008 } } }, 'refused', 'refused:meta_131008'],
    ['a 504 (a gateway) ⇒ `may_have_sent`, ⛔ resent', { status: 504, body: {} }, 'may_have_sent', 'may_have_sent:gateway_504'],
    ['a transport failure after the connection opened ⇒ `may_have_sent:network`', { throw: new Error('socket hang up') }, 'may_have_sent', 'may_have_sent:network'],
    ['a 2xx without a wamid ⇒ `may_have_sent:no_wamid`', { status: 200, body: {} }, 'may_have_sent', 'may_have_sent:no_wamid'],
  ])('⭐ %s', async (_l, answer, outcome, detail) => {
    const h = harness();
    const { s, ladderId } = await dueStep(h);
    h.answer(answer);
    const { results } = await waTick(h, s);
    expect(results).toEqual([{ status: 'sent', outcome }]);
    expect(await sendRowOf(ladderId)).toMatchObject({ send_outcome: outcome, detail });
    expect((await sendRowOf(ladderId))!.send_started_at).not.toBeNull();
    expect(h.alarms.some((a) => a.includes('contact_ladder.whatsapp_refused'))).toBe(outcome === 'refused');
    expect(h.requests).toHaveLength(1);
  });

  it('⭐ a transient (429, then a connection that never opened — `-366` d1) is retried by the SAME job; the FINAL attempt finishes `skipped:transient_exhausted`, first_detail the FIRST transient', async () => {
    const h = harness();
    const { s, ladderId } = await dueStep(h);
    h.setNow(istAt(day(s.day0, 10), '14:30'));
    await runContactLadderWhatsappSweep(h.wa, boss(h));
    const [child] = take(h, WA_SEND, s.claimCaseId);
    const env = child!.data as JobEnvelope<ContactLadderWhatsappPayload>;
    h.answer({ status: 429, body: { error: { code: 130429 } } });
    await expect(runContactLadderWhatsappChild(h.wa, boss(h), env, 'job-T', { retryCount: 0, retryLimit: 4 })).rejects.toBeInstanceOf(ClaimCorrectionTransientError);
    expect(await sendRowOf(ladderId)).toMatchObject({ send_outcome: 'attempting', detail: 'rate_limited:130429', send_started_at: null });
    const connect = Object.assign(new Error('fetch failed'), { cause: Object.assign(new Error('getaddrinfo ENOTFOUND'), { code: 'ENOTFOUND' }) });
    h.answer({ throw: connect });
    expect(await runContactLadderWhatsappChild(h.wa, boss(h), env, 'job-T', { retryCount: 4, retryLimit: 4 })).toEqual({ status: 'sent', outcome: 'transient_exhausted' });
    expect(await sendRowOf(ladderId)).toMatchObject({ send_outcome: 'skipped', detail: 'skipped:transient_exhausted', first_detail: 'rate_limited:130429', send_started_at: null });
    expect(h.requests).toHaveLength(2);
  });

  // ── WS8 (iii) / (iv) — crashes ──────────────────────────────────────────────────────────────────────────────

  it('⭐ a crash BEFORE the marker ⇒ the row is re-taken once the lease lapses (the sweep lists it — a claimed step is never `pending` again) and sent; a crash AFTER the marker ⇒ `may_have_sent:lease_lapsed`, ⛔ resent', async () => {
    const h = harness();
    // Before the marker: claim the row (the begin commits), then "crash".
    const a = await dueStep(h);
    await pool.connect().then(async (c) => {
      try {
        await c.query('BEGIN');
        await c.query(`SELECT set_config('app.pariwar_id', $1, true)`, [PARIWAR]);
        await claim.beginContactLadderWhatsapp(c, {
          pariwarId: PARIWAR as never,
          claimCaseId: a.s.claimCaseId as never,
          ladderId: a.ladderId,
          chase: 'correction',
          jobId: 'job-crashed',
          now: istAt(day(a.s.day0, 10), '14:30'),
          inWindow: true,
          nextWindowStart: istAt(day(a.s.day0, 11), '09:00'),
          config: { verdict: 'ok', templateName: TEMPLATE, locale: 'en' },
          finalAttempt: false,
          crypto: enc,
        });
        await c.query('COMMIT');
      } finally {
        c.release();
      }
    });
    expect((await sendRowOf(a.ladderId))!.send_outcome).toBe('attempting');
    const live = await waTick(h, a.s, istAt(day(a.s.day0, 10), '14:45'));
    expect(live.results).toEqual([]);
    const later = new Date(istAt(day(a.s.day0, 10), '14:30').getTime() + LEASE_MS + 60_000);
    expect((await waTick(h, a.s, later)).results).toEqual([{ status: 'sent', outcome: 'accepted' }]);
    // After the marker: mark it, then "crash" — the lapsed finisher records may_have_sent.
    const b = await dueStep(h);
    await pool.connect().then(async (c) => {
      try {
        await c.query('BEGIN');
        await c.query(`SELECT set_config('app.pariwar_id', $1, true)`, [PARIWAR]);
        const r = await claim.beginContactLadderWhatsapp(c, {
          pariwarId: PARIWAR as never,
          claimCaseId: b.s.claimCaseId as never,
          ladderId: b.ladderId,
          chase: 'correction',
          jobId: 'job-crashed-2',
          now: istAt(day(b.s.day0, 10), '14:30'),
          inWindow: true,
          nextWindowStart: istAt(day(b.s.day0, 11), '09:00'),
          config: { verdict: 'ok', templateName: TEMPLATE, locale: 'en' },
          finalAttempt: false,
          crypto: enc,
        });
        await c.query('COMMIT');
        if (r.kind !== 'begun') throw new Error(r.kind);
        await c.query('BEGIN');
        await c.query(`SELECT set_config('app.pariwar_id', $1, true)`, [PARIWAR]);
        await c.query(`UPDATE claim_contact_wa_sends SET send_started_at = clock_timestamp() WHERE send_id = $1`, [r.sendId]);
        await c.query('COMMIT');
      } finally {
        c.release();
      }
    });
    const before = h.requests.length;
    const lapsedAt = new Date(istAt(day(b.s.day0, 10), '14:30').getTime() + LEASE_MS + 60_000);
    const out = await waTick(h, b.s, lapsedAt);
    expect(out.out.finishedLapsed).toBeGreaterThanOrEqual(1);
    expect(out.results).toEqual([]);
    expect(await sendRowOf(b.ladderId)).toMatchObject({ send_outcome: 'may_have_sent', detail: 'may_have_sent:lease_lapsed' });
    expect(h.requests.length).toBe(before);
  });

  // Review R8 (2026-10-20) — a TRUE two-connection race (⛔ sequential on one, as the holder/marker specs are): two REAL
  // concurrent children, each `runContactLadderWhatsappChild`'s OWN pool connection, racing the SAME ladder's send row.
  it('⭐ R8 — two concurrent children on the SAME ladder, two separate connections: the chase lock serialises the claim — exactly ONE send row `accepted`, exactly ONE real WhatsApp request, the other a `noop`', async () => {
    const h = harness();
    const { s, ladderId } = await dueStep(h);
    h.setNow(istAt(day(s.day0, 10), '14:30'));
    const payload: ContactLadderWhatsappPayload = { ladderId, claimCaseId: s.claimCaseId, chase: 'correction' };
    const envelope = { pariwarId: s.pariwarId, requestId: 'r', actorId: null, traceId: 't', payload };
    const before = h.requests.length;
    const [r1, r2] = await Promise.all([
      runContactLadderWhatsappChild(h.wa, boss(h), envelope, 'job-race-a', { retryCount: 0, retryLimit: 4 }),
      runContactLadderWhatsappChild(h.wa, boss(h), envelope, 'job-race-b', { retryCount: 0, retryLimit: 4 }),
    ]);
    const results = [r1, r2];
    expect(results.filter((r) => r.status === 'sent')).toHaveLength(1);
    expect(results.filter((r) => r.status === 'noop')).toHaveLength(1);
    expect(h.requests.length - before).toBe(1); // ONE real (fake-fetch) Meta call — ⛔ a second
    expect(await sendRowOf(ladderId)).toMatchObject({ send_outcome: 'accepted' });
  });

  // ── AC6 — a delivered WhatsApp ends the ladder at the 10:00 sweep ───────────────────────────────────────────

  it('⭐ a DELIVERED WhatsApp (the status store\'s `delivered`, copied into the row) ENDS the ladder `delivered:whatsapp` at the next 10:00 sweep — ⛔ SMS 2 goes', async () => {
    const h = harness();
    const { s, ladderId } = await dueStep(h);
    await waTick(h, s);
    const wamid = (await sendRowOf(ladderId))!.provider_message_id!;
    await pool.query(`INSERT INTO whatsapp_send_status (wamid, pariwar_id, state, meta_status) VALUES ($1, $2, 'delivered', 'delivered')`, [wamid, PARIWAR]);
    h.setNow(istAt(day(s.day0, 12), '10:00'));
    await runContactLadderSweep(h.wa, boss(h));
    expect(take(h, 'claim.correction.ladder_sms', s.claimCaseId)).toHaveLength(0);
    const [l] = await ladderOf(s.claimCaseId);
    expect([l!.state, l!.end_detail]).toEqual(['ended_delivered', 'delivered:whatsapp']);
  });

  it('⭐ the 10:00 start on SMS 2\'s own date: the daily sweep starts AND advances the ladder (SMS 2 goes that morning) ⇒ its WhatsApp is `skipped:overtaken`', async () => {
    const h = harness();
    const s = await seed();
    const [origin] = await chaseDay(h, s, 10);
    await reportUndelivered(origin!);
    // ⛔ quarter-hourly tick saw it (a missed window) — the 10:00 daily sweep on day 12 (origin + 2) starts it.
    h.setNow(istAt(day(s.day0, 12), '10:00'));
    await runContactLadderSweep(h.wa, boss(h));
    for (const e of take(h, 'claim.correction.ladder_sms', s.claimCaseId)) {
      await runCorrectionLadderSmsChild(h.wa, e.data as JobEnvelope<LadderSmsPayload>, randomUUID());
    }
    expect((await ladderOf(s.claimCaseId))[0]!.sms2_state).toBe('sent');
    await ageOrigin(origin!);
    expect((await waTick(h, s, istAt(day(s.day0, 12), '14:30'))).results).toEqual([{ status: 'skipped', reason: 'overtaken', where: 'step' }]);
    expect(h.requests).toHaveLength(0);
  });

  it('⭐ AC4 / WS6 — a report first seen on origin + 2 at 14:00 (after that day\'s 10:00 run): the quarter-hourly start stores SMS 2 for the NEXT run (⛔ today), sends ⛔ SMS 2 at the start, and its WhatsApp is ⛔ overtaken — it goes', async () => {
    const h = harness();
    const s = await seed();
    const [origin] = await chaseDay(h, s, 10);
    await reportUndelivered(origin!);
    await ageOrigin(origin!);
    h.setNow(istAt(day(s.day0, 12), '14:00'));
    await runContactLadderWhatsappSweep(h.wa, boss(h));
    const [l] = await ladderOf(s.claimCaseId);
    expect(l).toMatchObject({ sms2_due_on: day(s.day0, 13), sms2_state: 'pending', whatsapp_step: 'pending' });
    expect(take(h, 'claim.correction.ladder_sms', s.claimCaseId)).toHaveLength(0);
    // The same tick enqueued the step's child (the origin is 4 h old and it is daytime) — it SENDS (⛔ overtaken by an SMS 2).
    const children = take(h, WA_SEND, s.claimCaseId);
    expect(children).toHaveLength(1);
    expect(await runContactLadderWhatsappChild(h.wa, boss(h), children[0]!.data as JobEnvelope<ContactLadderWhatsappPayload>, 'job-late', { retryCount: 0, retryLimit: 4 })).toEqual({
      status: 'sent',
      outcome: 'accepted',
    });
  });

  // Review R7 (2026-10-20) — a regression leg for the fix itself: the quarter-hourly start's 2-hour recency scan must apply
  // PER ORIGIN, ⛔ per claim. Two people on the SAME claim, two reports, one fresh (inside the window) and one 3 hours old
  // (outside it): only the fresh one's ladder may start now; the older one waits for the next 10:00 daily sweep.
  it('⭐ R7 — the quarter-hourly start enforces the two-hour window per ORIGIN: a fresh report starts its ladder; an older, unladdered report for a DIFFERENT person on the SAME claim waits for the next 10:00 sweep', async () => {
    const h = harness();
    const s = await seed({ nomineeMobiles: ['9812345671', '9812345672'] });
    const origins = await chaseDay(h, s, 10);
    expect(origins).toHaveLength(2);
    const [freshOrigin, staleOrigin] = origins;
    await reportUndelivered(freshOrigin!, s.pariwarId);
    await reportUndelivered(staleOrigin!, s.pariwarId);
    // The stale origin's report was RECEIVED three hours ago — outside the quarter-hourly scan's 2-hour window (T4).
    await pool.query(
      `UPDATE sms_send_deliveries SET reported_at = now() - interval '3 hours', first_reported_at = now() - interval '3 hours' WHERE send_row_id = $1`,
      [staleOrigin],
    );
    h.setNow(istAt(day(s.day0, 10), '14:30'));
    await runContactLadderWhatsappSweep(h.wa, boss(h));
    const started = await pool.query<{ origin_row_id: string }>(`SELECT origin_row_id FROM claim_contact_ladders WHERE claim_case_id = $1`, [s.claimCaseId]);
    expect(started.rows).toHaveLength(1);
    expect(started.rows[0]!.origin_row_id).toBe(freshOrigin);
    // The next day's 10:00 DAILY sweep (⛔ the 2-hour restriction) picks up the stale origin too.
    h.setNow(istAt(day(s.day0, 11), '10:00'));
    await runContactLadderSweep(h.wa, boss(h));
    const both = await pool.query<{ origin_row_id: string }>(`SELECT origin_row_id FROM claim_contact_ladders WHERE claim_case_id = $1`, [s.claimCaseId]);
    expect(both.rows.map((r) => r.origin_row_id).sort()).toEqual([freshOrigin, staleOrigin].sort());
  });

  // ── AC4 — LD13's start tail runs for the quarter-hourly starts ──────────────────────────────────────────────

  it('⭐ three ladders started by quarter-hourly ticks in ONE Pariwar on one IST day raise ONE `contact_ladder.burst:3`', async () => {
    const h = harness({ allowlist: [BURST_PARIWAR] });
    for (let i = 0; i < 3; i += 1) {
      const s = await seed({ pariwarId: BURST_PARIWAR });
      const [origin] = await chaseDay(h, s, 10);
      await reportUndelivered(origin!, BURST_PARIWAR);
      h.setNow(istAt(day(s.day0, 10), '10:30'));
      await runContactLadderWhatsappSweep(h.wa, boss(h));
    }
    expect(h.alarms.filter((a) => a.includes('contact_ladder.burst:'))).toHaveLength(1);
    expect(h.alarms.find((a) => a.includes('contact_ladder.burst:'))).toContain('contact_ladder.burst:3');
  });

  it('WS6 — the next daily run: today before 10:00 IST, else tomorrow', () => {
    expect(nextDailyLadderRunOn(istAt('2026-10-20', '09:59'))).toBe('2026-10-20');
    expect(nextDailyLadderRunOn(istAt('2026-10-20', '10:00'))).toBe('2026-10-21');
    expect(nextDailyLadderRunOn(istAt('2026-10-20', '23:59'))).toBe('2026-10-21');
  });

  it('AC11 — ⛔ alarm carries a number or the helpline; ids only', async () => {
    const h = harness();
    const { s } = await dueStep(h);
    h.answer({ status: 400, body: { error: { code: 131031 } } });
    await waTick(h, s);
    for (const a of h.alarms) {
      expect(a).not.toMatch(/\d{10}/);
      expect(a).not.toContain(HELPLINE);
    }
  });
});
