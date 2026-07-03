// Shared R7 clause fixtures — Story 4.2 tests.
//
// Contractual EXAMPLE payloads mirroring packages/domain/seed/niyamavali-v1-clauses.sql.
// One source of truth for the pure scenario-matrix spec (r7-ladder.test.ts) and the live-DB
// integration spec (integration/r7-ladder.spec.ts) — they pin the fact-key names/types/
// semantics R7 depends on; they are NOT a mock of the future contribution subsystem.

import { R7_CLAUSE_IDS, R7_CONTRIBUTION_FACT_KEYS } from '../../src/index.js';

const F = R7_CONTRIBUTION_FACT_KEYS;

/** The seven R7 payloads keyed by clause_id (mirrors the seed). */
export const R7_PAYLOADS: Readonly<Record<string, Record<string, unknown>>> = {
  'niy.contribution-discipline.r7-a': {
    rule_code: 'R7(A)',
    rule_kind: 'conditional',
    family: 'r7-contribution-discipline',
    precedence: 50,
    on_pass: 'restore_3_consecutive_one_time',
    on_fail: 'r7_not_applicable',
    all_of: [
      { op: 'fact_equals', fact: F.IN_LAPSE, value: true },
      { op: 'fact_lt', fact: F.TOTAL_COUNT, max: 10 },
      { op: 'fact_lt', fact: F.R7A_RESTORATIONS_USED, max: 2 },
    ],
    restoration: { consecutive_required: 3, lock_in_months: 0, one_time_only: true, lifetime_max: 2 },
    policy_review_required: true,
    provisional: true,
  },
  'niy.contribution-discipline.r7-b': {
    rule_code: 'R7(B)',
    rule_kind: 'conditional',
    family: 'r7-contribution-discipline',
    precedence: 60,
    on_pass: 'restore_5_consecutive_plus_lockin',
    on_fail: 'r7_not_applicable',
    all_of: [{ op: 'fact_equals', fact: F.EVER_CONTRIBUTED, value: false }],
    restoration: { consecutive_required: 5, lock_in_months: 3, core_team_recommendation: true },
    policy_review_required: true,
    provisional: true,
  },
  'niy.contribution-discipline.r7-c': {
    rule_code: 'R7(C)',
    rule_kind: 'conditional',
    family: 'r7-contribution-discipline',
    precedence: 70,
    on_pass: 'treat_as_new_registration',
    on_fail: 'r7_not_applicable',
    all_of: [{ op: 'fact_gte', fact: F.MONTHS_SINCE_LAST, min: 12 }],
    restoration: { consecutive_required: 5, lock_in_months: 3 },
    policy_review_required: true,
    provisional: true,
  },
  'niy.contribution-discipline.r7-d': {
    rule_code: 'R7(D)',
    rule_kind: 'conditional',
    family: 'r7-contribution-discipline',
    precedence: 30,
    on_pass: 'lockin_3mo_plus_catchup',
    on_fail: 'r7_not_applicable',
    all_of: [
      { op: 'fact_gte', fact: F.TOTAL_COUNT, min: 10 },
      { op: 'fact_equals', fact: F.SKIPS_CURRENT_YEAR, value: 1 },
    ],
    restoration: { lock_in_months: 3, catch_up_required: true },
    policy_review_required: true,
    provisional: true,
  },
  'niy.contribution-discipline.r7-e': {
    rule_code: 'R7(E)',
    rule_kind: 'conditional',
    family: 'r7-contribution-discipline',
    precedence: 40,
    on_pass: 'lockin_5mo_complete_all',
    on_fail: 'r7_not_applicable',
    all_of: [
      { op: 'fact_gte', fact: F.TOTAL_COUNT, min: 10 },
      { op: 'fact_gte', fact: F.SKIPS_CURRENT_YEAR, min: 2 },
    ],
    restoration: { lock_in_months: 5, complete_all: true },
    policy_review_required: true,
    provisional: true,
  },
  'niy.contribution-discipline.r7-f': {
    rule_code: 'R7(F)',
    rule_kind: 'conditional',
    family: 'r7-contribution-discipline',
    precedence: 45,
    on_pass: 'lockin_5mo_complete_all',
    on_fail: 'r7_not_applicable',
    all_of: [{ op: 'fact_gte', fact: F.MONTHS_SINCE_LAST, min: 6 }],
    restoration: { lock_in_months: 5, complete_all: true },
    policy_review_required: true,
    provisional: true,
  },
  'niy.contribution-discipline.r7-g': {
    rule_code: 'R7(G)',
    rule_kind: 'conditional',
    family: 'r7-contribution-discipline',
    precedence: 10,
    on_pass: 'no_exemption',
    on_fail: 'r7_not_applicable',
    all_of: [{ op: 'fact_equals', fact: F.PERSONAL_EVENT_EXCUSE_CLAIMED, value: true }],
    restoration: { never_excuses: true },
    policy_review_required: true,
    provisional: true,
  },
};

/** The seed's pre-allocated clause_version_ids, keyed by clause_id. */
export const R7_VERSION_IDS: Readonly<Record<string, string>> = {
  'niy.contribution-discipline.r7-a': '0e1c0001-0000-4000-8000-000000000001',
  'niy.contribution-discipline.r7-b': '0e1c0007-0000-4000-8000-000000000007',
  'niy.contribution-discipline.r7-c': '0e1c0008-0000-4000-8000-000000000008',
  'niy.contribution-discipline.r7-d': '0e1c0009-0000-4000-8000-000000000009',
  'niy.contribution-discipline.r7-e': '0e1c000a-0000-4000-8000-00000000000a',
  'niy.contribution-discipline.r7-f': '0e1c000b-0000-4000-8000-00000000000b',
  'niy.contribution-discipline.r7-g': '0e1c000c-0000-4000-8000-00000000000c',
};

/** A base fact set under which NO R7 sub-clause applies (every precondition fails). */
export const NO_R7_FACTS: Readonly<Record<string, unknown>> = {
  [F.IN_LAPSE]: false, //                r7-a: needs in_lapse === true
  [F.TOTAL_COUNT]: 5, //                 r7-d/e: need >= 10
  [F.EVER_CONTRIBUTED]: true, //         r7-b: needs === false
  [F.MONTHS_SINCE_LAST]: 0, //           r7-c: needs >= 12 · r7-f: needs >= 6
  [F.SKIPS_CURRENT_YEAR]: 0, //          r7-d: needs === 1 · r7-e: needs >= 2
  [F.R7A_RESTORATIONS_USED]: 0,
  [F.PERSONAL_EVENT_EXCUSE_CLAIMED]: false, // r7-g: needs === true
};

/** Sanity: the fixtures cover exactly the seven family clause ids. */
export const R7_FIXTURE_CLAUSE_IDS = [...R7_CLAUSE_IDS];
