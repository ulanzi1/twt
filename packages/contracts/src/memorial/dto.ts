// packages/contracts/src/memorial/dto.ts
//
// The family memorial's wire DTOs (Story 11b.4 — the "Named identifiers" table; `#decision-2026-10-24-398`).
//
// ── Contracts discipline ────────────────────────────────────────────────────────────────────────────────────────────
// ⛔ No `@twt/domain` import (the mobile bundle — [[project_contracts_domain_bundle_boundary]]). INPUT objects `.strict()`
// (the review input's strictness IS the no-edit invariant — AC6: ⛔ a field that carries the family's text). OUTPUT schemas
// carry ⛔ no `.max()` (responses are PARSED by `serializerCompiler` — a stored value past a cap would turn a read into a
// 500 — footguns #29). ⚠ ⛔ Never a wire key named `status` (MA10): `memorialState`.
//
// ── What is DELIBERATELY absent ─────────────────────────────────────────────────────────────────────────────────────
// The member view carries ⛔ the reviewer's internal note (a contract test pins it) and ⛔ the photo's object key (only a
// 5-minute signed URL). The list carries ⛔ no body (the deceased's name + the sent date only). ⛔ No take-down field —
// a take-down is the helpline's (`-393`), row 11b-4a's.

import { z } from 'zod';

import { MemorialKinshipEntryOutput, MemorialKinshipOmissionInput, MemorialKinshipOmissionOutput } from './kinship.js';
import { MEMORIAL_KINSHIP_MAX_ENTRIES } from './text-classes.js';
import { MEMORIAL_OMISSION_FIELDS, MEMORIAL_REVIEW_ACTIONS, MEMORIAL_REVIEW_REASONS, MEMORIAL_STATES, MEMORIAL_WITHDRAWAL_ACTORS } from './vocab.js';

export const MemorialReviewActionSchema = z.enum(MEMORIAL_REVIEW_ACTIONS);
export const MemorialReviewReasonSchema = z.enum(MEMORIAL_REVIEW_REASONS);
export const MemorialStateSchema = z.enum(MEMORIAL_STATES);
export const MemorialWithdrawalActorSchema = z.enum(MEMORIAL_WITHDRAWAL_ACTORS);
export const MemorialLocaleSchema = z.enum(['hi', 'en']);

const OmissionOutput = z
  .object({
    field: z.enum(MEMORIAL_OMISSION_FIELDS),
    start: z.number().int(),
    end: z.number().int(),
    reason: MemorialReviewReasonSchema,
  })
  .strict();

// ── Member ──────────────────────────────────────────────────────────────────────────────────────────────────────────

/** `GET /api/v1/member/memorial/entry` — the home screen's NON-decrypting probe (AC1: ⛔ no decrypt, ⛔ no audit line). */
export const MemorialEntryResponse = z.object({ memorialEntry: z.boolean() }).strict();
export type MemorialEntryResponse = z.output<typeof MemorialEntryResponse>;

/** The permission text the server resolved, in BOTH locales (the app language can change before Send — Story 6.35). */
export const MemorialAuthorisationDto = z
  .object({
    copyVersion: z.string(),
    text: z.object({ hi: z.string(), en: z.string() }).strict(),
  })
  .strict();

export const MemorialMemberView = z
  .object({
    /** The drive the family writes about — the phone keys its draft on it (MA3: `memorial-draft:v1:<memberId>:<driveId>`). */
    driveId: z.string(),
    /** The deceased's name for the intro, in the Pariwar's presentation mode; `null` ⇒ the no-name key (MA14). */
    deceasedName: z.string().nullable(),
    memorialState: MemorialStateSchema,
    /** The latest version's id (`null` when nothing was sent). */
    submissionId: z.string().nullable(),
    /**
     * The `Idempotency-Key` of the Send that wrote the LATEST version (0183 — the key lives on the row); `null` when nothing
     * was sent or the latest version predates 0183. The family's OWN random client id (⛔ PII): the phone's resume check
     * reads "landed" as "this equals the key I kept" (review Z2). ⛔ Never on the review (admin) DTOs.
     */
    idempotencyKey: z.string().nullable(),
    /** The latest version's words, VERBATIM; `null` when nothing was sent or the decrypt failed (fail-soft). */
    body: z.string().nullable(),
    altText: z.string().nullable(),
    /** Set ONLY on a decrypt failure of the words (AC1 — a 200, ⛔ never a 500). */
    unavailable: z.literal('memorial.unavailable_now').nullable(),
    hasPhoto: z.boolean(),
    /** A 5-minute signed URL for the latest version's photo (their own data; audited). */
    photoUrl: z.string().nullable(),
    /** The parts the Trust left out, each with its own reason (`approved_with_omissions`). */
    omissions: z.array(OmissionOutput),
    photoLeftOut: z.object({ reason: MemorialReviewReasonSchema }).strict().nullable(),
    /**
     * Story 11b.5a (KL9) — the latest version's family list as the family SENT it (⛔ not as approved — the re-send's "Start from
     * the list I sent" reads it); `null` when it carried ⛔ no list or the decrypt failed (then `unavailable` is set and
     * `canSend` is false — a re-send must ⛔ not silently drop the list).
     */
    kinship: z.array(MemorialKinshipEntryOutput).nullable(),
    /** The entries the Trust left out, by index into {@link kinship}, each with its own reason. */
    kinshipLeftOut: z.array(MemorialKinshipOmissionOutput),
    /**
     * KL16 — the latest version's permission carried the guardian declaration (`carriesGuardianDeclaration`, ⛔ a version-id
     * match): the outcome screen then shows copy 4.3 for `identifies_a_child`. `false` when nothing was sent.
     */
    guardianDeclaration: z.boolean(),
    /** The `not_approved` reason, or the Trust's own withdrawal reason (`approval_withdrawn`). ⛔ Never the internal note. */
    reasonCode: MemorialReviewReasonSchema.nullable(),
    /** MA16 — an OLDER approval the Trust withdrew while a newer version is current. */
    earlierApprovalWithdrawn: z.object({ reasonCode: MemorialReviewReasonSchema }).strict().nullable(),
    /**
     * An OLDER version the Trust approved (and has not withdrawn) still stands while a newer version is current — so a
     * "withdrawn" / "not approved" newest version does not take the memorial down. Derived from `latestApprovedIndex`.
     */
    earlierApprovalStands: z.boolean(),
    canSend: z.boolean(),
    canWithdraw: z.boolean(),
    authorisation: MemorialAuthorisationDto,
  })
  .strict();
export type MemorialMemberView = z.output<typeof MemorialMemberView>;

/** `GET /api/v1/member/memorial` — `null` when there is no drive to write about (or the switch is off). */
export const MemorialMemberViewResponse = z.object({ memorial: MemorialMemberView.nullable() }).strict();
export type MemorialMemberViewResponse = z.output<typeof MemorialMemberViewResponse>;

/**
 * `POST /api/v1/member/memorial/submissions` — MULTIPART (Trap 11), so this is ⛔ a JSON body schema: the handler reads
 * an explicit allow-list of parts. Documented here so the api-client and the handler share the names.
 */
export const MEMORIAL_SEND_FIELDS = [
  'body',
  'altText',
  'authorisationCopyVersion',
  'authorisationLocale',
  'keepPreviousPhoto',
  // Story 11b.5a (KL8) — the family list: `JSON.stringify(entries)`, sent ONLY when non-empty (parsed with
  // `MemorialKinshipListSchema`; refused `memorial.kinship_invalid`).
  'kinship',
] as const;
export const MEMORIAL_SEND_FILE_FIELD = 'photo';

export const MemorialSendResponse = z
  .object({ submissionId: z.string(), memorialState: z.literal('with_the_trust') })
  .strict();
export type MemorialSendResponse = z.output<typeof MemorialSendResponse>;

export const MemorialWithdrawResponse = z.object({ memorialState: z.literal('withdrawn') }).strict();
export type MemorialWithdrawResponse = z.output<typeof MemorialWithdrawResponse>;

// ── Review (admin) ──────────────────────────────────────────────────────────────────────────────────────────────────

export const MemorialReviewListItem = z
  .object({
    submissionId: z.string(),
    /** The deceased's name (staff display), or `null` (erased, KMS outage). */
    deceasedName: z.string().nullable(),
    sentAt: z.string(),
    /**
     * When the head was decided (review V12) — the time the `decided` view is ORDERED by (review T7): the head's
     * decision or withdrawal time, whichever is later. ISO-8601; `null` in the `pending` view (nothing decided yet).
     */
    decidedAt: z.string().datetime().nullable(),
    memorialState: MemorialStateSchema,
  })
  .strict();
export type MemorialReviewListItem = z.output<typeof MemorialReviewListItem>;

export const MemorialReviewListResponse = z
  .object({
    items: z.array(MemorialReviewListItem),
    /** More rows exist past this page (the server fetched `limit + 1`) — the next page is `offset + items.length`. */
    hasMore: z.boolean(),
  })
  .strict();
export type MemorialReviewListResponse = z.output<typeof MemorialReviewListResponse>;

export const MemorialReviewListQuery = z
  .object({
    view: z.enum(['pending', 'decided']).optional(),
    // Bounded (FR-91 / Story 1.14 — the forced-pagination guard walks the committed OpenAPI surface).
    limit: z.coerce.number().int().positive().max(200).optional(),
    /** Rows to skip — `pending` is oldest sent first, `decided` most recently decided first. Bounded: deep paging is not a use case here. */
    offset: z.coerce.number().int().nonnegative().max(10000).optional(),
  })
  .strict();

const MemorialReviewDecisionOutput = z
  .object({
    action: MemorialReviewActionSchema,
    omissions: z.array(OmissionOutput),
    photoLeftOutReason: MemorialReviewReasonSchema.nullable(),
    /** Story 11b.5a (KL6) — the list entries left out, by index, each with its reason (`[]` when none). */
    kinshipLeftOut: z.array(MemorialKinshipOmissionOutput),
    reasonCode: MemorialReviewReasonSchema.nullable(),
    internalNote: z.string().nullable(),
    actorDisplay: z.string(),
    decidedAt: z.string(),
  })
  .strict();

const MemorialWithdrawalOutput = z
  .object({
    withdrawnBy: MemorialWithdrawalActorSchema,
    reasonCode: MemorialReviewReasonSchema.nullable(),
    internalNote: z.string().nullable(),
    actorDisplay: z.string().nullable(),
    withdrawnAt: z.string(),
  })
  .strict();

export const MemorialReviewVersion = z
  .object({
    submissionId: z.string(),
    sentAt: z.string(),
    /** The family's words VERBATIM; `null` on a decrypt failure (`unavailable` set). */
    body: z.string().nullable(),
    altText: z.string().nullable(),
    /**
     * Story 11b.5a (KL6 / KL12) — the family list VERBATIM, `inPhoto` ticks included (KL15 — shown to the reviewer beside the
     * photo); `null` when the version carried ⛔ no list or on a decrypt failure (`unavailable` set).
     */
    kinship: z.array(MemorialKinshipEntryOutput).nullable(),
    unavailable: z.literal('memorial.unavailable_now').nullable(),
    hasPhoto: z.boolean(),
    photoUrl: z.string().nullable(),
    /**
     * KL16 — this version's permission carried the guardian declaration (the registry's `carriesGuardianDeclaration`; an unknown
     * id ⇒ `false`). The admin reads THIS boolean — ⛔ never a version-id match (it cannot import `@twt/domain`).
     */
    guardianDeclaration: z.boolean(),
    authorisationCopyVersion: z.string(),
    authorisationLocale: MemorialLocaleSchema,
    handoverRecipient: z.enum(['latest', 'at_death']),
    decision: MemorialReviewDecisionOutput.nullable(),
    withdrawal: MemorialWithdrawalOutput.nullable(),
  })
  .strict();
export type MemorialReviewVersion = z.output<typeof MemorialReviewVersion>;

/** `GET …/memorial-reviews/:submissionId` — the version AND its whole chain (the history view — AC9). */
export const MemorialReviewDetailResponse = z
  .object({
    submissionId: z.string(),
    deceasedName: z.string().nullable(),
    memorialState: MemorialStateSchema,
    /** Oldest → newest. */
    chain: z.array(MemorialReviewVersion),
    /** What the reviewer may do with THIS version now. */
    canDecide: z.boolean(),
    /** `withdrawApprovalTargetId !== null` — true for ANY version of a chain that has a currently approved version (MA16). */
    canWithdrawApproval: z.boolean(),
    /**
     * The chain's latest approved, not-withdrawn version — the one the Trust may withdraw "whatever newer versions follow
     * it" (MA16); `null` when none. The admin posts `withdraw-approval` to THIS id, from whichever version it has open.
     */
    withdrawApprovalTargetId: z.string().nullable(),
  })
  .strict();
export type MemorialReviewDetailResponse = z.output<typeof MemorialReviewDetailResponse>;

/** An omission as the reviewer posts it. ⛔ No text: offsets into the verbatim field only. */
const OmissionInput = z
  .object({
    field: z.enum(MEMORIAL_OMISSION_FIELDS),
    start: z.number().int().min(0),
    end: z.number().int().min(1),
    reason: MemorialReviewReasonSchema,
  })
  .strict();

/**
 * `POST …/memorial-reviews/:submissionId/decision` — `.strict()`: ⛔ there is ⛔ no field that carries the family's text
 * (a test posts `body` / `text` / `narrative` → 400). MA6's semantic rules run in `validateMemorialDecision`.
 */
export const MemorialReviewDecisionInput = z
  .object({
    action: MemorialReviewActionSchema,
    omissions: z.array(OmissionInput).max(200).optional(),
    photoLeftOut: z.object({ reason: MemorialReviewReasonSchema }).strict().optional(),
    /** Story 11b.5a (KL6) — whole list entries left out, by index (sorted, unique — `validateMemorialDecision`). ⛔ No name. */
    kinshipLeftOut: z.array(MemorialKinshipOmissionInput).max(MEMORIAL_KINSHIP_MAX_ENTRIES).optional(),
    reasonCode: MemorialReviewReasonSchema.optional(),
    /** Tier-1, ⛔ never shown to the family; read back in the history view. */
    internalNote: z.string().min(1).max(4000).optional(),
  })
  .strict();
export type MemorialReviewDecisionInput = z.output<typeof MemorialReviewDecisionInput>;

export const MemorialReviewDecisionResponse = z
  .object({ submissionId: z.string(), memorialState: MemorialStateSchema })
  .strict();
export type MemorialReviewDecisionResponse = z.output<typeof MemorialReviewDecisionResponse>;

/** `POST …/memorial-reviews/:submissionId/withdraw-approval` (MA16) — one of the four reasons, ⛔ a family's request. */
export const MemorialWithdrawApprovalInput = z
  .object({
    reasonCode: MemorialReviewReasonSchema,
    internalNote: z.string().min(1).max(4000).optional(),
  })
  .strict();
export type MemorialWithdrawApprovalInput = z.output<typeof MemorialWithdrawApprovalInput>;

export const MemorialWithdrawApprovalResponse = z
  .object({ submissionId: z.string(), memorialState: z.literal('approval_withdrawn') })
  .strict();
export type MemorialWithdrawApprovalResponse = z.output<typeof MemorialWithdrawApprovalResponse>;
