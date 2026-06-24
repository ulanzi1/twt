// Forced-pagination clamp — the family-(a) domain-accessor invariant.
//
// Every list accessor that accepts a caller-supplied `limit` MUST route it through
// `clampLimit` (enforced by the `domain-accessor-invariants` CI gate). The clamp has
// TWO bounds, and BOTH are load-bearing:
//
//   · upper (`cap`): forced pagination (Story 1.14) — an unbounded `LIMIT` lets a
//     single caller pull an entire table over one connection.
//   · lower (`1`): a negative limit must NOT reach Postgres. `LIMIT -1` is treated as
//     "no limit" (returns ALL rows) — the exact pagination bypass found + fixed as
//     the 2.7 P2 consent finding. `Math.min(limit, cap)` ALONE does not clamp the
//     lower bound; the `Math.max(1, …)` is not decorative.
//
// Pure + DB-free → unit-tested exhaustively in tests/pagination.test.ts. See
// docs/domain-accessor-invariants.md (family a).

export interface ClampLimitOptions {
  /** Applied when the caller omits `limit` (passes `undefined`). */
  default: number;
  /** Hard upper bound — the forced-pagination ceiling. */
  cap: number;
}

/**
 * Clamp a caller-supplied page size to `[1, cap]`, defaulting when omitted.
 *
 * ```
 * clampLimit(undefined, { default: 50, cap: 200 }) // → 50
 * clampLimit(500,       { default: 50, cap: 200 }) // → 200
 * clampLimit(-1,        { default: 50, cap: 200 }) // → 1  (NOT a Postgres LIMIT -1 bypass)
 * clampLimit(0,         { default: 50, cap: 200 }) // → 1
 * ```
 */
export function clampLimit(limit: number | undefined, opts: ClampLimitOptions): number {
  return Math.max(1, Math.min(limit ?? opts.default, opts.cap));
}
