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
    const body = res.json<{ claimCaseId: string; state: string; created: boolean }>();
    expect(body.state).toBe('intake_pending');
    expect(body.created).toBe(true);
    const claimCaseId = body.claimCaseId;

    // Exactly ONE claim.intake_initiated, carrying the helpline channel/actor + the pinned seam, and
    // the events_log.actor_id is the OPERATOR's admin actor id (claim-scoped operator attribution).
    const events = await td.pool.query<{ event_type: string; payload: Json; actor_id: string }>(
      `SELECT event_type, payload, actor_id FROM events_log WHERE stream_id = $1 ORDER BY event_version`,
      [claimCaseId],
    );
    expect(events.rows.map((r) => r.event_type)).toEqual(['claim.intake_initiated']);
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
      current_state: 'intake_pending',
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

  it('AC3 convergence: a prior member_app claim → helpline intake returns the SAME claim, created:false, no double freeze', async () => {
    const pariwarId = randomUUID();
    const { client, userId } = await authenticate();
    await grantRole(userId, pariwarId, 'helpline_operator');
    const deceasedMemberId = await seedMember(pariwarId);
    const priorClaimId = await seedMemberAppClaim(pariwarId, deceasedMemberId);
    await elevateClaimFile(client);

    const res = await client.inject({ method: 'POST', url: intakeUrl(pariwarId), payload: validBody(deceasedMemberId) });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ claimCaseId: string; created: boolean }>();
    expect(body.claimCaseId).toBe(priorClaimId);
    expect(body.created).toBe(false);

    // No second claim.intake_initiated event on the stream.
    const n = await td.pool.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM events_log WHERE stream_id = $1 AND event_type = 'claim.intake_initiated'`,
      [priorClaimId],
    );
    expect((n.rows[0] as { n: number }).n).toBe(1);
    expect(td.auditSink.ofType('helpline_claim.intake_idempotent').length).toBeGreaterThanOrEqual(1);
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
});
