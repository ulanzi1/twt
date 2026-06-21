// `clause_drafts` table — Story 2.4 substrate (THE central net-new design; ADR-0021).
//
// Story 2.3's registry has NO draft concept: `createClause` inserts a published
// `version=1` immediately and `amendClause` inserts a published `version+1`
// immediately. But Story 2.4 AC1(b) requires "edit a clause DRAFT that does not
// affect the published version until published," and AC1(d) requires routing the
// draft to a NON-AUTHOR reviewer. A different user (the reviewer) must be able to
// load the EXACT pending content → the draft MUST be server-persisted, not
// client-only state. Hence this table. The published `clause_versions` row is only
// minted at publish time (by the existing `createClause`/`amendClause`), consuming
// the draft (`status → published`, `published_clause_version_id` set).
//
// ── Tenant isolation ─────────────────────────────────────────────────────────
// TENANT-ISOLATED read + write (mirrors clause_versions): drafts are pre-publish
// internal trustee state, never cross-readable. RLS in policies/clause-drafts-rls.ts.
//
// ── Content-bound sign-off (subtle — ADR-0021 §"The sign-off is content-bound") ──
// `tone_review_*` columns record a NON-AUTHOR reviewer's sign-off. The sign-off is
// bound to the EXACT reviewed payload via `tone_review_content_hash` (SHA-256 of the
// canonical-JSON payload). Any edit (`updateDraft`) CLEARS these three columns +
// resets `status → draft`, so edit-after-signoff forces re-review. `resolveDraftSignoff`
// (niyamavali/drafts.ts) returns a sign-off only when the hash still matches the
// CURRENT payload — the tone-review gate itself does NOT compare content hashes.
//
// Naming discipline per architecture L3663-3677: DB columns snake_case, TS fields
// camelCase, JSONB keys snake_case. Table snake_case-plural.

import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import type { ClauseDraftId, ClauseId, ClauseVersionId, PariwarId } from '../ids/index.js';
import { auditLogEntries } from './audit_log_entries.js';
import { type ClausePayload, benefitMechanismEnum } from './clause_versions.js';
import type { AffectedMemberScope } from './niyamavali_amendments.js';

/**
 * The draft operation the trustee is performing. 2.4's UI scope is `create` +
 * `amend` ONLY (AC1) — the domain also has split/merge/deprecate ops, but those
 * are NOT surfaced as drafts at 2.4 (ADR-0021 §"Scope boundary"). `affected_member_scope`
 * is required for `amend` (architecture §1.10) and null for `create`.
 */
export const clauseDraftOperationEnum = pgEnum('clause_draft_operation', ['create', 'amend']);

/**
 * The draft state machine (ADR-0021). `draft` → `in_review` (submit-for-review) →
 * `signed_off` (a non-author recorded a tone-review sign-off) → `published` (the
 * publish route minted the `clause_versions` row + audit line). `discarded` is the
 * terminal cancel state. Any edit on a non-published draft resets the status to
 * `draft` (clearing the sign-off — see header). The OPEN states (the partial-unique
 * index below) are `draft` | `in_review` | `signed_off`.
 */
export const clauseDraftStatusEnum = pgEnum('clause_draft_status', [
  'draft',
  'in_review',
  'signed_off',
  'published',
  'discarded',
]);

export const clauseDrafts = pgTable(
  'clause_drafts',
  {
    // Per-row address (UUID). Server-side gen_random_uuid() default. Branded
    // `ClauseDraftId`. The non-author reviewer loads the pending content by this id.
    draftId: uuid('draft_id').defaultRandom().primaryKey().$type<ClauseDraftId>(),

    // Tenant key + RLS predicate column. Branded `PariwarId`.
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

    // Target clause id: allocated at draft-create for `create`, the existing id for
    // `amend`. Branded `ClauseId` (a slug, NOT a uuid). Format validated by the
    // domain accessor / the AC2 regex; the publish-time `createClause` is the
    // authoritative uniqueness check (the 409 seam).
    clauseId: text('clause_id').notNull().$type<ClauseId>(),

    // create | amend (see clauseDraftOperationEnum).
    operation: clauseDraftOperationEnum('operation').notNull(),

    // Opaque pending rule content (freeze row 14 — stored, diffed, never interpreted).
    payload: jsonb('payload').notNull().$type<ClausePayload>(),

    // DB-authoritative effective instant of the version this draft will publish.
    effectiveDate: timestamp('effective_date', { withTimezone: true, mode: 'date' }).notNull(),

    // The FR-7 / FR-100 discriminator (reuses the clause_versions enum). NOT NULL.
    benefitMechanism: benefitMechanismEnum('benefit_mechanism').notNull(),

    // architecture §1.10 affected-member scope. REQUIRED for `amend`, NULL for
    // `create` (a brand-new clause affects no prior members). Validated by
    // `assertAffectedMemberScope` on the amend path before persist.
    affectedMemberScope: jsonb('affected_member_scope').$type<AffectedMemberScope>(),

    // The draft state machine (see clauseDraftStatusEnum). Default `draft`.
    status: clauseDraftStatusEnum('status').notNull().default('draft'),

    // The trustee who authored/owns the draft. NOT NULL — a draft is always
    // human-authored (contrast clause_versions.authored_by_actor, nullable for SIE).
    authoredByActor: uuid('authored_by_actor').notNull(),

    // Tone-review sign-off attribution (AC1d, AC4). NULLABLE until a non-author
    // reviewer signs off. `tone_review_content_hash` binds the sign-off to the exact
    // reviewed payload (SHA-256 hex of canonicalJson(payload)); a later edit clears
    // all three (re-review required).
    toneReviewedBy: uuid('tone_reviewed_by'),
    toneReviewedAt: timestamp('tone_reviewed_at', { withTimezone: true, mode: 'date' }),
    toneReviewContentHash: text('tone_review_content_hash'),

    // Set on publish — the immutable version row this draft produced. Branded
    // `ClauseVersionId`. NULL until `status = published`.
    publishedClauseVersionId: uuid('published_clause_version_id').$type<ClauseVersionId>(),

    // DB-authoritative timestamps (architecture §1.11). `updated_at` is bumped by
    // the domain accessors on every mutation (drizzle has no auto-onUpdate here).
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),

    // FK → the Story 1.10 audit line minted at publish. NULL until publish.
    auditId: uuid('audit_id').references(() => auditLogEntries.auditId),
  },
  (t) => [
    // List drafts awaiting review / by lifecycle state, per tenant.
    index('clause_drafts_pariwar_status_idx').on(t.pariwarId, t.status),

    // Find the open draft(s) for a clause, per tenant.
    index('clause_drafts_pariwar_clause_idx').on(t.pariwarId, t.clauseId),

    // At most ONE OPEN draft per clause per tenant (avoid two competing drafts of
    // the same clause). Partial: only the open lifecycle states are constrained;
    // published/discarded drafts are historical and may coexist with a fresh open
    // draft. Hand-supplemented in migration 0015 if drizzle cannot express the
    // partial predicate — see the migration header.
    uniqueIndex('clause_drafts_pariwar_clause_open_uq')
      .on(t.pariwarId, t.clauseId)
      .where(sql`status IN ('draft', 'in_review', 'signed_off')`),
  ],
);

// Inferred row types for the accessor read/write paths (clause_versions precedent).
export type ClauseDraftRow = typeof clauseDrafts.$inferSelect;
export type ClauseDraftInsert = typeof clauseDrafts.$inferInsert;

/** The draft operation literal union (`create` | `amend`). */
export type ClauseDraftOperation = (typeof clauseDraftOperationEnum.enumValues)[number];
/** The draft lifecycle literal union (`draft` | `in_review` | … | `discarded`). */
export type ClauseDraftStatus = (typeof clauseDraftStatusEnum.enumValues)[number];
