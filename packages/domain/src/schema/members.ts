// `members` table — Story 3.1 substrate (the member lifecycle anchor).
//
// The FIRST Epic-3 landing and a pure `[PRIMITIVE]`. This table is the member's
// lifecycle ANCHOR — NOT the member's profile. PII / KYC / nominee / payment /
// medical columns are downstream stories' to add (3.2–3.12). Story 3.1 commits
// ONLY the lifecycle-anchoring shape.
//
// ── members.state is a READ-OPTIMIZATION CACHE, not the source of truth ───────
// The source of truth for a member's lifecycle state is the member's `events_log`
// stream (stream_id = member_id) replayed through the pure reducer in
// `member/state.ts` (architecture §1.14 line 1231-1236). The persisted `state`
// column is a projection of that replay — written ONLY by the projector
// (`member/project.ts`) inside the same transaction that appends the transition
// event (cache-invalidation invariant, AC2). Two guards keep it honest:
//   · the DB trigger (migration, AC3) — rejects any UPDATE to `state` that is not
//     issued by the projector (session-variable `app.member_state_writer` guard,
//     mirroring the `app.pariwar_id` pattern);
//   · the CI gate (scripts/member-state-invariant, AC2) — static-scans
//     packages/domain/src and fails on any `.update(members).set({ state })`
//     outside the projector allowlist.
//
// ── member_id = the event-stream stream_id (no DB default) ────────────────────
// `member_id` IS the member's `events_log.stream_id` (one stream per member,
// architecture §1.14). It is minted by the signup flow (Story 3.6) and used as the
// stream_id of the first event (`member.signup_initiated`). It is therefore caller-
// supplied — NO `gen_random_uuid()` default — so a member row can never exist with
// an id that does not match its event stream. Branded `MemberId` (ids/index.ts).
//
// Naming discipline per architecture line 3663-3677: DB columns snake_case, TS
// fields camelCase. Table snake_case-plural. Header style mirrors consent_records.ts.

import { bigint, index, pgEnum, pgTable, smallint, timestamp, uuid } from 'drizzle-orm/pg-core';

import type { MemberId, PariwarId } from '../ids/index.js';

/**
 * The canonical member-lifecycle state list — the ONE spelling authority (AC1).
 *
 * Hyphenated everywhere (Story 3.1 Dev Notes "State naming"): the epic AC + PRD
 * FR-1 use hyphens throughout; the architecture §1.14 table's `active_in_grace` /
 * `lapsed_unpaid` underscores denote the SAME states — we freeze the hyphen form
 * because these strings are persisted (the pgEnum labels here AND `from_state` /
 * `to_state` in event payloads). Postgres treats enum labels as opaque strings, so
 * hyphens need no escaping.
 *
 * Both the pgEnum (DB CREATE TYPE) and the `MemberLifecycleState` TS union below
 * are DERIVED from this single tuple — there is no second list to drift.
 *
 *   · `pending-kyc`     — initial state on signup-form completion (PRD FR-1).
 *   · `pending-fee`     — KYC done (DigiLocker-verified or manual fallback), awaiting fee.
 *   · `pending-valid`   — lock-in elapsed but KYC still unverified (FR-2); awaits trustee.
 *   · `lock-in`         — fee paid; the lock-in clock is running (FR-3).
 *   · `active`          — fully active member.
 *   · `active-in-grace` — valid_through passed; inside the 90-day grace (FR-1A).
 *   · `lapsed-unpaid`   — grace elapsed unpaid (FR-1A); renewal restores to `active`.
 *   · `withdrawn`       — voluntary withdrawal completed (FR-6).
 *   · `anonymized`      — RTBF terminal (FR-96, Story 3.12).
 */
export const MEMBER_LIFECYCLE_STATES = [
  'pending-kyc',
  'pending-fee',
  'pending-valid',
  'lock-in',
  'active',
  'active-in-grace',
  'lapsed-unpaid',
  'withdrawn',
  'anonymized',
] as const;

/** pgEnum (`CREATE TYPE member_lifecycle_state`) derived from the one tuple. */
export const memberLifecycleStateEnum = pgEnum('member_lifecycle_state', MEMBER_LIFECYCLE_STATES);

/** The lifecycle-state literal union — derived from the same tuple (no drift). */
export type MemberLifecycleState = (typeof MEMBER_LIFECYCLE_STATES)[number];

export const members = pgTable(
  'members',
  {
    // The member's id AND its events_log stream_id (architecture §1.14). Caller-
    // supplied (the signup flow mints it); NO gen_random_uuid() default so a row
    // can never exist with an id that does not match an event stream. Branded.
    memberId: uuid('member_id').primaryKey().$type<MemberId>(),

    // Multi-tenant scope (architecture §1.2). RLS predicate column; branded.
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

    // The CACHED lifecycle state — a projection of the event-replay, NOT the source
    // of truth. Written ONLY by the projector (member/project.ts); guarded by the
    // DB trigger + the CI gate. No DB default: the projector writes the replayed
    // result explicitly (the first event projects to `pending-kyc`).
    state: memberLifecycleStateEnum('state').notNull(),

    // The `events_log.event_version` the cached `state` was projected from — the
    // staleness / idempotency anchor. `mode: 'number'` matches the events_log
    // precedent (without it Drizzle returns a JS BigInt that breaks numeric
    // comparison with the `number` that appendEvent / the projector produce).
    stateEventVersion: bigint('state_event_version', { mode: 'number' }).notNull(),

    // Story 3.6b (AC3 / R3) — the FR-8 lock-in-policy snapshot at join time, in days. A DERIVED
    // query optimization (Story 4.1's snapshot-resolution read-cache), NOT the source of truth: the
    // authoritative record is the `member.lock_in_entered` event payload's `lock_in_days_at_join`,
    // and this column is written from the SAME resolved value in the SAME scope-tx that emits the
    // event (so they cannot diverge at write time). Nullable — populated ONLY at lock-in entry;
    // pre-lock-in members carry NULL. Written by a plain in-scope-tx UPDATE: the 0018 state-writer
    // trigger fires only on `state` changes, so this non-`state` write needs no projector guard.
    lockInDaysAtJoin: smallint('lock_in_days_at_join').$type<number>(),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // Per-tenant member scans / RLS-aware planner hint (pariwar_id leads, mirroring
    // events_log_pariwar_*). Point lookups use the member_id PK.
    index('members_pariwar_id_idx').on(t.pariwarId),
  ],
);

// Inferred row types for the accessor read/write paths (consent_records precedent).
export type MemberRow = typeof members.$inferSelect;
export type MemberInsert = typeof members.$inferInsert;
