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

import { R7_CLAUSE_IDS } from '@twt/niyamavali-engine';
import { describe, expect, it } from 'vitest';

import { R7_SUPPLIED_FACT_KEYS } from '../src/producer.js';
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

  it('activates EXACTLY R7(C)/(D)/(E)/(F) — the four gated only on the five supplied facts', () => {
    expect([...activated].sort()).toEqual([
      'niy.contribution-discipline.r7-c',
      'niy.contribution-discipline.r7-d',
      'niy.contribution-discipline.r7-e',
      'niy.contribution-discipline.r7-f',
    ]);
  });

  it('holds EXACTLY R7(A)/(B)/(G) — each naming its blocking fact(s) and owner', () => {
    expect([...held].sort()).toEqual([
      'niy.contribution-discipline.r7-a',
      'niy.contribution-discipline.r7-b',
      'niy.contribution-discipline.r7-g',
    ]);
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
    for (const clause of R7_HELD_CLAUSES) {
      for (const key of clause.blockedBy) {
        expect(
          supplied.includes(key),
          `${clause.clauseId} claims to be blocked by "${key}", but the producer DOES supply it — the hold has outlived its reason and must be re-justified or lifted.`,
        ).toBe(false);
      }
    }
  });

  it('supplies EXACTLY five of the engine seven contribution fact keys', () => {
    expect(supplied.length).toBe(5);
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
    expect(supplied).not.toContain('contribution.r7a_restorations_used');
    expect(supplied).not.toContain('contribution.personal_event_excuse_claimed');
  });
});
