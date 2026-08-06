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
//   · PRODUCED since Story 10.24: five of the seven `contribution.*` facts — `total_count`,
//     `ever_contributed`, `months_since_last`, `skips_current_year`, `in_lapse` — derived from the
//     migration-0093 projections (see {@link deriveContributionFacts}), which ACTIVATES R7(C)–(F).
//     `contribution_history_summary` now carries a real `ok` arm; the `producer_unavailable` sentinel
//     remains reachable for a genuine per-member or per-Pariwar coverage gap (D6), never as a blanket
//     "no producer exists" statement.
//   · PRODUCED since Story 10.25: the SIXTH fact, `contribution.r7a_restorations_used`, under the
//     versioned {@link R7ARestorationPolicy} — plus `restorationPackage`, the `{remaining, required}`
//     count Story 10.16's disclosure owes a member being asked to contribute without coverage.
//     ⚠ This did NOT activate R7(A). It lifted ONE of R7(A)'s two named blockers; the clause stays in
//     `R7_HELD_CLAUSES` on `member.joining_discipline_state` (Story 10.23), and beyond that on the
//     Trustee Panel's published Part 11 amendment to R7(A)'s clause data (Decision 2026-08-06-077).
//     Supplying a fact and activating a clause are different acts (`prd.md:346`, normative).
//   · PRODUCED since Story 10.26: the SEVENTH and FINAL fact,
//     `contribution.personal_event_excuse_claimed` — a lifetime as-of existential over the member's
//     own `member.personal_event_asserted` events (D5), which ACTIVATES R7(G). ⭐ ALL SEVEN engine
//     fact keys now have a producer and `R7_HELD_FACTS` is EMPTY, for the first time.
//     ⚠ Empty held-facts does NOT mean "nothing is held": R7(A)/(B) remain in `R7_HELD_CLAUSES` on
//     blockers that are NOT facts, so no future producer can lift them.
//     ⚠ Activating R7(G) is NOT an eligibility change: `on_pass: no_exemption`,
//     `restoration: {never_excuses: true}`. And it is deliberately EXCLUDED from the violator-flag
//     channel upstream (`imposesRestorationObligation`, rules.ts) — a member who discloses a
//     bereavement must never become a suspension candidate for it (the ratified §3.1: the assertion
//     "carries no consequence of its own").
//   · STILL NOT produced: `claim.*` + `contribution.compliance_percent`, so R8 is NOT activated by any
//     of the above.
//     ⚠ Supplying facts does NOT activate R8: it additionally needs a CLAIM-TIME fact
//     (`claim.death_classification`, absent at member standing) and `compliance_percent`, which this
//     producer does not supply. `VALIDITY_RULE_ORDER` must never gain an R8 clause id.
//   · NOT produced here (Epic 6): the R14 claim-time concealment fact (`claim.concealed_ima_...`) —
//     that is death-linked (the true C7 beat) and stays in claim filing.

import { contribution, medical, member, type Db, type ids } from '@twt/domain';
import { R7_CONTRIBUTION_FACT_KEYS, R12_MEMBER_FACT_KEYS, type Facts } from '@twt/niyamavali-engine';

import { calendarYearsBetween } from './calendar.js';
import type {
  ContributionHistoryAvailable,
  MedicalDisclosureFlagsPayload,
  RestorationPackagePayload,
} from './types.js';

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
 * The `contribution.*` fact keys this producer supplies — ALL SEVEN of the engine's
 * (`R7_CONTRIBUTION_FACT_KEYS`) since Story 10.26 added `personal_event_excuse_claimed`. This is the
 * producer's output CONTRACT, and it is what makes the `R7_HELD_CLAUSES` hold falsifiable: the
 * totality test asserts every held clause's `blockedBy` names a key that is genuinely NOT in this
 * list, so a hold cannot silently outlive its reason (add the missing producer, and the test tells you
 * the hold is now unjustified).
 *
 * ⚠ NONE ARE OMITTED — and that is precisely why the remaining holds must be read carefully. Adding a
 * key here never activates anything, and an empty `R7_HELD_FACTS` does NOT mean "nothing is held":
 * R7(A)/(B) stay in `R7_HELD_CLAUSES` blocked on `member.joining_discipline_state` (Story 10.23, a
 * MEMBER fact this producer does not own) and, beyond any story, on the Trustee Panel's published
 * Part 11 amendment to R7(A)'s clause DATA (Decision 2026-08-06-077), because the seeded clause still
 * keys its population on the `contribution.total_count < 10` proxy that `prd.md:344` disclaims and
 * `:346` forbids evaluating. Facts ≠ clause activation (D6).
 *
 * `contribution.compliance_percent` (R8) is not an `R7_CONTRIBUTION_FACT_KEYS` member at all and is
 * UNOWNED — recorded in `deferred-work.md`, not silently implied by this list. ⚠ It also has NO
 * equivalent mechanization: nothing here can notice if it stays dark (Story 10.26, Escalation 3).
 */
export const R7_SUPPLIED_FACT_KEYS = [
  R7_CONTRIBUTION_FACT_KEYS.TOTAL_COUNT,
  R7_CONTRIBUTION_FACT_KEYS.EVER_CONTRIBUTED,
  R7_CONTRIBUTION_FACT_KEYS.MONTHS_SINCE_LAST,
  R7_CONTRIBUTION_FACT_KEYS.SKIPS_CURRENT_YEAR,
  R7_CONTRIBUTION_FACT_KEYS.IN_LAPSE,
  R7_CONTRIBUTION_FACT_KEYS.R7A_RESTORATIONS_USED,
  // Story 10.26 — the SEVENTH and final key. The mechanization's own end state.
  R7_CONTRIBUTION_FACT_KEYS.PERSONAL_EVENT_EXCUSE_CLAIMED,
] as const;

/**
 * The facts this producer does NOT supply, each naming its owner — the honest hold, ON THE WIRE.
 * EMPTY since Story 10.26: every engine key is now supplied, the first time this has been true.
 *
 * ⚠ TYPED EXPLICITLY, not `[] as const`. An empty `as const` infers `readonly []`, which loses the
 * `{key, producer}` ELEMENT type at every consumer — `contributionFactsToSummary` below,
 * `@twt/ui`'s `member-status/presenter.ts` (`summary.heldFacts.map((f) => f.key)`), and the contracts
 * DTO — turning a compile-time contract into `never` and quietly accepting anything later.
 *
 * ⚠ Empty ≠ nothing held. See {@link R7_SUPPLIED_FACT_KEYS}: R7(A)/(B) remain held on blockers that
 * are NOT facts, so no future producer can lift them.
 */
export const R7_HELD_FACTS: readonly { readonly key: string; readonly producer: string }[] = [];

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

/**
 * The v1 R7(A) restoration-accounting policy. A DOCUMENTED, VERSIONED implementation policy — a
 * genuine derivation under an explicit stated rule, NOT a placeholder and NOT provisional. It is part
 * of the payload contract the moment it ships: hashed into `validityPayloadHash`, read by the
 * trustee-lite `factsEstablishing[]`, and (once Story 10.23 lands, and once the Trustee Panel's Part 11
 * amendment to R7(A)'s clause data is PUBLISHED) consumed by R7(A) — a clause that decides whether a
 * member's restoration path still exists at all.
 *
 * ⚖ RATIFIED 2026-08-06 by BigDev (Decision 2026-08-06-076), at STORY-AUTHORING time — deliberately
 * before implementation and before the fact reached the payload contract, the same lowest-cost-moment
 * argument that governed {@link ContributionLapsePolicy} on 2026-08-05. Read "v1" as a VERSION, not an
 * expiry date: the cheap-re-pin window is CLOSED and the bar for changing this rule is now HIGHER.
 *
 * ⚠ Any future change SUPERSEDES Decision 2026-08-06-076; it does NOT REINTERPRET it. Historical
 * payloads remain CORRECT under the policy in force when they were produced — they are not re-derived,
 * not re-hashed, and not "corrected" (Decision 2026-08-06-078, the standing principle). So a
 * supersession is never a backfill: re-running this producer over history under a new policy is a
 * separate, data-rewriting act needing its own decision. Decisions are superseded; history is not
 * rewritten. The forward blast radius is migration-shaped either way — every payload hash moves and
 * every cached row is re-shaped.
 *
 * ── `consecutive-opportunity-restoration-v1`, stated once, precisely ──────────────────────────────
 * Over the member's OPPORTUNITY SEQUENCE (their `member_pool_assignments` rows whose alert reached a
 * closed state at/before `at`, ordered by close instant), each opportunity is TAKEN (a live
 * confirmation at `at`) or MISSED. A COMPLETED RESTORATION EPISODE is a maximal run of
 * ≥ `consecutive_required` consecutive TAKEN opportunities that is IMMEDIATELY PRECEDED BY AT LEAST
 * ONE MISSED opportunity. `r7a_restorations_used` is the COUNT of such episodes.
 *
 * Ratified as policy, NOT as implementation latitude — each of these is load-bearing and each is the
 * thing a naive reading gets wrong:
 *   · Episodes are RUNS, never `floor(run / required)`. Six consecutive contributions after a miss is
 *     ONE restoration, not two: the member restored once and kept contributing.
 *   · The PRECEDING-MISS gate. Without it, a member who has taken every opportunity they were ever
 *     given reads as having burned restorations and is pushed toward R7(B) — the HARSHER clause.
 *   · "Consecutive" is an OPPORTUNITY-sequence predicate, never three ledger rows in a row and never
 *     `contribution.in_lapse`. `in_lapse` is scoped to the current IST calendar year, so a December
 *     miss cured by three January contributions would vanish on 1 January; the episode-opening lapse
 *     is a SEQUENCE fact, not a YEAR fact. The two are deliberately different (AC2).
 *
 * The count is NOT clamped at R7(A)'s `restoration.lifetime_max`. That threshold is CLAUSE DATA and
 * the clause applies it (`fact_lt … max: 2`); a producer that clamped would make "used 2" and "used 7"
 * indistinguishable and would put a governance threshold in code — exactly what the registry prevents.
 */
export type R7ARestorationPolicy = 'consecutive-opportunity-restoration-v1';

/** The one shipped R7(A) restoration-accounting policy (see {@link R7ARestorationPolicy}). */
export const R7A_RESTORATION_POLICY: R7ARestorationPolicy =
  'consecutive-opportunity-restoration-v1';

/** The six `contribution.*` facts this producer derives, in domain (camelCase) form. */
export interface ContributionFacts {
  /** `contribution.total_count` — lifetime LIVE confirmations at the pinned instant. */
  totalCount: number;
  /** `contribution.ever_contributed` — `totalCount > 0`, explicit for clarity. */
  everContributed: boolean;
  /**
   * `contribution.months_since_last` — elapsed contribution OPPORTUNITIES since the last live
   * confirmation, NOT wall-clock calendar months.
   *
   * ── ⚖ RATIFIED 2026-08-05 by BigDev, during the Story 10.24 round-2 code review ─────────────────
   * "Contribution discipline must always be evaluated against contribution opportunities, never
   * against elapsed time alone." One opportunity = one assigned cycle that reached a closed state and
   * resolved without a live confirmation. The UNIT is still months — pool cycles are single-
   * calendar-month instruments (Decision 2026-08-05-075) — so R7(C)'s `>= 12` and R7(F)'s `>= 6` keep
   * their meaning, and in a fully active Pariwar this equals the wall-clock count.
   *
   * WHY, because the wall-clock reading looks obviously right and is catastrophically wrong:
   * contribution is only possible when a death claim freezes a cycle and a pool assigns the member.
   * A Pariwar with no death for six months creates NO opportunity, so a wall-clock derivation trips
   * R7(F) for EVERY member who ever contributed — and the clause GENUINELY applies, so D2's
   * applied-only filter cannot catch it. The entire membership lands on the surface that feeds
   * suspension decisions. Most acute in small or low-mortality Pariwars, i.e. exactly where the
   * product starts. The fix belongs HERE, in the producer, not in the clause that reads the fact:
   * holding R7(C)/(F) and gating the clause data were both considered and rejected.
   *
   * ⚠ This is a PAYLOAD-CONTRACT element on the {@link ContributionLapsePolicy} pattern — hashed into
   * `validityPayloadHash` and read by the trustee-lite surface. Re-deriving it is a versioned contract
   * change, never a retune, and reverting it to elapsed time would re-open the whole-membership
   * flagging above.
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
  /**
   * `contribution.r7a_restorations_used` — lifetime COMPLETED R7(A) restoration episodes as of the
   * pinned instant, per {@link R7ARestorationPolicy}. Never clamped at `lifetime_max`.
   *
   * `null` when R7(A)'s `restoration.consecutive_required` could not be resolved from the registry at
   * the pinned instant, and the fact is then OMITTED from the bag rather than sent as `0`. Zero and
   * unknown are different claims on a clause that decides whether a member's restoration path still
   * exists — the same discipline `monthsSinceLast` follows, for the same reason.
   */
  r7aRestorationsUsed: number | null;
  /**
   * The length of the member's CURRENT OPEN run of consecutive taken opportunities — the run that
   * reaches the end of the sequence AND was opened by a miss. NOT a `contribution.*` fact: it never
   * enters the engine fact bag. It exists so Story 10.16's disclosure can report
   * `{ remaining, required }` against whichever R7 clause actually applied to the member (AC4), which
   * need not be R7(A) and therefore need not use R7(A)'s threshold.
   */
  currentOpenTakenRun: number;
  /**
   * `contribution.personal_event_excuse_claimed` — Story 10.26's seventh and FINAL engine fact.
   * `true` iff ≥1 `member.personal_event_asserted` event exists on the member's own stream at/before
   * the pinned instant.
   *
   * ⚖ Its clause, R7(G), is DECLARATIVE: `on_pass: no_exemption`, `restoration: {never_excuses: true}`.
   * Asserting changes no eligibility, no lock-in, no restoration package and no roster position — the
   * ratified Niyamavali §3.1 says the assertion "grants no restoration relief and carries no
   * consequence of its own". The fact exists so the member's own record can STATE the rule, and so a
   * trustee reading an ALREADY-flagged member can see the human context. It can never create a flag
   * (AC5/D4).
   *
   * NOT nullable: unlike `monthsSinceLast` / `r7aRestorationsUsed`, `false` here is a real answer, not
   * an unresolved one — so it is always emitted into the bag, never conditionally omitted.
   */
  personalEventAsserted: boolean;
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
  /** Missed assigned-and-closed cycles since the last live confirmation — the OPPORTUNITY-aware gap
   *  that becomes `months_since_last`. Ignored when `lastConfirmedAt` is null. */
  opportunitiesSinceLast: number;
  /** The instant this Pariwar's projection is authoritative from; `null` when the backfill has never
   *  run. THE reachability condition for the sentinel — see {@link deriveContributionFacts}. */
  coveredFrom: Date | null;
  /** COMPLETED R7(A) restoration episodes over the opportunity sequence (Story 10.25 AC1). Ignored
   *  when `r7aConsecutiveRequired` is null — the episode threshold was then never applied. */
  completedRestorationEpisodes: number;
  /** The length of the current OPEN taken run (the one opened by a miss and reaching the sequence
   *  end); `0` when none. Threshold-independent — Story 10.16's `{remaining}` measures against it. */
  currentOpenTakenRun: number;
  /** R7(A)'s `restoration.consecutive_required` from the clause DATA at the pinned instant; `null`
   *  when R7(A) resolves to no version. The reachability condition for an UNKNOWN restoration count. */
  r7aConsecutiveRequired: number | null;
  /**
   * Has the member EVER asserted a personal event, as of the pinned instant (Story 10.26)? A LIFETIME
   * existential over their own `events_log` stream, NOT a windowed or per-cycle predicate (D5).
   *
   * ⚠ NOT nullable, unlike every other anchor here — see `ContributionFactInputs.personalEventAsserted`
   * in `@twt/domain` for the full asymmetry. In short: the others come from a PROJECTION with a
   * backfill watermark, where `0` and *unknown* must stay distinct; this comes from `events_log`, the
   * primary record, where `false` is a real answer. The coverage gate still governs the payload as a
   * whole, so this fact never appears alone when the other six are un-derivable.
   */
  personalEventAsserted: boolean;
}

/**
 * PURE: derive the five `contribution.*` facts from the read projection anchors at the pinned instant.
 *
 * Returns `null` — meaning the service supplies NO facts and the payload carries the
 * `producer_unavailable` sentinel — in TWO distinct families of case.
 *
 * ── 1. NO PROJECTION COVERAGE (the reachable one; round-2 review, Decision 2) ────────────────────
 * `coveredFrom === null` (the backfill has never run for this Pariwar) or `at` precedes it. This is
 * the case that matters in practice, and it exists because the original implementation had ONLY
 * family 2 below — every branch of which is structurally impossible given the SQL that feeds it (a
 * `count(*)` is never negative; a `max(confirmed_at)` filtered by `confirmed_at <= at` is never in
 * the future; a positive skip count always has a non-null `min(closed_at)` because the LATERAL is
 * joined `ON closed.closed_at IS NOT NULL`). The sentinel was therefore DEAD CODE, and an un-run or
 * partial backfill rendered as an affirmative CLEAN RECORD for every member in the Pariwar, on the
 * surface that feeds suspension decisions — precisely what D6 forbids.
 *
 *   ⚖ "Unknown projection state must never fabricate a clean member" — BigDev, 2026-08-05.
 *
 * The consequence is deliberate and worth stating: the backfill is a PRECONDITION for supplying
 * contribution facts, not an optional repair path. Forgetting it darkens the whole trustee section
 * (10.11's deliberate strictness — a partial scan is a false all-clear for the members it skipped)
 * rather than reporting a clean membership.
 *
 * ── 2. STRUCTURALLY INCOHERENT INPUTS (the defensive one) ────────────────────────────────────────
 * A negative or non-integer count, a `lastConfirmedAt` in the future of the evaluation instant, or a
 * positive skip count with no onset instant. Data-integrity impossibilities, kept as a backstop in the
 * same spirit as `deriveRetirementFacts` returning `null` for `retiredAt < signupAt`
 * (D6, [[CR-4.4-D3]] / [[CR-4.5-D1]]).
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
  // ── 1. Coverage. Checked FIRST: with no projection there is nothing to reason about, and every
  // check below would otherwise "pass" over an empty ledger and manufacture a clean record.
  if (input.coveredFrom === null) return null;
  if (at.getTime() < input.coveredFrom.getTime()) return null;

  // ── 2. Structural coherence (defensive backstop).
  if (!Number.isInteger(input.totalCount) || input.totalCount < 0) return null;
  if (!Number.isInteger(input.skipsCurrentYear) || input.skipsCurrentYear < 0) return null;
  if (!Number.isInteger(input.opportunitiesSinceLast) || input.opportunitiesSinceLast < 0) return null;
  if (input.lastConfirmedAt !== null && input.lastConfirmedAt.getTime() > at.getTime()) return null;
  if (input.skipsCurrentYear > 0 && input.earliestSkipClosedAt === null) return null;
  if (
    !Number.isInteger(input.completedRestorationEpisodes) ||
    input.completedRestorationEpisodes < 0
  ) {
    return null;
  }
  if (!Number.isInteger(input.currentOpenTakenRun) || input.currentOpenTakenRun < 0) return null;
  // A non-positive `consecutive_required` is a corrupt governance number, not a small one: every taken
  // run would qualify as a completed restoration. Treated as UNRESOLVED (the fact is omitted), never
  // as "every run counts" — a wrong restoration count feeds the clause that decides whether a member's
  // restoration path still exists.
  const consecutiveRequired =
    input.r7aConsecutiveRequired !== null &&
    Number.isInteger(input.r7aConsecutiveRequired) &&
    input.r7aConsecutiveRequired > 0
      ? input.r7aConsecutiveRequired
      : null;

  const inLapse = input.skipsCurrentYear > 0; // `missed-closed-cycle-v1`
  return {
    totalCount: input.totalCount,
    everContributed: input.totalCount > 0,
    // ⚖ OPPORTUNITIES, never elapsed time — see {@link ContributionFacts.monthsSinceLast}. This is
    // deliberately NOT `calendarMonthsBetween(lastConfirmedAt, at)`; that reading flags an entire
    // quiet Pariwar. Do not "simplify" it back to date arithmetic.
    monthsSinceLast: input.lastConfirmedAt === null ? null : input.opportunitiesSinceLast,
    skipsCurrentYear: input.skipsCurrentYear,
    inLapse,
    lapseSince: inLapse ? (input.earliestSkipClosedAt?.toISOString() ?? null) : null,
    // ⚖ `consecutive-opportunity-restoration-v1` — the run counting itself happens in the SAME scan
    // that produces the missed-cycle aggregates (`facts.ts`, D3); what is decided HERE is the one
    // thing the SQL cannot decide: whether the threshold that counting used was genuinely resolved.
    // Un-resolved ⇒ UNKNOWN, never `0` (AC7).
    r7aRestorationsUsed: consecutiveRequired === null ? null : input.completedRestorationEpisodes,
    currentOpenTakenRun: input.currentOpenTakenRun,
    // Story 10.26 — the SEVENTH and final engine fact. A straight pass-through: the existential was
    // already answered as-of `at` by the read, and there is nothing here for the derivation to decide.
    // ⚠ MONOTONE (`false → true`, never back) — a member cannot un-assert. Acceptable ONLY because an
    // asserted event can never worsen a member's standing (AC5/D4 keeps R7(G) out of the violator-flag
    // channel entirely). If that exclusion is ever relaxed, this monotonicity becomes a defect.
    personalEventAsserted: input.personalEventAsserted,
  };
}

/**
 * Map the derived facts to the engine fact-bag the R7 ladder reads. Keys come from
 * `R7_CONTRIBUTION_FACT_KEYS` — never re-spelled string literals, so a key rename in the engine breaks
 * the build here rather than silently un-gating a clause.
 *
 * `months_since_last` and `r7a_restorations_used` are OMITTED when null (see
 * {@link ContributionFacts}) — the two conditional keys, and deliberately so: the engine's `hasFact`
 * guard resolves an absent fact to a failed condition, which is the honest outcome for a fact that
 * could not be derived. A fabricated `0` would read as an affirmative claim about the member.
 */
export function contributionFactsToBag(facts: ContributionFacts): Facts {
  const bag: Facts = {
    [R7_CONTRIBUTION_FACT_KEYS.TOTAL_COUNT]: facts.totalCount,
    [R7_CONTRIBUTION_FACT_KEYS.EVER_CONTRIBUTED]: facts.everContributed,
    [R7_CONTRIBUTION_FACT_KEYS.SKIPS_CURRENT_YEAR]: facts.skipsCurrentYear,
    [R7_CONTRIBUTION_FACT_KEYS.IN_LAPSE]: facts.inLapse,
    // Story 10.26 — UNCONDITIONAL, unlike the two nullable keys below: `false` is a real answer about
    // this member, not an unresolved one, so omitting it would misrepresent a member who has genuinely
    // never asserted as one whose assertion state could not be read. Keyed from
    // `R7_CONTRIBUTION_FACT_KEYS`, never a re-spelled literal (AC8(a)).
    [R7_CONTRIBUTION_FACT_KEYS.PERSONAL_EVENT_EXCUSE_CLAIMED]: facts.personalEventAsserted,
  };
  if (facts.monthsSinceLast !== null) {
    bag[R7_CONTRIBUTION_FACT_KEYS.MONTHS_SINCE_LAST] = facts.monthsSinceLast;
  }
  if (facts.r7aRestorationsUsed !== null) {
    bag[R7_CONTRIBUTION_FACT_KEYS.R7A_RESTORATIONS_USED] = facts.r7aRestorationsUsed;
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
 * The APPLIED R7 clause's restoration parameters, as the ladder's precedence pick reports them —
 * Story 10.25 (AC4). Read from the CLAUSE DATA (`restoration.consecutive_required`), never a constant.
 *
 * `null` for the whole object means NO R7 clause applied to this member: they are in no
 * contribution-discipline restoration path at all. `consecutiveRequired: null` means one DID apply but
 * its restoration package is not measured in consecutive contributions (R7(D)/(E)/(F) prescribe
 * `lock_in_months` + `catch_up_required` / `complete_all` instead).
 */
export interface AppliedRestorationRequirement {
  readonly clauseId: string;
  readonly consecutiveRequired: number | null;
}

/**
 * Derive the restoration-package sub-object Story 10.16's disclosure renders — Story 10.25 (AC4, D4).
 *
 * ⚠ `required` comes from the APPLIED clause, NOT from R7(A). A member whose applied clause is R7(C)
 * is serving a 5-consecutive package; measuring their progress against R7(A)'s 3 would tell them they
 * are further along than they are, on the surface that asks them for money without coverage. The open
 * run (`currentOpenTakenRun`) is deliberately threshold-independent so this can be true.
 *
 * `remaining` is floored at 0: a member who has already completed the run still has a package that is
 * simply finished, and a negative "remaining" is not a thing to render.
 */
export function deriveRestorationPackage(
  facts: ContributionFacts,
  applied: AppliedRestorationRequirement | null,
): RestorationPackagePayload {
  if (applied === null) return { status: 'no_consecutive_requirement', clauseId: null };
  if (applied.consecutiveRequired === null || applied.consecutiveRequired <= 0) {
    return { status: 'no_consecutive_requirement', clauseId: applied.clauseId };
  }
  const required = applied.consecutiveRequired;
  return {
    status: 'ok',
    remaining: Math.max(0, required - facts.currentOpenTakenRun),
    required,
  };
}

/**
 * Build the `contributionHistorySummary` `ok` arm from the derived facts.
 *
 * The fact map is keyed by the DOTTED `R7_CONTRIBUTION_FACT_KEYS` values, because that is the shape
 * `deriveViolatorFlags` already filters on (`startsWith('contribution.')`) — the trustee-lite
 * `factsEstablishing[]` reads it directly, with ZERO changes to `violator-flags.ts`. Story 10.25's
 * sixth key rides that same map and therefore needs no change there either.
 *
 * `applied` is the ladder's precedence pick (Story 10.25 AC4). It is a REQUIRED parameter rather than
 * an optional one on purpose: a caller that forgets it would silently report every member as having no
 * restoration package, which is a claim about their standing, not a missing decoration.
 */
export function contributionFactsToSummary(
  facts: ContributionFacts,
  applied: AppliedRestorationRequirement | null,
): ContributionHistoryAvailable {
  return {
    status: 'ok',
    facts: assertNumberOrBooleanFacts(contributionFactsToBag(facts)),
    lapseSince: facts.lapseSince,
    heldFacts: R7_HELD_FACTS,
    // APPENDED, never reordered — `validityPayloadHash` canonicalises the object and the 4.6 hash
    // contract is order-sensitive.
    restorationPackage: deriveRestorationPackage(facts, applied),
  };
}

/**
 * Read + derive the contribution facts for one member at the PINNED instant (the service seam).
 *
 * THREE queries, independent of the member's contribution/assignment/cycle/assertion count (AC7; the
 * budget moved 2 → 3 in Story 10.26 for the assertion existential) — the aggregate shape is the domain
 * read's contract, pinned by a counted-query test.
 */
export async function produceContributionFacts(
  db: Db,
  ctx: { pariwarId: ids.PariwarId; memberId: ids.MemberId },
  atTimestamp: Date,
): Promise<ContributionFacts | null> {
  const inputs = await contribution.readContributionFactInputs(db, ctx, atTimestamp);
  return deriveContributionFacts(inputs, atTimestamp);
}
