// RLS policy declarations for the inspector's questionnaire for the family — Story 6.32, migration 0188 (IQ5).
// PER-COMMAND (⛔ never `FOR ALL`; ⛔ a DELETE leg: rows go only by cascade). The header is SELECT + INSERT (⛔ never
// updated). The answers add an UPDATE leg narrowed by 0188's column grant (`superseded_at`; the RTBF scrub's
// `value_ciphertext` / `value_code_indexes`) and its guard — load-bearing: without it the supersede and `anonymizeMember`'s
// scrub silently update 0 rows under FORCE (`2026-10-04-279` A12).

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { claimGroundInspectionAnswers, claimGroundInspectionQuestionnaires } from '../schema/claim_ground_inspection_questionnaire.js';
import { appRole } from './_roles.js';

const SCOPE = sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`;

export const claimGroundInspectionQuestionnairesTenantIsolationSelect = pgPolicy(
  'claim_gi_questionnaires_tenant_isolation_select',
  { as: 'permissive', for: 'select', to: appRole, using: SCOPE },
).link(claimGroundInspectionQuestionnaires);

export const claimGroundInspectionQuestionnairesTenantIsolationInsert = pgPolicy(
  'claim_gi_questionnaires_tenant_isolation_insert',
  { as: 'permissive', for: 'insert', to: appRole, withCheck: SCOPE },
).link(claimGroundInspectionQuestionnaires);

export const claimGroundInspectionAnswersTenantIsolationSelect = pgPolicy(
  'claim_gi_answers_tenant_isolation_select',
  { as: 'permissive', for: 'select', to: appRole, using: SCOPE },
).link(claimGroundInspectionAnswers);

export const claimGroundInspectionAnswersTenantIsolationInsert = pgPolicy(
  'claim_gi_answers_tenant_isolation_insert',
  { as: 'permissive', for: 'insert', to: appRole, withCheck: SCOPE },
).link(claimGroundInspectionAnswers);

export const claimGroundInspectionAnswersTenantIsolationUpdate = pgPolicy(
  'claim_gi_answers_tenant_isolation_update',
  { as: 'permissive', for: 'update', to: appRole, using: SCOPE, withCheck: SCOPE },
).link(claimGroundInspectionAnswers);
