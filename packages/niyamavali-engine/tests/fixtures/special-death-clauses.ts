// Shared special-death + concealment clause fixtures — Story 4.4 tests.
//
// Contractual EXAMPLE payloads mirroring packages/domain/seed/niyamavali-v1-clauses.sql
// (the Story 4.4 special-death block + the amended r14 concealment clause). One source of truth
// for the pure scenario-matrix spec (special-death.test.ts) and the live-DB integration spec
// (integration/special-death.spec.ts) — they pin the fact-key names/types/semantics the family
// depends on; they are NOT a mock of the future claim/disclosure subsystems (whose producers are
// Epic 6 claim intake + Story 3.9 disclosure history + Story 3.5 IMA-list resolution).
//
// LOAD-BEARING (SM-1 C7): every family payload routes/flags — NO deny/ineligible slug anywhere.

import {
  CONCEALMENT_CLAUSE_ID,
  CONCEALMENT_FACT_KEYS,
  SPECIAL_DEATH_CLAIM_FACT_KEYS,
  SPECIAL_DEATH_CLAUSE_IDS,
} from '../../src/index.js';

const CF = SPECIAL_DEATH_CLAIM_FACT_KEYS; // DEATH_CLASSIFICATION, HONESTLY_DECLARED_PREEXISTING, …
const XF = CONCEALMENT_FACT_KEYS; //         CONCEALED_IMA_CONDITION_LINKED

/** The seven R5/R9 family payloads keyed by clause_id (mirrors the seed's Story 4.4 block). */
export const SPECIAL_DEATH_PAYLOADS: Readonly<Record<string, Record<string, unknown>>> = {
  'niy.special-death.r5-c-2': {
    rule_code: 'R5(C.2)',
    rule_kind: 'conditional',
    family: 'special-death',
    precedence: 20,
    on_pass: 'route_actual_cause_governs',
    on_fail: 'special_death_not_applicable',
    all_of: [{ op: 'fact_equals', fact: CF.HONESTLY_DECLARED_PREEXISTING, value: true }],
    eligibility_preserving: true,
    never_auto_deny: true,
    policy_review_required: true,
    provisional: true,
  },
  'niy.special-death.r5-d': {
    rule_code: 'R5(D)',
    rule_kind: 'conditional',
    family: 'special-death',
    precedence: 10,
    on_pass: 'route_core_team_discretion',
    on_fail: 'special_death_not_applicable',
    all_of: [{ op: 'fact_equals', fact: CF.LEGAL_CLAIM_ASSERTED, value: true }],
    discretionary: true,
    no_legal_claim: true,
    never_auto_deny: true,
    policy_review_required: true,
    provisional: true,
  },
  'niy.special-death.r5-e': {
    rule_code: 'R5(E)',
    rule_kind: 'conditional',
    family: 'special-death',
    precedence: 40,
    on_pass: 'route_state_trustee_review',
    on_fail: 'special_death_not_applicable',
    all_of: [{ op: 'fact_equals', fact: CF.MULTI_NOMINEE_DISPUTE, value: true }],
    funds_recoverable: true,
    never_auto_deny: true,
    policy_review_required: true,
    provisional: true,
  },
  'niy.special-death.r5-f': {
    rule_code: 'R5(F)',
    rule_kind: 'conditional',
    family: 'special-death',
    precedence: 30,
    on_pass: 'route_recovery_assistance',
    on_fail: 'special_death_not_applicable',
    all_of: [{ op: 'fact_equals', fact: CF.ERRONEOUS_EXCESS_TRANSFER, value: true }],
    no_guarantee: true,
    no_liability: true,
    never_auto_deny: true,
    policy_review_required: true,
    provisional: true,
  },
  'niy.special-death.r9': {
    rule_code: 'R9',
    rule_kind: 'conditional',
    family: 'special-death',
    precedence: 60,
    on_pass: 'route_r9_voting',
    on_fail: 'special_death_not_applicable',
    all_of: [{ op: 'fact_in', fact: CF.DEATH_CLASSIFICATION, values: ['suicide', 'murder'] }],
    voting_required: true,
    majority_required: true,
    never_auto_deny: true,
    policy_review_required: true,
    provisional: true,
  },
  'niy.special-death.r9-a': {
    rule_code: 'R9(A)',
    rule_kind: 'conditional',
    family: 'special-death',
    precedence: 50,
    on_pass: 'route_r9_voting',
    on_fail: 'special_death_not_applicable',
    all_of: [{ op: 'fact_equals', fact: CF.MULTIPLE_DEATHS_SAME_DATE, value: true }],
    voting_required: true,
    priority_basis: 'higher_contribution_record',
    never_auto_deny: true,
    policy_review_required: true,
    provisional: true,
  },
  'niy.special-death.r9-suicide-murder': {
    rule_code: 'R9(Mar-2025)',
    rule_kind: 'conditional',
    family: 'special-death',
    precedence: 80,
    on_pass: 'route_r9_voting',
    on_fail: 'special_death_not_applicable',
    all_of: [
      { op: 'fact_in', fact: CF.DEATH_CLASSIFICATION, values: ['suicide', 'murder'] },
      { op: 'fact_equals', fact: CF.NOMINEE_ACCUSED, value: true },
    ],
    exclusion_candidate: true,
    voting_required: true,
    never_auto_deny: true,
    policy_review_required: true,
    provisional: true,
  },
};

/** The R14 concealment payload (amended in place — the rule + the preserved ack fields coexist). */
export const CONCEALMENT_PAYLOAD: Readonly<Record<string, unknown>> = {
  rule_code: 'R14',
  rule_kind: 'conditional',
  on_pass: 'route_state_trustee_review',
  on_fail: 'concealment_not_applicable',
  all_of: [
    {
      op: 'fact_equals',
      fact: XF.CONCEALED_IMA_CONDITION_LINKED,
      value: true,
      flag_if_true: 'concealment_review_required',
    },
  ],
  ack_text_en: 'I understand that if I conceal an IMA-listed condition…',
  ack_text_hi: 'मैं समझता/समझती हूँ…',
  never_auto_deny: true,
  policy_review_required: true,
  provisional: true,
};

/** The seed's pre-allocated clause_version_ids, keyed by clause_id. */
export const SPECIAL_DEATH_VERSION_IDS: Readonly<Record<string, string>> = {
  'niy.special-death.r5-c-2': '0e1c000f-0000-4000-8000-00000000000f',
  'niy.special-death.r5-d': '0e1c0010-0000-4000-8000-000000000010',
  'niy.special-death.r5-e': '0e1c0011-0000-4000-8000-000000000011',
  'niy.special-death.r5-f': '0e1c0012-0000-4000-8000-000000000012',
  'niy.special-death.r9': '0e1c0013-0000-4000-8000-000000000013',
  'niy.special-death.r9-a': '0e1c0014-0000-4000-8000-000000000014',
  'niy.special-death.r9-suicide-murder': '0e1c0003-0000-4000-8000-000000000003',
};

/** The R14 concealment clause_version_id (amended in place — same id as the Story 3.5 seed). */
export const CONCEALMENT_VERSION_ID = '0e1c0005-0000-4000-8000-000000000005';

/**
 * A base fact set under which NO special-death sub-clause applies (every precondition fails).
 * Death is `natural` (fails R9 / Mar-2025), every boolean scenario fact is false, and concealment
 * is false — tests override just the facts a scenario needs.
 */
export const NO_SPECIAL_DEATH_FACTS: Readonly<Record<string, unknown>> = {
  [CF.DEATH_CLASSIFICATION]: 'natural', //        R9 / Mar-2025: need ∈ {suicide, murder}
  [CF.HONESTLY_DECLARED_PREEXISTING]: false, //   r5-c-2: needs === true
  [CF.LEGAL_CLAIM_ASSERTED]: false, //            r5-d: needs === true
  [CF.MULTI_NOMINEE_DISPUTE]: false, //           r5-e: needs === true
  [CF.ERRONEOUS_EXCESS_TRANSFER]: false, //       r5-f: needs === true
  [CF.NOMINEE_ACCUSED]: false, //                 Mar-2025: needs === true
  [CF.MULTIPLE_DEATHS_SAME_DATE]: false, //       r9-a: needs === true
  [XF.CONCEALED_IMA_CONDITION_LINKED]: false, //  r14: needs === true
};

/** Sanity: the fixtures cover exactly the seven family clause ids. */
export const SPECIAL_DEATH_FIXTURE_CLAUSE_IDS = [...SPECIAL_DEATH_CLAUSE_IDS];

/** Re-export the concealment id for the specs (its own single-clause family). */
export const CONCEALMENT_FIXTURE_CLAUSE_ID = CONCEALMENT_CLAUSE_ID;
