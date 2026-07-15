// Tri-state claim concealment PRODUCER — Story 6.15 (Task 3 + Task 4; AC1/AC5/AC6; D-A/D-D/D10).
//
// The claim-scoped concealment signal the 6.10 verifier console + the 6.13 cycle-freeze queue read. It is
// produced from the VERIFIER ASSESSMENT (`claim_concealment_assessments`, the human-supplied
// `claim.concealed_ima_condition_linked` fact — D-D), NEVER from the redacted Validity-Service payload
// (`specialFlags` / `medicalDisclosureFlags` / `pendingConcealmentFlag` — the D10 discipline).
//
// ── Why this is a deterministic domain mapping, NOT an engine call (a deliberate, ratified-consistent
//    realization of the story's semantics) ────────────────────────────────────────────────────────────
// The story's Dev Notes describe "invoke `evaluateConcealmentAt` (`@twt/niyamavali-engine`)". That import
// is ARCHITECTURALLY IMPOSSIBLE from `@twt/domain`: the engine DEPENDS ON domain (`@twt/niyamavali-engine`
// → `@twt/domain`), so a domain → engine import is a turbo/package cycle (the same cycle the Dev Notes
// forbid for `@twt/events`/`@twt/validity-service`). The story's OWN bulk path (Task 4/AC6) already
// mandates the cycle-free realization — "map each from its assessment kind DETERMINISTICALLY
// (linked→flagged, not_linked→not_flagged, else→not_evaluated) … NO per-claim evaluateConcealmentAt/DB call
// in a loop". This module applies that SAME deterministic mapping for BOTH the single-claim and bulk paths,
// because R14 is a single-clause `flag_if_true` family (special-death.ts:169-198): it raises
// `concealment_review_required` IFF the fact `claim.concealed_ima_condition_linked === true`, and that fact
// IS `kind === 'linked'`. The only thing the engine call added beyond the deterministic flag is the R14
// `clause_version_id` provenance — resolved here via the DOMAIN-INTERNAL `resolveConcealmentClause`
// (`medical/concealment.ts`, which wraps the `niyamavali` accessors — both `@twt/domain`-internal, no
// cycle). The engine NEVER derives the fact ([[project_engine_never_infers_contribution_facts]]); neither
// does this — a human verifier supplies it.
//
// ── Fail-soft (D10) ──────────────────────────────────────────────────────────────────────────────────
// An ABSENT assessment, an `unable_to_determine` assessment, OR an unresolvable R14 clause (unprovisioned
// registry) → `not_evaluated`, NEVER a false `not_flagged`. "Never green a redacted/absent signal."
//
// Pure-domain: engine-free, `@twt/events`/`@twt/validity-service`-free. The apps/api console + queue consume it.

import type { Db } from '../db.js';
import type { ClaimId, PariwarId } from '../ids/index.js';
import { resolveConcealmentClause } from '../medical/concealment.js';
import type { ClaimConcealmentAssessmentKind } from './concealment-assessment.js';
import { getLiveConcealmentAssessment, getLiveConcealmentAssessmentsBulk } from './concealment-assessment-persist.js';

/**
 * The tri-state claim concealment signal (AC5) — NEVER a boolean. `flagged`/`not_flagged` carry the R14
 * `clauseVersionId` provenance (the AC3 rule-version basis surfaced for a `full`-visibility caller);
 * `not_evaluated` carries none (there is nothing to evaluate — absent/indeterminate/unprovisioned).
 */
export type ClaimConcealmentSignal =
  | { status: 'flagged'; clauseVersionId: string }
  | { status: 'not_flagged'; clauseVersionId: string }
  | { status: 'not_evaluated' };

/**
 * Map ONE resolved assessment kind + the (possibly null) resolved R14 clause to the tri-state signal —
 * the single deterministic rule BOTH the single-claim and bulk producers share (so they can never drift).
 * `linked → flagged`, `not_linked → not_flagged` (needs the clause version); `unable_to_determine` / an
 * absent kind (`undefined`) / a null clause → `not_evaluated` (D10 fail-soft — never a false `not_flagged`).
 */
function mapAssessmentToSignal(
  kind: ClaimConcealmentAssessmentKind | undefined,
  clauseVersionId: string | null,
): ClaimConcealmentSignal {
  if (kind === undefined || kind === 'unable_to_determine') return { status: 'not_evaluated' };
  if (clauseVersionId === null) return { status: 'not_evaluated' };
  return kind === 'linked'
    ? { status: 'flagged', clauseVersionId }
    : { status: 'not_flagged', clauseVersionId };
}

/** Resolve the R14 clause version for a Pariwar, fail-soft to `null` (D10 — an unprovisioned registry
 *  becomes `not_evaluated`, never a false `not_flagged`). `resolveConcealmentClause` itself already returns
 *  `null` for BOTH expected "unprovisioned" outcomes (no clause row, or a schema-validation failure on the
 *  payload) — it never throws for those. Deliberately NO catch here: an unexpected failure (a connection
 *  reset, pool exhaustion, query timeout) must PROPAGATE, not silently collapse to the same `not_evaluated`
 *  as a genuinely unprovisioned registry — a transient blip would otherwise hide an already-recorded
 *  `linked` assessment from the console AND the trustee queue for that request. */
async function resolveR14ClauseVersionId(db: Db, pariwarId: PariwarId): Promise<string | null> {
  const clause = await resolveConcealmentClause(db, pariwarId);
  return clause?.clauseVersionId ?? null;
}

/**
 * The SINGLE-claim tri-state concealment producer (Task 3; AC1/AC5). Reads the claim's LIVE verifier
 * assessment (Task 2) and maps it: `absent | unable_to_determine → not_evaluated`; `linked | not_linked` →
 * resolve the R14 clause version (fail-soft) and return `flagged`/`not_flagged` + `clauseVersionId`. No
 * decrypt, no death-linkage compute (D-A); no validity-flag read (D10). `at` is reserved for a future
 * historical-replay resolver (v1 surfaces the CURRENT R14 basis — there is no time-aware clause-by-id
 * resolver in domain; matches the console's "current clause version" surfacing).
 */
export async function assessClaimConcealment(
  db: Db,
  opts: { pariwarId: PariwarId; claimCaseId: ClaimId; at?: Date },
): Promise<ClaimConcealmentSignal> {
  const live = await getLiveConcealmentAssessment(db, opts.pariwarId, opts.claimCaseId);
  // Absent or explicitly indeterminate → not_evaluated WITHOUT touching the clause registry.
  if (!live || live.kind === 'unable_to_determine') return { status: 'not_evaluated' };
  const clauseVersionId = await resolveR14ClauseVersionId(db, opts.pariwarId);
  return mapAssessmentToSignal(live.kind, clauseVersionId);
}

/**
 * The BULK tri-state concealment producer for the 6.13 trustee queue (Task 4; AC6). Reads ALL live
 * assessments for the pending set in ONE clamped query (`getLiveConcealmentAssessmentsBulk`), resolves the
 * `niy.concealment.r14` clause version ONCE per pariwar (fail-soft), and maps each claim DETERMINISTICALLY
 * — NO per-claim clause resolution / DB call / engine call in a loop (the explicit no-N+1 requirement).
 * Returns a `Map<claimCaseId, ClaimConcealmentSignal>` covering EVERY requested claim (a claim with no live
 * assessment maps to `not_evaluated`). (No `at` param: v1 resolves the CURRENT R14 basis — see
 * `assessClaimConcealment`; a historical-replay resolver is deferred with no consumer yet.)
 */
export async function assessClaimConcealmentBulk(
  db: Db,
  pariwarId: PariwarId,
  items: readonly { claimCaseId: ClaimId }[],
): Promise<Map<string, ClaimConcealmentSignal>> {
  const out = new Map<string, ClaimConcealmentSignal>();
  if (items.length === 0) return out;

  const ids = items.map((i) => i.claimCaseId);
  // ONE query for every live assessment in the set (partial-unique ⇒ ≤1 per claim).
  const assessments = await getLiveConcealmentAssessmentsBulk(db, pariwarId, ids);
  // Clause version resolved ONCE per pariwar (NOT per claim) — the no-N+1 discipline. Fail-soft to null.
  // Only resolve when at least one assessment could produce a flag (all-absent/indeterminate needs none).
  const anyDecisive = [...assessments.values()].some((a) => a.kind !== 'unable_to_determine');
  const clauseVersionId = anyDecisive ? await resolveR14ClauseVersionId(db, pariwarId) : null;

  for (const item of items) {
    const live = assessments.get(item.claimCaseId);
    out.set(item.claimCaseId, mapAssessmentToSignal(live?.kind, clauseVersionId));
  }
  return out;
}
