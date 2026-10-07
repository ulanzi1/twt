// Story 6.21a — the death certificate's clear-date rule over HTTP (Task 8; AC1, AC2, AC4, AC5, AC8(i), (vi),
// (vii); D6, D8, D9, D10).
//
// Real routes, real sessions, real Postgres (:5433), each test minting its own Pariwar:
//   · AC1 — the District Admin's ACCEPT and every HTTP-reachable REFUSAL, each with its wire code AND its
//     `_review_rejected` audit line (ids and codes only — ⛔ never the date, ⛔ never the note);
//   · AC2 — a REJECTION moves ⛔ no state, and the approval route answers the certificate 409 (⛔ never a denial);
//   · AC5 / D10 — the console item's review status and the SERVER-SIDE `viewer.canReview` split; the history
//     (every upload, the dates and notes decrypted) and its audit line;
//   · AC8(vii) — cross-Pariwar denial, a tampered session pinned to 404 with a positive control, 403 without the key;
//   · D6 — the upload window: a missing or rejected certificate may be sent inside the review window; an
//     accepted or unreviewed one refuses BEFORE storage and the queue; every other type keeps today's 409;
//   · D8 — 6.20's timeline carries the accepted date; a determination with another date, or with ⛔ no accepted
//     certificate, is refused.

import { randomUUID } from 'node:crypto';

import { claim, ids, member as memberDomain } from '@twt/domain';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { AppDeps } from '../../../src/context.js';
import * as service from '../../../src/modules/auth/admin/admin-auth.service.js';
import { signAccessToken } from '../../../src/modules/auth/member/tokens.js';
import { encryptDeathCertificateReviewField } from '../../../src/modules/claims/death-certificate-crypto.js';
import { deathDateBlindIndex } from '../../../src/modules/claims/ground-inspection-crypto.js';
import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { buildServer } from '../../../src/server.js';
import { ensureAcceptedDeathCertificate, insertDeathCertificate, seedNomineeNameCheck } from '../_nominee-name-check-fixture.js';
import { buildTestDeps, hasDatabase, makeClient, type TestDeps } from '../_setup.js';
import { FakeWebAuthnProvider } from '../_webauthn-fake.js';

type Client = ReturnType<typeof makeClient>;
type Json = Record<string, unknown>;

const ACCEPTED = '2026-05-01';
const NOTE = 'ZZ-REVIEW-NOTE-PLAINTEXT';

function multipart(bytes: Buffer, filename: string, contentType: string): { body: Buffer; ct: string } {
  const boundary = `----twt${randomUUID().replace(/-/g, '')}`;
  const head = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${contentType}\r\n\r\n`,
  );
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
  return { body: Buffer.concat([head, bytes, tail]), ct: `multipart/form-data; boundary=${boundary}` };
}

describe.skipIf(!hasDatabase)('Story 6.21a — the death-certificate review surface — E2E (:5433)', { timeout: 30000 }, () => {
  let td: TestDeps;
  let deps: AppDeps;
  let app: Awaited<ReturnType<typeof buildServer>>;
  let fakeWebauthn: FakeWebAuthnProvider;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    fakeWebauthn = new FakeWebAuthnProvider();
    td = await buildTestDeps({ webauthn: fakeWebauthn });
    deps = td.deps;
    app = await buildServer(deps);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    const c = await td.pool.connect();
    try {
      if (createdUserIds.length > 0) {
        await c.query(`DELETE FROM admin_sessions WHERE sess ->> 'userId' = ANY($1)`, [createdUserIds]);
        await c.query(`DELETE FROM role_grants WHERE user_id = ANY($1)`, [createdUserIds]);
        await c.query(`DELETE FROM users WHERE id = ANY($1)`, [createdUserIds]);
      }
    } finally {
      c.release();
    }
    await td.pool.end();
  });

  async function authenticate(displayName: string | null): Promise<{ client: Client; userId: string }> {
    const email = `dc-${randomUUID()}@example.test`;
    const password = 'CorrectHorseBatteryStaple9';
    const userId = await service.createAdminAccount(deps, { email, password });
    createdUserIds.push(userId);
    if (displayName !== null) await service.setAdminDisplayName(deps, userId, displayName);
    const credentialId = `cred-${userId}`;
    fakeWebauthn.nextRegistration = { verified: true, credential: { id: credentialId, publicKey: 'pk', counter: 0 } };
    fakeWebauthn.nextAuthentication = { verified: true, newCounter: 1 };
    const client = makeClient(app);
    const token = service.mintEnrollmentToken(deps, userId);
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/register/options', payload: { enrollmentToken: token } });
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/register/verify', payload: { response: { id: 'b' }, enrollmentToken: token } });
    await client.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email, password } });
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/authenticate/options', payload: {} });
    const verify = await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/authenticate/verify', payload: { response: { id: credentialId } } });
    expect(verify.statusCode).toBe(200);
    return { client, userId };
  }

  async function actor(pariwarId: string, role: string, dim: 'district' | 'pariwar', value: string, name: string | null = 'Anita (District Admin)') {
    const { client, userId } = await authenticate(name);
    await td.pool.query(
      `INSERT INTO role_grants (user_id, pariwar_id, role, scope_dimension, scope_value) VALUES ($1, $2, $3, $4, $5)`,
      [userId, pariwarId, role, dim, value],
    );
    await client.inject({ method: 'POST', url: '/api/v1/auth/scope', payload: { pariwarId } });
    return { client, userId };
  }

  async function inScope<T>(pariwarId: string, fn: (s: Awaited<ReturnType<typeof openScopeTx>>) => Promise<T>): Promise<T> {
    const s = await openScopeTx(deps, pariwarId);
    try {
      const out = await fn(s);
      await closeScopeTx(s, true);
      return out;
    } catch (err) {
      await closeScopeTx(s, false);
      throw err;
    }
  }

  type Target = 'intake_converged' | 'documents_pending' | 'verifier_review';

  /** A claim with a posting district, driven to `target`. */
  async function world(target: Target = 'verifier_review') {
    const pariwarId = randomUUID();
    const district = `D-${randomUUID().slice(0, 8)}`;
    const memberId = randomUUID();
    const claimCaseId = randomUUID();
    await inScope(pariwarId, async (s) => {
      const mid = ids.memberId(memberId);
      const pid = ids.pariwarId(pariwarId);
      await memberDomain.projectMemberState(s.client, {
        memberId: mid,
        pariwarId: pid,
        eventType: 'member.signup_initiated',
        payload: { from_state: null, to_state: 'pending-kyc', trigger: 'signup', actor: 'member' },
        actorId: memberId,
      });
      await s.client.query(
        `INSERT INTO member_postings (member_id, pariwar_id, district, is_retirement, created_at) VALUES ($1, $2, $3, false, now())`,
        [memberId, pariwarId, district],
      );
      const emit = (from: string | null, to: string, eventType: string, extra: Json = {}) =>
        claim.projectClaimState(s.client, {
          claimCaseId: ids.claimId(claimCaseId),
          pariwarId: pid,
          deceasedMemberId: mid,
          intakeChannels: ['helpline'],
          claimantActorId: null,
          eventType: eventType as never,
          payload: { from_state: from, to_state: to, trigger: 'seed', actor: 'system', ...extra } as never,
          actorId: null,
        });
      await emit(null, 'intake_pending', 'claim.intake_initiated', { deceased_member_id: memberId, intake_channel: 'helpline', claimant_actor_id: null });
      await emit('intake_pending', 'intake_converged', 'claim.intake_converged');
      if (target === 'intake_converged') return;
      await emit('intake_converged', 'documents_pending', 'claim.documents_received');
      if (target === 'documents_pending') return;
      await emit('documents_pending', 'verification_in_progress', 'claim.peer_mesh_pinged', {
        selected_member_ids: [randomUUID()],
        metric_id: 'district_cohort_v1',
        metric_version: 1,
      });
      await emit('verification_in_progress', 'verifier_review', 'claim.verifier_reviewing');
    });
    return { pariwarId, district, memberId, claimCaseId };
  }

  type World = Awaited<ReturnType<typeof world>>;

  const certificate = (w: World) => inScope(w.pariwarId, (s) => insertDeathCertificate(s, w.pariwarId, w.claimCaseId));
  const snapshot = (w: World) =>
    inScope(w.pariwarId, (s) => claim.readDeathCertificateSnapshot(s.tx, ids.pariwarId(w.pariwarId), ids.claimId(w.claimCaseId)));
  const reject = (w: World) =>
    inScope(w.pariwarId, async (s) => {
      const snap = await claim.readDeathCertificateSnapshot(s.tx, ids.pariwarId(w.pariwarId), ids.claimId(w.claimCaseId));
      return claim.recordDeathCertificateReview(s.client, {
        claimCaseId: ids.claimId(w.claimCaseId),
        pariwarId: ids.pariwarId(w.pariwarId),
        verdict: 'rejected',
        certificateToken: snap.currentUploadId!,
        acceptedDate: null,
        acceptedDateCiphertext: null,
        rejectionReason: 'date_of_death_unclear',
        noteCiphertext: await encryptDeathCertificateReviewField('rejected in the fixture', w.pariwarId, deps.encryption),
        expectedLiveReviewId: (snap.liveReview?.reviewId as string | undefined) ?? null,
        actorId: randomUUID(),
        actorDisplay: 'Fixture DA',
        actor: 'operator',
      });
    });

  const base = (p: string, c: string) => `/api/v1/p/${p}/admin/claims/${c}`;
  const reviewUrl = (w: World) => `${base(w.pariwarId, w.claimCaseId)}/death-certificate/review`;
  const historyUrl = (w: World) => `${base(w.pariwarId, w.claimCaseId)}/death-certificate/history`;
  const errCode = (b: Json) => String((b.error as Json | undefined)?.code);
  const auditsFor = (type: string, claimCaseId: string) =>
    td.auditSink.ofType(type).filter((e) => (e.context as Json | undefined)?.claim_case_id === claimCaseId);

  async function acceptBody(w: World, over: Json = {}): Promise<Json> {
    const snap = await snapshot(w);
    return {
      verdict: 'accepted',
      certificate_token: snap.currentUploadId ?? randomUUID(),
      accepted_date: ACCEPTED,
      // Story 6.26b (GI8; RD20) — every HTTP accept records the government register check.
      register_check: 'matches',
      note: NOTE,
      expected_live_review_id: snap.liveReview?.reviewId ?? null,
      ...over,
    };
  }

  // ── AC1 — the accept, audited with ids only ─────────────────────────────────────────────────────
  it('⭐ AC1 — the District Admin ACCEPTS: 201, a review row, ⛔ no state move, and ONE `_reviewed` audit line with ids only', async () => {
    const w = await world();
    const { uploadId } = await certificate(w);
    const { client } = await actor(w.pariwarId, 'district_admin', 'district', w.district);

    const res = await client.inject({ method: 'POST', url: reviewUrl(w), payload: await acceptBody(w) });
    expect(res.statusCode, res.body).toBe(201);
    const body = res.json() as Json;
    expect(body).toMatchObject({ claim_case_id: w.claimCaseId, verdict: 'accepted', superseded_review_id: null });
    const snap = await snapshot(w);
    expect(claim.deathCertificateStatus(snap)).toBe('accepted');
    expect(snap.currentReview?.reviewId).toBe(body.review_id);
    const [state] = (await td.pool.query('SELECT current_state FROM claims WHERE claim_case_id = $1', [w.claimCaseId])).rows;
    expect(state.current_state).toBe('verifier_review');

    const lines = auditsFor('admin_claim.death_certificate_reviewed', w.claimCaseId);
    expect(lines).toHaveLength(1);
    // Story 6.26b (RD17) — the success audit carries the register check: a plaintext non-PII code.
    expect(lines[0]!.context).toMatchObject({ review_id: body.review_id, upload_id: uploadId, verdict: 'accepted', register_check: 'matches' });
    // ⛔ T10 — ⛔ no date, ⛔ no note, anywhere in the line.
    expect(JSON.stringify(lines[0])).not.toContain(ACCEPTED);
    expect(JSON.stringify(lines[0])).not.toContain(NOTE);

    // ⭐ Story 6.26b (GI8; RD12) — the row stores the code and the accepted date's index under the ONE field class (the
    // index the inspection's would carry for the same date); ⛔ the index is never in the audit line.
    const [row] = (
      await td.pool.query('SELECT register_check, accepted_date_index FROM claim_death_certificate_reviews WHERE review_id = $1', [body.review_id])
    ).rows;
    expect(row.register_check).toBe('matches');
    expect(row.accepted_date_index).toBe(await deathDateBlindIndex(ACCEPTED, w.pariwarId, deps.encryption));
    expect(JSON.stringify(lines[0])).not.toContain(row.accepted_date_index);
    // GI16 — the `claim.death_certificate_reviewed` event payload carries ⛔ no register check (only the audit does).
    const [ev] = (
      await td.pool.query(
        `SELECT payload FROM events_log WHERE stream_id = $1 AND event_type = 'claim.death_certificate_reviewed' ORDER BY event_version DESC LIMIT 1`,
        [w.claimCaseId],
      )
    ).rows;
    expect(ev.payload).not.toHaveProperty('register_check');
    expect(JSON.stringify(ev.payload)).not.toContain(row.accepted_date_index);
  });

  it('⭐ AC1 — every HTTP-reachable REFUSAL returns its exact wire code AND is audited `_review_rejected` with its reason', async () => {
    const w = await world();
    await certificate(w);
    const { client } = await actor(w.pariwarId, 'district_admin', 'district', w.district);
    const legs: [string, Json][] = [
      ['invalid_date', await acceptBody(w, { accepted_date: '2026-02-30' })],
      ['invalid_date', await acceptBody(w, { accepted_date: undefined })],
      ['accept_future_date', await acceptBody(w, { accepted_date: '2099-01-01' })],
      // The contract is deliberately LOOSE on `note` (⛔ no `.min(1)`) so this refusal reaches the wire.
      ['missing_note', await acceptBody(w, { note: '   ' })],
      ['reason_on_accept', await acceptBody(w, { rejection_reason: 'no_date_of_death' })],
      ['missing_reason', await acceptBody(w, { verdict: 'rejected', accepted_date: undefined })],
      ['date_on_reject', await acceptBody(w, { verdict: 'rejected', rejection_reason: 'no_date_of_death' })],
      ['stale_certificate', await acceptBody(w, { certificate_token: randomUUID() })],
      ['stale_supersession', await acceptBody(w, { expected_live_review_id: randomUUID() })],
      // Story 6.26b (GI8; RD15) — after the four shape guards (the reject rows ABOVE carry `register_check` from
      // `acceptBody` and keep their own codes — `missing_reason`, `date_on_reject` answer first).
      ['register_check_required', await acceptBody(w, { register_check: undefined })],
      ['register_check_not_allowed', await acceptBody(w, { verdict: 'rejected', accepted_date: undefined, rejection_reason: 'no_date_of_death' })],
    ];
    for (const [reason, payload] of legs) {
      const res = await client.inject({ method: 'POST', url: reviewUrl(w), payload });
      expect(res.statusCode, `${reason}: ${res.body}`).toBe(409);
      expect(errCode(res.json() as Json), reason).toBe(`death_certificate_review.${reason}`);
    }
    const reasons = auditsFor('admin_claim.death_certificate_review_rejected', w.claimCaseId).map((l) => (l.context as Json).reason);
    expect(reasons).toEqual(legs.map(([r]) => r));
    for (const l of auditsFor('admin_claim.death_certificate_review_rejected', w.claimCaseId)) {
      expect(JSON.stringify(l)).not.toContain(NOTE);
    }
    // ⛔ Nothing was written by any of them.
    expect((await snapshot(w)).liveReview).toBeNull();

    // not_reviewable (outside the window) and no_certificate (⛔ none at all) — each on its own claim.
    const early = await world('documents_pending');
    await certificate(early);
    const da2 = await actor(early.pariwarId, 'district_admin', 'district', early.district);
    const r1 = await da2.client.inject({ method: 'POST', url: reviewUrl(early), payload: await acceptBody(early) });
    expect(errCode(r1.json() as Json)).toBe('death_certificate_review.not_reviewable');
    const bare = await world();
    const da3 = await actor(bare.pariwarId, 'district_admin', 'district', bare.district);
    const r2 = await da3.client.inject({ method: 'POST', url: reviewUrl(bare), payload: await acceptBody(bare) });
    expect(errCode(r2.json() as Json)).toBe('death_certificate_review.no_certificate');
    expect(auditsFor('admin_claim.death_certificate_review_rejected', bare.claimCaseId).map((l) => (l.context as Json).reason)).toEqual([
      'no_certificate',
    ]);
  });

  it('⭐ AC1 — an actor with ⛔ NO display name is refused before the domain, and STILL audited `_review_rejected` (nothing written)', async () => {
    const w = await world();
    await certificate(w);
    const { client } = await actor(w.pariwarId, 'district_admin', 'district', w.district, null);
    const res = await client.inject({ method: 'POST', url: reviewUrl(w), payload: await acceptBody(w) });
    expect(res.statusCode).toBe(409);
    expect(auditsFor('admin_claim.death_certificate_review_rejected', w.claimCaseId)).toHaveLength(1);
    expect((await snapshot(w)).liveReview).toBeNull();
  });

  // ── AC2 — a rejection is ⛔ not a denial; the approval WAITS ─────────────────────────────────────
  it('⭐⭐ AC2 — REJECT: 201, ⛔ no state move; the verifier APPROVE then answers 409 `…death_certificate_acceptance_required` (reason `rejected`)', async () => {
    const w = await world();
    await seedNomineeNameCheck(deps, w.pariwarId, w.claimCaseId); // approvable in every other respect
    const { client } = await actor(w.pariwarId, 'district_admin', 'district', w.district);
    const snap = await snapshot(w);
    const res = await client.inject({
      method: 'POST',
      url: reviewUrl(w),
      payload: {
        verdict: 'rejected',
        certificate_token: snap.currentUploadId,
        rejection_reason: 'no_date_of_death',
        note: NOTE,
        expected_live_review_id: snap.liveReview?.reviewId ?? null,
      },
    });
    expect(res.statusCode, res.body).toBe(201);
    const approve = await client.inject({
      method: 'POST',
      url: `${base(w.pariwarId, w.claimCaseId)}/verifier-decision`,
      payload: { outcome: 'approved', reason_code: 'r8_90pct_met' },
    });
    expect(approve.statusCode, approve.body).toBe(409);
    const err = (approve.json() as Json).error as Json;
    expect(err.code).toBe('verifier_decision.death_certificate_acceptance_required');
    expect(err.details).toMatchObject({ reason: 'rejected' });
    const [state] = (await td.pool.query('SELECT current_state FROM claims WHERE claim_case_id = $1', [w.claimCaseId])).rows;
    expect(state.current_state).toBe('verifier_review');
  });

  // ── AC5 / D10 — the console item + the viewer split ──────────────────────────────────────────────
  it('⭐ AC5 — the console item carries the review status, token and live id; `viewer.canReview` is TRUE for the District Admin and FALSE for a verifier; ⛔ no decrypted date', async () => {
    const w = await world();
    await seedNomineeNameCheck(deps, w.pariwarId, w.claimCaseId, { certificate: 'skip' });
    await inScope(w.pariwarId, (s) => ensureAcceptedDeathCertificate(deps, s, w.pariwarId, w.claimCaseId, { date: ACCEPTED }));
    const snap = await snapshot(w);
    const item = async (client: Client) => {
      const res = await client.inject({ method: 'GET', url: `${base(w.pariwarId, w.claimCaseId)}/verifier-console` });
      expect(res.statusCode, res.body).toBe(200);
      expect(res.body).not.toContain(ACCEPTED); // T10 — the accepted date ⛔ never rides the packet
      const dr = ((res.json() as Json).packet as Json).documentReview as Json;
      return (dr.reviews as Json[]).find((r) => r.documentType === 'death_certificate')!;
    };
    const da = await actor(w.pariwarId, 'district_admin', 'district', w.district);
    const daItem = await item(da.client);
    expect(daItem.review).toMatchObject({
      status: 'accepted',
      rejectionReason: null,
      decidedByDisplay: 'Anita (District Admin)',
      liveReviewId: snap.liveReview!.reviewId,
      certificateToken: snap.currentUploadId,
      viewer: { canReview: true },
    });
    const verifier = await actor(w.pariwarId, 'verifier', 'district', w.district, 'Vikram (Verifier)');
    expect(((await item(verifier.client)).review as Json).viewer).toEqual({ canReview: false });
    // ⛔ and the verifier's POST is a 403 — the route's key is the boundary, the flag is UI only.
    const res = await verifier.client.inject({ method: 'POST', url: reviewUrl(w), payload: await acceptBody(w) });
    expect(res.statusCode).toBe(403);
  });

  // ── AC5 / D9 — the history ───────────────────────────────────────────────────────────────────────
  it('⭐ AC5 — the HISTORY lists EVERY upload newest first (the unreviewed replacement included), with previews and the DECRYPTED date + note; ONE audit line, ids only', async () => {
    const w = await world();
    const first = await certificate(w);
    const { client } = await actor(w.pariwarId, 'district_admin', 'district', w.district);
    const accepted = await client.inject({ method: 'POST', url: reviewUrl(w), payload: await acceptBody(w) });
    expect(accepted.statusCode, accepted.body).toBe(201);
    // Re-reviewed as REJECTED, then a replacement nobody has reviewed yet.
    await reject(w);
    const second = await inScope(w.pariwarId, (s) => insertDeathCertificate(s, w.pariwarId, w.claimCaseId, { uploadedAt: new Date(Date.now() + 60_000) }));

    const verifier = await actor(w.pariwarId, 'verifier', 'district', w.district, 'Vikram (Verifier)');
    const res = await verifier.client.inject({ method: 'GET', url: historyUrl(w) });
    expect(res.statusCode, res.body).toBe(200);
    const uploads = (res.json() as Json).uploads as Json[];
    expect(uploads.map((u) => u.upload_id)).toEqual([second.uploadId, first.uploadId]);
    expect(uploads.map((u) => u.current)).toEqual([true, false]);
    expect(uploads[0]!.reviews).toEqual([]);
    const reviews = uploads[1]!.reviews as Json[];
    expect(reviews.map((r) => r.verdict)).toEqual(['rejected', 'accepted']);
    expect(reviews[1]).toMatchObject({ accepted_date: { state: 'readable', value: ACCEPTED }, note: { state: 'readable', value: NOTE }, superseded_reason: 're_reviewed' });
    // Story 6.26b (GI8) — the register check on the history: the accepted review's code; ⛔ none on the rejected one.
    expect(reviews.map((r) => r.register_check)).toEqual([null, 'matches']);
    expect((uploads[1]!.preview as Json).signed_url).toBeTruthy();

    const lines = auditsFor('admin_death_certificate.history_read', w.claimCaseId);
    expect(lines).toHaveLength(1);
    expect(lines[0]!.context).toMatchObject({ upload_count: 2, review_count: 2 });
    expect(JSON.stringify(lines[0])).not.toContain(ACCEPTED);
    expect(JSON.stringify(lines[0])).not.toContain(NOTE);
  });

  // ── AC8(vii) — access ────────────────────────────────────────────────────────────────────────────
  it('⭐ AC8(vii) — CROSS-PARIWAR: a District Admin of X reaches NEITHER route for Y (⛔ no body, ⛔ no write); the same client reaches X', async () => {
    const x = await world();
    const y = await world();
    await certificate(x);
    await certificate(y);
    const { client } = await actor(x.pariwarId, 'district_admin', 'district', x.district);
    for (const [method, url, payload] of [
      ['POST', reviewUrl(y), await acceptBody(y)],
      ['GET', historyUrl(y), undefined],
    ] as const) {
      const res = await client.inject({ method, url, payload: payload as Json | undefined });
      expect([403, 404], `${method} ${url}`).toContain(res.statusCode);
      expect(res.body).not.toContain(y.claimCaseId);
    }
    expect((await snapshot(y)).liveReview).toBeNull();
    // POSITIVE CONTROL — the SAME client and grants reach X.
    expect((await client.inject({ method: 'GET', url: historyUrl(x) })).statusCode).toBe(200);
  });

  it('⭐ AC8(vii) — a TAMPERED session naming a non-human actor is EXACTLY 404 on both routes (the verifier-decision pattern), with a positive control', async () => {
    const w = await world();
    await certificate(w);
    const { client, userId } = await actor(w.pariwarId, 'district_admin', 'district', w.district, 'Real Human');
    // POSITIVE CONTROL first — the untampered session reaches the history.
    expect((await client.inject({ method: 'GET', url: historyUrl(w) })).statusCode).toBe(200);
    await td.pool.query(`UPDATE admin_sessions SET sess = jsonb_set(sess, '{userId}', to_jsonb($1::text)) WHERE user_id = $2`, [randomUUID(), userId]);
    for (const [method, url, payload] of [
      ['POST', reviewUrl(w), await acceptBody(w)],
      ['GET', historyUrl(w), undefined],
    ] as const) {
      const res = await client.inject({ method, url, payload: payload as Json | undefined });
      expect(res.statusCode, `${method} ${url}`).toBe(404);
    }
    expect((await snapshot(w)).liveReview).toBeNull();
  });

  it('⭐ AC8(vii) — ⛔ WITHOUT the key: a helpline operator is 403 on the review AND the history (⛔ no write)', async () => {
    const w = await world();
    await certificate(w);
    const { client } = await actor(w.pariwarId, 'helpline_operator', 'pariwar', w.pariwarId, 'Harsh (Helpline)');
    expect((await client.inject({ method: 'POST', url: reviewUrl(w), payload: await acceptBody(w) })).statusCode).toBe(403);
    expect((await client.inject({ method: 'GET', url: historyUrl(w) })).statusCode).toBe(403);
    expect((await snapshot(w)).liveReview).toBeNull();
  });

  // ── D6 — the upload window ───────────────────────────────────────────────────────────────────────
  async function upload(w: World, documentType = 'death_certificate') {
    const { client } = await actor(w.pariwarId, 'helpline_operator', 'pariwar', w.pariwarId, 'Harsh (Helpline)');
    const { body, ct } = multipart(Buffer.from('%PDF-1.4 fake'), 'cert.pdf', 'application/pdf');
    const storeBefore = td.claimDocumentStorage.store.size;
    const queueBefore = td.claimOcrParityQueue.enqueued.length;
    const res = await client.inject({
      method: 'POST',
      url: `${base(w.pariwarId, w.claimCaseId)}/documents?documentType=${documentType}`,
      payload: body as unknown as object,
      headers: { 'content-type': ct },
    });
    return {
      res,
      stored: td.claimDocumentStorage.store.size - storeBefore,
      queued: td.claimOcrParityQueue.enqueued.length - queueBefore,
    };
  }

  it('⭐ D6 / D2 — IN the review window a death certificate may be sent when there is NONE (T3(b)): 202, its OWN object key, and the payload carries uploadId + uploadedAt + channel', async () => {
    const w = await world();
    const { res, stored, queued } = await upload(w);
    expect(res.statusCode, res.body).toBe(202);
    expect({ stored, queued }).toEqual({ stored: 1, queued: 1 });
    const enq = td.claimOcrParityQueue.last!;
    expect(enq.payload.uploadId).toMatch(/^[0-9a-f-]{36}$/);
    expect(enq.payload.channel).toBe('helpline');
    expect(Number.isNaN(Date.parse(enq.payload.uploadedAt!))).toBe(false);
    expect(enq.payload.storageObjectKey.endsWith(`/death_certificate/${enq.payload.claimDocumentId}/${enq.payload.uploadId}`)).toBe(true);
  });

  it('⭐ D6 — a REJECTED certificate may be replaced (202); an ACCEPTED one (`certificate_accepted`) or an UNREVIEWED one (`certificate_awaiting_review`) refuses BEFORE storage and the queue', async () => {
    const awaiting = await world();
    await certificate(awaiting);
    const a = await upload(awaiting);
    expect(a.res.statusCode).toBe(409);
    expect(errCode(a.res.json() as Json)).toBe('claim_document.certificate_awaiting_review');
    expect({ stored: a.stored, queued: a.queued }).toEqual({ stored: 0, queued: 0 });

    await inScope(awaiting.pariwarId, (s) => ensureAcceptedDeathCertificate(deps, s, awaiting.pariwarId, awaiting.claimCaseId, { date: ACCEPTED }));
    const b = await upload(awaiting);
    expect(errCode(b.res.json() as Json)).toBe('claim_document.certificate_accepted');
    expect({ stored: b.stored, queued: b.queued }).toEqual({ stored: 0, queued: 0 });

    await reject(awaiting); // a re-review to `rejected` reopens the window
    const c = await upload(awaiting);
    expect(c.res.statusCode, c.res.body).toBe(202);
    expect({ stored: c.stored, queued: c.queued }).toEqual({ stored: 1, queued: 1 });
  });

  it('⭐ D6 — every OTHER type inside the window keeps today’s 409 `upload_not_allowed`; and outside it a non-certificate type keeps its UNCHANGED key (no upload id)', async () => {
    const w = await world();
    const r = await upload(w, 'hospital_record');
    expect(errCode(r.res.json() as Json)).toBe('claim_document.upload_not_allowed');
    expect({ stored: r.stored, queued: r.queued }).toEqual({ stored: 0, queued: 0 });

    const early = await world('intake_converged');
    const ok = await upload(early, 'hospital_record');
    expect(ok.res.statusCode, ok.res.body).toBe(202);
    const enq = td.claimOcrParityQueue.last!;
    expect(enq.payload.uploadId).toBeUndefined();
    expect(enq.payload.storageObjectKey.endsWith(`/hospital_record/${enq.payload.claimDocumentId}`)).toBe(true);
  });

  // ── D8 — 6.20's timeline + determination ────────────────────────────────────────────────────────
  it('⭐ D8 — the timeline carries the ACCEPTED date (decrypted, read-only); a determination with ANOTHER date is 409 `certificate_date_mismatch`, and with ⛔ none accepted `certificate_not_accepted`', async () => {
    const w = await world();
    await certificate(w);
    const { client } = await actor(w.pariwarId, 'district_admin', 'district', w.district);
    const timeline = async () => (await client.inject({ method: 'GET', url: `${base(w.pariwarId, w.claimCaseId)}/nominee-declaration` })).json() as Json;
    expect((await timeline()).accepted_certificate).toBeNull();
    const determine = (date: string) =>
      client.inject({
        method: 'POST',
        url: `${base(w.pariwarId, w.claimCaseId)}/nominee-determination`,
        payload: { certificate_date: date, marks: [], note: 'n', watermark: { rank1: null, rank2: null }, expected_live_determination_id: null },
      });
    const none = await determine(ACCEPTED);
    expect(errCode(none.json() as Json), none.body).toBe('nominee_determination.certificate_not_accepted');

    await inScope(w.pariwarId, (s) => ensureAcceptedDeathCertificate(deps, s, w.pariwarId, w.claimCaseId, { date: ACCEPTED }));
    const t = await timeline();
    expect(t.accepted_certificate).toMatchObject({ accepted_date: { state: 'readable', value: ACCEPTED } });
    const mismatch = await determine('2026-05-02');
    expect(errCode(mismatch.json() as Json), mismatch.body).toBe('nominee_determination.certificate_date_mismatch');
    const good = await determine(ACCEPTED);
    expect(good.statusCode, good.body).toBe(201);
    const [row] = (
      await td.pool.query('SELECT death_certificate_review_id AS id FROM nominee_determinations WHERE claim_case_id = $1 AND superseded_at IS NULL', [
        w.claimCaseId,
      ])
    ).rows;
    expect(row.id).toBe((t.accepted_certificate as Json).review_id);
  });
  // ── Code review 2026-09-26 (`2026-09-26-245`) ───────────────────────────────────────────────────
  it('⭐ `-246` §2 / RTBF — after the REAL anonymizer runs, the accepted date and the note read `anonymized` on the timeline and the history (⛔ never `[anonymized]` as a value), and a determination is refused `certificate_date_anonymized`', async () => {
    const w = await world();
    await certificate(w);
    await inScope(w.pariwarId, (s) => ensureAcceptedDeathCertificate(deps, s, w.pariwarId, w.claimCaseId, { date: ACCEPTED }));
    // The production erasure path — ⛔ never a hand-written sentinel ("stubs call, never transcribe").
    await inScope(w.pariwarId, (s) =>
      memberDomain.anonymizeMember(s.tx, deps.encryption, { memberId: ids.memberId(w.memberId), pariwarId: ids.pariwarId(w.pariwarId) }),
    );
    const { client } = await actor(w.pariwarId, 'district_admin', 'district', w.district);
    const timeline = await client.inject({ method: 'GET', url: `${base(w.pariwarId, w.claimCaseId)}/nominee-declaration` });
    expect((timeline.json() as Json).accepted_certificate).toMatchObject({ accepted_date: { state: 'anonymized' } });
    expect(timeline.body).not.toContain(memberDomain.ANONYMIZED_SENTINEL);
    const history = await client.inject({ method: 'GET', url: historyUrl(w) });
    expect(history.statusCode, history.body).toBe(200);
    expect(history.body).not.toContain(memberDomain.ANONYMIZED_SENTINEL);
    const reviews = ((history.json() as Json).uploads as Json[]).flatMap((u) => u.reviews as Json[]);
    expect(reviews[0]).toMatchObject({ accepted_date: { state: 'anonymized' }, note: { state: 'anonymized' } });
    // ⭐ Story 6.26b (AC11b; GI13 [b]) — a review written AFTER 0149 (the real writer, with an index) is erased by the
    // real anonymizer ⛔ without 23514 / 42501, and its index is NULL; the register check (a code) stays.
    const [erased] = (
      await td.pool.query('SELECT accepted_date_index, register_check FROM claim_death_certificate_reviews WHERE claim_case_id = $1', [w.claimCaseId])
    ).rows;
    expect(erased).toEqual({ accepted_date_index: null, register_check: 'matches' });
    const res = await client.inject({
      method: 'POST',
      url: `${base(w.pariwarId, w.claimCaseId)}/nominee-determination`,
      payload: { certificate_date: ACCEPTED, marks: [], note: 'n', watermark: { rank1: null, rank2: null }, expected_live_determination_id: null },
    });
    expect(errCode(res.json() as Json), res.body).toBe('nominee_determination.certificate_date_anonymized');
  });

  it('⭐ `-246` §2 — a date that FAILS to decrypt is `unreadable` (transient), ⛔ not `anonymized`, and refused `certificate_date_unreadable`', async () => {
    const w = await world();
    await certificate(w);
    await inScope(w.pariwarId, (s) => ensureAcceptedDeathCertificate(deps, s, w.pariwarId, w.claimCaseId, { date: ACCEPTED }));
    await td.pool.query("UPDATE claim_death_certificate_reviews SET accepted_date_ciphertext = 'enc:v1:not-a-real-envelope' WHERE claim_case_id = $1", [
      w.claimCaseId,
    ]);
    const { client } = await actor(w.pariwarId, 'district_admin', 'district', w.district);
    const timeline = await client.inject({ method: 'GET', url: `${base(w.pariwarId, w.claimCaseId)}/nominee-declaration` });
    expect((timeline.json() as Json).accepted_certificate).toMatchObject({ accepted_date: { state: 'unreadable' } });
    const res = await client.inject({
      method: 'POST',
      url: `${base(w.pariwarId, w.claimCaseId)}/nominee-determination`,
      payload: { certificate_date: ACCEPTED, marks: [], note: 'n', watermark: { rank1: null, rank2: null }, expected_live_determination_id: null },
    });
    expect(errCode(res.json() as Json), res.body).toBe('nominee_determination.certificate_date_unreadable');
  });

  it('⭐ `-245` §3 — a LEGACY certificate row (⛔ no upload row) reaches the console as `missing` with ⛔ no token, ⛔ never `not_reviewed`', async () => {
    const w = await world();
    await td.pool.query(
      `INSERT INTO claim_documents (claim_document_id, pariwar_id, claim_case_id, document_type, storage_object_key,
         content_type, byte_size, parity_outcome, parity_flags, ocr_confidence, verifier_review_required)
       VALUES ($1, $2, $3, 'death_certificate', $4, 'application/pdf', 1024, 'match', '{}'::jsonb, 0.9, false)`,
      [randomUUID(), w.pariwarId, w.claimCaseId, `pariwar/${w.pariwarId}/claim/${w.claimCaseId}/death_certificate/legacy`],
    );
    const da = await actor(w.pariwarId, 'district_admin', 'district', w.district);
    const res = await da.client.inject({ method: 'GET', url: `${base(w.pariwarId, w.claimCaseId)}/verifier-console` });
    expect(res.statusCode, res.body).toBe(200);
    const dr = ((res.json() as Json).packet as Json).documentReview as Json;
    const item = (dr.reviews as Json[]).find((r) => r.documentType === 'death_certificate')!;
    expect(item.review).toMatchObject({ status: 'missing', certificateToken: null });
  });

  it('⭐ D10 review fix — `viewer.canReview` is FALSE outside the review window even for the District Admin (every submit there is 409 `not_reviewable`)', async () => {
    const w = await world('documents_pending');
    await certificate(w);
    const da = await actor(w.pariwarId, 'district_admin', 'district', w.district);
    const res = await da.client.inject({ method: 'GET', url: `${base(w.pariwarId, w.claimCaseId)}/verifier-console` });
    expect(res.statusCode, res.body).toBe(200);
    const dr = ((res.json() as Json).packet as Json).documentReview as Json;
    const item = (dr.reviews as Json[]).find((r) => r.documentType === 'death_certificate')!;
    expect((item.review as Json).viewer).toEqual({ canReview: false });
    // …and the route agrees: the submit the flag would have offered is refused.
    const post = await da.client.inject({ method: 'POST', url: reviewUrl(w), payload: await acceptBody(w) });
    expect(errCode(post.json() as Json), post.body).toBe('death_certificate_review.not_reviewable');
  });

  // ── Story 6.21b (D1, D5) — the FAMILY's (and the helpline's) status read ───────────────────────
  const ACCESS_TTL_MS = 15 * 60 * 1000;
  const memberUrl = (w: World) => `/api/v1/member/claims/${w.claimCaseId}/death-certificate`;
  const helplineClaimsUrl = (w: World) => `/api/v1/p/${w.pariwarId}/admin/members/${w.memberId}/death-certificate/claims`;
  function memberClient(w: World) {
    const c = makeClient(app);
    const tok = signAccessToken(app, { memberId: w.memberId, pariwarId: w.pariwarId, deviceId: 'test-device' }, ACCESS_TTL_MS);
    return { inject: (opts: { method: 'GET'; url: string }) => c.inject({ ...opts, headers: { authorization: `Bearer ${tok}` } }) };
  }

  it('⭐ D1 — pre-verification (intake_converged), no certificate ⇒ missing, upload_allowed true, replacement_allowed false, claim_live true', async () => {
    const w = await world('intake_converged');
    const res = await memberClient(w).inject({ method: 'GET', url: memberUrl(w) });
    expect(res.statusCode, res.body).toBe(200);
    expect(res.json()).toMatchObject({
      status: 'missing',
      replacement_reason: null,
      replacement_allowed: false,
      upload_allowed: true,
      certificate_token: null,
      claim_live: true,
      reassurance: null,
    });
  });

  it('⭐ D1 (`-247` §2) — pre-verification with a current upload ⇒ awaiting_review, both false — the deferred-upload gap CLOSED (Q1)', async () => {
    const w = await world('intake_converged');
    await certificate(w);
    const res = await memberClient(w).inject({ method: 'GET', url: memberUrl(w) });
    expect(res.statusCode, res.body).toBe(200);
    expect(res.json()).toMatchObject({ status: 'awaiting_review', replacement_allowed: false, upload_allowed: false });
  });

  it('⭐ D1 — in the review window, rejected (unclear date) ⇒ replacement_requested, unclear_date, not_refused, a real certificate_token', async () => {
    const w = await world('verifier_review');
    const { uploadId } = await certificate(w);
    await reject(w);
    const res = await memberClient(w).inject({ method: 'GET', url: memberUrl(w) });
    expect(res.statusCode, res.body).toBe(200);
    expect(res.json()).toMatchObject({
      status: 'replacement_requested',
      replacement_reason: 'unclear_date',
      replacement_allowed: true,
      upload_allowed: true,
      certificate_token: uploadId,
      claim_live: true,
      reassurance: 'not_refused',
    });
  });

  it('⭐ D1 — invariant 1: a member of ANOTHER Pariwar (forged into this Pariwar\'s token) is 404 claim.not_found (no cross-claim oracle)', async () => {
    const w = await world('intake_converged');
    const other = await world('intake_converged');
    const tok = signAccessToken(app, { memberId: other.memberId, pariwarId: w.pariwarId, deviceId: 'd' }, ACCESS_TTL_MS);
    const c = makeClient(app);
    const res = await c.inject({ method: 'GET', url: memberUrl(w), headers: { authorization: `Bearer ${tok}` } });
    expect(res.statusCode).toBe(404);
    expect(errCode(res.json() as Json)).toBe('claim.not_found');
  });

  it('⭐ D1 — invariant 1 / checklist 3: a SAME-Pariwar sibling member cannot read another member\'s claim (404, the ownership check itself)', async () => {
    const w = await world('verifier_review');
    const siblingId = randomUUID();
    await inScope(w.pariwarId, (s) =>
      memberDomain.projectMemberState(s.client, {
        memberId: ids.memberId(siblingId),
        pariwarId: ids.pariwarId(w.pariwarId),
        eventType: 'member.signup_initiated',
        payload: { from_state: null, to_state: 'pending-kyc', trigger: 'signup', actor: 'member' },
        actorId: siblingId,
      }),
    );
    const tok = signAccessToken(app, { memberId: siblingId, pariwarId: w.pariwarId, deviceId: 'd' }, ACCESS_TTL_MS);
    const res = await makeClient(app).inject({ method: 'GET', url: memberUrl(w), headers: { authorization: `Bearer ${tok}` } });
    expect(res.statusCode).toBe(404);
    expect(errCode(res.json() as Json)).toBe('claim.not_found');
    // POSITIVE CONTROL — the owner, same Pariwar, same claim, reads it.
    expect((await memberClient(w).inject({ method: 'GET', url: memberUrl(w) })).statusCode).toBe(200);
  });

  it('⭐ AC2 — the family\'s UPLOAD with a STALE `claim_handover` elevation is 403 auth.step_up_required; nothing stored, nothing queued (positive control: a fresh one is 202)', async () => {
    const w = await world('verifier_review');
    const tok = signAccessToken(app, { memberId: w.memberId, pariwarId: w.pariwarId, deviceId: 'test-device' }, ACCESS_TTL_MS);
    const now = deps.clock();
    const elevate = (until: Date) =>
      td.pool.query(
        `INSERT INTO member_step_up_elevations (member_id, action_context, elevated_until) VALUES ($1, 'claim_handover', $2)
           ON CONFLICT (member_id, action_context) DO UPDATE SET elevated_until = EXCLUDED.elevated_until`,
        [w.memberId, until.toISOString()],
      );
    const send = async () => {
      const { body, ct } = multipart(Buffer.from('%PDF-1.4 fake'), 'cert.pdf', 'application/pdf');
      const storeBefore = td.claimDocumentStorage.store.size;
      const queueBefore = td.claimOcrParityQueue.enqueued.length;
      const res = await makeClient(app).inject({
        method: 'POST',
        url: `/api/v1/member/claims/${w.claimCaseId}/documents?documentType=death_certificate`,
        payload: body as unknown as object,
        headers: { 'content-type': ct, authorization: `Bearer ${tok}` },
      });
      return {
        res,
        stored: td.claimDocumentStorage.store.size - storeBefore,
        queued: td.claimOcrParityQueue.enqueued.length - queueBefore,
      };
    };
    try {
      await elevate(new Date(now.getTime() - 60_000)); // expired a minute ago
      const stale = await send();
      expect(stale.res.statusCode, stale.res.body).toBe(403);
      expect(errCode(stale.res.json() as Json)).toBe('auth.step_up_required');
      expect({ stored: stale.stored, queued: stale.queued }).toEqual({ stored: 0, queued: 0 });

      await elevate(new Date(now.getTime() + 10 * 60_000));
      const fresh = await send();
      expect(fresh.res.statusCode, fresh.res.body).toBe(202);
      expect({ stored: fresh.stored, queued: fresh.queued }).toEqual({ stored: 1, queued: 1 });
    } finally {
      await td.pool.query(`DELETE FROM member_step_up_elevations WHERE member_id = $1`, [w.memberId]);
    }
  });

  it('⭐ AC4 — the helpline UPLOAD denies a cross-Pariwar request: another Pariwar\'s URL (no grant) and a foreign claim under the operator\'s OWN Pariwar are both 404, nothing stored', async () => {
    const w = await world('verifier_review');
    const { body, ct } = multipart(Buffer.from('%PDF-1.4 fake'), 'cert.pdf', 'application/pdf');
    const post = (client: Client, pariwarId: string) =>
      client.inject({
        method: 'POST',
        url: `${base(pariwarId, w.claimCaseId)}/documents?documentType=death_certificate`,
        payload: body as unknown as object,
        headers: { 'content-type': ct },
      });
    const storeBefore = td.claimDocumentStorage.store.size;
    const queueBefore = td.claimOcrParityQueue.enqueued.length;

    // (a) W's operator, a DIFFERENT Pariwar in the URL — holds no grant there.
    const own = await actor(w.pariwarId, 'helpline_operator', 'pariwar', w.pariwarId, 'Harsh (Helpline)');
    expect((await post(own.client, randomUUID())).statusCode).toBe(404);

    // (b) ANOTHER Pariwar's operator, their OWN Pariwar in the URL, W's claim id — the claim is not theirs.
    const elsewhere = randomUUID();
    const foreign = await actor(elsewhere, 'helpline_operator', 'pariwar', elsewhere, 'Meera (Helpline)');
    const res = await post(foreign.client, elsewhere);
    expect(res.statusCode, res.body).toBe(404);

    expect(td.claimDocumentStorage.store.size - storeBefore).toBe(0);
    expect(td.claimOcrParityQueue.enqueued.length - queueBefore).toBe(0);
    // POSITIVE CONTROL — W's own operator, W's own Pariwar, is accepted.
    expect((await post(own.client, w.pariwarId)).statusCode).toBe(202);
  });

  it('⭐ BW-G5 (AC1, `-249` §5) — a claim moved on by a NON-certificate document, with ⛔ no certificate, reads `missing` and OFFERS the upload', async () => {
    // `documents_pending` reached on a hospital record — the certificate itself was never sent.
    const w = await world('documents_pending');
    await inScope(w.pariwarId, (s) =>
      s.client.query(
        `INSERT INTO claim_documents (claim_document_id, pariwar_id, claim_case_id, document_type, storage_object_key,
           content_type, byte_size, parity_outcome, parity_flags, ocr_confidence, verifier_review_required)
         VALUES ($1, $2, $3, 'hospital_record', $4, 'application/pdf', 1024, 'match', '{}'::jsonb, 0.9, false)`,
        [randomUUID(), w.pariwarId, w.claimCaseId, `pariwar/${w.pariwarId}/claim/${w.claimCaseId}/hospital_record/${randomUUID()}`],
      ),
    );
    const res = await memberClient(w).inject({ method: 'GET', url: memberUrl(w) });
    expect(res.statusCode, res.body).toBe(200);
    expect(res.json()).toMatchObject({ status: 'missing', upload_allowed: true, certificate_token: null, claim_live: true });
    // …and the helpline sees the SAME row.
    const { client } = await actor(w.pariwarId, 'helpline_operator', 'pariwar', w.pariwarId, 'Harsh (Helpline)');
    const list = await client.inject({ method: 'GET', url: helplineClaimsUrl(w) });
    expect((list.json() as { claims: Json[] }).claims).toMatchObject([{ status: 'missing', upload_allowed: true }]);
  });

  it('⭐ D1 — no step-up required: a plain member session (no elevation) reads it', async () => {
    const w = await world('intake_converged');
    const res = await memberClient(w).inject({ method: 'GET', url: memberUrl(w) });
    expect(res.statusCode, res.body).toBe(200);
  });

  it('⭐ D5 — the helpline operator sees the SAME status the family sees, and can send a replacement when upload_allowed (`-247` §2, Q1 closed)', async () => {
    const w = await world('intake_converged');
    const { client } = await actor(w.pariwarId, 'helpline_operator', 'pariwar', w.pariwarId, 'Harsh (Helpline)');

    const list = await client.inject({ method: 'GET', url: helplineClaimsUrl(w) });
    expect(list.statusCode, list.body).toBe(200);
    const listBody = list.json() as { member_id: string; claims: Json[] };
    expect(listBody.member_id).toBe(w.memberId);
    expect(listBody.claims).toMatchObject([{ claim_case_id: w.claimCaseId, status: 'missing', upload_allowed: true, reassurance: null }]);

    // ⭐ The SAME resolver, the SAME row — the family's own read agrees (BW-J5).
    const family = await memberClient(w).inject({ method: 'GET', url: memberUrl(w) });
    expect((family.json() as Json).status).toBe(listBody.claims[0]!.status);

    // A certificate put off at filing (`intake_converged`) is now sendable through the HELPLINE too
    // (`-247` §2 — the pre-6.21b upload handler already accepted it here; this proves the offer agrees).
    const { res: uploadRes, stored, queued } = await upload(w);
    expect(uploadRes.statusCode, uploadRes.body).toBe(202);
    expect({ stored, queued }).toEqual({ stored: 1, queued: 1 });

    // The list-read audit line is MEMBER-scoped, ⛔ not claim-scoped (`auditsFor` filters on
    // `claim_case_id`, which this event does not carry — it lists ALL of a member's live claims).
    const lines = td.auditSink
      .ofType('admin_death_certificate.claims_read')
      .filter((e) => (e.context as Json | undefined)?.member_id === w.memberId);
    expect(lines.length).toBeGreaterThan(0);
    expect(lines[0]!.context).toMatchObject({ member_id: w.memberId, claim_count: 1 });
    for (const l of lines) {
      expect(JSON.stringify(l)).not.toContain(NOTE);
    }
  });

  it('⭐ D5 — a cross-Pariwar request is denied, and a tampered session is EXACTLY 404 with a positive control', async () => {
    const w = await world('intake_converged');
    const other = randomUUID();
    const { client, userId } = await actor(w.pariwarId, 'helpline_operator', 'pariwar', w.pariwarId, 'Harsh (Helpline)');

    // Cross-Pariwar: the SAME operator session, a DIFFERENT pariwarId in the URL — the r9-voting/
    // cycle-freeze family's 404 posture for a `pariwar`-dimension key (the operator holds no grant
    // there at all, so the permission hook's own lookup comes back empty — not a leak).
    const cross = await client.inject({ method: 'GET', url: `/api/v1/p/${other}/admin/members/${w.memberId}/death-certificate/claims` });
    expect(cross.statusCode).toBe(404);

    // POSITIVE CONTROL — the untampered session reaches it.
    expect((await client.inject({ method: 'GET', url: helplineClaimsUrl(w) })).statusCode).toBe(200);
    await td.pool.query(`UPDATE admin_sessions SET sess = jsonb_set(sess, '{userId}', to_jsonb($1::text)) WHERE user_id = $2`, [randomUUID(), userId]);
    expect((await client.inject({ method: 'GET', url: helplineClaimsUrl(w) })).statusCode).toBe(404);
  });
});
