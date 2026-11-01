// `marketplace_partners` table — Story 12.2 (author-commit `2026-11-01-433` QE3 (A)). The per-Pariwar partner REGISTRY.
//
// A partner (HDFC, LIC, a health-camp organiser) a Pariwar offers modules from. Before 12.2 `partner_id` was a brand with
// ⛔ table (Story 12.1); this table gives it a home and a DISPLAY NAME the shelf card (12.3) shows as the partner's brand
// asset (the logo upload is carried — QE8). Per-Pariwar, because lead contracts are per-Pariwar (architecture §3.7) —
// TWT-Bihar's HDFC is ⛔ another Pariwar's HDFC. Global partners are the v2 self-service portal (`contracts/src/partners`).
//
// ── INSERT-ONLY (I7) ──────────────────────────────────────────────────────────────────────────────
// `twt_app` holds SELECT + INSERT only (⛔ UPDATE, ⛔ DELETE): a misspelt partner is a NEW partner; a rename is Not addressed
// (re-trigger: the first rename request). A module's manifest is immutable (ADR-0044) and names its partner by id, so a
// mutable name would silently re-label every published card.
//
// ── The keys ──────────────────────────────────────────────────────────────────────────────────────
//   · `marketplace_partners_pariwar_partner_unique (pariwar_id, partner_id)` — the target of the COMPOSITE FK
//     `marketplace_modules_partner_fk`. Composite, because an FK check runs as the referenced table's owner and IGNORES
//     RLS: a single-column FK would let a module name ANOTHER Pariwar's partner.
//   · `marketplace_partners_pariwar_name_en_unique (pariwar_id, lower(display_name_en))` — ⛔ "LIC" and "Lic" in one
//     Pariwar (23505 → 409 `module_partner.name_taken`).
// `pariwar_id` carries ⛔ FK — there is ⛔ `pariwars` table (the 12.1 posture).
//
// ── The display names ─────────────────────────────────────────────────────────────────────────────
// Validated at WRITE by `marketplace.parsePartnerDisplayNames` (the QE12 write-only rules — `marketplace/filters.ts`),
// which the 12.2 route runs as a PRE-CHECK (no audit line on a refusal). The DB holds ⛔ content CHECK (the 12.1 QE5 rule:
// the DB is the shape backstop, ⛔ a second copy of the grammar).

import { sql } from 'drizzle-orm';
import { pgTable, text, timestamp, unique, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import type { PariwarId, PartnerId } from '../ids/index.js';

export const marketplacePartners = pgTable(
  'marketplace_partners',
  {
    // Server-minted inside the route's idempotency claim (QE13) — ⛔ DB default, ⛔ client input.
    partnerId: uuid('partner_id').primaryKey().$type<PartnerId>(),
    // Tenant key. NOT NULL, ⛔ FK (⛔ `pariwars` table).
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),
    displayNameEn: text('display_name_en').notNull(),
    displayNameHi: text('display_name_hi').notNull(),
    // The `users` id of the admin who registered the partner. ⛔ FK (the 12.1 `audit_id` posture).
    createdByActorId: uuid('created_by_actor_id').notNull(),
    // The `module_partner.created` audit intent line. ⛔ FK.
    auditId: uuid('audit_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    unique('marketplace_partners_pariwar_partner_unique').on(t.pariwarId, t.partnerId),
    uniqueIndex('marketplace_partners_pariwar_name_en_unique').on(t.pariwarId, sql`lower(${t.displayNameEn})`),
  ],
);

export type MarketplacePartner = typeof marketplacePartners.$inferSelect;
