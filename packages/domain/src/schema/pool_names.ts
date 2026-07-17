// `pool_names` — the per-Pariwar curated pool-name registry (Story 7.2, Task 5; AC5).
//
// A per-Pariwar ordered list of culture-rooted display names that a Pariwar MAY layer over
// the default letter-code shortform. `pool/names.ts` reserves "the next N names in
// `position_in_ordered_list` order" at cycle freeze; `pool/naming.ts`'s resolver overlays a
// reserved name onto the member surface when one is supplied.
//
// ⚠ THIS IS A CAPABILITY, NOT A LAUNCH FEATURE — TWT-Bihar SEEDS ZERO ROWS ⚠
// The structure exists so a FUTURE tenant can populate it; TWT-Bihar's registry is EMPTY
// at launch and its pools display letter codes (F, D, J, H, B…). That is a deliberate
// product decision, not an oversight, and it is an EXPLICITLY TESTED launch invariant
// (AC3/AC5 — see tests/pool/naming.test.ts + tests/integration/pool/pool-names.spec.ts).
// Three sources drive it:
//   · The UX specification's later amendment VETOED the culture-name overlay for
//     TWT-Bihar — "Mahabharata Pool Naming — Dropped"; member surfaces show letter codes
//     only. [Source: ux-design-specification.md §8 L1155, §11 L1297-1301, L1766-1770]
//   · Adversarial review M-10 GATES any Mahabharata seed list on a religious-balance +
//     omen-sensitivity review, given Bihar's Muslim teacher population and the omen
//     sensitivity of certain epic figures' names. That review has NOT happened.
//   · PRD FR-13 + epics 7.2 AC1 mandate a seeded registry — the source-document conflict
//     this story resolves by building the registry INERT (Option B, confirmed by BigDev).
// Do NOT seed names here, in a migration, or in a fixture outside a test. A future
// Pariwar populates this list only AFTER the governance + product review.
//
// ── Why a dedicated table (this RESOLVES sprint-change Item 13) ───────────────
// Item 13 (2026-05-27) left the storage surface open: Niyamavali registry vs branding
// bundle vs separate admin list. This table is the answer. The list needs per-row ordering
// (`position_in_ordered_list`), per-row approval + audit columns, and trustee
// extensibility — none of which a `branding_bundle` JSONB blob (pariwar_passport.ts) holds
// cleanly, and none of which makes it a Niyamavali RULE (it is not a clause; it carries no
// eligibility semantics). `pariwar_wa_templates` is the precedent: a per-Pariwar curated
// ordered list with an approval column and a resolve index.
//
// ── i18n ──────────────────────────────────────────────────────────────────────
// `display_name_en` / `display_name_hi` mirror the `hi | en` v1 locale surface
// (pariwar_passport.default_locale, architecture §2.7). Both NOT NULL: a name that renders
// in only one of a bilingual Pariwar's locales would surface blank to half its members.
// Dormant for TWT-Bihar v1 (empty registry).
//
// Naming discipline per architecture L3663-3677: DB columns snake_case, TS fields
// camelCase, table snake_case-plural.

import { check, index, integer, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

import type { PariwarId, PoolNameId } from '../ids/index.js';

/** The curated-name approval lifecycle. A name is reservable ONLY when `approved` — the
 *  governance gate (adversarial review M-10) is structural, not a convention: an
 *  unreviewed name physically cannot reach a member surface. CHECK-constrained (the
 *  pariwar_wa_templates posture — a new status is a CHECK edit, not an enum migration). */
export const POOL_NAME_APPROVAL_STATUSES = ['pending', 'approved', 'retired'] as const;
export type PoolNameApprovalStatus = (typeof POOL_NAME_APPROVAL_STATUSES)[number];

export const poolNames = pgTable(
  'pool_names',
  {
    // Per-row address (UUID). The natural key is (pariwar_id, position_in_ordered_list) —
    // enforced by the UNIQUE below — but the row is addressed by this opaque id (the
    // pariwar_wa_templates / member_device_tokens precedent).
    poolNameId: uuid('pool_name_id').defaultRandom().primaryKey().$type<PoolNameId>(),

    // Tenant scope (architecture §1.2). RLS predicate column; branded. unFK'd — the
    // pre-Epic-3 posture (mirrors pools.pariwar_id; there is no pariwars table yet).
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

    // The name's 0-based slot in this Pariwar's ordered list. Reservation walks these
    // ASCENDING — the ONLY ordering input, so reservation is deterministic +
    // replay-reproducible (no random(), no clock, no insertion-order dependency).
    positionInOrderedList: integer('position_in_ordered_list').notNull(),

    // The bilingual display names (see the i18n note above). Both required.
    displayNameEn: text('display_name_en').notNull(),
    displayNameHi: text('display_name_hi').notNull(),

    // Free-text provenance: WHERE this name comes from and why it is appropriate for this
    // Pariwar. The durable artifact of the M-10 governance review — a name whose lineage
    // nobody can state is a name nobody reviewed. Nullable (a non-culture-rooted list —
    // e.g. plain regional names — needs no lineage).
    culturalLineageNote: text('cultural_lineage_note'),

    // The governance gate. Default 'pending': a name is INERT until a trustee approves it,
    // so an INSERT alone can never surface a name to members.
    approvalStatus: text('approval_status').notNull().default('pending'),

    // NULL = system / SIE (architecture §1.14 L1262-1268). Registry mutations are trustee
    // actions, so this is normally a real actor; the audit line is written alongside
    // (pool/names.ts).
    createdByActor: uuid('created_by_actor'),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    // One name per slot, per Pariwar — the natural key. Makes the ordering total (no two
    // names can tie for a position, so reservation can never be ambiguous).
    unique('pool_names_pariwar_position_uq').on(t.pariwarId, t.positionInOrderedList),
    // Constrain approval_status to the lifecycle set (the pariwar_wa_templates shape).
    check('pool_names_approval_status_ck', sql`${t.approvalStatus} IN ('pending', 'approved', 'retired')`),
    // A position is an ordinal, never negative.
    check('pool_names_position_non_negative_ck', sql`${t.positionInOrderedList} >= 0`),
    // Backs reserveNames' (pariwar_id, approval_status) ORDER BY position lookup.
    index('pool_names_reserve_idx').on(t.pariwarId, t.approvalStatus, t.positionInOrderedList),
  ],
);

export type PoolNameRow = typeof poolNames.$inferSelect;
export type PoolNameInsert = typeof poolNames.$inferInsert;
