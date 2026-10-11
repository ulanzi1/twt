// Story 6.28 — one payment per death through HTTP (:5433). `2026-10-11-318` Q1 A, `2026-10-11-319` OP2, OP4 H(iv).
//
//   AC2 — ONE test per approval ROUTE (the 6.24a / 6.26a precedent): with another claim X of the death past its final vote,
//         the District Admin's approval is ⛔ not stopped (P1); each FINAL route — the cycle-freeze vote, R9 finalize,
//         "no correction needed" and the Super Admin's escalation decision — answers 409
//         `<prefix>.death_already_finally_approved` with `details: {}` — ⛔ never a 500, ⛔ never a denial, ⛔ never X's id
//         anywhere in the body.
// A world per test in a FRESH Pariwar; X is seeded through the projector.

import { randomUUID } from 'node:crypto';

import { claim, cycleCalendar, ids, nominee } from '@twt/domain';
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
const STOP_WORDS = 'Another claim for this death has already passed the final vote. This claim cannot be finally approved.';

describe.skipIf(!hasDatabase)('Story 6.28 — one payment per death through HTTP (:5433)', { timeout: 30000 }, () => {
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
    const email = `opd628-${randomUUID()}@example.test`;
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

  type Role = 'district_admin' | 'pariwar_admin' | 'super_admin' | 'helpline_operator';
  async function staff(pariwarId: string, role: Role) {
    const display = {
      district_admin: 'Anita (District Admin)',
      pariwar_admin: 'Prakash (Pariwar Admin)',
      super_admin: 'Sushila (Super Admin)',
      helpline_operator: 'Hema (Helpline)',
    }[role];
    const a = await authenticate(display);
    const [dim, value] =
      role === 'district_admin' ? ['district', DISTRICT] : role === 'super_admin' ? ['global', null] : ['pariwar', pariwarId];
    await td.pool.query(`INSERT INTO role_grants (user_id, pariwar_id, role, scope_dimension, scope_value) VALUES ($1, $2, $3, $4, $5)`, [
      a.userId, pariwarId, role, dim, value,
    ]);
    await a.client.inject({ method: 'POST', url: '/api/v1/auth/scope', payload: { pariwarId } });
    return a;
  }

  async function stepUp(a: { client: Client }, actionContext: string): Promise<void> {
    expect((await a.client.inject({ method: 'POST', url: '/api/v1/auth/step-up/request', payload: { actionContext } })).statusCode).toBe(200);
    expect((await a.client.inject({ method: 'POST', url: '/api/v1/auth/step-up/verify', payload: { otp: adminStepUp.last?.code as string } })).statusCode).toBe(200);
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

  const emitter = (s: Awaited<ReturnType<typeof openScopeTx>>, pariwarId: string, memberId: string, claimCaseId: string) =>
    (from: string | null, to: string, eventType: string, extra: Json = {}) =>
      claim.projectClaimState(s.client, {
        claimCaseId: ids.claimId(claimCaseId), pariwarId: ids.pariwarId(pariwarId), deceasedMemberId: ids.memberId(memberId), intakeChannels: ['helpline'],
        claimantActorId: null, eventType: eventType as never, payload: { from_state: from, to_state: to, trigger: 'seed', actor: 'system', ...extra } as never,
        actorId: null,
      });

  /** A QUIET claim (one old declaration ⇒ ⛔ no warning) in `verification_in_progress`, approvable in full, in a FRESH
   *  Pariwar — R. */
  async function seedWorld(): Promise<{ pariwarId: string; memberId: string; claimCaseId: string }> {
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
      const emit = emitter(s, pariwarId, memberId, claimCaseId);
      await emit(null, 'intake_pending', 'claim.intake_initiated', { deceased_member_id: memberId, intake_channel: 'helpline', claimant_actor_id: null });
      await emit('intake_pending', 'intake_converged', 'claim.intake_converged');
      await emit('intake_converged', 'documents_pending', 'claim.documents_received');
      await emit('documents_pending', 'verification_in_progress', 'claim.peer_mesh_pinged', {
        selected_member_ids: [randomUUID()], metric_id: 'district_cohort_v1', metric_version: 1,
      });
    });
    await seedNomineeNameCheck(deps, pariwarId, claimCaseId);
    return { pariwarId, memberId, claimCaseId };
  }

  /** X — another claim of the same death, driven through the projector to `state` (past its final vote, or paid). */
  async function siblingAt(w: { pariwarId: string; memberId: string }, state: 'state_trustee_approved' | 'approved'): Promise<string> {
    const xid = randomUUID();
    await inScope(w.pariwarId, async (s) => {
      const emit = emitter(s, w.pariwarId, w.memberId, xid);
      await emit(null, 'intake_pending', 'claim.intake_initiated', { deceased_member_id: w.memberId, intake_channel: 'helpline', claimant_actor_id: null });
      await emit('intake_pending', 'intake_converged', 'claim.intake_converged');
      await emit('intake_converged', 'documents_pending', 'claim.documents_received');
      await emit('documents_pending', 'verification_in_progress', 'claim.peer_mesh_pinged', {
        selected_member_ids: [randomUUID()], metric_id: 'district_cohort_v1', metric_version: 1,
      });
      await emit('verification_in_progress', 'verifier_review', 'claim.verifier_reviewing');
      await emit('verifier_review', 'verifier_approved', 'claim.verifier_approved');
      await emit('verifier_approved', 'state_trustee_freeze', 'claim.state_trustee_frozen');
      await emit('state_trustee_freeze', 'state_trustee_approved', 'claim.state_trustee_approved');
      if (state === 'approved') await emit('state_trustee_approved', 'approved', 'claim.approved');
    });
    return xid;
  }

  const stateOf = async (cid: string) => (await td.pool.query<{ s: string }>('SELECT current_state::text AS s FROM claims WHERE claim_case_id = $1', [cid])).rows[0]!.s;
  const claimBase = (p: string, c: string) => `/api/v1/p/${p}/admin/claims/${c}`;
  const errOf = (body: string) => (JSON.parse(body) as { error: { code: string; message: string; details?: Json } }).error;

  function expectStopped(res: { statusCode: number; body: string }, prefix: string, xid: string): void {
    expect(res.statusCode, res.body).toBe(409);
    const err = errOf(res.body);
    expect(err).toMatchObject({ code: `${prefix}.death_already_finally_approved`, message: STOP_WORDS });
    expect(err.details ?? {}).toEqual({});
    // ⛔ The other claim's id ⛔ never leaves the server (OP2).
    expect(res.body.toLowerCase()).not.toContain(xid.toLowerCase());
    expect(err.message).not.toMatch(/refused|denied/i);
  }

  async function daApprove(da: { client: Client }, w: { pariwarId: string; claimCaseId: string }) {
    return da.client.inject({
      method: 'POST',
      url: `${claimBase(w.pariwarId, w.claimCaseId)}/verifier-decision`,
      payload: { outcome: 'approved', reason_code: 'r5_d_natural_death', rationale: 'Confirmed in person.' },
    });
  }

  // ── AC2 — the five routes ──────────────────────────────────────────────────────────────────────────────────────
  it('1/5 — the District Admin\'s verifier decision is ⛔ not STOPPED (P1) — it approves (201)', async () => {
    const w = await seedWorld();
    await siblingAt(w, 'state_trustee_approved');
    const da = await staff(w.pariwarId, 'district_admin');
    expect((await daApprove(da, w)).statusCode).toBe(201);
  });

  it('2/5 — the cycle-freeze vote → 409 `cycle_freeze.death_already_finally_approved`; Y unchanged', async () => {
    const w = await seedWorld();
    const xid = await siblingAt(w, 'state_trustee_approved');
    const da = await staff(w.pariwarId, 'district_admin');
    expect((await daApprove(da, w)).statusCode).toBe(201);
    const pa = await staff(w.pariwarId, 'pariwar_admin');
    const res = await pa.client.inject({
      method: 'POST', url: `/api/v1/p/${w.pariwarId}/admin/cycle-freeze/decision`, payload: { claim_case_id: w.claimCaseId, action: 'approve' },
    });
    expectStopped(res, 'cycle_freeze', xid);
    expect(await stateOf(w.claimCaseId)).toBe('verifier_approved');
  });

  it('3/5 — R9 finalize → 409 `r9_voting.death_already_finally_approved`', async () => {
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
    const xid = await siblingAt(w, 'state_trustee_approved');
    await stepUp(pa, 'r9_finalize');
    expectStopped(await pa.client.inject({ method: 'POST', url: `${r9}/finalize`, payload: {} }), 'r9_voting', xid);
  });

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

  it('4/5 — "no correction needed" (6.19c D27) → 409 `closure.death_already_finally_approved`', async () => {
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
    const xid = await siblingAt(w, 'state_trustee_approved');
    const res = await w.pa.client.inject({
      method: 'POST', url: `${claimBase(w.pariwarId, w.claimCaseId)}/correction/no-correction-needed/approve`, payload: {},
    });
    expectStopped(res, 'closure', xid);
  });

  it('5/5 — the Super Admin\'s escalation decision (→ `decideEscalatedClosure` via `translateClosureError`) → 409 `closure.death_already_finally_approved`', async () => {
    const w = await returned('staff');
    await inScope(w.pariwarId, (s) =>
      claim.escalateStaffCase(s.client, {
        pariwarId: ids.pariwarId(w.pariwarId), claimCaseId: ids.claimId(w.claimCaseId),
        now: new Date(`${cycleCalendar.addCalendarDays(w.day0, 90)}T04:30:00.000Z`),
      }),
    );
    const xid = await siblingAt(w, 'state_trustee_approved');
    const sa = await staff(w.pariwarId, 'super_admin');
    const res = await sa.client.inject({
      method: 'POST', url: `${claimBase(w.pariwarId, w.claimCaseId)}/correction/escalation/decision`,
      payload: { decision: 'approve', reason: 'details_verified', note: 'Checked.' },
    });
    expectStopped(res, 'closure', xid);
  });
});
