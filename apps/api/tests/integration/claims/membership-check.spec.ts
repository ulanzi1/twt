// Story 6.39 — the staff MEMBERSHIP CHECK before any drive, over HTTP (Task 3.6; AC3, AC4, AC8, AC9, AC10; DL2, DL3,
// DL4, DL7, DL8, DL10, DL11).
//
// Real routes, real sessions, real Postgres (the story's own container), each test minting its own Pariwar:
//   · AC4 — recording a check for each identity record (DigiLocker / typed in / the two fail-closed fixtures), every
//     HTTP-reachable REFUSAL with its wire code AND its `_rejected` audit line, and a re-check superseding the first;
//   · AC3 — a member whose joining receipt cannot be identified ⇒ 409 `membership_check.no_fee_receipt`, ⛔ row;
//   · AC8 — a fee paid ON the day of death is shown as its own outcome (`same_day`) — PQ1 (a);
//   · AC9 — `claim.membership_checked` per write, the state unchanged; ⛔ the date of death, ⛔ the fee date, ⛔ the
//     note and ⛔ the name in ANY audit line or event payload (planted values, searched in the serialized lines);
//   · AC10 — 403 without `claim.check_membership`, and for a District Admin of ANOTHER district.
//
// ⚠ The fee receipt is RAW-inserted with an explicit `paid_at` (G3: the real writer never passes it).

import { randomUUID } from 'node:crypto';

import { claim, ids, member as memberDomain } from '@twt/domain';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { AppDeps } from '../../../src/context.js';
import * as service from '../../../src/modules/auth/admin/admin-auth.service.js';
import { encryptDeathCertificateReviewField } from '../../../src/modules/claims/death-certificate-crypto.js';
import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { buildServer } from '../../../src/server.js';
import { ensureAcceptedDeathCertificate, insertDeathCertificate } from '../_nominee-name-check-fixture.js';
import { buildTestDeps, hasDatabase, makeClient, type TestDeps } from '../_setup.js';
import { FakeWebAuthnProvider } from '../_webauthn-fake.js';

type Client = ReturnType<typeof makeClient>;
type Json = Record<string, unknown>;

/** The date of death on the accepted certificate — a PLANTED value: it must appear in ⛔ audit line or event. */
const DEATH = '2026-05-01';
/** Instants on the Indian calendar days before / of / after the death (IST = UTC+05:30). */
const PAID = {
  before_death: '2026-04-30T06:00:00.000Z', // 30 April 11:30 IST
  same_day: '2026-05-01T06:00:00.000Z', // 1 May 11:30 IST
  after_death: '2026-05-02T06:00:00.000Z', // 2 May 11:30 IST
} as const;
const FEE_DATE = { before_death: '2026-04-30', same_day: '2026-05-01', after_death: '2026-05-02' } as const;
const NOTE = 'ZZ-MEMBERSHIP-NOTE-PLAINTEXT';
const NAME = 'ZZ-PLANTED-DECEASED-NAME';

type Kyc = 'digilocker' | 'typed_in' | 'unverified' | 'none';
type Fee = keyof typeof PAID | 'corrected_utr';

describe.skipIf(!hasDatabase)('Story 6.39 — the membership check surface — E2E', { timeout: 30000 }, () => {
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
    const email = `mc-${randomUUID()}@example.test`;
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

  type Target = 'documents_pending' | 'verifier_review';

  /**
   * A member who joined (KYC by `kyc`, then the joining fee `fee`) and a claim for their death, driven to `target`,
   * with — unless `certificate: 'none'` — an ACCEPTED certificate dated `DEATH`.
   */
  async function world(opts: { kyc?: Kyc; fee?: Fee; target?: Target; certificate?: 'accepted' | 'none' } = {}) {
    const kyc = opts.kyc ?? 'typed_in';
    const fee = opts.fee ?? 'before_death';
    const target = opts.target ?? 'verifier_review';
    const pariwarId = randomUUID();
    const district = `D-${randomUUID().slice(0, 8)}`;
    const memberId = randomUUID();
    const claimCaseId = randomUUID();
    const utr = `UTR-${randomUUID()}`;
    const receiptId = randomUUID();
    await inScope(pariwarId, async (s) => {
      const mid = ids.memberId(memberId);
      const pid = ids.pariwarId(pariwarId);
      const memberEvent = (eventType: string, payload: Json) =>
        memberDomain.projectMemberState(s.client, { memberId: mid, pariwarId: pid, eventType: eventType as never, payload: payload as never, actorId: memberId });
      await memberEvent('member.signup_initiated', { from_state: null, to_state: 'pending-kyc', trigger: 'signup', actor: 'member' });
      // The KYC step and its record. ⚠ `unverified` and the missing row are RAW fail-closed fixtures (unreachable today).
      if (kyc === 'digilocker') {
        await memberEvent('member.kyc_completed', { from_state: 'pending-kyc', to_state: 'pending-fee', trigger: 'kyc_completed', actor: 'member' });
      } else {
        await memberEvent('member.kyc_manual_fallback', { from_state: 'pending-kyc', to_state: 'pending-fee', trigger: 'kyc_manual_fallback', actor: 'member', reason: 'fixture' });
      }
      if (kyc !== 'none') {
        const [strength, source] =
          kyc === 'digilocker' ? ['aadhaar_kyc', 'digilocker'] : kyc === 'typed_in' ? ['self_declared', 'manual'] : ['unverified', 'manual'];
        await s.client.query(
          `INSERT INTO member_kyc_profiles (member_id, pariwar_id, name_ciphertext, dob_ciphertext, verification_strength, source, trustee_verified)
           VALUES ($1, $2, $3, $4, $5, $6, false)`,
          [memberId, pariwarId, `enc:v1:${NAME}`, 'enc:v1:dob', strength, source],
        );
      }
      // The joining receipt — RAW, with an explicit `paid_at` — and the `pending-fee → lock-in` event carrying a UTR.
      await s.client.query(
        `INSERT INTO vyawastha_shulk_receipts (receipt_id, member_id, pariwar_id, tr, utr, amount_inr, payment_method, paid_at, valid_through)
         VALUES ($1, $2, $3, $4, $5, 100, 'upi', $6, '2099-01-01T00:00:00Z')`,
        [receiptId, memberId, pariwarId, `TR-${randomUUID()}`, utr, PAID[fee === 'corrected_utr' ? 'before_death' : fee]],
      );
      await memberEvent('member.vyawastha_shulk_paid', {
        from_state: 'pending-fee',
        to_state: 'lock-in',
        trigger: 'vyawastha_shulk_paid',
        actor: 'member',
        // A re-confirm with a corrected UTR typed in the body: the event's UTR is on ⛔ receipt of this member (G3).
        utr: fee === 'corrected_utr' ? `UTR-CORRECTED-${randomUUID()}` : utr,
        amount_inr: 100,
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
      await emit('intake_converged', 'documents_pending', 'claim.documents_received');
      if (target === 'documents_pending') return;
      await emit('documents_pending', 'verification_in_progress', 'claim.peer_mesh_pinged', {
        selected_member_ids: [randomUUID()],
        metric_id: 'district_cohort_v1',
        metric_version: 1,
      });
      await emit('verification_in_progress', 'verifier_review', 'claim.verifier_reviewing');
      if (opts.certificate !== 'none') await ensureAcceptedDeathCertificate(deps, s, pariwarId, claimCaseId, { date: DEATH });
    });
    return { pariwarId, district, memberId, claimCaseId, receiptId, utr };
  }

  type World = Awaited<ReturnType<typeof world>>;

  const url = (w: World) => `/api/v1/p/${w.pariwarId}/admin/claims/${w.claimCaseId}/membership-check`;
  const errCode = (b: Json) => String((b.error as Json | undefined)?.code);
  /** A response body as loose JSON. */
  const j = (r: { json(): unknown }) => r.json() as Json;
  const auditsFor = (type: string, claimCaseId: string) =>
    td.auditSink.ofType(type).filter((e) => (e.context as Json | undefined)?.claim_case_id === claimCaseId);
  const da = (w: World) => actor(w.pariwarId, 'district_admin', 'district', w.district);
  const reviewId = (w: World) =>
    inScope(w.pariwarId, async (s) => {
      const snap = await claim.readDeathCertificateSnapshot(s.tx, ids.pariwarId(w.pariwarId), ids.claimId(w.claimCaseId));
      return snap.currentReview!.reviewId as string;
    });
  const checks = async (w: World) =>
    (
      await td.pool.query<{ check_id: string; superseded_at: Date | null; superseded_reason: string | null; fee_outcome: string; identity_outcome: string; identity_required: boolean; identity_reason: string | null; note_ciphertext: string | null; fee_receipt_id: string; death_certificate_review_id: string; decided_by_display: string }>(
        `SELECT * FROM claim_membership_checks WHERE claim_case_id = $1 ORDER BY decided_at, check_id`,
        [w.claimCaseId],
      )
    ).rows;
  const checkedEvents = async (w: World) =>
    (
      await td.pool.query<{ payload: Json }>(
        `SELECT payload FROM events_log WHERE stream_id = $1 AND event_type = 'claim.membership_checked' ORDER BY event_version`,
        [w.claimCaseId],
      )
    ).rows.map((r) => r.payload);
  const claimState = async (w: World) =>
    (await td.pool.query<{ current_state: string }>(`SELECT current_state FROM claims WHERE claim_case_id = $1`, [w.claimCaseId])).rows[0]!.current_state;
  const body = async (w: World, over: Json = {}): Promise<Json> => ({ expected_live_review_id: await reviewId(w), identity_outcome: 'confirmed', ...over });

  // ── The preview ─────────────────────────────────────────────────────────────────────────────────────────────

  it.each([
    ['before_death', 'typed_in', true, 'typed_in_unchecked'],
    ['same_day', 'digilocker', false, 'digilocker'],
    ['after_death', 'typed_in', true, 'typed_in_unchecked'],
  ] as const)(
    'GET — the preview shows both dates and the comparison the system made: a fee paid %s (%s deceased)',
    async (fee, kyc, identityRequired, route) => {
      const w = await world({ fee, kyc });
      const { client } = await da(w);
      const res = await client.inject({ method: 'GET', url: url(w) });
      expect(res.statusCode, res.body).toBe(200);
      expect(j(res)).toEqual({
        claim_case_id: w.claimCaseId,
        window_open: true,
        expected_live_review_id: await reviewId(w),
        date_of_death: DEATH,
        fee_paid_on: FEE_DATE[fee],
        fee_receipt_found: true,
        fee_outcome: fee,
        identity_required: identityRequired,
        kyc_route: route,
        latest_posting_district: w.district,
        live_check: null,
        gate: { passed: false, reason: 'not_checked' },
      });
      // ONE read audit line — ids and the outcome code; ⛔ either date.
      const reads = auditsFor('admin_claim.membership_check_read', w.claimCaseId);
      expect(reads).toHaveLength(1);
      expect(reads[0]!.context).toMatchObject({ fee_outcome: fee, fee_receipt_found: true, live_check_id: null });
      const line = JSON.stringify(reads[0]);
      expect(line).not.toContain(DEATH);
      expect(line).not.toContain(FEE_DATE[fee]);
    },
  );

  it('GET — the two fail-closed identity fixtures (an `unverified` record; ⛔ KYC row at all) both REQUIRE the identity half', async () => {
    for (const [kyc, route] of [['unverified', 'unverified'], ['none', 'no_record']] as const) {
      const w = await world({ kyc });
      const { client } = await da(w);
      const res = await client.inject({ method: 'GET', url: url(w) });
      expect(res.statusCode, res.body).toBe(200);
      expect(j(res)).toMatchObject({ identity_required: true, kyc_route: route });
      // …and `not_required` is refused for them at the write (the writer re-reads the record under the lock).
      const post = await client.inject({ method: 'POST', url: url(w), payload: await body(w, { identity_outcome: 'not_required' }) });
      expect(post.statusCode, `${kyc}: ${post.body}`).toBe(400);
      expect(errCode(j(post))).toBe('membership_check.invalid_outcome');
      expect(await checks(w)).toEqual([]);
    }
  });

  it('GET — ⛔ accepted certificate yet: the preview answers 200 with ⛔ date and ⛔ comparison (the console’s disabled state)', async () => {
    const w = await world({ certificate: 'none' });
    const { client } = await da(w);
    const res = await client.inject({ method: 'GET', url: url(w) });
    expect(res.statusCode, res.body).toBe(200);
    expect(j(res)).toMatchObject({
      expected_live_review_id: null,
      date_of_death: null,
      fee_paid_on: FEE_DATE.before_death,
      fee_receipt_found: true,
      fee_outcome: null,
      gate: { passed: false, reason: 'not_checked' },
    });
  });

  // ── AC4 — recording ─────────────────────────────────────────────────────────────────────────────────────────

  it('⭐ AC4 — a DigiLocker-verified deceased: `identity_required` false; a JUDGMENT is 400; `not_required` records the check', async () => {
    const w = await world({ kyc: 'digilocker' });
    const { client, userId } = await da(w);
    for (const identity_outcome of ['confirmed', 'not_confirmed'] as const) {
      const res = await client.inject({
        method: 'POST',
        url: url(w),
        payload: await body(w, { identity_outcome, ...(identity_outcome === 'not_confirmed' ? { identity_reason: 'other', note: NOTE } : {}) }),
      });
      expect(res.statusCode, `${identity_outcome}: ${res.body}`).toBe(400);
      expect(errCode(j(res))).toBe('membership_check.invalid_outcome');
    }
    expect(await checks(w)).toEqual([]);
    expect(auditsFor('admin_claim.membership_check_rejected', w.claimCaseId).map((e) => (e.context as Json).reason)).toEqual(['invalid_outcome', 'invalid_outcome']);

    const ok = await client.inject({ method: 'POST', url: url(w), payload: await body(w, { identity_outcome: 'not_required' }) });
    expect(ok.statusCode, ok.body).toBe(201);
    const rid = await reviewId(w);
    expect(j(ok)).toMatchObject({
      claim_case_id: w.claimCaseId,
      death_certificate_review_id: rid,
      fee_outcome: 'before_death',
      identity_required: false,
      identity_outcome: 'not_required',
      identity_reason: null,
      superseded_check_id: null,
    });
    const rows = await checks(w);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      check_id: j(ok).check_id,
      superseded_at: null,
      fee_outcome: 'before_death',
      identity_required: false,
      identity_outcome: 'not_required',
      identity_reason: null,
      note_ciphertext: null,
      fee_receipt_id: w.receiptId,
      death_certificate_review_id: rid,
      decided_by_display: 'Anita (District Admin)',
    });
    expect(auditsFor('admin_claim.membership_checked', w.claimCaseId)).toHaveLength(1);
    expect(auditsFor('admin_claim.membership_checked', w.claimCaseId)[0]).toMatchObject({ actorId: userId });
    // The gate now passes — the same state function the approval sites call.
    expect(j(await client.inject({ method: 'GET', url: url(w) }))).toMatchObject({ gate: { passed: true, reason: null } });
  });

  it('⭐ AC4 — a typed-in (`self_declared`) deceased: `identity_required` true; `not_required` is 400; `confirmed` records the check', async () => {
    const w = await world({ kyc: 'typed_in' });
    const { client } = await da(w);
    const bad = await client.inject({ method: 'POST', url: url(w), payload: await body(w, { identity_outcome: 'not_required' }) });
    expect(bad.statusCode, bad.body).toBe(400);
    expect(errCode(j(bad))).toBe('membership_check.invalid_outcome');
    expect(await checks(w)).toEqual([]);

    const ok = await client.inject({ method: 'POST', url: url(w), payload: await body(w, { identity_outcome: 'confirmed' }) });
    expect(ok.statusCode, ok.body).toBe(201);
    expect(j(ok)).toMatchObject({ identity_required: true, identity_outcome: 'confirmed', fee_outcome: 'before_death' });
    expect(j(await client.inject({ method: 'GET', url: url(w) }))).toMatchObject({
      gate: { passed: true, reason: null },
      live_check: { check_id: j(ok).check_id, identity_outcome: 'confirmed', has_note: false, decided_by_display: 'Anita (District Admin)' },
    });
  });

  it('⭐ AC4 — `not_confirmed` needs a reason AND a note (400 each way); with both it is recorded and the claim WAITS', async () => {
    const w = await world();
    const { client } = await da(w);
    for (const over of [
      { identity_outcome: 'not_confirmed' },
      { identity_outcome: 'not_confirmed', identity_reason: 'name_differs' },
      { identity_outcome: 'not_confirmed', note: NOTE },
      { identity_outcome: 'not_confirmed', identity_reason: 'name_differs', note: '   ' },
      { identity_outcome: 'confirmed', identity_reason: 'name_differs' },
    ]) {
      const res = await client.inject({ method: 'POST', url: url(w), payload: await body(w, over) });
      expect(res.statusCode, `${JSON.stringify(over)}: ${res.body}`).toBe(400);
      expect(errCode(j(res))).toBe('membership_check.invalid_outcome');
    }
    expect(await checks(w)).toEqual([]);

    const before = await claimState(w);
    const ok = await client.inject({
      method: 'POST',
      url: url(w),
      payload: await body(w, { identity_outcome: 'not_confirmed', identity_reason: 'age_or_birth_date_differs', note: NOTE }),
    });
    expect(ok.statusCode, ok.body).toBe(201);
    expect(j(ok)).toMatchObject({ identity_outcome: 'not_confirmed', identity_reason: 'age_or_birth_date_differs' });
    // N5 — ⛔ a denial, ⛔ a state change: the claim waits.
    expect(await claimState(w)).toBe(before);
    expect(j(await client.inject({ method: 'GET', url: url(w) }))).toMatchObject({
      gate: { passed: false, reason: 'identity_not_confirmed' },
      live_check: { identity_outcome: 'not_confirmed', identity_reason: 'age_or_birth_date_differs', has_note: true },
    });
    // The note is stored ENCRYPTED — ⛔ plaintext at rest.
    const [row] = await checks(w);
    expect(row!.note_ciphertext).toBeTruthy();
    expect(row!.note_ciphertext).not.toContain(NOTE);
  });

  it('⭐ AC4 — a STALE `expected_live_review_id` is 409 `membership_check.stale`, ⛔ row; after a RE-REVIEW the old token is stale too', async () => {
    const w = await world();
    const { client } = await da(w);
    const wrong = await client.inject({ method: 'POST', url: url(w), payload: await body(w, { expected_live_review_id: randomUUID() }) });
    expect(wrong.statusCode, wrong.body).toBe(409);
    expect(errCode(j(wrong))).toBe('membership_check.stale');

    const old = await reviewId(w);
    // The certificate is re-reviewed (another date ⇒ a NEW accepted review) after the staff member opened the check.
    await inScope(w.pariwarId, (s) => ensureAcceptedDeathCertificate(deps, s, w.pariwarId, w.claimCaseId, { date: '2026-05-03' }));
    expect(await reviewId(w)).not.toBe(old);
    const stale = await client.inject({ method: 'POST', url: url(w), payload: { expected_live_review_id: old, identity_outcome: 'confirmed' } });
    expect(stale.statusCode, stale.body).toBe(409);
    expect(errCode(j(stale))).toBe('membership_check.stale');
    expect(await checks(w)).toEqual([]);
    expect(auditsFor('admin_claim.membership_check_rejected', w.claimCaseId).map((e) => (e.context as Json).reason)).toEqual(['stale', 'stale']);
    expect(auditsFor('admin_claim.membership_checked', w.claimCaseId)).toEqual([]);
  });

  it('⭐ AC4 — ⛔ accepted certificate (none, awaiting review, rejected) is 409 `membership_check.certificate_not_accepted`, ⛔ row', async () => {
    const w = await world({ certificate: 'none' });
    const { client } = await da(w);
    const post = () => client.inject({ method: 'POST', url: url(w), payload: { expected_live_review_id: randomUUID(), identity_outcome: 'confirmed' } });
    // (i) no certificate at all.
    let res = await post();
    expect(res.statusCode, res.body).toBe(409);
    expect(errCode(j(res))).toBe('membership_check.certificate_not_accepted');
    // (ii) uploaded, not yet reviewed.
    await inScope(w.pariwarId, (s) => insertDeathCertificate(s, w.pariwarId, w.claimCaseId));
    res = await post();
    expect(errCode(j(res))).toBe('membership_check.certificate_not_accepted');
    // (iii) rejected.
    await inScope(w.pariwarId, async (s) => {
      const snap = await claim.readDeathCertificateSnapshot(s.tx, ids.pariwarId(w.pariwarId), ids.claimId(w.claimCaseId));
      await claim.recordDeathCertificateReview(s.client, {
        claimCaseId: ids.claimId(w.claimCaseId),
        pariwarId: ids.pariwarId(w.pariwarId),
        verdict: 'rejected',
        certificateToken: snap.currentUploadId!,
        acceptedDate: null,
        acceptedDateCiphertext: null,
        rejectionReason: 'date_of_death_unclear',
        noteCiphertext: await encryptDeathCertificateReviewField('rejected in the fixture', w.pariwarId, deps.encryption),
        expectedLiveReviewId: null,
        actorId: randomUUID(),
        actorDisplay: 'Fixture DA',
        actor: 'operator',
      });
    });
    res = await post();
    expect(res.statusCode, res.body).toBe(409);
    expect(errCode(j(res))).toBe('membership_check.certificate_not_accepted');
    expect(await checks(w)).toEqual([]);
  });

  it('⭐ AC4 — an ERASED (sentinel) or UNDECRYPTABLE certificate date is 409 `membership_check.certificate_date_unreadable` on BOTH routes — ⛔ a 500, ⛔ a comparison', async () => {
    for (const kind of ['anonymized', 'unreadable'] as const) {
      const w = await world();
      const { client } = await da(w);
      const rid = await reviewId(w);
      const ciphertext =
        kind === 'anonymized'
          ? await encryptDeathCertificateReviewField(memberDomain.ANONYMIZED_SENTINEL, w.pariwarId, deps.encryption)
          : 'enc:v1:not-an-envelope';
      // The RTBF scrub's own column grant — the ONE way this value changes in production.
      await inScope(w.pariwarId, (s) =>
        s.client.query(`UPDATE claim_death_certificate_reviews SET accepted_date_ciphertext = $1 WHERE review_id = $2`, [ciphertext, rid]),
      );
      const get = await client.inject({ method: 'GET', url: url(w) });
      expect(get.statusCode, `${kind}: ${get.body}`).toBe(409);
      expect(errCode(j(get))).toBe('membership_check.certificate_date_unreadable');
      const post = await client.inject({ method: 'POST', url: url(w), payload: { expected_live_review_id: rid, identity_outcome: 'confirmed' } });
      expect(post.statusCode, `${kind}: ${post.body}`).toBe(409);
      expect(errCode(j(post))).toBe('membership_check.certificate_date_unreadable');
      expect(await checks(w)).toEqual([]);
      const rejected = auditsFor('admin_claim.membership_check_rejected', w.claimCaseId).map((e) => e.context as Json);
      expect(rejected.map((c) => [c.on, c.reason])).toEqual([
        ['read', 'certificate_date_unreadable'],
        ['write', 'certificate_date_unreadable'],
      ]);
      expect(rejected[0]!.date_state).toBe(kind);
    }
  });

  it('⭐ AC4 — OUTSIDE the review window is 409 `membership_check.window_closed` (before the certificate is even looked for), ⛔ row', async () => {
    const w = await world({ target: 'documents_pending' });
    const { client } = await da(w);
    const res = await client.inject({ method: 'POST', url: url(w), payload: { expected_live_review_id: randomUUID(), identity_outcome: 'confirmed' } });
    expect(res.statusCode, res.body).toBe(409);
    expect(errCode(j(res))).toBe('membership_check.window_closed');
    expect(await checks(w)).toEqual([]);
    // The preview still answers, and says the window is closed.
    expect(j(await client.inject({ method: 'GET', url: url(w) }))).toMatchObject({ window_open: false });
  });

  it('⭐ AC3 — a re-confirm with a corrected UTR (the lock-in event’s UTR is on ⛔ receipt of the member) is 409 `membership_check.no_fee_receipt`, ⛔ row; the preview SAYS so', async () => {
    const w = await world({ fee: 'corrected_utr' });
    const { client } = await da(w);
    const get = await client.inject({ method: 'GET', url: url(w) });
    expect(get.statusCode, get.body).toBe(200);
    expect(j(get)).toMatchObject({ fee_receipt_found: false, fee_paid_on: null, fee_outcome: null, date_of_death: DEATH });
    const res = await client.inject({ method: 'POST', url: url(w), payload: await body(w) });
    expect(res.statusCode, res.body).toBe(409);
    expect(errCode(j(res))).toBe('membership_check.no_fee_receipt');
    expect(await checks(w)).toEqual([]);
    expect(auditsFor('admin_claim.membership_check_rejected', w.claimCaseId).map((e) => (e.context as Json).reason)).toEqual(['no_fee_receipt']);
  });

  it('⭐ AC4 — a SECOND check supersedes the first (`re_checked`): ONE live row after, and the response names the one it replaced', async () => {
    const w = await world();
    const { client } = await da(w);
    const first = await client.inject({
      method: 'POST',
      url: url(w),
      payload: await body(w, { identity_outcome: 'not_confirmed', identity_reason: 'document_unreadable', note: NOTE }),
    });
    expect(first.statusCode, first.body).toBe(201);
    const second = await client.inject({ method: 'POST', url: url(w), payload: await body(w, { identity_outcome: 'confirmed' }) });
    expect(second.statusCode, second.body).toBe(201);
    expect(j(second).superseded_check_id).toBe(j(first).check_id);
    const rows = await checks(w);
    expect(rows).toHaveLength(2);
    const live = rows.filter((r) => r.superseded_at === null);
    expect(live.map((r) => r.check_id)).toEqual([j(second).check_id]);
    expect(rows.find((r) => r.check_id === j(first).check_id)).toMatchObject({ superseded_reason: 're_checked' });
    expect(j(await client.inject({ method: 'GET', url: url(w) }))).toMatchObject({ gate: { passed: true, reason: null } });
  });

  it('a District Admin with ⛔ display name is refused 409 before anything is read — ⛔ row, audited (a check is attributed to a NAMED person)', async () => {
    const w = await world();
    const { client } = await actor(w.pariwarId, 'district_admin', 'district', w.district, null);
    const res = await client.inject({ method: 'POST', url: url(w), payload: await body(w) });
    expect(res.statusCode, res.body).toBe(409);
    expect(errCode(j(res))).toBe('admin.display_name_missing');
    expect(await checks(w)).toEqual([]);
    expect(auditsFor('admin_claim.membership_check_rejected', w.claimCaseId)).toHaveLength(1);
  });

  // ── DL10 — the verifier console's packet section ─────────────────────────────────────────────────────────────

  it('⭐ DL10 — the console packet\'s `membershipCheckGate` follows the check (not_checked → identity_not_confirmed → passed) and splits `canCheckMembership` SERVER-SIDE (a verifier sees the state, ⛔ the control)', async () => {
    const w = await world();
    const consoleUrl = `/api/v1/p/${w.pariwarId}/admin/claims/${w.claimCaseId}/verifier-console`;
    const admin = await da(w);
    const verifier = await actor(w.pariwarId, 'verifier', 'district', w.district, 'Vikram (Verifier)');
    const gateFor = async (client: Client) => {
      const res = await client.inject({ method: 'GET', url: consoleUrl });
      expect(res.statusCode, res.body).toBe(200);
      return (j(res).packet as Json).membershipCheckGate;
    };
    expect(await gateFor(admin.client)).toEqual({ available: true, passed: false, reason: 'not_checked', viewer: { canCheckMembership: true } });
    expect(await gateFor(verifier.client)).toEqual({ available: true, passed: false, reason: 'not_checked', viewer: { canCheckMembership: false } });

    await admin.client.inject({ method: 'POST', url: url(w), payload: await body(w, { identity_outcome: 'not_confirmed', identity_reason: 'other', note: NOTE }) });
    expect(await gateFor(admin.client)).toMatchObject({ passed: false, reason: 'identity_not_confirmed' });
    await admin.client.inject({ method: 'POST', url: url(w), payload: await body(w) });
    expect(await gateFor(admin.client)).toEqual({ available: true, passed: true, reason: null, viewer: { canCheckMembership: true } });
    // The packet carries ⛔ date and ⛔ note for this section.
    expect(JSON.stringify(await gateFor(admin.client))).not.toContain(DEATH);
  });

  it('DL10 — outside the check\'s window the console offers ⛔ control, even to the District Admin (every submit would 409 `window_closed`)', async () => {
    const w = await world({ target: 'documents_pending' });
    const admin = await da(w);
    const res = await admin.client.inject({ method: 'GET', url: `/api/v1/p/${w.pariwarId}/admin/claims/${w.claimCaseId}/verifier-console` });
    expect(res.statusCode, res.body).toBe(200);
    expect((j(res).packet as Json).membershipCheckGate).toEqual({ available: true, passed: false, reason: 'not_checked', viewer: { canCheckMembership: false } });
  });

  // ── AC8 — the day of death (PQ1 (a), built A) ────────────────────────────────────────────────────────────────

  it('⭐ AC8 / PQ1 (a) — a fee paid ON the day of death is recorded as `same_day` and the gate PASSES (the literal side of `-430` Q1 B; a ruling of B flips this)', async () => {
    const w = await world({ fee: 'same_day', kyc: 'digilocker' });
    const { client } = await da(w);
    const res = await client.inject({ method: 'POST', url: url(w), payload: await body(w, { identity_outcome: 'not_required' }) });
    expect(res.statusCode, res.body).toBe(201);
    expect(j(res).fee_outcome).toBe('same_day');
    expect(j(await client.inject({ method: 'GET', url: url(w) }))).toMatchObject({
      fee_outcome: 'same_day',
      live_check: { fee_outcome: 'same_day' },
      gate: { passed: true, reason: null },
    });
  });

  it('a fee paid AFTER the death is recorded `after_death` — the check is written (⛔ refused), the gate says `fee_after_death`, the claim’s state is unchanged', async () => {
    const w = await world({ fee: 'after_death' });
    const { client } = await da(w);
    const before = await claimState(w);
    const res = await client.inject({ method: 'POST', url: url(w), payload: await body(w, { identity_outcome: 'confirmed' }) });
    expect(res.statusCode, res.body).toBe(201);
    expect(j(res).fee_outcome).toBe('after_death');
    expect(await claimState(w)).toBe(before);
    expect(j(await client.inject({ method: 'GET', url: url(w) }))).toMatchObject({ gate: { passed: false, reason: 'fee_after_death' } });
  });

  it('⛔ a client cannot supply the comparison: a body carrying `fee_outcome` (or a date) is a 400 from the contract — and the stored outcome is the server’s', async () => {
    const w = await world({ fee: 'after_death' });
    const { client } = await da(w);
    for (const extra of [{ fee_outcome: 'before_death' }, { date_of_death: '2099-01-01' }, { fee_paid_on: '2000-01-01' }]) {
      const res = await client.inject({ method: 'POST', url: url(w), payload: await body(w, extra) });
      expect(res.statusCode, `${JSON.stringify(extra)}: ${res.body}`).toBe(400);
    }
    expect(await checks(w)).toEqual([]);
  });

  // ── AC9 — events and audits ─────────────────────────────────────────────────────────────────────────────────

  it('⭐ AC9 — `claim.membership_checked` per write, the state unchanged; ⛔ the date of death, ⛔ the fee date, ⛔ the note and ⛔ the name in ANY audit line or event payload', async () => {
    const w = await world({ fee: 'same_day' });
    const { client } = await da(w);
    const before = await claimState(w);
    await client.inject({ method: 'GET', url: url(w) });
    // A refusal, a `not_confirmed` with the planted note, then a `confirmed` re-check — three audited writes, two events.
    await client.inject({ method: 'POST', url: url(w), payload: await body(w, { identity_outcome: 'not_required' }) });
    const r1 = await client.inject({ method: 'POST', url: url(w), payload: await body(w, { identity_outcome: 'not_confirmed', identity_reason: 'name_differs', note: NOTE }) });
    const r2 = await client.inject({ method: 'POST', url: url(w), payload: await body(w, { identity_outcome: 'confirmed', note: NOTE }) });
    expect([r1.statusCode, r2.statusCode]).toEqual([201, 201]);
    expect(await claimState(w)).toBe(before);

    const events = await checkedEvents(w);
    expect(events).toHaveLength(2);
    const rid = await reviewId(w);
    expect(events[0]).toEqual({
      from_state: before,
      to_state: before,
      trigger: 'membership_check',
      actor: 'operator',
      check_id: j(r1).check_id,
      death_certificate_review_id: rid,
      fee_outcome: 'same_day',
      identity_required: true,
      identity_outcome: 'not_confirmed',
      identity_reason: 'name_differs',
    });
    expect(events[1]).toMatchObject({ check_id: j(r2).check_id, identity_outcome: 'confirmed', identity_reason: null });

    const lines = [
      ...auditsFor('admin_claim.membership_check_read', w.claimCaseId),
      ...auditsFor('admin_claim.membership_check_rejected', w.claimCaseId),
      ...auditsFor('admin_claim.membership_checked', w.claimCaseId),
    ];
    expect(lines.map((l) => l.type).sort()).toEqual([
      'admin_claim.membership_check_read',
      'admin_claim.membership_check_rejected',
      'admin_claim.membership_checked',
      'admin_claim.membership_checked',
    ]);
    const serialized = JSON.stringify([lines, events]);
    // The planted values — the fee was paid ON the day of death, so `DEATH` is BOTH dates here.
    for (const planted of [DEATH, NOTE, NAME, '2026-05', PAID.same_day]) {
      expect(serialized, planted).not.toContain(planted);
    }
    // ⚠ The control that makes the search meaningful: the same values ARE reachable by this test.
    expect(JSON.stringify(j(await client.inject({ method: 'GET', url: url(w) })))).toContain(DEATH);
    // The success line carries the ids and the codes.
    expect(auditsFor('admin_claim.membership_checked', w.claimCaseId)[0]!.context).toEqual({
      claim_case_id: w.claimCaseId,
      check_id: j(r1).check_id,
      death_certificate_review_id: rid,
      fee_receipt_id: w.receiptId,
      fee_outcome: 'same_day',
      identity_required: true,
      identity_outcome: 'not_confirmed',
      identity_reason: 'name_differs',
      superseded_check_id: null,
    });
  });

  // ── AC10 — who ──────────────────────────────────────────────────────────────────────────────────────────────

  it.each([
    ['verifier', 'district'],
    ['pariwar_admin', 'pariwar'],
    ['helpline_operator', 'pariwar'],
  ] as const)('⭐ AC10 — a %s is 403 on BOTH routes (⛔ read of the date, ⛔ write)', async (role, dim) => {
    const w = await world();
    const { client } = await actor(w.pariwarId, role, dim, dim === 'district' ? w.district : w.pariwarId, 'Someone Else');
    expect((await client.inject({ method: 'GET', url: url(w) })).statusCode).toBe(403);
    expect((await client.inject({ method: 'POST', url: url(w), payload: await body(w) })).statusCode).toBe(403);
    expect(await checks(w)).toEqual([]);
    expect(auditsFor('admin_claim.membership_check_read', w.claimCaseId)).toEqual([]);
  });

  it('⭐ AC10 — a District Admin of ANOTHER district is 403 on both routes; the claim’s OWN District Admin is not (the positive control)', async () => {
    const w = await world();
    const other = await actor(w.pariwarId, 'district_admin', 'district', `D-OTHER-${randomUUID().slice(0, 8)}`, 'Other District Admin');
    expect((await other.client.inject({ method: 'GET', url: url(w) })).statusCode).toBe(403);
    expect((await other.client.inject({ method: 'POST', url: url(w), payload: await body(w) })).statusCode).toBe(403);
    expect(await checks(w)).toEqual([]);
    const own = await da(w);
    expect((await own.client.inject({ method: 'GET', url: url(w) })).statusCode).toBe(200);
    expect((await own.client.inject({ method: 'POST', url: url(w), payload: await body(w) })).statusCode).toBe(201);
  });

  it('a District Admin of ANOTHER Pariwar cannot reach the claim (403 / 404 — ⛔ existence leaked, ⛔ write)', async () => {
    const w = await world();
    const x = await world();
    const { client } = await da(x);
    for (const method of ['GET', 'POST'] as const) {
      const res = await client.inject({
        method,
        url: `/api/v1/p/${x.pariwarId}/admin/claims/${w.claimCaseId}/membership-check`,
        ...(method === 'POST' ? { payload: { expected_live_review_id: randomUUID(), identity_outcome: 'confirmed' } } : {}),
      });
      expect([403, 404], `${method}: ${res.body}`).toContain(res.statusCode);
    }
    expect(await checks(w)).toEqual([]);
  });
});
