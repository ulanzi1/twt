// `pool_fixed_amount_emergency_attestations` table — Story 7.5 substrate (Task 1; AC3).
//
// The immutable Emergency Adjustment Record. A first-class, APPEND-ONLY historical
// attestation — one row per emergency `fixed_amount` change — capturing the
// State-Trustee panel sign-off that justifies bypassing the 90-day notice (D3).
//
// ── Governance posture — equivalent to R9, WITHOUT the R9 voting lifecycle ────
// The write is step-up-gated, records a trustee attestation, and is auditable — the
// governance posture is EQUIVALENT to R9. It is deliberately NOT the R9 voting
// lifecycle (no OPEN → VOTE → FINALIZE session, no quorum, no per-vote encrypted
// rationale): a fixed-amount emergency override needs a recorded, attestable sign-off,
// not a vote. Do NOT reuse the R9 session/vote/quorum subsystem here.
//
// ── Why a SEPARATE table (not JSONB on the schedule row) ──────────────────────
// The schedule head row (pool_fixed_amount_schedule) is MUTATED later — its
// `effective_until` is set when a subsequent change supersedes it — so an attestation
// stored on that row would not be truly immutable. A dedicated NEVER-updated record
// makes future audit requirements trivial: written once, never touched. The DB grant
// omits UPDATE/DELETE (SELECT + INSERT only) so write-once is enforced at the
// privilege level, not just by convention.
//
// ── documented_reason is policy/operational ONLY — never member-specific (D3) ──
// reserve adequacy, inflation, regulatory change, actuarial review, financial
// sustainability. Because it CANNOT contain member context it is stored PLAINTEXT
// (safe in the audit line) — fundamentally unlike the R9 per-vote rationale (Tier-1,
// KMS-encrypted) which MAY carry member context. The "no member PII" rule is a stated
// constraint (documented here + in the admin form helper text), enforced by the
// column's semantics, never by silent trustee discipline.
//
// ── Tenant isolation ─────────────────────────────────────────────────────────
// TENANT-ISOLATED read + write (mirrors pariwar_appeal_config / pools). RLS in
// policies/pool-fixed-amount-emergency-attestations-rls.ts.
//
// Naming discipline per architecture L3663-3677: DB columns snake_case, TS camelCase.

import { index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import type { PariwarId } from '../ids/index.js';

/**
 * One panel member of the attesting State-Trustee panel: the actor id + the resolved
 * R5 display snapshot at attestation time. The panel COMPOSITION (an array of these)
 * is naturally list-shaped, so it lives as JSONB inside the immutable row — the record
 * AS A WHOLE is the immutable historical unit.
 */
export interface PoolFixedAmountPanelMember {
  readonly actor_id: string;
  readonly actor_display: string;
}

export const poolFixedAmountEmergencyAttestations = pgTable(
  'pool_fixed_amount_emergency_attestations',
  {
    // Per-row address (UUID). Server-side gen_random_uuid() default.
    id: uuid('id').defaultRandom().primaryKey(),

    // Tenant key + RLS predicate column. Branded `PariwarId`. unFK'd (pre-Epic-3).
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

    // References the emergency schedule entry's `version` — a LOGICAL FK to
    // pool_fixed_amount_schedule (pariwar_id, version). Not a DB FK (pool-substrate
    // unFK'd posture); the (pariwar_id, schedule_version) unique index below is the
    // one-attestation-per-emergency-entry guard.
    scheduleVersion: integer('schedule_version').notNull(),

    // Denormalized snapshot of the attested amount, so the record is audit-self-
    // contained (no join back to the schedule row needed to read what was attested).
    fixedAmount: integer('fixed_amount').notNull(),

    // The panel COMPOSITION — the roster of {actor_id, actor_display} (see the type).
    panel: jsonb('panel').notNull().$type<PoolFixedAmountPanelMember[]>(),

    // The attesting actor + the resolved R5 display SNAPSHOT (server-side at attest
    // time; the 6.11/6.13/6.14 admin-attribution posture — never email-derived).
    attestedByActor: text('attested_by_actor').notNull(),
    attestedDisplay: text('attested_display').notNull(),

    // The documented policy/operational justification. PLAINTEXT (never member-
    // specific — see the header). NOT NULL — an emergency override without a reason is
    // impossible (the write path also rejects an empty string).
    documentedReason: text('documented_reason').notNull(),

    // DB-authoritative attestation time (architecture §1.11).
    attestedAt: timestamp('attested_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),

    // The Story 1.10 audit line id for this emergency change. As on pool_fixed_amount_schedule's
    // auditId, the route handlers use the POST-COMMIT audit-sink pattern, so this column is not
    // populated by the current write path and reads back NULL on every row; reserved for a future
    // route that adopts the pre-commit write-audit-first pattern. unFK'd (pool-substrate pre-Epic-3).
    auditId: uuid('audit_id'),

    // DB-authoritative row-creation time. Default now().
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    // One attestation per emergency schedule entry (the immutable 1:1 pairing).
    uniqueIndex('pool_fixed_amount_emergency_attestations_pariwar_version_uq').on(
      t.pariwarId,
      t.scheduleVersion,
    ),
    // The tenant-scoped audit/admin read index (list a Pariwar's emergency records).
    index('pool_fixed_amount_emergency_attestations_pariwar_id_idx').on(t.pariwarId),
  ],
);

export type PoolFixedAmountEmergencyAttestationRow =
  typeof poolFixedAmountEmergencyAttestations.$inferSelect;
export type PoolFixedAmountEmergencyAttestationInsert =
  typeof poolFixedAmountEmergencyAttestations.$inferInsert;
