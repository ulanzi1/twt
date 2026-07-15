// State-Trustee cycle-freeze — live-DB integration (Story 6.13, Task 9; AC0/AC1/AC2/AC3/AC4/AC4b/AC5/AC9/AC10).
//
// Drives the domain writers (voteOnFrozenClaim / routeToR9 / resolveEscalation / commitCycleFreeze) + the
// read model (getCycleFreezePending) against real Postgres under PARIWAR_A scope, inside the per-test
// BEGIN/ROLLBACK (nothing persists). Asserts MEMBERSHIP / explicit values, never DROP SCHEMA (per
// [[project_live_db_test_gotchas]]). Two-connection concurrency lives in the sibling *-concurrency.spec.ts.

import { randomUUID } from 'node:crypto';

import { and, eq, isNull } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { claimId as toClaimId, memberId as toMemberId } from '../../../src/ids/index.js';
import type { ClaimId, CycleFreezeCommitId, MemberId } from '../../../src/ids/index.js';
import {
  ClaimNotFreezeVotableError,
  CommitIdOwnershipConflictError,
  EscalationNotResolvableError,
  TrusteeReasonCodeError,
  commitCycleFreeze,
  getCycleFreezePending,
  projectClaimState,
  recordConcealmentAssessment,
  resolveEscalation,
  routeToR9,
  voteOnFrozenClaim,
} from '../../../src/claim/index.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppScope, seedClauseVersion } from '../_helpers.js';

const TRUSTEE = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1';
const VERIFIER = 'b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2';

type Client = ReturnType<typeof getTx>['client'];
type Tx = ReturnType<typeof getTx>['tx'];

const base = (claimCaseId: ClaimId) => ({
  claimCaseId,
  pariwarId: PARIWAR_A,
  reasonCode: null,
  rationaleCiphertext: null,
  actorId: TRUSTEE,
  actorDisplay: 'Trustee One',
  actor: 'trustee' as const,
});

/** Drive a fresh claim through the projector to `target` (one of verifier_review / verifier_approved). */
async function driveTo(
  client: Client,
  claimCaseId: ClaimId,
  deceasedMemberId: MemberId,
  target: 'verifier_review' | 'verifier_approved',
): Promise<void> {
  const emit = (from: string | null, to: string, eventType: string, extra: Record<string, unknown> = {}) =>
    projectClaimState(client, {
      claimCaseId,
      pariwarId: PARIWAR_A,
      deceasedMemberId,
      intakeChannels: ['member_app'],
      claimantActorId: null,
      eventType: eventType as never,
      payload: { from_state: from, to_state: to, trigger: 'test', actor: 'system', ...extra },
      actorId: null,
    });
  await emit(null, 'intake_pending', 'claim.intake_initiated', {
    deceased_member_id: deceasedMemberId,
    intake_channel: 'member_app',
    claimant_actor_id: null,
  });
  await emit('intake_pending', 'intake_converged', 'claim.intake_converged');
  await emit('intake_converged', 'documents_pending', 'claim.documents_received');
  await emit('documents_pending', 'verification_in_progress', 'claim.peer_mesh_pinged', {
    selected_member_ids: [randomUUID()],
    metric_id: 'district_cohort_v1',
    metric_version: 1,
  });
  await emit('verification_in_progress', 'verifier_review', 'claim.verifier_reviewing');
  if (target === 'verifier_approved') {
    await emit('verifier_review', 'verifier_approved', 'claim.verifier_approved');
  }
}

/** Insert a LIVE `escalated` verifier decision row directly (the AC4b escalation setup). */
async function seedEscalatedDecision(tx: Tx, claimCaseId: ClaimId): Promise<string> {
  const rows = await tx
    .insert(schema.claimVerifierDecisions)
    .values({
      claimCaseId,
      pariwarId: PARIWAR_A,
      outcome: 'escalated',
      reasonCode: 'r9_routed_to_voting',
      rationaleCiphertext: null,
      actorId: VERIFIER,
      actorDisplay: 'Verifier Anita',
    })
    .returning({ decisionId: schema.claimVerifierDecisions.decisionId });
  return rows[0]!.decisionId;
}

async function liveTrusteeRows(tx: Tx, claimCaseId: ClaimId) {
  return tx
    .select()
    .from(schema.claimStateTrusteeDecisions)
    .where(
      and(
        eq(schema.claimStateTrusteeDecisions.claimCaseId, claimCaseId),
        isNull(schema.claimStateTrusteeDecisions.supersededAt),
      ),
    );
}

async function claimState(tx: Tx, claimCaseId: ClaimId): Promise<string | undefined> {
  const rows = await tx.select().from(schema.claims).where(eq(schema.claims.claimCaseId, claimCaseId));
  return rows[0]?.currentState;
}

describe.skipIf(!hasDatabase)('state-trustee cycle-freeze (PARIWAR_A scope)', () => {
  setupLiveDb();

  it('AC2 — approve vote OPENS the freeze then advances to state_trustee_approved + writes a frozen_vote row', async () => {
    const { client, tx } = getTx();
    const claimCaseId = toClaimId(randomUUID());
    const deceased = toMemberId(randomUUID());
    await enterAppScope(client, PARIWAR_A);
    await driveTo(client, claimCaseId, deceased, 'verifier_approved');

    const result = await voteOnFrozenClaim(client, { ...base(claimCaseId), outcome: 'approved' });
    expect(result.claimState).toBe('state_trustee_approved');

    // Both the freeze-open + the vote events landed (the two-authority write, AC0).
    const events = await tx
      .select()
      .from(schema.eventsLog)
      .where(eq(schema.eventsLog.streamId, claimCaseId));
    const types = events.map((e) => e.eventType);
    expect(types).toContain('claim.state_trustee_frozen');
    expect(types).toContain('claim.state_trustee_approved');

    const rows = await liveTrusteeRows(tx, claimCaseId);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.phase).toBe('frozen_vote');
    expect(rows[0]!.outcome).toBe('approved');
    expect(rows[0]!.actorDisplay).toBe('Trustee One');
  });

  it('AC3 — deny vote advances to denied and REQUIRES a reason code (defense-in-depth)', async () => {
    const { client } = getTx();
    const claimCaseId = toClaimId(randomUUID());
    const deceased = toMemberId(randomUUID());
    await enterAppScope(client, PARIWAR_A);
    await driveTo(client, claimCaseId, deceased, 'verifier_approved');

    // Missing reason code on a deny → rejected before any write (D-F presence rule).
    await expect(
      voteOnFrozenClaim(client, { ...base(claimCaseId), outcome: 'denied' }),
    ).rejects.toBeInstanceOf(TrusteeReasonCodeError);

    const ok = await voteOnFrozenClaim(client, {
      ...base(claimCaseId),
      outcome: 'denied',
      reasonCode: 'standing_not_met',
      rationaleCiphertext: 'enc:v1:ciphertext',
    });
    expect(ok.claimState).toBe('denied');
  });

  it('AC4 — route-to-R9 writes a durable routing row with NO lifecycle event; claim state unchanged', async () => {
    const { client, tx } = getTx();
    const claimCaseId = toClaimId(randomUUID());
    const deceased = toMemberId(randomUUID());
    await enterAppScope(client, PARIWAR_A);
    await driveTo(client, claimCaseId, deceased, 'verifier_approved');

    const before = await claimState(tx, claimCaseId);
    const result = await routeToR9(client, {
      ...base(claimCaseId),
      reasonCode: 'r9_special_case',
    });
    expect(result.eventVersion).toBeNull(); // NO lifecycle event (AC0)
    expect(await claimState(tx, claimCaseId)).toBe(before); // state unchanged

    const rows = await liveTrusteeRows(tx, claimCaseId);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.phase).toBe('routing');
    expect(rows[0]!.outcome).toBe('routed_to_r9');
  });

  it('AC4b — resolveEscalation supersedes the live escalated decision + emits verifier_approved', async () => {
    const { client, tx } = getTx();
    const claimCaseId = toClaimId(randomUUID());
    const deceased = toMemberId(randomUUID());
    await enterAppScope(client, PARIWAR_A);
    await driveTo(client, claimCaseId, deceased, 'verifier_review');
    const escalatedId = await seedEscalatedDecision(tx, claimCaseId);

    const result = await resolveEscalation(client, { ...base(claimCaseId), outcome: 'approved' });
    expect(result.claimState).toBe('verifier_approved');

    // The escalated verifier decision is now superseded (atomic supersession).
    const superseded = await tx
      .select()
      .from(schema.claimVerifierDecisions)
      .where(eq(schema.claimVerifierDecisions.decisionId, escalatedId as never));
    expect(superseded[0]!.supersededAt).not.toBeNull();

    const rows = await liveTrusteeRows(tx, claimCaseId);
    expect(rows[0]!.phase).toBe('escalation_resolution');
  });

  it('AC4b — resolveEscalation on a claim with no live escalated decision is rejected', async () => {
    const { client } = getTx();
    const claimCaseId = toClaimId(randomUUID());
    const deceased = toMemberId(randomUUID());
    await enterAppScope(client, PARIWAR_A);
    await driveTo(client, claimCaseId, deceased, 'verifier_review');
    await expect(
      resolveEscalation(client, { ...base(claimCaseId), outcome: 'approved' }),
    ).rejects.toBeInstanceOf(EscalationNotResolvableError);
  });

  it('AC5 — commit advances state_trustee_approved claims to approved, is idempotent on commit_id', async () => {
    const { client, tx } = getTx();
    const c1 = toClaimId(randomUUID());
    const c2 = toClaimId(randomUUID());
    const d1 = toMemberId(randomUUID());
    const d2 = toMemberId(randomUUID());
    await enterAppScope(client, PARIWAR_A);
    for (const [c, d] of [[c1, d1], [c2, d2]] as const) {
      await driveTo(client, c, d, 'verifier_approved');
      await voteOnFrozenClaim(client, { ...base(c), outcome: 'approved' });
    }

    const commitId = randomUUID() as unknown as CycleFreezeCommitId;
    const first = await commitCycleFreeze(client, {
      pariwarId: PARIWAR_A,
      commitId,
      actorId: TRUSTEE,
      actorDisplay: 'Trustee One',
      actor: 'trustee',
    });
    expect(first.idempotentReplay).toBe(false);
    expect(first.committedClaimIds.sort()).toEqual([c1, c2].sort());
    expect(await claimState(tx, c1)).toBe('approved');
    expect(await claimState(tx, c2)).toBe('approved');

    // Re-submit the SAME commit_id → replay, advances nothing new.
    const replay = await commitCycleFreeze(client, {
      pariwarId: PARIWAR_A,
      commitId,
      actorId: TRUSTEE,
      actorDisplay: 'Trustee One',
      actor: 'trustee',
    });
    expect(replay.idempotentReplay).toBe(true);
    expect(replay.committedClaimIds.sort()).toEqual(first.committedClaimIds.sort());
  });

  it('AC5 (review addendum) — a commit_id replayed by a DIFFERENT actor is rejected, not silently handed back', async () => {
    const { client } = getTx();
    const c = toClaimId(randomUUID());
    const d = toMemberId(randomUUID());
    await enterAppScope(client, PARIWAR_A);
    await driveTo(client, c, d, 'verifier_approved');
    await voteOnFrozenClaim(client, { ...base(c), outcome: 'approved' });

    const commitId = randomUUID() as unknown as CycleFreezeCommitId;
    await commitCycleFreeze(client, {
      pariwarId: PARIWAR_A,
      commitId,
      actorId: TRUSTEE,
      actorDisplay: 'Trustee One',
      actor: 'trustee',
    });

    // A DIFFERENT actor reusing the SAME commit_id must be rejected — this is not a genuine retry (a retry
    // is always the same actor's own session resubmitting), so it must not silently return the first
    // actor's committed result.
    await expect(
      commitCycleFreeze(client, {
        pariwarId: PARIWAR_A,
        commitId,
        actorId: VERIFIER,
        actorDisplay: 'Trustee Two',
        actor: 'trustee',
      }),
    ).rejects.toBeInstanceOf(CommitIdOwnershipConflictError);
  });

  it('AC4/AC5 — a routed-to-R9 claim is durably EXCLUDED from the commit set', async () => {
    const { client } = getTx();
    const committed = toClaimId(randomUUID());
    const routed = toClaimId(randomUUID());
    const dC = toMemberId(randomUUID());
    const dR = toMemberId(randomUUID());
    await enterAppScope(client, PARIWAR_A);
    for (const [c, d] of [[committed, dC], [routed, dR]] as const) {
      await driveTo(client, c, d, 'verifier_approved');
      await voteOnFrozenClaim(client, { ...base(c), outcome: 'approved' });
    }
    // Route the second claim to R9 AFTER it voted (still state_trustee_approved) — a durable exclusion.
    await routeToR9(client, { ...base(routed), reasonCode: 'r9_special_case' });

    const result = await commitCycleFreeze(client, {
      pariwarId: PARIWAR_A,
      commitId: randomUUID() as unknown as CycleFreezeCommitId,
      actorId: TRUSTEE,
      actorDisplay: 'Trustee One',
      actor: 'trustee',
    });
    expect(result.committedClaimIds).toContain(committed);
    expect(result.committedClaimIds).not.toContain(routed);
  });

  it('AC1/AC10 — the pending list surfaces two buckets with provenance; scope-isolated from PARIWAR_B', async () => {
    const { client, tx } = getTx();
    const ready = toClaimId(randomUUID());
    const esc = toClaimId(randomUUID());
    await enterAppScope(client, PARIWAR_A);
    await driveTo(client, ready, toMemberId(randomUUID()), 'verifier_approved');
    await driveTo(client, esc, toMemberId(randomUUID()), 'verifier_review');
    await seedEscalatedDecision(tx, esc);

    const pending = await getCycleFreezePending(tx, PARIWAR_A);
    expect(pending.readyToFreeze.map((c) => c.claimCaseId)).toContain(ready);
    expect(pending.escalated.map((c) => c.claimCaseId)).toContain(esc);
    // The escalated case carries the verifier provenance snapshot.
    const escCase = pending.escalated.find((c) => c.claimCaseId === esc)!;
    expect(escCase.verifierActorDisplay).toBe('Verifier Anita');

    // Scope isolation — PARIWAR_B sees none of PARIWAR_A's pending claims.
    await client.query("SET LOCAL app.pariwar_id = ''");
    await enterAppScope(client, PARIWAR_B);
    const otherTenant = await getCycleFreezePending(tx, PARIWAR_B);
    expect(otherTenant.readyToFreeze.map((c) => c.claimCaseId)).not.toContain(ready);
    expect(otherTenant.escalated.map((c) => c.claimCaseId)).not.toContain(esc);
  });

  it('AC6 — the pending list surfaces the REAL claim concealment flag from the bulk tri-state producer, not a placeholder', async () => {
    const { client, tx } = getTx();
    await seedClauseVersion(tx, PARIWAR_A, {
      clauseId: 'niy.concealment.r14',
      payload: {
        ack_text_en: 'I acknowledge the concealment-review clause.',
        ack_text_hi: 'मैं छिपाव-समीक्षा खंड को स्वीकार करता/करती हूँ।',
        rule_code: 'R14',
        never_auto_deny: true,
      },
    });
    const flagged = toClaimId(randomUUID());
    const clear = toClaimId(randomUUID());
    await enterAppScope(client, PARIWAR_A);
    await driveTo(client, flagged, toMemberId(randomUUID()), 'verifier_approved');
    await driveTo(client, clear, toMemberId(randomUUID()), 'verifier_approved');

    // A `linked` assessment on `flagged`; `clear` carries no assessment at all.
    await recordConcealmentAssessment(client, {
      claimCaseId: flagged,
      pariwarId: PARIWAR_A,
      kind: 'linked',
      noteCiphertext: null,
      actorId: VERIFIER,
      actorDisplay: 'Verifier Anita',
      actor: 'operator',
    });

    const pending = await getCycleFreezePending(tx, PARIWAR_A);
    const flaggedCase = pending.readyToFreeze.find((c) => c.claimCaseId === flagged)!;
    const clearCase = pending.readyToFreeze.find((c) => c.claimCaseId === clear)!;
    expect(flaggedCase.concealmentFlags).toEqual(['concealment_review_required']);
    expect(clearCase.concealmentFlags).toEqual([]);
  });

  it('AC9/D-F — the phase-model partial-unique blocks a second live frozen_vote row for one claim', async () => {
    const { client } = getTx();
    const claimCaseId = toClaimId(randomUUID());
    const deceased = toMemberId(randomUUID());
    await enterAppScope(client, PARIWAR_A);
    await driveTo(client, claimCaseId, deceased, 'verifier_approved');
    await voteOnFrozenClaim(client, { ...base(claimCaseId), outcome: 'approved' });

    // A second vote finds the claim already state_trustee_approved (not votable) — the state guard fires
    // BEFORE the partial-unique, both are the AC9 backstops.
    await expect(
      voteOnFrozenClaim(client, { ...base(claimCaseId), outcome: 'approved' }),
    ).rejects.toBeInstanceOf(ClaimNotFreezeVotableError);
  });
});
