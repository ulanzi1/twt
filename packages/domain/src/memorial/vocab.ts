// The family memorial's vocabularies (Story 11b.4 — `#decision-2026-10-24-398` §2 mints, author-commit).
//
// Each pgEnum in `schema/memorial_*.ts` is generated FROM a tuple below, so the DB vocabulary and the TS type can never
// drift (the `helpdesk_ticket_state` precedent). ⚠ ⛔ None of the three is covered by the `-210` cl.2 delegation — each
// has a member-facing or authority effect — so a new value needs a new decision entry, ⛔ never a quiet append.

/**
 * The reviewer's three acts, and ⛔ no fourth (MA6). ⛔ There is no "edit": the Trust may leave a part out, or say no,
 * but it never changes the family's words — enforced by ABSENCE (no act, no input field, a `.strict()` schema).
 */
export const MEMORIAL_REVIEW_ACTIONS = ['approved', 'approved_with_omissions', 'not_approved'] as const;
export type MemorialReviewAction = (typeof MEMORIAL_REVIEW_ACTIONS)[number];

/**
 * Why a part is left out, why a version is not approved, or why the Trust withdraws its approval — the epic's grounds
 * ONLY (*"harmful or policy-violating content only"*), ratified as the only four by `-391` Confirm 2 A. ⛔ No catch-all;
 * ⛔ no `family_asked` in this row (a family's request is the helpline operator's — row 11b-4a, MA18).
 */
export const MEMORIAL_REVIEW_REASONS = [
  'attacks_someone_named',
  'accuses_someone_of_wrongdoing',
  'against_the_law',
  'identifies_a_child',
] as const;
export type MemorialReviewReason = (typeof MEMORIAL_REVIEW_REASONS)[number];

/**
 * Who withdrew a version (MA9 / MA16). `helpline` — the operator's take-down at the nominee's request (Story 11b.4a,
 * `#decision-2026-10-27-412` §2, migration 0186): ⛔ no reason (the reason enum is the reviewer's — Trap 7), ⛔ no note; the row
 * points at its request (`takedown_request_id`).
 */
export const MEMORIAL_WITHDRAWAL_ACTORS = ['family', 'trust', 'helpline'] as const;
export type MemorialWithdrawalActor = (typeof MEMORIAL_WITHDRAWAL_ACTORS)[number];

/**
 * How a take-down request ended (Story 11b.4a MP8, `-412` §2, migration 0187): `taken_down` (every un-withdrawn version gets a
 * `helpline` withdrawal), `kept` (the nominee chose to keep it, or the smaller fix is a new Send — nothing public changes),
 * `superseded` (the shown version changed between the request and the outcome — MP8 (c)).
 */
export const MEMORIAL_TAKEDOWN_OUTCOMES = ['taken_down', 'kept', 'superseded'] as const;
export type MemorialTakedownOutcome = (typeof MEMORIAL_TAKEDOWN_OUTCOMES)[number];

/** How the operator knew the caller was the nominee (MP7) — the one method today; ⚠ LOCKSTEP with 0187's CHECK. */
export const MEMORIAL_TAKEDOWN_VERIFIED_BY = 'called_back' as const;

/** Which nominee the handover code was addressed to at Send (MA5 — the branch `sendHandoverOtp` takes). */
export const MEMORIAL_HANDOVER_RECIPIENTS = ['latest', 'at_death'] as const;
export type MemorialHandoverRecipient = (typeof MEMORIAL_HANDOVER_RECIPIENTS)[number];

/** The two photo types accepted (MA8 — checked by magic bytes, ⛔ by the client's mimetype). */
export const MEMORIAL_PHOTO_MIMES = ['image/jpeg', 'image/png'] as const;
export type MemorialPhotoMime = (typeof MEMORIAL_PHOTO_MIMES)[number];

/** The field an omission span points into (MA6). `altText` spans need a photo that is kept. */
export const MEMORIAL_OMISSION_FIELDS = ['body', 'altText'] as const;
export type MemorialOmissionField = (typeof MEMORIAL_OMISSION_FIELDS)[number];

/** One part the Trust left out: `[start, end)` UTF-16 offsets into the VERBATIM field, with its own reason. */
export interface MemorialOmission {
  readonly field: MemorialOmissionField;
  readonly start: number;
  readonly end: number;
  readonly reason: MemorialReviewReason;
}

/**
 * The family list's relations (Story 11b.5a KL3 — minted by `#decision-2026-10-31-431`, author-commit; the list itself is
 * ruled by `-428` PQ1 A). ⭐ Every code is the person's relation **TO THE MEMBER WHO DIED** — a deceased woman's spouse is
 * `husband`; the nominee's own mother, if she is the member's wife, is `wife`. Fourteen, in DISPLAY order (spouse, children,
 * parents, siblings, grandchildren — grandsons before granddaughters, the son's line first — in-laws). ⛔ No `other`, ⛔ no
 * free-text relation; ⛔ not `NOMINEE_RELATIONSHIPS` (`-257` — a form picker's words for a different purpose). ⛔ No pgEnum:
 * the code lives only INSIDE the kinship ciphertext (KL5 — a family's shape is itself personal). A new value needs a new
 * decision entry (⛔ not under the `-210` cl.2 delegation — a member-facing vocabulary).
 */
export const MEMORIAL_KINSHIP_RELATIONS = [
  'wife',
  'husband',
  'son',
  'daughter',
  'father',
  'mother',
  'brother',
  'sister',
  'sons_son',
  'daughters_son',
  'sons_daughter',
  'daughters_daughter',
  'daughter_in_law',
  'son_in_law',
] as const;
export type MemorialKinshipRelation = (typeof MEMORIAL_KINSHIP_RELATIONS)[number];

/**
 * One entry of the family list (KL4): one relation, ONE person's name — kept exactly as typed (⛔ no trim, ⛔ no
 * normalisation). `inPhoto` (KL15, `-426` AQ3 (b)1) — the family ticked this person as in the photo; ⛔ never public.
 */
export interface MemorialKinshipEntry {
  readonly relation: MemorialKinshipRelation;
  readonly name: string;
  readonly inPhoto?: true;
}

/** One entry the Trust left out (KL6): its index in the submission's decrypted list, with one of the four reasons. */
export interface MemorialKinshipOmission {
  readonly index: number;
  readonly reason: MemorialReviewReason;
}

/**
 * The shape of a Send's `Idempotency-Key` (migration 0183 — the key is stored ON the submission row, so it is bounded and
 * plain): 1–128 characters of `[A-Za-z0-9_-]` — a UUID (the phone's `newIdempotencyKey()`), a ULID or a nanoid. ⚠ LOCKSTEP
 * with the `memorial_submissions_idempotency_key_check` CHECK. ⛔ No `g` flag (a global regex is stateful under `.test()`).
 */
export const MEMORIAL_SEND_IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

/** True iff `key` is a storable Send Idempotency-Key (the handler refuses anything else with `400 memorial.idempotency_key_required`). */
export function isMemorialSendIdempotencyKey(key: string): boolean {
  return MEMORIAL_SEND_IDEMPOTENCY_KEY_PATTERN.test(key);
}
