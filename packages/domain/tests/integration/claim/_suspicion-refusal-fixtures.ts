// Story 6.24a — shared live-DB fixtures for the refile-after-a-suspicion-refusal specs (`2026-10-07-292`).
//
// ⭐ Trap 19 — a forced `current_state` does ⛔ not survive `projectClaimState`'s replay, so every claim here reaches its
// state through EVENTS: the refused claim S is driven to `denied` by the projector (`claim.verifier_denied`) with its
// decision ROW written beside it (the denial itself is ⛔ not the subject — `adjudicateClaim`'s `-239` grounding has its own
// 6.20 spec), and every APPEAL stage after that goes through the REAL writers (`initiateAppeal`, `reviewAppealStage1`,
// the Stage-2 panel, `decideAppealStage3`). `decidedAt` places the refusal in time (the 90-day limit, RF14).

import { randomUUID } from 'node:crypto';

import type pg from 'pg';

import { bindScopedDb } from '../../../src/db.js';
import {
  castAppealVote,
  decideAppealStage3,
  finalizeAppealOutcome,
  initiateAppeal,
  openAppealPanel,
  prepareAppealCiphertext,
  projectClaimState,
  reviewAppealStage1,
} from '../../../src/claim/index.js';
import { claimId as toClaimId, memberId as toMemberId, pariwarId as toPariwarId, type ClaimId } from '../../../src/ids/index.js';
import * as schema from '../../../src/schema/index.js';
import { listNomineeDeclarationVersions } from '../../../src/nominee/declaration-history.js';
import { versionStandsAt } from '../../../src/claim/nominee-effective.js';
import {
  driveClaimTo,
  enterAppScope,
  seedDeathCertificate,
  seedNomineeDeclaration,
  seedNomineeDetermination,
  seedRoleGrant,
} from '../_helpers.js';

export const DA = 'd2d2d2d2-0000-4000-8000-000000000001';
/** A Stage-1 reviewer who is ⛔ none of the refused claim's deciders (6.16 D-D). */
export const REVIEWER = 'e2e2e2e2-0000-4000-8000-000000000002';
export const TRUSTEE = 'f2f2f2f2-0000-4000-8000-000000000003';
export const CIPHER = prepareAppealCiphertext('enc:v1:appeal');

export type SuspicionReason = 'post_death_nominee_change' | 'other' | 'concealment_flag_uphold';

const CERTIFICATE_DATE = '2026-05-01';

/**
 * Ground a `-239` refusal for `cid` (in `verifier_review`) the way 6.20's spec does: the deceased's declaration history
 * (a version BEFORE the death and one AFTER it) and a District Admin determination that DISCARDS the post-death one —
 * so `reviseDecision` can move a reason ONTO `-239` (`assertPostDeathRefusalGrounded`).
 */
async function groundSuspicion(client: pg.PoolClient, pariwarId: string, deceasedMemberId: string, cid: string): Promise<void> {
  const tx = bindScopedDb(client);
  const fresh = await client.query(
    `INSERT INTO members (member_id, pariwar_id, state, state_event_version) VALUES ($1, $2, 'active', 1) ON CONFLICT DO NOTHING`,
    [deceasedMemberId, pariwarId],
  );
  if ((fresh.rowCount ?? 0) > 0) {
    await seedNomineeDeclaration(tx, pariwarId, deceasedMemberId, { declaredAt: new Date('2026-01-10T06:00:00.000Z'), ensureMember: false });
    await seedNomineeDeclaration(tx, pariwarId, deceasedMemberId, { declaredAt: new Date('2026-06-01T06:00:00.000Z'), ensureMember: false });
  }
  const versions = await listNomineeDeclarationVersions(tx, toPariwarId(pariwarId), toMemberId(deceasedMemberId));
  await seedNomineeDetermination(client, pariwarId, cid, {
    certificateDate: CERTIFICATE_DATE,
    marks: versions.map((v) => ({ versionId: v.versionId, mark: versionStandsAt(v.effectiveAt, CERTIFICATE_DATE) ? ('stands' as const) : ('discarded' as const) })),
  });
}

/** S — a claim of the death driven to `denied` (events), with its LIVE verifier decision row (`reason`, `decidedAt`).
 *  `ground` records the determination a `-239` revision needs (6.20's grounding guard). */
export async function refusedClaim(
  client: pg.PoolClient,
  pariwarId: string,
  deceasedMemberId: string,
  opts: { readonly reason?: SuspicionReason; readonly decidedAt?: Date; readonly claimCaseId?: string; readonly ground?: boolean } = {},
): Promise<ClaimId> {
  const cid = toClaimId(opts.claimCaseId ?? randomUUID());
  await driveClaimTo(client, pariwarId, cid, deceasedMemberId, 'verifier_review');
  if (opts.ground) await groundSuspicion(client, pariwarId, deceasedMemberId, cid);
  await projectClaimState(client, {
    claimCaseId: cid,
    pariwarId: toPariwarId(pariwarId),
    deceasedMemberId: toMemberId(deceasedMemberId),
    intakeChannels: ['member_app'],
    claimantActorId: null,
    eventType: 'claim.verifier_denied',
    payload: { from_state: 'verifier_review', to_state: 'denied', trigger: 'test', actor: 'operator' },
    actorId: DA,
  });
  await bindScopedDb(client).insert(schema.claimVerifierDecisions).values({
    claimCaseId: cid,
    pariwarId: toPariwarId(pariwarId),
    outcome: 'denied',
    reasonCode: opts.reason ?? 'post_death_nominee_change',
    rationaleCiphertext: 'enc:v1:rationale',
    actorId: DA,
    actorDisplay: 'Anita (District Admin)',
    ...(opts.decidedAt ? { decidedAt: opts.decidedAt } : {}),
  });
  return cid;
}

/** A COMPLETED FULL visit on `claimCaseId` (a raw insert — the inheritance read is what such a spec tests). */
export async function completedVisit(client: pg.PoolClient, pariwarId: string, claimCaseId: string): Promise<void> {
  const { uploadId } = await seedDeathCertificate(client, { pariwarId: toPariwarId(pariwarId), claimCaseId: toClaimId(claimCaseId) });
  await bindScopedDb(client).insert(schema.claimGroundInspections).values({
    claimCaseId: toClaimId(claimCaseId),
    pariwarId: toPariwarId(pariwarId),
    district: 'Patna',
    inspectionStage: 'initial',
    inspectionSiteType: 'family_residence',
    inspectorActorId: randomUUID(),
    scheduledAt: new Date('2026-05-01T06:00:00.000Z'),
    status: 'completed',
    completedAt: new Date('2026-05-02T06:00:00.000Z'),
    originalCertificateVerdict: 'matches',
    comparedCertificateUploadId: uploadId as never,
    deathDateCiphertext: 'enc:v1:death-date',
    deathDateSource: 'family_statement',
    deathDateIndex: 'fixture-death-date-index:2026-05-01',
  });
}

/** Grant two Stage-2 panel members `claim.appeal_vote` in the Pariwar (as the superuser, then back to app scope). */
export async function seedAppealPanel(client: pg.PoolClient, pariwarId: string): Promise<string[]> {
  const panel = [randomUUID(), randomUUID()];
  await client.query('RESET ROLE');
  for (const uid of panel) {
    await seedRoleGrant(bindScopedDb(client), pariwarId, { userId: uid, role: 'pariwar_admin', scopeDimension: 'pariwar', scopeValue: pariwarId });
  }
  await enterAppScope(client, pariwarId);
  return panel;
}

const pid = (p: string) => toPariwarId(p);

/** Open S's appeal (`denied` → `appeal_stage_1`) through the REAL writer. */
export async function openAppeal(client: pg.PoolClient, pariwarId: string, cid: ClaimId) {
  return initiateAppeal(client, { claimCaseId: cid, pariwarId: pid(pariwarId), initiatedByActor: randomUUID(), initiatedOnBehalf: true, actor: 'operator' });
}

const stage1 = (decision: 'advance' | 'reversed') => ({
  decision,
  dispositionCategory: decision === 'reversed' ? ('reconsideration_on_merits' as const) : null,
  reviewerActorId: REVIEWER,
  reviewerDisplay: 'Another District Admin',
  rationaleCiphertext: CIPHER,
  actor: 'operator' as const,
});

/** Drive S's open appeal to `appeal_stage_2` (Stage 1 advances). */
export async function toStage2(client: pg.PoolClient, pariwarId: string, cid: ClaimId) {
  return reviewAppealStage1(client, { claimCaseId: cid, pariwarId: pid(pariwarId), ...stage1('advance') });
}

/** Run S's Stage-2 panel: two votes, finalized — `reverse` ⇒ reversed, `deny` ⇒ advance to `appeal_stage_3`. */
export async function panelDecides(client: pg.PoolClient, pariwarId: string, cid: ClaimId, panel: string[], vote: 'reverse' | 'deny') {
  await openAppealPanel(client, { claimCaseId: cid, pariwarId: pid(pariwarId), panelActorIds: panel, actorId: panel[0]!, actorDisplay: 'P1', actor: 'trustee' });
  for (const uid of panel) {
    await castAppealVote(client, { claimCaseId: cid, pariwarId: pid(pariwarId), vote, rationaleCiphertext: CIPHER, actorId: uid, actorDisplay: 'P', actor: 'trustee' });
  }
  return finalizeAppealOutcome(client, {
    claimCaseId: cid,
    pariwarId: pid(pariwarId),
    rationaleCiphertext: CIPHER,
    dispositionCategory: vote === 'reverse' ? 'procedural_correction' : null,
    actorId: panel[0]!,
    actorDisplay: 'P1',
    actor: 'trustee',
  });
}

/** Stage 3 — `reversed` or `upheld` (final). */
export async function stage3(client: pg.PoolClient, pariwarId: string, cid: ClaimId, decision: 'reversed' | 'upheld') {
  return decideAppealStage3(client, {
    claimCaseId: cid,
    pariwarId: pid(pariwarId),
    decision,
    dispositionCategory: decision === 'reversed' ? 'new_evidence_presented' : null,
    reviewerActorId: TRUSTEE,
    reviewerDisplay: 'Trustee',
    rationaleCiphertext: CIPHER,
    actor: 'trustee',
  });
}

/** Reverse S at stage 1 (the short path). */
export async function reverseAtStage1(client: pg.PoolClient, pariwarId: string, cid: ClaimId) {
  return reviewAppealStage1(client, { claimCaseId: cid, pariwarId: pid(pariwarId), ...stage1('reversed') });
}

/** S's appeal opened and driven to `appeal_stage_N` (N = 1, 2, 3) through the real writers. */
export async function appealAtStage(client: pg.PoolClient, pariwarId: string, cid: ClaimId, stage: 1 | 2 | 3, panel: string[]) {
  await openAppeal(client, pariwarId, cid);
  if (stage >= 2) await toStage2(client, pariwarId, cid);
  if (stage === 3) await panelDecides(client, pariwarId, cid, panel, 'deny');
}

export async function stateOf(client: pg.PoolClient, cid: string): Promise<string | undefined> {
  const { rows } = await client.query<{ s: string }>('SELECT current_state AS s FROM claims WHERE claim_case_id = $1', [cid]);
  return rows[0]?.s;
}

export async function eventTypesOf(client: pg.PoolClient, cid: string): Promise<string[]> {
  const { rows } = await client.query<{ t: string }>('SELECT event_type AS t FROM events_log WHERE stream_id = $1 ORDER BY event_version', [cid]);
  return rows.map((r) => r.t);
}
