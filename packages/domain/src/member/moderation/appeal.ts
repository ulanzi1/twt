// The moderation appeal — PURE eligibility, status derivation and the exclusion predicate.
// Story 10.22. Niyamavali §8.8, ratified by Decision `2026-08-15-121`.
//
// ⛔ NOTHING IN THIS FILE TOUCHES THE DATABASE. The DB reads live in `appeal-read.ts` and the writes
// in `appeal-persist.ts`; this module holds the rules, so they are testable without a live DB and so
// the rules and their persistence cannot drift by being edited in one place only.
//
// ⛔ NOTHING HERE IS IMPORTED FROM `claim/appeal-eligibility.ts`. Part 9 is the claim-denial appeal —
// claim-scoped, three geographic stages, "exactly one journey per claim, ever", and no member in it.
// Part 8 does not reference Part 9 and §8.8 says expressly that it does not incorporate it. The SHAPE
// of `getOriginalDeciderActorIds` is a pattern reference; the code is not shared. A test asserts the
// absence of any `claim/appeal*` import from this module tree.

import type { AppealOutcome, AppealStatus } from './appeal-vocabulary.js';
import type { ModerationStatus } from './status.js';

/**
 * The statuses from which a member may appeal (§8.8; Decision `2026-08-15-121` clause 4).
 * BOTH sanctions, because §8.4a makes them distinct acts and each is separately appealable —
 * and because `status.ts:17` has asserted suspension is "appealable" since Story 10.10.
 */
export const APPEALABLE_MODERATION_STATUSES = ['suspended', 'terminated'] as const satisfies
  readonly ModerationStatus[];

/**
 * Is this member's current moderation standing one from which §8.8 permits an appeal?
 *
 * ⛔ There is deliberately NO deadline check anywhere in this module. §8.8: "No time limit runs
 * against a member's right to appeal under this section" (Decision clause 5). There is no
 * `AppealWindowExpired` in this codebase and none is to be introduced here — a deadline would in any
 * event be unenforceable against a terminated member who has lost portal access and may not learn of
 * the sanction promptly.
 */
export function isAppealableStatus(status: ModerationStatus): boolean {
  return (APPEALABLE_MODERATION_STATUSES as readonly ModerationStatus[]).includes(status);
}

/** Why a filing was refused. Bounded, so a route can map each arm to its own typed response. */
export type AppealFilingRefusal =
  /** The member is not under suspension or termination. 422. */
  | 'not-appealable-status'
  /** An appeal against this same act is already open. 409 — and the partial UNIQUE index backstops it. */
  | 'appeal-already-open';

/** Why a determination was refused. */
export type AppealDecisionRefusal =
  /** The appeal has already been determined. 409. */
  | 'already-decided'
  /**
   * ⭐ The adjudicator took part in the act under appeal. **409, NEVER 403.**
   * This is a state objection about *who this actor is to this case*, not an authorization failure:
   * the actor holds the key and would be permitted to decide a different appeal. Conflating the two
   * makes them indistinguishable to the operator, who then cannot tell "you may not do this at all"
   * from "you may not do this one".
   */
  | 'adjudicator-took-part';

/**
 * ⭐ THE DIFFERENT-INDIVIDUAL PREDICATE (§8.8; Decision clause 3).
 *
 * §8.8: the appeal "shall be heard by a member of the Panel who did not take part in the act appealed
 * against — neither as an authority who imposed it, nor by contributing a ground on which it rests."
 * That is the natural-justice requirement Deed Clause 26 binds every Board discretion to, and it
 * follows the discipline Part 9 applies at its own first stage.
 *
 * The exclusion set is therefore the UNION of two authorship families for the appealed act:
 *   · every `member_moderation_actions.actor_id` for that action, and
 *   · every `member_moderation_grounds.added_by` attached to it.
 *
 * ⚠ Why grounds authors are in the set: **a supporting ground is participation in the decision.**
 * This is the D-D reasoning that pulled R9 voters into the claim-side exclusion set, applied here.
 * An adjudicator who supplied the evidence a sanction rests on is not a different decision-maker in
 * any sense Clause 26 would recognise.
 *
 * ⚠ A three-tier ladder whose *Prior participation* clause would have ABOLISHED this requirement was
 * raised and is NOT RATIFIED (`2026-08-15-121` clause 8). The predicate is unqualified.
 */
export function isAdjudicatorExcluded(
  adjudicatorActorId: string,
  exclusionSet: ReadonlySet<string>,
): boolean {
  return exclusionSet.has(adjudicatorActorId);
}

/** The status an appeal takes on filing. §8.8 has exactly two, and a filing is always the first. */
export function initialAppealStatus(): AppealStatus {
  return 'open';
}

/**
 * Does this outcome DIRECT a restore? (§8.8; Decision clause 10.)
 *
 * ⛔ This is a QUESTION, not an action. It returns whether the adjudicator's determination calls for
 * the act to be undone — it never undoes it. The restore is a subsequent, separately-attributed act
 * through the existing `POST …/moderation` path, carrying its own reason code, its own Decision Note
 * and, from `terminated`, the Panel-exclusive `member.restore_terminated` check.
 *
 * Two structural reasons the appeal must not write the overlay itself:
 *   (i) a second write path bypasses §8.6's record, the dwell, and that Panel exclusivity;
 *   (ii) it would make the appeal a moderation act with no Decision Note.
 */
export function directsRestore(outcome: AppealOutcome): boolean {
  return outcome === 'allowed';
}
