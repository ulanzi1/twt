// Story 6.22 — the convergence edges a fraud finding touches (AC10; DL9 (b), (e), (f); 6.38 DL7's two residual edges). Live DB.
//
//   (b) the OVERRIDE refuses a `closed` against-claim; onto an `approved` claim released by innocence (⛔ report stands) the
//       claim DOOR answers — a member who never joined is refused (`ClaimIntakeRefusedError`), as at intake;
//   (e) a MERGE confirmed after a finding closed the canonical claim is refused UNDER the intake lock;
//   (f) an attempt parked `pending` beside a claim later found-alive-closed has ⛔ candidate — it stays `pending` (the residual,
//       pinned); the override refuses a claim closed by a NON-fraud trigger too (RF6 / OP4 — every `closed`, R2-5);
//   (a) a closable claim released by the finding is ⛔ longer a candidate (it is `closed`).

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  ClaimIntakeRefusedError,
  IntakeMergeTargetNotCandidateError,
  IntakeOverrideAgainstClosedClaimError,
  convergeIntakeAttempt,
  flagClaimForFraudInvestigation,
  getConvergenceCandidate,
  overrideIntakeAttempt,
  recordFraudFinding,
  tryConverge,
} from '../../../src/claim/index.js';
import {
  claimFraudInvestigationStepId as toStepId,
  claimNomineeFindingId as toFindingId,
  intakeAttemptId as toAttemptId,
  memberId as toMemberId,
  type ClaimId,
  type PariwarId,
} from '../../../src/ids/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, enterAppScope } from '../_helpers.js';
import { claimAt, emitClaim } from './_one-payment-fixtures.js';

type Client = ReturnType<typeof getTx>['client'];
const PID = PARIWAR_A as PariwarId;
const OPERATOR = 'a5a5a5a5-0000-4000-8000-000000000001';
const DA = 'd5d5d5d5-0000-4000-8000-000000000002';

async function investigate(client: Client, cid: ClaimId): Promise<void> {
  const base = { claimCaseId: cid, pariwarId: PID, noteCiphertext: 'enc:v1:note', actor: 'operator' as const };
  await flagClaimForFraudInvestigation(client, { ...base, stepId: toStepId(randomUUID()), actorId: OPERATOR, actorDisplay: 'Helpline Operator' });
  await recordFraudFinding(client, {
    ...base, outcome: 'innocent', aliveConfirmation: 'in_person', stepId: toStepId(randomUUID()),
    findingId: toFindingId(randomUUID()), actorId: DA, actorDisplay: 'District Admin',
  });
}

/** A claim of `mid` in `state` (member_app) and a CROSS-CHANNEL second report parked `pending` beside it. */
async function claimWithPendingAttempt(client: Client, mid: string, state: 'verifier_review' | 'approved') {
  const cid = await claimAt(client, PID, mid, state, { bare: true });
  const second = await tryConverge(client, {
    pariwarId: PID, deceasedMemberId: toMemberId(mid), intakeChannel: 'helpline', actor: 'operator',
    claimantActorId: null, trigger: 'test_intake', actorId: null, auditId: randomUUID(),
  });
  expect(second).toMatchObject({ claimCaseId: cid, convergencePending: true, minted: false });
  return { cid, attemptId: toAttemptId(second.intakeAttemptId!) };
}

const override = (client: Client, mid: string, attemptId: ReturnType<typeof toAttemptId>, against: ClaimId) =>
  overrideIntakeAttempt(client, {
    intakeAttemptId: attemptId, pariwarId: PID, deceasedMemberId: toMemberId(mid), intakeChannel: 'helpline',
    againstClaimCaseId: against, reason: 'separate case', actor: 'operator', claimantActorId: null,
    decidedByActor: OPERATOR, auditId: randomUUID(),
  });

const attemptStatus = async (client: Client, attemptId: string) =>
  (await client.query<{ s: string }>('SELECT attempt_status::text AS s FROM intake_attempts WHERE intake_attempt_id = $1', [attemptId])).rows[0]?.s;

describe.skipIf(!hasDatabase)('Story 6.22 — the override door and the merge re-check (AC10)', { timeout: 30000 }, () => {
  setupLiveDb();

  it('(a) + (f) — a released CLOSABLE claim is ⛔ longer a candidate; the attempt parked beside it stays `pending` (residual)', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PID);
    const mid = randomUUID();
    const { cid, attemptId } = await claimWithPendingAttempt(client, mid, 'verifier_review');
    await investigate(client, cid);
    expect(await getConvergenceCandidate(tx, PID, toMemberId(mid))).toBeUndefined();
    expect(await attemptStatus(client, attemptId)).toBe('pending');
  });

  it('(b) the override onto a `closed` against-claim is refused — ⛔ ledger row, ⛔ new claim', async () => {
    const { client } = getTx();
    await enterAppScope(client, PID);
    const mid = randomUUID();
    const { cid, attemptId } = await claimWithPendingAttempt(client, mid, 'verifier_review');
    await investigate(client, cid);
    await expect(override(client, mid, attemptId, cid)).rejects.toBeInstanceOf(IntakeOverrideAgainstClosedClaimError);
    const { rows } = await client.query('SELECT 1 FROM claims WHERE deceased_member_id = $1', [mid]);
    expect(rows).toHaveLength(1);
    expect(await attemptStatus(client, attemptId)).toBe('pending');
  });

  // R2-5 — the door refuses EVERY `closed` against-claim, ⛔ only a fraud close (`-438` item 8's generality): an RF6 or OP4
  // closure leaves the attempt with ⛔ candidate and ⛔ override — the residual is "a claim later CLOSED (any trigger)".
  it.each(['suspicion_appeal_allowed', 'death_already_finally_approved'] as const)(
    '(b) + (f) R2-5 — the override onto a claim CLOSED by a NON-fraud trigger (`%s`) is refused — ⛔ ledger row, ⛔ new claim, the attempt stays `pending`',
    async (trigger) => {
      const { client } = getTx();
      await enterAppScope(client, PID);
      const mid = randomUUID();
      const { cid, attemptId } = await claimWithPendingAttempt(client, mid, 'verifier_review');
      await emitClaim(client, PID, cid, mid, 'verifier_review', 'closed', 'claim.closed', {
        trigger, held_by_claim_case_id: randomUUID(), deceased_member_id: mid,
      });
      // The control: the claim IS closed, by THIS trigger, and ⛔ fraud finding touched it.
      const { rows: closedBy } = await client.query<{ s: string; t: string }>(
        `SELECT c.current_state::text AS s, e.payload ->> 'trigger' AS t
           FROM claims c JOIN events_log e ON e.stream_id = c.claim_case_id AND e.event_type = 'claim.closed'
          WHERE c.claim_case_id = $1`,
        [cid],
      );
      expect(closedBy).toEqual([{ s: 'closed', t: trigger }]);
      await expect(override(client, mid, attemptId, cid)).rejects.toBeInstanceOf(IntakeOverrideAgainstClosedClaimError);
      const { rows } = await client.query('SELECT 1 FROM claims WHERE deceased_member_id = $1', [mid]);
      expect(rows).toHaveLength(1);
      const { rows: ledger } = await client.query('SELECT 1 FROM convergence_overrides WHERE intake_attempt_id = $1', [attemptId]);
      expect(ledger).toHaveLength(0);
      expect(await attemptStatus(client, attemptId)).toBe('pending');
    },
  );

  it('(b) onto an `approved` claim released by innocence (⛔ report stands) the DOOR answers — a member who never joined is refused', async () => {
    const { client } = getTx();
    await enterAppScope(client, PID);
    const mid = randomUUID(); // ⛔ member events ⇒ `pending-kyc` ⇒ the door refuses (`not_joined`)
    const { cid, attemptId } = await claimWithPendingAttempt(client, mid, 'approved');
    await investigate(client, cid);
    await expect(override(client, mid, attemptId, cid)).rejects.toSatisfy(
      (e: unknown) => e instanceof ClaimIntakeRefusedError && e.reason === 'not_joined',
    );
  });

  it('a report still standing ⇒ ⛔ door (the override behaves as before — separate claim minted)', async () => {
    const { client } = getTx();
    await enterAppScope(client, PID);
    const mid = randomUUID();
    const { cid, attemptId } = await claimWithPendingAttempt(client, mid, 'verifier_review');
    const out = await override(client, mid, attemptId, cid);
    expect(out.newClaimCaseId).not.toBe(cid);
    expect(await attemptStatus(client, attemptId)).toBe('overridden_separate');
  });

  it('(e) a MERGE onto a canonical claim a finding has since closed is refused under the lock — the channel is ⛔ merged', async () => {
    const { client } = getTx();
    await enterAppScope(client, PID);
    const mid = randomUUID();
    const { cid, attemptId } = await claimWithPendingAttempt(client, mid, 'verifier_review');
    await investigate(client, cid);
    await expect(
      convergeIntakeAttempt(client, {
        intakeAttemptId: attemptId, pariwarId: PID, deceasedMemberId: toMemberId(mid), canonicalClaimCaseId: cid,
        intakeChannel: 'helpline', resolvedByActor: OPERATOR, auditId: randomUUID(),
      }),
    ).rejects.toBeInstanceOf(IntakeMergeTargetNotCandidateError);
    const { rows } = await client.query<{ ch: string[] }>('SELECT intake_channels::text[] AS ch FROM claims WHERE claim_case_id = $1', [cid]);
    expect(rows[0]!.ch).toEqual(['member_app']);
  });
});
