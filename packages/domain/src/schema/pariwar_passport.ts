// `pariwar_passport` table — Story 1.7 substrate (FR-63 + FR-60 runtime subset).
//
// The first domain table after `events_log`, and the first one deliberately NOT
// tenant-isolated on read: a Pariwar's public identity + branding must be
// readable across tenants so a multi-Pariwar admin, the public Astro shell, and
// branded chrome can render any Pariwar's name / logo / colours. The RLS
// carve-out (cross-Pariwar READ, tenant-isolated WRITE) lives in
// packages/domain/src/policies/pariwar-passport-rls.ts per architecture §1.2
// line 726-729; this file owns only the column shape.
//
// 1:1 with a Pariwar — `pariwar_id` is BOTH the primary key (a singleton
// identity document) AND the tenant key the write policy scopes on. Table named
// SINGULAR (`pariwar_passport`) as a deliberate exception to the snake_case-plural
// convention (architecture §Naming patterns line 3664): it reads as the identity
// document keyed by its owner, not a collection. Recorded in the Story 1.7 ADR.
//
// Naming discipline per architecture line 3663-3677:
//   - DB columns are snake_case (display_name_en, branding_bundle, …)
//   - TS field names are camelCase (displayNameEn, brandingBundle, …)
//   - JSONB keys are snake_case (architecture §Naming patterns line 3668)

import { jsonb, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import type { PariwarId } from '../ids/index.js';

/**
 * Runtime-readable branding subset (FR-63). This is NOT the FR-60 build-time
 * bundle (tokens/eas.json/i18n overlays swapped per app build) — only the subset
 * a rendering surface reads dynamically from the DB for chrome. JSONB keys are
 * snake_case per architecture §Naming patterns line 3668. Colours are hex strings
 * (`#RRGGBB`); the transport contract (packages/contracts/pariwar-passport)
 * enforces the hex shape — the DB column trusts the service layer.
 */
export interface BrandingBundle {
  /** Primary logo URL (light backgrounds). */
  logo_url: string;
  /** Optional dark-background logo variant. */
  logo_url_dark?: string;
  /** Primary brand colour, hex `#RRGGBB`. */
  primary_color: string;
  /** Secondary brand colour, hex `#RRGGBB`. */
  secondary_color: string;
  /** Optional accent colour, hex `#RRGGBB`. */
  accent_color?: string;
}

/**
 * Default UI locale for a Pariwar's chrome. Modelled as a Postgres enum (idiomatic
 * Drizzle — yields a TypeScript `'hi' | 'en'` union AND a `CREATE TYPE` in the
 * migration) rather than a raw CHECK string. The Pariwar-Passport is the org
 * identity document; `hi | en` matches the v1 i18n surface (architecture §2.7).
 */
export const localeEnum = pgEnum('locale', ['hi', 'en']);

export const pariwarPassport = pgTable('pariwar_passport', {
  // Primary key AND tenant key. 1:1 with a Pariwar. Branded `PariwarId` at the TS
  // layer (architecture §Naming patterns line 3700-3708) — the brand is
  // compile-time only; the column is a plain pg `uuid`. NO defaultRandom(): the
  // pariwar_id is assigned by the provisioning flow (Story 1.15), not minted here.
  pariwarId: uuid('pariwar_id').$type<PariwarId>().primaryKey(),

  // Public display names (architecture §2.7 bilingual chrome). NOT NULL — every
  // Pariwar must present a name in both languages for the carve-out consumers.
  displayNameEn: text('display_name_en').notNull(),
  displayNameHi: text('display_name_hi').notNull(),

  // Registered legal/trust name — public registry data (org-level, not member PII).
  legalName: text('legal_name').notNull(),

  // Government trust-registration number. PII-TIER DECISION (D7-1.5): tier-3
  // (plaintext, public-by-nature org identity). The cross-readable SELECT carve-out
  // is meant to EXPOSE the Passport, so a tier-2 blind-index / tier-1 envelope here
  // would contradict the carve-out (encrypted bytes are useless to cross-tenant
  // readers). Assessed against the FR-74 Public-vs-Private matrix as public registry
  // data — so plain `text`, NOT annotated via piiColumn(). Nullable: not every
  // Pariwar has a registration number recorded at provisioning time (a Pariwar may
  // be a registered trust, a society, or informal). Decision recorded in the ADR.
  trustRegistrationId: text('trust_registration_id'),

  // Runtime branding subset (see BrandingBundle above). NOT NULL — chrome always
  // needs *something* to render; provisioning seeds a default palette.
  brandingBundle: jsonb('branding_bundle').$type<BrandingBundle>().notNull(),

  // Default chrome locale, constrained to hi | en by the `locale` pgEnum.
  localeDefault: localeEnum('locale_default').notNull(),

  // Database-authoritative creation time (architecture §1.11 + line 3809).
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
    .notNull()
    .defaultNow(),

  // NULL = system / SIE per the events_log.actor_id precedent (architecture §1.14
  // line 1262-1268). Unconstrained `uuid` — NO foreign key: the admin users table
  // does not exist until Story 1.9+, so a FK has nothing to reference yet. A FK
  // can be added retroactively once that table lands.
  createdBy: uuid('created_by'),

  // Additive vs the epic column list — the cache freshness-timestamp /
  // stale-while-revalidate marker per architecture §1.10 line 1068-1070 (AC-3).
  // A BEFORE UPDATE trigger (hand-supplemented in migration 0003) bumps this on
  // every UPDATE so the 60s-freshness contract has a real changed-at signal.
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
    .notNull()
    .defaultNow(),
});

// Inferred row types for the read accessor + write path (packages/domain/src/
// pariwar-passport/). `select` is the full row; `insert` allows DB-defaulted
// columns to be omitted.
export type PariwarPassportRow = typeof pariwarPassport.$inferSelect;
export type PariwarPassportInsert = typeof pariwarPassport.$inferInsert;
