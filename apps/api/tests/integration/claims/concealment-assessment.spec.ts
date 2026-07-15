// Concealment-flagged claim path WRITE + console-flagging E2E (live DB :5433) — Story 6.15 (Task 10).
//
// Drives POST …/admin/claims/:claimCaseId/concealment-assessment through the REAL admin guard chain
// (human-actor + claim.verify at the deceased's server-derived district), then GETs the 6.10 verifier
// console. Asserts the load-bearing behaviours the story pins:
//   · a verifier records `linked` → 201 (AC7); the assessment row + a claim.concealment_assessed IDENTITY
//     event both land; the claim is NOT auto-denied (state unchanged — AC1/never-auto-deny);
//   · the console concealment tri-state now resolves `flagged` from the producer (AC1/AC5), with
//     detailVisibility by EFFECTIVE authorization (district claim.verify → indicator_only; a cycle.freeze
//     holder → full + the R14 clauseVersionId — D-C);
//   · HUMAN-ACTOR (AC7) — 401 unauth; 403 without claim.verify.
//
// ⚠ Own-committing seed writes; fresh random pariwarId per test; events_log append-only
// ([[project_live_db_test_gotchas]]).

import { randomUUID } from 'node:crypto';

import { claim, ids } from '@twt/domain';
import type { VerifierConsolePacket } from '@twt/contracts';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { AppDeps } from '../../../src/context.js';
import * as service from '../../../src/modules/auth/admin/admin-auth.service.js';
import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { buildServer } from '../../../src/server.js';
import { buildTestDeps, hasDatabase, makeClient, type TestDeps } from '../_setup.js';
import { FakeWebAuthnProvider } from '../_webauthn-fake.js';

type Client = ReturnType<typeof makeClient>;

const DISTRICT = 'Patna';
const OTHER_DISTRICT = 'Vaishali';

describe.skipIf(!hasDatabase)('Concealment-flagged claim path — E2E (:5433)', () => {
  let td: TestDeps;
  let deps: AppDeps;
  let fakeWebauthn: FakeWebAuthnProvider;
  let app: Awaited<ReturnType<typeof buildServer>>;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    fakeWebauthn = new FakeWebAuthnProvider();
    td = buildTestDeps({ webauthn: fakeWebauthn });
    deps = td.deps;
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
    const email = `ca-${randomUUID()}@example.test`;
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
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/authenticate/verify', payload: { response: { id: credentialId } } });
    return { client, userId };
  }

  async function grant(userId: string, pariwarId: string, role: string, dim: string, value: string | null): Promise<void> {
    const c = await td.pool.connect();
    try {
      await c.query(
        `INSERT INTO role_grants (user_id, pariwar_id, role, scope_dimension, scope_value) VALUES ($1, $2, $3, $4, $5)`,
        [userId, pariwarId, role, dim, value],
      );
    } finally {
      c.release();
    }
  }

  /** A verifier (holds claim.verify at district) with a display name — the assessing actor (R5). */
  async function verifier(pariwarId: string, displayName = 'Anita (District Admin)'): Promise<{ client: Client; userId: string }> {
    const a = await authenticate({ displayName });
    await grant(a.userId, pariwarId, 'verifier', 'district', DISTRICT);
    return a;
  }

  /** A global super_admin — holds BOTH claim.verify (reads the console) AND cycle.freeze (⇒ full detail).
   *  The grant row's pariwarId must be the claim's pariwar so scope resolution admits the actor there. */
  async function superAdmin(pariwarId: string, displayName = 'Root (Super Admin)'): Promise<{ client: Client; userId: string }> {
    const a = await authenticate({ displayName });
    await grant(a.userId, pariwarId, 'super_admin', 'global', null);
    return a;
  }

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

  /** Seed a committed claim at `verification_in_progress`. */
  async function seedClaim(pariwarId: string, deceasedMemberId: ids.MemberId): Promise<string> {
    const claimCaseId = ids.claimId(randomUUID());
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
      await closeScopeTx(scopeTx, true);
    } catch (err) {
      await closeScopeTx(scopeTx, false);
      throw err;
    }
    return String(claimCaseId);
  }

  /** Seed the R14 concealment clause so the producer resolves a `flagged` signal + clauseVersionId. */
  async function seedR14Clause(pariwarId: string): Promise<string> {
    const c = await td.pool.connect();
    try {
      const res = await c.query<{ clause_version_id: string }>(
        `INSERT INTO clause_versions (clause_id, pariwar_id, version, effective_date, payload, benefit_mechanism)
         VALUES ('niy.concealment.r14', $1, 1, now() - interval '1 day', $2, 'pool')
         RETURNING clause_version_id`,
        [pariwarId, JSON.stringify({ ack_text_en: 'EN', ack_text_hi: 'HI', rule_code: 'R14', never_auto_deny: true })],
      );
      return res.rows[0]!.clause_version_id;
    } finally {
      c.release();
    }
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

  async function eventTypes(claimCaseId: string): Promise<string[]> {
    const c = await td.pool.connect();
    try {
      const res = await c.query<{ event_type: string }>(`SELECT event_type FROM events_log WHERE stream_id = $1 ORDER BY event_version`, [claimCaseId]);
      return res.rows.map((r) => r.event_type);
    } finally {
      c.release();
    }
  }

  const assessUrl = (p: string, c: string): string => `/api/v1/p/${p}/admin/claims/${c}/concealment-assessment`;
  const consoleUrl = (p: string, c: string): string => `/api/v1/p/${p}/admin/claims/${c}/verifier-console`;

  it('a verifier records `linked` → 201; the assessment row + a concealment_assessed identity event land; the claim is NOT auto-denied', async () => {
    const pariwarId = randomUUID();
    const { client } = await verifier(pariwarId);
    const member = await seedDeceasedMember(pariwarId, DISTRICT);
    const claimCaseId = await seedClaim(pariwarId, member);

    const res = await client.inject({ method: 'POST', url: assessUrl(pariwarId, claimCaseId), payload: { kind: 'linked', note: 'Undeclared cardiac condition.' } });
    expect(res.statusCode).toBe(201);
    const body = res.json() as { kind: string; claim_state: string; supersedes_assessment_id: string | null };
    expect(body.kind).toBe('linked');
    // NEVER auto-denied — the assessment is an identity annotation; claim state is unchanged.
    expect(body.claim_state).toBe('verification_in_progress');
    expect(await claimState(claimCaseId)).toBe('verification_in_progress');
    const types = await eventTypes(claimCaseId);
    expect(types).toContain('claim.concealment_assessed');
    expect(types.some((t) => /denied|approved/.test(t))).toBe(false);
  });

  it('the console resolves `flagged` from the producer for a district verifier (indicator_only, no clause version)', async () => {
    const pariwarId = randomUUID();
    const { client } = await verifier(pariwarId);
    const member = await seedDeceasedMember(pariwarId, DISTRICT);
    const claimCaseId = await seedClaim(pariwarId, member);
    await seedR14Clause(pariwarId);

    const post = await client.inject({ method: 'POST', url: assessUrl(pariwarId, claimCaseId), payload: { kind: 'linked' } });
    expect(post.statusCode).toBe(201);

    const res = await client.inject({ method: 'GET', url: consoleUrl(pariwarId, claimCaseId) });
    expect(res.statusCode).toBe(200);
    const packet = (res.json() as { packet: VerifierConsolePacket }).packet;
    expect(packet.concealment.status).toBe('flagged');
    expect(packet.concealment.detailVisibility).toBe('indicator_only');
    // indicator_only never surfaces the clause version (D-C).
    expect(packet.concealment.clauseVersionId ?? null).toBeNull();
  });

  it('a cycle.freeze holder (super_admin) sees `full` detail + the R14 clauseVersionId (D-C)', async () => {
    const pariwarId = randomUUID();
    const verif = await verifier(pariwarId);
    const member = await seedDeceasedMember(pariwarId, DISTRICT);
    const claimCaseId = await seedClaim(pariwarId, member);
    const clauseVersionId = await seedR14Clause(pariwarId);
    await verif.client.inject({ method: 'POST', url: assessUrl(pariwarId, claimCaseId), payload: { kind: 'linked' } });

    const root = await superAdmin(pariwarId);
    const res = await root.client.inject({ method: 'GET', url: consoleUrl(pariwarId, claimCaseId) });
    expect(res.statusCode).toBe(200);
    const packet = (res.json() as { packet: VerifierConsolePacket }).packet;
    expect(packet.concealment.status).toBe('flagged');
    expect(packet.concealment.detailVisibility).toBe('full');
    expect(packet.concealment.clauseVersionId).toBe(clauseVersionId);
  });

  it('a `not_linked` assessment resolves `not_flagged` on the console packet; an absent one stays `not_evaluated`', async () => {
    const pariwarId = randomUUID();
    const { client } = await verifier(pariwarId);
    const member = await seedDeceasedMember(pariwarId, DISTRICT);
    const claimCaseId = await seedClaim(pariwarId, member);
    await seedR14Clause(pariwarId);

    // Absent → not_evaluated.
    const before = await client.inject({ method: 'GET', url: consoleUrl(pariwarId, claimCaseId) });
    expect((before.json() as { packet: VerifierConsolePacket }).packet.concealment.status).toBe('not_evaluated');

    await client.inject({ method: 'POST', url: assessUrl(pariwarId, claimCaseId), payload: { kind: 'not_linked' } });
    const after = await client.inject({ method: 'GET', url: consoleUrl(pariwarId, claimCaseId) });
    expect((after.json() as { packet: VerifierConsolePacket }).packet.concealment.status).toBe('not_flagged');
  });

  it('401 unauth; 403 without claim.verify (human-actor gate)', async () => {
    const pariwarId = randomUUID();
    const member = await seedDeceasedMember(pariwarId, DISTRICT);
    const claimCaseId = await seedClaim(pariwarId, member);

    const anon = makeClient(app);
    const unauth = await anon.inject({ method: 'POST', url: assessUrl(pariwarId, claimCaseId), payload: { kind: 'linked' } });
    expect(unauth.statusCode).toBe(401);

    // An authenticated actor WITH a pariwar grant but NO claim.verify (helpline_operator) → 403.
    const stranger = await authenticate({ displayName: 'Stranger' });
    await grant(stranger.userId, pariwarId, 'helpline_operator', 'pariwar', pariwarId);
    const res = await stranger.client.inject({ method: 'POST', url: assessUrl(pariwarId, claimCaseId), payload: { kind: 'linked' } });
    expect(res.statusCode).toBe(403);
  });

  it('a district mismatch is DENIED (403); super_admin is allowed (authz matrix, the verifier-decision precedent)', async () => {
    const pariwarId = randomUUID();
    const member = await seedDeceasedMember(pariwarId, DISTRICT);
    const claimCaseId = await seedClaim(pariwarId, member);

    // claim.verify scoped to a DIFFERENT district ONLY → 403 (the deceased's district is derived
    // server-side, never client-supplied — a verifier granted only Vaishali cannot assess a Patna claim).
    const mismatch = await authenticate({ displayName: 'Wrong District Verifier' });
    await grant(mismatch.userId, pariwarId, 'verifier', 'district', OTHER_DISTRICT);
    const denied = await mismatch.client.inject({ method: 'POST', url: assessUrl(pariwarId, claimCaseId), payload: { kind: 'linked' } });
    expect(denied.statusCode).toBe(403);

    // super_admin (global) → allowed.
    const su = await superAdmin(pariwarId);
    const ok = await su.client.inject({ method: 'POST', url: assessUrl(pariwarId, claimCaseId), payload: { kind: 'linked' } });
    expect(ok.statusCode).toBe(201);
  });

  it('cross-Pariwar isolation: a claim.verify holder in Pariwar A is fail-closed for a claim under Pariwar B (403, not a leak)', async () => {
    const pariwarA = randomUUID();
    const pariwarB = randomUUID();
    const { client } = await verifier(pariwarA);
    const memberB = await seedDeceasedMember(pariwarB, DISTRICT);
    const claimUnderB = await seedClaim(pariwarB, memberB);

    // Posted under Pariwar A's path with a claim id that only exists under B. This route's preHandler
    // resolves the deceased's district SERVER-SIDE via `getClaimCase` scoped to the URL's pariwarId (the
    // 6.11 `resolveDecisionDistrict` shape, verbatim reuse) — a B-only claim is invisible under A's RLS
    // scope, so the district resolves to `null` → the SAME fail-closed 403 as "no district" (documented in
    // claims.concealment-assessment.routes.ts: "the same fail-closed posture as no district"). This is a
    // DIFFERENT status code than the r9-voting/cycle-freeze family's cross-Pariwar 404 — a different
    // permission model (district-derived, not a direct claim-existence 404), not an inconsistency: neither
    // status code leaks whether the B-only id exists.
    const res = await client.inject({ method: 'POST', url: assessUrl(pariwarA, claimUnderB), payload: { kind: 'linked' } });
    expect(res.statusCode).toBe(403);
  });
});
