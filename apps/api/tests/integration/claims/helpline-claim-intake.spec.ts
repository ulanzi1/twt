// Helpline-mediated claim-filing E2E (live DB :5433) — Story 6.3 (Task 7; AC1/AC3/AC4/AC5/AC6).
//
// Drives the operator-console intake through the REAL admin guard chain [adminSession, scope,
// requirePermissionHook(claim.file), requireStepUp('claim_file')] via a cookie-threading client:
//   · happy path: exactly ONE claim.intake_initiated with intake_channel:'helpline' +
//     actor:'operator' + the OPERATOR's actor_id, projecting intake_pending, and the merged
//     Story 3.1 account-frozen overlay now reads FROZEN (the load-bearing seam, driven end-to-end
//     per /verify discipline — not just a unit assert); lookup_method rides the AUDIT context but
//     NOT the domain payload (the payload stays .strict());
//   · RBAC: an admin WITHOUT claim.file → 403 (fail-closed, authz.denied audited);
//   · step-up: claim.file holder WITHOUT a fresh 'claim_file' elevation → 403 auth.step_up_required;
//   · cross-channel convergence: a prior (member_app) claim for the death → the helpline intake
//     returns the SAME claimCaseId with created:false, NO second event, NO second freeze;
//   · cross-tenant: a deceasedMemberId from another Pariwar → 404 (memberExists guard, defense-in-depth).
//
// ⚠ Own-committing writes (the scope tx commits on 2xx; the audit writer commits its own tx).
// audit tables are append-only, so assertions key on MEMBERSHIP, never counts, and each test uses a
// FRESH random pariwarId ([[project_live_db_test_gotchas]]).

import { randomUUID } from 'node:crypto';

import { claim, ids, member as memberDomain } from '@twt/domain';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { AppDeps } from '../../../src/context.js';
import * as service from '../../../src/modules/auth/admin/admin-auth.service.js';
import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { buildServer } from '../../../src/server.js';
import {
  buildTestDeps,
  hasDatabase,
  makeClient,
  type CapturingStepUpDelivery,
  type TestDeps,
} from '../_setup.js';
import { FakeWebAuthnProvider } from '../_webauthn-fake.js';

type Client = ReturnType<typeof makeClient>;
type Json = Record<string, unknown>;

const intakeUrl = (pariwarId: string): string => `/api/v1/p/${pariwarId}/admin/claims/intake`;

describe.skipIf(!hasDatabase)('Helpline-mediated claim filing — E2E (:5433)', () => {
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

  /** Create + enroll + fully log in a fresh admin; returns an authed cookie client + its userId. */
  async function authenticate(): Promise<{ client: Client; userId: string }> {
    const email = `hc-${randomUUID()}@example.test`;
    const password = 'CorrectHorseBatteryStaple9';
    const userId = await service.createAdminAccount(deps, { email, password });
    createdUserIds.push(userId);
    const credentialId = `cred-${userId}`;
    fakeWebauthn.nextRegistration = {
      verified: true,
      credential: { id: credentialId, publicKey: 'pk', counter: 0 },
    };
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

  async function grantRole(userId: string, pariwarId: string, role: string): Promise<void> {
    const c = await td.pool.connect();
    try {
      await c.query(
        `INSERT INTO role_grants (user_id, pariwar_id, role, scope_dimension, scope_value)
           VALUES ($1, $2, $3, 'pariwar', $4)`,
        [userId, pariwarId, role, pariwarId],
      );
    } finally {
      c.release();
    }
  }

  /** Seed a member (committed) so the request handler's memberExists guard + the freeze overlay see it. */
  async function seedMember(pariwarId: string): Promise<string> {
    const memberId = randomUUID();
    const scopeTx = await openScopeTx(deps, pariwarId);
    try {
      const mid = ids.memberId(memberId);
      const pid = ids.pariwarId(pariwarId);
      await memberDomain.projectMemberState(scopeTx.client, {
        memberId: mid, pariwarId: pid, eventType: 'member.signup_initiated', actorId: memberId,
        payload: { from_state: null, to_state: 'pending-kyc', trigger: 'signup', actor: 'member' },
      });
      await closeScopeTx(scopeTx, true);
    } catch (err) {
      await closeScopeTx(scopeTx, false);
      throw err;
    }
    return memberId;
  }

  /** Seed an EXISTING member_app claim (committed) for the death — the convergence-dedup fixture. */
  async function seedMemberAppClaim(pariwarId: string, deceasedMemberId: string): Promise<string> {
    const claimCaseId = ids.claimId(randomUUID());
    const scopeTx = await openScopeTx(deps, pariwarId);
    try {
      await claim.projectClaimState(scopeTx.client, {
        claimCaseId,
        pariwarId: ids.pariwarId(pariwarId),
        deceasedMemberId: ids.memberId(deceasedMemberId),
        intakeChannels: ['member_app'],
        claimantActorId: null,
        eventType: 'claim.intake_initiated',
        payload: {
          from_state: null, to_state: 'intake_pending', trigger: 'member_app_ravi_intake', actor: 'member',
          deceased_member_id: deceasedMemberId, intake_channel: 'member_app', claimant_actor_id: null,
        },
        actorId: deceasedMemberId,
      });
      await closeScopeTx(scopeTx, true);
    } catch (err) {
      await closeScopeTx(scopeTx, false);
      throw err;
    }
    return String(claimCaseId);
  }

  /** Drive the admin step-up request→verify for 'claim_file' so the intake gate finds a fresh elevation. */
  async function elevateClaimFile(client: Client): Promise<void> {
    const req = await client.inject({ method: 'POST', url: '/api/v1/auth/step-up/request', payload: { actionContext: 'claim_file' } });
    expect(req.statusCode).toBe(200);
    const code = adminStepUp.last?.code as string;
    expect(code).toMatch(/^\d{6}$/);
    const ver = await client.inject({ method: 'POST', url: '/api/v1/auth/step-up/verify', payload: { otp: code } });
    expect(ver.statusCode).toBe(200);
  }

  const validBody = (deceasedMemberId: string): Json => ({
    deceasedMemberId,
    relationship: 'child',
    identityReadBackConfirmed: true,
    lookupMethod: 'memberId',
  });

  it('AC1/AC3/AC6: operator intake → one claim.intake_initiated (helpline/operator/operator-actor) + FROZEN + audit', async () => {
    const pariwarId = randomUUID();
    const { client, userId } = await authenticate();
    await grantRole(userId, pariwarId, 'helpline_operator');
    const deceasedMemberId = await seedMember(pariwarId);
    await elevateClaimFile(client);

    // Account NOT yet frozen.
    const before = await memberDomain.getMemberAccountOverlay(deps.db, ids.memberId(deceasedMemberId), new Date());
    expect(before.accountFrozen).toBe(false);

    const res = await client.inject({ method: 'POST', url: intakeUrl(pariwarId), payload: validBody(deceasedMemberId) });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ claimCaseId: string; state: string; created: boolean; convergencePending: boolean }>();
    // Story 6.4: the lone helpline intake AUTO-CONVERGES → intake_converged (was intake_pending).
    expect(body.state).toBe('intake_converged');
    expect(body.created).toBe(true);
    expect(body.convergencePending).toBe(false);
    const claimCaseId = body.claimCaseId;

    // The lone-intake stream is [intake_initiated, intake_converged]. The freeze fires on the FIRST
    // (carrying the helpline channel/actor + the pinned seam); events_log.actor_id is the OPERATOR's
    // admin actor id (claim-scoped operator attribution).
    const events = await td.pool.query<{ event_type: string; payload: Json; actor_id: string }>(
      `SELECT event_type, payload, actor_id FROM events_log WHERE stream_id = $1 ORDER BY event_version`,
      [claimCaseId],
    );
    expect(events.rows.map((r) => r.event_type)).toEqual([
      'claim.intake_initiated',
      'claim.intake_converged',
    ]);
    expect(events.rows[0]?.actor_id).toBe(userId);
    expect(events.rows[0]?.payload).toMatchObject({
      deceased_member_id: deceasedMemberId,
      intake_channel: 'helpline',
      actor: 'operator',
      claimant_actor_id: null,
      to_state: 'intake_pending',
      from_state: null,
    });
    // lookup_method must NOT leak into the domain payload (it is audit-only).
    expect(events.rows[0]?.payload).not.toHaveProperty('lookup_method');

    // The claim row: intake_pending, deceased = member, v1 null-claimant, helpline channel.
    const claimRow = await td.pool.query<{
      current_state: string; deceased_member_id: string; claimant_actor_id: string | null; intake_channels: string; created_by_actor: string;
    }>(
      `SELECT current_state, deceased_member_id, claimant_actor_id, intake_channels::text, created_by_actor FROM claims WHERE claim_case_id = $1`,
      [claimCaseId],
    );
    expect(claimRow.rows[0]).toMatchObject({
      current_state: 'intake_converged',
      deceased_member_id: deceasedMemberId,
      claimant_actor_id: null,
      created_by_actor: userId,
    });
    expect(claimRow.rows[0]?.intake_channels).toBe('{helpline}');

    // ── THE LOAD-BEARING SEAM: the deceased's account now reads FROZEN (driven end-to-end). ──
    const overlay = await memberDomain.getMemberAccountOverlay(deps.db, ids.memberId(deceasedMemberId), new Date());
    expect(overlay.accountFrozen).toBe(true);
    expect(overlay.frozenSince).not.toBeNull();

    // Audit: a helpline_claim.intake_initiated line carrying lookup_method in the CONTEXT (not the payload).
    const initiated = td.auditSink.ofType('helpline_claim.intake_initiated');
    expect(initiated.length).toBeGreaterThanOrEqual(1);
    const ctx = initiated.at(-1)?.context as Json;
    expect(ctx).toMatchObject({
      claim_case_id: claimCaseId,
      deceased_member_id: deceasedMemberId,
      intake_channel: 'helpline',
      relationship: 'child',
      lookup_method: 'memberId',
    });
    expect(initiated.at(-1)?.actorId).toBe(userId);
  });

  it('AC3 cross-channel (Story 6.4): a prior member_app claim → helpline intake returns the SAME claim, convergencePending:true, records a pending attempt, no double freeze', async () => {
    const pariwarId = randomUUID();
    const { client, userId } = await authenticate();
    await grantRole(userId, pariwarId, 'helpline_operator');
    const deceasedMemberId = await seedMember(pariwarId);
    const priorClaimId = await seedMemberAppClaim(pariwarId, deceasedMemberId);
    await elevateClaimFile(client);

    const res = await client.inject({ method: 'POST', url: intakeUrl(pariwarId), payload: validBody(deceasedMemberId) });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ claimCaseId: string; created: boolean; convergencePending: boolean }>();
    // The second filer is NOT blocked — the existing canonical claim is returned unchanged.
    expect(body.claimCaseId).toBe(priorClaimId);
    expect(body.created).toBe(false);
    // Story 6.4: a genuine cross-channel second intake is PENDING resolution (NOT auto-merged).
    expect(body.convergencePending).toBe(true);

    // No second claim.intake_initiated event on the canonical stream (no mint, no second freeze).
    const n = await td.pool.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM events_log WHERE stream_id = $1 AND event_type = 'claim.intake_initiated'`,
      [priorClaimId],
    );
    expect((n.rows[0] as { n: number }).n).toBe(1);

    // A durable `pending` intake_attempts row for the helpline channel now awaits operator resolution.
    const attempts = await td.pool.query<{ attempt_status: string; intake_channel: string; superseded_by_claim_case_id: string | null }>(
      `SELECT attempt_status, intake_channel, superseded_by_claim_case_id FROM intake_attempts WHERE deceased_member_id = $1`,
      [deceasedMemberId],
    );
    expect(attempts.rows).toContainEqual(
      expect.objectContaining({ attempt_status: 'pending', intake_channel: 'helpline', superseded_by_claim_case_id: null }),
    );

    // The distinct convergence_pending audit line (NOT intake_idempotent — a reviewable event).
    expect(td.auditSink.ofType('helpline_claim.convergence_pending').length).toBeGreaterThanOrEqual(1);
    expect(td.auditSink.ofType('helpline_claim.intake_idempotent').length).toBe(0);
  });

  it('AC1 RBAC: an admin WITHOUT claim.file → 403 (fail-closed) + no claim, no freeze', async () => {
    const pariwarId = randomUUID();
    const { client, userId } = await authenticate();
    // pariwar_admin holds member.view_validity + claim.approve, but NOT claim.file.
    await grantRole(userId, pariwarId, 'pariwar_admin');
    const deceasedMemberId = await seedMember(pariwarId);
    await elevateClaimFile(client);

    const res = await client.inject({ method: 'POST', url: intakeUrl(pariwarId), payload: validBody(deceasedMemberId) });
    expect(res.statusCode).toBe(403);
    expect(td.auditSink.ofType('authz.denied').length).toBeGreaterThanOrEqual(1);
    const overlay = await memberDomain.getMemberAccountOverlay(deps.db, ids.memberId(deceasedMemberId), new Date());
    expect(overlay.accountFrozen).toBe(false);
  });

  it('AC4 step-up: a claim.file holder WITHOUT a fresh elevation → 403 auth.step_up_required + no freeze', async () => {
    const pariwarId = randomUUID();
    const { client, userId } = await authenticate();
    await grantRole(userId, pariwarId, 'helpline_operator');
    const deceasedMemberId = await seedMember(pariwarId);
    // No elevateClaimFile — the step-up gate must reject.
    const res = await client.inject({ method: 'POST', url: intakeUrl(pariwarId), payload: validBody(deceasedMemberId) });
    expect(res.statusCode).toBe(403);
    expect(res.json<{ error: { code: string } }>().error.code).toBe('auth.step_up_required');
    const overlay = await memberDomain.getMemberAccountOverlay(deps.db, ids.memberId(deceasedMemberId), new Date());
    expect(overlay.accountFrozen).toBe(false);
  });

  it('AC1 cross-tenant: a deceasedMemberId from ANOTHER Pariwar → 404 (memberExists guard)', async () => {
    const pariwarId = randomUUID();
    const otherPariwarId = randomUUID();
    const { client, userId } = await authenticate();
    await grantRole(userId, pariwarId, 'helpline_operator');
    // The member lives in a DIFFERENT Pariwar — the operator has no grant there.
    const foreignMemberId = await seedMember(otherPariwarId);
    await elevateClaimFile(client);

    const res = await client.inject({ method: 'POST', url: intakeUrl(pariwarId), payload: validBody(foreignMemberId) });
    expect(res.statusCode).toBe(404);
  });

  it('AC2 wire gate: identityReadBackConfirmed:false is rejected at validation (400) — no intake', async () => {
    const pariwarId = randomUUID();
    const { client, userId } = await authenticate();
    await grantRole(userId, pariwarId, 'helpline_operator');
    const deceasedMemberId = await seedMember(pariwarId);
    await elevateClaimFile(client);

    const res = await client.inject({
      method: 'POST',
      url: intakeUrl(pariwarId),
      payload: { ...validBody(deceasedMemberId), identityReadBackConfirmed: false },
    });
    expect(res.statusCode).toBe(400);
    const overlay = await memberDomain.getMemberAccountOverlay(deps.db, ids.memberId(deceasedMemberId), new Date());
    expect(overlay.accountFrozen).toBe(false);
  });

  it('AC6: the admin guard rejects an unauthenticated intake (401)', async () => {
    const pariwarId = randomUUID();
    const anon = makeClient(app);
    const res = await anon.inject({ method: 'POST', url: intakeUrl(pariwarId), payload: validBody(randomUUID()) });
    expect(res.statusCode).toBe(401);
  });

  // ── Story 6.4 — the ICP convergence-resolution endpoints (merge + override) ──
  const convBase = (pariwarId: string): string => `/api/v1/p/${pariwarId}/admin/claims/convergence`;

  /** Drive a cross-channel pending attempt: seed a member_app claim, then a helpline intake for the
   * same death → convergencePending. Returns the canonical claim id + the pending attempt id. */
  async function seedCrossChannelPending(
    client: Client,
    pariwarId: string,
    deceasedMemberId: string,
  ): Promise<{ canonicalClaimId: string; intakeAttemptId: string }> {
    const canonicalClaimId = await seedMemberAppClaim(pariwarId, deceasedMemberId);
    await elevateClaimFile(client);
    const intake = await client.inject({ method: 'POST', url: intakeUrl(pariwarId), payload: validBody(deceasedMemberId) });
    expect(intake.statusCode).toBe(200);
    expect(intake.json<{ convergencePending: boolean }>().convergencePending).toBe(true);

    const pendingRes = await client.inject({ method: 'GET', url: `${convBase(pariwarId)}/pending` });
    expect(pendingRes.statusCode).toBe(200);
    const pending = pendingRes.json<{ pending: Array<{ intakeAttemptId: string; intakeChannel: string; candidates: Array<{ claimCaseId: string; intakeChannels: string[] }> }> }>().pending;
    const row = pending.find((p) => p.intakeChannel === 'helpline' && p.candidates.some((c) => c.claimCaseId === canonicalClaimId));
    expect(row).toBeDefined();
    // AC3 cross-channel visibility: the strip feed shows the candidate's channel set (member_app).
    expect(row!.candidates.some((c) => c.intakeChannels.includes('member_app'))).toBe(true);
    return { canonicalClaimId, intakeAttemptId: row!.intakeAttemptId };
  }

  /** Same fixture as `seedCrossChannelPending`, but entirely via the DOMAIN layer (no HTTP intake
   * call) — the admin session never touches the step-up flow, so `elevatedUntil` stays unset.
   * Used ONLY for the step-up negative test, where any incidental elevation would invalidate it. */
  async function seedCrossChannelPendingViaDomain(
    pariwarId: string,
    deceasedMemberId: string,
  ): Promise<{ canonicalClaimId: string; intakeAttemptId: string }> {
    const canonicalClaimId = await seedMemberAppClaim(pariwarId, deceasedMemberId);
    const scopeTx = await openScopeTx(deps, pariwarId);
    try {
      const r = await claim.tryConverge(scopeTx.client, {
        pariwarId: ids.pariwarId(pariwarId),
        deceasedMemberId: ids.memberId(deceasedMemberId),
        intakeChannel: 'helpline',
        actor: 'operator',
        claimantActorId: null,
        trigger: 'test_helpline_intake',
        actorId: null,
        auditId: randomUUID(),
      });
      expect(r.convergencePending).toBe(true);
      await closeScopeTx(scopeTx, true);
      return { canonicalClaimId, intakeAttemptId: String(r.intakeAttemptId) };
    } catch (err) {
      await closeScopeTx(scopeTx, false);
      throw err;
    }
  }

  it('AC2 merge: operator confirms convergence → channel unioned, attempt converged, convergence_merged audit, NO lifecycle event', async () => {
    const pariwarId = randomUUID();
    const { client, userId } = await authenticate();
    await grantRole(userId, pariwarId, 'helpline_operator');
    const deceasedMemberId = await seedMember(pariwarId);
    const { canonicalClaimId, intakeAttemptId } = await seedCrossChannelPending(client, pariwarId, deceasedMemberId);

    const before = await td.pool.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM events_log WHERE stream_id = $1`,
      [canonicalClaimId],
    );

    const merge = await client.inject({
      method: 'POST',
      url: `${convBase(pariwarId)}/merge`,
      payload: { intakeAttemptId, claimCaseId: canonicalClaimId },
    });
    expect(merge.statusCode).toBe(200);
    const body = merge.json<{ merged: boolean; intakeChannels: string[] }>();
    expect(body.merged).toBe(true);
    expect([...body.intakeChannels].sort()).toEqual(['helpline', 'member_app']);

    // The canonical claim's channel set is unioned; the attempt is converged + superseded.
    const claimRow = await td.pool.query<{ intake_channels: string }>(
      `SELECT intake_channels::text FROM claims WHERE claim_case_id = $1`,
      [canonicalClaimId],
    );
    // Order-insensitive (the SQL union orders by enum-declaration order, not alphabetically).
    const channels = claimRow.rows[0]!.intake_channels.replace(/[{}]/g, '').split(',').sort();
    expect(channels).toEqual(['helpline', 'member_app']);
    const attempt = await td.pool.query<{ attempt_status: string; superseded_by_claim_case_id: string }>(
      `SELECT attempt_status, superseded_by_claim_case_id FROM intake_attempts WHERE intake_attempt_id = $1`,
      [intakeAttemptId],
    );
    expect(attempt.rows[0]).toMatchObject({ attempt_status: 'converged', superseded_by_claim_case_id: canonicalClaimId });

    // NO new lifecycle event appended by the merge (the stream length is unchanged).
    const after = await td.pool.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM events_log WHERE stream_id = $1`,
      [canonicalClaimId],
    );
    expect(after.rows[0]?.n).toBe(before.rows[0]?.n);
    expect(td.auditSink.ofType('helpline_claim.convergence_merged').length).toBeGreaterThanOrEqual(1);

    // Single freeze intact.
    expect((await memberDomain.getMemberAccountOverlay(deps.db, ids.memberId(deceasedMemberId), new Date())).accountFrozen).toBe(true);

    // The attempt is off the pending strip now.
    const pendingAfter = await client.inject({ method: 'GET', url: `${convBase(pariwarId)}/pending` });
    expect(pendingAfter.json<{ pending: unknown[] }>().pending.some((p) => (p as { intakeAttemptId: string }).intakeAttemptId === intakeAttemptId)).toBe(false);
  });

  it('AC4 override: operator treats as separate → distinct claim minted + override ledger; aggregate overlay STAYS frozen (both claims open)', async () => {
    const pariwarId = randomUUID();
    const { client, userId } = await authenticate();
    await grantRole(userId, pariwarId, 'helpline_operator');
    const deceasedMemberId = await seedMember(pariwarId);
    const { canonicalClaimId, intakeAttemptId } = await seedCrossChannelPending(client, pariwarId, deceasedMemberId);

    // Override mints a claim → the operator's own fresh step-up (§2.2).
    await elevateClaimFile(client);
    const override = await client.inject({
      method: 'POST',
      url: `${convBase(pariwarId)}/override`,
      payload: { intakeAttemptId, againstClaimCaseId: canonicalClaimId, reason: 'disputed re-file — distinct claimant' },
    });
    expect(override.statusCode).toBe(200);
    const body = override.json<{ overridden: boolean; newClaimCaseId: string; state: string }>();
    expect(body.overridden).toBe(true);
    expect(body.newClaimCaseId).not.toBe(canonicalClaimId);
    expect(body.state).toBe('intake_converged');

    // The override ledger row + the attempt flipped overridden_separate → the NEW distinct claim.
    const overrides = await td.pool.query<{ against_claim_case_id: string; reason: string }>(
      `SELECT against_claim_case_id, reason FROM convergence_overrides WHERE deceased_member_id = $1`,
      [deceasedMemberId],
    );
    expect(overrides.rows).toContainEqual(expect.objectContaining({ against_claim_case_id: canonicalClaimId }));
    const attempt = await td.pool.query<{ attempt_status: string; superseded_by_claim_case_id: string }>(
      `SELECT attempt_status, superseded_by_claim_case_id FROM intake_attempts WHERE intake_attempt_id = $1`,
      [intakeAttemptId],
    );
    expect(attempt.rows[0]).toMatchObject({ attempt_status: 'overridden_separate', superseded_by_claim_case_id: body.newClaimCaseId });

    // TWO distinct claims now exist for the death.
    const claims = await td.pool.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM claims WHERE deceased_member_id = $1`,
      [deceasedMemberId],
    );
    expect(claims.rows[0]?.n).toBe(2);

    // ⚠ NORMATIVE: the aggregate overlay STAYS frozen while ANY claim is non-terminal (both are).
    expect((await memberDomain.getMemberAccountOverlay(deps.db, ids.memberId(deceasedMemberId), new Date())).accountFrozen).toBe(true);
    expect(td.auditSink.ofType('helpline_claim.convergence_overridden').length).toBeGreaterThanOrEqual(1);
  });

  it('AC1 convergence RBAC: an admin WITHOUT claim.file → 403 on the pending-list endpoint (fail-closed)', async () => {
    const pariwarId = randomUUID();
    const { client, userId } = await authenticate();
    // pariwar_admin holds claim.approve but NOT claim.file (the reused convergence permission key).
    await grantRole(userId, pariwarId, 'pariwar_admin');
    const res = await client.inject({ method: 'GET', url: `${convBase(pariwarId)}/pending` });
    expect(res.statusCode).toBe(403);
    expect(td.auditSink.ofType('authz.denied').length).toBeGreaterThanOrEqual(1);
  });

  it('override step-up: a claim.file holder WITHOUT a fresh elevation → 403 auth.step_up_required, no claim minted', async () => {
    const pariwarId = randomUUID();
    const { client, userId } = await authenticate();
    await grantRole(userId, pariwarId, 'helpline_operator');
    const deceasedMemberId = await seedMember(pariwarId);
    // Seeded via the domain layer, NOT the HTTP intake route — the step-up elevation window
    // (~5 min, shared across the whole `claim_file` action context) would otherwise still be
    // live from the intake call and silently satisfy the override gate too.
    const { canonicalClaimId, intakeAttemptId } = await seedCrossChannelPendingViaDomain(pariwarId, deceasedMemberId);

    // This session has NEVER elevated — the override route MUST demand its own fresh elevation
    // (route header: "the operator's own fresh admin step-up").
    const res = await client.inject({
      method: 'POST',
      url: `${convBase(pariwarId)}/override`,
      payload: { intakeAttemptId, againstClaimCaseId: canonicalClaimId, reason: 'disputed re-file — distinct claimant' },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json<{ error: { code: string } }>().error.code).toBe('auth.step_up_required');

    const claims = await td.pool.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM claims WHERE deceased_member_id = $1`,
      [deceasedMemberId],
    );
    expect(claims.rows[0]?.n).toBe(1); // still just the canonical claim — no second claim minted
  });

  it('AC5 merge identity guard (Review Finding): a claimCaseId for an UNRELATED death → 409, no channel union', async () => {
    const pariwarId = randomUUID();
    const { client, userId } = await authenticate();
    await grantRole(userId, pariwarId, 'helpline_operator');
    const deceasedMemberId = await seedMember(pariwarId);
    const { intakeAttemptId } = await seedCrossChannelPending(client, pariwarId, deceasedMemberId);

    // An unrelated death's claim in the SAME Pariwar — a valid claimCaseId, but not a candidate
    // for THIS attempt's death.
    const otherDeceasedMemberId = await seedMember(pariwarId);
    const unrelatedClaimId = await seedMemberAppClaim(pariwarId, otherDeceasedMemberId);

    const res = await client.inject({
      method: 'POST',
      url: `${convBase(pariwarId)}/merge`,
      payload: { intakeAttemptId, claimCaseId: unrelatedClaimId },
    });
    expect(res.statusCode).toBe(409);

    const unrelatedClaim = await td.pool.query<{ intake_channels: string }>(
      `SELECT intake_channels::text FROM claims WHERE claim_case_id = $1`,
      [unrelatedClaimId],
    );
    expect(unrelatedClaim.rows[0]?.intake_channels).toBe('{member_app}'); // unchanged — no union happened
  });

  it('AC4/AC9 override identity guard (Review Finding): an againstClaimCaseId for an UNRELATED death → 409, no claim minted', async () => {
    const pariwarId = randomUUID();
    const { client, userId } = await authenticate();
    await grantRole(userId, pariwarId, 'helpline_operator');
    const deceasedMemberId = await seedMember(pariwarId);
    const { intakeAttemptId } = await seedCrossChannelPending(client, pariwarId, deceasedMemberId);

    const otherDeceasedMemberId = await seedMember(pariwarId);
    const unrelatedClaimId = await seedMemberAppClaim(pariwarId, otherDeceasedMemberId);

    await elevateClaimFile(client);
    const res = await client.inject({
      method: 'POST',
      url: `${convBase(pariwarId)}/override`,
      payload: { intakeAttemptId, againstClaimCaseId: unrelatedClaimId, reason: 'disputed re-file — distinct claimant' },
    });
    expect(res.statusCode).toBe(409);

    const overrides = await td.pool.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM convergence_overrides WHERE deceased_member_id = $1`,
      [deceasedMemberId],
    );
    expect(overrides.rows[0]?.n).toBe(0); // no ledger row recorded
    const claims = await td.pool.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM claims WHERE deceased_member_id = $1`,
      [deceasedMemberId],
    );
    expect(claims.rows[0]?.n).toBe(1); // still just the canonical claim — no second claim minted
  });
});
