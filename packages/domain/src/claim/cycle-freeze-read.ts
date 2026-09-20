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
// ── Concealment indicator (the REAL claim flag — Story 6.15, AC6) ───────────────────────────
// Story 6.15 LANDED the claim-scoped concealment producer, so this read now surfaces the ACTUAL claim
// concealment flag: `concealment_review_required` iff the tri-state producer over the verifier ASSESSMENT
// resolves `flagged` (via `assessClaimConcealmentBulk` — ONE clamped assessment read for the whole page +
// the R14 clause resolved ONCE per pariwar; NO per-claim call in a loop, the explicit no-N+1 requirement).
// This REPLACES the prior 6.13 placeholder (which read the verifier-decision HISTORY for a concealment
// reason-code). Still NEVER inferred from the redacted validity cache (absence can't distinguish "no flag"
// from "redacted"), and a `not_flagged`/`not_evaluated` signal surfaces nothing (never a green/clear — D10).
//
// ── Scope-safe + clamped (AC1) ──────────────────────────────────────────────────────────────
// Every read is scope-safe (RLS + explicit `pariwar_id`); the bounded per-Pariwar scans pass their cap
// through `clampLimit` (the domain limit-clamp gate — every dynamic `.limit()` is clamped). Rationale is
// ciphertext AS STORED — decrypted only at the route, never here.

import { and, eq, inArray, isNull, or } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { ClaimId, MemberId, PariwarId } from '../ids/index.js';
import { clampLimit } from '../pagination.js';
import { claims } from '../schema/claims.js';
import { claimVerifierDecisions } from '../schema/claim_verifier_decisions.js';
import { claimStateTrusteeDecisions } from '../schema/claim_state_trustee_decisions.js';
import { assessClaimConcealmentBulk } from './concealment-review.js';
import { readNomineeNameCheckFlagsBulk } from './nominee-name-check-read.js';

/** The surfaced special-flag label (Story 4.4 vocabulary) when a claim's concealment signal is `flagged`. */
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
  /** Story 6.18 (AC11) — the claim carries a LIVE `correction_return` row: the Pariwar Admin sent it
   *  back to the District Admin and it has not been resubmitted. ⛔ NOT a denial; the claim is
   *  UNDER CORRECTION and is excluded from the commit set until the correction + a fresh check land. */
  readonly underCorrection: boolean;
  /** Story 6.18 (AC8) — the clerical reason CODES on the claim's LATEST recorded name check, when
   *  that check accepted a difference. ⭐ NON-PII: reason codes only, ⛔ never a name. Empty when the
   *  check recorded no difference, or when no check exists. The flag comes from the District Admin's
   *  RECORDED judgement — ⛔ never from a computer comparison (`-226` cl.5). */
  readonly nameDifferenceReasons: readonly string[];
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

  // Bulk concealment (Story 6.15, AC6) + routing-row reads for the collected claims (no N+1). The real
  // claim concealment flag now comes from the tri-state PRODUCER over the verifier ASSESSMENT
  // (`assessClaimConcealmentBulk` — ONE clamped assessment read for the whole page + the R14 clause
  // resolved ONCE per pariwar; NOT the prior verifier-decision-history heuristic, NOT a per-claim call in a
  // loop). Only a `flagged` signal surfaces `concealment_review_required`; `not_flagged`/`not_evaluated`
  // surface nothing (never green a redacted/absent signal — D10).
  const concealmentClaimIds = new Set<string>();
  const routedClaimIds = new Set<string>();
  const returnedClaimIds = new Set<string>();
  const nameDifferenceByClaim = new Map<string, string[]>();
  if (allClaimIds.length > 0) {
    const concealmentSignals = await assessClaimConcealmentBulk(
      db,
      pariwarId,
      allClaimIds.map((id) => ({ claimCaseId: id })),
    );
    for (const [claimCaseId, signal] of concealmentSignals) {
      if (signal.status === 'flagged') concealmentClaimIds.add(claimCaseId);
    }

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

    // Story 6.18 (AC11) — the same bulk shape for the return rows: ONE query for the whole page,
    // never a per-card lookup. ⚠ `decidedAt` is selected because RESUBMISSION is derived from it
    // (the accounts must have been corrected AFTER the return).
    const returnRows = await db
      .select({
        claimCaseId: claimStateTrusteeDecisions.claimCaseId,
        decidedAt: claimStateTrusteeDecisions.decidedAt,
      })
      .from(claimStateTrusteeDecisions)
      .where(
        and(
          eq(claimStateTrusteeDecisions.pariwarId, pariwarId),
          inArray(claimStateTrusteeDecisions.claimCaseId, allClaimIds),
          eq(claimStateTrusteeDecisions.phase, 'correction_return'),
          eq(claimStateTrusteeDecisions.outcome, 'returned_for_correction'),
          isNull(claimStateTrusteeDecisions.supersededAt),
        ),
      );
    const returnedAtByClaim = new Map<string, Date>();
    for (const r of returnRows) returnedAtByClaim.set(r.claimCaseId, r.decidedAt);

    // ── Story 6.18 (AC8, AC11) — the name-check picture for the whole page ───────────────
    //
    // ⚠⚠ A VERDICT ALONE IS NOT THE ANSWER (code review 2026-09-20). This block used to read the
    // latest check's payload and emit EVERY `clerical_difference` reason it found. AC8 says *"a
    // claim whose CURRENT PASSING check has any clerical_difference"*, and neither qualifier was
    // applied, so the Pariwar Admin was shown “Approved with a name difference” for:
    //   · a STALE check — the accounts had since been corrected, so the judgement on the card was
    //     about data nobody had looked at any more; and
    //   · a MIXED check — `[clerical_difference, does_not_match]` — i.e. a claim that is under
    //     correction and ⛔ cannot be approved at all, labelled as approved-with-a-difference.
    // ⭐ The derivation now lives in ONE place (`readNomineeNameCheckFlagsBulk`) shared with the R9
    // queue, so a third surface cannot invent a fourth answer to the same ruling.
    const nameCheckFlags = await readNomineeNameCheckFlagsBulk(
      db,
      pariwarId,
      [...readyRows, ...escalatedRows, ...votedRows].map((r) => ({
        claimCaseId: r.claimCaseId as ClaimId,
        deceasedMemberId: r.deceasedMemberId as MemberId,
      })),
    );
    for (const [claimCaseId, flags] of nameCheckFlags) {
      if (flags.differenceReasons.length > 0) {
        nameDifferenceByClaim.set(claimCaseId, [...flags.differenceReasons]);
      }
    }

    // ⭐ THE UNIFIED "UNDER CORRECTION" DEFINITION (AC5), ⛔ not the bare return row. A claim that
    // was returned, corrected and re-checked is RESUBMITTED: the Pariwar Admin must see the Return
    // badge gone and the vote available again, even though the row itself survives until the vote
    // supersedes it. And the District Admin's own half counts too — a current `does_not_match`
    // sends a claim back whether or not the Pariwar Admin ever touched it.
    for (const [claimCaseId, returnedAt] of returnedAtByClaim) {
      const flags = nameCheckFlags.get(claimCaseId);
      const correctedSinceReturn =
        flags !== undefined &&
        flags.accountsComplete &&
        flags.liveAccounts.every((a) => a.updatedAt.getTime() > returnedAt.getTime());
      const resubmitted = correctedSinceReturn && (flags?.currentAndPassing ?? false);
      if (!resubmitted) returnedClaimIds.add(claimCaseId);
    }
    for (const [claimCaseId, flags] of nameCheckFlags) {
      if (flags.checkSendsBack) returnedClaimIds.add(claimCaseId);
    }
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
    underCorrection: returnedClaimIds.has(row.claimCaseId),
    nameDifferenceReasons: nameDifferenceByClaim.get(row.claimCaseId) ?? [],
  });

  return {
    readyToFreeze: readyRows.map(toCase),
    escalated: escalatedRows.map(toCase),
    votedPendingCommit: votedRows.map(toCase),
  };
}
