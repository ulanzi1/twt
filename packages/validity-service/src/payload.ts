// Canonical payload ASSEMBLY + hash — Story 4.6 (Task 1, Task 3; AC1, AC2).
//
// PURE (no clock / randomness / mutable state / DB): assembles the ordered clause results + the
// produced sub-objects into the canonical `MemberValidityPayload` and computes the replay-stable
// `validityPayloadHash`. Kept DB-free so the 100×-thread determinism gate exercises the exact
// composition path (AC2) and the field mapping is unit-testable without Postgres.

// `member` is a VALUE import (not `import type`) since Story 10.10: the assembly reads
// `member.moderation.NO_MODERATION` as the not-moderated default for callers that omit the overlay.
import { canonicalJsonStringify, member, type CanonicalJsonValue, type ids } from '@twt/domain';
import {
  niyamavaliVersionHash,
  R12_GRANTED_YEARS_KEY,
  R12_IS_RETIRED_KEY,
  type EvaluationResult,
} from '@twt/niyamavali-engine';

import { addCalendarYears, ceilDaysBetween } from './calendar.js';
import { sha256Hex } from './hash.js';
import { R7_REGISTRY_UNPROVISIONED_PRODUCER, type ClauseEvalSlot } from './rules.js';
import type {
  ApplicableClause,
  ContributionHistorySummary,
  ContributionHistoryUnavailable,
  LockInStatusPayload,
  RestorationDisciplineStatusPayload,
  MedicalDisclosureFlagsPayload,
  MemberValidityPayload,
  ProvenanceEntry,
  RetirementCoveragePayload,
  RetirementCoverageUnavailable,
  VyawasthaShulkStatusPayload,
} from './types.js';

// ── The state → is_valid / is_active / is_assignable mapping (a DOCUMENTED composition) ───────────
//
// PRD FR-12A names top-level `is_valid` ("covered for support if death today") + `is_active` ("valid
// AND past lock-in AND not suspended"). Neither is a Niyamavali clause — they are a composition of the
// member's lifecycle state AND (Story 10.10) their moderation standing. Story 10.17 adds a THIRD,
// `is_assignable` (the donor-roster predicate). These constants + the three derive functions are the
// SINGLE source of that mapping: refining what counts is a one-line edit here, ZERO engine/rule
// change. (Recorded as a variance in the Dev Agent Record — the epic AC does not enumerate the exact
// state set; this is the service's honest composition of the Story 3.1 lifecycle states, not an
// invented policy.)
//
// ── Story 10.17: the moderation enforcement surface, stated CORRECTLY ────────────────────────────
// Moderation (suspend / terminate) is an event-derived OVERLAY orthogonal to the lifecycle machine —
// `members.state` never moves (Story 10.10, Decision 1). Story 10.10's Decision-8 comment claimed here
// that "pool assignability, claim eligibility and the rules engine ALL inherit suspension" through
// `is_valid`. ⚠ ONLY THE FIRST OF THOSE THREE WAS EVER TRUE, and after Story 10.17 it is true through
// `is_assignable` instead. The accurate statement:
//
//   · `is_valid`      — COVERAGE ("covered for support if death today"). Suspended ⇒ false. Its ONE
//                       moderation consumer was the pool roster, which no longer reads it.
//   · `is_assignable` — the DONOR ROSTER ("may be assigned to a contribution pool"). Suspended ⇒
//                       TRUE; terminated ⇒ false. `apps/jobs/src/assignable-roster.ts` reads THIS
//                       field and nothing else (AI-7-2, as amended by Story 10.17).
//   · Claim eligibility runs the HUMAN R5/R8 ladder and never reads `is_valid`.
//   · The niyamavali engine PRODUCES inputs to this payload; it never reads `is_valid` either.
//
// ⚠ DO NOT add a moderation predicate to `assignable-roster.ts`, `peer-mesh-read.ts`, the niyamavali
// `member_state_in` operator, or any of the five `TERMINAL_STATES` Sets. Forking the check into N
// places is exactly what the AI-7-2 invariant was frozen to prevent, and a reviewer is instructed to
// treat any subfield read OTHER THAN `is_assignable` on the roster path as a finding.
// [[project_assignability_predicate_is_isvalid_only]]

/** States where the member is covered for death-benefit support ("valid"): paid + not lapsed/withdrawn. */
export const VALID_STATES: readonly member.MemberLifecycleState[] = [
  'lock-in',
  'active',
  'active-in-grace',
];

/** States where the member is narrowly ACTIVE (valid, past lock-in, not in grace/lapsed/withdrawn). */
export const ACTIVE_STATES: readonly member.MemberLifecycleState[] = ['active'];

/**
 * `is_valid` = a covered lifecycle state AND not under moderation AND not under a RESTORATION
 * lock-in (Story 10.10 AC5, extended by Story 10.23 AC6).
 *
 * Both status arguments default so the DB-free unit-test call sites that predate each story keep
 * their meaning. The SERVICE always passes real, DB-resolved values — see `service.ts`, where both
 * overlays are resolved inside the existing `Promise.all` alongside `getMemberStateAt`, so all three
 * halves of this composition are read at the SAME pinned instant and can never come from different
 * moments.
 *
 * ── ⚠ Story 10.23: THIS is where the restoration lock-in reaches coverage, and the ONLY place ────
 * A restoration lock-in removes COVERAGE (Niyamavali §3.3: *"only their eligibility to claim as a
 * beneficiary is affected for the lock-in period"*) and must NOT touch the DONOR ROSTER. The
 * structural guarantee is that `deriveIsAssignable` below takes `(state, moderationStatus)` and
 * **cannot see this third input at all** — failure mode 2 is impossible by signature. ⛔ Do not widen
 * that signature "for symmetry"; it is the single most damaging change available in this area. If a
 * locked-in member left the roster, pool assignment is the only contribution path (Story 7.6, fenced
 * by 8.10) and R7(D)'s catch-up would become unreachable — recreating, automatically and at scale,
 * the de-facto permanent ban Story 10.17 exists to correct.
 *
 * ⚠ `'expired'` is NOT `'in-lock-in'`: a member who has SERVED a restoration lock-in is covered
 * again with no event and no job (AC4 — expiry is derived at read).
 *
 * ⛔ And note what is NOT reopened here: a member in the JOINING `lock-in` lifecycle state stays
 * `isValid: true`, because `VALID_STATES` contains `'lock-in'`. Story 10.16's D3 refused that
 * substitution in writing. The system therefore holds two opposite answers to "does a lock-in remove
 * coverage?" — a real, live contradiction this story makes member-visible and does NOT resolve
 * (Escalation 4, routed to the Trustee Panel; changing `VALID_STATES` would move coverage for every
 * existing member and rehash every payload).
 */
export function deriveIsValid(
  state: member.MemberLifecycleState,
  moderationStatus: member.moderation.ModerationStatus = 'none',
  restorationState: member.restorationDiscipline.RestorationDisciplineState = 'never-imposed',
): boolean {
  return (
    VALID_STATES.includes(state) && moderationStatus === 'none' && restorationState !== 'in-lock-in'
  );
}

/**
 * `is_assignable` = the DONOR-ROSTER predicate (Story 10.17). A covered lifecycle state AND not
 * TERMINATED — a suspended member stays on the roster because suspension removes the entitlement to
 * RECEIVE support, never the obligation to CONTRIBUTE while completing a restoration path
 * (Niyamavali §3.3: *"a member in lock-in remains a member and may continue to contribute"*).
 *
 * Deliberately NOT `is_valid`: the two answer different questions and must be free to diverge.
 *   · is_valid      — "covered for support if death today"      (coverage)
 *   · is_assignable — "may be assigned to a contribution pool"  (roster)
 * A suspended member is `is_valid: false, is_assignable: true`. That divergence IS the story: before
 * it, `is_valid` was the sole assignability predicate, pool assignment is the ONLY contribution path
 * (fenced by Story 8.10), and R7(A) restoration requires three CONSECUTIVE contributions — so every
 * suspension was a de-facto permanent ban and six of the seven R7 restoration clauses were
 * unreachable. This predicate is the one line that reopens them.
 *
 * `VALID_STATES` is REUSED rather than re-derived (Story 10.17 Escalation 3): the join-`lock-in`
 * coverage question is unresolved, and whatever it resolves to, both predicates should move together.
 *
 * No reason-code branching, ever: the seven codes establish the GROUND for the sanction, never the
 * roster consequence. A per-code roster rule would relocate a governance decision into a derivation.
 *
 * ── ⛔ STORY 10.23 DELIBERATELY DID NOT TOUCH THIS FUNCTION, AND THAT IS AN INVARIANT (AC6) ───────
 * A restoration lock-in removes COVERAGE and is IGNORED BY THE ROSTER (`epics.md:3878`). This
 * signature — `(state, moderationStatus)`, and nothing else — is the STRUCTURAL guarantee: the
 * restoration overlay is not a parameter, so it cannot leak in by accident. A locked-in member is
 * `isValid: false, isAssignable: true`, exactly as a suspended member is.
 *
 * ⛔ **Widening this signature is the single most damaging change available in this area.** If a
 * locked-in member left the donor roster, pool assignment is the ONLY contribution path (Story 7.6,
 * fenced by 8.10), so R7(D)'s *"catch-up of the missed contribution"* — already unreachable for
 * other reasons (Escalation 6) — would become structurally unreachable, and the instrument would
 * recreate the de-facto permanent ban Story 10.17 was written to correct: automatically, at scale,
 * with no trustee ever acting. Pinned by test, in `payload.test.ts` and on the live roster path.
 */
export function deriveIsAssignable(
  state: member.MemberLifecycleState,
  moderationStatus: member.moderation.ModerationStatus = 'none',
): boolean {
  return VALID_STATES.includes(state) && moderationStatus !== 'terminated';
}

/**
 * `is_active` = a narrowly-active lifecycle state AND not under moderation.
 *
 * ⚠ DELIBERATE EXTENSION of Story 10.10 AC5, which names only `deriveIsValid`. PRD FR-12A's OWN
 * definition of `is_active` is "valid AND past lock-in AND **not suspended**" — so leaving
 * `is_active: true` for a suspended member would contradict the PRD line this function implements,
 * and would render the member panel's "active" headline for someone who is suspended. Recorded in
 * the Dev Agent Record rather than made silently.
 *
 * ── Story 10.23 (AC6) — the restoration lock-in is reconciled here DELIBERATELY, not by accident ──
 * FR-12A defines `is_active` as *"valid AND past lock-in AND not suspended"*, and a member serving a
 * restoration lock-in satisfies neither of the first two conjuncts: `deriveIsValid` is already
 * `false` for them, and they are by construction NOT past a lock-in. Rendering such a member as
 * `active` would contradict the same PRD line this function was extended for in Story 10.10, and
 * would put an "active" headline on the member panel of someone whose coverage the system has just
 * removed. So the third input is threaded here too, and the choice is recorded rather than left to
 * be inferred from `ACTIVE_STATES` — the precedent Story 10.10 set at this exact function.
 */
export function deriveIsActive(
  state: member.MemberLifecycleState,
  moderationStatus: member.moderation.ModerationStatus = 'none',
  restorationState: member.restorationDiscipline.RestorationDisciplineState = 'never-imposed',
): boolean {
  return (
    ACTIVE_STATES.includes(state) && moderationStatus === 'none' && restorationState !== 'in-lock-in'
  );
}

// ── The `special_flags` moderation entries (PRD `prd.md:411` form) ────────────────────────────────
//
// `prd.md:411` models suspension as a validity FLAG — `special_flags[], // e.g. "suspended_per_R7E"`
// — which is itself part of why Decision 1 models moderation as an overlay rather than a lifecycle
// label. These flags are MEMBER-VISIBLE: they are deliberately NOT added to
// `STATE_TRUSTEE_ONLY_FLAGS` in redaction.ts, because the member must be told WHY
// (`ux-design-specification.md:1890-1896`). The Tier-1 free-text rationale stays out of the payload
// ENTIRELY — only the bounded, non-PII reason CODE ever reaches a member-readable surface.

/** `suspended_per_<reason_code>` / `terminated_per_<reason_code>`, or `null` when unmoderated. */
export function moderationSpecialFlag(
  moderationStatus: member.moderation.ModerationStatus,
  reasonCode: string | null,
): string | null {
  if (moderationStatus === 'none') return null;
  const prefix = moderationStatus === 'suspended' ? 'suspended_per' : 'terminated_per';
  return `${prefix}_${reasonCode ?? 'unspecified'}`;
}

// ── Lock-in projection (Story 3.6 snapshot → the payload sub-object) ──────────────────────────────

/** Project the lock-in snapshot into the payload sub-object. `null` clock = never entered lock-in. */
export function projectLockInStatus(
  clock: { enteredAt: Date; lockInDaysAtJoin: number } | null,
  evaluatedAt: Date,
): LockInStatusPayload {
  if (clock === null) {
    return { daysAtJoin: null, unlockDate: null, state: 'never-entered' };
  }
  const unlock = addCalendarDaysLocal(clock.enteredAt, clock.lockInDaysAtJoin);
  const state = evaluatedAt.getTime() < unlock.getTime() ? 'in-lock-in' : 'unlocked';
  return {
    daysAtJoin: clock.lockInDaysAtJoin,
    unlockDate: unlock.toISOString(),
    state,
  };
}

// ── Restoration-discipline projection (Story 10.23 — the SECOND, INDEPENDENT clock; AC5/AC7) ──────

/**
 * The wire flag Story 10.16 shipped its consumer for, DARK, and named this story as the owner of:
 *
 * ```ts
 * // packages/ui/src/contribution-disclosure/presenter.ts:74-84
 * // Story 10.23 OWNS the wire name; if it ships a different one, THIS CONSTANT is
 * // the only line that changes (the copy keys, the view-model shape and `pay.tsx` do not — AC2).
 * const RESTORATION_LOCK_IN_FLAG = 'restoration_lock_in';
 * ```
 *
 * Emitting this literal is the ENTIRE activation mechanism (AC7): the disclosure arm, its four copy
 * keys (already authored in `en` + `hi`), the view-model shape and `pay.tsx` are all shipped and
 * unchanged. **This story writes zero new disclosure copy and adds no UI implementation.**
 */
export const RESTORATION_LOCK_IN_FLAG = 'restoration_lock_in';

/**
 * Project the restoration-discipline overlay into its payload sub-object (D4).
 *
 * The overlay has already done the folding and the AC5 combination at the pinned instant; this is a
 * pure shape/ISO conversion. ⚠ `lockInStatus` is NOT read, NOT merged and NOT modified here — the
 * two clocks are siblings, and a member may be serving both with different unlock instants.
 */
export function projectRestorationDisciplineStatus(
  overlay: member.restorationDiscipline.RestorationDisciplineOverlay,
): RestorationDisciplineStatusPayload {
  return {
    state: overlay.state,
    imposedAt: overlay.imposedAt?.toISOString() ?? null,
    expiresAt: overlay.expiresAt?.toISOString() ?? null,
  };
}

/** Local calendar-day add (the lock-in window is expressed in days; leap-safe). */
function addCalendarDaysLocal(date: Date, days: number): Date {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

// ── Retirement-coverage date projection ([[CR-4.5-D3]] — the engine emits granted_years; we project) ──

/**
 * Project the R12 engine result into the FR-12A `retirement_coverage` shape + the epic's extension
 * fields. The engine emits raw `granted_years` (tenure-derived `years_of_coverage_earned`, independent
 * of `is_retired`) + echoes `is_retired`; this projects `coverageThrough = retiredAt + grantedYears`,
 * `daysRemaining`, and `active = isRetired && daysRemaining > 0`. A non-retired member with tenure
 * carries a NONZERO `yearsOfCoverageEarned` but `null` projection + `active:false` ([[CR-4.5-D3]]).
 *
 * `null` slot result (R12 clause not resolvable for the Pariwar) → a typed `clause_unavailable`
 * sentinel, NEVER a fabricated zero.
 */
export function projectRetirementCoverage(
  result: EvaluationResult | null,
  retiredAt: Date | null,
  evaluatedAt: Date,
): RetirementCoveragePayload | RetirementCoverageUnavailable {
  if (result === null) return { status: 'clause_unavailable' };
  const values = result.result.computed?.values;
  // A non-computed / inputs-unavailable result carries no computed channel — surface the honest gap
  // rather than a fabricated zero (the engine already routed absent facts to rule.inputs_unavailable).
  if (!values) return { status: 'clause_unavailable' };

  const grantedYears = toInt(values[R12_GRANTED_YEARS_KEY]);
  const isRetired = values[R12_IS_RETIRED_KEY] === true;
  if (grantedYears === null) return { status: 'clause_unavailable' };

  if (!isRetired || retiredAt === null) {
    // Coverage EARNED (nonzero years) but not yet active — no projection until retirement.
    return {
      isRetired,
      yearsOfCoverageEarned: grantedYears,
      coverageThrough: null,
      daysRemaining: null,
      active: false,
    };
  }
  const coverageThrough = addCalendarYears(retiredAt, grantedYears);
  const daysRemaining = ceilDaysBetween(evaluatedAt, coverageThrough);
  return {
    isRetired: true,
    yearsOfCoverageEarned: grantedYears,
    coverageThrough: coverageThrough.toISOString(),
    daysRemaining,
    active: daysRemaining > 0,
  };
}

function toInt(v: CanonicalJsonValue | undefined): number | null {
  return typeof v === 'number' && Number.isInteger(v) ? v : null;
}

// ── Ordered clause + provenance + special-flag assembly (AC2) ─────────────────────────────────────

export interface AssembledClauses {
  applicableNiyamavaliClauses: ApplicableClause[];
  provenanceTrace: ProvenanceEntry[];
  specialFlags: string[];
  /** Composite registry version over the resolved clause_version_ids (declared order → engine hash). */
  ruleRegistryVersion: string;
}

/**
 * Assemble the ordered clause list + provenance trace + special flags from the declared-order slots.
 * A `null` slot (clause not resolvable) contributes NOTHING (it is not "applicable"). Special flags
 * are concatenated in clause order (stable). The registry version hashes the resolved version ids.
 */
export function assembleClauses(slots: readonly ClauseEvalSlot[]): AssembledClauses {
  const applicableNiyamavaliClauses: ApplicableClause[] = [];
  const provenanceTrace: ProvenanceEntry[] = [];
  const specialFlags: string[] = [];
  const clauseVersionIds: ids.ClauseVersionId[] = [];

  for (const slot of slots) {
    const r = slot.result;
    if (r === null) continue;
    applicableNiyamavaliClauses.push({
      clauseId: r.provenance.clauseId,
      clauseVersionId: r.provenance.clauseVersionId,
      outcome: r.result.decision,
      reasonCode: r.reasonCode,
    });
    provenanceTrace.push({
      clauseId: r.provenance.clauseId,
      clauseVersionId: r.provenance.clauseVersionId,
      payloadHash: r.provenance.payloadHash,
      evaluatedAt: r.provenance.evaluatedAt,
      benefitMechanism: r.provenance.benefitMechanism,
    });
    // Special flags in clause order (each clause's flags are already in stable payload-array order).
    for (const flag of r.result.specialFlags) specialFlags.push(flag);
    clauseVersionIds.push(r.provenance.clauseVersionId);
  }

  const ruleRegistryVersion =
    clauseVersionIds.length > 0 ? niyamavaliVersionHash(clauseVersionIds) : EMPTY_REGISTRY_VERSION;

  return { applicableNiyamavaliClauses, provenanceTrace, specialFlags, ruleRegistryVersion };
}

/** The registry-version sentinel when NO clause resolved (e.g. an unprovisioned Pariwar). */
export const EMPTY_REGISTRY_VERSION = 'no-clauses';

/**
 * The single contribution-unavailable sentinel (D2-A) — one value, so every payload that carries it is
 * byte-identical here.
 *
 * ── Story 10.24 (AC8): `producer` re-pointed `'epic-8-9'` → `'story-10-24'` ──────────────────────
 * The rename Story 10.11 owed forward ([[feedback_closure_language_precision]]). `epic-8-9` named a
 * producer that was never a unit of work — which is exactly how the gap survived two epic
 * retrospectives unowned. `story-10-24` names the story that built it.
 *
 * ⚠ The status LITERAL `'producer_unavailable'` does NOT change: `violator-flags.ts`'s short-circuit
 * and `tests/trustee-lite-sentinel-lockstep.test.ts` both depend on it, and that lockstep test is the
 * pin that keeps the two constants honest.
 *
 * ⚠ This sentinel STAYS REACHABLE after 10.24 (D6). It is now the honest answer for a genuine
 * PER-MEMBER gap (no projected history; a historical `at` before the projection's coverage; an
 * incomplete backfill) rather than a deployment-wide "no producer exists" statement. It is never
 * replaced by a fabricated `{ total_count: 0 }`.
 */
export const CONTRIBUTION_UNAVAILABLE: ContributionHistoryUnavailable = {
  status: 'producer_unavailable',
  producer: 'story-10-24',
};

/**
 * The R7-registry-unprovisioned sentinel (2026-08-06 finding) — the individual-member analogue of
 * `r7-candidate-scan.ts`'s `R7ViolatorScan.status === 'unavailable'`. When NO activated R7(C)–(F)
 * clause version is effective for this Pariwar at the evaluated instant, the RULES are unprovisioned —
 * a DIFFERENT gap from `CONTRIBUTION_UNAVAILABLE` above, which means the FACTS could not be derived.
 *
 * Reusing `contributionHistorySummary`'s `producer_unavailable` STATUS (not a new status literal) is
 * deliberate: both `violator-flags.ts`'s short-circuit and `member-status/presenter.ts` already branch
 * on that status alone, never inspecting `producer` — so this correctly degrades the member to
 * "detection unavailable" instead of silently reading as "evaluated, this member is clean", matching
 * what the bulk Trustee-Lite scan already does for the identical registry gap.
 */
export const CONTRIBUTION_R7_REGISTRY_UNAVAILABLE: ContributionHistoryUnavailable = {
  status: 'producer_unavailable',
  producer: R7_REGISTRY_UNPROVISIONED_PRODUCER,
};

// ── Full payload assembly + the replay-stable hash ────────────────────────────────────────────────

/** The produced inputs to the pure assembly (all already derived by the DB-reading service layer). */
export interface AssembleInput {
  memberId: ids.MemberId;
  evaluatedAt: Date;
  memberState: member.MemberLifecycleState;
  /**
   * The member's moderation overlay at the SAME pinned instant as `memberState` (Story 10.10).
   * Optional so DB-free unit tests that predate 10.10 keep compiling; absent ≡ not moderated.
   */
  moderationOverlay?: member.moderation.ModerationOverlay;
  lockInStatus: LockInStatusPayload;
  vyawasthaShulkStatus: VyawasthaShulkStatusPayload;
  medicalDisclosureFlags: MedicalDisclosureFlagsPayload;
  retirementCoverage: RetirementCoveragePayload | RetirementCoverageUnavailable;
  /**
   * Story 10.24 — the produced contribution history, or ABSENT when this member's facts could not be
   * derived (the service then falls back to `CONTRIBUTION_UNAVAILABLE`, D6). Optional so DB-free unit
   * tests that predate 10.24 keep compiling; absent ≡ the honest gap, never a fabricated zero.
   */
  contributionHistory?: ContributionHistorySummary;
  /**
   * Story 10.23 — the member's restoration-discipline overlay at the SAME pinned instant as
   * `memberState` and `moderationOverlay`. Optional so DB-free unit tests that predate 10.23 keep
   * compiling; absent ≡ never imposed (`NO_RESTORATION_DISCIPLINE`).
   *
   * ⚠ It must be resolved inside `service.ts`'s existing `Promise.all`, at the same `at` — never in
   * a second read at a second moment (AC6).
   */
  restorationDiscipline?: member.restorationDiscipline.RestorationDisciplineOverlay;
  slots: readonly ClauseEvalSlot[];
}

/**
 * Assemble the FULL, redaction-free canonical payload from the produced pieces + ordered clause slots,
 * then stamp the `validityPayloadHash`. PURE + deterministic: every array is already in declared order,
 * every timestamp is an ISO string, so the payload hashes byte-identically across the 100×-thread
 * replay (AC2). Redaction is applied AFTER this (redaction.ts), over the returned full payload.
 */
export function assemblePayload(input: AssembleInput): MemberValidityPayload {
  const { applicableNiyamavaliClauses, provenanceTrace, specialFlags, ruleRegistryVersion } =
    assembleClauses(input.slots);

  const moderation = input.moderationOverlay ?? member.moderation.NO_MODERATION;
  const restoration =
    input.restorationDiscipline ?? member.restorationDiscipline.NO_RESTORATION_DISCIPLINE;

  // ── `specialFlags` ORDER IS PART OF THE CONTRACT (AC7) ────────────────────────────────────────
  // The payload hash is order-sensitive, so a non-deterministic position here would break replay
  // identity. The order is DECLARED, not incidental:
  //
  //     [ …clause-order flags…, moderation flag?, restoration_lock_in? ]
  //
  // Clause flags first (in declared clause order), then at most one moderation flag (Story 10.10),
  // then at most one restoration flag (Story 10.23) — appended LAST because it is the newest
  // instrument, so no existing payload's flag positions move. Where a moderation flag and this flag
  // co-occur, moderation precedes restoration, and a test pins exactly that.
  const moderationFlag = moderationSpecialFlag(moderation.status, moderation.reasonCode);
  const allSpecialFlags = [
    ...specialFlags,
    ...(moderationFlag === null ? [] : [moderationFlag]),
    // ⭐ THE WIRE (AC7). Emitting this literal is the whole activation mechanism for the dormant
    // disclosure Story 10.16 shipped — no new component, no new copy key, no new view-model arm.
    ...(restoration.state === 'in-lock-in' ? [RESTORATION_LOCK_IN_FLAG] : []),
  ];

  const withoutHash: Omit<MemberValidityPayload, 'validityPayloadHash'> = {
    memberId: input.memberId,
    evaluatedAt: input.evaluatedAt.toISOString(),
    ruleRegistryVersion,
    isValid: deriveIsValid(input.memberState, moderation.status, restoration.state),
    isActive: deriveIsActive(input.memberState, moderation.status, restoration.state),
    // Story 10.17 — the ROSTER predicate, resolved from the SAME moderation status as the two above
    // (one overlay read, one instant). Placed immediately after `isActive` so the object literal, the
    // `MemberValidityPayload` type and `MemberValidityPayloadDto` stay in one declared order.
    isAssignable: deriveIsAssignable(input.memberState, moderation.status),
    lockInStatus: input.lockInStatus,
    vyawasthaShulkStatus: input.vyawasthaShulkStatus,
    contributionHistorySummary: input.contributionHistory ?? CONTRIBUTION_UNAVAILABLE,
    medicalDisclosureFlags: input.medicalDisclosureFlags,
    retirementCoverage: input.retirementCoverage,
    specialFlags: allSpecialFlags,
    applicableNiyamavaliClauses,
    provenanceTrace,
    // Story 10.23 — APPENDED last (AC10a: the wire DTO is field-order sensitive; append, never
    // insert). A sibling of `lockInStatus`, never a merge of it (D4).
    restorationDisciplineStatus: projectRestorationDisciplineStatus(restoration),
  };

  return { ...withoutHash, validityPayloadHash: computeValidityPayloadHash(withoutHash) };
}

/**
 * The replay-stable payload hash: `sha256hex(canonicalJsonStringify(<payload minus the hash field
 * AND minus every evaluatedAt, top-level AND per-clause>))` (Task 1). `evaluatedAt` is EXCLUDED so the
 * hash is a pure function of `(member, ruleRegistryVersion, member-state, facts, ordered clause
 * outcomes)` — a live `getValidity` advances the instant by design (evaluate.ts:12-14), and AC2's
 * replay key is `(member_id, rule_registry_version, member_state_hash)`, NOT the timestamp. The
 * 100×-thread gate pins ONE instant, so excluding vs including `evaluatedAt` is moot there; excluding
 * makes the hash additionally stable across time-of-call for an unchanged member (idempotency, AC2 /
 * Task 4). Each `provenanceTrace[]` entry ALSO carries its own `evaluatedAt` (the pinned instant echoed
 * per-clause) — that must be stripped from the hash input too, or two calls to the same unchanged
 * member at two different times would still hash differently despite the top-level field being excluded.
 */
export function computeValidityPayloadHash(
  payload: Omit<MemberValidityPayload, 'validityPayloadHash'>,
): string {
  const { evaluatedAt: _evaluatedAt, provenanceTrace, ...hashInput } = payload;
  void _evaluatedAt;
  const provenanceTraceForHash = provenanceTrace.map(({ evaluatedAt: _clauseEvaluatedAt, ...rest }) => {
    void _clauseEvaluatedAt;
    return rest;
  });
  return sha256Hex(
    canonicalJsonStringify({
      ...hashInput,
      provenanceTrace: provenanceTraceForHash,
    } as unknown as CanonicalJsonValue),
  );
}
