// The `member.*` R7 fact producer — Story 10.23 (Task 1 declares the surface; Task 6 fills it).
//
// ── Why this module exists at all (AC9 / D7) ─────────────────────────────────────────────────────
// Until this story, EVERY R7 fact was a `contribution.*` fact and `producer.ts` was the only
// producer. The falsifiable-hold gate was therefore scoped to that one producer's key set
// (`R7_SUPPLIED_FACT_KEYS`), and `r7-activation-totality.test.ts` checked every held clause's
// `blockedBy` against it.
//
// R7(A)/(B) are held on `member.joining_discipline_state` — a MEMBER fact, which can never enter a
// `contribution.*` key set. So the gate was STRUCTURALLY BLIND to this story: supplying the fact
// would have left the hold certified honest at the exact moment its stated reason was satisfied.
// That is [[feedback_gate_scope_semantic_coverage]] in its literal form — *a gate scoped to the
// wrong package still misses the target* — and it means the mechanization has been half-scoped since
// Story 10.24 without anyone noticing, because the second fact family had not arrived yet.
//
// This module is the second family's declaration site, so the gate can span BOTH
// (`R7_SUPPLIED_FACT_KEYS_ALL_FAMILIES`, rules.ts) instead of one.
//
// ── ⚠ SUPPLYING A FACT IS NOT ACTIVATING A CLAUSE ────────────────────────────────────────────────
// Nothing in this file activates anything. `prd.md:346` is normative and unconditional: R7(A)/(B)
// MUST NOT be evaluated from the disclaimed `contribution.total_count < 10` /
// `contribution.ever_contributed == false` proxy populations, and replacing those populations is a
// Part 11 registry amendment owned by the TRUSTEE PANEL (Decision 2026-08-06-077), not by any story.
// Story 10.23 carries the fact-supply half and cites that entry for the registry half — it does not
// inherit the amendment itself. Adding an id to `R7_ACTIVATED_CLAUSE_IDS` / `VALIDITY_RULE_ORDER`
// remains forbidden and is mechanically caught.
//
// ── The engine never infers this ─────────────────────────────────────────────────────────────────
// `epics.md:3888` is explicit that the fact is "sourced from the validity payload, never computed
// inside the rule engine — the payload already carries `lockInStatus.state`, so the producer side is
// a projection". This module is that projection, and it does not touch the engine, the ladder or
// `interpretClause` ([[project_engine_never_infers_contribution_facts]]).

import type { Facts } from '@twt/niyamavali-engine';

import type { LockInStatusPayload } from './types.js';

/**
 * The engine fact key R7(A)/(B) name in their `blockedBy`, spelled ONCE.
 *
 * ⚠ It is a `member.*` key, not a `contribution.*` one, and that difference is the whole reason the
 * falsifiable-hold gate had to be widened first (AC9/D7) — see this file's header.
 */
export const MEMBER_JOINING_DISCIPLINE_STATE_KEY = 'member.joining_discipline_state' as const;

/**
 * The `member.*` R7 fact keys this producer supplies.
 *
 * ⚠ TYPED EXPLICITLY, not `as const` — the `R7_HELD_FACTS` lesson (producer.ts): an `as const` on a
 * literal array collapses the element type at consumers and quietly accepts anything added later.
 *
 * ⚠ **SUPPLYING THIS KEY DID NOT ACTIVATE R7(A) OR R7(B), AND THE GATE PROVED IT.** Adding it here
 * turned `r7-activation-totality.test.ts` RED with its own message — *"…claims to be blocked by
 * `member.joining_discipline_state`, but a producer DOES supply it — the hold has outlived its
 * reason and must be re-justified or lifted."* The correct response was to NARROW both holds
 * (`blockedBy: []`, the non-fact blocker remaining), not to delete them and not to activate the
 * clauses ([[feedback_mechanization_split_commitment]]).
 */
export const R7_SUPPLIED_MEMBER_FACT_KEYS: readonly string[] = [
  MEMBER_JOINING_DISCIPLINE_STATE_KEY,
];

/**
 * Project `member.joining_discipline_state` from the payload's own `lockInStatus.state` (AC8).
 *
 * `epics.md:3888` fixes both the source and the direction: the fact is *"**sourced from the validity
 * payload**, never computed inside the rule engine — the payload already carries `lockInStatus.state`,
 * so the producer side is a projection"*. This is that projection, and it is a pure pass-through of
 * the JOINING clock's three-valued state.
 *
 * ⚠ **NO ENGINE CHANGE, NO LADDER CHANGE, NO `interpretClause` CHANGE.** All three are frozen behind
 * the 100×-thread determinism P0 gate, and [[project_engine_never_infers_contribution_facts]] is the
 * standing rule: the engine reads pre-derived facts and never computes them.
 *
 * ⚠ It reads the JOINING clock, and only the joining clock. It must never be derived from the
 * RESTORATION clock — they are independent instruments (Decision `2026-08-06-079`), and a fact named
 * for joining discipline that silently folded in restoration discipline would be the subsumption
 * AC5 exists to prevent, wearing a fact key.
 */
export function projectJoiningDisciplineState(lockInStatus: LockInStatusPayload): string {
  return lockInStatus.state;
}

/**
 * The `member.*` R7 facts as an engine fact bag, ready to merge with the `contribution.*` bag.
 *
 * ⚠ Supplied on the INDIVIDUAL-member path (`service.ts`, where the payload is assembled) and
 * deliberately NOT on the bulk Trustee-Lite scan. That is honest rather than an omission: NO
 * ACTIVATED CLAUSE READS THIS KEY — R7(A)/(B) are the only clauses that name it and both remain
 * HELD — so supplying it in the scan would buy nothing and would cost an N+1 lock-in-clock read per
 * member, which is exactly the shape `r7-candidate-scan.ts` exists not to be. ⚠ If R7(A)/(B) are
 * ever activated, the scan MUST supply this fact too, or the two R7 producers will disagree about a
 * member's ladder — re-read that seam before flipping either clause on.
 */
export function memberFactsToBag(lockInStatus: LockInStatusPayload): Facts {
  return { [MEMBER_JOINING_DISCIPLINE_STATE_KEY]: projectJoiningDisciplineState(lockInStatus) };
}
