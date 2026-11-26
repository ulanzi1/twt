// Story 6.39a — AC7 through HTTP: the NEW wait reason `bank_date_recorded` (DL7, N4) at ONE site per translator —
// `verifier_decision.`, `cycle_freeze.`, `r9_voting.`, `closure.` — each 409 `<prefix>.membership_check_required`
// `{ reason: 'bank_date_recorded' }` in the approved words (`2026-11-27-510` DL7), ⛔ a denial; and a re-check that
// considers the record lets the approval through. The harness is a COPY of 6.39's `membership-check-required-routes.spec.ts`
// (a quiet, approval-ready claim — ⛔ edited there): the wait is made by a RAW live bank-date record the live check does ⛔ name.

import { randomUUID } from 'node:crypto';

import { claim, ids, nominee } from '@twt/domain';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { AppDeps } from '../../../src/context.js';
import * as service from '../../../src/modules/auth/admin/admin-auth.service.js';
import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { buildServer } from '../../../src/server.js';
import { buildTestDeps, hasDatabase, makeClient, type CapturingStepUpDelivery, type TestDeps } from '../_setup.js';
import { seedNomineeNameCheck } from '../_nominee-name-check-fixture.js';
import { FakeWebAuthnProvider } from '../_webauthn-fake.js';

type Client = ReturnType<typeof makeClient>;
type Json = Record<string, unknown>;

const DISTRICT = 'Patna';
const R9_CLAUSE = 'niy.special-death.r9';
const OLD_DECLARATION = new Date(Date.now() - 400 * 86_400_000);

describe.skipIf(!hasDatabase)('Story 6.39a — `bank_date_recorded` at one site per translator (AC7)', { timeout: 30000 }, () => {
  let td: TestDeps;
  let deps: AppDeps;
  let fakeWebauthn: FakeWebAuthnProvider;
  let adminStepUp: CapturingStepUpDelivery;
  let app: Awaited<ReturnType<typeof buildServer>>;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    fakeWebauthn = new FakeWebAuthnProvider();
    td = buildTestDeps({ webauthn: fakeWebauthn });
    deps = td.deps;
    adminStepUp = td.adminStepUpDelivery;
    app = await buildServer(deps);
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

  async function authenticate(displayName: string): Promise<{ client: Client; userId: string }> {
    const email = `mc639a-${randomUUID()}@example.test`;
    const password = 'CorrectHorseBatteryStaple9';
    const userId = await service.createAdminAccount(deps, { email, password, displayName });
    createdUserIds.push(userId);
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

  async function staff(pariwarId: string, role: 'district_admin' | 'pariwar_admin' | 'super_admin') {
    const display = { district_admin: 'Anita (District Admin)', pariwar_admin: 'Prakash (Pariwar Admin)', super_admin: 'Sushila (Super Admin)' }[role];
    const a = await authenticate(display);
    const [dim, value] = role === 'district_admin' ? ['district', DISTRICT] : role === 'super_admin' ? ['global', null] : ['pariwar', pariwarId];
    await td.pool.query(`INSERT INTO role_grants (user_id, pariwar_id, role, scope_dimension, scope_value) VALUES ($1, $2, $3, $4, $5)`, [
      a.userId, pariwarId, role, dim, value,
    ]);
    await a.client.inject({ method: 'POST', url: '/api/v1/auth/scope', payload: { pariwarId } });
    return a;
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

  /** A QUIET claim (one old declaration ⇒ ⛔ no warning) in `verification_in_progress`, approvable in full — with its
   *  passing membership check (the fixture default) — in a FRESH Pariwar. */
  async function seedWorld(): Promise<{ pariwarId: string; claimCaseId: string; memberId: string }> {
    const pariwarId = randomUUID();
    const memberId = randomUUID();
    const claimCaseId = randomUUID();
    await inScope(pariwarId, async (s) => {
      const pid = ids.pariwarId(pariwarId);
      const mid = ids.memberId(memberId);
      await s.client.query(
        `INSERT INTO members (member_id, pariwar_id, state, state_event_version, created_at, updated_at) VALUES ($1, $2, 'active', 0, now(), now())`,
        [memberId, pariwarId],
      );
      await s.client.query(
        `INSERT INTO member_postings (member_id, pariwar_id, district, is_retirement, created_at) VALUES ($1, $2, $3, false, now())`,
        [memberId, pariwarId, DISTRICT],
      );
      const row = { rank: 1 as const, splitPct: 100 as const, relationship: 'spouse', nameCiphertext: 'enc:v1:n', mobileCiphertext: 'enc:v1:m', addressCiphertext: null };
      await nominee.replaceMemberNominees(s.tx, { memberId: mid, pariwarId: pid, nominees: [row] });
      await nominee.appendMemberDeclarationVersions(s.tx, {
        memberId: mid, pariwarId: pid, plan: nominee.planDeclarationVersions(await nominee.getNomineeVersionHeads(s.tx, pid, mid), [1]),
        nominees: [row], recordedAt: OLD_DECLARATION, eventVersion: null,
      });
      const emit = (from: string | null, to: string, eventType: string, extra: Json = {}) =>
        claim.projectClaimState(s.client, {
          claimCaseId: ids.claimId(claimCaseId), pariwarId: pid, deceasedMemberId: mid, intakeChannels: ['helpline'], claimantActorId: null,
          eventType: eventType as never, payload: { from_state: from, to_state: to, trigger: 'seed', actor: 'system', ...extra } as never, actorId: null,
        });
      await emit(null, 'intake_pending', 'claim.intake_initiated', { deceased_member_id: memberId, intake_channel: 'helpline', claimant_actor_id: null });
      await emit('intake_pending', 'intake_converged', 'claim.intake_converged');
      await emit('intake_converged', 'documents_pending', 'claim.documents_received');
      await emit('documents_pending', 'verification_in_progress', 'claim.peer_mesh_pinged', {
        selected_member_ids: [randomUUID()], metric_id: 'district_cohort_v1', metric_version: 1,
      });
    });
    await seedNomineeNameCheck(deps, pariwarId, claimCaseId);
    return { pariwarId, claimCaseId, memberId };
  }

  type World = { pariwarId: string; claimCaseId: string; memberId: string };

  const stateOf = async (claimCaseId: string) =>
    (await td.pool.query<{ current_state: string }>(`SELECT current_state FROM claims WHERE claim_case_id = $1`, [claimCaseId])).rows[0]!.current_state;

  const claimBase = (p: string, c: string) => `/api/v1/p/${p}/admin/claims/${c}`;
  const errOf = (body: string) => (JSON.parse(body) as { error: { code: string; message: string; details?: Json } }).error;

  const daDecision = (da: { client: Client }, w: World, payload: Json) =>
    da.client.inject({ method: 'POST', url: `${claimBase(w.pariwarId, w.claimCaseId)}/verifier-decision`, payload });
  const daApprove = (da: { client: Client }, w: World) =>
    daDecision(da, w, { outcome: 'approved', reason_code: 'r5_d_natural_death', rationale: 'Confirmed in person.' });
  const cycleDecision = (pa: { client: Client }, w: World, payload: Json) =>
    pa.client.inject({ method: 'POST', url: `/api/v1/p/${w.pariwarId}/admin/cycle-freeze/decision`, payload: { claim_case_id: w.claimCaseId, ...payload } });

  /** A quiet claim the District Admin approved, returned by the Pariwar Admin and marked `mustAct`. */
  async function returned(mustAct: 'family' | 'staff') {
    const w = await seedWorld();
    const da = await staff(w.pariwarId, 'district_admin');
    expect((await daApprove(da, w)).statusCode).toBe(201);
    const pa = await staff(w.pariwarId, 'pariwar_admin');
    const run = await inScope(w.pariwarId, async (s) => {
      await claim.returnToDistrictAdmin(s.client, {
        claimCaseId: ids.claimId(w.claimCaseId), pariwarId: ids.pariwarId(w.pariwarId), reasonCode: 'other',
        rationaleCiphertext: 'enc:v1:return-note', actorId: pa.userId, actorDisplay: 'Prakash (Pariwar Admin)', actor: 'trustee',
      });
      const mark = await claim.writeCorrectionMark(s.client, {
        pariwarId: ids.pariwarId(w.pariwarId), claimCaseId: ids.claimId(w.claimCaseId), mustAct, actorId: pa.userId,
        actorDisplay: 'Prakash (Pariwar Admin)', setByRole: 'pariwar_admin', noteCiphertext: null, isReturnMark: true, hold: claim.noCorrectionHold,
      });
      return mark.openedRun!;
    });
    return { ...w, da, pa, day0: run.day0 };
  }


  const BANK_WORDS = "The finance officer recorded the bank's date for the joining fee — check again.";

  /** A live bank-date record on the claim, RAW — the live check does ⛔ name it ⇒ the gate answers `bank_date_recorded`. */
  async function bankDateRecorded(w: World): Promise<string> {
    const receiptId = randomUUID();
    await td.pool.query(
      `INSERT INTO vyawastha_shulk_receipts (receipt_id, member_id, pariwar_id, tr, utr, amount_inr, payment_method, paid_at, valid_through)
       VALUES ($1, $2, $3, $4, $5, 110, 'upi', '2026-03-01T06:00:00Z', '2099-01-01T00:00:00Z')`,
      [receiptId, w.memberId, w.pariwarId, `TR-${randomUUID()}`, `${Math.floor(1e11 + Math.random() * 9e11)}`],
    );
    const { rows } = await td.pool.query<{ record_id: string }>(
      `INSERT INTO claim_fee_bank_dates (pariwar_id, claim_case_id, deceased_member_id, fee_receipt_id, bank_credit_date, reason_code, note_ciphertext, decided_by_actor_id, decided_by_display)
       VALUES ($1, $2, $3, $4, '2026-02-01', 'other', 'enc:v1:n', $5, 'Meera (Finance Officer)') RETURNING record_id`,
      [w.pariwarId, w.claimCaseId, w.memberId, receiptId, randomUUID()],
    );
    return rows[0]!.record_id;
  }
  /**
   * The live check now NAMES the record (as a re-check that considered it would) — the wait lifts. A copy of the live check
   * with `fee_bank_date_id` set, superseding it — plain INSERT / UPDATE of the granted stamp (⛔ DDL on a shared table).
   */
  async function nameRecord(w: World, recordId: string): Promise<void> {
    const { rows } = await td.pool.query<{ check_id: string }>(
      `SELECT check_id FROM claim_membership_checks WHERE claim_case_id = $1 AND superseded_at IS NULL`,
      [w.claimCaseId],
    );
    const live = rows[0]!.check_id;
    await td.pool.query(`UPDATE claim_membership_checks SET superseded_at = now(), superseded_reason = 're_checked' WHERE check_id = $1`, [live]);
    await td.pool.query(
      `INSERT INTO claim_membership_checks (claim_case_id, pariwar_id, deceased_member_id, death_certificate_review_id, fee_receipt_id,
         fee_outcome, fee_date_source, fee_bank_date_id, identity_required, identity_outcome, identity_reason, decided_by_actor_id, decided_by_display)
       SELECT claim_case_id, pariwar_id, deceased_member_id, death_certificate_review_id, fee_receipt_id,
              fee_outcome, 'recorded', $2, identity_required, identity_outcome, identity_reason, decided_by_actor_id, decided_by_display
         FROM claim_membership_checks WHERE check_id = $1`,
      [live, recordId],
    );
  }

  function expectBankWait(res: { statusCode: number; body: string }, prefix: string): void {
    expect(res.statusCode, res.body).toBe(409);
    const err = errOf(res.body);
    expect(err).toMatchObject({ code: `${prefix}.membership_check_required`, details: { reason: 'bank_date_recorded' } });
    expect(err.message).toBe(BANK_WORDS);
    expect(err.message).not.toMatch(/refused|denied/i);
  }

  it('⭐ 1/4 — `verifier_decision.` — the District Admin\'s approve WAITS on `bank_date_recorded`; a re-check naming the record lets it through', async () => {
    const w = await seedWorld();
    const da = await staff(w.pariwarId, 'district_admin');
    const recordId = await bankDateRecorded(w);
    expectBankWait(await daApprove(da, w), 'verifier_decision');
    expect(await stateOf(w.claimCaseId)).toBe('verification_in_progress');
    await nameRecord(w, recordId);
    expect((await daApprove(da, w)).statusCode).toBe(201);
  });

  it('⭐ 2/4 — `cycle_freeze.` — the final vote WAITS on `bank_date_recorded`', async () => {
    const w = await seedWorld();
    const da = await staff(w.pariwarId, 'district_admin');
    expect((await daApprove(da, w)).statusCode).toBe(201);
    const pa = await staff(w.pariwarId, 'pariwar_admin');
    await bankDateRecorded(w);
    expectBankWait(await cycleDecision(pa, w, { action: 'approve' }), 'cycle_freeze');
    expect(await stateOf(w.claimCaseId)).toBe('verifier_approved');
  });

  it('⭐ 3/4 — `r9_voting.` — R9 finalize WAITS on `bank_date_recorded`', async () => {
    const w = await seedWorld();
    await td.pool.query(
      `INSERT INTO clause_versions (clause_version_id, clause_id, pariwar_id, version, effective_date, payload, benefit_mechanism)
       VALUES (gen_random_uuid(), $1, $2, 1, now(), $3, 'pool')`,
      [R9_CLAUSE, w.pariwarId, JSON.stringify({ rule_code: 'R9', voting_required: true, majority_required: true, on_pass: 'route_r9_voting' })],
    );
    await td.pool.query(
      `INSERT INTO claim_state_trustee_decisions (claim_case_id, pariwar_id, phase, outcome, reason_code, actor_id, actor_display)
       VALUES ($1, $2, 'routing', 'routed_to_r9', 'r9_special_case', $3, 'Router')`,
      [w.claimCaseId, w.pariwarId, randomUUID()],
    );
    const pa = await staff(w.pariwarId, 'pariwar_admin');
    const r9 = `/api/v1/p/${w.pariwarId}/admin/r9-voting/${w.claimCaseId}`;
    expect((await pa.client.inject({ method: 'POST', url: `${r9}/open`, payload: { clause_id: R9_CLAUSE, panel_actor_ids: [pa.userId] } })).statusCode).toBe(201);
    expect((await pa.client.inject({ method: 'POST', url: `${r9}/vote`, payload: { vote: 'approve', rationale: 'yes' } })).statusCode).toBe(201);
    await bankDateRecorded(w);
    expect((await pa.client.inject({ method: 'POST', url: '/api/v1/auth/step-up/request', payload: { actionContext: 'r9_finalize' } })).statusCode).toBe(200);
    expect((await pa.client.inject({ method: 'POST', url: '/api/v1/auth/step-up/verify', payload: { otp: adminStepUp.last?.code as string } })).statusCode).toBe(200);
    expectBankWait(await pa.client.inject({ method: 'POST', url: `${r9}/finalize`, payload: {} }), 'r9_voting');
  });

  it('⭐ 4/4 — `closure.` — "no correction needed" WAITS on `bank_date_recorded` (the API\'s message IS the staff copy there)', async () => {
    const w = await returned('family');
    await inScope(w.pariwarId, (s) =>
      claim.recordNoCorrectionNeeded(s.client, {
        pariwarId: ids.pariwarId(w.pariwarId), claimCaseId: ids.claimId(w.claimCaseId), actorId: w.da.userId,
        actorDisplay: 'Anita (District Admin)', now: new Date(), markNoteCiphertext: 'enc:v1:m', noteCiphertext: 'enc:v1:n',
        setByRole: 'district_admin', hold: claim.isCorrectionClaimHeld,
      }),
    );
    await td.pool.query(
      `UPDATE claim_correction_no_correction_records SET recorded_at = recorded_at - interval '1 minute' WHERE claim_case_id = $1`,
      [w.claimCaseId],
    );
    await seedNomineeNameCheck(deps, w.pariwarId, w.claimCaseId);
    await bankDateRecorded(w);
    const res = await w.pa.client.inject({
      method: 'POST', url: `${claimBase(w.pariwarId, w.claimCaseId)}/correction/no-correction-needed/approve`, payload: {},
    });
    expectBankWait(res, 'closure');
  });
});
