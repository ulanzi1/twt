// Concealment-flagged claim path — live-DB integration tests (Story 6.15, Task 10).
//
// Covers the domain pieces end-to-end on the live schema (:5433): the verifier ASSESSMENT write path (D-E:
// row + identity event in one tx; NO approval/denial event; claim state unchanged), supersession (one live
// row + retained history), the one-live-per-claim partial-unique backstop, the tri-state PRODUCER matrix
// (linked→flagged / not_linked→not_flagged / unable|absent|clause-unprovisioned→not_evaluated, never a false
// not_flagged), the BULK producer (one map covering a mixed set), and the trustee R14 clause-version
// SNAPSHOT (AC3: concealment_upheld/override persist it; a null clause resolution ABORTS).
//
// describe.skipIf(!hasDatabase) skips when DATABASE_URL is unset so local `pnpm test` passes without Docker.

import { randomUUID } from 'node:crypto';

import { eq } from 'drizzle-orm';
import type pg from 'pg';
import { describe, expect, it } from 'vitest';

import type { Db } from '../../../src/db.js';
import {
  assessClaimConcealment,
  assessClaimConcealmentBulk,
} from '../../../src/claim/concealment-review.js';
import {
  ConcealmentAssessmentBlockedStateError,
  ConcealmentAssessmentClaimNotFoundError,
  getConcealmentAssessmentHistory,
  getLiveConcealmentAssessment,
  recordConcealmentAssessment,
} from '../../../src/claim/concealment-assessment-persist.js';
import { projectClaimState } from '../../../src/claim/project.js';
import {
  ConcealmentNotFlaggedError,
  resolveEscalation,
  voteOnFrozenClaim,
} from '../../../src/claim/state-trustee-decision-persist.js';
import { claimId as toClaimId, memberId as toMemberId } from '../../../src/ids/index.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, enterAppScope, seedClaim, seedClauseVersion } from '../_helpers.js';

const R14_PAYLOAD = {
  ack_text_en: 'I acknowledge the concealment-review clause.',
  ack_text_hi: 'मैं छिपाव-समीक्षा खंड को स्वीकार करता/करती हूँ।',
  rule_code: 'R14',
  never_auto_deny: true,
};

/** Seed the R14 clause (as superuser, BEFORE app scope) so the producer/trustee can resolve it. */
async function seedR14(tx: Db): Promise<string> {
  return seedClauseVersion(tx, PARIWAR_A, { clauseId: 'niy.concealment.r14', payload: R14_PAYLOAD });
}

/** Bootstrap a claim to `verification_in_progress` via a REAL event chain (intake → converged → documents
 *  → peer-mesh-pinged) — a D2 (ratified BigDev 2026-07-15) PERMITTED concealment-assessment window, and a
 *  real events_log stream so the identity annotation's replay is consistent (a directly-seeded claims row
 *  with no prior events would replay incorrectly). Runs under app scope. Returns its ids. */
async function bootstrapClaim(
  client: pg.PoolClient,
): Promise<{ claimCaseId: string; deceasedMemberId: string; state: string }> {
  const claimCaseId = randomUUID();
  const deceasedMemberId = randomUUID();
  const emit = (from: string | null, to: string, eventType: string, extra: Record<string, unknown> = {}) =>
    projectClaimState(client, {
      claimCaseId: toClaimId(claimCaseId),
      pariwarId: PARIWAR_A,
      deceasedMemberId: toMemberId(deceasedMemberId),
      intakeChannels: ['member_app'],
      claimantActorId: null,
      eventType: eventType as never,
      payload: { from_state: from, to_state: to, trigger: 'test_bootstrap', actor: 'system', ...extra },
      actorId: null,
    });
  await emit(null, 'intake_pending', 'claim.intake_initiated', {
    deceased_member_id: deceasedMemberId,
    intake_channel: 'member_app',
    claimant_actor_id: null,
  });
  await emit('intake_pending', 'intake_converged', 'claim.intake_converged');
  await emit('intake_converged', 'documents_pending', 'claim.documents_received');
  const res = await emit('documents_pending', 'verification_in_progress', 'claim.peer_mesh_pinged', {
    selected_member_ids: [randomUUID()],
    metric_id: 'district_cohort_v1',
    metric_version: 1,
  });
  return { claimCaseId, deceasedMemberId, state: res.state };
}

/** Drive a REAL event chain from `verification_in_progress` (bootstrapClaim's target) on to
 *  `verifier_approved` — for tests that need BOTH a prior assessment (identity-event replay needs real
 *  history) AND a live trustee vote on the SAME claim. */
async function advanceToVerifierApproved(client: pg.PoolClient, claimCaseId: string, deceasedMemberId: string): Promise<void> {
  const emit = (from: string, to: string, eventType: string) =>
    projectClaimState(client, {
      claimCaseId: toClaimId(claimCaseId),
      pariwarId: PARIWAR_A,
      deceasedMemberId: toMemberId(deceasedMemberId),
      intakeChannels: ['member_app'],
      claimantActorId: null,
      eventType: eventType as never,
      payload: { from_state: from, to_state: to, trigger: 'test_bootstrap', actor: 'system' },
      actorId: null,
    });
  await emit('verification_in_progress', 'verifier_review', 'claim.verifier_reviewing');
  await emit('verifier_review', 'verifier_approved', 'claim.verifier_approved');
}

// actor_id lands in events_log.actor_id (a UUID column) via projectClaimState — must be a real UUID.
const ACTOR = '99999999-9999-9999-9999-999999999999';
const TRUSTEE_ACTOR = '88888888-8888-8888-8888-888888888888';
const DISPLAY = 'Anita (District Admin)';

describe.skipIf(!hasDatabase)('Story 6.15 — concealment assessment write path (D-E)', () => {
  setupLiveDb();

  it('records a `linked` assessment: one live row + a claim.concealment_assessed identity event, claim state UNCHANGED, NO approval/denial event', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const claim = await bootstrapClaim(client);

    const res = await recordConcealmentAssessment(client, {
      claimCaseId: toClaimId(claim.claimCaseId),
      pariwarId: PARIWAR_A,
      kind: 'linked',
      noteCiphertext: null,
      actorId: ACTOR,
      actorDisplay: DISPLAY,
      actor: 'operator',
    });

    // Identity: state unchanged relative to the bootstrapped stream.
    expect(res.claimState).toBe(claim.state);
    expect(res.supersededAssessmentId).toBeNull();

    // The assessment row exists (authoritative read model).
    const live = await getLiveConcealmentAssessment(tx, PARIWAR_A, toClaimId(claim.claimCaseId));
    expect(live?.kind).toBe('linked');
    expect(live?.actorDisplay).toBe(DISPLAY);

    // Same-tx atomicity (D-E): exactly one claim.concealment_assessed event committed with the row.
    const events = await tx
      .select()
      .from(schema.eventsLog)
      .where(eq(schema.eventsLog.streamId, claim.claimCaseId));
    const assessed = events.filter((e) => e.eventType === 'claim.concealment_assessed');
    expect(assessed).toHaveLength(1);
    // The event payload is non-PII (auditShape only) — no kind/note leaked into events_log.
    expect(JSON.stringify(assessed[0]?.payload)).not.toContain('linked');
    // NEVER an approval/denial event.
    expect(events.some((e) => /denied|approved/.test(e.eventType))).toBe(false);
  });

  it('revises linked → not_linked: keeps ONE live row + retains the full history; supersession is linked', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const claim = await bootstrapClaim(client);
    const cid = toClaimId(claim.claimCaseId);

    const first = await recordConcealmentAssessment(client, {
      claimCaseId: cid, pariwarId: PARIWAR_A, kind: 'linked', noteCiphertext: null, actorId: ACTOR, actorDisplay: DISPLAY, actor: 'operator',
    });
    const second = await recordConcealmentAssessment(client, {
      claimCaseId: cid, pariwarId: PARIWAR_A, kind: 'not_linked', noteCiphertext: null, actorId: ACTOR, actorDisplay: DISPLAY, actor: 'operator',
    });

    expect(second.supersededAssessmentId).toBe(first.assessment.assessmentId);
    // Exactly one LIVE row, now not_linked.
    const live = await getLiveConcealmentAssessment(tx, PARIWAR_A, cid);
    expect(live?.kind).toBe('not_linked');
    // History retained (both rows).
    const history = await getConcealmentAssessmentHistory(tx, PARIWAR_A, cid);
    expect(history).toHaveLength(2);
    expect(history.filter((r) => r.supersededAt === null)).toHaveLength(1);
  });

  it('the one-live-per-claim partial-unique rejects a second live row (structural backstop)', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const claim = await bootstrapClaim(client);
    const cid = toClaimId(claim.claimCaseId);
    await recordConcealmentAssessment(client, {
      claimCaseId: cid, pariwarId: PARIWAR_A, kind: 'linked', noteCiphertext: null, actorId: ACTOR, actorDisplay: DISPLAY, actor: 'operator',
    });
    // A raw second LIVE insert (superseded_at null) must violate the partial-unique.
    await expect(
      tx.insert(schema.claimConcealmentAssessments).values({
        claimCaseId: cid,
        pariwarId: PARIWAR_A,
        kind: 'not_linked',
        noteCiphertext: null,
        actorId: ACTOR,
        actorDisplay: DISPLAY,
      }),
    ).rejects.toThrow();
  });

  it('throws ConcealmentAssessmentClaimNotFoundError for a claim outside scope', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await expect(
      recordConcealmentAssessment(client, {
        claimCaseId: toClaimId(randomUUID()), pariwarId: PARIWAR_A, kind: 'linked', noteCiphertext: null, actorId: ACTOR, actorDisplay: DISPLAY, actor: 'operator',
      }),
    ).rejects.toBeInstanceOf(ConcealmentAssessmentClaimNotFoundError);
  });
});

describe.skipIf(!hasDatabase)('Story 6.15 — tri-state producer matrix (D10 fail-soft)', () => {
  setupLiveDb();

  it('linked → flagged (+ the R14 clauseVersionId); not_linked → not_flagged; unable/absent → not_evaluated', async () => {
    const { tx, client } = getTx();
    const clauseVersionId = await seedR14(tx);
    await enterAppScope(client, PARIWAR_A);
    const claim = await bootstrapClaim(client);
    const cid = toClaimId(claim.claimCaseId);

    // Absent assessment → not_evaluated (never touches the clause).
    expect(await assessClaimConcealment(tx, { pariwarId: PARIWAR_A, claimCaseId: cid })).toEqual({ status: 'not_evaluated' });

    await recordConcealmentAssessment(client, { claimCaseId: cid, pariwarId: PARIWAR_A, kind: 'linked', noteCiphertext: null, actorId: ACTOR, actorDisplay: DISPLAY, actor: 'operator' });
    expect(await assessClaimConcealment(tx, { pariwarId: PARIWAR_A, claimCaseId: cid })).toEqual({ status: 'flagged', clauseVersionId });

    await recordConcealmentAssessment(client, { claimCaseId: cid, pariwarId: PARIWAR_A, kind: 'not_linked', noteCiphertext: null, actorId: ACTOR, actorDisplay: DISPLAY, actor: 'operator' });
    expect(await assessClaimConcealment(tx, { pariwarId: PARIWAR_A, claimCaseId: cid })).toEqual({ status: 'not_flagged', clauseVersionId });

    await recordConcealmentAssessment(client, { claimCaseId: cid, pariwarId: PARIWAR_A, kind: 'unable_to_determine', noteCiphertext: null, actorId: ACTOR, actorDisplay: DISPLAY, actor: 'operator' });
    expect(await assessClaimConcealment(tx, { pariwarId: PARIWAR_A, claimCaseId: cid })).toEqual({ status: 'not_evaluated' });
  });

  it('a `linked` assessment with an UNPROVISIONED R14 clause → not_evaluated (fail-soft, never a false not_flagged)', async () => {
    const { tx, client } = getTx();
    // NOTE: no seedR14 — the clause is unprovisioned.
    await enterAppScope(client, PARIWAR_A);
    const claim = await bootstrapClaim(client);
    const cid = toClaimId(claim.claimCaseId);
    await recordConcealmentAssessment(client, { claimCaseId: cid, pariwarId: PARIWAR_A, kind: 'linked', noteCiphertext: null, actorId: ACTOR, actorDisplay: DISPLAY, actor: 'operator' });
    expect(await assessClaimConcealment(tx, { pariwarId: PARIWAR_A, claimCaseId: cid })).toEqual({ status: 'not_evaluated' });
  });

  it('bulk: ONE map covering a mixed set (linked→flagged, not_linked→not_flagged, none→not_evaluated)', async () => {
    const { tx, client } = getTx();
    const clauseVersionId = await seedR14(tx);
    await enterAppScope(client, PARIWAR_A);
    const flagged = await bootstrapClaim(client);
    const clear = await bootstrapClaim(client);
    const none = await bootstrapClaim(client);
    await recordConcealmentAssessment(client, { claimCaseId: toClaimId(flagged.claimCaseId), pariwarId: PARIWAR_A, kind: 'linked', noteCiphertext: null, actorId: ACTOR, actorDisplay: DISPLAY, actor: 'operator' });
    await recordConcealmentAssessment(client, { claimCaseId: toClaimId(clear.claimCaseId), pariwarId: PARIWAR_A, kind: 'not_linked', noteCiphertext: null, actorId: ACTOR, actorDisplay: DISPLAY, actor: 'operator' });

    const map = await assessClaimConcealmentBulk(tx, PARIWAR_A, [
      { claimCaseId: toClaimId(flagged.claimCaseId) },
      { claimCaseId: toClaimId(clear.claimCaseId) },
      { claimCaseId: toClaimId(none.claimCaseId) },
    ]);
    expect(map.get(flagged.claimCaseId)).toEqual({ status: 'flagged', clauseVersionId });
    expect(map.get(clear.claimCaseId)).toEqual({ status: 'not_flagged', clauseVersionId });
    expect(map.get(none.claimCaseId)).toEqual({ status: 'not_evaluated' });
  });
});

describe.skipIf(!hasDatabase)('Story 6.15 — trustee R14 clause-version snapshot (AC3) + D1 live-signal gating', () => {
  setupLiveDb();

  /** Bootstrap a REAL-event claim to `verifier_approved`, record a `linked` assessment on it (identity-event
   *  replay needs real prior history — a `seedClaim` direct-insert can't back an assessment write), and
   *  return its id — the D1 "flagged" precondition for a concealment-coded trustee decision. */
  async function seedFlaggedClaim(client: pg.PoolClient): Promise<string> {
    const claim = await bootstrapClaim(client);
    await advanceToVerifierApproved(client, claim.claimCaseId, claim.deceasedMemberId);
    await recordConcealmentAssessment(client, {
      claimCaseId: toClaimId(claim.claimCaseId), pariwarId: PARIWAR_A, kind: 'linked', noteCiphertext: null, actorId: ACTOR, actorDisplay: DISPLAY, actor: 'operator',
    });
    return claim.claimCaseId;
  }

  it('a concealment_upheld deny persists the R14 clause-version snapshot on the decision row (claim is flagged)', async () => {
    const { tx, client } = getTx();
    const clauseVersionId = await seedR14(tx);
    await enterAppScope(client, PARIWAR_A);
    const claimCaseId = await seedFlaggedClaim(client);

    const res = await voteOnFrozenClaim(client, {
      claimCaseId: toClaimId(claimCaseId),
      pariwarId: PARIWAR_A,
      outcome: 'denied',
      reasonCode: 'concealment_upheld',
      rationaleCiphertext: null,
      actorId: TRUSTEE_ACTOR,
      actorDisplay: 'Trustee One',
      actor: 'trustee',
    });
    expect(res.concealmentClauseVersionId).toBe(clauseVersionId);
    expect(res.decision.concealmentClauseVersionId).toBe(clauseVersionId);
    expect(res.decision.reasonCode).toBe('concealment_upheld');
  });

  it('a concealment_override approve persists the R14 clause-version snapshot on the decision row (claim is flagged)', async () => {
    const { tx, client } = getTx();
    const clauseVersionId = await seedR14(tx);
    await enterAppScope(client, PARIWAR_A);
    const claimCaseId = await seedFlaggedClaim(client);

    const res = await voteOnFrozenClaim(client, {
      claimCaseId: toClaimId(claimCaseId),
      pariwarId: PARIWAR_A,
      outcome: 'approved',
      reasonCode: 'concealment_override',
      rationaleCiphertext: null,
      actorId: TRUSTEE_ACTOR,
      actorDisplay: 'Trustee One',
      actor: 'trustee',
    });
    expect(res.decision.concealmentClauseVersionId).toBe(clauseVersionId);
    expect(res.decision.reasonCode).toBe('concealment_override');
  });

  it('a NON-concealment deny leaves the snapshot column null (D1 does not gate generic reason codes)', async () => {
    const { tx, client } = getTx();
    await seedR14(tx);
    const claimCaseId = await seedClaim(tx, PARIWAR_A, { currentState: 'verifier_approved' });
    await enterAppScope(client, PARIWAR_A);
    const res = await voteOnFrozenClaim(client, {
      claimCaseId: toClaimId(claimCaseId), pariwarId: PARIWAR_A, outcome: 'denied', reasonCode: 'documents_insufficient', rationaleCiphertext: null, actorId: TRUSTEE_ACTOR, actorDisplay: 'Trustee One', actor: 'trustee',
    });
    expect(res.decision.concealmentClauseVersionId).toBeNull();
  });

  it('D1 — a concealment reason code on a NEVER-flagged claim is rejected (ConcealmentNotFlaggedError, 409)', async () => {
    const { tx, client } = getTx();
    await seedR14(tx);
    const claimCaseId = await seedClaim(tx, PARIWAR_A, { currentState: 'verifier_approved' });
    await enterAppScope(client, PARIWAR_A);
    await expect(
      voteOnFrozenClaim(client, {
        claimCaseId: toClaimId(claimCaseId), pariwarId: PARIWAR_A, outcome: 'denied', reasonCode: 'concealment_upheld', rationaleCiphertext: null, actorId: TRUSTEE_ACTOR, actorDisplay: 'Trustee One', actor: 'trustee',
      }),
    ).rejects.toBeInstanceOf(ConcealmentNotFlaggedError);
  });

  it('D1 — a concealment reason code on a `not_flagged` claim (a recorded `not_linked` assessment) is rejected', async () => {
    const { tx, client } = getTx();
    await seedR14(tx);
    await enterAppScope(client, PARIWAR_A);
    const claim = await bootstrapClaim(client);
    await advanceToVerifierApproved(client, claim.claimCaseId, claim.deceasedMemberId);
    await recordConcealmentAssessment(client, {
      claimCaseId: toClaimId(claim.claimCaseId), pariwarId: PARIWAR_A, kind: 'not_linked', noteCiphertext: null, actorId: ACTOR, actorDisplay: DISPLAY, actor: 'operator',
    });
    await expect(
      voteOnFrozenClaim(client, {
        claimCaseId: toClaimId(claim.claimCaseId), pariwarId: PARIWAR_A, outcome: 'approved', reasonCode: 'concealment_override', rationaleCiphertext: null, actorId: TRUSTEE_ACTOR, actorDisplay: 'Trustee One', actor: 'trustee',
      }),
    ).rejects.toBeInstanceOf(ConcealmentNotFlaggedError);
  });

  it('D1 — a FORMERLY-flagged claim, revised off `linked`, is rejected (the live signal governs, not history)', async () => {
    const { tx, client } = getTx();
    await seedR14(tx);
    await enterAppScope(client, PARIWAR_A);
    const claim = await bootstrapClaim(client);
    await advanceToVerifierApproved(client, claim.claimCaseId, claim.deceasedMemberId);
    await recordConcealmentAssessment(client, {
      claimCaseId: toClaimId(claim.claimCaseId), pariwarId: PARIWAR_A, kind: 'linked', noteCiphertext: null, actorId: ACTOR, actorDisplay: DISPLAY, actor: 'operator',
    });
    // Revise linked → unable_to_determine: the claim WAS flagged, is no longer.
    await recordConcealmentAssessment(client, {
      claimCaseId: toClaimId(claim.claimCaseId), pariwarId: PARIWAR_A, kind: 'unable_to_determine', noteCiphertext: null, actorId: ACTOR, actorDisplay: DISPLAY, actor: 'operator',
    });
    await expect(
      voteOnFrozenClaim(client, {
        claimCaseId: toClaimId(claim.claimCaseId), pariwarId: PARIWAR_A, outcome: 'denied', reasonCode: 'concealment_upheld', rationaleCiphertext: null, actorId: TRUSTEE_ACTOR, actorDisplay: 'Trustee One', actor: 'trustee',
      }),
    ).rejects.toBeInstanceOf(ConcealmentNotFlaggedError);
  });

  it('D1 — an UNPROVISIONED R14 clause on an otherwise-`linked` claim fails soft to not_evaluated, still rejected (never a null snapshot)', async () => {
    const { client } = getTx();
    // NOTE: no seedR14 — the clause is unprovisioned; a `linked` assessment alone can't make the signal `flagged`.
    await enterAppScope(client, PARIWAR_A);
    const claimCaseId = await seedFlaggedClaim(client);
    await expect(
      voteOnFrozenClaim(client, {
        claimCaseId: toClaimId(claimCaseId), pariwarId: PARIWAR_A, outcome: 'denied', reasonCode: 'concealment_upheld', rationaleCiphertext: null, actorId: TRUSTEE_ACTOR, actorDisplay: 'Trustee One', actor: 'trustee',
      }),
    ).rejects.toBeInstanceOf(ConcealmentNotFlaggedError);
  });

  it('the escalation-resolution path ALSO resolves + persists the R14 snapshot for a concealment-coded decision (the null-snapshot bug this closes)', async () => {
    const { tx, client } = getTx();
    const clauseVersionId = await seedR14(tx);
    await enterAppScope(client, PARIWAR_A);
    const claim = await bootstrapClaim(client);
    // verification_in_progress is escalation-resolvable; record the assessment first (flagged).
    await recordConcealmentAssessment(client, {
      claimCaseId: toClaimId(claim.claimCaseId), pariwarId: PARIWAR_A, kind: 'linked', noteCiphertext: null, actorId: ACTOR, actorDisplay: DISPLAY, actor: 'operator',
    });
    await tx.insert(schema.claimVerifierDecisions).values({
      claimCaseId: toClaimId(claim.claimCaseId),
      pariwarId: PARIWAR_A,
      outcome: 'escalated',
      reasonCode: 'r9_routed_to_voting',
      rationaleCiphertext: null,
      actorId: ACTOR,
      actorDisplay: DISPLAY,
    });

    const res = await resolveEscalation(client, {
      claimCaseId: toClaimId(claim.claimCaseId),
      pariwarId: PARIWAR_A,
      outcome: 'denied',
      reasonCode: 'concealment_upheld',
      rationaleCiphertext: null,
      actorId: TRUSTEE_ACTOR,
      actorDisplay: 'Trustee One',
      actor: 'trustee',
    });
    expect(res.concealmentClauseVersionId).toBe(clauseVersionId);
    expect(res.decision.concealmentClauseVersionId).toBe(clauseVersionId);
  });

  it('the escalation-resolution path ALSO rejects a concealment reason code on a never-flagged claim (D1 applies here too)', async () => {
    const { tx, client } = getTx();
    await seedR14(tx);
    await enterAppScope(client, PARIWAR_A);
    const claim = await bootstrapClaim(client);
    await tx.insert(schema.claimVerifierDecisions).values({
      claimCaseId: toClaimId(claim.claimCaseId),
      pariwarId: PARIWAR_A,
      outcome: 'escalated',
      reasonCode: 'r9_routed_to_voting',
      rationaleCiphertext: null,
      actorId: ACTOR,
      actorDisplay: DISPLAY,
    });
    await expect(
      resolveEscalation(client, {
        claimCaseId: toClaimId(claim.claimCaseId),
        pariwarId: PARIWAR_A,
        outcome: 'denied',
        reasonCode: 'concealment_upheld',
        rationaleCiphertext: null,
        actorId: TRUSTEE_ACTOR,
        actorDisplay: 'Trustee One',
        actor: 'trustee',
      }),
    ).rejects.toBeInstanceOf(ConcealmentNotFlaggedError);
  });
});

describe.skipIf(!hasDatabase)('Story 6.15 — D2 concealment-assessment state-window enforcement', () => {
  setupLiveDb();

  it('rejects recording on a pre-review state (documents_pending, direct-seeded — the guard fires before any write)', async () => {
    const { tx, client } = getTx();
    const claimCaseId = await seedClaim(tx, PARIWAR_A, { currentState: 'documents_pending' });
    await enterAppScope(client, PARIWAR_A);
    await expect(
      recordConcealmentAssessment(client, {
        claimCaseId: toClaimId(claimCaseId), pariwarId: PARIWAR_A, kind: 'linked', noteCiphertext: null, actorId: ACTOR, actorDisplay: DISPLAY, actor: 'operator',
      }),
    ).rejects.toBeInstanceOf(ConcealmentAssessmentBlockedStateError);
  });

  it('rejects recording on a terminal state (settled, direct-seeded — the guard fires before any write)', async () => {
    const { tx, client } = getTx();
    const claimCaseId = await seedClaim(tx, PARIWAR_A, { currentState: 'settled' });
    await enterAppScope(client, PARIWAR_A);
    await expect(
      recordConcealmentAssessment(client, {
        claimCaseId: toClaimId(claimCaseId), pariwarId: PARIWAR_A, kind: 'linked', noteCiphertext: null, actorId: ACTOR, actorDisplay: DISPLAY, actor: 'operator',
      }),
    ).rejects.toBeInstanceOf(ConcealmentAssessmentBlockedStateError);
  });

  it('rejects REVISING an existing assessment once the claim reaches a blocked state (re-checks the LOCKED current state, not a stale read)', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const claim = await bootstrapClaim(client);
    await recordConcealmentAssessment(client, {
      claimCaseId: toClaimId(claim.claimCaseId), pariwarId: PARIWAR_A, kind: 'linked', noteCiphertext: null, actorId: ACTOR, actorDisplay: DISPLAY, actor: 'operator',
    });
    // Force the claim straight to a terminal state via a direct UPDATE (bypassing the projector — test-only).
    await client.query("SET LOCAL app.claim_state_writer = 'on'");
    await tx.update(schema.claims).set({ currentState: 'approved' }).where(eq(schema.claims.claimCaseId, toClaimId(claim.claimCaseId)));
    await client.query("SET LOCAL app.claim_state_writer = 'off'");
    await expect(
      recordConcealmentAssessment(client, {
        claimCaseId: toClaimId(claim.claimCaseId), pariwarId: PARIWAR_A, kind: 'not_linked', noteCiphertext: null, actorId: ACTOR, actorDisplay: DISPLAY, actor: 'operator',
      }),
    ).rejects.toBeInstanceOf(ConcealmentAssessmentBlockedStateError);
  });

  it('permits recording across the active verification/trustee-review window (verification_in_progress → verifier_review)', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const claim = await bootstrapClaim(client); // verification_in_progress
    await expect(
      recordConcealmentAssessment(client, {
        claimCaseId: toClaimId(claim.claimCaseId), pariwarId: PARIWAR_A, kind: 'linked', noteCiphertext: null, actorId: ACTOR, actorDisplay: DISPLAY, actor: 'operator',
      }),
    ).resolves.toBeDefined();

    await projectClaimState(client, {
      claimCaseId: toClaimId(claim.claimCaseId),
      pariwarId: PARIWAR_A,
      deceasedMemberId: toMemberId(claim.deceasedMemberId),
      intakeChannels: ['member_app'],
      claimantActorId: null,
      eventType: 'claim.verifier_reviewing',
      payload: { from_state: 'verification_in_progress', to_state: 'verifier_review', trigger: 'test', actor: 'system' },
      actorId: null,
    });
    // Revise from `verifier_review` (still permitted) — succeeds.
    await expect(
      recordConcealmentAssessment(client, {
        claimCaseId: toClaimId(claim.claimCaseId), pariwarId: PARIWAR_A, kind: 'not_linked', noteCiphertext: null, actorId: ACTOR, actorDisplay: DISPLAY, actor: 'operator',
      }),
    ).resolves.toBeDefined();
  });
});
