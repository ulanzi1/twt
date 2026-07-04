// R12 clause payload fixture for the validity-service live-DB spec — Story 4.6.
//
// A contractual EXAMPLE mirroring packages/domain/seed/niyamavali-v1-clauses.sql (the Story 4.5 R12
// block) + the engine's own tests/fixtures/retirement-coverage-clauses.ts. The service does NOT mock
// the producer — it DERIVES `member.valid_membership_years`/`member.is_retired` from real seeded events
// + postings; this fixture only pins the clause the engine interprets.

/** The R12 computed payload (the grant ladder: +1 year per 5 valid years; min 5). */
export const R12_PAYLOAD: Readonly<Record<string, unknown>> = {
  rule_code: 'R12',
  title_en: 'Retirement coverage extension (+1 year post-retirement per 5 years of valid membership)',
  rule_kind: 'computed',
  computation: 'grant_ladder',
  inputs: { tenure_years: 'member.valid_membership_years', retirement_flag: 'member.is_retired' },
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
