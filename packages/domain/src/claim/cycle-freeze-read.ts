// Cycle-freeze pending-list read model — Story 6.13 (Task 4; AC1/AC10). Transport-free.
//
// The compound THREE-BUCKET pending list the State-Trustee bulk-approval surface reads (AC1):
//   · (a) ready_to_freeze     — claims in `verifier_approved` (a fresh verifier approval) OR `reversed` (an
//     appeal reversed a prior denial), READY for the trustee freeze/vote.
//   · (b) escalated           — the "verifier_flagged_for_state_trustee" set: a LIVE `escalated`
//     claim_verifier_decisions row (`superseded_at IS NULL`) on a claim still at `verifier_review` /
//     `verification_in_progress`, awaiting the AC4b escalation resolution.
//   · (c) voted_pending_commit — claims already voted `state_trustee_approved` (this session or an earlier
//     one), the exact set the NEXT commit will advance to `approved`. Review-time addition (code review,
//     2026-07-13): the two-bucket original left this set invisible between voting and committing.
//
// Per-case provenance is denormalized (AC1): deceased member id + the LIVE verifier decision (id +
// actor_display + reason-code + rationale CIPHERTEXT-AS-STORED — the 6.10 rule; the route decrypts only
// AFTER authorization, AC10) + a compact signals summary + a concealment indicator + the durable
// route-to-R9 exclusion flag.
//
// ── Concealment indicator (the durable, scope-safe signal — the 6.10 posture) ───────────────
// The 6.10 verifier console deliberately returns `not_evaluated` for concealment rather than inferring it
// from the volatile/redacted validity cache (absence can't distinguish "no flag" from "redacted"). So this
// read surfaces the DURABLE signal that actually ships: `concealment_review_required` when the claim's
// verifier-decision history carries a concealment reason-code (`concealment_flag_override` /
// `concealment_flag_uphold` — a concealment dimension was reviewed on this claim). A richer
// validity-service-sourced member flag is DEFERRED to the same integration the 6.10 tri-state awaits.
//
// ── Scope-safe + clamped (AC1) ──────────────────────────────────────────────────────────────
// Every read is scope-safe (RLS + explicit `pariwar_id`); the bounded per-Pariwar scans pass their cap
// through `clampLimit` (the domain limit-clamp gate — every dynamic `.limit()` is clamped). Rationale is
// ciphertext AS STORED — decrypted only at the route, never here.

import { and, eq, inArray, isNull, or } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { ClaimId, PariwarId } from '../ids/index.js';
import { clampLimit } from '../pagination.js';
import { claims } from '../schema/claims.js';
import { claimVerifierDecisions } from '../schema/claim_verifier_decisions.js';
import { claimStateTrusteeDecisions } from '../schema/claim_state_trustee_decisions.js';

/** The verifier reason codes that mean a concealment dimension was reviewed on the claim (Story 4.4/6.11). */
const CONCEALMENT_REASON_CODES = ['concealment_flag_override', 'concealment_flag_uphold'] as const;
/** The surfaced special-flag label (Story 4.4 vocabulary) when a concealment review is present. */
export const CONCEALMENT_REVIEW_REQUIRED_FLAG = 'concealment_review_required';

/** A per-Pariwar bounded cap for the pending scans (clamped through the domain limit-clamp gate). */
const PENDING_SCAN_CAP = 500;

/** ONE pending case's denormalized provenance (the internal camelCase record; the route maps to the wire
 *  shape + decrypts the rationale). `verifierRationaleCiphertext` is ciphertext AS STORED (6.10 rule). */
export interface CycleFreezePendingCase {
  readonly claimCaseId: string;
  readonly deceasedMemberId: string;
  readonly currentState: string;
  readonly verifierDecisionId: string | null;
  readonly verifierActorDisplay: string | null;
  readonly verifierReasonCode: string | null;
  readonly verifierRationaleCiphertext: string | null;
  readonly signalsSummary: string;
  readonly concealmentFlags: string[];
  readonly routedToR9: boolean;
}

/** The three-bucket pending list (AC1 + the review-time "what will Commit act on" addition). */
export interface CycleFreezePendingList {
  readonly readyToFreeze: CycleFreezePendingCase[];
  readonly escalated: CycleFreezePendingCase[];
  /** Claims already voted `state_trustee_approved` (this session or an earlier one) — the set the NEXT
   *  commit will advance to `approved`. Surfaced so the trustee reviews the full committable set, not just
   *  what they voted on in the current page load. */
  readonly votedPendingCommit: CycleFreezePendingCase[];
}

/** A compact, deterministic signals summary from the claim's intake provenance (bounded, non-PII). */
function signalsSummaryFor(intakeChannels: readonly string[], currentState: string): string {
  const channels = [...intakeChannels].sort().join(',') || 'none';
  return `state=${currentState}; intake=${channels}`;
}

/**
 * The full two-bucket pending list for a Pariwar (AC1). Scope-safe (RLS + explicit `pariwar_id`). Assembles
 * per-case provenance from `claims` + the LIVE verifier decision + the concealment-history + routing-row
 * bulk reads (no N+1). Rationale is ciphertext AS STORED — the route decrypts after authorization (AC10).
 */
export async function getCycleFreezePending(db: Db, pariwarId: PariwarId): Promise<CycleFreezePendingList> {
  // Each bounded per-Pariwar scan clamps its cap INLINE through clampLimit (the domain limit-clamp gate
  // requires the clamp in the `.limit()` argument, not via a hoisted variable); PENDING_SCAN_CAP is a
  // fixed non-caller bound, so the clamp is a defensive no-op.
  const capOpts = { default: PENDING_SCAN_CAP, cap: PENDING_SCAN_CAP };

  // Bucket (a): ready-to-freeze claims (verifier_approved OR reversed), left-joined to their LIVE verifier
  // decision (the approval provenance; may be null — e.g. an escalation-resolved approval carries none).
  const readyRows = await db
    .select({
      claimCaseId: claims.claimCaseId,
      deceasedMemberId: claims.deceasedMemberId,
      currentState: claims.currentState,
      intakeChannels: claims.intakeChannels,
      verifierDecisionId: claimVerifierDecisions.decisionId,
      verifierActorDisplay: claimVerifierDecisions.actorDisplay,
      verifierReasonCode: claimVerifierDecisions.reasonCode,
      verifierRationaleCiphertext: claimVerifierDecisions.rationaleCiphertext,
    })
    .from(claims)
    .leftJoin(
      claimVerifierDecisions,
      and(
        eq(claimVerifierDecisions.claimCaseId, claims.claimCaseId),
        eq(claimVerifierDecisions.pariwarId, claims.pariwarId),
        isNull(claimVerifierDecisions.supersededAt),
      ),
    )
    .where(
      and(
        eq(claims.pariwarId, pariwarId),
        or(eq(claims.currentState, 'verifier_approved'), eq(claims.currentState, 'reversed')),
      ),
    )
    .limit(clampLimit(PENDING_SCAN_CAP, capOpts));

  // Bucket (b): escalated claims — a LIVE `escalated` verifier decision on a claim still at
  // verifier_review / verification_in_progress (the escalated verifier decision IS the provenance).
  const escalatedRows = await db
    .select({
      claimCaseId: claims.claimCaseId,
      deceasedMemberId: claims.deceasedMemberId,
      currentState: claims.currentState,
      intakeChannels: claims.intakeChannels,
      verifierDecisionId: claimVerifierDecisions.decisionId,
      verifierActorDisplay: claimVerifierDecisions.actorDisplay,
      verifierReasonCode: claimVerifierDecisions.reasonCode,
      verifierRationaleCiphertext: claimVerifierDecisions.rationaleCiphertext,
    })
    .from(claims)
    .innerJoin(
      claimVerifierDecisions,
      and(
        eq(claimVerifierDecisions.claimCaseId, claims.claimCaseId),
        eq(claimVerifierDecisions.pariwarId, claims.pariwarId),
        eq(claimVerifierDecisions.outcome, 'escalated'),
        isNull(claimVerifierDecisions.supersededAt),
      ),
    )
    .where(
      and(
        eq(claims.pariwarId, pariwarId),
        or(
          eq(claims.currentState, 'verifier_review'),
          eq(claims.currentState, 'verification_in_progress'),
        ),
      ),
    )
    .limit(clampLimit(PENDING_SCAN_CAP, capOpts));

  // Bucket (c): voted-pending-commit — claims already voted state_trustee_approved (this session or an
  // earlier one), the exact set the NEXT commitCycleFreeze call will advance. Left-joined to the LIVE
  // verifier decision the same way as bucket (a) — the original verifier provenance stays useful context
  // even after the trustee's own vote.
  const votedRows = await db
    .select({
      claimCaseId: claims.claimCaseId,
      deceasedMemberId: claims.deceasedMemberId,
      currentState: claims.currentState,
      intakeChannels: claims.intakeChannels,
      verifierDecisionId: claimVerifierDecisions.decisionId,
      verifierActorDisplay: claimVerifierDecisions.actorDisplay,
      verifierReasonCode: claimVerifierDecisions.reasonCode,
      verifierRationaleCiphertext: claimVerifierDecisions.rationaleCiphertext,
    })
    .from(claims)
    .leftJoin(
      claimVerifierDecisions,
      and(
        eq(claimVerifierDecisions.claimCaseId, claims.claimCaseId),
        eq(claimVerifierDecisions.pariwarId, claims.pariwarId),
        isNull(claimVerifierDecisions.supersededAt),
      ),
    )
    .where(and(eq(claims.pariwarId, pariwarId), eq(claims.currentState, 'state_trustee_approved')))
    .limit(clampLimit(PENDING_SCAN_CAP, capOpts));

  const allClaimIds = [...readyRows, ...escalatedRows, ...votedRows].map((r) => r.claimCaseId as ClaimId);

  // Bulk concealment-history + routing-row reads for the collected claims (no N+1).
  const concealmentClaimIds = new Set<string>();
  const routedClaimIds = new Set<string>();
  if (allClaimIds.length > 0) {
    const concealmentRows = await db
      .select({ claimCaseId: claimVerifierDecisions.claimCaseId })
      .from(claimVerifierDecisions)
      .where(
        and(
          eq(claimVerifierDecisions.pariwarId, pariwarId),
          inArray(claimVerifierDecisions.claimCaseId, allClaimIds),
          inArray(claimVerifierDecisions.reasonCode, [...CONCEALMENT_REASON_CODES]),
        ),
      );
    for (const r of concealmentRows) concealmentClaimIds.add(r.claimCaseId);

    const routingRows = await db
      .select({ claimCaseId: claimStateTrusteeDecisions.claimCaseId })
      .from(claimStateTrusteeDecisions)
      .where(
        and(
          eq(claimStateTrusteeDecisions.pariwarId, pariwarId),
          inArray(claimStateTrusteeDecisions.claimCaseId, allClaimIds),
          eq(claimStateTrusteeDecisions.phase, 'routing'),
          eq(claimStateTrusteeDecisions.outcome, 'routed_to_r9'),
          isNull(claimStateTrusteeDecisions.supersededAt),
        ),
      );
    for (const r of routingRows) routedClaimIds.add(r.claimCaseId);
  }

  const toCase = (row: (typeof readyRows)[number]): CycleFreezePendingCase => ({
    claimCaseId: row.claimCaseId,
    deceasedMemberId: row.deceasedMemberId,
    currentState: row.currentState,
    verifierDecisionId: row.verifierDecisionId ?? null,
    verifierActorDisplay: row.verifierActorDisplay ?? null,
    verifierReasonCode: row.verifierReasonCode ?? null,
    verifierRationaleCiphertext: row.verifierRationaleCiphertext ?? null,
    signalsSummary: signalsSummaryFor(row.intakeChannels, row.currentState),
    concealmentFlags: concealmentClaimIds.has(row.claimCaseId) ? [CONCEALMENT_REVIEW_REQUIRED_FLAG] : [],
    routedToR9: routedClaimIds.has(row.claimCaseId),
  });

  return {
    readyToFreeze: readyRows.map(toCase),
    escalated: escalatedRows.map(toCase),
    votedPendingCommit: votedRows.map(toCase),
  };
}
