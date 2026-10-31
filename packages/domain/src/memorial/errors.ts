// The family memorial's error codes (Story 11b.4 — the "Named identifiers" table). ONE source for the API's error bodies,
// the api-client's typed refusals and the app's copy keys. ⛔ Never invent a synonym.
//
// Member codes — every refusal is a Pattern-4 message in the app (what happened · what to do · helpline); ⛔ never a
// refusal that clears the family's draft. `memorial.not_found` is the ONE neutral 404 (the switch off, an id that is ⛔
// theirs — Trap 8). Review codes — `memorial_review.not_found` is the one neutral 404 INSIDE a Pariwar the reviewer holds.

export const MEMORIAL_MEMBER_ERROR_CODES = [
  'memorial.not_found',
  // Missing, or not of the storable shape (`MEMORIAL_SEND_IDEMPOTENCY_KEY_PATTERN`). ⛔ `memorial.idempotency_in_progress`:
  // retired by migration 0183 (the key lives on the submission row — a same-key Send in flight waits on the pool lock and
  // then replays, so there is no "in progress" answer).
  'memorial.idempotency_key_required',
  'memorial.field_not_allowed',
  'memorial.duplicate_field',
  'memorial.field_too_long',
  'memorial.body_blank',
  'memorial.body_too_long',
  'memorial.alt_text_required',
  'memorial.alt_text_too_long',
  'memorial.photo_type',
  'memorial.photo_unreadable',
  'memorial.photo_too_large',
  'memorial.photo_conflict',
  'memorial.no_previous_photo',
  // Story 11b.5a — the Send's `kinship` part is not a valid family list (the one schema, or a tick with ⛔ no photo).
  'memorial.kinship_invalid',
  'memorial.already_reviewed',
  'memorial.authorisation_outdated',
  'memorial.nominee_unresolved',
  'memorial.not_withdrawable',
  'memorial.try_again',
] as const;
export type MemorialMemberErrorCode = (typeof MEMORIAL_MEMBER_ERROR_CODES)[number];

export const MEMORIAL_REVIEW_ERROR_CODES = ['memorial_review.not_found', 'memorial_review.invalid_omissions'] as const;
export type MemorialReviewErrorCode = (typeof MEMORIAL_REVIEW_ERROR_CODES)[number];

/** The fail-soft marker on a member GET whose words could not be decrypted (AC1 — a 200, ⛔ never a 500). */
export const MEMORIAL_UNAVAILABLE_NOW = 'memorial.unavailable_now';
