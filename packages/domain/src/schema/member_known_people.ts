// `member_known_people` — PEOPLE WHO KNOW ME: the up-to-three members a member names (Story 6.36b, migration 0162;
// 6.36a SW10 / SW17, I6; `-310` CF4 A (2): *"up to three members the member themselves named … each of whom agreed when
// named"*).
//
// ONE row per (namer, named) LINK. Member ids only — ⛔ no number, ⛔ no name (I4); how the person was found (`found_by`)
// is the only other fact. A link moves FORWARD only (0162's guard): `asked → accepted | declined | lapsed | removed |
// erased`, `accepted → removed | withdrawn | erased`; every other state is final; ⛔ no identity column ever changes.
// LIVE = `asked` (within 30 days of `asked_at`) or `accepted`; at most THREE live per namer — the writer counts under the
// namer's advisory lock (`member_known_people_lock_namer`), and 0162's BEFORE INSERT backstop takes the SAME lock and
// counts again. Every end records `ended_at` (6.36 reads links AS OF a date); a lapse is dated `asked_at + 30 days`.
// RLS in `policies/member-known-people-rls.ts`.

import { sql } from 'drizzle-orm';
import { index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import type { KnownPersonLinkId, MemberId, PariwarId } from '../ids/index.js';
import { members } from './members.js';

/** How the named person was found (SW11 / SW13). ⚠ LOCKSTEP with 0162's `found_by` CHECK. */
export const KNOWN_PEOPLE_FOUND_BY = ['contacts', 'picker', 'typed'] as const;
export type KnownPeopleFoundBy = (typeof KNOWN_PEOPLE_FOUND_BY)[number];

/** A link's state. ⚠ LOCKSTEP with 0162's `state` CHECK and its guard's transitions. */
export const KNOWN_PEOPLE_LINK_STATES = ['asked', 'accepted', 'declined', 'lapsed', 'removed', 'withdrawn', 'erased'] as const;
export type KnownPeopleLinkState = (typeof KNOWN_PEOPLE_LINK_STATES)[number];

/** The LIVE states — the partial UNIQUE's and the backstop's set. */
export const KNOWN_PEOPLE_LIVE_STATES = ['asked', 'accepted'] as const satisfies readonly KnownPeopleLinkState[];

export const memberKnownPeople = pgTable(
  'member_known_people',
  {
    linkId: uuid('link_id').defaultRandom().primaryKey().$type<KnownPersonLinkId>(),
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),
    /** The member who named. FK single-column (6.36a SF14). */
    namerMemberId: uuid('namer_member_id')
      .notNull()
      .$type<MemberId>()
      .references(() => members.memberId, { onDelete: 'cascade' }),
    /** The member named. */
    namedMemberId: uuid('named_member_id')
      .notNull()
      .$type<MemberId>()
      .references(() => members.memberId, { onDelete: 'cascade' }),
    foundBy: text('found_by').notNull().$type<KnownPeopleFoundBy>(),
    state: text('state').notNull().default('asked').$type<KnownPeopleLinkState>(),
    askedAt: timestamp('asked_at', { withTimezone: true, mode: 'date' }).notNull().default(sql`clock_timestamp()`),
    /** The named member's answer (`accepted` / `declined`); kept through a later withdrawal. Written once. */
    respondedAt: timestamp('responded_at', { withTimezone: true, mode: 'date' }),
    /** When the link ended (every end; a lapse = `asked_at + 30 days`). Written once. */
    endedAt: timestamp('ended_at', { withTimezone: true, mode: 'date' }),
  },
  (t) => [
    uniqueIndex('member_known_people_live_uq')
      .on(t.pariwarId, t.namerMemberId, t.namedMemberId)
      .where(sql`state IN ('asked', 'accepted')`),
    index('member_known_people_namer_idx').on(t.pariwarId, t.namerMemberId),
    index('member_known_people_named_idx').on(t.pariwarId, t.namedMemberId),
  ],
);

export type MemberKnownPersonRow = typeof memberKnownPeople.$inferSelect;
export type MemberKnownPersonInsert = typeof memberKnownPeople.$inferInsert;
