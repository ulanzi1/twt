// Renewal-lifecycle scheduler tick — Story 3.8 (Task 5; AC1/AC3).
//
// THE FIRST EMITTER of the renewal/grace lifecycle events. The Story 3.1 reducer has encoded these
// transitions since day one, but nothing fired them (the "SIE scheduler" referenced in events.ts:71 was
// never built — 3.7 shipped a read-only widget). This is that scheduler's domain core: a daily tick that
//   1. selects only the CANDIDATE members via an INDEXED scan (latest receipt valid_through ≤ now + 91d
//      — never a full-table replay of every member; renewed members have valid_through ~ now+365d and
//      fall OUT of the candidate window), then
//   2. for each candidate, replays the member's state and emits the SINGLE transition the CURRENT state
//      warrants — `valid_through_reached` (Day 0 marker), `grace_entered` (+1d), `grace_expired` (+91d)
//      — stamped at the ACTUAL emission time, plus the renewal-reminder nudges due at +30/60/75/89.
//
// ── Monotonic + idempotent (Decision 4 — load-bearing) ──────────────────────────────────────────────
// Every transition emit is guarded on the CURRENT replayed state, not a side flag: `grace_entered` fires
// only from `active`, `grace_expired` only from `active-in-grace`. So a re-run / missed day / replay is
// safe (once transitioned, the guard skips). A member found long past +91d while still `active` (cron was
// down) advances exactly ONE step this tick (`active → active-in-grace`) and the next step next tick — it
// NEVER fabricates a backdated `grace_entered`+`grace_expired` pair. `valid_through_reached` is identity
// (no state change), so its idempotency uses an events_log existence check scoped to THIS valid_through
// cycle (occurred_at ≥ valid_through) rather than the state guard.
//
// ── System actor (SIE) ──────────────────────────────────────────────────────────────────────────────
// All emits use `projectMemberState(actorId = null)` — the sanctioned system/SIE write path (project.ts).
// `members.state` stays projector-only (the 0018 trigger + the 3.1 CI gate); the scheduler NEVER writes
// state directly. The candidate scan runs UNSCOPED (cross-tenant) on the pool — in production under the
// BYPASSRLS service login (boot.ts), in tests under the superuser connection; each per-candidate emit
// then runs inside `withPariwarScope` for that member's Pariwar.

import type pg from 'pg';

import { withPariwarScope } from '../db.js';
import * as ids from '../ids/index.js';
import { getMemberStateAt } from './read.js';
import { projectMemberState } from './project.js';

/** Whole-day milliseconds. */
const DAY_MS = 24 * 60 * 60 * 1000;
/** The grace window past `valid_through` before `lapsed-unpaid` begins (PRD FR-1A line 249: Day +91). */
const GRACE_END_OFFSET_DAYS = 91;
/** The reminder cadence — days past `valid_through` at which a renewal nudge is published (AC1). */
export const RENEWAL_REMINDER_OFFSETS = [30, 60, 75, 89] as const;

/** A renewal-reminder nudge the runtime forwards to the FR-23 seam (Epic 5 delivers; Epic 3 schedules). */
export interface RenewalReminder {
  memberId: string;
  pariwarId: string;
  /** One of 30/60/75/89 — days past `valid_through`. */
  reminderOffsetDays: number;
  /** The renewal-due anchor (latest receipt horizon) — the reminder cycle key. */
  validThrough: Date;
  /** Days of grace remaining at this tick (ceil-clamped ≥0). */
  graceRemainingDays: number;
}

/** The tick outcome — counts for observability + the reminders the runtime must publish. */
export interface RenewalTickResult {
  candidates: number;
  validThroughReached: number;
  graceEntered: number;
  graceExpired: number;
  remindersDue: RenewalReminder[];
}

/** A candidate row from the indexed scan (the latest receipt per member within the window). */
interface RenewalCandidate {
  memberId: string;
  pariwarId: string;
  validThrough: Date;
}

/** Add `days` calendar days, leap-safe (`setDate`, NOT fixed-ms). */
function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/**
 * Format a Date as an IST calendar-date string (YYYY-MM-DD). IST = UTC+5:30 = +330 min. Used for
 * reminder offset matching so a daily cron firing at any UTC time within the IST calendar day still
 * produces the correct match (fixed-ms division is off by one across DST / leap days — P4 fix).
 */
function toISTDateString(date: Date): string {
  const ist = new Date(date.getTime() + 330 * 60 * 1000);
  return ist.toISOString().slice(0, 10);
}

/**
 * The INDEXED candidate scan (Task 5 — never a full-table sweep). Selects the latest receipt per member
 * (DISTINCT ON, served by the `(member_id, valid_through DESC)` index) whose `valid_through ≤ cutoff`.
 * The cutoff (`now + 91d`) excludes freshly-renewed members (their `valid_through` ~ `now + 365d`) and
 * includes everyone at or approaching the grace-end boundary. Runs UNSCOPED (cross-tenant) — the caller
 * is the system service login. Returns `(member_id, pariwar_id)` for both axes `projectMemberState`
 * needs (`pariwarId` for tenant scope; `memberId` for the stream).
 */
export async function selectRenewalCandidates(
  pool: pg.Pool,
  cutoff: Date,
): Promise<RenewalCandidate[]> {
  const { rows } = await pool.query<{ member_id: string; pariwar_id: string; valid_through: Date }>(
    `SELECT member_id, pariwar_id, valid_through
       FROM (
         SELECT DISTINCT ON (member_id) member_id, pariwar_id, valid_through
           FROM vyawastha_shulk_receipts
          ORDER BY member_id, valid_through DESC
       ) latest
      WHERE latest.valid_through <= $1
      ORDER BY member_id`,
    [cutoff],
  );
  return rows.map((r) => ({
    memberId: r.member_id,
    pariwarId: r.pariwar_id,
    validThrough: r.valid_through,
  }));
}

/** Has a `valid_through_reached` already been emitted for THIS cycle (occurred_at ≥ valid_through)? */
async function hasValidThroughReachedSince(
  client: pg.PoolClient,
  memberId: string,
  validThrough: Date,
): Promise<boolean> {
  const { rows } = await client.query(
    `SELECT 1 FROM events_log
      WHERE stream_id = $1 AND event_type = 'member.valid_through_reached' AND occurred_at >= $2
      LIMIT 1`,
    [memberId, validThrough],
  );
  return rows.length > 0;
}

/**
 * Run one renewal-lifecycle tick at `now`: scan candidates, then for each emit the warranted lifecycle
 * event(s) + collect the reminders due. Each candidate runs in its OWN committed `withPariwarScope` tx
 * (own-committing — tests assert membership not counts). Returns aggregate counts + the reminders the
 * runtime publishes to the FR-23 seam.
 */
export async function runRenewalLifecycleTick(
  pool: pg.Pool,
  now: Date,
): Promise<RenewalTickResult> {
  const cutoff = addDays(now, GRACE_END_OFFSET_DAYS);
  const candidates = await selectRenewalCandidates(pool, cutoff);

  const result: RenewalTickResult = {
    candidates: candidates.length,
    validThroughReached: 0,
    graceEntered: 0,
    graceExpired: 0,
    remindersDue: [],
  };

  for (const c of candidates) {
    const graceEnd = addDays(c.validThrough, GRACE_END_OFFSET_DAYS);
    const graceStart = addDays(c.validThrough, 1);

    try {
      await withPariwarScope(pool, c.pariwarId, async (tx, client) => {
        const memberId = ids.memberId(c.memberId);
        const pariwarId = ids.pariwarId(c.pariwarId);
        const state = await getMemberStateAt(tx, memberId, now);

        // (1) Day-0 marker (identity in the reducer) — guarded by an events_log existence check, not state.
        if (state === 'active' && now.getTime() >= c.validThrough.getTime()) {
          const already = await hasValidThroughReachedSince(client, c.memberId, c.validThrough);
          if (!already) {
            await projectMemberState(client, {
              memberId,
              pariwarId,
              eventType: 'member.valid_through_reached',
              payload: {
                from_state: 'active',
                to_state: 'active',
                trigger: 'valid_through_reached',
                actor: 'system',
              },
              actorId: null,
            });
            result.validThroughReached += 1;
          }
        }

        // (2) ONE transition per tick (monotonic) — guarded on the current replayed state.
        if (state === 'active' && now.getTime() >= graceStart.getTime()) {
          await projectMemberState(client, {
            memberId,
            pariwarId,
            eventType: 'member.grace_entered',
            payload: {
              from_state: 'active',
              to_state: 'active-in-grace',
              trigger: 'grace_entered',
              actor: 'system',
            },
            actorId: null,
          });
          result.graceEntered += 1;
        } else if (state === 'active-in-grace' && now.getTime() >= graceEnd.getTime()) {
          await projectMemberState(client, {
            memberId,
            pariwarId,
            eventType: 'member.grace_expired',
            payload: {
              from_state: 'active-in-grace',
              to_state: 'lapsed-unpaid',
              trigger: 'grace_expired',
              actor: 'system',
            },
            actorId: null,
          });
          result.graceExpired += 1;
        }

        // (3) Reminder cadence (AC1) — pre-emit state in {active, active-in-grace} (not yet renewed for
        //     this cycle — a renewed member's valid_through moved out of the candidate window). Offset
        //     matching uses IST calendar-day strings (P4 fix: fixed-ms division drifts ±1 day at tick
        //     times near IST midnight or across leap days).
        if (state === 'active' || state === 'active-in-grace') {
          const todayIST = toISTDateString(now);
          for (const offset of RENEWAL_REMINDER_OFFSETS) {
            if (toISTDateString(addDays(c.validThrough, offset)) === todayIST) {
              const graceRemainingDays = Math.max(
                0,
                Math.ceil((graceEnd.getTime() - now.getTime()) / DAY_MS),
              );
              result.remindersDue.push({
                memberId: c.memberId,
                pariwarId: c.pariwarId,
                reminderOffsetDays: offset,
                validThrough: c.validThrough,
                graceRemainingDays,
              });
            }
          }
        }
      });
    } catch (err) {
      // A concurrency error (another tick) or transient DB error for this candidate — log and skip.
      // The scheduler is monotonic: a skipped candidate will be re-evaluated on the next tick.
      console.error(
        `[renewal-lifecycle] candidate ${c.memberId} error, skipping: ${(err as Error).message}`,
      );
    }
  }

  return result;
}
