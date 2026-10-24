// packages/contracts/src/memorial/vocab.ts
//
// The family memorial's WIRE vocabularies (Story 11b.4 — `#decision-2026-10-24-398`). ⚠ BY VALUE: a contracts source file
// that reaches the mobile bundle MUST NOT import `@twt/domain` (pg would ride into Metro —
// [[project_contracts_domain_bundle_boundary]]). `tests/memorial.test.ts` pins every tuple EQUAL to the domain's
// (`packages/domain/src/memorial/{vocab,status}.ts`), which generate the pgEnums — a drift fails there, ⛔ in production.

export const MEMORIAL_REVIEW_ACTIONS = ['approved', 'approved_with_omissions', 'not_approved'] as const;
export type MemorialReviewAction = (typeof MEMORIAL_REVIEW_ACTIONS)[number];

/** The four grounds and ⛔ no others (`-391` Confirm 2 A). */
export const MEMORIAL_REVIEW_REASONS = [
  'attacks_someone_named',
  'accuses_someone_of_wrongdoing',
  'against_the_law',
  'identifies_a_child',
] as const;
export type MemorialReviewReason = (typeof MEMORIAL_REVIEW_REASONS)[number];

export const MEMORIAL_WITHDRAWAL_ACTORS = ['family', 'trust'] as const;
export type MemorialWithdrawalActor = (typeof MEMORIAL_WITHDRAWAL_ACTORS)[number];

export const MEMORIAL_OMISSION_FIELDS = ['body', 'altText'] as const;
export type MemorialOmissionField = (typeof MEMORIAL_OMISSION_FIELDS)[number];

/** The derived state (MA10). ⚠ The wire key is `memorialState` — ⛔ never `status`. */
export const MEMORIAL_STATES = [
  'none',
  'with_the_trust',
  'approved',
  'approved_with_omissions',
  'not_approved',
  'withdrawn',
  'approval_withdrawn',
] as const;
export type MemorialState = (typeof MEMORIAL_STATES)[number];

/** One part the Trust left out: `[start, end)` UTF-16 offsets into the VERBATIM field, with its own reason (MA6). */
export interface MemorialOmission {
  readonly field: MemorialOmissionField;
  readonly start: number;
  readonly end: number;
  readonly reason: MemorialReviewReason;
}
