// `marketplace_partner_form_visits` table — Story 12.5b (Task 1; Decision `2026-11-22-489` QE8, QE9 (A), QE10 (A)), migration 0217.
//
// `-486` R2 C (Trustee-ratified): *"Yes, removed after a number of days"* — the Panel set 90. ONE row per opening of a `partner_form`
// offer's page by a member: the only record the Trust keeps that a named member opened that offer. It is REMOVED 90 days after the row's
// own `opened_at` (W15, the lead-handoff sweep — ⛔ dedup, ⛔ "last opening"), whoever the member is (QE10 (A)).
//
// ── Who reads it (I5) ───────────────────────────────────────────────────────────────────────────────
// ⛔ staff read: no API route, no admin page, no barrel export a route could call. The ONLY readers are erasure (`anonymizeMember` — a HARD
// delete, the row holds nothing but the link), the DPDPA export (`profile.json` `partnerOfferVisits`) and the purge.
// ⛔ audit line, ⛔ `events_log` event, ⛔ log line pairs the member with the offer (QE9 (A)): those are permanent, and would make the
// 90-day removal false (TR8).
//
// The hand-authored half (GRANTs incl. `twt_service` SELECT + DELETE, FORCE RLS, the per-command policies incl. FOR DELETE) lives in 0217.

import { foreignKey, index, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

import type { MemberId, ModuleId, PariwarId } from '../ids/index.js';
import { marketplaceModules } from './marketplace_modules.js';
import { members } from './members.js';

/** `-486` R2 C — the Panel set 90 days, counted from each row's own `opened_at`. */
export const PARTNER_FORM_VISIT_RETENTION_DAYS = 90 as const;

export const marketplacePartnerFormVisits = pgTable(
  'marketplace_partner_form_visits',
  {
    /** Server-minted by `openPartnerFormVisit`. ⛔ DB default. */
    visitId: uuid('visit_id').primaryKey(),
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),
    /** COMPOSITE FK `(pariwar_id, module_id)` — an FK check ignores RLS. */
    moduleId: uuid('module_id').notNull().$type<ModuleId>(),
    memberId: uuid('member_id').notNull().$type<MemberId>(),
    /** The DB clock (`clock_timestamp()`), never the caller's — outside `twt_app`'s INSERT grant. The purge's clock (W15). */
    openedAt: timestamp('opened_at', { withTimezone: true, mode: 'date' }).notNull().default(sql`clock_timestamp()`),
  },
  (t) => [
    foreignKey({
      name: 'marketplace_partner_form_visits_module_fk',
      columns: [t.pariwarId, t.moduleId],
      foreignColumns: [marketplaceModules.pariwarId, marketplaceModules.moduleId],
    }).onDelete('no action'),
    foreignKey({
      name: 'marketplace_partner_form_visits_member_fk',
      columns: [t.memberId],
      foreignColumns: [members.memberId],
    }).onDelete('no action'),
    // The purge (W15).
    index('marketplace_partner_form_visits_opened_at_idx').on(t.openedAt),
    // Erasure and the export.
    index('marketplace_partner_form_visits_pariwar_member_idx').on(t.pariwarId, t.memberId),
    index('marketplace_partner_form_visits_pariwar_module_idx').on(t.pariwarId, t.moduleId),
  ],
);

export type MarketplacePartnerFormVisitRow = typeof marketplacePartnerFormVisits.$inferSelect;
