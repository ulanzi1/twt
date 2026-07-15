// Verifier concealment-linkage assessment vocabulary — Story 6.15 (Task 1; AC7; D-D).
//
// The bounded, tri-state vocabulary the verifier concealment-linkage assessment write path + the tri-state
// concealment producer turn on. This is the human-supplied `claim.concealed_ima_condition_linked` fact
// (D-D): a verifier records *whether an undeclared IMA condition appears linked to the death* — a review
// ANNOTATION, never an adjudication. No automated medical-causality / death-linkage engine produces it
// (D-A/D-D); a human verifier judges it, and the State Trustee (Story 6.13) alone decides the claim.
//
// The three kinds map to the AC5 tri-state concealment signal deterministically:
//   · linked                → the fact is TRUE  → the engine raises the flag → signal `flagged`
//   · not_linked            → the fact is FALSE → the engine clears it       → signal `not_flagged`
//   · unable_to_determine   → the fact is ABSENT (no evaluation)             → signal `not_evaluated`
// (an ABSENT assessment — none ever recorded — also maps to `not_evaluated`; see `concealment-review.ts`).
//
// Modelled on the `r9-voting.ts` / `state-trustee-decision.ts` precedent (a domain `pgEnum` + TS tuple).
// The contract re-declares a value-aligned mirror (the browser-bundle rule); a lockstep test pins them.

import { pgEnum } from 'drizzle-orm/pg-core';

/**
 * The tri-state verifier concealment-linkage assessment kind (AC7). `linked` / `not_linked` are the two
 * decisive judgements (the engine evaluates the derived fact from them); `unable_to_determine` is the
 * explicit "no judgement" kind that (like an absent assessment) resolves the concealment signal to
 * `not_evaluated` — NEVER a false `not_flagged` (D10 fail-soft). Value-mirrored by the `@twt/contracts`
 * `ConcealmentAssessmentKind` z.enum.
 */
export const CLAIM_CONCEALMENT_ASSESSMENT_KINDS = ['linked', 'not_linked', 'unable_to_determine'] as const;
export const claimConcealmentAssessmentKindEnum = pgEnum(
  'claim_concealment_assessment_kind',
  CLAIM_CONCEALMENT_ASSESSMENT_KINDS,
);
export type ClaimConcealmentAssessmentKind = (typeof CLAIM_CONCEALMENT_ASSESSMENT_KINDS)[number];
