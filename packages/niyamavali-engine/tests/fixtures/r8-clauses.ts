// Shared R8 clause fixtures — Story 4.3 tests.
//
// Contractual EXAMPLE payloads mirroring packages/domain/seed/niyamavali-v1-clauses.sql
// (the Story 4.3 R8 block). One source of truth for the pure scenario-matrix spec
// (r8-ladder.test.ts) and the live-DB integration spec (integration/r8-ladder.spec.ts) —
// they pin the fact-key names/types/semantics R8 depends on; they are NOT a mock of the
// future contribution/claim subsystems (whose producers are Epic 8/9 + Epic 6 claim intake).

import {
  R7_CONTRIBUTION_FACT_KEYS,
  R8_CLAIM_FACT_KEYS,
  R8_CLAUSE_IDS,
  R8_CONTRIBUTION_FACT_KEYS,
} from '../../src/index.js';

// The two shared R7 contribution keys R8 REUSES (not redefined) + the four net-new R8 keys.
const R7F = R7_CONTRIBUTION_FACT_KEYS; // TOTAL_COUNT, SKIPS_CURRENT_YEAR
const F = R8_CONTRIBUTION_FACT_KEYS; //   COMPLIANCE_PERCENT, PRIOR_PERIOD_FULL_COMPLIANCE
const CF = R8_CLAIM_FACT_KEYS; //         DEATH_CLASSIFICATION, MID_CONTRIBUTION_DEATH

/** The three R8 payloads keyed by clause_id (mirrors the seed). */
export const R8_PAYLOADS: Readonly<Record<string, Record<string, unknown>>> = {
  'niy.ninety-percent-rule.r8': {
    rule_code: 'R8',
    rule_kind: 'conditional',
    family: 'r8-ninety-percent',
    precedence: 30,
    on_pass: 'ninety_percent_met',
    on_fail: 'r8_not_applicable',
    all_of: [
      { op: 'fact_equals', fact: CF.DEATH_CLASSIFICATION, value: 'illness' },
      { op: 'fact_gte', fact: R7F.TOTAL_COUNT, min: 10 },
      { op: 'fact_gte', fact: F.COMPLIANCE_PERCENT, min: 90 },
    ],
    threshold_percent: 90,
    min_contributions: 10,
    policy_review_required: true,
    provisional: true,
  },
  'niy.ninety-percent-rule.r8-a': {
    rule_code: 'R8(A)',
    rule_kind: 'conditional',
    family: 'r8-ninety-percent',
    precedence: 40,
    on_pass: 'skip_allowance_granted',
    on_fail: 'r8_not_applicable',
    all_of: [
      { op: 'fact_equals', fact: CF.DEATH_CLASSIFICATION, value: 'illness' },
      { op: 'fact_gte', fact: R7F.TOTAL_COUNT, min: 10 },
      { op: 'fact_equals', fact: R7F.SKIPS_CURRENT_YEAR, value: 1 },
      { op: 'fact_equals', fact: F.PRIOR_PERIOD_FULL_COMPLIANCE, value: true },
    ],
    skips_allowed: 1,
    requires_prior_full_compliance: true,
    policy_review_required: true,
    provisional: true,
  },
  'niy.ninety-percent-rule.r8-b': {
    rule_code: 'R8(B)',
    rule_kind: 'conditional',
    family: 'r8-ninety-percent',
    precedence: 50,
    on_pass: 'mid_contribution_eligible',
    on_fail: 'r8_not_applicable',
    all_of: [
      { op: 'fact_equals', fact: CF.DEATH_CLASSIFICATION, value: 'illness' },
      { op: 'fact_equals', fact: CF.MID_CONTRIBUTION_DEATH, value: true },
    ],
    presumed_would_have_paid: true,
    policy_review_required: true,
    provisional: true,
  },
};

/** The seed's pre-allocated clause_version_ids, keyed by clause_id. */
export const R8_VERSION_IDS: Readonly<Record<string, string>> = {
  'niy.ninety-percent-rule.r8': '0e1c0002-0000-4000-8000-000000000002',
  'niy.ninety-percent-rule.r8-a': '0e1c000d-0000-4000-8000-00000000000d',
  'niy.ninety-percent-rule.r8-b': '0e1c000e-0000-4000-8000-00000000000e',
};

/**
 * A base fact set under which NO R8 sub-clause applies (every precondition fails). Death is
 * classified `accident` (fails the illness gate for all three) and the contribution/claim
 * facts are individually below-threshold — tests override just the facts a scenario needs.
 */
export const NO_R8_FACTS: Readonly<Record<string, unknown>> = {
  [CF.DEATH_CLASSIFICATION]: 'accident', //     illness gate: needs 'illness'
  [CF.MID_CONTRIBUTION_DEATH]: false, //        r8-b: needs === true
  [R7F.TOTAL_COUNT]: 5, //                      r8 / r8-a: need >= 10
  [R7F.SKIPS_CURRENT_YEAR]: 0, //               r8-a: needs === 1
  [F.COMPLIANCE_PERCENT]: 50, //                r8 base: needs >= 90
  [F.PRIOR_PERIOD_FULL_COMPLIANCE]: false, //   r8-a: needs === true
};

/** Sanity: the fixtures cover exactly the three family clause ids. */
export const R8_FIXTURE_CLAUSE_IDS = [...R8_CLAUSE_IDS];
