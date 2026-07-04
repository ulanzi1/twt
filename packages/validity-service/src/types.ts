// The canonical FR-12A Member Validity payload contract — Story 4.6 (Task 1; AC1).
//
// The single "is this member valid right now?" answer every admin surface + the
// member's own profile read from (PRD FR-12A). This module is the framework-agnostic
// CONTRACT only — the assembly (payload.ts), the fact producer (producer.ts), the
// multi-clause evaluation (rules.ts), and the redaction (redaction.ts) build it.
//
// ── Naming discipline (clause_versions.ts:17-22; mirrors niyamavali-engine/types.ts) ──
// TS fields are camelCase; every key that CROSSES THE WIRE becomes snake_case, mapped at
// the apps/api contract boundary (packages/contracts), NOT here. `evaluatedAt` is an
// ISO-8601 string (DB-authoritative — mirror `Provenance.evaluatedAt`), never a `Date`:
// the canonical-JSON hasher rejects `Date`, and the payload must hash byte-stably (AC2).
//
// ── Three source shapes reconciled (Dev Notes table) ──────────────────────────────────
// epic AC (epics.md:1992) enumerates the sub-objects; PRD FR-12A (prd.md:388-407) adds the
// top-level `is_valid`/`is_active`/`rule_registry_version` + the sub-object field names; the
// source surfaces (Story 3.6/3.8/3.9/4.5) supply the data. Where the epic + PRD disagree
// (retirement_coverage_extension vs retirement_coverage), the PRD shape wins and this story
// does the date projection ([[CR-4.5-D3]]).

import type { CanonicalJsonValue, ids } from '@twt/domain';

// ── Sub-object: lock-in status (Story 3.6 snapshot via getLockInClock) ────────────────

/** PRD `lock_in_status{days_at_join, unlock_date, state}` — the Story 3.6 lock-in snapshot. */
export interface LockInStatusPayload {
  /** Lock-in days snapshotted at join (`getLockInClock().lockInDaysAtJoin`); null = never entered. */
  daysAtJoin: number | null;
  /** ISO-8601 unlock instant = `enteredAt + daysAtJoin` (calendar-correct); null = never entered. */
  unlockDate: string | null;
  /** `in-lock-in` (evaluatedAt < unlockDate) · `unlocked` (>= unlockDate) · `never-entered`. */
  state: 'in-lock-in' | 'unlocked' | 'never-entered';
}

// ── Sub-object: vyawastha shulk / renewal status (Story 3.8 getVyawasthaShulkStatus) ──

/**
 * PRD `vyawastha_shulk_status{paid_through, days_until_lapse}` — the Story 3.8 renewal snapshot.
 * The internal `daysUntilGraceEnds` maps to the wire `days_until_lapse` at the contract boundary
 * (renewal-read.ts:12-14); this service carries it as `daysUntilLapse` (the payload name) already.
 */
export interface VyawasthaShulkStatusPayload {
  /** Latest receipt `validThrough` (ISO-8601), or null when the member never paid. */
  paidThrough: string | null;
  /** Days (ceil, >=0) to the grace-end/lapse boundary; null when never paid. */
  daysUntilLapse: number | null;
  /** True iff the replayed state is `active-in-grace` (the state is the authority, not date math). */
  inRenewalGrace: boolean;
  /** `daysUntilLapse` while in grace; null outside grace. */
  graceRemainingDays: number | null;
}

// ── Sub-object: contribution history (D2-A — producer is Epic 8/9, NOT produced here) ─

/**
 * The contribution/R7/R8 producer is Epic 8/9 ([[project_engine_never_infers_contribution_facts]]).
 * There is NO contribution event source in the codebase, so this is a DISTINCT, TYPED sentinel —
 * NEVER a fabricated `{ months: 0 }`-style default (an absent fact must be distinguishable from a
 * clean-record member; [[CR-4.4-D3]] / [[CR-4.5-D1]]). R7/R8 are OMITTED from
 * `applicableNiyamavaliClauses[]` until the Epic 8/9 producer supplies real `contribution.*` facts.
 */
export interface ContributionHistoryUnavailable {
  status: 'producer_unavailable';
  /** The story that will supply the `contribution.*`/`claim.*` facts (audit trail for the gap). */
  producer: 'epic-8-9';
}

// ── Sub-object: medical disclosure flags (D2m-A — member-standing, NON-PII) ───────────

/**
 * PRD `medical_disclosure{declared_illnesses[], pending_concealment_flag}` — the member-standing
 * medical signal (D2m-A). The disclosed condition codes are Tier-1 ENCRYPTED
 * (member_medical_disclosures.ts:88-92), so this framework-agnostic service surfaces ONLY the
 * NON-PII summary (presence / count / ima_list_version) — never the condition codes themselves.
 *
 * `pendingConcealmentFlag` is the SM-1-C7 member-standing signal. The TRUE C7 concealment
 * (an undeclared IMA-listed illness surfaced by a DEATH claim) is claim-linked and stays in Epic 6
 * (R14; [[CR-4.4-D3]]) — there is no claim at member-standing validity time. So this flag is set
 * ONLY from a COMPLETED, injected member-standing concealment assessment (the `concealmentAssessment`
 * seam) — never fabricated. Absent that assessment it is `false` (no member-standing flag raised),
 * NOT a placeholder. State-Trustee-scope-only (PRD FR-12A) — redacted for narrower callers.
 */
export interface MedicalDisclosureFlagsPayload {
  /** True iff the member has ANY medical disclosure on record (non-PII presence). */
  hasDisclosureOnRecord: boolean;
  /** Count of declared conditions on the latest disclosure (non-PII metadata); null = none on record. */
  declaredConditionCount: number | null;
  /** The `ima_list_version` (clause_version_id) the latest disclosure was made against; null = none. */
  imaListVersion: string | null;
  /** State-Trustee-scope-only member-standing concealment-review flag (gated seam; never fabricated). */
  pendingConcealmentFlag: boolean;
}

// ── Sub-object: retirement coverage (Story 4.5 R12 engine + THIS story's date projection) ──

/**
 * PRD `retirement_coverage{is_retired, years_of_coverage_earned, coverage_through}` PLUS the
 * epic's `retirement_coverage_extension{granted_years, days_remaining, active}` — the Story 4.5
 * D3 variance this service RESOLVES ([[CR-4.5-D3]]). The engine emits raw `granted_years` (=
 * tenure-derived `years_of_coverage_earned`, independent of `is_retired`) + echoes `is_retired`;
 * this service does the calendar-correct date projection:
 *   `coverageThrough = retiredAt + grantedYears` · `daysRemaining` · `active = isRetired && daysRemaining > 0`.
 */
export interface RetirementCoveragePayload {
  isRetired: boolean;
  /** Tenure-derived granted years — nonzero even for a non-retiree with enough tenure ([[CR-4.5-D3]]). */
  yearsOfCoverageEarned: number;
  /** ISO-8601 `retiredAt + yearsOfCoverageEarned` (calendar-correct); null when not retired. */
  coverageThrough: string | null;
  /** Whole days (ceil, >=0) from evaluatedAt to coverageThrough; null when not retired. */
  daysRemaining: number | null;
  /** `isRetired && daysRemaining > 0` — coverage is CURRENTLY extending benefit. */
  active: boolean;
}

/** The R12 clause was not resolvable for this Pariwar (registry unprovisioned) — a typed gap, not a zero. */
export interface RetirementCoverageUnavailable {
  status: 'clause_unavailable';
}

// ── Ordered clause + provenance entries (AC2 — every array explicitly ordered) ────────

/** One applicable Niyamavali clause in the ordered `applicableNiyamavaliClauses[]` (AC1). */
export interface ApplicableClause {
  clauseId: ids.ClauseId;
  clauseVersionId: ids.ClauseVersionId;
  /** The engine's decision slug for this clause (DATA — from the payload's on_pass/on_fail). */
  outcome: string;
  /** The machine-readable reason code (e.g. `rule.retirement_coverage_computed`). */
  reasonCode: string;
}

/** One provenance entry in the ordered `provenanceTrace[]` — a projection of engine `Provenance`. */
export interface ProvenanceEntry {
  clauseId: ids.ClauseId;
  clauseVersionId: ids.ClauseVersionId;
  /** sha256hex(canonicalJsonStringify(clause payload)). */
  payloadHash: string;
  /** ISO-8601 DB-authoritative evaluation instant (the pinned instant — identical across the trace). */
  evaluatedAt: string;
  /** `pool` | `reserve` — the FR-100 benefit-mechanism discriminator. */
  benefitMechanism: 'pool' | 'reserve';
}

// ── The canonical payload (the whole point of the service) ────────────────────────────

/**
 * The FR-12A canonical Member Validity payload. Sufficient to render `<MemberStatusPanel>`
 * (Story 4.7) with no extra queries (AC3). Every array is emitted in an explicit, replay-stable
 * order (AC2); every timestamp is an ISO-8601 string so the whole payload hashes byte-stably.
 *
 * This is the FULL, redaction-FREE payload. `redaction.ts` applies scope-keyed field redaction at
 * the service boundary; `validityPayloadHash` is computed over the redaction-free payload so replay
 * reproducibility (AC2) is independent of the caller's scope.
 */
export interface MemberValidityPayload {
  memberId: ids.MemberId;
  /** ISO-8601 DB-authoritative evaluation instant. EXCLUDED from the replay hash (see payload.ts). */
  evaluatedAt: string;
  /**
   * The composite rule-registry version: a stable hash over ALL resolved clause_version_ids across
   * every clause the service evaluated (AC2's replay key component). Changes iff any resolved clause
   * version changes — so a registry amendment is observable in the payload.
   */
  ruleRegistryVersion: string;
  /** "covered for support if death today" — composed from member state (VALID_STATES; see payload.ts). */
  isValid: boolean;
  /** "valid AND past lock-in AND not suspended" — the narrowly-active answer (ACTIVE_STATES). */
  isActive: boolean;
  lockInStatus: LockInStatusPayload;
  vyawasthaShulkStatus: VyawasthaShulkStatusPayload;
  contributionHistorySummary: ContributionHistoryUnavailable;
  medicalDisclosureFlags: MedicalDisclosureFlagsPayload;
  retirementCoverage: RetirementCoveragePayload | RetirementCoverageUnavailable;
  /** Ordered special flags (e.g. `concealment_review_required`) — assembled from fired rules. */
  specialFlags: string[];
  /** Ordered applicable clauses (AC2 — declared-order, never hash-map/async-completion order). */
  applicableNiyamavaliClauses: ApplicableClause[];
  /** Ordered provenance trace (AC2 — same declared order as the clauses). */
  provenanceTrace: ProvenanceEntry[];
  /** sha256hex over the ordered, redaction-free payload (minus this field + minus evaluatedAt). */
  validityPayloadHash: string;
}

/**
 * The payload as it crosses the redaction boundary. A narrower-than-State-Trustee caller has the
 * State-Trustee-only fields redacted (D5): `pendingConcealmentFlag` is forced `false` and internal
 * `specialFlags` are stripped. The hash is UNCHANGED by redaction (it is over the full payload), so a
 * redacted payload still carries the canonical `validityPayloadHash` for replay/audit correlation.
 */
export type RedactedMemberValidityPayload = MemberValidityPayload;

/** Assert a value is CanonicalJsonValue-shaped for hashing (compile-time helper; no runtime cost). */
export type AsCanonical<T> = T & CanonicalJsonValue;
