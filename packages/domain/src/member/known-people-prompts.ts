// The home PROMPTS — which reminder cards a member's home can show (Story 6.36c, Task 3.2; AC5; `-330` SW16 (2)–(5) as
// narrowed by `-342` calls 1–2; RV1, RV4, RV8).
//
// ONE read, ONE round of SQL, on the caller's scoped transaction. Two gates (RV1):
//   (i)  the WORKPLACE flags (`noWorkplace`, `hasWorkplace`, `suggestedWorkplace`) — for a member the posting route itself
//        serves: ⛔ in `MEMBER_POSTING_TERMINAL_STATES`. ⚠ This reads `members.state` (the projection) where the posting
//        route replays events — recorded. ⛔ A claim check (a confirm after the cut ⛔ steers who is asked — SW20, `-339`);
//   (ii) every PEOPLE-WHO-KNOW-ME flag (`canNamePeople`, `transferReview`, `replaceNeeded`, `campaign`) — ONLY for
//        `knownPeopleCallerSql` (`active` AND ⛔ named by a claim; `-333` call 1). ⛔ A bare `active` check (a claim-named
//        member would get a card whose screen answers 403).
// ⛔ No flag depends on whether OTHER members are at a workplace (SW16 (2) — ⛔ a disclosure). `replaceNeeded` is ONE
// boolean for a named person who left the Trust and one reported dead (`namedUnavailableSql` reads both the SAME) — ⛔ a
// name, ⛔ a count, ⛔ why. ONE clock per question: the DB's (`clock_timestamp()`, `IST_TODAY`).
//
// A read — ⛔ writes nothing. TENANT-scoped (RLS + the explicit `pariwar_id`).

import { sql } from 'drizzle-orm';

import type { Db } from '../db.js';
import { knownPeopleCampaignId, workplaceId as toWorkplaceId, workplaceRequestId as toWorkplaceRequestId } from '../ids/index.js';
import type { KnownPeopleCampaignId, MemberId, PariwarId, WorkplaceId, WorkplaceRequestId } from '../ids/index.js';
import { liveCampaignSql } from './known-people-campaigns.js';
import { KNOWN_PEOPLE_MAX_LIVE, knownPeopleCallerSql, liveKnownPersonSql, namedUnavailableSql } from './known-people.js';
import { MEMBER_POSTING_TERMINAL_STATES } from './posting.js';
import { staleSuggestionSql } from './workplace.js';

/** How long after a transfer the *"check the people who know you"* card shows. */
export const TRANSFER_REVIEW_DAYS = 30;

export interface KnownPeoplePrompts {
  readonly noWorkplace: boolean;
  readonly hasWorkplace: boolean;
  readonly suggestedWorkplace: {
    readonly requestId: WorkplaceRequestId;
    readonly workplaceId: WorkplaceId;
    readonly name: string;
    readonly district: string;
  } | null;
  readonly transferReview: boolean;
  readonly replaceNeeded: boolean;
  readonly canNamePeople: boolean;
  readonly campaign: { readonly campaignId: KnownPeopleCampaignId } | null;
}

const NONE: KnownPeoplePrompts = {
  noWorkplace: false,
  hasWorkplace: false,
  suggestedWorkplace: null,
  transferReview: false,
  replaceNeeded: false,
  canNamePeople: false,
  campaign: null,
};

/**
 * The member's prompts (AC5):
 *   · `noWorkplace` — the Pariwar HAS a list (RV8 — with ⛔ list the posting screen offers only the district) AND (⛔
 *     posting, or the latest names ⛔ workplace and is ⛔ a retirement — a district-only posting, an unconfirmed *"isn't
 *     listed"*);
 *   · `hasWorkplace` — the latest posting names a workplace (listed or since delisted);
 *   · `suggestedWorkplace` — the member's request in state `suggested` (at most one is open), with the workplace — ⛔ when
 *     the suggestion is STALE (`staleSuggestionSql`; code review round 2);
 *   · `canNamePeople` — the caller predicate itself;
 *   · `transferReview` — the latest posting names workplace W, the most recent EARLIER posting that names a workplace
 *     names a DIFFERENT one, and the latest was recorded within 30 days (⛔ after a retirement — it names ⛔ workplace; ⛔
 *     for a first confirmed *"isn't listed"* — there is ⛔ earlier workplace);
 *   · `replaceNeeded` — at least one ACCEPTED link that `namedUnavailableSql` marks;
 *   · `campaign` — a LIVE campaign AND `canNamePeople` AND a free slot AND ⛔ link asked since the campaign's start (the
 *     start of `starts_on`, IST) — RV4 (`-342` call 1). ⚠ A re-ask of a person with a live link writes ⛔ row, so it does ⛔
 *     end the card (recorded).
 * A member row ⛔ in this Pariwar ⇒ every flag false.
 */
export async function readKnownPeoplePrompts(db: Db, pariwarId: PariwarId, memberId: MemberId): Promise<KnownPeoplePrompts> {
  const terminal = sql.join(MEMBER_POSTING_TERMINAL_STATES.map((s) => sql`${s}`), sql`, `);
  const r = await db.execute<{
    posting_ok: boolean;
    caller: boolean;
    has_list: boolean;
    has_posting: boolean;
    latest_workplace_id: string | null;
    latest_is_retirement: boolean | null;
    latest_recent: boolean | null;
    previous_workplace_id: string | null;
    suggested_request_id: string | null;
    suggested_workplace_id: string | null;
    suggested_name: string | null;
    suggested_district: string | null;
    replace_needed: boolean;
    live_links: string | number;
    campaign_id: string | null;
    asked_since_campaign: boolean;
  }>(sql`
    WITH me AS (
      SELECT m.state NOT IN (${terminal}) AS posting_ok, ${knownPeopleCallerSql(sql`m`)} AS caller
        FROM members m WHERE m.pariwar_id = ${pariwarId} AND m.member_id = ${memberId}
    ),
    latest AS (
      SELECT p.posting_id, p.created_at, p.workplace_id, p.is_retirement
        FROM member_postings p WHERE p.pariwar_id = ${pariwarId} AND p.member_id = ${memberId}
       ORDER BY p.created_at DESC, p.posting_id DESC LIMIT 1
    ),
    previous AS (
      SELECT p.workplace_id
        FROM member_postings p, latest l
       WHERE p.pariwar_id = ${pariwarId} AND p.member_id = ${memberId} AND p.workplace_id IS NOT NULL
         AND (p.created_at, p.posting_id) < (l.created_at, l.posting_id)
       ORDER BY p.created_at DESC, p.posting_id DESC LIMIT 1
    ),
    suggestion AS (
      -- ⛔ A STALE suggestion (staleSuggestionSql — the ONE fragment the queue, suggest and the history also read; code
      -- review round 2): the member's "Yes" would answer stale, and the request reads as pending everywhere else.
      SELECT r.request_id, w.workplace_id, w.name, w.district
        FROM workplace_requests r
        JOIN workplaces w ON w.pariwar_id = r.pariwar_id AND w.workplace_id = r.suggested_workplace_id
       WHERE r.pariwar_id = ${pariwarId} AND r.member_id = ${memberId} AND r.state = 'suggested'
         AND NOT ${staleSuggestionSql(sql`r`)}
       ORDER BY r.created_at DESC, r.request_id DESC LIMIT 1
    ),
    campaign AS (
      SELECT c.campaign_id, (c.starts_on::timestamp AT TIME ZONE 'Asia/Kolkata') AS began_at
        FROM known_people_campaigns c
       WHERE c.pariwar_id = ${pariwarId} AND ${liveCampaignSql(sql`c`)}
       ORDER BY c.starts_on DESC, c.campaign_id LIMIT 1
    )
    SELECT me.posting_ok, me.caller,
      EXISTS (SELECT 1 FROM workplace_districts d WHERE d.pariwar_id = ${pariwarId}) AS has_list,
      EXISTS (SELECT 1 FROM latest) AS has_posting,
      (SELECT l.workplace_id FROM latest l) AS latest_workplace_id,
      (SELECT l.is_retirement FROM latest l) AS latest_is_retirement,
      (SELECT l.created_at > clock_timestamp() - make_interval(days => ${TRANSFER_REVIEW_DAYS}::int) FROM latest l) AS latest_recent,
      (SELECT pr.workplace_id FROM previous pr) AS previous_workplace_id,
      (SELECT s.request_id FROM suggestion s) AS suggested_request_id,
      (SELECT s.workplace_id FROM suggestion s) AS suggested_workplace_id,
      (SELECT s.name FROM suggestion s) AS suggested_name,
      (SELECT s.district FROM suggestion s) AS suggested_district,
      EXISTS (
        SELECT 1 FROM member_known_people k
          JOIN members nm ON nm.member_id = k.named_member_id AND nm.pariwar_id = k.pariwar_id
         WHERE k.pariwar_id = ${pariwarId} AND k.namer_member_id = ${memberId} AND k.state = 'accepted'
           AND ${namedUnavailableSql(sql`k`, sql`nm`)}
      ) AS replace_needed,
      (SELECT count(*) FROM member_known_people k
        WHERE k.pariwar_id = ${pariwarId} AND k.namer_member_id = ${memberId} AND ${liveKnownPersonSql(sql`k`)}) AS live_links,
      (SELECT ca.campaign_id FROM campaign ca) AS campaign_id,
      EXISTS (
        SELECT 1 FROM member_known_people k, campaign ca
         WHERE k.pariwar_id = ${pariwarId} AND k.namer_member_id = ${memberId} AND k.asked_at >= ca.began_at
      ) AS asked_since_campaign
      FROM me`);
  const row = r.rows[0];
  if (!row) return NONE;

  const postingOk = row.posting_ok === true;
  const caller = row.caller === true;
  const latestNamesWorkplace = row.latest_workplace_id !== null;
  const freeSlots = KNOWN_PEOPLE_MAX_LIVE - Number(row.live_links);
  return {
    noWorkplace: postingOk && row.has_list && (!row.has_posting || (!latestNamesWorkplace && row.latest_is_retirement === false)),
    hasWorkplace: postingOk && latestNamesWorkplace,
    suggestedWorkplace:
      postingOk && row.suggested_request_id !== null && row.suggested_workplace_id !== null && row.suggested_name !== null && row.suggested_district !== null
        ? {
            requestId: toWorkplaceRequestId(row.suggested_request_id),
            workplaceId: toWorkplaceId(row.suggested_workplace_id),
            name: row.suggested_name,
            district: row.suggested_district,
          }
        : null,
    canNamePeople: caller,
    transferReview:
      caller &&
      latestNamesWorkplace &&
      row.latest_recent === true &&
      row.previous_workplace_id !== null &&
      row.previous_workplace_id !== row.latest_workplace_id,
    replaceNeeded: caller && row.replace_needed === true,
    campaign:
      caller && row.campaign_id !== null && freeSlots > 0 && row.asked_since_campaign !== true
        ? { campaignId: knownPeopleCampaignId(row.campaign_id) }
        : null,
  };
}
