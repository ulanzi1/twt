// R7(G)'s place in the ladder — Story 10.26 (Task 4; AC6). PURE, DB-free.
//
// Activating R7(G) puts a FIFTH clause into a ladder whose pick decides which explanation a member
// sees. Two things could go wrong, and both are pinned here:
//
//   1. R7(G) DISPLACES an imposing clause's explanation. A member serving a 5-month lock-in opens
//      their record and reads "personal events do not excuse skips" INSTEAD of the restoration
//      package they are actually serving. Today that cannot happen — but only because of a seeded
//      integer (`precedence: 10`, the lowest in the family), and `precedence` is trustee-amendable
//      DATA ([[project_niyamavali_precedence_is_provenance]]). So it is pinned, with the WHY.
//
//   2. R7(G)-only produces a NEW restoration-package arm. It must not: it resolves through Story
//      10.25's EXISTING third arm, `no_consecutive_requirement`, changing only `clauseId` from
//      `null` to `…r7-g`. Same arm, same copy key, different provenance. There is no fourth arm.

import { evaluateLadder, R7_NOT_APPLICABLE, type ResolvedClause } from '@twt/niyamavali-engine';
import { ids } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import { deriveRestorationPackage, type ContributionFacts } from '../src/producer.js';
import { R7_ACTIVATED_CLAUSE_IDS, readConsecutiveRequired } from '../src/rules.js';
import { R7_PAYLOADS } from './fixtures/r7-clauses.js';

const AT = new Date('2026-08-06T00:00:00.000Z');
const R7_G = 'niy.contribution-discipline.r7-g';

/** The five ACTIVATED clauses, as the ladder receives them. */
function activatedClauses(): ResolvedClause[] {
  return R7_ACTIVATED_CLAUSE_IDS.map((clauseId, i) => ({
    clauseId: ids.clauseId(clauseId),
    clauseVersionId: ids.clauseVersionId(`0e1c000${i}-0000-4000-8000-00000000000${i}`),
    payload: R7_PAYLOADS[clauseId]!,
    benefitMechanism: 'pool' as const,
  }));
}

function ladderFor(facts: Record<string, number | boolean>) {
  return evaluateLadder(
    activatedClauses(),
    {
      pariwarId: ids.pariwarId('11111111-1111-4111-8111-111111111111'),
      memberId: ids.memberId('22222222-2222-4222-8222-222222222222'),
      memberState: 'active',
      facts,
      evaluatedAt: AT,
      resolvedClauseVersionIds: activatedClauses().map((c) => c.clauseVersionId),
    },
    R7_NOT_APPLICABLE,
  );
}

/** A member who has asserted, with no gap and no skips — R7(G) is the ONLY clause that can fire. */
const ASSERTED_ONLY = {
  'contribution.total_count': 12,
  'contribution.ever_contributed': true,
  'contribution.months_since_last': 0,
  'contribution.skips_current_year': 0,
  'contribution.in_lapse': false,
  'contribution.r7a_restorations_used': 0,
  'contribution.personal_event_excuse_claimed': true,
};

describe('AC6 — R7(G) carries the LOWEST precedence and can never displace an imposing clause', () => {
  it('the seeded R7 precedences order R7(G) below every other sub-clause', () => {
    const precedenceOf = (clauseId: string): number =>
      (R7_PAYLOADS[clauseId]!.precedence as number) ?? Number.NaN;
    const others = R7_ACTIVATED_CLAUSE_IDS.filter((id) => id !== R7_G);
    for (const id of others) {
      expect(
        precedenceOf(R7_G),
        `R7(G) out-ranks ${id}. If R7(G) ever wins the pick against an IMPOSING clause, the member's ` +
          `surfaced explanation becomes "personal events do not excuse skips" INSTEAD of the ` +
          `restoration package they are actually serving — the clause that changes nothing would ` +
          `hide the one that changes everything.`,
      ).toBeLessThan(precedenceOf(id));
    }
  });

  it('a member serving a restoration package who ALSO asserted still surfaces the IMPOSING clause', () => {
    // 13 missed opportunities + 2 skips ⇒ R7(C), R7(E) and R7(F) all fire, alongside R7(G).
    const ladder = ladderFor({
      ...ASSERTED_ONLY,
      'contribution.months_since_last': 13,
      'contribution.skips_current_year': 2,
      'contribution.in_lapse': true,
    });
    const applied = ladder.perClauseResults.filter((e) => e.applied).map((e) => e.clauseId).sort();
    // R7(G) genuinely APPLIED — it is evaluated, not suppressed.
    expect(applied).toContain(R7_G);
    // ...but the PICK is R7(C), the highest precedence (70), i.e. the package they are serving.
    expect(ladder.applicableClauseId).toBe('niy.contribution-discipline.r7-c');
  });

  it('R7(G) wins the pick ONLY when it is the only applied clause', () => {
    const ladder = ladderFor(ASSERTED_ONLY);
    expect(ladder.perClauseResults.filter((e) => e.applied).map((e) => e.clauseId)).toEqual([R7_G]);
    expect(ladder.applicableClauseId).toBe(R7_G);
    // Its outcome is the Niyamavali's answer, stated: no exemption.
    expect(ladder.applicableResult?.result.decision).toBe('no_exemption');
    // ...and the reason code the member's own record renders from (`interpretClause` builds
    // `rule.${decision}`; `ruleExplanationKey` prefixes `memberStatus.rule.`).
    expect(ladder.applicableResult?.reasonCode).toBe('rule.no_exemption');
  });

  it('a member who never asserted has NO R7(G) entry at all', () => {
    const ladder = ladderFor({ ...ASSERTED_ONLY, 'contribution.personal_event_excuse_claimed': false });
    expect(ladder.perClauseResults.filter((e) => e.applied)).toEqual([]);
    expect(ladder.applicableClauseId).toBeNull();
  });
});

describe('AC6 — the restorationPackage transition: same arm, different clauseId, NO fourth arm', () => {
  const facts = { currentOpenTakenRun: 0 } as ContributionFacts;

  it('R7(G)-only resolves to no_consecutive_requirement WITH its clauseId (was: clauseId null)', () => {
    // `readConsecutiveRequired` returns null for R7(G) — `{never_excuses: true}` prescribes no
    // consecutive requirement — which routes into Story 10.25's EXISTING third arm.
    const consecutiveRequired = readConsecutiveRequired(R7_PAYLOADS[R7_G]!);
    expect(consecutiveRequired).toBeNull();
    expect(deriveRestorationPackage(facts, { clauseId: R7_G, consecutiveRequired })).toEqual({
      status: 'no_consecutive_requirement',
      clauseId: R7_G,
    });
  });

  it('a member in NO restoration path still gets the SAME arm with a null clauseId', () => {
    // The transition this story causes, stated as a pair: the arm and the copy key are unchanged;
    // only the provenance moves from "no clause applied" to "R7(G) applied and prescribes nothing".
    expect(deriveRestorationPackage(facts, null)).toEqual({
      status: 'no_consecutive_requirement',
      clauseId: null,
    });
  });

  it('the arm vocabulary is UNCHANGED — Story 10.26 adds no fourth RestorationPackageState', () => {
    const arms = new Set(
      [
        deriveRestorationPackage(facts, null),
        deriveRestorationPackage(facts, { clauseId: R7_G, consecutiveRequired: null }),
        deriveRestorationPackage(facts, {
          clauseId: 'niy.contribution-discipline.r7-c',
          consecutiveRequired: 5,
        }),
      ].map((p) => p.status),
    );
    expect([...arms].sort()).toEqual(['no_consecutive_requirement', 'ok']);
  });
});
