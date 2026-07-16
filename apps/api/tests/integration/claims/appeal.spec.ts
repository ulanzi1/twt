// Internal 3-stage appeal WRITE surface E2E (live DB :5433) — Story 6.16 (Task 11; AC1–AC10; 6.16 review
// finding P14 — no apps/api route-level test existed for any appeal endpoint before this file).
//
// Drives the member-app + admin appeal routes through the REAL guard chain (member JWT / admin passkey
// cookie session) via `app.inject`. Focus — exactly the gaps the 6.16 code review flagged as untested at the
// HTTP layer:
//   · D-D reviewer-conflict is rejected end-to-end (409 `appeal.reviewer_conflict`) — the ORIGINAL verifier
//     is blocked from Stage-1 review by the API before the domain writer is ever reached.
//   · The D-G go-live gate fails-closed (503 `appeal.pending_legal_review`) on every ADJUDICATION write for a
//     Pariwar still pending legal review — but NEVER blocks member-initiate (D-G's explicit carve-out).
//   · Step-up gating on Stage-2 finalize / Stage-3 decide (403 `auth.step_up_required` without a fresh
//     elevation; success with one).
//   · RBAC: a state_trustee (does not hold any appeal key) is denied 403; a district_admin (holds ONLY
//     `claim.appeal_review`) CAN read the admin case model — the P3 fix for the GET-case permission gap that
//     previously locked Stage-1 reviewers out of the case they must review.
//   · Ownership (IDOR guard, the P1 fix): a member cannot initiate/view the appeal-status of ANOTHER
//     member's claim (404, no cross-claim existence oracle).
//   · Happy path: denied → member initiate → Stage-1 advance → Stage-2 panel open/vote/finalize (reverse) →
//     `reversed`, surfaced correctly through GET case.
//
// ⚠ Own-committing seed writes; fresh random pariwarId per test; events_log append-only
// ([[project_live_db_test_gotchas]]).

import { randomUUID } from 'node:crypto';

import { claim, ids } from '@twt/domain';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { AppDeps } from '../../../src/context.js';
import * as service from '../../../src/modules/auth/admin/admin-auth.service.js';
import { signAccessToken } from '../../../src/modules/auth/member/tokens.js';
import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { buildServer } from '../../../src/server.js';
import { buildTestDeps, hasDatabase, makeClient, type TestDeps, type CapturingStepUpDelivery } from '../_setup.js';
import { FakeWebAuthnProvider } from '../_webauthn-fake.js';

type Client = ReturnType<typeof makeClient>;
const ACCESS_TTL_MS = 15 * 60 * 1000;
const DISTRICT = 'Patna';

describe.skipIf(!hasDatabase)('Internal 3-stage appeal — E2E (:5433)', () => {
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

  async function authenticate(opts: { displayName?: string | null } = {}): Promise<{ client: Client; userId: string }> {
    const email = `appeal-${randomUUID()}@example.test`;
    const password = 'CorrectHorseBatteryStaple9';
    const userId = await service.createAdminAccount(deps, {
      email,
      password,
      ...(opts.displayName != null ? { displayName: opts.displayName } : {}),
    });
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

  async function grant(userId: string, pariwarId: string, role: string, dim: string, value: string | null): Promise<void> {
    const c = await td.pool.connect();
    try {
      await c.query(`INSERT INTO role_grants (user_id, pariwar_id, role, scope_dimension, scope_value) VALUES ($1, $2, $3, $4, $5)`, [
        userId,
        pariwarId,
        role,
        dim,
        value,
      ]);
    } finally {
      c.release();
    }
  }

  /** District Admin — holds ONLY `claim.appeal_review` (district-dimension, Stage-1). */
  async function districtAdmin(pariwarId: string, displayName = 'Anita (District Admin)'): Promise<{ client: Client; userId: string }> {
    const a = await authenticate({ displayName });
    await grant(a.userId, pariwarId, 'district_admin', 'district', DISTRICT);
    return a;
  }

  /** Pariwar Admin — Trustee-Lite v1: holds `claim.appeal_vote` (Stage-2) + `claim.appeal_final` (Stage-3). */
  async function pariwarAdmin(pariwarId: string, displayName = 'Trustee'): Promise<{ client: Client; userId: string }> {
    const a = await authenticate({ displayName });
    await grant(a.userId, pariwarId, 'pariwar_admin', 'pariwar', pariwarId);
    return a;
  }

  /** state_trustee holds NONE of the three appeal keys in v1 (the D-B Epic-3 deferral). */
  async function stateTrustee(pariwarId: string): Promise<{ client: Client; userId: string }> {
    const a = await authenticate({ displayName: 'Deferred Trustee' });
    await grant(a.userId, pariwarId, 'state_trustee', 'state', pariwarId);
    return a;
  }

  async function elevate(client: Client, actionContext: string): Promise<void> {
    const req = await client.inject({ method: 'POST', url: '/api/v1/auth/step-up/request', payload: { actionContext } });
    expect(req.statusCode).toBe(200);
    const code = adminStepUp.last?.code as string;
    const ver = await client.inject({ method: 'POST', url: '/api/v1/auth/step-up/verify', payload: { otp: code } });
    expect(ver.statusCode).toBe(200);
  }

  /** D-G go-live gate: mark a Pariwar's appeal flow `cleared` (default is fail-closed `pending_legal_review`). */
  async function clearLegalReview(pariwarId: string): Promise<void> {
    const c = await td.pool.connect();
    try {
      await c.query(
        `INSERT INTO pariwar_appeal_config (pariwar_id, legal_review_status) VALUES ($1, 'cleared')
           ON CONFLICT (pariwar_id) DO UPDATE SET legal_review_status = 'cleared'`,
        [pariwarId],
      );
    } finally {
      c.release();
    }
  }

  /** Seed a deceased member + a posting district (so the Stage-1 route can server-derive the authz district). */
  async function seedDeceasedMember(pariwarId: string, district: string | null): Promise<ids.MemberId> {
    const memberId = randomUUID();
    const c = await td.pool.connect();
    try {
      await c.query(
        `INSERT INTO members (member_id, pariwar_id, state, state_event_version, created_at, updated_at)
         VALUES ($1, $2, 'active', 0, now(), now())`,
        [memberId, pariwarId],
      );
      if (district !== null) {
        await c.query(
          `INSERT INTO member_postings (member_id, pariwar_id, district, is_retirement, created_at)
           VALUES ($1, $2, $3, false, now())`,
          [memberId, pariwarId, district],
        );
      }
    } finally {
      c.release();
    }
    return ids.memberId(memberId);
  }

  /** Drive a fresh claim to `denied`, owned by `claimantActorId` (a member session actor). */
  async function seedDeniedClaim(pariwarId: string, deceasedMemberId: ids.MemberId, claimantActorId: string): Promise<string> {
    const claimCaseId = ids.claimId(randomUUID());
    const scopeTx = await openScopeTx(deps, pariwarId);
    const emit = (from: string | null, to: string, eventType: string, extra: Record<string, unknown> = {}) =>
      claim.projectClaimState(scopeTx.client, {
        claimCaseId,
        pariwarId: ids.pariwarId(pariwarId),
        deceasedMemberId,
        intakeChannels: ['member_app'],
        claimantActorId,
        eventType: eventType as never,
        payload: { from_state: from, to_state: to, trigger: 'seed', actor: 'system', ...extra },
        actorId: claimantActorId,
      });
    try {
      await emit(null, 'intake_pending', 'claim.intake_initiated', { deceased_member_id: String(deceasedMemberId), intake_channel: 'member_app', claimant_actor_id: claimantActorId });
      await emit('intake_pending', 'intake_converged', 'claim.intake_converged');
      await emit('intake_converged', 'documents_pending', 'claim.documents_received');
      await emit('documents_pending', 'verification_in_progress', 'claim.peer_mesh_pinged', { selected_member_ids: [randomUUID()], metric_id: 'district_cohort_v1', metric_version: 1 });
      await emit('verification_in_progress', 'verifier_review', 'claim.verifier_reviewing');
      await emit('verifier_review', 'denied', 'claim.verifier_denied');
      await scopeTx.client.query(
        `INSERT INTO claim_verifier_decisions (claim_case_id, pariwar_id, outcome, reason_code, rationale_ciphertext, actor_id, actor_display)
         VALUES ($1, $2, 'denied', 'other', 'enc:v1:x', $3, 'Original Verifier')`,
        [String(claimCaseId), pariwarId, VERIFIER],
      );
      await closeScopeTx(scopeTx, true);
    } catch (err) {
      await closeScopeTx(scopeTx, false);
      throw err;
    }
    return String(claimCaseId);
  }

  const VERIFIER = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1';

  function memberToken(memberId: string, pariwarId: string): string {
    return signAccessToken(app, { memberId, pariwarId, deviceId: 'test-device' }, ACCESS_TTL_MS);
  }

  async function memberInject(method: 'GET' | 'POST', url: string, token: string, payload?: Record<string, unknown>): Promise<{ status: number; body: Record<string, unknown> }> {
    const res = await app.inject({ method, url, payload, headers: { authorization: `Bearer ${token}` } });
    let body: Record<string, unknown> = {};
    try {
      body = res.json();
    } catch {
      body = {};
    }
    return { status: res.statusCode, body };
  }

  const memberUrl = (c: string) => `/api/v1/member/claims/${c}/appeal`;
  const caseUrl = (p: string, c: string) => `/api/v1/p/${p}/admin/claims/${c}/appeal`;
  const stage1Url = (p: string, c: string) => `${caseUrl(p, c)}/stage1`;
  const stage2OpenUrl = (p: string, c: string) => `${caseUrl(p, c)}/stage2/open`;
  const stage2VoteUrl = (p: string, c: string) => `${caseUrl(p, c)}/stage2/vote`;
  const stage2FinalizeUrl = (p: string, c: string) => `${caseUrl(p, c)}/stage2/finalize`;
  const stage3Url = (p: string, c: string) => `${caseUrl(p, c)}/stage3`;

  it('AC10 — no session → 401 on both member and admin appeal routes', async () => {
    const pariwarId = randomUUID();
    const claimCaseId = randomUUID();
    const memberRes = await app.inject({ method: 'POST', url: memberUrl(claimCaseId), payload: {} });
    expect(memberRes.statusCode).toBe(401);
    const adminRes = await makeClient(app).inject({ method: 'GET', url: caseUrl(pariwarId, claimCaseId) });
    expect(adminRes.statusCode).toBe(401);
  });

  it('AC10 — a state_trustee (holds NONE of the three appeal keys, the D-B Epic-3 deferral) is denied 403 on Stage-1 review', async () => {
    const pariwarId = randomUUID();
    const deceased = await seedDeceasedMember(pariwarId, DISTRICT);
    const claimCaseId = await seedDeniedClaim(pariwarId, deceased, randomUUID());
    await clearLegalReview(pariwarId);
    const a = await stateTrustee(pariwarId);
    const res = await a.client.inject({
      method: 'POST',
      url: stage1Url(pariwarId, claimCaseId),
      payload: { decision: 'advance', rationale: 'stands on the merits' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('P3 fix — a district_admin (holds ONLY claim.appeal_review) CAN GET the admin case model', async () => {
    const pariwarId = randomUUID();
    const deceased = await seedDeceasedMember(pariwarId, DISTRICT);
    const claimCaseId = await seedDeniedClaim(pariwarId, deceased, randomUUID());
    await clearLegalReview(pariwarId);
    const a = await districtAdmin(pariwarId);
    const res = await a.client.inject({ method: 'GET', url: caseUrl(pariwarId, claimCaseId) });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { claim_state: string };
    expect(body.claim_state).toBe('denied');
  });

  it('D-G go-live gate — 503 on the Stage-1 ADJUDICATION write while pending legal review, but member-initiate is NEVER gated', async () => {
    const pariwarId = randomUUID();
    const deceased = await seedDeceasedMember(pariwarId, DISTRICT);
    const memberId = randomUUID();
    const claimCaseId = await seedDeniedClaim(pariwarId, deceased, memberId);
    // No clearLegalReview() call — the Pariwar defaults to fail-closed `pending_legal_review`.

    // Member-initiate is NEVER gated by D-G (a claimant's right to file must not be blocked by trust-side config).
    const init = await memberInject('POST', memberUrl(claimCaseId), memberToken(memberId, pariwarId), {});
    expect(init.status).toBe(201);

    const a = await districtAdmin(pariwarId);
    const res = await a.client.inject({
      method: 'POST',
      url: stage1Url(pariwarId, claimCaseId),
      payload: { decision: 'advance', rationale: 'stands on the merits' },
    });
    expect(res.statusCode).toBe(503);
    expect((res.json() as { error: { code: string } }).error.code).toBe('appeal.pending_legal_review');
  });

  it('D-D — the ORIGINAL verifier is rejected 409 appeal.reviewer_conflict at the API layer; an independent reviewer succeeds', async () => {
    const pariwarId = randomUUID();
    const deceased = await seedDeceasedMember(pariwarId, DISTRICT);
    const memberId = randomUUID();
    const claimCaseId = await seedDeniedClaim(pariwarId, deceased, memberId);
    await clearLegalReview(pariwarId);
    await memberInject('POST', memberUrl(claimCaseId), memberToken(memberId, pariwarId), {});

    // Re-point the seeded verifier decision's actor_id at a real admin session, so THAT session is the
    // "original decider" the D-D exclusion set must catch.
    const conflictedReviewer = await districtAdmin(pariwarId, 'Original Verifier (now attempting Stage-1)');
    await td.pool.query(`UPDATE claim_verifier_decisions SET actor_id = $1 WHERE claim_case_id = $2`, [conflictedReviewer.userId, claimCaseId]);

    const conflictRes = await conflictedReviewer.client.inject({
      method: 'POST',
      url: stage1Url(pariwarId, claimCaseId),
      payload: { decision: 'advance', rationale: 'stands on the merits' },
    });
    expect(conflictRes.statusCode).toBe(409);
    expect((conflictRes.json() as { error: { code: string } }).error.code).toBe('appeal.reviewer_conflict');

    // An independent District Admin is allowed.
    const independent = await districtAdmin(pariwarId, 'Independent Reviewer');
    const ok = await independent.client.inject({
      method: 'POST',
      url: stage1Url(pariwarId, claimCaseId),
      payload: { decision: 'advance', rationale: 'stands on the merits' },
    });
    expect(ok.statusCode).toBe(201);
  });

  it('P1 fix — a member cannot initiate/view the appeal-status of ANOTHER member’s claim (IDOR guard, 404)', async () => {
    const pariwarId = randomUUID();
    const deceased = await seedDeceasedMember(pariwarId, DISTRICT);
    const owner = randomUUID();
    const claimCaseId = await seedDeniedClaim(pariwarId, deceased, owner);
    const intruder = randomUUID();

    const initByIntruder = await memberInject('POST', memberUrl(claimCaseId), memberToken(intruder, pariwarId), {});
    expect(initByIntruder.status).toBe(404);

    const statusByIntruder = await memberInject('GET', memberUrl(claimCaseId), memberToken(intruder, pariwarId));
    expect(statusByIntruder.status).toBe(404);

    // The owner CAN see their own claim's appeal status.
    const statusByOwner = await memberInject('GET', memberUrl(claimCaseId), memberToken(owner, pariwarId));
    expect(statusByOwner.status).toBe(200);
    expect(statusByOwner.body['can_initiate']).toBe(true);
  });

  it('Step-up gating — Stage-2 finalize is 403 without a fresh elevation, 200 with one', async () => {
    const pariwarId = randomUUID();
    const deceased = await seedDeceasedMember(pariwarId, DISTRICT);
    const memberId = randomUUID();
    const claimCaseId = await seedDeniedClaim(pariwarId, deceased, memberId);
    await clearLegalReview(pariwarId);
    await memberInject('POST', memberUrl(claimCaseId), memberToken(memberId, pariwarId), {});

    const reviewer = await districtAdmin(pariwarId);
    const advance = await reviewer.client.inject({
      method: 'POST',
      url: stage1Url(pariwarId, claimCaseId),
      payload: { decision: 'advance', rationale: 'stands on the merits' },
    });
    expect(advance.statusCode).toBe(201);

    const panel = [await pariwarAdmin(pariwarId, 'Panelist One'), await pariwarAdmin(pariwarId, 'Panelist Two')];
    const open = await panel[0]!.client.inject({
      method: 'POST',
      url: stage2OpenUrl(pariwarId, claimCaseId),
      payload: { panel_actor_ids: [panel[0]!.userId, panel[1]!.userId] },
    });
    expect(open.statusCode).toBe(201);

    for (const p of panel) {
      const vote = await p.client.inject({
        method: 'POST',
        url: stage2VoteUrl(pariwarId, claimCaseId),
        payload: { vote: 'reverse', rationale: 'new evidence presented' },
      });
      expect(vote.statusCode).toBe(201);
    }

    const noStepUp = await panel[0]!.client.inject({
      method: 'POST',
      url: stage2FinalizeUrl(pariwarId, claimCaseId),
      payload: { rationale: 'panel reverses on the merits', disposition_category: 'new_evidence_presented' },
    });
    expect(noStepUp.statusCode).toBe(403);
    expect((noStepUp.json() as { error: { code: string } }).error.code).toBe('auth.step_up_required');

    await elevate(panel[0]!.client, 'appeal_stage2_finalize');
    const finalize = await panel[0]!.client.inject({
      method: 'POST',
      url: stage2FinalizeUrl(pariwarId, claimCaseId),
      payload: { rationale: 'panel reverses on the merits', disposition_category: 'new_evidence_presented' },
    });
    expect(finalize.statusCode).toBe(200);
    const body = finalize.json() as { outcome: string; claim_state: string };
    expect(body.outcome).toBe('reversed');
    expect(body.claim_state).toBe('reversed');

    // The case model reflects the reversal.
    const caseRes = await panel[0]!.client.inject({ method: 'GET', url: caseUrl(pariwarId, claimCaseId) });
    expect(caseRes.statusCode).toBe(200);
    const caseBody = caseRes.json() as { claim_state: string; journey: { status: string } | null };
    expect(caseBody.claim_state).toBe('reversed');
    expect(caseBody.journey?.status).toBe('reversed');
  });

  it('Step-up gating — Stage-3 decide is 403 without a fresh elevation, 201 with one (uphold path)', async () => {
    const pariwarId = randomUUID();
    const deceased = await seedDeceasedMember(pariwarId, DISTRICT);
    const memberId = randomUUID();
    const claimCaseId = await seedDeniedClaim(pariwarId, deceased, memberId);
    await clearLegalReview(pariwarId);
    await memberInject('POST', memberUrl(claimCaseId), memberToken(memberId, pariwarId), {});

    const reviewer = await districtAdmin(pariwarId);
    await reviewer.client.inject({ method: 'POST', url: stage1Url(pariwarId, claimCaseId), payload: { decision: 'advance', rationale: 'stands on the merits' } });

    const panel = [await pariwarAdmin(pariwarId, 'Panelist One'), await pariwarAdmin(pariwarId, 'Panelist Two')];
    await panel[0]!.client.inject({ method: 'POST', url: stage2OpenUrl(pariwarId, claimCaseId), payload: { panel_actor_ids: [panel[0]!.userId, panel[1]!.userId] } });
    for (const p of panel) {
      await p.client.inject({ method: 'POST', url: stage2VoteUrl(pariwarId, claimCaseId), payload: { vote: 'deny', rationale: 'insufficient basis' } });
    }
    await elevate(panel[0]!.client, 'appeal_stage2_finalize');
    const finalize = await panel[0]!.client.inject({ method: 'POST', url: stage2FinalizeUrl(pariwarId, claimCaseId), payload: { rationale: 'panel advances' } });
    expect(finalize.statusCode).toBe(200);
    expect((finalize.json() as { outcome: string }).outcome).toBe('advance');

    const trustee = await pariwarAdmin(pariwarId, 'Final Trustee');
    const noStepUp = await trustee.client.inject({ method: 'POST', url: stage3Url(pariwarId, claimCaseId), payload: { decision: 'upheld', rationale: 'no basis to reverse' } });
    expect(noStepUp.statusCode).toBe(403);
    expect((noStepUp.json() as { error: { code: string } }).error.code).toBe('auth.step_up_required');

    await elevate(trustee.client, 'appeal_stage3_decide');
    const decide = await trustee.client.inject({ method: 'POST', url: stage3Url(pariwarId, claimCaseId), payload: { decision: 'upheld', rationale: 'no basis to reverse' } });
    expect(decide.statusCode).toBe(201);
    const body = decide.json() as { claim_state: string };
    expect(body.claim_state).toBe('denied');

    // AC4 — the uphold terminal also emits claim.denied_no_appeal (the freeze-clearing terminal).
    const events = await td.pool.query<{ event_type: string }>(`SELECT event_type FROM events_log WHERE stream_id = $1`, [claimCaseId]);
    expect(events.rows.map((r) => r.event_type)).toContain('claim.denied_no_appeal');
  });
});
