// Engine type contracts — Story 4.1 (Task 2; AC1.3).
//
// The deterministic result/provenance/context shapes the engine produces + consumes.
// Naming discipline (clause_versions.ts:17-22): TS field names camelCase; any key that
// becomes a JSONB payload / transport field is snake_case (the rule-spec payload keys
// live in interpret.ts and ARE snake_case — they are the opaque clause `payload`).

import type { CanonicalJsonValue, ids, member } from '@twt/domain';

/**
 * The FR-7 / FR-100 benefit-mechanism discriminator carried in provenance
 * (architecture §1.13 Hook 1). Duplicated as a literal union rather than imported
 * from the pgEnum to keep the pure interpreter free of Drizzle types; the resolved
 * clause row supplies the value (`clause_versions.benefit_mechanism`).
 */
export type BenefitMechanism = 'pool' | 'reserve';

/**
 * Extensible, deterministically-hashable rule inputs (`death_classification`, etc.).
 * Stories 4.2–4.5 populate the keys their rules need; values stay `CanonicalJsonValue`
 * so the `facts` bag hashes byte-stably (idempotency memo + audit digest). The engine
 * ALSO injects reserved `snapshot.*` keys here during snapshot resolution (Task 5).
 */
export type Facts = Record<string, CanonicalJsonValue>;

/** The caller-supplied evaluation context (AC1.2/AC1.3). */
export interface EvaluationContext {
  pariwarId: ids.PariwarId;
  memberId: ids.MemberId;
  /** Rule inputs 4.2–4.5 populate; PII-bearing values are permitted (only DIGESTS leave the engine). */
  facts?: Facts;
}

/**
 * The engine-produced decision. `decision` is a small structured discriminant whose
 * vocabulary 4.2–4.5 extend ADDITIVELY (the value is DATA — it comes from the clause
 * payload's `on_pass`/`on_fail`, never a hardcoded engine branch). `specialFlags` is
 * the SM-1-C7 seam: Story 4.4's `concealment_review_required` slots in here as DATA —
 * the engine produces a FLAG, never an auto-deny.
 */
export interface RuleOutcome {
  decision: string;
  specialFlags: string[];
  /**
   * The R12-anticipated computed-output channel (Story 4.5). ABSENT for `conditional`
   * rules (`interpretClause` never sets it there — so every pre-4.5 conditional result is
   * byte-identical). A `computed` rule (`rule_kind: 'computed'`) populates it with the raw
   * values its declared computation produces (R12 emits `granted_years` + echoes
   * `is_retired`). The `{ values }` wrapper reserves the `computed.*` namespace so a future
   * computed rule can add sibling metadata (`computed.units`, per-value provenance, a
   * discriminator) WITHOUT a breaking result-shape change — a bare top-level `Record`
   * cannot grow. Every value is `CanonicalJsonValue` and the keys are emitted in explicitly
   * sorted order, so the result hashes byte-stably (the 100×-thread determinism replay,
   * Story 4.6, depends on this). Naming + date projection (`coverage_through`/
   * `days_remaining`/`active`) are the Story 4.6 Validity Service's job, NOT the engine's.
   */
  computed?: { values: Record<string, CanonicalJsonValue> };
}

/** One interpreted sub-clause result, emitted in stable (payload array) order. */
export interface SubClauseResult {
  /** The interpreter operator that produced this result (e.g. `member_state_in`). */
  op: string;
  passed: boolean;
  /** PII-FREE detail (operator + which fact key / observed state) — never a fact VALUE. */
  detail: CanonicalJsonValue;
}

/**
 * Full per-clause provenance (AC1.3 + Task 2 `benefitMechanism`). `evaluatedAt` is an
 * ISO-8601 string, NOT a `Date`: the canonicalizer rejects `Date`, and the memoized
 * result round-trips through JSON (idempotency store) — an ISO string is the only
 * byte-stable, replay-reproducible representation (Dev Agent Record notes this vs the
 * Dev Notes target shape). DB-authoritative (§1.11): the string is the DB `now()` /
 * the pinned evaluation instant, never an app-server clock.
 */
export interface Provenance {
  clauseId: ids.ClauseId;
  clauseVersionId: ids.ClauseVersionId;
  /** sha256hex(canonicalJsonStringify(payload)). */
  payloadHash: string;
  /** ISO-8601 DB-authoritative evaluation instant. */
  evaluatedAt: string;
  /** PII-FREE canonical summary of the inputs (member state + fact KEYS + versions). */
  inputsSummary: CanonicalJsonValue;
  benefitMechanism: BenefitMechanism;
}

/** The engine's evaluation result (AC1.3). */
export interface EvaluationResult {
  result: RuleOutcome;
  provenance: Provenance;
  subClauseResults: SubClauseResult[];
  /** Machine-readable outcome (e.g. `rule.eligible`, `rule.payload_unrecognized`). */
  reasonCode: string;
}

/**
 * A clause version resolved from the registry (the interpreter's input alongside the
 * context). Mirrors the load-bearing fields of `ClauseVersionRow`; the shell builds it
 * from `resolveByClauseId` / `resolveByClauseVersionId` so the pure core never touches
 * a DB row type.
 */
export interface ResolvedClause {
  clauseId: ids.ClauseId;
  clauseVersionId: ids.ClauseVersionId;
  payload: Record<string, unknown>;
  benefitMechanism: BenefitMechanism;
}

/**
 * The fully-resolved context handed to the PURE interpreter: member state + facts +
 * the DB-authoritative instant, all resolved by the shell. Time is passed IN — the
 * pure core never reads a clock (determinism epic).
 */
export interface ResolvedEvaluationContext {
  pariwarId: ids.PariwarId;
  memberId: ids.MemberId;
  memberState: member.MemberLifecycleState;
  facts: Facts;
  /** DB-authoritative instant (converted to an ISO string in provenance by the core). */
  evaluatedAt: Date;
  /**
   * Every clause version resolved for this evaluation (the primary clause + any
   * snapshot-resolved policy version). Feeds the idempotency `niyamavaliVersionHash`.
   */
  resolvedClauseVersionIds: ids.ClauseVersionId[];
}
