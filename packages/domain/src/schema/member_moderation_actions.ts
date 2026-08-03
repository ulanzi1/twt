// `member_moderation_actions` — the append-only moderation DECISION RECORD (Story 10.10, Task 2).
//
// ── This table is NOT the moderation status ─────────────────────────────────────────────────────
// The member's moderation STATUS is DERIVED by folding the `member.moderation.*` events on the
// member's own `events_log` stream (`moderation/overlay.ts`, Decision 1). There is deliberately NO
// mutable `moderation_status` column here: it would be a second source of truth and would trip the
// architecture §1.14 event-derivation invariant the epic AC itself names. This table holds ONLY
// what a plaintext-JSONB event payload MAY NOT carry:
//   · `rationale_ciphertext` — the mandatory free-text rationale, Tier-1 encrypted (R1);
//   · `actor_display`        — the acting admin's `users.display_name` SNAPSHOT at action time;
//   · `rejoin_permitted_at`  — the FR-56 → FR-6 12-month rejoin-lock instant (terminate only).
// It is written in the SAME scope transaction as the event append, so the two can never diverge.
//
// APPEND-ONLY (the `member_addresses` / `member_postings` posture, NOT the single-row-per-member
// `member_withdrawals` posture): every action is a new row, and the history read is the audit
// trail the admin console renders. The migration therefore GRANTs SELECT + INSERT and NOT
// UPDATE/DELETE — a recorded moderation decision is immutable.
//
// TENANT-ISOLATED (RLS on `pariwar_id`; policies in `policies/member-moderation-actions-rls.ts`).
// ⚠ One deliberate cross-tenant read exists: the signup rejoin guard runs PRE-scope on the
// BYPASSRLS `servicePool` (`member-auth.repo.ts`) — RLS is bypassed there by design, exactly as it
// already is for `member_withdrawals`. That is why `twt_service` needs SELECT (see the migration).
//
// ── PII discipline (R1) ─────────────────────────────────────────────────────────────────────────
//   · action / reason_code   → NON-PII bounded pgEnum governance vocabulary. Safe in audit context.
//   · rationale_ciphertext   → Tier-1 envelope ciphertext (`piiColumn(1, 'member_moderation')`).
//     NEVER logged; NEVER echoed to a list DTO; NEVER in any event or audit payload (feeds the
//     Story 1.16b PII-shielding CI gate). NOT NULL — the rationale is mandatory on EVERY action.
//   · actor_display          → controlled STAFF data (never member PII, never email-derived —
//     [[project_admin_display_name_attribution]]). Snapshotted so a later rename cannot rewrite
//     history.
//
// Naming discipline per architecture L3663-3677: DB columns snake_case, TS camelCase.

import { index, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { piiColumn } from '../encryption/column.js';
import type { MemberId, ModerationActionId, PariwarId } from '../ids/index.js';
import { MODERATION_ACTIONS } from '../member/moderation/status.js';
import {
  MODERATION_REASON_CODES,
  RESTORE_REASON_CODES,
} from '../member/moderation/reason-codes.js';
import { members } from './members.js';

/**
 * The three moderation actions. The pgEnum is generated FROM the domain tuple, so the DB vocabulary
 * and `ModerationAction` can never drift (the `helpdesk_ticket_state` precedent).
 */
export const moderationActionEnum = pgEnum('moderation_action', MODERATION_ACTIONS);

/**
 * Every declared reason code, in ONE pgEnum spanning both families. The `appliesTo` narrowing
 * (a restore code can never justify a termination) is enforced in the DOMAIN with a typed 422 —
 * expressing it at the DB would need a per-action CHECK duplicating the registry, and the registry
 * is the single source (Decision 3). The enum still bounds the column to declared vocabulary.
 */
export const moderationReasonCodeEnum = pgEnum('moderation_reason_code', [
  ...MODERATION_REASON_CODES,
  ...RESTORE_REASON_CODES,
]);

export const memberModerationActions = pgTable(
  'member_moderation_actions',
  {
    // Per-row address of the decision record. Plain DB-defaulted random UUID — NOT a stream id
    // (the member's stream_id is the member_id).
    moderationActionId: uuid('moderation_action_id')
      .$type<ModerationActionId>()
      .primaryKey()
      .defaultRandom(),

    // Multi-tenant scope (RLS predicate column; branded).
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

    // The moderated member. FK → members keeps referential integrity; RTBF (Story 3.12) cascades.
    memberId: uuid('member_id')
      .$type<MemberId>()
      .notNull()
      .references(() => members.memberId, { onDelete: 'cascade' }),

    // What was done. NON-PII bounded vocabulary.
    action: moderationActionEnum('action').notNull(),

    // Why, as a registry CODE. NON-PII; this is the value that also rides the event payload.
    reasonCode: moderationReasonCodeEnum('reason_code').notNull(),

    // The mandatory free-text rationale, Tier-1 envelope ciphertext. NOT NULL: AC3 requires a
    // rationale on EVERY action, not only on an "other" code.
    rationaleCiphertext: piiColumn(1, 'member_moderation')('rationale_ciphertext').notNull(),

    // Who acted (the admin `users.user_id`) + their display-name SNAPSHOT at action time. No FK:
    // the attribution must survive a staff-record change, and the snapshot is the durable record.
    actorId: uuid('actor_id').notNull(),
    actorDisplay: text('actor_display').notNull(),

    // FR-56 → FR-6: when a rejoin under the same identity becomes permitted again (= acted_at + 12
    // months, clock-injected). NON-NULL for `terminate` and NULL otherwise — enforced by the
    // `member_moderation_actions_rejoin_iff_terminate` CHECK in migration 0091.
    rejoinPermittedAt: timestamp('rejoin_permitted_at', { withTimezone: true, mode: 'date' }),

    // When the action was taken (clock-injected at the handler; no raw Date.now()).
    actedAt: timestamp('acted_at', { withTimezone: true, mode: 'date' }).notNull(),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    // The one composite BOTH reads ride: the per-member history (newest-first) and the
    // Pariwar-wide moderated-members list (Decision 9).
    index('member_moderation_actions_pariwar_member_acted_idx').on(
      t.pariwarId,
      t.memberId,
      t.actedAt,
    ),
  ],
);

export type MemberModerationActionRow = typeof memberModerationActions.$inferSelect;
export type MemberModerationActionInsert = typeof memberModerationActions.$inferInsert;
