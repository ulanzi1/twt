// R7(C)–(F) clause fixtures — Story 10.24 tests.
//
// The four ACTIVATED R7 sub-clause payloads, mirroring `packages/domain/seed/niyamavali-v1-clauses.sql`
// VERBATIM (rows `0e1c0008`–`0e1c000b`). Sibling of `r12-clause.ts`, and of
// `packages/niyamavali-engine/tests/fixtures/r7-clauses.ts` — that file cannot be imported here (it
// lives under another package's `tests/`, outside its published surface), so the payloads are mirrored
// rather than shared.
//
// ⚠ The two remaining HELD sub-clauses (R7(A)/(B)) are DELIBERATELY not among the ACTIVATED payloads.
// A test that cannot seed them cannot accidentally prove behaviour for a clause the service does not
// evaluate, and the absence is itself a small piece of the D4 omission discipline. R7(A) appears below
// for its DATA ALONE (see {@link R7A_PAYLOAD}); R7(B)'s payload lives in the seed and in the engine's
// own fixture, where it belongs.
//
// ⚠ Story 10.26 moved R7(G) OUT of the held set and INTO `R7_PAYLOADS`: its blocking fact is now
// supplied, it is ratified into §3.1, and it activates. That is a real change to this file's contract
// and not a relaxation of the discipline above — the omission mechanism is
// `R7_ACTIVATED_CLAUSE_IDS`, and R7(G) is now in it.
//
// These pin the fact-key names/types/semantics R7 depends on. They are NOT a mock of the contribution
// subsystem — the facts under test are produced by the real projection.

/**
 * The LIFECYCLE-ELIGIBILITY gate every activated R7 clause carries (round-2 review, Decision 3).
 *
 * ⚖ Ratified 2026-08-05 by BigDev: "Keep lifecycle eligibility in the registry. No scan-level
 * governance." Without it the Pariwar-wide candidate scan evaluates EVERY member row — including
 * `withdrawn` and `anonymized` — so a member who left in 2024 after contributing surfaces forever as a
 * suspension candidate, and the set grows monotonically with churn. The scan cannot filter this itself
 * without re-deriving member-state policy in the enumeration layer (what `member/read.ts` documents as
 * forbidden for the sibling roster read), and `violator-flags.ts` is frozen — so the gate belongs in
 * the clause DATA, which is also where a trustee can amend it.
 *
 * The three `pending-*` states are excluded as pre-membership; they have never contributed, so
 * `months_since_last` is omitted for them and the gap clauses would not fire anyway — the gate simply
 * makes that explicit rather than incidental.
 */
const R7_ELIGIBLE_MEMBER_STATES = {
  op: 'member_state_in',
  states: ['lock-in', 'active', 'active-in-grace', 'lapsed-unpaid'],
} as const;

/**
 * R7(A)'s payload — Story 10.25, and needed for its DATA ALONE (`restoration.consecutive_required`).
 *
 * ⚠ This does NOT weaken the D4 omission discipline the header states, and the reason is structural
 * rather than a promise: the omission mechanism is `VALIDITY_RULE_ORDER` / `R7_ACTIVATED_CLAUSE_IDS`,
 * and `evaluateAppliedR7ClauseSlots` passes ONLY the activated ids to the ladder. Seeding this clause
 * version therefore cannot cause R7(A) to be evaluated, memoized, audited, or to reach
 * `applicableNiyamavaliClauses[]` — the totality test and the D2 behavioural tests both still hold.
 * What it DOES do is make the restoration-accounting threshold resolvable, which is exactly the state
 * production is in (`niyamavali-v1-clauses.sql` row `0e1c0001` seeds all seven).
 *
 * Mirrors that seed row VERBATIM.
 */
export const R7A_PAYLOAD: Record<string, unknown> = {
  rule_code: 'R7(A)',
  title_en: 'Restoration after contribution lapse (member with under 10 lifetime contributions)',
  rule_kind: 'conditional',
  family: 'r7-contribution-discipline',
  precedence: 50,
  on_pass: 'restore_3_consecutive_one_time',
  on_fail: 'r7_not_applicable',
  all_of: [
    { op: 'fact_equals', fact: 'contribution.in_lapse', value: true },
    { op: 'fact_lt', fact: 'contribution.total_count', max: 10 },
    { op: 'fact_lt', fact: 'contribution.r7a_restorations_used', max: 2 },
  ],
  restoration: { consecutive_required: 3, lock_in_months: 0, one_time_only: true, lifetime_max: 2 },
  policy_review_required: true,
  provisional: true,
};

/** The five ACTIVATED R7 payloads keyed by clause_id (mirrors the seed rows 0e1c0008–0e1c000c). */
export const R7_PAYLOADS: Readonly<Record<string, Record<string, unknown>>> = {
  'niy.contribution-discipline.r7-c': {
    rule_code: 'R7(C)',
    title_en: 'Long-gap restoration (treat as new registration)',
    rule_kind: 'conditional',
    family: 'r7-contribution-discipline',
    precedence: 70,
    on_pass: 'treat_as_new_registration',
    on_fail: 'r7_not_applicable',
    all_of: [
      R7_ELIGIBLE_MEMBER_STATES,
      { op: 'fact_gte', fact: 'contribution.months_since_last', min: 12 },
    ],
    restoration: { consecutive_required: 5, lock_in_months: 3 },
    policy_review_required: true,
    provisional: true,
  },
  'niy.contribution-discipline.r7-d': {
    rule_code: 'R7(D)',
    title_en: 'Established member single-skip restoration (3-month lock-in plus catch-up)',
    rule_kind: 'conditional',
    family: 'r7-contribution-discipline',
    precedence: 30,
    on_pass: 'lockin_3mo_plus_catchup',
    on_fail: 'r7_not_applicable',
    all_of: [
      R7_ELIGIBLE_MEMBER_STATES,
      { op: 'fact_gte', fact: 'contribution.total_count', min: 10 },
      { op: 'fact_equals', fact: 'contribution.skips_current_year', value: 1 },
    ],
    restoration: { lock_in_months: 3, catch_up_required: true },
    policy_review_required: true,
    provisional: true,
  },
  'niy.contribution-discipline.r7-e': {
    rule_code: 'R7(E)',
    title_en: 'Established member multi-skip restoration (5-month lock-in complete all)',
    rule_kind: 'conditional',
    family: 'r7-contribution-discipline',
    precedence: 40,
    on_pass: 'lockin_5mo_complete_all',
    on_fail: 'r7_not_applicable',
    all_of: [
      R7_ELIGIBLE_MEMBER_STATES,
      { op: 'fact_gte', fact: 'contribution.total_count', min: 10 },
      { op: 'fact_gte', fact: 'contribution.skips_current_year', min: 2 },
    ],
    restoration: { lock_in_months: 5, complete_all: true },
    policy_review_required: true,
    provisional: true,
  },
  'niy.contribution-discipline.r7-f': {
    rule_code: 'R7(F)',
    title_en: 'Six-month gap restoration (5-month lock-in complete all)',
    rule_kind: 'conditional',
    family: 'r7-contribution-discipline',
    precedence: 45,
    on_pass: 'lockin_5mo_complete_all',
    on_fail: 'r7_not_applicable',
    all_of: [
      R7_ELIGIBLE_MEMBER_STATES,
      { op: 'fact_gte', fact: 'contribution.months_since_last', min: 6 },
    ],
    restoration: { lock_in_months: 5, complete_all: true },
    // ⚠ `false` since Decision 2026-08-06-080: the Trustee Panel RATIFIED R7(F) into
    // `docs/legal/niyamavali.md` §3.1/Appendix A, so the seed row dropped both review-status flags.
    // Mirrored here because this fixture's whole contract is to match the seed VERBATIM.
    policy_review_required: false,
    provisional: false,
  },
  // ── Story 10.26 — R7(G), ACTIVATED and no longer held (mirrors seed row 0e1c000c) ──────────────
  // ⚠ Note what it does NOT carry: no `member_state_in` gate (the assertion is meaningful from any
  // state a member can assert in) and, decisively, a `restoration` block that prescribes NOTHING.
  // `never_excuses: true` is the payload saying "this clause imposes no obligation" in its own words,
  // which is exactly what `imposesRestorationObligation` reads to keep R7(G) out of the violator-flag
  // channel (AC5/D4). Its precedence, 10, is the LOWEST in the family — so it can never displace an
  // imposing clause's explanation on a member who is actually serving a restoration package (AC6).
  'niy.contribution-discipline.r7-g': {
    rule_code: 'R7(G)',
    title_en: 'Personal events do not excuse contribution skips (non-exemption)',
    rule_kind: 'conditional',
    family: 'r7-contribution-discipline',
    precedence: 10,
    on_pass: 'no_exemption',
    on_fail: 'r7_not_applicable',
    all_of: [
      { op: 'fact_equals', fact: 'contribution.personal_event_excuse_claimed', value: true },
    ],
    restoration: { never_excuses: true },
    policy_review_required: false,
    provisional: false,
  },
};
