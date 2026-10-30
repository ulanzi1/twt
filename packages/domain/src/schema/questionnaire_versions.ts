// `questionnaire_versions` + `questionnaire_version_steps` — the QUESTIONNAIRE CHAIN (Story 6.33, migration 0192;
// `2026-10-10-304` Q7 / Q8; `2026-10-30-421` QE2 / QE3 / QE11).
//
// · A VERSION row is IMMUTABLE: the definition (JSONB — parsed STRICTLY and re-validated on every read, QE12 R1), its
//   base, the CODE version whose ruled questions it carries (`ruled_base_code_version_id` — QE5, recorded at write), the
//   Pariwar it was written in (NULL ⇔ a direct all-Pariwar version), the author, and the Super Admin's direct path.
//   Numbered from 1000 (QE3). The id is generated APP-side (`chain:<id>` is stamped before validating — QE4).
// · A STEP row is the chain's log; current state is DERIVED from the steps ordered by `seq` (`questionnaires/derive.ts`).
//   `target_pariwar_id` = RESOLUTION (a `made_live` for P / all = NULL; a `pariwar_reverted` names P);
//   `scope_pariwar_id` = TENANCY (RLS keys on it — ⛔ on the target, which is NULL on the four tenant steps).
// Both append-only by grant and trigger (I2). PII: ⛔ none — staff policy text and staff display names
// ([[project_admin_display_name_attribution]]). RLS in `policies/questionnaire-versions-rls.ts`.

import { sql } from 'drizzle-orm';
import { bigint, boolean, check, foreignKey, index, integer, jsonb, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

import type { PariwarId } from '../ids/index.js';

export const questionnaireVersions = pgTable(
  'questionnaire_versions',
  {
    id: uuid('id').primaryKey(),
    kind: text('kind').notNull().$type<'peer_mesh' | 'ground_inspection'>(),
    version: integer('version').notNull(),
    /** `<kind>.v<version>` — what a reply / visit pins. */
    versionId: text('version_id').notNull(),
    baseVersionId: text('base_version_id').notNull(),
    ruledBaseCodeVersionId: text('ruled_base_code_version_id').notNull(),
    originPariwarId: uuid('origin_pariwar_id').$type<PariwarId>(),
    definition: jsonb('definition').notNull().$type<unknown>(),
    authoredByActor: text('authored_by_actor').notNull(),
    authoredByDisplay: text('authored_by_display').notNull(),
    authoredAt: timestamp('authored_at', { withTimezone: true, mode: 'date' }).notNull().default(sql`clock_timestamp()`),
    direct: boolean('direct').notNull(),
    reason: text('reason'),
  },
  (t) => [
    unique('questionnaire_versions_version_id_uq').on(t.versionId),
    unique('questionnaire_versions_kind_version_uq').on(t.kind, t.version),
    index('questionnaire_versions_origin_idx').on(t.originPariwarId, t.kind),
    check('questionnaire_versions_floor_check', sql`${t.version} >= 1000`),
  ],
);

export const questionnaireVersionSteps = pgTable(
  'questionnaire_version_steps',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    versionId: text('version_id').notNull(),
    step: text('step').notNull().$type<'proposed' | 'approved' | 'returned' | 'withdrawn' | 'made_live' | 'pariwar_reverted'>(),
    targetPariwarId: uuid('target_pariwar_id').$type<PariwarId>(),
    scopePariwarId: uuid('scope_pariwar_id').$type<PariwarId>(),
    actor: text('actor').notNull(),
    actorDisplay: text('actor_display').notNull(),
    note: text('note'),
    hindiReviewed: boolean('hindi_reviewed'),
    classificationAttested: boolean('classification_attested'),
    /** THE order (QE2) — ⛔ `at`. */
    seq: bigint('seq', { mode: 'number' }).generatedAlwaysAsIdentity().notNull(),
    at: timestamp('at', { withTimezone: true, mode: 'date' }).notNull().default(sql`clock_timestamp()`),
  },
  (t) => [
    unique('questionnaire_version_steps_seq_uq').on(t.seq),
    foreignKey({ name: 'questionnaire_version_steps_version_fk', columns: [t.versionId], foreignColumns: [questionnaireVersions.versionId] }),
    index('questionnaire_version_steps_version_idx').on(t.versionId, t.seq),
    index('questionnaire_version_steps_live_idx').on(t.targetPariwarId, t.seq).where(sql`step IN ('made_live', 'pariwar_reverted')`),
  ],
);
