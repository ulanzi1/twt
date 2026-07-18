// `pool_fixed_amount_schedule` table — Story 7.5 substrate (Task 1; AC1/AC2/AC5).
//
// The per-Pariwar, effective-dated, trustee-governed `fixed_amount` schedule that
// RETIRES the boot-time `POOL_SPAWN_FIXED_AMOUNT_INR` env constant. It owns the
// effective-window SHAPE modeled 1:1 on `terms_and_conditions_versions` (D1): a
// versioned, per-Pariwar record whose window predicate
// `effective_from <= asOf AND (effective_until IS NULL OR asOf < effective_until)`
// resolves the single amount in force at any instant. The spawn saga reads the
// amount effective at the cycle-freeze `committed_at`, so each pool snapshots the
// policy-correct amount at the moment the cycle froze — deterministic + replay-safe.
//
// ── Standard vs. emergency are the SAME store, gated differently (AC5) ────────
// Both write-paths append here; they differ only in the `effective_from` constraint
// (standard >= now()+365d — the 12-month notice; emergency none), the required
// attestation (emergency writes an immutable record in the sibling table), the
// `change_type` discriminator, and the notification cadence. The effective-amount
// resolver (`getEffectiveFixedAmount`) is change_type-BLIND — it returns the entry
// whose window contains `asOf` regardless of how it was written.
//
// ── NOT fully immutable ──────────────────────────────────────────────────────
// A schedule row's `effective_until` is UPDATEd when a LATER change supersedes it
// (close-prior-head then insert-new-head — the T&C supersede mechanic). This is
// EXACTLY why the emergency attestation must NOT live here: an attestation on a row
// that is later mutated would not be truly immutable. The append-only Emergency
// Adjustment Record lives in `pool_fixed_amount_emergency_attestations` (Table B).
//
// ── Tenant isolation ─────────────────────────────────────────────────────────
// TENANT-ISOLATED read + write (mirrors pariwar_appeal_config / pools): NOT
// cross-readable. RLS in policies/pool-fixed-amount-schedule-rls.ts.
//
// Naming discipline per architecture L3663-3677: DB columns snake_case, TS fields
// camelCase. Table snake_case-singular-noun-plural (a collection of schedule rows).

import { sql } from 'drizzle-orm';
import { check, index, integer, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import type { PariwarId } from '../ids/index.js';

/**
 * The write-path discriminator (AC4/AC5). `standard` = the 12-month-notice change
 * (effective_from >= now()+365d, no attestation); `emergency` = the override that
 * bypasses the notice floor and REQUIRES an immutable Emergency Adjustment Record.
 * The discriminator makes an emergency change unmistakable to regulators / members /
 * future trustees. `pgEnum` (not a raw CHECK) yields a `CREATE TYPE` in the migration.
 *
 * ⚠ LOCKSTEP with the `@twt/contracts` change-type z.enum (DUPLICATED there because
 * `@twt/domain` must NOT import `@twt/contracts` — turbo cycle). Mirror the
 * `benefit_mechanism` ↔ `BenefitMechanism` discipline.
 */
export const poolFixedAmountChangeTypeEnum = pgEnum('pool_fixed_amount_change_type', [
  'standard',
  'emergency',
]);

export const poolFixedAmountSchedule = pgTable(
  'pool_fixed_amount_schedule',
  {
    // Per-row address (UUID). Server-side gen_random_uuid() default. The row is keyed
    // logically by (pariwar_id, version) — the unique index below.
    id: uuid('id').defaultRandom().primaryKey(),

    // Tenant key + RLS predicate column. Branded `PariwarId`. unFK'd (the pre-Epic-3
    // posture — mirrors pools.pariwar_id / pariwar_appeal_config.pariwar_id).
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

    // Monotonically increasing per Pariwar, starting at 1. The (pariwar_id, version)
    // unique index is the structural guard (the T&C `version` precedent).
    version: integer('version').notNull(),

    // The fixed contribution amount snapshotted at spawn — INR rupees, strictly positive and
    // capped at the guard-rail ceiling (the SAME unit/validation as pools.fixed_amount and the
    // retired env constant default 500 + its MAX_POOL_SPAWN_FIXED_AMOUNT_INR ceiling).
    fixedAmount: integer('fixed_amount').notNull(),

    // DB-authoritative effective window (architecture §1.11). `effective_from` is when
    // this amount comes into force; `effective_until` is when it was superseded (NULL =
    // currently in force). The partial-unique index below enforces at-most-one
    // open-ended (currently-in-force) row per Pariwar.
    effectiveFrom: timestamp('effective_from', { withTimezone: true, mode: 'date' }).notNull(),
    effectiveUntil: timestamp('effective_until', { withTimezone: true, mode: 'date' }),

    // The write-path discriminator (see the enum). resolver-blind; audit-visible.
    changeType: poolFixedAmountChangeTypeEnum('change_type').notNull(),

    // The trustee/actor who wrote this schedule entry. Text (the cycle_freeze_commits
    // actor_id precedent — an actor id snapshot, not FK'd pre-Epic-3).
    createdByActor: text('created_by_actor').notNull(),

    // DB-authoritative write time (architecture §1.11). Default now().
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),

    // The Story 1.10 audit line id for this change. The route handlers (pool-fixed-amount
    // handlers.ts) actually use the POST-COMMIT audit-sink pattern (AUDIT IS A POST-COMMIT
    // SINK — emitAuthAudit fires after the tx commits), so this column is NOT populated by the
    // current write paths and reads back NULL on every row; it stays reserved for a future
    // route that adopts the Story 1.10 pre-commit write-audit-first-then-thread-its-id
    // pattern used elsewhere. NULLABLE accordingly. unFK'd (pool-substrate pre-Epic-3 posture).
    auditId: uuid('audit_id'),
  },
  (t) => [
    // version >= 1 (monotonic per Pariwar, starting at 1).
    check('pool_fixed_amount_schedule_version_positive', sql`${t.version} >= 1`),
    // fixed_amount strictly positive (whole INR — the pools.fixed_amount unit).
    check('pool_fixed_amount_schedule_amount_positive', sql`${t.fixedAmount} > 0`),
    // fixed_amount guard-rail ceiling (review hardening; migration 0077) — mirrors the retired
    // MAX_POOL_SPAWN_FIXED_AMOUNT_INR boot-time check. Keep IN SYNC with
    // pool/fixed-amount.ts MAX_POOL_FIXED_AMOUNT_INR.
    check('pool_fixed_amount_schedule_amount_max', sql`${t.fixedAmount} <= 10000000`),

    // Structural guard: a (pariwar_id, version) pair is allocated exactly once.
    uniqueIndex('pool_fixed_amount_schedule_pariwar_version_uq').on(t.pariwarId, t.version),

    // Effective-window invariant: at most ONE open-ended (currently-in-force) row per
    // Pariwar. Partial unique on (pariwar_id) WHERE effective_until IS NULL — exactly
    // the terms_and_conditions_versions open-head precedent.
    uniqueIndex('pool_fixed_amount_schedule_pariwar_current_uq')
      .on(t.pariwarId)
      .where(sql`effective_until IS NULL`),

    // The window resolver's driving index: newest effective row per tenant.
    index('pool_fixed_amount_schedule_pariwar_effective_from_idx').on(t.pariwarId, t.effectiveFrom),
  ],
);

// Inferred row types for the accessor read/write paths (terms_and_conditions precedent).
export type PoolFixedAmountScheduleRow = typeof poolFixedAmountSchedule.$inferSelect;
export type PoolFixedAmountScheduleInsert = typeof poolFixedAmountSchedule.$inferInsert;

/** The change-type literal union (`standard` | `emergency`). */
export type PoolFixedAmountChangeType = (typeof poolFixedAmountChangeTypeEnum.enumValues)[number];
