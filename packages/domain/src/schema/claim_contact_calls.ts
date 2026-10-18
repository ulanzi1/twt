// `claim_contact_calls` — Story 6.37c (Task 1; LD10; `2026-10-17-351` 5 A). Migration 0169 (hand-authored — the GRANTs,
// the per-command policies and FORCE RLS live there).
//
// ⭐ APPEND-ONLY: a District Admin's record of a phone call to a person on a claim — the date, WHO answered (a ROLE,
// `-351` 5 A's *"who answered"* — ⛔ a name), whether it reached the family. A call recorded `reached` is the ONE new
// source of reach (I1 — ⛔ a provider input): it counts for the correction closure (D22), ends that person's running
// ladders and stops a concluded person's staff asks. ⛔ Free text, ⛔ a number, ⛔ a name. ⛔ UPDATE, ⛔ DELETE.
// TENANT-ISOLATED; RLS in policies/claim-contact-call-rls.ts.

import { sql } from 'drizzle-orm';
import { check, date, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import type { ClaimId, PariwarId } from '../ids/index.js';
import { claimContactLadders, type ContactLadderChase } from './claim_contact_ladders.js';
import { claims } from './claims.js';

/** Who answered. ⚠ LOCKSTEP with `claim_contact_calls_answered_by_check` (0169) and the contract's re-declaration. */
export const CONTACT_CALL_ANSWERED_BY = ['the_person', 'family_member', 'someone_else', 'nobody'] as const;
export type ContactCallAnsweredBy = (typeof CONTACT_CALL_ANSWERED_BY)[number];

/** ⚠ LOCKSTEP with `claim_contact_calls_outcome_check` (0169). `reached` ⇒ the person or a family member answered. */
export const CONTACT_CALL_OUTCOMES = ['reached', 'not_reached'] as const;
export type ContactCallOutcome = (typeof CONTACT_CALL_OUTCOMES)[number];

export const claimContactCalls = pgTable(
  'claim_contact_calls',
  {
    callId: uuid('call_id').defaultRandom().primaryKey(),
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),
    claimCaseId: uuid('claim_case_id')
      .notNull()
      .$type<ClaimId>()
      .references(() => claims.claimCaseId, { onDelete: 'cascade' }),
    /** `nominee:<chain root>` | `claimant` — the chase's person grammar. */
    personKey: text('person_key').notNull(),
    /** The surface it was recorded from — ⛔ a reach scope (a reached call reached the PERSON). */
    chase: text('chase').notNull().$type<ContactLadderChase>(),
    /**
     * The ladder whose ask it answers, when one was running or concluded for the person — else null. `SET NULL` on the
     * ladder's delete (round 2 P31, migration 0170): a reached call is a reach FACT (I1) that outlives its attribution.
     */
    ladderId: uuid('ladder_id').references(() => claimContactLadders.ladderId, { onDelete: 'set null' }),
    /** IST date of the call (≤ today, ≥ the claim's filing date — the writer's checks). */
    calledOn: date('called_on', { mode: 'string' }).notNull(),
    answeredBy: text('answered_by').notNull().$type<ContactCallAnsweredBy>(),
    outcome: text('outcome').notNull().$type<ContactCallOutcome>(),
    recordedByActor: text('recorded_by_actor').notNull(),
    /** The admin's display name at the time (⛔ email-derived, ⛔ a fallback). */
    recordedByDisplay: text('recorded_by_display').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().default(sql`clock_timestamp()`),
  },
  (t) => [
    index('claim_contact_calls_pariwar_claim_idx').on(t.pariwarId, t.claimCaseId),
    check('claim_contact_calls_chase_check', sql`${t.chase} IN ('correction', 'certificate')`),
    check(
      'claim_contact_calls_answered_by_check',
      sql`${t.answeredBy} IN ('the_person', 'family_member', 'someone_else', 'nobody')`,
    ),
    check('claim_contact_calls_outcome_check', sql`${t.outcome} IN ('reached', 'not_reached')`),
    check(
      'claim_contact_calls_reached_answered_check',
      sql`${t.outcome} <> 'reached' OR ${t.answeredBy} IN ('the_person', 'family_member')`,
    ),
    check('claim_contact_calls_person_key_check', sql`length(btrim(${t.personKey})) > 0`),
    check(
      'claim_contact_calls_recorded_by_check',
      sql`length(btrim(${t.recordedByActor})) > 0 AND length(btrim(${t.recordedByDisplay})) > 0`,
    ),
  ],
);

export type ClaimContactCallRow = typeof claimContactCalls.$inferSelect;
