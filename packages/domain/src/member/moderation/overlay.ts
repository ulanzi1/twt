// The moderation governance overlay — Story 10.10 (Task 1; AC1, Decision 1).
//
// Moderation is a DERIVED governance overlay, ORTHOGONAL to the primary member lifecycle state
// machine — exactly the shipped `member/overlay.ts` (`account-frozen`) shape. It is NOT a
// `member_lifecycle_state` enum label and is NEVER written to `members.state`. A member can be
// (e.g.) `active` AND `suspended` simultaneously; both are queryable independently.
//
// ── Why an overlay and not two new enum labels (Decision 1) ──────────────────────────────────────
// `epics.md:3548` ("member state machine transitions accordingly") reads naturally as two new
// `member_lifecycle_state` labels. That reading is NOT implementable:
//   · `restore` has no answer. The lifecycle reducer is `(state, event) => state`; from `suspended`
//     it cannot know whether the member was `active`, `active-in-grace`, `lapsed-unpaid` or
//     `lock-in` beforehand. The only escape — reading a `restore_to` label from the payload —
//     violates the reducer's own stated invariant (`member/events.ts`: derive from the CURRENT
//     state + the event TYPE, "never from `to_state` in the payload").
//   · The PRD already models it as a FLAG, not a state (`prd.md:411` `special_flags[]`, e.g.
//     `"suspended_per_R7E"`).
//   · The blast radius is SILENT: there is no `never` guard over `MemberLifecycleState` anywhere,
//     so two new labels produce ZERO compile errors while mis-classifying five `TERMINAL_STATES`
//     Sets, `NEWS_DISPATCH_MEMBER_STATES`, `peer-mesh-read.ts`, every seeded niyamavali
//     `member_state_in` clause, and the renewal grace clock.
// → a SECOND, orthogonal, event-derived state machine on the member's own stream. The epic AC's
// intent is met (a state machine does transition, on events, replayably) while `members.state`, its
// projector, the `app.member_state_writer` trigger and the `member-state-invariant` CI gate remain
// untouched.
//
// ── SINGLE-stream (unlike the account-frozen overlay) ────────────────────────────────────────────
// Moderation events live on the MEMBER's own stream, so `event_version` is a total order on its own
// — no `(occurred_at, stream_id, event_version)` tiebreak is needed (contrast the multi-claim
// account-frozen fold, which aggregates across claim streams).

import { and, asc, eq, inArray, lte } from 'drizzle-orm';

import type { Db } from '../../db.js';
import type { MemberId } from '../../ids/index.js';
import { eventsLog } from '../../schema/events_log.js';
import {
  moderationActionForEventType,
  MODERATION_EVENT_TYPES,
  nextModerationStatus,
  type ModerationStatus,
} from './status.js';

/** A minimal moderation event the overlay evaluator folds over. `payload` supplies the reason code. */
export interface ModerationOverlayEventInput {
  readonly type: string;
  readonly occurredAt: Date;
  readonly payload: unknown;
}

/** The derived moderation verdict. NOT a member lifecycle state. */
export interface ModerationOverlay {
  /** The current moderation standing. `none` for the overwhelming majority of members. */
  status: ModerationStatus;
  /** The reason code that produced the CURRENT status; `null` when `status === 'none'`. */
  reasonCode: string | null;
  /** When the current status began (the producing event's `occurred_at`); `null` when `none`. */
  since: Date | null;
  /** When the last APPLIED moderation action occurred (survives a restore); `null` when never moderated. */
  lastActionAt: Date | null;
}

/** The not-moderated verdict — the default for a member with no moderation history. */
export const NO_MODERATION: ModerationOverlay = {
  status: 'none',
  reasonCode: null,
  since: null,
  lastActionAt: null,
};

/** Read `payload.reason_code` defensively (the fold must stay total on a malformed payload). */
function reasonCodeOf(payload: unknown): string | null {
  if (typeof payload !== 'object' || payload === null) return null;
  const value = (payload as { reason_code?: unknown }).reason_code;
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/**
 * Deterministic, replay-safe evaluator: fold an ORDERED list of `member.moderation.*` events into
 * the overlay verdict. PURE — no I/O, no clock, no mutable module state (`now` and the ordering are
 * the caller's concern), so replaying the same list twice always yields the same verdict.
 *
 * TOTAL, like the lifecycle reducer: an event whose transition is ILLEGAL from the folded status is
 * IDENTITY (skipped), never a throw. The WRITE path is where an illegal action is rejected with a
 * typed 409 before anything is appended; the fold must stay robust for replay over any stream —
 * including one seeded by a future story or repaired by hand.
 */
export function evaluateModerationOverlay(
  events: readonly ModerationOverlayEventInput[],
): ModerationOverlay {
  let status: ModerationStatus = 'none';
  let reasonCode: string | null = null;
  let since: Date | null = null;
  let lastActionAt: Date | null = null;

  for (const e of events) {
    const action = moderationActionForEventType(e.type);
    if (action === null) continue;
    const next = nextModerationStatus(status, action);
    // Illegal from the current folded status → identity (see the TOTAL note above).
    if (next === null) continue;

    status = next;
    lastActionAt = e.occurredAt;
    if (next === 'none') {
      // Restored: the overlay clears, but `lastActionAt` retains the restore instant.
      reasonCode = null;
      since = null;
    } else {
      reasonCode = reasonCodeOf(e.payload);
      since = e.occurredAt;
    }
  }

  return { status, reasonCode, since, lastActionAt };
}

/**
 * The single query surface (AC1): a member's moderation overlay as of `atTimestamp`. Loads the
 * member's own `member.moderation.*` events bounded by the instant, ordered by the monotonic
 * `event_version` (single-stream — `occurred_at` can tie within a transaction and is used only as
 * the upper BOUND of the replay window, never as the sort key: the `getMemberStateAt` discipline).
 */
export async function getMemberModerationOverlay(
  db: Db,
  memberId: MemberId,
  atTimestamp: Date,
): Promise<ModerationOverlay> {
  return loadOverlay(db, memberId, atTimestamp);
}

/**
 * The member's overlay standing RIGHT NOW — the whole stream, with NO upper time bound.
 *
 * ── Why the legality check must NOT use the `at`-bounded read (review follow-up) ──────────────────
 * `occurred_at` is DB-generated (`events_log.occurred_at` is `.defaultNow()`; `projectMemberState`
 * never passes one), while every `atTimestamp` a caller has is the INJECTED APP clock. Those are
 * different clock domains, and this story's own Debug Log records the skew as an OBSERVED fact
 * ("the Node clock can run a few ms AHEAD of Postgres … an event can land outside the window and be
 * silently skipped"). Under the opposite skew — app clock BEHIND the DB — a second moderation
 * request bounded at `deps.clock()` would exclude the first action's event, fold `status: 'none'`,
 * and accept a duplicate suspend where AC2 requires a 409. The `(stream_id, event_version)` unique
 * index does not save this: `projectMemberState` claims `head_version + 1` from an UNBOUNDED read,
 * so the append succeeds.
 *
 * The `at`-bounded variant above remains correct — and required — for POINT-IN-TIME replay
 * (`@twt/validity-service` resolving a payload as of an instant). It is the LEGALITY check that
 * must see the present, and the present has no clock in it.
 */
export async function getCurrentMemberModerationOverlay(
  db: Db,
  memberId: MemberId,
): Promise<ModerationOverlay> {
  return loadOverlay(db, memberId, null);
}

async function loadOverlay(
  db: Db,
  memberId: MemberId,
  atTimestamp: Date | null,
): Promise<ModerationOverlay> {
  const predicates = [
    eq(eventsLog.streamId, memberId),
    inArray(eventsLog.eventType, [...MODERATION_EVENT_TYPES]),
  ];
  if (atTimestamp !== null) predicates.push(lte(eventsLog.occurredAt, atTimestamp));

  const rows = await db
    .select({
      eventType: eventsLog.eventType,
      occurredAt: eventsLog.occurredAt,
      payload: eventsLog.payload,
    })
    .from(eventsLog)
    .where(and(...predicates))
    .orderBy(asc(eventsLog.eventVersion));

  return evaluateModerationOverlay(
    rows.map((r) => ({ type: r.eventType, occurredAt: r.occurredAt, payload: r.payload })),
  );
}
