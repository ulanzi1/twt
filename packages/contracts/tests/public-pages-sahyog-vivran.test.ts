// The per-claim Sahyog Vivran DTO's SHAPE TEETH — Story 11b.3 (Task 3; AC4).
//
// ⭐⭐ THE CONFIRMED-ONLY INVARIANT ENCODED AS A **SHAPE**, mirroring
// `contributions/pool-contributor-list.ts`'s existing teeth: *"There is DELIBERATELY NO `status` /
// `yellow` / `attested` / `utr` / `pending`-member-identity field anywhere in this shape … Adding any
// of them is the one change this contract exists to forbid."*
//
// ⚠ A SHAPE TEST THAT ONLY ASSERTS THE HAPPY PATH IS DECOY TEETH. Every block below has a NEGATIVE
// half: the parse must REJECT the thing the invariant forbids, ⛔ not merely accept the thing it
// permits ([[feedback_gate_scope_semantic_coverage]]).

import { describe, expect, it } from 'vitest';

import {
  PublicSahyogVivranEntry,
  PublicSahyogVivranParams,
  PublicSahyogVivranQuery,
  PublicSahyogVivranResponse,
  SAHYOG_VIVRAN_PROHIBITED_KEYS,
} from '../src/public-pages/sahyog-vivran.js';

const ENTRY = {
  poolLetterCode: 'C',
  poolCanonicalIdentifier: 'P-2026-09-003',
  driveStatus: 'archive' as const,
  closedAt: '2026-09-01T18:45:00.000Z',
  district: 'Lucknow',
  confirmedContributionCount: 137,
  fundingOutcome: 'fully_funded' as const,
  appealReversal: null,
};

describe('PublicSahyogVivranEntry — the happy path', () => {
  it('accepts a settled drive with no appeal reversal', () => {
    expect(PublicSahyogVivranEntry.safeParse(ENTRY).success).toBe(true);
  });

  it('accepts a still-collecting drive: null closedAt, null outcome', () => {
    // ⚠ Both nulls are LOAD-BEARING, ⛔ not laxity: there is no close instant to state, and the
    // surface says NOTHING rather than estimating an outcome (AC3).
    const parsed = PublicSahyogVivranEntry.safeParse({
      ...ENTRY,
      driveStatus: 'collecting',
      closedAt: null,
      fundingOutcome: null,
    });
    expect(parsed.success).toBe(true);
  });

  it('accepts a full appeal-reversal lineage', () => {
    const parsed = PublicSahyogVivranEntry.safeParse({
      ...ENTRY,
      appealReversal: {
        reversedAtStage: 2,
        dispositionCategory: 'procedural_correction',
        reversedAt: '2026-08-20T05:00:00.000Z',
      },
    });
    expect(parsed.success).toBe(true);
  });
});

describe('⭐⭐ AC4 — the shape REJECTS every prohibited key', () => {
  // ⛔ Driven off the EXPORTED list rather than restated here, so the prohibition and the test cannot
  // drift: adding a key to `SAHYOG_VIVRAN_PROHIBITED_KEYS` immediately demands the shape refuse it.
  for (const key of SAHYOG_VIVRAN_PROHIBITED_KEYS) {
    it(`⛔ rejects an added \`${key}\` key`, () => {
      const parsed = PublicSahyogVivranEntry.safeParse({ ...ENTRY, [key]: 'green' });
      expect(parsed.success).toBe(false);
    });
  }

  it('⭐ names `status` among them — which is WHY the lifecycle field is `driveStatus`', () => {
    // ⚠ A key called `status` on a surface whose subject is CONTRIBUTIONS reads as a contribution
    // status pill, which is the yellow/attested door 8.3 and 9.5 closed STRUCTURALLY. The drive's
    // lifecycle standing is a different thing, and the naming keeps the two unconfusable.
    expect([...SAHYOG_VIVRAN_PROHIBITED_KEYS]).toContain('status');
    expect(Object.keys(ENTRY)).toContain('driveStatus');
    expect(Object.keys(ENTRY)).not.toContain('status');
  });

  it('⛔ rejects ANY unknown key — `.strict()`, ⛔ not a curated deny-list', () => {
    // ⚠ The named list above is documentation with teeth; `.strict()` is the actual guarantee. A
    // deny-list alone would let `contributionState` or `pillColour` through.
    expect(PublicSahyogVivranEntry.safeParse({ ...ENTRY, somethingNew: 1 }).success).toBe(false);
  });
});

describe('⭐⭐ the shape carries NO rupee figure and NO person (D1(b), the D6(b) split)', () => {
  it('⛔ rejects an amount field, under every name it might arrive as', () => {
    // `amountRaisedInr = confirmedCount × fixedAmount` is SHIPPED and ruled canonical, and D1(b)
    // ruled it CONSUMED — ⛔ but behind the `@twt/ui` fence this story does not lift, so it lands at
    // 11b.3b. ⛔ D1(c) — re-deriving the multiplication — is REFUSED.
    for (const key of ['amountRaisedInr', 'amountRaised', 'totalAmount', 'fixedAmount', 'rosterSize']) {
      expect(PublicSahyogVivranEntry.safeParse({ ...ENTRY, [key]: 1000 }).success).toBe(false);
    }
  });

  it('⛔ rejects any person-bearing field', () => {
    for (const key of [
      'deceasedMemberName',
      'contributorName',
      'contributors',
      'verifierName',
      'nomineeName',
      'nomineeAccountNumber',
      'memberId',
      'deceasedMemberId',
      'claimCaseId',
      'poolId',
    ]) {
      expect(PublicSahyogVivranEntry.safeParse({ ...ENTRY, [key]: 'x' }).success).toBe(false);
    }
  });

  it('⛔ rejects a target / expected-total / percentage / shortfall companion to the outcome', () => {
    // `classifyCycleOutcome` QUARANTINES the target inside the domain read and only the opaque enum
    // leaves it; this shape is the second place that quarantine is enforced (AC3).
    for (const key of ['expectedTotal', 'targetAmount', 'confirmedPercentage', 'shortfall']) {
      expect(PublicSahyogVivranEntry.safeParse({ ...ENTRY, [key]: 42 }).success).toBe(false);
    }
  });
});

describe('the bounded unions are BOUNDED', () => {
  it('⛔ rejects an internal lifecycle token as a drive status', () => {
    // The internal words must never cross the public boundary (`2026-08-21-144` cl.8 — the `lock-in`
    // leak `/members` had).
    for (const internal of ['spawned', 'live', 'closed', 'settled']) {
      expect(PublicSahyogVivranEntry.safeParse({ ...ENTRY, driveStatus: internal }).success).toBe(
        false,
      );
    }
  });

  it('⛔ rejects an out-of-range appeal stage', () => {
    for (const stage of [0, 4, 7, '2']) {
      const parsed = PublicSahyogVivranEntry.safeParse({
        ...ENTRY,
        appealReversal: {
          reversedAtStage: stage,
          dispositionCategory: 'procedural_correction',
          reversedAt: '2026-08-20T05:00:00.000Z',
        },
      });
      expect(parsed.success).toBe(false);
    }
  });

  it('⛔⛔ rejects FREE TEXT in the disposition slot — the one that matters most', () => {
    // ⚠ The disposition tag is the ONLY thing about an appeal's substance that may ever be public.
    // The rationale TEXT and the REVIEWER IDENTITY live on the decision event's Tier-1 metadata row.
    // An unbounded string here is precisely how free text would reach a public page.
    const parsed = PublicSahyogVivranEntry.safeParse({
      ...ENTRY,
      appealReversal: {
        reversedAtStage: 2,
        dispositionCategory: 'the verifier admitted he had misread the ration card',
        reversedAt: '2026-08-20T05:00:00.000Z',
      },
    });
    expect(parsed.success).toBe(false);
  });

  it('⛔ rejects a rationale or reviewer field added beside the lineage', () => {
    for (const key of ['rationale', 'reviewerName', 'reviewerId', 'decisionNote']) {
      const parsed = PublicSahyogVivranEntry.safeParse({
        ...ENTRY,
        appealReversal: {
          reversedAtStage: 2,
          dispositionCategory: 'procedural_correction',
          reversedAt: '2026-08-20T05:00:00.000Z',
          [key]: 'x',
        },
      });
      expect(parsed.success).toBe(false);
    }
  });

  it('⛔ rejects an EMPTY-STRING district — `null` is the "no posting row" value', () => {
    expect(PublicSahyogVivranEntry.safeParse({ ...ENTRY, district: '' }).success).toBe(false);
    expect(PublicSahyogVivranEntry.safeParse({ ...ENTRY, district: null }).success).toBe(true);
  });

  it('⛔ rejects a negative or fractional confirmed count', () => {
    expect(PublicSahyogVivranEntry.safeParse({ ...ENTRY, confirmedContributionCount: -1 }).success).toBe(false);
    expect(PublicSahyogVivranEntry.safeParse({ ...ENTRY, confirmedContributionCount: 1.5 }).success).toBe(false);
  });
});

describe('the query is EMPTY and strict — which is WHY controls 2 and 3 are N/A (D11(a))', () => {
  it('accepts nothing at all', () => {
    expect(PublicSahyogVivranQuery.safeParse({}).success).toBe(true);
  });

  it('⛔ rejects `page` and `limit` — there is no collection to page', () => {
    expect(PublicSahyogVivranQuery.safeParse({ page: 1 }).success).toBe(false);
    expect(PublicSahyogVivranQuery.safeParse({ limit: 50 }).success).toBe(false);
  });

  it('⛔ rejects every export affordance — `?format=csv` is a 400, ⛔ not an ignored parameter', () => {
    for (const q of [{ format: 'csv' }, { all: '1' }, { name: 'Sharma' }]) {
      expect(PublicSahyogVivranQuery.safeParse(q).success).toBe(false);
    }
  });
});

describe('the params', () => {
  it('accepts a uuid Pariwar and a bounded identifier', () => {
    expect(
      PublicSahyogVivranParams.safeParse({
        pariwarId: '00000000-0000-4000-8000-000000000000',
        poolCanonicalIdentifier: 'P-2026-09-003',
      }).success,
    ).toBe(true);
  });

  it('⛔ rejects an unbounded identifier at the schema boundary', () => {
    expect(
      PublicSahyogVivranParams.safeParse({
        pariwarId: '00000000-0000-4000-8000-000000000000',
        poolCanonicalIdentifier: 'x'.repeat(200),
      }).success,
    ).toBe(false);
  });

  it('⭐ does NOT pattern-match the canonical FORMAT, deliberately', () => {
    // The format is per-Pariwar configurable, so a regex here would silently 400 a legitimate
    // Pariwar whose format differs. The read's exact-equality lookup refuses an unknown identifier,
    // and refuses it as a 404 — ⛔ never as a distinguishable "malformed" error.
    expect(
      PublicSahyogVivranParams.safeParse({
        pariwarId: '00000000-0000-4000-8000-000000000000',
        poolCanonicalIdentifier: 'DRIVE/2026/09/003',
      }).success,
    ).toBe(true);
  });
});

describe('the response is SINGLE-ITEM', () => {
  it('accepts `{ drive }` and ⛔ rejects a collection shape', () => {
    expect(PublicSahyogVivranResponse.safeParse({ drive: ENTRY }).success).toBe(true);
    // ⚠⛔ THERE IS DELIBERATELY NO `items` KEY: Story 1.14's forced-pagination guard recognises a
    // collection GET by a top-level array OR that literal key, so naming anything here `items` would
    // make an UNPAGINATED single-item route look like an unbounded collection to the guard.
    expect(PublicSahyogVivranResponse.safeParse({ items: [ENTRY] }).success).toBe(false);
    expect(
      PublicSahyogVivranResponse.safeParse({ drive: ENTRY, page: 1, limit: 25, total: 1 }).success,
    ).toBe(false);
  });
});
