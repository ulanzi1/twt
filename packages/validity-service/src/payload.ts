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
import type { ClauseEvalSlot } from './rules.js';
import type {
  ApplicableClause,
  ContributionHistoryUnavailable,
  LockInStatusPayload,
  MedicalDisclosureFlagsPayload,
  MemberValidityPayload,
  ProvenanceEntry,
  RetirementCoveragePayload,
  RetirementCoverageUnavailable,
  VyawasthaShulkStatusPayload,
} from './types.js';

// ── The state → is_valid / is_active mapping (a DOCUMENTED composition, not a new rule) ───────────
//
// PRD FR-12A names top-level `is_valid` ("covered for support if death today") + `is_active` ("valid
// AND past lock-in AND not suspended"). Neither is a Niyamavali clause — they are a composition of the
// member's lifecycle state AND (Story 10.10) their moderation standing. These constants + the two
// derive functions are the SINGLE source of that mapping: refining what counts is a one-line edit
// here, ZERO engine/rule change. (Recorded as a variance in the Dev Agent Record — the epic AC does
// not enumerate the exact state set; this is the service's honest composition of the Story 3.1
// lifecycle states, not an invented policy.)
//
// ── Story 10.10, Decision 8: this ONE edit is the ENTIRE moderation enforcement surface ──────────
// Moderation (suspend / terminate) is an event-derived OVERLAY orthogonal to the lifecycle machine —
// `members.state` never moves (Decision 1). Enforcement arrives through `is_valid` and NOTHING else.
// Because `apps/jobs/src/assignable-roster.ts` reads `payload.isValid` and nothing else (the FROZEN
// AI-7-2 invariant — [[project_assignability_predicate_is_isvalid_only]]), pool assignability, claim
// eligibility and the rules engine ALL inherit suspension with NO code change of their own.
//
// ⚠ DO NOT add a moderation predicate to `assignable-roster.ts`, `peer-mesh-read.ts`, the niyamavali
// `member_state_in` operator, or any of the five `TERMINAL_STATES` Sets. Forking the check into N
// places is exactly what the AI-7-2 invariant was frozen to prevent, and a reviewer is instructed to
// treat any other subfield read on that path as a finding.

/** States where the member is covered for death-benefit support ("valid"): paid + not lapsed/withdrawn. */
export const VALID_STATES: readonly member.MemberLifecycleState[] = [
  'lock-in',
  'active',
  'active-in-grace',
];

/** States where the member is narrowly ACTIVE (valid, past lock-in, not in grace/lapsed/withdrawn). */
export const ACTIVE_STATES: readonly member.MemberLifecycleState[] = ['active'];

/**
 * `is_valid` = a covered lifecycle state AND not under moderation (Story 10.10, AC5).
 *
 * `moderationStatus` defaults to `'none'` so the ~dozen DB-free unit-test call sites that predate
 * Story 10.10 keep their meaning. The SERVICE always passes a real, DB-resolved status — see
 * `service.ts`, where the overlay is resolved alongside `getMemberStateAt` at the same pinned
 * instant, so the two halves of this composition can never be read from different moments.
 */
export function deriveIsValid(
  state: member.MemberLifecycleState,
  moderationStatus: member.moderation.ModerationStatus = 'none',
): boolean {
  return VALID_STATES.includes(state) && moderationStatus === 'none';
}

/**
 * `is_active` = a narrowly-active lifecycle state AND not under moderation.
 *
 * ⚠ DELIBERATE EXTENSION of Story 10.10 AC5, which names only `deriveIsValid`. PRD FR-12A's OWN
 * definition of `is_active` is "valid AND past lock-in AND **not suspended**" — so leaving
 * `is_active: true` for a suspended member would contradict the PRD line this function implements,
 * and would render the member panel's "active" headline for someone who is suspended. Recorded in
 * the Dev Agent Record rather than made silently.
 */
export function deriveIsActive(
  state: member.MemberLifecycleState,
  moderationStatus: member.moderation.ModerationStatus = 'none',
): boolean {
  return ACTIVE_STATES.includes(state) && moderationStatus === 'none';
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

/** The single contribution-unavailable sentinel (D2-A) — one value, so every payload is byte-identical here. */
export const CONTRIBUTION_UNAVAILABLE: ContributionHistoryUnavailable = {
  status: 'producer_unavailable',
  producer: 'epic-8-9',
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
  // The moderation flag is APPENDED after the clause-order flags so the array stays deterministic
  // (clause flags in declared clause order, then at most one moderation flag) — the payload hash is
  // order-sensitive, and a non-deterministic position here would break replay-identity.
  const moderationFlag = moderationSpecialFlag(moderation.status, moderation.reasonCode);
  const allSpecialFlags = moderationFlag === null ? specialFlags : [...specialFlags, moderationFlag];

  const withoutHash: Omit<MemberValidityPayload, 'validityPayloadHash'> = {
    memberId: input.memberId,
    evaluatedAt: input.evaluatedAt.toISOString(),
    ruleRegistryVersion,
    isValid: deriveIsValid(input.memberState, moderation.status),
    isActive: deriveIsActive(input.memberState, moderation.status),
    lockInStatus: input.lockInStatus,
    vyawasthaShulkStatus: input.vyawasthaShulkStatus,
    contributionHistorySummary: CONTRIBUTION_UNAVAILABLE,
    medicalDisclosureFlags: input.medicalDisclosureFlags,
    retirementCoverage: input.retirementCoverage,
    specialFlags: allSpecialFlags,
    applicableNiyamavaliClauses,
    provenanceTrace,
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
