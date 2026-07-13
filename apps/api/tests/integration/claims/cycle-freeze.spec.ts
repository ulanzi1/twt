// State-Trustee cycle-freeze surface E2E (live DB :5433) — Story 6.13 (Task 9; AC1/AC2/AC5/AC6/AC7).
//
// Drives GET/POST …/admin/cycle-freeze/{pending,decision,commit} through the REAL admin guard chain via a
// cookie-threading client. Asserts:
//   · AUTHZ (AC7) — pariwar_admin (holds cycle.freeze) passes; a state_trustee (does NOT hold it — the D-B
//     Epic-3 deferral) is denied 403; no session → 401; cross-Pariwar isolation.
//   · DECISION (AC2) — an approve vote advances the claim to state_trustee_approved.
//   · COMMIT (AC5) — 403 step_up_required without a fresh elevation; 200 with it; commits the approved set;
//     idempotent on the client-generated commit_id.
//   · TRIGGER SEAM (AC6, handler-level) — the post-commit PoolSpawnTrigger fires OUTSIDE the writer tx; a
//     trigger FAILURE does NOT roll back the committed freeze (trigger_delivered stays false, redelivery
//     self-heals); a clean fire flips trigger_delivered true + carries the frozen {claim, deceased} set.
//
// ⚠ Own-committing seed writes; fresh random pariwarId per test; events_log append-only
// ([[project_live_db_test_gotchas]]).

import { randomUUID } from 'node:crypto';

import { claim, ids, schema } from '@twt/domain';
import { createCapturingPoolSpawnTrigger, createThrowingPoolSpawnTrigger } from '@twt/jobs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { AppDeps } from '../../../src/context.js';
import { createCycleFreezeHandlers } from '../../../src/modules/claims/claims.cycle-freeze.handlers.js';
import * as service from '../../../src/modules/auth/admin/admin-auth.service.js';
import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { buildServer } from '../../../src/server.js';
import { buildTestDeps, hasDatabase, makeClient, type TestDeps, type CapturingStepUpDelivery } from '../_setup.js';
import { FakeWebAuthnProvider } from '../_webauthn-fake.js';

type Client = ReturnType<typeof makeClient>;

describe.skipIf(!hasDatabase)('State-Trustee cycle-freeze surface — E2E (:5433)', () => {
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
    const email = `cf-${randomUUID()}@example.test`;
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

  async function grant(
    userId: string,
    pariwarId: string,
    role: string,
    opts: { dimension?: string; value?: string } = {},
  ): Promise<void> {
    const dimension = opts.dimension ?? 'pariwar';
    const value = opts.value ?? pariwarId;
    const c = await td.pool.connect();
    try {
      await c.query(
        `INSERT INTO role_grants (user_id, pariwar_id, role, scope_dimension, scope_value) VALUES ($1, $2, $3, $4, $5)`,
        [userId, pariwarId, role, dimension, value],
      );
    } finally {
      c.release();
    }
  }

  /** A pariwar_admin (holds cycle.freeze) with a display name — the happy-path trustee. */
  async function pariwarAdmin(pariwarId: string): Promise<{ client: Client; userId: string }> {
    const a = await authenticate({ displayName: 'Trustee One' });
    await grant(a.userId, pariwarId, 'pariwar_admin');
    return a;
  }

  async function elevateCommit(client: Client): Promise<void> {
    const req = await client.inject({ method: 'POST', url: '/api/v1/auth/step-up/request', payload: { actionContext: 'cycle_freeze_commit' } });
    expect(req.statusCode).toBe(200);
    const code = adminStepUp.last?.code as string;
    const ver = await client.inject({ method: 'POST', url: '/api/v1/auth/step-up/verify', payload: { otp: code } });
    expect(ver.statusCode).toBe(200);
  }

  /** Seed a claim driven to `verifier_approved` via the real projector; returns its id + deceased id. */
  async function seedApprovedClaim(pariwarId: string): Promise<{ claimCaseId: string; deceasedMemberId: string }> {
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
      await closeScopeTx(scopeTx, true);
    } catch (err) {
      await closeScopeTx(scopeTx, false);
      throw err;
    }
    return { claimCaseId: String(claimCaseId), deceasedMemberId: String(deceasedMemberId) };
  }

  /** Seed a claim driven to `verifier_review` with a LIVE `escalated` verifier decision (AC4b setup). */
  async function seedEscalatedClaim(pariwarId: string): Promise<{ claimCaseId: string; deceasedMemberId: string }> {
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
      await scopeTx.tx.insert(schema.claimVerifierDecisions).values({
        claimCaseId,
        pariwarId: ids.pariwarId(pariwarId),
        outcome: 'escalated',
        reasonCode: 'r9_routed_to_voting',
        rationaleCiphertext: null,
        actorId: randomUUID(),
        actorDisplay: 'Verifier Anita',
      });
      await closeScopeTx(scopeTx, true);
    } catch (err) {
      await closeScopeTx(scopeTx, false);
      throw err;
    }
    return { claimCaseId: String(claimCaseId), deceasedMemberId: String(deceasedMemberId) };
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

  async function trusteeDecisionCount(claimCaseId: string): Promise<number> {
    const c = await td.pool.connect();
    try {
      const res = await c.query<{ count: string }>(
        `SELECT count(*)::text AS count FROM claim_state_trustee_decisions WHERE claim_case_id = $1`,
        [claimCaseId],
      );
      return Number(res.rows[0]!.count);
    } finally {
      c.release();
    }
  }

  /** True iff the claim's `escalated` verifier decision is still LIVE (not superseded). */
  async function escalationStillLive(claimCaseId: string): Promise<boolean> {
    const c = await td.pool.connect();
    try {
      const res = await c.query<{ superseded_at: string | null }>(
        `SELECT superseded_at FROM claim_verifier_decisions WHERE claim_case_id = $1 AND outcome = 'escalated'`,
        [claimCaseId],
      );
      return res.rows[0] !== undefined && res.rows[0].superseded_at === null;
    } finally {
      c.release();
    }
  }

  const pendingUrl = (p: string) => `/api/v1/p/${p}/admin/cycle-freeze/pending`;
  const decisionUrl = (p: string) => `/api/v1/p/${p}/admin/cycle-freeze/decision`;
  const commitUrl = (p: string) => `/api/v1/p/${p}/admin/cycle-freeze/commit`;

  it('AC7 — no session → 401', async () => {
    const pariwarId = randomUUID();
    const res = await makeClient(app).inject({ method: 'GET', url: pendingUrl(pariwarId) });
    expect(res.statusCode).toBe(401);
  });

  it('AC7 — a state_trustee (does NOT hold cycle.freeze — the D-B Epic-3 deferral) is denied 403', async () => {
    const pariwarId = randomUUID();
    const a = await authenticate({ displayName: 'Trustee Deferred' });
    await grant(a.userId, pariwarId, 'state_trustee');
    const res = await a.client.inject({ method: 'GET', url: pendingUrl(pariwarId) });
    expect(res.statusCode).toBe(403);
  });

  it('AC7 (review addendum) — cycle.freeze is checked at dimension:"pariwar"; a district-scoped grant for a role that DOES hold the key is still denied', async () => {
    const pariwarId = randomUUID();
    const a = await authenticate({ displayName: 'District-Scoped Admin' });
    // pariwar_admin's bundle DOES include cycle.freeze — but this grant is recorded at scope_dimension
    // 'district', not 'pariwar'. A narrower/different-dimension grant must never satisfy the pariwar-wide
    // gate (the [[project_rbac_geo_scope_containment]] asymmetry) — proves the dimension is truthfully
    // enforced at the route, not just documented in a comment.
    await grant(a.userId, pariwarId, 'pariwar_admin', { dimension: 'district', value: 'Patna' });
    const res = await a.client.inject({ method: 'GET', url: pendingUrl(pariwarId) });
    expect(res.statusCode).toBe(403);
  });

  it('AC7 (review addendum) — cross-Pariwar isolation: a cycle.freeze grant in Pariwar A does not authorize Pariwar B, and Pariwar B data never leaks', async () => {
    const pariwarA = randomUUID();
    const pariwarB = randomUUID();
    const adminA = await pariwarAdmin(pariwarA);
    const { claimCaseId: claimInB, deceasedMemberId: deceasedInB } = await seedApprovedClaim(pariwarB);

    // adminA holds ZERO grants in Pariwar B — scopeResolutionHook's "no enumeration oracle" posture
    // collapses "Pariwar doesn't exist" and "not a member" into 404, never even reaching the cycle.freeze
    // permission check. Never a data echo either way.
    const pending = await adminA.client.inject({ method: 'GET', url: pendingUrl(pariwarB) });
    expect(pending.statusCode).toBe(404);
    expect(pending.body).not.toContain(claimInB);
    expect(pending.body).not.toContain(deceasedInB);

    // POST decision against B's claim, scoped to B, using A's grant → same 404 (scope-resolution runs
    // before the RBAC gate on every route in this module).
    const decision = await adminA.client.inject({
      method: 'POST',
      url: decisionUrl(pariwarB),
      payload: { claim_case_id: claimInB, action: 'approve' },
    });
    expect(decision.statusCode).toBe(404);
    expect(await claimState(claimInB)).toBe('verifier_approved'); // unchanged — no cross-tenant action leaked through

    // POST commit against B → same 404 (never even reaches the permission check or the step-up gate).
    const commit = await adminA.client.inject({ method: 'POST', url: commitUrl(pariwarB), payload: { commit_id: randomUUID() } });
    expect(commit.statusCode).toBe(404);
  });

  it('AC1/AC2/AC5/AC6 — pariwar_admin lists → votes → commits (step-up-gated); trigger_delivered flips true', async () => {
    const pariwarId = randomUUID();
    const admin = await pariwarAdmin(pariwarId);
    const { claimCaseId } = await seedApprovedClaim(pariwarId);

    // AC1 — the pending list surfaces the ready claim.
    const pending = await admin.client.inject({ method: 'GET', url: pendingUrl(pariwarId) });
    expect(pending.statusCode).toBe(200);
    const list = pending.json() as { ready_to_freeze: Array<{ claim_case_id: string }> };
    expect(list.ready_to_freeze.map((c) => c.claim_case_id)).toContain(claimCaseId);

    // AC2 — approve vote → state_trustee_approved.
    const vote = await admin.client.inject({ method: 'POST', url: decisionUrl(pariwarId), payload: { claim_case_id: claimCaseId, action: 'approve' } });
    expect(vote.statusCode).toBe(201);
    expect(await claimState(claimCaseId)).toBe('state_trustee_approved');

    // AC5 — commit WITHOUT step-up → 403 step_up_required.
    const commitId = randomUUID();
    const noStepUp = await admin.client.inject({ method: 'POST', url: commitUrl(pariwarId), payload: { commit_id: commitId } });
    expect(noStepUp.statusCode).toBe(403);
    expect((noStepUp.json() as { error: { code: string } }).error.code).toMatch(/step_up/);

    // AC5/AC6 — with a fresh elevation → 200; commits the approved set; the console trigger delivers.
    await elevateCommit(admin.client);
    const committed = await admin.client.inject({ method: 'POST', url: commitUrl(pariwarId), payload: { commit_id: commitId } });
    expect(committed.statusCode).toBe(200);
    const body = committed.json() as { committed_claim_ids: string[]; trigger_delivered: boolean; idempotent_replay: boolean };
    expect(body.committed_claim_ids).toContain(claimCaseId);
    expect(body.trigger_delivered).toBe(true);
    expect(body.idempotent_replay).toBe(false);
    expect(await claimState(claimCaseId)).toBe('approved');

    // AC5 — a re-submitted commit for the SAME commit_id is a no-op replay (needs a fresh elevation).
    await elevateCommit(admin.client);
    const replay = await admin.client.inject({ method: 'POST', url: commitUrl(pariwarId), payload: { commit_id: commitId } });
    expect(replay.statusCode).toBe(200);
    const rbody = replay.json() as { idempotent_replay: boolean; committed_claim_ids: string[] };
    expect(rbody.idempotent_replay).toBe(true);
    expect(rbody.committed_claim_ids).toContain(claimCaseId);
  });

  // ── AC6 handler-level: the trigger fires post-commit + a failure never rolls back the freeze ──

  /** A minimal fake request for the handler (the route chain is proven above; here we inject the trigger). */
  function fakeReq(pariwarId: string, actorId: string, commitId: string): unknown {
    const reply = { status: () => reply };
    return {
      req: { scopeTx: { pariwarId }, requestContext: { actorId, traceId: `trace-${randomUUID()}` }, body: { commit_id: commitId } },
      reply,
    };
  }

  async function seedTrusteeUser(displayName: string): Promise<string> {
    const id = randomUUID();
    createdUserIds.push(id);
    const c = await td.pool.connect();
    try {
      await c.query(`INSERT INTO users (id, identity_type, status, display_name) VALUES ($1, 'admin', 'active', $2)`, [id, displayName]);
    } finally {
      c.release();
    }
    return id;
  }

  /** Drive a claim to state_trustee_approved (approved vote) so the commit has something to commit. */
  async function seedFrozenApprovedClaim(pariwarId: string, actorId: string): Promise<string> {
    const { claimCaseId, deceasedMemberId } = await seedApprovedClaim(pariwarId);
    const scopeTx = await openScopeTx(deps, pariwarId);
    try {
      await claim.voteOnFrozenClaim(scopeTx.client, {
        claimCaseId: ids.claimId(claimCaseId), pariwarId: ids.pariwarId(pariwarId), reasonCode: null, rationaleCiphertext: null,
        actorId, actorDisplay: 'Trustee One', actor: 'trustee', outcome: 'approved',
      });
      await closeScopeTx(scopeTx, true);
    } catch (err) {
      await closeScopeTx(scopeTx, false);
      throw err;
    }
    void deceasedMemberId;
    return claimCaseId;
  }

  it('AC6 — a clean trigger fires post-commit with the frozen set + flips trigger_delivered true', async () => {
    const pariwarId = randomUUID();
    const actorId = await seedTrusteeUser('Trustee One');
    const claimCaseId = await seedFrozenApprovedClaim(pariwarId, actorId);
    const capturing = createCapturingPoolSpawnTrigger();
    const handlers = createCycleFreezeHandlers(deps, capturing.trigger);
    const { req, reply } = fakeReq(pariwarId, actorId, randomUUID()) as { req: never; reply: never };

    const res = (await handlers.postCommit(req, reply)) as { trigger_delivered: boolean; committed_claim_ids: string[] };
    expect(res.committed_claim_ids).toContain(claimCaseId);
    expect(res.trigger_delivered).toBe(true);
    // The trigger fired ONCE, post-commit, carrying the frozen {claim, deceased} set.
    expect(capturing.payloads).toHaveLength(1);
    expect(capturing.payloads[0]!.frozen_claims.map((f) => f.claim_case_id)).toContain(claimCaseId);
    expect(await claimState(claimCaseId)).toBe('approved');
  });

  it('AC6 — a trigger FAILURE never rolls back the committed freeze; trigger_delivered stays false', async () => {
    const pariwarId = randomUUID();
    const actorId = await seedTrusteeUser('Trustee One');
    const claimCaseId = await seedFrozenApprovedClaim(pariwarId, actorId);
    const handlers = createCycleFreezeHandlers(deps, createThrowingPoolSpawnTrigger());
    const { req, reply } = fakeReq(pariwarId, actorId, randomUUID()) as { req: never; reply: never };

    const res = (await handlers.postCommit(req, reply)) as { trigger_delivered: boolean; committed_claim_ids: string[] };
    // The freeze COMMITTED durably despite the trigger throwing (best-effort, outside the writer tx).
    expect(res.committed_claim_ids).toContain(claimCaseId);
    expect(res.trigger_delivered).toBe(false); // redelivery self-heals
    expect(await claimState(claimCaseId)).toBe('approved');

    // The durable record persists with trigger_delivered = false.
    const c = await td.pool.connect();
    try {
      const row = await c.query<{ trigger_delivered: boolean }>(
        `SELECT trigger_delivered FROM cycle_freeze_commits WHERE pariwar_id = $1`,
        [pariwarId],
      );
      expect(row.rows[0]!.trigger_delivered).toBe(false);
    } finally {
      c.release();
    }
  });

  it('AC6 (review addendum) — a retry of the SAME commit_id after a failed trigger redelivers it', async () => {
    const pariwarId = randomUUID();
    const actorId = await seedTrusteeUser('Trustee One');
    const claimCaseId = await seedFrozenApprovedClaim(pariwarId, actorId);
    const commitId = randomUUID();

    // First attempt: the DB commit succeeds, but the trigger throws — trigger_delivered stays false.
    const failing = createCycleFreezeHandlers(deps, createThrowingPoolSpawnTrigger());
    const { req: reqA, reply: replyA } = fakeReq(pariwarId, actorId, commitId) as { req: never; reply: never };
    const first = (await failing.postCommit(reqA, replyA)) as { trigger_delivered: boolean; idempotent_replay: boolean };
    expect(first.trigger_delivered).toBe(false);
    expect(first.idempotent_replay).toBe(false);

    // A client retry of the SAME commit_id — necessarily an idempotent replay at the DB layer — must still
    // redeliver the trigger (the bug this addendum fixes: the original condition skipped delivery whenever
    // idempotent_replay was true, which is exactly the case on every retry after a first-attempt failure).
    const capturing = createCapturingPoolSpawnTrigger();
    const retrying = createCycleFreezeHandlers(deps, capturing.trigger);
    const { req: reqB, reply: replyB } = fakeReq(pariwarId, actorId, commitId) as { req: never; reply: never };
    const second = (await retrying.postCommit(reqB, replyB)) as {
      trigger_delivered: boolean;
      idempotent_replay: boolean;
      committed_claim_ids: string[];
    };
    expect(second.idempotent_replay).toBe(true);
    expect(second.trigger_delivered).toBe(true);
    expect(second.committed_claim_ids).toContain(claimCaseId);
    expect(capturing.payloads).toHaveLength(1);
    expect(capturing.payloads[0]!.frozen_claims.map((f) => f.claim_case_id)).toContain(claimCaseId);
  });

  it('AC6 (review addendum) — concurrent retries of the SAME commit_id never both fire the trigger', async () => {
    const pariwarId = randomUUID();
    const actorId = await seedTrusteeUser('Trustee One');
    const claimCaseId = await seedFrozenApprovedClaim(pariwarId, actorId);
    const commitId = randomUUID();

    // A SLOW capturing trigger — widens the race window the session-lock fix must close: without it, two
    // concurrent requests both reading trigger_delivered=false before either flips it would both invoke this.
    const firedPayloads: Array<{ claim_case_id: string }[]> = [];
    let inFlight = 0;
    let maxConcurrentInFlight = 0;
    const slowCapturingTrigger = async (payload: { frozen_claims: { claim_case_id: string }[] }): Promise<void> => {
      inFlight += 1;
      maxConcurrentInFlight = Math.max(maxConcurrentInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 150));
      firedPayloads.push(payload.frozen_claims);
      inFlight -= 1;
    };
    const handlersA = createCycleFreezeHandlers(deps, slowCapturingTrigger);
    const handlersB = createCycleFreezeHandlers(deps, slowCapturingTrigger);
    const { req: reqA, reply: replyA } = fakeReq(pariwarId, actorId, commitId) as { req: never; reply: never };
    const { req: reqB, reply: replyB } = fakeReq(pariwarId, actorId, commitId) as { req: never; reply: never };

    const [resA, resB] = await Promise.all([handlersA.postCommit(reqA, replyA), handlersB.postCommit(reqB, replyB)]);
    const a = resA as { trigger_delivered: boolean; committed_claim_ids: string[] };
    const b = resB as { trigger_delivered: boolean; committed_claim_ids: string[] };

    // Both requests commit the SAME claim set (idempotent at the DB layer) — never a double-approve.
    expect(a.committed_claim_ids).toContain(claimCaseId);
    expect(b.committed_claim_ids).toContain(claimCaseId);
    // The lock genuinely serialized the two attempts (not merely lucky timing) — the slow trigger's
    // in-flight counter never exceeded 1 concurrent invocation.
    expect(maxConcurrentInFlight).toBe(1);
    // The trigger fired EXACTLY ONCE across both concurrent requests.
    expect(firedPayloads).toHaveLength(1);
    expect(firedPayloads[0]!.map((f) => f.claim_case_id)).toContain(claimCaseId);
    expect(await claimState(claimCaseId)).toBe('approved');
  });

  // ── Two-authority atomicity under forced failure (AC0 — review addendum) ───────────────────
  // voteOnFrozenClaim / routeToR9 / resolveEscalation each write a lifecycle event (or, for routing,
  // nothing) THEN the claim_state_trustee_decisions metadata row, in ONE scope-tx. Patching
  // `scopeTx.client.query` to reject the metadata-row insert forces a genuine mid-transaction failure —
  // everything else passes through to the real connection — proving the WHOLE transaction rolls back,
  // never an event-only or metadata-only survivor (the verifier-decision.spec.ts AC0 precedent, ported).

  /** Wrap a live pg client so any query whose text matches `pattern` rejects; everything else passes
   *  through unchanged. Returns a restore function. */
  function forceQueryFailure(client: import('pg').PoolClient, pattern: RegExp): () => void {
    const real = client.query.bind(client);
    (client as unknown as { query: unknown }).query = (...args: unknown[]) => {
      const first = args[0];
      const text = typeof first === 'string' ? first : (first as { text?: string } | undefined)?.text;
      if (typeof text === 'string' && pattern.test(text)) {
        return Promise.reject(new Error('forced failure (test)'));
      }
      return (real as (...a: unknown[]) => unknown)(...args);
    };
    return () => {
      (client as unknown as { query: unknown }).query = real;
    };
  }

  it('AC0/AC2 (review addendum) — a forced decision-row-insert failure rolls back voteOnFrozenClaim\'s WHOLE transaction (no orphan freeze event survives)', async () => {
    const pariwarId = randomUUID();
    const { claimCaseId } = await seedApprovedClaim(pariwarId);
    const beforeState = await claimState(claimCaseId);

    const scopeTx = await openScopeTx(deps, pariwarId);
    const restore = forceQueryFailure(scopeTx.client, /insert into "claim_state_trustee_decisions"/i);
    let threw = false;
    try {
      await claim.voteOnFrozenClaim(scopeTx.client, {
        claimCaseId: ids.claimId(claimCaseId),
        pariwarId: ids.pariwarId(pariwarId),
        reasonCode: null,
        rationaleCiphertext: null,
        actorId: randomUUID(),
        actorDisplay: 'Forced Failure Test',
        actor: 'trustee',
        outcome: 'approved',
      });
    } catch {
      threw = true;
    } finally {
      restore();
      await closeScopeTx(scopeTx, false);
    }
    expect(threw).toBe(true);

    // Neither the freeze-open event NOR the approve-vote event survived — the metadata-row failure rolled
    // back BOTH lifecycle events written earlier in this same transaction.
    expect(await claimState(claimCaseId)).toBe(beforeState); // still verifier_approved, not state_trustee_freeze/approved
    expect(await trusteeDecisionCount(claimCaseId)).toBe(0);
  });

  it('AC0/AC4 (review addendum) — a forced decision-row-insert failure rolls back routeToR9 cleanly (no partial routing row survives)', async () => {
    const pariwarId = randomUUID();
    const { claimCaseId } = await seedApprovedClaim(pariwarId);

    const scopeTx = await openScopeTx(deps, pariwarId);
    const restore = forceQueryFailure(scopeTx.client, /insert into "claim_state_trustee_decisions"/i);
    let threw = false;
    try {
      await claim.routeToR9(scopeTx.client, {
        claimCaseId: ids.claimId(claimCaseId),
        pariwarId: ids.pariwarId(pariwarId),
        reasonCode: 'r9_special_case',
        rationaleCiphertext: null,
        actorId: randomUUID(),
        actorDisplay: 'Forced Failure Test',
        actor: 'trustee',
      });
    } catch {
      threw = true;
    } finally {
      restore();
      await closeScopeTx(scopeTx, false);
    }
    expect(threw).toBe(true);
    expect(await trusteeDecisionCount(claimCaseId)).toBe(0);

    // No partial garbage was left behind — a clean retry succeeds normally.
    const scopeTx2 = await openScopeTx(deps, pariwarId);
    let ok2 = false;
    try {
      await claim.routeToR9(scopeTx2.client, {
        claimCaseId: ids.claimId(claimCaseId),
        pariwarId: ids.pariwarId(pariwarId),
        reasonCode: 'r9_special_case',
        rationaleCiphertext: null,
        actorId: randomUUID(),
        actorDisplay: 'Retry',
        actor: 'trustee',
      });
      ok2 = true;
    } finally {
      await closeScopeTx(scopeTx2, ok2);
    }
    expect(ok2).toBe(true);
    expect(await trusteeDecisionCount(claimCaseId)).toBe(1);
  });

  it('AC0/AC4b (review addendum) — a forced decision-row-insert failure rolls back resolveEscalation\'s WHOLE transaction (supersession + verdict event both undo)', async () => {
    const pariwarId = randomUUID();
    const { claimCaseId } = await seedEscalatedClaim(pariwarId);
    const beforeState = await claimState(claimCaseId);

    const scopeTx = await openScopeTx(deps, pariwarId);
    const restore = forceQueryFailure(scopeTx.client, /insert into "claim_state_trustee_decisions"/i);
    let threw = false;
    try {
      await claim.resolveEscalation(scopeTx.client, {
        claimCaseId: ids.claimId(claimCaseId),
        pariwarId: ids.pariwarId(pariwarId),
        reasonCode: null,
        rationaleCiphertext: null,
        actorId: randomUUID(),
        actorDisplay: 'Forced Failure Test',
        actor: 'trustee',
        outcome: 'approved',
      });
    } catch {
      threw = true;
    } finally {
      restore();
      await closeScopeTx(scopeTx, false);
    }
    expect(threw).toBe(true);

    // The atomic supersession of the escalated verifier decision did NOT survive — it's still LIVE — and
    // the verdict event (claim.verifier_approved) did not advance the claim's state either.
    expect(await escalationStillLive(claimCaseId)).toBe(true);
    expect(await claimState(claimCaseId)).toBe(beforeState); // still verifier_review
    expect(await trusteeDecisionCount(claimCaseId)).toBe(0);
  });
});
