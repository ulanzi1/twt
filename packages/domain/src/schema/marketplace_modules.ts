// `marketplace_modules` table — Story 12.1 substrate (the SIXTH event-derived-state primitive).
//
// A partner MODULE — an HDFC home-loan, LIC term-plan or health-camp offer a Pariwar shows its members —
// stored as an IMMUTABLE bilingual manifest plus a replay-derived lifecycle cache. The twin of Story 3.1
// `members` + 6.1 `claims` + 7.1 `pools` + 8.1 `alerts` + 10.1 `helpdesk_tickets`. Its state is DERIVED
// from its `events_log` stream (stream_id = module_id) replayed through the pure reducer in
// `marketplace/state.ts`; the five `module.*` events are in `marketplace/events.ts`.
//
// ── The invariants this table carries (Story 12.1 I1–I3, I10) ─────────────────────────────────────
// I1  The PROJECTED columns — `current_state`, `state_event_version`, `slots_remaining`, `archive_reason`,
//     `audit_id`, `updated_at` — are written ONLY by `projectModuleGenesis` / `projectModuleTransition`
//     (`marketplace/project.ts`). Two independent guards: the DB trigger (migration 0193) rejects any
//     INSERT / UPDATE not issued under `app.marketplace_module_state_writer = 'on'`, and the AST gate
//     (scripts/marketplace-module-state-invariant) flags a stray writer at authoring time.
// I2  EVERY OTHER column is immutable after INSERT, even with the guard on. The trigger compares the
//     whole row minus the I1 columns, so a column ADDED LATER is immutable by default — a sibling story
//     that needs a mutable column amends the trigger's exclusion chain AND the gate's `GUARDED_COLUMNS`
//     (carried item C12), or puts mutable presentation data in its own table.
// I3  On INSERT: `current_state = 'draft'`, `state_event_version = 1`, `slots_remaining IS NOT DISTINCT
//     FROM slot_capacity`, `archive_reason IS NULL`. On a guarded UPDATE: `state_event_version` strictly
//     increases; `slots_remaining` stays or drops by exactly 1; a state change never moves it.
// I10 Every transition takes this row's `FOR UPDATE` lock BEFORE any `events_log` append — ONE lock order
//     everywhere (row lock → append → row UPDATE), which is what keeps a lead and an archive from
//     deadlocking (40P01). The helpdesk projector's append-then-UPDATE order is ⛔ copied (TR12).
//
// ── The DB enforces ONLY the six named CHECKs ─────────────────────────────────────────────────────
// Every other content rule (text bounds, the URL rules, the secret-name pattern, the filter grammars,
// the branding bundle) is zod-only, in `marketplace/filters.ts` `parseModuleManifest` (QE5). ⛔ Add a
// content CHECK here without amending the story's QE5 table: the DB is the shape backstop, not a second
// copy of the grammar.
//
// ── module_id is CALLER-MINTED (⛔ DB default) ────────────────────────────────────────────────────
// The caller (12.2's wizard route) mints the id so the intent audit line can name `module/<id>` before
// the write (QE15). `pariwar_id` is NOT NULL with ⛔ FK — there is ⛔ `pariwars` table (G17), and the
// cross-Pariwar manifest is v2 (QE4). `partner_id` has ⛔ FK — partner identity is Story 12.2's.
//
// ── NOT in this table (deliberately) ──────────────────────────────────────────────────────────────
// `commission_terms` (→ 12.2: admin-only home, PRD "never public", the trust-deed "disclosed" tension),
// FR-64's `target_url_or_form` external CTA (Not addressed), lead delivery status (→ 12.5's entity).
//
// Naming discipline (architecture L3663-3677): DB columns snake_case, TS fields camelCase, table
// snake_case-plural; JSONB inner keys snake_case.

import { sql } from 'drizzle-orm';
import {
  bigint,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import type { ModuleId, PariwarId, PartnerId } from '../ids/index.js';
// ⚠ TYPE-ONLY: the filter / branding grammars live with their zod schemas in `marketplace/filters.ts`.
// `import type` is erased at runtime, so schema → marketplace creates ⛔ runtime cycle (QE2). Do NOT turn
// this into a value import.
import type { EligibilityFilterV1, ModuleBrandingBundle, ScopeFilterV1 } from '../marketplace/filters.js';

/**
 * The module lifecycle (QE6) — the pgEnum source (`CREATE TYPE marketplace_module_state`).
 * `draft → scheduled → active → archived`; `draft → active` is legal too, and `archived` is terminal in
 * 12.1 (a `module.restored` is Story 12.6's, carried item C3).
 */
export const MARKETPLACE_MODULE_STATES = ['draft', 'scheduled', 'active', 'archived'] as const;
export const marketplaceModuleStateEnum = pgEnum('marketplace_module_state', MARKETPLACE_MODULE_STATES);
export type MarketplaceModuleState = (typeof MARKETPLACE_MODULE_STATES)[number];

/**
 * WHY a module was archived (QE6) — the pgEnum source (`CREATE TYPE marketplace_module_archive_reason`).
 * `trustee_archived` from any non-archived state; `valid_until_reached` once `now() ≥ valid_until`;
 * `slot_capacity_exhausted` only when active, capped and at 0 places. A new value is judged by §0 on its
 * own (Story 12.1 §0 edge 6) — ⛔ the `-210` enum-mint delegation.
 */
export const MARKETPLACE_MODULE_ARCHIVE_REASONS = [
  'trustee_archived',
  'valid_until_reached',
  'slot_capacity_exhausted',
] as const;
export const marketplaceModuleArchiveReasonEnum = pgEnum(
  'marketplace_module_archive_reason',
  MARKETPLACE_MODULE_ARCHIVE_REASONS,
);
export type MarketplaceModuleArchiveReason = (typeof MARKETPLACE_MODULE_ARCHIVE_REASONS)[number];

/** The one manifest schema version 12.1 writes (`marketplace_modules_manifest_schema_version_v1`). */
export const MODULE_MANIFEST_SCHEMA_VERSION = 1 as const;

export const marketplaceModules = pgTable(
  'marketplace_modules',
  {
    // The module's canonical id == its events_log stream_id. Caller-minted, ⛔ default (QE15).
    moduleId: uuid('module_id').primaryKey().$type<ModuleId>(),
    // Tenant key. NOT NULL, ⛔ FK (G17 / QE4).
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),
    // ⛔ FK — partner identity is Story 12.2's.
    partnerId: uuid('partner_id').notNull().$type<PartnerId>(),

    // ── The immutable manifest content (I2) ──
    nameEn: text('name_en').notNull(),
    nameHi: text('name_hi').notNull(),
    descriptionEn: text('description_en').notNull(),
    descriptionHi: text('description_hi').notNull(),
    // The closed, versioned grammars (QE9) — validated at WRITE by `parseModuleManifest`, ⛔ evaluated in
    // 12.1 (the shelf filter is Story 12.3's, and is ⛔ an authorization — carried item C9).
    eligibilityFilter: jsonb('eligibility_filter').notNull().$type<EligibilityFilterV1>(),
    scopeFilter: jsonb('scope_filter').notNull().$type<ScopeFilterV1>(),
    // The half-open offer window `[valid_from, valid_until)` (QE6).
    validFrom: timestamp('valid_from', { withTimezone: true, mode: 'date' }).notNull(),
    validUntil: timestamp('valid_until', { withTimezone: true, mode: 'date' }).notNull(),
    // NULL = uncapped. When capped, `slots_remaining` is its projected counterpart.
    slotCapacity: integer('slot_capacity'),
    // Where leads go (Story 12.5 delivers them) and the Secret Manager NAME of the signing key (G6 —
    // renamed from the epic's `_ref`; ⛔ a key value).
    leadHandoffUrl: text('lead_handoff_url').notNull(),
    leadHandoffSigningKeySecretName: text('lead_handoff_signing_key_secret_name').notNull(),
    // Partner presentation. ⚠ Partner colours never touch the shelf chrome (UX spec, carried item C5).
    brandingBundle: jsonb('branding_bundle').notNull().$type<ModuleBrandingBundle>(),
    manifestSchemaVersion: smallint('manifest_schema_version').notNull(),

    // ── PROJECTED (I1) — written ONLY by marketplace/project.ts under the trigger guard ──
    currentState: marketplaceModuleStateEnum('current_state').notNull(),
    stateEventVersion: bigint('state_event_version', { mode: 'number' }).notNull(),
    slotsRemaining: integer('slots_remaining'),
    archiveReason: marketplaceModuleArchiveReasonEnum('archive_reason'),
    // The audit line of the MOST RECENT transition (unlike the genesis-only twins). ⛔ FK.
    auditId: uuid('audit_id').notNull(),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    // PROJECTED: set to `now()` on every transition.
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    index('marketplace_modules_pariwar_id_idx').on(t.pariwarId),
    // 12.2's per-(tenant, state) admin list and 12.3's active-module shelf scan.
    index('marketplace_modules_pariwar_state_idx').on(t.pariwarId, t.currentState),
    // ── The ONLY DB-side content rules (QE5) ──
    check('marketplace_modules_window', sql`${t.validUntil} > ${t.validFrom}`),
    check('marketplace_modules_capacity_positive', sql`${t.slotCapacity} > 0`),
    check(
      'marketplace_modules_slots_pair',
      sql`(${t.slotCapacity} IS NULL) = (${t.slotsRemaining} IS NULL)`,
    ),
    check(
      'marketplace_modules_slots_range',
      sql`${t.slotsRemaining} >= 0 AND ${t.slotsRemaining} <= ${t.slotCapacity}`,
    ),
    check(
      'marketplace_modules_archive_reason_pair',
      sql`(${t.currentState} = 'archived') = (${t.archiveReason} IS NOT NULL)`,
    ),
    check('marketplace_modules_manifest_schema_version_v1', sql`${t.manifestSchemaVersion} = 1`),
  ],
);

// Inferred row types (the helpdesk / pools precedent). `MarketplaceModule` is the read shape (QE2).
export type MarketplaceModule = typeof marketplaceModules.$inferSelect;
export type MarketplaceModuleInsert = typeof marketplaceModules.$inferInsert;
