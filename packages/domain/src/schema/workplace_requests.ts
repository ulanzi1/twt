// `workplace_requests` — *"My workplace isn't listed"* (Story 6.36a, Task 1.3; migration 0161; `2026-10-14-330` SW9).
//
// · The member types the workplace's name (≤ 120) and, optionally, its village or block (≤ 120) under the district picked,
//   with the date they started there (the confirmation reuses it). ⛔ A run of seven digits (a phone number) — the writer
//   folds Devanagari and other non-ASCII digits to ASCII FIRST (`member/workplace.ts`). Until confirmed, the member has ⛔
//   no workplace for selection.
// · 6.36c: a Pariwar Admin SUGGESTS a listed workplace IN THE REQUEST'S DISTRICT; the MEMBER confirms (*"Yes"* — the
//   request becomes `confirmed`, then a NEW posting names the workplace) or declines (*"No"* — back to `pending`). A Pariwar
//   Admin ⛔ never creates a workplace and ⛔ never sets one (I2).
// · Every posting write ends the member's older OPEN request (`withdrawn`) — except the request being confirmed and the
//   posting's own request.
// · THE GUARD (0161): created `pending`; `pending → suggested | withdrawn | closed`, `suggested → confirmed | pending |
//   withdrawn | closed`; the rest FINAL; the identity columns never change — EXCEPT the ERASURE ARM (the typed text → NULL
//   in ANY state, alone or with an open request's move to `closed` — AC9) and the RENAME ARM (`district` alone, on an
//   open request — Task 1.1b). ⛔ No CHECK requires the typed text.
// · The typed text is member-authored and NEVER in an event, an audit line or a log.
// RLS in `policies/workplaces-rls.ts`.

import { date, foreignKey, index, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

import type { MemberId, PariwarId, WorkplaceId, WorkplaceRequestId } from '../ids/index.js';
import { members } from './members.js';
import { workplaceDistricts } from './workplace_districts.js';
import { workplaces } from './workplaces.js';

/** ⚠ LOCKSTEP with 0161's `workplace_requests_state_check` and its guard. */
export const WORKPLACE_REQUEST_STATES = ['pending', 'suggested', 'confirmed', 'withdrawn', 'closed'] as const;
export type WorkplaceRequestState = (typeof WORKPLACE_REQUEST_STATES)[number];

/** The OPEN states — a request a later posting withdraws, and the erasure scrub closes. */
export const WORKPLACE_REQUEST_OPEN_STATES = ['pending', 'suggested'] as const satisfies readonly WorkplaceRequestState[];

export const workplaceRequests = pgTable(
  'workplace_requests',
  {
    requestId: uuid('request_id').defaultRandom().primaryKey().$type<WorkplaceRequestId>(),
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),
    /** SINGLE-COLUMN member FK (SF14). */
    memberId: uuid('member_id')
      .$type<MemberId>()
      .notNull()
      .references(() => members.memberId, { onDelete: 'cascade' }),
    /** The district picked (a LISTED spelling when written — FK → `workplace_districts`). */
    district: text('district').notNull(),
    /** Member-authored; NULLed by the erasure scrub (AC9). ⛔ Never in an event, audit line or log. */
    typedName: text('typed_name'),
    typedPlace: text('typed_place'),
    /** The start date the member gave (`YYYY-MM-DD`) — the confirmation's posting reuses it. */
    startedOn: date('started_on', { mode: 'string' }).notNull(),
    state: text('state').notNull().default('pending').$type<WorkplaceRequestState>(),
    suggestedWorkplaceId: uuid('suggested_workplace_id').$type<WorkplaceId>(),
    suggestedByActorId: uuid('suggested_by_actor_id'),
    suggestedAt: timestamp('suggested_at', { withTimezone: true, mode: 'date' }),
    /** Set when the request becomes `confirmed`, `withdrawn` or `closed` (0161's ⇔ CHECK). */
    resolvedAt: timestamp('resolved_at', { withTimezone: true, mode: 'date' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    unique('workplace_requests_pariwar_request_uq').on(t.pariwarId, t.requestId),
    foreignKey({
      name: 'workplace_requests_district_fk',
      columns: [t.pariwarId, t.district],
      foreignColumns: [workplaceDistricts.pariwarId, workplaceDistricts.district],
    }),
    foreignKey({
      name: 'workplace_requests_suggested_workplace_fk',
      columns: [t.pariwarId, t.suggestedWorkplaceId],
      foreignColumns: [workplaces.pariwarId, workplaces.workplaceId],
    }),
    index('workplace_requests_pariwar_member_idx').on(t.pariwarId, t.memberId),
    index('workplace_requests_open_idx').on(t.pariwarId, t.district).where(sql`state IN ('pending', 'suggested')`),
  ],
);

export type WorkplaceRequestRow = typeof workplaceRequests.$inferSelect;
