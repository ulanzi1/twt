// Generic family-ladder resolver — Story 4.4 (Task 1; rule-of-three extraction).
//
// `r7-ladder.ts` (Story 4.2) and `r8-ladder.ts` (Story 4.3) grew near-identical ladder
// mechanics — the same meta-parse / applied-test / precedence-select / DB-shell resolution
// duplicated field-for-field. Story 4.3 explicitly DEFERRED the extraction to here ("extract
// at 4.4 R5/R9 per rule-of-three", 4.3 Decision §3); Story 4.4 adds a THIRD family
// (special-death R5/R9), triggering the rule of three. This module is the single home of the
// mechanics; `r7-ladder.ts`, `r8-ladder.ts`, and `special-death.ts` are thin wrappers that
// parameterize it by their family's `clauseIds` list + `notApplicableSlug`.
//
// ── NO hardcoded rule logic (freeze row 14) ───────────────────────────────────────
// There is NO `switch (clauseId)` / branch keyed by registry identity. Each branch is
// interpreted from its payload; the ladder's applicable-pick reads `precedence` + `on_pass`
// as DATA from the resolved payload. Adding / re-tuning a rule stays a clause change.
//
// ── `precedence` selects the surfaced EXPLANATION, not eligibility ─────────────────
// Every sub-clause whose `on_pass` fires already means the special case applies; the ladder
// pick only decides WHICH provenance surfaces when several apply. A maintainer must NEVER
// re-read `precedence` as eligibility policy — re-tune the DATA (the seed payload), never add
// engine logic. [[project_niyamavali_precedence_is_provenance]]
//
// ── Determinism (Epic 4 through-line) ─────────────────────────────────────────────
// Pure core: no clock, no randomness, no mutable module state (time is passed IN). Every
// collection is emitted in explicit stable order (sorted by `clause_id`); the applicable pick
// is a pure reduce (highest `precedence`; ties broken by lowest `clause_id`). Story 4.6 runs
// the pure core 100× across threads and fails CI as a P0 on any byte-variance.

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

// ── Result shape (exported — every family aliases it; Story 4.6 consumes it) ───────

export interface LadderClauseEvaluation {
  /** e.g. `niy.special-death.r9-a`. */
  clauseId: string;
  /** true iff this sub-clause's `on_pass` was chosen (its precondition `all_of` all passed). */
  applied: boolean;
  /** The full per-clause result from `interpretClause`. */
  result: EvaluationResult;
}

export interface LadderResult {
  /** All resolved sub-clause evaluations, sorted by `clause_id` (stable). */
  perClauseResults: LadderClauseEvaluation[];
  /** The single applicable sub-clause (highest `precedence` whose `on_pass` fired), or null. */
  applicableClauseId: string | null;
  /** Full result for the applicable clause, or null if none applied. */
  applicableResult: EvaluationResult | null;
  /**
   * Clause IDs from the family list that had no version effective at the evaluation instant —
   * omitted from `perClauseResults`. Always empty from `evaluateLadder` (pure core receives
   * already-resolved clauses); populated by `evaluateLadderAt` when `evaluateAt` returns null
   * for a sub-clause (e.g. its `effective_date` is after `at`, or it is not seeded for this pariwar).
   */
  missingClauseIds: string[];
}

// ── Ladder-selection primitives (pure, shared by the pure core + the shell) ────────

/**
 * The payload subset the LADDER reads as DATA: the outcome slug + the overlap-precedence.
 * `precedence` accepts any number (not just integer) so non-integer trustee amendments are
 * not silently dropped. The `on_pass === notApplicableSlug` swap-guard is applied in
 * `parseMeta` (family-specific slug), not here.
 */
const LadderMetaSchema = z
  .object({
    on_pass: z.string().min(1),
    precedence: z.number(),
  })
  .passthrough();

interface LadderMeta {
  onPass: string;
  precedence: number;
}

/**
 * Read `on_pass` + `precedence` from a resolved payload (DATA). null if the payload lacks
 * them, OR if `on_pass === notApplicableSlug` — a swapped on_pass/on_fail payload would
 * otherwise mark a non-applicable clause as applied (isApplied compares decision to onPass).
 */
function parseMeta(payload: Record<string, unknown>, notApplicableSlug: string): LadderMeta | null {
  const parsed = LadderMetaSchema.safeParse(payload);
  if (!parsed.success) return null;
  if (parsed.data.on_pass === notApplicableSlug) return null; // swap-guard
  return { onPass: parsed.data.on_pass, precedence: parsed.data.precedence };
}

/**
 * Did this clause APPLY? Its `on_pass` fired iff the interpreted decision equals the payload's
 * `on_pass` slug AND the payload was recognised. Derived from DATA (the payload `on_pass`),
 * not a hardcoded per-clause branch.
 */
function isApplied(result: EvaluationResult, meta: LadderMeta | null): boolean {
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
function toLadderResult(sortedEntries: LadderEntry[], missingClauseIds: string[] = []): LadderResult {
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
 * Interpret already-resolved family clauses against one resolved context and resolve the
 * family ladder — PURE + DETERMINISTIC: same `(resolvedClauses, ctx, notApplicableSlug)` →
 * byte-identical `LadderResult` on every run. Sorts by `clause_id`, interprets each via
 * `interpretClause`, and picks the applicable one by payload `precedence`. Takes ALREADY-resolved
 * clauses (no DB) so it is the workhorse of the DB-free scenario-matrix determinism tests.
 */
export function evaluateLadder(
  resolvedClauses: ResolvedClause[],
  ctx: ResolvedEvaluationContext,
  notApplicableSlug: string,
): LadderResult {
  const sorted = [...resolvedClauses].sort(byClauseId);
  const entries: LadderEntry[] = sorted.map((clause) => {
    const result = interpretClause(clause, ctx);
    const meta = parseMeta(clause.payload, notApplicableSlug);
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
 * Historical / replay-correct family evaluation at a FIXED instant `at` (AI-3-2 / W6: ONE DB
 * instant across ALL resolutions — the caller pins it once). For each family sub-clause it
 * delegates to the reviewed Story 4.1 `evaluateAt` (resolve → interpret → memo → audit-on-compute,
 * all at the same `at`), and separately resolves the payload's `precedence` (DATA) to drive the
 * ladder pick. Unresolvable sub-clauses are reported in `missingClauseIds`.
 *
 * NOTE on the extra `resolveByClauseId`: `evaluateAt` returns an `EvaluationResult` that does not
 * surface `precedence`, so the shell resolves each payload once more to read it. Both resolutions
 * run at the SAME pinned `at` → AI-3-2 (single instant) is preserved; this is read amplification
 * at one instant, NOT a TOCTOU window ([[CR-4.2-D1]] — inherited).
 */
export async function evaluateLadderAt(
  deps: EvaluateDeps,
  context: EvaluationContext,
  at: Date,
  clauseIds: readonly string[],
  notApplicableSlug: string,
): Promise<LadderResult> {
  const { db }: { db: Db } = deps;
  const entries: LadderEntry[] = [];
  const missingClauseIds: string[] = [];

  for (const clauseIdStr of clauseIds) {
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
    const meta = row ? parseMeta(row.payload, notApplicableSlug) : null;

    entries.push({
      clauseId: clauseIdStr,
      applied: isApplied(result, meta),
      result,
      precedence: meta?.precedence ?? Number.NEGATIVE_INFINITY,
    });
  }

  entries.sort(byClauseId);
  missingClauseIds.sort();
  return toLadderResult(entries, missingClauseIds);
}

/**
 * Live family evaluation: resolves DB-authoritative `now()` ONCE (§1.11; W6/AI-3-2 — the single
 * instant threaded through every sub-clause resolution) and delegates to `evaluateLadderAt`.
 */
export async function evaluateLadderLive(
  deps: EvaluateDeps,
  context: EvaluationContext,
  clauseIds: readonly string[],
  notApplicableSlug: string,
): Promise<LadderResult> {
  const at = await selectDbNow(deps.db);
  return evaluateLadderAt(deps, context, at, clauseIds, notApplicableSlug);
}
