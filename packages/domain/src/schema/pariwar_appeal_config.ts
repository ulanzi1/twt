// `pariwar_appeal_config` — the per-Pariwar appeal-flow config (Story 6.16, Task 1; D-G/D-H).
//
// A minimal Pariwar-scoped config row holding BOTH:
//   · the D-G go-live gate — `legal_review_status` (`pending_legal_review` fail-closed default | `cleared`).
//     The stage routes read this and fail-closed until counsel signs off (AC8). Flipping it to `cleared` is
//     the go-live action, tracked separately from implementation completion (Story 0.13 pattern).
//   · the D-H trust-side per-stage SLA durations — `sla_stage{1,2,3}_days`. READ-ONLY context for
//     `computeStageSlaStatus` (appeal-eligibility.ts); NEVER a write-path gate, never blocks/expires/gates a
//     claimant's right to appeal (D-E). Absent row ⇒ DEFAULT_APPEAL_STAGE_SLA_DAYS + pending_legal_review.
//
// One row per Pariwar (`UNIQUE (pariwar_id)`). No existing generic Pariwar key-value config store exists in
// the substrate, so this is the "otherwise a minimal config table" branch of the story's Task-1 note.
//
// TENANT-ISOLATED (mirrors pariwar_wa_config / pariwar_degraded_mode_declarations — standard inline
// tenant-isolation on pariwar_id). RLS in policies/pariwar-appeal-config-rls.ts.
//
// Naming discipline per architecture L3663-3677: DB columns snake_case, TS camelCase.

import { index, integer, pgTable, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { appealLegalReviewStatusEnum, DEFAULT_APPEAL_STAGE_SLA_DAYS } from '../claim/appeal.js';
import type { PariwarId } from '../ids/index.js';

export const pariwarAppealConfig = pgTable(
  'pariwar_appeal_config',
  {
    // Per-row address (UUID). Server-side default. The row is keyed logically by pariwar_id (UNIQUE below).
    id: uuid('id').defaultRandom().primaryKey(),

    // Multi-tenant scope (RLS predicate column; branded). One config row per Pariwar.
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

    // D-G — the go-live gate. Fail-closed default: the appeal flow is gated OFF until counsel clears it (AC8).
    legalReviewStatus: appealLegalReviewStatusEnum('legal_review_status').notNull().default('pending_legal_review'),

    // D-H — the per-stage SLA durations, in days. Read-only context for computeStageSlaStatus (never a gate).
    slaStage1Days: integer('sla_stage1_days').notNull().default(DEFAULT_APPEAL_STAGE_SLA_DAYS.stage1),
    slaStage2Days: integer('sla_stage2_days').notNull().default(DEFAULT_APPEAL_STAGE_SLA_DAYS.stage2),
    slaStage3Days: integer('sla_stage3_days').notNull().default(DEFAULT_APPEAL_STAGE_SLA_DAYS.stage3),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    index('pariwar_appeal_config_pariwar_id_idx').on(t.pariwarId),
    uniqueIndex('pariwar_appeal_config_pariwar_id_uq').on(t.pariwarId),
  ],
);

export type PariwarAppealConfigRow = typeof pariwarAppealConfig.$inferSelect;
export type PariwarAppealConfigInsert = typeof pariwarAppealConfig.$inferInsert;
