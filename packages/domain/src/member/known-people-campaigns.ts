// A Pariwar Admin's people-who-know-me CAMPAIGN (Story 6.36c, Task 3.3; AC7; `-307` §2 item 4, `-330` SW16 (5) as narrowed
// by `-342` call 1).
//
// A campaign is an IST date window of at most 30 days INCLUSIVE (RV6). While it is LIVE, a member who can name people, has
// a free slot and has asked ⛔ nobody since it began sees ONE home card (`known-people-prompts.ts`). It sends ⛔ nothing to
// any phone — ⛔ an SMS, ⛔ a push, ⛔ a WhatsApp — and this module imports ⛔ `@twt/channels` (a test scans it).
//
//   · LIVE ⇔ ⛔ ended AND `starts_on <= today <= ends_on`; OPEN ⇔ ⛔ ended AND `ends_on >= today` (live OR scheduled). ONE
//     clock: the DB's IST day (`IST_TODAY`) — the prompts read the same one.
//   · ⛔ Two OPEN campaigns of one Pariwar whose windows overlap: `startCampaign` takes the Pariwar's advisory lock FIRST and
//     reads the overlap under it (two concurrent starts serialise; the second sees the first).
//   · `/end` ends any OPEN campaign — a scheduled one is cancelled before it starts.
//
// TENANT-scoped: every statement runs on the caller's scoped `db` and names `pariwar_id`. NO HTTP, NO audit — the route
// orchestrates (the audit line is post-commit).

import { sql, type SQL } from 'drizzle-orm';

import type { Db } from '../db.js';
import { knownPeopleCampaignId, type KnownPeopleCampaignId, type PariwarId } from '../ids/index.js';
import { clampLimit } from '../pagination.js';
import { IST_TODAY } from './known-people.js';
import {
  decodeWorkplaceCursor as decodeCursor,
  encodeWorkplaceCursor as encodeCursor,
  isCalendarDate,
  isTimestampCursor,
  isWorkplaceUuid as isUuid,
  WorkplaceCursorInvalidError,
} from './workplace.js';

/** The longest campaign's SPAN: 29 days ⇒ 30 calendar days INCLUSIVE (`ends_on - starts_on <= 29` — 0164's CHECK). */
export const KNOWN_PEOPLE_CAMPAIGN_MAX_SPAN_DAYS = 29;
/** One page of the Pariwar Admin's campaign list. */
export const KNOWN_PEOPLE_CAMPAIGN_LIST_LIMIT = { default: 20, cap: 50 } as const;

/**
 * The campaign writes' refusals. ⚠ `not_live` is historical: it means ⛔ OPEN (`/end` also ends a scheduled campaign).
 * ⚠ LOCKSTEP with the contracts' mirror.
 */
export const KNOWN_PEOPLE_CAMPAIGN_REFUSAL_CODES = [
  'known_people_campaign.window_invalid',
  'known_people_campaign.overlap',
  'known_people_campaign.not_live',
  'known_people_campaign.not_found',
] as const;
export type KnownPeopleCampaignRefusalCode = (typeof KNOWN_PEOPLE_CAMPAIGN_REFUSAL_CODES)[number];

export class KnownPeopleCampaignRefusedError extends Error {
  public constructor(public readonly code: KnownPeopleCampaignRefusalCode) {
    super(`[known-people-campaign] refused: ${code}`);
    this.name = 'KnownPeopleCampaignRefusedError';
  }
}

/** A campaign row (`c`) that is LIVE today (IST, the DB's clock). ONE definition — the prompts read it. */
export function liveCampaignSql(c: SQL): SQL {
  return sql`(${c}.ended_at IS NULL AND ${c}.starts_on <= ${IST_TODAY} AND ${IST_TODAY} <= ${c}.ends_on)`;
}

/** A campaign row (`c`) that is OPEN — live, or scheduled to start. */
function openCampaignSql(c: SQL): SQL {
  return sql`(${c}.ended_at IS NULL AND ${c}.ends_on >= ${IST_TODAY})`;
}

/** What the list shows per campaign. `ended` = ended by an admin (before or during it); `finished` = its window passed. */
export type KnownPeopleCampaignStatus = 'scheduled' | 'live' | 'finished' | 'ended';

export interface KnownPeopleCampaign {
  readonly campaignId: KnownPeopleCampaignId;
  readonly startsOn: string;
  readonly endsOn: string;
  readonly status: KnownPeopleCampaignStatus;
  readonly endedAt: Date | null;
  /** UTC ISO with µs (a cursor part). */
  readonly createdAt: string;
}

type CampaignRow = {
  campaign_id: string;
  starts_on: string;
  ends_on: string;
  ended_at: Date | string | null;
  created_at: string;
  status: KnownPeopleCampaignStatus;
};

const STATUS_SQL = sql`CASE
  WHEN c.ended_at IS NOT NULL THEN 'ended'
  WHEN c.ends_on < ${IST_TODAY} THEN 'finished'
  WHEN c.starts_on > ${IST_TODAY} THEN 'scheduled'
  ELSE 'live' END`;

const ROW_COLUMNS = sql`c.campaign_id, to_char(c.starts_on, 'YYYY-MM-DD') AS starts_on, to_char(c.ends_on, 'YYYY-MM-DD') AS ends_on,
  c.ended_at, to_char(c.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS created_at, ${STATUS_SQL} AS status`;

function toCampaign(r: CampaignRow): KnownPeopleCampaign {
  return {
    campaignId: knownPeopleCampaignId(r.campaign_id),
    startsOn: r.starts_on,
    endsOn: r.ends_on,
    status: r.status,
    endedAt: r.ended_at === null ? null : new Date(r.ended_at),
    createdAt: r.created_at,
  };
}

/** Whole days from `a` to `b` (both `YYYY-MM-DD`). */
function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

/**
 * Start a campaign (`startsOn` … `endsOn`, IST dates). Refusals: ⛔ real dates, an end before the start, longer than 30
 * days inclusive, or a start before today (IST, the DB's clock) ⇒ `window_invalid`; a window that overlaps an OPEN
 * campaign ⇒ `overlap`. The Pariwar's advisory lock FIRST, then the overlap read (RV6).
 */
export async function startCampaign(
  db: Db,
  input: { pariwarId: PariwarId; actorId: string; startsOn: string; endsOn: string },
): Promise<KnownPeopleCampaign> {
  const { pariwarId, startsOn, endsOn } = input;
  if (!isCalendarDate(startsOn) || !isCalendarDate(endsOn)) throw new KnownPeopleCampaignRefusedError('known_people_campaign.window_invalid');
  const span = daysBetween(startsOn, endsOn);
  if (span < 0 || span > KNOWN_PEOPLE_CAMPAIGN_MAX_SPAN_DAYS) throw new KnownPeopleCampaignRefusedError('known_people_campaign.window_invalid');

  await db.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`known_people_campaign:${pariwarId}`}))`);
  const today = await db.execute<{ today: string }>(sql`SELECT to_char(${IST_TODAY}, 'YYYY-MM-DD') AS today`);
  if (startsOn < today.rows[0]!.today) throw new KnownPeopleCampaignRefusedError('known_people_campaign.window_invalid');

  const overlap = await db.execute(sql`
    SELECT 1 FROM known_people_campaigns c
     WHERE c.pariwar_id = ${pariwarId} AND ${openCampaignSql(sql`c`)}
       AND c.starts_on <= ${endsOn}::date AND c.ends_on >= ${startsOn}::date
     LIMIT 1`);
  if (overlap.rows.length > 0) throw new KnownPeopleCampaignRefusedError('known_people_campaign.overlap');

  const ins = await db.execute<CampaignRow>(sql`
    WITH c AS (
      INSERT INTO known_people_campaigns (pariwar_id, started_by_actor_id, starts_on, ends_on)
      VALUES (${pariwarId}, ${input.actorId}, ${startsOn}::date, ${endsOn}::date)
      RETURNING *
    )
    SELECT ${ROW_COLUMNS} FROM c`);
  return toCampaign(ins.rows[0]!);
}

/**
 * End an OPEN campaign (live — or scheduled, which cancels it). An unknown id or another Pariwar's ⇒ `not_found`; one already
 * ended, or whose window has passed ⇒ `not_live`. The row `FOR UPDATE`.
 */
export async function endCampaign(
  db: Db,
  input: { pariwarId: PariwarId; campaignId: string; actorId: string },
): Promise<KnownPeopleCampaign> {
  if (!isUuid(input.campaignId)) throw new KnownPeopleCampaignRefusedError('known_people_campaign.not_found');
  const locked = await db.execute<{ open: boolean }>(sql`
    SELECT ${openCampaignSql(sql`c`)} AS open FROM known_people_campaigns c
     WHERE c.pariwar_id = ${input.pariwarId} AND c.campaign_id = ${input.campaignId}::uuid
     FOR UPDATE`);
  const row = locked.rows[0];
  if (!row) throw new KnownPeopleCampaignRefusedError('known_people_campaign.not_found');
  if (!row.open) throw new KnownPeopleCampaignRefusedError('known_people_campaign.not_live');
  const upd = await db.execute<CampaignRow>(sql`
    WITH c AS (
      UPDATE known_people_campaigns SET ended_at = now(), ended_by_actor_id = ${input.actorId}
       WHERE pariwar_id = ${input.pariwarId} AND campaign_id = ${input.campaignId}::uuid AND ended_at IS NULL
      RETURNING *
    )
    SELECT ${ROW_COLUMNS} FROM c`);
  const ended = upd.rows[0];
  if (!ended) throw new KnownPeopleCampaignRefusedError('known_people_campaign.not_live');
  return toCampaign(ended);
}

/** The Pariwar's campaigns, newest first (`created_at DESC, campaign_id DESC`), keyset-paginated (`clampLimit`). */
export async function listCampaigns(
  db: Db,
  input: { pariwarId: PariwarId; limit?: number | undefined; cursor?: string | undefined },
): Promise<{ items: KnownPeopleCampaign[]; nextCursor: string | null; hasMore: boolean }> {
  const limit = clampLimit(input.limit, KNOWN_PEOPLE_CAMPAIGN_LIST_LIMIT);
  let after = sql``;
  if (input.cursor !== undefined) {
    const [createdAt, id] = decodeCursor(input.cursor, 2) as [string, string];
    if (!isUuid(id) || !isTimestampCursor(createdAt)) {
      throw new WorkplaceCursorInvalidError();
    }
    after = sql`AND (c.created_at, c.campaign_id) < (${createdAt}::timestamptz, ${id}::uuid)`;
  }
  const rows = await db.execute<CampaignRow>(sql`
    SELECT ${ROW_COLUMNS} FROM known_people_campaigns c
     WHERE c.pariwar_id = ${input.pariwarId} ${after}
     ORDER BY c.created_at DESC, c.campaign_id DESC
     LIMIT ${clampLimit(limit + 1, { default: KNOWN_PEOPLE_CAMPAIGN_LIST_LIMIT.default + 1, cap: KNOWN_PEOPLE_CAMPAIGN_LIST_LIMIT.cap + 1 })}`);
  const hasMore = rows.rows.length > limit;
  const items = rows.rows.slice(0, limit).map(toCampaign);
  const last = items[items.length - 1];
  return { items, hasMore, nextCursor: hasMore && last ? encodeCursor([last.createdAt, last.campaignId]) : null };
}
