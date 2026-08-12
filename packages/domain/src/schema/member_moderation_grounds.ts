// `member_moderation_grounds` — the APPEND-ONLY grounds attached to a moderation decision
// (Story 10.20, Task 4; WS-E, AC9).
//
// ── What this table is for ──────────────────────────────────────────────────────────────────────
// A moderation decision has one PRIMARY ground (the code the action was taken on) and may acquire
// SUPPORTING grounds as an investigation develops. Before this table, a later finding had nowhere
// to go: it either rewrote the original rationale — destroying the record of what was known WHEN
// the decision was made — or it was not recorded at all. Grounds are therefore APPENDED. A later
// finding ATTACHES to the original action; it never alters it.
//
// ⛔ NEVER `UPDATE`d, NEVER `DELETE`d. The grant posture is `SELECT, INSERT` plus ONE column-level
// `UPDATE ("note_ciphertext")` that exists SOLELY for the DPDPA-RTBF scrub — the migration-0092
// pattern, applied at birth this time rather than as a follow-up (see 0099's premise-#4 header).
//
// ── The primary ground is IMMUTABLE BY CONSTRUCTION, and that is deliberate ─────────────────────
// `member_moderation_grounds_one_primary_idx` is a PARTIAL UNIQUE index on `(moderation_action_id)
// WHERE is_primary`. Combined with the SELECT/INSERT-only grant this makes the primary structurally
// unmovable: a second `is_primary` row raises `23505`, and clearing the existing row's flag would
// be an `UPDATE` that no grant permits. So `epics.md` WS-E's "added, superseded, or corrected" is
// satisfied FOR SUPPORTING GROUNDS; for the primary the answer is that it NEVER MOVES AT ALL.
// ⇒ "at most one primary" is the DB's job; "at least one" is the writer's.
// ⚠ The partial index is the BACKSTOP, not the interface: a request that would produce a second
// primary must be a TYPED 409 from the route. A `23505` leaking to a caller as a 500 is a bug —
// "the primary ground is fixed at the action" is a fact a trustee must be able to read off the error.
//
// ── Why `member_id` is DENORMALIZED here (AC9/AC11) ─────────────────────────────────────────────
// Every scrub in `anonymize.ts` is `.where(eq(<table>.memberId, memberId))` — an erasure request
// carries a member id and nothing else. A table reachable only through `moderation_action_id` would
// make "every ground note for this member" unexpressible in the shape every other scrub uses,
// forcing a correlated subquery inside an UPDATE or a two-step read-then-write, in the one code
// path where a miss leaves PII behind an erasure request. This is the SAME denormalization
// `pariwar_id` already takes for RLS, for the same reason: THE ROW MUST BE FINDABLE BY THE AXIS ITS
// GUARD QUERIES ON. It is not a second source of truth — it is written in the action's own
// transaction from the action's own `member_id`, and a live-DB test asserts the pair agrees.
//
// ── PII discipline (R1) ─────────────────────────────────────────────────────────────────────────
//   · code / is_primary       → NON-PII bounded governance vocabulary. Safe in audit context.
//   · note_ciphertext         → Tier-1 envelope ciphertext, OPTIONAL. Never logged, never in a list
//     DTO, never in an event payload (`events_log.payload` is plaintext JSONB).
//   · evidence_refs           → NON-PII BY CONSTRUCTION — identifiers, not prose, enforced by three
//     CHECKs (see `evidence-refs.ts`). If that shape check is ever weakened, this classification
//     must be revisited in the SAME change.
//   · added_by_display        → controlled STAFF data, snapshotted at append time so a later rename
//     cannot rewrite history ([[project_admin_display_name_attribution]]).
//
// Naming discipline per architecture L3663-3677: DB columns snake_case, TS camelCase.

import { sql } from 'drizzle-orm';
import { boolean, index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { piiColumn } from '../encryption/column.js';
import type { MemberId, ModerationActionId, ModerationGroundId, PariwarId } from '../ids/index.js';
import type { EvidenceRef } from '../member/moderation/evidence-refs.js';
import { memberModerationActions, moderationReasonCodeEnum } from './member_moderation_actions.js';
import { members } from './members.js';

export const memberModerationGrounds = pgTable(
  'member_moderation_grounds',
  {
    // Per-row address of the ground. Plain DB-defaulted random UUID — NOT a stream id (the
    // `ground-appended` event rides the MEMBER's stream, keyed by `member_id`).
    groundId: uuid('ground_id').$type<ModerationGroundId>().primaryKey().defaultRandom(),

    // The decision this ground belongs to. Cascade mirrors the action's own FK to `members`.
    moderationActionId: uuid('moderation_action_id')
      .$type<ModerationActionId>()
      .notNull()
      .references(() => memberModerationActions.moderationActionId, { onDelete: 'cascade' }),

    // Multi-tenant scope (RLS predicate column; branded).
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

    // Denormalized from the action, for the RTBF scrub — see the header. NOT a second source of
    // truth: same transaction, same value, both rows append-only.
    memberId: uuid('member_id')
      .$type<MemberId>()
      .notNull()
      .references(() => members.memberId, { onDelete: 'cascade' }),

    // The ground itself, from the frozen registry vocabulary. For the PRIMARY row this equals
    // `member_moderation_actions.reason_code` — a deliberate denormalization (D3) guarded by a
    // live-DB equivalence test. That guard is stronger than the one it is modelled on: BOTH sides
    // are append-only, so neither can ever be rewritten.
    code: moderationReasonCodeEnum('code').notNull(),

    // Exactly one per action, enforced by the partial unique index below. Defaults false so an
    // append is supporting unless it says otherwise — the safe default.
    isPrimary: boolean('is_primary').notNull().default(false),

    // Optional Tier-1 note explaining the ground. The ONE column this table grants UPDATE on, and
    // only so the RTBF scrub can reach it (AC11).
    noteCiphertext: piiColumn(1, 'member_moderation')('note_ciphertext'),

    // Evidence REFERENCES — never free text. Same three CHECKs as the action's own column.
    evidenceRefs: jsonb('evidence_refs')
      .$type<EvidenceRef[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),

    // Set when this row SUPERSEDES an earlier SUPPORTING ground. Nullable self-reference: the
    // superseded row is retained and still returned by the read — an audit trail that hides what it
    // replaced is not an audit trail. ⛔ Never points at a primary row (structurally impossible;
    // additionally guarded by `member_moderation_grounds_primary_never_supersedes`).
    supersedesGroundId: uuid('supersedes_ground_id').$type<ModerationGroundId>(),

    // Who appended it + their display-name SNAPSHOT at append time. No FK: the attribution must
    // survive a staff-record change, and the snapshot is the durable record.
    addedBy: uuid('added_by').notNull(),
    addedByDisplay: text('added_by_display').notNull(),

    // When it was appended (clock-injected at the handler; no raw Date.now()).
    addedAt: timestamp('added_at', { withTimezone: true, mode: 'date' }).notNull(),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    // AT MOST ONE primary per action — the structural half of AC9. See the header for why this and
    // the grant posture together make the primary immutable.
    uniqueIndex('member_moderation_grounds_one_primary_idx')
      .on(t.moderationActionId)
      .where(sql`${t.isPrimary}`),
    // The per-action fold the console renders.
    index('member_moderation_grounds_action_added_idx').on(t.moderationActionId, t.addedAt),
    // The axis the RTBF scrub and the per-member history query on (see the header).
    index('member_moderation_grounds_pariwar_member_idx').on(t.pariwarId, t.memberId),
  ],
);

export type MemberModerationGroundRow = typeof memberModerationGrounds.$inferSelect;
export type MemberModerationGroundInsert = typeof memberModerationGrounds.$inferInsert;
