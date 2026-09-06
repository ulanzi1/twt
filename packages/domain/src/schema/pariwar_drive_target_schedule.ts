// `pariwar_drive_target_schedule` — the per-Pariwar DRIVE TARGET, versioned (Story 11b.13, Task 2;
// AC1, AC2).
//
// Governance of record: `2026-09-04-190` **cl.7(a)/(b)** (Trustee-ratified — Dhiraj Rahul + Kalpana
// Bharti) · `2026-09-04-191` **cl.4** (a RUPEE figure) · `2026-09-06-203` **cl.5** (**D2** — TWO
// records, ⛔ not one).
//
// ══════════════════════════════════════════════════════════════════════════════════════════════
// ⛔⛔ THIS TABLE CARRIES ⛔ NO REVEAL FLAG, AND THAT IS THE POINT — ⛔ NOT AN OVERSIGHT
// ══════════════════════════════════════════════════════════════════════════════════════════════
// `-190` cl.7 splits **SETTING** the target (cl.7(a), the **Pariwar Admin**) from **REVEALING** it
// (cl.7(c), the **Super Admin**). **D1** made that split structural in the CATALOG — two permission
// keys rather than one key plus a role check inside a handler. **D2** makes it structural HERE.
//
// ⇒ this record is **append-only-by-supersession**: a change **closes the open head and inserts a
// new row**. If that row also carried `reveal_to_members` / `reveal_to_public`, then a
// **`pariwar_admin`** setting a target would be the act that **RE-STATES a `super_admin`-only
// disclosure decision on every single change** — and a copy-forward bug, or a stale read, would
// **silently revert a reveal the Trust made**, with the Pariwar Admin's own rationale recorded as
// its justification. ⚠ That is `2026-09-05-201`'s exact failure mode **with an authority boundary
// crossed**, which is strictly worse than the one `-201` was ruled to fix.
// ⇒ the flags live in `pariwar_drive_target_visibility`, which the target setter ⛔ NEVER touches.
// ⭐ *"A `pariwar_admin` target change leaves both flags byte-unchanged"* is therefore **TRUE BY
// CONSTRUCTION**, ⛔ not a test of discipline. ⛔ Do ⛔ not "simplify" the two records into one.
//
// ── ⭐ THE SHAPE IS `pool_fixed_amount_schedule`'s, AND SO IS THE MONEY VALIDATION ───────────────
// A monotonic `version` per Pariwar, a `[effective_from, effective_until)` window, at most ONE
// open-ended row per Pariwar, and a resolver that returns the row whose window contains `asOf`.
// ⚠⛔ **⛔ NOT `pools.fixed_amount`.** That column (`pools.ts:193`) is a bare `integer().notNull()`
// with ⛔ NO CHECK of any kind — a dev mirroring it writes **zero** constraints. The precedent that
// carries the discipline is `pool_fixed_amount_schedule_amount_positive` (`> 0`) +
// `…_amount_max` (kept IN SYNC with a NAMED constant).
//
// ⛔⛔ **AND `0` IS ⛔ NOT A LEGAL TARGET.** Story 11b.14's meter is `amountRaisedInr / target`, so a
// **₹0** target is a **DIVISION BY ZERO**; D's ruled *"⛔ no target ⇒ ⛔ no bar"* covers **UNSET**,
// ⛔ not **zero-and-set**. ⇒ `> 0`, ⛔ never `>= 0`.
//
// ── ⭐ ONE TARGET PER PARIWAR IS A **RESOLVER** PROPERTY, ⛔ NOT A ROW COUNT ─────────────────────
// `-189` cl.2(d): the SAME target for every drive in a Pariwar. ⛔ There is ⛔ no per-drive override
// — ⛔ not a column, ⛔ not a nullable field, ⛔ not a seam. ⚠ But *"one target"* does ⛔ NOT mean
// *"UPSERT one row"*: that would destroy the change trail AC2 requires **and** leave ⛔ no `version`
// for `-201`'s `expectedVersion` to compare against. ⇒ **one row per CHANGE; one *currently-in-force*
// row per Pariwar**, enforced by the partial unique below.
//
// ── ⛔ NOTHING RENDERS IT ───────────────────────────────────────────────────────────────────────
// `-190` cl.7(b) makes the figure invisible to members and the public. Story 11b.13 ships ⛔ no
// surface that shows it; Story 11b.14 is the first consumer and reads it **SERVER-SIDE ONLY** — the
// value reaches the read model, ⛔ never a response body.
//
// ⚠⛔ **AND IT IS ⛔ NOT AN OBLIGATION.** A member's obligation is `pools.fixed_amount`. ⛔ Nothing
// here may be read when computing what a member owes, is assigned, or has paid (AI-10-1, AC7).
//
// TENANT-ISOLATED read + write (mirrors `pariwar_nominee_bank_masking_schedule` /
// `pool_fixed_amount_schedule`). RLS in policies/pariwar-drive-target-schedule-rls.ts.
//
// Naming discipline per architecture L3663-3677: DB columns snake_case, TS fields camelCase.

import { sql } from 'drizzle-orm';
import { check, index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { MAX_DRIVE_TARGET_INR } from '../pool/drive-target.js';
import type { PariwarId, UserId } from '../ids/index.js';

export const pariwarDriveTargetSchedule = pgTable(
  'pariwar_drive_target_schedule',
  {
    // Per-row address (UUID). Server-side gen_random_uuid() default. Keyed LOGICALLY by
    // (pariwar_id, version) — the unique index below (the pool_fixed_amount_schedule precedent).
    id: uuid('id').defaultRandom().primaryKey(),

    // Tenant key + RLS predicate column. Branded. unFK'd (the pre-Epic-3 per-Pariwar-config posture).
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

    // Monotonically increasing per Pariwar, starting at 1 — the T&C `version` precedent. The
    // (pariwar_id, version) unique index is the structural guard.
    // ⭐ THIS is what `2026-09-05-201`'s `expectedVersion` compares against; without a version chain
    // there would be nothing for a lost-update guard to check.
    version: integer('version').notNull(),

    // The target, in WHOLE RUPEES (`-191` cl.4). STRICTLY POSITIVE and capped — see the header, and
    // the two CHECKs below. ⛔ Never paise, ⛔ never a float, ⛔ never 0.
    targetInr: integer('target_inr').notNull(),

    // ── Effective window (architecture §1.11) — the `pool_fixed_amount_schedule` shape ───────────
    // `effective_from` is when this target comes into force; `effective_until` is when it was
    // superseded (NULL = currently in force). The partial unique below enforces at most ONE
    // open-ended row per Pariwar, which is what makes "one target per Pariwar" a resolver property.
    effectiveFrom: timestamp('effective_from', { withTimezone: true, mode: 'date' }).notNull(),
    effectiveUntil: timestamp('effective_until', { withTimezone: true, mode: 'date' }),

    // ── Governance attribution — the 11a.1 / 11b.3a shape, REUSED (⛔ not re-invented) ────────────
    // ⚠⛔ ALL FOUR ARE NULLABLE AT THE COLUMN LEVEL, and that is ⛔ NOT the requirement being
    // relaxed: a Pariwar that never set a target has no row at all, and a system/seed write has no
    // actor. The REFUSAL is the WRITE PATH's (`pool/drive-target-policy.ts`), ⛔ never the schema's
    // — ⛔ do not infer from these nullable columns that a blank rationale is acceptable.
    changedByActor: uuid('changed_by_actor').$type<UserId>(),
    // The acting admin's `users.display_name`, SNAPSHOT at write time — controlled staff data,
    // ⛔ never email-derived, ⛔ never resolved at read time
    // ([[project_admin_display_name_attribution]]).
    changedByDisplay: text('changed_by_display'),
    rationale: text('rationale'),
    // The pre-generated §1.5 hash-chain audit anchor. The audit LINE is the CALLER's obligation (the
    // 10.12 narrow-write posture); this column is the join back to it.
    auditId: uuid('audit_id'),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    // version >= 1 (monotonic per Pariwar, starting at 1).
    check('pariwar_drive_target_schedule_version_positive', sql`${t.version} >= 1`),

    // ⭐⭐ STRICTLY POSITIVE. ⛔ NOT `>= 0` — a ₹0 target is a division by zero for Story 11b.14's
    // meter, and it is a DIFFERENT state from "no target set" (which is the ABSENCE of a row).
    // Mirrors `pool_fixed_amount_schedule_amount_positive`.
    check('pariwar_drive_target_schedule_target_positive', sql`${t.targetInr} > 0`),

    // ⭐ The data-sanity ceiling. ⚠ Keep IN SYNC with `MAX_DRIVE_TARGET_INR` (pool/drive-target.ts)
    // and the `@twt/contracts` wire bound — the MAX_POOL_FIXED_AMOUNT_INR ↔
    // pool_fixed_amount_schedule_amount_max discipline. ⛔ NOT a policy ceiling.
    check(
      'pariwar_drive_target_schedule_target_max',
      sql`${t.targetInr} <= ${sql.raw(String(MAX_DRIVE_TARGET_INR))}`,
    ),

    // ⭐ The effective window may not be INVERTED. `>=`, ⛔ not `>`: the close-head step sets
    // `effective_until = effective_from` of the superseding row, so a zero-width `[T, T)` window is
    // a LEGITIMATE supersession of a row created at the same instant (the resolver's
    // `effective_until > asOf` predicate never matches it). Only a genuinely backwards window is
    // forbidden. ⚠ Carried from `pariwar_nominee_bank_masking_schedule`, where its ABSENCE from the
    // declaration (while present in the migration) was caught by a review pass — the migration and
    // this file must agree, because the drizzle snapshot is frozen and THIS is what a future reader
    // treats as the table's truth.
    check(
      'pariwar_drive_target_schedule_window_not_inverted',
      sql`${t.effectiveUntil} IS NULL OR ${t.effectiveUntil} >= ${t.effectiveFrom}`,
    ),

    // Structural guard: a (pariwar_id, version) pair is allocated exactly once.
    uniqueIndex('pariwar_drive_target_schedule_pariwar_version_uq').on(t.pariwarId, t.version),

    // Effective-window invariant: at most ONE open-ended (currently-in-force) row per Pariwar — the
    // terms_and_conditions_versions / pool_fixed_amount_schedule open-head precedent. ⭐ THIS is
    // what makes "one target per Pariwar" true while the trail of every prior target survives.
    uniqueIndex('pariwar_drive_target_schedule_pariwar_current_uq')
      .on(t.pariwarId)
      .where(sql`effective_until IS NULL`),

    // The window resolver's driving index: newest effective row per tenant.
    index('pariwar_drive_target_schedule_pariwar_effective_from_idx').on(
      t.pariwarId,
      t.effectiveFrom,
    ),
  ],
);

export type PariwarDriveTargetScheduleRow = typeof pariwarDriveTargetSchedule.$inferSelect;
export type PariwarDriveTargetScheduleInsert = typeof pariwarDriveTargetSchedule.$inferInsert;
