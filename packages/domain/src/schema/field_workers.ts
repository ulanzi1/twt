// `field_workers` table — Story 13.1 substrate (the SEVENTH event-derived-state primitive).
//
// A FIELD WORKER — a part-time paid recruiter (PRD §2.4 Vikram), ⛔ a member, ⛔ a login — who brings teachers into the
// Trust and is credited through the 6-digit code Story 13.2's registry allocates. The twin of Story 3.1 `members` + 6.1
// `claims` + 7.1 `pools` + 8.1 `alerts` + 10.1 `helpdesk_tickets` + 12.1 `marketplace_modules`. Its lifecycle
// `pending_kyc → active ⇄ suspended → terminated` is DERIVED from its `events_log` stream (stream_id = field_worker_id)
// replayed through the pure reducer in `field-worker/state.ts`; the seven `field_worker.*` events are in
// `field-worker/events.ts`.
//
// ── The invariants this table carries (Story 13.1 I1–I3, I6, I10) ─────────────────────────────────
// I1  The PROJECTED columns — `current_state`, `state_event_version`, `kyc_status`, `state_reason_code`, `district`,
//     `ended_on`, `audit_id`, `updated_at` — are written ONLY by `projectFieldWorkerGenesis` /
//     `projectFieldWorkerTransition` (`field-worker/project.ts`). Two independent guards: the DB trigger (migration 0200)
//     rejects any INSERT / UPDATE not issued under `app.field_worker_state_writer = 'on'`, and the AST gate
//     (scripts/field-worker-state-invariant) flags a stray writer at authoring time.
// I2  EVERY OTHER column is immutable after INSERT, even with the guard on. The trigger compares the whole row minus the
//     I1 columns, so a column ADDED LATER is immutable by default (C8 (c) — a later mutable column means
//     `CREATE OR REPLACE` of the guard function AND the gate's `GUARDED_COLUMNS`).
// I3  On INSERT: `pending_kyc`, `kyc_status = 'pending'`, version 1, no reason, no `ended_on`, a non-blank `district`.
//     On a guarded UPDATE: the version strictly increases, `kyc_status` never goes back to `pending`, and `district`
//     moves only in an UPDATE that changes nothing else of the state (only `field_worker.posted` moves it).
// I6  `terminated` is terminal — the trigger refuses ANY update of a terminated row, guarded or not.
// I10 A worker row is NEVER deleted, by any role: ⛔ DELETE grant, and row-level `BEFORE DELETE` + statement-level
//     `BEFORE TRUNCATE` triggers refuse even the owner (only `session_replication_role = 'replica'` bypasses them).
//     Erasure is an UPDATE (Story 13.1 C5 — the 8-year removal), never a DELETE.
//
// ── Identity and PII (QE3, QE4) ───────────────────────────────────────────────────────────────────
// `field_worker_id` is CALLER-MINTED (`ids.fieldWorkerId`, ⛔ DB default) so the intent audit line can name
// `field_worker/<id>` before the write. ⛔ `user_id` column (the worker's login is Story 13.3's — a `self`-scoped grant
// carries the id, C1). The name and mobile are Tier-1 ciphertext (`field_worker` class) and the mobile's keyed hash is
// Tier-2 under the DISJOINT class `field_worker_mobile` — all three sealed in the API layer BEFORE the writer.
// ⛔ Plaintext of either value in any column, event, audit line or log (I8). ⛔ `attribution_code` column (13.2 AT2): the
// code lives in 13.2's append-only registry, which gains the composite FK `field_worker_attribution_codes_worker_fk`
// `(pariwar_id, field_worker_id)` → this table's `field_workers_pariwar_worker_uq` (0200).
//
// ── The DB enforces ONLY the named CHECKs below ───────────────────────────────────────────────────
// Every content rule (name length, NFC, mobile shape, a LISTED district) is the API layer's (QE4, QE9, QE17).
//
// Naming discipline (architecture L3663-3677): DB columns snake_case, TS fields camelCase, table snake_case-plural.

import { sql } from 'drizzle-orm';
import { bigint, check, date, index, pgEnum, pgTable, text, timestamp, unique, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { piiColumn } from '../encryption/column.js';
import type { FieldWorkerId, PariwarId } from '../ids/index.js';

/**
 * The field-worker lifecycle (QE5, QE16) — the pgEnum source (`CREATE TYPE field_worker_state`). Underscore labels, as the
 * epic's AC writes them (⚠ the member lifecycle uses hyphens — a pgEnum label is not cheaply renamed). `terminated` is
 * TERMINAL for a registration: a worker taken back is a NEW registration (QE5).
 */
export const FIELD_WORKER_STATES = ['pending_kyc', 'active', 'suspended', 'terminated'] as const;
export const fieldWorkerStateEnum = pgEnum('field_worker_state', FIELD_WORKER_STATES);
export type FieldWorkerState = (typeof FIELD_WORKER_STATES)[number];

/**
 * The operator-recorded identity attestation (QE8) — the pgEnum source (`CREATE TYPE field_worker_kyc_status`). `completed`
 * means "an operator confirms they have verified this person"; no document, number, PAN or bank detail is captured.
 */
export const FIELD_WORKER_KYC_STATUSES = ['pending', 'completed'] as const;
export const fieldWorkerKycStatusEnum = pgEnum('field_worker_kyc_status', FIELD_WORKER_KYC_STATUSES);
export type FieldWorkerKycStatus = (typeof FIELD_WORKER_KYC_STATUSES)[number];

/**
 * The NEUTRAL reason codes (QE12 — an author-commit, `2026-11-03-442`; ⛔ a `-210` delegation) — the pgEnum source
 * (`CREATE TYPE field_worker_reason_code`). Suspend: `under_review`, `at_worker_request`. Terminate: `left_voluntarily`,
 * `inactive`, `registered_in_error`, `died`. Post (a move of reporting district): `at_worker_request`, `reassigned`. ⛔ A labelling
 * value (`conduct_concern`, `conduct`, `fraud_confirmed`) — Story 13.6 adds those with the writer that uses them.
 * ⭐ `died` (Story 13.1c, migration 0203; the Panel's `2026-11-07-454` Q5 A, `-455`) is LAST: `ADD VALUE` appends, and the
 * policy-regression spec pins this tuple against the labels in `enumsortorder`.
 */
export const FIELD_WORKER_REASON_CODES = [
  'under_review',
  'at_worker_request',
  'left_voluntarily',
  'inactive',
  'registered_in_error',
  'reassigned',
  'died',
] as const;
export const fieldWorkerReasonCodeEnum = pgEnum('field_worker_reason_code', FIELD_WORKER_REASON_CODES);
export type FieldWorkerReasonCode = (typeof FIELD_WORKER_REASON_CODES)[number];

export const fieldWorkers = pgTable(
  'field_workers',
  {
    // The worker's canonical id == its events_log stream_id. Caller-minted, ⛔ default (QE3).
    fieldWorkerId: uuid('field_worker_id').primaryKey().$type<FieldWorkerId>(),
    // Tenant key. NOT NULL, ⛔ FK (there is no `pariwars` table — G14).
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

    // ── The immutable identity (I2) — sealed in the API layer BEFORE the writer (QE4) ──
    nameCiphertext: piiColumn(1, 'field_worker')('name_ciphertext').notNull(),
    mobileCiphertext: piiColumn(1, 'field_worker')('mobile_ciphertext').notNull(),
    // Tier-2 keyed hash under `field_worker_mobile` (⛔ the member login space). One LIVE worker per mobile per Pariwar.
    mobileBlindIndex: piiColumn(2, 'field_worker_mobile')('mobile_blind_index').notNull(),
    // Story 6.11 R5 attribution snapshot of the admin who registered the worker; ⛔ FK (the attribution outlives a user
    // row — the 13.2 flags table's `actor_id` precedent). Equals the genesis event's `events_log.actor_id`.
    registeredByUserId: uuid('registered_by_user_id').notNull(),
    // The admin's `users.display_name` at registration — plaintext by the 6.11 R5 decision; ⛔ fallback (G11).
    registeredByDisplay: text('registered_by_display').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),

    // ── PROJECTED (I1) — written ONLY by field-worker/project.ts under the trigger guard ──
    currentState: fieldWorkerStateEnum('current_state').notNull(),
    stateEventVersion: bigint('state_event_version', { mode: 'number' }).notNull(),
    kycStatus: fieldWorkerKycStatusEnum('kyc_status').notNull(),
    // Non-null iff suspended or terminated (`_state_reason_pair`); a `posted` reason lives in the EVENT only (QE12).
    stateReasonCode: fieldWorkerReasonCodeEnum('state_reason_code'),
    // QE17: the REPORTING district — whose District Admin manages the worker; ⛔ a work area (a code works anywhere in
    // the Pariwar). Set at genesis, changed ONLY by `field_worker.posted`. A LISTED district (checked in the API layer by
    // `assertDistrictRecorded` — the list is data). Not personal data.
    district: text('district').notNull(),
    // QE20: the ACTUAL LAST DAY of the engagement, supplied at termination — the clock of the 8-year removal (C5).
    // Non-null iff terminated (`_ended_on_pair`). Read as text everywhere (`ended_on::text`): no `pg` date parser is set,
    // so a raw `date` arrives as a local-midnight JS `Date` and shifts a day in IST.
    endedOn: date('ended_on', { mode: 'string' }),
    // The audit line of the MOST RECENT transition. ⛔ FK.
    auditId: uuid('audit_id').notNull(),
    // Story 13.1a (decision `-447` item 2) — the APPROVING admin's `users.display_name` at the approval (6.11 R5; plaintext
    // staff attribution, ⛔ fallback). Written ONCE, by the projector on `field_worker.activated` (`pending_kyc → active`);
    // NULL until then. ⛔ In any payload and ⛔ in the I4 fold (like `registered_by_display`). The 0201 trigger refuses any
    // other write of it; the two CHECKs below tie it to the state.
    approvedByDisplay: text('approved_by_display'),
    // PROJECTED: set to `now()` on every transition.
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    // The target of 13.2's composite FK `field_worker_attribution_codes_worker_fk` (C1).
    unique('field_workers_pariwar_worker_uq').on(t.pariwarId, t.fieldWorkerId),
    // One LIVE worker per mobile per Pariwar (QE4). A terminated worker's mobile may register again (a new id, a new
    // code) — a UNIQUE over ALL rows would be a permanent ban by index.
    uniqueIndex('field_workers_pariwar_mobile_live_uq')
      .on(t.pariwarId, t.mobileBlindIndex)
      .where(sql`current_state <> 'terminated'`),
    // The keyset list read (`pageFieldWorkersForPariwar`, Story 13.1a AD10 — 13.1's carried D1, amended by decision
    // 2026-11-05-448): `pariwar_id` equality, then the page order `created_at DESC, field_worker_id DESC`. `current_state` and
    // `district` are FILTERS, not index columns: beneath row-level security an enum comparison cannot be an index condition
    // (`enum_eq` is not leakproof), so a `current_state` column here made the page Sort under `twt_app`. Replaced 0200's
    // `field_workers_pariwar_state_idx`.
    index('field_workers_pariwar_created_idx').on(t.pariwarId, t.createdAt.desc(), t.fieldWorkerId.desc()),
    check(
      'field_workers_state_reason_pair',
      sql`(${t.currentState} IN ('suspended', 'terminated')) = (${t.stateReasonCode} IS NOT NULL)`,
    ),
    // QE12's lists, + `died` on the terminated arm (Story 13.1c, migration 0204 — `::text`, as 0203's value cannot be an enum
    // literal in the migrator's one transaction). Story 13.6 REPLACES this CHECK again when it adds the labelling values.
    check(
      'field_workers_state_reason_subset',
      sql`(${t.currentState} <> 'suspended' OR ${t.stateReasonCode} IN ('under_review', 'at_worker_request')) AND (${t.currentState} <> 'terminated' OR ${t.stateReasonCode}::text IN ('left_voluntarily', 'inactive', 'registered_in_error', 'died'))`,
    ),
    check('field_workers_active_needs_kyc', sql`${t.currentState} <> 'active' OR ${t.kycStatus} = 'completed'`),
    check('field_workers_registered_by_display_nonblank', sql`length(btrim(${t.registeredByDisplay})) > 0`),
    check('field_workers_district_nonblank', sql`length(btrim(${t.district})) > 0`),
    check('field_workers_ended_on_pair', sql`(${t.currentState} = 'terminated') = (${t.endedOn} IS NOT NULL)`),
    // Story 13.1a (0201): a worker awaiting approval has no approver; an active or suspended one has one; a blank one never.
    check('field_workers_approved_by_display_nonblank', sql`${t.approvedByDisplay} IS NULL OR length(btrim(${t.approvedByDisplay})) > 0`),
    check(
      'field_workers_approved_by_state',
      sql`(${t.currentState} <> 'pending_kyc' OR ${t.approvedByDisplay} IS NULL) AND (${t.currentState} NOT IN ('active', 'suspended') OR ${t.approvedByDisplay} IS NOT NULL)`,
    ),
  ],
);

// Inferred row types. `FieldWorkerRow` is the FULL row — the reads return `FieldWorkerView`, which OMITS the three PII
// columns (AC10).
export type FieldWorkerRow = typeof fieldWorkers.$inferSelect;
export type FieldWorkerInsert = typeof fieldWorkers.$inferInsert;
