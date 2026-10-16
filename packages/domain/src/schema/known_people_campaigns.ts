// `known_people_campaigns` — a Pariwar Admin's short campaign asking members to name the people who know them (Story 6.36c,
// Task 1.1; migration 0164; `-307` §2 item 4, `-330` SW16 (5) as narrowed by `-342` call 1).
//
// · An IST date window (`starts_on` … `ends_on`, at most 30 days INCLUSIVE — RV6). LIVE ⇔ ⛔ ended AND `starts_on <= today
//   <= ends_on` (IST); OPEN ⇔ ⛔ ended AND `ends_on >= today` (live OR scheduled). ⛔ Two OPEN campaigns of one Pariwar
//   overlap — the writer's Pariwar advisory lock, then the overlap read (`member/known-people-campaigns.ts`).
// · A campaign SHOWS a home card in the app (`readKnownPeoplePrompts`) and sends ⛔ nothing to any phone.
// · ⛔ Never deleted; the only change is the end (`ended_at` + `ended_by_actor_id`, together — a CHECK).
// RLS in `policies/known-people-campaigns-rls.ts`.

import { date, index, pgTable, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

import type { KnownPeopleCampaignId, PariwarId } from '../ids/index.js';

export const knownPeopleCampaigns = pgTable(
  'known_people_campaigns',
  {
    campaignId: uuid('campaign_id').defaultRandom().primaryKey().$type<KnownPeopleCampaignId>(),
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),
    startedByActorId: uuid('started_by_actor_id').notNull(),
    /** IST dates (`YYYY-MM-DD`). */
    startsOn: date('starts_on', { mode: 'string' }).notNull(),
    endsOn: date('ends_on', { mode: 'string' }).notNull(),
    endedAt: timestamp('ended_at', { withTimezone: true, mode: 'date' }),
    endedByActorId: uuid('ended_by_actor_id'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    unique('known_people_campaigns_pariwar_campaign_uq').on(t.pariwarId, t.campaignId),
    // The list's actual sort (`listCampaigns`: `created_at DESC, campaign_id DESC`). Migration 0165 (code review round 2)
    // drops 0164's `known_people_campaigns_pariwar_ends_on_idx` (`ends_on DESC`, which did not match it) and creates this.
    index('known_people_campaigns_pariwar_created_idx').on(t.pariwarId, t.createdAt.desc(), t.campaignId.desc()),
  ],
);

export type KnownPeopleCampaignRow = typeof knownPeopleCampaigns.$inferSelect;
