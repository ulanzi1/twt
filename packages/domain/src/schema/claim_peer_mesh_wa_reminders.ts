// `claim_peer_mesh_wa_reminders` — the WhatsApp REMINDER's own record (Story 6.31, Task 1; WR1, WR10, I1; `2026-10-10-303` Q1 A,
// `2026-10-10-311` PM7 (g) / Trap 17; `2026-10-19-365`). Migration 0171 (hand-authored — the GRANTs, the per-command policies,
// FORCE RLS, the CHECKs and the finished-row trigger live there).
//
// ⭐ ONE row per ping, EVER (`UNIQUE (ping_id)` — I1): created ONLY by the claim child's begin under the claim → ping locks, then
// moved by compare-and-set. A finished row's delivery columns are frozen by 0171's trigger. `send_started_at` is the IN-FLIGHT
// marker (WR10): set in its own committed CAS just before the WhatsApp call; a lapsed row WITH it died mid-flight ⇒ finished
// `may_have_sent:lease_lapsed`, ⛔ re-sent. ⛔ A column of `claim_peer_mesh_pings` (F1 — the text's record is the text's).
// TENANT-ISOLATED; RLS in policies/claim-peer-mesh-wa-reminders-rls.ts. ⛔ PII: ids, a KEYED number hash, the wamid, the template
// NAME, a fixed-vocabulary `detail` — ⛔ a name, ⛔ a number, ⛔ the link code (T11).

import { foreignKey, index, integer, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

import type { ClaimId, MemberId, PariwarId, PeerMeshPingId, PeerMeshSelectionId } from '../ids/index.js';
import { claimPeerMeshPings, type PeerMeshLocaleSource } from './claim_peer_mesh_pings.js';
import { claimPeerMeshSelections } from './claim_peer_mesh_selections.js';

/**
 * The reminder's outcomes (WR10). `error` is a send that MAY have reached Meta (`may_have_sent:*` only); the five `skipped_*` are a
 * begin's finished judgement (WR2) or the 72-hour bound (`skipped_late`, WR5). ⚠ LOCKSTEP with 0171's
 * `claim_peer_mesh_wa_reminders_send_outcome_check` (a spec reads the CHECK).
 */
export const PEER_MESH_WA_REMINDER_SEND_OUTCOMES = [
  'attempting',
  'accepted',
  'rejected_recipient',
  'no_target',
  'error',
  'skipped_answered',
  'skipped_window_closed',
  'skipped_not_opted_in',
  'skipped_recipient_ineligible',
  'skipped_late',
] as const;
export type PeerMeshWaReminderSendOutcome = (typeof PEER_MESH_WA_REMINDER_SEND_OUTCOMES)[number];

/** The outcomes that mean a WhatsApp call was MADE — 0171 pins `send_started_at IS NOT NULL` to exactly these on a finished row. */
export const PEER_MESH_WA_REMINDER_SENT_OUTCOMES = ['accepted', 'rejected_recipient', 'error'] as const;

/** The reminder's locales — the ruled words exist in these two (WR6). ⚠ LOCKSTEP with 0171's `locale` CHECK. */
export const PEER_MESH_WA_REMINDER_LOCALES = ['en', 'hi'] as const;
export type PeerMeshWaReminderLocale = (typeof PEER_MESH_WA_REMINDER_LOCALES)[number];

/**
 * ⭐ The GRAMMAR of `detail` / `first_detail` (WR10): the transients (`rate_limited:<code|none>`, `api_unavailable:<status>`,
 * `decrypt_failed:tier1`, `hash_failed:tier1`), `may_have_sent:<how>`, the two park notes (`scope:<token>` — a scope-wide refusal;
 * `held:<token>` — a refusal of unknown scope) and the `no_target:*` reasons — ⛔ anything else (⛔ a space, ⛔ `+`, ⛔ a run of 7+
 * digits — a bare phone number). `sweep:held` is a `claimed_by_job` marker and the `config:<gap>` codes are ALARM-only (a held
 * Pariwar writes ⛔ row). ⚠ LOCKSTEP with 0171's two `*_vocabulary_check` CHECKs (a spec pins the catalog to this string).
 * ⛔ Backslashes — the same string reads the same in a JS `RegExp` and a PG ARE.
 */
export const PEER_MESH_WA_REMINDER_DETAIL_PATTERN =
  '^(?!.*[0-9]{7})(rate_limited:([0-9]{1,6}|none)|api_unavailable:[0-9]{3}|decrypt_failed:tier1|hash_failed:tier1|may_have_sent:(network|timeout|no_wamid|lease_lapsed|gateway_502|gateway_504|unknown)|(scope|held):[a-z0-9_]{1,48}|no_target:(no_sendable_number|name_none|name_erased|name_unresolvable))$';

export const claimPeerMeshWaReminders = pgTable(
  'claim_peer_mesh_wa_reminders',
  {
    reminderId: uuid('reminder_id').defaultRandom().primaryKey(),
    /** The ping (the text) this reminder follows — ONE reminder per ping, ever. */
    pingId: uuid('ping_id').notNull().$type<PeerMeshPingId>(),
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),
    claimCaseId: uuid('claim_case_id').notNull().$type<ClaimId>(),
    selectionId: uuid('selection_id').notNull().$type<PeerMeshSelectionId>(),
    /** The neighbour (the ping's member). Opaque id. */
    memberId: uuid('member_id').notNull().$type<MemberId>(),
    sendOutcome: text('send_outcome').notNull().$type<PeerMeshWaReminderSendOutcome>(),
    /** ≥ 1 — the begins that claimed the row (a re-claim adds one; 0171's trigger: ⛔ decreasing). */
    attemptCount: integer('attempt_count').notNull().default(1),
    claimedAt: timestamp('claimed_at', { withTimezone: true, mode: 'date' }),
    /** The holding job, or `sweep:held` (a park — ⇔ `parked_at`), or a sweep finisher's marker. */
    claimedByJob: text('claimed_by_job'),
    /** The first begin's instant — moves only forward. */
    agingSince: timestamp('aging_since', { withTimezone: true, mode: 'date' }),
    parkedAt: timestamp('parked_at', { withTimezone: true, mode: 'date' }),
    /** ⭐ The IN-FLIGHT marker (WR10) — set just before the WhatsApp call; cleared by a park, a transient, or R2's quiet-hours release (`-366` 4 (b)). */
    sendStartedAt: timestamp('send_started_at', { withTimezone: true, mode: 'date' }),
    /** The fixed grammar (`PEER_MESH_WA_REMINDER_DETAIL_PATTERN`). ⛔ Never PII, ⛔ never the link code. */
    detail: text('detail'),
    firstDetail: text('first_detail'),
    /** The wamid — the trail (WR11); statuses join `whatsapp_send_status` read-only. */
    providerMessageId: text('provider_message_id'),
    /** A KEYED hash of the number messaged. ⛔ Never the number. */
    recipientNumberHash: text('recipient_number_hash'),
    /** The Meta template NAME the reminder was sent under (WR7's per-Pariwar key). */
    templateName: text('template_name'),
    locale: text('locale').$type<PeerMeshWaReminderLocale>(),
    /** Why the language was chosen (WR14 — `resolvePeerRequestLocale`, read again at begin). */
    localeSource: text('locale_source').$type<PeerMeshLocaleSource>(),
    sendUpdatedAt: timestamp('send_updated_at', { withTimezone: true, mode: 'date' }).notNull().default(sql`clock_timestamp()`),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().default(sql`clock_timestamp()`),
  },
  (t) => [
    unique('claim_peer_mesh_wa_reminders_ping_uq').on(t.pingId),
    foreignKey({
      name: 'claim_peer_mesh_wa_reminders_ping_owner_fk',
      columns: [t.pariwarId, t.pingId, t.selectionId, t.memberId],
      foreignColumns: [claimPeerMeshPings.pariwarId, claimPeerMeshPings.pingId, claimPeerMeshPings.selectionId, claimPeerMeshPings.memberId],
    }).onDelete('cascade'),
    foreignKey({
      name: 'claim_peer_mesh_wa_reminders_selection_owner_fk',
      columns: [t.pariwarId, t.selectionId, t.claimCaseId],
      foreignColumns: [claimPeerMeshSelections.pariwarId, claimPeerMeshSelections.selectionId, claimPeerMeshSelections.claimCaseId],
    }).onDelete('cascade'),
    index('claim_peer_mesh_wa_reminders_claim_idx').on(t.pariwarId, t.claimCaseId),
    index('claim_peer_mesh_wa_reminders_attempting_idx').on(t.claimedAt).where(sql`send_outcome = 'attempting'`),
  ],
);

export type ClaimPeerMeshWaReminderRow = typeof claimPeerMeshWaReminders.$inferSelect;
