// The Trust's channel post record — the domain accessors (Story 5.14, Task 1; `2026-10-29-417` FS2 (a), FS7 (a), as amended by
// `-418` items 4, 11 and §3; AC1, AC6). Migration 0190's `announcement_channel_posts`, read and written in RAW SQL on a caller-supplied
// `pg` handle. The `alert-sms-sends.ts` (0184 / 5.11b) shape, copied — ⛔ reinvented.
//
// ⭐ THE ROW'S LIFE (the job in `apps/jobs` drives it; this file holds only the SQL):
//   1. {@link lookupAnnouncementPost} — READ-ONLY, before anything else: a final row ⇒ done (⛔ decrypt, ⛔ post); `attempting` inside
//      the lease ⇒ IN FLIGHT (the job throws; pg-boss retries); `attempting` past the lease ⇒ a crash between begin and finalise —
//      Telegram MAY have posted ⇒ {@link finaliseStaleAnnouncementPost} (`unknown:stale_lease`, ⛔ re-posted); `deferred` ⇒ proceed
//      (begin re-claims it) while YOUNG ({@link ANNOUNCEMENT_POST_DEFERRED_MAX_AGE_MS}); an older one is `deferred_expired` ⇒ given up
//      ({@link giveUpDeferredAnnouncementPost}, `refused:tg_429_expired`).
//   2. {@link beginAnnouncementPost} — `INSERT … ON CONFLICT DO NOTHING`, else the compare-and-set `deferred → attempting` with a NEW
//      claim token, under `SELECT … FOR UPDATE`; the caller COMMITS before the Bot API call. Lost ⇒ `taken`.
//   3. the Bot API call (⛔ connection held — T8).
//   4. {@link finaliseAnnouncementPost} — the compare-and-set `attempting → <state>` on THAT attempt's claim token.
//   A post never attempted (a skip, `secret_unresolved`, `identity_unavailable`) is {@link recordUnattemptedAnnouncementPost} — INSERT
//   `attempting` + the compare-and-set to final in ONE transaction (`-418` item 11).
//
// ⚠ I6 — EVERY statement carries `pariwar_id = $1`: the job runs on the BYPASSRLS service pool, where RLS protects nothing (T14).

import type pg from 'pg';

import {
  ANNOUNCEMENT_POST_DEFERRED_DETAILS,
  ANNOUNCEMENT_POST_LAST_DATE_PATTERN,
  ANNOUNCEMENT_POST_REFUSED_DETAILS,
  ANNOUNCEMENT_POST_REFUSED_TG_PATTERN,
  ANNOUNCEMENT_POST_SKIPPED_DETAILS,
  ANNOUNCEMENT_POST_UNKNOWN_DETAILS,
  type AnnouncementPostFinalState,
  type AnnouncementPostOccasion,
  type AnnouncementPostState,
} from '../schema/announcement_channel_posts.js';

export type Queryable = Pick<pg.Pool, 'query'> | Pick<pg.PoolClient, 'query'>;

/**
 * FS7 (a) — a found `attempting` row younger than this is IN FLIGHT: the 9 s Telegram timeout + the finalise's own connection, with
 * wide margin (5.11b's value). Older ⇒ a crash ⇒ `unknown:stale_lease`, ⛔ re-posted. Judged on `clock_timestamp()`.
 */
export const ANNOUNCEMENT_POST_LEASE_MS = 2 * 60_000;

/**
 * FS7 (a) — a `deferred` row (a 429 — definitely not posted) is re-claimable only while YOUNG; older ⇒ `refused:tg_429_expired`
 * (5.11b's 30 minutes). A `last_day` row is ALSO given up once its deadline has passed — the job's stale check (`-418` item 2).
 */
export const ANNOUNCEMENT_POST_DEFERRED_MAX_AGE_MS = 30 * 60_000;

/** A post's identity — the UNIQUE key (I2). */
export interface AnnouncementPostKey {
  readonly pariwarId: string;
  readonly occasion: AnnouncementPostOccasion;
  /** The pool id (`pool_open`) or the alert id (`last_day`). */
  readonly subjectId: string;
}

/** What a post row records beyond its key (FS15 (a) — ⛔ a name, ⛔ the text). */
export interface AnnouncementPostRecord extends AnnouncementPostKey {
  readonly alertId: string;
  /** `pool_open` only — the no-decrypt label. */
  readonly poolLabel: string | null;
  /** `last_day` only — DD-MM-YYYY. */
  readonly lastDate: string | null;
}

export type AnnouncementPostLookup =
  | { readonly kind: 'none' }
  | {
      readonly kind: 'final';
      readonly postId: string;
      readonly state: AnnouncementPostFinalState;
      readonly detail: string | null;
    }
  | { readonly kind: 'in_flight'; readonly postId: string }
  | { readonly kind: 'stale'; readonly postId: string }
  | { readonly kind: 'deferred'; readonly postId: string }
  | { readonly kind: 'deferred_expired'; readonly postId: string };

const REFUSED_TG = new RegExp(ANNOUNCEMENT_POST_REFUSED_TG_PATTERN);
const LAST_DATE = new RegExp(ANNOUNCEMENT_POST_LAST_DATE_PATTERN);

/** ⭐ The `detail` a state may carry (`-418` §3) — the writers assert it BEFORE the statement; the CHECKs are the backstop. */
export function isAnnouncementPostDetail(state: AnnouncementPostState, detail: string | null): boolean {
  switch (state) {
    case 'attempting':
    case 'posted':
      return detail === null;
    case 'deferred':
      return detail !== null && (ANNOUNCEMENT_POST_DEFERRED_DETAILS as readonly string[]).includes(detail);
    case 'skipped':
      return detail !== null && (ANNOUNCEMENT_POST_SKIPPED_DETAILS as readonly string[]).includes(detail);
    case 'refused':
      return detail !== null && ((ANNOUNCEMENT_POST_REFUSED_DETAILS as readonly string[]).includes(detail) || REFUSED_TG.test(detail));
    case 'unknown':
      return detail !== null && (ANNOUNCEMENT_POST_UNKNOWN_DETAILS as readonly string[]).includes(detail);
  }
}

function assertDetail(state: AnnouncementPostState, detail: string | null): void {
  if (!isAnnouncementPostDetail(state, detail)) throw new Error(`announcement_channel_posts: detail ${String(detail)} is not a ${state} detail`);
}

/** The record's own shape (the CHECKs' `occasion_fields` / `last_day_subject` legs), asserted before an INSERT. */
function assertRecord(r: AnnouncementPostRecord): void {
  if (r.occasion === 'pool_open') {
    if (r.poolLabel === null || r.poolLabel.length === 0 || r.lastDate !== null) {
      throw new Error('announcement_channel_posts: a pool_open row records its pool label and no date');
    }
  } else if (r.lastDate === null || !LAST_DATE.test(r.lastDate) || r.poolLabel !== null || r.subjectId !== r.alertId) {
    throw new Error('announcement_channel_posts: a last_day row records its date, no label, and its alert as subject');
  }
}

/** Step 1 — READ-ONLY. The lease and the deferred age are judged on the DATABASE clock, the clock that wrote `updated_at`. */
export async function lookupAnnouncementPost(q: Queryable, key: AnnouncementPostKey): Promise<AnnouncementPostLookup> {
  const { rows } = await q.query<{
    post_id: string;
    state: AnnouncementPostState;
    detail: string | null;
    inside_lease: boolean;
    deferred_fresh: boolean;
  }>(
    `SELECT post_id, state, detail,
            updated_at >= clock_timestamp() - ($4::int * interval '1 millisecond') AS inside_lease,
            updated_at >= clock_timestamp() - ($5::int * interval '1 millisecond') AS deferred_fresh
       FROM announcement_channel_posts
      WHERE pariwar_id = $1 AND occasion = $2 AND subject_id = $3`,
    [key.pariwarId, key.occasion, key.subjectId, ANNOUNCEMENT_POST_LEASE_MS, ANNOUNCEMENT_POST_DEFERRED_MAX_AGE_MS],
  );
  const r = rows[0];
  if (r === undefined) return { kind: 'none' };
  switch (r.state) {
    case 'deferred':
      return r.deferred_fresh ? { kind: 'deferred', postId: r.post_id } : { kind: 'deferred_expired', postId: r.post_id };
    case 'attempting':
      return r.inside_lease ? { kind: 'in_flight', postId: r.post_id } : { kind: 'stale', postId: r.post_id };
    default:
      return { kind: 'final', postId: r.post_id, state: r.state, detail: r.detail };
  }
}

/**
 * A crash-left `attempting` row past the lease ⇒ FINAL `unknown:stale_lease` (Telegram MAY have posted — ⛔ re-posted; I2). The lease
 * is re-checked by the UPDATE itself. `false` ⇒ the row moved on.
 */
export async function finaliseStaleAnnouncementPost(q: Queryable, input: { readonly pariwarId: string; readonly postId: string }): Promise<boolean> {
  const { rowCount } = await q.query(
    `UPDATE announcement_channel_posts
        SET state = 'unknown', detail = 'stale_lease', updated_at = clock_timestamp()
      WHERE pariwar_id = $1 AND post_id = $2 AND state = 'attempting'
        AND updated_at < clock_timestamp() - ($3::int * interval '1 millisecond')`,
    [input.pariwarId, input.postId, ANNOUNCEMENT_POST_LEASE_MS],
  );
  return (rowCount ?? 0) > 0;
}

export type BeginAnnouncementPostResult =
  | { readonly kind: 'begun'; readonly postId: string; readonly attemptCount: number }
  | { readonly kind: 'taken' };

/**
 * ⭐ Step 2 — BEGIN, on the caller's TRANSACTION (the caller COMMITS before the Bot API call — I2): INSERT `attempting`, or re-claim a
 * YOUNG `deferred` row (`attempt_count + 1`, the NEW claim token — T15). Two concurrent begins serialise on the unique index; the row is
 * locked BEFORE its freshness is judged (5.11b's AP-P3). `taken` ⇒ another attempt holds or finished it (the caller re-reads).
 */
export async function beginAnnouncementPost(
  q: Queryable,
  input: AnnouncementPostRecord & { readonly claimToken: string },
): Promise<BeginAnnouncementPostResult> {
  assertRecord(input);
  const inserted = await q.query<{ post_id: string; attempt_count: number }>(
    `INSERT INTO announcement_channel_posts (pariwar_id, occasion, subject_id, alert_id, pool_label, last_date, state, claim_token)
     VALUES ($1, $2, $3, $4, $5, $6, 'attempting', $7)
     ON CONFLICT (pariwar_id, occasion, subject_id) DO NOTHING
     RETURNING post_id, attempt_count`,
    [input.pariwarId, input.occasion, input.subjectId, input.alertId, input.poolLabel, input.lastDate, input.claimToken],
  );
  const fresh = inserted.rows[0];
  if (fresh !== undefined) return { kind: 'begun', postId: fresh.post_id, attemptCount: fresh.attempt_count };
  await q.query(
    `SELECT post_id FROM announcement_channel_posts
      WHERE pariwar_id = $1 AND occasion = $2 AND subject_id = $3
      FOR UPDATE`,
    [input.pariwarId, input.occasion, input.subjectId],
  );
  const reclaimed = await q.query<{ post_id: string; attempt_count: number }>(
    `UPDATE announcement_channel_posts
        SET state = 'attempting', detail = NULL, claim_token = $4, attempt_count = attempt_count + 1, updated_at = clock_timestamp()
      WHERE pariwar_id = $1 AND occasion = $2 AND subject_id = $3 AND state = 'deferred'
        AND updated_at >= clock_timestamp() - ($5::int * interval '1 millisecond')
      RETURNING post_id, attempt_count`,
    [input.pariwarId, input.occasion, input.subjectId, input.claimToken, ANNOUNCEMENT_POST_DEFERRED_MAX_AGE_MS],
  );
  const again = reclaimed.rows[0];
  return again === undefined ? { kind: 'taken' } : { kind: 'begun', postId: again.post_id, attemptCount: again.attempt_count };
}

/** Step 4's states — `deferred` ONLY for a 429 (`tg_429`); ⛔ `skipped` (a skip is never attempted). */
export type AnnouncementPostOutcome = Exclude<AnnouncementPostState, 'attempting' | 'skipped'>;

/**
 * ⭐ Step 4 — the COMPARE-AND-SET `attempting → <state>`, only by the attempt holding the row (its claim token). `false` ⇒ the row moved
 * on. `posted` REQUIRES Telegram's `message_id` (I3; the CHECK backs it).
 */
export async function finaliseAnnouncementPost(
  q: Queryable,
  input: {
    readonly pariwarId: string;
    readonly postId: string;
    readonly claimToken: string;
    readonly state: AnnouncementPostOutcome;
    readonly detail: string | null;
    readonly telegramMessageId?: string | null;
  },
): Promise<boolean> {
  assertDetail(input.state, input.detail);
  if (input.state === 'posted' && !input.telegramMessageId) throw new Error('finaliseAnnouncementPost: posted needs the Telegram message_id');
  if (input.state !== 'posted' && input.telegramMessageId) throw new Error('finaliseAnnouncementPost: only a posted row carries a message_id');
  const { rowCount } = await q.query(
    `UPDATE announcement_channel_posts
        SET state = $4, detail = $5, telegram_message_id = $6, updated_at = clock_timestamp()
      WHERE pariwar_id = $1 AND post_id = $2 AND state = 'attempting' AND claim_token = $3`,
    [input.pariwarId, input.postId, input.claimToken, input.state, input.detail, input.telegramMessageId ?? null],
  );
  return (rowCount ?? 0) > 0;
}

/**
 * A `deferred` row GIVEN UP → `refused:<detail>` (frozen): its max age passed (`tg_429_expired`, `onlyIfExpired` — re-judged under the
 * row lock on the CURRENT attempt's age), or a later attempt found a reason not to post (a skip reason, `secret_unresolved`,
 * `identity_unavailable` — `-418` item 11). `false` ⇒ ⛔ deferred row (re-claimed or finished meanwhile).
 */
export async function giveUpDeferredAnnouncementPost(
  q: Queryable,
  input: { readonly pariwarId: string; readonly postId: string; readonly detail: string; readonly onlyIfExpired?: true },
): Promise<boolean> {
  assertDetail('refused', input.detail);
  if (input.onlyIfExpired) {
    await q.query(
      `SELECT post_id FROM announcement_channel_posts WHERE pariwar_id = $1 AND post_id = $2 AND state = 'deferred' FOR UPDATE`,
      [input.pariwarId, input.postId],
    );
  }
  const { rowCount } = await q.query(
    `UPDATE announcement_channel_posts SET state = 'refused', detail = $3, updated_at = clock_timestamp()
      WHERE pariwar_id = $1 AND post_id = $2 AND state = 'deferred'
      ${input.onlyIfExpired ? "AND updated_at < clock_timestamp() - ($4::int * interval '1 millisecond')" : ''}`,
    [input.pariwarId, input.postId, input.detail, ...(input.onlyIfExpired ? [ANNOUNCEMENT_POST_DEFERRED_MAX_AGE_MS] : [])],
  );
  return (rowCount ?? 0) > 0;
}

/**
 * ⭐ A post NEVER attempted, written final (`-418` item 11 — the `recordLadderDeliveredAlertSmsSend` shape): `INSERT … ON CONFLICT DO
 * NOTHING` as `attempting` with a fresh token, then the token compare-and-set to `skipped` / `refused` — on the caller's TRANSACTION, so
 * ⛔ reader sees the `attempting` step and only the columns 0190 grants `twt_app` are written (its INSERT grant has ⛔ `detail`).
 * `false` ⇒ a row already exists (the caller re-reads — a `deferred` one is given up instead).
 */
export async function recordUnattemptedAnnouncementPost(
  q: Queryable,
  input: AnnouncementPostRecord & {
    readonly claimToken: string;
    readonly state: 'skipped' | 'refused';
    readonly detail: string;
  },
): Promise<boolean> {
  assertRecord(input);
  assertDetail(input.state, input.detail);
  const inserted = await q.query<{ post_id: string }>(
    `INSERT INTO announcement_channel_posts (pariwar_id, occasion, subject_id, alert_id, pool_label, last_date, state, claim_token)
     VALUES ($1, $2, $3, $4, $5, $6, 'attempting', $7)
     ON CONFLICT (pariwar_id, occasion, subject_id) DO NOTHING
     RETURNING post_id`,
    [input.pariwarId, input.occasion, input.subjectId, input.alertId, input.poolLabel, input.lastDate, input.claimToken],
  );
  const fresh = inserted.rows[0];
  if (fresh === undefined) return false;
  const { rowCount } = await q.query(
    `UPDATE announcement_channel_posts SET state = $4, detail = $5, updated_at = clock_timestamp()
      WHERE pariwar_id = $1 AND post_id = $2 AND state = 'attempting' AND claim_token = $3`,
    [input.pariwarId, fresh.post_id, input.claimToken, input.state, input.detail],
  );
  // Unreachable (THIS statement's transaction inserted the row) — ⛔ leave an `attempting` row the lease would misread.
  if ((rowCount ?? 0) === 0) throw new Error('recordUnattemptedAnnouncementPost: the inserted row could not be finalised');
  return true;
}
