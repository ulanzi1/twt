// The fact PRODUCER — Story 4.6 (Task 2). The service is the FIRST real producer of the
// caller-injected facts the engine consumers read ([[project_engine_never_infers_contribution_facts]]).
//
// ── The engine EVALUATES facts; the producer DERIVES them — but only GENUINELY (never a placeholder) ──
// A fact is supplied ONLY once it is truthfully derived. An absent fact resolves identically to an
// explicit `false`/`0` in the engine, so a placeholder makes an un-assessed member indistinguishable
// from a clean-record member — forbidden by [[CR-4.4-D3]] / [[CR-4.5-D1]] / [[CR-4.5-D3]]. When the
// derivation inputs are missing (e.g. no signup event yet), the producer returns `null` and the
// service injects NO `member.*` facts, so the engine routes to `rule.inputs_unavailable` (Story 4.5) —
// NOT a silent `granted_years: 0`.
//
// ── What is / isn't produced here (D2 / D2m) ─────────────────────────────────────────────────────
//   · PRODUCED now: `member.valid_membership_years` + `member.is_retired` (R12 / Story 4.5), the
//     member-standing medical-disclosure summary (D2m-A, NON-PII).
//   · NOT produced (Epic 8/9): `contribution.*` / `claim.*` (R7/R8). No contribution source exists;
//     the service surfaces `contribution_history_summary: producer_unavailable` and OMITS R7/R8.
//   · NOT produced here (Epic 6): the R14 claim-time concealment fact (`claim.concealed_ima_...`) —
//     that is death-linked (the true C7 beat) and stays in claim filing.

import { medical, member, type Db, type ids } from '@twt/domain';
import { R12_MEMBER_FACT_KEYS, type Facts } from '@twt/niyamavali-engine';

import { calendarYearsBetween } from './calendar.js';
import type { MedicalDisclosureFlagsPayload } from './types.js';

/**
 * Lapse-netting policy for `valid_membership_years` ([[CR-4.5-D2]] — the D4 `policy_review_required`
 * ambiguity on `niy.retirement-coverage.r12`). The Trustee Panel has NOT yet resolved whether lapsed
 * (unpaid-grace-expired) periods subtract from valid-tenure. Until it does, the producer uses `gross`
 * tenure (join → cutoff, no netting) — a DOCUMENTED policy choice, NOT a placeholder: it is a genuine
 * calendar-correct derivation under an explicit, stated policy. Pinning the policy later is a one-line
 * change here (swap the enum) with ZERO engine change (the engine reads the pre-derived integer).
 */
export type LapseNettingPolicy = 'gross';

/** The retirement facts the R12 clause reads — pre-derived, calendar-correct, caller-injected. */
export interface RetirementFacts {
  /** `member.valid_membership_years` (int) — the grant ladder's sole tenure input. */
  validMembershipYears: number;
  /** `member.is_retired` (bool) — the Story 3.9 permanent retirement anchor. */
  isRetired: boolean;
}

/** The derivation inputs (already read from the DB) — kept pure so the calendar math is unit-testable. */
export interface RetirementFactsInput {
  /** The `member.signup_initiated` occurred_at (tenure start); null when the member never signed up. */
  signupAt: Date | null;
  /** The first `is_retirement=true` posting created_at (permanent anchor); null when not retired. */
  retiredAt: Date | null;
  /** The pinned evaluation instant (the tenure cutoff when the member is not retired). */
  evaluatedAt: Date;
  /** Lapse-netting policy (default `gross` pending the Trustee Panel's [[CR-4.5-D2]] resolution). */
  lapseNetting?: LapseNettingPolicy;
}

/**
 * PURE: derive `{ validMembershipYears, isRetired }` from the read anchors. Returns `null` when the
 * tenure anchor is absent (no signup event) — the service then injects NO R12 facts, so the engine
 * routes to `rule.inputs_unavailable` rather than computing a fabricated `0` ([[CR-4.5-D1]]). Also
 * returns `null` when `retiredAt` precedes `signupAt` — a data-integrity impossibility (a member cannot
 * retire before their tenure starts) — rather than silently clamping to a misleadingly-clean `0` via
 * `calendarYearsBetween`'s ordinary `to <= from → 0` behavior (that clamp is correct for the legitimate
 * "evaluated before the anniversary" case; it is NOT correct for corrupt posting data).
 *
 * `validMembershipYears` = calendar-correct whole years from `signupAt` to `retiredAt` (the tenure
 * FREEZES at retirement — coverage is earned against pre-retirement tenure) or to `evaluatedAt` when
 * not retired. `gross` policy applies no lapse-netting ([[CR-4.5-D2]]).
 */
export function deriveRetirementFacts(input: RetirementFactsInput): RetirementFacts | null {
  if (input.signupAt === null) return null; // tenure anchor absent → not producible (never a 0)
  if (input.retiredAt !== null && input.retiredAt.getTime() < input.signupAt.getTime()) return null;
  const cutoff = input.retiredAt ?? input.evaluatedAt;
  const validMembershipYears = calendarYearsBetween(input.signupAt, cutoff);
  return { validMembershipYears, isRetired: input.retiredAt !== null };
}

/** Map the derived retirement facts into the engine's caller-injected `member.*` fact bag. */
export function retirementFactsToBag(facts: RetirementFacts): Facts {
  return {
    [R12_MEMBER_FACT_KEYS.VALID_MEMBERSHIP_YEARS]: facts.validMembershipYears,
    [R12_MEMBER_FACT_KEYS.IS_RETIRED]: facts.isRetired,
  };
}

/**
 * DB-reading orchestration: read the tenure/retirement anchors (domain accessors) and derive the R12
 * facts at the pinned instant. Returns `null` (inject nothing) when the tenure anchor is absent.
 */
export async function produceRetirementFacts(
  db: Db,
  ctx: { pariwarId: ids.PariwarId; memberId: ids.MemberId },
  evaluatedAt: Date,
  opts?: { lapseNetting?: LapseNettingPolicy },
): Promise<RetirementFacts | null> {
  const signupAt = await member.getMemberSignupInstantAt(db, ctx.memberId, evaluatedAt);
  const retiredAt = await member.getMemberRetirementAnchorAt(
    db,
    ctx.pariwarId,
    ctx.memberId,
    evaluatedAt,
  );
  return deriveRetirementFacts({
    signupAt,
    retiredAt,
    evaluatedAt,
    lapseNetting: opts?.lapseNetting,
  });
}

/**
 * A COMPLETED member-standing concealment assessment (D2m-A). The disclosed condition codes are
 * Tier-1 ENCRYPTED, so the actual "undeclared IMA-listed condition" comparison cannot run in this
 * framework-agnostic service (it needs KMS decryption + is genuinely a claim-time discovery — the
 * true C7 beat is death-linked, Epic 6 R14). This seam lets a decryption-capable, COMPLETED assessor
 * supply the flag; absent it the flag is `false` (no member-standing flag raised) — NEVER fabricated
 * ([[CR-4.4-D3]]: supply the concealment signal ONLY once the assessment is complete).
 */
export interface ConcealmentAssessment {
  /** True iff a completed member-standing assessment flagged an undeclared IMA-listed condition. */
  flagged: boolean;
}

/**
 * The NON-PII subset of a `member_medical_disclosures` row the flags read — a structural type so the
 * domain `MemberMedicalDisclosureRow` (which has more fields, incl. the Tier-1 ciphertext we NEVER
 * touch) satisfies it directly. Only the count + the ima_list_version (both non-PII) are consumed.
 */
export interface MedicalDisclosureRecord {
  conditionCount: number;
  imaListVersion: string;
}

/**
 * PURE: derive the member-standing medical-disclosure flags from the disclosure history (newest-first)
 * + an optional completed concealment assessment. NON-PII only — the encrypted condition codes are
 * never read here; only presence / count / `ima_list_version` (all non-PII metadata).
 */
export function deriveMedicalDisclosureFlags(
  disclosures: readonly MedicalDisclosureRecord[],
  assessment?: ConcealmentAssessment,
): MedicalDisclosureFlagsPayload {
  const head = disclosures[0]; // getMedicalDisclosures returns newest-first
  return {
    hasDisclosureOnRecord: disclosures.length > 0,
    declaredConditionCount: head?.conditionCount ?? null,
    imaListVersion: head?.imaListVersion ?? null,
    pendingConcealmentFlag: assessment?.flagged === true,
  };
}

/**
 * DB-reading orchestration: read the member's disclosure history as-of `atTimestamp` + derive the
 * member-standing medical flags. The concealment assessment (if any) is injected by the caller (a
 * decryption-capable seam). Threading `atTimestamp` keeps this sub-object replay-correct for
 * `getValidityAt` at a historical instant (closes deferred-work W6 for this field too).
 */
export async function produceMedicalDisclosureFlags(
  db: Db,
  ctx: { pariwarId: ids.PariwarId; memberId: ids.MemberId },
  atTimestamp: Date,
  assessment?: ConcealmentAssessment,
): Promise<MedicalDisclosureFlagsPayload> {
  const disclosures = await medical.getMedicalDisclosures(db, ctx.pariwarId, ctx.memberId, atTimestamp);
  return deriveMedicalDisclosureFlags(disclosures, assessment);
}
