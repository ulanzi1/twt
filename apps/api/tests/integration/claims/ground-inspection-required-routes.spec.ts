// Story 6.26a — AC10: the ground-inspection WAIT through HTTP, ONE test per approval ROUTE (five): the District Admin's
// verifier decision, the cycle-freeze vote, R9 finalize, "no correction needed" (6.19c D27) and the Super Admin's
// escalation decision (which reaches `decideEscalatedClosure` through `translateClosureError`). Each answers 409
// `<prefix>.ground_inspection_required` `{ reason }` in words written for a reader — ⛔ never a 500, ⛔ never a denial.
// A quiet world (⛔ no warnings) is made to WAIT by superseding its completed inspections (a superseded assignment counts
// for ⛔ nothing — GI2).

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

describe.skipIf(!hasDatabase)('Story 6.26a — the ground-inspection wait on every approval route (:5433)', { timeout: 30000 }, () => {
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
    const email = `gi26a-${randomUUID()}@example.test`;
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
   *  complete inspection (the fixture default) — in a FRESH Pariwar. */
  async function seedWorld(): Promise<{ pariwarId: string; claimCaseId: string }> {
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
    return { pariwarId, claimCaseId };
  }

  /** Supersede the claim's completed inspections — it then WAITS (`no_completed_inspection`). */
  const voidInspections = (claimCaseId: string) =>
    td.pool.query(`UPDATE claim_ground_inspections SET status = 'superseded' WHERE claim_case_id = $1 AND status = 'completed'`, [claimCaseId]);

  const claimBase = (p: string, c: string) => `/api/v1/p/${p}/admin/claims/${c}`;
  const errOf = (body: string) => (JSON.parse(body) as { error: { code: string; message: string; details?: Json } }).error;

  /** The ONE assertion every route makes: 409, its own prefix, the reason, and words that say the claim WAITS. */
  function expectWaits(res: { statusCode: number; body: string }, prefix: string): void {
    expect(res.statusCode, res.body).toBe(409);
    const err = errOf(res.body);
    expect(err).toMatchObject({ code: `${prefix}.ground_inspection_required`, details: { reason: 'no_completed_inspection' } });
    expect(err.message).toMatch(/waiting for its ground inspection/);
    expect(err.message).not.toMatch(/refused|denied/i);
  }

  async function daApprove(da: { client: Client }, w: { pariwarId: string; claimCaseId: string }) {
    return da.client.inject({
      method: 'POST',
      url: `${claimBase(w.pariwarId, w.claimCaseId)}/verifier-decision`,
      payload: { outcome: 'approved', reason_code: 'r5_d_natural_death', rationale: 'Confirmed in person.' },
    });
  }

  it('1/5 — the District Admin\'s verifier decision → 409 `verifier_decision.ground_inspection_required`', async () => {
    const w = await seedWorld();
    const da = await staff(w.pariwarId, 'district_admin');
    await voidInspections(w.claimCaseId);
    expectWaits(await daApprove(da, w), 'verifier_decision');
  });

  it('2/5 — the cycle-freeze vote → 409 `cycle_freeze.ground_inspection_required`', async () => {
    const w = await seedWorld();
    const da = await staff(w.pariwarId, 'district_admin');
    expect((await daApprove(da, w)).statusCode).toBe(201);
    await voidInspections(w.claimCaseId);
    const pa = await staff(w.pariwarId, 'pariwar_admin');
    const res = await pa.client.inject({
      method: 'POST', url: `/api/v1/p/${w.pariwarId}/admin/cycle-freeze/decision`, payload: { claim_case_id: w.claimCaseId, action: 'approve' },
    });
    expectWaits(res, 'cycle_freeze');
  });

  it('3/5 — R9 finalize → 409 `r9_voting.ground_inspection_required`', async () => {
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
    await voidInspections(w.claimCaseId);
    const req = await pa.client.inject({ method: 'POST', url: '/api/v1/auth/step-up/request', payload: { actionContext: 'r9_finalize' } });
    expect(req.statusCode).toBe(200);
    expect((await pa.client.inject({ method: 'POST', url: '/api/v1/auth/step-up/verify', payload: { otp: adminStepUp.last?.code as string } })).statusCode).toBe(200);
    expectWaits(await pa.client.inject({ method: 'POST', url: `${r9}/finalize`, payload: {} }), 'r9_voting');
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

  it('4/5 — "no correction needed" (6.19c D27) → 409 `closure.ground_inspection_required`', async () => {
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
    await voidInspections(w.claimCaseId);
    const res = await w.pa.client.inject({
      method: 'POST', url: `${claimBase(w.pariwarId, w.claimCaseId)}/correction/no-correction-needed/approve`, payload: {},
    });
    expectWaits(res, 'closure');
  });

  it('5/5 — the Super Admin\'s escalation decision (→ `decideEscalatedClosure` via `translateClosureError`) → 409 `closure.ground_inspection_required`', async () => {
    const w = await returned('staff');
    await inScope(w.pariwarId, (s) =>
      claim.escalateStaffCase(s.client, {
        pariwarId: ids.pariwarId(w.pariwarId), claimCaseId: ids.claimId(w.claimCaseId),
        now: new Date(`${cycleCalendar.addCalendarDays(w.day0, 90)}T04:30:00.000Z`),
      }),
    );
    await voidInspections(w.claimCaseId);
    const sa = await staff(w.pariwarId, 'super_admin');
    const res = await sa.client.inject({
      method: 'POST', url: `${claimBase(w.pariwarId, w.claimCaseId)}/correction/escalation/decision`,
      payload: { decision: 'approve', reason: 'details_verified', note: 'Checked.' },
    });
    expectWaits(res, 'closure');
  });
});
