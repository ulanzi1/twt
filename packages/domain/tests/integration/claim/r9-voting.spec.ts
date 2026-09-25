// R9 special-case voting — live-DB integration (Story 6.14, Task 11; AC1/AC2/AC3/AC4/AC5/AC8/AC10).
//
// Drives the domain writers (openR9VotingSession / castR9Vote / finalizeR9Outcome / cancelR9VotingSession)
// + the read models (getR9VotingQueue / getR9Panel / getR9VotesByTrustee) against real Postgres under
// PARIWAR_A scope, inside the per-test BEGIN/ROLLBACK. Asserts MEMBERSHIP / explicit values, never DROP
// SCHEMA. Two-connection concurrency lives in the sibling *-concurrency.spec.ts.

import { randomUUID } from 'node:crypto';

import { and, eq, isNull } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { claimId as toClaimId, memberId as toMemberId } from '../../../src/ids/index.js';
import type { ClaimId, MemberId, R9VotingSessionId } from '../../../src/ids/index.js';
import {
  cancelR9VotingSession,
  castR9Vote,
  finalizeR9Outcome,
  getR9Panel,
  getR9VotesByTrustee,
  getR9VotingQueue,
  openR9VotingSession,
  prepareR9VoteCiphertext,
  projectClaimState,
  r9QuorumFor,
  R9ActorNotOnPanelError,
  R9ClaimNoLongerRoutableError,
  R9ClaimNotRoutedError,
  R9ClauseNotVotableError,
  R9NoLiveSessionError,
  R9PanelEmptyError,
  R9PanelMemberUnauthorizedError,
  R9QuorumNotMetError,
  R9RationaleRequiredError,
  R9SessionAlreadySupersededError,
  R9SessionExistsError,
  R9SessionFinalizedError,
  DeathCertificateAcceptanceRequiredError,
} from '../../../src/claim/index.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import {
  PARIWAR_A,
  enterAppScope,
  seedAcceptedDeathCertificate,
  seedClauseVersion,
  seedDeathCertificate,
  seedRejectedDeathCertificate,
  seedNomineeDeclaration,
  seedNomineeDetermination,
  seedNomineeNameCheck,
  seedRoleGrant,
} from '../_helpers.js';
import { bindScopedDb } from '../../../src/db.js';

const TRUSTEE = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1';
const PANEL = [
  'c1c1c1c1-c1c1-c1c1-c1c1-c1c1c1c1c1c1',
  'c2c2c2c2-c2c2-c2c2-c2c2-c2c2c2c2c2c2',
  'c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3',
];
const R9_CLAUSE = 'niy.special-death.r9';
const CIPHER = prepareR9VoteCiphertext('enc:v1:fake-ciphertext');

type Client = ReturnType<typeof getTx>['client'];
type Tx = ReturnType<typeof getTx>['tx'];

const openBase = (claimCaseId: ClaimId) => ({
  claimCaseId,
  pariwarId: PARIWAR_A,
  clauseId: R9_CLAUSE,
  panelActorIds: PANEL,
  actorId: TRUSTEE,
  actorDisplay: 'Trustee One',
  actor: 'trustee' as const,
});

const voteBase = (claimCaseId: ClaimId, voter: string, vote: 'approve' | 'deny') => ({
  claimCaseId,
  pariwarId: PARIWAR_A,
  vote,
  rationaleCiphertext: CIPHER,
  actorId: voter,
  actorDisplay: `Panelist ${voter.slice(0, 4)}`,
  actor: 'trustee' as const,
});

const finalizeBase = (claimCaseId: ClaimId, finalizer: string) => ({
  claimCaseId,
  pariwarId: PARIWAR_A,
  actorId: finalizer,
  actorDisplay: `Panelist ${finalizer.slice(0, 4)}`,
  actor: 'trustee' as const,
});

/** Drive a fresh claim to verifier_approved via the projector. */
async function driveToApproved(
  client: Client,
  claimCaseId: ClaimId,
  deceased: MemberId,
  /** ⭐ Skip the name-check seed, to reach an UNCHECKED routed claim — the state P4 exists to
   *  refuse. ⚠ `events_log` is APPEND-ONLY (DELETE is revoked for `twt_app`, 42501), so a check
   *  already recorded ⛔ cannot be removed afterwards; it has to be never written.
   *  [[project_live_db_test_gotchas]] */
  skipCheck = false,
  /** Story 6.21a — `'skip'` reaches a claim with ⛔ no accepted death certificate (and so no determination). */
  certificate: 'accepted' | 'skip' = 'accepted',
): Promise<void> {
  const emit = (from: string | null, to: string, eventType: string, extra: Record<string, unknown> = {}) =>
    projectClaimState(client, {
      claimCaseId,
      pariwarId: PARIWAR_A,
      deceasedMemberId: deceased,
      intakeChannels: ['member_app'],
      claimantActorId: null,
      eventType: eventType as never,
      payload: { from_state: from, to_state: to, trigger: 'test', actor: 'system', ...extra },
      actorId: null,
    });
  await emit(null, 'intake_pending', 'claim.intake_initiated', {
    deceased_member_id: deceased,
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
  await emit('verifier_review', 'verifier_approved', 'claim.verifier_approved');
  // Story 6.18 (AC4) — a claim is only approvable once it carries its two bank accounts and a
  // current, PASSING District Admin name check. Seeded through the REAL writer, so these specs keep
  // exercising the production path rather than bypassing the new gate.
  if (!skipCheck) {
    await seedNomineeNameCheck(client, PARIWAR_A, claimCaseId, { certificate });
  } else {
    // ⭐ Story 6.20 (AC5, T16) — "never CHECKED" is only reachable on a DETERMINED claim: the gate asks
    // for the as-at-death determination BEFORE the check, so skipping the check must not also skip the
    // determination, or the 409 is `nominee_determination_required` — a different fact.
    await seedNomineeDeclaration(bindScopedDb(client), PARIWAR_A, deceased);
    await seedNomineeDetermination(client, PARIWAR_A, claimCaseId);
  }
}

/** Insert the live routed_to_r9 routing row directly (6.13's routeToR9 output). */
async function insertRoutedRow(tx: Tx, claimCaseId: ClaimId): Promise<void> {
  await tx.insert(schema.claimStateTrusteeDecisions).values({
    claimCaseId,
    pariwarId: PARIWAR_A,
    phase: 'routing',
    outcome: 'routed_to_r9',
    reasonCode: 'r9_special_case',
    rationaleCiphertext: null,
    actorId: TRUSTEE,
    actorDisplay: 'Trustee One',
  });
}

/** Full setup: seed clause + panel grants (pre-scope), enter scope, drive claim, insert routing row. */
async function setupRoutedClaim(
  client: Client,
  tx: Tx,
  opts: { clauseVersion?: number; skipCheck?: boolean; certificate?: 'accepted' | 'skip' } = {},
): Promise<{ claimCaseId: ClaimId; deceased: MemberId }> {
  await seedClauseVersion(tx, PARIWAR_A, {
    clauseId: R9_CLAUSE,
    version: opts.clauseVersion ?? 1,
    payload: { rule_code: 'R9', voting_required: true, majority_required: true, on_pass: 'route_r9_voting' },
  });
  for (const uid of PANEL) {
    await seedRoleGrant(tx, PARIWAR_A, { userId: uid, role: 'pariwar_admin', scopeDimension: 'pariwar', scopeValue: PARIWAR_A });
  }
  await enterAppScope(client, PARIWAR_A);
  const claimCaseId = toClaimId(randomUUID());
  const deceased = toMemberId(randomUUID());
  await driveToApproved(client, claimCaseId, deceased, opts.skipCheck === true, opts.certificate ?? 'accepted');
  await insertRoutedRow(tx, claimCaseId);
  return { claimCaseId, deceased };
}

async function liveVotes(tx: Tx, sessionId: R9VotingSessionId) {
  return tx
    .select()
    .from(schema.claimR9Votes)
    .where(and(eq(schema.claimR9Votes.sessionId, sessionId), isNull(schema.claimR9Votes.supersededAt)));
}

async function claimState(tx: Tx, claimCaseId: ClaimId): Promise<string | undefined> {
  const rows = await tx.select().from(schema.claims).where(eq(schema.claims.claimCaseId, claimCaseId));
  return rows[0]?.currentState;
}

describe.skipIf(!hasDatabase)('R9 voting (PARIWAR_A scope)', () => {
  setupLiveDb();

  // ── AC2 — open ──
  it('AC2 — open snapshots the clause version + rule_code + voting_requirement + quorum + immutable panel', async () => {
    const { client, tx } = getTx();
    const { claimCaseId } = await setupRoutedClaim(client, tx);

    const { session } = await openR9VotingSession(client, openBase(claimCaseId));
    expect(session.clauseId).toBe(R9_CLAUSE);
    expect(session.ruleCode).toBe('R9');
    expect(session.votingRequirement).toBe('majority');
    expect(session.quorumRequired).toBe(2); // ⌊3/2⌋+1
    expect(session.panelActorIds).toEqual(PANEL);
    expect(session.clauseVersionId).toBeTruthy();
    expect(session.outcome).toBeNull();
  });

  it('AC2 — rejects a non-R9 clause / empty panel / unauthorized panel member / un-routed claim / duplicate session', async () => {
    const { client, tx } = getTx();
    const { claimCaseId } = await setupRoutedClaim(client, tx);

    await expect(openR9VotingSession(client, { ...openBase(claimCaseId), clauseId: 'niy.special-death.r5-e' })).rejects.toBeInstanceOf(
      R9ClauseNotVotableError,
    );
    await expect(openR9VotingSession(client, { ...openBase(claimCaseId), panelActorIds: [] })).rejects.toBeInstanceOf(R9PanelEmptyError);
    // A panelist with no claim.r9_vote grant.
    await expect(
      openR9VotingSession(client, { ...openBase(claimCaseId), panelActorIds: [...PANEL, randomUUID()] }),
    ).rejects.toBeInstanceOf(R9PanelMemberUnauthorizedError);

    // Open once (ok), then a second open is a conflict.
    await openR9VotingSession(client, openBase(claimCaseId));
    await expect(openR9VotingSession(client, openBase(claimCaseId))).rejects.toBeInstanceOf(R9SessionExistsError);
  });

  it('AC2 — de-duplicates a panel roster containing repeated actor ids (defense-in-depth beyond the contract layer)', async () => {
    const { client, tx } = getTx();
    const { claimCaseId } = await setupRoutedClaim(client, tx);
    const { session } = await openR9VotingSession(client, {
      ...openBase(claimCaseId),
      panelActorIds: [PANEL[0]!, PANEL[0]!, PANEL[1]!],
    });
    expect(session.panelActorIds).toEqual([PANEL[0], PANEL[1]]);
    expect(session.quorumRequired).toBe(r9QuorumFor(2));
  });

  it('AC2 — a claim with NO live routed_to_r9 row is not in the queue (not openable)', async () => {
    const { client, tx } = getTx();
    await seedClauseVersion(tx, PARIWAR_A, {
      clauseId: R9_CLAUSE,
      payload: { rule_code: 'R9', voting_required: true, majority_required: true, on_pass: 'route_r9_voting' },
    });
    for (const uid of PANEL) {
      await seedRoleGrant(tx, PARIWAR_A, { userId: uid, role: 'pariwar_admin', scopeDimension: 'pariwar', scopeValue: PARIWAR_A });
    }
    await enterAppScope(client, PARIWAR_A);
    const claimCaseId = toClaimId(randomUUID());
    await driveToApproved(client, claimCaseId, toMemberId(randomUUID()));
    // NO routing row inserted.
    await expect(openR9VotingSession(client, openBase(claimCaseId))).rejects.toBeInstanceOf(R9ClaimNotRoutedError);
  });

  // ── AC3 — vote ──
  it('AC3 — a non-panel actor cannot vote; rationale is required; a revise supersedes (one live vote)', async () => {
    const { client, tx } = getTx();
    const { claimCaseId } = await setupRoutedClaim(client, tx);
    const { session } = await openR9VotingSession(client, openBase(claimCaseId));

    // A non-panel r9_vote holder is rejected.
    const outsider = randomUUID();
    await seedRoleGrant(tx, PARIWAR_A, { userId: outsider, role: 'pariwar_admin', scopeDimension: 'pariwar', scopeValue: PARIWAR_A });
    await expect(castR9Vote(client, voteBase(claimCaseId, outsider, 'approve'))).rejects.toBeInstanceOf(R9ActorNotOnPanelError);

    // Empty ciphertext → rationale required. (A real caller can never construct an empty
    // PreparedR9VoteCiphertext — prepareR9VoteCiphertext itself rejects empty input — so this simulates a
    // type-system bypass to prove the domain write-path's own defense-in-depth still catches it.)
    await expect(
      castR9Vote(client, {
        ...voteBase(claimCaseId, PANEL[0]!, 'approve'),
        rationaleCiphertext: '' as unknown as ReturnType<typeof prepareR9VoteCiphertext>,
      }),
    ).rejects.toBeInstanceOf(R9RationaleRequiredError);

    // Cast, then revise — one live vote, the prior superseded, copies the session clause_version_id.
    const first = await castR9Vote(client, voteBase(claimCaseId, PANEL[0]!, 'approve'));
    expect(first.revised).toBe(false);
    expect(first.vote.clauseVersionId).toBe(session.clauseVersionId);
    const revised = await castR9Vote(client, voteBase(claimCaseId, PANEL[0]!, 'deny'));
    expect(revised.revised).toBe(true);
    expect(revised.vote.supersedesVoteId).toBe(first.vote.voteId);

    const live = await liveVotes(tx, session.sessionId);
    expect(live).toHaveLength(1);
    expect(live[0]!.vote).toBe('deny');
  });

  // ── Story 6.18 (AC4) — P4: R9 is its OWN path to approval and must pass the name-check gate ──
  it('⭐⭐ Story 6.18 P4 — an R9 APPROVE is refused without a current, passing name check, and nothing is written', async () => {
    const { client, tx } = getTx();
    // ⭐ `setupRoutedClaim` seeds a passing check (the shared fixture does), so this test REMOVES it
    // to reach the unchecked state. R9 bypasses the District Admin's verification approval entirely,
    // so without P4 an R9-approved claim would land in the committable set having never had its
    // nominee name looked at by anybody.
    const { claimCaseId } = await setupRoutedClaim(client, tx);
    const stateBefore = await claimState(tx, claimCaseId);
    await tx
      .delete(schema.claimNomineeBankAccounts)
      .where(
        and(
          eq(schema.claimNomineeBankAccounts.pariwarId, PARIWAR_A),
          eq(schema.claimNomineeBankAccounts.claimCaseId, claimCaseId),
        ),
      );

    await openR9VotingSession(client, openBase(claimCaseId));
    await castR9Vote(client, voteBase(claimCaseId, PANEL[0]!, 'approve'));
    await castR9Vote(client, voteBase(claimCaseId, PANEL[1]!, 'approve'));

    await expect(finalizeR9Outcome(client, finalizeBase(claimCaseId, PANEL[0]!))).rejects.toMatchObject({
      name: 'NomineeBankAccountsRequiredError',
    });

    // ⭐ AND THE REFUSAL IS CLEAN: the gate runs BEFORE any write, so there is no orphaned session
    // outcome, no lifecycle event and no metadata row to reconcile later.
    //
    // ⚠⚠ THE STATE ASSERTION WAS `not.toBe('state_trustee_approved')` (corrected 2026-09-22), which
    // passes for a claim that moved somewhere else ENTIRELY — `denied`, `settled`, anything. ⭐ It
    // is EQUALITY with the prior state now, which is the property *"nothing was written"* actually
    // means. And the promised *"no orphaned session outcome, no metadata row"* was ⛔ never queried
    // at all — both are read below.
    expect(await claimState(tx, claimCaseId)).toBe(stateBefore);
    const events = await tx
      .select({ t: schema.eventsLog.eventType })
      .from(schema.eventsLog)
      .where(and(eq(schema.eventsLog.pariwarId, PARIWAR_A), eq(schema.eventsLog.streamId, claimCaseId)));
    expect(events.map((e) => e.t)).not.toContain('claim.r9_outcome');

    // ⭐ THE SESSION OUTCOME IS STILL NULL — a finalize that recorded its verdict and then refused
    // would leave the panel unable to vote again on a claim it had never actually decided.
    const sessions = await tx
      .select({ outcome: schema.claimR9VotingSessions.outcome })
      .from(schema.claimR9VotingSessions)
      .where(
        and(
          eq(schema.claimR9VotingSessions.pariwarId, PARIWAR_A),
          eq(schema.claimR9VotingSessions.claimCaseId, claimCaseId),
        ),
      );
    expect(sessions.length, 'no session — the assertion below would be vacuous').toBeGreaterThan(0);
    for (const row of sessions) expect(row.outcome, 'an ORPHANED session outcome was written').toBeNull();

    // ⛔ …and ⛔ no `r9_outcome` metadata row either.
    const decisions = await tx
      .select({ phase: schema.claimStateTrusteeDecisions.phase })
      .from(schema.claimStateTrusteeDecisions)
      .where(
        and(
          eq(schema.claimStateTrusteeDecisions.pariwarId, PARIWAR_A),
          eq(schema.claimStateTrusteeDecisions.claimCaseId, claimCaseId),
        ),
      );
    expect(decisions.map((d) => d.phase)).not.toContain('r9_outcome');
  });

  // ── P4's REMAINING CELLS — the gate matrix, at the path that bypasses P1 entirely ───────────
  //
  // ⚠⚠ P4 had ONE cell: accounts-deleted. ⛔ No test covered a MISSING check, a STALE one, or a
  // `does_not_match` at this gate — and P4 is the ⛔ only gate that catches an APPEAL REVERSAL
  // (which re-enters the votable set without passing P1) or a D5 post-approval correction. ⇒ the
  // three untested cells were precisely the ones P4 exists for.
  const P4_DEFICIENCIES = [
    {
      key: 'the accounts are there but the check was NEVER recorded',
      error: 'NomineeNameCheckRequiredError',
      skipCheck: true,
      // ⚠⚠ THE ACCOUNTS HAVE TO BE PUT BACK BY HAND, and the reason is worth stating: the shared
      // `seedNomineeNameCheck` fixture seeds the two ACCOUNTS **and** the check together, so
      // skipping it removes both — and the accounts guard runs FIRST, giving
      // `NomineeBankAccountsRequiredError`. ⇒ skipping alone tests the WRONG guard. To isolate the
      // never-checked rule the accounts must exist and the check must not.
      spoil: async (tx: Tx, claimCaseId: ClaimId) => {
        await tx.insert(schema.claimNomineeBankAccounts).values(
          [1, 2].map((rank) => ({
            claimCaseId,
            pariwarId: PARIWAR_A,
            accountRank: rank,
            accountHolderNameCiphertext: `enc:v1:holder-${rank}`,
            accountNumberCiphertext: `enc:v1:acct-${rank}`,
            ifscCiphertext: `enc:v1:ifsc-${rank}`,
            bankName: rank === 1 ? 'State Bank of India' : 'HDFC Bank',
            ifscValidated: true,
          })),
        );
      },
    },
    {
      key: 'the check went STALE (a D5 correction after the routing)',
      error: 'NomineeNameCheckRequiredError',
      skipCheck: false,
      spoil: async (tx: Tx, claimCaseId: ClaimId) => {
        await tx
          .update(schema.claimNomineeBankAccounts)
          .set({ updatedAt: new Date(Date.now() + 60_000) })
          .where(
            and(
              eq(schema.claimNomineeBankAccounts.pariwarId, PARIWAR_A),
              eq(schema.claimNomineeBankAccounts.claimCaseId, claimCaseId),
            ),
          );
      },
    },
    {
      // ⭐ ADDED 2026-09-22 (code review) — the parallel P1/P3 gate-matrix table
      // (`nominee-name-check.spec.ts`) has an "ONE account only" cell; this file's P4 table did not,
      // though `assertNomineeNameCheckForApproval` checks `liveAccounts.length !== 2` FIRST, before
      // it ever looks at the check — so an R9 approval on a claim with exactly one bank account was
      // untested at THIS gate specifically.
      key: 'only ONE account remains (cl.7 makes BOTH mandatory)',
      error: 'NomineeBankAccountsRequiredError',
      skipCheck: false,
      spoil: async (tx: Tx, claimCaseId: ClaimId) => {
        await tx
          .delete(schema.claimNomineeBankAccounts)
          .where(
            and(
              eq(schema.claimNomineeBankAccounts.pariwarId, PARIWAR_A),
              eq(schema.claimNomineeBankAccounts.claimCaseId, claimCaseId),
              eq(schema.claimNomineeBankAccounts.accountRank, 2),
            ),
          );
      },
    },
  ] as const;

  for (const d of P4_DEFICIENCIES) {
    it(`⭐ Story 6.18 P4 — an R9 APPROVE is refused when ${d.key}`, async () => {
      const { client, tx } = getTx();
      const { claimCaseId } = await setupRoutedClaim(client, tx, { skipCheck: d.skipCheck });
      const stateBefore = await claimState(tx, claimCaseId);
      await d.spoil(tx, claimCaseId);

      await openR9VotingSession(client, openBase(claimCaseId));
      await castR9Vote(client, voteBase(claimCaseId, PANEL[0]!, 'approve'));
      await castR9Vote(client, voteBase(claimCaseId, PANEL[1]!, 'approve'));

      await expect(
        finalizeR9Outcome(client, finalizeBase(claimCaseId, PANEL[0]!)),
      ).rejects.toMatchObject({ name: d.error });
      expect(await claimState(tx, claimCaseId)).toBe(stateBefore);
    });
  }

  // ── Story 6.21a (D7; AC2, AC8(iii)) — P4 × the death-certificate reasons, then a PASS ─────────────
  // R9 bypasses P1 entirely, so an R9 approval must meet the certificate conjunct on its own path. Each row
  // starts from a fully approvable routed claim and spoils exactly the certificate (⛔ never denied: it WAITS).
  const P4_CERTIFICATE_DEFICIENCIES = [
    { label: 'no certificate at all', reason: 'no_certificate', certificate: 'skip' as const, spoil: async () => {} },
    {
      label: 'a replacement nobody has reviewed',
      reason: 'not_reviewed',
      certificate: 'accepted' as const,
      spoil: async (client: Client, claimCaseId: ClaimId) => {
        await seedDeathCertificate(client, { pariwarId: PARIWAR_A, claimCaseId });
      },
    },
    {
      label: 'a REJECTED certificate',
      reason: 'rejected',
      certificate: 'accepted' as const,
      spoil: async (client: Client, claimCaseId: ClaimId) => {
        await seedRejectedDeathCertificate(client, { pariwarId: PARIWAR_A, claimCaseId });
      },
    },
    {
      label: 'a determination made against an EARLIER review',
      reason: 'determination_stale',
      certificate: 'accepted' as const,
      spoil: async (client: Client, claimCaseId: ClaimId) => {
        await seedAcceptedDeathCertificate(client, { pariwarId: PARIWAR_A, claimCaseId, date: '2026-03-10' });
      },
    },
    {
      label: 'a NULL determination link (0119-era)',
      reason: 'determination_stale',
      certificate: 'accepted' as const,
      spoil: async (client: Client, claimCaseId: ClaimId) => {
        await client.query('RESET ROLE');
        await client.query(
          'UPDATE nominee_determinations SET death_certificate_review_id = NULL WHERE claim_case_id = $1 AND superseded_at IS NULL',
          [claimCaseId],
        );
        await enterAppScope(client, PARIWAR_A);
      },
    },
  ] as const;

  for (const d of P4_CERTIFICATE_DEFICIENCIES) {
    it(`⭐ Story 6.21a P4 — an R9 APPROVE is refused on ${d.label} (\`${d.reason}\`), and the claim WAITS`, async () => {
      const { client, tx } = getTx();
      const { claimCaseId } = await setupRoutedClaim(client, tx, { certificate: d.certificate });
      const stateBefore = await claimState(tx, claimCaseId);
      await d.spoil(client, claimCaseId);

      await openR9VotingSession(client, openBase(claimCaseId));
      await castR9Vote(client, voteBase(claimCaseId, PANEL[0]!, 'approve'));
      await castR9Vote(client, voteBase(claimCaseId, PANEL[1]!, 'approve'));

      await expect(finalizeR9Outcome(client, finalizeBase(claimCaseId, PANEL[0]!))).rejects.toSatisfy(
        (err: unknown) => err instanceof DeathCertificateAcceptanceRequiredError && err.reason === d.reason,
      );
      expect(await claimState(tx, claimCaseId)).toBe(stateBefore);
    });
  }

  it('⭐ Story 6.21a P4 — with the certificate ACCEPTED and the determination made against it, the R9 approval PASSES (the positive control)', async () => {
    const { client, tx } = getTx();
    const { claimCaseId } = await setupRoutedClaim(client, tx);
    await openR9VotingSession(client, openBase(claimCaseId));
    await castR9Vote(client, voteBase(claimCaseId, PANEL[0]!, 'approve'));
    await castR9Vote(client, voteBase(claimCaseId, PANEL[1]!, 'approve'));
    await finalizeR9Outcome(client, finalizeBase(claimCaseId, PANEL[0]!));
    expect(await claimState(tx, claimCaseId)).toBe('state_trustee_approved');
  });

  it('⭐⭐ Story 6.18 P4 — an R9 APPROVE is refused on a `does_not_match` (cl.5 — it WAITS)', async () => {
    // ⚠ Re-recording the verdict through the REAL writer, ⛔ not by spoiling a column: the point is
    // that a District Admin's honest *"these are not the same person"* stops an R9 approval, and it
    // must stop it WITHOUT the claim being denied or moved.
    const { client, tx } = getTx();
    const { claimCaseId } = await setupRoutedClaim(client, tx);
    const stateBefore = await claimState(tx, claimCaseId);
    await seedNomineeNameCheck(client, PARIWAR_A, claimCaseId, {
      verdicts: ['matches', 'does_not_match'],
      reuseAccounts: true,
    });

    await openR9VotingSession(client, openBase(claimCaseId));
    await castR9Vote(client, voteBase(claimCaseId, PANEL[0]!, 'approve'));
    await castR9Vote(client, voteBase(claimCaseId, PANEL[1]!, 'approve'));

    await expect(
      finalizeR9Outcome(client, finalizeBase(claimCaseId, PANEL[0]!)),
    ).rejects.toMatchObject({ name: 'NomineeNameCheckRequiredError' });
    // ⭐ IT WAITS — ⛔ not denied, ⛔ not moved.
    expect(await claimState(tx, claimCaseId)).toBe(stateBefore);
    const types = await tx
      .select({ t: schema.eventsLog.eventType })
      .from(schema.eventsLog)
      .where(and(eq(schema.eventsLog.pariwarId, PARIWAR_A), eq(schema.eventsLog.streamId, claimCaseId)));
    expect(types.map((e) => e.t)).not.toContain('claim.r9_outcome');
  });

  it('⛔ Story 6.18 P4 — an R9 DENY is NEVER gated (cl.6/cl.7 — a claim is never refused over a name)', async () => {
    const { client, tx } = getTx();
    const { claimCaseId } = await setupRoutedClaim(client, tx);
    await tx
      .delete(schema.claimNomineeBankAccounts)
      .where(
        and(
          eq(schema.claimNomineeBankAccounts.pariwarId, PARIWAR_A),
          eq(schema.claimNomineeBankAccounts.claimCaseId, claimCaseId),
        ),
      );

    await openR9VotingSession(client, openBase(claimCaseId));
    await castR9Vote(client, voteBase(claimCaseId, PANEL[0]!, 'deny'));
    await castR9Vote(client, voteBase(claimCaseId, PANEL[1]!, 'deny'));

    // ⭐ No accounts, no check — and the panel can still reach the decision it actually made.
    const res = await finalizeR9Outcome(client, finalizeBase(claimCaseId, PANEL[0]!));
    expect(res.session.outcome).toBe('denied');
  });

  // ── AC4 — finalize ──
  it('AC4 — finalize below quorum is rejected; at quorum it computes, advances, supersedes routing, emits the event + decision row', async () => {
    const { client, tx } = getTx();
    const { claimCaseId } = await setupRoutedClaim(client, tx);
    const { session } = await openR9VotingSession(client, openBase(claimCaseId));

    // One vote < quorum (2) → rejected.
    await castR9Vote(client, voteBase(claimCaseId, PANEL[0]!, 'approve'));
    await expect(finalizeR9Outcome(client, finalizeBase(claimCaseId, PANEL[0]!))).rejects.toBeInstanceOf(R9QuorumNotMetError);

    // Two approves (of 3) → majority → approved.
    await castR9Vote(client, voteBase(claimCaseId, PANEL[1]!, 'approve'));
    const result = await finalizeR9Outcome(client, finalizeBase(claimCaseId, PANEL[0]!));
    expect(result.session.outcome).toBe('approved');
    expect(result.session.approveCount).toBe(2);
    expect(result.claimState).toBe('state_trustee_approved');
    expect(result.eventVersion).not.toBeNull();

    // The claim advanced (replay-derived).
    expect(await claimState(tx, claimCaseId)).toBe('state_trustee_approved');

    // The routed_to_r9 row is superseded (the approved claim rejoins the commit set).
    const liveRouting = await tx
      .select()
      .from(schema.claimStateTrusteeDecisions)
      .where(
        and(
          eq(schema.claimStateTrusteeDecisions.claimCaseId, claimCaseId),
          eq(schema.claimStateTrusteeDecisions.phase, 'routing'),
          isNull(schema.claimStateTrusteeDecisions.supersededAt),
        ),
      );
    expect(liveRouting).toHaveLength(0);

    // The claim.r9_outcome event landed (NON-PII — no display name / voter identity).
    const events = await tx.select().from(schema.eventsLog).where(eq(schema.eventsLog.streamId, claimCaseId));
    const outcomeEvent = events.find((e) => e.eventType === 'claim.r9_outcome');
    expect(outcomeEvent).toBeTruthy();
    const payload = outcomeEvent!.payload as Record<string, unknown>;
    expect(payload).toMatchObject({ outcome: 'approved', approve_count: 2, clause_id: R9_CLAUSE });
    expect(JSON.stringify(payload)).not.toContain('Panelist');
    expect(JSON.stringify(payload)).not.toContain('Trustee One');

    // The r9_outcome trustee decision row landed.
    const r9Rows = await tx
      .select()
      .from(schema.claimStateTrusteeDecisions)
      .where(and(eq(schema.claimStateTrusteeDecisions.claimCaseId, claimCaseId), eq(schema.claimStateTrusteeDecisions.phase, 'r9_outcome')));
    expect(r9Rows).toHaveLength(1);

    // Re-finalize is an idempotent short-circuit (no new event, no double-advance).
    const replay = await finalizeR9Outcome(client, finalizeBase(claimCaseId, PANEL[0]!));
    expect(replay.idempotentReplay).toBe(true);
    expect(replay.eventVersion).toBeNull();
    const eventsAfter = await tx.select().from(schema.eventsLog).where(eq(schema.eventsLog.streamId, claimCaseId));
    expect(eventsAfter.filter((e) => e.eventType === 'claim.r9_outcome')).toHaveLength(1);
    expect(session.sessionId).toBeTruthy();
  });

  it('AC4 — a deny majority finalizes to `denied`', async () => {
    const { client, tx } = getTx();
    const { claimCaseId } = await setupRoutedClaim(client, tx);
    await openR9VotingSession(client, openBase(claimCaseId));
    await castR9Vote(client, voteBase(claimCaseId, PANEL[0]!, 'deny'));
    await castR9Vote(client, voteBase(claimCaseId, PANEL[1]!, 'deny'));
    const result = await finalizeR9Outcome(client, finalizeBase(claimCaseId, PANEL[0]!));
    expect(result.session.outcome).toBe('denied');
    expect(await claimState(tx, claimCaseId)).toBe('denied');

    // The routed_to_r9 row is superseded here too — a denied outcome also lifts the durable routing
    // exclusion (it just doesn't rejoin the cycle-freeze commit set), mirroring the approved-branch check.
    const liveRouting = await tx
      .select()
      .from(schema.claimStateTrusteeDecisions)
      .where(
        and(
          eq(schema.claimStateTrusteeDecisions.claimCaseId, claimCaseId),
          eq(schema.claimStateTrusteeDecisions.phase, 'routing'),
          isNull(schema.claimStateTrusteeDecisions.supersededAt),
        ),
      );
    expect(liveRouting).toHaveLength(0);
  });

  it('AC4 — finalize rejects when the claim state drifted out of the routable set since routing (R9ClaimNoLongerRoutableError)', async () => {
    const { client, tx } = getTx();
    const { claimCaseId } = await setupRoutedClaim(client, tx);
    await openR9VotingSession(client, openBase(claimCaseId));
    await castR9Vote(client, voteBase(claimCaseId, PANEL[0]!, 'approve'));
    await castR9Vote(client, voteBase(claimCaseId, PANEL[1]!, 'approve'));

    // Simulate some OTHER write path moving the claim out of R9_OUTCOME_FROM_STATES after routing (no real
    // event does this from verifier_approved today — this directly mimics the trigger-guarded write
    // projectClaimState itself performs, to exercise the guard without needing a second real event path).
    await client.query("SET LOCAL app.claim_state_writer = 'on'");
    await tx.update(schema.claims).set({ currentState: 'settled' }).where(eq(schema.claims.claimCaseId, claimCaseId));
    await client.query("SET LOCAL app.claim_state_writer = 'off'");

    await expect(finalizeR9Outcome(client, finalizeBase(claimCaseId, PANEL[0]!))).rejects.toBeInstanceOf(
      R9ClaimNoLongerRoutableError,
    );
  });

  it('AC2 — a finalized (non-superseded) session blocks re-opening (only cancel unblocks it)', async () => {
    const { client, tx } = getTx();
    const { claimCaseId } = await setupRoutedClaim(client, tx);
    await openR9VotingSession(client, openBase(claimCaseId));
    await castR9Vote(client, voteBase(claimCaseId, PANEL[0]!, 'approve'));
    await castR9Vote(client, voteBase(claimCaseId, PANEL[1]!, 'approve'));
    await finalizeR9Outcome(client, finalizeBase(claimCaseId, PANEL[0]!));

    // Finalize ATOMICALLY supersedes the routed_to_r9 row too (AC4), so a reopen attempt is rejected at the
    // "not in the queue" guard (R9ClaimNotRoutedError) rather than ever reaching the session-exists check —
    // unlike cancel (AC5), which deliberately leaves the routing row live so a corrected session CAN reopen.
    // Both outcomes block reopening; this pins WHICH guard fires, distinguishing it from the cancel path.
    await expect(openR9VotingSession(client, openBase(claimCaseId))).rejects.toBeInstanceOf(R9ClaimNotRoutedError);
  });

  // ── AC5 — cancel ──
  it('AC5 — cancel supersedes the session + its votes, leaves routed_to_r9 live, and a fresh session can re-open', async () => {
    const { client, tx } = getTx();
    const { claimCaseId } = await setupRoutedClaim(client, tx);
    const { session } = await openR9VotingSession(client, openBase(claimCaseId));
    await castR9Vote(client, voteBase(claimCaseId, PANEL[0]!, 'approve'));

    // Cancel by a PANEL member (AC5/re-review fix — cancel now requires panel membership, the TRUSTEE opener
    // is not necessarily on the panel and must not be able to cancel someone else's session).
    await cancelR9VotingSession(client, { ...finalizeBase(claimCaseId, PANEL[0]!), reasonCode: 'wrong_clause' });

    // Session + its votes superseded.
    const live = await liveVotes(tx, session.sessionId);
    expect(live).toHaveLength(0);

    // The routing row stays live → a fresh session can open (with a corrected panel).
    const reopened = await openR9VotingSession(client, openBase(claimCaseId));
    expect(reopened.session.sessionId).not.toBe(session.sessionId);
  });

  it('AC5 — cancel requires panel membership — a non-panel actor (even the routing trustee who opened it) is rejected', async () => {
    const { client, tx } = getTx();
    const { claimCaseId } = await setupRoutedClaim(client, tx);
    await openR9VotingSession(client, openBase(claimCaseId));
    await expect(
      cancelR9VotingSession(client, { ...finalizeBase(claimCaseId, TRUSTEE), reasonCode: 'wrong_clause' }),
    ).rejects.toBeInstanceOf(R9ActorNotOnPanelError);
  });

  it('AC5 — cancel fails closed on an already-finalized session', async () => {
    const { client, tx } = getTx();
    const { claimCaseId } = await setupRoutedClaim(client, tx);
    await openR9VotingSession(client, openBase(claimCaseId));
    await castR9Vote(client, voteBase(claimCaseId, PANEL[0]!, 'approve'));
    await castR9Vote(client, voteBase(claimCaseId, PANEL[1]!, 'approve'));
    await finalizeR9Outcome(client, finalizeBase(claimCaseId, PANEL[0]!));
    await expect(
      cancelR9VotingSession(client, { ...finalizeBase(claimCaseId, PANEL[0]!), reasonCode: 'x' }),
    ).rejects.toBeInstanceOf(R9SessionFinalizedError);
  });

  it('AC5 — cancel-after-cancel is R9SessionAlreadySupersededError, distinct from R9NoLiveSessionError for a claim that never had a session', async () => {
    const { client, tx } = getTx();
    const { claimCaseId } = await setupRoutedClaim(client, tx);
    await openR9VotingSession(client, openBase(claimCaseId));
    await cancelR9VotingSession(client, { ...finalizeBase(claimCaseId, PANEL[0]!), reasonCode: 'wrong_clause' });

    // Already cancelled — the specific error (hasAnySession found a superseded row), not the generic
    // "never had a session" one. Once superseded, liveSession() no longer finds it, so this branch is
    // reached regardless of actor — TRUSTEE (a non-panel actor) is fine here, unlike the live-session path.
    await expect(
      cancelR9VotingSession(client, { ...finalizeBase(claimCaseId, TRUSTEE), reasonCode: 'x' }),
    ).rejects.toBeInstanceOf(R9SessionAlreadySupersededError);

    // A DIFFERENT claim that never had a session at all gets the generic error instead.
    // (a distinct clauseVersion — this test's own tx already seeded R9_CLAUSE @ v1 above.)
    const { claimCaseId: neverOpened } = await setupRoutedClaim(client, tx, { clauseVersion: 2 });
    await expect(
      cancelR9VotingSession(client, { ...finalizeBase(neverOpened, TRUSTEE), reasonCode: 'x' }),
    ).rejects.toBeInstanceOf(R9NoLiveSessionError);
  });

  it('AC4 — finalize with no live session (never opened) is a typed 4xx', async () => {
    const { client, tx } = getTx();
    const { claimCaseId } = await setupRoutedClaim(client, tx);
    await expect(finalizeR9Outcome(client, finalizeBase(claimCaseId, PANEL[0]!))).rejects.toBeInstanceOf(R9NoLiveSessionError);
  });

  // ── AC1/AC8 — reads ──
  it('AC1/AC8 — the queue lists the routed claim (session_open flag), the panel model + tally, and votes-by-trustee (live + superseded)', async () => {
    const { client, tx } = getTx();
    const { claimCaseId, deceased } = await setupRoutedClaim(client, tx);

    // Before a session: in the queue, session_open false.
    let queue = await getR9VotingQueue(tx, PARIWAR_A);
    expect(queue.map((q) => q.claimCaseId)).toContain(claimCaseId);
    expect(queue.find((q) => q.claimCaseId === claimCaseId)!.sessionOpen).toBe(false);

    const { session } = await openR9VotingSession(client, openBase(claimCaseId));
    // After open: still queued, session_open true.
    queue = await getR9VotingQueue(tx, PARIWAR_A);
    expect(queue.find((q) => q.claimCaseId === claimCaseId)!.sessionOpen).toBe(true);

    // Vote + revise → the transcript keeps both.
    await castR9Vote(client, voteBase(claimCaseId, PANEL[0]!, 'approve'));
    await castR9Vote(client, voteBase(claimCaseId, PANEL[0]!, 'deny')); // revise

    const panel = await getR9Panel(tx, PARIWAR_A, claimCaseId);
    expect(panel).not.toBeNull();
    expect(panel!.deceasedMemberId).toBe(deceased);
    expect(panel!.session!.sessionId).toBe(session.sessionId);
    expect(panel!.votes).toHaveLength(1); // only the live (revised) vote

    // votes-by-trustee returns BOTH the live + the superseded vote for PANEL[0], each bound to session/rule.
    const transcript = await getR9VotesByTrustee(tx, PARIWAR_A, PANEL[0]!, {});
    expect(transcript).toHaveLength(2);
    for (const v of transcript) {
      expect(v.clauseId).toBe(R9_CLAUSE);
      expect(v.sessionId).toBe(session.sessionId);
      expect(v.panelActorIds).toEqual(PANEL);
    }
    expect(transcript.filter((v) => v.supersededAt !== null)).toHaveLength(1);
  });

  it('AC8 — getR9VotesByTrustee clamps a non-positive sinceDays to 1 instead of silently shifting the cutoff into the future', async () => {
    const { client, tx } = getTx();
    const { claimCaseId } = await setupRoutedClaim(client, tx);
    await openR9VotingSession(client, openBase(claimCaseId));
    await castR9Vote(client, voteBase(claimCaseId, PANEL[0]!, 'approve'));

    // sinceDays: 0 (or negative) must NOT silently exclude the vote just cast — the clamp floors it to 1.
    const transcript = await getR9VotesByTrustee(tx, PARIWAR_A, PANEL[0]!, { sinceDays: 0 });
    expect(transcript.length).toBeGreaterThan(0);
    const transcriptNegative = await getR9VotesByTrustee(tx, PARIWAR_A, PANEL[0]!, { sinceDays: -5 });
    expect(transcriptNegative.length).toBeGreaterThan(0);
  });
});
