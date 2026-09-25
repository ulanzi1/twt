// Story 6.21a — the death certificate's clear-date rule, at the DOMAIN (Task 8; AC1–AC4, AC8(i)–(iii), (v)).
//
// `2026-09-20-235` Y: only a certificate with a clear date is acceptable. `2026-09-20-236` BB: a rejection asks
// the family for another WITHOUT the claim being denied. Drives the REAL writers against real Postgres under
// PARIWAR_A scope, each test in its own rolled-back transaction:
//   · AC1 — the District Admin's accept (a row, an identity event, ⛔ no state move) and EVERY writer refusal;
//   · AC2 — a rejection is ⛔ not a denial: replay identical, ⛔ no decision row, ⛔ no appeal conflict;
//   · AC8(iii) — P1 / P3 × `no_certificate | not_reviewed | rejected | determination_stale` (incl. a NULL link),
//     then a PASS (P4 lives in `r9-voting.spec.ts`, beside its own R9 set-up);
//   · AC4 / D8 — the determination must carry the current ACCEPTED review, and 6.20's refusals keep their order;
//   · D6 / D16 — the upload predicate and the replacement trigger.
// The HTTP legs (the audit lines, access, the console) are the api specs'; the job legs (AC3) are the jobs'.

import { randomUUID } from 'node:crypto';

import { and, asc, eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import {
  DeathCertificateAcceptanceRequiredError,
  DeathCertificateReviewRefusedError,
  NomineeDeterminationRefusedError,
  adjudicateClaim,
  deathCertificateStatus,
  getOriginalDeciderActorIds,
  isDeathCertificateReplacementRequested,
  isDeathCertificateUploadAllowedInReviewWindow,
  isInDeathCertificateReviewWindow,
  listDeathCertificateHistory,
  NOMINEE_DETERMINATION_RECORDABLE_STATES,
  NOMINEE_NAME_CHECK_RECORDABLE_STATES,
  CLAIM_REVIEW_WINDOW_STATES,
  DEATH_CERTIFICATE_REVIEWABLE_STATES,
  projectClaimState,
  readDeathCertificateSnapshot,
  recordDeathCertificateReview,
  replayClaimState,
  voteOnFrozenClaim,
  type RecordDeathCertificateReviewInput,
} from '../../../src/claim/index.js';
import { claimId as toClaimId, memberId as toMemberId, type ClaimId, type MemberId } from '../../../src/ids/index.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import {
  PARIWAR_A,
  enterAppScope,
  fixtureAcceptedDateCiphertext,
  seedAcceptedDeathCertificate,
  seedDeathCertificate,
  seedNomineeDeclaration,
  seedNomineeDetermination,
  seedNomineeNameCheck,
  seedRejectedDeathCertificate,
} from '../_helpers.js';

const DISTRICT_ADMIN = 'd1d1d1d1-d1d1-d1d1-d1d1-d1d1d1d1d1d1';
const TRUSTEE = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1';
const PAST = '2026-03-10';

type Client = ReturnType<typeof getTx>['client'];
type Tx = ReturnType<typeof getTx>['tx'];

/** Drive a fresh claim to `target` through the projector (no accounts, no check, no certificate). */
async function driveTo(
  client: Client,
  claimCaseId: ClaimId,
  deceasedMemberId: MemberId,
  target: 'documents_pending' | 'verification_in_progress' | 'verifier_review' | 'verifier_approved',
): Promise<void> {
  const emit = (from: string | null, to: string, eventType: string, extra: Record<string, unknown> = {}) =>
    projectClaimState(client, {
      claimCaseId,
      pariwarId: PARIWAR_A,
      deceasedMemberId,
      intakeChannels: ['member_app'],
      claimantActorId: null,
      eventType: eventType as never,
      payload: { from_state: from, to_state: to, trigger: 'test', actor: 'system', ...extra },
      actorId: null,
    });
  await emit(null, 'intake_pending', 'claim.intake_initiated', {
    deceased_member_id: deceasedMemberId,
    intake_channel: 'member_app',
    claimant_actor_id: null,
  });
  await emit('intake_pending', 'intake_converged', 'claim.intake_converged');
  await emit('intake_converged', 'documents_pending', 'claim.documents_received');
  if (target === 'documents_pending') return;
  await emit('documents_pending', 'verification_in_progress', 'claim.peer_mesh_pinged', {
    selected_member_ids: [randomUUID()],
    metric_id: 'district_cohort_v1',
    metric_version: 1,
  });
  if (target === 'verification_in_progress') return;
  await emit('verification_in_progress', 'verifier_review', 'claim.verifier_reviewing');
  if (target === 'verifier_approved') await emit('verifier_review', 'verifier_approved', 'claim.verifier_approved');
}

async function freshClaim(target: Parameters<typeof driveTo>[3] = 'verifier_review') {
  const { client, tx } = getTx();
  await enterAppScope(client, PARIWAR_A);
  const cid = toClaimId(randomUUID());
  const mid = toMemberId(randomUUID());
  await driveTo(client, cid, mid, target);
  return { client, tx, cid, mid };
}

function accept(cid: ClaimId, token: string, over: Partial<RecordDeathCertificateReviewInput> = {}): RecordDeathCertificateReviewInput {
  return {
    claimCaseId: cid,
    pariwarId: PARIWAR_A,
    verdict: 'accepted',
    certificateToken: token,
    acceptedDate: PAST,
    acceptedDateCiphertext: fixtureAcceptedDateCiphertext(PAST),
    rejectionReason: null,
    noteCiphertext: 'enc:v1:note',
    expectedLiveReviewId: null,
    actorId: DISTRICT_ADMIN,
    actorDisplay: 'Anita (District Admin)',
    actor: 'operator',
    ...over,
  };
}

function reject(cid: ClaimId, token: string, over: Partial<RecordDeathCertificateReviewInput> = {}): RecordDeathCertificateReviewInput {
  return accept(cid, token, {
    verdict: 'rejected',
    acceptedDate: null,
    acceptedDateCiphertext: null,
    rejectionReason: 'date_of_death_unclear',
    ...over,
  });
}

const refusedWith = (reason: string) => (err: unknown) =>
  err instanceof DeathCertificateReviewRefusedError && err.reason === reason;

async function claimState(tx: Tx, cid: ClaimId) {
  const [r] = await tx.select({ s: schema.claims.currentState }).from(schema.claims).where(eq(schema.claims.claimCaseId, cid));
  return r?.s;
}

async function events(tx: Tx, cid: ClaimId) {
  return tx
    .select()
    .from(schema.eventsLog)
    .where(and(eq(schema.eventsLog.pariwarId, PARIWAR_A), eq(schema.eventsLog.streamId, cid)))
    .orderBy(asc(schema.eventsLog.eventVersion));
}

describe.skipIf(!hasDatabase)('Story 6.21a — the death certificate clear-date rule (:5433)', { timeout: 20000 }, () => {
  setupLiveDb();

  // ── The windows: ONE tuple, reused by identity (D3, T8) ────────────────────────────────────────────
  it('⭐ D3 — the review window IS 6.20’s determination window IS 6.18’s check window (same object, ⛔ never a copy)', () => {
    expect(DEATH_CERTIFICATE_REVIEWABLE_STATES).toBe(NOMINEE_DETERMINATION_RECORDABLE_STATES);
    expect(NOMINEE_DETERMINATION_RECORDABLE_STATES).toBe(NOMINEE_NAME_CHECK_RECORDABLE_STATES);
    expect(NOMINEE_NAME_CHECK_RECORDABLE_STATES).toBe(CLAIM_REVIEW_WINDOW_STATES);
  });

  // ── AC1 — accept ────────────────────────────────────────────────────────────────────────────────
  it('⭐ AC1 — an ACCEPT writes a review (Tier-1 date + note, snapshotted display) and ONE identity event; the state does ⛔ not move', async () => {
    const { client, tx, cid, mid } = await freshClaim('verifier_review');
    const { uploadId } = await seedDeathCertificate(client, { pariwarId: PARIWAR_A, claimCaseId: cid });
    const before = await events(tx, cid);

    const r = await recordDeathCertificateReview(client, accept(cid, uploadId.toUpperCase()));

    const [row] = await tx.select().from(schema.claimDeathCertificateReviews).where(eq(schema.claimDeathCertificateReviews.reviewId, r.reviewId));
    expect(row).toMatchObject({
      claimCaseId: cid,
      deceasedMemberId: mid,
      uploadId,
      verdict: 'accepted',
      rejectionReason: null,
      acceptedDateCiphertext: fixtureAcceptedDateCiphertext(PAST),
      noteCiphertext: 'enc:v1:note',
      decidedByActorId: DISTRICT_ADMIN,
      decidedByDisplay: 'Anita (District Admin)',
      supersededAt: null,
    });
    const after = await events(tx, cid);
    expect(after.length).toBe(before.length + 1);
    const ev = after.at(-1)!;
    expect(ev.eventType).toBe('claim.death_certificate_reviewed');
    expect(ev.payload).toEqual({
      from_state: 'verifier_review',
      to_state: 'verifier_review',
      trigger: 'death_certificate_review',
      actor: 'operator',
      review_id: r.reviewId,
      upload_id: uploadId,
      verdict: 'accepted',
      rejection_reason: null,
      supersedes_review_id: null,
    });
    // ⛔ T10 — ⛔ no date and ⛔ no note anywhere in the event.
    expect(JSON.stringify(ev.payload)).not.toContain(PAST);
    expect(JSON.stringify(ev.payload)).not.toContain('enc:v1');
    expect(await claimState(tx, cid)).toBe('verifier_review');
    expect(deathCertificateStatus(await readDeathCertificateSnapshot(tx, PARIWAR_A, cid))).toBe('accepted');
  });

  it('⭐ D4 — a date TODAY (IST) is accepted; tomorrow is refused `accept_future_date` — ⛔ never turned into a rejection', async () => {
    const { client, tx, cid } = await freshClaim();
    const { uploadId } = await seedDeathCertificate(client, { pariwarId: PARIWAR_A, claimCaseId: cid });
    const now = new Date('2026-06-15T20:00:00Z'); // 01:30 IST on 2026-06-16
    await expect(
      recordDeathCertificateReview(client, accept(cid, uploadId, { acceptedDate: '2026-06-17', now })),
    ).rejects.toSatisfy(refusedWith('accept_future_date'));
    // ⛔ Nothing was written — ⛔ not even a rejection.
    expect(await tx.select().from(schema.claimDeathCertificateReviews).where(eq(schema.claimDeathCertificateReviews.claimCaseId, cid))).toEqual([]);
    // The IST day boundary: 2026-06-16 IS today at 01:30 IST (it is still the 15th in UTC).
    await recordDeathCertificateReview(client, accept(cid, uploadId, { acceptedDate: '2026-06-16', now }));
  });

  // ── AC1 — every refusal, with its exact reason ───────────────────────────────────────────────────
  it('⭐ AC1 — the SHAPE refusals: missing_display, missing_note, invalid_date, reason_on_accept, missing_reason, date_on_reject', async () => {
    const { client, cid } = await freshClaim();
    const { uploadId } = await seedDeathCertificate(client, { pariwarId: PARIWAR_A, claimCaseId: cid });
    const legs: [string, RecordDeathCertificateReviewInput][] = [
      ['missing_display', accept(cid, uploadId, { actorDisplay: '  ' })],
      ['missing_note', accept(cid, uploadId, { noteCiphertext: '' })],
      ['invalid_date', accept(cid, uploadId, { acceptedDate: '2026-02-30' })],
      ['invalid_date', accept(cid, uploadId, { acceptedDate: null })],
      ['invalid_date', accept(cid, uploadId, { acceptedDateCiphertext: null })],
      ['reason_on_accept', accept(cid, uploadId, { rejectionReason: 'no_date_of_death' })],
      ['missing_reason', reject(cid, uploadId, { rejectionReason: null })],
      ['missing_reason', reject(cid, uploadId, { rejectionReason: 'looks_fake' as never })],
      ['date_on_reject', reject(cid, uploadId, { acceptedDate: PAST })],
    ];
    for (const [reason, input] of legs) {
      await expect(recordDeathCertificateReview(client, input), reason).rejects.toSatisfy(refusedWith(reason));
    }
  });

  it('⭐ AC1 — the STATE refusals: not_found, not_reviewable, no_certificate (none, and a legacy row), stale_certificate, stale_supersession', async () => {
    const { client, tx, cid } = await freshClaim();
    // not_found — another claim id.
    await expect(recordDeathCertificateReview(client, accept(toClaimId(randomUUID()), randomUUID()))).rejects.toSatisfy(refusedWith('not_found'));
    // no_certificate — no row at all.
    await expect(recordDeathCertificateReview(client, accept(cid, randomUUID()))).rejects.toSatisfy(refusedWith('no_certificate'));
    // no_certificate — a LEGACY row with ⛔ no upload row (T12): never reviewable.
    const legacy = await freshClaim();
    await legacy.tx.insert(schema.claimDocuments).values({
      claimDocumentId: randomUUID() as never,
      claimCaseId: legacy.cid,
      pariwarId: PARIWAR_A,
      documentType: 'death_certificate',
      storageObjectKey: `legacy/${randomUUID()}`,
      contentType: 'application/pdf',
      byteSize: 10,
      parityOutcome: 'match',
      parityFlags: {},
      ocrConfidence: 0.9,
      verifierReviewRequired: false,
    });
    await expect(recordDeathCertificateReview(client, accept(legacy.cid, randomUUID()))).rejects.toSatisfy(refusedWith('no_certificate'));
    // stale_certificate — a newer upload arrived after the District Admin opened the old one.
    const first = await seedDeathCertificate(client, { pariwarId: PARIWAR_A, claimCaseId: cid });
    await seedDeathCertificate(client, { pariwarId: PARIWAR_A, claimCaseId: cid });
    await expect(recordDeathCertificateReview(client, accept(cid, first.uploadId))).rejects.toSatisfy(refusedWith('stale_certificate'));
    // stale_supersession — a review landed after they opened it (they expected none).
    const current = (await readDeathCertificateSnapshot(tx, PARIWAR_A, cid)).currentUploadId!;
    const live = await recordDeathCertificateReview(client, reject(cid, current));
    await expect(recordDeathCertificateReview(client, accept(cid, current))).rejects.toSatisfy(refusedWith('stale_supersession'));
    await expect(
      recordDeathCertificateReview(client, accept(cid, current, { expectedLiveReviewId: randomUUID() })),
    ).rejects.toSatisfy(refusedWith('stale_supersession'));
    // …and with the right expectation it goes through (the positive control).
    await recordDeathCertificateReview(client, accept(cid, current, { expectedLiveReviewId: live.reviewId.toUpperCase() }));
    // not_reviewable — outside the window (documents_pending).
    const early = await freshClaim('documents_pending');
    const e = await seedDeathCertificate(client, { pariwarId: PARIWAR_A, claimCaseId: early.cid });
    await expect(recordDeathCertificateReview(client, accept(early.cid, e.uploadId))).rejects.toSatisfy(refusedWith('not_reviewable'));
  });

  // ── Supersession ─────────────────────────────────────────────────────────────────────────────────
  it('⭐ D1 — a re-review of the SAME upload is `re_reviewed`; a review after a REPLACEMENT stamps the old one `replaced`', async () => {
    const { client, tx, cid } = await freshClaim();
    const t0 = Date.now();
    const a = await seedDeathCertificate(client, { pariwarId: PARIWAR_A, claimCaseId: cid, uploadedAt: new Date(t0) });
    const r1 = await recordDeathCertificateReview(client, reject(cid, a.uploadId));
    const r2 = await recordDeathCertificateReview(client, accept(cid, a.uploadId, { expectedLiveReviewId: r1.reviewId }));
    expect(r2).toMatchObject({ supersededReviewId: r1.reviewId, supersessionReason: 're_reviewed' });

    const b = await seedDeathCertificate(client, { pariwarId: PARIWAR_A, claimCaseId: cid, uploadedAt: new Date(t0 + 60_000) });
    // Before the District Admin looks, the accepted review of the OLD upload is still live but ⛔ not current.
    const snap = await readDeathCertificateSnapshot(tx, PARIWAR_A, cid);
    expect(snap.liveReview?.reviewId).toBe(r2.reviewId);
    expect(snap.currentReview).toBeNull();
    expect(deathCertificateStatus(snap)).toBe('awaiting_review');

    const r3 = await recordDeathCertificateReview(client, reject(cid, b.uploadId, { expectedLiveReviewId: r2.reviewId }));
    expect(r3).toMatchObject({ supersededReviewId: r2.reviewId, supersessionReason: 'replaced' });
    const rows = await tx
      .select({ id: schema.claimDeathCertificateReviews.reviewId, reason: schema.claimDeathCertificateReviews.supersededReason })
      .from(schema.claimDeathCertificateReviews)
      .where(eq(schema.claimDeathCertificateReviews.claimCaseId, cid));
    expect(Object.fromEntries(rows.map((x) => [x.id, x.reason]))).toEqual({
      [r1.reviewId]: 're_reviewed',
      [r2.reviewId]: 'replaced',
      [r3.reviewId]: null,
    });
    // ⭐ invariant 3 — BOTH certificates are kept, each with its own object key.
    const { uploads: history, truncated } = await listDeathCertificateHistory(tx, PARIWAR_A, cid);
    expect(truncated).toBe(false);
    expect(history.map((h) => h.uploadId)).toEqual([b.uploadId, a.uploadId]);
    expect(history.map((h) => h.current)).toEqual([true, false]);
    expect(history[1]!.reviews.map((r) => r.reviewId)).toEqual([r2.reviewId, r1.reviewId]);
    expect(new Set(history.map((h) => h.storageObjectKey)).size).toBe(2);

    // ⭐ `truncated` at the EXACT boundary — 2 uploads exist; `limit: 2` must say `false` (nothing left out),
    // ⛔ never the `uploads.length >= limit` false positive a naive comparison would give here.
    expect((await listDeathCertificateHistory(tx, PARIWAR_A, cid, { limit: 2 })).truncated).toBe(false);
    // …and `limit: 1` (fewer than exist) must say `true`.
    expect((await listDeathCertificateHistory(tx, PARIWAR_A, cid, { limit: 1 })).truncated).toBe(true);
  });

  // ── AC2 — a rejection is ⛔ not a denial ─────────────────────────────────────────────────────────
  it('⭐⭐ AC2 — a REJECTION moves ⛔ no state (replay identical), writes ⛔ no decision row, and ⛔ never bars the District Admin from appeal review', async () => {
    const { client, tx, cid } = await freshClaim('verifier_review');
    await seedNomineeNameCheck(client, PARIWAR_A, cid, { certificate: 'skip' });
    const { uploadId } = await seedDeathCertificate(client, { pariwarId: PARIWAR_A, claimCaseId: cid });
    const replayBefore = replayClaimState(await events(tx, cid));

    await recordDeathCertificateReview(client, reject(cid, uploadId, { rejectionReason: 'no_date_of_death' }));

    expect(replayClaimState(await events(tx, cid))).toBe(replayBefore);
    expect(await claimState(tx, cid)).toBe('verifier_review');
    for (const t of [schema.claimVerifierDecisions, schema.claimStateTrusteeDecisions, schema.claimR9Votes, schema.claimR9VotingSessions]) {
      expect(await tx.select().from(t).where(eq(t.claimCaseId, cid))).toEqual([]);
    }
    const deciders = await getOriginalDeciderActorIds(tx, PARIWAR_A, cid);
    expect(deciders.verifierIds.has(DISTRICT_ADMIN)).toBe(false);
    expect(deciders.trusteeIds.has(DISTRICT_ADMIN)).toBe(false);
    const types = (await events(tx, cid)).map((e) => e.eventType);
    expect(types).toContain('claim.death_certificate_reviewed');
    expect(types).not.toContain('claim.verifier_denied');
    // ⭐ And the claim can still be DENIED for another reason — the rejection blocks approval only.
    await adjudicateClaim(client, {
      claimCaseId: cid,
      pariwarId: PARIWAR_A,
      outcome: 'denied',
      reasonCode: 'other',
      rationaleCiphertext: 'enc:v1:unrelated-ground',
      actorId: TRUSTEE,
      actorDisplay: 'Another Verifier',
      actor: 'operator',
    });
    expect(await claimState(tx, cid)).toBe('denied');
  });

  // ── AC8(iii) — P1 / P3 × the four reasons, then a PASS ────────────────────────────────────────────
  // Each row starts from a FULLY approvable claim (accepted certificate, determination, passing check) and
  // spoils exactly the certificate. `no_certificate` is built by never seeding one.
  const DEFICIENCIES = [
    {
      reason: 'no_certificate',
      build: async (client: Client, cid: ClaimId) => {
        await seedNomineeNameCheck(client, PARIWAR_A, cid, { certificate: 'skip' });
      },
    },
    {
      reason: 'not_reviewed',
      build: async (client: Client, cid: ClaimId) => {
        await seedNomineeNameCheck(client, PARIWAR_A, cid);
        await seedDeathCertificate(client, { pariwarId: PARIWAR_A, claimCaseId: cid }); // a replacement, unreviewed
      },
    },
    {
      reason: 'rejected',
      build: async (client: Client, cid: ClaimId) => {
        await seedNomineeNameCheck(client, PARIWAR_A, cid);
        await seedRejectedDeathCertificate(client, { pariwarId: PARIWAR_A, claimCaseId: cid }); // re-reviewed
      },
    },
    {
      reason: 'determination_stale',
      build: async (client: Client, cid: ClaimId) => {
        await seedNomineeNameCheck(client, PARIWAR_A, cid);
        // Re-reviewed ACCEPTED with another date: a NEW review, so the determination's link is stale.
        await seedAcceptedDeathCertificate(client, { pariwarId: PARIWAR_A, claimCaseId: cid, date: PAST });
      },
    },
    {
      reason: 'determination_stale',
      label: 'a NULL link (a 0119-era determination)',
      build: async (client: Client, cid: ClaimId) => {
        await seedNomineeNameCheck(client, PARIWAR_A, cid);
        // ⚠ Only the superuser can: `twt_app` holds ⛔ no UPDATE on the link.
        await client.query('RESET ROLE');
        await client.query(
          'UPDATE nominee_determinations SET death_certificate_review_id = NULL WHERE claim_case_id = $1 AND superseded_at IS NULL',
          [cid],
        );
        await enterAppScope(client, PARIWAR_A);
      },
    },
  ] as const;

  const refusedApproval = (reason: string) => (err: unknown) =>
    err instanceof DeathCertificateAcceptanceRequiredError && err.reason === reason;

  for (const d of DEFICIENCIES) {
    const label = 'label' in d ? d.label : d.reason;
    it(`⭐ P1 (adjudicateClaim) refuses APPROVE — ${label} — and the claim WAITS`, async () => {
      const { client, tx, cid } = await freshClaim('verifier_review');
      await d.build(client, cid);
      await expect(
        adjudicateClaim(client, {
          claimCaseId: cid,
          pariwarId: PARIWAR_A,
          outcome: 'approved',
          reasonCode: 'r8_90pct_met',
          rationaleCiphertext: null,
          actorId: DISTRICT_ADMIN,
          actorDisplay: 'Anita (District Admin)',
          actor: 'operator',
        }),
      ).rejects.toSatisfy(refusedApproval(d.reason));
      expect(await claimState(tx, cid)).toBe('verifier_review');
    });

    it(`⭐ P3 (voteOnFrozenClaim) refuses APPROVE — ${label} — and the claim WAITS`, async () => {
      const { client, tx, cid } = await freshClaim('verifier_approved');
      await d.build(client, cid);
      await expect(
        voteOnFrozenClaim(client, {
          claimCaseId: cid,
          pariwarId: PARIWAR_A,
          outcome: 'approved',
          reasonCode: null,
          rationaleCiphertext: null,
          actorId: TRUSTEE,
          actorDisplay: 'Trustee One',
          actor: 'trustee',
        }),
      ).rejects.toSatisfy(refusedApproval(d.reason));
      expect(await claimState(tx, cid)).toBe('verifier_approved');
    });
  }

  it('⭐ AC4 — after a re-review, a FRESH determination + a FRESH name check clears `determination_stale` and P1 approves', async () => {
    const { client, tx, cid } = await freshClaim('verifier_review');
    await seedNomineeNameCheck(client, PARIWAR_A, cid);
    await seedAcceptedDeathCertificate(client, { pariwarId: PARIWAR_A, claimCaseId: cid, date: PAST });
    // A fresh determination against the NEW accepted review (its own date) …
    await seedNomineeDetermination(client, PARIWAR_A, cid, { certificateDate: PAST });
    // … moves the declaration token, so the name check must be re-recorded too (D8's admin-copy point).
    await seedNomineeNameCheck(client, PARIWAR_A, cid, { reuseAccounts: true });
    await adjudicateClaim(client, {
      claimCaseId: cid,
      pariwarId: PARIWAR_A,
      outcome: 'approved',
      reasonCode: 'r8_90pct_met',
      rationaleCiphertext: null,
      actorId: DISTRICT_ADMIN,
      actorDisplay: 'Anita (District Admin)',
      actor: 'operator',
    });
    expect(await claimState(tx, cid)).toBe('verifier_approved');
  });

  // ── AC4 / D8 — the determination's link ─────────────────────────────────────────────────────────
  it('⭐ D8 — a determination is refused `certificate_not_accepted` with no certificate, a rejected one, or a stale review id; the link is STORED', async () => {
    const { client, tx, cid } = await freshClaim('verification_in_progress');
    const refused = (err: unknown) => err instanceof NomineeDeterminationRefusedError && err.reason === 'certificate_not_accepted';
    // No certificate at all.
    await expect(seedNomineeDetermination(client, PARIWAR_A, cid, { certificate: 'skip' })).rejects.toSatisfy(refused);
    // A rejected one.
    await seedRejectedDeathCertificate(client, { pariwarId: PARIWAR_A, claimCaseId: cid });
    await expect(seedNomineeDetermination(client, PARIWAR_A, cid, { certificate: 'skip' })).rejects.toSatisfy(refused);
    // An accepted one, but a DIFFERENT (random) review id.
    const reviewId = await seedAcceptedDeathCertificate(client, { pariwarId: PARIWAR_A, claimCaseId: cid, date: PAST });
    await expect(seedNomineeDetermination(client, PARIWAR_A, cid, { certificate: 'skip' })).rejects.toSatisfy(refused);
    // The right one — stored.
    const d = await seedNomineeDetermination(client, PARIWAR_A, cid, { certificateDate: PAST });
    const [row] = await tx
      .select({ link: schema.nomineeDeterminations.deathCertificateReviewId })
      .from(schema.nomineeDeterminations)
      .where(eq(schema.nomineeDeterminations.determinationId, d.determinationId));
    expect(row!.link).toBe(reviewId);
  });

  it('⭐ D8 — the REFUSAL ORDER: a 6.20 refusal keeps its own reason even when the certificate is also missing', async () => {
    // Outside the window — 6.20's `not_recordable` answers, ⛔ not `certificate_not_accepted`.
    const early = await freshClaim('documents_pending');
    await expect(seedNomineeDetermination(early.client, PARIWAR_A, early.cid, { certificate: 'skip' })).rejects.toSatisfy(
      (err: unknown) => err instanceof NomineeDeterminationRefusedError && err.reason === 'not_recordable',
    );
    // In the window, NO certificate, and a version left UNMARKED — 6.20's `missing_item` answers first.
    const { client, tx, cid, mid } = await freshClaim('verification_in_progress');
    await seedNomineeDeclaration(tx, PARIWAR_A, mid);
    await expect(seedNomineeDetermination(client, PARIWAR_A, cid, { certificate: 'skip', marks: [] })).rejects.toSatisfy(
      (err: unknown) => err instanceof NomineeDeterminationRefusedError && err.reason === 'missing_item',
    );
    // …and with every 6.20 validation satisfied, the certificate refusal is what remains (non-vacuity).
    await expect(seedNomineeDetermination(client, PARIWAR_A, cid, { certificate: 'skip' })).rejects.toSatisfy(
      (err: unknown) => err instanceof NomineeDeterminationRefusedError && err.reason === 'certificate_not_accepted',
    );
  });

  // ── D6 / D16 — the upload predicate and the replacement trigger ──────────────────────────────────
  it('⭐ D6 — the upload predicate is open for `missing` and `rejected`, closed for `accepted` and `awaiting_review`', () => {
    expect(isDeathCertificateUploadAllowedInReviewWindow('missing')).toBe(true);
    expect(isDeathCertificateUploadAllowedInReviewWindow('rejected')).toBe(true);
    expect(isDeathCertificateUploadAllowedInReviewWindow('accepted')).toBe(false);
    expect(isDeathCertificateUploadAllowedInReviewWindow('awaiting_review')).toBe(false);
    expect(isInDeathCertificateReviewWindow('verification_in_progress')).toBe(true);
    expect(isInDeathCertificateReviewWindow('documents_pending')).toBe(false);
    expect(isInDeathCertificateReviewWindow('denied')).toBe(false);
  });

  it('⭐ D16 — `isDeathCertificateReplacementRequested` is true ONLY for a rejected certificate IN the window', async () => {
    const { client, tx, cid } = await freshClaim('verifier_review');
    expect(await isDeathCertificateReplacementRequested(tx, PARIWAR_A, cid)).toBe(false); // missing
    const { uploadId } = await seedDeathCertificate(client, { pariwarId: PARIWAR_A, claimCaseId: cid });
    expect(await isDeathCertificateReplacementRequested(tx, PARIWAR_A, cid)).toBe(false); // awaiting review
    await recordDeathCertificateReview(client, reject(cid, uploadId));
    expect(await isDeathCertificateReplacementRequested(tx, PARIWAR_A, cid)).toBe(true); // ⭐ rejected
    await seedDeathCertificate(client, { pariwarId: PARIWAR_A, claimCaseId: cid });
    expect(await isDeathCertificateReplacementRequested(tx, PARIWAR_A, cid)).toBe(false); // a replacement arrived
    // ⛔ A claim that LEFT the window is ⛔ not chased, even with a current rejection.
    const gone = await freshClaim('verifier_review');
    await seedRejectedDeathCertificate(client, { pariwarId: PARIWAR_A, claimCaseId: gone.cid });
    expect(await isDeathCertificateReplacementRequested(tx, PARIWAR_A, gone.cid)).toBe(true);
    await adjudicateClaim(client, {
      claimCaseId: gone.cid,
      pariwarId: PARIWAR_A,
      outcome: 'denied',
      reasonCode: 'other',
      rationaleCiphertext: 'enc:v1:unrelated-ground',
      actorId: TRUSTEE,
      actorDisplay: 'Another Verifier',
      actor: 'operator',
    });
    expect(await isDeathCertificateReplacementRequested(tx, PARIWAR_A, gone.cid)).toBe(false);
  });
});
