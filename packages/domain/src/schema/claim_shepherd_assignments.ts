// `claim_shepherd_assignments` — the shepherd ASSIGNMENT-METADATA store (Story 6.12, Task 1).
//
// The ASSIGNMENT-METADATA authority (AC0): who the LIVE shepherd is, the display-name + contact
// SNAPSHOT surfaced to the family, the assignment reason, and the live-vs-superseded history. It is NOT
// a projection of the claim lifecycle and the lifecycle is NOT a projection of it — the
// `claim.shepherd_assigned` event in `events_log` is the LIFECYCLE-TIMELINE authority (an IDENTITY
// annotation — `from_state === to_state`; assignment adds NO lifecycle state, exactly like
// `claim.verifier_escalated`), THIS table is the ASSIGNMENT-METADATA authority. Both are written in the
// SAME transaction so they cannot diverge. Any code that derives claim STATE from this table, or reads a
// shepherd's NAME/CONTACT from the event payload, is wrong (mirrors `claim_verifier_decisions`, 6.11).
//
// ── One LIVE shepherd per claim; reassignment supersedes (AC5/AC9) ─────────────────────────
// A reassignment (fallback OR admin-initiated, D-E) supersedes the prior row and inserts a new one in
// one transaction. The partial-unique `UNIQUE (claim_case_id) WHERE superseded_at IS NULL` invariant
// guarantees AT MOST ONE live (`superseded_at IS NULL`) assignment row per claim — the backstop that
// makes a concurrent double-reassignment impossible to land as two live shepherds.
//
// ── PII discipline (D-G / AR-12 / Story 1.16b gate) ────────────────────────────────────────
//   · shepherd_actor_id — the assigned District Admin's `users.id` (an actor id, NOT a name → NON-PII).
//     The query/join key (member card read + console section + workload count).
//   · shepherd_display / shepherd_contact_phone / shepherd_contact_whatsapp — the assignment-time
//     SNAPSHOT of `users.display_name` + the two `users` contact columns (R1). CONTROLLED staff-contact
//     personal data, plaintext BY DELIBERATE DECISION (their whole purpose is to be shown to the family —
//     that IS the feature). NEVER member PII, NEVER copied into `events_log`, NEVER an indexed/searchable
//     filter (AC8). A later rename / number change never rewrites a historical row.
//   · assignment_reason / district / claim_case_id / pariwar_id → NON-PII routing coordinates.
//
// TENANT-ISOLATED (mirrors `claims` / `claim_verifier_decisions`). RLS in
// policies/claim-shepherd-assignments-rls.ts.
//
// Naming discipline per architecture L3663-3677: DB columns snake_case, TS camelCase.

import { sql } from 'drizzle-orm';
import { type AnyPgColumn, check, index, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import type { ClaimId, PariwarId, ShepherdAssignmentId } from '../ids/index.js';
import { claims } from './claims.js';

/**
 * The one-spelling-authority tuple for the assignment reason (Task 1). Derives BOTH the pgEnum below and
 * the TS union AND the `claim.shepherd_assigned` event-payload `z.enum` (claim/events.ts imports this) —
 * one source, no drift. `initial` = the automatic first assignment (AC1); `reassignment` = an
 * admin-initiated manual reassignment (R6/AC5); `fallback` = the AR-61 staff-fallback path (AC4).
 */
export const SHEPHERD_ASSIGNMENT_REASONS = ['initial', 'reassignment', 'fallback'] as const;
export type ShepherdAssignmentReason = (typeof SHEPHERD_ASSIGNMENT_REASONS)[number];
export const shepherdAssignmentReasonEnum = pgEnum('shepherd_assignment_reason', SHEPHERD_ASSIGNMENT_REASONS);

export const claimShepherdAssignments = pgTable(
  'claim_shepherd_assignments',
  {
    // Per-assignment id (the addressable unit). Generated app-side by the writer; defaultRandom is a
    // fallback for bare inserts. Branded ShepherdAssignmentId.
    assignmentId: uuid('assignment_id').defaultRandom().primaryKey().$type<ShepherdAssignmentId>(),

    // The claim this shepherd is assigned to (FK → claims; branded ClaimId == the events_log stream_id).
    // ON DELETE CASCADE mirrors claim_verifier_decisions / peer-mesh / ground-inspection.
    claimCaseId: uuid('claim_case_id')
      .notNull()
      .$type<ClaimId>()
      .references(() => claims.claimCaseId, { onDelete: 'cascade' }),

    // Multi-tenant scope (RLS predicate column; branded).
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

    // The assigned District Admin (an actor id == users.id, not a name → non-PII). The query/join key
    // (member card read + console section + workload count).
    shepherdActorId: text('shepherd_actor_id').notNull(),

    // ── Controlled staff-contact SNAPSHOT (R1/R5, plaintext-by-decision; NEVER member PII) ──
    // The assignment-time SNAPSHOT of `users.display_name`. REQUIRED (NOT NULL) — the writer resolves it
    // server-side and the auto path skips a nameless candidate (AC2 eligibility), the manual path blocks
    // (AdminDisplayNameMissingError). Frozen at write; a later rename never rewrites history. NEVER
    // email-derived.
    shepherdDisplay: text('shepherd_display').notNull(),

    // The assignment-time SNAPSHOT of `users.contact_phone` / `users.contact_whatsapp` (canonical E.164).
    // BOTH nullable at the column, but the WRITE model requires ≥1 present for auto-eligibility (AC2);
    // surfaced to the family as tappable tel: / wa.me deep-links (AC3). Never indexed/searchable (AC8).
    shepherdContactPhone: text('shepherd_contact_phone'),
    shepherdContactWhatsapp: text('shepherd_contact_whatsapp'),

    // Why this assignment happened (AC5). NON-PII. `initial` = automatic first (AC1);
    // `reassignment` = admin-initiated (R6); `fallback` = AR-61 (AC4).
    assignmentReason: shepherdAssignmentReasonEnum('assignment_reason').notNull(),

    // The D-E reassignment back-reference: which assignment THIS one superseded (self-FK). NULL on the
    // first assignment. ON DELETE SET NULL so a claim-cascade delete has no self-referential ordering hazard.
    supersedesAssignmentId: uuid('supersedes_assignment_id')
      .$type<ShepherdAssignmentId>()
      .references((): AnyPgColumn => claimShepherdAssignments.assignmentId, { onDelete: 'set null' }),

    // When this row was superseded by a reassignment (D-E). NULL = the LIVE/current shepherd (the
    // partial-unique index keys off this). A superseded row stays in the transcript for audit.
    supersededAt: timestamp('superseded_at', { withTimezone: true, mode: 'date' }),

    assignedAt: timestamp('assigned_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    // Per-tenant scans / RLS-aware planner hint (pariwar_id leads, mirroring claims).
    index('claim_shepherd_assignments_pariwar_id_idx').on(t.pariwarId),
    // The member/console live-shepherd read (per claim).
    index('claim_shepherd_assignments_claim_case_id_idx').on(t.claimCaseId),
    // The workload-balancing live-assignment count per candidate (AC1).
    index('claim_shepherd_assignments_shepherd_actor_id_idx').on(t.shepherdActorId),
    // AC5/AC9 — at most ONE live shepherd row per claim (a reassignment must supersede before/atomically-
    // with inserting the next). The concurrent-double-reassignment backstop.
    uniqueIndex('claim_shepherd_assignments_one_live_per_claim_uq')
      .on(t.claimCaseId)
      .where(sql`superseded_at IS NULL`),
    // DB-level E.164 CHECK (Review Finding) — the backstop behind the write-path regex validation
    // (mirrors users.contact_phone/contact_whatsapp; same canonical shape, re-declared per table).
    check(
      'claim_shepherd_assignments_contact_phone_e164_check',
      sql`${t.shepherdContactPhone} IS NULL OR ${t.shepherdContactPhone} ~ '^\+[1-9][0-9]{1,14}$'`,
    ),
    check(
      'claim_shepherd_assignments_contact_whatsapp_e164_check',
      sql`${t.shepherdContactWhatsapp} IS NULL OR ${t.shepherdContactWhatsapp} ~ '^\+[1-9][0-9]{1,14}$'`,
    ),
  ],
);

export type ClaimShepherdAssignmentRow = typeof claimShepherdAssignments.$inferSelect;
export type ClaimShepherdAssignmentInsert = typeof claimShepherdAssignments.$inferInsert;
