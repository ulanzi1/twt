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
import { DeathCertificateRegisterCheck } from './death-certificate.js';
import { ClaimDocumentParityOutcome } from './documents.js';
import { FinallyApprovedElsewhere } from './one-payment-per-death.js';
import { NoteWithheldFlag, refineWithheldPair } from './withheld-note.js';
// ⭐ The SINGLE clerical-reason tuple (a sibling contract, ⛔ not `@twt/domain` — the browser-bundle
// rule is untouched). This file used to inline a fourth copy.
import { NomineeNameClericalReason } from './nominee-name-check.js';
import { ApprovalWarningKind, ApprovalWarningReasonOption } from './verification-decision.js';

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
        /** Story 6.26b (GI8) — the CURRENT review's government-register check (the same review `status` describes);
         *  `null` on a rejected review, on ⛔ review, and on an accepted review recorded before 6.26b. The value set IS
         *  `DeathCertificateRegisterCheck` (code review round 2 — was a fifth, untested inline copy). */
        registerCheck: DeathCertificateRegisterCheck.nullable(),
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

/** Verifier-added annotations on peer-mesh responses (AC2c). No owning producer story exists yet (Story 6.27a, PM13:
 *  STAFF note capture is ⛔ still not built — this stays `not_available_yet`) —
 *  ALWAYS `not_available_yet` today, never inferred/fabricated. A future story that lands the capture
 *  capability adds a `present` variant here (the D6/D10 not_available_yet precedent). */
export const PeerMeshVerifierAnnotations = z.discriminatedUnion('status', [
  z.object({ status: z.literal('not_available_yet') }).strict(),
]);
export type PeerMeshVerifierAnnotations = z.output<typeof PeerMeshVerifierAnnotations>;

// ── Story 6.27a (PM13) — what the District Admin sees: the 72-hour line, and per neighbour the name, the send status,
// every LIVE answer (with its words, how and when saved, and "changed N times"), submitted or not, and — only when the
// neighbour said yes — the call-back mobile (each showing audited). ⭐ Story 6.27b adds each answer's warning flag and
// the call-back number's basis (`-328` read with `-329`), and the SAME section is the approvers' read (PM24).
// A failed decrypt is `unavailable` ("could not be shown just now") — ⛔ never a blank (Invariant 8).

/** The window label (6.6 AR-61) — `skipped` = ⛔ no neighbour could be chosen (PM20). */
export const PEER_MESH_WINDOW_OUTCOMES = ['pending', 'sufficient', 'insufficient_responses_fallback', 'skipped'] as const;
/** A ping's send status — `not_sent` (⛔ begun) or one of the ping's `send_outcome` values (6.27c writes them). */
export const PEER_MESH_SEND_STATUSES = [
  'not_sent',
  'attempting',
  'accepted',
  'rejected_invalid_number',
  'rejected_unreachable',
  'no_target',
  'error',
  'skipped_superseded',
] as const;

const DecryptedText = z.discriminatedUnion('status', [
  z.object({ status: z.literal('shown'), text: z.string() }).strict(),
  z.object({ status: z.literal('none') }).strict(),
  z.object({ status: z.literal('unavailable') }).strict(),
]);

export const PeerMeshAnswerView = z
  .object({
    questionKey: z.string(),
    /** The question's English words (the admin console is English-only). */
    question: z.string(),
    value: z.discriminatedUnion('kind', [
      z.object({ kind: z.literal('codes'), codes: z.array(z.string()), labels: z.array(z.string()) }).strict(),
      z.object({ kind: z.literal('date'), date: z.string() }).strict(),
      z.object({ kind: z.literal('unavailable') }).strict(),
    ]),
    savedVia: z.enum(['member_app', 'helpline']),
    savedAt: z.string(),
    /** How many times the answer was changed before this one (0 = never) — every earlier saved version, INCLUDING one
     *  removed when an earlier answer changed and a re-entry of the same value (Story 6.27b BD3 A, `-326`). */
    changeCount: z.number(),
    /**
     * Story 6.27b (PM13's flags; AC8) — `true` — this answer carries a current warning; `false` — checked, ⛔ none (and
     * always for a question that can ⛔ never warn); `null` — could ⛔ not be checked just now (the warnings read failed,
     * or the answer is newer than it). ⛔ Never `false` for an unknown.
     */
    warningFlag: z.boolean().nullable(),
  })
  .strict();
export type PeerMeshAnswerView = z.output<typeof PeerMeshAnswerView>;

/** Story 6.27b (`-328` read with `-329`) — why a call-back number is shown: the neighbour's "Yes", or the Super Admin. */
export const PEER_CALLBACK_BASES = ['consented', 'super_admin'] as const;

/** Story 6.36 (SW24) — where a neighbour came from. ⚠ LOCKSTEP with the domain's `PEER_MESH_SOURCES` (0163's CHECK). */
export const PEER_MESH_SOURCES = ['workplace', 'named_by_member'] as const;

export const PeerMeshPingView = z
  .object({
    pingId: z.string(),
    memberId: z.string(),
    responderName: DecryptedText,
    sendStatus: z.enum(PEER_MESH_SEND_STATUSES),
    /** Why a ping was ⛔ texted — the `no_target:<reason>` code (⛔ PII by its grammar); `null` otherwise. */
    noTargetReason: z.string().nullable(),
    reply: z.object({ submitted: z.boolean(), answers: z.array(PeerMeshAnswerView) }).strict().nullable(),
    /**
     * The call-back number — Story 6.27b's FOUR rules (`-328` read with `-329`), in order: (1) a ping ⛔ never texted ⇒
     * `none` for every viewer; (2) the Super Admin ⇒ the normalised mobile whatever the answer; (3) the District Admin's
     * side (the console) ⇒ only on a "Yes" (either version); (4) the Pariwar Admin (the approvers' read) ⇒ only on a
     * "Yes" to v3's words ("May the Admin phone you …?"). ⛔ Shown ⇒ `none`; a decrypt that failed ⇒ `unavailable`.
     */
    callbackMobile: DecryptedText,
    /** Why the number is shown (`consented` / `super_admin`) — `null` unless `callbackMobile` is `shown`. */
    callbackBasis: z.enum(PEER_CALLBACK_BASES).nullable(),
    /**
     * ⭐ Story 6.36 (SW24; `-308`, `-326` BD1 A) — where this person came from: *"Chosen from the workplace"* /
     * *"Named by the member"*. `null` ONLY for a `district_cohort_v1` selection (shown as nothing). REQUIRED on the wire
     * (⛔ optional — an absent key would hide a defect). ⛔ Never on the inspector's, the helpline's or a member's wire (CF2).
     */
    source: z.enum(PEER_MESH_SOURCES).nullable(),
  })
  .strict()
  // ⭐ Story 6.27b code review round 2 (S9) — the basis is PAIRED with the status: `shown` ⇔ a basis. A shown number with
  // ⛔ basis would let a reader fall back to the consent words; a basis on `none` / `unavailable` would claim a showing
  // that never happened (round 1 R5 — an `unavailable` number carries `null`).
  .superRefine((v, ctx) => {
    if ((v.callbackMobile.status === 'shown') !== (v.callbackBasis !== null)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['callbackBasis'],
        message: 'callbackBasis is set exactly when callbackMobile is shown',
      });
    }
  });
export type PeerMeshPingView = z.output<typeof PeerMeshPingView>;

/**
 * ⭐ Story 6.27d (R5, R4a; AC6) — the inspector's discrepancy as STAFF see it, ONLY inside the neighbours' section (its
 * audience is exactly the one entitled to every neighbour answer; a hidden reader sees the whole section absent). Per
 * completed FULL visit whose result was RECORDED: when it completed, when the result was first recorded, WHICH questions
 * differed (`has_died` / `death_date` — possibly none) and the family's re-told answers, each with its author's stored
 * display name, labelled "Recorded after the difference was shown". A note that could ⛔ be decrypted (or was erased) is
 * `{ status: 'unavailable' }`, ⛔ never blank.
 */
export const INSPECTION_DISCREPANCY_QUESTION_KEYS = ['has_died', 'death_date'] as const;
export const InspectionDiscrepancyStaffNote = z
  .object({
    questionKey: z.enum(INSPECTION_DISCREPANCY_QUESTION_KEYS),
    note: z.union([z.string(), z.object({ status: z.literal('unavailable') }).strict()]),
    notedAt: z.string(),
    authorDisplay: z.string(),
  })
  .strict();
export type InspectionDiscrepancyStaffNote = z.output<typeof InspectionDiscrepancyStaffNote>;
export const InspectionDiscrepancyStaffView = z
  .object({
    groundInspectionId: z.string(),
    completedAt: z.string(),
    shownAt: z.string(),
    questionKeys: z.array(z.enum(INSPECTION_DISCREPANCY_QUESTION_KEYS)),
    notes: z.array(InspectionDiscrepancyStaffNote),
  })
  .strict();
export type InspectionDiscrepancyStaffView = z.output<typeof InspectionDiscrepancyStaffView>;

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
    /** Story 6.27a — the 72-hour label and when the window closes (ISO). */
    outcome: z.enum(PEER_MESH_WINDOW_OUTCOMES),
    windowExpiresAt: z.string(),
    /** Story 6.27a — per neighbour: the name, the send status, the answers, the call-back mobile. */
    pings: z.array(PeerMeshPingView),
    /** ⭐ Story 6.27d (R5) — REQUIRED, possibly empty: the claim's recorded inspector discrepancies (see above). */
    inspectionDiscrepancies: z.array(InspectionDiscrepancyStaffView),
    /**
     * ⭐ Story 6.36 (SW20; `-331` SC1 A) — the staff line: the member's workplace or the people they named changed in the
     * 90 days before the filing used for selection (`-339` RF1 C: the first filing not lifted by an innocence finding).
     * REQUIRED; `null` for a `district_cohort_v1` selection.
     */
    recentChangeBeforeFiling: z.boolean().nullable(),
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
    /** ⭐ Story 6.27b code review round 2 (X6 / X2; `withheld-note.ts`) — REQUIRED: `null` ⇔ ⛔ withheld (`caption` then null);
     *  a hidden reader's caption is withheld unless they are its recorded uploader (`uploaded_by_actor_id`, migration 0159 —
     *  review Y8); a NULL (pre-0159) uploader is withheld (fail CLOSED). */
    captionWithheld: NoteWithheldFlag,
    /** Short-lived signed READ URL (300s TTL — minted request-time; never persisted client-side). */
    signedUrl: z.string(),
    /** Story 6.26a (GI4, GI10) — what the photo shows; the console labels original-certificate photos apart. */
    photoKind: z.enum(['site', 'original_certificate']),
  })
  .strict()
  // Y5 (a) — a withheld note ⛔ rides beside its words.
  .superRefine(refineWithheldPair('caption', 'captionWithheld', null));
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
    /** Decrypted free-text findings note (server-side; null = none, or withheld — see `notesWithheld`). */
    notes: z.string().nullable(),
    /** ⭐ Story 6.27b code review round 2 (X6 / X2; Y8) — REQUIRED: `null` ⇔ ⛔ withheld. The note's last writer (the scheduler,
     *  a rescheduler, the inspector or an override holder) is recorded in `notes_author_actor_id` (migration 0159); a hidden
     *  reader sees the note only if they are that author — so the scheduler's briefing stays withheld from the inspector —
     *  and a NULL (pre-0159) author is withheld (fail CLOSED). Location, family contact, dates and outcomes (operational) stay. */
    notesWithheld: NoteWithheldFlag,
    /** The bounded non-PII structured findings map (as stored). */
    structuredFindings: z.unknown().nullable(),
    photos: z.array(GroundInspectionPhotoItem),
    /**
     * ⭐ Story 6.26a (GI10 [a]) — the inspector's record. `originalCertificateVerdict`: did the original they held
     * match the copy (`-263` FQ11 A) — a `does_not_match` against the CURRENT certificate is a WARNING (Story 6.26b
     * GI17 — see `originalMismatchWarning`); `null` on an assignment that is not completed, or one completed before 6.26a.
     */
    originalCertificateVerdict: z.enum(['matches', 'does_not_match']).nullable(),
    /** Was the original compared with the claim's CURRENT certificate, or with one since replaced (or another claim's —
     *  an inherited inspection)? `unknown` = the current certificate could ⛔ not be read; `null` = never compared. */
    comparedAgainst: z.enum(['current', 'earlier', 'unknown']).nullable(),
    /** Whose date of death this is: the family's statement (a visit) or the date printed on the original (a check). */
    deathDateSource: z.enum(['family_statement', 'original_certificate']).nullable(),
    /** Decrypted server-side (`YYYY-MM-DD`); `null` = none recorded, or ⛔ readable (see the flag). */
    deathDate: z.string().nullable(),
    /** Decrypted server-side (`HH:MM`); `null` = "not known", none recorded, or ⛔ readable (see the flag). */
    deathTime: z.string().nullable(),
    /** `true` ⇔ a recorded date could ⛔ not be decrypted — the console says "could not be read", ⛔ never a blank. */
    deathDateUnreadable: z.boolean(),
    /** `true` ⇔ a recorded time could ⛔ not be decrypted. */
    deathTimeUnreadable: z.boolean(),
    /** Story 6.26a (GI10) — `true` ⇔ this is ANOTHER claim's inspection, inherited (see the section's `inheritedFrom`). */
    inherited: z.boolean(),
    /**
     * Story 6.26b (GI10 [b]; `-288` K2, `-289` L4; RD18) — how this assignment's date compares with the certificate the
     * Trust accepted, by the SAME comparison the warnings use (⛔ never a date, ⛔ never an index on the wire):
     * `differs` / `same`; `not_compared` (⛔ date, a replaced original's printed date, ⛔ accepted certificate, or ⛔
     * completed); `not_indexed` (the accepted review predates 6.26b); `null` = could ⛔ not be checked just now (the
     * warnings read failed, or did ⛔ not see this completed row).
     */
    dateComparison: z.enum(['differs', 'same', 'not_compared', 'not_indexed']).nullable(),
    /** GI6 — this assignment's differing date IS a warning (`-289` L3: an inherited one too). `false` where ⛔ key can
     *  exist (an un-completed row, or ⛔ `differs`); `null` = could ⛔ not be checked just now (invariant 5). */
    dateDiffersWarning: z.boolean().nullable(),
    /** GI17 — this assignment's `does_not_match` IS a warning. `false` by construction on an un-completed or inherited
     *  row, or a verdict ⛔ `does_not_match`; `null` = could ⛔ not be checked just now. */
    originalMismatchWarning: z.boolean().nullable(),
  })
  .strict()
  // Y5 (a) — a withheld note ⛔ rides beside its words.
  .superRefine(refineWithheldPair('notes', 'notesWithheld', null));
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
       * ⭐ Story 6.26a (GI10): the inherited inspection is read whenever this claim has ⛔ no OWN completed FULL
       * visit — so it is shown BESIDE the claim's own certificate check (each item says `inherited`), and no longer
       * vanishes the moment the refile gets an assignment of its own.
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
    /** `''` when there is ⛔ no note, when it could ⛔ not be decrypted, or when WITHHELD (see `rationaleWithheld`). */
    rationale: z.string(),
    /** ⭐ Story 6.27b code review round 2 (V6 / X2; `withheld-note.ts`) — REQUIRED: `null` ⇔ ⛔ withheld; else `own_visit`
     *  (EVERY decision's note, for a reader whose own ground visit on the claim is pending) or `check_failed`. */
    rationaleWithheld: NoteWithheldFlag,
    /** Human-actor DISPLAY attribution (never a raw actor id; no prohibited PII). */
    actorDisplay: z.string(),
    decidedAt: z.string(),
    claimCaseId: z.string(),
  })
  .strict()
  // Y5 (a) — a withheld note ⛔ rides beside its words.
  .superRefine(refineWithheldPair('rationale', 'rationaleWithheld', ''));
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
    /** ⭐ Story 6.27b code review round 2 (V6 / X2) — REQUIRED: `null` ⇔ ⛔ withheld (`rationale` then null); else the
     *  reason — judged on THAT precedent's claim. */
    rationaleWithheld: NoteWithheldFlag,
    actorDisplay: z.string().nullable(),
    decidedAt: z.string(),
  })
  .strict()
  // Y5 (a) — a withheld note ⛔ rides beside its words.
  .superRefine(refineWithheldPair('rationale', 'rationaleWithheld', null));
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

/**
 * (i) The nominee-change WARNINGS — Story 6.23a (NW8). NON-PII by construction: ⛔ no name of a member, ⛔ no date of
 * death or of a nominee version (the reasons' `addedAt` is staff metadata), ⛔ no decrypt. The console says it BEFORE
 * the button does (6.18): with `kinds` non-empty the approval needs a warning reason and a note.
 */
export const ApprovalWarningsStatus = z
  .object({
    /** `false` ⇒ the section could ⛔ not be read — Approve is disabled with its own words (⛔ never "no warnings"). */
    available: z.boolean(),
    kinds: z.array(ApprovalWarningKind),
    /** `awaiting_determination` ⇔ ⛔ no live determination, or one made against an earlier certificate review. */
    postDeath: z.enum(['evaluated', 'awaiting_determination']),
    /** The current keys ⛔ covered by the District Admin's record — only while the live decision is an approval. */
    uncoveredSinceApproval: z.number().int().nonnegative(),
    /**
     * NW7 — why a revise is refused (the strip REPLACES its revise control with words), or `null`.
     * `unavailable` is a console-only preview state (the warnings read itself failed) — ⛔ not one of
     * `DecisionNotRevisableReason`'s real domain refusals; it mirrors `available: false` fail-closed.
     */
    reviseBlocked: z.enum(['warning_approval_final', 'warnings_not_current', 'unavailable']).nullable(),
    /** Server-computed: `claim.approve` at the district AND NW14's whole predicate passes for THIS viewer. */
    viewerCanRecordLateReason: z.boolean(),
    /** The late keys ⛔ covered by THIS viewer's own District Admin rows (`-279` A1). */
    lateKeysUncoveredForViewer: z.number().int().nonnegative(),
    /** The Pariwar's ACTIVE reasons — the built-in generic first. */
    reasonOptions: z.array(ApprovalWarningReasonOption),
    /**
     * ⭐ Story 6.27b (BD4, `2026-10-13-327` decision 2; PM25 (c)) — a ground visit on this claim is assigned to THIS viewer
     * and is ⛔ finished (6.27a's ONE predicate). `true` ⇒ the neighbours' two warning kinds are left OUT of `kinds` and the
     * counts above (a DISPLAY filter — the gate reads every key), `viewerCanRecordLateReason` is `false`, and the strip
     * shows ONE neutral block on Approve and on the revise of an APPROVAL (⛔ kind, ⛔ count) — the server refuses both.
     */
    ownVisitPending: z.boolean(),
  })
  .strict();
export type ApprovalWarningsStatus = z.output<typeof ApprovalWarningsStatus>;

/**
 * (j) WHY THE APPROVAL WAITS for the ground inspection — Story 6.26a (GI9; `-263` FQ9 A, Consequence 1). NON-PII. From
 * the SAME read and the SAME predicate as the approval gate (`groundInspectionApprovalState`), so the console can never
 * offer an Approve that 409s `…ground_inspection_required`.
 */
export const GroundInspectionGateStatus = z
  .object({
    /** `false` ⇒ the section could ⛔ not be read — Approve is disabled with "could not be checked" words (⛔ never "complete"). */
    available: z.boolean(),
    /** The claim's ground inspection is complete for approval. */
    complete: z.boolean(),
    /** Why it waits: ⛔ no completed visit, or an inspector must still see the original of the CURRENT certificate. */
    waitReason: z.enum(['no_completed_inspection', 'certificate_check_required']).nullable(),
  })
  .strict();
export type GroundInspectionGateStatus = z.output<typeof GroundInspectionGateStatus>;

/** RF1's appeal positions — in LOCKSTEP with the domain's `SUSPICION_REFUSAL_APPEAL_POSITIONS` (contracts test). */
export const SUSPICION_REFUSAL_APPEAL_POSITIONS = ['not_filed', 'time_limit_passed', 'open', 'upheld_final'] as const;
/** RF5's wait reasons — in LOCKSTEP with the domain's `SUSPICION_APPEAL_PENDING_REASONS` (contracts test). */
export const SUSPICION_APPEAL_WAIT_REASONS = ['appeal_not_filed', 'appeal_open'] as const;

/**
 * (k) KEPT APART / THE FINAL-APPROVAL WAIT — Story 6.24a (`2026-10-07-292` RF10; `-261` D4 B, `-262` FQ5 A). NON-PII: the
 * OTHER claims of this death whose refusal on suspicion of a post-death nominee change STANDS — each by its SHORT
 * REFERENCE only (⛔ no name, ⛔ no note) — and whether this claim's FINAL approval waits for one of them (the gate's OWN
 * pure helper, `suspicionAppealWaitState`). The District Admin's own approval is ⛔ never held.
 */
export const SuspicionRefusalSection = z
  .object({
    /** `false` ⇒ the section could ⛔ not be read — the console says "could not be checked just now" (⛔ never silence). */
    available: z.boolean(),
    /** The other claims of the death with a STANDING suspicion refusal (empty ⇒ nothing is kept apart). */
    keptApartFrom: z.array(
      z
        .object({
          reference: z.string(),
          appeal: z.enum(SUSPICION_REFUSAL_APPEAL_POSITIONS),
          /** The last IST date the refusal can be appealed (`YYYY-MM-DD`, D + 90). */
          appealUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'a YYYY-MM-DD calendar date'),
        })
        .strict(),
    ),
    /** Why this claim's FINAL approval waits, or `null` (⛔ not waiting). */
    finalApprovalWaits: z.enum(SUSPICION_APPEAL_WAIT_REASONS).nullable(),
  })
  .strict();
export type SuspicionRefusalSection = z.output<typeof SuspicionRefusalSection>;

/** OP14 (a)'s stages — in LOCKSTEP with the domain's `OTHER_CLAIM_STAGES` (contracts test). */
export const OTHER_CLAIM_STAGES = ['open', 'passed_final_vote', 'paid', 'refused', 'under_appeal', 'reversed', 'closed'] as const;
/** OP14 (a)'s date-of-death comparisons — in LOCKSTEP with the domain's `OTHER_CLAIM_DEATH_DATE_COMPARISONS`. */
export const OTHER_CLAIM_DEATH_DATES = ['same', 'different', 'not_accepted', 'not_comparable'] as const;

/**
 * (l) THE OTHER CLAIMS FOR THIS DEATH — Story 6.28 (`2026-10-11-319` OP14 (a)). STAFF-ONLY, NON-PII: every OTHER claim of
 * this death (capped — `total` says how many there are), each by its SHORT REFERENCE only (⛔ no name, ⛔ no note, ⛔ no
 * filer, ⛔ no nominee), its stage in staff words, when / through which channel it was filed, and its date of death
 * against THIS claim's by EQUALITY of the two accepted reviews' keyed index — the date itself is ⛔ never on the wire.
 */
export const OtherClaimsForDeathSection = z
  .object({
    /** `false` ⇒ the section could ⛔ not be read — the console says "could not be checked just now" (⛔ never silence). */
    available: z.boolean(),
    total: z.number().int().nonnegative(),
    claims: z.array(
      z
        .object({
          reference: z.string(),
          stage: z.enum(OTHER_CLAIM_STAGES),
          /** ISO-8601 instant the claim was filed. */
          filedAt: z.string(),
          channels: z.array(z.enum(['member_app', 'helpline', 'trustee_initiated'])),
          deathDate: z.enum(OTHER_CLAIM_DEATH_DATES),
        })
        .strict(),
    ),
  })
  .strict();
export type OtherClaimsForDeathSection = z.output<typeof OtherClaimsForDeathSection>;

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
    // ⭐ Story 6.27a (PM25 (c)) — OPTIONAL: ABSENT for an actor who holds an un-completed ground-inspection assignment on
    // the claim and has completed ⛔ no FULL visit (the inspector forms their own view first). ⛔ Never a new variant —
    // a "hidden" variant would itself be a signal.
    peerMesh: PeerMeshSection.optional(),
    groundInspection: GroundInspectionSection,
    priorVerifierComments: PriorVerifierCommentsSection,
    recentPrecedents: RecentPrecedentsSection,
    // Story 6.12 — the live shepherd (the family's named human contact), READ-ONLY. Grants no adjudication.
    shepherd: ShepherdSection,
    // Story 6.18 (AC4/AC8) — NON-PII: can this claim be approved, and did the District Admin record
    // an accepted name difference. The NAMES are a separate read behind their own key.
    nomineeNameCheck: NomineeNameCheckStatus,
    // Story 6.26a (GI9) — NON-PII: does the approval wait for the ground inspection, and why.
    groundInspectionGate: GroundInspectionGateStatus,
    // Story 6.24a (RF10) — NON-PII: kept apart from a refused claim of this death, and does the FINAL approval wait.
    suspicionRefusal: SuspicionRefusalSection,
    // Story 6.28 (OP14 (a)) — STAFF-ONLY, NON-PII: the other claims for this death, by reference.
    otherClaimsForDeath: OtherClaimsForDeathSection,
    // Story 6.28 (OP14 (b), code review chunk 3/4) — the AUTHORITATIVE (uncapped) "another claim of this
    // death is finally approved" signal, the SAME field every other approval surface carries (bulk,
    // SAVEPOINT-guarded). `otherClaimsForDeath` above is informational-only and explicitly capped at 20 —
    // deriving the finally-approved banner from it (as this console briefly did) misses a death with more
    // than 20 other claims. `null` when none.
    finallyApprovedElsewhere: FinallyApprovedElsewhere.nullable(),
    // Story 6.23a (NW8) — NON-PII: which nominee-change warnings show, and the Pariwar's warning reasons.
    approvalWarnings: ApprovalWarningsStatus,
  })
  .strict();
export type VerifierConsolePacket = z.output<typeof VerifierConsolePacket>;

/** `GET …/admin/claims/:claimCaseId/verifier-console` response. */
export const VerifierConsoleResponse = z.object({ packet: VerifierConsolePacket }).strict();
export type VerifierConsoleResponse = z.output<typeof VerifierConsoleResponse>;
