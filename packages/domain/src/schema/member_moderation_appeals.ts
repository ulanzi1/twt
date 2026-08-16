// `member_moderation_appeals` — the moderation APPEAL record (Story 10.22, migration 0107).
//
// Implements Niyamavali **§8.8**, ratified by Decision `2026-08-15-121`. §8.8 occupied a RESERVED
// number: §8.6's *Recorded gap* clause said in terms that closing the gap "requires its own
// amendment (§8.8, reserved)". The instrument landed first; this table implements it.
// ⛔ `docs/legal/` is gitignored — Decision `2026-08-15-121` is the ONLY durable copy of the §8.8 text.
//
// ── A RECORD, NOT A SECOND MODERATION WRITE PATH (§8.8; Decision cl.10) ─────────────────────────
// An allowed appeal **DIRECTS** that the act be undone; it never undoes it. Nothing here moves the
// moderation overlay. The restore is a subsequent, separately-attributed act through the existing
// `POST …/moderation` path, with its own reason code, its own Decision Note, and — from `terminated` —
// the Panel-exclusive `member.restore_terminated` check. Two structural reasons the appeal must not
// write the overlay itself: a second write path bypasses §8.6's record and the dwell, and it would
// make the appeal a moderation act with no Decision Note.
//
// ⛔ NOT Epic 6's claim appeal. Part 9 is claim-scoped, Part 8 does not reference it, and §8.8 says so
// expressly. No shared table, no shared route, and `MemberModerationAppealId` is NOT Epic 6's
// `AppealId` (whose doc-comment binds it to `claim_appeals.appeal_id`).
//
// ── KEYED TO THE ACT, NOT THE MEMBER (§8.8; Decision cl.6/cl.7) ─────────────────────────────────
// §8.4a: suspension and termination are "distinct sanctions with distinct thresholds — not two
// intensities of one act". Each is separately appealable. Keying uniqueness to the member would make
// a later termination unappealable because an earlier suspension had been appealed.
//
// The one-open-per-act rule is a PARTIAL UNIQUE index (`… WHERE status = 'open'`), because §8.8
// permits re-filing against the same act after a determination and does not exhaust the right.
// ⛔ Do NOT tighten it to a plain UNIQUE to match Part 9's one-journey-per-claim-EVER language.
// ⚠ A three-tier ladder with a finality cap was raised against this and is NOT RATIFIED
// (`2026-08-15-121` clause 8).
//
// ── PII discipline (R1) ─────────────────────────────────────────────────────────────────────────
//   · grounds_ciphertext          → Tier-1, MEMBER-authored. NEVER in an event payload, an audit
//     entry, or a log line — `events_log.payload` is plaintext JSONB.
//   · reasoned_outcome_ciphertext → Tier-1, ADJUDICATOR-authored. Same posture.
//   · filed_via / status / outcome→ NON-PII bounded vocabulary; these are what the events carry.
//   · decided_by_display          → controlled STAFF data, snapshotted at decision time so a later
//     rename cannot rewrite history ([[project_admin_display_name_attribution]]).
// Both Tier-1 columns are scrubbed by `anonymizeMember` under `FIELD_CLASS_MODERATION_APPEAL`.
//
// Naming discipline per architecture L3663-3677: DB columns snake_case, TS camelCase.

import { index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

import { piiColumn } from '../encryption/column.js';
import type {
  HelpdeskTicketId,
  MemberId,
  MemberModerationAppealId,
  ModerationActionId,
  PariwarId,
} from '../ids/index.js';
// ⛔ The bounded vocabulary is declared in a LEAF module, not here — `member/moderation/events.ts`
// needs the same tuples and must stay pg-free ([[project_contracts_domain_bundle_boundary]],
// [[project_type_only_import_cycle_trap]]).
import type {
  AppealFiledVia,
  AppealOutcome,
  AppealStatus,
} from '../member/moderation/appeal-vocabulary.js';
import { memberModerationActions } from './member_moderation_actions.js';
import { members } from './members.js';

export const memberModerationAppeals = pgTable(
  'member_moderation_appeals',
  {
    appealId: uuid('appeal_id')
      .$type<MemberModerationAppealId>()
      .primaryKey()
      .defaultRandom(),

    // The appellant. FK → members, `onDelete: 'cascade'` for referential-integrity hygiene only.
    // Members are never row-deleted, so this cascade is moot in practice: RTBF (Story 3.12) is a
    // field-level soft-delete (see `member/anonymize.ts`) that overwrites this table's Tier-1
    // ciphertext columns while RETAINING the row — the appeal record survives an RTBF request.
    memberId: uuid('member_id')
      .$type<MemberId>()
      .notNull()
      .references(() => members.memberId, { onDelete: 'cascade' }),

    // Multi-tenant scope (RLS predicate column; branded).
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

    // The moderation act under appeal — §8.8: "identified by its record under §8.6".
    moderationActionId: uuid('moderation_action_id')
      .$type<ModerationActionId>()
      .notNull()
      .references(() => memberModerationActions.moderationActionId, { onDelete: 'cascade' }),

    // The member's own grounds of appeal. MEMBER-authored free text. Tier-1.
    groundsCiphertext: piiColumn(1, 'moderation_appeal')('grounds_ciphertext').notNull(),

    // Which intake surface produced this record. NON-PII; rides the `appeal-filed` event payload.
    filedVia: text('filed_via').notNull().$type<AppealFiledVia>(),

    // The originating helpdesk ticket. NOT NULL when `filed_via = 'helpline'`, enforced by the
    // `member_moderation_appeals_helpline_needs_ticket_check` CHECK — the 10.21 corrections
    // precedent, relaxed for the in-portal arm where the member's own session is the artifact.
    helpdeskTicketId: uuid('helpdesk_ticket_id').$type<HelpdeskTicketId>(),

    filedAt: timestamp('filed_at', { withTimezone: true, mode: 'date' }).notNull(),

    status: text('status').notNull().$type<AppealStatus>(),

    // NULL until decided. Coherence with the four fields below is a DB CHECK, not a convention.
    outcome: text('outcome').$type<AppealOutcome>(),

    // The reasoned outcome §8.8 requires. ADJUDICATOR-authored. Tier-1. NULL until decided.
    reasonedOutcomeCiphertext: piiColumn(1, 'moderation_appeal')('reasoned_outcome_ciphertext'),

    // Who decided + their `users.display_name` SNAPSHOT. No FK: the attribution must survive a staff
    // record change. ⛔ Never email-derived; a missing display name blocks the decision with a typed
    // error rather than writing a placeholder.
    decidedByActorId: uuid('decided_by_actor_id'),
    decidedByDisplay: text('decided_by_display'),
    decidedAt: timestamp('decided_at', { withTimezone: true, mode: 'date' }),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    // ⭐ The one-open-per-ACT rule. PARTIAL by design — see the header.
    uniqueIndex('member_moderation_appeals_one_open_per_action')
      .on(t.moderationActionId)
      .where(sql`status = 'open'`),
    index('member_moderation_appeals_member_id_idx').on(t.memberId),
    index('member_moderation_appeals_pariwar_id_idx').on(t.pariwarId),
    // The adjudication LIST read (AC5) — the surface the Panel actually finds a filed appeal through.
    index('member_moderation_appeals_pariwar_status_filed_idx').on(t.pariwarId, t.status, t.filedAt),
    index('member_moderation_appeals_action_id_idx').on(t.moderationActionId),
  ],
);

export type MemberModerationAppealRow = typeof memberModerationAppeals.$inferSelect;
export type MemberModerationAppealInsert = typeof memberModerationAppeals.$inferInsert;
