// `claim_contact_wa_sends` + `claim_contact_wa_stops` — the claimant's WHATSAPP STEP of the delivery ladder (Story 6.37d,
// Task 3; WS8, WS10, WS11; I4, I8; `2026-10-17-350` ruling 2 (1), `-357`, `2026-10-20-367`). Migration 0172 (hand-authored —
// the GRANTs, the per-command policies, FORCE RLS, the CHECKs and the triggers live there).
//
// ⭐ ONE send row per ladder, EVER (`UNIQUE (ladder_id)` — I4), on 6.31's crash-safe shape (0171): claimed `attempting` under
// the chase lock (the ladder's step becomes `sent` in the same transaction), an IN-FLIGHT MARKER (`send_started_at`) set in its
// OWN committed CAS just before Meta, finished by compare-and-set. A lapsed row WITH the marker died mid-flight ⇒ finished
// `may_have_sent:lease_lapsed`, ⛔ re-sent. `recipient_number_hash` is the LADDER's (written at the claim — WS11 (2)).
// The webhook worker writes `delivered_at` / `failed_at` / `failure_code` (each set once, on an `accepted` row with a wamid).
// `claim_contact_wa_stops` — a STOP keyword on a Pariwar's WhatsApp number, in the ladder's `claim_contact_mobile` hash space
// (T21 — ⛔ the member login index), append-only. TENANT-ISOLATED; RLS in policies/claim-contact-wa-rls.ts.
// ⛔ PII: ids, a KEYED number hash, the wamid, the template NAME, a fixed-vocabulary `detail` — ⛔ a name, ⛔ a number.

import { sql } from 'drizzle-orm';
import { index, integer, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

import type { ClaimId, PariwarId } from '../ids/index.js';
import { claimContactLadders, type ContactLadderChase } from './claim_contact_ladders.js';
import { claims } from './claims.js';

/**
 * The send's outcomes (WS8 (ii)). `may_have_sent` — a send that MAY have reached Meta (⛔ resent); `refused` — Meta refused it
 * (a scope-wide or unknown-scope refusal — recorded + alarmed, ⛔ parked); `skipped` — a re-check or the final attempt finished
 * it without a send. ⚠ LOCKSTEP with 0172's `claim_contact_wa_sends_send_outcome_check` (a spec reads the CHECK).
 */
export const CONTACT_LADDER_WA_SEND_OUTCOMES = [
  'attempting',
  'accepted',
  'rejected_recipient',
  'may_have_sent',
  'refused',
  'skipped',
  'no_target',
] as const;
export type ContactLadderWaSendOutcome = (typeof CONTACT_LADDER_WA_SEND_OUTCOMES)[number];

/** The outcomes that mean a WhatsApp call was MADE — 0172 pins `send_started_at IS NOT NULL` to exactly these on a finished row. */
export const CONTACT_LADDER_WA_SENT_OUTCOMES = ['accepted', 'rejected_recipient', 'may_have_sent', 'refused'] as const;

/** The template's languages (Meta codes `en` / `hi` — T9). ⚠ LOCKSTEP with 0172's `locale` CHECK. */
export const CONTACT_LADDER_WA_LOCALES = ['en', 'hi'] as const;
export type ContactLadderWaLocale = (typeof CONTACT_LADDER_WA_LOCALES)[number];

/**
 * ⭐ The GRAMMAR of `detail` / `first_detail`: a fixed prefix, a colon, then `[a-z0-9_]{1,48}` — ⛔ a space, ⛔ `+`, ⛔ a run of
 * 7+ digits (a bare phone number). ⚠ LOCKSTEP with 0172's two `*_vocabulary_check` CHECKs (a spec pins the catalog to this
 * string). ⛔ Backslashes — the same string reads the same in a JS `RegExp` and a PG ARE.
 */
export const CONTACT_LADDER_WA_DETAIL_PATTERN =
  '^(?!.*[0-9]{7})(rate_limited|api_unavailable|decrypt_failed|hash_failed|marker_lost|may_have_sent|rejected_recipient|refused|skipped|no_target):[a-z0-9_]{1,48}$';

export const claimContactWaSends = pgTable(
  'claim_contact_wa_sends',
  {
    sendId: uuid('send_id').defaultRandom().primaryKey(),
    /** The ladder whose WhatsApp step this is — ONE send per ladder, ever. */
    ladderId: uuid('ladder_id')
      .notNull()
      .references(() => claimContactLadders.ladderId, { onDelete: 'cascade' }),
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),
    claimCaseId: uuid('claim_case_id')
      .notNull()
      .$type<ClaimId>()
      .references(() => claims.claimCaseId, { onDelete: 'cascade' }),
    chase: text('chase').notNull().$type<ContactLadderChase>(),
    /** The LADDER's number hash (`claim_contact_mobile`), written at the claim; the finalise never changes it. ⛔ The number. */
    recipientNumberHash: text('recipient_number_hash').notNull(),
    /** The Meta template NAME (the per-Pariwar config value — `wa.template.claim_contact.*`). */
    templateName: text('template_name').notNull(),
    locale: text('locale').notNull().$type<ContactLadderWaLocale>(),
    sendOutcome: text('send_outcome').notNull().$type<ContactLadderWaSendOutcome>(),
    /** ≥ 1 — the claims that took the row (a re-claim adds one; 0172's trigger: ⛔ decreasing). */
    attemptCount: integer('attempt_count').notNull().default(1),
    claimedAt: timestamp('claimed_at', { withTimezone: true, mode: 'date' }).notNull(),
    claimedByJob: text('claimed_by_job').notNull(),
    /** The first claim's instant — moves only forward. */
    agingSince: timestamp('aging_since', { withTimezone: true, mode: 'date' }).notNull(),
    /** ⭐ The IN-FLIGHT marker — set just before the WhatsApp call; cleared by a release, a transient note or a no-send finish. */
    sendStartedAt: timestamp('send_started_at', { withTimezone: true, mode: 'date' }),
    /** The fixed grammar (`CONTACT_LADDER_WA_DETAIL_PATTERN`). ⛔ Never PII. */
    detail: text('detail'),
    firstDetail: text('first_detail'),
    /** The wamid — statuses join by it. */
    providerMessageId: text('provider_message_id'),
    /** ABSORBING — the first `delivered` (or `read`) status for the wamid; set once. */
    deliveredAt: timestamp('delivered_at', { withTimezone: true, mode: 'date' }),
    failedAt: timestamp('failed_at', { withTimezone: true, mode: 'date' }),
    /** Meta's error code on a `failed` status (digits only). */
    failureCode: text('failure_code'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().default(sql`clock_timestamp()`),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().default(sql`clock_timestamp()`),
  },
  (t) => [
    unique('claim_contact_wa_sends_ladder_uq').on(t.ladderId),
    unique('claim_contact_wa_sends_wamid_uq').on(t.providerMessageId),
    index('claim_contact_wa_sends_claim_idx').on(t.pariwarId, t.claimCaseId),
    index('claim_contact_wa_sends_attempting_idx').on(t.claimedAt).where(sql`send_outcome = 'attempting'`),
    index('claim_contact_wa_sends_recipient_idx').on(t.pariwarId, t.recipientNumberHash, t.createdAt),
  ],
);

export type ClaimContactWaSendRow = typeof claimContactWaSends.$inferSelect;

export const claimContactWaStops = pgTable(
  'claim_contact_wa_stops',
  {
    stopId: uuid('stop_id').defaultRandom().primaryKey(),
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),
    /** The STOP sender's number, KEYED in the ladder's space (`correctionNumberHash` — T21). ⛔ The number. */
    recipientNumberHash: text('recipient_number_hash').notNull(),
    /** The `wa_inbound_webhook_events` row that carried the STOP (a replay records ⛔ a second stop). */
    inboundEventId: uuid('inbound_event_id').notNull(),
    stoppedAt: timestamp('stopped_at', { withTimezone: true, mode: 'date' }).notNull().default(sql`clock_timestamp()`),
  },
  (t) => [
    // Review R1 (Story 6.37d, 2026-10-20) — widened by migration 0173: a batched webhook payload carries one `inbound_event_id`
    // for every message in it, so a dedup keyed on the event alone wrongly treats a SECOND sender in the same batch as a
    // replay. The recipient's own hash joins the identity (⛔ 0172's narrower constraint — forward migration, never an edit).
    unique('claim_contact_wa_stops_event_uq').on(t.pariwarId, t.inboundEventId, t.recipientNumberHash),
    index('claim_contact_wa_stops_number_idx').on(t.pariwarId, t.recipientNumberHash),
  ],
);

export type ClaimContactWaStopRow = typeof claimContactWaStops.$inferSelect;
