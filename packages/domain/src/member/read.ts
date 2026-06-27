// Member lifecycle read accessors — Story 3.1 (Task 5; AC4).
//
// `getMemberStateAt` is the canonical "what was this member's state on date X?"
// surface that Epic 4 (validity service), Epic 6 (claim filing), and Epic 12 (Module
// Shelf suppression) consume. It replays the member's `events_log` stream up to —
// but not exceeding — `atTimestamp`.
//
// ── Ordered by event_version, NOT occurred_at (AC4 — load-bearing) ────────────
// `occurred_at` defaults to DB `now()` and CAN tie (two events in the same
// transaction/instant). Ordering replay by the monotonic `event_version` guarantees
// a deterministic result regardless of occurred_at ties. The timestamp is used only
// as the upper BOUND of the replay window (`occurred_at <= atTimestamp`), never as
// the sort key.
//
// Reads `events_log` directly via Drizzle (domain owns the table) rather than calling
// @twt/events.loadEvents — domain cannot import @twt/events (the cycle); see
// member/project.ts header. The `events_log_pariwar_occurred_at_idx` index assists
// the bound, and the stream is small per member.

import { and, asc, eq, lte } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { MemberId, PariwarId } from '../ids/index.js';
import { eventsLog } from '../schema/events_log.js';
import { members } from '../schema/members.js';
import { type MemberLifecycleState, replayMemberState } from './state.js';

/**
 * Does a member row physically exist in this Pariwar? Story 3.5 (Task 6) uses this as the
 * explicit pre-check the medical-disclosure submit runs BEFORE `getMemberStateAt` — that
 * accessor is non-nullable (a non-existent member replays to `pending-kyc`), so a clean 409
 * for "member not found" needs a real existence probe (it resolves 3.4's deferred D3). The
 * FK on `member_medical_disclosures → members` is only a data-integrity backstop (it yields a
 * 500, not a clean 409). Tenant-scoped (RLS + the explicit predicate).
 */
export async function memberExists(
  db: Db,
  pariwarId: PariwarId,
  memberId: MemberId,
): Promise<boolean> {
  const rows = await db
    .select({ memberId: members.memberId })
    .from(members)
    .where(and(eq(members.pariwarId, pariwarId), eq(members.memberId, memberId)))
    .limit(1);
  return rows.length > 0;
}

/**
 * Compute a member's lifecycle state as of `atTimestamp` by replaying its event
 * stream up to (and including) that instant, ordered by `event_version`.
 *
 * Tenant scope is enforced by RLS (the caller has set `app.pariwar_id`); the query
 * filters by `stream_id` (= member_id) which is globally unique.
 *
 * Degenerate case: if the member has NO events at/before `atTimestamp` (e.g. a time
 * before signup), the empty replay returns the machine's initial state (`pending-kyc`)
 * — callers query this for members that exist as of the instant in question.
 */
export async function getMemberStateAt(
  db: Db,
  memberId: MemberId,
  atTimestamp: Date,
): Promise<MemberLifecycleState> {
  const rows = await db
    .select()
    .from(eventsLog)
    .where(and(eq(eventsLog.streamId, memberId), lte(eventsLog.occurredAt, atTimestamp)))
    .orderBy(asc(eventsLog.eventVersion));
  return replayMemberState(rows);
}
