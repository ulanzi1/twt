// Verifier-console read surface E2E (live DB :5433) — Story 6.10 (Task 6; AC1/AC3/AC5/AC7, D3/D9).
//
// Drives GET …/admin/claims/:claimCaseId/verifier-console through the REAL admin guard chain via a
// cookie-threading client. Asserts the HTTP-layer behaviours the story pins:
//   · the AUTHORIZATION MATRIX (Task 3) — district_admin/verifier matching district → 200, different
//     district → 403; super_admin → 200; a role without claim.verify → 403; a deceased with NO posting
//     district → district-actor 403 (the D3a fail-closed exception path); the district is derived
//     SERVER-SIDE from the deceased's posting (the client never submits it);
//   · runtime 401 (unauthenticated) — the console read is human-actor + session gated (AC5);
//   · cross-tenant no-leak — a Pariwar-A claim is not fetchable while scoped to Pariwar B;
//   · the FOUR-STATE section vocabulary on a minimal claim (AC7) — empty (documents/peer/inspection),
//     empty ((e)/(f) — the 6.11 producer shipped, so no-records is `empty` not `not_available_yet`),
//     not_evaluated (concealment) — the states are DISTINCT, never collapsed;
//   · the AUDITED read (admin_verifier_console.read);
//   · the bounded no-N+1 ceiling — assembleVerifierConsole stays within VERIFIER_CONSOLE_MAX_READS and
//     the read count does NOT grow with document-row count (D9).
//
// ⚠ Own-committing seed writes; fresh random pariwarId per test; events_log append-only
// ([[project_live_db_test_gotchas]]).

import { randomUUID } from 'node:crypto';

import { claim, ids, nominee } from '@twt/domain';
import type { VerifierConsolePacket } from '@twt/contracts';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import type { AppDeps } from '../../../src/context.js';
import {
  assembleVerifierConsole,
  VERIFIER_CONSOLE_MAX_READS,
} from '../../../src/modules/claims/claims.verifier-console.handlers.js';
import * as service from '../../../src/modules/auth/admin/admin-auth.service.js';
import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { buildServer } from '../../../src/server.js';
import { buildTestDeps, hasDatabase, makeClient, type TestDeps } from '../_setup.js';
import { seedNomineeNameCheck } from '../_nominee-name-check-fixture.js';
import { FakeWebAuthnProvider } from '../_webauthn-fake.js';

type Client = ReturnType<typeof makeClient>;

const DISTRICT = 'Patna';
const OTHER_DISTRICT = 'Vaishali';

describe.skipIf(!hasDatabase)('Verifier-console read surface — E2E (:5433)', () => {
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

  async function authenticate(): Promise<{ client: Client; userId: string }> {
    const email = `vc-${randomUUID()}@example.test`;
    const password = 'CorrectHorseBatteryStaple9';
    const userId = await service.createAdminAccount(deps, { email, password });
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

  /** Seed a committed claim at `verification_in_progress` for a given deceased member. */
  async function seedClaim(
    pariwarId: string,
    deceasedMemberId: ids.MemberId,
    // ⭐ Forwarded to `seedNomineeNameCheck` (code review 2026-09-22) — every call site keeps its
    // default (a passing check over two accounts) unless it opts into a different shape, e.g.
    // `{ accountsOnly: true }` for "accounts complete, nobody has checked yet" (AC4/AC6).
    nameCheckOpts: Parameters<typeof seedNomineeNameCheck>[3] = {},
  ): Promise<string> {
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
    // Story 6.18 (AC4) — approvable only with two bank accounts + a current, PASSING District
    // Admin name check. Seeded through the REAL writer, so these E2E specs keep exercising the
    // production gate rather than bypassing it.
    await seedNomineeNameCheck(deps, pariwarId, String(claimCaseId), nameCheckOpts);
    return String(claimCaseId);
  }

  /** Seed a deceased member row + a posting district (so the route can derive the authz district). */
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

  /** Create a peer-mesh selection with `capacity` candidate member ids (unresponded). */
  async function seedPeerMeshSelection(pariwarId: string, claimCaseId: string, deceasedMemberId: ids.MemberId, capacity: number): Promise<{ selectionId: string; candidateIds: string[] }> {
    const selectionId = randomUUID();
    const candidateIds = Array.from({ length: capacity }, () => randomUUID());
    const c = await td.pool.connect();
    try {
      await c.query(
        `INSERT INTO claim_peer_mesh_selections
           (selection_id, claim_case_id, pariwar_id, deceased_member_id, deceased_district, deceased_created_at,
            metric_id, metric_version, selected_member_ids, candidate_snapshot, response_window_expires_at, outcome)
         VALUES ($1, $2, $3, $4, $5, now(), 'district_cohort_v1', 1, $6, '[]'::jsonb, now() + interval '7 days', 'pending')`,
        [selectionId, claimCaseId, pariwarId, deceasedMemberId, DISTRICT, candidateIds],
      );
      for (const memberId of candidateIds) {
        await c.query(
          `INSERT INTO claim_peer_mesh_pings (ping_id, selection_id, pariwar_id, member_id) VALUES ($1, $2, $3, $4)`,
          [randomUUID(), selectionId, pariwarId, memberId],
        );
      }
    } finally {
      c.release();
    }
    return { selectionId, candidateIds };
  }

  /** Record real `claim.peer_mesh_responded` events (via the real writer) for `memberIds` already
   *  pinged in a selection on this claim. */
  async function recordPeerMeshResponses(pariwarId: string, claimCaseId: string, memberIds: readonly string[]): Promise<void> {
    const scopeTx = await openScopeTx(deps, pariwarId);
    try {
      for (const memberId of memberIds) {
        await claim.recordPeerMeshResponse(scopeTx.client, {
          claimCaseId: ids.claimId(claimCaseId),
          pariwarId: ids.pariwarId(pariwarId),
          responderMemberId: ids.memberId(memberId),
          response: 'confirmed',
        });
      }
      await closeScopeTx(scopeTx, true);
    } catch (err) {
      await closeScopeTx(scopeTx, false);
      throw err;
    }
  }

  /** Create ONE ground-inspection assignment (no photos yet). */
  async function seedGroundInspection(pariwarId: string, claimCaseId: string): Promise<string> {
    const groundInspectionId = randomUUID();
    const c = await td.pool.connect();
    try {
      await c.query(
        `INSERT INTO claim_ground_inspections
           (ground_inspection_id, claim_case_id, pariwar_id, district, inspection_stage, inspection_site_type,
            inspector_actor_id, scheduled_at, status)
         VALUES ($1, $2, $3, $4, 'initial', 'family_residence', 'inspector-1', now(), 'completed')`,
        [groundInspectionId, claimCaseId, pariwarId, DISTRICT],
      );
    } finally {
      c.release();
    }
    return groundInspectionId;
  }

  /** Add `photoCount` more photos to an existing ground-inspection assignment. */
  async function addGroundInspectionPhotos(pariwarId: string, groundInspectionId: string, photoCount: number): Promise<void> {
    const c = await td.pool.connect();
    try {
      for (let i = 0; i < photoCount; i += 1) {
        await c.query(
          `INSERT INTO claim_ground_inspection_photos
             (photo_id, ground_inspection_id, pariwar_id, storage_object_key, content_type, byte_size)
           VALUES ($1, $2, $3, $4, 'image/jpeg', 1024)`,
          [randomUUID(), groundInspectionId, pariwarId, `gi/${randomUUID()}`],
        );
      }
    } finally {
      c.release();
    }
  }

  const url = (p: string, c: string): string => `/api/v1/p/${p}/admin/claims/${c}/verifier-console`;

  /** Count events_log rows on the claim's stream (the read-only-guarantee proof). */
  async function countClaimEvents(claimCaseId: string): Promise<number> {
    const c = await td.pool.connect();
    try {
      const res = await c.query(`SELECT count(*)::int AS n FROM events_log WHERE stream_id = $1`, [claimCaseId]);
      return (res.rows[0] as { n: number }).n;
    } finally {
      c.release();
    }
  }

  it('401 when unauthenticated (human-actor + session gated — AC5)', async () => {
    const pariwarId = randomUUID();
    const anon = makeClient(app);
    const res = await anon.inject({ method: 'GET', url: url(pariwarId, randomUUID()) });
    expect(res.statusCode).toBe(401);
  });

  it('authorization matrix (Task 3): district-scoped, server-derived, fail-closed', async () => {
    const pariwarId = randomUUID();
    const deceased = await seedDeceasedMember(pariwarId, DISTRICT);
    const claimCaseId = await seedClaim(pariwarId, deceased);

    // district_admin @ Patna (matching the deceased's posting district) → 200
    {
      const { client, userId } = await authenticate();
      await grant(userId, pariwarId, 'district_admin', 'district', DISTRICT);
      const res = await client.inject({ method: 'GET', url: url(pariwarId, claimCaseId) });
      expect(res.statusCode).toBe(200);
    }
    // district_admin @ Vaishali (different district) → 403 (the exact-node gate denies)
    {
      const { client, userId } = await authenticate();
      await grant(userId, pariwarId, 'district_admin', 'district', OTHER_DISTRICT);
      const res = await client.inject({ method: 'GET', url: url(pariwarId, claimCaseId) });
      expect(res.statusCode).toBe(403);
    }
    // verifier @ Patna → 200
    {
      const { client, userId } = await authenticate();
      await grant(userId, pariwarId, 'verifier', 'district', DISTRICT);
      const res = await client.inject({ method: 'GET', url: url(pariwarId, claimCaseId) });
      expect(res.statusCode).toBe(200);
    }
    // verifier @ Vaishali → 403
    {
      const { client, userId } = await authenticate();
      await grant(userId, pariwarId, 'verifier', 'district', OTHER_DISTRICT);
      const res = await client.inject({ method: 'GET', url: url(pariwarId, claimCaseId) });
      expect(res.statusCode).toBe(403);
    }
    // super_admin (global) → 200
    {
      const { client, userId } = await authenticate();
      await grant(userId, pariwarId, 'super_admin', 'global', null);
      const res = await client.inject({ method: 'GET', url: url(pariwarId, claimCaseId) });
      expect(res.statusCode).toBe(200);
    }
    // helpline_operator (no claim.verify) → 403
    {
      const { client, userId } = await authenticate();
      await grant(userId, pariwarId, 'helpline_operator', 'pariwar', pariwarId);
      const res = await client.inject({ method: 'GET', url: url(pariwarId, claimCaseId) });
      expect(res.statusCode).toBe(403);
    }
  });

  it('state_trustee holds NO path to claim.verify — an EXACT-district grant still 403s (no wildcard/fallback/broad-tenant bypass)', async () => {
    const pariwarId = randomUUID();
    const deceased = await seedDeceasedMember(pariwarId, DISTRICT);
    const claimCaseId = await seedClaim(pariwarId, deceased);
    // Grant state_trustee at the EXACT matching district — if any wildcard, fallback branch, or
    // broad-tenant permission accidentally covered claim.verify, this specific grant would pass.
    // It must still 403: state_trustee's role bundle simply does not carry claim.verify (D3a).
    const { client, userId } = await authenticate();
    await grant(userId, pariwarId, 'state_trustee', 'district', DISTRICT);
    const res = await client.inject({ method: 'GET', url: url(pariwarId, claimCaseId) });
    expect(res.statusCode).toBe(403);
  });

  it('the authorization district cannot be influenced by a client-submitted value (query-param spoofing)', async () => {
    const pariwarId = randomUUID();
    const deceased = await seedDeceasedMember(pariwarId, DISTRICT);
    const claimCaseId = await seedClaim(pariwarId, deceased);

    // A district_admin whose ACTUAL grant matches the real posting district gets in regardless of
    // an attacker-supplied query param claiming otherwise.
    {
      const { client, userId } = await authenticate();
      await grant(userId, pariwarId, 'district_admin', 'district', DISTRICT);
      const res = await client.inject({ method: 'GET', url: `${url(pariwarId, claimCaseId)}?district=${OTHER_DISTRICT}` });
      expect(res.statusCode).toBe(200);
    }
    // A district_admin whose ACTUAL grant does NOT match the real posting district still 403s even
    // when the query string lies and claims the matching district — the server never trusts it.
    {
      const { client, userId } = await authenticate();
      await grant(userId, pariwarId, 'district_admin', 'district', OTHER_DISTRICT);
      const res = await client.inject({ method: 'GET', url: `${url(pariwarId, claimCaseId)}?district=${DISTRICT}` });
      expect(res.statusCode).toBe(403);
    }
  });

  it('deceased with NO posting district → district-actor 403 (D3a fail-closed exception path)', async () => {
    const pariwarId = randomUUID();
    const deceased = await seedDeceasedMember(pariwarId, null); // no posting
    const claimCaseId = await seedClaim(pariwarId, deceased);
    const { client, userId } = await authenticate();
    await grant(userId, pariwarId, 'district_admin', 'district', DISTRICT);
    const res = await client.inject({ method: 'GET', url: url(pariwarId, claimCaseId) });
    expect(res.statusCode).toBe(403);
  });

  it('cross-tenant no-leak — a Pariwar-A claim is not fetchable while scoped to Pariwar B', async () => {
    const pariwarA = randomUUID();
    const pariwarB = randomUUID();
    const deceased = await seedDeceasedMember(pariwarA, DISTRICT);
    const claimInA = await seedClaim(pariwarA, deceased);
    const { client, userId } = await authenticate();
    // The actor holds a matching grant in B, but the claim lives in A → resolves to no district in B → 403.
    await grant(userId, pariwarB, 'district_admin', 'district', DISTRICT);
    const res = await client.inject({ method: 'GET', url: url(pariwarB, claimInA) });
    expect(res.statusCode).toBe(403);
    // And the body never carries Pariwar-A evidence.
    expect(res.body).not.toContain(String(deceased));
  });

  it('four-state vocabulary on a minimal claim (AC7) + audited read', async () => {
    const pariwarId = randomUUID();
    const deceased = await seedDeceasedMember(pariwarId, DISTRICT);
    // Story 6.21a (D12(c)) — ⛔ no seeded certificate: this test needs the document section as it builds it.
    const claimCaseId = await seedClaim(pariwarId, deceased, { certificate: 'skip' });
    const { client, userId } = await authenticate();
    await grant(userId, pariwarId, 'district_admin', 'district', DISTRICT);

    const res = await client.inject({ method: 'GET', url: url(pariwarId, claimCaseId) });
    expect(res.statusCode).toBe(200);
    const { packet } = res.json<{ packet: VerifierConsolePacket }>();

    // A minimal claim: producers exist but genuinely have no records → `empty` (NOT unavailable, NOT NAY).
    expect(packet.documentReview.status).toBe('empty');
    expect(packet.peerMesh.status).toBe('empty');
    expect(packet.groundInspection.status).toBe('empty');
    // Sections (e)/(f) — Story 6.11 SHIPPED the producer + flipped VERIFIER_DECISION_READ_MODEL_AVAILABLE,
    // so a minimal claim with no decisions now returns `empty` (genuine no-records), NOT `not_available_yet`
    // (the retired producer-absent state). `empty` ≠ `not_available_yet` — the four-state vocabulary holds.
    expect(packet.priorVerifierComments.status).toBe('empty');
    expect(packet.recentPrecedents.status).toBe('empty');
    // Concealment — the honest v1 posture, never a green/clear.
    expect(packet.concealment.status).toBe('not_evaluated');
    expect(packet.concealment.detailVisibility).toBe('indicator_only');
    // Validity is either present or a transient unavailable — never a crash, never `empty`.
    expect(['present', 'unavailable']).toContain(packet.validity.status);

    // AUDITED read.
    const audits = td.auditSink.ofType('admin_verifier_console.read');
    expect(audits.some((a) => (a.context as { claim_case_id?: string })?.claim_case_id === claimCaseId)).toBe(true);
  });

  it('recentPrecedents is bounded to the latest 3, newest-first, excluding the current claim (SQL-bounded, not an in-memory full scan)', async () => {
    const pariwarId = randomUUID();
    const deceased = await seedDeceasedMember(pariwarId, DISTRICT);

    // Resolve 5 OTHER claims in this Pariwar so there are more candidates than the recency cap.
    const resolvedClaimIds: string[] = [];
    for (let i = 0; i < 5; i++) {
      const c = await seedClaim(pariwarId, deceased);
      const scopeTx = await openScopeTx(deps, pariwarId);
      try {
        await claim.adjudicateClaim(scopeTx.client, {
          claimCaseId: ids.claimId(c),
          pariwarId: ids.pariwarId(pariwarId),
          outcome: 'approved',
          reasonCode: 'r8_90pct_met',
          rationaleCiphertext: null,
          actorId: randomUUID(),
          actorDisplay: 'Seed Actor',
          actor: 'operator',
        });
        await closeScopeTx(scopeTx, true);
      } catch (err) {
        await closeScopeTx(scopeTx, false);
        throw err;
      }
      resolvedClaimIds.push(c);
    }
    // Deterministic recency ordering — oldest (index 0) to newest (index 4) — independent of wall-clock
    // timing between the sequential writes above.
    const conn = await td.pool.connect();
    try {
      for (const [i, c] of resolvedClaimIds.entries()) {
        await conn.query(`UPDATE claim_verifier_decisions SET decided_at = now() - ($1 || ' minutes')::interval WHERE claim_case_id = $2`, [String(5 - i), c]);
      }
    } finally {
      conn.release();
    }

    const currentClaim = await seedClaim(pariwarId, deceased);
    const { client, userId } = await authenticate();
    await grant(userId, pariwarId, 'district_admin', 'district', DISTRICT);
    const res = await client.inject({ method: 'GET', url: url(pariwarId, currentClaim) });
    expect(res.statusCode).toBe(200);
    const { packet } = res.json<{ packet: VerifierConsolePacket }>();
    expect(packet.recentPrecedents.status).toBe('present');
    const precedents = packet.recentPrecedents.status === 'present' ? packet.recentPrecedents.precedents : [];
    expect(precedents).toHaveLength(3);
    // Newest-first: the 3 most-recently-resolved of the 5 (indices 4, 3, 2 — the smallest "minutes ago").
    expect(precedents.map((p) => p.claimCaseId)).toEqual([
      resolvedClaimIds[4],
      resolvedClaimIds[3],
      resolvedClaimIds[2],
    ]);
  });

  it('NULL rationale maps to "" in the full-history transcript (e) and to null in precedents (f) — never the reverse', async () => {
    const pariwarId = randomUUID();
    const deceased = await seedDeceasedMember(pariwarId, DISTRICT);
    const { client, userId } = await authenticate();
    await grant(userId, pariwarId, 'district_admin', 'district', DISTRICT);

    // A resolved claim with NO rationale at all (approved, non-`other` reason — rationale genuinely optional).
    const resolvedClaimId = await seedClaim(pariwarId, deceased);
    const scopeTx = await openScopeTx(deps, pariwarId);
    try {
      await claim.adjudicateClaim(scopeTx.client, {
        claimCaseId: ids.claimId(resolvedClaimId),
        pariwarId: ids.pariwarId(pariwarId),
        outcome: 'approved',
        reasonCode: 'r8_90pct_met',
        rationaleCiphertext: null,
        actorId: randomUUID(),
        actorDisplay: 'No Rationale Actor',
        actor: 'operator',
      });
      await closeScopeTx(scopeTx, true);
    } catch (err) {
      await closeScopeTx(scopeTx, false);
      throw err;
    }

    // (e) — this claim's OWN transcript: the contract's `rationale` is non-nullable — NULL maps to ''.
    const ownConsole = await client.inject({ method: 'GET', url: url(pariwarId, resolvedClaimId) });
    const ownPacket = ownConsole.json<{ packet: VerifierConsolePacket }>().packet;
    expect(ownPacket.priorVerifierComments.status).toBe('present');
    const ownComments = ownPacket.priorVerifierComments.status === 'present' ? ownPacket.priorVerifierComments.comments : [];
    expect(ownComments[0]!.rationale).toBe('');

    // (f) — viewed as a PRECEDENT from a DIFFERENT claim: the contract's `rationale` is nullable — NULL
    // stays null (never coerced to '').
    const otherClaimId = await seedClaim(pariwarId, deceased);
    const otherConsole = await client.inject({ method: 'GET', url: url(pariwarId, otherClaimId) });
    const otherPacket = otherConsole.json<{ packet: VerifierConsolePacket }>().packet;
    expect(otherPacket.recentPrecedents.status).toBe('present');
    const precedents = otherPacket.recentPrecedents.status === 'present' ? otherPacket.recentPrecedents.precedents : [];
    const match = precedents.find((p) => p.claimCaseId === resolvedClaimId)!;
    expect(match.rationale).toBeNull();
  });

  it('recentPrecedents never leaks a DIFFERENT Pariwar\'s resolved decision (RLS + explicit pariwarId predicate)', async () => {
    const pariwarA = randomUUID();
    const pariwarB = randomUUID();
    const deceasedA = await seedDeceasedMember(pariwarA, DISTRICT);
    const deceasedB = await seedDeceasedMember(pariwarB, DISTRICT);

    // Resolve a claim in Pariwar B — same district, same reason code/outcome shape as A would use.
    const claimInB = await seedClaim(pariwarB, deceasedB);
    const scopeTxB = await openScopeTx(deps, pariwarB);
    try {
      await claim.adjudicateClaim(scopeTxB.client, {
        claimCaseId: ids.claimId(claimInB),
        pariwarId: ids.pariwarId(pariwarB),
        outcome: 'approved',
        reasonCode: 'r8_90pct_met',
        rationaleCiphertext: null,
        actorId: randomUUID(),
        actorDisplay: 'Pariwar B Actor',
        actor: 'operator',
      });
      await closeScopeTx(scopeTxB, true);
    } catch (err) {
      await closeScopeTx(scopeTxB, false);
      throw err;
    }

    // View a DIFFERENT, unresolved claim in Pariwar A — it has no resolved decisions of its OWN, so if
    // Pariwar B's decision ever leaked across tenants, it would show up here as a false precedent.
    const claimInA = await seedClaim(pariwarA, deceasedA);
    const { client, userId } = await authenticate();
    await grant(userId, pariwarA, 'district_admin', 'district', DISTRICT);
    const res = await client.inject({ method: 'GET', url: url(pariwarA, claimInA) });
    expect(res.statusCode).toBe(200);
    const packet = res.json<{ packet: VerifierConsolePacket }>().packet;
    expect(packet.recentPrecedents.status).toBe('empty');
  });

  it('read-only guarantee: opening AND refreshing the console appends ZERO claim.* events', async () => {
    const pariwarId = randomUUID();
    const deceased = await seedDeceasedMember(pariwarId, DISTRICT);
    const claimCaseId = await seedClaim(pariwarId, deceased);
    const { client, userId } = await authenticate();
    await grant(userId, pariwarId, 'district_admin', 'district', DISTRICT);

    const before = await countClaimEvents(claimCaseId);
    // "Open" then "refresh" — two independent requests, mirroring a verifier opening the console
    // and hitting reload.
    const res1 = await client.inject({ method: 'GET', url: url(pariwarId, claimCaseId) });
    const res2 = await client.inject({ method: 'GET', url: url(pariwarId, claimCaseId) });
    expect(res1.statusCode).toBe(200);
    expect(res2.statusCode).toBe(200);
    const after = await countClaimEvents(claimCaseId);

    expect(after).toBe(before); // no projectClaimState / event append / hidden adjudication write
  });

  it('signed media: document preview URLs are minted with the intended 300s TTL', async () => {
    const pariwarId = randomUUID();
    const deceased = await seedDeceasedMember(pariwarId, DISTRICT);
    // Story 6.21a (D12(c)) — ⛔ no seeded certificate: this test needs the document section as it builds it.
    const claimCaseId = await seedClaim(pariwarId, deceased, { certificate: 'skip' });
    const c = await td.pool.connect();
    try {
      await c.query(
        `INSERT INTO claim_documents (claim_document_id, pariwar_id, claim_case_id, document_type, storage_object_key,
           content_type, byte_size, parity_outcome, parity_flags, ocr_confidence, verifier_review_required)
         VALUES ($1, $2, $3, 'death_certificate', $4, 'application/pdf', 1024, 'match', '{}'::jsonb, 0.9, false)`,
        [randomUUID(), pariwarId, claimCaseId, `k/${randomUUID()}`],
      );
    } finally {
      c.release();
    }

    const signedReadUrl = vi.fn(deps.claimDocumentStorage.signedReadUrl.bind(deps.claimDocumentStorage));
    const spiedDeps: AppDeps = { ...deps, claimDocumentStorage: { ...deps.claimDocumentStorage, signedReadUrl } };

    const scopeTx = await openScopeTx(deps, pariwarId);
    try {
      const { packet } = await assembleVerifierConsole(spiedDeps, {
        db: scopeTx.tx,
        pariwarId,
        claimCaseId,
        district: DISTRICT,
        actorId: randomUUID(),
        grants: [{ pariwarId, role: 'super_admin', scopeDimension: 'global', scopeValue: null }],
        traceId: null,
      });
      await closeScopeTx(scopeTx, true);
      expect(packet.documentReview.status).toBe('present');
    } catch (err) {
      await closeScopeTx(scopeTx, false);
      throw err;
    }

    expect(signedReadUrl).toHaveBeenCalled();
    for (const call of signedReadUrl.mock.calls) {
      expect(call[1]).toBe(300); // the SIGNED_URL_TTL_SECONDS precedent, not a drifted local value
    }
  });

  it('AC7 unavailable: a transient optional-source failure degrades ONE section, request still succeeds', async () => {
    const pariwarId = randomUUID();
    const deceased = await seedDeceasedMember(pariwarId, DISTRICT);
    // Story 6.21a (D12(c)) — ⛔ no seeded certificate: this test needs the document section as it builds it.
    const claimCaseId = await seedClaim(pariwarId, deceased, { certificate: 'skip' });
    // Seed one document so section (b) has a row that requires a signed URL.
    const c = await td.pool.connect();
    try {
      await c.query(
        `INSERT INTO claim_documents (claim_document_id, pariwar_id, claim_case_id, document_type, storage_object_key,
           content_type, byte_size, parity_outcome, parity_flags, ocr_confidence, verifier_review_required)
         VALUES ($1, $2, $3, 'death_certificate', $4, 'application/pdf', 1024, 'match', '{}'::jsonb, 0.9, false)`,
        [randomUUID(), pariwarId, claimCaseId, `k/${randomUUID()}`],
      );
    } finally {
      c.release();
    }

    // Inject a claim-document storage whose signed-URL minting THROWS → section (b) → `unavailable`
    // (a dependency failure is NEVER converted to `empty`), while the whole request still succeeds.
    const brokenDeps: AppDeps = {
      ...deps,
      claimDocumentStorage: {
        put: () => Promise.reject(new Error('unused')),
        getBytes: () => Promise.reject(new Error('unused')),
        signedReadUrl: () => Promise.reject(new Error('signed-url boom')),
      },
    };
    const scopeTx = await openScopeTx(deps, pariwarId);
    try {
      const { packet } = await assembleVerifierConsole(brokenDeps, {
        db: scopeTx.tx,
        pariwarId,
        claimCaseId,
        district: DISTRICT,
        actorId: randomUUID(),
        grants: [{ pariwarId, role: 'super_admin', scopeDimension: 'global', scopeValue: null }],
        traceId: null,
      });
      await closeScopeTx(scopeTx, true);
      expect(packet.documentReview.status).toBe('unavailable'); // NOT empty — a failure ≠ "no records"
      // Sections are isolated, never collapsed together (the four-state vocabulary discipline): a
      // dependency failure in (b) does NOT drag (e)/(f) — which don't touch claimDocumentStorage at
      // all — down to `unavailable` too. They correctly stay distinct from (b)'s failed state.
      expect(packet.priorVerifierComments.status).not.toBe(packet.documentReview.status);
      expect(packet.recentPrecedents.status).not.toBe(packet.documentReview.status);
      expect(packet.priorVerifierComments.status).toBe('empty');
      expect(packet.recentPrecedents.status).toBe('empty');
    } catch (err) {
      await closeScopeTx(scopeTx, false);
      throw err;
    }
  });

  it('⭐⭐ the no-N+1 property measured by COUNTING REAL STATEMENTS — ⛔ not by the handler\'s own counter', async () => {
    // ⚠⚠ WHY THIS EXISTS (code review 2026-09-22). The two tests below assert
    // `readCount <= VERIFIER_CONSOLE_MAX_READS`, importing the constant so ⛔ nothing is
    // hard-coded — but `readCount` is **the handler's OWN SELF-REPORTED counter**. ⇒ a read the
    // handler forgets to count is exactly the read the assertion ⛔ cannot see, and that is ⛔ not
    // hypothetical: `getMemberNomineeDeclarationRefs` was uncounted, which is the very defect the
    // budget exists to catch. ⭐ A self-report can ⛔ never detect its own omission.
    //
    // ⚠⚠ AND WHAT THIS TEST DOES ⛔ NOT ASSERT, because I got it wrong first and the correction is
    // the useful part: `actual <= VERIFIER_CONSOLE_MAX_READS` is the WRONG comparison. That
    // constant bounds **top-level source reads** — the fan-out WIDTH the no-N+1 property is about —
    // ⛔ not raw SQL statements. A single top-level read legitimately issues several statements
    // through nested helpers (the validity payload, the contribution CTEs, the declaration refs).
    // Measuring 27 statements against a budget of 14 compares two different things and would have
    // reported a defect that does ⛔ not exist.
    //
    // ⭐⭐ SO THIS MEASURES THE PROPERTY THAT IS ACTUALLY TRUE AND ACTUALLY LOAD-BEARING: the real
    // statement count must ⛔ NOT GROW when ROWS are added. That is the no-N+1 rule itself, and
    // measured this way it holds whether or not anybody remembered to increment the counter.
    const pariwarId = randomUUID();
    const deceased = await seedDeceasedMember(pariwarId, DISTRICT);
    const claimCaseId = await seedClaim(pariwarId, deceased);

    /** Run the assembly, counting the statements Postgres actually receives. */
    const measure = async (): Promise<{ actual: number; reported: number }> => {
      const scopeTx = await openScopeTx(deps, pariwarId);
      let actual = 0;
      try {
        // ⚠ Wrapped AFTER `openScopeTx`, so its BEGIN / SET LOCAL / scope-assert are ⛔ not counted:
        // the property is about the ASSEMBLY, ⛔ not the transaction setup every request pays.
        const client = scopeTx.client as unknown as { query: (...a: unknown[]) => unknown };
        const realQuery = client.query.bind(client);
        client.query = (...args: unknown[]) => {
          actual += 1;
          return realQuery(...args);
        };
        const { readCount } = await assembleVerifierConsole(deps, {
          db: scopeTx.tx,
          pariwarId,
          claimCaseId,
          district: DISTRICT,
          actorId: randomUUID(),
          grants: [{ pariwarId, role: 'super_admin', scopeDimension: 'global', scopeValue: null }],
          traceId: null,
        });
        client.query = realQuery as never;
        await closeScopeTx(scopeTx, true);
        return { actual, reported: readCount };
      } catch (err) {
        await closeScopeTx(scopeTx, false);
        throw err;
      }
    };

    const before = await measure();
    // ⛔ NON-VACUITY: the wrap really intercepted the drizzle client. A silently-bypassed wrapper
    // would report 0 and satisfy everything below — the exact failure mode this test exists to
    // avoid, reproduced one level up.
    expect(before.actual, 'the query wrapper counted nothing — it did not intercept the client').toBeGreaterThan(5);

    // Add rows to the sections whose fan-out the budget is about.
    // ⚠⚠ DISTINCT `document_type` VALUES, AND THAT IS LOAD-BEARING (learned the hard way): my first
    // draft inserted three `death_certificate` rows, which the unique `(claim_case_id,
    // document_type)` constraint collapses to ONE. ⇒ the row count ⛔ never grew, and the test
    // passed against a deliberately planted N+1 — a green that proved ⛔ nothing, which is the
    // exact defect class this file is about.
    const c = await td.pool.connect();
    let inserted = 0;
    try {
      for (const docType of ['ground_inspection_photo', 'hospital_record'] as const) {
        await c
          .query(
            `INSERT INTO claim_documents (claim_document_id, pariwar_id, claim_case_id, document_type, storage_object_key,
               content_type, byte_size, parity_outcome, parity_flags, ocr_confidence, verifier_review_required)
             VALUES ($1, $2, $3, $5, $4, 'application/pdf', 1024, 'match', '{}'::jsonb, 0.9, false)`,
            [randomUUID(), pariwarId, claimCaseId, `k/${randomUUID()}`, docType],
          )
          .then(() => {
            inserted += 1;
          });
      }
    } finally {
      c.release();
    }
    // ⛔ NON-VACUITY: rows REALLY grew. Without this the equality below is satisfied by a fixture
    // that added nothing — which is precisely how the first draft passed.
    expect(inserted, 'no extra document rows landed — the no-N+1 assertion would be vacuous').toBe(2);

    const after = await measure();
    // ⭐⭐ THE ASSERTION THAT MATTERS, and it is measured independently of the handler: more ROWS
    // must cost ⛔ NO more statements.
    expect(
      after.actual,
      `rows grew the REAL statement count ${before.actual} → ${after.actual} — an N+1 the self-report cannot see`,
    ).toBe(before.actual);

    // ⭐ AND THE SELF-REPORT IS HONEST about its own axis: it may ⛔ not claim FEWER top-level reads
    // than there were statements. ⚠ An inequality on purpose — the counter bounds WIDTH, so equality
    // would be the wrong claim; under-reporting is the dishonest direction and that is what is fenced.
    expect(
      before.reported,
      `the handler reported ${before.reported} reads but Postgres received ${before.actual}`,
    ).toBeLessThanOrEqual(before.actual);
  });

  it('bounded no-N+1: assembleVerifierConsole stays within VERIFIER_CONSOLE_MAX_READS, independent of doc-row count (D9)', async () => {
    const pariwarId = randomUUID();
    const deceased = await seedDeceasedMember(pariwarId, DISTRICT);
    const claimCaseId = await seedClaim(pariwarId, deceased);

    const measure = async (): Promise<number> => {
      const scopeTx = await openScopeTx(deps, pariwarId);
      try {
        const { readCount } = await assembleVerifierConsole(deps, {
          db: scopeTx.tx,
          pariwarId,
          claimCaseId,
          district: DISTRICT,
          actorId: randomUUID(),
          grants: [{ pariwarId, role: 'super_admin', scopeDimension: 'global', scopeValue: null }],
          traceId: null,
        });
        await closeScopeTx(scopeTx, true);
        return readCount;
      } catch (err) {
        await closeScopeTx(scopeTx, false);
        throw err;
      }
    };

    const before = await measure();
    expect(before).toBeLessThanOrEqual(VERIFIER_CONSOLE_MAX_READS);

    // Add two claim_documents rows — the fan-out width (read count) must NOT grow (no N+1).
    //
    // ⚠⚠ THIS INSERT WAS SILENTLY FAILING AND THE TEST WAS VACUOUS (code review 2026-09-22). It
    // inserted `death_certificate` TWICE — which the unique `(claim_case_id, document_type)`
    // constraint collapses to one — and omitted `byte_size`, which is NOT NULL, so BOTH statements
    // threw. The bare `.catch(() => {})` swallowed them. ⇒ ⛔ no rows were ever added, and
    // `expect(after).toBe(before)` compared a claim to ITSELF: it would have passed against any
    // N+1 whatsoever. ⭐ Found by planting an N+1 in a sibling test and watching it ⛔ not fail.
    const c = await td.pool.connect();
    let inserted = 0;
    try {
      for (const docType of ['ground_inspection_photo', 'hospital_record'] as const) {
        await c
          .query(
            `INSERT INTO claim_documents (claim_document_id, pariwar_id, claim_case_id, document_type, storage_object_key,
               content_type, byte_size, parity_outcome, parity_flags, ocr_confidence, verifier_review_required)
             VALUES ($1, $2, $3, $5, $4, 'application/pdf', 1024, 'match', '{}'::jsonb, 0.9, false)`,
            [randomUUID(), pariwarId, claimCaseId, `k/${randomUUID()}`, docType],
          )
          .then(() => {
            inserted += 1;
          });
      }
    } finally {
      c.release();
    }
    // ⛔ NON-VACUITY — the rows really landed. ⛔ No bare catch: a failing fixture must FAIL the
    // test, ⛔ never quietly turn it into a tautology.
    expect(inserted, 'no document rows landed — the no-N+1 assertion below would be vacuous').toBe(2);

    const after = await measure();
    expect(after).toBeLessThanOrEqual(VERIFIER_CONSOLE_MAX_READS);
    expect(after).toBe(before); // no N+1 — more document rows do NOT add reads
  });

  it('bounded no-N+1: read count does NOT grow with peer-mesh-response or ground-inspection-photo row count (D9)', async () => {
    const pariwarId = randomUUID();
    const deceased = await seedDeceasedMember(pariwarId, DISTRICT);
    const claimCaseId = await seedClaim(pariwarId, deceased);

    const measure = async (): Promise<number> => {
      const scopeTx = await openScopeTx(deps, pariwarId);
      try {
        const { readCount } = await assembleVerifierConsole(deps, {
          db: scopeTx.tx,
          pariwarId,
          claimCaseId,
          district: DISTRICT,
          actorId: randomUUID(),
          grants: [{ pariwarId, role: 'super_admin', scopeDimension: 'global', scopeValue: null }],
          traceId: null,
        });
        await closeScopeTx(scopeTx, true);
        return readCount;
      } catch (err) {
        await closeScopeTx(scopeTx, false);
        throw err;
      }
    };

    // Establish a PRESENT baseline first (1 peer-mesh response + 1 ground-inspection photo) — the
    // empty→present transition itself changes peer-mesh's read count (1 read when empty vs 3 when
    // present, since the ping/response reads only fire once a selection exists); the no-N+1 property
    // under test is specifically about ROW COUNT growth WITHIN an already-present section.
    const { candidateIds } = await seedPeerMeshSelection(pariwarId, claimCaseId, deceased, 3);
    await recordPeerMeshResponses(pariwarId, claimCaseId, [candidateIds[0]!]);
    const groundInspectionId = await seedGroundInspection(pariwarId, claimCaseId);
    await addGroundInspectionPhotos(pariwarId, groundInspectionId, 1);

    const before = await measure();
    expect(before).toBeLessThanOrEqual(VERIFIER_CONSOLE_MAX_READS);

    // Grow row counts within the ALREADY-present sections — 2 more real responses, 2 more real photos.
    await recordPeerMeshResponses(pariwarId, claimCaseId, [candidateIds[1]!, candidateIds[2]!]);
    await addGroundInspectionPhotos(pariwarId, groundInspectionId, 2);

    const after = await measure();
    expect(after).toBeLessThanOrEqual(VERIFIER_CONSOLE_MAX_READS);
    expect(after).toBe(before); // no N+1 — more peer-mesh responses / inspection photos do NOT add reads

    // And the fan-out actually surfaced the rows (proves the read wasn't just silently empty).
    const scopeTx = await openScopeTx(deps, pariwarId);
    try {
      const { packet } = await assembleVerifierConsole(deps, {
        db: scopeTx.tx,
        pariwarId,
        claimCaseId,
        district: DISTRICT,
        actorId: randomUUID(),
        grants: [{ pariwarId, role: 'super_admin', scopeDimension: 'global', scopeValue: null }],
        traceId: null,
      });
      await closeScopeTx(scopeTx, true);
      expect(packet.peerMesh.status).toBe('present');
      if (packet.peerMesh.status === 'present') {
        expect(packet.peerMesh.transcript.responses).toHaveLength(3);
      }
      expect(packet.groundInspection.status).toBe('present');
      if (packet.groundInspection.status === 'present') {
        expect(packet.groundInspection.assignments[0]?.photos).toHaveLength(3);
      }
    } catch (err) {
      await closeScopeTx(scopeTx, false);
      throw err;
    }
  });
  // ── Story 6.18 — THE CONSOLE PACKET'S NOMINEE SECTION ─────────────────────────────────────
  //
  // ⚠⚠ `grep nomineeNameCheck verifier-console*.spec.ts` returned **ZERO** (code review
  // 2026-09-22): `accountsComplete`, `currentAndPassing` and `differenceReasons` were asserted
  // ⛔ NOWHERE. ⭐ These four booleans are what the District Admin's console reads to decide
  // whether to OFFER the approve control and what to say when it cannot — so a wrong value here
  // is a console that either hides a legitimate approval or offers one that will 409.
  const nomineeSection = async (pariwarId: string, claimCaseId: string) => {
    const scopeTx = await openScopeTx(deps, pariwarId);
    try {
      const packet = await assembleVerifierConsole(deps, {
        db: scopeTx.tx, pariwarId, claimCaseId, district: DISTRICT,
        actorId: randomUUID(),
        grants: [{ pariwarId, role: 'super_admin', scopeDimension: 'global', scopeValue: null }],
        traceId: null,
      });
      await closeScopeTx(scopeTx, true);
      return packet.packet.nomineeNameCheck;
    } catch (err) {
      await closeScopeTx(scopeTx, false);
      throw err;
    }
  };

  it('⭐ a claim with ⛔ NO accounts: `accountsComplete` false, `currentAndPassing` false', async () => {
    const pariwarId = randomUUID();
    const deceased = await seedDeceasedMember(pariwarId, DISTRICT);
    // ⚠ This spec's `seedClaim` seeds the accounts AND a passing check (so its other tests can pass
    // the AC4 gates), so they are removed here — otherwise `accountsComplete: false` would be
    // asserted against a claim that has two accounts, and the test would fail for the right value
    // at the wrong time.
    const claimCaseId = await seedClaim(pariwarId, deceased);
    const c = await td.pool.connect();
    try {
      await c.query(`DELETE FROM claim_nominee_bank_accounts WHERE claim_case_id = $1`, [claimCaseId]);
    } finally {
      c.release();
    }

    const s = await nomineeSection(pariwarId, claimCaseId);
    expect(s.available, 'the section failed soft — the booleans below would be meaningless').toBe(true);
    expect(s.accountsComplete).toBe(false);
    expect(s.currentAndPassing).toBe(false);
    expect(s.differenceReasons).toEqual([]);
  });

  it('⭐⭐ a PASSING check with a clerical difference: `currentAndPassing` true AND the REASON codes', async () => {
    // ⭐ AC8's highlight rides this field. It is non-PII by construction — reason CODES, ⛔ never a
    // name — which is what lets the console show *"approved with a name difference"* at all.
    const pariwarId = randomUUID();
    const deceased = await seedDeceasedMember(pariwarId, DISTRICT);
    const claimCaseId = await seedClaim(pariwarId, deceased);
    await seedNomineeNameCheck(deps, pariwarId, claimCaseId, {
      verdicts: ['matches', 'clerical_difference'],
      clericalReasons: [null, 'married_name'],
    });

    const s = await nomineeSection(pariwarId, claimCaseId);
    expect(s.accountsComplete).toBe(true);
    expect(s.currentAndPassing).toBe(true);
    expect(s.differenceReasons).toEqual(['married_name']);
    // ⭐ AND ⛔ NO NAME anywhere in the section — Trap 4, on the packet every console load carries.
    expect(JSON.stringify(s)).not.toContain('holder');
  });

  it('⭐ accounts COMPLETE but the check was NEVER RECORDED: `accountsComplete` true, `currentAndPassing` false', async () => {
    // ⭐ ADDED 2026-09-22 (code review) — the two tests above cover "no accounts" and "check
    // recorded" (passing/mixed), but never this state, which is the exact one that gates
    // `verifier_decision.nominee_name_check_required` elsewhere (AC4): two accounts ARE on file, and
    // NOBODY has checked them yet. A section that conflated this with "no accounts" would tell the
    // console the wrong reason to withhold approval.
    const pariwarId = randomUUID();
    const deceased = await seedDeceasedMember(pariwarId, DISTRICT);
    const claimCaseId = await seedClaim(pariwarId, deceased, { accountsOnly: true });

    const s = await nomineeSection(pariwarId, claimCaseId);
    expect(s.accountsComplete, 'accountsOnly seeded two accounts — this must be true').toBe(true);
    expect(s.currentAndPassing).toBe(false);
    expect(s.differenceReasons).toEqual([]);
  });

  it('⚠⚠ a MIXED `[clerical_difference, does_not_match]`: ⛔ NOT passing, and ⛔ NO reasons', async () => {
    // ⚠⚠ THE CASE THE FIELD'S OWN DOC SINGLES OUT: *"a mixed check yields `[]`"*. A section that
    // reported the clerical reason here would let the console render the REASSURING
    // "approved with a difference" badge on a claim that must be SENT BACK — one payout
    // destination belonging to somebody else, shown as a tidy footnote.
    const pariwarId = randomUUID();
    const deceased = await seedDeceasedMember(pariwarId, DISTRICT);
    const claimCaseId = await seedClaim(pariwarId, deceased);
    await seedNomineeNameCheck(deps, pariwarId, claimCaseId, {
      verdicts: ['clerical_difference', 'does_not_match'],
      clericalReasons: ['married_name', null],
    });

    const s = await nomineeSection(pariwarId, claimCaseId);
    expect(s.accountsComplete).toBe(true);
    expect(s.currentAndPassing, 'a does_not_match check reported as passing').toBe(false);
    expect(s.differenceReasons, 'a sending-back check exposed a difference reason').toEqual([]);
  });

  // ── Story 6.20 (code review 2026-09-24) ─────────────────────────────────────────────────────────
  /** Assemble the console for a claim; also count the statements Postgres really receives. */
  async function assembleMeasured(pariwarId: string, claimCaseId: string) {
    const scopeTx = await openScopeTx(deps, pariwarId);
    let actual = 0;
    const client = scopeTx.client as unknown as { query: (...a: unknown[]) => unknown };
    const realQuery = client.query.bind(client);
    try {
      client.query = (...args: unknown[]) => {
        actual += 1;
        return realQuery(...args);
      };
      const out = await assembleVerifierConsole(deps, {
        db: scopeTx.tx,
        pariwarId,
        claimCaseId,
        district: DISTRICT,
        actorId: randomUUID(),
        grants: [{ pariwarId, role: 'super_admin', scopeDimension: 'global', scopeValue: null }],
        traceId: null,
      });
      client.query = realQuery as never;
      await closeScopeTx(scopeTx, true);
      return { ...out, actual };
    } catch (err) {
      await closeScopeTx(scopeTx, false);
      throw err;
    } finally {
      // ⭐ Restored on EVERY path (code review 2026-09-24b) — a throw used to return the counting client to the pool.
      client.query = realQuery as never;
    }
  }

  it('⭐⭐ AC13 — the WORST read path (an INHERITED inspection: the source found, its extra reads COUNTED) stays within the ceiling, and the packet names its source', async () => {
    const pariwarId = randomUUID();
    const deceased = await seedDeceasedMember(pariwarId, DISTRICT);
    // The SOURCE: an earlier claim refused on `-239`, with a COMPLETED inspection.
    const source = await seedClaim(pariwarId, deceased, { skip: true });
    const c = await td.pool.connect();
    try {
      await c.query(
        `INSERT INTO claim_ground_inspections (claim_case_id, pariwar_id, district, inspection_stage, inspection_site_type,
           inspector_actor_id, scheduled_at, status, completed_at)
         VALUES ($1, $2, $3, 'initial', 'family_residence', $4, now() - interval '3 days', 'completed', now() - interval '2 days')`,
        [source, pariwarId, DISTRICT, randomUUID()],
      );
      await c.query(
        `INSERT INTO claim_verifier_decisions (claim_case_id, pariwar_id, outcome, reason_code, actor_id, actor_display)
         VALUES ($1, $2, 'denied', 'post_death_nominee_change', $3, 'Anita (District Admin)')`,
        [source, pariwarId, randomUUID()],
      );
    } finally {
      c.release();
    }
    // The REFILE — later, with ⛔ no inspection of its own: the path that pays the inheritance reads.
    const refile = await seedClaim(pariwarId, deceased);
    const { packet, readCount, actual } = await assembleMeasured(pariwarId, refile);

    // ⭐ The API wiring (not only the domain derivation): the section is PRESENT, from the source, labelled.
    expect(packet.groundInspection.status).toBe('present');
    expect((packet.groundInspection as { inheritedFrom?: { claimCaseId: string } }).inheritedFrom).toEqual({ claimCaseId: source });
    // ⭐ The ceiling, MEASURED on the path that pays for AC13's reads.
    expect(readCount).toBeLessThanOrEqual(VERIFIER_CONSOLE_MAX_READS);
    expect(readCount, `reported ${readCount} reads but Postgres received ${actual}`).toBeLessThanOrEqual(actual);

    // ⭐⭐ …and the inheritance reads are COUNTED, ⛔ not merely present (code review 2026-09-24b). `readCount
    // <= actual` only catches OVER-reporting; an un-`bump()`ed read stayed green. The ceiling books ONE read per
    // domain call (`getClaimGroundInspection` is one read whether it issues 1 statement or 2 — inspections, then
    // photos when there are any — on the own path exactly as on the inherited one). So the BASELINE is the same
    // section with the inspection the claim's OWN: identical from the inspection read on, it differs ONLY by the
    // two inheritance-only calls (the empty own read, the source lookup) — each one statement, each booked.
    // ⭐ The SAME death (adversarial review 2026-09-24b: a different deceased made every prior-claims read differ
    // too). ⚠ Residual, named: this baseline has one MORE earlier claim than the refile (the refile itself) —
    // equal read counts rely on every section booking per CALL, ⛔ not per row; the `actual` delta would expose
    // a per-row section.
    const own = await seedClaim(pariwarId, deceased);
    const c2 = await td.pool.connect();
    try {
      await c2.query(
        `INSERT INTO claim_ground_inspections (claim_case_id, pariwar_id, district, inspection_stage, inspection_site_type,
           inspector_actor_id, scheduled_at, status, completed_at)
         VALUES ($1, $2, $3, 'initial', 'family_residence', $4, now() - interval '3 days', 'completed', now() - interval '2 days')`,
        [own, pariwarId, DISTRICT, randomUUID()],
      );
    } finally {
      c2.release();
    }
    const baseline = await assembleMeasured(pariwarId, own);
    expect(baseline.packet.groundInspection.status).toBe('present');
    expect((baseline.packet.groundInspection as { inheritedFrom?: unknown }).inheritedFrom).toBeUndefined();
    expect(readCount - baseline.readCount, 'the two inheritance-only reads, booked').toBe(2);
    expect(actual - baseline.actual, 'statements Postgres received for the inheritance vs reads booked').toBe(readCount - baseline.readCount);
  });

  it('⭐ AC5 site D — the console\'s name-check status reads the EFFECTIVE declaration: a change to the CURRENT rows alone does ⛔ not stale it', async () => {
    const pariwarId = randomUUID();
    const deceased = await seedDeceasedMember(pariwarId, DISTRICT);
    const claimCaseId = await seedClaim(pariwarId, deceased); // determined + a current, passing check
    const before = (await assembleMeasured(pariwarId, claimCaseId)).packet.nomineeNameCheck;
    expect(before.currentAndPassing).toBe(true);

    // A later version lands in the CURRENT rows only (the projection now names someone else); the
    // as-at-death declaration — and so the check recorded against it — is unchanged.
    const scopeTx = await openScopeTx(deps, pariwarId);
    try {
      const row = {
        rank: 1 as const,
        splitPct: 100 as const,
        relationship: 'son',
        nameCiphertext: 'enc:v1:someone-else',
        mobileCiphertext: 'enc:v1:someone-else-mobile',
        addressCiphertext: null,
      };
      await nominee.replaceMemberNominees(scopeTx.tx, { memberId: deceased, pariwarId: ids.pariwarId(pariwarId), nominees: [row] });
      await nominee.appendMemberDeclarationVersions(scopeTx.tx, {
        memberId: deceased,
        pariwarId: ids.pariwarId(pariwarId),
        plan: nominee.planDeclarationVersions(await nominee.getNomineeVersionHeads(scopeTx.tx, ids.pariwarId(pariwarId), deceased), [1]),
        nominees: [row],
        recordedAt: new Date(),
        eventVersion: null,
      });
      await closeScopeTx(scopeTx, true);
    } catch (err) {
      await closeScopeTx(scopeTx, false);
      throw err;
    }
    const after = (await assembleMeasured(pariwarId, claimCaseId)).packet.nomineeNameCheck;
    expect(after.currentAndPassing).toBe(true);
  });
});
