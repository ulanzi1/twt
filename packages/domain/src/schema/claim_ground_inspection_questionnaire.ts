// `claim_ground_inspection_questionnaires` + `claim_ground_inspection_answers` — the inspector's questionnaire for the family
// at the ground inspection (Story 6.32, migration 0188; `2026-10-28-413` IQ5).
//
// · The HEADER is ONE per assignment: the questionnaire version PINNED at the first save (a newer version applies to new
//   visits only — the neighbours' `claim_peer_mesh_replies` precedent) and `started_at`. ⛔ No PII; ⛔ never updated.
// · An ANSWER row is append-only; the LIVE answer = `superseded_at IS NULL` (ONE per question per assignment). Plaintext codes
//   for the head's letter; a Tier-1 ciphertext for the family's cause and illness under the EXISTING `ground_inspection` field
//   class (IQ5 — the same inspector, the same visit), with `value_code_indexes` — one keyed index per selected code
//   (`ANSWER_CODE_INDEX_FIELD_CLASS`, claim-scoped), NULL when the answer includes *"I don't know"* — so the completion compares
//   the family's account with a neighbour's WITHOUT a decrypt (IQ4 / IQ6).
// · 0188's guard admits a write only while the assignment is `scheduled`, ⛔ a `certificate_check`, and the claim is in the
//   answer window; the erasure arm admits the DPDPA-RTBF scrub (`member/anonymize.ts`). ⛔ Nothing reads these to gate (I1).
// RLS in `policies/claim-ground-inspection-questionnaire-rls.ts`.

import { sql } from 'drizzle-orm';
import { foreignKey, index, pgTable, text, timestamp, unique, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { piiColumn } from '../encryption/column.js';
import type { ClaimId, GroundInspectionAnswerId, GroundInspectionId, PariwarId } from '../ids/index.js';
import { claimGroundInspections } from './claim_ground_inspections.js';
import { claims } from './claims.js';

export const claimGroundInspectionQuestionnaires = pgTable(
  'claim_ground_inspection_questionnaires',
  {
    groundInspectionId: uuid('ground_inspection_id').primaryKey().$type<GroundInspectionId>(),
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),
    claimCaseId: uuid('claim_case_id').notNull().$type<ClaimId>(),
    /** `ground_inspection.v<N>` — pinned at the first save. */
    questionnaireVersionId: text('questionnaire_version_id').notNull(),
    startedAt: timestamp('started_at', { withTimezone: true, mode: 'date' }).notNull().default(sql`clock_timestamp()`),
  },
  (t) => [
    unique('claim_gi_questionnaires_owner_uq').on(t.pariwarId, t.groundInspectionId, t.claimCaseId),
    foreignKey({
      name: 'claim_gi_questionnaires_inspection_fk',
      columns: [t.pariwarId, t.groundInspectionId, t.claimCaseId],
      foreignColumns: [claimGroundInspections.pariwarId, claimGroundInspections.groundInspectionId, claimGroundInspections.claimCaseId],
    }).onDelete('cascade'),
    foreignKey({
      name: 'claim_gi_questionnaires_claim_case_fk',
      columns: [t.pariwarId, t.claimCaseId],
      foreignColumns: [claims.pariwarId, claims.claimCaseId],
    }).onDelete('cascade'),
    index('claim_gi_questionnaires_claim_idx').on(t.pariwarId, t.claimCaseId),
  ],
);

export const claimGroundInspectionAnswers = pgTable(
  'claim_ground_inspection_answers',
  {
    answerId: uuid('answer_id').defaultRandom().primaryKey().$type<GroundInspectionAnswerId>(),
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),
    claimCaseId: uuid('claim_case_id').notNull().$type<ClaimId>(),
    groundInspectionId: uuid('ground_inspection_id').notNull().$type<GroundInspectionId>(),
    questionKey: text('question_key').notNull(),
    /** Plaintext option codes — the head's letter (a NON-sensitive question). */
    valueCodes: text('value_codes').array(),
    /** The family's cause / illness codes as JSON, Tier-1. ⛔ Never in an event, log or audit. */
    valueCiphertext: piiColumn(1, 'ground_inspection')('value_ciphertext'),
    /** The cause / illness ONLY: one keyed index per selected code; NULL for *"I don't know"*. Scrubbed to NULL on erasure. */
    valueCodeIndexes: text('value_code_indexes').array(),
    /** The inspector (or the override holder) who saved it. */
    savedByActorId: text('saved_by_actor_id').notNull(),
    savedAt: timestamp('saved_at', { withTimezone: true, mode: 'date' }).notNull().default(sql`clock_timestamp()`),
    supersededAt: timestamp('superseded_at', { withTimezone: true, mode: 'date' }),
  },
  (t) => [
    foreignKey({
      name: 'claim_gi_answers_questionnaire_fk',
      columns: [t.pariwarId, t.groundInspectionId, t.claimCaseId],
      foreignColumns: [
        claimGroundInspectionQuestionnaires.pariwarId,
        claimGroundInspectionQuestionnaires.groundInspectionId,
        claimGroundInspectionQuestionnaires.claimCaseId,
      ],
    }).onDelete('cascade'),
    foreignKey({
      name: 'claim_gi_answers_claim_case_fk',
      columns: [t.pariwarId, t.claimCaseId],
      foreignColumns: [claims.pariwarId, claims.claimCaseId],
    }).onDelete('cascade'),
    uniqueIndex('claim_gi_answers_live_uq').on(t.pariwarId, t.groundInspectionId, t.questionKey).where(sql`superseded_at IS NULL`),
    index('claim_gi_answers_claim_idx').on(t.pariwarId, t.claimCaseId),
  ],
);

export type ClaimGroundInspectionQuestionnaireRow = typeof claimGroundInspectionQuestionnaires.$inferSelect;
export type ClaimGroundInspectionAnswerRow = typeof claimGroundInspectionAnswers.$inferSelect;
