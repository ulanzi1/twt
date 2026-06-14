// `audit_integrity_acknowledgements` table — Story 1.11b substrate (DD-5).
//
// The append-only acknowledgement ledger for failed integrity checks. AC-5: the
// red audit-failure banner persists "until manually acknowledged and an
// investigation ticket is opened". There is no helpdesk/ticketing system yet
// (FR-52, not built), so v1 records a free-text external ticket reference the
// trustee provides — that record IS the "investigation ticket opened" artifact.
//
// ── A SEPARATE table, on purpose (DD-5) ───────────────────────────────────────
// `audit_integrity_checks` is STRICTLY append-only/immutable (migration 0008
// reject-mutation triggers) — that immutability is the whole point of a
// tamper-evidence verdict ledger. So an acknowledgement does NOT mutate the
// verdict row (no `acknowledged_at` column added there); it is recorded as its
// own append-only row here, keyed by `check_id`. A check MAY be acknowledged more
// than once (every ack is retained); the trustee UI / read path takes the most
// recent.
//
// ── GLOBAL, not tenant-scoped ─────────────────────────────────────────────────
// Like `audit_integrity_checks`, an acknowledgement is a statement about the ONE
// global chain's verdict — no `pariwar_id` dimension. RLS is still ENABLE+FORCE'd
// (Story 1.6 invariant) with a `USING(true)` SELECT carve-out (migration 0011 /
// policies/audit-integrity-acknowledgements-rls.ts).
//
// ── Append-only ───────────────────────────────────────────────────────────────
// An acknowledgement, once recorded, cannot be un-recorded or rewritten. Migration
// 0011 installs BEFORE UPDATE/DELETE/TRUNCATE triggers that RAISE (mirroring
// audit_integrity_checks / audit_log_entries / events_log). INSERT-only.
//
// ── Naming discipline (architecture L3663-3677) ───────────────────────────────
//   - DB columns snake_case (acknowledgement_id, check_id, acknowledged_by, …)
//   - TS field names camelCase (acknowledgementId, checkId, acknowledgedBy, …)

import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { auditIntegrityChecks } from './audit_integrity_checks.js';

export const auditIntegrityAcknowledgements = pgTable(
  'audit_integrity_acknowledgements',
  {
    // Surrogate addressable PK (server-side gen_random_uuid()).
    acknowledgementId: uuid('acknowledgement_id').defaultRandom().primaryKey(),

    // The verdict this acknowledgement refers to. FK → audit_integrity_checks —
    // referential integrity to a real check. NO cascade: checks are append-only
    // (never deleted), and an acknowledgement is itself tamper-evidence that must
    // persist regardless.
    checkId: uuid('check_id')
      .notNull()
      .references(() => auditIntegrityChecks.checkId),

    // When the acknowledgement was recorded. DB-authoritative (default now()),
    // consistent with verified_at on audit_integrity_checks (architecture §1.11).
    acknowledgedAt: timestamp('acknowledged_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),

    // The admin (session userId) who acknowledged. No FK — an acknowledgement is
    // an audit record that outlives the actor's account lifecycle (mirrors the
    // role_grants.created_by no-FK rationale). The acknowledging user existed +
    // was session-authenticated at ack time.
    acknowledgedBy: uuid('acknowledged_by').notNull(),

    // The external investigation-ticket reference the trustee provided (an id/URL
    // they paste). NOT NULL — recording it is the v1 "ticket opened" artifact
    // (graduates to the helpdesk module FR-52 when it lands).
    ticketRef: text('ticket_ref').notNull(),
  },
  (t) => [
    // The read path: "load acknowledgements for these recent checks" — the 1.11b
    // history list joins acks to its 30 verdicts by check_id.
    index('audit_integrity_acknowledgements_check_id_idx').on(t.checkId),
  ],
);

// Inferred row types for the writer (acknowledge endpoint) + the 1.11b read path.
export type AuditIntegrityAcknowledgementRow =
  typeof auditIntegrityAcknowledgements.$inferSelect;
export type AuditIntegrityAcknowledgementInsertRow =
  typeof auditIntegrityAcknowledgements.$inferInsert;
