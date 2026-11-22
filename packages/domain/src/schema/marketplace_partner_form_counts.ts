// `marketplace_partner_form_counts` table — Story 12.5b (Task 1; Decision `2026-11-22-489` QE13 (A)), migration 0217.
//
// The Trust's OWN per-offer counts for a `partner_form` offer, per IST day (the DB's date — TR20) and kind. ⛔ member column, by
// construction (I4): `countPartnerFormEvent` takes no member argument. Shown to staff with the floor of 5 (`PARTNER_FORM_FIGURE_FLOOR`,
// `-486` R3 B's reason: "A total for a very small offer can point at a person"). ⛔ audit line (anonymous counts).
// `went_to_partner` is bumped by `openPartnerFormVisit` in its own savepoint; the three card kinds are Story 12.3's emitters (KB-3).

import { sql } from 'drizzle-orm';
import { bigint, check, date, foreignKey, pgTable, primaryKey, text, uuid } from 'drizzle-orm/pg-core';

import type { ModuleId, PariwarId } from '../ids/index.js';
import { marketplaceModules } from './marketplace_modules.js';

/** The count kinds. ⚠ LOCKSTEP with 0217's `marketplace_partner_form_counts_kind_check`. */
export const PARTNER_FORM_COUNT_KINDS = ['card_shown', 'card_opened', 'went_to_partner', 'came_back'] as const;
export type PartnerFormCountKind = (typeof PARTNER_FORM_COUNT_KINDS)[number];

export const marketplacePartnerFormCounts = pgTable(
  'marketplace_partner_form_counts',
  {
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),
    moduleId: uuid('module_id').notNull().$type<ModuleId>(),
    /** The IST date (`(clock_timestamp() AT TIME ZONE 'Asia/Kolkata')::date`), from the DB. */
    day: date('day', { mode: 'string' }).notNull(),
    kind: text('kind').notNull().$type<PartnerFormCountKind>(),
    count: bigint('count', { mode: 'number' }).notNull(),
  },
  (t) => [
    primaryKey({ name: 'marketplace_partner_form_counts_pkey', columns: [t.pariwarId, t.moduleId, t.day, t.kind] }),
    foreignKey({
      name: 'marketplace_partner_form_counts_module_fk',
      columns: [t.pariwarId, t.moduleId],
      foreignColumns: [marketplaceModules.pariwarId, marketplaceModules.moduleId],
    }).onDelete('no action'),
    check(
      'marketplace_partner_form_counts_kind_check',
      sql`${t.kind} IN ('card_shown', 'card_opened', 'went_to_partner', 'came_back')`,
    ),
    check('marketplace_partner_form_counts_count_check', sql`${t.count} >= 1`),
  ],
);

export type MarketplacePartnerFormCountRow = typeof marketplacePartnerFormCounts.$inferSelect;
