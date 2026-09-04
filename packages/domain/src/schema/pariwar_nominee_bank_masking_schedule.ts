// `pariwar_nominee_bank_masking_schedule` — the per-Pariwar NOMINEE-BANK MASKING SCHEDULE
// (Story 11b.3a, Task 1; AC3).
//
// Governance of record: `2026-08-28-160` **cl.10(b)–(d), (g)** (Trustee-ratified) ·
// `2026-09-02-178` (the knob is held by the **Trust centrally**, `super_admin`) ·
// `2026-09-02-179` cl.1 (`D8-default` **FAIL-OPEN**) · `2026-09-02-183` cl.4 (the third setting).
//
// ══════════════════════════════════════════════════════════════════════════════════════════════
// ⛔⛔ *"CONFIGURATION OVER ONE RECORD"* — AND A BOOLEAN HERE IS A **DEFECT**, ⛔ NOT A CLEANUP
// ══════════════════════════════════════════════════════════════════════════════════════════════
// `2026-08-28-160` **cl.10(d)**, verbatim: policy must move **full public disclosure → shorter
// post-campaign exposure → immediate masking → permanent masked presentation** ⛔ **WITHOUT
// redesigning the underlying bank-detail record** and ⛔ **without a schema change** ⇒
// *"**configuration over one record**, ⛔ never a second record and ⛔ never a boolean. A later
// 'simplification' to a boolean is a **defect**, not a cleanup."*
//
// ⇒ ⛔ **DO NOT** add an `is_masked` column to `claim_nominee_bank_accounts`.
// ⇒ ⛔ **DO NOT** write a second, masked copy of a bank row.
// ⇒ ⛔ **DO NOT** collapse `masking_mode` + `mask_after_days` into one boolean, one nullable integer,
//      or "just a number where NULL means forever". The Panel named **THREE** settings
//      (`0 days` · `N days` · `permanent`) and a two-valued column cannot carry three.
// ⭐ AND **cl.10(g)** is the other half: *"complete bank details remain available in the protected
// internal record."* ⇒ masking is a **PROJECTION**, ⛔ never a deletion, ⛔ never an overwrite,
// ⛔ never a re-encrypt. Nothing in this table's write path touches a `claim_nominee_bank_accounts`
// row, and nothing ever may.
//
// ── ⭐ THE SHAPE IS `pool_fixed_amount_schedule`'s, AND THE PANEL NAMED IT ────────────────────────
// `2026-08-28-160`'s own reference list calls `pool_fixed_amount_schedule` *"the precedent for clause
// 10(c)/(d)"*. So this is the same per-Pariwar EFFECTIVE-WINDOW record, modelled 1:1 on
// `terms_and_conditions_versions` through it: a monotonic `version` per Pariwar, a
// `[effective_from, effective_until)` window, at most ONE open-ended row per Pariwar, and the
// resolver returns the row whose window contains `asOf`.
// ⚠ ⇒ *"reversible and re-configurable"* (**cl.10(c)**) is STRUCTURAL, ⛔ not a promise: a later
// change closes the prior head and inserts a new one. ⛔ There is no "already masked, cannot unmask"
// branch anywhere, and there must never be one.
//
// ── ⭐ THE SUBJECT IS **ONE**: THE FOUR NOMINEE BANK FIELDS ──────────────────────────────────────
// ⚠ Recorded because it was briefly in doubt. `2026-09-02-174` cl.3 appeared to extend cl.10's staged
// schedule to CONTRIBUTOR NAMES, which would have given this table a second subject. ⛔ That was
// CORRECTED the same day and Panel-ratified (`2026-09-02-175`): the staged reduction is the **nominee
// bank fields'**, which is what cl.10 always said. ⇒ `D12-schedule` is **VACATED**. ⛔ Do ⛔ not
// generalise this table to *"any masked field"* on the strength of a withdrawn clause.
//
// ── ⭐ NO ROW MEANS VISIBLE — `D8-default` RULED **FAIL-OPEN** (`2026-09-02-179` cl.1) ────────────
// ⛔ Immediate masking is ⛔ NOT the code's assumption; **cl.10(b)** forbids exactly that, and
// *"0 days"* is a value an admin CHOSE. ⚠⛔ Its cost is part of the ruling: `-178` put authority
// centrally, so a Pariwar cannot set its own window ⇒ **fail-open governs EVERY Pariwar until the
// Trust acts**, and what stays exposed is a FULL ACCOUNT NUMBER. The Panel ruled it knowing that.
//
// ── ⚠⛔ A CHANGE HERE IS ⛔ NOT IMMEDIATE ON THE PUBLIC PAGE ─────────────────────────────────────
// `/sahyog-vivran/[driveToken]` is `edge_cacheable` at `s-maxage=300`, so the PREVIOUS
// projection keeps being served from **every warm PoP for up to five minutes** — and on this surface
// what is served stale is a **full account number**. ⛔ **Direct SQL is NOT the operational
// fallback.** This statement is one of THREE (the admin copy and the route header carry the others),
// because it is the property most likely to be discovered during an incident rather than before one.
//
// TENANT-ISOLATED read + write (mirrors `pariwar_public_name_presentation` / `pool_fixed_amount_
// schedule`). RLS in policies/pariwar-nominee-bank-masking-schedule-rls.ts.
//
// Naming discipline per architecture L3663-3677: DB columns snake_case, TS fields camelCase.

import { sql } from 'drizzle-orm';
import { check, index, integer, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import {
  MAX_NOMINEE_BANK_MASK_AFTER_DAYS,
  NOMINEE_BANK_MASKING_MODES,
} from '../claim/nominee-bank-masking.js';
import type { PariwarId, UserId } from '../ids/index.js';

/**
 * The setting discriminator — generated FROM the `claim/nominee-bank-masking.ts` tuple, which is the
 * one spelling authority (the `pariwar_public_name_presentation` / `news_posts` discipline). The DB
 * value domain and the TS union cannot drift because there is only one place either is written.
 *
 * ⚠ TWO enum values carry THREE settings: `after_days` + `mask_after_days = 0` is cl.10(c)'s
 * zero-day setting — masked from the close instant. ⛔ Do not add an `immediate` value — it would
 * make `after_days: 0` and
 * `immediate` two spellings of one state, which is the drift a discriminator exists to prevent.
 */
// ⚠⭐ A NOTE ON WORDING, so nobody "restores the ruling's own phrase": cl.10(c) names the zero-day
// setting with an ADVERB OF IMMEDIACY, and Story 11b.3a **AC6** forbids that adverb across this
// control's surfaces — mechanized by `apps/admin/tests/nominee-bank-masking-terminology.test.ts`.
// ⛔ The ban is not a disagreement with the Panel: it is about what THIS control's propagation claims,
// and a source scan cannot tell a QUOTE from a CLAIM. ⇒ where this control makes a CLAIM about its own
// propagation it paraphrases as *"masked from the close instant"* and points at cl.10(c) for the
// verbatim. ⛔ Do not paste the adverb back in as a CLAIM.
// ⚠⭐ CORRECTED 2026-09-04 (11b.3a third code-review pass). This sentence used to read *"⇒ EVERY FILE
// HERE paraphrases …"* — which was FALSE OF ITS OWN COMMIT: `migrations/0113_…sql` and
// `claim/nominee-bank-masking.ts` both still carry the adverb. ⛔ Those occurrences are CORRECT and
// were deliberately kept — each is a QUOTATION of cl.10(c), and AC6's gate covers the three sites AC6
// names. ⇒ the defect was never the occurrences; it was a standing instruction asserting that "every
// file here" does something two files in the same commit demonstrably do not. ⭐ The rule is about
// CLAIMS, not about quotations, and now says so — see Story 11b.11's Trap 4, which records this exact
// class (*"prose that outlives the thing it describes"*) three times in a single day.
export const nomineeBankMaskingModeEnum = pgEnum(
  'nominee_bank_masking_mode',
  NOMINEE_BANK_MASKING_MODES,
);

export const pariwarNomineeBankMaskingSchedule = pgTable(
  'pariwar_nominee_bank_masking_schedule',
  {
    // Per-row address (UUID). Server-side gen_random_uuid() default. Keyed LOGICALLY by
    // (pariwar_id, version) — the unique index below (the pool_fixed_amount_schedule precedent).
    id: uuid('id').defaultRandom().primaryKey(),

    // Tenant key + RLS predicate column. Branded. unFK'd (the pre-Epic-3 per-Pariwar-config posture).
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

    // Monotonically increasing per Pariwar, starting at 1 — the T&C `version` precedent. The
    // (pariwar_id, version) unique index is the structural guard.
    version: integer('version').notNull(),

    // ── The SETTING: cl.10(c)'s three, carried by a discriminator + a payload ────────────────────
    // ⛔ NEVER collapse these two into one column. See the header on cl.10(d).
    maskingMode: nomineeBankMaskingModeEnum('masking_mode').notNull(),

    // Whole days from the drive's close/settle instant. NOT NULL ⟺ mode = 'after_days'; NULL ⟺
    // mode = 'permanent' (the terminal rung has no offset to measure). The CHECK below is what makes
    // the coupling a DB fact rather than an app convention.
    // ⭐ `0` IS A LEGAL VALUE and is cl.10(c)'s zero-day setting (masked from the close instant) —
    // ⛔ a value an admin CHOSE, and
    // ⛔ never the code's default, which cl.10(b) forbids in terms.
    maskAfterDays: integer('mask_after_days'),

    // ── Effective window (architecture §1.11) — the `pool_fixed_amount_schedule` shape ───────────
    // `effective_from` is when this setting comes into force; `effective_until` is when it was
    // superseded (NULL = currently in force). The partial unique below enforces at most ONE
    // open-ended row per Pariwar. ⭐ THIS is what makes cl.10(c)'s "reversible and re-configurable"
    // structural: a later change closes the head and inserts a new one, and the trail survives.
    effectiveFrom: timestamp('effective_from', { withTimezone: true, mode: 'date' }).notNull(),
    effectiveUntil: timestamp('effective_until', { withTimezone: true, mode: 'date' }),

    // ── Governance attribution — the 11a.1 shape, REUSED (⛔ not re-invented) ─────────────────────
    // Changing how long a family's bank account number stays publicly visible is a GOVERNED ACT held
    // by the Trust CENTRALLY (`2026-09-02-178`), so the row carries WHO changed it, under what NAME,
    // and WHY. `rationale` is REQUIRED at the write path: a change to what the whole internet can see
    // of an account number must not be recordable as a bare value swap.
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
    check('pariwar_nominee_bank_masking_schedule_version_positive', sql`${t.version} >= 1`),

    // ⭐⭐ THE DISCRIMINATOR COUPLING, AS A DB FACT. `after_days` REQUIRES a whole day count in
    // 0…MAX; `permanent` REQUIRES none. ⛔ Without this, a `permanent` row carrying a stray day count
    // (or an `after_days` row carrying NULL) would resolve to whichever branch the reader happened to
    // check first — on a control whose two outcomes are "a full account number is public" and "it is
    // not". ⚠ Keep the ceiling IN SYNC with MAX_NOMINEE_BANK_MASK_AFTER_DAYS.
    check(
      'pariwar_nominee_bank_masking_schedule_setting_check',
      sql`(${t.maskingMode} = 'after_days' AND ${t.maskAfterDays} IS NOT NULL AND ${t.maskAfterDays} >= 0 AND ${t.maskAfterDays} <= ${sql.raw(String(MAX_NOMINEE_BANK_MASK_AFTER_DAYS))}) OR (${t.maskingMode} = 'permanent' AND ${t.maskAfterDays} IS NULL)`,
    ),

    // ⭐ The effective window may not be INVERTED. `>=`, ⛔ not `>`: the close-head step sets
    // `effective_until = effective_from` of the superseding row, so a zero-width `[T, T)` window is a
    // LEGITIMATE supersession of a row created at the same instant (the resolver's
    // `effective_until > asOf` predicate never matches it). Only a genuinely backwards `[a, a-5)`
    // window is forbidden.
    // ⚠ MIRRORS migration 0113's `…_window_not_inverted` — added there by the first review pass and
    // left out of this file, which the second pass caught. ⛔ Every constraint in 0113 must have its
    // twin here: the migrations are hand-authored and the drizzle snapshot is frozen at 0020, so this
    // declaration is what a future reader or generator treats as the table's truth.
    check(
      'pariwar_nominee_bank_masking_schedule_window_not_inverted',
      sql`${t.effectiveUntil} IS NULL OR ${t.effectiveUntil} >= ${t.effectiveFrom}`,
    ),

    // Structural guard: a (pariwar_id, version) pair is allocated exactly once.
    uniqueIndex('pariwar_nominee_bank_masking_schedule_pariwar_version_uq').on(t.pariwarId, t.version),

    // Effective-window invariant: at most ONE open-ended (currently-in-force) row per Pariwar —
    // exactly the terms_and_conditions_versions / pool_fixed_amount_schedule open-head precedent.
    uniqueIndex('pariwar_nominee_bank_masking_schedule_pariwar_current_uq')
      .on(t.pariwarId)
      .where(sql`effective_until IS NULL`),

    // The window resolver's driving index: newest effective row per tenant.
    index('pariwar_nominee_bank_masking_schedule_pariwar_effective_from_idx').on(
      t.pariwarId,
      t.effectiveFrom,
    ),
  ],
);

export type PariwarNomineeBankMaskingScheduleRow =
  typeof pariwarNomineeBankMaskingSchedule.$inferSelect;
export type PariwarNomineeBankMaskingScheduleInsert =
  typeof pariwarNomineeBankMaskingSchedule.$inferInsert;
