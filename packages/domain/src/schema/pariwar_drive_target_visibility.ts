// `pariwar_drive_target_visibility` — the per-Pariwar DRIVE TARGET reveal switches (Story 11b.13,
// Task 2; AC3, AC4).
//
// Governance of record: `2026-09-04-190` **cl.7(b)/(c)** (Trustee-ratified — Dhiraj Rahul + Kalpana
// Bharti) · `2026-09-04-189` **cl.3** (*member ≥ public*) · `2026-09-06-203` **cl.5** (**D2**).
//
// ══════════════════════════════════════════════════════════════════════════════════════════════
// ⛔⛔ A SEPARATE RECORD, WRITTEN BY A SEPARATE ROLE, UNDER A SEPARATE KEY
// ══════════════════════════════════════════════════════════════════════════════════════════════
// `-190` cl.7(a) gives **SETTING** the target to the **Pariwar Admin**; cl.7(c) reserves
// **REVEALING** it to the **Super Admin**. That split is expressed three times over, deliberately:
//   1. In the CATALOG — two keys (`pariwar.manage_drive_target` vs
//      `pariwar.manage_drive_target_visibility`), so an auditor sees it where they would look (D1).
//   2. HERE, in the SUBSTRATE — two records, so the `pariwar_admin` write path
//      ⛔ **CANNOT NAME A FLAG COLUMN AT ALL** (D2).
//   3. In the write paths — two setters, in `pool/drive-target-policy.ts`.
// ⇒ *"a `pariwar_admin` target change leaves both flags byte-unchanged"* is **TRUE BY
// CONSTRUCTION**. ⛔ Do ⛔ not merge this table back into the schedule "to save a resolver": the
// merge is what would let an append-only target write silently re-state — or revert — a disclosure
// decision that was never the Pariwar Admin's to make.
//
// ── ⭐ WHY A PLAIN CONFIG ROW AND ⛔ NOT A SECOND SCHEDULE ────────────────────────────────────────
// The `pariwar_public_name_presentation` / `pariwar_directory_publication` shape: ONE row per
// Pariwar (`UNIQUE (pariwar_id)`), mutated in place with `updated_at`. ⚠ **The cost is stated
// rather than hidden:** unlike the target, a reveal has ⛔ no version chain and ⛔ no effective
// window, so a change overwrites the previous value and the TRAIL lives in the §1.5 audit chain
// rather than in this table. ⭐ That is the same posture as the two sibling disclosure controls
// above, both of which are `super_admin`-only governed acts — ⛔ it is not a weaker posture invented
// here. ⚠ `2026-09-05-201`'s `expectedVersion` attaches to the SCHEDULE, which has a version to
// compare; this record's concurrency posture is its own question, answered by its own setter
// (`-203` cl.5) — ⛔ do ⛔ not assume it inherits.
//
// ── ⛔⛔ BOTH FLAGS LIVE IN **ONE** ROW, AND THAT IS LOAD-BEARING ────────────────────────────────
// `-189` cl.3's *member ≥ public* forbids ONE of the four combinations —
// **public-revealed-while-member-hidden** — and AC4 requires it **ENFORCED**, ⛔ not documented.
// ⇒ with both booleans on one row the constraint is a plain `CHECK` with ⛔ no join. Splitting them
// into two rows, or two tables, would make the DB half of that guard inexpressible and leave the
// rule to a handler alone. ⛔ Do not split them.
//
// ── ⭐ AN ABSENT ROW MEANS HIDDEN FROM EVERYONE — cl.7(b), a FAIL-CLOSED default ─────────────────
// ⚠⛔ Deliberately the **OPPOSITE** of `pariwar_nominee_bank_masking_schedule`'s `D8-default`, which
// the Panel ruled **FAIL-OPEN** (`2026-09-02-179` cl.1). ⛔ Do ⛔ not "align" the two on the strength
// of their structural similarity: there the absent row governed data already lawfully published and
// cl.10(b) forbade the code assuming masking; **here cl.7(b) makes invisibility the ruled state and
// a reveal an affirmative act of the Trust.** ⇒ an RLS scope failure yielding zero rows lands on
// **hidden**, ⛔ never on disclosure — which is the property `2026-09-02-179`'s own reactivation
// precondition (b) records as missing on the masking control.
//
// TENANT-ISOLATED read + write. RLS in policies/pariwar-drive-target-visibility-rls.ts.
//
// Naming discipline per architecture L3663-3677: DB columns snake_case, TS fields camelCase.

import { sql } from 'drizzle-orm';
import { boolean, check, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import type { PariwarId, UserId } from '../ids/index.js';

export const pariwarDriveTargetVisibility = pgTable(
  'pariwar_drive_target_visibility',
  {
    // Per-row address (UUID). Server-side default. Keyed logically by pariwar_id (UNIQUE below) —
    // the pariwar_public_name_presentation precedent.
    id: uuid('id').defaultRandom().primaryKey(),

    // Multi-tenant scope (RLS predicate column; branded). ONE config row per Pariwar.
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

    // ── The two INDEPENDENT switches (cl.7(c)) ───────────────────────────────────────────────────
    // ⭐ Independent, ⛔ not levels of one tri-state: a Pariwar may reveal to members without
    // revealing publicly, and that is the ordinary case. Both default FALSE — cl.7(b): a Pariwar
    // with no configuration reveals the target to NOBODY, and a newly SET target is HIDDEN.
    // ⛔ Setting is ⛔ never revealing.
    revealToMembers: boolean('reveal_to_members').notNull().default(false),
    revealToPublic: boolean('reveal_to_public').notNull().default(false),

    // ── Governance attribution — the same four columns as the schedule table ──────────────────────
    // ⚠ NULLABLE at the column level for the same reason and with the same caveat: the REFUSAL of a
    // blank rationale is the WRITE PATH's, ⛔ never the schema's.
    changedByActor: uuid('changed_by_actor').$type<UserId>(),
    changedByDisplay: text('changed_by_display'),
    rationale: text('rationale'),
    auditId: uuid('audit_id'),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    // ⭐⭐ `member ≥ public` AS A DB FACT — `2026-09-04-189` cl.3 (`-195` cl.1).
    // ⛔ Public-revealed while members are hidden would show the unauthenticated internet MORE than
    // a member of the Pariwar the figure belongs to. AC4 requires this ENFORCED; the write path
    // refuses it too, and family 5 wants the app rule mirrored by a constraint rather than trusted
    // to a handler. ⚠ It is ONE-WAY: members-revealed-while-public-hidden is the ordinary case and
    // is ⛔ never refused.
    check(
      'pariwar_drive_target_visibility_member_ge_public',
      sql`NOT (${t.revealToPublic} AND NOT ${t.revealToMembers})`,
    ),

    // ONE row per Pariwar — the pariwar_public_name_presentation precedent. This UNIQUE index also
    // serves every `WHERE pariwar_id = $1` lookup (the RLS predicate, the resolver), so a separate
    // non-unique `(pariwar_id)` index would be dead weight — dropped 2026-09-06 (review).
    uniqueIndex('pariwar_drive_target_visibility_pariwar_id_uq').on(t.pariwarId),
  ],
);

export type PariwarDriveTargetVisibilityRow = typeof pariwarDriveTargetVisibility.$inferSelect;
export type PariwarDriveTargetVisibilityInsert = typeof pariwarDriveTargetVisibility.$inferInsert;
