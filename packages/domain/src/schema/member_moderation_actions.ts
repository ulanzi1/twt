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

import { sql } from 'drizzle-orm';
import { index, integer, jsonb, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { piiColumn } from '../encryption/column.js';
import type { MemberId, ModerationActionId, PariwarId } from '../ids/index.js';
import type { EvidenceRef } from '../member/moderation/evidence-refs.js';
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

    // The mandatory governance-grade DECISION NOTE, Tier-1 envelope ciphertext. NOT NULL — required
    // on EVERY action, not only on an "other" code.
    // ⚠ Renamed from `rationale_ciphertext` by migration 0099 (Story 10.20). The old name described
    // a field asked to answer three questions at once; the record now separates them (see below).
    // Postgres tracks column privileges BY ATTRIBUTE, so 0092's `GRANT UPDATE` and its RLS UPDATE
    // policy followed the rename automatically — the RTBF scrub needed no re-grant.
    decisionNoteCiphertext: piiColumn(1, 'member_moderation')('decision_note_ciphertext').notNull(),

    // ── The two-part escalation justification (Niyamavali §8.6; Story 10.20 WS-C) ───────────────
    // TWO columns, never one. The two parts must be SEPARATELY ANSWERABLE and neither pre-filled
    // from the other; a single column (or a JSON blob) lets a UI concatenate them and satisfy a
    // presence check with one paragraph. THE RECORD'S SHAPE IS THE ENFORCEMENT — the route guard
    // and the UI guard are the second and third layers, not the first.
    //   (a) why suspension is INADEQUATE   (b) why termination is PROPORTIONATE
    // Both are NOT NULL iff `action = 'terminate'`, enforced by the
    // `member_moderation_actions_escalation_iff_terminate` CHECK (added NOT VALID in 0099 — the
    // table was already populated with `terminate` rows; see that migration's header).
    // Tier-1: admin-authored prose about what a member allegedly did.
    escalationInadequacyCiphertext: piiColumn(
      1,
      'member_moderation',
    )('escalation_inadequacy_ciphertext'),
    escalationProportionalityCiphertext: piiColumn(
      1,
      'member_moderation',
    )('escalation_proportionality_ciphertext'),

    // The recorded reason for invoking the IMMEDIATE-TERMINATION exception (Decision
    // `2026-08-12-099` Q4.1). The Panel preserved an immediate path past the 7-day dwell, on
    // condition that the authorised actor records WHY the exception applies.
    // ⛔ This is a SEPARATE field from both escalation parts and must never be folded into either:
    // they answer WHY TERMINATION, this answers WHY NOW. NULL on the ordinary path, non-NULL exactly
    // when the exception was invoked — which is what makes "how often is the exception used?"
    // answerable, and is the point of recording it. Tier-1.
    immediateTerminationReasonCiphertext: piiColumn(
      1,
      'member_moderation',
    )('immediate_termination_reason_ciphertext'),

    // Evidence REFERENCES — never free text (§Story 10.20 AC4). Each entry is `{ kind, ref }` with a
    // bounded `kind` and a restricted-charset `ref`; the DB backstops array-ness, the cardinality
    // cap AND the per-entry shape (the last via the `moderation_evidence_refs_valid` IMMUTABLE
    // function, because an inline subquery or set-returning function in a CHECK is a hard error).
    // ⛔ NON-PII BY CONSTRUCTION: a reference is an identifier, not prose. That is precisely why the
    // shape is enforced at the DB — the constraint is what keeps this column out of Tier-1.
    // ⛔ No query filters or sorts on this column: JSONB `->>` yields TEXT and mis-compares.
    evidenceRefs: jsonb('evidence_refs')
      .$type<EvidenceRef[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),

    // ── The two ruling-dependent NON-PII columns (Decision `2026-08-12-099`) ────────────────────
    // Q5(a): the as-of-decision snapshot of `contribution.r7a_restorations_used`, so a later
    // reviewer can test an exhaustion assertion against the data that existed THEN rather than
    // re-deriving it against a moved projection.
    // ⛔ NULL IS A FIRST-CLASS VALUE MEANING *UNKNOWN*, NEVER 0. R7(A) resolves to no clause version
    // on an unprovisioned Pariwar and the fact is then OMITTED — recording 0 there would let
    // "restorations exhausted" read as "never restored".
    r7aRestorationsUsedSnapshot: integer('r7a_restorations_used_snapshot'),

    // Q4.4: the version of the dwell policy clause that governed this decision. The Trust runs
    // versioned per-Pariwar rules (FR-7); without this pin a later policy change cannot be read off
    // a historical decision. ⛔ The duration itself is NEVER hard-coded in the service.
    dwellPolicyVersion: text('dwell_policy_version'),

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
