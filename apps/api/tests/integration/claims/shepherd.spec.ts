// Shepherd surfaces E2E (live DB :5433) — Story 6.12 (Task 5/6; AC3/AC5/AC6/AC7; Review Findings).
//
// Drives BOTH shepherd surfaces through the REAL guard chains:
//   · GET  /api/v1/member/claims/:claimCaseId/shepherd — member-app read (bearer token, claim ownership).
//   · POST /api/v1/p/:pariwarId/admin/claims/:claimCaseId/shepherd/reassign — admin manual reassign
//     (cookie session, claim.assign_shepherd + district gate, self-assignment + fail-closed contactability
//     + scope-eligibility, post-commit audit).
//
// This suite exists because the review found NONE of this was covered: the only pre-existing apps/api
// test for 6.12 was a unit test of E.164 validation on admin-auth.repo.ts — no route was exercised at all.
//
// Since the AUTO-assign trigger is a separate apps/jobs worker (out of apps/api's process), these tests
// seed an initial live shepherd directly via the domain writer `claim.assignShepherd` (mirroring what the
// worker would do), then exercise the API surfaces against that seeded state.

import { randomUUID } from 'node:crypto';

import { claim, ids } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import * as service from '../../../src/modules/auth/admin/admin-auth.service.js';
import { signAccessToken } from '../../../src/modules/auth/member/tokens.js';
import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { createTestApp, hasDatabase, teardown, makeClient, type TestApp } from '../_setup.js';
import { FakeWebAuthnProvider } from '../_webauthn-fake.js';

type Client = ReturnType<typeof makeClient>;

const DISTRICT = 'Patna';
const OTHER_DISTRICT = 'Vaishali';
const ACCESS_TTL_MS = 15 * 60 * 1000;

describe.skipIf(!hasDatabase)('Shepherd surfaces — E2E (:5433)', () => {
  let t: TestApp;
  let fakeWebauthn: FakeWebAuthnProvider;
  const createdUserIds: string[] = [];

  const setup = async (): Promise<void> => {
    fakeWebauthn = new FakeWebAuthnProvider();
    t = await createTestApp({ webauthn: fakeWebauthn });
  };
  const cleanup = async (): Promise<void> => {
    const c = await t.pool.connect();
    try {
      if (createdUserIds.length > 0) {
        await c.query(`DELETE FROM admin_sessions WHERE sess ->> 'userId' = ANY($1)`, [createdUserIds]);
        await c.query(`DELETE FROM role_grants WHERE user_id = ANY($1)`, [createdUserIds]);
        await c.query(`DELETE FROM users WHERE id = ANY($1)`, [createdUserIds]);
      }
    } finally {
      c.release();
    }
    await teardown(t);
  };

  async function authenticateAdmin(opts: { displayName?: string | null } = {}): Promise<{ client: Client; userId: string }> {
    const email = `shep-${randomUUID()}@example.test`;
    const password = 'CorrectHorseBatteryStaple9';
    const userId = await service.createAdminAccount(t.deps, {
      email,
      password,
      ...(opts.displayName != null ? { displayName: opts.displayName } : {}),
    });
    createdUserIds.push(userId);
    const credentialId = `cred-${userId}`;
    fakeWebauthn.nextRegistration = { verified: true, credential: { id: credentialId, publicKey: 'pk', counter: 0 } };
    fakeWebauthn.nextAuthentication = { verified: true, newCounter: 1 };
    const client = makeClient(t.app);
    const token = service.mintEnrollmentToken(t.deps, userId);
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/register/options', payload: { enrollmentToken: token } });
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/register/verify', payload: { response: { id: 'b' }, enrollmentToken: token } });
    await client.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email, password } });
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/authenticate/options', payload: {} });
    const verify = await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/authenticate/verify', payload: { response: { id: credentialId } } });
    expect(verify.statusCode).toBe(200);
    return { client, userId };
  }

  async function grant(userId: string, pariwarId: string, role: string, dim: string, value: string | null): Promise<void> {
    const c = await t.pool.connect();
    try {
      await c.query(
        `INSERT INTO role_grants (user_id, pariwar_id, role, scope_dimension, scope_value) VALUES ($1, $2, $3, $4, $5)`,
        [userId, pariwarId, role, dim, value],
      );
    } finally {
      c.release();
    }
  }

  async function seedUser(opts: { displayName?: string | null; contactPhone?: string | null; contactWhatsapp?: string | null } = {}): Promise<string> {
    const id = randomUUID();
    createdUserIds.push(id);
    const c = await t.pool.connect();
    try {
      await c.query(
        `INSERT INTO users (id, identity_type, status, display_name, contact_phone, contact_whatsapp)
         VALUES ($1, 'admin', 'active', $2, $3, $4)`,
        [id, opts.displayName ?? null, opts.contactPhone ?? null, opts.contactWhatsapp ?? null],
      );
    } finally {
      c.release();
    }
    return id;
  }

  /** A District-Admin (holds claim.assign_shepherd) with a display name + contact — an eligible shepherd. */
  async function districtAdminShepherd(
    pariwarId: string,
    opts: { displayName?: string | null; contactPhone?: string | null } = {},
  ): Promise<string> {
    const id = await seedUser({
      displayName: opts.displayName ?? 'Anita (District Admin)',
      contactPhone: opts.contactPhone ?? '+919876543210',
    });
    await grant(id, pariwarId, 'district_admin', 'district', DISTRICT);
    return id;
  }

  /** The acting admin who calls the reassign route (holds claim.assign_shepherd via district_admin). */
  async function actingAdmin(pariwarId: string, displayName = 'Reassign Actor'): Promise<{ client: Client; userId: string }> {
    const a = await authenticateAdmin({ displayName });
    await grant(a.userId, pariwarId, 'district_admin', 'district', DISTRICT);
    return a;
  }

  async function seedDeceasedMember(pariwarId: string, district: string | null): Promise<ids.MemberId> {
    const memberId = randomUUID();
    const c = await t.pool.connect();
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

  /** Drive a fresh claim to `verification_in_progress` (own scope-tx, own-committing). */
  async function seedClaimInVerification(
    pariwarId: string,
    deceasedMemberId: ids.MemberId,
    claimantActorId: string | null = null,
  ): Promise<string> {
    const claimCaseId = ids.claimId(randomUUID());
    const scopeTx = await openScopeTx(t.deps, pariwarId);
    const emit = (from: string | null, to: string, eventType: string, extra: Record<string, unknown> = {}) =>
      claim.projectClaimState(scopeTx.client, {
        claimCaseId, pariwarId: ids.pariwarId(pariwarId), deceasedMemberId, intakeChannels: ['member_app'], claimantActorId,
        eventType: eventType as never,
        payload: { from_state: from, to_state: to, trigger: 'seed', actor: 'system', ...extra },
        actorId: null,
      });
    try {
      await emit(null, 'intake_pending', 'claim.intake_initiated', { deceased_member_id: String(deceasedMemberId), intake_channel: 'member_app', claimant_actor_id: claimantActorId });
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

  /** Seed an initial live shepherd via the domain writer directly (mirrors the apps/jobs auto-assign
   *  worker, which runs out-of-process from apps/api). */
  async function seedLiveShepherd(pariwarId: string, claimCaseId: string): Promise<void> {
    const scopeTx = await openScopeTx(t.deps, pariwarId);
    try {
      await claim.assignShepherd(scopeTx.client, {
        claimCaseId: ids.claimId(claimCaseId),
        pariwarId: ids.pariwarId(pariwarId),
        district: DISTRICT,
      });
      await closeScopeTx(scopeTx, true);
    } catch (err) {
      await closeScopeTx(scopeTx, false);
      throw err;
    }
  }

  const reassignUrl = (p: string, c: string) => `/api/v1/p/${p}/admin/claims/${c}/shepherd/reassign`;
  const memberShepherdUrl = (c: string) => `/api/v1/member/claims/${c}/shepherd`;

  function memberToken(memberId: string, pariwarId: string): string {
    return signAccessToken(t.app, { memberId, pariwarId, deviceId: 'test-device' }, ACCESS_TTL_MS);
  }

  // ── Member GET shepherd (AC3) ────────────────────────────────────────────────

  it('member read: not_assigned before verification, then assigned after a live shepherd exists', async () => {
    await setup();
    try {
      const pariwarId = randomUUID();
      await districtAdminShepherd(pariwarId);
      const deceasedMemberId = await seedDeceasedMember(pariwarId, DISTRICT);
      const claimantMemberId = String(deceasedMemberId); // Ravi-mode: session minted against the deceased id.
      const claimCaseId = await seedClaimInVerification(pariwarId, deceasedMemberId, claimantMemberId);
      const tok = memberToken(claimantMemberId, pariwarId);

      const before = await t.app.inject({ method: 'GET', url: memberShepherdUrl(claimCaseId), headers: { authorization: `Bearer ${tok}` } });
      expect(before.statusCode).toBe(200);
      expect(before.json()).toEqual({ status: 'not_assigned' });

      await seedLiveShepherd(pariwarId, claimCaseId);
      const after = await t.app.inject({ method: 'GET', url: memberShepherdUrl(claimCaseId), headers: { authorization: `Bearer ${tok}` } });
      expect(after.statusCode).toBe(200);
      const body = after.json() as { status: string; display_name?: string; contact?: { phone: string | null } };
      expect(body.status).toBe('assigned');
      expect(body.display_name).toBe('Anita (District Admin)');
      expect(body.contact?.phone).toBe('+919876543210');
    } finally {
      await cleanup();
    }
  });

  it('member read: a non-owner gets 404 (no cross-claimant oracle)', async () => {
    await setup();
    try {
      const pariwarId = randomUUID();
      await districtAdminShepherd(pariwarId);
      const deceasedMemberId = await seedDeceasedMember(pariwarId, DISTRICT);
      const claimCaseId = await seedClaimInVerification(pariwarId, deceasedMemberId, String(deceasedMemberId));
      await seedLiveShepherd(pariwarId, claimCaseId);

      const strangerId = randomUUID();
      const res = await t.app.inject({
        method: 'GET', url: memberShepherdUrl(claimCaseId),
        headers: { authorization: `Bearer ${memberToken(strangerId, pariwarId)}` },
      });
      expect(res.statusCode).toBe(404);
    } finally {
      await cleanup();
    }
  });

  it('member read: a cross-Pariwar token (different tenant, same claim id shape) gets 404 (Review Finding)', async () => {
    await setup();
    try {
      const pariwarId = randomUUID();
      const otherPariwarId = randomUUID();
      await districtAdminShepherd(pariwarId);
      const deceasedMemberId = await seedDeceasedMember(pariwarId, DISTRICT);
      const claimCaseId = await seedClaimInVerification(pariwarId, deceasedMemberId, String(deceasedMemberId));
      await seedLiveShepherd(pariwarId, claimCaseId);

      // A token scoped to a DIFFERENT Pariwar than the one the claim actually lives in — even naming the
      // SAME member id as the real claimant (the deceased/claimant id is per-Pariwar, so this simulates a
      // cross-tenant token, not just a wrong actor). RLS + the explicit pariwarId-scoped claim lookup must
      // deny this exactly like a non-owner, never leak the other tenant's shepherd contact.
      const res = await t.app.inject({
        method: 'GET', url: memberShepherdUrl(claimCaseId),
        headers: { authorization: `Bearer ${memberToken(String(deceasedMemberId), otherPariwarId)}` },
      });
      expect(res.statusCode).toBe(404);
    } finally {
      await cleanup();
    }
  });

  it('member read: 401 when unauthenticated', async () => {
    await setup();
    try {
      const res = await t.app.inject({ method: 'GET', url: memberShepherdUrl(randomUUID()) });
      expect(res.statusCode).toBe(401);
    } finally {
      await cleanup();
    }
  });

  // ── Admin manual reassignment (R6, AC5) ──────────────────────────────────────

  it('reassign: happy path — 201, previous_shepherd_actor_id set, audit line carries it (Review Finding)', async () => {
    await setup();
    try {
      const pariwarId = randomUUID();
      const firstShepherd = await districtAdminShepherd(pariwarId);
      const deceasedMemberId = await seedDeceasedMember(pariwarId, DISTRICT);
      const claimCaseId = await seedClaimInVerification(pariwarId, deceasedMemberId);
      await seedLiveShepherd(pariwarId, claimCaseId);
      const target = await districtAdminShepherd(pariwarId, { displayName: 'Target Shepherd', contactPhone: '+919000000002' });
      const admin = await actingAdmin(pariwarId);

      const auditBefore = t.auditSink.ofType('admin_claim.shepherd_reassigned').length;
      const res = await admin.client.inject({ method: 'POST', url: reassignUrl(pariwarId, claimCaseId), payload: { target_shepherd_actor_id: target } });
      expect(res.statusCode).toBe(201);
      const body = res.json() as { previous_shepherd_actor_id: string | null; shepherd_actor_id: string; assignment_reason: string };
      expect(body.shepherd_actor_id).toBe(target);
      expect(body.previous_shepherd_actor_id).toBe(firstShepherd);
      expect(body.assignment_reason).toBe('reassignment');

      const audits = t.auditSink.ofType('admin_claim.shepherd_reassigned');
      expect(audits.length).toBe(auditBefore + 1);
      const ctx = audits[audits.length - 1]!.context as { previous_shepherd_actor_id?: string | null; shepherd_actor_id?: string };
      expect(ctx.previous_shepherd_actor_id).toBe(firstShepherd);
      expect(ctx.shepherd_actor_id).toBe(target);
    } finally {
      await cleanup();
    }
  });

  it('reassign: self-assignment is rejected (403) and still audited (AC5)', async () => {
    await setup();
    try {
      const pariwarId = randomUUID();
      await districtAdminShepherd(pariwarId);
      const deceasedMemberId = await seedDeceasedMember(pariwarId, DISTRICT);
      const claimCaseId = await seedClaimInVerification(pariwarId, deceasedMemberId);
      await seedLiveShepherd(pariwarId, claimCaseId);
      const admin = await actingAdmin(pariwarId);

      const auditBefore = t.auditSink.ofType('admin_claim.shepherd_reassigned').length;
      const res = await admin.client.inject({ method: 'POST', url: reassignUrl(pariwarId, claimCaseId), payload: { target_shepherd_actor_id: admin.userId } });
      expect(res.statusCode).toBe(403);
      expect((res.json() as { error: { code: string } }).error.code).toBe('shepherd.self_assignment');
      const audits = t.auditSink.ofType('admin_claim.shepherd_reassigned');
      expect(audits.length).toBe(auditBefore + 1);
      expect((audits[audits.length - 1]!.context as { disposition?: string }).disposition).toBe('rejected_self');
    } finally {
      await cleanup();
    }
  });

  it('reassign: a tampered session naming a non-human "system"/service actor id is DENIED, never treated as a valid human actor (Review Finding, mirrors verifier-decision.spec.ts)', async () => {
    await setup();
    try {
      const pariwarId = randomUUID();
      await districtAdminShepherd(pariwarId);
      const deceasedMemberId = await seedDeceasedMember(pariwarId, DISTRICT);
      const claimCaseId = await seedClaimInVerification(pariwarId, deceasedMemberId);
      await seedLiveShepherd(pariwarId, claimCaseId);
      const target = await districtAdminShepherd(pariwarId, { displayName: 'Target Tamper', contactPhone: '+919000000009' });
      const a = await actingAdmin(pariwarId, 'Real Human');

      // Swap the session's userId for a well-formed but non-existent id (a stand-in "system" actor) while
      // keeping the same still-valid session cookie — there is no service-token/API-key auth mode in this
      // codebase, so the ONLY way a request could ever carry a non-human actor is a compromised/tampered
      // session.
      const systemActorId = randomUUID();
      const c = await t.pool.connect();
      try {
        await c.query(`UPDATE admin_sessions SET sess = jsonb_set(sess, '{userId}', to_jsonb($1::text)) WHERE user_id = $2`, [systemActorId, a.userId]);
      } finally {
        c.release();
      }

      const res = await a.client.inject({ method: 'POST', url: reassignUrl(pariwarId, claimCaseId), payload: { target_shepherd_actor_id: target } });
      // The tampered id holds no membership/grant row in this Pariwar at all — scopeResolutionHook (which
      // runs before the permission gate) treats it exactly like any non-member: 404, never resolved as if
      // it were the real human.
      expect(res.statusCode).toBe(404);
      const live = (
        await t.pool.query(
          'SELECT shepherd_actor_id FROM claim_shepherd_assignments WHERE claim_case_id = $1 AND superseded_at IS NULL',
          [claimCaseId],
        )
      ).rows as Array<{ shepherd_actor_id: string }>;
      expect(live).toHaveLength(1);
      expect(live[0]!.shepherd_actor_id).not.toBe(target);
    } finally {
      await cleanup();
    }
  });

  it('reassign: target with no display_name → 409 admin.display_name_missing (AC2)', async () => {
    await setup();
    try {
      const pariwarId = randomUUID();
      await districtAdminShepherd(pariwarId);
      const deceasedMemberId = await seedDeceasedMember(pariwarId, DISTRICT);
      const claimCaseId = await seedClaimInVerification(pariwarId, deceasedMemberId);
      await seedLiveShepherd(pariwarId, claimCaseId);
      const target = await seedUser({ displayName: null, contactPhone: '+919000000003' });
      await grant(target, pariwarId, 'district_admin', 'district', DISTRICT);
      const admin = await actingAdmin(pariwarId);

      const res = await admin.client.inject({ method: 'POST', url: reassignUrl(pariwarId, claimCaseId), payload: { target_shepherd_actor_id: target } });
      expect(res.statusCode).toBe(409);
      expect((res.json() as { error: { code: string } }).error.code).toBe('admin.display_name_missing');
    } finally {
      await cleanup();
    }
  });

  it('reassign: target with no contact channel → 409 shepherd.not_contactable (AC2)', async () => {
    await setup();
    try {
      const pariwarId = randomUUID();
      await districtAdminShepherd(pariwarId);
      const deceasedMemberId = await seedDeceasedMember(pariwarId, DISTRICT);
      const claimCaseId = await seedClaimInVerification(pariwarId, deceasedMemberId);
      await seedLiveShepherd(pariwarId, claimCaseId);
      const target = await seedUser({ displayName: 'No Contact', contactPhone: null, contactWhatsapp: null });
      await grant(target, pariwarId, 'district_admin', 'district', DISTRICT);
      const admin = await actingAdmin(pariwarId);

      const res = await admin.client.inject({ method: 'POST', url: reassignUrl(pariwarId, claimCaseId), payload: { target_shepherd_actor_id: target } });
      expect(res.statusCode).toBe(409);
      expect((res.json() as { error: { code: string } }).error.code).toBe('shepherd.not_contactable');
    } finally {
      await cleanup();
    }
  });

  it('reassign: a target who is NOT a district_admin in scope → 403 shepherd.target_not_eligible (Review Finding)', async () => {
    await setup();
    try {
      const pariwarId = randomUUID();
      await districtAdminShepherd(pariwarId);
      const deceasedMemberId = await seedDeceasedMember(pariwarId, DISTRICT);
      const claimCaseId = await seedClaimInVerification(pariwarId, deceasedMemberId);
      await seedLiveShepherd(pariwarId, claimCaseId);
      // A well-formed user with a name + contact — but holds NO district_admin grant anywhere.
      const target = await seedUser({ displayName: 'Not An Admin', contactPhone: '+919000000004' });
      const admin = await actingAdmin(pariwarId);

      const res = await admin.client.inject({ method: 'POST', url: reassignUrl(pariwarId, claimCaseId), payload: { target_shepherd_actor_id: target } });
      expect(res.statusCode).toBe(403);
      expect((res.json() as { error: { code: string } }).error.code).toBe('shepherd.target_not_eligible');
    } finally {
      await cleanup();
    }
  });

  it('reassign: a district_admin grant in a DIFFERENT district is NOT eligible (403, Review Finding)', async () => {
    await setup();
    try {
      const pariwarId = randomUUID();
      await districtAdminShepherd(pariwarId);
      const deceasedMemberId = await seedDeceasedMember(pariwarId, DISTRICT);
      const claimCaseId = await seedClaimInVerification(pariwarId, deceasedMemberId);
      await seedLiveShepherd(pariwarId, claimCaseId);
      const target = await seedUser({ displayName: 'Wrong District Admin', contactPhone: '+919000000005' });
      await grant(target, pariwarId, 'district_admin', 'district', OTHER_DISTRICT);
      const admin = await actingAdmin(pariwarId);

      const res = await admin.client.inject({ method: 'POST', url: reassignUrl(pariwarId, claimCaseId), payload: { target_shepherd_actor_id: target } });
      expect(res.statusCode).toBe(403);
      expect((res.json() as { error: { code: string } }).error.code).toBe('shepherd.target_not_eligible');
    } finally {
      await cleanup();
    }
  });

  it('reassign: 401 unauthenticated', async () => {
    await setup();
    try {
      const pariwarId = randomUUID();
      const anon = makeClient(t.app);
      const res = await anon.inject({ method: 'POST', url: reassignUrl(pariwarId, randomUUID()), payload: { target_shepherd_actor_id: randomUUID() } });
      expect(res.statusCode).toBe(401);
    } finally {
      await cleanup();
    }
  });

  it('reassign: an actor WITHOUT claim.assign_shepherd is DENIED (403)', async () => {
    await setup();
    try {
      const pariwarId = randomUUID();
      await districtAdminShepherd(pariwarId);
      const deceasedMemberId = await seedDeceasedMember(pariwarId, DISTRICT);
      const claimCaseId = await seedClaimInVerification(pariwarId, deceasedMemberId);
      await seedLiveShepherd(pariwarId, claimCaseId);
      const target = await districtAdminShepherd(pariwarId, { displayName: 'Target 2', contactPhone: '+919000000006' });
      // Holds `claim.verify`-style verifier role, NOT district_admin's claim.assign_shepherd.
      const a = await authenticateAdmin({ displayName: 'V. Erifier' });
      await grant(a.userId, pariwarId, 'verifier', 'district', DISTRICT);

      const res = await a.client.inject({ method: 'POST', url: reassignUrl(pariwarId, claimCaseId), payload: { target_shepherd_actor_id: target } });
      expect(res.statusCode).toBe(403);
    } finally {
      await cleanup();
    }
  });

  it('reassign: a district mismatch is DENIED; super_admin is allowed (authz matrix)', async () => {
    await setup();
    try {
      const pariwarId = randomUUID();
      await districtAdminShepherd(pariwarId);
      const deceasedMemberId = await seedDeceasedMember(pariwarId, DISTRICT);
      const claimCaseId = await seedClaimInVerification(pariwarId, deceasedMemberId);
      await seedLiveShepherd(pariwarId, claimCaseId);
      const target = await districtAdminShepherd(pariwarId, { displayName: 'Target 3', contactPhone: '+919000000007' });

      const mismatch = await authenticateAdmin({ displayName: 'Wrong District' });
      await grant(mismatch.userId, pariwarId, 'district_admin', 'district', OTHER_DISTRICT);
      const denied = await mismatch.client.inject({ method: 'POST', url: reassignUrl(pariwarId, claimCaseId), payload: { target_shepherd_actor_id: target } });
      expect(denied.statusCode).toBe(403);

      const su = await authenticateAdmin({ displayName: 'Super Admin' });
      await grant(su.userId, pariwarId, 'super_admin', 'global', null);
      const ok = await su.client.inject({ method: 'POST', url: reassignUrl(pariwarId, claimCaseId), payload: { target_shepherd_actor_id: target } });
      expect(ok.statusCode).toBe(201);
    } finally {
      await cleanup();
    }
  });

  it('reassign: a claim not yet in verification (no live shepherd) → 409 shepherd.invalid_claim_state (Review Finding — the state guard)', async () => {
    await setup();
    try {
      const pariwarId = randomUUID();
      await districtAdminShepherd(pariwarId);
      const deceasedMemberId = await seedDeceasedMember(pariwarId, DISTRICT);
      // documents_pending only — NOT driven to verification_in_progress, so the state guard blocks it.
      const claimCaseId = ids.claimId(randomUUID());
      const scopeTx = await openScopeTx(t.deps, pariwarId);
      const emit = (from: string | null, to: string, eventType: string, extra: Record<string, unknown> = {}) =>
        claim.projectClaimState(scopeTx.client, {
          claimCaseId, pariwarId: ids.pariwarId(pariwarId), deceasedMemberId, intakeChannels: ['member_app'], claimantActorId: null,
          eventType: eventType as never,
          payload: { from_state: from, to_state: to, trigger: 'seed', actor: 'system', ...extra },
          actorId: null,
        });
      await emit(null, 'intake_pending', 'claim.intake_initiated', { deceased_member_id: String(deceasedMemberId), intake_channel: 'member_app', claimant_actor_id: null });
      await emit('intake_pending', 'intake_converged', 'claim.intake_converged');
      await emit('intake_converged', 'documents_pending', 'claim.documents_received');
      await closeScopeTx(scopeTx, true);

      const target = await districtAdminShepherd(pariwarId, { displayName: 'Target 4', contactPhone: '+919000000008' });
      const admin = await actingAdmin(pariwarId);
      const res = await admin.client.inject({ method: 'POST', url: reassignUrl(pariwarId, String(claimCaseId)), payload: { target_shepherd_actor_id: target } });
      expect(res.statusCode).toBe(409);
      expect((res.json() as { error: { code: string } }).error.code).toBe('shepherd.invalid_claim_state');
    } finally {
      await cleanup();
    }
  });
});
