// R9 special-case voting surface E2E (live DB :5433) — Story 6.14 (Task 11; AC1–AC8).
//
// Drives GET/POST …/admin/r9-voting/{queue,:claimCaseId,open,vote,finalize,cancel,votes-by-trustee} through
// the REAL admin guard chain via a cookie-threading client. Asserts:
//   · AUTHZ (AC6) — pariwar_admin (holds claim.r9_vote) passes; a state_trustee (does NOT — the D-B Epic-3
//     deferral) is denied 403; a district-scoped pariwar_admin grant is denied 403 (dimension truthfulness);
//     no session → 401; cross-Pariwar isolation.
//   · R5 (AC7) — an admin with NO display name is blocked (409) before any write.
//   · FINALIZE step-up (AC4/D-E) — 403 step_up_required without a fresh r9_finalize elevation; 200 with it.
//   · HAPPY PATH — queue → open → vote → finalize advances the claim to state_trustee_approved.
//
// ⚠ Own-committing seed writes; fresh random pariwarId per test; events_log append-only.

import { randomUUID } from 'node:crypto';

import { claim, ids } from '@twt/domain';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { AppDeps } from '../../../src/context.js';
import * as service from '../../../src/modules/auth/admin/admin-auth.service.js';
import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { buildServer } from '../../../src/server.js';
import { buildTestDeps, hasDatabase, makeClient, type TestDeps, type CapturingStepUpDelivery } from '../_setup.js';
import { FakeWebAuthnProvider } from '../_webauthn-fake.js';

type Client = ReturnType<typeof makeClient>;

const R9_CLAUSE = 'niy.special-death.r9';

describe.skipIf(!hasDatabase)('R9 voting surface — E2E (:5433)', () => {
  let td: TestDeps;
  let deps: AppDeps;
  let fakeWebauthn: FakeWebAuthnProvider;
  let adminStepUp: CapturingStepUpDelivery;
  let app: Awaited<ReturnType<typeof buildServer>>;
  const createdUserIds: string[] = [];
  const createdPariwars: string[] = [];

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
      if (createdPariwars.length > 0) {
        // claim_r9_voting_sessions FIRST — its clause_version_id FK (migration 0066) blocks deleting the
        // referenced clause_versions rows otherwise; cascades to claim_r9_votes. Claims + events_log are
        // intentionally left (own-committing, append-only — the suite-wide convention).
        await c.query(`DELETE FROM claim_r9_voting_sessions WHERE pariwar_id = ANY($1)`, [createdPariwars]);
        await c.query(`DELETE FROM clause_versions WHERE pariwar_id = ANY($1)`, [createdPariwars]);
      }
    } finally {
      c.release();
    }
    await td.pool.end();
  });

  async function authenticate(opts: { displayName?: string | null } = {}): Promise<{ client: Client; userId: string }> {
    const email = `r9-${randomUUID()}@example.test`;
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

  async function grant(userId: string, pariwarId: string, role: string, opts: { dimension?: string; value?: string } = {}): Promise<void> {
    const dimension = opts.dimension ?? 'pariwar';
    const value = opts.value ?? pariwarId;
    const c = await td.pool.connect();
    try {
      await c.query(`INSERT INTO role_grants (user_id, pariwar_id, role, scope_dimension, scope_value) VALUES ($1, $2, $3, $4, $5)`, [
        userId,
        pariwarId,
        role,
        dimension,
        value,
      ]);
    } finally {
      c.release();
    }
  }

  async function pariwarAdmin(pariwarId: string, displayName: string | null = 'Trustee One'): Promise<{ client: Client; userId: string }> {
    const a = await authenticate({ displayName });
    await grant(a.userId, pariwarId, 'pariwar_admin');
    return a;
  }

  async function seedR9Clause(pariwarId: string): Promise<void> {
    createdPariwars.push(pariwarId);
    const c = await td.pool.connect();
    try {
      await c.query(
        `INSERT INTO clause_versions (clause_version_id, clause_id, pariwar_id, version, effective_date, payload, benefit_mechanism)
         VALUES (gen_random_uuid(), $1, $2, 1, now(), $3, 'pool')`,
        [R9_CLAUSE, pariwarId, JSON.stringify({ rule_code: 'R9', voting_required: true, majority_required: true, on_pass: 'route_r9_voting' })],
      );
    } finally {
      c.release();
    }
  }

  /** Seed a claim driven to verifier_approved + a LIVE routed_to_r9 row (the R9 queue precondition). */
  async function seedRoutedClaim(pariwarId: string): Promise<string> {
    const claimCaseId = ids.claimId(randomUUID());
    const deceasedMemberId = ids.memberId(randomUUID());
    const scopeTx = await openScopeTx(deps, pariwarId);
    const emit = (from: string | null, to: string, eventType: string, extra: Record<string, unknown> = {}) =>
      claim.projectClaimState(scopeTx.client, {
        claimCaseId, pariwarId: ids.pariwarId(pariwarId), deceasedMemberId, intakeChannels: ['helpline'], claimantActorId: null,
        eventType: eventType as never,
        payload: { from_state: from, to_state: to, trigger: 'seed', actor: 'system', ...extra },
        actorId: null,
      });
    try {
      await emit(null, 'intake_pending', 'claim.intake_initiated', { deceased_member_id: String(deceasedMemberId), intake_channel: 'helpline', claimant_actor_id: null });
      await emit('intake_pending', 'intake_converged', 'claim.intake_converged');
      await emit('intake_converged', 'documents_pending', 'claim.documents_received');
      await emit('documents_pending', 'verification_in_progress', 'claim.peer_mesh_pinged', { selected_member_ids: [randomUUID()], metric_id: 'district_cohort_v1', metric_version: 1 });
      await emit('verification_in_progress', 'verifier_review', 'claim.verifier_reviewing');
      await emit('verifier_review', 'verifier_approved', 'claim.verifier_approved');
      await scopeTx.client.query(
        `INSERT INTO claim_state_trustee_decisions (claim_case_id, pariwar_id, phase, outcome, reason_code, actor_id, actor_display)
         VALUES ($1, $2, 'routing', 'routed_to_r9', 'r9_special_case', $3, 'Router')`,
        [String(claimCaseId), pariwarId, randomUUID()],
      );
      await closeScopeTx(scopeTx, true);
    } catch (err) {
      await closeScopeTx(scopeTx, false);
      throw err;
    }
    return String(claimCaseId);
  }

  async function elevateFinalize(client: Client): Promise<void> {
    const req = await client.inject({ method: 'POST', url: '/api/v1/auth/step-up/request', payload: { actionContext: 'r9_finalize' } });
    expect(req.statusCode).toBe(200);
    const code = adminStepUp.last?.code as string;
    const ver = await client.inject({ method: 'POST', url: '/api/v1/auth/step-up/verify', payload: { otp: code } });
    expect(ver.statusCode).toBe(200);
  }

  async function claimState(claimCaseId: string): Promise<string> {
    const c = await td.pool.connect();
    try {
      const res = await c.query<{ current_state: string }>(`SELECT current_state FROM claims WHERE claim_case_id = $1`, [claimCaseId]);
      return res.rows[0]!.current_state;
    } finally {
      c.release();
    }
  }

  const queueUrl = (p: string) => `/api/v1/p/${p}/admin/r9-voting/queue`;
  const openUrl = (p: string, c: string) => `/api/v1/p/${p}/admin/r9-voting/${c}/open`;
  const voteUrl = (p: string, c: string) => `/api/v1/p/${p}/admin/r9-voting/${c}/vote`;
  const finalizeUrl = (p: string, c: string) => `/api/v1/p/${p}/admin/r9-voting/${c}/finalize`;
  const cancelUrl = (p: string, c: string) => `/api/v1/p/${p}/admin/r9-voting/${c}/cancel`;
  const votesByTrusteeUrl = (p: string, a: string) => `/api/v1/p/${p}/admin/r9-voting/votes-by-trustee?actorId=${a}`;

  it('AC6 — no session → 401', async () => {
    const res = await makeClient(app).inject({ method: 'GET', url: queueUrl(randomUUID()) });
    expect(res.statusCode).toBe(401);
  });

  it('AC6 — a state_trustee (does NOT hold claim.r9_vote — the D-B Epic-3 deferral) is denied 403', async () => {
    const pariwarId = randomUUID();
    const a = await authenticate({ displayName: 'Trustee Deferred' });
    await grant(a.userId, pariwarId, 'state_trustee');
    const res = await a.client.inject({ method: 'GET', url: queueUrl(pariwarId) });
    expect(res.statusCode).toBe(403);
  });

  it('AC6 — claim.r9_vote is checked at dimension:"pariwar"; a district-scoped pariwar_admin grant is denied 403', async () => {
    const pariwarId = randomUUID();
    const a = await authenticate({ displayName: 'District-Scoped Admin' });
    await grant(a.userId, pariwarId, 'pariwar_admin', { dimension: 'district', value: 'Patna' });
    const res = await a.client.inject({ method: 'GET', url: queueUrl(pariwarId) });
    expect(res.statusCode).toBe(403);
  });

  it('AC7 — an admin with NO display name is blocked before any write (open → 409)', async () => {
    const pariwarId = randomUUID();
    await seedR9Clause(pariwarId);
    const claimCaseId = await seedRoutedClaim(pariwarId);
    const a = await pariwarAdmin(pariwarId, null); // no display name
    const res = await a.client.inject({
      method: 'POST',
      url: openUrl(pariwarId, claimCaseId),
      payload: { clause_id: R9_CLAUSE, panel_actor_ids: [a.userId] },
    });
    expect(res.statusCode).toBe(409);
    expect((res.json() as { error: { code: string } }).error.code).toBe('admin.display_name_missing');
  });

  it('AC1–AC4 — happy path: queue → open → vote → finalize (step-up-gated) advances to state_trustee_approved', async () => {
    const pariwarId = randomUUID();
    await seedR9Clause(pariwarId);
    const claimCaseId = await seedRoutedClaim(pariwarId);
    const a = await pariwarAdmin(pariwarId);

    // Queue lists the routed claim.
    const queue = await a.client.inject({ method: 'GET', url: queueUrl(pariwarId) });
    expect(queue.statusCode).toBe(200);
    const queueBody = queue.json() as { items: Array<{ claim_case_id: string }> };
    expect(queueBody.items.map((i) => i.claim_case_id)).toContain(claimCaseId);

    // Open a single-member panel (self — the v1 accepted self-finalization risk; quorum=1).
    const open = await a.client.inject({ method: 'POST', url: openUrl(pariwarId, claimCaseId), payload: { clause_id: R9_CLAUSE, panel_actor_ids: [a.userId] } });
    expect(open.statusCode).toBe(201);
    const openBody = open.json() as { voting_requirement: string; quorum_required: number };
    expect(openBody.voting_requirement).toBe('majority');
    expect(openBody.quorum_required).toBe(1);

    // Cast a vote.
    const vote = await a.client.inject({ method: 'POST', url: voteUrl(pariwarId, claimCaseId), payload: { vote: 'approve', rationale: 'Meets R9 standing.' } });
    expect(vote.statusCode).toBe(201);

    // Finalize without a fresh elevation → 403 step_up_required.
    const noStepUp = await a.client.inject({ method: 'POST', url: finalizeUrl(pariwarId, claimCaseId), payload: {} });
    expect(noStepUp.statusCode).toBe(403);
    expect((noStepUp.json() as { error: { code: string } }).error.code).toBe('auth.step_up_required');

    // Elevate + finalize → 200 approved; the claim advanced.
    await elevateFinalize(a.client);
    const finalize = await a.client.inject({ method: 'POST', url: finalizeUrl(pariwarId, claimCaseId), payload: {} });
    expect(finalize.statusCode).toBe(200);
    const finalizeBody = finalize.json() as { outcome: string; claim_state: string };
    expect(finalizeBody.outcome).toBe('approved');
    expect(finalizeBody.claim_state).toBe('state_trustee_approved');
    expect(await claimState(claimCaseId)).toBe('state_trustee_approved');

    // votes-by-trustee returns the vote.
    const transcript = await a.client.inject({ method: 'GET', url: votesByTrusteeUrl(pariwarId, a.userId) });
    expect(transcript.statusCode).toBe(200);
    const transcriptBody = transcript.json() as { votes: Array<{ clause_id: string }> };
    expect(transcriptBody.votes).toHaveLength(1);
    expect(transcriptBody.votes[0]!.clause_id).toBe(R9_CLAUSE);
  });

  it('AC5 — cancel/correct: a live session is superseded (cancelled) and a re-open then succeeds', async () => {
    const pariwarId = randomUUID();
    await seedR9Clause(pariwarId);
    const claimCaseId = await seedRoutedClaim(pariwarId);
    const a = await pariwarAdmin(pariwarId);

    const open = await a.client.inject({ method: 'POST', url: openUrl(pariwarId, claimCaseId), payload: { clause_id: R9_CLAUSE, panel_actor_ids: [a.userId] } });
    expect(open.statusCode).toBe(201);

    const cancel = await a.client.inject({
      method: 'POST',
      url: cancelUrl(pariwarId, claimCaseId),
      payload: { reason_code: 'wrong_clause', rationale: 'corrected panel' },
    });
    expect(cancel.statusCode).toBe(200);
    const cancelBody = cancel.json() as { superseded_at: string | null };
    expect(cancelBody.superseded_at).not.toBeNull();

    // Cancelling the same (now-superseded) session again fails closed.
    const cancelAgain = await a.client.inject({
      method: 'POST',
      url: cancelUrl(pariwarId, claimCaseId),
      payload: { reason_code: 'wrong_clause', rationale: 'corrected panel' },
    });
    expect(cancelAgain.statusCode).toBe(409);

    // A fresh open succeeds once the prior session is superseded.
    const reopen = await a.client.inject({ method: 'POST', url: openUrl(pariwarId, claimCaseId), payload: { clause_id: R9_CLAUSE, panel_actor_ids: [a.userId] } });
    expect(reopen.statusCode).toBe(201);
  });

  it('AC6 — cross-Pariwar isolation: a pariwar_admin of P1 gets 404 for a claim under P2', async () => {
    const p1 = randomUUID();
    const p2 = randomUUID();
    await seedR9Clause(p2);
    const claimUnderP2 = await seedRoutedClaim(p2);
    const a = await pariwarAdmin(p1);
    const res = await a.client.inject({ method: 'GET', url: `/api/v1/p/${p1}/admin/r9-voting/${claimUnderP2}` });
    // Under P1 scope the P2 claim is invisible → 404 (not 403 — no enumeration oracle).
    expect(res.statusCode).toBe(404);
  });
});
