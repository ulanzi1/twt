// Story 6.39a — the shared world for the bank-date specs (the finance officer's record, the membership check that uses it,
// the gate). Real routes, real sessions, real Postgres; each world mints its own Pariwar.
//
// A member who JOINED (KYC, then the joining payment — RAW, with an explicit `paid_at` and `utr`, and the `pending-fee →
// lock-in` event naming it) and a claim for their death in `verifier_review`, with an ACCEPTED
// certificate dated `DEATH`. ⚠ `members.created_at` is moved back to `JOINED_AT` (as the owner) so a bank date in 2026 is
// ⛔ "before joining" (G10's bound reads it).

import { randomUUID } from 'node:crypto';

import { claim, ids, member as memberDomain } from '@twt/domain';
import { expect } from 'vitest';

import type { AppDeps } from '../../../src/context.js';
import * as service from '../../../src/modules/auth/admin/admin-auth.service.js';
import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import type { buildServer } from '../../../src/server.js';
import { ensureAcceptedDeathCertificate } from '../_nominee-name-check-fixture.js';
import { makeClient, type TestDeps } from '../_setup.js';
import type { FakeWebAuthnProvider } from '../_webauthn-fake.js';

export type Client = ReturnType<typeof makeClient>;
export type Json = Record<string, unknown>;

/** The date of death on the accepted certificate — a PLANTED value: ⛔ in any audit line, event or finance-officer wire. */
export const DEATH = '2026-05-01';
/** The member joined on 1 January 2026 (IST) — `members.created_at`. */
export const JOINED_AT = '2026-01-01T06:00:00.000Z';
/** Recorded-payment instants (IST = UTC+05:30). */
export const PAID = {
  before_death: '2026-04-30T06:00:00.000Z',
  same_day: '2026-05-01T06:00:00.000Z',
  after_death: '2026-05-10T06:00:00.000Z', // recorded 10 May — the family typed it after the death
} as const;
export const NOTE = 'ZZ-BANK-NOTE-PLAINTEXT SBI current account, May statement, line 14';

export type Role =
  | 'finance_officer'
  | 'district_admin'
  | 'pariwar_admin'
  | 'verifier'
  | 'helpline_operator'
  | 'super_admin';
export type Staff = { client: Client; userId: string };

export interface WorldCtx {
  readonly td: TestDeps;
  readonly deps: AppDeps;
  readonly app: Awaited<ReturnType<typeof buildServer>>;
  readonly fakeWebauthn: FakeWebAuthnProvider;
  readonly createdUserIds: string[];
}

export function feeBankDateWorld(ctx: WorldCtx) {
  const { td, deps, fakeWebauthn, createdUserIds } = ctx;

  async function authenticate(displayName: string | null): Promise<Staff> {
    const email = `fbd-${randomUUID()}@example.test`;
    const password = 'CorrectHorseBatteryStaple9';
    const userId = await service.createAdminAccount(deps, { email, password });
    createdUserIds.push(userId);
    if (displayName !== null) await service.setAdminDisplayName(deps, userId, displayName);
    const credentialId = `cred-${userId}`;
    fakeWebauthn.nextRegistration = { verified: true, credential: { id: credentialId, publicKey: 'pk', counter: 0 } };
    fakeWebauthn.nextAuthentication = { verified: true, newCounter: 1 };
    const client = makeClient(ctx.app);
    const token = service.mintEnrollmentToken(deps, userId);
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/register/options', payload: { enrollmentToken: token } });
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/register/verify', payload: { response: { id: 'b' }, enrollmentToken: token } });
    await client.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email, password } });
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/authenticate/options', payload: {} });
    const verify = await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/authenticate/verify', payload: { response: { id: credentialId } } });
    expect(verify.statusCode).toBe(200);
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

  type WorldOpts = {
    readonly fee?: keyof typeof PAID;
    readonly kyc?: 'digilocker' | 'typed_in';
    readonly utr?: string;
    readonly pariwarId?: string;
  };

  async function world(opts: WorldOpts = {}) {
    const fee = opts.fee ?? 'after_death';
    const kyc = opts.kyc ?? 'digilocker';
    const pariwarId = opts.pariwarId ?? randomUUID();
    const district = `D-${randomUUID().slice(0, 8)}`;
    const memberId = randomUUID();
    const claimCaseId = randomUUID();
    const utr = opts.utr ?? `${Math.floor(1e11 + Math.random() * 9e11)}`;
    const receiptId = randomUUID();
    await inScope(pariwarId, async (s) => {
      const mid = ids.memberId(memberId);
      const pid = ids.pariwarId(pariwarId);
      const memberEvent = (eventType: string, payload: Json) =>
        memberDomain.projectMemberState(s.client, { memberId: mid, pariwarId: pid, eventType: eventType as never, payload: payload as never, actorId: memberId });
      await memberEvent('member.signup_initiated', { from_state: null, to_state: 'pending-kyc', trigger: 'signup', actor: 'member' });
      if (kyc === 'digilocker') {
        await memberEvent('member.kyc_completed', { from_state: 'pending-kyc', to_state: 'pending-fee', trigger: 'kyc_completed', actor: 'member' });
      } else {
        await memberEvent('member.kyc_manual_fallback', { from_state: 'pending-kyc', to_state: 'pending-fee', trigger: 'kyc_manual_fallback', actor: 'member', reason: 'fixture' });
      }
      const [strength, source] = kyc === 'digilocker' ? ['aadhaar_kyc', 'digilocker'] : ['self_declared', 'manual'];
      await s.client.query(
        `INSERT INTO member_kyc_profiles (member_id, pariwar_id, name_ciphertext, dob_ciphertext, verification_strength, source, trustee_verified)
         VALUES ($1, $2, 'enc:v1:name', 'enc:v1:dob', $3, $4, false)`,
        [memberId, pariwarId, strength, source],
      );
      await s.client.query(
        `INSERT INTO vyawastha_shulk_receipts (receipt_id, member_id, pariwar_id, tr, utr, amount_inr, payment_method, paid_at, valid_through)
         VALUES ($1, $2, $3, $4, $5, 110, 'upi', $6, '2099-01-01T00:00:00Z')`,
        [receiptId, memberId, pariwarId, `TR-${randomUUID()}`, utr, PAID[fee]],
      );
      await memberEvent('member.vyawastha_shulk_paid', {
        from_state: 'pending-fee',
        to_state: 'lock-in',
        trigger: 'vyawastha_shulk_paid',
        actor: 'member',
        utr,
        amount_inr: 110,
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
      await emit('documents_pending', 'verification_in_progress', 'claim.peer_mesh_pinged', {
        selected_member_ids: [randomUUID()],
        metric_id: 'district_cohort_v1',
        metric_version: 1,
      });
      await emit('verification_in_progress', 'verifier_review', 'claim.verifier_reviewing');
      await ensureAcceptedDeathCertificate(deps, s, pariwarId, claimCaseId, { date: DEATH });
    });
    // G10's bound: the member joined before any bank date a test uses (as the owner — ⛔ a lifecycle column).
    await td.pool.query(`UPDATE members SET created_at = $2 WHERE member_id = $1`, [memberId, JOINED_AT]);
    return { pariwarId, district, memberId, claimCaseId, receiptId, utr };
  }

  type World = Awaited<ReturnType<typeof world>>;

  /** A staff member holding `roles` (several ⇒ ONE person granted each) in the world's Pariwar / district. */
  async function staff(w: Pick<World, 'pariwarId' | 'district'>, roles: readonly Role[], displayName?: string | null): Promise<Staff> {
    const a = await authenticate(displayName === undefined ? `${roles.join('+')} ${randomUUID().slice(0, 4)}` : displayName);
    for (const role of roles) {
      const [dim, value] =
        role === 'district_admin' || role === 'verifier'
          ? ['district', w.district]
          : role === 'super_admin'
            ? ['global', null]
            : ['pariwar', w.pariwarId];
      await td.pool.query(`INSERT INTO role_grants (user_id, pariwar_id, role, scope_dimension, scope_value) VALUES ($1, $2, $3, $4, $5)`, [
        a.userId, w.pariwarId, role, dim, value,
      ]);
    }
    await a.client.inject({ method: 'POST', url: '/api/v1/auth/scope', payload: { pariwarId: w.pariwarId } });
    return a;
  }

  async function stepUp(a: Staff, actionContext: string): Promise<void> {
    expect((await a.client.inject({ method: 'POST', url: '/api/v1/auth/step-up/request', payload: { actionContext } })).statusCode).toBe(200);
    expect((await a.client.inject({ method: 'POST', url: '/api/v1/auth/step-up/verify', payload: { otp: td.adminStepUpDelivery.last?.code as string } })).statusCode).toBe(200);
  }

  const reviewId = (w: World) =>
    inScope(w.pariwarId, async (s) => {
      const snap = await claim.readDeathCertificateSnapshot(s.tx, ids.pariwarId(w.pariwarId), ids.claimId(w.claimCaseId));
      return snap.currentReview!.reviewId as string;
    });

  /**
   * A LIVE membership check, RAW (as the table owner), superseding any live one — for the bank-date specs that test the
   * finance officer's act, ⛔ the check (AC5 drives the real check route).
   */
  async function seedCheck(
    w: World,
    over: { feeOutcome?: 'before_death' | 'same_day' | 'after_death'; feeDateSource?: 'recorded' | 'bank'; feeBankDateId?: string | null; decidedAt?: string } = {},
  ): Promise<string> {
    await td.pool.query(
      `UPDATE claim_membership_checks SET superseded_at = now(), superseded_reason = 're_checked' WHERE claim_case_id = $1 AND superseded_at IS NULL`,
      [w.claimCaseId],
    );
    const rid = await reviewId(w);
    const { rows } = await td.pool.query<{ check_id: string }>(
      `INSERT INTO claim_membership_checks (claim_case_id, pariwar_id, deceased_member_id, death_certificate_review_id, fee_receipt_id,
         fee_outcome, fee_date_source, fee_bank_date_id, identity_required, identity_outcome, decided_by_actor_id, decided_by_display, decided_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false, 'not_required', $9, 'Anita (District Admin)', $10) RETURNING check_id`,
      [
        w.claimCaseId, w.pariwarId, w.memberId, rid, w.receiptId,
        over.feeOutcome ?? 'after_death', over.feeDateSource ?? 'recorded', over.feeBankDateId ?? null,
        randomUUID(), over.decidedAt ?? new Date().toISOString(),
      ],
    );
    return rows[0]!.check_id;
  }

  const liveCheckId = async (w: World): Promise<string | null> =>
    (await td.pool.query<{ check_id: string }>(`SELECT check_id FROM claim_membership_checks WHERE claim_case_id = $1 AND superseded_at IS NULL`, [w.claimCaseId]))
      .rows[0]?.check_id ?? null;
  const records = async (w: World) =>
    (
      await td.pool.query<{ record_id: string; superseded_at: Date | null; superseded_reason: string | null; bank_credit_date: string; reason_code: string; fee_receipt_id: string; decided_by_actor_id: string; note_ciphertext: string }>(
        `SELECT *, bank_credit_date::text AS bank_credit_date FROM claim_fee_bank_dates WHERE claim_case_id = $1 ORDER BY decided_at, record_id`,
        [w.claimCaseId],
      )
    ).rows;
  const liveRecordId = async (w: World): Promise<string | null> => (await records(w)).find((r) => r.superseded_at === null)?.record_id ?? null;
  const events = async (w: World, type: string) =>
    (await td.pool.query<{ payload: Json }>(`SELECT payload FROM events_log WHERE stream_id = $1 AND event_type = $2 ORDER BY event_version`, [w.claimCaseId, type]))
      .rows.map((r) => r.payload);
  const claimState = async (w: World) =>
    (await td.pool.query<{ current_state: string }>(`SELECT current_state FROM claims WHERE claim_case_id = $1`, [w.claimCaseId])).rows[0]!.current_state;
  const auditsFor = (type: string, claimCaseId: string) =>
    td.auditSink.ofType(type).filter((e) => (e.context as Json | undefined)?.claim_case_id === claimCaseId);

  const postUrl = (w: World) => `/api/v1/p/${w.pariwarId}/admin/claims/${w.claimCaseId}/fee-bank-date`;
  const listUrl = (pariwarId: string, q = '') => `/api/v1/p/${pariwarId}/admin/fee-bank-dates${q}`;

  /** A valid body — the live tokens as the finance officer's list showed them. */
  async function body(w: World, over: Json = {}): Promise<Json> {
    return {
      statement_reference: w.utr,
      bank_credit_date: '2026-04-25',
      reason_code: 'recorded_by_family_after_death',
      note: NOTE,
      expected_live_check_id: await liveCheckId(w),
      expected_live_record_id: await liveRecordId(w),
      ...over,
    };
  }

  return { authenticate, inScope, world, staff, stepUp, reviewId, seedCheck, liveCheckId, records, liveRecordId, events, claimState, auditsFor, postUrl, listUrl, body };
}

export type FeeBankDateWorld = ReturnType<typeof feeBankDateWorld>;
export type World = Awaited<ReturnType<FeeBankDateWorld['world']>>;
export const errCode = (b: Json) => String((b.error as Json | undefined)?.code);
export const j = (r: { json(): unknown }) => r.json() as Json;
