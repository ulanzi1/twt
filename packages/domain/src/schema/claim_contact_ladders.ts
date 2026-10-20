// `claim_contact_ladders` — Story 6.37c (Task 1; LD2, LD3, LD5, LD9; `2026-10-17-350` ruling 2, `-351` 4 A). Migration
// 0169 (hand-authored — the GRANTs, the per-command policies and FORCE RLS live there).
//
// ⭐ ONE follow-up — a DELIVERY LADDER — per (claim, chase, person) at a time, started by a reminder the network REPORTED
// `undelivered` (6.37b's `sms_send_deliveries`). Its steps are IST DATES on the reminders' own 10:00 rhythm (LD3): the
// WhatsApp step (recorded skipped — LD1), SMS 2, SMS 3, the conclusion date. It ENDS on a delivered message, a reached
// call, a number change or a stop, else it CONCLUDES undelivered — and only then does that reminder stop counting as
// reaching the person (the READ-time mapping, LD6 — ⛔ a stored send outcome is ever rewritten, I2).
// ⛔ FK on `run_id` / `origin_row_id`: kind-discriminated by `chase` across the two chases' tables.
// TENANT-ISOLATED; RLS in policies/claim-contact-ladder-rls.ts. ⛔ No number (a KEYED hash only), ⛔ no name.

import { sql } from 'drizzle-orm';
import { check, date, index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import type { ClaimId, PariwarId } from '../ids/index.js';
import { claims } from './claims.js';

/** The chase a ladder follows up. ⚠ LOCKSTEP with `claim_contact_ladders_chase_check` (0169). */
export const CONTACT_LADDER_CHASES = ['correction', 'certificate'] as const;
export type ContactLadderChase = (typeof CONTACT_LADDER_CHASES)[number];

/** A ladder's state (LD2). ⚠ LOCKSTEP with `claim_contact_ladders_state_check` (0169). */
export const CONTACT_LADDER_STATES = [
  'running',
  'ended_delivered',
  'ended_call',
  'ended_number_changed',
  'ended_stopped',
  'concluded_undelivered',
] as const;
export type ContactLadderState = (typeof CONTACT_LADDER_STATES)[number];

/**
 * One step's state (LD3): `pending`, `sent` (one attempt was made — whatever its outcome), `satisfied` (that day's
 * scheduled reminder WAS the step — LD4) or a recorded skip (`skipped:<reason>`). ⚠ The grammar is 0169's CHECK.
 */
export type ContactLadderStepState = 'pending' | 'sent' | 'satisfied' | `skipped:${string}`;

export const claimContactLadders = pgTable(
  'claim_contact_ladders',
  {
    ladderId: uuid('ladder_id').defaultRandom().primaryKey(),
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),
    claimCaseId: uuid('claim_case_id')
      .notNull()
      .$type<ClaimId>()
      .references(() => claims.claimCaseId, { onDelete: 'cascade' }),
    chase: text('chase').notNull().$type<ContactLadderChase>(),
    /** The ORIGIN row's run (an ENDED run is fine — the 6.19c closure-notice precedent). ⛔ FK (two run tables). */
    runId: uuid('run_id').notNull(),
    /** Correction only — the return every correction reader keys on (a CHECK pins the pairing). */
    returnDecisionId: uuid('return_decision_id'),
    /** `nominee:<chain root>` | `claimant` — the chase's person grammar. */
    personKey: text('person_key').notNull(),
    /** The ORIGIN's number — a KEYED hash (`claim_contact_mobile`), compared timing-safe. ⛔ Never the number. */
    recipientNumberHash: text('recipient_number_hash').notNull(),
    /** The `family_sms` row reported `undelivered` that started it (⛔ FK — the chase's own send table). */
    originRowId: uuid('origin_row_id').notNull(),
    /** The origin's IST date (D) — the ladder's clock is anchored on it (⛔ on a report time — F2). */
    originSentOn: date('origin_sent_on', { mode: 'string' }).notNull(),
    /** `-350` ruling 2 (1) — `pending` (the claimant's — Story 6.37d), then `sent` once its send row is claimed, or a RECORDED
     *  skip (`skipped:nominee_no_whatsapp` — `-356`; `skipped:<reason>`). Decided ONCE (0172's trigger). */
    whatsappStep: text('whatsapp_step').notNull(),
    sms2DueOn: date('sms2_due_on', { mode: 'string' }).notNull(),
    sms2State: text('sms2_state').notNull().default('pending').$type<ContactLadderStepState>(),
    /** The IST date SMS 2's step resolved. */
    sms2On: date('sms2_on', { mode: 'string' }),
    /** The row that carried SMS 2: this ladder's `ladder_sms` row, or the row that SATISFIED it (LD4). */
    sms2RowId: uuid('sms2_row_id'),
    sms3DueOn: date('sms3_due_on', { mode: 'string' }),
    sms3State: text('sms3_state').notNull().default('pending').$type<ContactLadderStepState>(),
    sms3On: date('sms3_on', { mode: 'string' }),
    sms3RowId: uuid('sms3_row_id'),
    /** `-350` ruling 2 (3) — SMS 3's date + 4 (*"waited 96 hours"*). */
    concludeOn: date('conclude_on', { mode: 'string' }),
    state: text('state').notNull().default('running').$type<ContactLadderState>(),
    /** Why it ended (`stopped:<reason>`, …) — ≤ 64 `[a-z_:]`; ⛔ PII. */
    endDetail: text('end_detail'),
    endedAt: timestamp('ended_at', { withTimezone: true, mode: 'date' }),
    /** The IST date the sweep CONCLUDED it (= `conclude_on` unless a run was missed) — the found-dead date (LD7). */
    concludedOn: date('concluded_on', { mode: 'string' }),
    /** The date its ONE `ladder_escalation` (the call-or-letter ask — LD9) was written; null until then. */
    escalatedOn: date('escalated_on', { mode: 'string' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().default(sql`clock_timestamp()`),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().default(sql`clock_timestamp()`),
  },
  (t) => [
    uniqueIndex('claim_contact_ladders_running_uq').on(t.claimCaseId, t.chase, t.personKey).where(sql`"state" = 'running'`),
    uniqueIndex('claim_contact_ladders_origin_uq').on(t.chase, t.originRowId),
    index('claim_contact_ladders_state_conclude_idx').on(t.state, t.concludeOn),
    index('claim_contact_ladders_pariwar_claim_idx').on(t.pariwarId, t.claimCaseId),
    check('claim_contact_ladders_chase_check', sql`${t.chase} IN ('correction', 'certificate')`),
    check('claim_contact_ladders_return_pair_check', sql`(${t.chase} = 'correction') = (${t.returnDecisionId} IS NOT NULL)`),
    check('claim_contact_ladders_person_key_check', sql`length(btrim(${t.personKey})) > 0`),
    check('claim_contact_ladders_number_hash_check', sql`length(btrim(${t.recipientNumberHash})) > 0`),
    // Story 6.37d — LOCKSTEP with migration 0172 (`sent` added; 0172's trigger lets the step move ONCE, from `pending`).
    check('claim_contact_ladders_whatsapp_step_check', sql`${t.whatsappStep} ~ '^(pending|sent|skipped:[a-z_]{1,48})$'`),
    index('claim_contact_ladders_wa_pending_idx').on(t.createdAt).where(sql`"whatsapp_step" = 'pending' AND "state" = 'running'`),
    check('claim_contact_ladders_sms2_state_check', sql`${t.sms2State} ~ '^(pending|sent|satisfied|skipped:[a-z_]{1,48})$'`),
    check('claim_contact_ladders_sms3_state_check', sql`${t.sms3State} ~ '^(pending|sent|satisfied|skipped:[a-z_]{1,48})$'`),
    check(
      'claim_contact_ladders_sms2_on_pair_check',
      sql`(${t.sms2State} = 'pending') = (${t.sms2On} IS NULL) AND (${t.sms2State} = 'pending') = (${t.sms3DueOn} IS NULL)`,
    ),
    check(
      'claim_contact_ladders_sms3_on_pair_check',
      sql`(${t.sms3State} = 'pending') = (${t.sms3On} IS NULL) AND (${t.sms3State} = 'pending') = (${t.concludeOn} IS NULL)`,
    ),
    // Review P3 — LOCKSTEP with migration 0170's `claim_contact_ladders_sms2_row_id_check` / `_sms3_row_id_check` (round 2 P9:
    // moved out of 0169, which is restored as applied).
    check(
      'claim_contact_ladders_sms2_row_id_check',
      sql`CASE ${t.sms2State} WHEN 'sent' THEN ${t.sms2RowId} IS NOT NULL WHEN 'satisfied' THEN true ELSE ${t.sms2RowId} IS NULL END`,
    ),
    check(
      'claim_contact_ladders_sms3_row_id_check',
      sql`CASE ${t.sms3State} WHEN 'sent' THEN ${t.sms3RowId} IS NOT NULL WHEN 'satisfied' THEN true ELSE ${t.sms3RowId} IS NULL END`,
    ),
    check(
      'claim_contact_ladders_step_order_check',
      sql`${t.sms2DueOn} > ${t.originSentOn} AND (${t.sms3State} = 'pending' OR ${t.sms2State} <> 'pending')`,
    ),
    check(
      'claim_contact_ladders_state_check',
      sql`${t.state} IN ('running', 'ended_delivered', 'ended_call', 'ended_number_changed', 'ended_stopped', 'concluded_undelivered')`,
    ),
    check('claim_contact_ladders_ended_pair_check', sql`(${t.state} = 'running') = (${t.endedAt} IS NULL)`),
    check('claim_contact_ladders_concluded_pair_check', sql`(${t.state} = 'concluded_undelivered') = (${t.concludedOn} IS NOT NULL)`),
    // Review round 2 P31 — LOCKSTEP with migration 0170: a CONCLUDED ladder resolved both steps (`concludeContactLadder`'s CAS).
    check(
      'claim_contact_ladders_concluded_steps_check',
      sql`${t.state} <> 'concluded_undelivered' OR (${t.sms2State} <> 'pending' AND ${t.sms3State} <> 'pending')`,
    ),
    check('claim_contact_ladders_escalated_check', sql`${t.escalatedOn} IS NULL OR ${t.state} = 'concluded_undelivered'`),
    check(
      'claim_contact_ladders_end_detail_check',
      sql`${t.endDetail} IS NULL OR (${t.endDetail} ~ '^[a-z_:]{1,64}$' AND ${t.state} <> 'running')`,
    ),
  ],
);

export type ClaimContactLadderRow = typeof claimContactLadders.$inferSelect;
