// Ordered multi-clause evaluation at ONE pinned instant — Story 4.6 (Task 3; AC1, AC2).
//
// ── The load-bearing AC2 commitment: DETERMINISTIC rule-evaluation ORDER ──────────────────────────
// `applicableNiyamavaliClauses[]` + `provenanceTrace[]` are built from an EXPLICITLY-ORDERED rule
// list (`VALIDITY_RULE_ORDER`), NEVER hash-map iteration order, NEVER `Promise.all` completion order.
// Rules MAY evaluate concurrently for latency, but each result is collected into its DECLARED-ORDER
// slot (index-preserving) and serialized in that fixed order. The pure interpreter is already
// Date-free/pure and the `computed.values` map is sorted (Story 4.5) — the NEW nondeterminism risk
// 4.6 introduces is exactly HERE, at the composition layer. The 100×-thread byte-identical
// `validity_payload_hash` gate (determinism.test.ts) fails CI as a P0 on any variance.
//
// ── ONE pinned instant across all clauses (closes deferred-work W6) ───────────────────────────────
// Every clause is evaluated via the `evaluateAt`-family (NOT the live `evaluate` family) with the SAME
// instant the service resolved once (evaluate.ts:12-14 anticipates this Story-4.6 multi-clause eval),
// so all clauses share one `rule_registry_version` + consistent provenance.
//
// ── NO hardcoded rule logic ───────────────────────────────────────────────────────────────────────
// The service ORCHESTRATES registry-driven engine calls; it never branches on clause identity or
// re-implements a rule. Adding a rule family = appending a descriptor to `VALIDITY_RULE_ORDER`.
//
// ── Epic-4 member-standing scope ──────────────────────────────────────────────────────────────────
// The only engine-evaluated clause at member standing today is R12 (retirement coverage): R7/R8 are
// GATED OFF (no `contribution.*` producer — Epic 8/9, D2-A) and R5/R9/R14 are CLAIM-time (Epic 6).
// The ordering harness below is built so those families slot in — in declared order — when they land.

import { ids } from '@twt/domain';
import {
  evaluateRetirementCoverageAt,
  R12_CLAUSE_ID,
  type EvaluateDeps,
  type EvaluationContext,
  type EvaluationResult,
  type Facts,
} from '@twt/niyamavali-engine';

/**
 * The EXPLICIT, replay-stable evaluation order (AC2). The array position IS the serialization order
 * of `applicableNiyamavaliClauses[]` / `provenanceTrace[]`. Appending a family here (and a matching
 * descriptor in `buildRuleDescriptors`) is the ONLY change needed to run it — never a code branch.
 */
export const VALIDITY_RULE_ORDER = [R12_CLAUSE_ID] as const;

/** One rule the service runs: its clause id + the pre-derived facts it reads + its engine evaluator. */
export interface RuleDescriptor {
  clauseId: ids.ClauseId;
  /** The pre-derived, caller-injected facts this rule reads (producer output; never a placeholder). */
  facts: Facts;
  /** Thin evaluator over the Story 4.1 primitive at the PINNED instant (the `evaluateAt` family). */
  evaluateAt(
    deps: EvaluateDeps,
    context: EvaluationContext,
    at: Date,
  ): Promise<EvaluationResult | null>;
}

/** The facts each rule family needs, gathered by the producer (Task 2). Gated families stay absent. */
export interface AvailableFacts {
  /**
   * R12 retirement facts as an engine fact-bag; `null` when the tenure anchor is unavailable for this
   * member (e.g. no signup event yet, or corrupt `retiredAt < signupAt` data).
   */
  retirement: Facts | null;
}

/**
 * Build the ordered rule descriptors. R12 ALWAYS runs (facts genuinely available or not): when
 * `available.retirement === null`, the descriptor's facts are `{}` (empty), so the engine's
 * `interpretComputedClause` sees the absent `member.*` keys and routes to the typed
 * `rule.inputs_unavailable` reason code (Story 4.5) — a per-member DATA GAP surfaces in
 * `applicableNiyamavaliClauses[]`/`provenanceTrace[]`, distinguishable from "R12 not resolvable for
 * this Pariwar at all" (which still yields a `null` slot from `evaluateAt`, mirrored by
 * `evaluateOrderedClauses`). This is NOT the R7/R8 fact-availability gate (D2-A) — those families are
 * OMITTED entirely because NO contribution producer exists yet (Epic 8/9); R12's producer exists here,
 * it just cannot always derive a value for every member. Appending a family = one descriptor here.
 */
export function buildRuleDescriptors(available: AvailableFacts): RuleDescriptor[] {
  const descriptors: RuleDescriptor[] = [];
  for (const clauseId of VALIDITY_RULE_ORDER) {
    if (clauseId === R12_CLAUSE_ID) {
      descriptors.push({
        clauseId: ids.clauseId(R12_CLAUSE_ID),
        facts: available.retirement ?? {},
        evaluateAt: (deps, context, at) => evaluateRetirementCoverageAt(deps, context, at),
      });
    }
  }
  return descriptors;
}

/** One ordered evaluation slot: the descriptor + its engine result (`null` when the clause isn't resolvable). */
export interface ClauseEvalSlot {
  clauseId: ids.ClauseId;
  result: EvaluationResult | null;
}

/**
 * Evaluate the ordered descriptors at the PINNED instant, collecting results into DECLARED-ORDER slots
 * (AC2). Rules run concurrently for latency (`Promise.all`), but each writes ONLY its own index — so the
 * returned array order is `VALIDITY_RULE_ORDER`, independent of which promise settles first. A clause the
 * registry cannot resolve for this Pariwar yields a `null` result slot (mirror the engine primitive).
 */
export async function evaluateOrderedClauses(
  deps: EvaluateDeps,
  baseContext: { pariwarId: ids.PariwarId; memberId: ids.MemberId },
  descriptors: readonly RuleDescriptor[],
  at: Date,
): Promise<ClauseEvalSlot[]> {
  const slots: ClauseEvalSlot[] = descriptors.map((d) => ({ clauseId: d.clauseId, result: null }));
  await Promise.all(
    descriptors.map(async (descriptor, index) => {
      const context: EvaluationContext = {
        pariwarId: baseContext.pariwarId,
        memberId: baseContext.memberId,
        facts: descriptor.facts,
      };
      const result = await descriptor.evaluateAt(deps, context, at);
      // Index-preserving write: the ONLY mutation is this slot, so completion order cannot reorder
      // the array (the determinism-gate guarantee).
      slots[index] = { clauseId: descriptor.clauseId, result };
    }),
  );
  return slots;
}
