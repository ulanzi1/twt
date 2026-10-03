// The REPLACEMENT-CERTIFICATE reminder — the sweep and the family-SMS child against the live DB (Story 6.19d; AC1–AC3,
// AC5, AC8; `2026-10-03-276` CR2–CR10). Own-committing (the sweep reads COMMITTED rows across tenants), an INJECTED
// clock, a fake SMS gateway and a capturing queue. ⭐ ISOLATED: every sweep runs with `pariwarAllowlist` = this suite's
// own random Pariwars. ⭐ REAL envelopes (6.19b slice trap S5): the nominee mobiles are encrypted under the SAME fake-KMS
// deps the child decrypts with. Assertions key on OUR claim ids (membership, ⛔ never counts of the shared tables).

import { randomUUID } from 'node:crypto';

import { SmsSendError, type SmsAppClient, type SmsGatewayMessage } from '@twt/channels';
import { bindScopedDb, claim, cycleCalendar, encryption, ids, nominee, schema } from '@twt/domain';
import type { JobEnvelope } from '@twt/queue';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildJobsEncryptionDeps } from '../src/deps.js';
import {
  runCertificateFamilySmsChild,
  runCertificateReminderSweep,
  type CertificateFamilySmsPayload,
  type ClaimCertificateReminderDeps,
} from '../src/scheduler/claim-certificate-reminders.js';
import { ClaimCorrectionTransientError } from '../src/scheduler/claim-correction-reminders.js';
import { cleanupClaims, encryptField, onOwnTx } from './_claim-correction-seed.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);
const PARIWAR = randomUUID();
const HELPLINE = '+911800123456';
const enc = buildJobsEncryptionDeps('claim-certificate-live-pepper');
/** The SAME deps with the HMAC failing (a KMS blip on every number hash). */
const hmacDown: encryption.FieldCryptoDeps = {
  kekRef: enc.kekRef,
  hmacKeyRef: enc.hmacKeyRef,
  kms: {
    encryptDek: (dek, kekRef, aad) => enc.kms.encryptDek(dek, kekRef, aad),
    decryptDek: (dek, kekRef, aad) => enc.kms.decryptDek(dek, kekRef, aad),
    computeHmac: () => Promise.reject(new Error('kms hmac unavailable')),
  },
};
const tenAmIst = (date: string) => new Date(Date.parse(`${date}T10:00:00+05:30`));
const day = (d0: string, n: number) => cycleCalendar.addCalendarDays(d0, n);

describe.skipIf(!hasDatabase)('Story 6.19d — the certificate reminder (live DB, own-committing)', { timeout: 60000 }, () => {
  let pool: pg.Pool;
  const claims: string[] = [];
  const members: string[] = [];

  beforeAll(() => {
    pool = new pg.Pool({ connectionString: DATABASE_URL, max: 8, ssl: false, connectionTimeoutMillis: 5000 });
    pool.on('error', (err) => console.error('[claim-certificate-reminders-live] idle client error:', err.message));
  });
  afterAll(async () => {
    try {
      await cleanupClaims(pool, claims, members);
    } finally {
      await pool.end();
    }
  });

  /**
   * A claim being CHECKED (through the projector), N nominees with REAL mobile envelopes, a contact record on the
   * PROJECTED versions (⛔ no determination — the certificate wait is undetermined), and — unless `missing` — a REJECTED
   * certificate through the real review writer.
   */
  async function seedWait(opts: { readonly mobiles?: readonly string[]; readonly missing?: boolean; readonly locale?: 'hi' | 'en' } = {}) {
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
    const versionIds = await onOwnTx(pool, PARIWAR, async (client) => {
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
          consentPayload: { checkboxTextShown: 'fixture', locale: 'en' },
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
          contactLocale: opts.locale ?? 'hi',
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
      return versions;
    });
    return { cid: cid as string, mid: mid as string, versionIds };
  }

  interface Harness {
    deps: ClaimCertificateReminderDeps;
    enqueued: { queue: string; data: JobEnvelope<unknown> }[];
    sent: SmsGatewayMessage[];
    alarms: string[];
    setNow: (d: Date) => void;
  }
  function harness(o: { gateway?: (m: SmsGatewayMessage) => Promise<string>; config?: Record<string, string | null>; encryption?: encryption.FieldCryptoDeps } = {}): Harness {
    const enqueued: Harness['enqueued'] = [];
    const sent: SmsGatewayMessage[] = [];
    const alarms: string[] = [];
    let now = new Date();
    const smsAppClient: SmsAppClient = {
      isConfigured: () => true,
      messaging: () => ({
        send: (m) => {
          sent.push(m);
          return (o.gateway ?? (() => Promise.resolve(`gw-${randomUUID()}`)))(m);
        },
      }),
    };
    const deps: ClaimCertificateReminderDeps = {
      pool,
      encryption: o.encryption ?? enc,
      smsAppClient,
      resolveConfig: async (key) => {
        if (o.config && key in o.config) return o.config[key]!;
        if (key.startsWith('sms.dlt.template_id.claim_correction.')) return 'TPL-CERT';
        if (key === `sms.claim_correction.helpline_number.${PARIWAR}`) return HELPLINE;
        return null;
      },
      now: () => now,
      onAlarm: (m) => alarms.push(m),
      pariwarAllowlist: [PARIWAR],
    };
    return { deps, enqueued, sent, alarms, setNow: (d) => (now = d) };
  }
  const boss = (h: Harness) =>
    ({
      send: (queue: string, data: object) => {
        h.enqueued.push({ queue, data: data as JobEnvelope<unknown> });
        return Promise.resolve(randomUUID());
      },
    }) as unknown as Parameters<typeof runCertificateReminderSweep>[1];
  const smsFor = (h: Harness, cid: string) =>
    h.enqueued.filter((e) => e.queue === 'claim.certificate.family_sms' && (e.data.payload as CertificateFamilySmsPayload).claimCaseId === cid);
  const child = (h: Harness, e: Harness['enqueued'][number], jobId: string = randomUUID(), attempt?: { retryCount: number; retryLimit: number }) =>
    runCertificateFamilySmsChild(h.deps, e.data as JobEnvelope<CertificateFamilySmsPayload>, jobId, attempt);
  async function runsOf(cid: string) {
    const { rows } = await pool.query<{ run_id: string; cause: string; end_reason: string | null; day0: string }>(
      "SELECT run_id, cause, end_reason, to_char(day0, 'YYYY-MM-DD') AS day0 FROM claim_certificate_reminder_runs WHERE claim_case_id = $1 ORDER BY opened_at",
      [cid],
    );
    return rows;
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
      recipient_number_hash: string | null;
      delivered_at: Date | null;
    }>('SELECT * FROM claim_certificate_reminders WHERE claim_case_id = $1 ORDER BY slot_day, purpose, recipient_key', [cid]);
    return rows;
  }
  const todayIst = () => cycleCalendar.istDateOf(new Date());

  it('⭐ a rejected certificate: the sweep OPENS the run and enqueues day 1 the NEXT MORNING to each person on the contact record; the child sends the certificate text (ids-only payload, ⛔ no name)', async () => {
    const s = await seedWait({ mobiles: ['9812345678', '9898989898'], locale: 'en' });
    const d0 = todayIst();
    const h = harness();
    h.setNow(tenAmIst(day(d0, 1)));
    await runCertificateReminderSweep(h.deps, boss(h));
    const runs = await runsOf(s.cid);
    expect(runs).toEqual([expect.objectContaining({ cause: 'rejected', end_reason: null, day0: d0 })]);
    const jobs = smsFor(h, s.cid);
    expect(jobs).toHaveLength(2);
    for (const j of jobs) {
      expect(Object.keys(j.data.payload as object).sort()).toEqual(['claimCaseId', 'late', 'personKey', 'runId', 'sentOn', 'slotDay']);
      expect(j.data.payload).toMatchObject({ slotDay: 1, late: false, sentOn: day(d0, 1) });
      expect(JSON.stringify(j.data)).not.toMatch(/98[0-9]{8}/);
    }
    for (const j of jobs) expect(await child(h, j)).toEqual({ status: 'sent', outcome: 'accepted' });
    expect(h.sent).toHaveLength(2);
    const ref = claim.claimShortReference(s.cid);
    for (const m of h.sent) {
      expect(m.dltTemplateId).toBe('TPL-CERT');
      expect(m.body).toBe(
        `Claim ${ref}: your family's claim still needs a death certificate that clearly shows the date of death. Please send it in the app, or call the helpline on ${HELPLINE}. Your claim is still open.`,
      );
      expect(m.body).not.toContain('Nominee');
    }
    const rows = await rowsOf(s.cid);
    expect(rows.every((r) => r.outcome === 'accepted' && r.recipient_number_hash !== null && r.delivered_at === null)).toBe(true);
  });

  it('⭐ CR6 — ONE text per NUMBER per slot: two persons at the SAME number ⇒ the LOWER key sends, the other `same_number_in_slot`', async () => {
    const s = await seedWait({ mobiles: ['9811111111', '9811111111'] });
    const h = harness();
    h.setNow(tenAmIst(day(todayIst(), 1)));
    await runCertificateReminderSweep(h.deps, boss(h));
    const jobs = smsFor(h, s.cid).sort((a, b) =>
      (a.data.payload as CertificateFamilySmsPayload).personKey < (b.data.payload as CertificateFamilySmsPayload).personKey ? 1 : -1,
    );
    // The HIGHER key's child runs FIRST — the lower key still wins (⛔ never "whoever runs first").
    expect(await child(h, jobs[0]!)).toEqual({ status: 'skipped', reason: 'same_number_in_slot' });
    expect(await child(h, jobs[1]!)).toEqual({ status: 'sent', outcome: 'accepted' });
    expect(h.sent).toHaveLength(1);
  });

  it('⭐ `missing` — ⛔ no certificate once checking started: a `missing` run, day 0 = the window-entry date', async () => {
    const s = await seedWait({ missing: true });
    const h = harness();
    h.setNow(tenAmIst(day(todayIst(), 1)));
    await runCertificateReminderSweep(h.deps, boss(h));
    expect(await runsOf(s.cid)).toEqual([expect.objectContaining({ cause: 'missing', end_reason: null, day0: todayIst() })]);
    expect(smsFor(h, s.cid)).toHaveLength(1);
  });

  it('⭐ the catch-up — a run first swept on day 10: day 10 sent once (⛔ no burst), days 1–7 written `skipped_superseded`', async () => {
    const s = await seedWait();
    const h = harness();
    h.setNow(tenAmIst(day(todayIst(), 11)));
    await runCertificateReminderSweep(h.deps, boss(h));
    const jobs = smsFor(h, s.cid);
    expect(jobs.map((j) => (j.data.payload as CertificateFamilySmsPayload).slotDay)).toEqual([10]);
    expect((jobs[0]!.data.payload as CertificateFamilySmsPayload).late).toBe(true);
    const skipped = (await rowsOf(s.cid)).filter((r) => r.outcome === 'skipped_superseded').map((r) => r.slot_day);
    expect(skipped).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('⭐ the horizon — day 180 is SENT on day 180; on day 181 the run ends `completed` with ⛔ no send (`> 180`)', async () => {
    const s = await seedWait();
    const d0 = todayIst();
    const h = harness();
    h.setNow(tenAmIst(day(d0, 180)));
    await runCertificateReminderSweep(h.deps, boss(h));
    expect(smsFor(h, s.cid).map((j) => (j.data.payload as CertificateFamilySmsPayload).slotDay)).toEqual([180]);
    const h2 = harness();
    h2.setNow(tenAmIst(day(d0, 181)));
    await runCertificateReminderSweep(h2.deps, boss(h2));
    expect(smsFor(h2, s.cid)).toEqual([]);
    expect((await runsOf(s.cid))[0]!.end_reason).toBe('completed');
  });

  it('⭐ a dead number ⇒ `rejected_invalid_number`; at found-dead + 7 the District Admin\'s chase is RECORDED (⛔ no push); on + 13 the escalation RECORD', async () => {
    const s = await seedWait();
    const d0 = todayIst();
    const h = harness({ gateway: () => Promise.reject(new SmsSendError('x', 'INVALID_NUMBER', 400)) });
    h.setNow(tenAmIst(day(d0, 1)));
    await runCertificateReminderSweep(h.deps, boss(h));
    for (const j of smsFor(h, s.cid)) expect(await child(h, j)).toEqual({ status: 'sent', outcome: 'rejected_invalid_number' });
    h.setNow(tenAmIst(day(d0, 8)));
    await runCertificateReminderSweep(h.deps, boss(h));
    const chase = (await rowsOf(s.cid)).filter((r) => r.purpose === 'letter_chase');
    // ⛔ No live shepherd in this fixture ⇒ `staff:unassigned`, `no_target` + an alarm.
    expect(chase).toEqual([expect.objectContaining({ recipient_key: 'staff:unassigned', outcome: 'no_target', subject_key: expect.stringMatching(/^nominee:/) })]);
    h.setNow(tenAmIst(day(d0, 14)));
    await runCertificateReminderSweep(h.deps, boss(h));
    const esc = (await rowsOf(s.cid)).filter((r) => r.purpose === 'letter_escalation');
    expect(esc.length).toBeGreaterThanOrEqual(1);
    expect(h.enqueued.every((e) => e.queue === 'claim.certificate.family_sms')).toBe(true); // ⛔ no staff push
  });

  it('⭐ a delivered letter stops the SMS to that number — the sweep plans ⛔ no further text', async () => {
    const s = await seedWait();
    const d0 = todayIst();
    const h = harness({ gateway: () => Promise.reject(new SmsSendError('x', 'INVALID_NUMBER', 400)) });
    h.setNow(tenAmIst(day(d0, 1)));
    await runCertificateReminderSweep(h.deps, boss(h));
    const [first] = smsFor(h, s.cid);
    await child(h, first!);
    const personKey = (first!.data.payload as CertificateFamilySmsPayload).personKey;
    const runId = (first!.data.payload as CertificateFamilySmsPayload).runId;
    await pool.query(
      `INSERT INTO claim_certificate_reminder_letters (run_id, claim_case_id, pariwar_id, person_key, posted_on, tracking_number_ciphertext,
         recorded_by_actor, recorded_by_display, delivered_on, screenshot_storage_key, screenshot_content_type, screenshot_size_bytes,
         delivery_recorded_by_actor, delivery_recorded_by_display, delivery_recorded_at)
       VALUES ($1, $2, $3, $4, $5, 'enc:v1:t', 'da', 'D', $5, 'k', 'image/png', 1, 'da', 'D', now())`,
      [runId, s.cid, PARIWAR, personKey, day(d0, 2)],
    );
    const h2 = harness();
    h2.setNow(tenAmIst(day(d0, 3)));
    await runCertificateReminderSweep(h2.deps, boss(h2));
    expect(smsFor(h2, s.cid)).toEqual([]);
  });

  it('⛔ fail CLOSED — a missing DLT template id ⇒ `error` + alarm, ⛔ never a fixture `accepted`', async () => {
    const s = await seedWait();
    const h = harness({ config: { 'sms.dlt.template_id.claim_correction.certificate_reminder.hi': null } });
    h.setNow(tenAmIst(day(todayIst(), 1)));
    await runCertificateReminderSweep(h.deps, boss(h));
    const [job] = smsFor(h, s.cid);
    expect(await child(h, job!)).toEqual({ status: 'sent', outcome: 'error' });
    expect(h.sent).toEqual([]);
    expect(h.alarms.some((a) => a.includes('config:dlt_template_id_missing'))).toBe(true);
    expect((await rowsOf(s.cid)).find((r) => r.purpose === 'family_sms')).toMatchObject({ outcome: 'error', detail: 'config:dlt_template_id_missing' });
  });

  it('⭐ CR8 — a KMS failure fails CLOSED: retried (transient), and on the FINAL attempt a RECORDED `error` (`exhausted:hash_failed`, NULL hash) that is ⛔ never caught up', async () => {
    const s = await seedWait();
    const d0 = todayIst();
    const ok = harness();
    ok.setNow(tenAmIst(day(d0, 1)));
    await runCertificateReminderSweep(ok.deps, boss(ok));
    const [job] = smsFor(ok, s.cid);
    const down = harness({ encryption: hmacDown });
    down.setNow(tenAmIst(day(d0, 1)));
    await expect(child(down, job!, 'job-1', { retryCount: 0, retryLimit: 4 })).rejects.toBeInstanceOf(ClaimCorrectionTransientError);
    expect(await child(down, job!, 'job-1', { retryCount: 4, retryLimit: 4 })).toEqual({ status: 'noop', reason: 'hash_failed' });
    expect((await rowsOf(s.cid)).filter((r) => r.purpose === 'family_sms')).toEqual([
      expect.objectContaining({ slot_day: 1, outcome: 'error', detail: 'exhausted:hash_failed', recipient_number_hash: null }),
    ]);
    // ⛔ Never caught up `late` the next morning: day 2 is planned, day 1 is a recorded day.
    const next = harness();
    next.setNow(tenAmIst(day(d0, 2)));
    await runCertificateReminderSweep(next.deps, boss(next));
    expect(smsFor(next, s.cid).map((j) => (j.data.payload as CertificateFamilySmsPayload).slotDay)).toEqual([2]);
  });

  it('⭐ a child redelivered after IST midnight ⛔ never sends yesterday\'s slot today', async () => {
    const s = await seedWait();
    const d0 = todayIst();
    const h = harness();
    h.setNow(tenAmIst(day(d0, 1)));
    await runCertificateReminderSweep(h.deps, boss(h));
    const [job] = smsFor(h, s.cid);
    h.setNow(tenAmIst(day(d0, 2)));
    expect(await child(h, job!)).toEqual({ status: 'skipped', reason: 'stale_slot' });
    expect(h.sent).toEqual([]);
  });
});
