// The SUSPICION NOTICES — the sweep and the child against the live DB (Story 6.24b, Task 5.4; AC7b; `2026-10-07-292` RF11 /
// RF12, `2026-10-07-293` item 1 B, `2026-10-08-295` RB3, RB5, RB10, RB12, RB13, RB15, RB18). Own-committing (the sweep
// reads COMMITTED rows across tenants), an INJECTED clock, a fake SMS gateway and a capturing queue. ⭐ ISOLATED: every
// sweep runs with `pariwarAllowlist` = this suite's own random Pariwars. ⭐ REAL envelopes: the nominee / claimant mobiles
// and the deceased's KYC name are encrypted under the SAME fake-KMS deps the child decrypts with. Assertions key on OUR
// claim ids (membership, ⛔ never counts of the shared tables).
//
// The world of one death: v1 — nominee A (…1111), declared BEFORE the death; v2 — nominee B (…2222), declared AFTER it.
// A refused claim's determination (a raw row — a NULL `death_certificate_review_id` is trusted as effective, RF9) marks
// v1 `stands` / v2 `discarded`; the refusal is `-239` (the projector + its live decision row).

import { randomUUID } from 'node:crypto';

import { SmsSendError, type SmsAppClient, type SmsGatewayMessage } from '@twt/channels';
import { bindScopedDb, claim, encryption, ids, nominee, schema } from '@twt/domain';
import type { JobEnvelope } from '@twt/queue';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildJobsEncryptionDeps } from '../src/deps.js';
import { ClaimCorrectionTransientError } from '../src/scheduler/claim-correction-reminders.js';
import {
  runSuspicionNoticeChild,
  runSuspicionNoticeSweep,
  type ClaimSuspicionNoticeDeps,
  type SuspicionNoticePayload,
} from '../src/scheduler/claim-suspicion-notices.js';
import { cleanupClaims, encryptField, onOwnTx } from './_claim-correction-seed.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);
const PARIWAR = randomUUID();
/** A second Pariwar whose name mode is `shielded_name` (`-181`). */
const SHIELDED = randomUUID();
const HELPLINE = '+911800123456';
const NAME = 'Ramesh Kumar Sharma';
const A = '9876501111';
const B = '9876502222';
const CLAIMANT = '9876503333';
const enc = buildJobsEncryptionDeps('claim-suspicion-notice-live-pepper');
const DAY = 86_400_000;
const BEFORE_DEATH = new Date('2026-01-10T06:00:00.000Z');
const AFTER_DEATH = new Date('2026-06-01T06:00:00.000Z');
const SMS_QUEUE = 'claim.suspicion.notice.sms';
const DA = 'd2d2d2d2-0000-4000-8000-0000000000da';

type Purpose = SuspicionNoticePayload['purpose'];

describe.skipIf(!hasDatabase)('Story 6.24b — the suspicion notices (live DB, own-committing)', { timeout: 60000 }, () => {
  let pool: pg.Pool;
  const claims: string[] = [];
  const members: string[] = [];

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: DATABASE_URL, max: 8, ssl: false, connectionTimeoutMillis: 5000 });
    pool.on('error', (err) => console.error('[claim-suspicion-notices-live] idle client error:', err.message));
    await pool.query(`INSERT INTO pariwar_public_name_presentation (pariwar_id, mode) VALUES ($1, 'shielded_name')`, [SHIELDED]);
  });
  afterAll(async () => {
    try {
      // ⚠ BEFORE `cleanupClaims` — it deletes members with FK triggers off (replica role), which would orphan these.
      await pool.query('DELETE FROM member_kyc_profiles WHERE member_id = ANY($1::uuid[])', [members]);
      await pool.query('DELETE FROM pariwar_public_name_presentation WHERE pariwar_id = $1', [SHIELDED]);
      await cleanupClaims(pool, claims, members);
    } finally {
      await pool.end();
    }
  });

  // ── the world ───────────────────────────────────────────────────────────────────────────────────────────────

  interface Death {
    readonly pariwarId: string;
    readonly mid: string;
    readonly v1: string;
    readonly v2: string;
  }

  /** The deceased: a member row, the KYC name (REAL envelope), v1 (pre-death, A) and v2 (post-death, B). */
  async function seedDeath(opts: { pariwarId?: string; kycName?: string | null } = {}): Promise<Death> {
    const pariwarId = opts.pariwarId ?? PARIWAR;
    const mid = ids.memberId(randomUUID());
    const pid = ids.pariwarId(pariwarId);
    members.push(mid);
    const v = await onOwnTx(pool, pariwarId, async (client) => {
      const db = bindScopedDb(client);
      await db.insert(schema.members).values({ memberId: mid, pariwarId: pid, state: 'active', stateEventVersion: 1 }).onConflictDoNothing();
      if (opts.kycName !== null) {
        await db.insert(schema.memberKycProfiles).values({
          memberId: mid,
          pariwarId: pid,
          nameCiphertext: await encryption.encryptKycField(opts.kycName ?? NAME, pariwarId, enc),
          dobCiphertext: await encryption.encryptKycField('1950-01-01', pariwarId, enc),
          verificationStrength: 'self_declared',
          source: 'manual',
        });
      }
      for (const [mobile, at] of [
        [A, BEFORE_DEATH],
        [B, AFTER_DEATH],
      ] as const) {
        const row = {
          rank: 1 as const,
          splitPct: 100 as const,
          relationship: 'spouse',
          nameCiphertext: await encryptField('Nominee', pariwarId, 'member_nominee', enc),
          mobileCiphertext: await encryptField(mobile, pariwarId, 'member_nominee', enc),
          addressCiphertext: null,
        };
        await nominee.replaceMemberNominees(db, { memberId: mid, pariwarId: pid, nominees: [row] });
        await nominee.appendMemberDeclarationVersions(db, {
          memberId: mid,
          pariwarId: pid,
          plan: nominee.planDeclarationVersions(await nominee.getNomineeVersionHeads(db, pid, mid), [1]),
          nominees: [row],
          recordedAt: at,
          eventVersion: null,
        });
      }
      return nominee.listNomineeDeclarationVersions(db, pid, mid);
    });
    return { pariwarId, mid, v1: v.find((x) => x.effectiveAt.getTime() === BEFORE_DEATH.getTime())!.versionId, v2: v.find((x) => x.effectiveAt.getTime() === AFTER_DEATH.getTime())!.versionId };
  }

  /** A claim of the death driven (events) to `documents_pending` or `verifier_review`. */
  async function claimOf(d: Death, to: 'documents_pending' | 'verifier_review'): Promise<string> {
    const cid = ids.claimId(randomUUID());
    claims.push(cid);
    await onOwnTx(pool, d.pariwarId, async (client) => {
      const emit = (from: string | null, next: string, eventType: string, extra: Record<string, unknown> = {}) =>
        claim.projectClaimState(client, {
          claimCaseId: cid,
          pariwarId: ids.pariwarId(d.pariwarId),
          deceasedMemberId: ids.memberId(d.mid),
          intakeChannels: ['member_app'],
          claimantActorId: null,
          eventType: eventType as never,
          payload: { from_state: from, to_state: next, trigger: 'test', actor: 'system', ...extra } as never,
          actorId: null,
        });
      await emit(null, 'intake_pending', 'claim.intake_initiated', { deceased_member_id: d.mid, intake_channel: 'member_app', claimant_actor_id: null });
      await emit('intake_pending', 'intake_converged', 'claim.intake_converged');
      await emit('intake_converged', 'documents_pending', 'claim.documents_received');
      if (to === 'verifier_review') {
        await emit('documents_pending', 'verification_in_progress', 'claim.peer_mesh_pinged', {
          selected_member_ids: [randomUUID()], metric_id: 'district_cohort_v1', metric_version: 1,
        });
        await emit('verification_in_progress', 'verifier_review', 'claim.verifier_reviewing');
      }
    });
    return cid;
  }

  /** A determination of `cid` (a raw row — 0119-era, trusted as effective): `marks` default v1 stands / v2 discarded. */
  async function determine(d: Death, cid: string, marks?: Record<string, 'stands' | 'discarded'>): Promise<void> {
    await onOwnTx(pool, d.pariwarId, async (client) => {
      await client.query(`UPDATE nominee_determinations SET superseded_at = now(), superseded_reason = 'redetermined' WHERE claim_case_id = $1 AND superseded_at IS NULL`, [cid]);
      const { rows } = await client.query<{ determination_id: string }>(
        `INSERT INTO nominee_determinations (claim_case_id, pariwar_id, deceased_member_id, certificate_date_ciphertext, note_ciphertext, decided_by_actor_id, decided_by_display)
         VALUES ($1, $2, $3, 'enc:v1:certificate-date', 'enc:v1:note', 'da', 'Anita (District Admin)') RETURNING determination_id`,
        [cid, d.pariwarId, d.mid],
      );
      for (const [versionId, mark] of Object.entries(marks ?? { [d.v1]: 'stands', [d.v2]: 'discarded' })) {
        await client.query(`INSERT INTO nominee_determination_items (determination_id, version_id, pariwar_id, mark) VALUES ($1, $2, $3, $4)`, [rows[0]!.determination_id, versionId, d.pariwarId, mark]);
      }
    });
  }

  /** Refuse `cid` (in `verifier_review`) — `-239` unless `reason` — the projector + its LIVE decision row. */
  async function refuse(d: Death, cid: string, opts: { reason?: string; decidedAt?: Date } = {}): Promise<void> {
    await onOwnTx(pool, d.pariwarId, async (client) => {
      await claim.projectClaimState(client, {
        claimCaseId: ids.claimId(cid), pariwarId: ids.pariwarId(d.pariwarId), deceasedMemberId: ids.memberId(d.mid),
        intakeChannels: ['member_app'], claimantActorId: null, eventType: 'claim.verifier_denied',
        payload: { from_state: 'verifier_review', to_state: 'denied', trigger: 'test', actor: 'operator' } as never, actorId: DA,
      });
      await client.query(
        `INSERT INTO claim_verifier_decisions (claim_case_id, pariwar_id, outcome, reason_code, rationale_ciphertext, actor_id, actor_display, decided_at)
         VALUES ($1, $2, 'denied', $3, 'enc:v1:r', 'da', 'Anita (District Admin)', $4)`,
        [cid, d.pariwarId, opts.reason ?? 'post_death_nominee_change', opts.decidedAt ?? new Date()],
      );
    });
  }

  /** S: a claim of the death, determined (v1 stands / v2 discarded) and refused `-239`. */
  async function refusedS(d: Death, opts: { decidedAt?: Date; determined?: boolean } = {}): Promise<string> {
    const s = await claimOf(d, 'verifier_review');
    if (opts.determined !== false) await determine(d, s);
    await refuse(d, s, { decidedAt: opts.decidedAt });
    return s;
  }

  async function reviseOff(d: Death, cid: string, reason = 'other'): Promise<void> {
    await onOwnTx(pool, d.pariwarId, async (client) => {
      const { rows } = await client.query<{ decision_id: string }>(
        `UPDATE claim_verifier_decisions SET superseded_at = clock_timestamp() WHERE claim_case_id = $1 AND superseded_at IS NULL RETURNING decision_id`,
        [cid],
      );
      await client.query(
        `INSERT INTO claim_verifier_decisions (claim_case_id, pariwar_id, outcome, reason_code, rationale_ciphertext, actor_id, actor_display, supersedes_decision_id)
         VALUES ($1, $2, 'denied', $3, 'enc:v1:r', 'da', 'Anita (District Admin)', $4)`,
        [cid, d.pariwarId, reason, rows[0]!.decision_id],
      );
    });
  }

  async function openAppeal(d: Death, cid: string): Promise<void> {
    await onOwnTx(pool, d.pariwarId, (client) =>
      claim.initiateAppeal(client, { claimCaseId: ids.claimId(cid), pariwarId: ids.pariwarId(d.pariwarId), initiatedByActor: randomUUID(), initiatedOnBehalf: true, actor: 'operator' }),
    );
  }

  /** Allow S's appeal at stage 1 (the REAL writers) — RF6 closes the death's other closable claims. */
  async function allowAppeal(d: Death, cid: string): Promise<void> {
    await openAppeal(d, cid);
    await onOwnTx(pool, d.pariwarId, (client) =>
      claim.reviewAppealStage1(client, {
        claimCaseId: ids.claimId(cid), pariwarId: ids.pariwarId(d.pariwarId), decision: 'reversed', dispositionCategory: 'reconsideration_on_merits',
        reviewerActorId: randomUUID(), reviewerDisplay: 'Another District Admin', rationaleCiphertext: claim.prepareAppealCiphertext('enc:v1:appeal'), actor: 'operator',
      }),
    );
  }

  /** A contact record — a nominee-claimant linked to `linked`, or the claimant block (a REAL claimant mobile). */
  async function contact(d: Death, cid: string, opts: { linked?: string | null; locale?: 'hi' | 'en' } = {}): Promise<void> {
    const linked = opts.linked ?? null;
    await onOwnTx(pool, d.pariwarId, async (client) => {
      const db = bindScopedDb(client);
      const [agreement] = await db
        .insert(schema.consentRecords)
        .values({
          subjectId: ids.memberId(d.mid), pariwarId: ids.pariwarId(d.pariwarId), consentType: 'claim_contact_agreement', consentArtifactRef: cid,
          grantedViaActor: 'member_self', consentPayload: { checkboxTextShown: 'fixture', locale: 'en' }, grantedAt: new Date(Date.now() - 60_000),
        })
        .returning({ consentId: schema.consentRecords.consentId });
      await db.insert(schema.claimContacts).values({
        claimCaseId: ids.claimId(cid), pariwarId: ids.pariwarId(d.pariwarId), deceasedMemberId: ids.memberId(d.mid),
        claimantNomineeVersionId: linked as never,
        claimantNameCiphertext: linked === null ? await encryptField('Claimant', d.pariwarId, 'claim_contact', enc) : null,
        claimantMobileCiphertext: linked === null ? await encryptField(CLAIMANT, d.pariwarId, 'claim_contact', enc) : null,
        claimantAddressCiphertext: linked === null ? await encryptField('Address', d.pariwarId, 'claim_contact', enc) : null,
        agreementConsentId: agreement!.consentId, contactLocale: opts.locale ?? 'hi', recordedByActor: 'fixture', recordedVia: 'member_app',
      });
    });
  }

  // ── the harness ─────────────────────────────────────────────────────────────────────────────────────────────

  interface Harness {
    deps: ClaimSuspicionNoticeDeps;
    enqueued: { queue: string; data: JobEnvelope<SuspicionNoticePayload> }[];
    sent: SmsGatewayMessage[];
    alarms: string[];
    config: Record<string, string | null>;
    setNow: (d: Date) => void;
    configured: { value: boolean };
  }
  function harness(o: { gateway?: (m: SmsGatewayMessage) => Promise<string>; config?: Record<string, string | null>; resolveConfig?: (key: string) => Promise<string | null> } = {}): Harness {
    const enqueued: Harness['enqueued'] = [];
    const sent: SmsGatewayMessage[] = [];
    const alarms: string[] = [];
    const config: Record<string, string | null> = { ...(o.config ?? {}) };
    const configured = { value: true };
    let now = new Date();
    const smsAppClient: SmsAppClient = {
      isConfigured: () => configured.value,
      messaging: () => ({
        send: (m) => {
          sent.push(m);
          return (o.gateway ?? (() => Promise.resolve(`gw-${randomUUID()}`)))(m);
        },
      }),
    };
    const deps: ClaimSuspicionNoticeDeps = {
      pool,
      encryption: enc,
      smsAppClient,
      resolveConfig:
        o.resolveConfig ??
        (async (key) => {
          if (key in config) return config[key]!;
          if (key.startsWith('sms.dlt.template_id.suspicion_notice.')) return 'TPL-SUSPICION';
          if (key === `sms.claim_correction.helpline_number.${PARIWAR}` || key === `sms.claim_correction.helpline_number.${SHIELDED}`) return HELPLINE;
          return null;
        }),
      now: () => now,
      onAlarm: (m) => alarms.push(m),
      pariwarAllowlist: [PARIWAR, SHIELDED],
    };
    return { deps, enqueued, sent, alarms, config, configured, setNow: (d) => (now = d) };
  }
  const boss = (h: Harness) =>
    ({
      send: (queue: string, data: object) => {
        h.enqueued.push({ queue, data: data as JobEnvelope<SuspicionNoticePayload> });
        return Promise.resolve(randomUUID());
      },
    }) as unknown as Parameters<typeof runSuspicionNoticeSweep>[1];
  const childrenFor = (h: Harness, cid: string, purpose?: Purpose) =>
    h.enqueued.filter((e) => e.queue === SMS_QUEUE && e.data.payload.claimCaseId === cid && (purpose === undefined || e.data.payload.purpose === purpose));
  /** Sweep, then run every enqueued child of OUR claims (each a fresh job). Returns the child results. */
  async function tick(h: Harness, mine: readonly string[]) {
    h.enqueued.length = 0;
    await runSuspicionNoticeSweep(h.deps, boss(h));
    const out = [];
    for (const e of h.enqueued.filter((x) => mine.includes(x.data.payload.claimCaseId))) {
      out.push({ payload: e.data.payload, result: await runSuspicionNoticeChild(h.deps, e.data, randomUUID()) });
    }
    return out;
  }
  async function rowsOf(cid: string) {
    const { rows } = await pool.query<{ purpose: string; outcome: string; detail: string | null; recipient_version_id: string | null; recipient_number_hash: string | null; attempt_count: number; first_detail: string | null }>(
      `SELECT purpose, outcome, detail, recipient_version_id, recipient_number_hash, attempt_count, first_detail FROM claim_suspicion_notices WHERE claim_case_id = $1 ORDER BY purpose`,
      [cid],
    );
    return rows;
  }
  const textsTo = (h: Harness, mobile: string) => h.sent.filter((m) => m.to.endsWith(mobile));

  // ── (a) FQ7 B — the nominee in place at the death ────────────────────────────────────────────────────────────

  it('⭐ (a) ONE row + ONE text to A (…1111), Hindi, the FULL name, the helpline; a second run sends ⛔ nothing; ⛔ plaintext anywhere', async () => {
    const d = await seedDeath();
    const s = await refusedS(d);
    const h = harness();
    await tick(h, [s]);
    const a = h.sent.filter((m) => m.body.includes('दावा आगे नहीं बढ़ सका') && m.to.endsWith(A));
    expect(a).toHaveLength(1);
    expect(a[0]!.body).toBe(`${NAME} के लिए किया गया एक दावा आगे नहीं बढ़ सका। कृपया हेल्पलाइन ${HELPLINE} पर कॉल करें।`);
    expect(textsTo(h, B)).toEqual([]);
    const rows = await rowsOf(s);
    expect(rows.find((r) => r.purpose === 'suspicion_refusal')).toMatchObject({ outcome: 'accepted', recipient_version_id: d.v1, attempt_count: 1 });
    expect(rows.find((r) => r.purpose === 'suspicion_refusal')!.recipient_number_hash).toMatch(/.+/);
    // ⛔ plaintext — the queue payloads, the alarms and the rows.
    const blob = JSON.stringify({ enqueued: h.enqueued, alarms: h.alarms, rows });
    for (const secret of [A, B, CLAIMANT, NAME, 'Ramesh']) expect(blob).not.toContain(secret);
    // A second run: ⛔ text.
    const before = h.sent.length;
    await tick(h, [s]);
    expect(h.sent.length).toBe(before);
  });

  it('⭐ (a) the SHIELDED name mode (`-181`) — "Ramesh S."', async () => {
    const d = await seedDeath({ pariwarId: SHIELDED });
    const s = await refusedS(d);
    const h = harness();
    await tick(h, [s]);
    expect(textsTo(h, A).some((m) => m.body.startsWith('Ramesh S. के लिए'))).toBe(true);
    expect(h.sent.some((m) => m.body.includes('Kumar'))).toBe(false);
  });

  it('(a) a refusal revised away AFTER the sweep enqueued but BEFORE the child ⇒ ⛔ text, ⛔ row (a FRESH claim)', async () => {
    const d = await seedDeath();
    const s = await refusedS(d);
    const h = harness();
    await runSuspicionNoticeSweep(h.deps, boss(h));
    const [child] = childrenFor(h, s, 'suspicion_refusal');
    await reviseOff(d, s);
    expect(await runSuspicionNoticeChild(h.deps, child!.data, randomUUID())).toEqual({ status: 'skipped', reason: 'not_due' });
    expect((await rowsOf(s)).filter((r) => r.purpose === 'suspicion_refusal')).toEqual([]);
    expect(h.sent).toEqual([]);
  });

  it('(a) a revision away and BACK ⛔ never re-texts', async () => {
    const d = await seedDeath();
    const s = await refusedS(d);
    const h = harness();
    await tick(h, [s]);
    const once = textsTo(h, A).length;
    await reviseOff(d, s);
    await reviseOff(d, s, 'post_death_nominee_change');
    await tick(h, [s]);
    expect(textsTo(h, A).length).toBe(once);
  });

  it('(a) `no_target` — ⛔ effective determination; the erasure sentinel as the mobile; an ERASED name; ⛔ text for any', async () => {
    const h = harness();
    const d1 = await seedDeath();
    const undetermined = await refusedS(d1, { determined: false });
    const d2 = await seedDeath();
    const sentinel = await refusedS(d2);
    await onOwnTx(pool, PARIWAR, async (c) =>
      c.query('UPDATE member_nominee_versions SET mobile_ciphertext = $2 WHERE version_id = $1', [d2.v1, await encryptField('[anonymized]', PARIWAR, 'member_nominee', enc)]),
    );
    const d3 = await seedDeath({ kycName: '[anonymized]' });
    const erased = await refusedS(d3);
    await tick(h, [undetermined, sentinel, erased]);
    const of = async (cid: string) => (await rowsOf(cid)).find((r) => r.purpose === 'suspicion_refusal');
    expect(await of(undetermined)).toMatchObject({ outcome: 'no_target', detail: 'no_target:not_effective' });
    expect(await of(sentinel)).toMatchObject({ outcome: 'no_target', detail: 'no_target:no_sendable_number' });
    expect(await of(erased)).toMatchObject({ outcome: 'no_target', detail: 'name:erased' });
    expect(h.sent.some((m) => m.body.includes('[anonymized]'))).toBe(false);
    expect(h.sent.filter((m) => m.body.includes('एक दावा आगे नहीं बढ़ सका'))).toEqual([]);
  });

  // ── (c) `-293` item 1 B — the refused person ──────────────────────────────────────────────────────────────────

  it('⭐ (c) a NON-nominee filer ⇒ their contact mobile, in the claim\'s `contact_locale` (en), with the last date to appeal (DD-MM-YYYY)', async () => {
    const d = await seedDeath();
    const decidedAt = new Date(Date.now() - 5 * DAY);
    const s = await refusedS(d, { decidedAt });
    await contact(d, s, { linked: null, locale: 'en' });
    const h = harness();
    await tick(h, [s]);
    const until = claim.suspicionRefusalAppealUntil(decidedAt);
    const ddmmyyyy = `${until.slice(8, 10)}-${until.slice(5, 7)}-${until.slice(0, 4)}`;
    expect(textsTo(h, CLAIMANT).map((m) => m.body)).toEqual([
      `The claim for ${NAME} could not go ahead. It can be appealed until ${ddmmyyyy}. Please call the helpline ${HELPLINE}.`,
    ]);
    expect((await rowsOf(s)).find((r) => r.purpose === 'refusal_appeal_notice')).toMatchObject({ outcome: 'accepted', recipient_version_id: null });
  });

  it('⭐ (c) a nominee-filer linked to the POST-DEATH version ⇒ B; the TRUE nominee as refused filer gets BOTH texts', async () => {
    const h = harness();
    const d = await seedDeath();
    const changer = await refusedS(d);
    await contact(d, changer, { linked: d.v2 });
    const d2 = await seedDeath();
    const own = await refusedS(d2);
    await contact(d2, own, { linked: d2.v1 });
    await tick(h, [changer, own]);
    // The changer's claim: (a) to A, (c) to B — Hindi (`contact_locale` hi).
    expect((await rowsOf(changer)).map((r) => [r.purpose, r.outcome, r.recipient_version_id])).toEqual([
      ['refusal_appeal_notice', 'accepted', d.v2],
      ['suspicion_refusal', 'accepted', d.v1],
    ]);
    // The true nominee filed: (a) AND (c) both reach her (v1 for both).
    expect((await rowsOf(own)).map((r) => [r.purpose, r.recipient_version_id])).toEqual([
      ['refusal_appeal_notice', d2.v1],
      ['suspicion_refusal', d2.v1],
    ]);
    expect(h.sent.some((m) => m.to.endsWith(B) && m.body.includes('तक अपील की जा सकती है'))).toBe(true);
  });

  it('(c) an appeal FILED before the sweep ⇒ ⛔ text, ⛔ row; 90 days passed ⇒ ⛔ text, ⛔ row; ⛔ contact ⇒ `no_target`', async () => {
    const h = harness();
    const d1 = await seedDeath();
    const appealed = await refusedS(d1);
    await contact(d1, appealed);
    await openAppeal(d1, appealed);
    const d2 = await seedDeath();
    const passed = await refusedS(d2, { decidedAt: new Date(Date.now() - 100 * DAY) });
    await contact(d2, passed);
    const d3 = await seedDeath();
    const nobody = await refusedS(d3);
    await tick(h, [appealed, passed, nobody]);
    expect(childrenFor(h, appealed, 'refusal_appeal_notice')).toEqual([]);
    expect(childrenFor(h, passed, 'refusal_appeal_notice')).toEqual([]);
    expect((await rowsOf(appealed)).filter((r) => r.purpose === 'refusal_appeal_notice')).toEqual([]);
    expect((await rowsOf(passed)).filter((r) => r.purpose === 'refusal_appeal_notice')).toEqual([]);
    expect((await rowsOf(nobody)).find((r) => r.purpose === 'refusal_appeal_notice')).toMatchObject({ outcome: 'no_target', detail: 'no_target:no_contact_record' });
    expect(textsTo(h, CLAIMANT)).toEqual([]);
  });

  // ── (b) `-291` Q2 B — the closure text ─────────────────────────────────────────────────────────────────────────

  it('⭐ (b) R closed BEFORE its own determination ⇒ texted at S\'s as-of rank 1 (A); S re-determined to the post-death nominee afterwards ⇒ STILL A', async () => {
    const d = await seedDeath();
    const s = await refusedS(d);
    const r = await claimOf(d, 'documents_pending');
    await allowAppeal(d, s);
    // S (reversed — in the review window) re-determined so that its LIVE rank 1 is v2 (B).
    await determine(d, s, { [d.v1]: 'stands', [d.v2]: 'stands' });
    const h = harness();
    await tick(h, [r, s]);
    const closure = h.sent.filter((m) => m.body.includes('बंद कर दिया गया है'));
    expect(closure).toHaveLength(1);
    expect(closure[0]!.to.endsWith(A)).toBe(true);
    expect(closure[0]!.body).toBe(`${NAME} के लिए आपका दावा बंद कर दिया गया है। कृपया हेल्पलाइन ${HELPLINE} पर कॉल करें।`);
    expect((await rowsOf(r)).find((x) => x.purpose === 'closed_after_appeal')).toMatchObject({ outcome: 'accepted', recipient_version_id: d.v1 });
  });

  it('⭐ RB18 — a closed claim filed by the POST-DEATH nominee ⇒ a `no_target` row + ONE alarm, ⛔ text; silent on the second run', async () => {
    const d = await seedDeath();
    const s = await refusedS(d);
    const r = await claimOf(d, 'documents_pending');
    await contact(d, r, { linked: d.v2 });
    await allowAppeal(d, s);
    const h = harness();
    await tick(h, [r]);
    expect((await rowsOf(r)).find((x) => x.purpose === 'closed_after_appeal')).toMatchObject({ outcome: 'no_target', detail: 'excluded:claimant_discarded_version' });
    expect(h.alarms.filter((a) => a.includes(r) && a.includes('excluded_claimant'))).toHaveLength(1);
    expect(h.sent).toEqual([]);
    h.alarms.length = 0;
    await tick(h, [r]);
    expect(h.alarms.filter((a) => a.includes(r))).toEqual([]);
    expect(h.sent).toEqual([]);
  });

  it('(b) the true nominee\'s OWN claim, itself `-239`-refused, closed ⇒ texted (her own determination, linked to v1)', async () => {
    const d = await seedDeath();
    const s = await refusedS(d);
    const hers = await refusedS(d);
    await contact(d, hers, { linked: d.v1 });
    await allowAppeal(d, s);
    const h = harness();
    await tick(h, [hers]);
    expect((await rowsOf(hers)).find((x) => x.purpose === 'closed_after_appeal')).toMatchObject({ outcome: 'accepted', recipient_version_id: d.v1 });
  });

  it('(b) TWO claims of one death closed by the SAME reversal ⇒ two texts to one number (deliberate — once per closed claim)', async () => {
    const d = await seedDeath();
    const s = await refusedS(d);
    const r1 = await claimOf(d, 'documents_pending');
    const r2 = await claimOf(d, 'documents_pending');
    await allowAppeal(d, s);
    const h = harness();
    await tick(h, [r1, r2]);
    expect(h.sent.filter((m) => m.to.endsWith(A) && m.body.includes('बंद कर दिया गया है'))).toHaveLength(2);
  });

  it('(b) R undetermined AND S\'s as-of ⛔ effective ⇒ `no_target:closed_no_determination` + ONE alarm', async () => {
    const d = await seedDeath();
    const s = await refusedS(d, { determined: false });
    const r = await claimOf(d, 'documents_pending');
    await allowAppeal(d, s);
    const h = harness();
    await tick(h, [r]);
    expect((await rowsOf(r)).find((x) => x.purpose === 'closed_after_appeal')).toMatchObject({ outcome: 'no_target', detail: 'no_target:closed_no_determination' });
    expect(h.alarms.filter((a) => a.includes(r) && a.includes('closed_no_determination'))).toHaveLength(1);
  });

  // ── RB12 — a missing config never uses up the slot ──────────────────────────────────────────────────────────

  it('⭐ the template id UNSET (as shipped) ⇒ the sweep enqueues ⛔ child, writes ⛔ row, ONE end-of-run alarm naming the claim; set ⇒ sent next run', async () => {
    const d = await seedDeath();
    const s = await refusedS(d);
    const h = harness({ config: { 'sms.dlt.template_id.suspicion_notice.refusal_notice.hi': null } });
    await tick(h, [s]);
    expect(childrenFor(h, s, 'suspicion_refusal')).toEqual([]);
    expect((await rowsOf(s)).filter((r) => r.purpose === 'suspicion_refusal')).toEqual([]);
    expect(h.alarms.filter((a) => a.includes('HELD') && a.includes(s))).toHaveLength(1);
    delete h.config['sms.dlt.template_id.suspicion_notice.refusal_notice.hi'];
    await tick(h, [s]);
    expect((await rowsOf(s)).find((r) => r.purpose === 'suspicion_refusal')).toMatchObject({ outcome: 'accepted' });
  });

  it('`appeal_notice` with ONE locale\'s id unset ⇒ held (both are checked — its locale is known only under the lock)', async () => {
    const d = await seedDeath();
    const s = await refusedS(d);
    await contact(d, s, { locale: 'hi' });
    const h = harness({ config: { 'sms.dlt.template_id.suspicion_notice.appeal_notice.en': null } });
    await tick(h, [s]);
    expect(childrenFor(h, s, 'refusal_appeal_notice')).toEqual([]);
    expect((await rowsOf(s)).filter((r) => r.purpose === 'refusal_appeal_notice')).toEqual([]);
  });

  it.each([
    ['the helpline number missing', (h: Harness) => (h.config[`sms.claim_correction.helpline_number.${PARIWAR}`] = null)],
    ['the gateway unconfigured', (h: Harness) => (h.configured.value = false)],
  ])('%s ⇒ held, ⛔ row, the alarm', async (_label, gap) => {
    const d = await seedDeath();
    const s = await refusedS(d);
    const h = harness();
    gap(h);
    await tick(h, [s]);
    expect(childrenFor(h, s)).toEqual([]);
    expect(await rowsOf(s)).toEqual([]);
    expect(h.alarms.some((a) => a.includes('HELD') && a.includes(s))).toBe(true);
  });

  it('a TRANSIENT Secret Manager fault ⇒ held too (⛔ a slot spent on it)', async () => {
    const d = await seedDeath();
    const s = await refusedS(d);
    const h = harness({
      resolveConfig: async (key) => {
        if (key.startsWith('sms.dlt.template_id.suspicion_notice.')) throw Object.assign(new Error('unavailable'), { code: 14 });
        return HELPLINE;
      },
    });
    await tick(h, [s]);
    expect(childrenFor(h, s)).toEqual([]);
    expect(await rowsOf(s)).toEqual([]);
  });

  it('config VANISHING between the sweep\'s check and the child\'s ⇒ `held_config`, ⛔ row, an alarm', async () => {
    const d = await seedDeath();
    const s = await refusedS(d);
    const h = harness();
    await runSuspicionNoticeSweep(h.deps, boss(h));
    const [child] = childrenFor(h, s, 'suspicion_refusal');
    h.config['sms.dlt.template_id.suspicion_notice.refusal_notice.hi'] = null;
    expect(await runSuspicionNoticeChild(h.deps, child!.data, randomUUID())).toMatchObject({ status: 'held_config' });
    expect((await rowsOf(s)).filter((r) => r.purpose === 'suspicion_refusal')).toEqual([]);
    expect(h.alarms.some((a) => a.includes('HELD') && a.includes(s))).toBe(true);
  });

  it('⚠ edge (i) — config vanishing between the child\'s check and the SEND ⇒ `error` + alarm (the shared core\'s fail-closed)', async () => {
    const d = await seedDeath();
    const s = await refusedS(d);
    let templateReads = 0;
    const h = harness({
      resolveConfig: async (key) => {
        if (key === 'sms.dlt.template_id.suspicion_notice.refusal_notice.hi') return ++templateReads <= 2 ? 'TPL' : null;
        if (key.startsWith('sms.dlt.template_id.suspicion_notice.')) return 'TPL';
        return HELPLINE;
      },
    });
    await runSuspicionNoticeSweep(h.deps, boss(h)); // read 1
    const [child] = childrenFor(h, s, 'suspicion_refusal');
    await runSuspicionNoticeChild(h.deps, child!.data, randomUUID()); // read 2 (the guard), read 3 (the core) ⇒ null
    expect((await rowsOf(s)).find((r) => r.purpose === 'suspicion_refusal')).toMatchObject({ outcome: 'error', detail: 'config:dlt_template_id_missing' });
    expect(h.alarms.some((a) => a.includes('config:dlt_template_id_missing') && a.includes(s))).toBe(true);
  });

  // ── the provider classification, the reclaim and the give-up ──────────────────────────────────────────────────

  it.each([
    ['INVALID_NUMBER', 400, 'rejected_invalid_number'],
    ['CARRIER_REJECT', 400, 'rejected_unreachable'],
  ])('%s ⇒ %s (final)', async (code, status, outcome) => {
    const d = await seedDeath();
    const s = await refusedS(d);
    const h = harness({ gateway: () => Promise.reject(new SmsSendError('x', code, status)) });
    await tick(h, [s]);
    expect((await rowsOf(s)).find((r) => r.purpose === 'suspicion_refusal')).toMatchObject({ outcome });
  });

  it('a 503 ⇒ TRANSIENT: the row stays `attempting` (detail noted) and the child THROWS for a pg-boss retry', async () => {
    const d = await seedDeath();
    const s = await refusedS(d);
    const h = harness({ gateway: () => Promise.reject(new SmsSendError('x', 'X', 503)) });
    await runSuspicionNoticeSweep(h.deps, boss(h));
    const [child] = childrenFor(h, s, 'suspicion_refusal');
    await expect(runSuspicionNoticeChild(h.deps, child!.data, 'job-503')).rejects.toBeInstanceOf(ClaimCorrectionTransientError);
    expect((await rowsOf(s)).find((r) => r.purpose === 'suspicion_refusal')).toMatchObject({ outcome: 'attempting', detail: expect.stringMatching(/^api_unavailable:/) });
  });

  it('⭐ RB3 — a crash after the claiming commit is RECLAIMED by the next day\'s run (attempt 2); one left three IST days is GIVEN UP', async () => {
    const d = await seedDeath();
    const s = await refusedS(d);
    const d2 = await seedDeath();
    const s2 = await refusedS(d2);
    const today = new Date();
    // "Crash": the claiming transaction commits, the child dies before sending.
    for (const cid of [s, s2]) {
      await onOwnTx(pool, PARIWAR, (client) =>
        claim.beginSuspicionNotice(client, { pariwarId: ids.pariwarId(PARIWAR), claimCaseId: ids.claimId(cid), purpose: 'suspicion_refusal', jobId: 'crashed', now: today }),
      );
    }
    const h = harness();
    // Tomorrow — s is re-selected (an `attempting` row), a NEW job takes it over past the lease, and sends.
    h.setNow(new Date(today.getTime() + DAY));
    await tick(h, [s]);
    expect((await rowsOf(s)).find((r) => r.purpose === 'suspicion_refusal')).toMatchObject({ outcome: 'accepted', attempt_count: 2 });
    // s2 is never retried by a child here; three IST days on, the give-up finalises it.
    h.setNow(new Date(today.getTime() + 3 * DAY));
    h.alarms.length = 0;
    await runSuspicionNoticeSweep(h.deps, boss(h));
    expect((await rowsOf(s2)).find((r) => r.purpose === 'suspicion_refusal')).toMatchObject({ outcome: 'error', detail: 'exhausted:attempting_three_days' });
    expect(h.alarms.some((a) => a.includes('gave up') && a.includes(s2))).toBe(true);
  });
});
