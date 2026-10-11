// Story 6.28 — shared live-DB fixtures: a claim of a death in a GIVEN lifecycle state, through the projector (raw lifecycle
// events — the claim is ⛔ not the subject; the writer under test is). `approvable` claims carry the default final-approval
// fixtures (certificate, accounts, name check, determination, a completed visit — `driveClaimTo` + the name check).

import { randomUUID } from 'node:crypto';

import type pg from 'pg';

import { projectClaimState } from '../../../src/claim/index.js';
import { claimId as toClaimId, memberId as toMemberId, pariwarId as toPariwarId } from '../../../src/ids/index.js';
import type { ClaimId } from '../../../src/ids/index.js';
import { driveClaimTo, seedNomineeNameCheck } from '../_helpers.js';

export type FixtureState =
  | 'verifier_review'
  | 'verifier_approved'
  | 'state_trustee_freeze'
  | 'state_trustee_approved'
  | 'approved'
  | 'settled'
  | 'denied'
  | 'appeal_stage_1'
  | 'closed';

/** Append ONE raw lifecycle event through the projector. */
export async function emitClaim(
  client: pg.PoolClient,
  pariwarId: string,
  cid: string,
  mid: string,
  from: string,
  to: string,
  eventType: string,
  extra: Record<string, unknown> = {},
  actorId: string | null = null,
): Promise<void> {
  await projectClaimState(client, {
    claimCaseId: toClaimId(cid),
    pariwarId: toPariwarId(pariwarId),
    deceasedMemberId: toMemberId(mid),
    intakeChannels: ['member_app'],
    claimantActorId: null,
    eventType: eventType as never,
    payload: { from_state: from, to_state: to, trigger: 'test', actor: 'system', ...extra } as never,
    actorId,
  });
}

/** A claim of death `mid` in `state` (an optional fixed `claimCaseId` — to pin "the lowest id"; `bare` skips the name-check
 *  fixtures, which seed the member's declaration — for a second claim of the same member id in another Pariwar). */
export async function claimAt(
  client: pg.PoolClient,
  pariwarId: string,
  mid: string,
  state: FixtureState,
  opts: { readonly claimCaseId?: string; readonly bare?: boolean } = {},
): Promise<ClaimId> {
  const cid = toClaimId(opts.claimCaseId ?? randomUUID());
  const e = (from: string, to: string, type: string, extra: Record<string, unknown> = {}) =>
    emitClaim(client, pariwarId, cid, mid, from, to, type, extra);
  if (state === 'verifier_review' || state === 'denied' || state === 'appeal_stage_1' || state === 'closed') {
    await driveClaimTo(client, pariwarId, cid, mid, 'verifier_review');
    if (state === 'verifier_review') return cid;
    if (state === 'closed') {
      await e('verifier_review', 'closed', 'claim.closed', {
        trigger: 'suspicion_appeal_allowed',
        held_by_claim_case_id: randomUUID(),
        deceased_member_id: mid,
      });
      return cid;
    }
    await e('verifier_review', 'denied', 'claim.verifier_denied', { actor: 'operator' });
    if (state === 'appeal_stage_1') await e('denied', 'appeal_stage_1', 'claim.appeal_stage1_initiated');
    return cid;
  }
  await driveClaimTo(client, pariwarId, cid, mid, 'verifier_approved');
  if (!opts.bare) await seedNomineeNameCheck(client, pariwarId, cid);
  if (state === 'verifier_approved') return cid;
  await e('verifier_approved', 'state_trustee_freeze', 'claim.state_trustee_frozen');
  if (state === 'state_trustee_freeze') return cid;
  await e('state_trustee_freeze', 'state_trustee_approved', 'claim.state_trustee_approved');
  if (state === 'state_trustee_approved') return cid;
  await e('state_trustee_approved', 'approved', 'claim.approved');
  if (state === 'approved') return cid;
  await e('approved', 'settled', 'claim.settled', { deceased_member_id: mid });
  return cid;
}

/** Keep `against` APART from every later filing of the death (a raw `convergence_overrides` ledger row — the override's
 *  candidate-suppression key; the override WRITER is the subject elsewhere). */
export async function overriddenApart(client: pg.PoolClient, pariwarId: string, mid: string, against: string): Promise<void> {
  await client.query(
    `INSERT INTO convergence_overrides (pariwar_id, deceased_member_id, intake_attempt_id, against_claim_case_id, reason, decided_by_actor)
     VALUES ($1, $2, $3, $4, 'fixture — kept apart', $5)`,
    [pariwarId, mid, randomUUID(), against, randomUUID()],
  );
}
