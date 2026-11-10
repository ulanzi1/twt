// The field-worker MOVE REQUEST and NOTICE reads — Story 13.1d (decision `2026-11-08-458` AD6, AD9, AD10, as amended by `-460`).
//
// · `pageFieldWorkerMoveRequests` — a district's requests at EITHER end (or, with no district, the whole Pariwar — the Pariwar Admin's
//   view), open or closed, keyset-paged `opened_at DESC, move_request_id DESC`. Returns the worker's NAME ciphertext: the API decrypts it
//   behind ONE audit line a page (AD10).
// · `getFieldWorkerMoveRequest` — one request and its events (`event_version` order; codes only — ⛔ a name, ⛔ an officer's name).
// · `getMoveRequestWorkerHistory` — `-460`'s work history of the request's worker, read at request time from the worker's OWN stream:
//   registered on, active since, each district with its dates, each suspension's dates. It selects ⛔ a reason and ⛔ an actor (I6 as
//   amended by `-460`) — the SQL reads only the event type, version, IST day and district. Bounded (`MOVE_REQUEST_HISTORY_EVENT_CAP`),
//   with `truncated`. The members-onboarded count is NOT here: it cannot be computed before Story 13.8 (`-460` item 4 — C4).
// · `pageFieldWorkerNotices` / `markFieldWorkerNoticesSeen` — the OFFICER's own notices: RLS separates Pariwars only, so both filter
//   `recipient_user_id = <actor>` in SQL (AD9) — another officer's rows are never returned and never changed.
// The two cursors reuse the field-worker list cursor's strict decoder (the same `{c: <timestamptz text>, w: <lower-case uuid>}` shape).

import { and, asc, desc, eq, inArray, isNull, notInArray, or, sql } from 'drizzle-orm';

import type pg from 'pg';

import type { Db } from '../db.js';
import type { FieldWorkerId, FieldWorkerMoveRequestId, FieldWorkerNoticeId, PariwarId } from '../ids/index.js';
import { clampLimit } from '../pagination.js';
import { eventsLog } from '../schema/events_log.js';
import {
  FIELD_WORKER_MOVE_REQUEST_OPEN_STATES,
  fieldWorkerMoveRequests,
  type FieldWorkerMoveOpenedAtEnd,
  type FieldWorkerMoveRefusalReason,
  type FieldWorkerMoveRequestState,
} from '../schema/field_worker_move_requests.js';
import { fieldWorkerNotices, type FieldWorkerNoticeKind } from '../schema/field_worker_notices.js';
import { fieldWorkers, type FieldWorkerState } from '../schema/field_workers.js';
import { users } from '../schema/users.js';
import { decodeFieldWorkerCursor, encodeFieldWorkerCursor } from './read.js';

const NUL = String.fromCharCode(0);

/**
 * The request list decrypts the worker's NAME and writes ONE audit line a page naming the workers on it (AD10); a locator holds 1,024
 * characters, so a page holds at most 25 (the 13.1a list's cap, for the same reason — story 13.1d's AD6 said 100, which cannot keep
 * one line a page). The notices carry no name and keep 100.
 */
export const PAGE_MOVE_REQUESTS_DEFAULT_LIMIT = 20;
export const PAGE_MOVE_REQUESTS_MAX_LIMIT = 25;
export const PAGE_NOTICES_DEFAULT_LIMIT = 50;
export const PAGE_NOTICES_MAX_LIMIT = 100;
/** The work history reads at most this many of the worker's events (`-460` item 3: "at least 200"), and says so if it stops. */
export const MOVE_REQUEST_HISTORY_EVENT_CAP = 500;

/** A keyset position: the exact `timestamptz::text` and the row id. */
export interface MoveRequestPageCursor {
  readonly atExact: string;
  readonly id: string;
}

/** Decode a list cursor STRICTLY, before any SQL (`decodeFieldWorkerCursor`'s checks). @throws FieldWorkerCursorInvalidError */
export function decodeMoveRequestCursor(s: unknown): MoveRequestPageCursor {
  const c = decodeFieldWorkerCursor(s);
  return { atExact: c.createdAtExact, id: c.fieldWorkerId };
}

function encodeCursor(atExact: string, id: string): string {
  return encodeFieldWorkerCursor({ createdAtExact: atExact, fieldWorkerId: id as FieldWorkerId });
}

/**
 * One request as a list shows it — codes and ids; the worker's NAME as ciphertext (the API decrypts it, audited).
 * ⛔ No `escalation_cause`, `supersede_cause` or `answered_at` (decision `2026-11-10-461` item 1): the table keeps them; no read hands them on - a
 * `supersede_cause` of `worker_ended` and the moment the ending was recorded are "the date or fact of an ending" `-460` item 1 withholds.
 */
export interface FieldWorkerMoveRequestListRow {
  readonly moveRequestId: FieldWorkerMoveRequestId;
  readonly fieldWorkerId: FieldWorkerId;
  readonly nameCiphertext: string;
  readonly fromDistrict: string;
  readonly toDistrict: string;
  readonly openedAtEnd: FieldWorkerMoveOpenedAtEnd;
  readonly counterpartDistrict: string;
  readonly state: FieldWorkerMoveRequestState;
  readonly refusalReason: FieldWorkerMoveRefusalReason | null;
  readonly openedBy: string;
  /** The opener's CURRENT display name, or null (never derived — the 6.11 R5 rule). */
  readonly openedByDisplay: string | null;
  readonly openedAt: string;
}

const LIST_COLUMNS = {
  moveRequestId: fieldWorkerMoveRequests.moveRequestId,
  fieldWorkerId: fieldWorkerMoveRequests.fieldWorkerId,
  nameCiphertext: fieldWorkers.nameCiphertext,
  fromDistrict: fieldWorkerMoveRequests.fromDistrict,
  toDistrict: fieldWorkerMoveRequests.toDistrict,
  openedAtEnd: fieldWorkerMoveRequests.openedAtEnd,
  counterpartDistrict: fieldWorkerMoveRequests.counterpartDistrict,
  state: fieldWorkerMoveRequests.state,
  refusalReason: fieldWorkerMoveRequests.refusalReason,
  openedBy: fieldWorkerMoveRequests.openedBy,
  openedByDisplay: users.displayName,
  openedAt: fieldWorkerMoveRequests.openedAt,
  openedAtExact: sql<string>`${fieldWorkerMoveRequests.openedAt}::text`,
};

type ListSelect = {
  [K in keyof typeof LIST_COLUMNS]: unknown;
};

function toListRow(r: ListSelect): FieldWorkerMoveRequestListRow {
  const display = r.openedByDisplay as string | null;
  return {
    moveRequestId: r.moveRequestId as FieldWorkerMoveRequestId,
    fieldWorkerId: r.fieldWorkerId as FieldWorkerId,
    nameCiphertext: r.nameCiphertext as string,
    fromDistrict: r.fromDistrict as string,
    toDistrict: r.toDistrict as string,
    openedAtEnd: r.openedAtEnd as FieldWorkerMoveOpenedAtEnd,
    counterpartDistrict: r.counterpartDistrict as string,
    state: r.state as FieldWorkerMoveRequestState,
    refusalReason: (r.refusalReason as FieldWorkerMoveRefusalReason | null) ?? null,
    openedBy: r.openedBy as string,
    openedByDisplay: display !== null && display.trim() !== '' ? display : null,
    openedAt: new Date(r.openedAt as Date).toISOString(),
  };
}

/**
 * A page of move requests, newest first: those with `district` at EITHER end (byte-equal), or — no district — the whole Pariwar; `open`
 * (`pending`, `escalated`) or `closed` (the five final states). `after` MUST come from `decodeMoveRequestCursor`. A non-integer `limit`
 * throws `RangeError`; the size is `clampLimit`-ed (default 20, ceiling 25). Over-fetches one row for `nextCursor`.
 */
export async function pageFieldWorkerMoveRequests(
  db: Db,
  pariwarId: PariwarId,
  opts: { district?: string; state: 'open' | 'closed'; after?: MoveRequestPageCursor; limit?: number },
): Promise<{ items: FieldWorkerMoveRequestListRow[]; nextCursor: string | null }> {
  if (opts.limit !== undefined && !Number.isInteger(opts.limit)) {
    throw new RangeError(`pageFieldWorkerMoveRequests: limit must be an integer, got ${String(opts.limit)}`);
  }
  if (opts.district !== undefined && opts.district.includes(NUL)) return { items: [], nextCursor: null };
  const limit = clampLimit(opts.limit, { default: PAGE_MOVE_REQUESTS_DEFAULT_LIMIT, cap: PAGE_MOVE_REQUESTS_MAX_LIMIT });
  const t = fieldWorkerMoveRequests;
  const conds = [
    eq(t.pariwarId, pariwarId),
    opts.state === 'open' ? inArray(t.state, [...FIELD_WORKER_MOVE_REQUEST_OPEN_STATES]) : notInArray(t.state, [...FIELD_WORKER_MOVE_REQUEST_OPEN_STATES]),
  ];
  if (opts.district !== undefined) conds.push(or(eq(t.fromDistrict, opts.district), eq(t.toDistrict, opts.district))!);
  if (opts.after !== undefined) {
    conds.push(sql`(${t.openedAt}, ${t.moveRequestId}) < (${opts.after.atExact}::timestamptz, ${opts.after.id}::uuid)`);
  }
  const rows = await db
    .select(LIST_COLUMNS)
    .from(t)
    .innerJoin(fieldWorkers, and(eq(fieldWorkers.pariwarId, t.pariwarId), eq(fieldWorkers.fieldWorkerId, t.fieldWorkerId)))
    .leftJoin(users, eq(users.id, t.openedBy))
    .where(and(...conds))
    .orderBy(desc(t.openedAt), desc(t.moveRequestId))
    .limit(clampLimit(limit + 1, { default: PAGE_MOVE_REQUESTS_DEFAULT_LIMIT + 1, cap: PAGE_MOVE_REQUESTS_MAX_LIMIT + 1 }));
  const page = rows.slice(0, limit);
  const last = page[page.length - 1];
  return {
    items: page.map(toListRow),
    nextCursor: rows.length > limit && last !== undefined ? encodeCursor(last.openedAtExact, last.moveRequestId) : null,
  };
}

/**
 * One event of a request, as its detail shows it — codes only (⛔ an officer's name, ⛔ the authorization, ⛔ a `cause`).
 * `occurredAt` is NULL for the `superseded` event WHATEVER its cause (decision `2026-11-10-461` item 1, CR22 A): a time withheld only for a
 * `worker_ended` supersede would say "ended" by its absence (one rule per surface, never per item). The line is "No longer needed", undated.
 */
export interface FieldWorkerMoveRequestEventView {
  readonly eventVersion: number;
  readonly eventType: string;
  readonly occurredAt: string | null;
  readonly refusalReason: string | null;
}

/**
 * The event types whose time the detail withholds (`-461` item 1). ⚠ LOCKSTEP with the contract's refine on `FieldWorkerMoveRequestEvent`
 * (the contracts' sync-guard compares them): a time withheld here and required there would fail the whole detail (code review R5-6).
 */
export const FIELD_WORKER_UNDATED_MOVE_REQUEST_EVENT_TYPES = ['field_worker_move_request.superseded'] as const;
const UNDATED_EVENT_TYPES: ReadonlySet<string> = new Set<string>(FIELD_WORKER_UNDATED_MOVE_REQUEST_EVENT_TYPES);

/** One request and its events, or null for an unknown / another Pariwar's id. */
export async function getFieldWorkerMoveRequest(
  db: Db,
  pariwarId: PariwarId,
  moveRequestId: FieldWorkerMoveRequestId,
): Promise<{ request: FieldWorkerMoveRequestListRow; events: FieldWorkerMoveRequestEventView[] } | null> {
  const t = fieldWorkerMoveRequests;
  const rows = await db
    .select(LIST_COLUMNS)
    .from(t)
    .innerJoin(fieldWorkers, and(eq(fieldWorkers.pariwarId, t.pariwarId), eq(fieldWorkers.fieldWorkerId, t.fieldWorkerId)))
    .leftJoin(users, eq(users.id, t.openedBy))
    .where(and(eq(t.pariwarId, pariwarId), eq(t.moveRequestId, moveRequestId)))
    .limit(1);
  const row = rows[0];
  if (row === undefined) return null;
  // A request has at most four events (open, escalate, one final act); the literal bound keeps the read finite.
  const events = await db
    .select({
      eventVersion: eventsLog.eventVersion,
      eventType: eventsLog.eventType,
      occurredAt: eventsLog.occurredAt,
      refusalReason: sql<string | null>`${eventsLog.payload}->>'refusal_reason'`,
    })
    .from(eventsLog)
    .where(and(eq(eventsLog.pariwarId, pariwarId), eq(eventsLog.streamId, moveRequestId)))
    .orderBy(asc(eventsLog.eventVersion))
    .limit(20);
  return {
    request: toListRow(row),
    events: events.map((e) => ({
      eventVersion: Number(e.eventVersion),
      eventType: e.eventType,
      occurredAt: UNDATED_EVENT_TYPES.has(e.eventType) ? null : new Date(e.occurredAt).toISOString(),
      refusalReason: e.refusalReason ?? null,
    })),
  };
}

/**
 * A district the worker reported to, and when (IST days). `to` null = OPEN-ENDED: the district the worker is in now — or, for a worker whose
 * work has ended, the last one: the ending's date is WITHHELD (`-460` item 1: "the last one open-ended"; ⛔ "the date or fact of an ending
 * beyond the state's name" — the SQL reads no `field_worker.terminated`). Read `currentState` for whether the worker is still there.
 */
export interface WorkHistoryDistrict {
  readonly district: string;
  readonly from: string;
  readonly to: string | null;
}
/** A suspension's days (IST; `to` null = OPEN-ENDED: still suspended, or suspended when the work ended — ⛔ that ending's date). ⛔ Its reason (`-460` item 1). */
export interface WorkHistorySuspension {
  readonly from: string;
  readonly to: string | null;
}
/** `-460` item 1's work history — dates, districts and the current state's NAME only. */
export interface MoveRequestWorkerHistory {
  readonly fieldWorkerId: FieldWorkerId;
  readonly nameCiphertext: string;
  readonly currentState: FieldWorkerState;
  readonly registeredOn: string | null;
  readonly activeSince: string | null;
  readonly districts: WorkHistoryDistrict[];
  readonly suspensions: WorkHistorySuspension[];
  /**
   * True when the read stopped at `MOVE_REQUEST_HISTORY_EVENT_CAP` events. It keeps the OLDEST events, so `districts` then ends on an OLD
   * district, ⛔ the worker's current one — a consumer that shows the history says it is incomplete (code review CR13).
   */
  readonly truncated: boolean;
}

/**
 * The pure fold of the history rows — exported for its unit test. The rows MUST arrive in event-version order (the reader's `ORDER BY`);
 * the fold does not sort. It knows five event types and ignores every other, `field_worker.terminated` included (`-460` item 1: ⛔ the date
 * or fact of an ending beyond the state's name), so a worker's last district and an open suspension stay open-ended.
 */
export function foldWorkHistory(
  rows: ReadonlyArray<{ eventType: string; day: string; district: string | null }>,
): Pick<MoveRequestWorkerHistory, 'registeredOn' | 'activeSince' | 'districts' | 'suspensions'> {
  let registeredOn: string | null = null;
  let activeSince: string | null = null;
  const districts: Array<{ district: string; from: string; to: string | null }> = [];
  const suspensions: Array<{ from: string; to: string | null }> = [];
  for (const r of rows) {
    switch (r.eventType) {
      case 'field_worker.registered':
        registeredOn = r.day;
        if (r.district !== null) districts.push({ district: r.district, from: r.day, to: null });
        break;
      case 'field_worker.activated':
        if (activeSince === null) activeSince = r.day;
        break;
      case 'field_worker.posted': {
        const open = districts[districts.length - 1];
        if (open !== undefined && open.to === null) open.to = r.day;
        if (r.district !== null) districts.push({ district: r.district, from: r.day, to: null });
        break;
      }
      case 'field_worker.suspended':
        suspensions.push({ from: r.day, to: null });
        break;
      case 'field_worker.reactivated': {
        const open = suspensions[suspensions.length - 1];
        if (open !== undefined && open.to === null) open.to = r.day;
        break;
      }
      default:
        break;
    }
  }
  return { registeredOn, activeSince, districts, suspensions };
}

/**
 * `-460` — the work history of the worker a request is about, or null for an unknown / another Pariwar's request. Reads the worker's
 * OWN stream: ONLY the event type, version, IST day and the district (`district` on `registered`, `to_district` on `posted`) — the SQL
 * selects ⛔ a reason, ⛔ an actor, ⛔ an authorization, and filters ⛔ `field_worker.terminated` out (`-460` item 1: the ending's date is not
 * shown; `currentState` carries the state's NAME). Returns the NAME ciphertext (the API decrypts it, audit first).
 */
export async function getMoveRequestWorkerHistory(
  db: Db,
  pariwarId: PariwarId,
  moveRequestId: FieldWorkerMoveRequestId,
): Promise<MoveRequestWorkerHistory | null> {
  const head = await db
    .select({ fieldWorkerId: fieldWorkers.fieldWorkerId, nameCiphertext: fieldWorkers.nameCiphertext, currentState: fieldWorkers.currentState })
    .from(fieldWorkerMoveRequests)
    .innerJoin(
      fieldWorkers,
      and(eq(fieldWorkers.pariwarId, fieldWorkerMoveRequests.pariwarId), eq(fieldWorkers.fieldWorkerId, fieldWorkerMoveRequests.fieldWorkerId)),
    )
    .where(and(eq(fieldWorkerMoveRequests.pariwarId, pariwarId), eq(fieldWorkerMoveRequests.moveRequestId, moveRequestId)))
    .limit(1);
  const w = head[0];
  if (w === undefined) return null;
  const rows = await db
    .select({
      eventType: eventsLog.eventType,
      day: sql<string>`((${eventsLog.occurredAt} AT TIME ZONE 'Asia/Kolkata')::date)::text`,
      district: sql<string | null>`COALESCE(${eventsLog.payload}->>'district', ${eventsLog.payload}->>'to_district')`,
    })
    .from(eventsLog)
    .where(
      and(
        eq(eventsLog.pariwarId, pariwarId),
        eq(eventsLog.streamId, w.fieldWorkerId),
        inArray(eventsLog.eventType, ['field_worker.registered', 'field_worker.activated', 'field_worker.posted', 'field_worker.suspended', 'field_worker.reactivated']),
      ),
    )
    .orderBy(asc(eventsLog.eventVersion))
    // `MOVE_REQUEST_HISTORY_EVENT_CAP + 1` as an integer literal (the domain-invariants gate) — the extra row only PROVES the cap was hit.
    .limit(501);
  const truncated = rows.length > MOVE_REQUEST_HISTORY_EVENT_CAP;
  return {
    fieldWorkerId: w.fieldWorkerId,
    nameCiphertext: w.nameCiphertext,
    currentState: w.currentState,
    ...foldWorkHistory(rows.slice(0, MOVE_REQUEST_HISTORY_EVENT_CAP)),
    truncated,
  };
}

/**
 * One of the officer's notices — ids, districts and codes (⛔ a name). `createdAt` is NULL for `move_request_superseded` WHATEVER its cause
 * (decision `2026-11-10-462`; `-460` item 1): for an ending it is the moment the ending was recorded, and a time withheld only for an ending
 * would say "ended" by its absence. RECORDED residuals: the page is ordered by that time, `nextCursor` carries it exactly when the page
 * ends on such a notice (`-462` item 2), and the cursor is NOT signed (`decodeFieldWorkerCursor` takes any well-formed time) - a recipient
 * who forges cursors can find the exact time by bisection, ~40 reads (code review R5-D1; BigDev: record it and ship - a signed cursor, `-462`'s
 * option C, stays a later change).
 */
export interface FieldWorkerNoticeView {
  readonly noticeId: FieldWorkerNoticeId;
  readonly kind: FieldWorkerNoticeKind;
  readonly fieldWorkerId: FieldWorkerId;
  readonly moveRequestId: FieldWorkerMoveRequestId | null;
  readonly fromDistrict: string;
  readonly toDistrict: string;
  readonly refusalReason: FieldWorkerMoveRefusalReason | null;
  readonly createdAt: string | null;
  readonly seenAt: string | null;
}

/**
 * The notice kinds whose time the read withholds (`-462`). ⚠ LOCKSTEP with the contract's refine on `FieldWorkerNoticeItem` (the contracts'
 * sync-guard compares them): a mismatch fails the WHOLE notices page - and the nav's unseen count with it - not one stamp (code review R5-6).
 */
export const FIELD_WORKER_UNDATED_NOTICE_KINDS = ['move_request_superseded'] as const satisfies readonly FieldWorkerNoticeKind[];
const UNDATED_NOTICE_KINDS: ReadonlySet<FieldWorkerNoticeKind> = new Set<FieldWorkerNoticeKind>(FIELD_WORKER_UNDATED_NOTICE_KINDS);

/**
 * A page of the OFFICER's own notices (`recipient_user_id = recipientUserId`, AD9), newest first. `after` MUST come from
 * `decodeMoveRequestCursor`. A non-integer `limit` throws `RangeError`; `clampLimit`-ed (default 50, ceiling 100).
 */
export async function pageFieldWorkerNotices(
  db: Db,
  pariwarId: PariwarId,
  recipientUserId: string,
  opts: { after?: MoveRequestPageCursor; limit?: number } = {},
): Promise<{ items: FieldWorkerNoticeView[]; nextCursor: string | null }> {
  if (opts.limit !== undefined && !Number.isInteger(opts.limit)) {
    throw new RangeError(`pageFieldWorkerNotices: limit must be an integer, got ${String(opts.limit)}`);
  }
  const limit = clampLimit(opts.limit, { default: PAGE_NOTICES_DEFAULT_LIMIT, cap: PAGE_NOTICES_MAX_LIMIT });
  const n = fieldWorkerNotices;
  const conds = [eq(n.pariwarId, pariwarId), eq(n.recipientUserId, recipientUserId)];
  if (opts.after !== undefined) conds.push(sql`(${n.createdAt}, ${n.noticeId}) < (${opts.after.atExact}::timestamptz, ${opts.after.id}::uuid)`);
  const rows = await db
    .select({
      noticeId: n.noticeId,
      kind: n.kind,
      fieldWorkerId: n.fieldWorkerId,
      moveRequestId: n.moveRequestId,
      fromDistrict: n.fromDistrict,
      toDistrict: n.toDistrict,
      refusalReason: n.refusalReason,
      createdAt: n.createdAt,
      seenAt: n.seenAt,
      createdAtExact: sql<string>`${n.createdAt}::text`,
    })
    .from(n)
    .where(and(...conds))
    .orderBy(desc(n.createdAt), desc(n.noticeId))
    .limit(clampLimit(limit + 1, { default: PAGE_NOTICES_DEFAULT_LIMIT + 1, cap: PAGE_NOTICES_MAX_LIMIT + 1 }));
  const page = rows.slice(0, limit);
  const last = page[page.length - 1];
  return {
    items: page.map((r) => ({
      noticeId: r.noticeId,
      kind: r.kind,
      fieldWorkerId: r.fieldWorkerId,
      moveRequestId: r.moveRequestId ?? null,
      fromDistrict: r.fromDistrict,
      toDistrict: r.toDistrict,
      refusalReason: r.refusalReason ?? null,
      createdAt: UNDATED_NOTICE_KINDS.has(r.kind) ? null : new Date(r.createdAt).toISOString(),
      seenAt: r.seenAt === null ? null : new Date(r.seenAt).toISOString(),
    })),
    nextCursor: rows.length > limit && last !== undefined ? encodeCursor(last.createdAtExact, last.noticeId) : null,
  };
}

/** The most notice ids one seen mark takes (AD6). */
export const MARK_NOTICES_SEEN_MAX = 100;

/**
 * Mark the OFFICER's own notices seen, once: only rows whose `recipient_user_id` is the officer and whose `seen_at` is NULL change —
 * another officer's ids, an unknown id and an already-seen one are ignored (no error, no change; AD9). Returns how many changed.
 */
export async function markFieldWorkerNoticesSeen(
  db: Db,
  pariwarId: PariwarId,
  recipientUserId: string,
  noticeIds: readonly FieldWorkerNoticeId[],
): Promise<number> {
  if (noticeIds.length === 0) return 0;
  if (noticeIds.length > MARK_NOTICES_SEEN_MAX) throw new RangeError(`markFieldWorkerNoticesSeen: at most ${String(MARK_NOTICES_SEEN_MAX)} ids`);
  const n = fieldWorkerNotices;
  const updated = await db
    .update(n)
    .set({ seenAt: sql`now()` })
    .where(and(eq(n.pariwarId, pariwarId), eq(n.recipientUserId, recipientUserId), inArray(n.noticeId, [...noticeIds]), isNull(n.seenAt)))
    .returning({ noticeId: n.noticeId });
  return updated.length;
}

/** What a gate loader and a handler's pre-read need of a request. */
export interface MoveRequestGateRow {
  readonly fieldWorkerId: FieldWorkerId;
  readonly fromDistrict: string;
  readonly toDistrict: string;
  readonly openedAtEnd: FieldWorkerMoveOpenedAtEnd;
  readonly counterpartDistrict: string;
  readonly state: FieldWorkerMoveRequestState;
  readonly openedBy: string;
}

/** The request row a gate loader and a handler's pre-read need, or null (AD6: a missing / foreign id is 403 for all). */
export async function getMoveRequestGateRow(
  db: Db,
  pariwarId: PariwarId,
  moveRequestId: FieldWorkerMoveRequestId,
): Promise<MoveRequestGateRow | null> {
  const t = fieldWorkerMoveRequests;
  const rows = await db
    .select({
      fieldWorkerId: t.fieldWorkerId,
      fromDistrict: t.fromDistrict,
      toDistrict: t.toDistrict,
      openedAtEnd: t.openedAtEnd,
      counterpartDistrict: t.counterpartDistrict,
      state: t.state,
      openedBy: t.openedBy,
    })
    .from(t)
    .where(and(eq(t.pariwarId, pariwarId), eq(t.moveRequestId, moveRequestId)))
    .limit(1);
  return rows[0] ?? null;
}

/** True when the worker has an OPEN (`pending` / `escalated`) request — the open route's pre-read (AD6; the partial unique decides a race). */
export async function hasOpenMoveRequest(db: Db, pariwarId: PariwarId, fieldWorkerId: FieldWorkerId): Promise<boolean> {
  const t = fieldWorkerMoveRequests;
  const rows = await db
    .select({ one: sql<number>`1` })
    .from(t)
    .where(and(eq(t.pariwarId, pariwarId), eq(t.fieldWorkerId, fieldWorkerId), inArray(t.state, [...FIELD_WORKER_MOVE_REQUEST_OPEN_STATES])))
    .limit(1);
  return rows.length > 0;
}

/** The escalation sweep's bound a tick (AD8 (a)) — hitting it is alarmed; the next tick starts again from the oldest. */
export const STALE_MOVE_REQUESTS_TICK_MAX = 200;

/**
 * AD8 (a) — the CROSS-TENANT selector of the escalation sweep: `pending` requests opened at least 7 × 24 h ago by the DATABASE clock
 * (TR3), oldest first, at most `limit`. On a pool whose role can read across Pariwars (roster Row 26 — the caller checks it first). A
 * plain read: each row is re-judged under its locks (`escalateStaleMoveRequest`), so a row escalated or answered meanwhile is a no-op.
 *
 * ⚠ DELIBERATE (checklist 9; code review CR15): this reads EVERY Pariwar's rows on a raw pool — the one cross-tenant read of the
 * move-request module, a platform-wide sweep selecting ids only (⛔ a name, ⛔ a district). The Row 26 guard (the pool's role) is the
 * CALLER's, `apps/jobs`. The per-row writes that follow run on that same login with RLS waived too, held apart only by each command's explicit
 * `pariwar_id` predicate (the sweep's header, CR39). RE-EXAMINE if it is ever called from a request path, or if the sweep moves to an RLS-bound login.
 * @throws RangeError for a `limit` that is not an integer (the page reads' guard — `clampLimit` passes 1.5 and NaN through to Postgres).
 */
export async function findStaleMoveRequests(
  pool: pg.Pool,
  opts: { limit?: number } = {},
): Promise<Array<{ pariwarId: PariwarId; moveRequestId: FieldWorkerMoveRequestId }>> {
  if (opts.limit !== undefined && !Number.isInteger(opts.limit)) {
    throw new RangeError(`findStaleMoveRequests: limit must be an integer, got ${String(opts.limit)}`);
  }
  const limit = clampLimit(opts.limit, { default: STALE_MOVE_REQUESTS_TICK_MAX, cap: STALE_MOVE_REQUESTS_TICK_MAX });
  const r = await pool.query<{ pariwar_id: string; move_request_id: string }>(
    `SELECT pariwar_id, move_request_id FROM field_worker_move_requests
      WHERE state = 'pending' AND opened_at <= now() - interval '7 days'
      ORDER BY opened_at, move_request_id
      LIMIT $1`,
    [limit],
  );
  return r.rows.map((x) => ({ pariwarId: x.pariwar_id as PariwarId, moveRequestId: x.move_request_id as FieldWorkerMoveRequestId }));
}
