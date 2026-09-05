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
  // ⭐ Story 11b.3a. ⚠ `[]` in the BASE fixture on purpose — a claim whose bank details were never
  // collected is the 6.8 AC3 absence signal and must parse, and the two arms get their own cases.
  nomineeBankAccounts: [],
};

/**
 * ⭐ ONE PUBLIC NOMINEE ACCOUNT, as Story 11b.11 leaves it: the rank plus the name, and ⛔ nothing
 * else. `2026-09-04-190` cl.2 keeps `nominee_account_holder_name` at `public` and rules its rendered
 * label **"Nominee Name"**; `-190` cl.1 and `2026-09-04-191` cl.1 take everything else off.
 *
 * ⭐⛔ **TWO FIXTURES STOOD HERE — `FULL_ACCOUNT` AND `MASKED_ACCOUNT` — because the shape was a
 * `z.discriminatedUnion('masked', …)`.** The full arm carried `bankName` · `branch` ·
 * `accountHolderName` · `accountNumber` · `ifsc` · `vpa`; the masked arm carried `bankName` ·
 * `branch` · `accountNumberLast4` · `ifsc` and deliberately DROPPED the holder name and the VPA,
 * because `2026-08-28-160` cl.10(e) is a RETENTION list and a retention list is EXHAUSTIVE.
 * ⇒ `2026-09-04-191` **cl.2** then ruled the masked projection must ⛔ NOT drop the nominee name —
 * which AMENDS THE READING of cl.10(e)'s list, ⛔ it does not restate the clause as having always
 * said so — and with the coordinates withdrawn both arms reduced to this one shape and became
 * IDENTICAL. Story 11b.11 **D1(b)** collapsed the wire accordingly.
 * ⛔⛔ MASKING WAS ⛔ NOT DELETED (`-190` cl.4): the machinery and its own tests are untouched in
 * `@twt/domain`; it has ⛔ NO PUBLIC CONSUMER.
 */
const ACCOUNT = {
  accountRank: 1 as const,
  accountHolderName: 'A Holder',
};

const SECOND_ACCOUNT = {
  accountRank: 2 as const,
  accountHolderName: 'B Holder',
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

// ⭐⭐ STORY 11b.10 (AC1) — THE PARAMS ARE THE **OPAQUE PUBLIC ADDRESS TOKEN**, ⛔ no longer the
// sequential `P-YYYY-MM-###`. `2026-09-03-184` **(B)**, Trustee-ratified.
describe('the params', () => {
  it('accepts a uuid Pariwar and a bounded drive TOKEN', () => {
    expect(
      PublicSahyogVivranParams.safeParse({
        pariwarId: '00000000-0000-4000-8000-000000000000',
        driveToken: 'aBcDeFgHiJkLmNoPqRsTuV',
      }).success,
    ).toBe(true);
  });

  it('⛔ rejects an unbounded address at the schema boundary', () => {
    expect(
      PublicSahyogVivranParams.safeParse({
        pariwarId: '00000000-0000-4000-8000-000000000000',
        driveToken: 'x'.repeat(200),
      }).success,
    ).toBe(false);
  });

  it('⭐ does NOT pattern-match the token SHAPE, deliberately', () => {
    // ⚠⭐ THE GROUND CHANGED AT 11b.10 AND IS RESTATED RATHER THAN QUIETLY KEPT. This used to read
    // *"the canonical FORMAT is per-Pariwar configurable, so a regex here would silently 400 a
    // legitimate Pariwar whose format differs"*. ⭐ The parameter is no longer that identifier, so
    // that reason is gone — but the CONCLUSION is unchanged and now rests on something stronger: a
    // shape regex would SPLIT the refusal surface into *"wrong shape"* (400) and *"no such drive"*
    // (404), and that difference is itself an ENUMERATION ORACLE — precisely what AC1 removes.
    // ⇒ every malformed address must reach the read and come back as the SAME 404.
    expect(
      PublicSahyogVivranParams.safeParse({
        pariwarId: '00000000-0000-4000-8000-000000000000',
        driveToken: 'DRIVE/2026/09/003',
      }).success,
    ).toBe(true);
  });

  it('⛔⛔ REJECTS the bare canonical identifier as a param KEY — exactly ONE address form (Trap 3)', () => {
    // ⛔⛔ THE ASSERTION THAT FAILS THE MOMENT SOMEBODY RE-ADMITS THE OLD PARAMETER "for old links".
    // `.strict()` is what makes it a refusal rather than an ignored key — a route accepting EITHER
    // form has ⛔ not closed the walk, it has added a lock beside an open door.
    expect(
      PublicSahyogVivranParams.safeParse({
        pariwarId: '00000000-0000-4000-8000-000000000000',
        poolCanonicalIdentifier: 'P-2026-09-003',
      }).success,
    ).toBe(false);
    // ⛔ And not as an ADDITIONAL key beside a valid token either.
    expect(
      PublicSahyogVivranParams.safeParse({
        pariwarId: '00000000-0000-4000-8000-000000000000',
        driveToken: 'aBcDeFgHiJkLmNoPqRsTuV',
        poolCanonicalIdentifier: 'P-2026-09-003',
      }).success,
    ).toBe(false);
  });

  it('⭐ the RESPONSE still carries `poolCanonicalIdentifier` — RETAINED and RENDERED (cl.2)', () => {
    // ⛔ Trap 3 forbids the identifier being ADDRESSABLE, ⛔ not DISPLAYED. Deleting it would be a
    // different defect — it is the operational/audit key a family quotes to the helpline.
    expect(PublicSahyogVivranResponse.safeParse({ drive: ENTRY }).success).toBe(true);
    expect(ENTRY.poolCanonicalIdentifier).toBeTruthy();
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


// ══════════════════════════════════════════════════════════════════════════════════════════════
// ⭐⭐ STORY 11b.3a — THE NOMINEE BANK ACCOUNTS. AC4 IS A SHAPE, ⛔ NOT A CONVENTION.
// ══════════════════════════════════════════════════════════════════════════════════════════════
describe('PublicSahyogVivranNomineeAccount — ⭐⛔ the COORDINATES ARE UNREPRESENTABLE (11b.11)', () => {
  it('accepts the two EQUAL accounts, each carrying the name and nothing else', () => {
    expect(
      PublicSahyogVivranEntry.safeParse({
        ...ENTRY,
        nomineeBankAccounts: [ACCOUNT, SECOND_ACCOUNT],
      }).success,
    ).toBe(true);
  });

  it('⛔⛔ REJECTS every withdrawn key — ABSENT, ⛔ not `null`, and `.strict()` is what enforces it', () => {
    // ⭐⭐ THIS IS THE ASSERTION THE WHOLE STORY RESTS ON, and it is the same discipline `-165`
    // established for the old masked arm, applied to the whole shape: *"a single shape with
    // `accountNumber` beside `accountNumberLast4` would make that a CONVENTION — one a handler bug
    // can violate."* ⇒ the withdrawn keys are ⛔ NOT declared nullable and ⛔ not declared optional;
    // they do ⛔ not exist, so populating one is a PARSE ERROR rather than an ignored extra field.
    // ⛔ Do ⛔ not "fix" a failing handler by adding a key back here — each removal is a
    // Trustee-ratified ruling (`2026-09-04-190` cl.1, `2026-09-04-191` cl.1).
    const withdrawn: Record<string, unknown> = {
      accountNumber: '50100123456789',
      accountNumberLast4: '6789',
      ifsc: 'SBIN0001234',
      vpa: 'someone@upi',
      bankName: 'State Bank of India',
      branch: 'Vaishali',
      // ⛔ AND THE DISCRIMINATOR ITSELF (11b.11 D1(b)) — the wire may ⛔ not advertise a control it
      // no longer exercises. ⚠ Its ABSENCE is ⛔ not evidence masking was deleted; see the fixture.
      masked: false,
    };
    for (const [key, value] of Object.entries(withdrawn)) {
      expect(
        PublicSahyogVivranEntry.safeParse({
          ...ENTRY,
          nomineeBankAccounts: [{ ...ACCOUNT, [key]: value }],
        }).success,
        `\`${key}\` must be UNREPRESENTABLE on the public nominee account`,
      ).toBe(false);
    }
  });

  it('⛔ REJECTS a THIRD account and an out-of-range rank — the substrate admits exactly {1, 2}', () => {
    // ⚠ `.max(2)` is the SHAPE of a substrate whose composite PK `(claim_case_id, account_rank)` plus
    // its `{1, 2}` CHECK make three impossible. ⛔ It is NOT a page size and does NOT make this route
    // a collection.
    expect(
      PublicSahyogVivranEntry.safeParse({
        ...ENTRY,
        nomineeBankAccounts: [ACCOUNT, SECOND_ACCOUNT, ACCOUNT],
      }).success,
    ).toBe(false);
    expect(
      PublicSahyogVivranEntry.safeParse({
        ...ENTRY,
        nomineeBankAccounts: [{ ...ACCOUNT, accountRank: 3 }],
      }).success,
    ).toBe(false);
  });

  it('⭐ ACCEPTS an EMPTY array — bank details were never collected (the 6.8 AC3 absence signal)', () => {
    expect(PublicSahyogVivranEntry.safeParse({ ...ENTRY, nomineeBankAccounts: [] }).success).toBe(
      true,
    );
  });

  it('⭐ ACCEPTS a NULL name — a soft decrypt failure renders NOTHING, ⛔ never a placeholder', () => {
    expect(
      PublicSahyogVivranEntry.safeParse({
        ...ENTRY,
        nomineeBankAccounts: [{ ...ACCOUNT, accountHolderName: null }],
      }).success,
    ).toBe(true);
  });

  it('⛔ still refuses an EMPTY STRING where `null` is the "absent" value', () => {
    // ⚠ The `district` lesson: `''` would survive as a "present" value and render a visually BLANK
    // row where the page's own rule is to render NOTHING.
    expect(
      PublicSahyogVivranEntry.safeParse({
        ...ENTRY,
        nomineeBankAccounts: [{ ...ACCOUNT, accountHolderName: '' }],
      }).success,
    ).toBe(false);
  });
});
