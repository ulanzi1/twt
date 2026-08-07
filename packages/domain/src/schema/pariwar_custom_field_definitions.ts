// `pariwar_custom_field_definitions` table — Story 10.12 (Task 2; AC1/AC3).
//
// The per-Pariwar, per-host-entity, APPEND-ONLY VERSIONED registry of custom-field definitions. The
// Story 10.1 `helpdesk_routing_policy_versions` and Story 10.8 `feature_flag_versions` immutability
// posture applied to tenant-authored field shapes: publishing INSERTs a new version row; prior rows
// are NEVER mutated except the `superseded_by_version` forward-pointer.
//
// ── ⚠ THE ARCHITECTURAL DEVIATION, DECLARED RATHER THAN SMUGGLED (story D1) ────────────────────────
// Architecture §1.7 (architecture.md:966-971) says the medium for field definitions is "Versioned
// per-Pariwar JSON Schema in `packages/domain/per-pariwar/<id>/schema-v<n>.ts`" — a CODE FILE. The
// epic (epics.md:3603) says a `pariwar_custom_field_definitions` registry stores them and "admin UI
// authors these per Pariwar". Those are different mechanisms, and PRD FR-54's stated point —
// "Variation without schema migrations" — sides with the epic: a code-file edit is a release.
//
// This table is the epic's mechanism. §1.7's SUBSTANTIVE properties all survive it: versioned ✓, no
// silent renames ✓ (the key is part of the version pin), deprecation window ✓ (`retired_at`),
// migration-gated where DDL is involved ✓ (`indexed: true` is a REQUEST — see D5). What changes is
// the storage medium, from a TS file to an append-only, RLS-scoped, audit-anchored, trigger-protected
// table — arguably a stronger record than a file.
//
// It is nonetheless a deviation from a ratified statement, and it is NOT this story's to absorb
// silently. ADR-0037 states it in its own section, and ESCALATION 1 raises the §1.7 amendment.
// Architecture is amended by proposal, never by a story's convenience.
//
// ── ⚠ NO CODE-RESIDENT DEFAULT, AND NO `DEFAULT_*_VERSION` CONSTANT (story D2) ─────────────────────
// This is the ONE place this registry departs from BOTH precedents. Story 10.1 keeps its v1 routing
// policy as a code constant that owns version 1; Story 10.8 does the same per flag. Both do it to
// solve a problem custom fields DO NOT HAVE: those registries must always resolve to something, so
// the default is what a scope with no rows falls back to.
//
// A Pariwar with no custom-field definitions has NO CUSTOM FIELDS. That is a perfectly good state
// with no document to represent it. A `DEFAULT_CUSTOM_FIELD_SET` would be inventing an empty thing to
// be the default of. So: versions start at **1**, zero rows resolves to an empty frozen set, and
// there is no version number owned by code.
//
// ── The version pin is the TUPLE, not the row id ───────────────────────────────────────────────────
// `field_key` is the STABLE IDENTITY ACROSS VERSIONS (the 10.8 `flag_key` precedent). The pin is
// `UNIQUE (pariwar_id, host_entity, field_key, version)`. There is no separate versions table and no
// FK column on consumers — a member row records a `definition_set_version` hash, not a row id.
//
// ── RETIREMENT IS A VERSION, NOT A DELETE ──────────────────────────────────────────────────────────
// Retiring a field publishes a NEW version with `retired_at` set. Readers keep accepting a retired
// field's STORED values until the deprecation window closes (§1.7); writers refuse NEW values for it
// immediately. Hence `GRANT SELECT, INSERT, UPDATE` and never DELETE: a deleted definition makes
// every value stored under it uninterpretable, which is data loss dressed as tidying.
//
// JSONB inner keys are snake_case (the `clause_versions` / `cohort_definition` convention), matching
// the `@twt/contracts/custom-fields` wire shape byte-for-byte (sync-guard test).

import { index, integer, jsonb, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

import type { CustomFieldType, PiiTier } from '../custom-fields/types.js';
import type { PariwarCustomFieldDefinitionId, PariwarId, UserId } from '../ids/index.js';

/**
 * The `definition` JSONB body — the tenant-authored field shape.
 *
 * ⚠ snake_case keys, deliberately: this object is serialized to the wire unchanged, so it must match
 * `@twt/contracts`'s `CustomFieldDefinition` byte-for-byte. See `custom-fields/types.ts`'s header.
 *
 * `retired_at` is NOT here. It is a ROW COLUMN, not part of the definition body — the same definition
 * body is republished with the column set when a field is retired, so a retired field's shape stays
 * byte-identical to the shape its stored values were written under. Putting it inside would make the
 * two differ and break that property.
 */
export interface CustomFieldDefinitionJson {
  /** The stable identity across versions. Part of the version pin; can never be renamed (AC2). */
  field_key: string;
  /** English label. Admin surfaces are English-primary (ux-design-specification.md:2379). */
  label_en: string;
  /** Hindi label. REQUIRED — freeze-table row 10, and un-backfillable later (AC9). */
  label_hi: string;
  /** One of `CUSTOM_FIELD_TYPES`. Immutable across versions of the same key (AC2). */
  field_type: CustomFieldType;
  /** `enum` only. May be WIDENED by a later version, never narrowed (AC2). */
  enum_values?: string[];
  /** `string` / `string_array` only. */
  max_length?: number;
  /** `string_array` only. */
  max_items?: number;
  /** REQUIRED — architecture §2.7's declaration moment, restored for a runtime-authored field.
   *  v1 accepts 3 only (AC4). */
  pii_tier: PiiTier;
  /** Whether a member write must supply this key. */
  required: boolean;
  /** ⚠ A RECORDED REQUEST, NEVER AN ACTION (story D5). `true` means "a query pattern was identified
   *  here"; the functional B-tree index on the JSON path is a drizzle-kit migration authored by a
   *  human and listed in `per-pariwar/<id>/index-inventory.ts`. A TENANT ADMIN ISSUES NO DDL, EVER —
   *  it would hand a tenant a lock on a hot table, an unbounded index-growth vector and a
   *  migration-history bypass in one form submission. */
  indexed: boolean;
}

export const pariwarCustomFieldDefinitions = pgTable(
  'pariwar_custom_field_definitions',
  {
    // Per-row address (UUID). DB-defaulted, or PRE-GENERATED by an audited write (the Story 2.4
    // pattern). ⚠ NOT the version pin — see the header.
    id: uuid('id').defaultRandom().primaryKey().$type<PariwarCustomFieldDefinitionId>(),

    // Multi-tenant scope (architecture §1.2). RLS predicate column; branded. NOT nullable — unlike
    // `feature_flag_versions` there is no cross-tenant "global" definition, and there must not be:
    // a globally-authored custom field would be a schema change wearing a tenant's clothes.
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

    // Which entity the field hangs off. `'member'` only in v1, enforced by a CHECK (migration 0095).
    // The column exists from day one so claims/pools are a purely additive extension (story D7).
    hostEntity: text('host_entity').notNull(),

    // The field's STABLE IDENTITY across versions — the `flag_key` precedent. Part of the version
    // pin, so it can never be renamed in place: changing a field's meaning means retiring one key and
    // publishing another (AC2, "no silent renames" — impossible BY CONSTRUCTION, not by discipline).
    fieldKey: text('field_key').notNull(),

    // Monotonic per `(pariwar_id, host_entity, field_key)`. Starts at 1 — there is no code default
    // owning version 1 here (story D2; the ONE deviation from both registry precedents).
    version: integer('version').notNull(),

    // The tenant-authored field shape. Validated by `validateCustomFieldDefinition()` BEFORE it is
    // persisted, and fenced by `frozen-governance.ts` before that (AC3 layer 1).
    definition: jsonb('definition').notNull().$type<CustomFieldDefinitionJson>(),

    // When this version takes effect. `definitionsInForce(at)` resolves per `field_key` the greatest
    // `effective_at <= at`, tie-broken by `desc(version)`.
    effectiveAt: timestamp('effective_at', { withTimezone: true, mode: 'date' }).notNull(),

    // ⚠ RETIREMENT, AS A COLUMN ON A VERSION ROW — not a DELETE and not a status flag on a mutable
    // row. NULL = live. Non-NULL = this version retires the field at that instant: writers refuse new
    // values immediately, readers keep accepting stored ones until the deprecation window closes
    // (§1.7). A retirement is published through the SAME writer as any other version.
    retiredAt: timestamp('retired_at', { withTimezone: true, mode: 'date' }),

    // WHO authored it (NON-PII controlled-staff attribution); null = system/seed.
    authoredByActor: uuid('authored_by_actor').$type<UserId>(),

    // The authoring admin's `users.display_name`, SNAPSHOT at publish time. Controlled staff data,
    // never member PII, never email-derived — the API handler blocks the publish outright when the
    // name is missing rather than falling back ([[project_admin_display_name_attribution]]).
    //
    // ⚠ A SNAPSHOT, NOT A JOIN. Frozen at the instant of the publish and never refreshed: a later
    // rename must not rewrite the displayed history of past publishes, and a deleted admin account
    // must not blank the record of what they did.
    actorDisplay: text('actor_display'),

    // The audit line anchoring this version's creation. PRE-GENERATED by the caller (the Story 2.4
    // anchor pattern); writing the audit LINE is the CALLER's obligation — the narrow-write posture.
    auditId: uuid('audit_id'),

    // The immutability forward-pointer — the ONLY legitimately-mutable column (the clause_versions /
    // routing-policy / feature-flag twin). Set on the PRIOR row when a new version is created; points
    // at the successor's `version` int within the same `(pariwar_id, host_entity, field_key)`.
    // Null = this is the latest. Backed by the composite self-FK in migration 0095.
    supersededByVersion: integer('superseded_by_version'),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    // ⭐ THE VERSION PIN. A duplicate is a 23505 → CustomFieldDefinitionConflictError → 409, never a
    // silent overwrite. Also the target of the composite self-FK on the forward-pointer, which is why
    // it must be the FULL tuple: `version` alone is not unique, so a bare version→version FK would be
    // a constraint on nothing.
    unique('pariwar_custom_field_definitions_pariwar_host_key_version_uq').on(
      t.pariwarId,
      t.hostEntity,
      t.fieldKey,
      t.version,
    ),
    // In-force resolution scans per (tenant, host, instant).
    index('pariwar_custom_field_definitions_pariwar_host_effective_idx').on(
      t.pariwarId,
      t.hostEntity,
      t.effectiveAt,
    ),
  ],
);

export type PariwarCustomFieldDefinitionRow = typeof pariwarCustomFieldDefinitions.$inferSelect;
export type PariwarCustomFieldDefinitionInsert = typeof pariwarCustomFieldDefinitions.$inferInsert;
