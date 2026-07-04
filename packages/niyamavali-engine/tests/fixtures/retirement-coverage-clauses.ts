// Shared R12 retirement-coverage clause fixtures — Story 4.5 tests.
//
// A contractual EXAMPLE payload mirroring packages/domain/seed/niyamavali-v1-clauses.sql (the
// Story 4.5 R12 block). One source of truth for the pure scenario-matrix spec
// (retirement-coverage.test.ts) and the live-DB integration spec (integration/retirement-coverage.spec.ts) —
// they pin the fact-key names/types/semantics the rule depends on; they are NOT a mock of the future
// tenure/retirement producer (whose producer is the Story 4.6 Validity Service reading the Story 3.1
// signup event + the Story 3.9 `member_postings.is_retirement` anchor).
//
// LOAD-BEARING: R12 is `rule_kind:'computed'` — it COMPUTES a value (`granted_years`) rather than a
// boolean decision, and EXTENDS eligibility (never denies).

import { R12_CLAUSE_ID, R12_MEMBER_FACT_KEYS } from '../../src/index.js';

const MF = R12_MEMBER_FACT_KEYS; // VALID_MEMBERSHIP_YEARS, IS_RETIRED

/** The R12 computed payload (mirrors the seed's Story 4.5 block). */
export const R12_PAYLOAD: Readonly<Record<string, unknown>> = {
  rule_code: 'R12',
  title_en:
    'Retirement coverage extension (+1 year post-retirement per 5 years of valid membership; 15 years grants +3)',
  rule_kind: 'computed',
  computation: 'grant_ladder',
  inputs: { tenure_years: MF.VALID_MEMBERSHIP_YEARS, retirement_flag: MF.IS_RETIRED },
  params: { grant_every_years: 5, years_per_grant: 1, min_years: 5 },
  output_key: 'granted_years',
  retirement_output_key: 'is_retired',
  on_computed: 'retirement_coverage_computed',
  on_not_applicable: 'retirement_coverage_not_applicable',
  family: 'retirement-coverage',
  eligibility_extension: true,
  never_auto_deny: true,
  policy_review_required: true,
  provisional: true,
};

/** The R12 payload keyed by clause_id (single-clause family — mirrors the special-death fixture shape). */
export const RETIREMENT_COVERAGE_PAYLOADS: Readonly<Record<string, Record<string, unknown>>> = {
  [R12_CLAUSE_ID]: R12_PAYLOAD as Record<string, unknown>,
};

/** The seed's pre-allocated clause_version_id, keyed by clause_id. */
export const RETIREMENT_COVERAGE_VERSION_IDS: Readonly<Record<string, string>> = {
  [R12_CLAUSE_ID]: '0e1c0015-0000-4000-8000-000000000015',
};

/** The R12 clause_version_id (the single-clause family's pre-allocated id). */
export const R12_VERSION_ID = RETIREMENT_COVERAGE_VERSION_IDS[R12_CLAUSE_ID]!;

/**
 * A base fact set under which R12 is NOT applicable: not retired, zero valid-membership years.
 * Tests override just the facts a scenario needs (tenure integer + retirement flag).
 */
export const NO_RETIREMENT_FACTS: Readonly<Record<string, unknown>> = {
  [MF.VALID_MEMBERSHIP_YEARS]: 0, // grant ladder: below min_years → 0
  [MF.IS_RETIRED]: false, //         decision: not retired → not-applicable
};
