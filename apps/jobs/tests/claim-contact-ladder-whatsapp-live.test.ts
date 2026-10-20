// The claimant's WHATSAPP STEP end to end — the quarter-hourly sweep and the child against the live DB (Story 6.37d, Tasks 5–6;
// AC3–AC6, AC12; WS5–WS9, WS12; I1–I5, I10). Own-committing (the sweeps read COMMITTED rows across tenants), an INJECTED clock for
// the window and the lease, the DB clock for origin + 4 h (the origin row's `created_at` is moved back — T5), a capturing queue, and
// ⭐ the REAL WhatsApp client (`createWhatsappAppCache`) over an INJECTED fetch (⛔ network — a global-fetch spy stays at ZERO), so
// the request body, the timeout and the classifier are the shipped ones. ⭐ ISOLATED: every sweep runs with `pariwarAllowlist` =
// this suite's own random Pariwars. The chases' REAL sweeps and children send the origin reminders (real envelopes, real hashes).

import { randomUUID } from 'node:crypto';

import { createWhatsappAppCache, type FetchInit, type FetchLike, type SmsAppClient } from '@twt/channels';
import { bindScopedDb, claim, cycleCalendar, ids, nominee, schema, smsDelivery, withPariwarScope } from '@twt/domain';
import type { JobEnvelope } from '@twt/queue';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { buildJobsEncryptionDeps } from '../src/deps.js';
import {
  runCertificateFamilySmsChild,
  runCertificateReminderSweep,
  type CertificateFamilySmsPayload,
} from '../src/scheduler/claim-certificate-reminders.js';
import {
  newTally,
  raiseLadderStartAlarms,
  runContactLadderSweep,
  runCorrectionLadderSmsChild,
  type LadderSmsPayload,
} from '../src/scheduler/claim-contact-ladder.js';
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
import { cleanupClaims, encryptField, onOwnTx, seedReturnedClaim, type SeedReturnedClaimOptions } from './_claim-correction-seed.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);
const PARIWAR = randomUUID();
const BURST_PARIWAR = randomUUID();
const BURST_PARIWAR_2 = randomUUID(); // round 2 (R6) — its own day count
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
    for (const pid of [PARIWAR, BURST_PARIWAR, BURST_PARIWAR_2]) {
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
      await pool.query('DELETE FROM claim_contact_wa_stops WHERE pariwar_id = ANY($1::uuid[])', [[PARIWAR, BURST_PARIWAR, BURST_PARIWAR_2]]);
      await pool.query('DELETE FROM whatsapp_send_status WHERE pariwar_id = ANY($1::uuid[])', [[PARIWAR, BURST_PARIWAR, BURST_PARIWAR_2]]);
      await pool.query('DELETE FROM sms_send_deliveries WHERE pariwar_id = ANY($1::uuid[])', [[PARIWAR, BURST_PARIWAR, BURST_PARIWAR_2]]);
      await pool.query('DELETE FROM pariwar_wa_config WHERE pariwar_id = ANY($1::uuid[])', [[PARIWAR, BURST_PARIWAR, BURST_PARIWAR_2]]);
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

  // ── The CERTIFICATE chase's own fixture (Review R8, 2026-10-20) — ported from `claim-contact-ladder-live.test.ts`'s
  // `seedWait` (itself "6.19d's own fixture, copied"), + a v2 WhatsApp-eligible agreement (that fixture's own payload
  // carries no `copyVersion`, so WhatsApp would never be eligible on a claim seeded by it alone). A claim at
  // `verifier_review` with a MISSING (or rejected) certificate — the correction chase's `seedReturnedClaim` bakes in an
  // ACCEPTED certificate, which makes any certificate run on it self-stop immediately (CR5), so this is a SEPARATE
  // fixture, not a variant of `seed()`.
  async function seedCertWait(opts: { readonly mobiles?: readonly string[]; readonly missing?: boolean } = {}) {
    const cid = ids.claimId(randomUUID());
    const mid = ids.memberId(randomUUID());
    const pid = ids.pariwarId(PARIWAR);
    const mobiles = opts.mobiles ?? ['9812345678'];
    claims.push(cid);
    members.push(mid);
    await onOwnTx(pool, PARIWAR, async (client) => {
      const emit = (from: string | null, to: string, eventType: string, extra: Record<string, unknown> = {}) =>
        claim.projectClaimState(client, {
          claimCaseId: cid,
          pariwarId: pid,
          deceasedMemberId: mid,
          intakeChannels: ['member_app'],
          claimantActorId: null,
          eventType: eventType as never,
          payload: { from_state: from, to_state: to, trigger: 'test', actor: 'system', ...extra } as never,
          actorId: null,
        });
      await emit(null, 'intake_pending', 'claim.intake_initiated', { deceased_member_id: mid, intake_channel: 'member_app', claimant_actor_id: null });
      await emit('intake_pending', 'intake_converged', 'claim.intake_converged');
      await emit('intake_converged', 'documents_pending', 'claim.documents_received');
      await emit('documents_pending', 'verification_in_progress', 'claim.peer_mesh_pinged', {
        selected_member_ids: [randomUUID()],
        metric_id: 'district_cohort_v1',
        metric_version: 1,
      });
      await emit('verification_in_progress', 'verifier_review', 'claim.verifier_reviewing');
    });
    await onOwnTx(pool, PARIWAR, async (client) => {
      const db = bindScopedDb(client);
      await db.insert(schema.members).values({ memberId: mid, pariwarId: pid, state: 'active', stateEventVersion: 1 }).onConflictDoNothing();
      const { ranks } = nominee.deriveNomineeSplit(mobiles.length);
      const rows = await Promise.all(
        mobiles.map(async (m, i) => ({
          rank: ranks[i]!.rank,
          splitPct: ranks[i]!.splitPct,
          relationship: i === 0 ? 'spouse' : 'son',
          nameCiphertext: await encryptField(`Nominee ${String(i + 1)}`, PARIWAR, 'member_nominee', enc),
          mobileCiphertext: await encryptField(m, PARIWAR, 'member_nominee', enc),
          addressCiphertext: null,
        })),
      );
      await nominee.replaceMemberNominees(db, { memberId: mid, pariwarId: pid, nominees: rows });
      const plan = nominee.planDeclarationVersions(await nominee.getNomineeVersionHeads(db, pid, mid), rows.map((r) => r.rank));
      const appended = await nominee.appendMemberDeclarationVersions(db, {
        memberId: mid,
        pariwarId: pid,
        plan,
        nominees: rows,
        recordedAt: new Date('2026-01-05T06:00:00.000Z'),
        eventVersion: null,
      });
      const versions = appended.map((a: { versionId: string }) => a.versionId as string);
      const [agreement] = await db
        .insert(schema.consentRecords)
        .values({
          subjectId: mid,
          pariwarId: pid,
          consentType: 'claim_contact_agreement',
          consentArtifactRef: cid,
          grantedViaActor: 'member_self',
          consentPayload: { checkboxTextShown: 'v2', locale: 'en', copyVersion: claim.CLAIM_CONTACT_AGREEMENT_COPY_VERSION },
          grantedAt: new Date(Date.now() - 60_000),
        } as never)
        .returning({ consentId: schema.consentRecords.consentId });
      const address = await encryptField('House 1, Fixture Lane', PARIWAR, 'claim_contact', enc);
      const [contact] = await db
        .insert(schema.claimContacts)
        .values({
          claimCaseId: cid,
          pariwarId: pid,
          deceasedMemberId: mid,
          claimantNomineeVersionId: versions[0] as never,
          agreementConsentId: agreement!.consentId,
          contactLocale: 'en',
          recordedByActor: 'fixture',
          recordedVia: 'member_app',
        })
        .returning({ contactId: schema.claimContacts.contactId });
      for (const v of versions) {
        await db.insert(schema.claimContactNominees).values({
          contactId: contact!.contactId,
          claimCaseId: cid,
          pariwarId: pid,
          nomineeVersionId: v as never,
          addressCiphertext: address,
          relationship: null,
        });
      }
      if (opts.missing !== true) {
        const docId = randomUUID();
        const uploadId = randomUUID();
        const key = `pariwar/${pid}/claim/${cid}/death_certificate/${docId}/${uploadId}`;
        await db.insert(schema.claimDocuments).values({
          claimDocumentId: docId as never,
          claimCaseId: cid,
          pariwarId: pid,
          documentType: 'death_certificate',
          storageObjectKey: key,
          contentType: 'application/pdf',
          byteSize: 1024,
          parityOutcome: 'match',
          parityFlags: {},
          ocrConfidence: 0.9,
          verifierReviewRequired: false,
        });
        await db.insert(schema.claimDeathCertificateUploads).values({
          uploadId: uploadId as never,
          claimCaseId: cid,
          pariwarId: pid,
          deceasedMemberId: mid,
          claimDocumentId: docId as never,
          storageObjectKey: key,
          contentType: 'application/pdf',
          byteSize: 1024,
          channel: 'member_app',
          uploadedByActorId: null,
          uploadedAt: new Date(),
          parityOutcome: 'match',
          parityFlags: {},
          ocrConfidence: 0.9,
        });
        await claim.recordDeathCertificateReview(client, {
          claimCaseId: cid,
          pariwarId: pid,
          verdict: 'rejected',
          certificateToken: uploadId,
          acceptedDate: null,
          acceptedDateCiphertext: null,
          rejectionReason: 'no_date_of_death',
          noteCiphertext: 'enc:v1:review-note',
          expectedLiveReviewId: null,
          actorId: randomUUID(),
          actorDisplay: 'Test District Admin',
          actor: 'operator',
        } as never);
      }
    });
    return { claimCaseId: cid as string, deceasedMemberId: mid as string, pariwarId: PARIWAR };
  }
  /** 6.37b's record for a certificate-chase send, through its OWN upsert. */
  async function reportCertUndelivered(rowId: string, pariwarId: string = PARIWAR) {
    const { rows } = await pool.query<{ provider_message_id: string }>(`SELECT provider_message_id FROM claim_certificate_reminders WHERE reminder_id = $1`, [rowId]);
    await smsDelivery.upsertSmsSendDelivery(pool, {
      pariwarId,
      kind: 'ce',
      rowId,
      requestId: rows[0]!.provider_message_id,
      state: 'undelivered',
      statusCode: '2',
      failureReason: null,
      receivedAt: new Date(),
    });
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

  // Review R8 (2026-10-20) — AC5's named leg: "a row released at 20:00 whose Pariwar turns WhatsApp off overnight ⇒ the
  // 09:00 child (a new job id) finishes it `skipped:whatsapp_not_configured`; ⛔ re-selected at 09:15." The marker is set
  // (committed), THEN 20:00 arrives before the Meta call — `releaseContactLadderWhatsappInFlight` is the exact function
  // that un-marks it (its own doc: "20:00 IST arrived BETWEEN the marker's commit and the Meta call").
  it('⭐ R8 — a row released at 20:00 (marked, then un-marked before the Meta call) whose Pariwar turns WhatsApp off overnight: the 09:00 child (a NEW job id) finishes it `skipped:whatsapp_not_configured`, ⛔ re-selected again', async () => {
    // Its OWN Pariwar — this test turns WhatsApp off mid-test and must never leave the SHARED `PARIWAR` constant
    // disabled for every test that runs after it in this file.
    const CONFIGOFF = randomUUID();
    await pool.query(
      `INSERT INTO pariwar_wa_config (pariwar_id, enabled, phone_number_id, access_token_secret_name) VALUES ($1, true, 'pnid-live', 'wa-token-live')`,
      [CONFIGOFF],
    );
    const h = harness({ allowlist: [CONFIGOFF] });
    const a = await dueStep(h, { pariwarId: CONFIGOFF });
    const before2000 = istAt(day(a.s.day0, 10), '19:55');
    const sendId = await pool.connect().then(async (c) => {
      try {
        await c.query('BEGIN');
        await c.query(`SELECT set_config('app.pariwar_id', $1, true)`, [a.s.pariwarId]);
        const r = await claim.beginContactLadderWhatsapp(c, {
          pariwarId: a.s.pariwarId as never,
          claimCaseId: a.s.claimCaseId as never,
          ladderId: a.ladderId,
          chase: 'correction',
          jobId: 'job-released',
          now: before2000,
          inWindow: true,
          nextWindowStart: istAt(day(a.s.day0, 11), '09:00'),
          config: { verdict: 'ok', templateName: TEMPLATE, locale: 'en' },
          finalAttempt: false,
          crypto: enc,
        });
        await c.query('COMMIT');
        if (r.kind !== 'begun') throw new Error(r.kind);
        return r.sendId;
      } finally {
        c.release();
      }
    });
    const ref = { pariwarId: a.s.pariwarId as never, sendId, jobId: 'job-released' };
    const marked = await withPariwarScope(pool, a.s.pariwarId, (db) => claim.markContactLadderWhatsappInFlight(db, { ...ref, leaseMarginMs: 60_000, now: before2000 }));
    expect(marked).toBe('marked');
    const released = await withPariwarScope(pool, a.s.pariwarId, (db) => claim.releaseContactLadderWhatsappInFlight(db, ref));
    expect(released).toBe(true);
    expect((await sendRowOf(a.ladderId))!.send_started_at).toBeNull();
    // Overnight — the Pariwar turns WhatsApp off.
    await pool.query(`UPDATE pariwar_wa_config SET enabled = false WHERE pariwar_id = $1`, [a.s.pariwarId]);
    h.setNow(istAt(day(a.s.day0, 11), '09:00'));
    const morning = await waTick(h, a.s, istAt(day(a.s.day0, 11), '09:00'));
    expect(morning.results).toEqual([{ status: 'skipped', reason: 'whatsapp_not_configured', where: 'row' }]);
    expect(await sendRowOf(a.ladderId)).toMatchObject({ send_outcome: 'skipped', detail: 'skipped:whatsapp_not_configured' });
    // ⛔ re-selected at the next (09:15) tick — the row is finished, not `attempting`.
    const again = await waTick(h, a.s, istAt(day(a.s.day0, 11), '09:15'));
    expect(again.results).toEqual([]);
    await pool.query(`DELETE FROM pariwar_wa_config WHERE pariwar_id = $1`, [CONFIGOFF]);
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
    // Round 2 (P6 — WS6's named leg, made to BITE): SMS 2 resolves `satisfied` on its stored DUE date (origin + 3) because a
    // family text already reached that number that day; a `satisfied` step anchors SMS 3 on the DUE date (`nextAfter`) ⇒
    // origin + 5. Had the start stored "today" (origin + 2) as the due date, the same day's resolution would give origin + 4.
    const { rows: o } = await pool.query<{ run_id: string; recipient_key: string; recipient_version_id: string; recipient_number_hash: string }>(
      `SELECT run_id, recipient_key, recipient_version_id, recipient_number_hash FROM claim_correction_reminders WHERE reminder_id = $1`,
      [origin!],
    );
    await onOwnTx(pool, PARIWAR, async (client) => {
      const db = bindScopedDb(client);
      const jobId = `job-${randomUUID()}`;
      const claimed = await claim.claimCorrectionReminder(db, {
        pariwarId: PARIWAR as never,
        claimCaseId: s.claimCaseId as never,
        runId: o[0]!.run_id,
        slotDay: 13,
        recipientKey: o[0]!.recipient_key,
        purpose: 'family_sms',
        subjectKey: '',
        sentOn: day(s.day0, 13),
        late: false,
        jobId,
        now: new Date(),
      });
      if (claimed.status !== 'claimed') throw new Error(claimed.status);
      await claim.finaliseCorrectionReminder(db, {
        pariwarId: PARIWAR as never,
        reminderId: claimed.reminderId,
        jobId,
        outcome: 'accepted',
        providerMessageId: `pm${randomUUID().replace(/-/g, '')}`,
        recipientVersionId: o[0]!.recipient_version_id,
        recipientNumberHash: o[0]!.recipient_number_hash,
      });
    });
    h.setNow(istAt(day(s.day0, 13), '10:00'));
    await runContactLadderSweep(h.wa, boss(h));
    for (const e of take(h, 'claim.correction.ladder_sms', s.claimCaseId)) {
      await runCorrectionLadderSmsChild(h.wa, e.data as JobEnvelope<LadderSmsPayload>, randomUUID());
    }
    const { rows } = await pool.query<{ sms2_state: string; sms3_due_on: string | null }>(
      `SELECT sms2_state, to_char(sms3_due_on, 'YYYY-MM-DD') AS sms3_due_on FROM claim_contact_ladders WHERE ladder_id = $1`,
      [l!.ladder_id],
    );
    expect(rows[0]!.sms2_state).toBe('satisfied');
    expect(rows[0]!.sms3_due_on).toBe(day(s.day0, 15));
  });

  // Review R7 (2026-10-20) — a regression leg for the fix itself: the quarter-hourly start's 2-hour recency scan must apply
  // PER ORIGIN, ⛔ per claim. Two people on the SAME claim, two reports, one fresh (inside the window) and one 3 hours old
  // (outside it): only the fresh one's ladder may start now; the older one waits for the next 10:00 daily sweep.
  it('⭐ R7 — the quarter-hourly start enforces the two-hour window per ORIGIN: a fresh report starts its ladder; an older (9 h — outside the 8-hour window), unladdered report for a DIFFERENT person on the SAME claim waits for the next 10:00 sweep', async () => {
    const h = harness();
    const s = await seed({ nomineeMobiles: ['9812345671', '9812345672'] });
    const origins = await chaseDay(h, s, 10);
    expect(origins).toHaveLength(2);
    const [freshOrigin, staleOrigin] = origins;
    await reportUndelivered(freshOrigin!, s.pariwarId);
    await reportUndelivered(staleOrigin!, s.pariwarId);
    // The stale origin's report was RECEIVED nine hours ago — outside the quarter-hourly scan's window (T4; 8 h since `-370` d2).
    await pool.query(
      `UPDATE sms_send_deliveries SET reported_at = now() - interval '9 hours', first_reported_at = now() - interval '9 hours' WHERE send_row_id = $1`,
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

  // Review R8 (2026-10-20) — the late-correlator leg AC4 discloses by name: `reported_at` is the GREATEST of the reports'
  // `received_at` (when WE first received a report), ⛔ when the correlator actually SETTLED the row into `undelivered`.
  // A report received long ago whose correlator write only lands NOW still carries that old `received_at` — so by the
  // time the row is visible at all, it can already read as outside the quarter-hourly scan's 2-hour window. One person,
  // one report: proves the disclosed gap behaves exactly as documented (⛔ started now; the next 10:00 sweep gets it).
  it('⭐ R8 / -370 d2 — the late-correlator leg: a report the correlator settles NOW keeps its old `received_at`; within EIGHT hours (3 h) the quarter-hourly start takes it (the WhatsApp as `-368` Q1 A has it); older (9 h) waits for the next 10:00 sweep', async () => {
    const h = harness();
    const lateSettle = async (hoursAgo: number) => {
      const s = await seed();
      const [origin] = await chaseDay(h, s, 10);
      // The correlator writes the row now, but stamps the report's OWN (old) receipt time — MSG91's 2 h / 6 h retry delay.
      await pool.query(
        `INSERT INTO sms_send_deliveries (send_kind, send_row_id, pariwar_id, request_id, delivery_state, status_code, first_reported_at, reported_at)
         SELECT 'cr', $1, $2, provider_message_id, 'undelivered', '2', now() - make_interval(hours => $3), now() - make_interval(hours => $3)
           FROM claim_correction_reminders WHERE reminder_id = $1`,
        [origin, s.pariwarId, hoursAgo],
      );
      return s;
    };
    const recent = await lateSettle(3);
    const old = await lateSettle(9);
    h.setNow(istAt(day(recent.day0, 10), '14:30'));
    await runContactLadderWhatsappSweep(h.wa, boss(h));
    expect((await ladderOf(recent.claimCaseId))[0]).toMatchObject({ state: 'running', whatsapp_step: 'pending' });
    expect(await ladderOf(old.claimCaseId)).toEqual([]);
    h.setNow(istAt(day(old.day0, 11), '10:00'));
    await runContactLadderSweep(h.wa, boss(h));
    expect((await ladderOf(old.claimCaseId))[0]).toMatchObject({ state: 'running' });
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

  // ── Review R8 (2026-10-20) — the CERTIFICATE chase's own WhatsApp legs (`-351` 3 B) ────────────────────────────

  it('⭐ R8 — CERTIFICATE chase: a reported failure starts the ladder within the quarter hour on the claimant\'s rejected-certificate review; 4 h later, inside the window, ONE template goes through the REAL client; the row `accepted`', async () => {
    // The harness's DEFAULT resolveConfig only maps the CORRECTION chase's WhatsApp template key — the certificate
    // chase's distinct `claim_contact.certificate_reminder` key needs its own.
    const h = harness({
      resolveConfig: async (key: string) => {
        if (key.startsWith('sms.dlt.template_id.claim_correction.')) return '64b0c0ffee0123456789a0c1';
        if (key.startsWith('sms.claim_correction.helpline_number.')) return HELPLINE;
        if (key.startsWith('wa.template.claim_contact.correction_reminder.')) return TEMPLATE;
        if (key.startsWith('wa.template.claim_contact.certificate_reminder.')) return TEMPLATE;
        return null;
      },
    });
    const w = await seedCertWait();
    h.setNow(new Date());
    await runCertificateReminderSweep(h.chase, boss(h));
    take(h, 'claim.certificate.family_sms', w.claimCaseId);
    const run = await pool.query<{ day0: string }>(
      `SELECT to_char(day0, 'YYYY-MM-DD') AS day0 FROM claim_certificate_reminder_runs WHERE claim_case_id = $1 AND ended_at IS NULL`,
      [w.claimCaseId],
    );
    const certDay0 = run.rows[0]!.day0;
    h.setNow(istAt(day(certDay0, 10), '10:00'));
    await runCertificateReminderSweep(h.chase, boss(h));
    for (const e of take(h, 'claim.certificate.family_sms', w.claimCaseId)) {
      await runCertificateFamilySmsChild(h.chase, e.data as JobEnvelope<CertificateFamilySmsPayload>, randomUUID());
    }
    const sent = await pool.query<{ reminder_id: string }>(
      `SELECT reminder_id FROM claim_certificate_reminders WHERE claim_case_id = $1 AND purpose = 'family_sms' AND outcome = 'accepted' AND sent_on = $2`,
      [w.claimCaseId, day(certDay0, 10)],
    );
    expect(sent.rows).toHaveLength(1);
    const origin = sent.rows[0]!.reminder_id;
    await reportCertUndelivered(origin, w.pariwarId);
    // The quarter-hourly start (⛔ `listLadderCandidateClaims`'s 14-day set — T4): the SAME planner as the daily sweep.
    h.setNow(istAt(day(certDay0, 10), '10:15'));
    await runContactLadderWhatsappSweep(h.wa, boss(h));
    const ladder = await pool.query<{ ladder_id: string; chase: string; whatsapp_step: string; state: string; origin_row_id: string }>(
      `SELECT ladder_id, chase, whatsapp_step, state, origin_row_id FROM claim_contact_ladders WHERE claim_case_id = $1`,
      [w.claimCaseId],
    );
    expect(ladder.rows).toEqual([{ ladder_id: ladder.rows[0]!.ladder_id, chase: 'certificate', whatsapp_step: 'pending', state: 'running', origin_row_id: origin }]);
    // 4 h after the origin, inside the window: the step is due — the CR7 pre-lock hashes taken, the real client sends.
    await pool.query(`UPDATE claim_certificate_reminders SET created_at = clock_timestamp() - make_interval(hours => 5) WHERE reminder_id = $1`, [origin]);
    h.setNow(istAt(day(certDay0, 10), '14:30'));
    await runContactLadderWhatsappSweep(h.wa, boss(h));
    const liveResults = [];
    for (const e of take(h, WA_SEND, w.claimCaseId)) {
      liveResults.push(await runContactLadderWhatsappChild(h.wa, boss(h), e.data as JobEnvelope<ContactLadderWhatsappPayload>, `job-${randomUUID()}`, { retryCount: 0, retryLimit: 4 }));
    }
    expect(liveResults).toEqual([{ status: 'sent', outcome: 'accepted' }]);
    const sendRow = await pool.query<{ send_outcome: string; chase: string; provider_message_id: string | null }>(
      `SELECT send_outcome, chase, provider_message_id FROM claim_contact_wa_sends WHERE ladder_id = $1`,
      [ladder.rows[0]!.ladder_id],
    );
    expect(sendRow.rows[0]).toMatchObject({ send_outcome: 'accepted', chase: 'certificate' });
    expect(sendRow.rows[0]!.provider_message_id).not.toBeNull();
  });

  // ── Code review ROUND 2 (2026-10-20) — the legs round 2 found missing or unable to fail (P1 R6, P5, P6, P10, P14) ──────

  /** The jobs KMS, with hooks that run BEFORE each HMAC / DEK decrypt (a hook may throw — a KMS outage — or act on the DB). */
  function hookedEnc(hk: { readonly beforeHmac?: () => Promise<void>; readonly beforeDecrypt?: () => Promise<void> }): typeof enc {
    const kms = Object.create(enc.kms) as typeof enc.kms;
    kms.computeHmac = async (...a: Parameters<typeof enc.kms.computeHmac>) => {
      await hk.beforeHmac?.();
      return enc.kms.computeHmac(...a);
    };
    kms.decryptDek = async (...a: Parameters<typeof enc.kms.decryptDek>) => {
      await hk.beforeDecrypt?.();
      return enc.kms.decryptDek(...a);
    };
    return { ...enc, kms };
  }
  const kmsDown = () => Promise.reject(new Error('kms unavailable'));
  /** The child the 14:30 tick enqueues for a due step — its envelope (⛔ run). */
  async function dueChild(h: Harness, s: Seeded) {
    h.setNow(istAt(day(s.day0, 10), '14:30'));
    await runContactLadderWhatsappSweep(h.wa, boss(h));
    const [child] = take(h, WA_SEND, s.claimCaseId);
    return child!.data as JobEnvelope<ContactLadderWhatsappPayload>;
  }
  /** As another job: re-take this ladder's claimed row (a re-claim — the trigger's own rules) between the commit and the marker. */
  function thief(ladderId: string) {
    const state = { stolen: false };
    const steal = async () => {
      if (state.stolen) return;
      const { rowCount } = await pool.query(
        `UPDATE claim_contact_wa_sends SET claimed_by_job = 'job-thief', attempt_count = attempt_count + 1, claimed_at = clock_timestamp()
          WHERE ladder_id = $1 AND send_outcome = 'attempting' AND send_started_at IS NULL AND claimed_by_job <> 'job-thief'`,
        [ladderId],
      );
      if ((rowCount ?? 0) > 0) state.stolen = true; // the begin's own row is invisible until it COMMITS — the first visible decrypt steals it
    };
    return { state, enc: hookedEnc({ beforeDecrypt: steal }) };
  }

  it('⭐ R6 — the burst alarm REPEATS on a later tick that starts a ladder past the threshold (⛔ "once a day"); a run whose OWN start is not the crossing one still alarms (the overlap the removed conjunct missed)', async () => {
    const h = harness({ allowlist: [BURST_PARIWAR_2] });
    for (let i = 0; i < 4; i += 1) {
      const s = await seed({ pariwarId: BURST_PARIWAR_2 });
      const [origin] = await chaseDay(h, s, 10);
      await reportUndelivered(origin!, BURST_PARIWAR_2);
      h.setNow(istAt(day(s.day0, 10), '10:30'));
      await runContactLadderWhatsappSweep(h.wa, boss(h));
    }
    const counts = h.alarms.filter((a) => a.includes('contact_ladder.burst:')).map((a) => /contact_ladder\.burst:(\d+)/.exec(a)![1]);
    expect(counts).toEqual(['3', '4']);
    // The tail itself, with a run's own starts (1) BELOW the day's count (4) — the shape that, for two overlapping runs that
    // crossed TOGETHER (each `mine` excluding only its own starts), made `n - mine < THRESHOLD` false for BOTH and silenced them
    // (this models the per-run check, ⛔ a real concurrent pair). ⚠ The four seeds and this call must fall in ONE IST day.
    const overlap: string[] = [];
    const tally = newTally();
    tally.startedByPariwar.set(BURST_PARIWAR_2, 1);
    await raiseLadderStartAlarms({ pool, onAlarm: (m: string) => overlap.push(m) }, tally);
    expect(overlap.filter((a) => a.includes('contact_ladder.burst:4'))).toHaveLength(1);
  });

  it('⭐ R8 / P5 — the MARKER CAS on two connections: two marks of the SAME claimed row (they may overlap or serialise) ⇒ exactly ONE `marked`, the other `lost`', async () => {
    const h = harness();
    const { s, ladderId } = await dueStep(h);
    const sendId = await pool.connect().then(async (c) => {
      try {
        await c.query('BEGIN');
        await c.query(`SELECT set_config('app.pariwar_id', $1, true)`, [PARIWAR]);
        const r = await claim.beginContactLadderWhatsapp(c, {
          pariwarId: PARIWAR as never,
          claimCaseId: s.claimCaseId as never,
          ladderId,
          chase: 'correction',
          jobId: 'job-twin',
          now: new Date(),
          inWindow: true,
          nextWindowStart: istAt(day(s.day0, 11), '09:00'),
          config: { verdict: 'ok', templateName: TEMPLATE, locale: 'en' },
          finalAttempt: false,
          crypto: enc,
        });
        await c.query('COMMIT');
        if (r.kind !== 'begun') throw new Error(r.kind);
        return r.sendId;
      } finally {
        c.release();
      }
    });
    const mark = () =>
      withPariwarScope(pool, PARIWAR as never, (db) =>
        claim.markContactLadderWhatsappInFlight(db, { pariwarId: PARIWAR as never, sendId, jobId: 'job-twin', leaseMarginMs: 60_000, now: new Date() }),
      );
    const outcomes = (await Promise.all([mark(), mark()])).sort();
    expect(outcomes).toEqual(['lost', 'marked']);
    expect((await sendRowOf(ladderId))!.send_started_at).not.toBeNull();
  });

  it('⭐ P6 / P10 — the marker `lost` (another job re-took the row between the commit and the marker): a NON-final attempt retries with ⛔ request; on the FINAL attempt the child reports `noop` (⛔ an exhausted finish it never wrote) and the holder\'s row stands', async () => {
    const h = harness();
    const a = await dueStep(h);
    const ta = thief(a.ladderId);
    await expect(
      runContactLadderWhatsappChild({ ...h.wa, encryption: ta.enc }, boss(h), await dueChild(h, a.s), 'job-L', { retryCount: 0, retryLimit: 4 }),
    ).rejects.toBeInstanceOf(ClaimCorrectionTransientError);
    expect(ta.state.stolen).toBe(true);
    expect(await sendRowOf(a.ladderId)).toMatchObject({ send_outcome: 'attempting', send_started_at: null });
    const b = await dueStep(h);
    const tb = thief(b.ladderId);
    expect(await runContactLadderWhatsappChild({ ...h.wa, encryption: tb.enc }, boss(h), await dueChild(h, b.s), 'job-L2', { retryCount: 4, retryLimit: 4 })).toEqual({
      status: 'noop',
      reason: 'marker_lost',
    });
    expect(tb.state.stolen).toBe(true);
    expect(await sendRowOf(b.ladderId)).toMatchObject({ send_outcome: 'attempting', send_started_at: null }); // ⛔ finished by the loser
    expect(h.requests).toHaveLength(0);
  });

  it('⭐ P6 — AC5 (2)/(3): the number cannot be hashed (a KMS outage) — a NON-final attempt is a transient (the once-only step ⛔ spent); the FINAL attempt records `skipped:hash_unavailable` and raises `contact_ladder.hash_unavailable` (ids only); ⛔ request', async () => {
    const h = harness();
    const { s, ladderId } = await dueStep(h);
    const env = await dueChild(h, s);
    const down = { ...h.wa, encryption: hookedEnc({ beforeHmac: kmsDown, beforeDecrypt: kmsDown }) };
    await expect(runContactLadderWhatsappChild(down, boss(h), env, 'job-K', { retryCount: 0, retryLimit: 4 })).rejects.toBeInstanceOf(ClaimCorrectionTransientError);
    // ⛔ spent: the claimed row stays `attempting` with the transient noted (WS8 (iii)'s retry form), ⛔ finished.
    expect(await sendRowOf(ladderId)).toMatchObject({ send_outcome: 'attempting', send_started_at: null, detail: 'decrypt_failed:tier1' });
    const r = await runContactLadderWhatsappChild(down, boss(h), env, 'job-K', { retryCount: 4, retryLimit: 4 });
    // The begin does ⛔ hash here (a claimant-nominee whose version is unchanged), so the first decrypt after the commit fails:
    // the step stays `sent`, the ROW finishes `skipped:hash_unavailable`, first_detail the first transient.
    expect(r).toEqual({ status: 'skipped', reason: 'hash_unavailable', where: 'row' });
    expect((await ladderOf(s.claimCaseId))[0]!.whatsapp_step).toBe('sent');
    expect(await sendRowOf(ladderId)).toMatchObject({ send_outcome: 'skipped', detail: 'skipped:hash_unavailable', first_detail: 'decrypt_failed:tier1' });
    const alarm = h.alarms.find((m) => m.includes('contact_ladder.hash_unavailable'));
    expect(alarm).toBeDefined();
    expect(alarm!).toContain(ladderId);
    expect(h.requests).toHaveLength(0);
  });

  it('⭐ P6 — AC4: a deferral that is LOST (a child at 21:00 defers to 09:00; that job never runs) — the step is still `pending`, so the next in-window tick enqueues it again and it goes', async () => {
    const h = harness();
    const { s, ladderId } = await dueStep(h);
    h.setNow(istAt(day(s.day0, 10), '21:00'));
    const envelope = { pariwarId: s.pariwarId, requestId: 'r', actorId: null, traceId: 't', payload: { ladderId, claimCaseId: s.claimCaseId, chase: 'correction' as const } };
    expect((await runContactLadderWhatsappChild(h.wa, boss(h), envelope, 'job-night', { retryCount: 0, retryLimit: 4 })).status).toBe('deferred');
    expect(take(h, WA_SEND, s.claimCaseId)).toHaveLength(1); // the deferral — LOST (dropped, never run)
    expect((await ladderOf(s.claimCaseId))[0]!.whatsapp_step).toBe('pending');
    expect((await waTick(h, s, istAt(day(s.day0, 11), '09:15'))).results).toEqual([{ status: 'sent', outcome: 'accepted' }]);
  });

  it('⭐ P6 — AC4: a FINAL-attempt crash after the claim (no retry follows) — the row is re-taken by a NEW job once the lease lapses and sent', async () => {
    const h = harness();
    const { s, ladderId } = await dueStep(h);
    await pool.connect().then(async (c) => {
      try {
        await c.query('BEGIN');
        await c.query(`SELECT set_config('app.pariwar_id', $1, true)`, [PARIWAR]);
        await claim.beginContactLadderWhatsapp(c, {
          pariwarId: PARIWAR as never,
          claimCaseId: s.claimCaseId as never,
          ladderId,
          chase: 'correction',
          jobId: 'job-final-crashed',
          now: istAt(day(s.day0, 10), '14:30'),
          inWindow: true,
          nextWindowStart: istAt(day(s.day0, 11), '09:00'),
          config: { verdict: 'ok', templateName: TEMPLATE, locale: 'en' },
          finalAttempt: true,
          crypto: enc,
        });
        await c.query('COMMIT');
      } finally {
        c.release();
      }
    });
    expect((await sendRowOf(ladderId))!.send_outcome).toBe('attempting');
    const later = new Date(istAt(day(s.day0, 10), '14:30').getTime() + LEASE_MS + 60_000);
    expect((await waTick(h, s, later)).results).toEqual([{ status: 'sent', outcome: 'accepted' }]);
  });

  it('⭐ P14 — the SWEEP refuses (⛔ start, ⛔ child, one alarm): an RLS-bound pool; an EMPTY allowlist; an allowlist in production', async () => {
    const bound = new pg.Pool({ connectionString: `${DATABASE_URL!}${DATABASE_URL!.includes('?') ? '&' : '?'}options=-c%20role%3Dtwt_app`, max: 1, ssl: false });
    try {
      const h = harness();
      const r = await runContactLadderWhatsappSweep({ ...h.wa, pool: bound }, boss(h));
      expect(r).toMatchObject({ refused: true, started: 0, enqueued: 0 });
      expect(h.alarms.filter((a) => a.includes('contact_ladder.rls_bound_role'))).toHaveLength(1);
    } finally {
      await bound.end();
    }
    const empty = harness({ allowlist: [] });
    expect(await runContactLadderWhatsappSweep(empty.wa, boss(empty))).toMatchObject({ refused: true });
    expect(empty.alarms.filter((a) => a.includes('`pariwarAllowlist` is EMPTY'))).toHaveLength(1);
    const prod = harness();
    const was = process.env['NODE_ENV'];
    process.env['NODE_ENV'] = 'production';
    try {
      expect(await runContactLadderWhatsappSweep(prod.wa, boss(prod))).toMatchObject({ refused: true });
    } finally {
      if (was === undefined) delete process.env['NODE_ENV'];
      else process.env['NODE_ENV'] = was;
    }
    expect(prod.alarms.filter((a) => a.includes('while NODE_ENV is production'))).toHaveLength(1);
    expect([...empty.enqueued, ...prod.enqueued]).toEqual([]);
  });

  // ── The CERTIFICATE chase's remaining branches (P5 — R8's "prelock / source / pause", R2 on this chase, AC6 either chase) ──

  const certConfig = async (key: string) => {
    if (key.startsWith('sms.dlt.template_id.claim_correction.')) return '64b0c0ffee0123456789a0c1';
    if (key.startsWith('sms.claim_correction.helpline_number.')) return HELPLINE;
    if (key.startsWith('wa.template.claim_contact.correction_reminder.')) return TEMPLATE;
    if (key.startsWith('wa.template.claim_contact.certificate_reminder.')) return TEMPLATE;
    return null;
  };
  /** A certificate claim whose origin (cert day 10) was reported undelivered, its ladder started, and the step DUE (14:30). */
  async function certDue(h: Harness) {
    const w = await seedCertWait();
    h.setNow(new Date());
    await runCertificateReminderSweep(h.chase, boss(h));
    take(h, 'claim.certificate.family_sms', w.claimCaseId);
    const run = await pool.query<{ day0: string }>(
      `SELECT to_char(day0, 'YYYY-MM-DD') AS day0 FROM claim_certificate_reminder_runs WHERE claim_case_id = $1 AND ended_at IS NULL`,
      [w.claimCaseId],
    );
    const certDay0 = run.rows[0]!.day0;
    h.setNow(istAt(day(certDay0, 10), '10:00'));
    await runCertificateReminderSweep(h.chase, boss(h));
    for (const e of take(h, 'claim.certificate.family_sms', w.claimCaseId)) {
      await runCertificateFamilySmsChild(h.chase, e.data as JobEnvelope<CertificateFamilySmsPayload>, randomUUID());
    }
    const sent = await pool.query<{ reminder_id: string }>(
      `SELECT reminder_id FROM claim_certificate_reminders WHERE claim_case_id = $1 AND purpose = 'family_sms' AND outcome = 'accepted' AND sent_on = $2`,
      [w.claimCaseId, day(certDay0, 10)],
    );
    const origin = sent.rows[0]!.reminder_id;
    await reportCertUndelivered(origin, w.pariwarId);
    h.setNow(istAt(day(certDay0, 10), '10:15'));
    await runContactLadderWhatsappSweep(h.wa, boss(h));
    const [l] = await ladderOf(w.claimCaseId);
    await pool.query(`UPDATE claim_certificate_reminders SET created_at = clock_timestamp() - make_interval(hours => 5) WHERE reminder_id = $1`, [origin]);
    h.setNow(istAt(day(certDay0, 10), '14:30'));
    await runContactLadderWhatsappSweep(h.wa, boss(h));
    const [child] = take(h, WA_SEND, w.claimCaseId);
    return { w, certDay0, ladderId: l!.ladder_id, env: child!.data as JobEnvelope<ContactLadderWhatsappPayload> };
  }
  /** Review R2 — the claim's claimant moves onto the BLOCK (a real-ciphertext block, so the prelock can hash it). */
  async function certClaimantToBlock(cid: string) {
    await pool.query(
      `UPDATE claim_contacts SET claimant_nominee_version_id = NULL, claimant_name_ciphertext = $2, claimant_mobile_ciphertext = $3,
         claimant_address_ciphertext = $4 WHERE claim_case_id = $1`,
      [
        cid,
        await encryptField('Block Claimant', PARIWAR, 'claim_contact', enc),
        await encryptField('9811111111', PARIWAR, 'claim_contact', enc),
        await encryptField('House 2, Fixture Lane', PARIWAR, 'claim_contact', enc),
      ],
    );
  }

  it('⭐ P5 / AC6 — CERTIFICATE: a DELIVERED WhatsApp ends the certificate ladder `delivered:whatsapp` at the next 10:00 sweep (⛔ SMS 2)', async () => {
    const h = harness({ resolveConfig: certConfig });
    const c = await certDue(h);
    expect(await runContactLadderWhatsappChild(h.wa, boss(h), c.env, `job-${randomUUID()}`, { retryCount: 0, retryLimit: 4 })).toEqual({ status: 'sent', outcome: 'accepted' });
    const wamid = (await sendRowOf(c.ladderId))!.provider_message_id!;
    await pool.query(`INSERT INTO whatsapp_send_status (wamid, pariwar_id, state, meta_status) VALUES ($1, $2, 'delivered', 'delivered')`, [wamid, PARIWAR]);
    h.setNow(istAt(day(c.certDay0, 12), '10:00'));
    await runContactLadderSweep(h.wa, boss(h));
    expect(take(h, 'claim.certificate.ladder_sms', c.w.claimCaseId)).toHaveLength(0);
    const [l] = await ladderOf(c.w.claimCaseId);
    expect([l!.state, l!.end_detail]).toEqual(['ended_delivered', 'delivered:whatsapp']);
  });

  it('⭐ P5 / R2 — CERTIFICATE: the ladder\'s nominee is ⛔ the claimant any more (the claimant moved to the block) ⇒ `skipped:no_longer_claimant`, ⛔ request', async () => {
    const h = harness({ resolveConfig: certConfig });
    const c = await certDue(h);
    await certClaimantToBlock(c.w.claimCaseId);
    expect(await runContactLadderWhatsappChild(h.wa, boss(h), c.env, `job-${randomUUID()}`, { retryCount: 0, retryLimit: 4 })).toEqual({
      status: 'skipped',
      reason: 'no_longer_claimant',
      where: 'step',
    });
    expect(h.requests).toHaveLength(0);
  });

  it('⭐ P5 — CERTIFICATE: a PAUSED chase (the claim outside the review window) ⇒ `skipped:paused` (WS7), ⛔ request', async () => {
    const h = harness({ resolveConfig: certConfig });
    const c = await certDue(h);
    const cl = await pool.connect();
    try {
      await cl.query('BEGIN');
      await cl.query("SET LOCAL session_replication_role = 'replica'"); // the field the pause check reads (see the ladder suite's P15 note)
      await cl.query(`UPDATE claims SET current_state = 'documents_pending' WHERE claim_case_id = $1`, [c.w.claimCaseId]);
      await cl.query('COMMIT');
    } finally {
      cl.release();
    }
    expect(await runContactLadderWhatsappChild(h.wa, boss(h), c.env, `job-${randomUUID()}`, { retryCount: 0, retryLimit: 4 })).toMatchObject({
      status: 'skipped',
      reason: 'paused',
    });
    expect(h.requests).toHaveLength(0);
  });

  it('⭐ P5 — CERTIFICATE: the contact record MOVES between the pre-lock hashes and the lock (CR7) ⇒ a transient (⛔ write, ⛔ request); the pre-lock hash FAILS ⇒ a transient, and on the FINAL attempt `skipped:hash_unavailable` + the alarm', async () => {
    const h = harness({ resolveConfig: certConfig });
    const c = await certDue(h);
    let moved = false;
    const mover = hookedEnc({
      beforeHmac: async () => {
        if (moved) return;
        moved = true; // the prelock's FIRST hash — the record moves while the child is outside the lock
        await certClaimantToBlock(c.w.claimCaseId);
      },
    });
    await expect(
      runContactLadderWhatsappChild({ ...h.wa, encryption: mover }, boss(h), c.env, `job-${randomUUID()}`, { retryCount: 0, retryLimit: 4 }),
    ).rejects.toThrow(/the contact record moved/);
    expect(moved).toBe(true);
    expect(await sendRowOf(c.ladderId)).toBeNull();
    expect((await ladderOf(c.w.claimCaseId))[0]!.whatsapp_step).toBe('pending');

    const d = await certDue(h);
    const down = { ...h.wa, encryption: hookedEnc({ beforeHmac: kmsDown }) };
    await expect(runContactLadderWhatsappChild(down, boss(h), d.env, 'job-CK', { retryCount: 0, retryLimit: 4 })).rejects.toBeInstanceOf(ClaimCorrectionTransientError);
    expect(await runContactLadderWhatsappChild(down, boss(h), d.env, 'job-CK', { retryCount: 4, retryLimit: 4 })).toMatchObject({
      status: 'skipped',
      reason: 'hash_unavailable',
    });
    expect(h.alarms.some((m) => m.includes('contact_ladder.hash_unavailable') && m.includes(d.ladderId))).toBe(true);
    expect(h.requests).toHaveLength(0);
  });

  it('⭐ -370 d1 — the SEND CAP: two post-send 503s across TWO jobs (the second a re-take after the lease lapsed) ⇒ exactly TWO Meta calls and the row `may_have_sent:send_cap` — ⛔ a third, whichever job or day', async () => {
    const h = harness();
    const { s, ladderId } = await dueStep(h);
    const env = await dueChild(h, s);
    h.answer({ status: 503, body: { error: { code: 2 } } });
    await expect(runContactLadderWhatsappChild(h.wa, boss(h), env, 'job-C1', { retryCount: 0, retryLimit: 4 })).rejects.toBeInstanceOf(ClaimCorrectionTransientError);
    expect(await sendRowOf(ladderId)).toMatchObject({ send_outcome: 'attempting', send_started_at: null });
    // job-C1 never comes back; the lease lapses; the sweep's re-take hands the row to a NEW job (a fresh retry budget).
    const later = new Date(istAt(day(s.day0, 10), '14:30').getTime() + LEASE_MS + 60_000);
    const out = await waTick(h, s, later);
    expect(out.results).toEqual([{ status: 'sent', outcome: 'may_have_sent' }]);
    expect(await sendRowOf(ladderId)).toMatchObject({ send_outcome: 'may_have_sent', detail: 'may_have_sent:send_cap' });
    expect((await pool.query<{ send_count: number }>(`SELECT send_count FROM claim_contact_wa_sends WHERE ladder_id = $1`, [ladderId])).rows[0]!.send_count).toBe(2);
    expect(h.requests).toHaveLength(2);
    // ⛔ a third: the row is finished — a later tick lists nothing for it.
    expect((await waTick(h, s, new Date(later.getTime() + LEASE_MS + 60_000))).results).toEqual([]);
    expect(h.requests).toHaveLength(2);
  });

  it('⭐ -370 fix-diff — a row whose sends are SPENT while unmarked (a 20:00 release kept the count): the marker answers `capped` and the child finishes it `may_have_sent:send_cap` at once — ⛔ a call, ⛔ burnt retries', async () => {
    const h = harness();
    const { s, ladderId } = await dueStep(h);
    const env = await dueChild(h, s);
    h.answer({ status: 503, body: { error: { code: 2 } } });
    await expect(runContactLadderWhatsappChild(h.wa, boss(h), env, 'job-R', { retryCount: 0, retryLimit: 4 })).rejects.toBeInstanceOf(ClaimCorrectionTransientError);
    // A second mark released at 20:00 (⛔ a call) — the count it kept, as the release leaves it.
    await pool.query(`UPDATE claim_contact_wa_sends SET send_count = 2 WHERE ladder_id = $1`, [ladderId]);
    expect(await runContactLadderWhatsappChild(h.wa, boss(h), env, 'job-R', { retryCount: 1, retryLimit: 4 })).toEqual({ status: 'sent', outcome: 'may_have_sent' });
    expect(await sendRowOf(ladderId)).toMatchObject({ send_outcome: 'may_have_sent', detail: 'may_have_sent:send_cap' });
    expect(h.requests).toHaveLength(1);
  });

  it('⭐ -370 fix-diff — a new undelivered report for a person whose ladder is ALREADY running is ⛔ re-planned by the 8-hour scan', async () => {
    const h = harness({ allowlist: [BURST_PARIWAR] });
    const { s } = await dueStep(h, { pariwarId: BURST_PARIWAR });
    const [second] = await chaseDay(h, s, 14);
    await reportUndelivered(second!, BURST_PARIWAR);
    h.setNow(istAt(day(s.day0, 14), '10:30'));
    const out = await runContactLadderWhatsappSweep(h.wa, boss(h));
    expect(out.startClaims).toBe(0);
    expect(await ladderOf(s.claimCaseId)).toHaveLength(1);
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
    expect(h.alarms.length).toBeGreaterThan(0);
    for (const a of h.alarms) {
      // Round 2 (P8) — the alarm's ids are random UUIDs, whose 12-hex group can hold ten digits in a row (~2.7 % each):
      // strip them first, then ⛔ a ten-digit run (a mobile) may remain.
      expect(a.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<id>')).not.toMatch(/\d{10}/);
      expect(a).not.toContain(HELPLINE);
    }
  });
});
