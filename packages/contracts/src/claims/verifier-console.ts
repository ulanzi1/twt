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
// Until the claim-scoped R14 producer lands (deferred, likely Story 6.15) `status` is `not_evaluated` —
// NEVER `not_flagged`, NEVER a green/clear. When the producer lands it plugs into THIS same shape
// (`status` flips to `flagged`/`not_flagged`) without changing the console API.
export const ConcealmentSignal = z
  .object({
    status: z.enum(['flagged', 'not_flagged', 'not_evaluated']),
    detailVisibility: z.enum(['indicator_only', 'full']),
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
  z.object({ status: z.literal('present'), assignments: z.array(GroundInspectionItem) }).strict(),
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

// ── The bounded compound packet (one request; the whole verifier signals view) ─────────────────────
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
  })
  .strict();
export type VerifierConsolePacket = z.output<typeof VerifierConsolePacket>;

/** `GET …/admin/claims/:claimCaseId/verifier-console` response. */
export const VerifierConsoleResponse = z.object({ packet: VerifierConsolePacket }).strict();
export type VerifierConsoleResponse = z.output<typeof VerifierConsoleResponse>;
