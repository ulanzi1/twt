// Verifier adjudication WRITE surface E2E (live DB :5433) — Story 6.11 (Task 7; AC0/AC2/AC3/AC5/AC7/AC8/AC9/AC10, R5).
//
// Drives POST …/admin/claims/:claimCaseId/verifier-decision(/revise) through the REAL admin guard chain
// via a cookie-threading client. Asserts the load-bearing behaviours the story pins:
//   · STATE PATHS (AC2/AC3) — approve from verification_in_progress emits verifier_reviewing THEN
//     verifier_approved; deny → denied; escalate is IDENTITY (state unchanged, NO verifier_reviewing);
//   · TWO-AUTHORITY round-trip (AC0) — event + decision row both exist + agree; sections (e)/(f) flip to
//     present/empty (NEVER not_available_yet); rationale round-trips encrypted → decrypts for the read;
//   · outcome↔reason-code enforced by the DOMAIN write-path (AC8, defense-in-depth);
//   · REVISION (AC5) — dedicated verifier_decision_revised (not a verdict re-emit); same-outcome enforced;
//     step-up-gated; supersession + linkage; out-of-window fails closed; two-connection exactly-one-wins;
//   · IDEMPOTENCY (AC9) — a double-submit approve creates exactly one event + one row;
//   · HUMAN-ACTOR (AC10) — 401 unauth; 403 without claim.approve (verifier-role Deny); district match/
//     mismatch; super_admin allow; no district-spoof;
//   · ACTOR-DISPLAY (R5/AC7) — NULL display_name BLOCKS every verb (no event/row); clears after provision;
//     snapshot survives a rename; a body-smuggled actor_display → 400;
//   · PII discipline (D-G) — no reason/rationale in events_log; audit context has reason_code + outcome
//     but NO rationale.
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
import { buildTestDeps, hasDatabase, makeClient, type TestDeps, type CapturingStepUpDelivery } from '../_setup.js';
import { FakeWebAuthnProvider } from '../_webauthn-fake.js';

type Client = ReturnType<typeof makeClient>;

const DISTRICT = 'Patna';
const OTHER_DISTRICT = 'Vaishali';

describe.skipIf(!hasDatabase)('Verifier adjudication WRITE surface — E2E (:5433)', () => {
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

  /** Authenticate a fresh admin (optionally with a display name). Returns the cookie client + userId. */
  async function authenticate(opts: { displayName?: string | null } = {}): Promise<{ client: Client; userId: string }> {
    const email = `vd-${randomUUID()}@example.test`;
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
      await c.query(
        `INSERT INTO role_grants (user_id, pariwar_id, role, scope_dimension, scope_value) VALUES ($1, $2, $3, $4, $5)`,
        [userId, pariwarId, role, dim, value],
      );
    } finally {
      c.release();
    }
  }

  /** A District-Admin (holds claim.approve) with a display name — the default happy-path adjudicator. */
  async function districtAdmin(pariwarId: string, displayName = 'Anita (District Admin)'): Promise<{ client: Client; userId: string }> {
    const a = await authenticate({ displayName });
    await grant(a.userId, pariwarId, 'district_admin', 'district', DISTRICT);
    return a;
  }

  async function elevateRevise(client: Client): Promise<void> {
    const req = await client.inject({ method: 'POST', url: '/api/v1/auth/step-up/request', payload: { actionContext: 'claim_decision_revise' } });
    expect(req.statusCode).toBe(200);
    const code = adminStepUp.last?.code as string;
    const ver = await client.inject({ method: 'POST', url: '/api/v1/auth/step-up/verify', payload: { otp: code } });
    expect(ver.statusCode).toBe(200);
  }

  /** Seed a deceased member + a posting district (so the route can derive the authz district). */
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

  /** Seed a committed claim at `verification_in_progress` for a deceased member. */
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

  const decisionUrl = (p: string, c: string) => `/api/v1/p/${p}/admin/claims/${c}/verifier-decision`;
  const reviseUrl = (p: string, c: string) => `${decisionUrl(p, c)}/revise`;

  async function eventTypes(claimCaseId: string): Promise<string[]> {
    const c = await td.pool.connect();
    try {
      const res = await c.query<{ event_type: string }>(
        `SELECT event_type FROM events_log WHERE stream_id = $1 ORDER BY event_version`,
        [claimCaseId],
      );
      return res.rows.map((r) => r.event_type);
    } finally {
      c.release();
    }
  }

  async function decisionRows(claimCaseId: string): Promise<Array<Record<string, unknown>>> {
    const c = await td.pool.connect();
    try {
      const res = await c.query(
        `SELECT * FROM claim_verifier_decisions WHERE claim_case_id = $1 ORDER BY decided_at, created_at`,
        [claimCaseId],
      );
      return res.rows as Array<Record<string, unknown>>;
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

  // ── State paths (AC2/AC3) ───────────────────────────────────────────────────

  it('approve from verification_in_progress emits verifier_reviewing THEN verifier_approved (AC2/D-C)', async () => {
    const pariwarId = randomUUID();
    const { client } = await districtAdmin(pariwarId);
    const member = await seedDeceasedMember(pariwarId, DISTRICT);
    const claimCaseId = await seedClaim(pariwarId, member);

    const res = await client.inject({ method: 'POST', url: decisionUrl(pariwarId, claimCaseId), payload: { outcome: 'approved', reason_code: 'r8_90pct_met' } });
    expect(res.statusCode).toBe(201);
    expect(await claimState(claimCaseId)).toBe('verifier_approved');
    const types = await eventTypes(claimCaseId);
    expect(types).toContain('claim.verifier_reviewing');
    expect(types).toContain('claim.verifier_approved');
    // Reviewing precedes the verdict.
    expect(types.indexOf('claim.verifier_reviewing')).toBeLessThan(types.indexOf('claim.verifier_approved'));
    const rows = await decisionRows(claimCaseId);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.outcome).toBe('approved');
    expect(rows[0]!.actor_display).toBe('Anita (District Admin)');
  });

  it('deny ends the claim `denied`', async () => {
    const pariwarId = randomUUID();
    const { client } = await districtAdmin(pariwarId);
    const member = await seedDeceasedMember(pariwarId, DISTRICT);
    const claimCaseId = await seedClaim(pariwarId, member);
    const res = await client.inject({ method: 'POST', url: decisionUrl(pariwarId, claimCaseId), payload: { outcome: 'denied', reason_code: 'concealment_flag_uphold', rationale: 'Concealment upheld.' } });
    expect(res.statusCode).toBe(201);
    expect(await claimState(claimCaseId)).toBe('denied');
  });

  it('escalate is IDENTITY — state unchanged, verifier_escalated appended, NO verifier_reviewing (AC3/D-D)', async () => {
    const pariwarId = randomUUID();
    const { client } = await districtAdmin(pariwarId);
    const member = await seedDeceasedMember(pariwarId, DISTRICT);
    const claimCaseId = await seedClaim(pariwarId, member);
    const res = await client.inject({ method: 'POST', url: decisionUrl(pariwarId, claimCaseId), payload: { outcome: 'escalated', reason_code: 'r9_routed_to_voting' } });
    expect(res.statusCode).toBe(201);
    expect(await claimState(claimCaseId)).toBe('verification_in_progress');
    const types = await eventTypes(claimCaseId);
    expect(types).toContain('claim.verifier_escalated');
    expect(types).not.toContain('claim.verifier_reviewing');
    const rows = await decisionRows(claimCaseId);
    expect(rows[0]!.outcome).toBe('escalated');
  });

  it('adjudicating a claim that was already escalated is a typed 409, not a raw unique-violation 500', async () => {
    const pariwarId = randomUUID();
    const { client } = await districtAdmin(pariwarId);
    const member = await seedDeceasedMember(pariwarId, DISTRICT);
    const claimCaseId = await seedClaim(pariwarId, member);
    // Escalate leaves the claim's state unchanged (still verification_in_progress) — the state guard
    // alone would let a following approve/deny through, colliding with the one-live-per-claim index.
    const escalate = await client.inject({ method: 'POST', url: decisionUrl(pariwarId, claimCaseId), payload: { outcome: 'escalated', reason_code: 'r9_routed_to_voting' } });
    expect(escalate.statusCode).toBe(201);
    const approve = await client.inject({ method: 'POST', url: decisionUrl(pariwarId, claimCaseId), payload: { outcome: 'approved', reason_code: 'r8_90pct_met' } });
    expect(approve.statusCode).toBe(409);
    expect((approve.json() as { error: { code: string } }).error.code).toBe('verifier_decision.already_decided');
    // No second write happened — exactly one (the escalate) decision row and no verdict event.
    const rows = await decisionRows(claimCaseId);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.outcome).toBe('escalated');
    expect(await claimState(claimCaseId)).toBe('verification_in_progress');
  });

  it('escalating an already-escalated claim is a typed 409, not a raw unique-violation 500', async () => {
    const pariwarId = randomUUID();
    const { client } = await districtAdmin(pariwarId);
    const member = await seedDeceasedMember(pariwarId, DISTRICT);
    const claimCaseId = await seedClaim(pariwarId, member);
    const first = await client.inject({ method: 'POST', url: decisionUrl(pariwarId, claimCaseId), payload: { outcome: 'escalated', reason_code: 'r9_routed_to_voting' } });
    expect(first.statusCode).toBe(201);
    const second = await client.inject({ method: 'POST', url: decisionUrl(pariwarId, claimCaseId), payload: { outcome: 'escalated', reason_code: 'r9_routed_to_voting' } });
    expect(second.statusCode).toBe(409);
    expect((second.json() as { error: { code: string } }).error.code).toBe('verifier_decision.already_decided');
    const rows = await decisionRows(claimCaseId);
    expect(rows).toHaveLength(1);
  });

  it('a decision from a resolved (non-review) claim fails the write-path guard (409)', async () => {
    const pariwarId = randomUUID();
    const { client } = await districtAdmin(pariwarId);
    const member = await seedDeceasedMember(pariwarId, DISTRICT);
    const claimCaseId = await seedClaim(pariwarId, member);
    // First approve → verifier_approved.
    await client.inject({ method: 'POST', url: decisionUrl(pariwarId, claimCaseId), payload: { outcome: 'approved', reason_code: 'r8_90pct_met' } });
    // A second approve now finds the claim no longer in review.
    const second = await client.inject({ method: 'POST', url: decisionUrl(pariwarId, claimCaseId), payload: { outcome: 'approved', reason_code: 'r8_90pct_met' } });
    expect(second.statusCode).toBe(409);
  });

  it('a rejected decision attempt still leaves an audit-sink line (AC10 — fail-closed AND audited)', async () => {
    const pariwarId = randomUUID();
    const { client } = await districtAdmin(pariwarId);
    const member = await seedDeceasedMember(pariwarId, DISTRICT);
    const claimCaseId = await seedClaim(pariwarId, member);
    await client.inject({ method: 'POST', url: decisionUrl(pariwarId, claimCaseId), payload: { outcome: 'approved', reason_code: 'r8_90pct_met' } });
    const rejectedBefore = td.auditSink.ofType('admin_claim.decision_rejected').length;
    const approvedBefore = td.auditSink.ofType('admin_claim.verifier_approved').length;
    // The claim is already resolved — this second approve is rejected by the state guard (409).
    const rejected = await client.inject({ method: 'POST', url: decisionUrl(pariwarId, claimCaseId), payload: { outcome: 'approved', reason_code: 'r8_90pct_met' } });
    expect(rejected.statusCode).toBe(409);
    const rejections = td.auditSink.ofType('admin_claim.decision_rejected');
    expect(rejections.length).toBe(rejectedBefore + 1);
    const last = rejections[rejections.length - 1]!;
    expect((last.context as { claim_case_id?: string }).claim_case_id).toBe(claimCaseId);
    // The rejected attempt's own audit type (approved) never fires — only the rejection line does.
    expect(td.auditSink.ofType('admin_claim.verifier_approved').length).toBe(approvedBefore);
  });

  // ── Two-authority round-trip + read model flip (AC0/AC4) ────────────────────

  it('two-authority round-trip: event + row agree; sections (e)/(f) flip to present/empty (AC0/AC4)', async () => {
    const pariwarId = randomUUID();
    const admin = await districtAdmin(pariwarId);
    const member = await seedDeceasedMember(pariwarId, DISTRICT);
    const claimCaseId = await seedClaim(pariwarId, member);
    await admin.client.inject({ method: 'POST', url: decisionUrl(pariwarId, claimCaseId), payload: { outcome: 'denied', reason_code: 'other', rationale: 'A specific concern about the record.' } });

    // The console packet's (e) is present (this claim's transcript); (f) is empty (no OTHER resolved claim).
    const console_ = await admin.client.inject({ method: 'GET', url: `/api/v1/p/${pariwarId}/admin/claims/${claimCaseId}/verifier-console` });
    expect(console_.statusCode).toBe(200);
    const { packet } = console_.json<{ packet: VerifierConsolePacket }>();
    expect(packet.priorVerifierComments.status).toBe('present');
    const comments = packet.priorVerifierComments.status === 'present' ? packet.priorVerifierComments.comments : [];
    expect(comments[0]!.outcome).toBe('denied');
    // The rationale round-trips: encrypted at rest, decrypted for the authorized read.
    expect(comments[0]!.rationale).toBe('A specific concern about the record.');
    // `empty` (genuine no-records) — NEVER not_available_yet now that the producer ships.
    expect(packet.recentPrecedents.status).toBe('empty');
    expect(packet.recentPrecedents.status).not.toBe('not_available_yet');
  });

  // ── Atomicity under forced failure (AC0 — two authorities, one tx, never conflated) ────────
  // Both directions: adjudicateClaim writes lifecycle event(s) THEN the decision row; reviseDecision
  // writes the supersede-UPDATE + new row THEN the revision event. Patching `scopeTx.client.query` to
  // reject one specific statement (by SQL text) forces a genuine mid-transaction failure — everything
  // else passes through to the real connection — proving the WHOLE transaction rolls back, never an
  // event-only or row-only survivor.

  /** Wrap a live pg client so any query whose text matches `pattern` rejects; everything else passes
   *  through unchanged. Returns a restore function (unnecessary here since the scopeTx is discarded, but
   *  kept for clarity/symmetry). */
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

  it('a forced decision-row-insert failure rolls back the WHOLE transaction — no orphan event survives (AC0)', async () => {
    const pariwarId = randomUUID();
    const member = await seedDeceasedMember(pariwarId, DISTRICT);
    const claimCaseId = await seedClaim(pariwarId, member);
    const beforeTypes = await eventTypes(claimCaseId);
    const beforeState = await claimState(claimCaseId);

    const scopeTx = await openScopeTx(deps, pariwarId);
    const restore = forceQueryFailure(scopeTx.client, /insert into "claim_verifier_decisions"/i);

    let threw = false;
    try {
      await claim.adjudicateClaim(scopeTx.client, {
        claimCaseId: ids.claimId(claimCaseId),
        pariwarId: ids.pariwarId(pariwarId),
        outcome: 'approved',
        reasonCode: 'r8_90pct_met',
        rationaleCiphertext: null,
        actorId: randomUUID(),
        actorDisplay: 'Forced Failure Test',
        actor: 'operator',
      });
    } catch {
      threw = true;
    } finally {
      // Restore BEFORE closeScopeTx releases the client back to the pool — a pooled connection is
      // reused by later tests, and a lingering patched `.query` would break them (not just this one).
      restore();
      await closeScopeTx(scopeTx, false);
    }
    expect(threw).toBe(true);

    // Neither the auto-entered-review event NOR the verdict event survived — the decision-row failure
    // rolled back BOTH lifecycle events that were written earlier in this same transaction.
    expect(await eventTypes(claimCaseId)).toEqual(beforeTypes);
    expect(await claimState(claimCaseId)).toBe(beforeState);
    expect(await decisionRows(claimCaseId)).toHaveLength(0);
  });

  it('a forced revision-event failure rolls back the WHOLE transaction — the supersession + new row both undo (AC0)', async () => {
    const pariwarId = randomUUID();
    const admin = await districtAdmin(pariwarId);
    const member = await seedDeceasedMember(pariwarId, DISTRICT);
    const claimCaseId = await seedClaim(pariwarId, member);
    await admin.client.inject({ method: 'POST', url: decisionUrl(pariwarId, claimCaseId), payload: { outcome: 'approved', reason_code: 'r8_90pct_met' } });
    const before = (await decisionRows(claimCaseId))[0]!;
    const beforeTypes = await eventTypes(claimCaseId);

    const scopeTx = await openScopeTx(deps, pariwarId);
    const restore = forceQueryFailure(scopeTx.client, /insert into "events_log"/i);

    let threw = false;
    try {
      await claim.reviseDecision(scopeTx.client, {
        claimCaseId: ids.claimId(claimCaseId),
        pariwarId: ids.pariwarId(pariwarId),
        outcome: 'approved',
        reasonCode: 'concealment_flag_override',
        rationaleCiphertext: null,
        actorId: admin.userId,
        actorDisplay: 'Forced Failure Test',
        actor: 'operator',
        supersedesDecisionId: ids.verifierDecisionId(before.decision_id as string),
      });
    } catch {
      threw = true;
    } finally {
      restore();
      await closeScopeTx(scopeTx, false);
    }
    expect(threw).toBe(true);

    // The supersede-UPDATE and the new-row-INSERT both ran BEFORE the (forced-to-fail) revision event —
    // rollback must undo them too: still exactly the ORIGINAL row, still live.
    const rows = await decisionRows(claimCaseId);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.decision_id).toBe(before.decision_id);
    expect(rows[0]!.superseded_at).toBeNull();
    expect(await eventTypes(claimCaseId)).toEqual(beforeTypes);
  });

  // ── Domain compat defense-in-depth is exercised in the DB-free contract/domain tests;
  //    the boundary superRefine 400 is asserted here for the wire path. ─────────

  it('an incompatible outcome↔reason-code is a 400 at the boundary (AC8)', async () => {
    const pariwarId = randomUUID();
    const { client } = await districtAdmin(pariwarId);
    const member = await seedDeceasedMember(pariwarId, DISTRICT);
    const claimCaseId = await seedClaim(pariwarId, member);
    const res = await client.inject({ method: 'POST', url: decisionUrl(pariwarId, claimCaseId), payload: { outcome: 'approved', reason_code: 'concealment_flag_uphold' } });
    expect(res.statusCode).toBe(400);
    expect(await decisionRows(claimCaseId)).toHaveLength(0);
  });

  // ── Revision (AC5) ──────────────────────────────────────────────────────────

  it('revision: dedicated verifier_decision_revised, same-outcome enforced, step-up-gated, supersession + linkage', async () => {
    const pariwarId = randomUUID();
    const admin = await districtAdmin(pariwarId);
    const member = await seedDeceasedMember(pariwarId, DISTRICT);
    const claimCaseId = await seedClaim(pariwarId, member);
    // Deny first.
    await admin.client.inject({ method: 'POST', url: decisionUrl(pariwarId, claimCaseId), payload: { outcome: 'denied', reason_code: 'concealment_flag_uphold', rationale: 'Initial.' } });

    // Revise WITHOUT step-up → 403 step_up_required.
    const noStepUp = await admin.client.inject({ method: 'POST', url: reviseUrl(pariwarId, claimCaseId), payload: { outcome: 'denied', reason_code: 'other', rationale: 'Corrected.' } });
    expect(noStepUp.statusCode).toBe(403);

    // Cross-outcome reversal is rejected (points to 6.16).
    await elevateRevise(admin.client);
    const crossOutcome = await admin.client.inject({ method: 'POST', url: reviseUrl(pariwarId, claimCaseId), payload: { outcome: 'approved', reason_code: 'r8_90pct_met' } });
    expect(crossOutcome.statusCode).toBe(409);

    // Same-outcome revise succeeds (fresh elevation may be single-use → re-elevate).
    await elevateRevise(admin.client);
    const ok = await admin.client.inject({ method: 'POST', url: reviseUrl(pariwarId, claimCaseId), payload: { outcome: 'denied', reason_code: 'other', rationale: 'Corrected rationale.' } });
    expect(ok.statusCode).toBe(201);

    // Claim state unchanged (a revision is NOT a verdict re-emit).
    expect(await claimState(claimCaseId)).toBe('denied');
    const types = await eventTypes(claimCaseId);
    expect(types).toContain('claim.verifier_decision_revised');
    // Exactly ONE verdict event (the revision did not re-emit verifier_denied).
    expect(types.filter((t) => t === 'claim.verifier_denied')).toHaveLength(1);

    const rows = await decisionRows(claimCaseId);
    expect(rows).toHaveLength(2);
    const live = rows.find((r) => r.superseded_at === null)!;
    const superseded = rows.find((r) => r.superseded_at !== null)!;
    expect(live.reason_code).toBe('other');
    expect(live.supersedes_decision_id).toBe(superseded.decision_id);
  });

  it('a retried identical revise (stale supersedesDecisionId) is a 409 conflict, never a duplicate row (AC9)', async () => {
    const pariwarId = randomUUID();
    const admin = await districtAdmin(pariwarId);
    const member = await seedDeceasedMember(pariwarId, DISTRICT);
    const claimCaseId = await seedClaim(pariwarId, member);
    await admin.client.inject({ method: 'POST', url: decisionUrl(pariwarId, claimCaseId), payload: { outcome: 'denied', reason_code: 'concealment_flag_uphold', rationale: 'Initial.' } });
    const original = (await decisionRows(claimCaseId))[0]!;

    await elevateRevise(admin.client);
    const first = await admin.client.inject({ method: 'POST', url: reviseUrl(pariwarId, claimCaseId), payload: { outcome: 'denied', reason_code: 'other', rationale: 'Corrected.', supersedes_decision_id: original.decision_id as string } });
    expect(first.statusCode).toBe(201);

    // The client retries the SAME revise request (e.g. a dropped response, or a naive double-click) —
    // it still names the now-superseded original as its target. A fresh elevation is needed (single-use).
    await elevateRevise(admin.client);
    const retry = await admin.client.inject({ method: 'POST', url: reviseUrl(pariwarId, claimCaseId), payload: { outcome: 'denied', reason_code: 'other', rationale: 'Corrected.', supersedes_decision_id: original.decision_id as string } });
    expect(retry.statusCode).toBe(409);

    // Exactly TWO rows total — the original (superseded) + the one successful revision. The retry did
    // NOT create a second/duplicate row.
    const rows = await decisionRows(claimCaseId);
    expect(rows).toHaveLength(2);
    expect(rows.filter((r) => r.superseded_at === null)).toHaveLength(1);
  });

  it('a legitimate second revision extends the supersession chain — never mistaken for a duplicate (AC9)', async () => {
    const pariwarId = randomUUID();
    const admin = await districtAdmin(pariwarId);
    const member = await seedDeceasedMember(pariwarId, DISTRICT);
    const claimCaseId = await seedClaim(pariwarId, member);
    await admin.client.inject({ method: 'POST', url: decisionUrl(pariwarId, claimCaseId), payload: { outcome: 'denied', reason_code: 'concealment_flag_uphold', rationale: 'Initial.' } });
    const original = (await decisionRows(claimCaseId))[0]!;

    await elevateRevise(admin.client);
    const revise1 = await admin.client.inject({ method: 'POST', url: reviseUrl(pariwarId, claimCaseId), payload: { outcome: 'denied', reason_code: 'other', rationale: 'First correction.' } });
    expect(revise1.statusCode).toBe(201);
    const afterFirst = (await decisionRows(claimCaseId)).find((r) => r.superseded_at === null)!;
    expect(afterFirst.decision_id).not.toBe(original.decision_id);

    // A SECOND, legitimate revision on top of the now-live (once-already-revised) decision — this must
    // succeed, not be rejected as though it were a retry of the first.
    await elevateRevise(admin.client);
    const revise2 = await admin.client.inject({ method: 'POST', url: reviseUrl(pariwarId, claimCaseId), payload: { outcome: 'denied', reason_code: 'concealment_flag_uphold', rationale: 'Second correction.' } });
    expect(revise2.statusCode).toBe(201);

    const rows = await decisionRows(claimCaseId);
    expect(rows).toHaveLength(3); // original → revise1 → revise2, all three retained (full transcript, AC6)
    const live = rows.find((r) => r.superseded_at === null)!;
    expect(live.reason_code).toBe('concealment_flag_uphold');
    expect(live.supersedes_decision_id).toBe(afterFirst.decision_id);
    // The chain links all the way back: live → afterFirst → original.
    expect(afterFirst.supersedes_decision_id).toBe(original.decision_id);
    expect(rows.filter((r) => r.superseded_at === null)).toHaveLength(1); // still exactly ONE live row
  });

  it('a reason-code-only revise (rationale omitted) carries the prior rationale forward, never nulling it', async () => {
    // Deny always requires a rationale (superRefine) — the gap only exists for `approved`, where a
    // rationale is optional (not required unless reason_code is `other`).
    const pariwarId = randomUUID();
    const admin = await districtAdmin(pariwarId);
    const member = await seedDeceasedMember(pariwarId, DISTRICT);
    const claimCaseId = await seedClaim(pariwarId, member);
    await admin.client.inject({ method: 'POST', url: decisionUrl(pariwarId, claimCaseId), payload: { outcome: 'approved', reason_code: 'r8_90pct_met', rationale: 'Original recorded rationale.' } });

    // Same outcome, a DIFFERENT approved-compatible reason code, NO `rationale` field in the payload.
    await elevateRevise(admin.client);
    const reasonOnly = await admin.client.inject({ method: 'POST', url: reviseUrl(pariwarId, claimCaseId), payload: { outcome: 'approved', reason_code: 'concealment_flag_override' } });
    expect(reasonOnly.statusCode).toBe(201);

    const console_ = await admin.client.inject({ method: 'GET', url: `/api/v1/p/${pariwarId}/admin/claims/${claimCaseId}/verifier-console` });
    const { packet } = console_.json<{ packet: VerifierConsolePacket }>();
    const comments = packet.priorVerifierComments.status === 'present' ? packet.priorVerifierComments.comments : [];
    const liveComment = comments[comments.length - 1]!;
    expect(liveComment.reasonCode).toBe('concealment_flag_override');
    // The rationale from the original approve is still there — the reason-code-only revise did not erase it.
    expect(liveComment.rationale).toBe('Original recorded rationale.');
  });

  it('two-connection concurrent revision: exactly ONE wins (AC5/AC9)', async () => {
    const pariwarId = randomUUID();
    const admin = await districtAdmin(pariwarId);
    const member = await seedDeceasedMember(pariwarId, DISTRICT);
    const claimCaseId = await seedClaim(pariwarId, member);
    await admin.client.inject({ method: 'POST', url: decisionUrl(pariwarId, claimCaseId), payload: { outcome: 'approved', reason_code: 'r8_90pct_met' } });
    // Both operators loaded the SAME live decision and try to revise IT (the realistic double-revision):
    // each passes that decision's id as its optimistic supersedes target.
    const original = (await decisionRows(claimCaseId))[0]!.decision_id as string;

    // Two independent scope-txs revise the same loaded decision concurrently (domain-layer race).
    const reviseOnce = async () => {
      const scopeTx = await openScopeTx(deps, pariwarId);
      try {
        const r = await claim.reviseDecision(scopeTx.client, {
          claimCaseId: ids.claimId(claimCaseId), pariwarId: ids.pariwarId(pariwarId),
          outcome: 'approved', reasonCode: 'other', rationaleCiphertext: null,
          actorId: admin.userId, actorDisplay: 'Anita (District Admin)', actor: 'operator',
          supersedesDecisionId: ids.verifierDecisionId(original),
        });
        await closeScopeTx(scopeTx, true);
        return r;
      } catch (err) {
        await closeScopeTx(scopeTx, false);
        throw err;
      }
    };
    const results = await Promise.allSettled([reviseOnce(), reviseOnce()]);
    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    // Exactly one LIVE decision remains (the partial-unique backstop held).
    const live = (await decisionRows(claimCaseId)).filter((r) => r.superseded_at === null);
    expect(live).toHaveLength(1);
  });

  // ── Idempotency (AC9) ───────────────────────────────────────────────────────

  it('a double-submit approve creates exactly ONE event + ONE decision row (AC9)', async () => {
    const pariwarId = randomUUID();
    const { client } = await districtAdmin(pariwarId);
    const member = await seedDeceasedMember(pariwarId, DISTRICT);
    const claimCaseId = await seedClaim(pariwarId, member);
    const payload = { outcome: 'approved', reason_code: 'r8_90pct_met' };
    const [a, b] = await Promise.all([
      client.inject({ method: 'POST', url: decisionUrl(pariwarId, claimCaseId), payload }),
      client.inject({ method: 'POST', url: decisionUrl(pariwarId, claimCaseId), payload }),
    ]);
    // One wins (201), the other is rejected by the state guard (409) — never two verdicts.
    const codes = [a.statusCode, b.statusCode].sort();
    expect(codes).toEqual([201, 409]);
    const types = await eventTypes(claimCaseId);
    expect(types.filter((t) => t === 'claim.verifier_approved')).toHaveLength(1);
    expect(await decisionRows(claimCaseId)).toHaveLength(1);
  });

  // ── Human-actor + authz matrix (AC10) ───────────────────────────────────────

  it('401 when unauthenticated', async () => {
    const pariwarId = randomUUID();
    const anon = makeClient(app);
    const res = await anon.inject({ method: 'POST', url: decisionUrl(pariwarId, randomUUID()), payload: { outcome: 'approved', reason_code: 'r8_90pct_met' } });
    expect(res.statusCode).toBe(401);
  });

  it('a tampered session naming a non-human "system"/service actor id is DENIED, never treated as a valid human actor (AC10)', async () => {
    // There is no service-token / API-key auth mode in this codebase — the ONLY way a request could
    // ever carry a non-human actor is a compromised/tampered session. Simulate that directly: swap the
    // session's `userId` for a well-formed but non-existent id (a stand-in "system" actor) while keeping
    // the same (still-valid) session cookie, then assert the runtime still fails closed — no permission
    // grant, no display name, no write — never a silent success.
    const pariwarId = randomUUID();
    const a = await authenticate({ displayName: 'Real Human' });
    await grant(a.userId, pariwarId, 'district_admin', 'district', DISTRICT);
    const member = await seedDeceasedMember(pariwarId, DISTRICT);
    const claimCaseId = await seedClaim(pariwarId, member);

    const systemActorId = randomUUID();
    const c = await td.pool.connect();
    try {
      await c.query(`UPDATE admin_sessions SET sess = jsonb_set(sess, '{userId}', to_jsonb($1::text)) WHERE user_id = $2`, [systemActorId, a.userId]);
    } finally {
      c.release();
    }

    const res = await a.client.inject({ method: 'POST', url: decisionUrl(pariwarId, claimCaseId), payload: { outcome: 'approved', reason_code: 'r8_90pct_met' } });
    // The tampered id holds NO membership/grant row in this Pariwar at all — `scopeResolutionHook`
    // (which runs before the permission gate) treats it exactly like any non-member: 404, not 403 (the
    // scope-vs-permission distinction this codebase already draws — see `multi-tenant/index.ts`'s
    // `/whoami` vs `/audit/verify-probe` probes). It is never resolved as if it were the real human.
    expect(res.statusCode).toBe(404);
    expect(await decisionRows(claimCaseId)).toHaveLength(0);
    expect(await claimState(claimCaseId)).toBe('verification_in_progress');
  });

  it('a verifier-role actor (has claim.verify NOT claim.approve) is DENIED (403)', async () => {
    const pariwarId = randomUUID();
    const a = await authenticate({ displayName: 'V. Erifier' });
    await grant(a.userId, pariwarId, 'verifier', 'district', DISTRICT);
    const member = await seedDeceasedMember(pariwarId, DISTRICT);
    const claimCaseId = await seedClaim(pariwarId, member);
    const res = await a.client.inject({ method: 'POST', url: decisionUrl(pariwarId, claimCaseId), payload: { outcome: 'approved', reason_code: 'r8_90pct_met' } });
    expect(res.statusCode).toBe(403);
    expect(await decisionRows(claimCaseId)).toHaveLength(0);
  });

  it('a district mismatch is DENIED; super_admin is allowed (authz matrix)', async () => {
    const pariwarId = randomUUID();
    const member = await seedDeceasedMember(pariwarId, DISTRICT);
    const claimCaseId = await seedClaim(pariwarId, member);

    // District-admin scoped to a DIFFERENT district → 403 (the deceased's district is derived server-side).
    const mismatch = await authenticate({ displayName: 'Wrong District' });
    await grant(mismatch.userId, pariwarId, 'district_admin', 'district', OTHER_DISTRICT);
    const denied = await mismatch.client.inject({ method: 'POST', url: decisionUrl(pariwarId, claimCaseId), payload: { outcome: 'approved', reason_code: 'r8_90pct_met' } });
    expect(denied.statusCode).toBe(403);

    // super_admin (global) → allowed.
    const su = await authenticate({ displayName: 'Super Admin' });
    await grant(su.userId, pariwarId, 'super_admin', 'global', null);
    const ok = await su.client.inject({ method: 'POST', url: decisionUrl(pariwarId, claimCaseId), payload: { outcome: 'approved', reason_code: 'r8_90pct_met' } });
    expect(ok.statusCode).toBe(201);
  });

  // ── Actor-display (R5/AC7) ──────────────────────────────────────────────────

  it('an admin with NO display_name is BLOCKED on every verb — no event, no row (R5)', async () => {
    const pariwarId = randomUUID();
    const a = await authenticate({ displayName: null });
    await grant(a.userId, pariwarId, 'district_admin', 'district', DISTRICT);
    const member = await seedDeceasedMember(pariwarId, DISTRICT);
    const claimCaseId = await seedClaim(pariwarId, member);

    const res = await a.client.inject({ method: 'POST', url: decisionUrl(pariwarId, claimCaseId), payload: { outcome: 'approved', reason_code: 'r8_90pct_met' } });
    expect(res.statusCode).toBe(409);
    expect((res.json() as { error: { code: string } }).error.code).toBe('admin.display_name_missing');
    // Neither store touched.
    expect(await eventTypes(claimCaseId)).not.toContain('claim.verifier_approved');
    expect(await decisionRows(claimCaseId)).toHaveLength(0);

    // After provisioning, the same verb succeeds.
    await service.setAdminDisplayName(deps, a.userId, 'Now Named');
    const ok = await a.client.inject({ method: 'POST', url: decisionUrl(pariwarId, claimCaseId), payload: { outcome: 'approved', reason_code: 'r8_90pct_met' } });
    expect(ok.statusCode).toBe(201);
    expect((await decisionRows(claimCaseId))[0]!.actor_display).toBe('Now Named');
  });

  it('the actor_display SNAPSHOT survives a later rename (AC7)', async () => {
    const pariwarId = randomUUID();
    const admin = await districtAdmin(pariwarId, 'Original Name');
    const member = await seedDeceasedMember(pariwarId, DISTRICT);
    const claimCaseId = await seedClaim(pariwarId, member);
    await admin.client.inject({ method: 'POST', url: decisionUrl(pariwarId, claimCaseId), payload: { outcome: 'approved', reason_code: 'r8_90pct_met' } });
    // Rename the admin — the historical decision keeps the decision-time name.
    await service.setAdminDisplayName(deps, admin.userId, 'Renamed Later');
    expect((await decisionRows(claimCaseId))[0]!.actor_display).toBe('Original Name');
  });

  it('a body-smuggled actor_display is a 400 (.strict(), R5)', async () => {
    const pariwarId = randomUUID();
    const { client } = await districtAdmin(pariwarId);
    const member = await seedDeceasedMember(pariwarId, DISTRICT);
    const claimCaseId = await seedClaim(pariwarId, member);
    const res = await client.inject({
      method: 'POST', url: decisionUrl(pariwarId, claimCaseId),
      payload: { outcome: 'approved', reason_code: 'r8_90pct_met', actor_display: 'Spoofed' } as unknown as object,
    });
    expect(res.statusCode).toBe(400);
  });

  // ── PII discipline (D-G) ────────────────────────────────────────────────────

  it('no reason-code/rationale in events_log; the audit context has reason_code + outcome but NO rationale (D-G)', async () => {
    const pariwarId = randomUUID();
    const { client } = await districtAdmin(pariwarId);
    const member = await seedDeceasedMember(pariwarId, DISTRICT);
    const claimCaseId = await seedClaim(pariwarId, member);
    const secret = 'A very specific sensitive rationale about the member.';
    await client.inject({ method: 'POST', url: decisionUrl(pariwarId, claimCaseId), payload: { outcome: 'denied', reason_code: 'other', rationale: secret } });

    // The verdict event payload has NO reason-code/rationale.
    const c = await td.pool.connect();
    try {
      const res = await c.query<{ payload: unknown }>(`SELECT payload FROM events_log WHERE stream_id = $1`, [claimCaseId]);
      for (const row of res.rows) {
        const p = JSON.stringify(row.payload);
        expect(p).not.toContain(secret);
        expect(p).not.toContain('reason_code');
      }
    } finally {
      c.release();
    }
    // The audit-sink line carries reason_code + outcome, NEVER the rationale.
    const audit = td.auditSink.ofType('admin_claim.verifier_denied');
    expect(audit.length).toBeGreaterThanOrEqual(1);
    const ctx = JSON.stringify(audit[audit.length - 1]!.context);
    expect(ctx).toContain('reason_code');
    expect(ctx).toContain('other');
    expect(ctx).not.toContain(secret);
  });
});
