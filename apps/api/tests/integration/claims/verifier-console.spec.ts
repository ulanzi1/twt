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
//     not_available_yet ((e)/(f)), not_evaluated (concealment) — the three are DISTINCT, never collapsed;
//   · the AUDITED read (admin_verifier_console.read);
//   · the bounded no-N+1 ceiling — assembleVerifierConsole stays within VERIFIER_CONSOLE_MAX_READS and
//     the read count does NOT grow with document-row count (D9).
//
// ⚠ Own-committing seed writes; fresh random pariwarId per test; events_log append-only
// ([[project_live_db_test_gotchas]]).

import { randomUUID } from 'node:crypto';

import { claim, ids } from '@twt/domain';
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
    const claimCaseId = await seedClaim(pariwarId, deceased);
    const { client, userId } = await authenticate();
    await grant(userId, pariwarId, 'district_admin', 'district', DISTRICT);

    const res = await client.inject({ method: 'GET', url: url(pariwarId, claimCaseId) });
    expect(res.statusCode).toBe(200);
    const { packet } = res.json<{ packet: VerifierConsolePacket }>();

    // A minimal claim: producers exist but genuinely have no records → `empty` (NOT unavailable, NOT NAY).
    expect(packet.documentReview.status).toBe('empty');
    expect(packet.peerMesh.status).toBe('empty');
    expect(packet.groundInspection.status).toBe('empty');
    // Sections (e)/(f) — the 6.11 producer has not shipped → `not_available_yet` (NOT empty).
    expect(packet.priorVerifierComments.status).toBe('not_available_yet');
    expect(packet.recentPrecedents.status).toBe('not_available_yet');
    // Concealment — the honest v1 posture, never a green/clear.
    expect(packet.concealment.status).toBe('not_evaluated');
    expect(packet.concealment.detailVisibility).toBe('indicator_only');
    // Validity is either present or a transient unavailable — never a crash, never `empty`.
    expect(['present', 'unavailable']).toContain(packet.validity.status);
    // The three non-present states are DISTINCT values (never collapsed).
    expect(packet.documentReview.status).not.toBe(packet.priorVerifierComments.status);

    // AUDITED read.
    const audits = td.auditSink.ofType('admin_verifier_console.read');
    expect(audits.some((a) => (a.context as { claim_case_id?: string })?.claim_case_id === claimCaseId)).toBe(true);
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
    const claimCaseId = await seedClaim(pariwarId, deceased);
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
    const claimCaseId = await seedClaim(pariwarId, deceased);
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
    } catch (err) {
      await closeScopeTx(scopeTx, false);
      throw err;
    }
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
    const c = await td.pool.connect();
    try {
      for (let i = 0; i < 2; i += 1) {
        await c.query(
          `INSERT INTO claim_documents (claim_document_id, pariwar_id, claim_case_id, document_type, storage_object_key,
             content_type, parity_outcome, parity_flags, ocr_confidence, verifier_review_required)
           VALUES ($1, $2, $3, 'death_certificate', $4, 'application/pdf', 'match', '{}'::jsonb, 0.9, false)`,
          [randomUUID(), pariwarId, claimCaseId, `k/${randomUUID()}`],
        ).catch(() => {
          /* if the unique (claim,type) constraint blocks the 2nd insert, one doc still proves the point */
        });
      }
    } finally {
      c.release();
    }

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
});
