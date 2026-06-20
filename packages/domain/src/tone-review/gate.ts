// Pure tone-review publish-gate evaluator — Story 2.2 (AC3).
//
// The HUMAN layer above the Story 1.17 automated `microcopy` floor. Where the lint
// enforces the automatable vocabulary/tone/numeral floor, this gate enforces that a
// NON-AUTHOR human has recorded a tone-review sign-off before member-visible copy is
// published (docs/tone-guide.md + docs/tone-review-checklist.md are the human
// process; this is its runtime teeth).
//
// FRAMEWORK-AGNOSTIC + FAIL-CLOSED (the rbac/check.ts precedent). No DB, no Fastify,
// no HTTP. The evaluator decides allow/deny from an INJECTED sign-off record — the
// consuming surface (Story 2.4 Niyamavali publish first) owns where that record is
// persisted and how it is resolved. Three invariants, all default-deny:
//   1. sign-off-present  — a `null`/absent sign-off (or one with no reviewer) → deny.
//   2. resource-bound     — a sign-off recorded for a DIFFERENT resourceLocator than
//      the publish target → deny (treated as no sign-off for this artifact; a
//      resolver keyed to the wrong record must not authorize an unrelated publish).
//   3. non-author        — `reviewedBy === authoredBy` → deny (an author cannot
//      tone-review their own copy).
// Every "allow" path is explicit; every uncertain path denies.

import type { ToneReviewDenial } from './errors.js';

/**
 * A recorded tone-review sign-off for an artifact. Supplied to the evaluator by the
 * consumer's resolver (Story 2.4 persists + resolves it). Carries NO raw copy — the
 * reviewed copy is referenced by a `contentHash` (SHA-256 hex), never stored here.
 */
export interface ToneReviewSignoff {
  /** The non-author reviewer's actor id (UUID). */
  reviewedBy: string;
  /** The reviewed artifact's resource locator (e.g. `niyamavali:clause:7`). */
  resourceLocator: string;
  /** SHA-256 hex content hash of the reviewed copy — NEVER the copy itself. */
  contentHash: string;
  /** When the sign-off was recorded, when known (not load-bearing for the decision). */
  reviewedAt?: Date | null;
}

/** Inputs to the gate decision. */
export interface ToneReviewGateParams {
  /** The recorded sign-off for the artifact being published, or `null` if none. */
  signoff: ToneReviewSignoff | null;
  /** The actor who authored the copy being published. */
  authoredBy: string;
  /** The publish target's resource locator (for the structured denial + audit). */
  resourceLocator: string;
}

/** The structured result of the gate decision. */
export type ToneReviewGateResult =
  | { allowed: true }
  | { allowed: false; denial: ToneReviewDenial };

/**
 * PURE fail-closed evaluator: may this publish proceed? Returns `{ allowed: true }`
 * only when a sign-off is present, carries a non-empty reviewer, AND that reviewer is
 * not the author. Otherwise returns `{ allowed: false, denial }` with the structured
 * denial the pre-handler projects into the 409 envelope + the audit line. Does NOT
 * throw — the apps/api adapter constructs + throws `ToneReviewRequiredError` from the
 * denial (the rbac `hasPermission`/`requirePermission` split).
 */
export function evaluateToneReviewGate(
  params: ToneReviewGateParams,
): ToneReviewGateResult {
  const { signoff, authoredBy, resourceLocator } = params;

  // (1) sign-off-present — a missing sign-off, or one with no reviewer, denies.
  if (!signoff || !signoff.reviewedBy) {
    return {
      allowed: false,
      denial: {
        reason: 'signoff-missing',
        resourceLocator,
        authoredBy,
        reviewedBy: null,
      },
    };
  }

  // (2) resource-bound — a sign-off for a different artifact is not a sign-off for
  // THIS publish target. Treated identically to no sign-off (fail-closed).
  if (signoff.resourceLocator !== resourceLocator) {
    return {
      allowed: false,
      denial: {
        reason: 'signoff-missing',
        resourceLocator,
        authoredBy,
        reviewedBy: null,
      },
    };
  }

  // (3) non-author — an author cannot tone-review their own copy.
  if (signoff.reviewedBy === authoredBy) {
    return {
      allowed: false,
      denial: {
        reason: 'author-is-reviewer',
        resourceLocator,
        authoredBy,
        reviewedBy: signoff.reviewedBy,
      },
    };
  }

  return { allowed: true };
}
