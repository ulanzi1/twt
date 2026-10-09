// Story 6.24b — the filing code to the nominee in place at the death, through HTTP (:5433). `-262` FQ6 B; `2026-10-07-292`
// RF9; `2026-10-08-295` RB8, RB9. AC6b.
//
// The declaration history (REAL envelopes, a DISTINCT mobile per version): v1 — nominee A, …1111, declared BEFORE the
// death; v2 — nominee B, …2222, declared AFTER it (so `member_nominees`, the latest, is B). The District Admin's
// determination on the refused claim S (through the REAL writer, against an accepted certificate dated the death) marks v1
// `stands` / v2 `discarded`; S is refused `-239` (the projector + its live decision row).
//
//   · a standing refusal ⇒ the code goes to A (…1111), the audit says `recipient: 'at_death'`, ⛔ A's number in the audit;
//   · before any refusal / after S's appeal is allowed / after a revision off `-239` / a CLOSED S1 ⇒ the latest (B, …2222);
//   · a standing refusal whose determination is ⛔ effective, or whose rank-1 mobile is the erasure sentinel or unsendable
//     ⇒ the existence-defended no-op (the SAME body as the ⛔-nominee branch, zero deliveries) — ⛔ never …2222;
//   · two nominees ⇒ rank 1; two refusals ⇒ the most recently CREATED refused claim; a malformed envelope ⇒ 500 on BOTH paths;
//   · F17 — today's `member_claim.handover_otp_send` line asserted (none existed).

import { randomUUID } from 'node:crypto';

import { claim, encryption, ids, nominee } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import { signAccessToken } from '../../../src/modules/auth/member/tokens.js';
import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { encryptNomineeField } from '../../../src/modules/nominee/nominee-crypto.js';
import { createTestApp, hasDatabase, teardown, type TestApp } from '../_setup.js';
import { ensureAcceptedDeathCertificate } from '../_nominee-name-check-fixture.js';

const ACCESS_TTL_MS = 15 * 60 * 1000;
const DAY = 86_400_000;
const DEATH = '2026-05-01';
const BEFORE_DEATH = new Date('2026-01-10T06:00:00.000Z');
const AFTER_DEATH = new Date('2026-06-01T06:00:00.000Z');
const A = '+919876501111';
const B = '+919876502222';
const C = '+919876503333';

type Scope = Awaited<ReturnType<typeof openScopeTx>>;
interface World {
  readonly pariwarId: string;
  readonly memberId: string;
}

async function inScope<T>(t: TestApp, pariwarId: string, fn: (s: Scope) => Promise<T>): Promise<T> {
  const s = await openScopeTx(t.deps, pariwarId);
  try {
    const out = await fn(s);
    await closeScopeTx(s, true);
    return out;
  } catch (err) {
    await closeScopeTx(s, false);
    throw err;
  }
}

/** Append ONE declaration (one nominee per mobile, rank order) at `recordedAt`, through the real domain writers. */
async function declare(t: TestApp, s: Scope, w: World, mobiles: readonly string[], recordedAt: Date): Promise<void> {
  const pid = ids.pariwarId(w.pariwarId);
  const mid = ids.memberId(w.memberId);
  const rows = await Promise.all(
    mobiles.map(async (m, i) => ({
      rank: (i + 1) as 1 | 2,
      splitPct: (mobiles.length === 1 ? 100 : i === 0 ? 75 : 25) as 100 | 75 | 25,
      relationship: i === 0 ? 'spouse' : 'son',
      nameCiphertext: await encryptNomineeField(`Nominee ${i + 1}`, w.pariwarId, t.deps.encryption),
      mobileCiphertext: await encryptNomineeField(m, w.pariwarId, t.deps.encryption),
      addressCiphertext: null,
    })),
  );
  await nominee.replaceMemberNominees(s.tx, { memberId: mid, pariwarId: pid, nominees: rows });
  await nominee.appendMemberDeclarationVersions(s.tx, {
    memberId: mid,
    pariwarId: pid,
    plan: nominee.planDeclarationVersions(await nominee.getNomineeVersionHeads(s.tx, pid, mid), rows.map((r) => r.rank)),
    nominees: rows,
    recordedAt,
    eventVersion: null,
  });
}

/** The deceased (a member row) + v1 (pre-death, `pre`) + v2 (post-death, `post`) in a FRESH Pariwar. */
async function seedWorld(t: TestApp, pre: readonly string[] = [A], post: readonly string[] = [B]): Promise<World> {
  const w = { pariwarId: randomUUID(), memberId: randomUUID() };
  await inScope(t, w.pariwarId, async (s) => {
    await s.client.query(
      `INSERT INTO members (member_id, pariwar_id, state, state_event_version, created_at, updated_at) VALUES ($1, $2, 'active', 0, now(), now())`,
      [w.memberId, w.pariwarId],
    );
    await declare(t, s, w, pre, BEFORE_DEATH);
    if (post.length > 0) await declare(t, s, w, post, AFTER_DEATH);
  });
  return w;
}

const emitter = (s: Scope, w: World, claimCaseId: string) =>
  (from: string | null, to: string, eventType: string, extra: Record<string, unknown> = {}) =>
    claim.projectClaimState(s.client, {
      claimCaseId: ids.claimId(claimCaseId), pariwarId: ids.pariwarId(w.pariwarId), deceasedMemberId: ids.memberId(w.memberId),
      intakeChannels: ['helpline'], claimantActorId: null, eventType: eventType as never,
      payload: { from_state: from, to_state: to, trigger: 'seed', actor: 'system', ...extra } as never, actorId: null,
    });

/**
 * A claim of the death in `verifier_review` (events); with `certificateDate`, a District Admin determination through the
 * REAL writer, every version marked by D6 against that date (the writer refuses a mark that disagrees).
 */
async function claimInReview(t: TestApp, w: World, opts: { certificateDate?: string } = {}): Promise<string> {
  const cid = randomUUID();
  await inScope(t, w.pariwarId, async (s) => {
    const emit = emitter(s, w, cid);
    await emit(null, 'intake_pending', 'claim.intake_initiated', { deceased_member_id: w.memberId, intake_channel: 'helpline', claimant_actor_id: null });
    await emit('intake_pending', 'intake_converged', 'claim.intake_converged');
    await emit('intake_converged', 'documents_pending', 'claim.documents_received');
    await emit('documents_pending', 'verification_in_progress', 'claim.peer_mesh_pinged', {
      selected_member_ids: [randomUUID()], metric_id: 'district_cohort_v1', metric_version: 1,
    });
    await emit('verification_in_progress', 'verifier_review', 'claim.verifier_reviewing');
  });
  if (opts.certificateDate) {
    const date = opts.certificateDate;
    await inScope(t, w.pariwarId, async (s) => {
      const pid = ids.pariwarId(w.pariwarId);
      const reviewId = await ensureAcceptedDeathCertificate(t.deps, s, w.pariwarId, cid, { date });
      const versions = await nominee.listNomineeDeclarationVersions(s.tx, pid, ids.memberId(w.memberId));
      const head = (rank: number) =>
        versions.filter((v) => v.rank === rank).reduce<number | null>((m, v) => Math.max(m ?? 0, v.versionNo), null);
      await claim.recordNomineeDetermination(s.client, {
        claimCaseId: ids.claimId(cid),
        pariwarId: pid,
        certificateDate: date,
        certificateDateCiphertext: 'enc:v1:certificate-date',
        noteCiphertext: 'enc:v1:determination-note',
        marks: versions.map((v) => ({ versionId: v.versionId, mark: claim.versionStandsAt(v.effectiveAt, date) ? ('stands' as const) : ('discarded' as const) })),
        watermark: { rank1: head(1), rank2: head(2) },
        expectedLiveDeterminationId: null,
        deathCertificateReviewId: reviewId,
        certificateDateCheck: 'match',
        actorId: randomUUID(),
        actorDisplay: 'Anita (District Admin)',
        actor: 'operator',
      });
    });
  }
  return cid;
}

/** Refuse `cid` (in `verifier_review`) on `reason` — the projector + its LIVE decision row. */
async function refuse(t: TestApp, w: World, cid: string, opts: { reason?: string; decidedAt?: Date } = {}): Promise<void> {
  await inScope(t, w.pariwarId, async (s) => {
    await emitter(s, w, cid)('verifier_review', 'denied', 'claim.verifier_denied');
    await s.client.query(
      `INSERT INTO claim_verifier_decisions (claim_case_id, pariwar_id, outcome, reason_code, rationale_ciphertext, actor_id, actor_display, decided_at)
       VALUES ($1, $2, 'denied', $3, 'enc:v1:r', $4, 'Anita (District Admin)', $5)`,
      [cid, w.pariwarId, opts.reason ?? 'post_death_nominee_change', randomUUID(), opts.decidedAt ?? new Date()],
    );
  });
}

/** S refused `-239` with an effective determination (v1 stands, v2 discarded). */
async function refusedS(t: TestApp, w: World, opts: { decidedAt?: Date; certificateDate?: string } = {}): Promise<string> {
  const s = await claimInReview(t, w, { certificateDate: opts.certificateDate ?? DEATH });
  await refuse(t, w, s, { decidedAt: opts.decidedAt });
  return s;
}

/** Allow S's appeal at stage 1 through the REAL writers (closes the death's other claims — RF6). */
async function allowAppeal(t: TestApp, w: World, cid: string): Promise<void> {
  await inScope(t, w.pariwarId, async (s) => {
    const pid = ids.pariwarId(w.pariwarId);
    const c = ids.claimId(cid);
    await claim.initiateAppeal(s.client, { claimCaseId: c, pariwarId: pid, initiatedByActor: randomUUID(), initiatedOnBehalf: true, actor: 'operator' });
    await claim.reviewAppealStage1(s.client, {
      claimCaseId: c, pariwarId: pid, decision: 'reversed', dispositionCategory: 'reconsideration_on_merits',
      reviewerActorId: randomUUID(), reviewerDisplay: 'Another District Admin',
      rationaleCiphertext: claim.prepareAppealCiphertext('enc:v1:appeal'), actor: 'operator',
    });
  });
}

/** Set the version's mobile ciphertext (as the app role — `GRANT UPDATE (mobile_ciphertext)`, 0119). */
async function setVersionMobile(t: TestApp, w: World, versionId: string, ciphertext: string): Promise<void> {
  await inScope(t, w.pariwarId, async (s) => {
    await s.client.query(`UPDATE member_nominee_versions SET mobile_ciphertext = $2 WHERE version_id = $1`, [versionId, ciphertext]);
  });
}

async function versionsOf(t: TestApp, w: World) {
  return inScope(t, w.pariwarId, (s) => nominee.listNomineeDeclarationVersions(s.tx, ids.pariwarId(w.pariwarId), ids.memberId(w.memberId)));
}

async function send(t: TestApp, w: World): Promise<{ status: number; body: Record<string, unknown> }> {
  const res = await t.app.inject({
    method: 'POST',
    url: '/api/v1/member/claims/handover-otp',
    payload: {},
    headers: {
      origin: 'http://localhost:3001',
      authorization: `Bearer ${signAccessToken(t.app, { memberId: w.memberId, pariwarId: w.pariwarId, deviceId: 'test-device' }, ACCESS_TTL_MS)}`,
    },
  });
  let body: Record<string, unknown> = {};
  try {
    body = res.json();
  } catch {
    body = {};
  }
  return { status: res.statusCode, body };
}

/** The `member_claim.handover_otp_send` lines of THIS death (the `auditsFor` filter form). */
const sendAudits = (t: TestApp, w: World) =>
  t.auditSink.ofType('member_claim.handover_otp_send').filter((e) => (e.context as Record<string, unknown> | undefined)?.deceased_member_id === w.memberId);

const recipientOf = (t: TestApp, w: World) => (sendAudits(t, w).at(-1)?.context as Record<string, unknown> | undefined)?.recipient;

/** The ⛔-nominee branch's body — what every no-op must equal. */
const NO_OP_BODY = { sent: true, nomineeMobileMasked: '' };

async function withApp(fn: (t: TestApp) => Promise<void>): Promise<void> {
  const t = await createTestApp();
  try {
    await fn(t);
  } finally {
    await teardown(t);
  }
}

describe.skipIf(!hasDatabase)('Story 6.24b — the filing code to the nominee in place at the death (:5433)', { timeout: 30000 }, () => {
  it('F17 — TODAY\'s send audit line (⛔ refusal): masked hint, delivered, `recipient: latest`, an OTP tag, ⛔ number', async () => {
    await withApp(async (t) => {
      const w = await seedWorld(t);
      const res = await send(t, w);
      expect(res.status).toBe(200);
      expect(res.body).toStrictEqual({ sent: true, nomineeMobileMasked: encryption.maskMobile(B) });
      const [line] = sendAudits(t, w);
      expect(line!.context).toStrictEqual({
        deceased_member_id: w.memberId,
        nominee_mobile_masked: encryption.maskMobile(B),
        delivered: true,
        recipient: 'latest',
        otp_audit_tag: expect.any(String),
      });
      expect(t.stepUpDelivery.last?.resolvedMobile).toBe(B);
    });
  });

  it('⭐ a standing `-239` refusal ⇒ the code goes to A (…1111), `recipient: at_death`, ⛔ A\'s number in the audit', async () => {
    await withApp(async (t) => {
      const w = await seedWorld(t);
      await refusedS(t, w);
      const res = await send(t, w);
      expect(res.status).toBe(200);
      expect(res.body).toStrictEqual({ sent: true, nomineeMobileMasked: encryption.maskMobile(A) });
      expect(String(res.body.nomineeMobileMasked).endsWith('1111')).toBe(true);
      expect(t.stepUpDelivery.deliveries).toHaveLength(1);
      expect(t.stepUpDelivery.last?.resolvedMobile).toBe(A);
      expect(recipientOf(t, w)).toBe('at_death');
      const audits = JSON.stringify(sendAudits(t, w));
      expect(audits).toContain(encryption.maskMobile(A));
      // AC6b — ⛔ A's number ANYWHERE in the captured audit events (every type, ⛔ only the send lines).
      const everything = JSON.stringify(t.auditSink.events);
      expect(t.auditSink.events.length).toBeGreaterThan(0);
      expect(everything).not.toContain('9876501111');
      expect(everything).not.toContain(A);
    });
  });

  it('before any refusal (S determined, ⛔ refused) ⇒ the latest (…2222), `recipient: latest`', async () => {
    await withApp(async (t) => {
      const w = await seedWorld(t);
      await claimInReview(t, w, { certificateDate: DEATH });
      await send(t, w);
      expect(t.stepUpDelivery.last?.resolvedMobile).toBe(B);
      expect(recipientOf(t, w)).toBe('latest');
    });
  });

  it('after S\'s appeal is ALLOWED (the anchor `reversed` — F36) ⇒ the latest', async () => {
    await withApp(async (t) => {
      const w = await seedWorld(t);
      const s = await refusedS(t, w);
      await allowAppeal(t, w, s);
      await send(t, w);
      expect(t.stepUpDelivery.last?.resolvedMobile).toBe(B);
      expect(recipientOf(t, w)).toBe('latest');
    });
  });

  it('after a revision OFF `-239` ⇒ the latest', async () => {
    await withApp(async (t) => {
      const w = await seedWorld(t);
      const s = await refusedS(t, w);
      await inScope(t, w.pariwarId, async (sc) => {
        const { rows } = await sc.client.query<{ decision_id: string }>(
          `UPDATE claim_verifier_decisions SET superseded_at = clock_timestamp() WHERE claim_case_id = $1 AND superseded_at IS NULL RETURNING decision_id`,
          [s],
        );
        await sc.client.query(
          `INSERT INTO claim_verifier_decisions (claim_case_id, pariwar_id, outcome, reason_code, rationale_ciphertext, actor_id, actor_display, supersedes_decision_id)
           VALUES ($1, $2, 'denied', 'other', 'enc:v1:r', $3, 'Anita (District Admin)', $4)`,
          [s, w.pariwarId, randomUUID(), rows[0]!.decision_id],
        );
      });
      await send(t, w);
      expect(t.stepUpDelivery.last?.resolvedMobile).toBe(B);
      expect(recipientOf(t, w)).toBe('latest');
    });
  });

  it('a CLOSED refused claim: S1 and S2 both refused, S2\'s appeal allowed ⇒ S1 `closed` ⇒ the latest', async () => {
    await withApp(async (t) => {
      const w = await seedWorld(t);
      const s1 = await refusedS(t, w);
      const s2 = await refusedS(t, w);
      await allowAppeal(t, w, s2);
      const state = await inScope(t, w.pariwarId, async (sc) =>
        (await sc.client.query<{ s: string }>(`SELECT current_state AS s FROM claims WHERE claim_case_id = $1`, [s1])).rows[0]?.s,
      );
      expect(state).toBe('closed');
      await send(t, w);
      expect(t.stepUpDelivery.last?.resolvedMobile).toBe(B);
      expect(recipientOf(t, w)).toBe('latest');
    });
  });

  it('a standing refusal whose determination is ⛔ effective (⛔ determination) ⇒ the no-op, `at_death`, ⛔ …2222', async () => {
    await withApp(async (t) => {
      const w = await seedWorld(t);
      const s = await claimInReview(t, w);
      await refuse(t, w, s);
      const res = await send(t, w);
      expect(res.status).toBe(200);
      expect(res.body).toStrictEqual(NO_OP_BODY);
      expect(t.stepUpDelivery.deliveries).toHaveLength(0);
      expect(recipientOf(t, w)).toBe('at_death');
    });
  });

  it('the rank-1 mobile is the ERASURE SENTINEL ⇒ the no-op, `at_death`', async () => {
    await withApp(async (t) => {
      const w = await seedWorld(t);
      await refusedS(t, w);
      const v1 = (await versionsOf(t, w)).find((v) => v.effectiveAt.getTime() === BEFORE_DEATH.getTime())!;
      await setVersionMobile(t, w, v1.versionId, await encryptNomineeField('[anonymized]', w.pariwarId, t.deps.encryption));
      const res = await send(t, w);
      expect(res.body).toStrictEqual(NO_OP_BODY);
      expect(t.stepUpDelivery.deliveries).toHaveLength(0);
      expect(recipientOf(t, w)).toBe('at_death');
    });
  });

  it('the rank-1 mobile is UNSENDABLE (a non-Indian number) ⇒ the no-op, `at_death` — ⛔ never …2222', async () => {
    await withApp(async (t) => {
      const w = await seedWorld(t, ['+1 415 555 0100']);
      await refusedS(t, w);
      const res = await send(t, w);
      expect(res.body).toStrictEqual(NO_OP_BODY);
      expect(t.stepUpDelivery.deliveries).toHaveLength(0);
      expect(recipientOf(t, w)).toBe('at_death');
    });
  });

  it('the ⛔-nominee branch (⛔ refusal, ⛔ nominee) is the SAME body — the one `noOp` helper', async () => {
    await withApp(async (t) => {
      const w = { pariwarId: randomUUID(), memberId: randomUUID() };
      await inScope(t, w.pariwarId, (s) =>
        s.client.query(
          `INSERT INTO members (member_id, pariwar_id, state, state_event_version, created_at, updated_at) VALUES ($1, $2, 'active', 0, now(), now())`,
          [w.memberId, w.pariwarId],
        ),
      );
      const res = await send(t, w);
      expect(res.body).toStrictEqual(NO_OP_BODY);
      expect(recipientOf(t, w)).toBe('latest');
    });
  });

  it('a TWO-nominee effective set ⇒ rank 1 (A), ⛔ rank 2 (C)', async () => {
    await withApp(async (t) => {
      const w = await seedWorld(t, [A, C], [B, C]);
      await refusedS(t, w);
      await send(t, w);
      expect(t.stepUpDelivery.deliveries).toHaveLength(1);
      expect(t.stepUpDelivery.last?.resolvedMobile).toBe(A);
    });
  });

  it('⭐ two standing refusals ⇒ the most recently CREATED refused claim\'s determination (created OPPOSITE to the refusals)', async () => {
    await withApp(async (t) => {
      const w = await seedWorld(t);
      // S_old: created FIRST, refused LAST, its certificate dated AFTER both versions ⇒ its rank 1 is v2 (B).
      const sOld = await claimInReview(t, w, { certificateDate: '2026-07-01' });
      // S_new: created LAST, refused FIRST, dated the death ⇒ its rank 1 is v1 (A). RF1's order is the CLAIM's created_at.
      const sNew = await claimInReview(t, w, { certificateDate: DEATH });
      await refuse(t, w, sNew, { decidedAt: new Date(Date.now() - 5 * DAY) });
      await refuse(t, w, sOld, { decidedAt: new Date(Date.now() - 1 * DAY) });
      await send(t, w);
      expect(t.stepUpDelivery.last?.resolvedMobile).toBe(A);
      expect(recipientOf(t, w)).toBe('at_death');
    });
  });

  it('a MALFORMED envelope ⇒ 500 on the at-death path (RB9 — ⛔ swallowed into the no-op)', async () => {
    await withApp(async (t) => {
      const w = await seedWorld(t);
      await refusedS(t, w);
      const v1 = (await versionsOf(t, w)).find((v) => v.effectiveAt.getTime() === BEFORE_DEATH.getTime())!;
      await setVersionMobile(t, w, v1.versionId, 'enc:v1:not-an-envelope');
      expect((await send(t, w)).status).toBe(500);
      expect(t.stepUpDelivery.deliveries).toHaveLength(0);
    });
  });

  it('…and on the latest path (today\'s behaviour, unchanged)', async () => {
    await withApp(async (t) => {
      const w = await seedWorld(t);
      await inScope(t, w.pariwarId, (s) =>
        s.client.query(`UPDATE member_nominees SET mobile_ciphertext = 'enc:v1:not-an-envelope' WHERE member_id = $1`, [w.memberId]),
      );
      expect((await send(t, w)).status).toBe(500);
      expect(t.stepUpDelivery.deliveries).toHaveLength(0);
    });
  });
});
