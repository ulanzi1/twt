// The DELIVERY LADDER end to end — the sweep and the two ladder-SMS children against the live DB (Story 6.37c; AC1–AC3,
// AC6, AC10, AC11; `2026-10-17-350` rulings 1–2, `-351` 4 A / 5 A / 6 A; LD3–LD9, LD13). Own-committing (the sweep reads
// COMMITTED rows across tenants), an INJECTED clock, a fake SMS gateway and a capturing queue. ⭐ ISOLATED: every sweep
// runs with `pariwarAllowlist` = this suite's own random Pariwars. The chases' REAL sweeps and children send the
// origin reminders (real envelopes, real number hashes); 6.37b's record is written by its own `upsertSmsSendDelivery`.
// Assertions key on OUR claim ids. ⛔ Network (I9 — the gateway is a fake; a global-fetch recorder stays at ZERO).

import { randomUUID } from 'node:crypto';

import { SmsSendError, type SmsAppClient, type SmsGatewayMessage } from '@twt/channels';
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
  runCertificateLadderSmsChild,
  runContactLadderSweep,
  runCorrectionLadderSmsChild,
  type ContactLadderDeps,
  type LadderSmsPayload,
} from '../src/scheduler/claim-contact-ladder.js';
import {
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
/** A Pariwar of its own for the burst leg (three ladders in one day). */
const BURST_PARIWAR = randomUUID();
const HELPLINE = '1800123456';
const enc = buildJobsEncryptionDeps('claim-contact-ladder-live-pepper');
const tenAmIst = (date: string) => new Date(Date.parse(`${date}T10:00:00+05:30`));
const day = (d0: string, n: number) => cycleCalendar.addCalendarDays(d0, n);

describe.skipIf(!hasDatabase)('Story 6.37c — the delivery ladder (live DB, own-committing)', { timeout: 120000 }, () => {
  let pool: pg.Pool;
  const claims: string[] = [];
  const members: string[] = [];
  const staffUsers: string[] = [];
  const fetchSpy = vi.spyOn(globalThis, 'fetch');

  beforeAll(() => {
    pool = new pg.Pool({ connectionString: DATABASE_URL, max: 8, ssl: false, connectionTimeoutMillis: 5000 });
    pool.on('error', (err) => console.error('[claim-contact-ladder-live] idle client error:', err.message));
  });
  afterAll(async () => {
    // ⭐ I9 — ⛔ a network call across the whole suite (MSG91 / Meta are never touched).
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
    try {
      await pool.query('DELETE FROM sms_send_deliveries WHERE pariwar_id = ANY($1::uuid[])', [[PARIWAR, BURST_PARIWAR]]);
      await cleanupClaims(pool, claims, members, { userIds: staffUsers });
    } finally {
      await pool.end();
    }
  });

  // ── Harness ─────────────────────────────────────────────────────────────────────────────────────────────────
  interface Harness {
    readonly chase: ClaimCorrectionReminderDeps;
    readonly ladder: ContactLadderDeps;
    readonly enqueued: { queue: string; data: JobEnvelope<unknown> }[];
    readonly sent: SmsGatewayMessage[];
    readonly alarms: string[];
    setNow(d: Date): void;
  }
  function harness(
    o: {
      readonly nomineeCallsCleared?: boolean;
      readonly allowlist?: readonly string[];
      readonly pool?: pg.Pool;
      readonly gateway?: (m: SmsGatewayMessage) => Promise<string>;
    } = {},
  ): Harness {
    const enqueued: Harness['enqueued'] = [];
    const sent: SmsGatewayMessage[] = [];
    const alarms: string[] = [];
    let now = new Date();
    const smsAppClient: SmsAppClient = {
      isConfigured: () => true,
      messaging: () => ({
        send: (m) => {
          sent.push(m);
          return o.gateway ? o.gateway(m) : Promise.resolve(`gw${randomUUID().replace(/-/g, '')}`);
        },
      }),
    };
    const base = {
      pool: o.pool ?? pool,
      encryption: enc,
      smsAppClient,
      resolveConfig: async (key: string) => {
        if (key.startsWith('sms.dlt.template_id.claim_correction.')) return '64b0c0ffee0123456789a0c1';
        if (key.startsWith('sms.claim_correction.helpline_number.')) return HELPLINE;
        return null;
      },
      now: () => now,
      onAlarm: (m: string) => alarms.push(m),
      pariwarAllowlist: o.allowlist ?? [PARIWAR],
    };
    const chase: ClaimCorrectionReminderDeps = {
      ...base,
      push: { audit: () => Promise.resolve(), hashRendered: () => Promise.resolve('a'.repeat(64)) },
    };
    return {
      chase,
      ladder: { ...base, nomineeCallsCleared: o.nomineeCallsCleared ?? false },
      enqueued,
      sent,
      alarms,
      setNow: (d) => (now = d),
    };
  }
  const boss = (h: Harness) =>
    ({
      send: (queue: string, data: object) => {
        h.enqueued.push({ queue, data: data as JobEnvelope<unknown> });
        return Promise.resolve(randomUUID());
      },
    }) as unknown as Parameters<typeof runContactLadderSweep>[1];
  const take = (h: Harness, queue: string, cid: string) => {
    const mine = h.enqueued.filter((e) => e.queue === queue && (e.data.payload as { claimCaseId: string }).claimCaseId === cid);
    h.enqueued.splice(0, h.enqueued.length, ...h.enqueued.filter((e) => !mine.includes(e)));
    return mine;
  };

  async function seed(opts: SeedReturnedClaimOptions & { pariwarId?: string } = {}) {
    const s = await seedReturnedClaim(pool, opts.pariwarId ?? PARIWAR, enc, opts);
    claims.push(s.claimCaseId);
    members.push(s.deceasedMemberId);
    const { rows } = await pool.query<{ day0: string }>(`SELECT to_char(day0, 'YYYY-MM-DD') AS day0 FROM claim_correction_runs WHERE run_id = $1`, [s.runId]);
    return { ...s, day0: rows[0]!.day0, pariwarId: opts.pariwarId ?? PARIWAR };
  }
  type Seeded = Awaited<ReturnType<typeof seed>>;

  /** The CORRECTION chase's own day: its sweep at 10:00, then every family SMS child it enqueued for this claim. */
  async function chaseDay(h: Harness, s: Seeded, n: number): Promise<string[]> {
    h.setNow(tenAmIst(day(s.day0, n)));
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
  /** The LADDER's day: its sweep at 10:00, then every ladder SMS child it enqueued for this claim. */
  async function ladderDay(h: Harness, cid: string, date: string, chase: 'correction' | 'certificate' = 'correction') {
    h.setNow(tenAmIst(date));
    const out = await runContactLadderSweep(h.ladder, boss(h));
    const results = [];
    for (const e of take(h, `claim.${chase}.ladder_sms`, cid)) {
      const run = chase === 'correction' ? runCorrectionLadderSmsChild : runCertificateLadderSmsChild;
      results.push(await run(h.ladder, e.data as JobEnvelope<LadderSmsPayload>, randomUUID()));
    }
    return { out, results };
  }
  /** 6.37b's record for a send, through its OWN upsert (the correlator's DR6 row 8). */
  async function reportOn(kind: 'cr' | 'ce', rowId: string, state: 'delivered' | 'undelivered', pariwarId = PARIWAR) {
    const table = kind === 'cr' ? 'claim_correction_reminders' : 'claim_certificate_reminders';
    const { rows } = await pool.query<{ provider_message_id: string }>(`SELECT provider_message_id FROM ${table} WHERE reminder_id = $1`, [rowId]);
    await smsDelivery.upsertSmsSendDelivery(pool, {
      pariwarId,
      kind,
      rowId,
      requestId: rows[0]!.provider_message_id,
      state,
      statusCode: state === 'delivered' ? '1' : '2',
      failureReason: null,
      receivedAt: new Date(),
    });
  }
  async function laddersOf(cid: string) {
    const { rows } = await pool.query<{
      ladder_id: string;
      chase: string;
      run_id: string;
      person_key: string;
      origin_row_id: string;
      origin_sent_on: string;
      whatsapp_step: string;
      sms2_due_on: string;
      sms2_state: string;
      sms2_row_id: string | null;
      sms3_due_on: string | null;
      sms3_state: string;
      sms3_row_id: string | null;
      conclude_on: string | null;
      state: string;
      end_detail: string | null;
      concluded_on: string | null;
      escalated_on: string | null;
    }>(
      `SELECT ladder_id, chase, run_id, person_key, origin_row_id, to_char(origin_sent_on, 'YYYY-MM-DD') AS origin_sent_on, whatsapp_step,
              to_char(sms2_due_on, 'YYYY-MM-DD') AS sms2_due_on, sms2_state, sms2_row_id, to_char(sms3_due_on, 'YYYY-MM-DD') AS sms3_due_on,
              sms3_state, sms3_row_id, to_char(conclude_on, 'YYYY-MM-DD') AS conclude_on, state, end_detail,
              to_char(concluded_on, 'YYYY-MM-DD') AS concluded_on, to_char(escalated_on, 'YYYY-MM-DD') AS escalated_on
         FROM claim_contact_ladders WHERE claim_case_id = $1 ORDER BY created_at`,
      [cid],
    );
    return rows;
  }
  async function correctionRows(cid: string, purpose: string) {
    const { rows } = await pool.query<{ reminder_id: string; outcome: string; subject_key: string; sent_on: string; recipient_key: string; detail: string | null; run_id: string }>(
      `SELECT reminder_id, outcome, subject_key, to_char(sent_on, 'YYYY-MM-DD') AS sent_on, recipient_key, detail, run_id
         FROM claim_correction_reminders WHERE claim_case_id = $1 AND purpose = $2 ORDER BY created_at`,
      [cid, purpose],
    );
    return rows;
  }
  async function staffUser(displayName: string): Promise<string> {
    const id = randomUUID();
    await pool.query(`INSERT INTO users (id, identity_type, status, display_name) VALUES ($1, 'admin', 'active', $2)`, [id, displayName]);
    staffUsers.push(id);
    return id;
  }
  async function assignShepherd(claimCaseId: string, pariwarId: string, userId: string): Promise<void> {
    await pool.query(
      `INSERT INTO claim_shepherd_assignments (claim_case_id, pariwar_id, shepherd_actor_id, shepherd_display, assignment_reason)
       VALUES ($1, $2, $3, 'Test District Admin', 'initial')`,
      [claimCaseId, pariwarId, userId],
    );
  }
  async function recordCall(cid: string, personKey: string, calledOn: string, chase: 'correction' | 'certificate' = 'correction') {
    await pool.query(
      `INSERT INTO claim_contact_calls (pariwar_id, claim_case_id, person_key, chase, called_on, answered_by, outcome, recorded_by_actor, recorded_by_display)
       VALUES ($1, $2, $3, $4, $5, 'family_member', 'reached', 'da', 'District Admin')`,
      [PARIWAR, cid, personKey, chase, calledOn],
    );
  }
  const personOf = async (cid: string) =>
    withPariwarScope(pool, PARIWAR, async (db) => (await claim.readCorrectionRecipients(db, ids.pariwarId(PARIWAR), ids.claimId(cid))).people[0]!);

  /** A claim being CHECKED with a certificate wait (6.19d's own fixture, copied — its suite's closures). */
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

  // ── AC1 / AC2 / AC4 / AC6 — the correction ladder, end to end ───────────────────────────────────────────────

  it('⭐ a reminder REPORTED undelivered starts ONE ladder; SMS 2 is the chase\'s OWN reminder sent again (CRQID `cr` + its row); SMS 3 on a scheduled day is `satisfied`; it CONCLUDES on D + 8 with ONE ask; then the B1 mapping', async () => {
    const s = await seed();
    const da = await staffUser('District Admin Ladder');
    await assignShepherd(s.claimCaseId, PARIWAR, da);
    const h = harness();
    const [origin] = await chaseDay(h, s, 10);
    expect(origin).toBeDefined();
    // ⛔ report ⇒ ⛔ ladder (`-351` 1 A).
    await ladderDay(h, s.claimCaseId, day(s.day0, 11));
    expect(await laddersOf(s.claimCaseId)).toEqual([]);
    await reportOn('cr', origin!, 'undelivered');
    await ladderDay(h, s.claimCaseId, day(s.day0, 11));
    const [l] = await laddersOf(s.claimCaseId);
    expect(l).toMatchObject({
      chase: 'correction',
      origin_row_id: origin,
      origin_sent_on: day(s.day0, 10),
      sms2_due_on: day(s.day0, 12),
      whatsapp_step: 'skipped:nominee_no_whatsapp',
      state: 'running',
    });
    // A second tick on the same day starts ⛔ second ladder (the partial UNIQUE + the origin UNIQUE).
    await ladderDay(h, s.claimCaseId, day(s.day0, 11));
    expect(await laddersOf(s.claimCaseId)).toHaveLength(1);

    // Day 12 — ⛔ scheduled ⇒ SMS 2 is SENT, as a `ladder_sms` row with the chase's reminder template.
    h.sent.length = 0;
    const d12 = await ladderDay(h, s.claimCaseId, day(s.day0, 12));
    expect(d12.results).toEqual([{ status: 'sent', outcome: 'accepted' }]);
    const sms = await correctionRows(s.claimCaseId, 'ladder_sms');
    expect(sms).toHaveLength(1);
    expect(sms[0]).toMatchObject({ outcome: 'accepted', subject_key: `ladder:${l!.ladder_id}:2`, sent_on: day(s.day0, 12) });
    expect(h.sent).toHaveLength(1);
    expect(h.sent[0]!.correlationId).toBe(`cr${sms[0]!.reminder_id.replace(/-/g, '')}`);
    expect(h.sent[0]!.templateId).toBe('64b0c0ffee0123456789a0c1');
    expect((await laddersOf(s.claimCaseId))[0]).toMatchObject({ sms2_state: 'sent', sms2_row_id: sms[0]!.reminder_id, sms3_due_on: day(s.day0, 14) });

    // Day 14 — a SCHEDULED reminder day: the chase's own text IS the step (⛔ a second text) — `satisfied`.
    const [r14] = await chaseDay(h, s, 14);
    const d14 = await ladderDay(h, s.claimCaseId, day(s.day0, 14));
    expect(d14.results).toEqual([]);
    expect((await laddersOf(s.claimCaseId))[0]).toMatchObject({ sms3_state: 'satisfied', sms3_row_id: null, conclude_on: day(s.day0, 18) });
    // Day 15 — the next visit records the row that carried it.
    await ladderDay(h, s.claimCaseId, day(s.day0, 15));
    expect((await laddersOf(s.claimCaseId))[0]!.sms3_row_id).toBe(r14);

    // Day 18 — ⛔ end ⇒ CONCLUDED undelivered, ONE ask to the District Admin (a nominee before G1 ⇒ "post a letter").
    await ladderDay(h, s.claimCaseId, day(s.day0, 18));
    expect((await laddersOf(s.claimCaseId))[0]).toMatchObject({ state: 'concluded_undelivered', concluded_on: day(s.day0, 18), escalated_on: day(s.day0, 18) });
    const asks = await correctionRows(s.claimCaseId, 'ladder_escalation');
    expect(asks).toEqual([
      expect.objectContaining({ outcome: 'recorded', recipient_key: `staff:${da}`, subject_key: `ladder:${l!.ladder_id}`, detail: 'ask:letter' }),
    ]);
    // A second tick writes ⛔ second ask (the per-ladder partial UNIQUE).
    await ladderDay(h, s.claimCaseId, day(s.day0, 18));
    expect(await correctionRows(s.claimCaseId, 'ladder_escalation')).toHaveLength(1);
    // The OPEN run's push rides the chase sweep's own `todays` (LD9 (i)).
    h.setNow(tenAmIst(day(s.day0, 18)));
    await runCorrectionReminderSweep(h.chase, boss(h));
    expect(take(h, 'claim.correction.staff_push', s.claimCaseId).map((e) => (e.data.payload as CorrectionStaffPushPayload).userId)).toContain(da);

    // ⭐ The B1 mapping through the real reader: the ORIGIN reads never delivered (found dead on the conclusion date);
    // the silent day-14 reminder still counts (`-351` 1 A); ⛔ a stored outcome changed (I2).
    await withPariwarScope(pool, PARIWAR, async (db) => {
      const rows = await claim.readReturnFamilyRows(db, ids.pariwarId(PARIWAR), ids.claimId(s.claimCaseId), s.returnId);
      expect(rows.find((r) => r.reminderId === origin)).toMatchObject({ outcome: 'rejected_unreachable', deadOn: day(s.day0, 18), concluded: true });
      expect(rows.find((r) => r.reminderId === r14)).toMatchObject({ outcome: 'accepted' });
      const person = (await claim.readCorrectionRecipients(db, ids.pariwarId(PARIWAR), ids.claimId(s.claimCaseId))).people[0]!;
      const [st] = await claim.readReturnPersonStates(db, ids.pariwarId(PARIWAR), { claimCaseId: ids.claimId(s.claimCaseId), returnDecisionId: s.returnId }, [person]);
      expect(st!.track).toMatchObject({ foundDeadOn: day(s.day0, 18), deadKind: 'not_delivered' });
    });
    const stored = await pool.query<{ outcome: string }>(`SELECT outcome FROM claim_correction_reminders WHERE reminder_id = $1`, [origin]);
    expect(stored.rows[0]!.outcome).toBe('accepted');
    // ⛔ `escalated` on the queue is lit by the ask (it counts `purpose = 'escalation'` only — LD9).
    const summary = await withPariwarScope(pool, PARIWAR, (db) =>
      claim.readCorrectionChaseSummary(db, ids.pariwarId(PARIWAR), ids.claimId(s.claimCaseId), day(s.day0, 18)),
    );
    expect(summary.escalated).toBe(false);

    // ⭐ The no-restart rule — a later reported failure on the SAME number in the same epoch starts ⛔ new ladder.
    const [r21] = await chaseDay(h, s, 21);
    await reportOn('cr', r21!, 'undelivered');
    await ladderDay(h, s.claimCaseId, day(s.day0, 22));
    expect(await laddersOf(s.claimCaseId)).toHaveLength(1);
    // The found-dead letter track runs FROM the conclusion date (+7 ⇒ a letter chase on day 25).
    h.setNow(tenAmIst(day(s.day0, 25)));
    await runCorrectionReminderSweep(h.chase, boss(h));
    expect((await correctionRows(s.claimCaseId, 'letter_chase')).map((r) => r.sent_on)).toEqual([day(s.day0, 25)]);
  });

  it('AC3 — a DELIVERED report on the ladder SMS ends it `ended_delivered`; ⛔ ask, ⛔ mapping', async () => {
    const s = await seed();
    const h = harness();
    const [origin] = await chaseDay(h, s, 10);
    await reportOn('cr', origin!, 'undelivered');
    await ladderDay(h, s.claimCaseId, day(s.day0, 11));
    await ladderDay(h, s.claimCaseId, day(s.day0, 12));
    const [sms] = await correctionRows(s.claimCaseId, 'ladder_sms');
    await reportOn('cr', sms!.reminder_id, 'delivered');
    const t = await ladderDay(h, s.claimCaseId, day(s.day0, 13));
    expect((await laddersOf(s.claimCaseId))[0]).toMatchObject({ state: 'ended_delivered', end_detail: 'delivered' });
    expect(t.out.endedDelivered).toBeGreaterThanOrEqual(1);
    await ladderDay(h, s.claimCaseId, day(s.day0, 18));
    expect(await correctionRows(s.claimCaseId, 'ladder_escalation')).toEqual([]);
    await withPariwarScope(pool, PARIWAR, async (db) => {
      const rows = await claim.readReturnFamilyRows(db, ids.pariwarId(PARIWAR), ids.claimId(s.claimCaseId), s.returnId);
      expect(rows.find((r) => r.reminderId === origin)!.outcome).toBe('accepted');
    });
  });

  it('AC3 — a call recorded `reached` on/after the origin ends it `ended_call` (⛔ SMS 2); an EARLIER call does ⛔', async () => {
    const s = await seed();
    const h = harness();
    const [origin] = await chaseDay(h, s, 10);
    await reportOn('cr', origin!, 'undelivered');
    const person = await personOf(s.claimCaseId);
    await recordCall(s.claimCaseId, person.personKey, day(s.day0, 9)); // before the origin — ⛔ blocks nothing
    await ladderDay(h, s.claimCaseId, day(s.day0, 11));
    expect((await laddersOf(s.claimCaseId))[0]!.state).toBe('running');
    await recordCall(s.claimCaseId, person.personKey, day(s.day0, 11), 'certificate'); // either surface — it reached the PERSON
    const t = await ladderDay(h, s.claimCaseId, day(s.day0, 12));
    expect(t.results).toEqual([]);
    expect((await laddersOf(s.claimCaseId))[0]).toMatchObject({ state: 'ended_call', end_detail: 'call_reached' });
  });

  it('AC3 / I6 — a mark switch ends the family run `mark_changed` ⇒ the ladder ENDS `stopped:run_ended` (⛔ SMS 2)', async () => {
    const s = await seed();
    const h = harness();
    const [origin] = await chaseDay(h, s, 10);
    await reportOn('cr', origin!, 'undelivered');
    await ladderDay(h, s.claimCaseId, day(s.day0, 11));
    await onOwnTx(pool, PARIWAR, (client) =>
      claim.writeCorrectionMark(client, {
        pariwarId: ids.pariwarId(PARIWAR),
        claimCaseId: ids.claimId(s.claimCaseId),
        mustAct: 'staff',
        actorId: randomUUID(),
        actorDisplay: 'Pariwar Admin One',
        setByRole: 'pariwar_admin',
        noteCiphertext: 'enc:v1:switch-note',
        hold: claim.noCorrectionHold,
      }),
    );
    const t = await ladderDay(h, s.claimCaseId, day(s.day0, 12));
    expect(t.results).toEqual([]);
    expect((await laddersOf(s.claimCaseId))[0]).toMatchObject({ state: 'ended_stopped', end_detail: 'stopped:run_ended' });
    expect(await correctionRows(s.claimCaseId, 'ladder_sms')).toEqual([]);
  });

  it('⭐ PQ3 A — a day-84 failure first seen after day 90: the ladder STARTS (a `day_90` run is ⛔ a stop), its texts are `skipped:past_horizon`, it still CONCLUDES; the closure WAITS meanwhile; the ask on the ENDED run is pushed by this sweep', async () => {
    const s = await seed();
    const da = await staffUser('District Admin Late');
    await assignShepherd(s.claimCaseId, PARIWAR, da);
    const h = harness();
    const [origin] = await chaseDay(h, s, 84);
    h.setNow(tenAmIst(day(s.day0, 90)));
    await runCorrectionReminderSweep(h.chase, boss(h)); // ends the run `day_90`
    take(h, 'claim.correction.staff_push', s.claimCaseId);
    await reportOn('cr', origin!, 'undelivered');
    await ladderDay(h, s.claimCaseId, day(s.day0, 91));
    expect((await laddersOf(s.claimCaseId))[0]).toMatchObject({ state: 'running', sms2_due_on: day(s.day0, 92) });
    // ⭐ `-351` 6 A — closure waits while it runs.
    const readiness = await withPariwarScope(pool, PARIWAR, (db) =>
      claim.readClosureReadiness(db, ids.pariwarId(PARIWAR), ids.claimId(s.claimCaseId), tenAmIst(day(s.day0, 91)), { crypto: enc }),
    );
    expect(readiness.blocker).toBe('ladder_running');
    const d92 = await ladderDay(h, s.claimCaseId, day(s.day0, 92));
    expect(d92.results).toEqual([]);
    expect((await laddersOf(s.claimCaseId))[0]).toMatchObject({ sms2_state: 'skipped:past_horizon', sms3_due_on: day(s.day0, 94) });
    await ladderDay(h, s.claimCaseId, day(s.day0, 94));
    expect((await laddersOf(s.claimCaseId))[0]).toMatchObject({ sms3_state: 'skipped:past_horizon', conclude_on: day(s.day0, 98) });
    expect(await correctionRows(s.claimCaseId, 'ladder_sms')).toEqual([]); // ⛔ a text past day 90
    const d98 = await ladderDay(h, s.claimCaseId, day(s.day0, 98));
    expect((await laddersOf(s.claimCaseId))[0]!.state).toBe('concluded_undelivered');
    const [ask] = await correctionRows(s.claimCaseId, 'ladder_escalation');
    expect(ask).toMatchObject({ outcome: 'recorded', run_id: s.runId });
    void d98;
    // LD9 (iii) — the run is ENDED: the ladder sweep enqueued the push itself (⛔ a chase sweep visits this run).
    const pushes = take(h, 'claim.correction.staff_push', s.claimCaseId);
    expect(pushes.map((e) => (e.data.payload as CorrectionStaffPushPayload).userId)).toEqual([da]);
  });

  it('⭐ T24 — under an RLS-bound pool role the sweep REFUSES (`contact_ladder.rls_bound_role`) and starts ⛔ ladder', async () => {
    const s = await seed();
    const h = harness();
    const [origin] = await chaseDay(h, s, 10);
    await reportOn('cr', origin!, 'undelivered');
    const bound = Object.create(pool) as pg.Pool;
    bound.query = ((text: unknown, params?: unknown) =>
      typeof text === 'string' && text.includes('rolbypassrls')
        ? Promise.resolve({ rows: [{ ok: false }] })
        : (pool.query as (t: unknown, p?: unknown) => Promise<unknown>)(text, params)) as typeof pool.query;
    const hb = harness({ pool: bound });
    hb.setNow(tenAmIst(day(s.day0, 11)));
    const out = await runContactLadderSweep(hb.ladder, boss(hb));
    expect(out.refused).toBe(true);
    expect(hb.alarms.some((a) => a.includes('contact_ladder.rls_bound_role'))).toBe(true);
    expect(await laddersOf(s.claimCaseId)).toEqual([]);
  });

  it('⭐ AC11 — three ladders STARTED in one Pariwar on one IST day ⇒ ONE `contact_ladder.burst:3`; the daily line counts by state and names ⛔ id', async () => {
    const h = harness({ allowlist: [BURST_PARIWAR] });
    const seeded: Seeded[] = [];
    for (let i = 0; i < 3; i += 1) seeded.push(await seed({ pariwarId: BURST_PARIWAR }));
    for (const s of seeded) {
      h.setNow(tenAmIst(day(s.day0, 10)));
      await runCorrectionReminderSweep(h.chase, boss(h));
      for (const e of take(h, 'claim.correction.family_sms', s.claimCaseId)) {
        await runCorrectionFamilySmsChild(h.chase, e.data as JobEnvelope<CorrectionFamilySmsPayload>, randomUUID());
      }
      const { rows } = await pool.query<{ reminder_id: string }>(
        `SELECT reminder_id FROM claim_correction_reminders WHERE claim_case_id = $1 AND purpose = 'family_sms' AND outcome = 'accepted'`,
        [s.claimCaseId],
      );
      await reportOn('cr', rows[0]!.reminder_id, 'undelivered', BURST_PARIWAR);
    }
    const info = vi.spyOn(console, 'info');
    h.setNow(tenAmIst(day(seeded[0]!.day0, 11)));
    const out = await runContactLadderSweep(h.ladder, boss(h));
    expect(out.started).toBe(3);
    const bursts = h.alarms.filter((a) => a.includes('contact_ladder.burst:'));
    expect(bursts).toHaveLength(1);
    expect(bursts[0]).toContain('contact_ladder.burst:3');
    const line = info.mock.calls.map((c) => String(c[0])).find((m) => m.startsWith('[jobs] contact-ladder: started'));
    info.mockRestore();
    expect(line).toBe('[jobs] contact-ladder: started 3, ended_delivered 0, ended_call 0, concluded 0');
    for (const s of seeded) expect(line).not.toContain(s.claimCaseId);
  });

  it('⭐ a day-84 failure reported ON TIME sends its two texts on days 86 and 88 (inside day 90), the closure WAITS on day 90, it concludes on day 92 with the ask only (⛔ +7 letter chase past the horizon)', async () => {
    const s = await seed();
    const h = harness();
    const [origin] = await chaseDay(h, s, 84);
    await reportOn('cr', origin!, 'undelivered');
    await ladderDay(h, s.claimCaseId, day(s.day0, 85));
    expect((await ladderDay(h, s.claimCaseId, day(s.day0, 86))).results).toEqual([{ status: 'sent', outcome: 'accepted' }]);
    expect((await ladderDay(h, s.claimCaseId, day(s.day0, 88))).results).toEqual([{ status: 'sent', outcome: 'accepted' }]);
    h.setNow(tenAmIst(day(s.day0, 90)));
    await runCorrectionReminderSweep(h.chase, boss(h)); // the run ends `day_90`
    const readiness = await withPariwarScope(pool, PARIWAR, (db) =>
      claim.readClosureReadiness(db, ids.pariwarId(PARIWAR), ids.claimId(s.claimCaseId), tenAmIst(day(s.day0, 90)), { crypto: enc }),
    );
    expect(readiness.blocker).toBe('ladder_running');
    await ladderDay(h, s.claimCaseId, day(s.day0, 92));
    expect((await laddersOf(s.claimCaseId))[0]).toMatchObject({ state: 'concluded_undelivered', concluded_on: day(s.day0, 92) });
    expect((await correctionRows(s.claimCaseId, 'ladder_sms')).map((r) => r.sent_on)).toEqual([day(s.day0, 86), day(s.day0, 88)]);
    expect(await correctionRows(s.claimCaseId, 'ladder_escalation')).toHaveLength(1);
    h.setNow(tenAmIst(day(s.day0, 99)));
    await runCorrectionReminderSweep(h.chase, boss(h));
    expect(await correctionRows(s.claimCaseId, 'letter_chase')).toEqual([]); // the run is ENDED — as today for a day-84 refusal
    // ⭐ The silent ladder SMS still reaches them for D22 (`-351` 1 A, PQ1 A) — the claim CAN close once concluded.
    const after = await withPariwarScope(pool, PARIWAR, (db) =>
      claim.readClosureReadiness(db, ids.pariwarId(PARIWAR), ids.claimId(s.claimCaseId), tenAmIst(day(s.day0, 93)), { crypto: enc }),
    );
    expect(after.blocker).not.toBe('ladder_running');
  });

  it('LD3 / AC11 — the claimant\'s current number cannot be hashed on a step day ⇒ `skipped:hash_unavailable` (the clock runs on) + `contact_ladder.hash_unavailable` (ids only); the claimant\'s WhatsApp step is `skipped:whatsapp_not_built`', async () => {
    const s = await seed({ claimantMobile: '9812300001' });
    const h = harness();
    const ids10 = await chaseDay(h, s, 10);
    const claimantRow = (await correctionRows(s.claimCaseId, 'family_sms')).find((r) => r.recipient_key === 'claimant' && ids10.includes(r.reminder_id))!;
    await reportOn('cr', claimantRow.reminder_id, 'undelivered');
    await ladderDay(h, s.claimCaseId, day(s.day0, 11));
    const [l] = (await laddersOf(s.claimCaseId)).filter((x) => x.person_key === 'claimant');
    expect(l).toMatchObject({ whatsapp_step: 'skipped:whatsapp_not_built', state: 'running' });
    const down = harness();
    const hmacDown = {
      ...enc,
      kms: { ...enc.kms, computeHmac: () => Promise.reject(new Error('kms hmac unavailable')) },
    };
    (down.ladder as { encryption: typeof enc }).encryption = hmacDown;
    const t = await ladderDay(down, s.claimCaseId, day(s.day0, 12));
    expect(t.results).toEqual([]);
    expect((await laddersOf(s.claimCaseId)).find((x) => x.person_key === 'claimant')).toMatchObject({
      state: 'running',
      sms2_state: 'skipped:hash_unavailable',
      sms3_due_on: day(s.day0, 14),
    });
    const alarm = down.alarms.find((a) => a.includes('contact_ladder.hash_unavailable'));
    expect(alarm).toContain(s.claimCaseId);
    expect(alarm).not.toContain('9812300001');
  });

  it('LD4 — a `satisfied` step whose scheduled reminder NEVER went (the chase skipped the day) is re-recorded `skipped:scheduled_not_sent` + the alarm; ⛔ a resend', async () => {
    const s = await seed();
    const h = harness();
    const [origin] = await chaseDay(h, s, 10);
    await reportOn('cr', origin!, 'undelivered');
    await ladderDay(h, s.claimCaseId, day(s.day0, 11));
    await ladderDay(h, s.claimCaseId, day(s.day0, 12));
    // Day 14 is a scheduled day, but the chase sweep does ⛔ run (a timed-out run, say) — ⛔ chaseDay here.
    await ladderDay(h, s.claimCaseId, day(s.day0, 14));
    expect((await laddersOf(s.claimCaseId))[0]!.sms3_state).toBe('satisfied');
    const t = await ladderDay(h, s.claimCaseId, day(s.day0, 15));
    expect(t.results).toEqual([]);
    expect((await laddersOf(s.claimCaseId))[0]).toMatchObject({ sms3_state: 'skipped:scheduled_not_sent', conclude_on: day(s.day0, 18) });
    expect(h.alarms.some((a) => a.includes('contact_ladder.scheduled_not_sent') && a.includes(s.claimCaseId))).toBe(true);
  });

  it('⭐ LD9 (ii) — an ask written AFTER that day\'s push had already gone rides the NEXT push (the real push child lists it — ⛔ "no items")', async () => {
    const s = await seed();
    const da = await staffUser('District Admin Carry');
    await assignShepherd(s.claimCaseId, PARIWAR, da);
    const h = harness();
    const [origin] = await chaseDay(h, s, 10);
    await reportOn('cr', origin!, 'undelivered');
    for (const n of [11, 12, 14, 15]) {
      if (n === 14) await chaseDay(h, s, 14);
      await ladderDay(h, s.claimCaseId, day(s.day0, n));
    }
    // Day 18 — the DA's push claims its day row FIRST (⛔ item yet), THEN the ladder concludes and writes the ask.
    const push = (sentOn: string) =>
      ({
        pariwarId: PARIWAR,
        requestId: 'r',
        actorId: null,
        traceId: 't',
        payload: { claimCaseId: s.claimCaseId, runId: s.runId!, slotDay: 0, userId: da, sentOn } satisfies CorrectionStaffPushPayload,
      }) as JobEnvelope<CorrectionStaffPushPayload>;
    h.setNow(tenAmIst(day(s.day0, 18)));
    expect(await runCorrectionStaffPush(h.chase, push(day(s.day0, 18)), randomUUID())).toEqual({ status: 'pushed', outcome: 'no_target' });
    await ladderDay(h, s.claimCaseId, day(s.day0, 18));
    expect(await correctionRows(s.claimCaseId, 'ladder_escalation')).toHaveLength(1);
    // Day 19 — the chase sweep's `todays` carries the un-pushed ask (an OPEN run), and the push child LISTS it.
    take(h, 'claim.correction.staff_push', s.claimCaseId); // the earlier days' scheduled-reminder pushes (⛔ run here)
    h.setNow(tenAmIst(day(s.day0, 19)));
    await runCorrectionReminderSweep(h.chase, boss(h));
    const next = take(h, 'claim.correction.staff_push', s.claimCaseId);
    expect(next.map((e) => (e.data.payload as CorrectionStaffPushPayload).userId)).toEqual([da]);
    await runCorrectionStaffPush(h.chase, next[0]!.data as JobEnvelope<CorrectionStaffPushPayload>, randomUUID());
    const pushes = await correctionRows(s.claimCaseId, 'staff_push');
    expect(pushes.map((r) => [r.sent_on, r.detail])).toEqual([
      [day(s.day0, 18), 'no_target:no_items_today'],
      [day(s.day0, 19), 'no_target:no_admin_device_token'], // ⭐ it HAD an item — the carried ask
    ]);
    // The day after, ⛔ again (a push created after the ask carried it).
    h.setNow(tenAmIst(day(s.day0, 20)));
    await runCorrectionReminderSweep(h.chase, boss(h));
    expect(take(h, 'claim.correction.staff_push', s.claimCaseId)).toEqual([]);
  });

  it('⭐ LD9 — a call recorded `reached` stops a CONCLUDED person\'s letter chase; a SEND-TIME dead number keeps its letter chase despite one (`-230` / `-231` C)', async () => {
    const concluded = await seed();
    const h = harness();
    const [origin] = await chaseDay(h, concluded, 10);
    await reportOn('cr', origin!, 'undelivered');
    for (const n of [11, 12, 14, 18]) {
      if (n === 14) await chaseDay(h, concluded, 14);
      await ladderDay(h, concluded.claimCaseId, day(concluded.day0, n));
    }
    expect((await laddersOf(concluded.claimCaseId))[0]!.state).toBe('concluded_undelivered');
    await recordCall(concluded.claimCaseId, (await personOf(concluded.claimCaseId)).personKey, day(concluded.day0, 20));
    h.setNow(tenAmIst(day(concluded.day0, 25)));
    await runCorrectionReminderSweep(h.chase, boss(h));
    expect(await correctionRows(concluded.claimCaseId, 'letter_chase')).toEqual([]);

    // A number the network refused AT SEND (`rejected_invalid_number`) — a reached call does ⛔ stop its letter chase.
    const dead = await seed();
    const hd = harness({ gateway: () => Promise.reject(new SmsSendError('x', '202', 200)) });
    await chaseDay(hd, dead, 10);
    expect((await correctionRows(dead.claimCaseId, 'family_sms')).map((r) => r.outcome)).toContain('rejected_invalid_number');
    await recordCall(dead.claimCaseId, (await personOf(dead.claimCaseId)).personKey, day(dead.day0, 11));
    hd.setNow(tenAmIst(day(dead.day0, 17)));
    await runCorrectionReminderSweep(hd.chase, boss(hd));
    expect((await correctionRows(dead.claimCaseId, 'letter_chase')).map((r) => r.sent_on)).toEqual([day(dead.day0, 17)]);
  });

  it('LD11 — nominee calls CLEARED ⇒ a nominee\'s ask is `call_or_letter` (the SAME switch the api reads)', async () => {
    const s = await seed();
    const h = harness({ nomineeCallsCleared: true });
    const [origin] = await chaseDay(h, s, 10);
    await reportOn('cr', origin!, 'undelivered');
    for (const n of [11, 12, 14, 18]) {
      if (n === 14) await chaseDay(h, s, 14);
      await ladderDay(h, s.claimCaseId, day(s.day0, n));
    }
    expect((await correctionRows(s.claimCaseId, 'ladder_escalation')).map((r) => r.detail)).toEqual(['no_target:no_staff_recipient']);
    // (⛔ live shepherd here ⇒ `no_target`; the ask's words are pinned by the pure `ladderAsk` table — read it back:)
    expect(claim.ladderAsk({ role: 'nominee', letterCapReached: false, nomineeCallsCleared: true })).toBe('call_or_letter');
  });

  it('⭐ AC1 — two CONCURRENT sweeps start ONE ladder (the chase lock + the UNIQUEs)', async () => {
    const s = await seed();
    const h = harness();
    const [origin] = await chaseDay(h, s, 10);
    await reportOn('cr', origin!, 'undelivered');
    h.setNow(tenAmIst(day(s.day0, 11)));
    await Promise.all([runContactLadderSweep(h.ladder, boss(h)), runContactLadderSweep(h.ladder, boss(h))]);
    expect(await laddersOf(s.claimCaseId)).toHaveLength(1);
  });

  it('⭐ T22 — two people of the claim on ONE number: one ladder SMS goes; the other person\'s step that day is `satisfied` (⛔ two texts to one phone)', async () => {
    const s = await seed({ nomineeMobiles: ['9812355555', '9812355555'] });
    const h = harness();
    const sent10 = await chaseDay(h, s, 10);
    expect(sent10).toHaveLength(2);
    for (const id of sent10) await reportOn('cr', id, 'undelivered');
    await ladderDay(h, s.claimCaseId, day(s.day0, 11));
    expect(await laddersOf(s.claimCaseId)).toHaveLength(2);
    const t = await ladderDay(h, s.claimCaseId, day(s.day0, 12));
    expect(t.results.map((r) => r.status).sort()).toEqual(['resolved', 'sent']);
    expect(await correctionRows(s.claimCaseId, 'ladder_sms')).toHaveLength(1);
    expect((await laddersOf(s.claimCaseId)).map((l) => l.sms2_state).sort()).toEqual(['satisfied', 'sent']);
  });

  it('⭐ AC7 — a reached call takes the trustee lock THEN the claim row: a certificate plan holding the row makes it WAIT (⛔ deadlock), then it ends the person\'s ladders of BOTH chases', async () => {
    const s = await seed();
    const h = harness();
    const [origin] = await chaseDay(h, s, 10);
    await reportOn('cr', origin!, 'undelivered');
    await ladderDay(h, s.claimCaseId, day(s.day0, 11));
    const person = await personOf(s.claimCaseId);
    const certRun = await pool.query<{ run_id: string }>(
      `INSERT INTO claim_certificate_reminder_runs (claim_case_id, pariwar_id, cause, day0) VALUES ($1, $2, 'missing', $3) RETURNING run_id`,
      [s.claimCaseId, PARIWAR, s.day0],
    );
    const ladder = (await laddersOf(s.claimCaseId))[0]!;
    await pool.query(
      `INSERT INTO claim_contact_ladders (pariwar_id, claim_case_id, chase, run_id, person_key, recipient_number_hash, origin_row_id, origin_sent_on, whatsapp_step, sms2_due_on)
       SELECT pariwar_id, claim_case_id, 'certificate', $2, person_key, recipient_number_hash, gen_random_uuid(), origin_sent_on, whatsapp_step, sms2_due_on
         FROM claim_contact_ladders WHERE ladder_id = $1`,
      [ladder.ladder_id, certRun.rows[0]!.run_id],
    );
    const holder = await pool.connect();
    try {
      await holder.query('BEGIN');
      await holder.query('SELECT 1 FROM claims WHERE claim_case_id = $1 FOR UPDATE', [s.claimCaseId]); // the certificate plan's lock
      let settled = false;
      const recorded = onOwnTx(pool, PARIWAR, (client) =>
        claim.recordContactCall(client, {
          pariwarId: ids.pariwarId(PARIWAR),
          claimCaseId: ids.claimId(s.claimCaseId),
          chase: 'correction',
          personKey: person.personKey,
          calledOn: day(s.day0, 11),
          answeredBy: 'the_person',
          outcome: 'reached',
          actorId: randomUUID(),
          actorDisplay: 'District Admin',
          nomineeCallsCleared: true,
          now: tenAmIst(day(s.day0, 12)),
        }),
      ).then((r) => {
        settled = true;
        return r;
      });
      await new Promise((r) => setTimeout(r, 400));
      expect(settled).toBe(false); // it waits on the row (it already holds the advisory lock)
      await holder.query('COMMIT');
      const out = await recorded;
      expect(out.endedLadderIds).toHaveLength(2);
    } finally {
      holder.release();
    }
    expect((await laddersOf(s.claimCaseId)).map((l) => l.state)).toEqual(['ended_call', 'ended_call']);
  });

  it('AC11 — TWO ladders started in one Pariwar on one day ⇒ ⛔ burst alarm', async () => {
    const TWO = randomUUID();
    const h = harness({ allowlist: [TWO] });
    const seeded: Seeded[] = [];
    for (let i = 0; i < 2; i += 1) seeded.push(await seed({ pariwarId: TWO }));
    for (const s of seeded) {
      h.setNow(tenAmIst(day(s.day0, 10)));
      await runCorrectionReminderSweep(h.chase, boss(h));
      for (const e of take(h, 'claim.correction.family_sms', s.claimCaseId)) {
        await runCorrectionFamilySmsChild(h.chase, e.data as JobEnvelope<CorrectionFamilySmsPayload>, randomUUID());
      }
      const { rows } = await pool.query<{ reminder_id: string }>(
        `SELECT reminder_id FROM claim_correction_reminders WHERE claim_case_id = $1 AND purpose = 'family_sms' AND outcome = 'accepted'`,
        [s.claimCaseId],
      );
      await reportOn('cr', rows[0]!.reminder_id, 'undelivered', TWO);
    }
    h.setNow(tenAmIst(day(seeded[0]!.day0, 11)));
    const out = await runContactLadderSweep(h.ladder, boss(h));
    expect(out.started).toBe(2);
    expect(h.alarms.filter((a) => a.includes('contact_ladder.burst:'))).toEqual([]);
    await pool.query('DELETE FROM sms_send_deliveries WHERE pariwar_id = $1', [TWO]);
  });

  it('LD3 — a ladder SMS the network REFUSES at send (a dead number) counts as the step `sent`; the ladder runs on to its date (⛔ an early conclusion — disclosed)', async () => {
    const s = await seed();
    const h = harness();
    const [origin] = await chaseDay(h, s, 10);
    await reportOn('cr', origin!, 'undelivered');
    await ladderDay(h, s.claimCaseId, day(s.day0, 11));
    const refusing = harness({ gateway: () => Promise.reject(new SmsSendError('x', '202', 200)) });
    const t = await ladderDay(refusing, s.claimCaseId, day(s.day0, 12));
    expect(t.results).toEqual([{ status: 'sent', outcome: 'rejected_invalid_number' }]);
    expect((await laddersOf(s.claimCaseId))[0]).toMatchObject({ state: 'running', sms2_state: 'sent', sms3_due_on: day(s.day0, 14) });
    await ladderDay(h, s.claimCaseId, day(s.day0, 13));
    expect((await laddersOf(s.claimCaseId))[0]!.state).toBe('running');
  });

  // ── The certificate chase (`-351` 3 B) ──────────────────────────────────────────────────────────────────────

  it('⭐ CERTIFICATE — a reported failure starts a ladder; SMS 2 is the certificate reminder sent again (CRQID `ce`); it CONCLUDES with a RECORDED ask (⛔ push) and the person is letter-eligible', async () => {
    const w = await seedWait();
    const h = harness();
    h.setNow(new Date());
    await runCertificateReminderSweep(h.ladder, boss(h));
    take(h, 'claim.certificate.family_sms', w.cid);
    const run = await pool.query<{ day0: string; run_id: string }>(
      `SELECT to_char(day0, 'YYYY-MM-DD') AS day0, run_id FROM claim_certificate_reminder_runs WHERE claim_case_id = $1 AND ended_at IS NULL`,
      [w.cid],
    );
    const certDay0 = run.rows[0]!.day0;
    h.setNow(tenAmIst(day(certDay0, 10)));
    await runCertificateReminderSweep(h.ladder, boss(h));
    for (const e of take(h, 'claim.certificate.family_sms', w.cid)) {
      await runCertificateFamilySmsChild(h.ladder, e.data as JobEnvelope<CertificateFamilySmsPayload>, randomUUID());
    }
    const { rows: sent } = await pool.query<{ reminder_id: string }>(
      `SELECT reminder_id FROM claim_certificate_reminders WHERE claim_case_id = $1 AND purpose = 'family_sms' AND outcome = 'accepted' AND sent_on = $2`,
      [w.cid, day(certDay0, 10)],
    );
    expect(sent).toHaveLength(1);
    await reportOn('ce', sent[0]!.reminder_id, 'undelivered');
    await ladderDay(h, w.cid, day(certDay0, 11), 'certificate');
    const [l] = await laddersOf(w.cid);
    expect(l).toMatchObject({ chase: 'certificate', origin_row_id: sent[0]!.reminder_id, sms2_due_on: day(certDay0, 12), state: 'running' });
    h.sent.length = 0;
    const d12 = await ladderDay(h, w.cid, day(certDay0, 12), 'certificate');
    expect(d12.results).toEqual([{ status: 'sent', outcome: 'accepted' }]);
    const { rows: ladderSms } = await pool.query<{ reminder_id: string; subject_key: string; recipient_number_hash: string | null }>(
      `SELECT reminder_id, subject_key, recipient_number_hash FROM claim_certificate_reminders WHERE claim_case_id = $1 AND purpose = 'ladder_sms'`,
      [w.cid],
    );
    expect(ladderSms).toHaveLength(1);
    expect(ladderSms[0]!.subject_key).toBe(`ladder:${l!.ladder_id}:2`);
    expect(ladderSms[0]!.recipient_number_hash).not.toBeNull(); // CR7 — the hash on the claimed row
    expect(h.sent[0]!.correlationId).toBe(`ce${ladderSms[0]!.reminder_id.replace(/-/g, '')}`);
    // Day 14 — the certificate schedule's day ⇒ `satisfied`; day 18 ⇒ concluded.
    await ladderDay(h, w.cid, day(certDay0, 14), 'certificate');
    expect((await laddersOf(w.cid))[0]).toMatchObject({ sms3_state: 'satisfied', conclude_on: day(certDay0, 18) });
    await ladderDay(h, w.cid, day(certDay0, 18), 'certificate');
    expect((await laddersOf(w.cid))[0]).toMatchObject({ state: 'concluded_undelivered', concluded_on: day(certDay0, 18) });
    const { rows: asks } = await pool.query<{ outcome: string; recipient_key: string; detail: string | null }>(
      `SELECT outcome, recipient_key, detail FROM claim_certificate_reminders WHERE claim_case_id = $1 AND purpose = 'ladder_escalation'`,
      [w.cid],
    );
    // ⛔ live shepherd ⇒ `no_target` + the alarm (CR10's shape); ⛔ push on the certificate chase.
    expect(asks).toEqual([{ outcome: 'no_target', recipient_key: 'staff:unassigned', detail: 'no_target:no_staff_recipient' }]);
    expect(h.alarms.some((a) => a.includes('contact_ladder.escalation_unassigned'))).toBe(true);
    expect(take(h, 'claim.correction.staff_push', w.cid)).toEqual([]);
    await withPariwarScope(pool, PARIWAR, async (db) => {
      const pid = ids.pariwarId(PARIWAR);
      const cid = ids.claimId(w.cid);
      const recipients = await claim.readCertificateRecipients(db, pid, cid);
      const hashes = await claim.hashCertificateRecipients(recipients.people, PARIWAR, enc);
      const states = claim.evaluateCertificatePersonStates(
        recipients.people,
        await claim.readClaimCertificateFamilyRows(db, pid, cid),
        await claim.readClaimCertificateLetters(db, pid, cid),
        hashes,
      );
      expect(states[0]).toMatchObject({ letterEligible: true });
      expect(states[0]!.track).toMatchObject({ foundDeadOn: day(certDay0, 18), deadKind: 'not_delivered' });
    });
  });

  it('CERTIFICATE — a PAUSE (the claim outside the review window, ⛔ for good) skips the step `skipped:paused` (PQ3 A — the clock runs on); the person OFF the contact record ends it `stopped:not_a_recipient`', async () => {
    const w = await seedWait();
    const h = harness();
    h.setNow(new Date());
    await runCertificateReminderSweep(h.ladder, boss(h));
    take(h, 'claim.certificate.family_sms', w.cid);
    const run = await pool.query<{ day0: string; run_id: string }>(
      `SELECT to_char(day0, 'YYYY-MM-DD') AS day0, run_id FROM claim_certificate_reminder_runs WHERE claim_case_id = $1 AND ended_at IS NULL`,
      [w.cid],
    );
    const certDay0 = run.rows[0]!.day0;
    h.setNow(tenAmIst(day(certDay0, 10)));
    await runCertificateReminderSweep(h.ladder, boss(h));
    for (const e of take(h, 'claim.certificate.family_sms', w.cid)) {
      await runCertificateFamilySmsChild(h.ladder, e.data as JobEnvelope<CertificateFamilySmsPayload>, randomUUID());
    }
    const { rows } = await pool.query<{ reminder_id: string; recipient_number_hash: string }>(
      `SELECT reminder_id, recipient_number_hash FROM claim_certificate_reminders WHERE claim_case_id = $1 AND purpose = 'family_sms' AND outcome = 'accepted'`,
      [w.cid],
    );
    await reportOn('ce', rows[0]!.reminder_id, 'undelivered');
    await ladderDay(h, w.cid, day(certDay0, 11), 'certificate');
    // A stale ladder for a person ⛔ on the record (a person key the contact record does not name).
    await pool.query(
      `INSERT INTO claim_contact_ladders (pariwar_id, claim_case_id, chase, run_id, person_key, recipient_number_hash, origin_row_id, origin_sent_on, whatsapp_step, sms2_due_on)
       VALUES ($1, $2, 'certificate', $3, 'nominee:gone', 'h-gone', gen_random_uuid(), $4, 'skipped:nominee_no_whatsapp', $5)`,
      [PARIWAR, w.cid, run.rows[0]!.run_id, day(certDay0, 9), day(certDay0, 11)],
    );
    // The claim leaves the review window (to a state it CAN come back from) — a pause, ⛔ an end.
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      await c.query("SET LOCAL session_replication_role = 'replica'");
      await c.query(`UPDATE claims SET current_state = 'documents_pending' WHERE claim_case_id = $1`, [w.cid]);
      await c.query('COMMIT');
    } finally {
      c.release();
    }
    const t = await ladderDay(h, w.cid, day(certDay0, 12), 'certificate');
    expect(t.results).toEqual([]);
    const ladders = await laddersOf(w.cid);
    expect(ladders.find((l) => l.person_key !== 'nominee:gone')).toMatchObject({ state: 'running', sms2_state: 'skipped:paused', sms3_due_on: day(certDay0, 14) });
    expect(ladders.find((l) => l.person_key === 'nominee:gone')).toMatchObject({ state: 'ended_stopped', end_detail: 'stopped:not_a_recipient' });
    // Still paused on day 14 (skipped) and on its conclusion date: it CONCLUDES and its ask is RECORDED while paused (LD9).
    await ladderDay(h, w.cid, day(certDay0, 14), 'certificate');
    await ladderDay(h, w.cid, day(certDay0, 18), 'certificate');
    expect((await laddersOf(w.cid)).find((l) => l.person_key !== 'nominee:gone')).toMatchObject({
      sms3_state: 'skipped:paused',
      state: 'concluded_undelivered',
      escalated_on: day(certDay0, 18),
    });
    const { rows: asks } = await pool.query<{ outcome: string }>(
      `SELECT outcome FROM claim_certificate_reminders WHERE claim_case_id = $1 AND purpose = 'ladder_escalation'`,
      [w.cid],
    );
    expect(asks).toHaveLength(1);
  });

  it('CERTIFICATE stops — a certificate RECEIVED since (a `missing` run whose claim now has one) ends the ladder `stopped:certificate_received`', async () => {
    const w = await seedWait({ missing: true });
    const h = harness();
    h.setNow(new Date());
    await runCertificateReminderSweep(h.ladder, boss(h));
    take(h, 'claim.certificate.family_sms', w.cid);
    const run = await pool.query<{ day0: string }>(
      `SELECT to_char(day0, 'YYYY-MM-DD') AS day0 FROM claim_certificate_reminder_runs WHERE claim_case_id = $1 AND ended_at IS NULL`,
      [w.cid],
    );
    const certDay0 = run.rows[0]!.day0;
    h.setNow(tenAmIst(day(certDay0, 10)));
    await runCertificateReminderSweep(h.ladder, boss(h));
    for (const e of take(h, 'claim.certificate.family_sms', w.cid)) {
      await runCertificateFamilySmsChild(h.ladder, e.data as JobEnvelope<CertificateFamilySmsPayload>, randomUUID());
    }
    const { rows } = await pool.query<{ reminder_id: string }>(
      `SELECT reminder_id FROM claim_certificate_reminders WHERE claim_case_id = $1 AND purpose = 'family_sms' AND outcome = 'accepted'`,
      [w.cid],
    );
    await reportOn('ce', rows[0]!.reminder_id, 'undelivered');
    await ladderDay(h, w.cid, day(certDay0, 11), 'certificate');
    expect((await laddersOf(w.cid))[0]!.state).toBe('running');
    // A certificate arrives (an upload — the claim is no longer `missing`).
    await onOwnTx(pool, PARIWAR, async (client) => {
      const db = bindScopedDb(client);
      const docId = randomUUID();
      const uploadId = randomUUID();
      const key = `pariwar/${PARIWAR}/claim/${w.cid}/death_certificate/${docId}/${uploadId}`;
      await db.insert(schema.claimDocuments).values({
        claimDocumentId: docId as never, claimCaseId: ids.claimId(w.cid), pariwarId: ids.pariwarId(PARIWAR), documentType: 'death_certificate',
        storageObjectKey: key, contentType: 'application/pdf', byteSize: 1024, parityOutcome: 'match', parityFlags: {}, ocrConfidence: 0.9,
        verifierReviewRequired: false,
      });
      await db.insert(schema.claimDeathCertificateUploads).values({
        uploadId: uploadId as never, claimCaseId: ids.claimId(w.cid), pariwarId: ids.pariwarId(PARIWAR), deceasedMemberId: ids.memberId(w.mid),
        claimDocumentId: docId as never, storageObjectKey: key, contentType: 'application/pdf', byteSize: 1024, channel: 'member_app',
        uploadedByActorId: null, uploadedAt: new Date(), parityOutcome: 'match', parityFlags: {}, ocrConfidence: 0.9,
      });
    });
    await ladderDay(h, w.cid, day(certDay0, 12), 'certificate');
    expect((await laddersOf(w.cid))[0]).toMatchObject({ state: 'ended_stopped', end_detail: 'stopped:certificate_received' });
  });

});
