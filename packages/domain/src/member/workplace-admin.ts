// Keeping the workplace list full — the Super Admin's list, the Pariwar Admin's *"isn't listed"* queue and suggestion, and the
// MEMBER's answer (Story 6.36c, Task 3.1; AC2–AC4; `-330` SW9 A, `-342` calls 3–4).
//
// ⭐ A SUGGESTION DECIDES ⛔ NOTHING (SW9 A, I2). A Pariwar Admin points an open request at a LISTED entry IN THE REQUEST'S
// DISTRICT; ⛔ no staff function here writes a posting, sets a member's workplace or creates one from a request. Only the
// MEMBER's *"Yes"* (`answerWorkplaceSuggestion`, on the member's own transaction) writes a posting — through the ONE writer
// (`insertMemberPosting`), which 6.36 reads like any other posting, as of the cut (SW20, `-339`).
// ⭐ ONLY THE SUPER ADMIN ADDS (SW9 A). A staff row is `source = 'staff'`, `created_by_actor_id` = the actor; an import ⛔
// never touches it (6.36a I3). Rename / delist / relist apply to STAFF rows ONLY (`-342` call 4 — RV3): the import re-sets
// an imported row's name, district and listing on every run, so a staff edit to one would be silently undone; an imported
// school is corrected by the import. ⛔ Never a delete — a delisted entry stays on every posting that names it.
// ⭐ ONE LOCK ORDER EVERYWHERE: district → workplace → request (the rename CLI's — it retires the district, moves the
// workplaces, then the open requests). `lockListedWorkplace` takes the district and the workplace `FOR SHARE`; the request is
// then locked `FOR UPDATE`. Close and "No" lock only the request. An inverted order is a 40P01 surfacing as a 500.
// ⭐ THE REFUSALS ARE KEYED ON THE WORKPLACE AND THE REQUEST — ⛔ on anything about the member (an oracle for withheld data).
// The queue carries ⛔ member data: ⛔ a name, a mobile, a member id (⛔ needed to find a place).
// ⚠ AUDIT is the route's post-commit log line (RV9 (iii)); the ACTOR is in the row only for an add and a suggestion.
//
// TENANT-scoped: every statement runs on the caller's scoped `db` and names `pariwar_id`. NO HTTP, NO audit, NO event.

import { and, asc, eq, sql, type SQL } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { MemberId, PariwarId, WorkplaceId, WorkplaceRequestId } from '../ids/index.js';
import { workplaceId as toWorkplaceId, workplaceRequestId as toWorkplaceRequestId } from '../ids/index.js';
import { clampLimit } from '../pagination.js';
import { type WorkplaceKind, type WorkplaceSource, type WorkplaceStatus, workplaces } from '../schema/workplaces.js';
import { insertMemberPosting } from './posting.js';
import {
  decodeWorkplaceCursor,
  encodeWorkplaceCursor,
  escapeLikePattern,
  isValidStartDate,
  isWorkplaceUuid,
  latestPostingStartedOn,
  lockListedDistrict,
  lockListedWorkplace,
  lockMemberPostingWrites,
  WORKPLACE_SEARCH_TEXT_MAX,
  WorkplaceCursorInvalidError,
} from './workplace.js';

// ── Bounds ─────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** One page of the Super Admin's list (and the suggest picker's search). */
export const WORKPLACE_ADMIN_LIST_LIMIT = { default: 50, cap: 100 } as const;
/** One page of the Pariwar Admin's queue. */
export const WORKPLACE_REQUEST_QUEUE_LIMIT = { default: 50, cap: 100 } as const;
/** A staff workplace name — 0161's CHECK (1–200). */
export const STAFF_WORKPLACE_NAME_MAX = 200;
/** A staff workplace's village — the same bound as the typed place. */
export const STAFF_WORKPLACE_VILLAGE_MAX = 120;

// ── Refusals ───────────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * The staff writes' refusals (AC2, AC3). The HTTP status is mapped PER ROUTE, ⛔ per code: `workplace.not_found` is a 404 on
 * the `/:workplaceId/*` routes and a 422 on the suggest body's `workplaceId`. ⚠ LOCKSTEP with the contracts' mirror. ⛔ The
 * posting route's `WORKPLACE_REFUSAL_CODES` are a separate list (unchanged).
 */
export const WORKPLACE_ADMIN_REFUSAL_CODES = [
  'workplace.not_found',
  'workplace.district_not_found',
  'workplace.district_mismatch',
  'workplace.import_managed',
  'workplace.state_unchanged',
  'workplace.code_taken',
  'workplace.request_not_found',
  'workplace.request_closed',
] as const;
export type WorkplaceAdminRefusalCode = (typeof WORKPLACE_ADMIN_REFUSAL_CODES)[number];

export class WorkplaceAdminRefusedError extends Error {
  public constructor(public readonly code: WorkplaceAdminRefusalCode) {
    // ⛔ No input in the message (it reaches logs).
    super(`[workplace-admin] refused: ${code}`);
    this.name = 'WorkplaceAdminRefusedError';
  }
}

/** The member's answer route's refusals (AC4). ⚠ LOCKSTEP with the contracts' mirror. */
export const WORKPLACE_ANSWER_REFUSAL_CODES = [
  'workplace.request_not_found',
  'workplace.request_closed',
  'workplace.suggestion_stale',
  'workplace.start_date_invalid',
] as const;
export type WorkplaceAnswerRefusalCode = (typeof WORKPLACE_ANSWER_REFUSAL_CODES)[number];

export class WorkplaceAnswerRefusedError extends Error {
  public constructor(public readonly code: WorkplaceAnswerRefusalCode) {
    super(`[workplace-answer] refused: ${code}`);
    this.name = 'WorkplaceAnswerRefusedError';
  }
}

// ── Pure helpers ───────────────────────────────────────────────────────────────────────────────────────────────────────

const CONTROL_RE = /\p{Cc}/u;

/**
 * A staff-entered name or village, TRIMMED, or `null` when it is blank, longer than `max` code points or carries a control
 * character (`\p{Cc}` — the search cursor's bound depends on it). The contract refuses the same input first (a 400); this
 * is the defence behind it.
 */
export function normalizeStaffWorkplaceText(text: string, max: number): string | null {
  const trimmed = text.trim();
  const len = [...trimmed].length;
  if (len < 1 || len > max || CONTROL_RE.test(trimmed)) return null;
  return trimmed;
}

function requireStaffText(text: string, max: number): string {
  const ok = normalizeStaffWorkplaceText(text, max);
  // Unreachable through the route (the contract refuses it first) — a programming error, ⛔ a member-facing refusal.
  if (ok === null) throw new TypeError('[workplace-admin] a staff workplace text failed the contract rules');
  return ok;
}

function isUniqueViolation(err: unknown, constraint: string): boolean {
  const e = err as { code?: string; constraint?: string; cause?: { code?: string; constraint?: string } };
  return (e.code === '23505' && e.constraint === constraint) || (e.cause?.code === '23505' && e.cause.constraint === constraint);
}

// ── The Super Admin's list (AC2) ───────────────────────────────────────────────────────────────────────────────────────

export interface AdminWorkplace {
  readonly workplaceId: WorkplaceId;
  readonly kind: WorkplaceKind;
  readonly name: string;
  readonly district: string;
  readonly villageName: string | null;
  readonly blockCode: string | null;
  readonly udiseSchoolCode: string | null;
  readonly source: WorkplaceSource;
  readonly status: WorkplaceStatus;
}

export interface AdminPage<T> {
  readonly items: T[];
  readonly nextCursor: string | null;
  readonly hasMore: boolean;
}

const adminColumns = {
  workplaceId: workplaces.workplaceId,
  kind: workplaces.kind,
  name: workplaces.name,
  district: workplaces.district,
  villageName: workplaces.villageName,
  blockCode: workplaces.blockCode,
  udiseSchoolCode: workplaces.udiseSchoolCode,
  source: workplaces.source,
  status: workplaces.status,
};

/**
 * The Pariwar's workplaces for staff — filtered IN SQL (⛔ after the `LIMIT` — 6.19c's recorded defect): `district?`,
 * `kind?`, `status` (default `listed`), `q?` (the name contains it, case-folded, ESCAPED for `ILIKE`); A–Z by name then id;
 * keyset-paginated (`clampLimit`).
 */
export async function listWorkplacesForAdmin(
  db: Db,
  input: {
    pariwarId: PariwarId;
    district?: string | undefined;
    kind?: WorkplaceKind | undefined;
    status?: WorkplaceStatus | undefined;
    q?: string | undefined;
    limit?: number | undefined;
    cursor?: string | undefined;
  },
): Promise<AdminPage<AdminWorkplace>> {
  const limit = clampLimit(input.limit, WORKPLACE_ADMIN_LIST_LIMIT);
  const conditions: SQL[] = [eq(workplaces.pariwarId, input.pariwarId), eq(workplaces.status, input.status ?? 'listed')];
  if (input.district !== undefined) conditions.push(eq(workplaces.district, input.district));
  if (input.kind !== undefined) conditions.push(eq(workplaces.kind, input.kind));
  const q = [...(input.q ?? '').trim()].slice(0, WORKPLACE_SEARCH_TEXT_MAX).join('').trim();
  if (q !== '') conditions.push(sql`${workplaces.name} ILIKE ${`%${escapeLikePattern(q)}%`} ESCAPE '\\'`);
  if (input.cursor !== undefined) {
    const [name, id] = decodeWorkplaceCursor(input.cursor, 2) as [string, string];
    if (!isWorkplaceUuid(id)) throw new WorkplaceCursorInvalidError();
    conditions.push(sql`(${workplaces.name}, ${workplaces.workplaceId}) > (${name}, ${id}::uuid)`);
  }
  const rows = await db
    .select(adminColumns)
    .from(workplaces)
    .where(and(...conditions))
    .orderBy(asc(workplaces.name), asc(workplaces.workplaceId))
    .limit(clampLimit(limit + 1, { default: WORKPLACE_ADMIN_LIST_LIMIT.default + 1, cap: WORKPLACE_ADMIN_LIST_LIMIT.cap + 1 }));
  const hasMore = rows.length > limit;
  const items = rows.slice(0, limit);
  const last = items[items.length - 1];
  return { items, hasMore, nextCursor: hasMore && last ? encodeWorkplaceCursor([last.name, last.workplaceId]) : null };
}

export interface AddStaffWorkplaceInput {
  readonly pariwarId: PariwarId;
  readonly actorId: string;
  readonly kind: WorkplaceKind;
  readonly name: string;
  readonly district: string;
  readonly villageName?: string | null | undefined;
  readonly blockCode?: string | null | undefined;
  readonly udiseSchoolCode?: string | null | undefined;
}

/**
 * The Super Admin ADDS an office, or a school the import missed (`source = 'staff'`, `created_by_actor_id` = the actor —
 * RV9 (ii)). The district must be a LISTED spelling, read `FOR SHARE` (⛔ a new spelling minted here — 6.36a SW5) ⇒ a Pariwar
 * with ⛔ import can add ⛔ office (recorded). A school's UDISE code already held by the Pariwar (either source) ⇒
 * `code_taken`.
 */
export async function addStaffWorkplace(db: Db, input: AddStaffWorkplaceInput): Promise<AdminWorkplace> {
  const name = requireStaffText(input.name, STAFF_WORKPLACE_NAME_MAX);
  const villageName = input.villageName == null || input.villageName.trim() === '' ? null : requireStaffText(input.villageName, STAFF_WORKPLACE_VILLAGE_MAX);
  const code = input.kind === 'school' ? (input.udiseSchoolCode ?? null) : null;
  if (!(await lockListedDistrict(db, input.pariwarId, input.district))) throw new WorkplaceAdminRefusedError('workplace.district_not_found');
  if (code !== null) {
    const taken = await db
      .select({ id: workplaces.workplaceId })
      .from(workplaces)
      .where(and(eq(workplaces.pariwarId, input.pariwarId), eq(workplaces.udiseSchoolCode, code)))
      .limit(1);
    if (taken.length > 0) throw new WorkplaceAdminRefusedError('workplace.code_taken');
  }
  try {
    const inserted = await db
      .insert(workplaces)
      .values({
        pariwarId: input.pariwarId,
        kind: input.kind,
        name,
        district: input.district,
        villageName,
        blockCode: input.blockCode ?? null,
        udiseSchoolCode: code,
        source: 'staff',
        status: 'listed',
        createdByActorId: input.actorId,
      })
      .returning(adminColumns);
    const row = inserted[0];
    if (!row) throw new Error('[addStaffWorkplace] insert returned no row — check session scope');
    return row;
  } catch (err) {
    // A concurrent add of the same code (the pre-read raced).
    if (isUniqueViolation(err, 'workplaces_pariwar_udise_uq')) throw new WorkplaceAdminRefusedError('workplace.code_taken');
    throw err;
  }
}

/** Lock one workplace `FOR UPDATE`; unknown / another Pariwar's ⇒ `not_found`; an imported one ⇒ `import_managed` (RV3). */
async function lockStaffWorkplace(db: Db, pariwarId: PariwarId, workplaceId: string): Promise<AdminWorkplace> {
  if (!isWorkplaceUuid(workplaceId)) throw new WorkplaceAdminRefusedError('workplace.not_found');
  const rows = await db
    .select(adminColumns)
    .from(workplaces)
    .where(and(eq(workplaces.pariwarId, pariwarId), eq(workplaces.workplaceId, workplaceId as WorkplaceId)))
    .for('update');
  const w = rows[0];
  if (!w) throw new WorkplaceAdminRefusedError('workplace.not_found');
  if (w.source !== 'staff') throw new WorkplaceAdminRefusedError('workplace.import_managed');
  return w;
}

/** Rename a STAFF row (the name rules of an add). ⛔ An imported row (RV3). */
export async function renameStaffWorkplace(db: Db, input: { pariwarId: PariwarId; workplaceId: string; name: string }): Promise<AdminWorkplace> {
  const name = requireStaffText(input.name, STAFF_WORKPLACE_NAME_MAX);
  const w = await lockStaffWorkplace(db, input.pariwarId, input.workplaceId);
  const updated = await db
    .update(workplaces)
    .set({ name, updatedAt: sql`now()` })
    .where(and(eq(workplaces.pariwarId, input.pariwarId), eq(workplaces.workplaceId, w.workplaceId)))
    .returning(adminColumns);
  return updated[0]!;
}

/**
 * Delist (`listed: false`) or relist a STAFF row. ⛔ An imported row (RV3); a row already in that state ⇒ `state_unchanged`.
 * ⛔ Never a delete — a delisted entry stays on every posting (I3).
 */
export async function setStaffWorkplaceListed(
  db: Db,
  input: { pariwarId: PariwarId; workplaceId: string; listed: boolean },
): Promise<AdminWorkplace> {
  const w = await lockStaffWorkplace(db, input.pariwarId, input.workplaceId);
  const status: WorkplaceStatus = input.listed ? 'listed' : 'delisted';
  if (w.status === status) throw new WorkplaceAdminRefusedError('workplace.state_unchanged');
  const updated = await db
    .update(workplaces)
    .set({ status, updatedAt: sql`now()` })
    .where(and(eq(workplaces.pariwarId, input.pariwarId), eq(workplaces.workplaceId, w.workplaceId)))
    .returning(adminColumns);
  return updated[0]!;
}

// ── The Pariwar Admin's queue (AC3) ────────────────────────────────────────────────────────────────────────────────────

/** One request in the queue — ⛔ the member's name, mobile, id or any other member data. */
export interface WorkplaceRequestForReview {
  readonly requestId: WorkplaceRequestId;
  readonly typedName: string | null;
  readonly typedPlace: string | null;
  readonly district: string;
  readonly startedOn: string;
  /** UTC ISO with µs (a cursor part). */
  readonly createdAt: string;
  readonly state: 'pending' | 'suggested';
  /** The Pariwar's OTHER `pending` requests with the same typed name, case- and space-folded (an erased name ⇒ 0). */
  readonly sameNameCount: number;
  readonly suggested: { readonly workplaceId: WorkplaceId; readonly name: string; readonly district: string } | null;
}

/** The typed name, case- and space-folded. ⚠ `\\s+` in this source is `\s+` in the SQL. */
function foldedName(col: SQL): SQL {
  return sql`lower(regexp_replace(btrim(${col}), '\\s+', ' ', 'g'))`;
}

const CREATED_AT_CURSOR_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/;

/**
 * The Pariwar's open requests of ONE state (`pending` by default, or `suggested`), optionally ONE district, newest first
 * (`created_at DESC, request_id DESC`), keyset-paginated, filtered IN SQL (the open index). The same-name count is a
 * correlated count, ⛔ an N+1.
 */
export async function listWorkplaceRequestsForReview(
  db: Db,
  input: {
    pariwarId: PariwarId;
    state?: 'pending' | 'suggested' | undefined;
    district?: string | undefined;
    limit?: number | undefined;
    cursor?: string | undefined;
  },
): Promise<AdminPage<WorkplaceRequestForReview>> {
  const limit = clampLimit(input.limit, WORKPLACE_REQUEST_QUEUE_LIMIT);
  const state = input.state ?? 'pending';
  const district = input.district === undefined ? sql`` : sql`AND r.district = ${input.district}`;
  let after = sql``;
  if (input.cursor !== undefined) {
    const [createdAt, id] = decodeWorkplaceCursor(input.cursor, 2) as [string, string];
    if (!isWorkplaceUuid(id) || !CREATED_AT_CURSOR_RE.test(createdAt) || !Number.isFinite(Date.parse(createdAt))) {
      throw new WorkplaceCursorInvalidError();
    }
    after = sql`AND (r.created_at, r.request_id) < (${createdAt}::timestamptz, ${id}::uuid)`;
  }
  const rows = await db.execute<{
    request_id: string;
    typed_name: string | null;
    typed_place: string | null;
    district: string;
    started_on: string;
    created_at: string;
    state: 'pending' | 'suggested';
    same_name_count: string | number;
    suggested_id: string | null;
    suggested_name: string | null;
    suggested_district: string | null;
  }>(sql`
    SELECT r.request_id, r.typed_name, r.typed_place, r.district, to_char(r.started_on, 'YYYY-MM-DD') AS started_on,
           to_char(r.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS created_at, r.state,
           CASE WHEN r.typed_name IS NULL THEN 0 ELSE (
             SELECT count(*) FROM workplace_requests o
              WHERE o.pariwar_id = r.pariwar_id AND o.state = 'pending' AND o.request_id <> r.request_id
                AND o.typed_name IS NOT NULL AND ${foldedName(sql`o.typed_name`)} = ${foldedName(sql`r.typed_name`)}
           ) END AS same_name_count,
           w.workplace_id AS suggested_id, w.name AS suggested_name, w.district AS suggested_district
      FROM workplace_requests r
      LEFT JOIN workplaces w ON r.state = 'suggested' AND w.pariwar_id = r.pariwar_id AND w.workplace_id = r.suggested_workplace_id
     WHERE r.pariwar_id = ${input.pariwarId} AND r.state = ${state} ${district} ${after}
     ORDER BY r.created_at DESC, r.request_id DESC
     LIMIT ${clampLimit(limit + 1, { default: WORKPLACE_REQUEST_QUEUE_LIMIT.default + 1, cap: WORKPLACE_REQUEST_QUEUE_LIMIT.cap + 1 })}`);
  const hasMore = rows.rows.length > limit;
  const items: WorkplaceRequestForReview[] = rows.rows.slice(0, limit).map((r) => ({
    requestId: toWorkplaceRequestId(r.request_id),
    typedName: r.typed_name,
    typedPlace: r.typed_place,
    district: r.district,
    startedOn: r.started_on,
    createdAt: r.created_at,
    state: r.state,
    sameNameCount: Number(r.same_name_count),
    suggested:
      r.suggested_id !== null && r.suggested_name !== null && r.suggested_district !== null
        ? { workplaceId: toWorkplaceId(r.suggested_id), name: r.suggested_name, district: r.suggested_district }
        : null,
  }));
  const last = items[items.length - 1];
  return { items, hasMore, nextCursor: hasMore && last ? encodeWorkplaceCursor([last.createdAt, last.requestId]) : null };
}

type LockedRequest = {
  request_id: string;
  member_id: string;
  district: string;
  state: string;
  started_on: string;
  suggested_workplace_id: string | null;
};

/** One request of the Pariwar `FOR UPDATE` (optionally ONLY the caller's), or `null`. */
async function lockRequest(db: Db, pariwarId: PariwarId, requestId: string, memberId?: MemberId): Promise<LockedRequest | null> {
  if (!isWorkplaceUuid(requestId)) return null;
  const own = memberId === undefined ? sql`` : sql`AND member_id = ${memberId}`;
  const r = await db.execute<LockedRequest>(sql`
    SELECT request_id, member_id, district, state, to_char(started_on, 'YYYY-MM-DD') AS started_on, suggested_workplace_id
      FROM workplace_requests WHERE pariwar_id = ${pariwarId} AND request_id = ${requestId}::uuid ${own}
     FOR UPDATE`);
  return r.rows[0] ?? null;
}

/**
 * The Pariwar Admin SUGGESTS a listed workplace for a `pending` request. Order (district → workplace → request): the
 * workplace LISTED in this Pariwar (`lockListedWorkplace`; ⛔ ⇒ `not_found`); the request `FOR UPDATE` (⛔ ⇒
 * `request_not_found`; ⛔ `pending` ⇒ `request_closed` — a re-suggestion goes back through `pending`, which only the
 * member's *"No"* or a stale answer does); the workplace's district = the request's (⛔ ⇒ `district_mismatch` — a same-named
 * school elsewhere would move the member's district, SW5). ⇒ `suggested`, the actor and the time recorded.
 */
export async function suggestWorkplaceForRequest(
  db: Db,
  input: { pariwarId: PariwarId; requestId: string; workplaceId: string; actorId: string },
): Promise<{ requestId: WorkplaceRequestId; workplaceId: WorkplaceId; district: string }> {
  const w = await lockListedWorkplace(db, input.pariwarId, input.workplaceId);
  if (!w) throw new WorkplaceAdminRefusedError('workplace.not_found');
  const req = await lockRequest(db, input.pariwarId, input.requestId);
  if (!req) throw new WorkplaceAdminRefusedError('workplace.request_not_found');
  if (req.state !== 'pending') throw new WorkplaceAdminRefusedError('workplace.request_closed');
  if (w.district !== req.district) throw new WorkplaceAdminRefusedError('workplace.district_mismatch');
  await db.execute(sql`
    UPDATE workplace_requests
       SET state = 'suggested', suggested_workplace_id = ${w.workplaceId}, suggested_by_actor_id = ${input.actorId}, suggested_at = now()
     WHERE pariwar_id = ${input.pariwarId} AND request_id = ${req.request_id}::uuid`);
  return { requestId: toWorkplaceRequestId(req.request_id), workplaceId: w.workplaceId, district: w.district };
}

/**
 * The Pariwar Admin CLOSES an open request (an entry that names ⛔ real workplace) — `pending` or `suggested` ⇒ `closed`, the
 * suggestion columns LEFT as they are (the guard refuses a change to them on a move to `closed`); any other state ⇒
 * `request_closed` (⛔ a guard error surfacing as a 500).
 */
export async function closeWorkplaceRequest(db: Db, input: { pariwarId: PariwarId; requestId: string }): Promise<{ requestId: WorkplaceRequestId; district: string }> {
  const req = await lockRequest(db, input.pariwarId, input.requestId);
  if (!req) throw new WorkplaceAdminRefusedError('workplace.request_not_found');
  if (req.state !== 'pending' && req.state !== 'suggested') throw new WorkplaceAdminRefusedError('workplace.request_closed');
  await db.execute(sql`
    UPDATE workplace_requests SET state = 'closed', resolved_at = now()
     WHERE pariwar_id = ${input.pariwarId} AND request_id = ${req.request_id}::uuid`);
  return { requestId: toWorkplaceRequestId(req.request_id), district: req.district };
}

// ── The member's answer (AC4) ──────────────────────────────────────────────────────────────────────────────────────────

export type WorkplaceAnswerResult =
  | {
      readonly kind: 'confirmed';
      readonly posting: { readonly workplaceId: WorkplaceId; readonly workplaceKind: WorkplaceKind; readonly district: string; readonly startedOn: string };
    }
  | { readonly kind: 'declined' }
  | { readonly kind: 'stale' };

/** A suggested request back to `pending`, the suggestion NULLed (the 0164 guard requires it). */
async function returnToPending(db: Db, pariwarId: PariwarId, requestId: string): Promise<void> {
  await db.execute(sql`
    UPDATE workplace_requests SET state = 'pending', suggested_workplace_id = NULL, suggested_by_actor_id = NULL, suggested_at = NULL
     WHERE pariwar_id = ${pariwarId} AND request_id = ${requestId}::uuid`);
}

/**
 * The MEMBER answers a suggestion — on the CALLER's scoped transaction (the handler has checked the member is ⛔ terminal;
 * it emits the event and the audit line). Steps:
 *   1. the member's posting writes serialised (`lockMemberPostingWrites` — a concurrent posting would withdraw the request);
 *   2. a PLAIN read of the CALLER's request (another member's or an unknown id ⇒ the SAME `request_not_found`); ⛔
 *      `suggested` ⇒ `request_closed`;
 *   3. *"No"* ⇒ the request `FOR UPDATE`, re-checked, back to `pending` (NULLed) ⇒ `declined` — it reappears in the queue;
 *   4. *"Yes"* ⇒ the workplace (`lockListedWorkplace` — district → workplace), THEN the request `FOR UPDATE`, its state AND
 *      district re-checked (a concurrent rename moves an open request's district); a workplace ⛔ listed or ⛔ in the
 *      request's district ⇒ back to `pending` ⇒ `stale` (RV11 — ⛔ a throw: the caller COMMITS it); the start date against the
 *      member's latest (⛔ ⇒ `start_date_invalid`); the request `confirmed` FIRST; then ONE posting through the ONE writer
 *      naming the WORKPLACE (⛔ the request — the one-of-two CHECK), `exceptRequestId` = this request ⇒ `confirmed`.
 */
export async function answerWorkplaceSuggestion(
  db: Db,
  input: { pariwarId: PariwarId; memberId: MemberId; requestId: string; answer: 'yes' | 'no'; now: Date },
): Promise<WorkplaceAnswerResult> {
  const { pariwarId, memberId } = input;
  await lockMemberPostingWrites(db, memberId);
  if (!isWorkplaceUuid(input.requestId)) throw new WorkplaceAnswerRefusedError('workplace.request_not_found');
  const plain = await db.execute<{ state: string; suggested_workplace_id: string | null }>(sql`
    SELECT state, suggested_workplace_id FROM workplace_requests
     WHERE pariwar_id = ${pariwarId} AND request_id = ${input.requestId}::uuid AND member_id = ${memberId}`);
  const seen = plain.rows[0];
  if (!seen) throw new WorkplaceAnswerRefusedError('workplace.request_not_found');
  if (seen.state !== 'suggested' || seen.suggested_workplace_id === null) throw new WorkplaceAnswerRefusedError('workplace.request_closed');

  if (input.answer === 'no') {
    const req = await lockRequest(db, pariwarId, input.requestId, memberId);
    if (!req) throw new WorkplaceAnswerRefusedError('workplace.request_not_found');
    if (req.state !== 'suggested') throw new WorkplaceAnswerRefusedError('workplace.request_closed');
    await returnToPending(db, pariwarId, req.request_id);
    return { kind: 'declined' };
  }

  const w = await lockListedWorkplace(db, pariwarId, seen.suggested_workplace_id);
  const req = await lockRequest(db, pariwarId, input.requestId, memberId);
  if (!req) throw new WorkplaceAnswerRefusedError('workplace.request_not_found');
  if (req.state !== 'suggested' || req.suggested_workplace_id !== seen.suggested_workplace_id) {
    throw new WorkplaceAnswerRefusedError('workplace.request_closed');
  }
  if (w === null || w.district !== req.district) {
    await returnToPending(db, pariwarId, req.request_id);
    return { kind: 'stale' };
  }
  if (!isValidStartDate(req.started_on, input.now, await latestPostingStartedOn(db, pariwarId, memberId))) {
    throw new WorkplaceAnswerRefusedError('workplace.start_date_invalid');
  }
  await db.execute(sql`
    UPDATE workplace_requests SET state = 'confirmed', resolved_at = now()
     WHERE pariwar_id = ${pariwarId} AND request_id = ${req.request_id}::uuid`);
  await insertMemberPosting(db, {
    memberId,
    pariwarId,
    district: w.district,
    workplaceId: w.workplaceId,
    startedOn: req.started_on,
    exceptRequestId: toWorkplaceRequestId(req.request_id),
  });
  return { kind: 'confirmed', posting: { workplaceId: w.workplaceId, workplaceKind: w.kind, district: w.district, startedOn: req.started_on } };
}
