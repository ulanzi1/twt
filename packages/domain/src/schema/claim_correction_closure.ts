// The correction CLOSURE, the Super Admin's REVIEW and the guarded RE-FILE — Story 6.19c (Task 1; AC6, AC14, AC15,
// AC17). Four tables, migrations 0131–0134:
//
//   · `claim_correction_closures`  — ONE live row per RETURN (`-273` §3b): a declined-closure request and its
//                                    decisions, or a staff case escalated at day 90; the hold, the review, the
//                                    Super Admin's decision, the closure-notice OUTBOX (`-273` §5) and the people
//                                    owed a closure letter (`-274` 2).
//   · `claim_correction_directions` — the Super Admin's directions to a named admin, and their responses (D18).
//   · `claim_refile_confirmations`  — a person's recorded confirmation that a closed claim may be filed again (D19).
//   · `claim_closure_letters`       — the posted closure letters, ONE per person per closure (`-274` 2).
//   · `claim_correction_no_correction_records` — the District Admin's "no correction needed" record (D27; 0136).
//
// ⛔ Nothing here decides a claim by itself (invariant 1): every state change is a human act's writer, in
// `claim/correction-closure.ts` — except the staff case's escalation ROW, a record the day-90 job writes (`-273` §3a).
// PII: every note / direction / response / tracking number is Tier-1 ciphertext (encrypted in the API handler).
// TENANT-ISOLATED; RLS in policies/claim-correction-{closure,direction}-rls.ts, claim-refile-confirmation-rls.ts,
// claim-closure-letter-rls.ts.

import { sql } from 'drizzle-orm';
import { boolean, check, date, index, integer, pgTable, text, timestamp, unique, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { piiColumn } from '../encryption/column.js';
import type { ClaimId, MemberId, PariwarId, TrusteeDecisionId } from '../ids/index.js';
import { claims } from './claims.js';
import { claimCorrectionMarks, claimCorrectionRuns } from './claim_correction_chase.js';
import { claimStateTrusteeDecisions } from './claim_state_trustee_decisions.js';

// ── The vocabularies (⚠ LOCKSTEP with the migrations' CHECKs) ──────────────────────────────────────────────────

/** How a closures row came to be (`-273` §3a). ⚠ LOCKSTEP with 0131. */
export const CLOSURE_ORIGINS = ['declined_closure', 'staff_case'] as const;
export type ClosureOrigin = (typeof CLOSURE_ORIGINS)[number];

/** A closures row's state. `escalated` / `under_review` HOLD the claim (`-273` §3b). ⚠ LOCKSTEP with 0131. */
export const CLOSURE_STATES = ['requested', 'lapsed', 'escalated', 'under_review', 'closed', 'refused', 'approved'] as const;
export type ClosureState = (typeof CLOSURE_STATES)[number];

/** The states that HOLD the claim — only the Super Admin decides it (`-273` §3b/§4, `-274` 1d). */
export const CLOSURE_HELD_STATES = ['escalated', 'under_review'] as const satisfies readonly ClosureState[];

/** The Pariwar Admin's decision on a request (key (3)). ⚠ LOCKSTEP with 0131. */
export const CLOSURE_PARIWAR_DECISIONS = ['approved', 'declined'] as const;
export type ClosurePariwarDecision = (typeof CLOSURE_PARIWAR_DECISIONS)[number];

/** The Super Admin's three decisions (key (4), D17). Each names the terminal state it writes. ⚠ LOCKSTEP with 0131. */
export const CLOSURE_SUPER_ADMIN_DECISIONS = ['closed', 'refused', 'approved'] as const;
export type ClosureSuperAdminDecision = (typeof CLOSURE_SUPER_ADMIN_DECISIONS)[number];

/**
 * `-273` §10 — the CLOSURE-SCOPED reason set, per Super Admin decision (`-255` F3: every decision has a reason and a
 * note). ⛔ No "no response" reason is offered on a refusal (`-274` 1a: a refusal whose real ground is silence would
 * be a closure under another name), and the close reason is refused on a staff origin by the writer and 0131's CHECK.
 * ⚠ LOCKSTEP with 0131's `claim_correction_closures_super_admin_decision_check`.
 */
export const CLOSURE_SUPER_ADMIN_REASONS = {
  closed: ['family_silent_after_reached'],
  refused: ['claim_not_payable', 'other'],
  approved: ['name_difference_accepted', 'details_verified', 'other'],
} as const satisfies Readonly<Record<ClosureSuperAdminDecision, readonly string[]>>;
export type ClosureSuperAdminReason = (typeof CLOSURE_SUPER_ADMIN_REASONS)[ClosureSuperAdminDecision][number];

/** `-273` §7 — the name check's RECORDED state at a Super Admin approval (the highlight's input). ⚠ LOCKSTEP with 0131. */
export const APPROVAL_NAME_CHECK_STATES = ['passing', 'never_checked', 'stale', 'does_not_match'] as const;
export type ApprovalNameCheckState = (typeof APPROVAL_NAME_CHECK_STATES)[number];

/** D18 — whom a direction may name. ⚠ LOCKSTEP with 0132. */
export const DIRECTION_ROLES = ['district_admin', 'pariwar_admin'] as const;
export type DirectionRole = (typeof DIRECTION_ROLES)[number];

/** D18 — only `restart_family_reminders` has a system effect (a `direction` run). ⚠ LOCKSTEP with 0132. */
export const DIRECTION_KINDS = ['restart_family_reminders', 'other'] as const;
export type DirectionKind = (typeof DIRECTION_KINDS)[number];

/** D19 — who recorded a re-file confirmation. ⚠ LOCKSTEP with 0133. */
export const REFILE_CONFIRMATION_VIA = ['district_admin', 'helpline'] as const;
export type RefileConfirmationVia = (typeof REFILE_CONFIRMATION_VIA)[number];

// ── claim_correction_closures (0131) ───────────────────────────────────────────────────────────────────────────

export const claimCorrectionClosures = pgTable(
  'claim_correction_closures',
  {
    closureId: uuid('closure_id').defaultRandom().primaryKey(),
    claimCaseId: uuid('claim_case_id')
      .notNull()
      .$type<ClaimId>()
      .references(() => claims.claimCaseId, { onDelete: 'cascade' }),
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),
    /** `-273` §3b — keyed on the RETURN, ⛔ never the claim. */
    returnDecisionId: uuid('return_decision_id')
      .notNull()
      .$type<TrusteeDecisionId>()
      .references(() => claimStateTrusteeDecisions.decisionId, { onDelete: 'cascade' }),
    origin: text('origin').notNull().$type<ClosureOrigin>(),
    state: text('state').notNull().$type<ClosureState>(),
    // The request (a declined-closure origin only).
    requestFamilyRunId: uuid('request_family_run_id').references(() => claimCorrectionRuns.runId, { onDelete: 'cascade' }),
    requestedByActor: text('requested_by_actor'),
    requestedByDisplay: text('requested_by_display'),
    requestNoteCiphertext: piiColumn(1, 'claim_correction_closure')('request_note_ciphertext'),
    requestedAt: timestamp('requested_at', { withTimezone: true, mode: 'date' }),
    lapsedAt: timestamp('lapsed_at', { withTimezone: true, mode: 'date' }),
    // The Pariwar Admin's decision.
    pariwarDecision: text('pariwar_decision').$type<ClosurePariwarDecision>(),
    pariwarDecidedByActor: text('pariwar_decided_by_actor'),
    pariwarDecidedByDisplay: text('pariwar_decided_by_display'),
    pariwarDecisionNoteCiphertext: piiColumn(1, 'claim_correction_closure')('pariwar_decision_note_ciphertext'),
    pariwarDecidedAt: timestamp('pariwar_decided_at', { withTimezone: true, mode: 'date' }),
    // The escalation and the review.
    escalatedAt: timestamp('escalated_at', { withTimezone: true, mode: 'date' }),
    underReviewSince: timestamp('under_review_since', { withTimezone: true, mode: 'date' }),
    underReviewByActor: text('under_review_by_actor'),
    underReviewByDisplay: text('under_review_by_display'),
    underReviewNoteCiphertext: piiColumn(1, 'claim_correction_closure')('under_review_note_ciphertext'),
    // The Super Admin's decision (`-273` §10).
    superAdminDecision: text('super_admin_decision').$type<ClosureSuperAdminDecision>(),
    superAdminReason: text('super_admin_reason').$type<ClosureSuperAdminReason>(),
    superAdminDecidedByActor: text('super_admin_decided_by_actor'),
    superAdminDecidedByDisplay: text('super_admin_decided_by_display'),
    superAdminNoteCiphertext: piiColumn(1, 'claim_correction_closure')('super_admin_note_ciphertext'),
    superAdminDecidedAt: timestamp('super_admin_decided_at', { withTimezone: true, mode: 'date' }),
    /** `-273` §7 — an approval waived the name check (the `-251` path). */
    nameCheckWaived: boolean('name_check_waived'),
    approvalNameCheckState: text('approval_name_check_state').$type<ApprovalNameCheckState>(),
    // The closure, its notice outbox (`-273` §5) and its letters owed (`-274` 2).
    closedAt: timestamp('closed_at', { withTimezone: true, mode: 'date' }),
    closureNoticeRunId: uuid('closure_notice_run_id').references(() => claimCorrectionRuns.runId, { onDelete: 'cascade' }),
    closureNoticeDueAt: timestamp('closure_notice_due_at', { withTimezone: true, mode: 'date' }),
    closureNoticeDoneAt: timestamp('closure_notice_done_at', { withTimezone: true, mode: 'date' }),
    closureNoticePersonKeys: text('closure_notice_person_keys').array().notNull().default(sql`'{}'::text[]`),
    closureLetterPersonKeys: text('closure_letter_person_keys').array().notNull().default(sql`'{}'::text[]`),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().default(sql`clock_timestamp()`),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().default(sql`clock_timestamp()`),
  },
  (t) => [
    uniqueIndex('claim_correction_closures_one_live_per_return_uq').on(t.returnDecisionId).where(sql`"state" <> 'lapsed'`),
    index('claim_correction_closures_pariwar_claim_idx').on(t.pariwarId, t.claimCaseId),
    // Story 6.23b (0144, RD1) — the unique target for `claim_warning_approvals`' COMPOSITE tenant FK (redundant for
    // uniqueness — the PK already is one).
    unique('claim_correction_closures_pariwar_closure_uq').on(t.pariwarId, t.closureId),
    index('claim_correction_closures_held_idx').on(t.escalatedAt).where(sql`"state" IN ('escalated', 'under_review')`),
    index('claim_correction_closures_closed_idx').on(t.closedAt).where(sql`"state" = 'closed'`),
    check('claim_correction_closures_origin_check', sql`${t.origin} IN ('declined_closure', 'staff_case')`),
    check(
      'claim_correction_closures_state_check',
      sql`${t.state} IN ('requested', 'lapsed', 'escalated', 'under_review', 'closed', 'refused', 'approved')`,
    ),
    // ⚠ The compound CHECKs (the request by origin, the decisions all-or-nothing, the staff case ⛔ never closed, the
    // terminal states, the approval facts, the closed outbox) are 0131's — declared there, asserted by NAME in
    // `claim-correction-closure-policy-regression.spec.ts`. ⛔ Not restated here (one copy cannot drift).
  ],
);

export type ClaimCorrectionClosureRow = typeof claimCorrectionClosures.$inferSelect;

// ── claim_correction_directions (0132) ─────────────────────────────────────────────────────────────────────────

export const claimCorrectionDirections = pgTable(
  'claim_correction_directions',
  {
    directionId: uuid('direction_id').defaultRandom().primaryKey(),
    closureId: uuid('closure_id')
      .notNull()
      .references(() => claimCorrectionClosures.closureId, { onDelete: 'cascade' }),
    claimCaseId: uuid('claim_case_id')
      .notNull()
      .$type<ClaimId>()
      .references(() => claims.claimCaseId, { onDelete: 'cascade' }),
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),
    directedToActor: text('directed_to_actor').notNull(),
    directedToRole: text('directed_to_role').notNull().$type<DirectionRole>(),
    kind: text('kind').notNull().$type<DirectionKind>(),
    textCiphertext: piiColumn(1, 'claim_correction_direction')('text_ciphertext').notNull(),
    createdByActor: text('created_by_actor').notNull(),
    createdByDisplay: text('created_by_display').notNull(),
    openedRunId: uuid('opened_run_id').references(() => claimCorrectionRuns.runId, { onDelete: 'cascade' }),
    responseCiphertext: piiColumn(1, 'claim_correction_direction')('response_ciphertext'),
    respondedAt: timestamp('responded_at', { withTimezone: true, mode: 'date' }),
    respondedByActor: text('responded_by_actor'),
    respondedByDisplay: text('responded_by_display'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().default(sql`clock_timestamp()`),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().default(sql`clock_timestamp()`),
  },
  (t) => [
    index('claim_correction_directions_pariwar_claim_idx').on(t.pariwarId, t.claimCaseId),
    index('claim_correction_directions_closure_idx').on(t.closureId),
    index('claim_correction_directions_directee_open_idx')
      .on(t.pariwarId, t.directedToActor)
      .where(sql`"responded_at" IS NULL`),
    check('claim_correction_directions_role_check', sql`${t.directedToRole} IN ('district_admin', 'pariwar_admin')`),
    check('claim_correction_directions_kind_check', sql`${t.kind} IN ('restart_family_reminders', 'other')`),
  ],
);

export type ClaimCorrectionDirectionRow = typeof claimCorrectionDirections.$inferSelect;

// ── claim_refile_confirmations (0133) ──────────────────────────────────────────────────────────────────────────

export const claimRefileConfirmations = pgTable(
  'claim_refile_confirmations',
  {
    confirmationId: uuid('confirmation_id').defaultRandom().primaryKey(),
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),
    deceasedMemberId: uuid('deceased_member_id').notNull().$type<MemberId>(),
    closedClaimCaseId: uuid('closed_claim_case_id')
      .notNull()
      .$type<ClaimId>()
      .references(() => claims.claimCaseId, { onDelete: 'cascade' }),
    closureId: uuid('closure_id')
      .notNull()
      .references(() => claimCorrectionClosures.closureId, { onDelete: 'cascade' }),
    via: text('via').notNull().$type<RefileConfirmationVia>(),
    confirmedByActor: text('confirmed_by_actor').notNull(),
    confirmedByDisplay: text('confirmed_by_display').notNull(),
    noteCiphertext: piiColumn(1, 'claim_refile_confirmation')('note_ciphertext').notNull(),
    consumedByClaimCaseId: uuid('consumed_by_claim_case_id')
      .$type<ClaimId>()
      .references(() => claims.claimCaseId, { onDelete: 'cascade' }),
    consumedAt: timestamp('consumed_at', { withTimezone: true, mode: 'date' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().default(sql`clock_timestamp()`),
  },
  (t) => [
    uniqueIndex('claim_refile_confirmations_one_open_per_claim_uq')
      .on(t.closedClaimCaseId)
      .where(sql`"consumed_at" IS NULL`),
    index('claim_refile_confirmations_pariwar_member_idx').on(t.pariwarId, t.deceasedMemberId),
    check('claim_refile_confirmations_via_check', sql`${t.via} IN ('district_admin', 'helpline')`),
  ],
);

export type ClaimRefileConfirmationRow = typeof claimRefileConfirmations.$inferSelect;

// ── claim_closure_letters (0134) ───────────────────────────────────────────────────────────────────────────────

export const claimClosureLetters = pgTable(
  'claim_closure_letters',
  {
    letterId: uuid('letter_id').defaultRandom().primaryKey(),
    closureId: uuid('closure_id')
      .notNull()
      .references(() => claimCorrectionClosures.closureId, { onDelete: 'cascade' }),
    claimCaseId: uuid('claim_case_id')
      .notNull()
      .$type<ClaimId>()
      .references(() => claims.claimCaseId, { onDelete: 'cascade' }),
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),
    /** `nominee:<correction-chain root>` | `claimant` — the reminder `recipient_key` form. */
    personKey: text('person_key').notNull(),
    postedOn: date('posted_on', { mode: 'string' }).notNull(),
    trackingNumberCiphertext: piiColumn(1, 'claim_closure_letter')('tracking_number_ciphertext').notNull(),
    recordedByActor: text('recorded_by_actor').notNull(),
    recordedByDisplay: text('recorded_by_display').notNull(),
    deliveredOn: date('delivered_on', { mode: 'string' }),
    screenshotStorageKey: text('screenshot_storage_key'),
    screenshotContentType: text('screenshot_content_type'),
    screenshotSizeBytes: integer('screenshot_size_bytes'),
    deliveryRecordedByActor: text('delivery_recorded_by_actor'),
    deliveryRecordedByDisplay: text('delivery_recorded_by_display'),
    deliveryRecordedAt: timestamp('delivery_recorded_at', { withTimezone: true, mode: 'date' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().default(sql`clock_timestamp()`),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().default(sql`clock_timestamp()`),
  },
  (t) => [
    uniqueIndex('claim_closure_letters_person_uq').on(t.closureId, t.personKey),
    index('claim_closure_letters_pariwar_claim_idx').on(t.pariwarId, t.claimCaseId),
    check('claim_closure_letters_person_key_check', sql`length(btrim(${t.personKey})) > 0`),
    check(
      'claim_closure_letters_delivered_after_posted_check',
      sql`${t.deliveredOn} IS NULL OR ${t.deliveredOn} >= ${t.postedOn}`,
    ),
  ],
);

export type ClaimClosureLetterRow = typeof claimClosureLetters.$inferSelect;

// ── claim_correction_no_correction_records (0136) ──────────────────────────────────────────────────────────────

export const claimCorrectionNoCorrectionRecords = pgTable(
  'claim_correction_no_correction_records',
  {
    recordId: uuid('record_id').defaultRandom().primaryKey(),
    claimCaseId: uuid('claim_case_id')
      .notNull()
      .$type<ClaimId>()
      .references(() => claims.claimCaseId, { onDelete: 'cascade' }),
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),
    returnDecisionId: uuid('return_decision_id')
      .notNull()
      .$type<TrusteeDecisionId>()
      .references(() => claimStateTrusteeDecisions.decisionId, { onDelete: 'cascade' }),
    /** The `staff` mark written with it — the record is LIVE only while this is the return's latest mark. */
    markId: uuid('mark_id')
      .notNull()
      .references(() => claimCorrectionMarks.markId, { onDelete: 'cascade' }),
    noteCiphertext: piiColumn(1, 'claim_correction_closure')('note_ciphertext').notNull(),
    recordedByActor: text('recorded_by_actor').notNull(),
    recordedByDisplay: text('recorded_by_display').notNull(),
    recordedAt: timestamp('recorded_at', { withTimezone: true, mode: 'date' }).notNull().default(sql`clock_timestamp()`),
  },
  (t) => [
    uniqueIndex('claim_correction_no_correction_records_mark_uq').on(t.markId),
    index('claim_correction_no_correction_records_return_idx').on(t.returnDecisionId, t.recordedAt),
    index('claim_correction_no_correction_records_pariwar_claim_idx').on(t.pariwarId, t.claimCaseId),
  ],
);

export type ClaimCorrectionNoCorrectionRecordRow = typeof claimCorrectionNoCorrectionRecords.$inferSelect;
