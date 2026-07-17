// AI-6-3 live-DB SHAPE TEST class — compound read-model data shape (the Story 6.10 assembler).
//
// WHY this spec exists: DB-free unit tests structurally cannot catch data-SHAPE defects (the Story 6.6
// correlated-subquery tautology shipped wrong districts with green unit tests). The 6.10 verifier
// console is the stack's biggest COMPOUND read model — one request fans out to documents, peer-mesh,
// ground-inspection, prior-decisions and precedents sources — so a shape defect in ANY per-panel query
// (a wrong join key, a dropped claim/tenant predicate, a dropped superseded filter) silently fills a
// panel with ANOTHER claim's rows while every status stays green.
//
// This spec seeds ADVERSARIAL DECOYS such that the known-bad shapes return detectably wrong data:
//   · decoy claim B in the SAME pariwar, for the SAME deceased member, with rich rows on every panel —
//     a panel query keyed by pariwar_id or deceased_member_id instead of claim_case_id would pull B's
//     rows into A's console;
//   · decoy claim D in the SAME pariwar whose decision row is SUPERSEDED — a dropped
//     `superseded_at IS NULL` filter would surface it as a false precedent;
//   · decoy claim C in ANOTHER pariwar — rows that must never cross the tenant boundary.
// Every panel of claim A's console is asserted by EXACT row membership (ids/keys unique per claim) and,
// where the read specifies an ordering, exact order — never counts.
//
// TEETH — what is PROVEN vs argued: two bad shapes were proven BY INDUCED DEFECT (revert-sanity,
// recorded in the AI-6-3 Dev Agent Record): dropping the `claim_case_id` correlation from
// `getPriorVerifierDecisions` fails the (e) assertion, and dropping the `superseded_at IS NULL` filter
// from `getRecentInScopePrecedents` fails the (f) assertion. The remaining panels' decoy sensitivity is
// ANALYTICALLY ARGUED from the same construction (unique per-claim markers + exact membership + the
// non-vacuousness assembly of decoy B's own console below) — not separately induced. The other-pariwar
// decoy (claim C) is additionally guarded by RLS scope (the assembly runs under claim A's pariwar
// scope), so its assertions pin the TENANT BOUNDARY as a whole — RLS + explicit predicates,
// defense-in-depth — not the bare SQL predicate alone.
//
// NOT here (already covered by verifier-console.spec.ts): the authz matrix, the four-state vocabulary,
// the max-reads ceiling. This spec is data-shape only.
//
// THE PATTERN (join it): any future compound read model — Epic 7's pool read models first — joins this
// test class by adding a sibling `*-shape.spec.ts` beside its read code, with the same adversarial
// decoy seeding + exact-membership assertions and a WHY header like this one.
//
// ⚠ Own-committing seed writes; fresh random pariwarId per test ([[project_live_db_test_gotchas]]).

import { randomUUID } from 'node:crypto';

import { claim, ids } from '@twt/domain';
import type { VerifierConsolePacket } from '@twt/contracts';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { AppDeps } from '../../../src/context.js';
import { assembleVerifierConsole } from '../../../src/modules/claims/claims.verifier-console.handlers.js';
import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { buildTestDeps, hasDatabase, type TestDeps } from '../_setup.js';

const DISTRICT = 'Patna';

/** Plain bytewise string comparator (no locale/collation surprises — matches Postgres uuid order). */
const byString = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** The projector's real event-type union — no `as never` casts in the emit helper. */
type ClaimProjectorEventType = Parameters<typeof claim.projectClaimState>[1]['eventType'];

describe.skipIf(!hasDatabase)('Verifier-console compound shape (AI-6-3 class) — live DB (:5433)', () => {
  let td: TestDeps;
  let deps: AppDeps;

  beforeAll(() => {
    td = buildTestDeps();
    deps = td.deps;
  });

  afterAll(async () => {
    await td.pool.end();
  });

  /** Seed a committed member row (no posting). Idempotent — candidates may repeat across seeds. */
  async function seedMemberRow(pariwarId: string, memberId: string): Promise<void> {
    const c = await td.pool.connect();
    try {
      await c.query(
        `INSERT INTO members (member_id, pariwar_id, state, state_event_version, created_at, updated_at)
         VALUES ($1, $2, 'active', 0, now(), now()) ON CONFLICT (member_id) DO NOTHING`,
        [memberId, pariwarId],
      );
    } finally {
      c.release();
    }
  }

  /** Seed a committed member (+ posting district) — the deceased identity a claim hangs off. */
  async function seedDeceasedMember(pariwarId: string, district: string): Promise<ids.MemberId> {
    const memberId = randomUUID();
    await seedMemberRow(pariwarId, memberId);
    const c = await td.pool.connect();
    try {
      await c.query(
        `INSERT INTO member_postings (member_id, pariwar_id, district, is_retirement, created_at)
         VALUES ($1, $2, $3, false, now())`,
        [memberId, pariwarId, district],
      );
    } finally {
      c.release();
    }
    return ids.memberId(memberId);
  }

  /** Drive a fresh claim to `verification_in_progress` via the REAL projector (own-committing). */
  async function seedClaimCase(pariwarId: string, deceasedMemberId: ids.MemberId): Promise<string> {
    const claimCaseId = ids.claimId(randomUUID());
    const scopeTx = await openScopeTx(deps, pariwarId);
    const emit = (from: string | null, to: string, eventType: ClaimProjectorEventType, extra: Record<string, unknown> = {}) =>
      claim.projectClaimState(scopeTx.client, {
        claimCaseId, pariwarId: ids.pariwarId(pariwarId), deceasedMemberId, intakeChannels: ['helpline'], claimantActorId: null,
        eventType,
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

  /** One claim_documents row with a caller-pinned storage key (the per-claim membership marker). */
  async function seedDocument(pariwarId: string, claimCaseId: string, documentType: string, storageKey: string): Promise<void> {
    const c = await td.pool.connect();
    try {
      await c.query(
        `INSERT INTO claim_documents (claim_document_id, pariwar_id, claim_case_id, document_type, storage_object_key,
           content_type, byte_size, parity_outcome, parity_flags, ocr_confidence, verifier_review_required)
         VALUES ($1, $2, $3, $4, $5, 'application/pdf', 1024, 'match', '{}'::jsonb, 0.9, false)`,
        [randomUUID(), pariwarId, claimCaseId, documentType, storageKey],
      );
    } finally {
      c.release();
    }
  }

  /**
   * A peer-mesh selection for the claim with caller-pinned candidate ids + real recorded responses.
   * Each candidate gets a REAL members row in the claim's pariwar first (the seed resembles reachable
   * state — the selection job only ever picks existing active members).
   */
  async function seedPeerMesh(
    pariwarId: string,
    claimCaseId: string,
    deceasedMemberId: ids.MemberId,
    candidateIds: readonly string[],
    responderIds: readonly string[],
  ): Promise<void> {
    for (const memberId of candidateIds) await seedMemberRow(pariwarId, memberId);
    const selectionId = randomUUID();
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
    const scopeTx = await openScopeTx(deps, pariwarId);
    try {
      for (const memberId of responderIds) {
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

  /** One ground-inspection assignment + `photoIds` photos (caller-pinned ids = membership markers). */
  async function seedInspection(pariwarId: string, claimCaseId: string, photoIds: readonly string[]): Promise<string> {
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
      for (const photoId of photoIds) {
        await c.query(
          `INSERT INTO claim_ground_inspection_photos
             (photo_id, ground_inspection_id, pariwar_id, storage_object_key, content_type, byte_size)
           VALUES ($1, $2, $3, $4, 'image/jpeg', 1024)`,
          [photoId, groundInspectionId, pariwarId, `gi/${randomUUID()}`],
        );
      }
    } finally {
      c.release();
    }
    return groundInspectionId;
  }

  /** Adjudicate via the REAL writer (decision row + verdict event, the (e)/(f) source of truth). */
  async function adjudicate(
    pariwarId: string,
    claimCaseId: string,
    outcome: 'approved' | 'denied',
    reasonCode: 'r8_90pct_met' | 'concealment_flag_uphold',
    actorDisplay: string,
  ): Promise<void> {
    const scopeTx = await openScopeTx(deps, pariwarId);
    try {
      await claim.adjudicateClaim(scopeTx.client, {
        claimCaseId: ids.claimId(claimCaseId),
        pariwarId: ids.pariwarId(pariwarId),
        outcome,
        reasonCode,
        rationaleCiphertext: null,
        actorId: randomUUID(),
        actorDisplay,
        actor: 'operator',
      });
      await closeScopeTx(scopeTx, true);
    } catch (err) {
      await closeScopeTx(scopeTx, false);
      throw err;
    }
  }

  /** Supersede a claim's LIVE decision row directly (the concurrency specs' pattern) — the (f) decoy. */
  async function supersedeDecision(claimCaseId: string): Promise<void> {
    const c = await td.pool.connect();
    try {
      await c.query(
        `UPDATE claim_verifier_decisions SET superseded_at = now() WHERE claim_case_id = $1 AND superseded_at IS NULL`,
        [claimCaseId],
      );
    } finally {
      c.release();
    }
  }

  /** Assemble a claim's console under its own pariwar scope (super_admin — authz is NOT under test). */
  async function assemble(pariwarId: string, claimCaseId: string): Promise<VerifierConsolePacket> {
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
      return packet;
    } catch (err) {
      await closeScopeTx(scopeTx, false);
      throw err;
    }
  }

  /** The in-memory storage adapter's deterministic signed-URL shape (asserts key membership exactly). */
  const memoryUrl = (key: string): string => `memory://claim-documents/${encodeURIComponent(key)}?ttl=300`;

  it('every panel of claim A\'s console carries exactly A\'s rows — never decoy claim B\'s (same pariwar, SAME deceased), superseded claim D\'s, nor claim C\'s (other pariwar) [matrix row 3]', async () => {
    const pariwarP = randomUUID();
    const pariwarQ = randomUUID();

    // ── The shared-deceased decoy: A, B and D are DIFFERENT claims about the SAME member in the SAME
    // pariwar — every deceased-adjacent column (deceased_member_id on selections, claims, events)
    // matches, so only a correct claim_case_id key separates their panel rows.
    const deceasedP = await seedDeceasedMember(pariwarP, DISTRICT);
    const deceasedQ = await seedDeceasedMember(pariwarQ, DISTRICT);

    const claimA = await seedClaimCase(pariwarP, deceasedP);
    const claimB = await seedClaimCase(pariwarP, deceasedP);
    const claimC = await seedClaimCase(pariwarQ, deceasedQ);
    const claimD = await seedClaimCase(pariwarP, deceasedP); // decision superseded below — the (f) decoy

    // Per-claim UNIQUE membership markers. Doc keys carry a raw uuid TAIL (uuids contain no '/', so
    // the tail survives the signed URL's encodeURIComponent verbatim — the sweep uses it).
    const docTailA1 = randomUUID();
    const docTailA2 = randomUUID();
    const docTailB = randomUUID();
    const docTailC = randomUUID();
    const docKeyA1 = `shape/A1/${docTailA1}`;
    const docKeyA2 = `shape/A2/${docTailA2}`;
    const docKeyB = `shape/B/${docTailB}`;
    const docKeyC = `shape/C/${docTailC}`;
    // Candidate ids: a random-PER-RUN hex prefix (these rows COMMIT — fixed uuids would collide across
    // runs) with ORDERED tails, so the bytewise (Postgres uuid) order within the run stays known and
    // the read's `member_id` asc ordering is assertable as an exact array.
    const candPrefix = randomUUID().slice(0, 8);
    const candA1 = `${candPrefix}-0000-4000-8000-00000000000a`;
    const candA2 = `${candPrefix}-0000-4000-8000-00000000000b`;
    const candA3 = `${candPrefix}-0000-4000-8000-00000000000c`;
    const candB1 = `${candPrefix}-0000-4000-8000-0000000000b1`;
    const candB2 = `${candPrefix}-0000-4000-8000-0000000000b2`;
    const candsC = [`${candPrefix}-0000-4000-8000-0000000000c1`];
    const photoA1 = randomUUID();
    const photoA2 = randomUUID();
    const photoB = randomUUID();
    const photoC = randomUUID();

    // ── Rich rows on EVERY panel for A, and decoy rows on the same panels for B and C ──────────────
    await seedDocument(pariwarP, claimA, 'death_certificate', docKeyA1);
    await seedDocument(pariwarP, claimA, 'hospital_record', docKeyA2);
    await seedDocument(pariwarP, claimB, 'death_certificate', docKeyB);
    await seedDocument(pariwarQ, claimC, 'death_certificate', docKeyC);

    await seedPeerMesh(pariwarP, claimA, deceasedP, [candA3, candA1, candA2], [candA1, candA2]);
    await seedPeerMesh(pariwarP, claimB, deceasedP, [candB1, candB2], [candB1]);
    await seedPeerMesh(pariwarQ, claimC, deceasedQ, candsC, candsC);

    const inspectionA = await seedInspection(pariwarP, claimA, [photoA1, photoA2]);
    const inspectionB = await seedInspection(pariwarP, claimB, [photoB]);
    await seedInspection(pariwarQ, claimC, [photoC]);

    // Adjudicate the decoys FIRST (their decision rows are the (e)-panel decoys + the (f) candidates),
    // then A (so A's own transcript exists). Peer-mesh responses were recorded above, BEFORE the
    // verdicts move the claims out of `verification_in_progress`. Claim D's decision is then
    // SUPERSEDED — a dropped `superseded_at IS NULL` filter would resurrect it as a false precedent.
    await adjudicate(pariwarP, claimB, 'denied', 'concealment_flag_uphold', 'Verifier Bravo');
    await adjudicate(pariwarQ, claimC, 'approved', 'r8_90pct_met', 'Verifier Charlie');
    await adjudicate(pariwarP, claimD, 'approved', 'r8_90pct_met', 'Verifier Delta');
    await supersedeDecision(claimD);
    await adjudicate(pariwarP, claimA, 'approved', 'r8_90pct_met', 'Verifier Alpha');

    const packet = await assemble(pariwarP, claimA);

    // ── Identity: the packet is A's, about the shared deceased ──────────────────────────────────────
    expect(packet.claimCaseId).toBe(claimA);
    expect(packet.deceasedMemberId).toBe(String(deceasedP));

    // ── (b) documents: EXACTLY A's two documents, by unique storage key (via the deterministic
    // in-memory signed URL) — a deceased/pariwar-keyed shape would also return docKeyB (same deceased)
    // and a tenant-boundary breach would return docKeyC.
    expect(packet.documentReview.status).toBe('present');
    const reviews = packet.documentReview.status === 'present' ? packet.documentReview.reviews : [];
    expect(
      reviews.map((r) => ({ documentType: r.documentType, signedUrl: r.preview.signedUrl }))
        .sort((a, b) => byString(a.documentType, b.documentType)),
    ).toEqual([
      { documentType: 'death_certificate', signedUrl: memoryUrl(docKeyA1) },
      { documentType: 'hospital_record', signedUrl: memoryUrl(docKeyA2) },
    ]);

    // ── (c) peer mesh: EXACTLY A's pinged candidates, in member_id asc order (the read's documented
    // ordering — the seed inserted them out of that order), and EXACTLY A's responders. B's selection
    // is for the SAME deceased — a deceased-keyed selection lookup would surface candB1/candB2 here.
    expect(packet.peerMesh.status).toBe('present');
    const transcript = packet.peerMesh.status === 'present' ? packet.peerMesh.transcript : undefined;
    expect(transcript?.pingedMemberIds).toEqual([candA1, candA2, candA3]);
    expect(
      transcript?.responses.map((r) => ({ responderMemberId: r.responderMemberId, response: r.response }))
        .sort((a, b) => byString(a.responderMemberId, b.responderMemberId)),
    ).toEqual([
      { responderMemberId: candA1, response: 'confirmed' },
      { responderMemberId: candA2, response: 'confirmed' },
    ]);

    // ── (d) ground inspection: EXACTLY A's assignment and EXACTLY A's photos, by unique ids.
    expect(packet.groundInspection.status).toBe('present');
    const assignments = packet.groundInspection.status === 'present' ? packet.groundInspection.assignments : [];
    expect(assignments.map((a) => a.groundInspectionId)).toEqual([inspectionA]);
    expect(assignments[0]!.photos.map((p) => p.photoId).sort(byString)).toEqual([photoA1, photoA2].sort(byString));

    // ── (e) prior verifier comments: EXACTLY A's own decision transcript — B's denial and D's
    // superseded approval (same pariwar, same deceased) must NOT appear in A's history.
    // [Teeth PROVEN by induced defect: dropping the claim_case_id correlation fails this assertion.]
    expect(packet.priorVerifierComments.status).toBe('present');
    const comments = packet.priorVerifierComments.status === 'present' ? packet.priorVerifierComments.comments : [];
    expect(
      comments.map((d) => ({ claimCaseId: d.claimCaseId, outcome: d.outcome, reasonCode: d.reasonCode, actorDisplay: d.actorDisplay })),
    ).toEqual([
      { claimCaseId: claimA, outcome: 'approved', reasonCode: 'r8_90pct_met', actorDisplay: 'Verifier Alpha' },
    ]);

    // ── (f) recent precedents: EXACTLY B — A itself is excluded (current-claim exclusion), D's
    // superseded decision stays dead, and C never crosses the tenant boundary.
    // [Teeth PROVEN by induced defect: dropping the superseded_at IS NULL filter fails this assertion.]
    expect(packet.recentPrecedents.status).toBe('present');
    const precedents = packet.recentPrecedents.status === 'present' ? packet.recentPrecedents.precedents : [];
    expect(
      precedents.map((p) => ({ claimCaseId: p.claimCaseId, outcome: p.outcome, actorDisplay: p.actorDisplay })),
    ).toEqual([{ claimCaseId: claimB, outcome: 'denied', actorDisplay: 'Verifier Bravo' }]);

    // ── Whole-packet decoy sweep: NOTHING from B's/C's/D's panel rows leaks anywhere in A's packet.
    // Doc keys are swept in their LEAK-SURVIVING forms: raw `shape/B/…` can never appear in the packet
    // (the signed URL carries encodeURIComponent(key)), so sweeping it would be vacuous — sweep the
    // ENCODED key AND the raw uuid tail (no '/', survives encoding verbatim) instead. (B's decision
    // fields legitimately appear ONCE — as the (f) precedent — so the sweep checks B's PANEL-row
    // markers; D's decision is superseded, so ALL of D's markers must be absent.)
    const flat = JSON.stringify(packet);
    for (const marker of [
      encodeURIComponent(docKeyB), docTailB,
      encodeURIComponent(docKeyC), docTailC,
      candB1, candB2, ...candsC,
      photoB, photoC,
      claimC, String(deceasedQ), 'Verifier Charlie',
      claimD, 'Verifier Delta',
    ]) {
      expect(flat).not.toContain(marker);
    }

    // ── Non-vacuousness: the decoy rows are REAL. Decoy claim B's OWN console shows B's markers on
    // every panel — if the B-side seeds silently failed to land, the "none of B's rows" assertions
    // above would pass for the wrong reason.
    const packetB = await assemble(pariwarP, claimB);
    expect(packetB.claimCaseId).toBe(claimB);
    expect(packetB.documentReview.status).toBe('present');
    const reviewsB = packetB.documentReview.status === 'present' ? packetB.documentReview.reviews : [];
    expect(reviewsB.map((r) => r.preview.signedUrl)).toEqual([memoryUrl(docKeyB)]);
    expect(packetB.peerMesh.status).toBe('present');
    const transcriptB = packetB.peerMesh.status === 'present' ? packetB.peerMesh.transcript : undefined;
    expect(transcriptB?.pingedMemberIds).toEqual([candB1, candB2]);
    expect(transcriptB?.responses.map((r) => r.responderMemberId)).toEqual([candB1]);
    expect(packetB.groundInspection.status).toBe('present');
    const assignmentsB = packetB.groundInspection.status === 'present' ? packetB.groundInspection.assignments : [];
    expect(assignmentsB.map((a) => a.groundInspectionId)).toEqual([inspectionB]);
    expect(assignmentsB[0]!.photos.map((p) => p.photoId)).toEqual([photoB]);
    expect(packetB.priorVerifierComments.status).toBe('present');
    const commentsB = packetB.priorVerifierComments.status === 'present' ? packetB.priorVerifierComments.comments : [];
    expect(
      commentsB.map((d) => ({ claimCaseId: d.claimCaseId, outcome: d.outcome, actorDisplay: d.actorDisplay })),
    ).toEqual([{ claimCaseId: claimB, outcome: 'denied', actorDisplay: 'Verifier Bravo' }]);
    // And B's precedents are exactly [A] — A's live decision is B's only in-scope live precedent
    // (D superseded, C cross-tenant) — the exclusion/tenant/superseded shape holds from B's side too.
    expect(packetB.recentPrecedents.status).toBe('present');
    const precedentsB = packetB.recentPrecedents.status === 'present' ? packetB.recentPrecedents.precedents : [];
    expect(precedentsB.map((p) => p.claimCaseId)).toEqual([claimA]);
  });
}, { timeout: 20000 });
