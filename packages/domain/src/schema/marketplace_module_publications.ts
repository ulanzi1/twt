// `marketplace_module_publications` table — Story 12.2 (author-commit `2026-11-01-433` QE4; 12.1 carried item C12).
//
// ONE row per published module: who signed the copy off, against which content hash, and which publish event it went with
// (`module.scheduled` for a future start, `module.activated` otherwise). Written by `marketplace.recordModulePublication`
// in the SAME transaction as the publish event (I2). ⚠ That pairing is the PUBLISH ROUTE's guarantee (it runs the
// command, the record and the COMMIT inside one `mutate` — AC6), ⛔ the database's: nothing here couples the row to the
// module's state or to the event, and `recordModulePublication` does not check either.
//
// ── Why its own table (C12) ───────────────────────────────────────────────────────────────────────
// `marketplace_modules` is IMMUTABLE apart from its projected columns (the 0193 whole-row trigger — 12.1 I2), so data that
// arrives AFTER authoring (the review sign-off) lives beside it — in a row that is itself insert-only (below), ⛔ mutable. It is also the tone sign-off's persistence: Story 2.2 makes the CONSUMER own
// it (ADR-0019), and this is the "published by" record 12.3's card may read.
//
// ── INSERT-ONLY + tenant-safe (I7) ────────────────────────────────────────────────────────────────
// `twt_app` holds SELECT + INSERT only. `module_id` is the PRIMARY KEY, so a second publish is a 23505
// (`marketplace_module_publications_pkey` → 409 `module.already_published`). The FK to the module is COMPOSITE on
// `(pariwar_id, module_id)` → `marketplace_modules_pariwar_module_unique` — an FK check ignores RLS, so a single-column FK
// would let a publication name another Pariwar's module.
//
// ── The content hash ──────────────────────────────────────────────────────────────────────────────
// sha256 hex of `canonicalJsonStringify({ name_en, name_hi, description_en, description_hi, partner_display_name_en,
// partner_display_name_hi })` — everything a member will read on the card (`marketplace.moduleToneContentHash`). The
// manifest and the partner are immutable, so the hash is PROVENANCE (which copy was reviewed), ⛔ an edit detector.

import { sql } from 'drizzle-orm';
import { boolean, check, foreignKey, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import type { ModuleId, PariwarId } from '../ids/index.js';
import { marketplaceModules } from './marketplace_modules.js';

/** The publish events a publication can record (QE7 (A): a future start schedules, otherwise it activates). */
export const MODULE_PUBLISHED_EVENT_TYPES = ['module.scheduled', 'module.activated'] as const;
export type ModulePublishedEventType = (typeof MODULE_PUBLISHED_EVENT_TYPES)[number];

export const marketplaceModulePublications = pgTable(
  'marketplace_module_publications',
  {
    moduleId: uuid('module_id').primaryKey().$type<ModuleId>(),
    // Taken FROM the module row (⛔ a separate argument — `recordModulePublication`). ⛔ `pariwars` FK.
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),
    publishedEventType: text('published_event_type').notNull().$type<ModulePublishedEventType>(),
    toneSignoffContentHash: text('tone_signoff_content_hash').notNull(),
    // The publishing actor — a `users` id, never the module's author (I4). ⛔ FK.
    reviewedByActorId: uuid('reviewed_by_actor_id').notNull(),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    // Both ticks are REQUIRED to be true (QE9) — the CHECKs make a false one unstorable on every write path.
    hindiReviewed: boolean('hindi_reviewed').notNull(),
    // The UX gate "every partner agreement before module activation" — an off-platform obligation the publisher attests.
    partnerAgreementConfirmed: boolean('partner_agreement_confirmed').notNull(),
    // The publish event's audit intent line (`module.scheduled` / `module.activated`). ⛔ FK.
    auditId: uuid('audit_id').notNull(),
  },
  (t) => [
    foreignKey({
      name: 'marketplace_module_publications_module_fk',
      columns: [t.pariwarId, t.moduleId],
      foreignColumns: [marketplaceModules.pariwarId, marketplaceModules.moduleId],
    }),
    check(
      'marketplace_module_publications_event_type',
      sql`${t.publishedEventType} IN ('module.scheduled', 'module.activated')`,
    ),
    check('marketplace_module_publications_content_hash', sql`${t.toneSignoffContentHash} ~ '^[0-9a-f]{64}$'`),
    check('marketplace_module_publications_hindi_reviewed', sql`${t.hindiReviewed}`),
    check('marketplace_module_publications_partner_agreement', sql`${t.partnerAgreementConfirmed}`),
  ],
);

export type MarketplaceModulePublication = typeof marketplaceModulePublications.$inferSelect;
