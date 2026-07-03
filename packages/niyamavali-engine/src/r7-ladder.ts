// R7 contribution-discipline ladder — Story 4.2 (Tasks 3 + 4).
//
// R7 is delivered as DATA: seven registry clauses (`niy.contribution-discipline.r7-a`
// … `r7-g`), each a self-contained `rule_kind: 'conditional'` payload interpreted by the
// Story 4.1 primitive (`interpretClause`). This module adds ONLY:
//   · the caller-supplied `contribution.*` fact contract R7 reads (Task 4), and
//   · a thin, data-driven R7-FAMILY ladder resolver (Task 3) that runs the seven clauses
//     and reports WHICH R7(x) applied — resolving overlap by the payload-encoded
//     `precedence` field (DATA, never a hardcoded ordering).
//
// ── NO hardcoded rule logic (AC1.4) ───────────────────────────────────────────────
// There is NO `switch (clauseId)` / branch keyed by registry identity. Each R7 branch is
// interpreted from its payload; the ladder's applicable-pick reads `precedence` + `on_pass`
// as DATA from the resolved payload. Adding / re-tuning an R7 rule stays a clause change.
//
// ── Determinism (Epic 4 through-line) ─────────────────────────────────────────────
// Pure core: no clock, no randomness, no mutable module state (time is passed IN). Every
// collection is emitted in explicit stable order (sorted by `clause_id`); the applicable
// pick is a pure reduce (highest `precedence`; ties broken by `clause_id`). The engine does
// NO date arithmetic — R7 compares already-derived numeric `contribution.*` facts, so the
// pure core trivially survives the Story 4.6 100×-thread byte-variance gate.
//
// ── Boundary (Story 4.6) ──────────────────────────────────────────────────────────
// This is R7-FAMILY scoped. The cross-family ordered provenance trace (R7 vs R8 vs R5…)
// is Story 4.6's Validity Service — do NOT build the cross-family orchestrator here. 4.6
// consumes `applicableResult.provenance` from this shape; keep it un-collapsed.

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

// ── Contribution-history fact contract (the Epic 8/9 seam — Task 4) ────────────────
//
// INVARIANT: the engine NEVER infers contribution facts. It only READS pre-derived
// `contribution.*` facts handed in via `EvaluationContext.facts`; it never counts
// contributions, computes skips/gaps, or reaches for a source to synthesize them.
// Deriving these is exclusively the fact PRODUCER's job (Epic 8/9, assembled by the
// Story 4.6 Validity Service) — contribution events do NOT exist yet (Story 9.x). 4.2
// defines the CONTRACT and tests against injected synthetic facts.
//
// Calendar-correct derivation (AI-3-1: `date_trunc`/`interval`, never fixed-ms spans) is
// the PRODUCER's responsibility — `months_since_last` etc. arrive here already computed.
// These keys are the single source of truth shared by the future producer and the tests.

export const R7_CONTRIBUTION_FACT_KEYS = {
  /** int — lifetime confirmed contributions. R7(A) `< 10`; R7(D/E) `>= 10` gate. */
  TOTAL_COUNT: 'contribution.total_count',
  /** bool — `total_count > 0` (explicit for clarity). R7(B) `== false`. */
  EVER_CONTRIBUTED: 'contribution.ever_contributed',
  /** int — missed cycles in the rolling/calendar year. R7(D) `== 1`; R7(E) `>= 2`. */
  SKIPS_CURRENT_YEAR: 'contribution.skips_current_year',
  /** int — CALENDAR months since last contribution. R7(C) long-gap; R7(F) `>= 6`. */
  MONTHS_SINCE_LAST: 'contribution.months_since_last',
  /** int — lifetime R7(A) one-time restorations consumed. R7(A) `< 2` (lifetime cap). */
  R7A_RESTORATIONS_USED: 'contribution.r7a_restorations_used',
  /** bool — currently in a discipline lapse. R7(A) precondition gate. */
  IN_LAPSE: 'contribution.in_lapse',
  /** bool — a personal-event excuse was asserted. R7(G) declarative. */
  PERSONAL_EVENT_EXCUSE_CLAIMED: 'contribution.personal_event_excuse_claimed',
} as const;

/** A `contribution.*` fact key R7 reads (the producer + tests share this type). */
export type R7ContributionFactKey =
  (typeof R7_CONTRIBUTION_FACT_KEYS)[keyof typeof R7_CONTRIBUTION_FACT_KEYS];

// ── The seven R7 sub-clause ids (stable, sorted) ──────────────────────────────────

/** The R7(A–G) clause ids — the family the ladder evaluates, in stable (sorted) order. */
export const R7_CLAUSE_IDS = [
  'niy.contribution-discipline.r7-a',
  'niy.contribution-discipline.r7-b',
  'niy.contribution-discipline.r7-c',
  'niy.contribution-discipline.r7-d',
  'niy.contribution-discipline.r7-e',
  'niy.contribution-discipline.r7-f',
  'niy.contribution-discipline.r7-g',
] as const;

/** The shared not-applicable outcome slug every R7 clause maps `on_fail` to (DATA, in each payload). */
export const R7_NOT_APPLICABLE = 'r7_not_applicable';

// ── Result shape (exported — Story 4.6 consumes it) ───────────────────────────────

export interface R7ClauseEvaluation {
  /** e.g. `niy.contribution-discipline.r7-a`. */
  clauseId: string;
  /** true iff this sub-clause's `on_pass` was chosen (its precondition `all_of` all passed). */
  applied: boolean;
  /** The full per-clause result from `interpretClause`. */
  result: EvaluationResult;
}

export interface R7LadderResult {
  /** All resolved sub-clause evaluations, sorted by `clause_id` (stable). */
  perClauseResults: R7ClauseEvaluation[];
  /** The single applicable sub-clause (highest `precedence` whose `on_pass` fired), or null. */
  applicableClauseId: string | null;
  /** Full result for the applicable clause, or null if none applied. */
  applicableResult: EvaluationResult | null;
  /**
   * Clause IDs from `R7_CLAUSE_IDS` that had no version effective at the evaluation instant —
   * omitted from `perClauseResults`. Always empty from `evaluateR7Ladder` (pure core receives
   * already-resolved clauses); populated by `evaluateR7LadderAt` when `evaluateAt` returns null
   * for a sub-clause (e.g. its `effective_date` is after `at`, or it is not seeded for this pariwar).
   */
  missingClauseIds: string[];
}

// ── Ladder-selection primitives (pure, shared by the pure core + the shell) ────────

/** The payload subset the LADDER reads as DATA: the outcome slug + the overlap-precedence. */
const R7LadderMetaSchema = z
  .object({
    // Disallow on_pass === R7_NOT_APPLICABLE: a swapped on_pass/on_fail payload would mark a
    // non-applicable clause as applied (isApplied compares decision against meta.onPass).
    on_pass: z.string().min(1).refine((s) => s !== R7_NOT_APPLICABLE),
    // Accept any number (not just integer) so non-integer trustee amendments are not silently dropped.
    precedence: z.number(),
  })
  .passthrough();

interface R7Meta {
  onPass: string;
  precedence: number;
}

/** Read `on_pass` + `precedence` from a resolved payload (DATA). null if the payload lacks them. */
function parseR7Meta(payload: Record<string, unknown>): R7Meta | null {
  const parsed = R7LadderMetaSchema.safeParse(payload);
  return parsed.success ? { onPass: parsed.data.on_pass, precedence: parsed.data.precedence } : null;
}

/**
 * Did this clause APPLY? Its `on_pass` fired iff the interpreted decision equals the payload's
 * `on_pass` slug AND the payload was recognised. Derived from DATA (the payload `on_pass`),
 * not a hardcoded per-clause branch.
 */
function isApplied(result: EvaluationResult, meta: R7Meta | null): boolean {
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
function toLadderResult(sortedEntries: LadderEntry[], missingClauseIds: string[] = []): R7LadderResult {
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
 * Interpret the seven resolved R7 clauses against one resolved context and resolve the
 * family ladder — PURE + DETERMINISTIC: same `(resolvedClauses, ctx)` → byte-identical
 * `R7LadderResult` on every run. Sorts by `clause_id`, interprets each via `interpretClause`,
 * and picks the applicable one by payload `precedence`. Takes ALREADY-resolved clauses (no
 * DB) so it is the workhorse of the DB-free scenario-matrix determinism tests.
 */
export function evaluateR7Ladder(
  resolvedClauses: ResolvedClause[],
  ctx: ResolvedEvaluationContext,
): R7LadderResult {
  const sorted = [...resolvedClauses].sort(byClauseId);
  const entries: LadderEntry[] = sorted.map((clause) => {
    const result = interpretClause(clause, ctx);
    const meta = parseR7Meta(clause.payload);
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
 * Historical / replay-correct R7-family evaluation at a FIXED instant `at` (AI-3-2 / W6:
 * ONE DB instant across ALL seven resolutions — the caller pins it once). For each R7
 * sub-clause it delegates to the reviewed Story 4.1 `evaluateAt` (resolve → interpret →
 * memo → audit-on-compute, all at the same `at`), and separately resolves the payload's
 * `precedence` (DATA) to drive the ladder pick. Unresolvable sub-clauses are omitted.
 *
 * NOTE on the extra `resolveByClauseId`: `evaluateAt` returns an `EvaluationResult` that
 * does not surface `precedence`, so the shell resolves each payload once more to read it.
 * Both resolutions run at the SAME pinned `at` → AI-3-2 (single instant) is preserved; this
 * is read amplification at one instant, NOT a TOCTOU window.
 */
export async function evaluateR7LadderAt(
  deps: EvaluateDeps,
  context: EvaluationContext,
  at: Date,
): Promise<R7LadderResult> {
  const { db }: { db: Db } = deps;
  const entries: LadderEntry[] = [];
  const missingClauseIds: string[] = [];

  for (const clauseIdStr of R7_CLAUSE_IDS) {
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
    const meta = row ? parseR7Meta(row.payload) : null;

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
 * Live R7-family evaluation: resolves DB-authoritative `now()` ONCE (§1.11; W6/AI-3-2 — the
 * single instant threaded through every sub-clause resolution) and delegates to
 * `evaluateR7LadderAt`.
 */
export async function evaluateR7LadderLive(
  deps: EvaluateDeps,
  context: EvaluationContext,
): Promise<R7LadderResult> {
  const at = await selectDbNow(deps.db);
  return evaluateR7LadderAt(deps, context, at);
}
