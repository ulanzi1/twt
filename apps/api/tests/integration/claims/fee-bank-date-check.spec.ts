// Story 6.39a — the membership check USES the bank date, over HTTP (Task 4.4; AC5, AC7; DL6, DL7, N4, N7, TR14).
//
// Real routes, real sessions, real Postgres. The finance officer records through the REAL route; the District Admin checks
// through the REAL check route. The domain writer's own lock-protected re-assert is in the domain spec (only a direct
// writer call reaches it — TR7).
//   · AC5 — the preview shows `bank` + the record + the recomputed outcome; the re-check stores them; a bank date the day
//     BEFORE the death passes; ONE test names PQ3 (ON the day ⇒ `same_day`, the gate `fee_after_death`); after ⇒
//     `after_death`; a stale token ⇒ `bank_date_changed`; a record naming another payment is IGNORED and the claim WAITS;
//     the EARLIER date (a later bank date keeps the recorded one, and the gate does ⛔ wait on it); the SAME PERSON is
//     refused (a Super Admin; one user with both grants) and another person accepted; ONE person alone ⇒ the claim waits.
//   · AC7 — the deny guard refuses `fee_paid_after_death` while `bank_date_recorded` holds and accepts it after a re-check
//     that still blocks; the family's `identity_check_waiting` stays `false` while it holds.

import { randomUUID } from 'node:crypto';

import { FEE_BANK_DATE_STEP_UP_CONTEXT } from '@twt/contracts';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { AppDeps } from '../../../src/context.js';
import { signAccessToken } from '../../../src/modules/auth/member/tokens.js';
import { buildServer } from '../../../src/server.js';
import { buildTestDeps, hasDatabase, type TestDeps } from '../_setup.js';
import { FakeWebAuthnProvider } from '../_webauthn-fake.js';
import { DEATH, errCode, feeBankDateWorld, j, type FeeBankDateWorld, type Json, type Staff, type World } from './_fee-bank-date-world.js';

describe.skipIf(!hasDatabase)('Story 6.39a — the membership check uses the bank date — E2E', { timeout: 30000 }, () => {
  let td: TestDeps;
  let deps: AppDeps;
  let app: Awaited<ReturnType<typeof buildServer>>;
  let fakeWebauthn: FakeWebAuthnProvider;
  let W: FeeBankDateWorld;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    fakeWebauthn = new FakeWebAuthnProvider();
    td = await buildTestDeps({ webauthn: fakeWebauthn });
    deps = td.deps;
    app = await buildServer(deps);
    await app.ready();
    W = feeBankDateWorld({ td, deps, app, fakeWebauthn, createdUserIds });
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

  const checkUrl = (w: World) => `/api/v1/p/${w.pariwarId}/admin/claims/${w.claimCaseId}/membership-check`;
  const preview = async (a: Staff, w: World) => {
    const res = await a.client.inject({ method: 'GET', url: checkUrl(w) });
    expect(res.statusCode, res.body).toBe(200);
    return j(res);
  };
  /** The District Admin records the check from what the preview shows (every currency token as seen). */
  async function recheck(a: Staff, w: World, over: Json = {}) {
    const p = await preview(a, w);
    return a.client.inject({
      method: 'POST',
      url: checkUrl(w),
      payload: {
        expected_live_review_id: p.expected_live_review_id,
        expected_live_check_id: (p.live_check as Json | null)?.check_id ?? null,
        expected_fee_bank_date_id: (p.fee_bank_date as Json | null)?.record_id ?? null,
        identity_outcome: p.identity_required ? 'confirmed' : 'not_required',
        ...over,
      },
    });
  }
  /** The finance officer records a bank date through the real route (stepped up). */
  async function bankDate(a: Staff, w: World, date: string) {
    await W.stepUp(a, FEE_BANK_DATE_STEP_UP_CONTEXT);
    const res = await a.client.inject({ method: 'POST', url: W.postUrl(w), payload: await W.body(w, { bank_credit_date: date }) });
    expect(res.statusCode, res.body).toBe(201);
    return j(res).record_id as string;
  }
  const liveCheck = async (w: World) =>
    (
      await td.pool.query<{ fee_outcome: string; fee_date_source: string; fee_bank_date_id: string | null }>(
        `SELECT fee_outcome, fee_date_source, fee_bank_date_id FROM claim_membership_checks WHERE claim_case_id = $1 AND superseded_at IS NULL`,
        [w.claimCaseId],
      )
    ).rows[0];
  const feeDeny = (a: Staff, w: World) =>
    a.client.inject({
      method: 'POST',
      url: `/api/v1/p/${w.pariwarId}/admin/claims/${w.claimCaseId}/verifier-decision`,
      payload: { outcome: 'denied', reason_code: 'fee_paid_after_death', rationale: 'The fee was paid after the death.' },
    });

  /** A held claim: recorded 10 May (after the 1 May death), the District Admin's check recorded (`after_death`). */
  async function held(opts: { kyc?: 'digilocker' | 'typed_in'; fee?: 'after_death' | 'same_day' } = {}) {
    const w = await W.world({ fee: opts.fee ?? 'after_death', ...(opts.kyc ? { kyc: opts.kyc } : {}) });
    const da = await W.staff(w, ['district_admin'], 'Anita (District Admin)');
    const first = await recheck(da, w);
    expect(first.statusCode, first.body).toBe(201);
    const fo = await W.staff(w, ['finance_officer'], 'Meera (Finance Officer)');
    return { w, da, fo };
  }

  it('⭐ AC5 — a bank date the day BEFORE the death: the preview shows `bank`, the record and `before_death`; the re-check stores `bank` + the id; the gate passes', async () => {
    const { w, da, fo } = await held();
    expect((await preview(da, w)).gate).toEqual({ passed: false, reason: 'fee_after_death' });
    const recordId = await bankDate(fo, w, '2026-04-30');
    // Until the District Admin checks again, the claim WAITS on the new reason (N4).
    const p = await preview(da, w);
    expect(p.gate).toEqual({ passed: false, reason: 'bank_date_recorded' });
    expect(p).toMatchObject({
      fee_paid_on: '2026-05-10', // still the RECORDED date (its meaning is kept)
      fee_date_source: 'bank',
      fee_outcome: 'before_death',
      fee_blocks_approval: false,
      fee_bank_date: { record_id: recordId, bank_credit_date: '2026-04-30', reason_code: 'recorded_by_family_after_death', recorded_by_display: 'Meera (Finance Officer)' },
    });
    const res = await recheck(da, w);
    expect(res.statusCode, res.body).toBe(201);
    expect(await liveCheck(w)).toEqual({ fee_outcome: 'before_death', fee_date_source: 'bank', fee_bank_date_id: recordId });
    expect((await preview(da, w)).gate).toEqual({ passed: true, reason: null });
    // The success audit names the source (a code) — ⛔ the date.
    const line = W.auditsFor('admin_claim.membership_checked', w.claimCaseId).at(-1)!;
    expect((line.context as Json).fee_date_source).toBe('bank');
    expect((line.context as Json).fee_bank_date_id).toBe(recordId);
    // The READ line names the source and the record considered too (DL12; code review 2026-11-27) — codes and ids only.
    const read = W.auditsFor('admin_claim.membership_check_read', w.claimCaseId).at(-1)!;
    expect(read.context).toMatchObject({ fee_date_source: 'bank', fee_bank_date_id: recordId });
    expect(JSON.stringify(line).includes('2026-04-30')).toBe(false);
  });

  it('⭐⭐ AC5 / PQ3 (`2026-11-27-511` Q3 A) — a bank date ON the day of death ⇒ `same_day`, and the gate answers `fee_after_death`', async () => {
    const { w, da, fo } = await held();
    await bankDate(fo, w, DEATH);
    expect((await recheck(da, w)).statusCode).toBe(201);
    expect(await liveCheck(w)).toMatchObject({ fee_outcome: 'same_day', fee_date_source: 'bank' });
    expect((await preview(da, w)).gate).toEqual({ passed: false, reason: 'fee_after_death' });
    // AC7 — after a re-check that STILL blocks, the deny guard accepts the reason.
    const deny = await feeDeny(da, w);
    expect(deny.statusCode, deny.body).toBe(201);
    expect(await W.claimState(w)).toBe('denied');
  });

  it('AC5 — a bank date AFTER the death (yet earlier than the recorded one) ⇒ `after_death`, `bank`', async () => {
    const { w, da, fo } = await held();
    await bankDate(fo, w, '2026-05-05');
    expect((await recheck(da, w)).statusCode).toBe(201);
    expect(await liveCheck(w)).toMatchObject({ fee_outcome: 'after_death', fee_date_source: 'bank' });
  });

  it('⭐ AC5 / DL6 — the EARLIER date: a bank date LATER than the recorded one keeps the recorded date; the check stores `recorded` AND the record id; the gate does ⛔ wait on `bank_date_recorded`', async () => {
    // Recorded ON the day of death (held), the statement says two days later.
    const { w, da, fo } = await held({ fee: 'same_day' });
    const recordId = await bankDate(fo, w, '2026-05-03');
    expect(await preview(da, w)).toMatchObject({ fee_date_source: 'recorded', fee_outcome: 'same_day', fee_bank_date: { record_id: recordId } });
    expect((await recheck(da, w)).statusCode).toBe(201);
    expect(await liveCheck(w)).toEqual({ fee_outcome: 'same_day', fee_date_source: 'recorded', fee_bank_date_id: recordId });
    expect((await preview(da, w)).gate).toEqual({ passed: false, reason: 'fee_after_death' });
  });

  it('⭐ AC5 / TR7 — a POST with a STALE `expected_fee_bank_date_id` ⇒ 409 `membership_check.bank_date_changed`, ⛔ row', async () => {
    const { w, da, fo } = await held();
    const p = await preview(da, w); // seen BEFORE the bank date
    await bankDate(fo, w, '2026-04-30');
    const before = (await td.pool.query(`SELECT 1 FROM claim_membership_checks WHERE claim_case_id = $1`, [w.claimCaseId])).rows.length;
    const res = await da.client.inject({
      method: 'POST',
      url: checkUrl(w),
      payload: {
        expected_live_review_id: p.expected_live_review_id,
        expected_live_check_id: (p.live_check as Json).check_id,
        expected_fee_bank_date_id: null,
        identity_outcome: 'not_required',
      },
    });
    expect(res.statusCode, res.body).toBe(409);
    expect(errCode(j(res))).toBe('membership_check.bank_date_changed');
    // The refusal's audit echoes the record the staff member SAW (`null` — ⛔ one), so the line shows what was ⛔ seen.
    expect(W.auditsFor('admin_claim.membership_check_rejected', w.claimCaseId).at(-1)!.context).toMatchObject({
      reason: 'bank_date_changed',
      expected_fee_bank_date_id: null,
    });
    expect(j(res)).toMatchObject({ error: { message: "The finance officer recorded the bank's date since you opened this check. It has been reloaded — check again." } });
    expect((await td.pool.query(`SELECT 1 FROM claim_membership_checks WHERE claim_case_id = $1`, [w.claimCaseId])).rows).toHaveLength(before);
  });

  it('⭐ AC5 — a record naming a payment that is ⛔ the joining one (RAW — a defence) is IGNORED: `recorded` + a NULL id — and the gate then WAITS on `bank_date_recorded` (fail closed)', async () => {
    const { w, da } = await held();
    // Another payment of the same member (a renewal), and a live record naming it — RAW.
    const otherReceipt = randomUUID();
    await td.pool.query(
      `INSERT INTO vyawastha_shulk_receipts (receipt_id, member_id, pariwar_id, tr, utr, amount_inr, payment_method, paid_at, valid_through)
       VALUES ($1, $2, $3, $4, $5, 110, 'upi', '2026-03-01T06:00:00Z', '2099-01-01T00:00:00Z')`,
      [otherReceipt, w.memberId, w.pariwarId, `TR-${randomUUID()}`, `${Math.floor(1e11 + Math.random() * 9e11)}`],
    );
    await td.pool.query(
      `INSERT INTO claim_fee_bank_dates (pariwar_id, claim_case_id, deceased_member_id, fee_receipt_id, bank_credit_date, reason_code, note_ciphertext, decided_by_actor_id, decided_by_display)
       VALUES ($1, $2, $3, $4, '2026-04-01', 'other', 'enc:v1:n', $5, 'Raw')`,
      [w.pariwarId, w.claimCaseId, w.memberId, otherReceipt, randomUUID()],
    );
    const p = await preview(da, w);
    expect(p).toMatchObject({ fee_date_source: 'recorded', fee_bank_date: null, fee_outcome: 'after_death' });
    expect((await recheck(da, w)).statusCode).toBe(201);
    expect(await liveCheck(w)).toEqual({ fee_outcome: 'after_death', fee_date_source: 'recorded', fee_bank_date_id: null });
    // ⛔ a pass, ⛔ even `fee_after_death`: the claim WAITS until a new record supersedes the raw one.
    expect((await preview(da, w)).gate).toEqual({ passed: false, reason: 'bank_date_recorded' });
  });

  it('⭐ AC5 / N7 — the SAME PERSON: a Super Admin who recorded the bank date cannot record the check (409 `same_person`, ⛔ row); another District Admin can', async () => {
    const { w, da } = await held();
    const sa = await W.staff(w, ['super_admin'], 'Sushila (Super Admin)');
    await bankDate(sa, w, '2026-04-30');
    const rows = async () => (await td.pool.query(`SELECT 1 FROM claim_membership_checks WHERE claim_case_id = $1`, [w.claimCaseId])).rows.length;
    const before = await rows();
    const res = await recheck(sa, w);
    expect(res.statusCode, res.body).toBe(409);
    expect(errCode(j(res))).toBe('membership_check.same_person');
    expect(j(res)).toMatchObject({ error: { message: "You recorded the bank's date on this claim, so another person must record this check." } });
    expect(await rows()).toBe(before);
    expect((await recheck(da, w)).statusCode).toBe(201);
  });

  it('⭐ AC5 / N7 / TR14 — ONE user holding BOTH role grants: their bank date is refused at their own re-check, and with ⛔ one else to check, the claim WAITS — the deny route refuses `fee_paid_after_death`', async () => {
    const w = await W.world();
    const both = await W.staff(w, ['finance_officer', 'district_admin'], 'Ravi (both roles)');
    expect((await recheck(both, w)).statusCode).toBe(201); // the first check, before any bank date
    await bankDate(both, w, '2026-04-30');
    const res = await recheck(both, w);
    expect(res.statusCode, res.body).toBe(409);
    expect(errCode(j(res))).toBe('membership_check.same_person');
    // ⭐ The wait, asserted — ⛔ hidden: the gate waits (every approval route maps it — the translator spec), and the fee
    // denial is refused.
    expect((await preview(both, w)).gate).toEqual({ passed: false, reason: 'bank_date_recorded' });
    const deny = await feeDeny(both, w);
    expect(deny.statusCode, deny.body).toBe(409);
    expect(errCode(j(deny))).toBe('verifier_decision.fee_paid_after_death_not_shown');
    expect(await W.claimState(w)).toBe('verifier_review');
  });

  it('⭐ AC7 — while `bank_date_recorded` holds: the deny guard refuses `fee_paid_after_death`, and the family\'s `identity_check_waiting` stays `false` (the identity unconfirmed too)', async () => {
    const w = await W.world({ kyc: 'typed_in' });
    const da = await W.staff(w, ['district_admin'], 'Anita (District Admin)');
    expect((await recheck(da, w, { identity_outcome: 'not_confirmed', identity_reason: 'name_differs', note: 'The name differs.' })).statusCode).toBe(201);
    const family = () =>
      app.inject({
        method: 'GET',
        url: `/api/v1/member/claims/${w.claimCaseId}/death-certificate`,
        headers: { authorization: `Bearer ${signAccessToken(app, { memberId: w.memberId, pariwarId: w.pariwarId, deviceId: 'test-device' }, 15 * 60 * 1000)}` },
      });
    // The control: the gate answers `fee_after_death` (fee before identity) ⇒ ⛔ the line already; the bank date changes the reason.
    const fo = await W.staff(w, ['finance_officer']);
    await bankDate(fo, w, '2026-04-30');
    expect((await preview(da, w)).gate).toEqual({ passed: false, reason: 'bank_date_recorded' });
    expect(j(await family())).toMatchObject({ identity_check_waiting: false });
    const deny = await feeDeny(da, w);
    expect(deny.statusCode, deny.body).toBe(409);
    expect(errCode(j(deny))).toBe('verifier_decision.fee_paid_after_death_not_shown');
    // After the re-check the identity wait is the reason again — and the family's line returns (the control that makes
    // the `false` above meaningful).
    expect((await recheck(da, w, { identity_outcome: 'not_confirmed', identity_reason: 'name_differs', note: 'Still differs.' })).statusCode).toBe(201);
    expect((await preview(da, w)).gate).toEqual({ passed: false, reason: 'identity_not_confirmed' });
    expect(j(await family())).toMatchObject({ identity_check_waiting: true });
  });
});
