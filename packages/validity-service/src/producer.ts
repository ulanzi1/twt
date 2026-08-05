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

import { contribution, medical, member, type Db, type ids } from '@twt/domain';
import { R7_CONTRIBUTION_FACT_KEYS, R12_MEMBER_FACT_KEYS, type Facts } from '@twt/niyamavali-engine';

import { calendarMonthsBetween, calendarYearsBetween } from './calendar.js';
import type { ContributionHistoryAvailable, MedicalDisclosureFlagsPayload } from './types.js';

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

// ── Contribution facts — Story 10.24 (the producer Story 4.2 deferred to "Epic 8/9") ──────────────

/**
 * The `contribution.*` fact keys Story 10.24's producer supplies — EXACTLY five of the engine's seven
 * (`R7_CONTRIBUTION_FACT_KEYS`). This is the producer's output CONTRACT, and it is what makes the
 * `R7_HELD_CLAUSES` hold falsifiable: the totality test asserts every held clause's `blockedBy` names
 * a key that is genuinely NOT in this list, so a hold cannot silently outlive its reason (add the
 * missing producer, and the test tells you the hold is now unjustified).
 *
 * The two omitted keys and their owners:
 *   · `contribution.r7a_restorations_used`         → Story 10.25 (R7(A) restoration accounting)
 *   · `contribution.personal_event_excuse_claimed` → Story 10.26 (the member-assertion path)
 *
 * `contribution.compliance_percent` (R8) is not an `R7_CONTRIBUTION_FACT_KEYS` member at all and is
 * unowned — recorded in `deferred-work.md`, not silently implied by this list.
 */
export const R7_SUPPLIED_FACT_KEYS = [
  R7_CONTRIBUTION_FACT_KEYS.TOTAL_COUNT,
  R7_CONTRIBUTION_FACT_KEYS.EVER_CONTRIBUTED,
  R7_CONTRIBUTION_FACT_KEYS.MONTHS_SINCE_LAST,
  R7_CONTRIBUTION_FACT_KEYS.SKIPS_CURRENT_YEAR,
  R7_CONTRIBUTION_FACT_KEYS.IN_LAPSE,
] as const;

/** The facts this producer does NOT supply, each naming its owner — the honest hold, ON THE WIRE. */
export const R7_HELD_FACTS = [
  { key: R7_CONTRIBUTION_FACT_KEYS.R7A_RESTORATIONS_USED, producer: 'story-10-25' },
  { key: R7_CONTRIBUTION_FACT_KEYS.PERSONAL_EVENT_EXCUSE_CLAIMED, producer: 'story-10-26' },
] as const;

/**
 * The v1 contribution-lapse derivation policy. A DOCUMENTED, VERSIONED implementation policy — a
 * genuine derivation under an explicit stated rule, NOT a placeholder and NOT provisional.
 *
 * ⚠ READ "v1" AS A VERSION, NOT AN EXPIRY DATE. The moment it ships it is part of the
 * `contributionHistorySummary` PAYLOAD CONTRACT: it is hashed into `validityPayloadHash`, read by the
 * trustee-lite `factsEstablishing[]`, and its `lapseSince` is rendered as `holdingSince` on a surface
 * that feeds SUSPENSION decisions. Changing it later is a CONTRACT CHANGE with a migration-shaped blast
 * radius (every payload hash moves, every cached row is re-shaped, every recorded flag's onset can
 * shift) — reviewed and versioned like any other, NEVER an "it was only v1, so I retuned it" edit.
 *
 * This is precisely the {@link LapseNettingPolicy} posture, in the same terms and for the same reason:
 * "Lapse" has no Niyamavali-pinned definition in the registry, and Story 10.24's boundary forbids
 * defining governance policy — but the epic AC names `in_lapse` among the five facts, so it ships under
 * a named, documented derivation rather than being fabricated or omitted.
 *
 * `missed-closed-cycle-v1`: IN LAPSE iff ≥1 assigned-and-closed cycle in the current IST calendar year
 * resolved without a live confirmation — i.e. `skips_current_year > 0`. `lapseSince` = the CLOSE
 * instant of the EARLIEST such cycle. Derived entirely from data already in the projection; no new
 * source.
 *
 * ── ⚖ RATIFIED 2026-08-05 by BigDev (Decision 2026-08-05-074). The window is CLOSED. ─────────────
 * Story 10.24 raised this as Escalation 1 and it was resolved, not deferred: `missed-closed-cycle-v1`
 * is the ratified versioned implementation policy for `contribution.in_lapse`. The ratifying rationale,
 * verbatim in substance:
 *
 *   `contribution.in_lapse` is now part of the validity payload contract. No activated clause currently
 *   depends on it, which made this the LOWEST-COST point to ratify. Future changes, once consumed by
 *   member eligibility rules, are to be treated as GOVERNANCE changes rather than implementation
 *   refinements.
 *
 * So the cheap-re-pin window that existed while this was un-ratified no longer exists, and the standard
 * for changing this rule is now higher, not lower. A future author must NOT read "v1" as an invitation:
 * re-pinning it is a trustee-level governance change requiring a new decision-log entry that supersedes
 * 2026-08-05-074 — never a refactor, never a "the derivation was only provisional" edit. The blast
 * radius is unchanged and remains migration-shaped: every payload hash moves, every cached row is
 * re-shaped, and every recorded flag's onset can shift.
 */
export type ContributionLapsePolicy = 'missed-closed-cycle-v1';

/** The one shipped lapse policy (see {@link ContributionLapsePolicy}). */
export const CONTRIBUTION_LAPSE_POLICY: ContributionLapsePolicy = 'missed-closed-cycle-v1';

/** The five `contribution.*` facts this producer derives, in domain (camelCase) form. */
export interface ContributionFacts {
  /** `contribution.total_count` — lifetime LIVE confirmations at the pinned instant. */
  totalCount: number;
  /** `contribution.ever_contributed` — `totalCount > 0`, explicit for clarity. */
  everContributed: boolean;
  /**
   * `contribution.months_since_last` — CALENDAR months since the last live confirmation.
   *
   * `null` when the member has NEVER contributed, and the fact is then OMITTED from the bag rather
   * than sent as some large number. That is not fastidiousness: a never-contributed member is
   * precisely R7(B)'s population, R7(B) is HELD, and supplying "months since signup" here would fire
   * R7(C)/(F) on them — evaluating R7(B)'s case through a proxy, which `prd.md:346` forbids
   * NORMATIVELY. The engine's `hasFact` guard resolves an absent fact to a failed condition, so the
   * omission is exactly the honest outcome.
   */
  monthsSinceLast: number | null;
  /** `contribution.skips_current_year` — missed assigned-and-closed cycles this IST calendar year. */
  skipsCurrentYear: number;
  /** `contribution.in_lapse` — per {@link ContributionLapsePolicy}. */
  inLapse: boolean;
  /** ISO-8601 onset of the current lapse (`lapseSince`); null when not in lapse. */
  lapseSince: string | null;
}

/** The already-read projection anchors the PURE derivation consumes (mirrors the domain read). */
export interface ContributionFactsInput {
  /** LIVE confirmations at the pinned instant. */
  totalCount: number;
  /** The most recent live confirmation's instant; null when there is none. */
  lastConfirmedAt: Date | null;
  /** Missed assigned-and-closed cycles in the IST calendar year of the pinned instant. */
  skipsCurrentYear: number;
  /** The close instant of the EARLIEST missed cycle; null when `skipsCurrentYear === 0`. */
  earliestSkipClosedAt: Date | null;
}

/**
 * PURE: derive the five `contribution.*` facts from the read projection anchors at the pinned instant.
 *
 * Returns `null` ONLY when the inputs are structurally incoherent — a negative count, or a
 * `lastConfirmedAt` in the future of the evaluation instant, or a positive skip count with no onset
 * instant. Those are data-integrity impossibilities, and for them the service supplies NO facts and the
 * payload carries the `producer_unavailable` sentinel, exactly as `deriveRetirementFacts` returns
 * `null` for `retiredAt < signupAt` (D6, [[CR-4.4-D3]] / [[CR-4.5-D1]]).
 *
 * ⚠ It NEVER returns a fabricated zero for an un-derivable member. A member with a readable history
 * and no contributions genuinely has `totalCount: 0` — that is DATA. An un-derivable member gets the
 * sentinel. Zero and unknown are different claims, and collapsing them would make an un-assessed member
 * indistinguishable from a clean-record one on the surface that feeds a suspension decision.
 */
export function deriveContributionFacts(
  input: ContributionFactsInput,
  at: Date,
): ContributionFacts | null {
  if (!Number.isInteger(input.totalCount) || input.totalCount < 0) return null;
  if (!Number.isInteger(input.skipsCurrentYear) || input.skipsCurrentYear < 0) return null;
  if (input.lastConfirmedAt !== null && input.lastConfirmedAt.getTime() > at.getTime()) return null;
  if (input.skipsCurrentYear > 0 && input.earliestSkipClosedAt === null) return null;

  const inLapse = input.skipsCurrentYear > 0; // `missed-closed-cycle-v1`
  return {
    totalCount: input.totalCount,
    everContributed: input.totalCount > 0,
    monthsSinceLast:
      input.lastConfirmedAt === null ? null : calendarMonthsBetween(input.lastConfirmedAt, at),
    skipsCurrentYear: input.skipsCurrentYear,
    inLapse,
    lapseSince: inLapse ? (input.earliestSkipClosedAt?.toISOString() ?? null) : null,
  };
}

/**
 * Map the derived facts to the engine fact-bag the R7 ladder reads. Keys come from
 * `R7_CONTRIBUTION_FACT_KEYS` — never re-spelled string literals, so a key rename in the engine breaks
 * the build here rather than silently un-gating a clause.
 *
 * `months_since_last` is OMITTED when null (see {@link ContributionFacts.monthsSinceLast}) — the one
 * conditional key, and deliberately so.
 */
export function contributionFactsToBag(facts: ContributionFacts): Facts {
  const bag: Facts = {
    [R7_CONTRIBUTION_FACT_KEYS.TOTAL_COUNT]: facts.totalCount,
    [R7_CONTRIBUTION_FACT_KEYS.EVER_CONTRIBUTED]: facts.everContributed,
    [R7_CONTRIBUTION_FACT_KEYS.SKIPS_CURRENT_YEAR]: facts.skipsCurrentYear,
    [R7_CONTRIBUTION_FACT_KEYS.IN_LAPSE]: facts.inLapse,
  };
  if (facts.monthsSinceLast !== null) {
    bag[R7_CONTRIBUTION_FACT_KEYS.MONTHS_SINCE_LAST] = facts.monthsSinceLast;
  }
  return bag;
}

/**
 * Narrow the engine's `Facts` bag (`Record<string, CanonicalJsonValue>`) to the wire DTO's
 * `Record<string, number | boolean>` — RUNTIME-VERIFIED, not blindly cast. `contributionFactsToBag`
 * only ever populates number/boolean values today, but `Facts`'s value type is far wider; a future
 * contribution fact key with a non-number/boolean value would silently violate the DTO contract under
 * a plain `as` cast. This throws instead, so the divergence fails loudly at the seam rather than being
 * hidden by the type system.
 */
function assertNumberOrBooleanFacts(bag: Facts): Readonly<Record<string, number | boolean>> {
  for (const [key, value] of Object.entries(bag)) {
    if (typeof value !== 'number' && typeof value !== 'boolean') {
      throw new Error(
        `contributionFactsToSummary: fact "${key}" is ${typeof value}, not number|boolean — the ` +
          `ContributionHistoryAvailable DTO requires every fact value to be number|boolean.`,
      );
    }
  }
  return bag as Readonly<Record<string, number | boolean>>;
}

/**
 * Build the `contributionHistorySummary` `ok` arm from the derived facts.
 *
 * The fact map is keyed by the DOTTED `R7_CONTRIBUTION_FACT_KEYS` values, because that is the shape
 * `deriveViolatorFlags` already filters on (`startsWith('contribution.')`) — the trustee-lite
 * `factsEstablishing[]` reads it directly, with ZERO changes to `violator-flags.ts`.
 */
export function contributionFactsToSummary(facts: ContributionFacts): ContributionHistoryAvailable {
  return {
    status: 'ok',
    facts: assertNumberOrBooleanFacts(contributionFactsToBag(facts)),
    lapseSince: facts.lapseSince,
    heldFacts: R7_HELD_FACTS,
  };
}

/**
 * Read + derive the contribution facts for one member at the PINNED instant (the service seam).
 *
 * TWO queries, independent of the member's contribution/assignment/cycle count (AC7) — the aggregate
 * shape is the domain read's contract, pinned by a counted-query test.
 */
export async function produceContributionFacts(
  db: Db,
  ctx: { pariwarId: ids.PariwarId; memberId: ids.MemberId },
  atTimestamp: Date,
): Promise<ContributionFacts | null> {
  const inputs = await contribution.readContributionFactInputs(db, ctx, atTimestamp);
  return deriveContributionFacts(inputs, atTimestamp);
}
