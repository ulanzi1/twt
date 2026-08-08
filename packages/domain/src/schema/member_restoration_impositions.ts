// `member_restoration_impositions` — the append-only restoration-discipline record (Story 10.23).
//
// ── This table is NOT the restoration status ─────────────────────────────────────────────────────
// The member's restoration standing is DERIVED by folding the `member.restoration_discipline.*`
// events on the member's own `events_log` stream (`member/restoration-discipline/overlay.ts`, AC1).
// There is deliberately NO mutable `status` / `current_state` column: it would be a second source of
// truth and would trip the architecture §1.14 event-derivation invariant. Expiry in particular is
// DERIVED AT READ from `expires_at` (AC4) — the absence of a status column is what makes it
// impossible for a stale row to claim a member is locked in after their lock-in elapsed.
//
// ── Why a table AT ALL, when Stories 10.25 and 10.26 both declined one (D1) ──────────────────────
// 10.25 was a pure derivation (no event, no table) because everything it needed already existed in
// the log. 10.26 added an event but no table. Neither reading fully applies here, for one reason:
// **version pinning is not derivable.** A restoration lock-in's `expires_at` depends on
// `lock_in_months` AS IT STOOD AT IMPOSITION, and under a pure derivation a Trustee Panel re-tune of
// that number would RETROACTIVELY MOVE EVERY EXISTING MEMBER'S UNLOCK DATE — precisely what FR-8
// exists to prevent (`prd.md:334`; `member/lock-in.ts:1-16`). So the imposition must be recorded.
//
// The EVENT is the authority and the replay source; this table is the INDEXED READ SURFACE for the
// per-member history and a Pariwar-wide list, and it carries the structural CHECK constraints.
// `member_moderation_actions` (Story 10.10) is the template it mirrors clause for clause.
//
// ── ⚠ NO PII, NO ACTOR, NO TIER-1 COLUMN — and that is a DESIGN COMMITMENT, not an omission (D5) ─
// The moderation table carries `rationale_ciphertext`, `actor_id` and `actor_display` because a
// HUMAN decided and had to explain themselves. Nothing decides here: §3.1 applies automatically, and
// **the clause id IS the reason**. So: no reason-code registry, no actor columns, no `piiColumn`, no
// KMS envelope, and — unlike `member_moderation_actions`, which needed migration 0092 to add an
// UPDATE leg for the DPDPA rationale scrub — **no RTBF scrub leg is possible or needed**, because
// there is no Tier-1 byte here to erase. Every column below is a registry identifier, a governance
// number, or an instant.
//
// APPEND-ONLY: the migration GRANTs SELECT + INSERT and NOT UPDATE/DELETE. An imposition is an
// immutable historical fact; expiry happens by the clock, never by mutating the row.
//
// TENANT-ISOLATED (RLS on `pariwar_id`; policies in
// `policies/member-restoration-impositions-rls.ts`). Unlike `member_moderation_actions` there is NO
// cross-tenant pre-scope read: nothing at signup consults restoration discipline, so `twt_service`
// gets SELECT only for the apps/jobs writer's own scoped reads.
//
// Naming discipline per architecture L3663-3677: DB columns snake_case, TS camelCase.

import { check, index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

import type { MemberId, PariwarId, RestorationImpositionId } from '../ids/index.js';
import { members } from './members.js';

export const memberRestorationImpositions = pgTable(
  'member_restoration_impositions',
  {
    // Per-row address of the imposition record. Plain DB-defaulted random UUID — NOT a stream id
    // (the member's stream_id is the member_id).
    restorationImpositionId: uuid('restoration_imposition_id')
      .$type<RestorationImpositionId>()
      .primaryKey()
      .defaultRandom(),

    // Multi-tenant scope (RLS predicate column; branded).
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

    // The member under restoration discipline. FK → members; RTBF (Story 3.12) cascades.
    memberId: uuid('member_id')
      .$type<MemberId>()
      .notNull()
      .references(() => members.memberId, { onDelete: 'cascade' }),

    // The R7 clause that imposed. **This is the reason** (D5). TEXT, not an enum: the ladder is
    // registry DATA, and a pgEnum here would put it in the schema and go stale the first time the
    // Trustee Panel adds a rung.
    clauseId: text('clause_id').notNull(),

    // ── The FR-8 PIN, BOTH HALVES (AC3, D2) ──────────────────────────────────────────────────────
    // The R7 clause version that supplied `lock_in_months` (the DURATION — §3.1 puts the months on
    // the rung), and the `niy.restoration-discipline.policy` version that supplied the INSTRUMENT
    // parameters (the month-counting convention + the concurrency rule). Two clauses, two distinct
    // jobs, both pinned — so amending either is a governance act with NO retroactive effect.
    // ⚠ Re-resolution at any later read MUST use `resolveByClauseVersionId`, never
    // `resolveByClauseId` — the latter returns the CURRENT version and would silently re-lock.
    clauseVersionId: uuid('clause_version_id').notNull(),
    policyClauseVersionId: uuid('policy_clause_version_id').notNull(),

    // The duration IN FORCE AT IMPOSITION, from the applied clause's `restoration.lock_in_months`.
    // ⚠ CHECK > 0 is load-bearing (D3): `imposesRestorationObligation` returns TRUE for R7(A), which
    // ships `lock_in_months: 0` — so a trigger reading only that predicate would impose a
    // ZERO-LENGTH lock-in on every R7(A) member. The constraint makes that unwritable at the DB.
    lockInMonths: integer('lock_in_months').notNull(),

    // The concurrency rule in force at imposition (AC5) — registry data, pinned like the duration.
    concurrencyRule: text('concurrency_rule').notNull(),

    // The unresolved EPISODE this imposition belongs to (AC2, Decision `2026-08-07-088` clause 3).
    // The ratified re-imposition bar keys on it: an expired imposition does not re-impose while the
    // SAME unresolved episode's completion condition stays unsatisfiable, but a genuinely NEW
    // episode imposes normally. See `write.ts` `episodeKeyOf` for what anchors it.
    episodeKey: text('episode_key').notNull(),

    // DB-authoritative imposition instant (architecture §1.11) — the writer reads `clock_timestamp()`,
    // never an app-server clock — and its calendar-correct expiry (AC4), computed by Postgres interval
    // arithmetic so a Jan-31 anchor clamps to Feb-28/29 rather than overflowing into March.
    imposedAt: timestamp('imposed_at', { withTimezone: true, mode: 'date' }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    // The one composite BOTH reads ride: the per-member history and the Pariwar-wide list (AC1).
    index('member_restoration_impositions_pariwar_member_imposed_idx').on(
      t.pariwarId,
      t.memberId,
      t.imposedAt,
    ),
    // A lock-in must have positive duration (D3 — no zero-length R7(A) imposition) …
    check('member_restoration_impositions_lock_in_months_positive', sql`${t.lockInMonths} > 0`),
    // … and must actually end AFTER it began. §3.1 prescribes a BOUNDED consequence; a row with
    // `expires_at <= imposed_at` would be an already-expired imposition, and one with a corrupted
    // far-future `expires_at` is what a permanent coverage removal looks like in this table.
    check('member_restoration_impositions_expires_after_imposed', sql`${t.expiresAt} > ${t.imposedAt}`),
    // … and the concurrency rule must be one this build actually knows how to combine (review
    // finding — `lock_in_months`/`expires_at` had structural backstops, this registry-data field did
    // not). Mirrors `RESTORATION_COMBINATION_RULES` (`status.ts`); a future Trustee-ratified rule
    // needs a migration widening this list in lockstep with `combineLiveExpiries`'s exhaustive
    // `switch` — the same coordinated update the switch already forces at compile time.
    check('member_restoration_impositions_concurrency_rule_known', sql`${t.concurrencyRule} IN ('max_over_live')`),
  ],
);

export type MemberRestorationImpositionRow = typeof memberRestorationImpositions.$inferSelect;
export type MemberRestorationImpositionInsert = typeof memberRestorationImpositions.$inferInsert;
