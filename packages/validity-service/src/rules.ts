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
// ── Epic-4 member-standing scope (AMENDED by Story 10.24, again by 10.26) ───────────────────────
// Two engine-evaluated families run at member standing today: R12 (retirement coverage, Story 4.5)
// and the R7 contribution-discipline family — its (C)/(D)/(E)/(F) sub-clauses since Story 10.24, plus
// (G) since Story 10.26 (`R7_ACTIVATED_CLAUSE_IDS`). Only R7(A)/(B) stay OMITTED under the mechanized
// `R7_HELD_CLAUSES` hold below, and R8 is NOT activated by any of these facts (see the R8 note on
// `R7_ACTIVATED_CLAUSE_IDS`). R5/R9/R14 remain CLAIM-time (Epic 6). Adding a family is still one
// descriptor + one order entry.

import { ids, niyamavali, type Db } from '@twt/domain';
import {
  evaluateLadderAt,
  evaluateRetirementCoverageAt,
  R7_CLAUSE_IDS,
  R7_NOT_APPLICABLE,
  R12_CLAUSE_ID,
  type EvaluateDeps,
  type EvaluationContext,
  type EvaluationResult,
  type Facts,
} from '@twt/niyamavali-engine';

// ⚠ TYPE-ONLY, and it must STAY type-only. A value import from `./producer.js` here materializes a
// runtime edge in a graph that only tolerates the erased one, and the resulting module-init cycle
// fails at RUNTIME in consuming packages while `typecheck`, `lint` and this package's own unit tests
// all stay green. See `r7-fact-surface.ts`'s header for the full trace.
import type { AppliedRestorationRequirement } from './producer.js';

// ── R7 activation / hold — Story 10.24 (Task 1; AC3, D2/D4) ──────────────────────────────────────
//
// D4, ratified: `VALIDITY_RULE_ORDER` IS the omission mechanism. An omitted clause never gets a
// descriptor — it is not evaluated, not memoized, not audited, and CANNOT appear in
// `applicableNiyamavaliClauses[]` or `provenanceTrace[]`. That is strictly stronger than
// evaluate-then-filter. `R7_HELD_CLAUSES` is the RECORD of the omission; the absence of those ids
// from `VALIDITY_RULE_ORDER` is the ENFORCEMENT. The two are pinned together by the totality test
// (`tests/r7-activation-totality.test.ts`), so a future R7 sub-clause cannot be added without landing
// in exactly one bucket ([[feedback_mechanization_split_commitment]] — decay concentrates in the
// un-mechanized half).

/** An R7 sub-clause id, constrained to the engine's canonical seven (a typo cannot compile). */
export type R7ClauseId = (typeof R7_CLAUSE_IDS)[number];

/**
 * The R7 sub-clauses ACTIVATED at member standing — exactly those gated ONLY on the `contribution.*`
 * facts the producer supplies (`R7_SUPPLIED_FACT_KEYS`, producer.ts):
 *   · R7(C) `months_since_last >= 12`
 *   · R7(D) `total_count >= 10 && skips_current_year == 1`
 *   · R7(E) `total_count >= 10 && skips_current_year >= 2`
 *   · R7(F) `months_since_last >= 6`
 *
 * ⚠ Story 10.25 supplied a SIXTH fact (`r7a_restorations_used`) and this list did NOT grow. That is
 * the point, not an oversight: "gated only on supplied facts" is a NECESSARY condition for activation,
 * never a sufficient one. R7(A) reads that fact and stays HELD, because `prd.md:346` forbids
 * evaluating its population from the `total_count < 10` proxy until the Trustee Panel publishes the
 * Part 11 amendment (Decision 2026-08-06-077) and Story 10.23 supplies
 * `member.joining_discipline_state`.
 *
 * ⚠ R8 (`niy.ninety-percent-rule.r8`) is NOT activated by these facts and MUST NOT be added to
 * `VALIDITY_RULE_ORDER`. Its `all_of` needs `claim.death_classification` (a CLAIM-time fact — Epic 6,
 * absent at member standing) AND `contribution.compliance_percent`, which is NOT one of the keys this
 * producer supplies. `types.ts`'s historical "R7/R8 are OMITTED … until the Epic 8/9 producer" wording
 * read literally would imply otherwise; it was corrected in place by Story 10.24 (its AC8).
 */
export const R7_ACTIVATED_CLAUSE_IDS = [
  'niy.contribution-discipline.r7-c',
  'niy.contribution-discipline.r7-d',
  'niy.contribution-discipline.r7-e',
  'niy.contribution-discipline.r7-f',
  // ── Story 10.26 — R7(G) `personal_event_excuse_claimed == true` ────────────────────────────────
  // ⚠ Activating a clause is NOT the same act as supplying its fact, and this is the one place in the
  // R7 family where doing both in one story is legitimate. Read D6 before treating it as precedent:
  //   · its blocking fact has exactly ONE owner, and this story is it;
  //   · its population is "a member who ASSERTED" — the assertion IS the constitutional fact, not a
  //     proxy for one, so `prd.md:346`'s proxy prohibition (which pins R7(A)/(B)) does not reach it,
  //     and `:346` says so by name ("R7(C)–(G) … are unaffected by this constraint");
  //   · it is RATIFIED into `docs/legal/niyamavali.md` §3.1 (Trustee Panel, 2026-08-06) with NO
  //     outstanding registry amendment — unlike R7(A), whose Part 11 amendment is unpublished;
  //   · and activating it moves NO eligibility: `on_pass: no_exemption`, `never_excuses: true`.
  // ⚠ It reaches the member's own record as an EXPLANATION and is excluded from the violator-flag
  // channel by `imposesRestorationObligation` (AC5/D4) — activation without accusation.
  'niy.contribution-discipline.r7-g',
] as const satisfies readonly R7ClauseId[];

/**
 * One deliberately-unevaluated R7 sub-clause: its remaining blockers + who owns them.
 *
 * ⚠ TWO BLOCKER BUCKETS, and the split is what keeps a narrowed hold from becoming a decorative one
 * (Story 10.23, AC9/D7). A hold whose every FACT blocker has been supplied is not thereby lifted —
 * R7(A)/(B) also wait on a Trustee Panel instrument no producer can ever supply. Before this split,
 * `blockedBy` could only name facts, so the honest end state (`blockedBy: []`) was indistinguishable
 * from an unjustified hold, and the vacuity guard `blockedBy.length > 0` forced implementers to keep
 * a satisfied fact listed in order to stay green — i.e. to lie to keep the gate quiet.
 */
export interface R7HeldClause {
  readonly clauseId: R7ClauseId;
  /**
   * The FACT keys that must exist before this clause could be evaluated HONESTLY.
   *
   * MAY BE EMPTY once every blocking fact is supplied — that is the honest narrowed state, not a
   * lifted hold. `blockedByNonFacts` is what must then be non-empty. Each key here is checked
   * against `R7_SUPPLIED_FACT_KEYS_ALL_FAMILIES` (`r7-fact-surface.ts`), which spans EVERY fact
   * family: naming a key that IS supplied fails the gate, because the hold has outlived its stated
   * reason.
   */
  readonly blockedBy: readonly string[];
  /**
   * The blockers NO PRODUCER CAN EVER SUPPLY — a Trustee Panel instrument, a published Part 11
   * amendment, a ratification. These are why a hold can survive its last fact blocker being met.
   *
   * ⚠ NOT A HIDING PLACE FOR A FACT. Moving a supplied fact key in here to dodge the falsifiability
   * check is the precise failure this apparatus exists to catch; the totality test asserts no entry
   * here is shaped like a fact key ([[feedback_mechanization_split_commitment]]).
   */
  readonly blockedByNonFacts: readonly string[];
  /** Who owns the remaining blockers — a story key, or a governance body for a non-fact blocker. */
  readonly owner: string;
}

/**
 * R7 sub-clauses this story deliberately does NOT evaluate, each naming its blocking fact + owner.
 *
 * ⚠ R7(A) and R7(B) are held even though `contribution.total_count`, `contribution.ever_contributed`
 * and (since Story 10.25) `contribution.r7a_restorations_used` ARE supplied. `prd.md:346`
 * (2026-08-04) is NORMATIVE:
 *
 *   "R7(A) and R7(B) MUST NOT be evaluated from the `contribution.total_count < 10` /
 *    `contribution.ever_contributed == false` proxies alone. … An omitted clause is honest; a clause
 *    evaluated from a proxy this PRD has already disclaimed produces a *wrong eligibility answer on a
 *    real member's record*, which is the worse failure. … future implementations MUST NOT substitute
 *    alternative proxy populations without a corresponding Part 11 amendment."
 *
 * Supplying the facts and activating the clause are DIFFERENT acts. The facts are honestly derived
 * and surfaces read them; what is forbidden is putting `r7-a` / `r7-b` into `VALIDITY_RULE_ORDER`.
 *
 * ⚠ Story 10.26 DELETED the R7(G) entry (its fact is now supplied and the clause is ratified into
 * §3.1), leaving exactly TWO. Read that as the mechanization working, NOT as a licence to delete the
 * remaining two: R7(A)/(B) are blocked by things NO producer can supply — Story 10.23's
 * `member.joining_discipline_state` is a MEMBER fact, and the Part 11 amendment is a Trustee Panel
 * instrument. `R7_HELD_FACTS` (producer.ts) is now EMPTY while these two holds remain live; the two
 * constants answer different questions and must not be collapsed.
 */
export const R7_HELD_CLAUSES = [
  {
    // ── Story 10.25 NARROWED this hold; it did not lift it ────────────────────────────────────────
    // The producer now supplies `contribution.r7a_restorations_used`, so the falsifiable-hold test
    // went RED with its own message ("…the hold has outlived its reason and must be re-justified or
    // lifted"), exactly as `deferred-work.md` predicted in writing. NARROWING is the correct response.
    // Deleting this entry, or adding `r7-a` to `R7_ACTIVATED_CLAUSE_IDS` to make the red go away, is
    // the failure the whole apparatus exists to catch ([[feedback_mechanization_split_commitment]]).
    //
    // ⚠ `blockedBy` is the MECHANIZED half and lists only FACT keys, because that is what the totality
    // test can falsify against `R7_SUPPLIED_FACT_KEYS`. R7(A) has a THIRD activation condition that no
    // fact key can express: its clause DATA still keys the population on `contribution.total_count <
    // 10`, which `prd.md:344` disclaims as "an implementation proxy, not the constitutional
    // definition" and `:346` forbids evaluating from. Amending it is a Part 11 registry instrument
    // owned by the TRUSTEE PANEL (Decision 2026-08-06-077), not by any story — completion is
    // "ratified → version published → implementation references the new version". So R7(A) needs
    // BOTH Story 10.23's fact AND that published amendment before it may be activated.
    clauseId: 'niy.contribution-discipline.r7-a',
    // ── ⭐ Story 10.23 NARROWED this hold to EMPTY facts. It did NOT lift it ──────────────────────
    // Story 10.23 supplies `member.joining_discipline_state`, so the falsifiable-hold gate went RED
    // with its own message — "…claims to be blocked by 'member.joining_discipline_state', but a
    // producer DOES supply it — the hold has outlived its reason and must be re-justified or
    // lifted." NARROWING is the correct response, exactly as it was when Story 10.25 supplied
    // `r7a_restorations_used`. Deleting this entry, or adding `r7-a` to `R7_ACTIVATED_CLAUSE_IDS`
    // to make the red go away, is the failure the whole apparatus exists to catch
    // ([[feedback_mechanization_split_commitment]]).
    //
    // ⚠ EVERY FACT BLOCKER IS NOW SATISFIED, AND THE CLAUSE IS STILL HELD. That is not a
    // contradiction — it is the honest end state, and it is why `blockedByNonFacts` exists. R7(A)
    // has THREE activation conditions and stories can only ever satisfy two:
    //   1. `contribution.r7a_restorations_used`   — Story 10.25  ✅ supplied
    //   2. `member.joining_discipline_state`      — Story 10.23  ✅ supplied (this story)
    //   3. the PUBLISHED Part 11 amendment replacing the `total_count < 10` proxy population
    //                                              — TRUSTEE PANEL  ⛔ NOT PUBLISHED
    // `prd.md:346` is normative and unconditional: R7(A)/(B) MUST NOT be evaluated from the
    // disclaimed proxies, and the seeded clause DATA still keys the population on exactly that
    // proxy. Verified live 2026-08-07: `docs/legal/niyamavali.md` §3.1 still reads "Break before 10
    // contributions" / "Registered but never contributed", and the seed rows still carry the proxy
    // `all_of`. The amendment is a governance instrument no story owns and no code change can
    // satisfy (Decision 2026-08-06-077); completion is "ratified → version published →
    // implementation references the new version", so it is verifiable as PUBLISHED, never assumed.
    blockedBy: [],
    blockedByNonFacts: ['niyamavali-part-11-amendment:r7a-b-population-replacement'],
    // ⚠ OWNER MOVED from `story-10-23` to the Trustee Panel. Story 10.23 discharged everything a
    // story could; leaving a story key here would be an unowned obligation pointing at a completed
    // story — the shape that left R7 dark for two epics ([[project_r7_fact_producer_unbuilt]]).
    owner: 'trustee-panel',
  },
  {
    clauseId: 'niy.contribution-discipline.r7-b',
    blockedBy: [],
    blockedByNonFacts: ['niyamavali-part-11-amendment:r7a-b-population-replacement'],
    owner: 'trustee-panel',
  },
  // ── Story 10.26 DELETED the R7(G) entry, and deletion is right HERE and ONLY here ───────────────
  // The previous story NARROWED R7(A)'s `blockedBy` rather than deleting its entry, and "10.25
  // narrowed, so I should narrow" is the wrong lesson to carry forward. Narrowing was correct there
  // because a SECOND blocker remained (`member.joining_discipline_state`) on top of `prd.md:346`'s
  // proxy prohibition and an unpublished Part 11 amendment. R7(G) had exactly ONE blocking fact, this
  // story supplies it, there is no proxy prohibition reaching it (`prd.md:346` exempts R7(C)–(G) by
  // name) and no outstanding registry amendment — it is RATIFIED into §3.1 as of 2026-08-06 (D6).
  // With no reason left to hold, keeping a hold entry would be a decorative one, and a decorative hold
  // is exactly what this mechanization exists to prevent.
] as const satisfies readonly R7HeldClause[];

/**
 * The EXPLICIT, replay-stable evaluation order (AC2). The array position IS the serialization order
 * of `applicableNiyamavaliClauses[]` / `provenanceTrace[]`. Appending a family here (and a matching
 * descriptor in `buildRuleDescriptors`) is the ONLY change needed to run it — never a code branch.
 *
 * The R7 family occupies ONE fixed position AFTER `R12_CLAUSE_ID` (Story 10.24 D2); within the family
 * the ladder already sorts by clause id ascending. Never `Promise.all` completion order, never
 * hash-map order — the 100×-thread byte-identical payload-hash gate is a P0 on any variance.
 */
export const VALIDITY_RULE_ORDER = [R12_CLAUSE_ID, ...R7_ACTIVATED_CLAUSE_IDS] as const;

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
  /**
   * R7 contribution facts as an engine fact-bag (Story 10.24); `null` when this member's contribution
   * history is not derivable — in which case the R7 family is NOT evaluated at all and the payload
   * carries the `producer_unavailable` sentinel (D6). Optional so DB-free tests predating 10.24 compile.
   */
  contribution?: Facts | null;
}

/**
 * Build the ordered rule descriptors. R12 ALWAYS runs (facts genuinely available or not): when
 * `available.retirement === null`, the descriptor's facts are `{}` (empty), so the engine's
 * `interpretComputedClause` sees the absent `member.*` keys and routes to the typed
 * `rule.inputs_unavailable` reason code (Story 4.5) — a per-member DATA GAP surfaces in
 * `applicableNiyamavaliClauses[]`/`provenanceTrace[]`, distinguishable from "R12 not resolvable for
 * this Pariwar at all" (which still yields a `null` slot from `evaluateAt`, mirrored by
 * `evaluateOrderedClauses`).
 *
 * ⚠ The R7 ids in `VALIDITY_RULE_ORDER` are DELIBERATELY skipped here (Story 10.24 D2): the family is
 * evaluated by {@link evaluateAppliedR7ClauseSlots} through the ladder, so that only APPLIED clauses
 * reach the payload. Giving them ordinary descriptors is the single worst outcome available in this
 * story — see the D2 block above. R8 is not in the order at all and must not be added.
 */
export function buildRuleDescriptors(available: AvailableFacts): RuleDescriptor[] {
  const descriptors: RuleDescriptor[] = [];
  const r7Activated = new Set<string>(R7_ACTIVATED_CLAUSE_IDS);
  for (const clauseId of VALIDITY_RULE_ORDER) {
    if (r7Activated.has(clauseId)) continue; // ladder-evaluated (D2) — never an ordinary descriptor
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

// ── ⭐ D2 — the R7 family contributes ONLY APPLIED clauses (Story 10.24 Task 5; AC5) ──────────────
//
// THE HIGHEST-SEVERITY TRAP IN THE STORY, stated plainly so nobody re-opens it:
//
//   `assembleClauses` (payload.ts) pushes EVERY non-null slot into `applicableNiyamavaliClauses[]`.
//   `deriveViolatorFlags` (domain/trustee-lite) maps EVERY R7 clause id it finds there into a violator
//   flag, with NO `applied` check. Wire the four R7 clauses as ordinary `RuleDescriptor`s and every
//   member in the Pariwar acquires four violator flags with outcome `r7_not_applicable` — a governance
//   surface that recommends suspending EVERYONE.
//
// So the R7 family does NOT go through `buildRuleDescriptors`. It goes through the family ladder, which
// already computes `applied` per clause FROM THE PAYLOAD'S OWN `on_pass` DATA, with the swapped-payload
// guard (`parseMeta`), sorted by clause id, reporting `missingClauseIds`.
//
//   · Do NOT re-derive `applied` as `decision !== 'r7_not_applicable'` here. That duplicates the
//     ladder's `isApplied` MINUS its swap-guard — a second definition of "applied", the exact drift
//     class this codebase keeps getting bitten by.
//   · Do NOT modify `ladder.ts` / `interpretClause`. Both are frozen, shared by R7/R8/special-death,
//     and sit behind the 100×-thread determinism P0 gate.
//   · Contribute EVERY applied clause, not just the ladder's precedence PICK. `precedence` orders WHICH
//     EXPLANATION SURFACES, never eligibility — every applied clause already means the restoration path
//     applies ([[project_niyamavali_precedence_is_provenance]]) — and `ViolatorFlagMember.flags[]` is
//     natively plural.
//   · Do NOT call `evaluateR7LadderAt` / `evaluateR7Ladder`. Those wrappers hardcode the FULL
//     `R7_CLAUSE_IDS` (all seven), so they would evaluate the three HELD clauses too — silently, because
//     `interpretClause`'s `hasFact` guard resolves a missing fact to `false` rather than throwing. That
//     is precisely what `prd.md:346` forbids and what D4's omission mechanism exists to prevent. This
//     calls the GENERIC `evaluateLadderAt` with `R7_ACTIVATED_CLAUSE_IDS`.

/**
 * The producer literal reported when R7 detection could not run because the Pariwar's Niyamavali
 * registry has no ACTIVATED R7(C)–(F) clause version effective at the evaluated instant.
 *
 * NOT `'story-10-24'`: the fact producer is working fine in that case — what is missing is the RULES.
 * Labelling it as a producer gap would send an operator to debug the wrong subsystem. Shared by both
 * R7 consumers so the string is defined once: the bulk Trustee-Lite scan (`r7-candidate-scan.ts`) and
 * the individual-member path (`evaluateAppliedR7ClauseSlots` below, via `service.ts`).
 */
export const R7_REGISTRY_UNPROVISIONED_PRODUCER = 'niyamavali-registry' as const;

/**
 * Read `restoration.consecutive_required` out of a resolved clause payload — Story 10.25 (AC4).
 *
 * ONE spelling, shared by the individual-member path and the bulk Trustee-Lite scan, so the two
 * cannot drift into different readings of the same governance block. PURE: it interprets nothing and
 * decides nothing; it reads a number the registry already published.
 *
 * `null` when the clause carries no `restoration` block, no `consecutive_required`, or a value that is
 * not a positive integer — i.e. this clause's restoration package is NOT measured in consecutive
 * contributions (R7(D)/(E)/(F) prescribe `lock_in_months` + `catch_up_required` / `complete_all`).
 * That is a real, honest answer about the clause, never a producer gap.
 */
export function readConsecutiveRequired(payload: Record<string, unknown>): number | null {
  const restoration = (payload as { restoration?: unknown }).restoration;
  if (typeof restoration !== 'object' || restoration === null) return null;
  const value = (restoration as { consecutive_required?: unknown }).consecutive_required;
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : null;
}

// ── ⭐ AC5 / D4 — the VIOLATOR-FLAG exclusion, filtered here rather than downstream ────────────────

/**
 * The `restoration`-block keys that PRESCRIBE an obligation, as the seeded R7(A)–(G) payloads spell
 * them. Everything else in a restoration block either QUALIFIES an obligation prescribed by one of
 * these (`one_time_only`, `lifetime_max` bound R7(A)'s consecutive requirement) or is the payload
 * declaring that it prescribes nothing (R7(G)'s `never_excuses`).
 *
 * This is the payload's own DATA VOCABULARY, not a clause list — a trustee amendment that gives a
 * declarative clause a `lock_in_months` flips the predicate with no code change, and a new declarative
 * clause is excluded automatically. `tests/imposes-restoration-obligation.test.ts` walks the SEEDED
 * payloads and additionally requires every restoration key it finds to be classified, so a trustee
 * amendment introducing an unknown key fails loudly instead of being swept into "no obligation".
 */
export const RESTORATION_OBLIGATION_KEYS = [
  'catch_up_required',
  'complete_all',
  'consecutive_required',
  'core_team_recommendation',
  'lock_in_months',
] as const;

/**
 * Does this clause's payload IMPOSE a restoration obligation? A violator flag asserts that a member is
 * in a restoration/lock-in HOLDING; a clause that prescribes nothing is not a holding, it is an
 * EXPLANATION. Read from the clause DATA (never a clause-id branch) so a trustee amendment moves it.
 *
 * ⚖ THE RATIFIED INVARIANT THIS ENFORCES (D4, ratified 2026-08-06 by BigDev; constitutional since the
 * Trustee Panel ratified R7(G) into `docs/legal/niyamavali.md` §3.1 the same day):
 *
 *     A clause may influence trustee UNDERSTANDING without influencing trustee SUSPICION.
 *
 * `factsEstablishing[]` informs; `flags[]` accuses. These are two different powers and the substrate
 * already keeps them apart. R7(G) is granted the first and denied the second, because the ratified
 * §3.1 text (`niyamavali.md:81`) says its assertion "is recorded on the member's own record but grants
 * no restoration relief AND CARRIES NO CONSEQUENCE OF ITS OWN" — and a flag on the Trustee-Lite
 * surface that feeds SUSPENSION decisions is a consequence. R7(G) applies exactly when a member told
 * the truth about their own life, so without this predicate, disclosing a bereavement would make a
 * member a suspension candidate. That does not merely harm members; it contradicts the Niyamavali.
 *
 * ⚠ The filter belongs HERE, upstream, beside the `applied` filter — never inside
 * `@twt/domain`'s `trustee-lite/violator-flags.ts`, which is FROZEN (10.24 AC5: "if it needs a change,
 * that is a finding, not a task") and whose contract is deliberately "flag every R7 clause you are
 * given". Both R7 producers import THIS function so the two seams cannot drift.
 *
 * PURE. It interprets nothing and decides no eligibility; it reads what the registry already published.
 */
export function imposesRestorationObligation(payload: Record<string, unknown>): boolean {
  const restoration = (payload as { restoration?: unknown }).restoration;
  if (typeof restoration !== 'object' || restoration === null) return false;
  const block = restoration as Record<string, unknown>;
  return RESTORATION_OBLIGATION_KEYS.some((key) => {
    const value = block[key];
    // PRESCRIPTION, not presence: `lock_in_months: 0` (R7(A) ships exactly that) and
    // `complete_all: false` prescribe nothing. Only a positive requirement or an affirmed flag does.
    if (typeof value === 'number') return Number.isFinite(value) && value > 0;
    return value === true;
  });
}

/**
 * Does this APPLIED clause contribute a violator flag? — the shared seam filter (AC5).
 *
 * ONE spelling, imported by BOTH R7 producers (`evaluateAppliedR7ClauseSlots` here and the bulk
 * `r7-candidate-scan.ts`), because they already carry twin `applied` filters and drifted by omission
 * once (10.24 round-2 review found the bulk seam un-probed). A clause whose payload cannot be found is
 * treated as NOT imposing: it contributes no accusation on evidence nobody can read.
 *
 * ⚠ This filters `applicableNiyamavaliClauses[]` — the accusation channel — ONLY. The assertion stays
 * fully visible to the trustee as a FACT: `deriveViolatorFlags` builds `factsEstablishing[]` from every
 * `contribution.*` key on the payload (`violator-flags.ts:204-207`), so
 * `contribution.personal_event_excuse_claimed` still rides into the fact list of any member flagged for
 * some OTHER clause, and can inform a trustee's discretion there. Asserting can only ever help or do
 * nothing; it can never hurt. That asymmetry is the design, not an oversight — see D4.
 */
export function contributesViolatorFlag(
  clauseId: string,
  payloadsByClauseId: ReadonlyMap<string, Record<string, unknown>>,
): boolean {
  const payload = payloadsByClauseId.get(clauseId);
  return payload !== undefined && imposesRestorationObligation(payload);
}

/** {@link evaluateAppliedR7ClauseSlots}'s result: the applied slots, plus the registry-gap signal. */
export interface R7ClauseEvaluation {
  /** The APPLIED R7 clause slots only (D2), clause-id ascending. */
  slots: ClauseEvalSlot[];
  /**
   * The restoration parameters of the ladder's PRECEDENCE PICK — Story 10.25 (AC4). `null` when no
   * clause applied.
   *
   * The pick, not the whole applied set, because `precedence` is exactly the field that decides WHICH
   * EXPLANATION SURFACES when several clauses apply ([[project_niyamavali_precedence_is_provenance]]),
   * and the disclosure shows one package. Every applied clause already means the restoration path
   * applies; the pick decides which one the member is told about.
   */
  restoration: AppliedRestorationRequirement | null;
  /**
   * True when NONE of `R7_ACTIVATED_CLAUSE_IDS` resolves to a clause version at `at` for this
   * Pariwar — the registry is unprovisioned, a DIFFERENT gap from `facts === null` (the fact
   * producer's own gap). Mirrors `r7-candidate-scan.ts`'s identical `resolvedClauses.length === 0`
   * check (2026-08-06 finding): without this, a Pariwar whose R7 rules were never published reads as
   * "evaluated, this member is clean" instead of "R7 detection did not run" — a false all-clear on
   * exactly the surface `getValidityAt`'s own Dev Agent Record calls "the authoritative R7 verdict".
   * Always `false` when `facts === null`, since that case already yields the FACTS-gap sentinel.
   */
  registryUnavailable: boolean;
}

/**
 * Evaluate the ACTIVATED R7 sub-clauses at the pinned instant and return ONLY THE APPLIED ones as
 * ordered slots (D2). Clause-id ascending — the ladder already sorts, which matches these ids'
 * positions in `VALIDITY_RULE_ORDER`, so the payload's serialization order stays declared-order stable.
 *
 * Returns `{ slots: [], registryUnavailable: false }` when `facts` is `null` (this member's
 * contribution history is not derivable): the family is then not evaluated AT ALL — no descriptor, no
 * memo, no audit line, no clause in the payload — and the caller supplies the `producer_unavailable`
 * sentinel instead (D6). That is strictly stronger than evaluating-then-filtering, and it is also the
 * cheaper path.
 */
export async function evaluateAppliedR7ClauseSlots(
  deps: EvaluateDeps,
  baseContext: { pariwarId: ids.PariwarId; memberId: ids.MemberId },
  facts: Facts | null,
  at: Date,
): Promise<R7ClauseEvaluation> {
  if (facts === null) return { slots: [], registryUnavailable: false, restoration: null };
  const ladder = await evaluateLadderAt(
    deps,
    { pariwarId: baseContext.pariwarId, memberId: baseContext.memberId, facts },
    at,
    R7_ACTIVATED_CLAUSE_IDS,
    R7_NOT_APPLICABLE,
  );
  return {
    slots: ladder.perClauseResults
      .filter((entry) => entry.applied)
      .map((entry) => ({ clauseId: ids.clauseId(entry.clauseId), result: entry.result })),
    registryUnavailable: ladder.missingClauseIds.length === R7_ACTIVATED_CLAUSE_IDS.length,
    restoration: await resolveAppliedRestoration(deps.db, baseContext.pariwarId, ladder, at),
  };
}

/**
 * Resolve the ladder PICK's `restoration.consecutive_required` from the clause DATA — Story 10.25.
 *
 * ⚠ RECORDED VARIANCE from the story's "never a second registry read". `LadderResult` does not surface
 * the resolved payload (only `clauseId` / `applied` / `EvaluationResult`), and `ladder.ts` is FROZEN —
 * it is shared by R7/R8/special-death and sits behind the 100×-thread determinism P0 gate, so widening
 * its result shape is out of bounds for this story. The alternatives were: resolve all four activated
 * payloads concurrently with the ladder (four extra queries on EVERY evaluation, zero extra
 * round-trips) or resolve the ONE picked clause afterwards (one extra query, one extra round-trip,
 * only for members who actually have an applied R7 clause). This is the second.
 *
 * It is NOT an N+1: it is a single bounded read outside any loop over members, pools or clauses, which
 * is AC8's binding structural criterion. The bulk Trustee-Lite scan pays NOTHING for it — that path
 * already hoists the clause payloads out of its per-member loop and reads the same block from them.
 *
 * `null` when no clause applied — the member is in no contribution-discipline restoration path — or
 * when the picked clause vanished from the registry between the ladder's resolution and this one (a
 * window that cannot open at a pinned historical `at`, and degrades honestly if it ever did).
 */
async function resolveAppliedRestoration(
  db: Db,
  pariwarId: ids.PariwarId,
  ladder: { applicableClauseId: string | null },
  at: Date,
): Promise<AppliedRestorationRequirement | null> {
  const clauseIdStr = ladder.applicableClauseId;
  if (clauseIdStr === null) return null;
  const row = await niyamavali.resolveByClauseId(db, pariwarId, ids.clauseId(clauseIdStr), at);
  if (row === null) return null;
  return { clauseId: clauseIdStr, consecutiveRequired: readConsecutiveRequired(row.payload) };
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
