// `claim_ground_inspection_discrepancy_showings` + `claim_ground_inspection_discrepancy_notes` — the inspector's discrepancy
// screen (Story 6.27d, migration 0160; 6.27a PM25 (a), PM17 d's half).
//
// · A SHOWING is ONE per completed FULL-visit assignment (`death_date_source = 'family_statement'` — R1): WHICH question
//   keys differed (`has_died` / `death_date`; possibly EMPTY — "no difference" is a row) and WHEN the result was first
//   RECORDED as delivered (`shown_at`, the DB clock). ⛔ No values, ⛔ no PII. Written AFTER the completion commits, in its
//   OWN transaction, or by the first un-hidden re-read / note write (recomputed as of `completed_at`). ⛔ Never updated or
//   deleted (0160's trigger; deleted only by the claim / inspection cascade).
// · A NOTE is the family's re-told answer, ONE per (assignment, question key) the showing carried. Tier-1 under the
//   EXISTING `ground_inspection` field class (R6 — the same inspector, the same visit). The author's actor id
//   (`normalizeActorId`) and stored admin display name (R4a) are staff data. Append-only but for the DPDPA-RTBF scrub
//   (`member/anonymize.ts`, GI13's block) — 0160's erasure arm.
// RLS in `policies/claim-ground-inspection-discrepancy-{showings,notes}-rls.ts`.

import { sql } from 'drizzle-orm';
import { foreignKey, index, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

import { piiColumn } from '../encryption/column.js';
import type { ClaimId, GroundInspectionId, PariwarId } from '../ids/index.js';
import { claimGroundInspections } from './claim_ground_inspections.js';
import { claims } from './claims.js';

/** The question keys a showing / note may carry. ⚠ LOCKSTEP with 0160's CHECKs (widened by 0188 — Story 6.32 AC6) and the
 *  compared keys of `claim/inspection-discrepancy.ts` (a policy-spec leg pins them equal). */
export const INSPECTION_DISCREPANCY_QUESTION_KEYS = ['has_died', 'death_date', 'death_cause', 'death_illness'] as const;
export type InspectionDiscrepancyQuestionKey = (typeof INSPECTION_DISCREPANCY_QUESTION_KEYS)[number];

export const claimGroundInspectionDiscrepancyShowings = pgTable(
  'claim_ground_inspection_discrepancy_showings',
  {
    groundInspectionId: uuid('ground_inspection_id').primaryKey().$type<GroundInspectionId>(),
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),
    claimCaseId: uuid('claim_case_id').notNull().$type<ClaimId>(),
    /** The keys that differed, in the comparison's order; `[]` = delivered with ⛔ no difference. */
    questionKeys: text('question_keys').array().notNull().$type<InspectionDiscrepancyQuestionKey[]>(),
    /** When the showing was first RECORDED (`clock_timestamp()`) — ⛔ never back-dated. */
    shownAt: timestamp('shown_at', { withTimezone: true, mode: 'date' }).notNull().default(sql`clock_timestamp()`),
  },
  (t) => [
    foreignKey({
      name: 'claim_gi_discrepancy_showings_inspection_fk',
      columns: [t.pariwarId, t.groundInspectionId, t.claimCaseId],
      foreignColumns: [claimGroundInspections.pariwarId, claimGroundInspections.groundInspectionId, claimGroundInspections.claimCaseId],
    }).onDelete('cascade'),
    foreignKey({
      name: 'claim_gi_discrepancy_showings_claim_case_fk',
      columns: [t.pariwarId, t.claimCaseId],
      foreignColumns: [claims.pariwarId, claims.claimCaseId],
    }).onDelete('cascade'),
    index('claim_gi_discrepancy_showings_claim_idx').on(t.pariwarId, t.claimCaseId),
  ],
);

export const claimGroundInspectionDiscrepancyNotes = pgTable(
  'claim_ground_inspection_discrepancy_notes',
  {
    noteId: uuid('note_id').defaultRandom().primaryKey(),
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),
    claimCaseId: uuid('claim_case_id').notNull().$type<ClaimId>(),
    groundInspectionId: uuid('ground_inspection_id').notNull().$type<GroundInspectionId>(),
    questionKey: text('question_key').notNull().$type<InspectionDiscrepancyQuestionKey>(),
    /** Tier-1 — the family's re-told answer. ⛔ Never in an event, log or audit. */
    noteCiphertext: piiColumn(1, 'ground_inspection')('note_ciphertext').notNull(),
    /** The writer, through `normalizeActorId` (R4a). Non-PII. */
    authorActorId: text('author_actor_id').notNull(),
    /** The writer's stored admin display name at write (R4a — staff data, ⛔ member PII). */
    authorDisplay: text('author_display').notNull(),
    notedAt: timestamp('noted_at', { withTimezone: true, mode: 'date' }).notNull().default(sql`clock_timestamp()`),
  },
  (t) => [
    unique('claim_gi_discrepancy_notes_question_uq').on(t.groundInspectionId, t.questionKey),
    foreignKey({
      name: 'claim_gi_discrepancy_notes_inspection_fk',
      columns: [t.pariwarId, t.groundInspectionId, t.claimCaseId],
      foreignColumns: [claimGroundInspections.pariwarId, claimGroundInspections.groundInspectionId, claimGroundInspections.claimCaseId],
    }).onDelete('cascade'),
    foreignKey({
      name: 'claim_gi_discrepancy_notes_claim_case_fk',
      columns: [t.pariwarId, t.claimCaseId],
      foreignColumns: [claims.pariwarId, claims.claimCaseId],
    }).onDelete('cascade'),
    index('claim_gi_discrepancy_notes_claim_idx').on(t.pariwarId, t.claimCaseId),
  ],
);

export type ClaimGroundInspectionDiscrepancyShowingRow = typeof claimGroundInspectionDiscrepancyShowings.$inferSelect;
export type ClaimGroundInspectionDiscrepancyNoteRow = typeof claimGroundInspectionDiscrepancyNotes.$inferSelect;
