// `marketplace_partner_form_totals` table — Story 12.5b (Task 1; Decision `2026-11-22-489` QE12 (A)), migration 0217.
//
// `-486` R3 B (Trustee-ratified): *"Totals per offer only — how many started, reached each step, and finished — treated as information,
// never as a fact about any member."* Cost accepted: *"… we suggest totals below 5 are not shown."* The partner's own figures, ENTERED BY
// STAFF (`module.manage`) on the module detail page — ⛔ inbound partner route (the 12.5 boundary fence is unchanged, I10).
//
// ONE entry (`totals_id`) = one period and its stages in order. INSERT-ONLY: a correction is a NEW entry for the same period, and the
// read shows the newest entry per period. A figure below {@link PARTNER_FORM_FIGURE_FLOOR} is stored as `below_floor = true` with a NULL
// figure — the number itself is NEVER stored (the floor CHECK, I4). Advisory: it changes nothing about any member (the K-5 rule).

import { sql } from 'drizzle-orm';
import { boolean, check, date, foreignKey, index, integer, pgTable, primaryKey, smallint, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import type { ModuleId, PariwarId } from '../ids/index.js';
import { marketplaceModules } from './marketplace_modules.js';

/** `-486` R3 B — a figure below 5 is never shown (and, for the partner's totals, never stored). ⚠ LOCKSTEP with the floor CHECK. */
export const PARTNER_FORM_FIGURE_FLOOR = 5 as const;
/** A stage label's bound (`marketplace_partner_form_totals_stage_label_check`). */
export const PARTNER_FORM_STAGE_LABEL_MAX = 80 as const;
/** The most stages one entry may carry (`marketplace_partner_form_totals_stage_order_check`). */
export const PARTNER_FORM_STAGES_MAX = 20 as const;

export const marketplacePartnerFormTotals = pgTable(
  'marketplace_partner_form_totals',
  {
    /** ONE entry — every stage row of it shares the id. Server-minted. */
    totalsId: uuid('totals_id').notNull(),
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),
    moduleId: uuid('module_id').notNull().$type<ModuleId>(),
    periodStart: date('period_start', { mode: 'string' }).notNull(),
    periodEnd: date('period_end', { mode: 'string' }).notNull(),
    /** 1-based, in the partner's order. */
    stageOrder: smallint('stage_order').notNull(),
    /** The partner's own word for the stage ("Started", "Entered OTP", "Finished"). */
    stageLabel: text('stage_label').notNull(),
    /** NULL ⇔ `below_floor`. */
    figure: integer('figure'),
    belowFloor: boolean('below_floor').notNull(),
    enteredByActorId: uuid('entered_by_actor_id').notNull(),
    enteredAt: timestamp('entered_at', { withTimezone: true, mode: 'date' }).notNull().default(sql`clock_timestamp()`),
    /** The route's `module.partner_form_totals_recorded` intent line. ⛔ FK. */
    auditId: uuid('audit_id').notNull(),
  },
  (t) => [
    primaryKey({ name: 'marketplace_partner_form_totals_pkey', columns: [t.totalsId, t.stageOrder] }),
    foreignKey({
      name: 'marketplace_partner_form_totals_module_fk',
      columns: [t.pariwarId, t.moduleId],
      foreignColumns: [marketplaceModules.pariwarId, marketplaceModules.moduleId],
    }).onDelete('no action'),
    index('marketplace_partner_form_totals_pariwar_module_idx').on(t.pariwarId, t.moduleId, t.enteredAt),
    check('marketplace_partner_form_totals_period_check', sql`${t.periodEnd} >= ${t.periodStart}`),
    check('marketplace_partner_form_totals_stage_order_check', sql`${t.stageOrder} BETWEEN 1 AND 20`),
    check('marketplace_partner_form_totals_stage_label_check', sql`char_length(${t.stageLabel}) BETWEEN 1 AND 80`),
    check(
      'marketplace_partner_form_totals_floor_check',
      sql`(${t.belowFloor} AND ${t.figure} IS NULL) OR (NOT ${t.belowFloor} AND ${t.figure} IS NOT NULL AND ${t.figure} >= 5)`,
    ),
  ],
);

export type MarketplacePartnerFormTotalsRow = typeof marketplacePartnerFormTotals.$inferSelect;
