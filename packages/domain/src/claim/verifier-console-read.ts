// Verifier-console prior-decisions + recent-precedents reads — Story 6.10 (Task 2; AC2e/AC2f, D6).
//
// The Story 6.10 verifier console surfaces two decision-history signals: (e) the full ordered prior-
// verifier-comments transcript for the CURRENT claim, and (f) the latest three recent in-scope resolved
// precedents (recency, NOT "similarity" — v1 has only death-support claims, so there is no claim
// category to match on). Both are sourced from a DECISION READ MODEL that Story 6.11 owns and has not
// shipped yet.
//
// ── The 6.11 dependency contract (D6 — recorded here + in the story Dev Notes) ─────────────────────
// The verifier lifecycle events carry ONLY `auditShape` (packages/domain/src/claim/events.ts) — no
// reason-code, no rationale (this codebase keeps reason text OUT of events_log). So (e)/(f) CANNOT be
// reconstructed from events_log alone, and 6.10 MUST NOT invent empty decision events or a temporary
// persistence model. Instead 6.10 defines the CONSUMER shape here (`VerifierDecisionRecord`) and Story
// 6.11 must provide an ordered, scope-safe producer carrying, per decision, at least: outcome ·
// reason code · rationale · human-actor DISPLAY attribution · decision timestamp · claim identifier ·
// Pariwar scope (no prohibited PII in events_log). It must support (1) the full ordered history for
// the current claim, (2) the latest three recent in-scope resolved precedents, (3) exclusion of the
// current claim from precedents. The pure helpers below (`orderPriorDecisions` /
// `selectRecentInScopePrecedents`) already implement (1)–(3) so 6.11 only wires the query.
//
// ── Until the producer ships (AC7) ─────────────────────────────────────────────────────────────────
// `VERIFIER_DECISION_READ_MODEL_AVAILABLE` is `false`, so both reads return `not_available_yet` — NOT
// `[]`. An empty array must later mean "the producer exists and there are genuinely no records"
// (`empty`), a state distinct from `not_available_yet` (producer absent) and `unavailable` (an existing
// producer failed). NEVER collapse the three.

import { and, desc, eq, inArray, isNull } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { ClaimId, PariwarId } from '../ids/index.js';
import { clampLimit } from '../pagination.js';
import { claimVerifierDecisions, type ClaimVerifierDecisionRow } from '../schema/claim_verifier_decisions.js';

/**
 * The 6.11 decision read model record — the consumer shape 6.10 pins (D6). A single resolved verifier
 * decision, ordered + scope-safe, carrying the display-safe rationale transcript. `pariwarId` is
 * carried for the scope-safe precedent read; `actorDisplay` is a human-actor DISPLAY string (never a
 * raw actor id, never prohibited PII).
 */
export interface VerifierDecisionRecord {
  readonly claimCaseId: string;
  readonly pariwarId: string;
  readonly outcome: string;
  readonly reasonCode: string;
  readonly rationale: string;
  readonly actorDisplay: string;
  readonly decidedAt: Date;
}

/**
 * Is the Story 6.11 decision read model wired? `false` until 6.11 ships the producer — the reads below
 * return `not_available_yet` (AC7). Flipping this to `true` is part of Story 6.11 (along with the real
 * query), and the pure helpers here become the ordering/selection the producer relies on.
 */
export const VERIFIER_DECISION_READ_MODEL_AVAILABLE = true as boolean;

/** The recent-precedents cap (AC2f — "latest 3"). */
export const RECENT_PRECEDENTS_LIMIT = 3;

/** Section (e) result — the four-state vocabulary minus `unavailable` (raised at the assembler on throw). */
export type PriorVerifierDecisionsResult =
  | { status: 'present'; decisions: VerifierDecisionRecord[] }
  | { status: 'empty' }
  | { status: 'not_available_yet' };

/** Section (f) result. */
export type RecentInScopePrecedentsResult =
  | { status: 'present'; precedents: VerifierDecisionRecord[] }
  | { status: 'empty' }
  | { status: 'not_available_yet' };

/**
 * Order this claim's decision transcript oldest → newest (deterministic: `decidedAt` ascending, then
 * `outcome` as a stable tiebreak). Pure — the producer feeds it the current claim's rows. Full history,
 * never truncated.
 */
export function orderPriorDecisions(
  records: readonly VerifierDecisionRecord[],
): VerifierDecisionRecord[] {
  return [...records].sort((a, b) => {
    const t = a.decidedAt.getTime() - b.decidedAt.getTime();
    return t !== 0 ? t : a.outcome.localeCompare(b.outcome);
  });
}

/**
 * Select the latest `limit` recent in-scope resolved precedents (AC2f): EXCLUDE the current claim, then
 * order by `decidedAt` DESC (newest first; `claimCaseId` as a stable tiebreak) and take the first
 * `limit`. Pure — the producer feeds it the same-Pariwar resolved-outcome rows (scope + resolved-only
 * are the producer's query predicates; this imposes the deterministic recency + exclusion + cap).
 */
export function selectRecentInScopePrecedents(
  records: readonly VerifierDecisionRecord[],
  opts: { excludeClaimCaseId: string; limit?: number },
): VerifierDecisionRecord[] {
  const limit = opts.limit ?? RECENT_PRECEDENTS_LIMIT;
  return [...records]
    .filter((r) => r.claimCaseId !== opts.excludeClaimCaseId)
    .sort((a, b) => {
      const t = b.decidedAt.getTime() - a.decidedAt.getTime();
      return t !== 0 ? t : b.claimCaseId.localeCompare(a.claimCaseId);
    })
    .slice(0, limit);
}

/**
 * Map a stored decision row → the 6.10-pinned `VerifierDecisionRecord`. The `rationale` carries the
 * ciphertext AS STORED (the 6.10 ciphertext-as-stored rule — the apps/api route decrypts it AFTER
 * authorization, never this accessor). NULL-ciphertext → `''` (the pinned record type is non-null,
 * Task 3 NULL-mapping rule); the route's fail-soft decrypt likewise maps a failure to `''` for (e).
 * `actorDisplay` is the stored decision-time SNAPSHOT (AC7) — surfaced verbatim, never re-resolved.
 */
function toDecisionRecord(row: ClaimVerifierDecisionRow): VerifierDecisionRecord {
  return {
    claimCaseId: row.claimCaseId,
    pariwarId: row.pariwarId,
    outcome: row.outcome,
    reasonCode: row.reasonCode,
    rationale: row.rationaleCiphertext ?? '',
    actorDisplay: row.actorDisplay,
    decidedAt: row.decidedAt,
  };
}

/**
 * The full ordered prior-verifier-decision transcript for the current claim (section (e), AC4/AC6).
 * Scope-safe (RLS + explicit `pariwar_id` + `claim_case_id`). Returns the COMPLETE history — including
 * escalations AND superseded rows (with their linkage) — so the audit trail is complete (AC6);
 * `orderPriorDecisions` imposes the deterministic oldest→newest ordering. Rationale is ciphertext AS
 * STORED (route decrypts). `present` when ≥1 row; `empty` (genuinely no records) — NEVER
 * `not_available_yet` now that the producer ships (the 6.10 four-state vocabulary; empty ≠ not_available_yet).
 */
export async function getPriorVerifierDecisions(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
): Promise<PriorVerifierDecisionsResult> {
  const rows = await db
    .select()
    .from(claimVerifierDecisions)
    .where(
      and(
        eq(claimVerifierDecisions.pariwarId, pariwarId),
        eq(claimVerifierDecisions.claimCaseId, claimCaseId),
      ),
    );
  if (rows.length === 0) return { status: 'empty' };
  return { status: 'present', decisions: orderPriorDecisions(rows.map(toDecisionRecord)) };
}

/**
 * The latest three recent in-scope RESOLVED precedents (section (f), AC4/AC6) — same Pariwar, resolved
 * approve/deny only (`outcome IN ('approved','denied')` AND `superseded_at IS NULL`; EXCLUDES escalated
 * + superseded rows, AC6), excluding the current claim, latest 3 by decision timestamp
 * (`selectRecentInScopePrecedents`). Scope-safe (RLS + explicit `pariwar_id`). `present` when ≥1;
 * `empty` when genuinely none — NEVER `not_available_yet` now that the producer ships.
 */
export async function getRecentInScopePrecedents(
  db: Db,
  pariwarId: PariwarId,
  currentClaimCaseId: ClaimId,
): Promise<RecentInScopePrecedentsResult> {
  // Bounded at the SQL level (ordered to match `selectRecentInScopePrecedents`'s own tiebreak) rather
  // than pulling every resolved decision for the whole Pariwar into memory. The current claim contributes
  // AT MOST one candidate row (the partial-unique "one live decision per claim" invariant), so LIMIT+1
  // always leaves the full top-`RECENT_PRECEDENTS_LIMIT` window intact after excluding it below.
  const rows = await db
    .select()
    .from(claimVerifierDecisions)
    .where(
      and(
        eq(claimVerifierDecisions.pariwarId, pariwarId),
        inArray(claimVerifierDecisions.outcome, ['approved', 'denied']),
        isNull(claimVerifierDecisions.supersededAt),
      ),
    )
    .orderBy(desc(claimVerifierDecisions.decidedAt), desc(claimVerifierDecisions.claimCaseId))
    .limit(clampLimit(RECENT_PRECEDENTS_LIMIT + 1, { default: RECENT_PRECEDENTS_LIMIT + 1, cap: 200 }));
  const precedents = selectRecentInScopePrecedents(rows.map(toDecisionRecord), {
    excludeClaimCaseId: currentClaimCaseId,
  });
  if (precedents.length === 0) return { status: 'empty' };
  return { status: 'present', precedents };
}
