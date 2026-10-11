// Story 6.28 — OP7: every path that reached two payments for one death, PINNED (live DB :5433). `2026-10-11-319`.
//
// DOMAIN layer (this file): each path drives the SECOND claim to a final writer BEFORE any closure site runs, with the first
// claim finally approved, and the writer is STOPPED (`DeathAlreadyFinallyApprovedError`):
//   F5  — two live claims of one death far apart in time (the pre-OP11 > 30-day mint — seeded as a legacy pair);
//   F6  — the override: a filing kept APART from an unpaid voted claim mints a second live claim;
//   F7  — after a TERMINAL claim (`denied`) the death re-files freely; the refused claim is then appealed and REVERSED;
//   F8  — an ordinary refusal reversed (the pre-6.24a root), and a `-239` refusal revised OFF before any other claim existed;
//   `-294` §2 (b) — a later filing for a death with an older REVERSED claim now JOINS it (OP11 — ⛔ a second claim);
//   `-294` §2 (c) — the death committed, then an allowed suspicion appeal: the payment stands, the appellant is CLOSED by H(iii)
//                   and its final approval would be stopped.
// `-294` §2 (a) (path (a), both timings) is pinned in `one-payment-per-death-closure.spec.ts` (AC9).
// API layer: the closure at each SITE — after the commit (H(i)), at the mint and the override (H(ii)), at the reversal
// (H(iii)), after a stopped final writer (H(iv)) — is pinned in `apps/api/…/one-payment-per-death-routes.spec.ts`.

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  DeathAlreadyFinallyApprovedError,
  assertNoOtherFinalApprovalForDeath,
  initiateAppeal,
  overrideIntakeAttempt,
  reviseDecision,
  tryConverge,
  voteOnFrozenClaim,
} from '../../../src/claim/index.js';
import { claimId as toClaimId, memberId as toMemberId, type ClaimId, type IntakeAttemptId, type MemberId, type PariwarId } from '../../../src/ids/index.js';
import type * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, seedNomineeNameCheck } from '../_helpers.js';
import { claimAt, emitClaim } from './_one-payment-fixtures.js';
import { DA, openAppeal, refusedClaim, reverseAtStage1, stateOf } from './_suspicion-refusal-fixtures.js';

type Client = ReturnType<typeof getTx>['client'];
const PA = 'a5a5a5a5-0000-4000-8000-000000000028';

const intake = (mid: MemberId, channel: schema.ClaimIntakeChannel) => ({
  pariwarId: PARIWAR_A,
  deceasedMemberId: mid,
  intakeChannel: channel,
  actor: 'member' as const,
  claimantActorId: null,
  trigger: 'test_intake',
  actorId: null,
  auditId: randomUUID(),
});

/** The FINAL vote on `cid`. `warned` — two OPEN claims of one death show `other_claim_for_death`, which the vote answers. */
const finalVote = (client: Client, pid: PariwarId, cid: ClaimId, warned = true) =>
  voteOnFrozenClaim(client, {
    claimCaseId: cid, pariwarId: pid, outcome: 'approved', reasonCode: null, rationaleCiphertext: 'enc:v1:why',
    warningReasonCode: warned ? 'warnings_reviewed' : null, actorId: PA, actorDisplay: 'Pariwar Admin', actor: 'trustee',
  });

/** Run `fn` under a SAVEPOINT and return its error (rolled back) — the refused writer leaves ⛔ nothing. */
async function errorOf(client: Client, fn: () => Promise<unknown>): Promise<unknown> {
  await client.query('SAVEPOINT opd_path');
  try {
    await fn();
    await client.query('RELEASE SAVEPOINT opd_path');
    return null;
  } catch (err) {
    await client.query('ROLLBACK TO SAVEPOINT opd_path');
    return err;
  }
}

const stoppedBy = (x: ClaimId) => (e: unknown) => e instanceof DeathAlreadyFinallyApprovedError && e.approvedClaimCaseId === x;

/** Drive a freshly minted claim (`intake_converged`) to `verifier_approved` with the default approval fixtures. */
async function toApprovable(client: Client, cid: string, mid: string): Promise<void> {
  await emitClaim(client, PARIWAR_A, cid, mid, 'intake_converged', 'documents_pending', 'claim.documents_received');
  await emitClaim(client, PARIWAR_A, cid, mid, 'documents_pending', 'verification_in_progress', 'claim.peer_mesh_pinged', {
    selected_member_ids: [randomUUID()], metric_id: 'district_cohort_v1', metric_version: 1,
  });
  await emitClaim(client, PARIWAR_A, cid, mid, 'verification_in_progress', 'verifier_review', 'claim.verifier_reviewing');
  await seedNomineeNameCheck(client, PARIWAR_A, cid);
  await emitClaim(client, PARIWAR_A, cid, mid, 'verifier_review', 'verifier_approved', 'claim.verifier_approved');
}

describe.skipIf(!hasDatabase)('Story 6.28 — OP7: the paths to two payments, each stopped at the second final approval (:5433)', { timeout: 30000 }, () => {
  setupLiveDb();

  it('F5 — two live claims of one death (the pre-OP11 > 30-day mint, a seeded legacy pair): X voted ⇒ Y\'s final vote STOPPED', async () => {
    const { client } = getTx();
    const mid = toMemberId(randomUUID());
    const x = await claimAt(client, PARIWAR_A, mid, 'state_trustee_approved');
    const y = await claimAt(client, PARIWAR_A, mid, 'verifier_approved');
    await client.query("UPDATE claims SET created_at = now() - interval '45 days' WHERE claim_case_id = $1", [x]);
    expect(await errorOf(client, () => finalVote(client, PARIWAR_A, y))).toSatisfy(stoppedBy(x));
    expect(await stateOf(client, y)).toBe('verifier_approved');
  });

  it('F6 — the override: a filing kept apart from a VOTED (unpaid) X mints a live claim; its final vote is STOPPED', async () => {
    const { client } = getTx();
    const mid = toMemberId(randomUUID());
    const x = await claimAt(client, PARIWAR_A, mid, 'state_trustee_approved'); // member_app
    const parked = await tryConverge(client, intake(mid, 'helpline'));
    expect(parked).toMatchObject({ claimCaseId: x, convergencePending: true });
    const over = await overrideIntakeAttempt(client, {
      intakeAttemptId: parked.intakeAttemptId as IntakeAttemptId, pariwarId: PARIWAR_A, deceasedMemberId: mid, intakeChannel: 'helpline',
      againstClaimCaseId: x, reason: 'a different family member', actor: 'operator', claimantActorId: null, decidedByActor: DA, auditId: randomUUID(),
    });
    expect(over.state).toBe('intake_converged'); // ⛔ paid yet ⇒ ⛔ closed at the mint
    const m = toClaimId(over.newClaimCaseId);
    await toApprovable(client, m, mid);
    expect(await errorOf(client, () => finalVote(client, PARIWAR_A, m))).toSatisfy(stoppedBy(x));
  });

  it('F7 — after a TERMINAL claim the death re-files; the refused claim is then REVERSED: its final vote is STOPPED by the refile\'s', async () => {
    const { client } = getTx();
    const mid = toMemberId(randomUUID());
    const s = await refusedClaim(client, PARIWAR_A, mid, { reason: 'other' });
    const refile = await tryConverge(client, intake(mid, 'member_app'));
    expect(refile.minted).toBe(true); // a terminal claim is ⛔ a candidate
    const y = toClaimId(refile.claimCaseId);
    await toApprovable(client, y, mid);
    expect((await finalVote(client, PARIWAR_A, y, false)).claimState).toBe('state_trustee_approved'); // the refused claim is terminal ⇒ ⛔ warning
    await openAppeal(client, PARIWAR_A, s);
    expect((await reverseAtStage1(client, PARIWAR_A, s)).claimState).toBe('reversed'); // Y voted, ⛔ paid ⇒ ⛔ closed
    await seedNomineeNameCheck(client, PARIWAR_A, s);
    expect(await errorOf(client, () => finalVote(client, PARIWAR_A, s))).toSatisfy(stoppedBy(y));
  });

  it('F8 — the pre-6.24a root: an ORDINARY refusal reversed beside a voted claim ⇒ its final vote STOPPED', async () => {
    const { client } = getTx();
    const mid = toMemberId(randomUUID());
    const x = await claimAt(client, PARIWAR_A, mid, 'state_trustee_approved');
    const s = await refusedClaim(client, PARIWAR_A, mid, { reason: 'other' });
    await openAppeal(client, PARIWAR_A, s);
    expect((await reverseAtStage1(client, PARIWAR_A, s)).claimState).toBe('reversed');
    await seedNomineeNameCheck(client, PARIWAR_A, s);
    expect(await errorOf(client, () => finalVote(client, PARIWAR_A, s))).toSatisfy(stoppedBy(x));
  });

  it('F8 — a `-239` refusal revised OFF before any other claim existed, then reversed beside a voted refile ⇒ STOPPED', async () => {
    const { client } = getTx();
    const mid = toMemberId(randomUUID());
    const s = await refusedClaim(client, PARIWAR_A, mid, { ground: true }); // `-239`
    await reviseDecision(client, {
      claimCaseId: s, pariwarId: PARIWAR_A, outcome: 'denied', reasonCode: 'other', rationaleCiphertext: 'enc:v1:revised',
      actorId: DA, actorDisplay: 'Anita (District Admin)', actor: 'operator',
    }); // RF13 locks only while ANOTHER claim lives — none does yet
    const refile = await tryConverge(client, intake(mid, 'member_app'));
    const y = toClaimId(refile.claimCaseId);
    await toApprovable(client, y, mid);
    expect((await finalVote(client, PARIWAR_A, y, false)).claimState).toBe('state_trustee_approved'); // the refused claim is terminal ⇒ ⛔ warning
    await initiateAppeal(client, { claimCaseId: s, pariwarId: PARIWAR_A, initiatedByActor: randomUUID(), initiatedOnBehalf: true, actor: 'operator' });
    await reverseAtStage1(client, PARIWAR_A, s);
    await seedNomineeNameCheck(client, PARIWAR_A, s);
    expect(await errorOf(client, () => finalVote(client, PARIWAR_A, s))).toSatisfy(stoppedBy(y));
  });

  it('`-294` §2 (b) — a later filing for a death with an older REVERSED claim now JOINS it (OP11 — ⛔ a second claim)', async () => {
    const { client } = getTx();
    const mid = toMemberId(randomUUID());
    const s = await refusedClaim(client, PARIWAR_A, mid, { reason: 'other' });
    await openAppeal(client, PARIWAR_A, s);
    await reverseAtStage1(client, PARIWAR_A, s);
    await client.query("UPDATE claims SET created_at = now() - interval '200 days' WHERE claim_case_id = $1", [s]);
    const later = await tryConverge(client, intake(mid, 'member_app'));
    expect(later).toMatchObject({ claimCaseId: s, minted: false });
  });

  it('`-294` §2 (c) — the death COMMITTED, then an allowed suspicion appeal: the payment stands; the appellant is CLOSED (H(iii)) and would be STOPPED', async () => {
    const { client, tx } = getTx();
    const mid = toMemberId(randomUUID());
    const s = await refusedClaim(client, PARIWAR_A, mid); // `-239`
    const x = await claimAt(client, PARIWAR_A, mid, 'approved');
    await openAppeal(client, PARIWAR_A, s);
    const out = await reverseAtStage1(client, PARIWAR_A, s);
    expect(out.heldClaims?.notClosed).toEqual([{ claimCaseId: x, state: 'approved' }]);
    expect(out.claimState).toBe('closed');
    await expect(assertNoOtherFinalApprovalForDeath(tx, PARIWAR_A, s, mid)).rejects.toSatisfy(stoppedBy(x));
  });
});
