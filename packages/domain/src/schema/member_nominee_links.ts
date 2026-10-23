// `member_nominee_links` — the NOMINEE MEMBER LINK: which member account a declarer marked as one of their nominees (Story
// 6.36e, migration 0181; `2026-10-24-397` NE1; `2026-10-24-396` Q1 A — recorded *"only to keep them out of the five"*).
//
// ONE row per link, hung off the nominee VERSION that declared it (`member_nominee_versions` — ⛔ the `member_nominees`
// projection, which a declare rewrites DELETE-then-INSERT). Member ids only — ⛔ no number, ⛔ no name. TWO axes (V1):
//   · `answer` (`confirmed | not_me`, NULL until the marked member answers) + `responded_at` — written ONCE;
//   · `state` (`live → ended | erased`) + `ended_at` + `end_reason` — written ONCE.
// A re-save that keeps a mark CARRIES it: a new row on the new version copying the nominee, `found_by`, `asked_at` and the
// answer, with `carried_from_link_id` → the old row (which ends `redeclared`). 0181's guard refuses every other change; its
// BEFORE INSERT check pins the version to a `declared` one of the same rank, declarer and Pariwar.
// RLS in `policies/member-nominee-links-rls.ts`.

import { sql } from 'drizzle-orm';
import { type AnyPgColumn, index, pgTable, smallint, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import type { MemberId, NomineeLinkId, NomineeVersionId, PariwarId } from '../ids/index.js';
import { memberNomineeVersions } from './member_nominee_versions.js';
import { members } from './members.js';

/** How the declarer found the marked member (NE3 / NE5). ⚠ LOCKSTEP with 0181's `found_by` CHECK. */
export const NOMINEE_LINK_FOUND_BY = ['contacts', 'picker', 'typed'] as const;
export type NomineeLinkFoundBy = (typeof NOMINEE_LINK_FOUND_BY)[number];

/** A link's state. ⚠ LOCKSTEP with 0181's `state` CHECK and its guard (`live → ended | erased` only). */
export const NOMINEE_LINK_STATES = ['live', 'ended', 'erased'] as const;
export type NomineeLinkState = (typeof NOMINEE_LINK_STATES)[number];

/** The marked member's answer (NE6). ⚠ LOCKSTEP with 0181's `answer` CHECK. */
export const NOMINEE_LINK_ANSWERS = ['confirmed', 'not_me'] as const;
export type NomineeLinkAnswer = (typeof NOMINEE_LINK_ANSWERS)[number];

/** Why a link ended (NE2 / NE10). ⚠ LOCKSTEP with 0181's `end_reason` CHECK. */
export const NOMINEE_LINK_END_REASONS = ['redeclared', 'removed_by_declarer', 'erased'] as const;
export type NomineeLinkEndReason = (typeof NOMINEE_LINK_END_REASONS)[number];

export const memberNomineeLinks = pgTable(
  'member_nominee_links',
  {
    linkId: uuid('link_id').defaultRandom().primaryKey().$type<NomineeLinkId>(),
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),
    /** The member who declared the nominee. FK single-column (6.36a SF14). */
    declarerMemberId: uuid('declarer_member_id')
      .notNull()
      .$type<MemberId>()
      .references(() => members.memberId, { onDelete: 'cascade' }),
    /** The version the link hangs off — NO ACTION (TR3: the members cascade deletes both; ⛔ SET NULL). */
    versionId: uuid('version_id')
      .notNull()
      .$type<NomineeVersionId>()
      .references(() => memberNomineeVersions.versionId),
    rank: smallint('rank').notNull(),
    /** The marked member. */
    nomineeMemberId: uuid('nominee_member_id')
      .notNull()
      .$type<MemberId>()
      .references(() => members.memberId, { onDelete: 'cascade' }),
    foundBy: text('found_by').notNull().$type<NomineeLinkFoundBy>(),
    /** The row this one carried forward (a re-save that kept the mark), else NULL. */
    carriedFromLinkId: uuid('carried_from_link_id')
      .$type<NomineeLinkId>()
      .references((): AnyPgColumn => memberNomineeLinks.linkId),
    state: text('state').notNull().default('live').$type<NomineeLinkState>(),
    answer: text('answer').$type<NomineeLinkAnswer>(),
    /** ⛔ default — a new link takes the declare's `recordedAt`; a carried link COPIES the old row's. */
    askedAt: timestamp('asked_at', { withTimezone: true, mode: 'date' }).notNull(),
    respondedAt: timestamp('responded_at', { withTimezone: true, mode: 'date' }),
    endedAt: timestamp('ended_at', { withTimezone: true, mode: 'date' }),
    endReason: text('end_reason').$type<NomineeLinkEndReason>(),
  },
  (t) => [
    uniqueIndex('member_nominee_links_live_uq').on(t.versionId).where(sql`state = 'live'`),
    index('member_nominee_links_declarer_idx').on(t.pariwarId, t.declarerMemberId),
    index('member_nominee_links_nominee_idx').on(t.pariwarId, t.nomineeMemberId),
    index('member_nominee_links_version_idx').on(t.versionId),
  ],
);

export type MemberNomineeLinkRow = typeof memberNomineeLinks.$inferSelect;
export type MemberNomineeLinkInsert = typeof memberNomineeLinks.$inferInsert;
