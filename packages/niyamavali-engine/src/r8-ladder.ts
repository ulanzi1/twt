// R8 ninety-percent-rule ladder — Story 4.3 (Tasks 3 + 4).
//
// R8 is delivered as DATA: three registry clauses (`niy.ninety-percent-rule.r8`,
// `…r8-a`, `…r8-b`), each a self-contained `rule_kind: 'conditional'` payload interpreted
// by the Story 4.1 primitive (`interpretClause`). This module adds ONLY:
//   · the caller-supplied `contribution.*` / `claim.*` fact contract R8 reads (Task 4), and
//   · a thin, data-driven R8-FAMILY ladder resolver (Task 3) that runs the three clauses
//     and reports WHICH R8 sub-clause applied — resolving overlap by the payload-encoded
//     `precedence` field (DATA, never a hardcoded ordering).
//
// It is the direct sibling of `r7-ladder.ts` (Story 4.2) and mirrors it exactly. Unlike
// 4.2 it adds NO new interpreter operator — R8's vocabulary (`fact_equals` + `fact_gte`)
// is already covered by the `OPERATORS` registry (`interpret.ts`).
//
// ── NO hardcoded rule logic (AC2.5) ───────────────────────────────────────────────
// There is NO `switch (clauseId)` / branch keyed by registry identity. Each R8 branch is
// interpreted from its payload; the ladder's applicable-pick reads `precedence` + `on_pass`
// as DATA from the resolved payload. The illness-only gate (AC2.4) is DATA too — a
// `claim.death_classification == 'illness'` precondition in every R8 payload, never a
// hardcoded `if (accident)` branch. Adding / re-tuning an R8 rule stays a clause change.
//
// ── `precedence` selects the surfaced EXPLANATION, not eligibility (Decision §5) ──────
// Every sub-clause whose `on_pass` fires already means "eligible". When a member qualifies
// via more than one R8 path (e.g. a base-90%-met member who is ALSO a mid-contribution
// death), the ladder pick only decides WHICH reason (provenance) is reported — R8(B) beating
// R8(A)/base is a PROVENANCE choice, not an eligibility change. A future maintainer must NOT
// treat `precedence` as eligibility policy; if it is ever mis-read that way, the fix is to
// re-tune the DATA (the seed payload), never to add engine logic.
//
// ── The load-bearing seam: the engine EVALUATES facts, it never DERIVES them ─────────
// The "90% computation" is a PRE-DERIVED fact (`contribution.compliance_percent`), not an
// engine calculation — R8 base only checks `fact_gte >= 90`. If a future policy requires a
// different compliance calculation, the PRODUCER changes (Epic 8/9 + Epic 6 claim intake,
// assembled by the 4.6 Validity Service), never the engine. See §"R8 fact contract".
//
// ── Determinism (Epic 4 through-line) ─────────────────────────────────────────────
// Pure core: no clock, no randomness, no mutable module state (time is passed IN). Every
// collection is emitted in explicit stable order (sorted by `clause_id`); the applicable
// pick is a pure reduce (highest `precedence`; ties broken by `clause_id`). The engine does
// NO date/percentage arithmetic — R8 compares already-derived numeric facts, so the pure
// core trivially survives the Story 4.6 100×-thread byte-variance gate.
//
// ── Boundary (Story 4.6) ──────────────────────────────────────────────────────────
// This is R8-FAMILY scoped. The cross-family ordered provenance trace (R8 vs R7 vs R5/R9
// vs accident-vs-illness classification) is Story 4.6's Validity Service — do NOT build the
// cross-family orchestrator here. 4.6 consumes `applicableResult.provenance` from this
// shape; keep it un-collapsed.

import { ids, niyamavali, type Db } from '@twt/domain';
import { z } from 'zod';

import { evaluateAt, selectDbNow, type EvaluateDeps } from './evaluate.js';
import { interpretClause } from './interpret.js';
import type {
  EvaluationResult,
  ResolvedClause,
  ResolvedEvaluationContext,
  EvaluationContext,
} from './types.js';

// ── Fact contract (the Epic 8/9 + Epic 6 claim-intake seam — Task 4) ────────────────
//
// INVARIANT: the engine NEVER infers contribution/claim facts. It only READS pre-derived
// facts handed in via `EvaluationContext.facts`; it never counts contributions, computes
// the compliance percentage, or classifies the death. Deriving those is exclusively the
// fact PRODUCER's job (Epic 8/9 contribution history + Epic 6 claim intake, assembled by
// the Story 4.6 Validity Service) — contribution/claim events do NOT exist yet (Story 9.x;
// `data-export/assemble.ts:20` confirms "no source system at Epic 3"). 4.3 defines the
// CONTRACT and tests against injected synthetic facts (exactly as 4.2 did for R7).
//
// Calendar-correct derivation (AI-3-1) is the PRODUCER's responsibility — `compliance_percent`
// arrives here already computed. These keys are the single source of truth shared by the
// future producer and the tests. R8 REUSES the two shared R7 contribution keys
// (`R7_CONTRIBUTION_FACT_KEYS.TOTAL_COUNT` / `.SKIPS_CURRENT_YEAR`) — see the fixtures.

/** Net-new `contribution.*` fact keys R8 reads (the two shared keys live in `r7-ladder.ts`). */
export const R8_CONTRIBUTION_FACT_KEYS = {
  /** number 0–100 — pre-derived % of expected contributions made. R8 base `>= 90` (the "90% computation"). */
  COMPLIANCE_PERCENT: 'contribution.compliance_percent',
  /** bool — the prior year was 100% compliant. R8(A) `== true` (skip-allowance precondition). */
  PRIOR_PERIOD_FULL_COMPLIANCE: 'contribution.prior_period_full_compliance',
} as const;

/** `claim.*` death-circumstance fact keys R8 reads (Epic 6 claim intake). */
export const R8_CLAIM_FACT_KEYS = {
  /** string enum (`'illness'` | `'accident'` | …) — the death classification. R8/R8(A)/R8(B) illness gate `== 'illness'`. */
  DEATH_CLASSIFICATION: 'claim.death_classification',
  /** bool — died after a contribution alert was published, before its deadline. R8(B) `== true`. */
  MID_CONTRIBUTION_DEATH: 'claim.mid_contribution_death',
} as const;

/** A net-new `contribution.*` fact key R8 reads (the producer + tests share this type). */
export type R8ContributionFactKey =
  (typeof R8_CONTRIBUTION_FACT_KEYS)[keyof typeof R8_CONTRIBUTION_FACT_KEYS];

/** A `claim.*` fact key R8 reads (the producer + tests share this type). */
export type R8ClaimFactKey = (typeof R8_CLAIM_FACT_KEYS)[keyof typeof R8_CLAIM_FACT_KEYS];

// ── The three R8 sub-clause ids (stable, sorted) ──────────────────────────────────

/** The R8 clause ids — the family the ladder evaluates, in stable (sorted) order. */
export const R8_CLAUSE_IDS = [
  'niy.ninety-percent-rule.r8',
  'niy.ninety-percent-rule.r8-a',
  'niy.ninety-percent-rule.r8-b',
] as const;

/** The shared not-applicable outcome slug every R8 clause maps `on_fail` to (DATA, in each payload). */
export const R8_NOT_APPLICABLE = 'r8_not_applicable';

// ── Result shape (exported — Story 4.6 consumes it) ───────────────────────────────

export interface R8ClauseEvaluation {
  /** e.g. `niy.ninety-percent-rule.r8-a`. */
  clauseId: string;
  /** true iff this sub-clause's `on_pass` was chosen (its precondition `all_of` all passed). */
  applied: boolean;
  /** The full per-clause result from `interpretClause`. */
  result: EvaluationResult;
}

export interface R8LadderResult {
  /** All resolved sub-clause evaluations, sorted by `clause_id` (stable). */
  perClauseResults: R8ClauseEvaluation[];
  /** The single applicable sub-clause (highest `precedence` whose `on_pass` fired), or null. */
  applicableClauseId: string | null;
  /** Full result for the applicable clause, or null if none applied. */
  applicableResult: EvaluationResult | null;
  /**
   * Clause IDs from `R8_CLAUSE_IDS` that had no version effective at the evaluation instant —
   * omitted from `perClauseResults`. Always empty from `evaluateR8Ladder` (pure core receives
   * already-resolved clauses); populated by `evaluateR8LadderAt` when `evaluateAt` returns null
   * for a sub-clause (e.g. its `effective_date` is after `at`, or it is not seeded for this pariwar).
   */
  missingClauseIds: string[];
}

// ── Ladder-selection primitives (pure, shared by the pure core + the shell) ────────

/** The payload subset the LADDER reads as DATA: the outcome slug + the overlap-precedence. */
const R8LadderMetaSchema = z
  .object({
    // Disallow on_pass === R8_NOT_APPLICABLE: a swapped on_pass/on_fail payload would mark a
    // non-applicable clause as applied (isApplied compares decision against meta.onPass).
    on_pass: z.string().min(1).refine((s) => s !== R8_NOT_APPLICABLE),
    // Accept any number (not just integer) so non-integer trustee amendments are not silently dropped.
    precedence: z.number(),
  })
  .passthrough();

interface R8Meta {
  onPass: string;
  precedence: number;
}

/** Read `on_pass` + `precedence` from a resolved payload (DATA). null if the payload lacks them. */
function parseR8Meta(payload: Record<string, unknown>): R8Meta | null {
  const parsed = R8LadderMetaSchema.safeParse(payload);
  return parsed.success ? { onPass: parsed.data.on_pass, precedence: parsed.data.precedence } : null;
}

/**
 * Did this clause APPLY? Its `on_pass` fired iff the interpreted decision equals the payload's
 * `on_pass` slug AND the payload was recognised. Derived from DATA (the payload `on_pass`),
 * not a hardcoded per-clause branch.
 */
function isApplied(result: EvaluationResult, meta: R8Meta | null): boolean {
  return (
    meta != null &&
    result.reasonCode !== 'rule.payload_unrecognized' &&
    result.result.decision === meta.onPass
  );
}

/** Internal per-clause working record (carries the precedence needed to select). */
interface LadderEntry {
  clauseId: string;
  applied: boolean;
  result: EvaluationResult;
  precedence: number;
}

/**
 * Select the applicable sub-clause from entries ALREADY sorted by `clause_id`: the highest
 * `precedence` among applied clauses; ties broken deterministically by `clause_id` (we
 * replace only on STRICTLY-greater precedence, so the earliest — lowest `clause_id` — wins a tie).
 */
function selectApplicable(sortedEntries: LadderEntry[]): LadderEntry | null {
  let best: LadderEntry | null = null;
  for (const entry of sortedEntries) {
    if (!entry.applied) continue;
    if (best === null || entry.precedence > best.precedence) best = entry;
  }
  return best;
}

/** Assemble the public result from sorted working entries. */
function toLadderResult(sortedEntries: LadderEntry[], missingClauseIds: string[] = []): R8LadderResult {
  const best = selectApplicable(sortedEntries);
  return {
    perClauseResults: sortedEntries.map((e) => ({
      clauseId: e.clauseId,
      applied: e.applied,
      result: e.result,
    })),
    applicableClauseId: best?.clauseId ?? null,
    applicableResult: best?.result ?? null,
    missingClauseIds,
  };
}

/** Stable ascending compare on clause id (never hash-map iteration order). */
function byClauseId<T extends { clauseId: string }>(a: T, b: T): number {
  return a.clauseId < b.clauseId ? -1 : a.clauseId > b.clauseId ? 1 : 0;
}

// ── Pure core — DB-free family evaluation (the determinism spine + the test workhorse) ──

/**
 * Interpret the three resolved R8 clauses against one resolved context and resolve the
 * family ladder — PURE + DETERMINISTIC: same `(resolvedClauses, ctx)` → byte-identical
 * `R8LadderResult` on every run. Sorts by `clause_id`, interprets each via `interpretClause`,
 * and picks the applicable one by payload `precedence`. Takes ALREADY-resolved clauses (no
 * DB) so it is the workhorse of the DB-free scenario-matrix determinism tests.
 *
 * The "R8 applies vs 90% failed" distinction is NOT lost through the shared `r8_not_applicable`
 * slug: it is read from the base-R8 clause's `subClauseResults` (illness pass + `>= 10` pass
 * + `>= 90` FAIL ⇒ "subject to R8 but failed the 90% threshold"; illness or `>= 10` fail ⇒
 * "R8 does not apply at all"). Story 4.6 reads `perClauseResults` for this.
 */
export function evaluateR8Ladder(
  resolvedClauses: ResolvedClause[],
  ctx: ResolvedEvaluationContext,
): R8LadderResult {
  const sorted = [...resolvedClauses].sort(byClauseId);
  const entries: LadderEntry[] = sorted.map((clause) => {
    const result = interpretClause(clause, ctx);
    const meta = parseR8Meta(clause.payload);
    return {
      clauseId: clause.clauseId,
      applied: isApplied(result, meta),
      result,
      // Un-parseable meta can never be applied → its precedence is inert (kept low).
      precedence: meta?.precedence ?? Number.NEGATIVE_INFINITY,
    };
  });
  return toLadderResult(entries);
}

// ── DB shell — resolve the family at ONE pinned instant, memo + audit per clause ──────

/**
 * Historical / replay-correct R8-family evaluation at a FIXED instant `at` (AI-3-2 / W6:
 * ONE DB instant across ALL three resolutions — the caller pins it once). For each R8
 * sub-clause it delegates to the reviewed Story 4.1 `evaluateAt` (resolve → interpret →
 * memo → audit-on-compute, all at the same `at`), and separately resolves the payload's
 * `precedence` (DATA) to drive the ladder pick. Unresolvable sub-clauses are omitted.
 *
 * NOTE on the extra `resolveByClauseId`: `evaluateAt` returns an `EvaluationResult` that
 * does not surface `precedence`, so the shell resolves each payload once more to read it.
 * Both resolutions run at the SAME pinned `at` → AI-3-2 (single instant) is preserved; this
 * is read amplification at one instant, NOT a TOCTOU window ([[CR-4.2-D1]] — inherited).
 */
export async function evaluateR8LadderAt(
  deps: EvaluateDeps,
  context: EvaluationContext,
  at: Date,
): Promise<R8LadderResult> {
  const { db }: { db: Db } = deps;
  const entries: LadderEntry[] = [];
  const missingClauseIds: string[] = [];

  for (const clauseIdStr of R8_CLAUSE_IDS) {
    const clauseId = ids.clauseId(clauseIdStr);
    // 4.1 primitive: resolve + interpret + memo + audit-on-compute at the pinned instant.
    const result = await evaluateAt(deps, clauseId, context, at);
    if (result == null) {
      // No clause version is effective at `at` for this pariwar — signal to the caller.
      missingClauseIds.push(clauseIdStr);
      continue;
    }

    // Read the ladder DATA (on_pass + precedence) from the payload resolved at the SAME `at`.
    const row = await niyamavali.resolveByClauseId(db, context.pariwarId, clauseId, at);
    const meta = row ? parseR8Meta(row.payload) : null;

    entries.push({
      clauseId: clauseIdStr,
      applied: isApplied(result, meta),
      result,
      precedence: meta?.precedence ?? Number.NEGATIVE_INFINITY,
    });
  }

  entries.sort(byClauseId);
  return toLadderResult(entries, missingClauseIds);
}

/**
 * Live R8-family evaluation: resolves DB-authoritative `now()` ONCE (§1.11; W6/AI-3-2 — the
 * single instant threaded through every sub-clause resolution) and delegates to
 * `evaluateR8LadderAt`.
 */
export async function evaluateR8LadderLive(
  deps: EvaluateDeps,
  context: EvaluationContext,
): Promise<R8LadderResult> {
  const at = await selectDbNow(deps.db);
  return evaluateR8LadderAt(deps, context, at);
}
