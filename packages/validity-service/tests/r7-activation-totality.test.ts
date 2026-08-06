// R7 activation/hold TOTALITY — Story 10.24 (Task 1; AC3, D2/D4). PURE, DB-free.
//
// This is the boundary that governs every other task in the story, and it is deliberately written
// FIRST — before any payload wiring exists — so the discipline is green and revert-proven rather than
// retro-fitted into a description of what was built ([[feedback_mechanization_split_commitment]]).
//
// What it mechanizes:
//   1. TOTALITY   — activated ∪ held === the engine's canonical seven. A future R7 sub-clause cannot
//                   be added without landing in exactly one bucket.
//   2. DISJOINT   — activated ∩ held === ∅. A clause cannot be both.
//   3. ENFORCEMENT — the held ids are genuinely ABSENT from `VALIDITY_RULE_ORDER` (D4: omission is
//                   the mechanism; the constant is only the record).
//   4. NO R8      — `VALIDITY_RULE_ORDER` never gains an R8 clause id (the "supplying facts activates
//                   R8 too" trap `types.ts` used to imply).
//   5. FALSIFIABLE HOLD — every held clause's `blockedBy` names a fact key genuinely NOT in
//                   `R7_SUPPLIED_FACT_KEYS`, so a hold cannot outlive its reason.
//
// ── Revert-sanity probe (AC3 — RUN AND RECORDED, not asserted-by-comment) ─────────────────────────
// A green scan proves nothing ([[feedback_gate_scope_semantic_coverage]]). Probe RUN 2026-08-05:
// adding `'niy.contribution-discipline.r7-a'` to `R7_ACTIVATED_CLAUSE_IDS` produced, verbatim,
// `Tests  3 failed | 134 passed`:
//   · `activated ∪ held === R7_CLAUSE_IDS`         → RED (the concatenation carries r7-a twice, so the
//     multiset differs from the canonical seven — totality is asserted over the CONCATENATION, not a
//     de-duplicated union, precisely so a double-bucketed clause cannot hide inside a set union)
//   · `activated ∩ held === ∅`                     → RED (r7-a in both buckets)
//   · `activates EXACTLY R7(C)/(D)/(E)/(F)`        → RED
// Note what did NOT catch it: the `satisfies readonly R7ClauseId[]` constraint stayed GREEN, because
// r7-a IS a real R7 id. The COMPILER cannot catch this class of error — only these tests can, which is
// the whole reason the mechanization is a test and not a type. Restored immediately; Dev Agent Record.
//
// ── Revert-sanity probe #2 (Story 10.26 AC4 — RUN AND RECORDED) ─────────────────────────────────
// This story's probe runs in the OPPOSITE direction from 10.24's, and that is the point: 10.24 ADDED
// a clause to `R7_ACTIVATED_CLAUSE_IDS` (producing a DUPLICATE across the two buckets); 10.26 REMOVED
// `'niy.contribution-discipline.r7-g'` from it WITHOUT re-adding it to `R7_HELD_CLAUSES`, producing a
// GAP. Probe RUN 2026-08-06 — verbatim `Tests  2 failed | 8 passed (10)`:
//   · `activated ∪ held === R7_CLAUSE_IDS`         → RED, `expected [ …(6) ] to deeply equal [ …(7) ]`
//     (the union is SIX, not seven — a clause fell out of both buckets)
//   · `activates EXACTLY R7(C)/(D)/(E)/(F)/(G)`    → RED, `expected [ …(4) ] to deeply equal [ …(5) ]`
// So totality catches an under-count as loudly as an over-count. Restored immediately; suite green.
//
// ── Revert-sanity probe #3 (Story 10.26 AC5 — the HARM GATE, RUN AND RECORDED) ──────────────────
// Deleting `.filter((entry) => contributesViolatorFlag(entry.clauseId, payloadsByClauseId))` from
// `src/r7-candidate-scan.ts` made BOTH `tests/integration/contribution-facts.spec.ts` → "AC5/D4 — an
// asserted personal event NEVER becomes a violator flag" cases go RED, each naming the clause in its
// diff — verbatim `expected [ 'niy.contribution-discipline.r7-g' ] to deeply equal []` for the
// bereaved-member case, and `expected [ …(3) ] to deeply equal [ …(2) ]` (the extra entry being
// `"niy.contribution-discipline.r7-g"`) for the already-flagged member. `Tests  2 failed | 30
// skipped (32)`. That is a member acquiring a suspension-candidate flag for disclosing a bereavement,
// reproduced exactly. Restored immediately.
//
// The SECOND seam Story 10.26's AC5 named (`evaluateAppliedR7ClauseSlots`, rules.ts) carries no such
// filter BY DESIGN — its clause list is the member's OWN RECORD, not an accusation, and filtering it
// would delete the explanation the story exists to produce (AC6). That asymmetry is itself mechanized
// by `tests/violator-accusation-channel.test.ts`, and probed: adding a second production caller of
// `deriveViolatorFlags` made it go RED naming the offending file. See the scan's header for the trace.

import { R7_CLAUSE_IDS } from '@twt/niyamavali-engine';
import { describe, expect, it } from 'vitest';

import { R7_HELD_FACTS, R7_SUPPLIED_FACT_KEYS } from '../src/producer.js';
import { R7_ACTIVATED_CLAUSE_IDS, R7_HELD_CLAUSES, VALIDITY_RULE_ORDER } from '../src/rules.js';

/** The R8 family id — the clause this story must NOT activate (the R8 trap, story Boundary §). */
const R8_CLAUSE_ID = 'niy.ninety-percent-rule.r8';

describe('Story 10.24 — R7 activation/hold totality (AC3)', () => {
  const activated: readonly string[] = R7_ACTIVATED_CLAUSE_IDS;
  const held: readonly string[] = R7_HELD_CLAUSES.map((c) => c.clauseId);

  it('activated ∪ held === the engine canonical seven (R7_CLAUSE_IDS) — no sub-clause is unaccounted for', () => {
    expect([...activated, ...held].sort()).toEqual([...R7_CLAUSE_IDS].sort());
  });

  it('activated ∩ held === ∅ — a clause is EITHER evaluated OR explicitly held, never both', () => {
    const heldSet = new Set(held);
    expect(activated.filter((id) => heldSet.has(id))).toEqual([]);
    // Belt-and-suspenders: neither bucket may carry a duplicate of its own.
    expect(new Set(activated).size).toBe(activated.length);
    expect(new Set(held).size).toBe(held.length);
  });

  it('activates EXACTLY R7(C)/(D)/(E)/(F)/(G) — the five gated only on supplied facts', () => {
    expect([...activated].sort()).toEqual([
      'niy.contribution-discipline.r7-c',
      'niy.contribution-discipline.r7-d',
      'niy.contribution-discipline.r7-e',
      'niy.contribution-discipline.r7-f',
      // Story 10.26 — R7(G) joins on the SEVENTH fact. Legitimate here in a way R7(A)/(B) are not:
      // its population is "a member who asserted", which IS the constitutional fact rather than a
      // proxy for one, and it is RATIFIED into §3.1 (2026-08-06) with no outstanding amendment (D6).
      'niy.contribution-discipline.r7-g',
    ]);
  });

  it('holds EXACTLY R7(A)/(B) — each naming its blocking fact(s) and owner', () => {
    expect([...held].sort()).toEqual([
      'niy.contribution-discipline.r7-a',
      'niy.contribution-discipline.r7-b',
    ]);
    // ⚠ The loops below iterate `R7_HELD_CLAUSES`, so they go VACUOUSLY GREEN if it ever empties. It
    // is down to two and the next deletion would leave one; pin the count so an empty set cannot pass
    // for a satisfied invariant ([[feedback_gate_scope_semantic_coverage]]).
    expect(R7_HELD_CLAUSES.length).toBe(2);
    for (const clause of R7_HELD_CLAUSES) {
      expect(clause.blockedBy.length).toBeGreaterThan(0);
      // Hyphenated `story-10-NN`, matching the convention every other producer/sentinel literal in
      // this story uses (payload.ts:303, producer.ts:193-194, types.ts:85) — code review, 2026-08-05.
      expect(clause.owner).toMatch(/story-10-\d+/);
    }
  });
});

describe('Story 10.24 — VALIDITY_RULE_ORDER is the OMISSION mechanism (AC3, D4)', () => {
  const order: readonly string[] = VALIDITY_RULE_ORDER;

  it('carries NO held R7 clause id — the hold is ENFORCED by absence, not merely recorded', () => {
    for (const clause of R7_HELD_CLAUSES) {
      expect(order).not.toContain(clause.clauseId);
    }
  });

  it('carries NO R8 clause id — supplying contribution facts does NOT activate R8', () => {
    // R8's `all_of` needs `claim.death_classification` (claim-time, Epic 6, absent at member standing)
    // AND `contribution.compliance_percent` — which is NOT one of the five keys 10.24 supplies.
    expect(order).not.toContain(R8_CLAUSE_ID);
    expect(order.some((id) => id.includes('ninety-percent-rule'))).toBe(false);
  });
});

describe('Story 10.24 — the hold is FALSIFIABLE, not decorative (AC3)', () => {
  const supplied: readonly string[] = R7_SUPPLIED_FACT_KEYS;

  it("every held clause's blockedBy names a fact key this producer genuinely does NOT supply", () => {
    // Same vacuity guard as above: an empty `R7_HELD_CLAUSES` would satisfy this loop trivially.
    expect(R7_HELD_CLAUSES.length).toBe(2);
    for (const clause of R7_HELD_CLAUSES) {
      for (const key of clause.blockedBy) {
        expect(
          supplied.includes(key),
          `${clause.clauseId} claims to be blocked by "${key}", but the producer DOES supply it — the hold has outlived its reason and must be re-justified or lifted.`,
        ).toBe(false);
      }
    }
  });

  it('supplies ALL SEVEN engine contribution fact keys — the mechanization reaches its end state', () => {
    expect(supplied.length).toBe(7);
    // Every supplied key must be a real engine key (never an invented one the ladder cannot read).
    const engineKeys = new Set<string>([
      'contribution.total_count',
      'contribution.ever_contributed',
      'contribution.skips_current_year',
      'contribution.months_since_last',
      'contribution.r7a_restorations_used',
      'contribution.in_lapse',
      'contribution.personal_event_excuse_claimed',
    ]);
    for (const key of supplied) expect(engineKeys.has(key)).toBe(true);
    // ⚠ The `not.toContain('…personal_event_excuse_claimed')` line is GONE, not commented out: Story
    // 10.26 supplies it, and with it the LAST held fact. Every engine key now has a producer, so
    // `R7_HELD_FACTS` is empty — the first time this apparatus has reached its own end state.
    expect([...supplied].sort()).toEqual([...engineKeys].sort());
    expect(R7_HELD_FACTS.length).toBe(0);
  });

  it('the remaining holds are blocked by NON-FACTS — no producer can lift them', () => {
    // The honest end state, stated so nobody reads "R7_HELD_FACTS is empty" as "nothing is held".
    // R7(A)/(B) wait on Story 10.23's `member.joining_discipline_state` (a MEMBER fact, not a
    // `contribution.*` one) AND, beyond any story, the Trustee Panel's published Part 11 amendment
    // (Decision 2026-08-06-077). Neither is something this producer can supply.
    for (const clause of R7_HELD_CLAUSES) {
      for (const key of clause.blockedBy) expect(key.startsWith('contribution.')).toBe(false);
    }
    // ⚠ And the NEXT fact-hold has no mechanization at all: `contribution.compliance_percent` (R8)
    // is UNOWNED (`deferred-work.md`) and is not an `R7_CONTRIBUTION_FACT_KEYS` member, so nothing
    // in this file can notice if it stays dark. Escalation 3, recorded rather than absorbed.
    expect(supplied).not.toContain('contribution.compliance_percent');
  });

  it('R7(A) is STILL HELD after Story 10.25 supplied its restoration count (D6)', () => {
    // ⚠ The tempting moment, mechanized. Every story before 10.25 could say "R7(A) is dark because a
    // fact is missing". After 10.25 that sentence is HALF true — and half-true is how a normative
    // prohibition gets rationalised away. `prd.md:346` is unchanged and unconditional, and R7(A) has
    // THREE activation conditions, not two: `member.joining_discipline_state` (Story 10.23), AND the
    // Trustee Panel's PUBLISHED Part 11 amendment replacing the `total_count < 10` proxy population
    // (Decision 2026-08-06-077), which no story owns and no code change can satisfy.
    expect(supplied).toContain('contribution.r7a_restorations_used');
    expect(R7_HELD_CLAUSES.map((c) => String(c.clauseId))).toContain(
      'niy.contribution-discipline.r7-a',
    );
    expect([...R7_ACTIVATED_CLAUSE_IDS] as string[]).not.toContain(
      'niy.contribution-discipline.r7-a',
    );

    const r7a = R7_HELD_CLAUSES.find((c) => c.clauseId === 'niy.contribution-discipline.r7-a');
    // The hold was NARROWED to the one remaining fact, not deleted — deleting it (or activating r7-a)
    // to make the falsifiable-hold assertion above go green is the failure this apparatus exists to
    // catch ([[feedback_mechanization_split_commitment]]).
    expect(r7a?.blockedBy).toEqual(['member.joining_discipline_state']);
    expect(r7a?.owner).toBe('story-10-23');
  });
});
