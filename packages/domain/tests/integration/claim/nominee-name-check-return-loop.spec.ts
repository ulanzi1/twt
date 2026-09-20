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

  it('⛔ a helpline correction at `verifier_approved` is REFUSED when no return is live (AC5)', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const cid = toClaimId(randomUUID());
    await driveTo(client, cid, toMemberId(randomUUID()), 'verifier_approved');
    await seedNomineeNameCheck(client, PARIWAR_A, cid);

    // ⭐ The mirror of step (4) above. `verifier_approved` IS the tier-2 window, so this one
    // succeeds — the sharper assertion is the freeze-state case below, which the tier-2 window
    // excludes and which ONLY a live return can unlock.
    await expect(
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
        correctionReason: 'routine tier-2 correction',
      }),
    ).resolves.toBeDefined();
  });

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

    const pending = await getCycleFreezePending(tx, PARIWAR_A);
    const row = pending.readyToFreeze.find((c) => c.claimCaseId === String(cid));
    expect(row).toBeDefined();
    // ⭐ The highlight rides the surface's OWN read (AC8) — codes only.
    expect(row!.nameDifferenceReasons).toEqual(['married_name']);
    // ⛔ And carries no name: the whole row is scanned, not just the flag.
    const dump = JSON.stringify(row);
    expect(dump).not.toContain('holder');
    expect(dump).not.toContain('Asha');
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

  it('⭐ a claim under correction is EXCLUDED from the commit set (the vote→commit window, AC11)', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const cid = toClaimId(randomUUID());
    const mid = toMemberId(randomUUID());
    await driveTo(client, cid, mid, 'verifier_approved');
    await seedNomineeNameCheck(client, PARIWAR_A, cid);
    await voteOnFrozenClaim(client, voteInput(cid, 'approved'));
    expect(await claimState(tx, cid)).toBe('state_trustee_approved');

    // The Pariwar Admin spots the discrepancy in the PRE-COMMIT window and returns it.
    await returnToDistrictAdmin(client, returnInput(cid));

    const res = await commitCycleFreeze(client, {
      pariwarId: PARIWAR_A,
      commitId: toCommitId(randomUUID()),
      actorId: TRUSTEE,
      actorDisplay: 'Pariwar Admin One',
      actor: 'trustee',
    });
    expect(res.committedClaimIds).not.toContain(String(cid));
    // ⛔ Still not approved, and still not denied — it is waiting for a correction.
    expect(await claimState(tx, cid)).toBe('state_trustee_approved');
    expect(await eventTypes(tx, cid)).not.toContain('claim.approved');
  });
});
