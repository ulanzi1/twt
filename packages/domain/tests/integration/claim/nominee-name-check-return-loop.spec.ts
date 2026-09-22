// The Pariwar Admin's RETURN loop — live-DB integration (Story 6.18, AC5 + AC11).
//
// `2026-09-20-227` cl.10: *"If District Admin approves the verification, it goes to Pariwar Admin.
// If Pariwar Admin doesn't approve it goes back to District Admin for correction with Note.
// Thereafter District Admin will contact claimant regarding discrepancy and get it corrected. Then
// re-submit to Pariwar Admin."*
//
// ⭐⭐ THE TWO PROPERTIES THIS FILE EXISTS TO PROVE, and both are NEGATIVE:
//   (1) A RETURN IS NOT A DENIAL. ⛔ No claim event is minted, ⛔ no lifecycle state moves, ⛔ no
//       appeal flow (Story 6.16) starts, and the freeze is ⛔ not opened. A return that quietly
//       behaved like a denial would turn "we need you to fix a detail" into "your claim failed" —
//       the exact thing cl.10 rules out.
//   (2) A RETURN IS NOT A DEAD END (AC5). While it is live the helpline may correct the accounts
//       WHATEVER the claim's state, and the claim is uncommittable until the District Admin has
//       looked again.

import { randomUUID } from 'node:crypto';

import { and, eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { claimId as toClaimId, memberId as toMemberId } from '../../../src/ids/index.js';
import type { ClaimId, MemberId } from '../../../src/ids/index.js';
import {
  ClaimAwaitingCorrectionError,
  ClaimNotReturnableError,
  commitCycleFreeze,
  getCycleFreezePending,
  hasLiveReturnRow,
  projectClaimState,
  recordClaimNomineeBankAccounts,
  returnToDistrictAdmin,
  routeToR9,
  voteOnFrozenClaim,
} from '../../../src/claim/index.js';
import { cycleFreezeCommitId as toCommitId } from '../../../src/ids/index.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, enterAppScope, seedNomineeNameCheck } from '../_helpers.js';

const TRUSTEE = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1';
const HELPLINE = 'd4d4d4d4-d4d4-d4d4-d4d4-d4d4d4d4d4d4';

type Client = ReturnType<typeof getTx>['client'];
type Tx = ReturnType<typeof getTx>['tx'];

const returnInput = (claimCaseId: ClaimId) => ({
  claimCaseId,
  pariwarId: PARIWAR_A,
  // `other` is the only code valid for a return — `-227` cl.10 asks for a NOTE, not a category.
  reasonCode: 'other' as const,
  rationaleCiphertext: 'enc:v1:the-holder-name-is-not-the-nominee',
  actorId: TRUSTEE,
  actorDisplay: 'Pariwar Admin One',
  actor: 'trustee' as const,
});

/** The R9 ROUTING shape — the other `claim_state_trustee_decisions` phase, mutually exclusive
 *  with a return by GUARD (⛔ not by the partial-unique index: the two write DIFFERENT phases). */
const routeInput = (claimCaseId: ClaimId) => ({
  claimCaseId,
  pariwarId: PARIWAR_A,
  reasonCode: 'r9_special_case' as const,
  rationaleCiphertext: 'enc:v1:this-is-an-r9-special-case',
  actorId: TRUSTEE,
  actorDisplay: 'Pariwar Admin One',
  actor: 'trustee' as const,
});

const voteInput = (claimCaseId: ClaimId, outcome: 'approved' | 'denied') => ({
  claimCaseId,
  pariwarId: PARIWAR_A,
  outcome,
  reasonCode: outcome === 'denied' ? ('standing_not_met' as const) : null,
  rationaleCiphertext: null,
  actorId: TRUSTEE,
  actorDisplay: 'Pariwar Admin One',
  actor: 'trustee' as const,
});

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

/** The two-account payload every bank write in this file uses — one shape, so the CASES differ. */
const bankInput = (claimCaseId: ClaimId) => ({
  claimCaseId,
  pariwarId: PARIWAR_A,
  accounts: ([1, 2] as const).map((rank) => ({
    accountRank: rank,
    accountHolderNameCiphertext: `enc:v1:h-${rank}`,
    accountNumberCiphertext: `enc:v1:a-${rank}`,
    ifscCiphertext: `enc:v1:i-${rank}`,
    vpaCiphertext: null,
    nameDifferenceNoteCiphertext: null,
    bankName: 'HDFC Bank',
    branch: null,
    ifscValidated: true,
  })),
});

/** A helpline OPERATOR correction — the caller shape the third branch exists for. */
const correctionAt = (client: Client, claimCaseId: ClaimId, reason: string | null) =>
  recordClaimNomineeBankAccounts(client, {
    ...bankInput(claimCaseId),
    recordedByActor: HELPLINE,
    actor: 'operator',
    allowCorrection: true,
    correctionReason: reason,
  });

/** Move a claim into `state_trustee_freeze` — a state BOTH bank-write windows exclude. */
async function freeze(
  client: Client,
  claimCaseId: ClaimId,
  deceasedMemberId: MemberId,
  from: 'verifier_approved' | 'reversed',
): Promise<void> {
  await projectClaimState(client, {
    claimCaseId,
    pariwarId: PARIWAR_A,
    deceasedMemberId,
    intakeChannels: ['member_app'],
    claimantActorId: null,
    eventType: 'claim.state_trustee_frozen',
    payload: { from_state: from, to_state: 'state_trustee_freeze', trigger: 'test', actor: 'trustee' },
    actorId: null,
  });
}

/**
 * Drive a fresh claim all the way to `reversed` — the OTHER state tier-2 excludes and a check is
 * recordable in. The only route the state machine offers is through a denial and an appeal:
 * `verifier_review → denied → appeal_stage_1 → reversed` (`state.ts`).
 */
async function driveToReversed(
  client: Client,
  claimCaseId: ClaimId,
  deceasedMemberId: MemberId,
): Promise<void> {
  await driveTo(client, claimCaseId, deceasedMemberId, 'verifier_review');
  const emit = (from: string, to: string, eventType: string, extra: Record<string, unknown> = {}) =>
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
  await emit('verifier_review', 'denied', 'claim.verifier_denied');
  await emit('denied', 'appeal_stage_1', 'claim.appeal_stage1_initiated');
  // ⚠ `decision` is REQUIRED and is the reducer's branch key — the ONE place it reads payload
  // content beyond `(state, type)`. The same event type also reaches `appeal_stage_2` and `denied`.
  await emit('appeal_stage_1', 'reversed', 'claim.appeal_stage1_reviewed', { decision: 'reversed' });
}

/** Drive a claim at `verifier_review` to the TERMINAL `denied` state. */
async function denyFromReview(client: Client, claimCaseId: ClaimId): Promise<void> {
  await projectClaimState(client, {
    claimCaseId,
    pariwarId: PARIWAR_A,
    deceasedMemberId: toMemberId(randomUUID()),
    intakeChannels: ['member_app'],
    claimantActorId: null,
    eventType: 'claim.verifier_denied' as never,
    payload: {
      from_state: 'verifier_review',
      to_state: 'denied',
      trigger: 'test',
      actor: 'system',
    },
    actorId: null,
  });
}

async function eventTypes(tx: Tx, claimCaseId: ClaimId): Promise<string[]> {
  const rows = await tx
    .select({ t: schema.eventsLog.eventType })
    .from(schema.eventsLog)
    .where(and(eq(schema.eventsLog.pariwarId, PARIWAR_A), eq(schema.eventsLog.streamId, claimCaseId)))
    .orderBy(schema.eventsLog.eventVersion);
  return rows.map((r) => r.t);
}

async function claimState(tx: Tx, claimCaseId: ClaimId): Promise<string | undefined> {
  const rows = await tx
    .select({ s: schema.claims.currentState })
    .from(schema.claims)
    .where(and(eq(schema.claims.pariwarId, PARIWAR_A), eq(schema.claims.claimCaseId, claimCaseId)));
  return rows[0]?.s;
}

// ⚠ SUITE-LEVEL TIMEOUT, matching every sibling live spec. `packages/domain/vitest.config.ts` sets
// ⛔ NO `testTimeout` (apps/api's does), and these suites do many `projectClaimState` round trips
// under full-suite parallelism — the exact shape recorded in
// [[project_known_livedb_test_failures]] as the cause of the timeout flakes, and `{ timeout: 20000 }`
// as their fix.
describe.skipIf(!hasDatabase)('Story 6.18 — the return loop (:5433)', () => {
  setupLiveDb();

  it('⭐ a RETURN mints NO event, moves NO state, opens NO freeze and starts NO appeal flow (AC11)', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const cid = toClaimId(randomUUID());
    await driveTo(client, cid, toMemberId(randomUUID()), 'verifier_approved');
    await seedNomineeNameCheck(client, PARIWAR_A, cid);

    const before = await eventTypes(tx, cid);
    const res = await returnToDistrictAdmin(client, returnInput(cid));

    // ⭐ The `routeToR9` signature: metadata only.
    expect(res.eventVersion).toBeNull();
    expect(res.claimState).toBe('verifier_approved');
    expect(await claimState(tx, cid)).toBe('verifier_approved');

    // ⛔ NOT ONE new event — not for the return, and none of the shapes a denial would produce.
    const after = await eventTypes(tx, cid);
    expect(after).toEqual(before);
    expect(after).not.toContain('claim.state_trustee_denied');
    expect(after).not.toContain('claim.denied_no_appeal');
    // ⚠ THE FREEZE MUST NOT OPEN: `voteOnFrozenClaim` emits this when acting from `verifier_approved`.
    // A return is the Pariwar Admin declining to advance the claim — it must not advance it.
    expect(after).not.toContain('claim.state_trustee_frozen');
    // ⛔ And no appeal flow started.
    expect(after.filter((t) => t.includes('appeal'))).toEqual([]);

    // The row itself: one live `correction_return` / `returned_for_correction`, ⛔ never `denied`.
    expect(res.decision.phase).toBe('correction_return');
    expect(res.decision.outcome).toBe('returned_for_correction');
    expect(await hasLiveReturnRow(tx, PARIWAR_A, cid)).toBe(true);
  });

  it('a return REQUIRES a reason code (and therefore the note) — `-227` cl.10', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const cid = toClaimId(randomUUID());
    await driveTo(client, cid, toMemberId(randomUUID()), 'verifier_approved');
    await seedNomineeNameCheck(client, PARIWAR_A, cid);

    await expect(
      returnToDistrictAdmin(client, { ...returnInput(cid), reasonCode: null }),
    ).rejects.toMatchObject({ name: 'TrusteeReasonCodeError' });
  });

  it('⛔ a return is refused after the claim is approved (the campaign is live)', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const cid = toClaimId(randomUUID());
    const mid = toMemberId(randomUUID());
    await driveTo(client, cid, mid, 'verifier_approved');
    await seedNomineeNameCheck(client, PARIWAR_A, cid);
    await voteOnFrozenClaim(client, voteInput(cid, 'approved'));
    await commitCycleFreeze(client, {
      pariwarId: PARIWAR_A,
      commitId: toCommitId(randomUUID()),
      actorId: TRUSTEE,
      actorDisplay: 'Pariwar Admin One',
      actor: 'trustee',
    });
    expect(await claimState(tx, cid)).toBe('approved');

    await expect(returnToDistrictAdmin(client, returnInput(cid))).rejects.toBeInstanceOf(
      ClaimNotReturnableError,
    );
  });

  it('⭐ the WHOLE loop: DA approve → PA return → helpline correction → fresh check → PA approval', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const cid = toClaimId(randomUUID());
    const mid = toMemberId(randomUUID());
    await driveTo(client, cid, mid, 'verifier_approved');
    await seedNomineeNameCheck(client, PARIWAR_A, cid);

    // (1) The Pariwar Admin returns it with a note.
    await returnToDistrictAdmin(client, returnInput(cid));

    // (2) ⛔ The vote is REFUSED while it is returned and unresubmitted — and the claim is unmoved.
    await expect(voteOnFrozenClaim(client, voteInput(cid, 'approved'))).rejects.toBeInstanceOf(
      ClaimAwaitingCorrectionError,
    );
    expect(await claimState(tx, cid)).toBe('verifier_approved');

    // (3) ⭐ The claim is UNCOMMITTABLE while returned. (It is not in `state_trustee_approved` yet,
    //     so the stronger assertion is the vote refusal above; this pins the derived flag itself.)
    expect(await hasLiveReturnRow(tx, PARIWAR_A, cid)).toBe(true);

    // (4) ⭐ THE HELPLINE CORRECTS THE ACCOUNTS AT `verifier_approved` — legal ONLY because a return
    //     is live (AC5's third branch). This is the step that makes the return not a dead end.
    await recordClaimNomineeBankAccounts(client, {
      claimCaseId: cid,
      pariwarId: PARIWAR_A,
      accounts: ([1, 2] as const).map((rank) => ({
        accountRank: rank,
        accountHolderNameCiphertext: `enc:v1:corrected-holder-${rank}`,
        accountNumberCiphertext: `enc:v1:acct-${rank}`,
        ifscCiphertext: `enc:v1:ifsc-${rank}`,
        vpaCiphertext: null,
        nameDifferenceNoteCiphertext: null,
        bankName: 'State Bank of India',
        branch: null,
        ifscValidated: true,
      })),
      recordedByActor: HELPLINE,
      actor: 'operator',
      allowCorrection: true,
      correctionReason: 'the District Admin asked for the holder name to be corrected',
    });

    // (5) The correction made the check STALE, so the vote is still refused — now because the
    //     District Admin has not looked again, which is exactly `-227` cl.12 / D5.
    //
    // ⚠⚠ THE TRANSACTION-CLOCK SIMULATION, and why it is FAITHFUL rather than a cheat.
    // `updated_at` and `decided_at` are both `defaultNow()`, and PG's `now()` is the TRANSACTION
    // timestamp — constant for the whole transaction. This spec runs inside ONE BEGIN/ROLLBACK, so
    // the correction above was stamped with the SAME instant as the return and did not actually
    // move the token. In PRODUCTION the return and the correction are separate HTTP requests and
    // therefore separate transactions, so their clocks always differ. Advancing the stamp here
    // reproduces the production fact the test is about; without it the test would assert a
    // behaviour that only the harness's single-transaction shape produces.
    // (Documented at `isNomineeNameCheckCurrent` and `isReturnedClaimResubmitted`.)
    await tx
      .update(schema.claimNomineeBankAccounts)
      .set({ updatedAt: new Date(Date.now() + 60_000) })
      .where(
        and(
          eq(schema.claimNomineeBankAccounts.pariwarId, PARIWAR_A),
          eq(schema.claimNomineeBankAccounts.claimCaseId, cid),
        ),
      );

    await expect(voteOnFrozenClaim(client, voteInput(cid, 'approved'))).rejects.toBeInstanceOf(
      ClaimAwaitingCorrectionError,
    );

    // (6) The District Admin re-checks ⇒ DERIVED resubmission. ⛔ No resubmit route, ⛔ no new key,
    //     ⛔ no District Admin write to the trustee table.
    //     ⚠ `reuseAccounts` — the check must be recorded against the CORRECTED rows; re-seeding them
    //     would reset `updated_at` and undo the very correction the check is about.
    await seedNomineeNameCheck(client, PARIWAR_A, cid, { reuseAccounts: true });

    // (7) The Pariwar Admin approves — and the SAME transaction supersedes the return row.
    const vote = await voteOnFrozenClaim(client, voteInput(cid, 'approved'));
    expect(vote.claimState).toBe('state_trustee_approved');
    expect(await hasLiveReturnRow(tx, PARIWAR_A, cid)).toBe(false);

    // The return row still EXISTS — superseded, never deleted. The transcript keeps the whole story.
    const rows = await tx
      .select()
      .from(schema.claimStateTrusteeDecisions)
      .where(
        and(
          eq(schema.claimStateTrusteeDecisions.pariwarId, PARIWAR_A),
          eq(schema.claimStateTrusteeDecisions.claimCaseId, cid),
          eq(schema.claimStateTrusteeDecisions.phase, 'correction_return'),
        ),
      );
    expect(rows).toHaveLength(1);
    expect(rows[0]!.supersededAt).not.toBeNull();

    // ⛔ Across the WHOLE loop, still no denial and no appeal flow.
    const types = await eventTypes(tx, cid);
    expect(types).not.toContain('claim.state_trustee_denied');
    expect(types.filter((t) => t.includes('appeal'))).toEqual([]);
  });

  // ── AC5 — THE BANK WRITER'S THIRD BRANCH, exercised on every axis that reaches it ─────────
  //
  // ⚠⚠ THIS BLOCK REPLACES A TEST THAT SAID THE OPPOSITE OF WHAT IT ASSERTED (code review
  // 2026-09-22). It was titled *"⛔ a helpline correction at `verifier_approved` is REFUSED when no
  // return is live (AC5)"* and ended in `.resolves.toBeDefined()` — its own comment conceded
  // *"`verifier_approved` IS the tier-2 window, so this one succeeds"*. ⭐ A reader scanning titles
  // would have come away believing a refusal was proven that ⛔ never was. The behaviour was right;
  // the NAME was a false claim about the system, which is the worse of the two defects.
  //
  // ⭐ THE BRANCH HAS THREE INDEPENDENT INPUTS and the old suite exercised ⛔ only one path through
  // them (`hasLiveReturn` at `state_trustee_freeze`):
  //   · WHICH HALF of `underCorrection` is true — the Pariwar Admin's live RETURN ROW, or the
  //     District Admin's `does_not_match` CHECK. ⚠ The check half is AC5's own worked example and
  //     had ⛔ no test at all.
  //   · THE CLAIM'S STATE — barred (`denied`/`approved`/`settled`) vs anything else.
  //   · `allowCorrection` — the operator's flag; the MEMBER route passes `false` and must ⛔ not
  //     be able to ride the exception.

  it('⭐ AC5 — at `verifier_approved` the TIER-2 window already permits it, return or no return', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const cid = toClaimId(randomUUID());
    await driveTo(client, cid, toMemberId(randomUUID()), 'verifier_approved');
    await seedNomineeNameCheck(client, PARIWAR_A, cid);

    // ⭐ THE HONEST STATEMENT of what this state proves: `verifier_approved` is
    // `NOMINEE_BANK_ADMIN_CORRECTION_STATES`, so the write is authorised by the ORDINARY tier-2
    // branch and the third branch is ⛔ never consulted. ⇒ this case can say ⛔ nothing about the
    // return exception, and it no longer pretends to. The sharp cases are the freeze / reversed
    // ones below, which tier-2 excludes.
    await expect(correctionAt(client, cid, 'routine tier-2 correction')).resolves.toBeDefined();

    // ⭐ And the reason stays mandatory here exactly as in the third branch — the two paths agree.
    await expect(correctionAt(client, cid, null)).rejects.toMatchObject({
      name: 'NomineeBankCorrectionReasonRequiredError',
    });
  });

  it("⭐⭐ AC5 — the DA's `does_not_match` ALONE unlocks the correction at `state_trustee_freeze` (⛔ no return)", async () => {
    // ⚠⚠ THIS IS AC5's OWN WORKED EXAMPLE AND IT HAD ⛔ NO TEST. Chunk 1's P2 finding was exactly
    // this: the branch used to test `hasLiveReturnRow` alone, so a District Admin recording
    // `does_not_match` at a non-writable state threw `NomineeBankClaimNotCollectableError` while
    // the filer-facing flag was telling the operator to go and correct the details.
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const cid = toClaimId(randomUUID());
    const mid = toMemberId(randomUUID());
    await driveTo(client, cid, mid, 'verifier_approved');
    await freeze(client, cid, mid, 'verifier_approved');
    expect(await claimState(tx, cid)).toBe('state_trustee_freeze');

    // ⭐ POSITIVE CONTROL FIRST — with a PASSING check the freeze state refuses, so the success
    // below is attributable to the verdict and ⛔ not to the state being writable all along.
    await seedNomineeNameCheck(client, PARIWAR_A, cid);
    await expect(correctionAt(client, cid, 'nothing is wrong yet')).rejects.toMatchObject({
      name: 'NomineeBankClaimNotCollectableError',
    });

    // ⭐ Now the District Admin says the names do not match. ⛔ No return row exists.
    await seedNomineeNameCheck(client, PARIWAR_A, cid, {
      verdicts: ['matches', 'does_not_match'],
      reuseAccounts: true,
    });
    expect(await hasLiveReturnRow(tx, PARIWAR_A, cid)).toBe(false);
    await expect(correctionAt(client, cid, 'holder name corrected on the DA note')).resolves.toBeDefined();
  });

  it("⭐ AC5 — the same holds at `reversed`, the other state tier-2 excludes", async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const cid = toClaimId(randomUUID());
    const mid = toMemberId(randomUUID());
    await driveToReversed(client, cid, mid);
    expect(await claimState(tx, cid)).toBe('reversed');

    await seedNomineeNameCheck(client, PARIWAR_A, cid);
    await expect(correctionAt(client, cid, 'nothing is wrong yet')).rejects.toMatchObject({
      name: 'NomineeBankClaimNotCollectableError',
    });

    await seedNomineeNameCheck(client, PARIWAR_A, cid, {
      verdicts: ['does_not_match', 'matches'],
      reuseAccounts: true,
    });
    await expect(correctionAt(client, cid, 'corrected after the reversal')).resolves.toBeDefined();
  });

  it('⭐⭐ a live return does ⛔ NOT unlock a TERMINAL claim — `denied` is barred outright', async () => {
    // ⭐ REACHABLE, ⛔ not hypothetical: a return may be opened at `state_trustee_freeze`
    // (`TRUSTEE_RETURNABLE_STATES`), and R9 may then deny the claim from that same state
    // (`state.ts`: state_trustee_freeze --claim.r9_outcome--> denied). The row stays live, because
    // ⛔ only a VOTE supersedes it. ⇒ the barred-states guard is the ⛔ only thing standing between
    // a live governance row and a write on a dead claim.
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const cid = toClaimId(randomUUID());
    const mid = toMemberId(randomUUID());
    await driveTo(client, cid, mid, 'verifier_approved');
    await freeze(client, cid, mid, 'verifier_approved');
    await seedNomineeNameCheck(client, PARIWAR_A, cid);
    await returnToDistrictAdmin(client, returnInput(cid));

    // ⛔ NON-VACUITY: the exception really is open right now — otherwise the refusal after the
    // denial would be proving the state machine, ⛔ not the barred-states guard.
    await expect(correctionAt(client, cid, 'open while frozen')).resolves.toBeDefined();
    await seedNomineeNameCheck(client, PARIWAR_A, cid, {
      verdicts: ['matches', 'does_not_match'],
      reuseAccounts: true,
    });

    await projectClaimState(client, {
      claimCaseId: cid,
      pariwarId: PARIWAR_A,
      deceasedMemberId: mid,
      intakeChannels: ['member_app'],
      claimantActorId: null,
      eventType: 'claim.r9_outcome' as never,
      payload: {
        from_state: 'state_trustee_freeze',
        to_state: 'denied',
        trigger: 'test',
        actor: 'trustee',
        // ⚠ The R9 payload is `.strict()` and carries the panel's provenance — all six are required.
        outcome: 'denied',
        clause_id: 'niy.r9.a',
        clause_version_id: randomUUID(),
        voting_requirement: 'majority',
        approve_count: 1,
        deny_count: 4,
      },
      actorId: null,
    });
    expect(await claimState(tx, cid)).toBe('denied');
    // ⭐ The row is STILL live — the refusal below is the barred list, ⛔ not a closed exception.
    expect(await hasLiveReturnRow(tx, PARIWAR_A, cid)).toBe(true);

    await expect(correctionAt(client, cid, 'too late')).rejects.toMatchObject({
      name: 'NomineeBankClaimNotCollectableError',
    });
  });

  it('⛔ …and the same at `approved`, the other reachable terminal state', async () => {
    // ⭐ The OTHER half of `NOMINEE_BANK_CORRECTION_BARRED_STATES`. Also reachable with the row
    // live: `state_trustee_freeze --r9_outcome--> state_trustee_approved --claim.approved-->
    // approved`. ⚠ `settled` is barred by the same constant and is ⛔ not exercised: it is one more
    // hop past this and adds ⛔ no branch — recorded so the omission is a choice, ⛔ not a gap.
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const cid = toClaimId(randomUUID());
    const mid = toMemberId(randomUUID());
    await driveTo(client, cid, mid, 'verifier_approved');
    await freeze(client, cid, mid, 'verifier_approved');
    await seedNomineeNameCheck(client, PARIWAR_A, cid);
    await returnToDistrictAdmin(client, returnInput(cid));
    await expect(correctionAt(client, cid, 'open while frozen')).resolves.toBeDefined();

    const emit = (from: string, to: string, eventType: string, extra: Record<string, unknown> = {}) =>
      projectClaimState(client, {
        claimCaseId: cid,
        pariwarId: PARIWAR_A,
        deceasedMemberId: mid,
        intakeChannels: ['member_app'],
        claimantActorId: null,
        eventType: eventType as never,
        payload: { from_state: from, to_state: to, trigger: 'test', actor: 'trustee', ...extra },
        actorId: null,
      });
    await emit('state_trustee_freeze', 'state_trustee_approved', 'claim.r9_outcome', {
      outcome: 'approved',
      clause_id: 'niy.r9.a',
      clause_version_id: randomUUID(),
      voting_requirement: 'majority',
      approve_count: 4,
      deny_count: 1,
    });
    await emit('state_trustee_approved', 'approved', 'claim.approved');
    expect(await claimState(tx, cid)).toBe('approved');
    expect(await hasLiveReturnRow(tx, PARIWAR_A, cid)).toBe(true);

    await expect(correctionAt(client, cid, 'too late')).rejects.toMatchObject({
      name: 'NomineeBankClaimNotCollectableError',
    });
  });

  it('⭐ a live R9 ROUTING row and a live return cannot coexist — proven, ⛔ not assumed', async () => {
    // ⚠⚠ THE REVIEW ASKED FOR *"the row-alone branch … with a live R9 routing row"*. ⭐ That state
    // is UNREACHABLE, and this asserts the unreachability rather than writing a test that would
    // have to fabricate it ([[feedback_trace_reachability_before_escalating]]). `routeToR9` and
    // `returnToDistrictAdmin` are mutually exclusive by GUARD (`hasLiveReturnRow` /
    // `hasLiveRoutedRow`), ⛔ not by the partial-unique index — they write different phases, so the
    // index would happily hold both. The concurrent version of this is proved in
    // `nominee-name-check-return-concurrency.spec.ts`; this is the sequential half, both ways round.
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);

    const a = toClaimId(randomUUID());
    const am = toMemberId(randomUUID());
    await driveTo(client, a, am, 'verifier_approved');
    await seedNomineeNameCheck(client, PARIWAR_A, a);
    await returnToDistrictAdmin(client, returnInput(a));
    // ⭐ The TYPED error, ⛔ not `rejects.toThrow()`: a bare throw-assertion passes on a seeding
    // bug, a scope error or a 23505 escaping raw — none of which is the exclusion guard.
    await expect(
      routeToR9(client, routeInput(a)),
      'R9 routing slipped past a live return',
    ).rejects.toMatchObject({ name: 'TrusteeExclusionConflictError' });

    const b = toClaimId(randomUUID());
    const bm = toMemberId(randomUUID());
    await driveTo(client, b, bm, 'verifier_approved');
    await seedNomineeNameCheck(client, PARIWAR_A, b);
    await routeToR9(client, routeInput(b));
    await expect(
      returnToDistrictAdmin(client, returnInput(b)),
      'a return slipped past a live R9 routing row',
    ).rejects.toMatchObject({ name: 'TrusteeExclusionConflictError' });

    // ⛔ NON-VACUITY: each first write really landed, so the refusals are exclusion and ⛔ not two
    // claims that were never set up.
    expect(await hasLiveReturnRow(tx, PARIWAR_A, a)).toBe(true);
    expect(await hasLiveReturnRow(tx, PARIWAR_A, b)).toBe(false);
  });

  it('⛔ `allowCorrection: false` cannot ride the exception — the MEMBER route stays shut', async () => {
    // ⚠ The member app's own bank route passes `allowCorrection: false`. If the third branch keyed
    // on the governance row ALONE, a returned claim would quietly become member-writable at any
    // state — including states the member can ⛔ never write in.
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const cid = toClaimId(randomUUID());
    const mid = toMemberId(randomUUID());
    await driveTo(client, cid, mid, 'verifier_approved');
    await freeze(client, cid, mid, 'verifier_approved');
    await seedNomineeNameCheck(client, PARIWAR_A, cid);
    await returnToDistrictAdmin(client, returnInput(cid));
    expect(await hasLiveReturnRow(tx, PARIWAR_A, cid)).toBe(true);

    await expect(
      recordClaimNomineeBankAccounts(client, {
        ...bankInput(cid),
        recordedByActor: HELPLINE,
        actor: 'member',
        allowCorrection: false,
        correctionReason: null,
      }),
    ).rejects.toMatchObject({ name: 'NomineeBankClaimNotCollectableError' });

    // ⭐ POSITIVE CONTROL — the very same claim, same instant, with the operator's flag: permitted.
    // Without this the refusal above could be the state, the check, or anything else.
    await expect(correctionAt(client, cid, 'operator correction')).resolves.toBeDefined();
  });

  it('⭐ corrected but ⛔ NOT re-checked — the exception stays OPEN (the half D4 got wrong)', async () => {
    // ⭐⭐ THE PROPERTY D4's SPEC SENTENCE GOT WRONG. It said the record *"closes when the corrected
    // accounts are written"*. It does ⛔ not: writing them leaves the exception wide open, which is
    // what this asserts. The CLOSING half — corrected AND re-checked — is ⛔ NOT PROVABLE ON THIS
    // HARNESS and lives in `nominee-name-check-return-concurrency.spec.ts`; see the note below.
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const cid = toClaimId(randomUUID());
    const mid = toMemberId(randomUUID());
    await driveTo(client, cid, mid, 'verifier_approved');
    await freeze(client, cid, mid, 'verifier_approved');
    await seedNomineeNameCheck(client, PARIWAR_A, cid);
    await returnToDistrictAdmin(client, returnInput(cid));

    await expect(correctionAt(client, cid, 'first correction')).resolves.toBeDefined();
    await expect(correctionAt(client, cid, 'and again, still open')).resolves.toBeDefined();
    expect(await hasLiveReturnRow(tx, PARIWAR_A, cid), 'the row must OUTLIVE the writes').toBe(true);
  });

  // ⚠⚠⚠ WHY "ONCE RESUBMITTED THE EXCEPTION IS CLOSED" IS ⛔ NOT TESTED IN THIS FILE, recorded
  // rather than quietly dropped ([[feedback_record_unattested_no_backfill]]).
  //
  // I wrote that test here first and it FAILED — the correction succeeded where it should have been
  // refused. ⭐ The cause is ⛔ not the code: `isReturnedClaimResubmitted` requires
  // `accounts.every(updated_at > return.decided_at)`, and BOTH columns default to `now()`, which in
  // Postgres is TRANSACTION-START time, ⛔ not wall clock. Verified against the live DB:
  // `now()` returned the identical value 50 ms apart inside one transaction, while
  // `clock_timestamp()` advanced. ⇒ inside `setupLiveDb()` + `getTx()`'s single BEGIN the return row
  // and every later account rewrite carry the SAME stamp, `>` is false, and the resubmission can
  // ⛔ never be detected. The harness, ⛔ not the invariant, is what fails.
  //
  // ⇒ the proof lives in `nominee-name-check-return-concurrency.spec.ts`, whose own-committing
  // transactions give the two writes genuinely different `now()` values.
  // ⚠ This is the SAME root cause as the carried residual *"the return-resubmission ordering
  // compares transaction-START clocks"* in `deferred-work.md` — ⛔ not a new defect, and ⛔ not
  // discharged by moving the test.

  it('⭐ the helpline correction succeeds at `state_trustee_freeze` ONLY while a return is live', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const cid = toClaimId(randomUUID());
    const mid = toMemberId(randomUUID());
    await driveTo(client, cid, mid, 'verifier_approved');
    await seedNomineeNameCheck(client, PARIWAR_A, cid);

    // Put the claim into the freeze — a state BOTH bank-write windows exclude.
    await projectClaimState(client, {
      claimCaseId: cid,
      pariwarId: PARIWAR_A,
      deceasedMemberId: mid,
      intakeChannels: ['member_app'],
      claimantActorId: null,
      eventType: 'claim.state_trustee_frozen',
      payload: {
        from_state: 'verifier_approved',
        to_state: 'state_trustee_freeze',
        trigger: 'test',
        actor: 'trustee',
      },
      actorId: null,
    });
    expect(await claimState(tx, cid)).toBe('state_trustee_freeze');

    const correction = () =>
      recordClaimNomineeBankAccounts(client, {
        claimCaseId: cid,
        pariwarId: PARIWAR_A,
        accounts: ([1, 2] as const).map((rank) => ({
          accountRank: rank,
          accountHolderNameCiphertext: `enc:v1:h-${rank}`,
          accountNumberCiphertext: `enc:v1:a-${rank}`,
          ifscCiphertext: `enc:v1:i-${rank}`,
          vpaCiphertext: null,
          nameDifferenceNoteCiphertext: null,
          bankName: 'HDFC Bank',
          branch: null,
          ifscValidated: true,
        })),
        recordedByActor: HELPLINE,
        actor: 'operator',
        allowCorrection: true,
        correctionReason: 'corrected after the return',
      });

    // ⛔ REFUSED with no live return — the window constant is genuinely not widened.
    await expect(correction()).rejects.toMatchObject({ name: 'NomineeBankClaimNotCollectableError' });

    // ⭐ PERMITTED once the Pariwar Admin has returned the claim. The live governance row, not the
    // state, is what authorises the write — the deliberate first this story records.
    await returnToDistrictAdmin(client, returnInput(cid));
    await expect(correction()).resolves.toBeDefined();
  });

  it('⭐ AC8 — the cycle-freeze read carries the difference REASON CODES, and never a name', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const cid = toClaimId(randomUUID());
    const mid = toMemberId(randomUUID());
    await driveTo(client, cid, mid, 'verifier_approved');
    await seedNomineeNameCheck(client, PARIWAR_A, cid, {
      verdicts: ['matches', 'clerical_difference'],
      clericalReasons: [null, 'married_name'],
    });

    // ⚠⚠ THE PLANT IS LOAD-BEARING, AND IT WAS MISSING (code review 2026-09-22). This test used to
    // assert `not.toContain('Asha')` while ⛔ NO fixture anywhere planted that string — the seeded
    // ciphertexts are `enc:v1:holder-N`. ⇒ that half of the assertion could ⛔ never fail, and a
    // read that copied the stored holder column straight into the row would have passed it
    // ([[feedback_gate_scope_semantic_coverage]] — a green that has never been seen red).
    // ⭐ So the name is planted INTO the stored column first. It is deliberately ⛔ NOT a real
    // encryption: this layer ⛔ never decrypts, so the strongest thing the DOMAIN can prove is that
    // the read does not pass the STORED bytes through. The decrypted-plaintext leg belongs to an
    // API test with a real envelope ([[feedback_record_unattested_no_backfill]] — say what is
    // proven here, ⛔ not what sounds stronger).
    const PLANTED_NAME = 'Asha Devi';
    await tx
      .update(schema.claimNomineeBankAccounts)
      .set({ accountHolderNameCiphertext: `enc:v1:${PLANTED_NAME}` })
      .where(
        and(
          eq(schema.claimNomineeBankAccounts.pariwarId, PARIWAR_A),
          eq(schema.claimNomineeBankAccounts.claimCaseId, cid),
        ),
      );
    // ⛔ NON-VACUITY: the plant actually landed. Without this the assertion below is back to
    // proving nothing, just more elaborately.
    const planted = await tx
      .select({ h: schema.claimNomineeBankAccounts.accountHolderNameCiphertext })
      .from(schema.claimNomineeBankAccounts)
      .where(
        and(
          eq(schema.claimNomineeBankAccounts.pariwarId, PARIWAR_A),
          eq(schema.claimNomineeBankAccounts.claimCaseId, cid),
        ),
      );
    expect(planted.length).toBe(2);
    expect(planted.every((r) => r.h.includes(PLANTED_NAME))).toBe(true);

    const pending = await getCycleFreezePending(tx, PARIWAR_A);
    const row = pending.readyToFreeze.find((c) => c.claimCaseId === String(cid));
    expect(row).toBeDefined();
    // ⭐ The highlight rides the surface's OWN read (AC8) — codes only.
    expect(row!.nameDifferenceReasons).toEqual(['married_name']);
    // ⭐ And carries ⛔ no name: the whole row is scanned, ⛔ not just the flag.
    const dump = JSON.stringify(row);
    expect(dump).not.toContain('holder');
    expect(dump, 'the cycle-freeze row carried the stored holder bytes through').not.toContain(
      PLANTED_NAME,
    );
  });

  it('⭐ AC8 — a claim whose check recorded NO difference carries an empty flag', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const cid = toClaimId(randomUUID());
    await driveTo(client, cid, toMemberId(randomUUID()), 'verifier_approved');
    await seedNomineeNameCheck(client, PARIWAR_A, cid);

    const pending = await getCycleFreezePending(tx, PARIWAR_A);
    const row = pending.readyToFreeze.find((c) => c.claimCaseId === String(cid));
    expect(row!.nameDifferenceReasons).toEqual([]);
    expect(row!.underCorrection).toBe(false);
  });

  it('⛔ D1 — a RETURN from `state_trustee_approved` is REFUSED (the dead end this story closed)', async () => {
    // ⚠⚠ THIS TEST REPLACES ONE THAT ASSERTED THE OPPOSITE, and the reversal is the point
    // (code review 2026-09-20, D1 = option A). The pre-commit window looked returnable — cl.4 makes
    // the approval final only at commit — but a return written there could ⛔ NEVER be cleared:
    // `voteOnFrozenClaim` (the only code that supersedes a return row) refuses the state, and
    // `NOMINEE_NAME_CHECK_RECORDABLE_STATES` excludes it, so the District Admin could not record
    // the fresh check resubmission is derived from. The claim would be stuck with no exit at all,
    // which is exactly the dead end AC5 forbids.
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const cid = toClaimId(randomUUID());
    await driveTo(client, cid, toMemberId(randomUUID()), 'verifier_approved');
    await seedNomineeNameCheck(client, PARIWAR_A, cid);
    await voteOnFrozenClaim(client, voteInput(cid, 'approved'));
    expect(await claimState(tx, cid)).toBe('state_trustee_approved');

    await expect(returnToDistrictAdmin(client, returnInput(cid))).rejects.toMatchObject({
      name: 'ClaimNotReturnableError',
    });
  });

  it('⭐ a claim under correction is EXCLUDED from the commit set (AC11) — with a POSITIVE control', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);

    // ⚠⚠ THE SETUP IS NOW A REACHABLE ONE. The previous version returned the claim from
    // `state_trustee_approved`, which D1 refuses — so it would have thrown before reaching the
    // assertion. A return at `state_trustee_freeze` is the real shape: the Pariwar Admin opens the
    // freeze and sends the claim back instead of voting it through.
    const returned = toClaimId(randomUUID());
    await driveTo(client, returned, toMemberId(randomUUID()), 'verifier_approved');
    await seedNomineeNameCheck(client, PARIWAR_A, returned);
    await returnToDistrictAdmin(client, returnInput(returned));

    // ⭐⭐ THE POSITIVE CONTROL, WITHOUT WHICH THIS TEST PROVED NOTHING. An identical claim with
    // ⛔ no return row MUST be committed — otherwise the assertion below would pass just as happily
    // if `commitCycleFreeze` committed nothing at all, or threw, or the whole candidate query were
    // broken. A negative-only exclusion test is indistinguishable from a no-op.
    const ordinary = toClaimId(randomUUID());
    await driveTo(client, ordinary, toMemberId(randomUUID()), 'verifier_approved');
    await seedNomineeNameCheck(client, PARIWAR_A, ordinary);
    await voteOnFrozenClaim(client, voteInput(ordinary, 'approved'));
    expect(await claimState(tx, ordinary)).toBe('state_trustee_approved');

    const res = await commitCycleFreeze(client, {
      pariwarId: PARIWAR_A,
      commitId: toCommitId(randomUUID()),
      actorId: TRUSTEE,
      actorDisplay: 'Pariwar Admin One',
      actor: 'trustee',
    });

    expect(res.committedClaimIds).toContain(String(ordinary));
    expect(res.committedClaimIds).not.toContain(String(returned));
    // ⛔ The returned claim is not approved, and ⛔ not denied — it waits for a correction.
    expect(await claimState(tx, returned)).toBe('verifier_approved');
    expect(await eventTypes(tx, returned)).not.toContain('claim.approved');
  });

  it('⛔ the RETURNABLE matrix — `verifier_review` and `denied` are REFUSED', async () => {
    // ⚠ Only `verifier_approved` and `state_trustee_freeze` were ever exercised, i.e. only the
    // states that ALLOW a return. The states that must REFUSE one were exercised nowhere, so
    // `TRUSTEE_RETURNABLE_STATES` could have been widened by accident and every test stayed green.
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);

    // Mid-verification: the District Admin has not finished, so there is nothing to send back.
    const inReview = toClaimId(randomUUID());
    await driveTo(client, inReview, toMemberId(randomUUID()), 'verifier_review');
    await expect(
      returnToDistrictAdmin(client, returnInput(inReview)),
      "a return from 'verifier_review' must be refused",
    ).rejects.toMatchObject({ name: 'ClaimNotReturnableError' });

    // ⛔ AND A TERMINAL CLAIM. A denied claim has its own governed route (the appeal flow, 6.16);
    // returning it would put a live correction record on a claim nothing can clear.
    const denied = toClaimId(randomUUID());
    await driveTo(client, denied, toMemberId(randomUUID()), 'verifier_review');
    await denyFromReview(client, denied);
    expect(await claimState(tx, denied)).toBe('denied');
    await expect(
      returnToDistrictAdmin(client, returnInput(denied)),
      "a return from 'denied' must be refused",
    ).rejects.toMatchObject({ name: 'ClaimNotReturnableError' });
  });
}, { timeout: 20000 });
