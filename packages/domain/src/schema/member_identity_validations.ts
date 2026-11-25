// `member_identity_validations` — staff checking a TYPED-IN identity while the member is alive (Story 3.13, Task 1;
// DL1; AC2; author-commit `2026-11-25-501`, amended by `2026-11-25-503`).
//
// PRD FR-2: *"KYC fields are entered manually and the member becomes `pending-valid` until trustee validation."*
// `2026-11-25-502` Q1 A (Trustee-ratified): the member shows an original government photo ID — in person or on a video
// call — and staff check the name, date of birth and photo against what was typed in; *"nothing is copied or kept"*.
// ⇒ ONE recorded staff act per attempt — `confirmed` or `not_confirmed` — by a District Admin or Pariwar Admin.
// `confirmed` also sets `member_kyc_profiles.trustee_verified = true` in the SAME transaction (DL2 —
// `markKycTrusteeVerified`, ⛔ this table).
//
// ── Shape (0212's live-row mechanism, mirrored — DL1, F10a) ──────────────────────────────────────────────────────
//   · At most ONE LIVE act per member (the partial-unique index `WHERE superseded_at IS NULL`); a later act
//     supersedes it. Supersession is ONE-WAY (the 0212 trigger, copied).
//   · `kyc_profile_updated_at` snapshots the KYC row the staff member checked (F2: the profile is fixed after signup
//     today; the snapshot keeps a future writer from making the record lie).
//   · ⛔ Document NUMBER, ⛔ copy, ⛔ image (N5). `-502` Q1 A: *"nothing is copied or kept"*.
//
// ── PII discipline ───────────────────────────────────────────────────────────────────────────────────────────────
//   · note_ciphertext → Tier-1 — REQUIRED when `not_confirmed`, optional otherwise (the coherence CHECK). Column-level
//     UPDATE grant + UPDATE policy at birth for the DPDPA-RTBF scrub (DL14).
//   · not_confirmed_reason → a PLAINTEXT closed enum (N6): row `3-13a` tells the member the reason (`-502` Q2 C) and
//     reads it without a decrypt. ⛔ Fold the reason into the note.
//   · decided_by_display → controlled STAFF data, snapshotted at decision time, ⛔ never email-derived.
//   · ⛔ Never in an event, a log line or an audit context: the note, the reason, the document kind, a name (DL3).

import { sql } from 'drizzle-orm';
import { index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { piiColumn } from '../encryption/column.js';
import { MEMBER_IDENTITY_VALIDATION_FIELD_CLASS } from '../encryption/field-classes.js';
import type { MemberId, MemberIdentityValidationId, PariwarId } from '../ids/index.js';
import { members } from './members.js';

/**
 * The staff member's result (DL1). `not_confirmed` changes NOTHING for the member's membership (N6) — they stay in
 * the queue and staff may record again at any time (DL9). ⛔ A later `not_confirmed` undoes a `confirmed` (DL10 —
 * a confirmed member is ⛔ eligible again, DL4).
 * ⚠ LOCKSTEP with migration 0218's `member_identity_validations_outcome_check` and the `@twt/contracts` mirror.
 */
export const IDENTITY_VALIDATION_OUTCOMES = ['confirmed', 'not_confirmed'] as const;
export type IdentityValidationOutcome = (typeof IDENTITY_VALIDATION_OUTCOMES)[number];

/**
 * How the member showed the original photo ID (DL7 — `-502` Q1 A: *"in person or on a video call"*). Row `3-16` mints
 * `uploaded_documents` for its staff review of uploads (`-502` item 2, R1) — ⛔ here (nothing would write it).
 * ⚠ LOCKSTEP with 0218's `…_evidence_kind_check` and the contracts mirror.
 */
export const IDENTITY_VALIDATION_EVIDENCE_KINDS = ['photo_id_in_person', 'photo_id_video_call'] as const;
export type IdentityValidationEvidenceKind = (typeof IDENTITY_VALIDATION_EVIDENCE_KINDS)[number];

/** WHICH government photo ID was seen (DL7) — the kind only, ⛔ its number (N5). ⚠ LOCKSTEP with 0218 and the contract. */
export const IDENTITY_VALIDATION_DOCUMENT_KINDS = [
  'aadhaar_card',
  'pan_card',
  'voter_id',
  'driving_licence',
  'passport',
  'government_service_id',
] as const;
export type IdentityValidationDocumentKind = (typeof IDENTITY_VALIDATION_DOCUMENT_KINDS)[number];

/**
 * Why staff could not confirm (DL9) — set iff `not_confirmed`. What was seen follows the reason (0218's coherence
 * CHECK): a mismatch was judged FROM a document (evidence + document kind set); `no_document_shown` had a meeting
 * (evidence kind) but ⛔ document; `member_not_reached` had ⛔ meeting at all (neither).
 * ⚠ LOCKSTEP with 0218 and the contract. Row `3-13a` tells the member this reason (`-502` Q2 C).
 */
export const IDENTITY_VALIDATION_NOT_CONFIRMED_REASONS = [
  'details_do_not_match',
  'photo_does_not_match',
  'no_document_shown',
  'member_not_reached',
] as const;
export type IdentityValidationNotConfirmedReason = (typeof IDENTITY_VALIDATION_NOT_CONFIRMED_REASONS)[number];

/** The reasons that were judged FROM a document — evidence and document kind both required (0218's CHECK). */
export const IDENTITY_VALIDATION_REASONS_WITH_DOCUMENT = [
  'details_do_not_match',
  'photo_does_not_match',
] as const satisfies readonly IdentityValidationNotConfirmedReason[];

/** Why an act stopped being live — a later act replaced it. ⚠ LOCKSTEP with 0218's supersession CHECK. */
export const IDENTITY_VALIDATION_SUPERSESSION_REASONS = ['re_checked'] as const;
export type IdentityValidationSupersessionReason = (typeof IDENTITY_VALIDATION_SUPERSESSION_REASONS)[number];

export const memberIdentityValidations = pgTable(
  'member_identity_validations',
  {
    validationId: uuid('validation_id').defaultRandom().primaryKey().$type<MemberIdentityValidationId>(),

    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

    memberId: uuid('member_id')
      .notNull()
      .$type<MemberId>()
      .references(() => members.memberId, { onDelete: 'cascade' }),

    outcome: text('outcome').notNull().$type<IdentityValidationOutcome>(),
    // NULL only for `not_confirmed` / `member_not_reached` (the coherence CHECK).
    evidenceKind: text('evidence_kind').$type<IdentityValidationEvidenceKind>(),
    // NULL only for `not_confirmed` / `no_document_shown` | `member_not_reached` (the coherence CHECK).
    documentKind: text('document_kind').$type<IdentityValidationDocumentKind>(),
    // `not_confirmed` only (the coherence CHECK).
    notConfirmedReason: text('not_confirmed_reason').$type<IdentityValidationNotConfirmedReason>(),

    // Tier-1 — the staff note. Required when `not_confirmed`, optional otherwise.
    noteCiphertext: piiColumn(1, MEMBER_IDENTITY_VALIDATION_FIELD_CLASS)('note_ciphertext'),

    // The `member_kyc_profiles.updated_at` of the row the staff member checked (F2).
    kycProfileUpdatedAt: timestamp('kyc_profile_updated_at', { withTimezone: true, mode: 'date' }).notNull(),

    decidedByActorId: text('decided_by_actor_id').notNull(),
    decidedByDisplay: text('decided_by_display').notNull(),
    decidedAt: timestamp('decided_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),

    // NULL = the LIVE act for this member.
    supersededAt: timestamp('superseded_at', { withTimezone: true, mode: 'date' }),
    supersededReason: text('superseded_reason').$type<IdentityValidationSupersessionReason>(),
  },
  (t) => [
    index('member_identity_validations_pariwar_id_idx').on(t.pariwarId),
    index('member_identity_validations_member_idx').on(t.pariwarId, t.memberId),
    // DL1 — at most ONE live act per member (the supersession backstop).
    uniqueIndex('member_identity_validations_one_live_per_member_uq')
      .on(t.memberId)
      .where(sql`superseded_at IS NULL`),
  ],
);

export type MemberIdentityValidationRow = typeof memberIdentityValidations.$inferSelect;
export type MemberIdentityValidationInsert = typeof memberIdentityValidations.$inferInsert;
