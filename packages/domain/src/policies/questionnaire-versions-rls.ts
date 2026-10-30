// RLS policy declarations for the QUESTIONNAIRE CHAIN — Story 6.33, migration 0192 (`2026-10-30-421` QE11). PER-COMMAND
// (⛔ `FOR ALL`; ⛔ an UPDATE or DELETE leg: both tables are append-only).
//
// · `questionnaire_versions` SELECT is `USING (true)` — a Pariwar's pinned version can originate in ANOTHER Pariwar (made
//   live for all) and must resolve under the reading Pariwar's RLS; question text is reference data every tenant already
//   reads from the code registry. ⚠ The API (⛔ RLS) hides another Pariwar's open proposals from all but the Super Admin.
//   INSERT: the CURRENT Pariwar AND ⛔ `direct` — every direct version is written through the global path.
// · `questionnaire_version_steps` keys on `scope_pariwar_id` (TENANCY), ⛔ `target_pariwar_id` (NULL on the four tenant
//   steps — keying on it would refuse every Pariwar Admin's own step). SELECT: own scope OR a global row (a `made_live`
//   for all) OR ANY step of a version this Pariwar ORIGINATED (review RV2 — a `made_live` for ANOTHER Pariwar is scoped to
//   that target; without this leg the origin's `withdraw` read the stage as `approved` and withdrew a live version). INSERT: own scope AND only `proposed` / `approved` / `returned` / `withdrawn` — `made_live` /
//   `pariwar_reverted` and a NULL scope only through the global path.
// ⚠ RE-EXAMINE the steps SELECT's third leg (review RV2 / RP20) when ANY new consumer returns step rows from a TENANT handle: it exposes, at the DB
//   layer, the target's uuid, the Super Admin's name and the time of a `made_live` for another Pariwar; the API's `shownSteps()` withholds them.
// ⚠ The jobs' pool is BYPASSRLS: ⛔ resolver query relies on these for its Pariwar filter (QE12 R4).

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { questionnaireVersionSteps, questionnaireVersions } from '../schema/questionnaire_versions.js';
import { appRole } from './_roles.js';

const CURRENT = sql`nullif(current_setting('app.pariwar_id', true), '')::uuid`;

export const questionnaireVersionsRead = pgPolicy('questionnaire_versions_read', {
  as: 'permissive',
  for: 'select',
  to: appRole,
  using: sql`true`,
}).link(questionnaireVersions);

export const questionnaireVersionsTenantInsert = pgPolicy('questionnaire_versions_tenant_insert', {
  as: 'permissive',
  for: 'insert',
  to: appRole,
  withCheck: sql`origin_pariwar_id = ${CURRENT} AND NOT direct`,
}).link(questionnaireVersions);

export const questionnaireVersionStepsRead = pgPolicy('questionnaire_version_steps_read', {
  as: 'permissive',
  for: 'select',
  to: appRole,
  using: sql`scope_pariwar_id IS NULL OR scope_pariwar_id = ${CURRENT} OR "questionnaire_version_steps"."version_id" IN (SELECT v."version_id" FROM "questionnaire_versions" v WHERE v."origin_pariwar_id" = ${CURRENT})`,
}).link(questionnaireVersionSteps);

export const questionnaireVersionStepsTenantInsert = pgPolicy('questionnaire_version_steps_tenant_insert', {
  as: 'permissive',
  for: 'insert',
  to: appRole,
  withCheck: sql`scope_pariwar_id = ${CURRENT} AND step IN ('proposed', 'approved', 'returned', 'withdrawn')`,
}).link(questionnaireVersionSteps);
