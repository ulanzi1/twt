// The Trust's announcement channels — the READS the job and the admin "Posts" list need (Story 5.14, Task 1; `2026-10-29-417` FS5 (a),
// FS15 (a); AC2, AC5). RAW SQL on a caller-supplied `pg` handle; EVERY statement carries `pariwar_id = $1` (I6 — the job runs on the
// BYPASSRLS pool). A pools-ONLY read (⛔ `listCycleBindingCandidates`, which also loads assignments — AC5 (i)): the fields
// `resolvePoolIdentity` takes (`PoolIdentityInput`) and nothing about a member.

import { clampLimit } from '../pagination.js';
import type { AnnouncementPostOccasion, AnnouncementPostState } from '../schema/announcement_channel_posts.js';
import { ANNOUNCEMENT_POST_DEFERRED_MAX_AGE_MS, ANNOUNCEMENT_POST_LEASE_MS, type Queryable } from './posts.js';

/** One pool of a cycle — the `PoolIdentityInput` fields (`pool-identity.ts`) plus its id. ⛔ A member field (I4). */
export interface AnnouncementCyclePool {
  readonly poolId: string;
  readonly claimCaseId: string;
  readonly poolIndex: number;
  readonly poolCanonicalIdentifier: string;
  readonly fixedAmount: number;
}

interface PoolRow {
  pool_id: string;
  claim_case_id: string;
  pool_index: number;
  pool_canonical_identifier: string;
  fixed_amount: number;
}

const toPool = (r: PoolRow): AnnouncementCyclePool => ({
  poolId: r.pool_id,
  claimCaseId: r.claim_case_id,
  poolIndex: r.pool_index,
  poolCanonicalIdentifier: r.pool_canonical_identifier,
  fixedAmount: r.fixed_amount,
});

/** A cycle's pool count is bounded by the cycle-freeze; this cap only stops a defect from draining the table. */
const CYCLE_POOLS_CAP = 500;

/** The cycle job's fan-out source — the cycle's pools in `pool_index` order. */
export async function listCyclePoolsForAnnouncement(
  q: Queryable,
  input: { readonly pariwarId: string; readonly cycleId: string },
): Promise<AnnouncementCyclePool[]> {
  const { rows } = await q.query<PoolRow>(
    `SELECT pool_id, claim_case_id, pool_index, pool_canonical_identifier, fixed_amount
       FROM pools
      WHERE pariwar_id = $1 AND cycle_id = $2
      ORDER BY pool_index ASC, pool_id ASC
      LIMIT $3`,
    [input.pariwarId, input.cycleId, CYCLE_POOLS_CAP],
  );
  return rows.map(toPool);
}

/**
 * The pool child re-reads ITS pool (AC5 — the payload carries ids only) with its cycle and the cycle's pool count (the curated-name
 * `reserveNames` count — `poolCount` in `PoolIdentityInput`). `null` ⇒ no such pool in this Pariwar.
 */
export async function getAnnouncementPool(
  q: Queryable,
  input: { readonly pariwarId: string; readonly poolId: string },
): Promise<(AnnouncementCyclePool & { readonly cycleId: string; readonly poolCount: number }) | null> {
  const { rows } = await q.query<PoolRow & { cycle_id: string; pool_count: string }>(
    `SELECT p.pool_id, p.claim_case_id, p.pool_index, p.pool_canonical_identifier, p.fixed_amount, p.cycle_id,
            (SELECT count(*) FROM pools c WHERE c.pariwar_id = $1 AND c.cycle_id = p.cycle_id) AS pool_count
       FROM pools p
      WHERE p.pariwar_id = $1 AND p.pool_id = $2`,
    [input.pariwarId, input.poolId],
  );
  const r = rows[0];
  return r === undefined ? null : { ...toPool(r), cycleId: r.cycle_id, poolCount: Number(r.pool_count) };
}

/** The alert a post hangs off: its cycle and whether it is still `live` (a pool-open child whose alert is not is `stale` — AC5 (iii)). */
export async function getAnnouncementAlert(
  q: Queryable,
  input: { readonly pariwarId: string; readonly alertId: string },
): Promise<{ readonly alertId: string; readonly cycleId: string; readonly live: boolean } | null> {
  const { rows } = await q.query<{ alert_id: string; cycle_id: string; current_state: string }>(
    `SELECT alert_id, cycle_id, current_state FROM alerts WHERE pariwar_id = $1 AND alert_id = $2`,
    [input.pariwarId, input.alertId],
  );
  const r = rows[0];
  return r === undefined ? null : { alertId: r.alert_id, cycleId: r.cycle_id, live: r.current_state === 'live' };
}

/**
 * I9 / AC5 (iv) — the recovery sweep's heal test: how many of the cycle's pools LACK a `pool_open` post row (the cycle's pool ids minus
 * their `pool_open` rows). ⛔ A write. A re-sent cycle job is harmless (the UNIQUE).
 */
export async function countPoolOpenPostGaps(
  q: Queryable,
  input: { readonly pariwarId: string; readonly cycleId: string },
): Promise<number> {
  const { rows } = await q.query<{ n: string }>(
    `SELECT count(*) AS n
       FROM pools p
      WHERE p.pariwar_id = $1 AND p.cycle_id = $2
        AND NOT EXISTS (
          SELECT 1 FROM announcement_channel_posts r
           WHERE r.pariwar_id = $1 AND r.occasion = 'pool_open' AND r.subject_id = p.pool_id
        )`,
    [input.pariwarId, input.cycleId],
  );
  return Number(rows[0]?.n ?? 0);
}

/** One post row as the admin list reads it (states only — ⛔ a name, ⛔ text: there are none). */
export interface AnnouncementPostView {
  readonly occasion: AnnouncementPostOccasion;
  readonly subjectId: string;
  readonly state: AnnouncementPostState;
  readonly detail: string | null;
  readonly poolLabel: string | null;
  readonly lastDate: string | null;
  /** `attempting` past the lease ⇒ the list SHOWS it `unknown` (AC2). Judged on the database clock. */
  readonly insideLease: boolean;
  /** `deferred` past its max age ⇒ the list SHOWS it `refused` (AC2). */
  readonly deferredFresh: boolean;
}

/** One cycle the admin list covers: its alert, when it froze, its pools and whatever post rows exist (LEFT JOINED — I9). */
export interface AnnouncementActivityCycle {
  readonly alertId: string;
  readonly cycleId: string;
  readonly committedAt: Date;
  readonly alertLive: boolean;
  readonly pools: readonly AnnouncementCyclePool[];
  /** The cycle's pool count (= `pools.length` unless a defect hit the cap). */
  readonly poolCount: number;
  readonly posts: readonly AnnouncementPostView[];
}

/** FS4 (a) / FS15 (a) — the list covers pool openings and last days of the last 15 days. */
export const ANNOUNCEMENT_POSTS_LIST_WINDOW_DAYS = 15;

/**
 * FS4 (a) / FS15 (a) / AC2 — the cycles whose pool openings or last day can fall in the list's window: frozen within the last
 * {@link ANNOUNCEMENT_POSTS_LIST_WINDOW_DAYS} + `cycleWindowDays` days (a cycle frozen earlier had its last day before the window), newest
 * first, at most `limit` cycles (`clampLimit` — family (a)). Which entries show is the API's (pure) decision over this read.
 */
export async function listAnnouncementActivity(
  q: Queryable,
  input: { readonly pariwarId: string; readonly now: Date; readonly cycleWindowDays: number; readonly limit?: number },
): Promise<AnnouncementActivityCycle[]> {
  const limit = clampLimit(input.limit, { default: 20, cap: 50 });
  const alerts = await q.query<{ alert_id: string; cycle_id: string; current_state: string; committed_at: Date }>(
    `SELECT a.alert_id, a.cycle_id, a.current_state, c.committed_at
       FROM alerts a
       JOIN cycle_freeze_commits c ON c.commit_id = a.cycle_id AND c.pariwar_id = a.pariwar_id
      WHERE a.pariwar_id = $1
        AND c.committed_at >= $2::timestamptz - (($3::int + $4::int) * interval '1 day')
      ORDER BY c.committed_at DESC, a.alert_id ASC
      LIMIT $5`,
    [input.pariwarId, input.now, ANNOUNCEMENT_POSTS_LIST_WINDOW_DAYS, input.cycleWindowDays, limit],
  );
  if (alerts.rows.length === 0) return [];
  const cycleIds = alerts.rows.map((r) => r.cycle_id);
  const alertIds = alerts.rows.map((r) => r.alert_id);
  const pools = await q.query<PoolRow & { cycle_id: string }>(
    `SELECT pool_id, claim_case_id, pool_index, pool_canonical_identifier, fixed_amount, cycle_id
       FROM pools
      WHERE pariwar_id = $1 AND cycle_id = ANY($2::uuid[])
      ORDER BY cycle_id, pool_index ASC, pool_id ASC
      LIMIT $3`,
    [input.pariwarId, cycleIds, CYCLE_POOLS_CAP * limit],
  );
  const posts = await q.query<{
    alert_id: string;
    occasion: AnnouncementPostOccasion;
    subject_id: string;
    state: AnnouncementPostState;
    detail: string | null;
    pool_label: string | null;
    last_date: string | null;
    inside_lease: boolean;
    deferred_fresh: boolean;
  }>(
    `SELECT alert_id, occasion, subject_id, state, detail, pool_label, last_date,
            updated_at >= clock_timestamp() - ($3::int * interval '1 millisecond') AS inside_lease,
            updated_at >= clock_timestamp() - ($4::int * interval '1 millisecond') AS deferred_fresh
       FROM announcement_channel_posts
      WHERE pariwar_id = $1 AND alert_id = ANY($2::uuid[])`,
    [input.pariwarId, alertIds, ANNOUNCEMENT_POST_LEASE_MS, ANNOUNCEMENT_POST_DEFERRED_MAX_AGE_MS],
  );
  return alerts.rows.map((a) => {
    const cyclePools = pools.rows.filter((p) => p.cycle_id === a.cycle_id).map(toPool);
    return {
      alertId: a.alert_id,
      cycleId: a.cycle_id,
      committedAt: a.committed_at,
      alertLive: a.current_state === 'live',
      pools: cyclePools,
      poolCount: cyclePools.length,
      posts: posts.rows
        .filter((p) => p.alert_id === a.alert_id)
        .map((p) => ({
          occasion: p.occasion,
          subjectId: p.subject_id,
          state: p.state,
          detail: p.detail,
          poolLabel: p.pool_label,
          lastDate: p.last_date,
          insideLease: p.inside_lease,
          deferredFresh: p.deferred_fresh,
        })),
    };
  });
}
