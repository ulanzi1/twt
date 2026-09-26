// packages/contracts/src/claims/verifier-console.ts
//
// The Story 6.10 Verifier Console read-model contract — the `VerifierConsolePacket` served by the
// bounded compound assembler (one API request; apps/api Decision D2). READ-ONLY: this packet carries
// NO adjudication controls and the surface emits NO `claim.*` lifecycle event (AC4). The decision
// strip (approve/deny/escalate) is Story 6.11 and mounts into a client-side sticky slot.
//
// ── The four-state section vocabulary (AC7) — NEVER collapse the three non-present states ─────────
//   · `present`             — data present.
//   · `empty`               — the producer exists and genuinely found NO records (a meaningful []).
//   · `unavailable`         — an EXISTING dependency failed transiently (degrade this section only).
//   · `not_available_yet`   — the downstream PRODUCER has not shipped (sections (e)/(f) until 6.11;
//                             the concealment `not_evaluated` state is this category for section (a)).
// Not every section admits every state — (c)/(d) never `not_available_yet`; (e)/(f) do until 6.11;
// validity is `present`|`unavailable`; the concealment tri-state is its own vocabulary.
//
// ── Contracts discipline ──────────────────────────────────────────────────────────────────────────
// MUST NOT import `@twt/domain`. `MemberValidityPayloadDto` is imported from the sibling members
// contract; `ClaimDocumentParityOutcome` from the sibling `documents.ts`. Field names are camelCase —
// the established admin claim-surface wire convention (Story 6.5 `<VerifierReviewPanel>` / 6.7
// ground-inspection read both ship camelCase; the admin app parses with these same Zod schemas).
// NON-PII metadata + the decrypted DISPLAY fields an authorized verifier is entitled to see (the
// caller decrypts server-side and ships plaintext for this authorized surface). Every array is
// explicitly, deterministically ordered by the server.

import { z } from 'zod';

import { MemberValidityPayloadDto } from '../members/validity.js';
import { ClaimDocumentParityOutcome } from './documents.js';
// ⭐ The SINGLE clerical-reason tuple (a sibling contract, ⛔ not `@twt/domain` — the browser-bundle
// rule is untouched). This file used to inline a fourth copy.
import { NomineeNameClericalReason } from './nominee-name-check.js';

/** The four-state section vocabulary (AC7). Exported for the discriminants + the tests. */
export const VERIFIER_CONSOLE_SECTION_STATES = [
  'present',
  'empty',
  'unavailable',
  'not_available_yet',
] as const;
export type VerifierConsoleSectionState = (typeof VERIFIER_CONSOLE_SECTION_STATES)[number];

// ── (a) concealment tri-state (D10) — request-time, scope-safe; NEVER inferred from redacted flags ──
//
// District actors receive `indicator_only` — presence status only, never names/notes/evidence/counts.
// Story 6.15 LANDED the claim-scoped R14 producer: `status` now reflects the verifier assessment
// (`flagged`/`not_flagged`/`not_evaluated`) — still NEVER inferred from the redacted validity flags (D10),
// NEVER `not_flagged` on an absent/indeterminate assessment (fail-soft to `not_evaluated`).
//
// `clauseVersionId` (Story 6.15, D-C) — the R14 rule-version basis. Populated ONLY for a `full`-visibility
// caller (effective `cycle.freeze` authority) AND only on a `flagged`/`not_flagged` status; `null` for
// `indicator_only` and for `not_evaluated`. `full` adds ONLY this metadata — NEVER medical evidence,
// disclosed-condition detail, or inferred linkage (D-C).
export const ConcealmentSignal = z
  .object({
    status: z.enum(['flagged', 'not_flagged', 'not_evaluated']),
    detailVisibility: z.enum(['indicator_only', 'full']),
    clauseVersionId: z.string().nullable().optional(),
  })
  .strict();
export type ConcealmentSignal = z.output<typeof ConcealmentSignal>;

// ── (a) deceased-member identity (decrypted DISPLAY fields — part of the core read) ────────────────
export const VerifierConsoleIdentity = z
  .object({
    deceasedName: z.string().nullable(),
    deceasedDateOfBirth: z.string().nullable(),
  })
  .strict();
export type VerifierConsoleIdentity = z.output<typeof VerifierConsoleIdentity>;

// ── (a) validity section — `present` (the FR-12A payload) | `unavailable` (a transient service fail) ─
export const ValiditySection = z.discriminatedUnion('status', [
  z.object({ status: z.literal('present'), payload: MemberValidityPayloadDto }).strict(),
  z.object({ status: z.literal('unavailable') }).strict(),
]);
export type ValiditySection = z.output<typeof ValiditySection>;

// ── (b) OCR document-review parity (embeds the Story 6.5 <VerifierReviewPanel> shape) ──────────────
export const VerifierReviewItem = z
  .object({
    documentType: z.string(),
    parityOutcome: ClaimDocumentParityOutcome,
    verifierReviewRequired: z.boolean(),
    ocrConfidence: z.number(),
    /** Per-field mismatch reasons (non-PII), e.g. `{ name: 'beyond_tolerance', dob: 'mismatch' }`. */
    parityFlags: z.record(z.string(), z.string()),
    /** OCR-extracted values (decrypted server-side by the caller; null = not extracted). */
    extracted: z
      .object({
        deceasedName: z.string().nullable(),
        dateOfBirth: z.string().nullable(),
        dateOfDeath: z.string().nullable(),
        issuingAuthority: z.string().nullable(),
        certificateNumber: z.string().nullable(),
      })
      .strict(),
    /** The deceased member's record (decrypted server-side; null = no KYC profile on file). */
    memberRecord: z
      .object({ name: z.string().nullable(), dateOfBirth: z.string().nullable() })
      .strict()
      .nullable(),
    /** Short-lived signed READ URL + content type for the original-document preview. */
    preview: z
      .object({ signedUrl: z.string(), contentType: z.string(), filename: z.string().optional() })
      .strict(),
    /**
     * Story 6.21a (D10) — the DEATH CERTIFICATE's review, on the `death_certificate` item ONLY (absent on
     * every other document type). ⛔ It carries NO decrypted date (T10): the date lives on the audited history
     * read and 6.20's timeline. `certificateToken` is the CURRENT upload's id (`null` for a legacy row with no
     * upload — never reviewable, T12). `viewer.canReview` is judged SERVER-SIDE against the actor's grants at
     * the deceased's district (6.20's `viewer.can_determine` pattern), AND only inside the review window (outside
     * it every submit is 409 `not_reviewable`): ⛔ UI only, the route's key stays the gate.
     */
    review: z
      .object({
        /** `missing` = a row with no current upload (T12 legacy): no token, never reviewable (`2026-09-26-245` §3). */
        status: z.enum(['missing', 'not_reviewed', 'accepted', 'rejected']),
        rejectionReason: z.enum(['no_date_of_death', 'date_of_death_unclear', 'date_of_death_in_future']).nullable(),
        decidedByDisplay: z.string().nullable(),
        decidedAt: z.string().datetime().nullable(),
        /** The claim's LIVE review (current or not) — echoed back as `expected_live_review_id`. */
        liveReviewId: z.string().uuid().nullable(),
        certificateToken: z.string().uuid().nullable(),
        /** `true` iff `status === 'accepted'` AND the live nominee determination (if any) was made against
         * a DIFFERENT review — D7's `determination_stale` ground, computed server-side so the console's
         * OWN approve gate can pre-empt a doomed click instead of surfacing it only after a 409. */
        determinationStale: z.boolean(),
        viewer: z.object({ canReview: z.boolean() }).strict(),
      })
      .strict()
      .optional(),
  })
  .strict();
export type VerifierReviewItem = z.output<typeof VerifierReviewItem>;

export const DocumentReviewSection = z.discriminatedUnion('status', [
  z.object({ status: z.literal('present'), reviews: z.array(VerifierReviewItem) }).strict(),
  z.object({ status: z.literal('empty') }).strict(),
  z.object({ status: z.literal('unavailable') }).strict(),
]);
export type DocumentReviewSection = z.output<typeof DocumentReviewSection>;

// ── (c) peer-mesh transcripts (Story 6.6) — transcripts NOT counts; a non-response is an ABSENCE ────
export const PeerMeshResponseItem = z
  .object({
    responderMemberId: z.string(),
    /** A non-response never appears here; `denied` is NEVER inferred from absence (AC2c). */
    response: z.enum(['confirmed', 'denied', 'unknown']),
  })
  .strict();
export type PeerMeshResponseItem = z.output<typeof PeerMeshResponseItem>;

/** Verifier-added annotations on peer-mesh responses (AC2c). No owning producer story exists yet —
 *  ALWAYS `not_available_yet` today, never inferred/fabricated. A future story that lands the capture
 *  capability adds a `present` variant here (the D6/D10 not_available_yet precedent). */
export const PeerMeshVerifierAnnotations = z.discriminatedUnion('status', [
  z.object({ status: z.literal('not_available_yet') }).strict(),
]);
export type PeerMeshVerifierAnnotations = z.output<typeof PeerMeshVerifierAnnotations>;

export const PeerMeshTranscript = z
  .object({
    selectionId: z.string().nullable(),
    distinctResponderCount: z.number(),
    /** The member ids pinged for this selection (ordered by member id). */
    pingedMemberIds: z.array(z.string()),
    /** The recorded responses in append order (an absence is simply not present). */
    responses: z.array(PeerMeshResponseItem),
    /** AC2c's "verifier annotations" — explicitly not_available_yet until an owning producer story ships. */
    verifierAnnotations: PeerMeshVerifierAnnotations,
  })
  .strict();
export type PeerMeshTranscript = z.output<typeof PeerMeshTranscript>;

export const PeerMeshSection = z.discriminatedUnion('status', [
  z.object({ status: z.literal('present'), transcript: PeerMeshTranscript }).strict(),
  z.object({ status: z.literal('empty') }).strict(),
  z.object({ status: z.literal('unavailable') }).strict(),
]);
export type PeerMeshSection = z.output<typeof PeerMeshSection>;

// ── (d) ground-inspection notes + photos (Story 6.7) — `[]` = a first-class absence signal ─────────
export const GroundInspectionPhotoItem = z
  .object({
    photoId: z.string(),
    contentType: z.string(),
    byteSize: z.number(),
    caption: z.string().nullable(),
    /** Short-lived signed READ URL (300s TTL — minted request-time; never persisted client-side). */
    signedUrl: z.string(),
  })
  .strict();
export type GroundInspectionPhotoItem = z.output<typeof GroundInspectionPhotoItem>;

export const GroundInspectionItem = z
  .object({
    groundInspectionId: z.string(),
    district: z.string(),
    inspectionStage: z.string(),
    inspectionSiteType: z.string(),
    inspectorActorId: z.string(),
    scheduledAt: z.string(),
    status: z.string(),
    refusalReason: z.string().nullable(),
    completedAt: z.string().nullable(),
    /** Decrypted free-text findings note (server-side; null = none). */
    notes: z.string().nullable(),
    /** The bounded non-PII structured findings map (as stored). */
    structuredFindings: z.unknown().nullable(),
    photos: z.array(GroundInspectionPhotoItem),
  })
  .strict();
export type GroundInspectionItem = z.output<typeof GroundInspectionItem>;

export const GroundInspectionSection = z.discriminatedUnion('status', [
  z
    .object({
      status: z.literal('present'),
      assignments: z.array(GroundInspectionItem),
      /**
       * Story 6.20 (AC13, `2026-09-21-239` (b)) — present ONLY when these are ANOTHER claim's completed
       * inspections, INHERITED because that claim was refused on suspicion of a post-death nominee change
       * (the `post_death_nominee_change` reason code) and this claim is the true nominee's refile.
       * ⭐ Labelled and NAMING its source, so the District Admin never mistakes it for this claim's own.
       * ⛔ Nothing else carries over.
       */
      inheritedFrom: z.object({ claimCaseId: z.string().uuid() }).strict().optional(),
    })
    .strict(),
  z.object({ status: z.literal('empty') }).strict(),
  z.object({ status: z.literal('unavailable') }).strict(),
]);
export type GroundInspectionSection = z.output<typeof GroundInspectionSection>;

// ── (e) prior verifier comments — the 6.11 decision read model (D6); `not_available_yet` until 6.11 ─
export const PriorVerifierComment = z
  .object({
    outcome: z.string(),
    reasonCode: z.string(),
    rationale: z.string(),
    /** Human-actor DISPLAY attribution (never a raw actor id; no prohibited PII). */
    actorDisplay: z.string(),
    decidedAt: z.string(),
    claimCaseId: z.string(),
  })
  .strict();
export type PriorVerifierComment = z.output<typeof PriorVerifierComment>;

export const PriorVerifierCommentsSection = z.discriminatedUnion('status', [
  z.object({ status: z.literal('present'), comments: z.array(PriorVerifierComment) }).strict(),
  z.object({ status: z.literal('empty') }).strict(),
  z.object({ status: z.literal('unavailable') }).strict(),
  z.object({ status: z.literal('not_available_yet') }).strict(),
]);
export type PriorVerifierCommentsSection = z.output<typeof PriorVerifierCommentsSection>;

// ── (f) recent in-scope precedents — recency NOT similarity (D6); `not_available_yet` until 6.11 ────
export const RecentPrecedent = z
  .object({
    claimCaseId: z.string(),
    outcome: z.string(),
    reasonCode: z.string(),
    rationale: z.string().nullable(),
    actorDisplay: z.string().nullable(),
    decidedAt: z.string(),
  })
  .strict();
export type RecentPrecedent = z.output<typeof RecentPrecedent>;

export const RecentPrecedentsSection = z.discriminatedUnion('status', [
  z.object({ status: z.literal('present'), precedents: z.array(RecentPrecedent) }).strict(),
  z.object({ status: z.literal('empty') }).strict(),
  z.object({ status: z.literal('unavailable') }).strict(),
  z.object({ status: z.literal('not_available_yet') }).strict(),
]);
export type RecentPrecedentsSection = z.output<typeof RecentPrecedentsSection>;

// ── (g) live shepherd — Story 6.12 (AC6), the family's named human contact, READ-ONLY ──────────────
// Isolated, fail-soft: the live shepherd's display + role + actor id, or `empty` (no live shepherd yet)
// / `unavailable` (a transient throw). NEVER the shepherd's phone/WhatsApp on this admin console (AC8 —
// contact PII stays on the member card). Being shown here grants the shepherd NO console access / no
// claim.approve (AC6) — this section merely surfaces WHO the family's contact is.
export const ShepherdSection = z.discriminatedUnion('status', [
  z
    .object({
      status: z.literal('present'),
      shepherdActorId: z.string().uuid(),
      shepherdDisplay: z.string().min(1),
      roleLabel: z.string().min(1),
    })
    .strict(),
  z.object({ status: z.literal('empty') }).strict(),
  z.object({ status: z.literal('unavailable') }).strict(),
]);
export type ShepherdSection = z.output<typeof ShepherdSection>;

// ── The bounded compound packet (one request; the whole verifier signals view) ─────────────────────
/**
 * (h) The nominee NAME CHECK status — Story 6.18 (AC4, AC8). NON-PII by construction.
 *
 * ⭐ WHAT THIS SECTION IS FOR, and what it is deliberately NOT. It tells the console two things the
 * District Admin needs before they can act: whether a CURRENT, PASSING check exists (so the approve
 * control can be disabled until it does — AC4), and whether that check accepted a DIFFERENCE (so
 * `-226` cl.5's highlight can render — AC8).
 * ⛔ IT CARRIES NO NAME AND NO NOTE. The names live behind the dedicated
 * `claim.view_nominee_name_check` key on their own route, fetched ON DEMAND when a District Admin
 * opens the disclosure — reading a living nominee's Tier-1 name must ⛔ never be a side effect of
 * loading a console.
 * ⛔ And it carries no comparison: `differenceReasons` are the codes the District Admin THEMSELVES
 * recorded, never anything the system worked out (Trap 1).
 */
export const NomineeNameCheckStatus = z
  .object({
    /**
     * ⚠⚠ COULD THIS SECTION BE READ AT ALL? — ⛔ NOT the same question as "is anything missing"
     * (code review 2026-09-20). The handler assembles this section fail-soft; its `catch` used to
     * return `accountsComplete: false`, which the console renders as *"bank details missing"*. So a
     * DB blip, a bug or an aborted transaction told the District Admin that `-226` cl.7 had not been
     * met and to go and chase the family for documents they had already supplied.
     * ⭐ `true` means the three fields below are real. `false` means WE do not know — the console
     * says so, and keeps the approve gate closed (conservative: ⛔ never approve on an unknown).
     * (The sibling console sections carry the same state; this one had been the exception.)
     */
    available: z.boolean(),
    /** Exactly two live bank accounts exist (`-226` cl.7). `false` ⇒ the claim WAITS. */
    accountsComplete: z.boolean(),
    /** A check exists AND is current AND every verdict passes — the AC4 approval gate. */
    currentAndPassing: z.boolean(),
    /**
     * The clerical reason CODES the District Admin recorded, when a difference was accepted (AC8).
     * ⚠ Non-empty ONLY when the check is CURRENT **and** PASSING — see AC8's own wording. A stale
     * check, or a mixed `[clerical_difference, does_not_match]` one, yields `[]`.
     */
    differenceReasons: z.array(NomineeNameClericalReason),
  })
  .strict();
export type NomineeNameCheckStatus = z.output<typeof NomineeNameCheckStatus>;

export const VerifierConsolePacket = z
  .object({
    claimCaseId: z.string(),
    pariwarId: z.string(),
    claimState: z.string(),
    deceasedMemberId: z.string(),
    identity: VerifierConsoleIdentity,
    validity: ValiditySection,
    concealment: ConcealmentSignal,
    documentReview: DocumentReviewSection,
    peerMesh: PeerMeshSection,
    groundInspection: GroundInspectionSection,
    priorVerifierComments: PriorVerifierCommentsSection,
    recentPrecedents: RecentPrecedentsSection,
    // Story 6.12 — the live shepherd (the family's named human contact), READ-ONLY. Grants no adjudication.
    shepherd: ShepherdSection,
    // Story 6.18 (AC4/AC8) — NON-PII: can this claim be approved, and did the District Admin record
    // an accepted name difference. The NAMES are a separate read behind their own key.
    nomineeNameCheck: NomineeNameCheckStatus,
  })
  .strict();
export type VerifierConsolePacket = z.output<typeof VerifierConsolePacket>;

/** `GET …/admin/claims/:claimCaseId/verifier-console` response. */
export const VerifierConsoleResponse = z.object({ packet: VerifierConsolePacket }).strict();
export type VerifierConsoleResponse = z.output<typeof VerifierConsoleResponse>;
