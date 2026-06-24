// `terms_and_conditions_versions` table — Story 2.6 substrate (the T&C registry).
//
// The THIRD Epic-2 registry+public-surface pairing. This table owns the T&C
// registry SHAPE: a versioned, per-Pariwar, version-pinned Terms & Conditions
// record whose `tc_version_id` is a stable, recoverable handle (epic AC3) that
// Story 2.7's consent registry + Epic 3's acceptance flow will store. It mirrors
// `clause_versions.ts` exactly (pgEnum, branded ids, checks, unique/partial
// indexes, naming discipline) — do NOT invent a new shape.
//
// Scope fences (story §"What is NOT in this story"): NO rule-evaluation logic.
// The T&C only REFERENCES pinned clause versions by id (via the
// `terms_and_conditions_pinned_clauses` junction table) — it never interprets the
// Niyamavali payload (freeze row 14). NO consent recording (Story 2.7 / Epic 3).
//
// ── body_html_rendered: precompute at WRITE, render at READ (cache-safe) ──────
// `body_html_rendered` stores the markdown→sanitized-HTML render computed ONCE at
// write time (in `createTcVersion`, server-side, behind auth). The public `/terms`
// page emits it with `set:html` and needs NO markdown dependency. Security is
// non-negotiable: the stored HTML is served unauthenticated + edge-cached, so a
// stored XSS would hit every visitor — `renderTcMarkdown` sanitizes with an
// allowlist at write time (terms-and-conditions/render-markdown.ts).
//
// ── Tenant isolation ─────────────────────────────────────────────────────────
// TENANT-ISOLATED read + write (mirrors clause_versions): NOT cross-readable. Each
// Pariwar's public site reads with `app.pariwar_id` set to that Pariwar, so a
// tenant-scoped SELECT already serves the public render; `pariwar_passport` stays
// the single positive exception to the Story 1.6 leak invariant (ADR-0020).
// RLS in policies/terms-and-conditions-versions-rls.ts.
//
// Naming discipline per architecture L3663-3677: DB columns snake_case, TS fields
// camelCase. Table snake_case-plural (a collection of versioned rows).

import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import type { PariwarId, TcVersionId } from '../ids/index.js';
import { auditLogEntries } from './audit_log_entries.js';

/**
 * The legal-review lifecycle of a T&C version (AC1/AC5/AC6). A version is born
 * `pending` (created before the Story 0.13 legal engagement returns); a reviewer
 * may move it through `under-review` / `reviewed-with-changes-required`; an
 * `approved` version becomes the in-force one and supersedes its predecessor,
 * which flips to `superseded`. The provisional banner (AC5) shows for
 * `pending | under-review`.
 *
 * ⚠ LOCKSTEP with the `@twt/contracts` `TcLegalReviewStatusSchema` z.enum: the
 * literal list is DUPLICATED there because `@twt/domain` must NOT import
 * `@twt/contracts` (turbo cycle). Drift is prevented by an equality assertion in
 * the contracts test comparing this pgEnum's `.enumValues` to the schema's
 * `.options` (the legal import direction is contracts→domain) — mirror the
 * `benefit_mechanism` ↔ `BenefitMechanism` discipline. `pgEnum` (not a raw CHECK)
 * yields a `CREATE TYPE` in the migration.
 */
export const tcLegalReviewStatusEnum = pgEnum('tc_legal_review_status', [
  'pending',
  'under-review',
  'reviewed-with-changes-required',
  'approved',
  'superseded',
]);

export const termsAndConditionsVersions = pgTable(
  'terms_and_conditions_versions',
  {
    // Per-row address (UUID). Server-side gen_random_uuid() default. Branded
    // `TcVersionId`. The AC8 stable recoverable handle — immutable, never reused.
    tcVersionId: uuid('tc_version_id').defaultRandom().primaryKey().$type<TcVersionId>(),

    // Tenant key + RLS predicate column. Branded `PariwarId`.
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

    // Monotonically increasing per Pariwar, starting at 1 (AC1). The
    // (pariwar_id, version) unique index is the structural guard.
    version: integer('version').notNull(),

    // Canonical T&C content authored by the trustee (the source of truth).
    bodyMarkdown: text('body_markdown').notNull(),

    // Precomputed sanitized HTML render of `body_markdown` (AC3). Rendered ONCE at
    // write time (renderTcMarkdown), stored here, emitted by the public page with
    // `set:html`. Keeps markdown libs out of the apps/public graph + makes the page
    // cache-safe. The sanitizer strips <script>, event handlers, javascript:/data: URLs.
    bodyHtmlRendered: text('body_html_rendered').notNull(),

    // DB-authoritative effective window (architecture §1.11). `effective_from` is
    // when this version comes into force; `effective_until` is when it was
    // superseded (NULL = currently in force). The partial-unique index below
    // enforces at-most-one open-ended (currently-in-force) version per Pariwar.
    effectiveFrom: timestamp('effective_from', { withTimezone: true, mode: 'date' }).notNull(),
    effectiveUntil: timestamp('effective_until', { withTimezone: true, mode: 'date' }),

    // The legal-review lifecycle (see tcLegalReviewStatusEnum). Default `pending`
    // (created before the Story 0.13 engagement returns).
    legalReviewStatus: tcLegalReviewStatusEnum('legal_review_status').notNull().default('pending'),

    // The trustee/actor who approved the version (AC6). NULL until `approved`.
    // NEVER rendered on the public page (AC4 — internal attribution).
    legalReviewerActorId: uuid('legal_reviewer_actor_id'),

    // NULL = system / SIE (clause_versions.authored_by_actor precedent). NEVER
    // rendered on the public page (AC4).
    authoredByActor: uuid('authored_by_actor'),

    // DB-authoritative authoring time (architecture §1.11). Default now().
    authoredAt: timestamp('authored_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),

    // FK → the Story 1.10 audit line. The create/approve transitions are
    // audit-or-throw (the audit line is written FIRST, then its id passed in), so a
    // version produced by the Story 2.6 route always carries an audit_id. NULLABLE
    // for the seed/demo placeholder (Task 7), which lands before any audited route
    // call. NEVER rendered on the public page (AC4).
    auditId: uuid('audit_id').references(() => auditLogEntries.auditId),
  },
  (t) => [
    // version >= 1 (monotonic per Pariwar, starting at 1).
    check('terms_and_conditions_versions_version_positive', sql`${t.version} >= 1`),

    // Structural guard that a (pariwar_id, version) pair is allocated exactly once.
    uniqueIndex('terms_and_conditions_versions_pariwar_version_uq').on(t.pariwarId, t.version),

    // AC4 "current effective T&C" resolution: newest effective version per tenant.
    index('terms_and_conditions_versions_pariwar_effective_from_desc_idx').on(
      t.pariwarId,
      t.effectiveFrom.desc(),
    ),

    // Effective-window invariant: at most ONE open-ended (currently-in-force)
    // version per Pariwar. Partial unique on (pariwar_id) WHERE effective_until IS
    // NULL — exactly mirroring clause_drafts' partial-unique builder. drizzle-kit
    // emits the partial predicate from this `.where()`; no hand-supplement needed.
    uniqueIndex('terms_and_conditions_versions_pariwar_current_uq')
      .on(t.pariwarId)
      .where(sql`effective_until IS NULL`),
  ],
);

// Inferred row types for the accessor read/write paths (clause_versions precedent).
export type TcVersionRow = typeof termsAndConditionsVersions.$inferSelect;
export type TcVersionInsert = typeof termsAndConditionsVersions.$inferInsert;

/** The legal-review lifecycle literal union (`pending` | … | `superseded`). */
export type TcLegalReviewStatus = (typeof tcLegalReviewStatusEnum.enumValues)[number];
