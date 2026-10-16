// Where each member works — the workplace list reads, the *"isn't listed"* request writer, and the member's posting history
// (Story 6.36a, Task 2; AC3, AC3b, AC4, AC7; `2026-10-14-330` SW2–SW9).
//
// TENANT-scoped: every accessor runs its statements directly on the passed (scoped) `db` — the caller is already inside the
// `SET LOCAL app.pariwar_id` transaction (the `posting.ts` precedent) — AND names `pariwar_id` explicitly (RLS + the explicit
// predicate, AC3).
//
// ⭐ THE DISTRICT IS AN AUTHORISATION INPUT (SF13). A posting copies the workplace's MAPPED district spelling, compared
// byte-for-byte by RBAC (`member-geo/resolve.ts`) ⇒ ⛔ never normalised here. Every writer that checks a district reads its
// `workplace_districts` row `FOR SHARE` (`lockListedDistrict`): the tool's `--rename-district` RETIRES the old spelling
// FIRST, so a posting can ⛔ never land on a spelling being retired. Lock order — the district, THEN the workplace: the
// RENAME retires the district row first and only then moves the workplaces, and the posting writer reads district →
// workplace `FOR SHARE` in that same order (`lockListedWorkplace`) ⇒ ⛔ no deadlock between the two. (The import never
// locks a `workplace_districts` row — it serialises against the rename by the per-Pariwar advisory lock instead.)
//
// ⭐ THE TYPED TEXT IS MEMBER-AUTHORED. It lives only in `workplace_requests` — ⛔ never in an event, an audit line or a log
// (AC4). The seven-digit check runs on a copy whose digits are FOLDED to ASCII and whose between-digit separators are
// removed (`hasSevenDigitRun`) — ⛔ the stored text is the member's own, trimmed.
//
// NO HTTP, NO audit, NO event emission — the route orchestrates.

import { and, asc, desc, eq, inArray, isNotNull, notInArray, sql, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

import type { Db } from '../db.js';
import type { MemberId, PariwarId, PostingId, WorkplaceId, WorkplaceRequestId } from '../ids/index.js';
import { clampLimit } from '../pagination.js';
import { memberPostings } from '../schema/member_postings.js';
import { workplaceDistricts } from '../schema/workplace_districts.js';
import {
  WORKPLACE_REQUEST_OPEN_STATES,
  type WorkplaceRequestRow,
  type WorkplaceRequestState,
  workplaceRequests,
} from '../schema/workplace_requests.js';
import { type WorkplaceKind, workplaces } from '../schema/workplaces.js';

// ── Bounds ─────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** The picker's district list — a Pariwar's districts (Bihar has 38), bounded for the forced-pagination invariant. */
export const WORKPLACE_DISTRICTS_LIMIT = { default: 200, cap: 200 } as const;
/** One page of the picker's server-side search. */
export const WORKPLACE_SEARCH_LIMIT = { default: 20, cap: 50 } as const;
/** One page of the member's own posting history (a few transfers in a career). */
export const POSTING_HISTORY_LIMIT = { default: 50, cap: 100 } as const;
/** The typed name / place cap (code points — the DB's `char_length`). */
export const WORKPLACE_TYPED_TEXT_MAX = 120;
/** The earliest start date accepted (SW6; 0161's CHECKs). */
export const WORKPLACE_START_DATE_FLOOR = '1950-01-01';
/** The longest search text the picker sends — longer input is ⛔ a school name. */
export const WORKPLACE_SEARCH_TEXT_MAX = 100;

// ── Refusals ───────────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * The posting write's DOMAIN refusals — ONE code per family (AC4). ⚠ `workplace.not_found` covers an unknown, a delisted AND
 * another Pariwar's workplace INDISTINGUISHABLY (⛔ never a hint that an id exists elsewhere).
 */
export const WORKPLACE_REFUSAL_CODES = [
  'workplace.not_found',
  'workplace.district_not_found',
  'workplace.start_date_invalid',
  'workplace.typed_name_invalid',
  'workplace.choice_unavailable',
] as const;
export type WorkplaceRefusalCode = (typeof WORKPLACE_REFUSAL_CODES)[number];

export class WorkplaceWriteRefusedError extends Error {
  public constructor(public readonly code: WorkplaceRefusalCode) {
    // ⛔ No member input in the message (it reaches logs).
    super(`[workplace] write refused: ${code}`);
    this.name = 'WorkplaceWriteRefusedError';
  }
}

/** A malformed pagination cursor (a client bug or tampering — the route answers 400). */
export class WorkplaceCursorInvalidError extends Error {
  public constructor() {
    super('[workplace] the pagination cursor is not one this server issued');
    this.name = 'WorkplaceCursorInvalidError';
  }
}

// ── Pure helpers ───────────────────────────────────────────────────────────────────────────────────────────────────────

const NON_ASCII_DECIMAL_DIGIT = /\p{Nd}/u;

/**
 * Fold every decimal digit to ASCII: NFKD first (fullwidth / superscript / mathematical digits), then every remaining
 * Unicode decimal digit (`\p{Nd}` — Devanagari `०`–`९` among them) to its value. Unicode guarantees decimal digits are encoded
 * in contiguous runs of 0..9, so a digit's value is its distance from the start of its contiguous `\p{Nd}` stretch, mod 10.
 * Used ONLY for the seven-digit check — ⛔ the stored text is never rewritten.
 */
export function foldDigitsToAscii(text: string): string {
  return text.normalize('NFKD').replace(/\p{Nd}/gu, (ch) => {
    const cp = ch.codePointAt(0)!;
    if (cp >= 0x30 && cp <= 0x39) return ch;
    let start = cp;
    while (start > 0 && NON_ASCII_DECIMAL_DIGIT.test(String.fromCodePoint(start - 1))) start -= 1;
    return String((cp - start) % 10);
  });
}

/** Code-point length (the DB's `char_length`), ⛔ UTF-16 units. */
function codePointLength(text: string): number {
  return [...text].length;
}

/**
 * `true` when `text` carries a run of seven digits once every digit is folded to ASCII AND the separators that sit BETWEEN
 * digits — whitespace, `-`, `.` — are removed (`98765 43210`, `98765-43210`, `९८७६५-४३२१०`, `98.76.54.321` are phone numbers
 * too — review 2026-10-15, BigDev's option 1). ONE function — the domain writer's rule; 0161's `!~ '[0-9]{7}'` CHECK is the
 * literal backstop (⛔ never regenerated). ⛔ The stored text is never rewritten.
 */
export function hasSevenDigitRun(text: string): boolean {
  // ⛔ A lookbehind — the app mirrors this line and runs on Hermes; the captured digit is put back instead.
  const joined = foldDigitsToAscii(text).replace(/([0-9])[\s.-]+(?=[0-9])/g, '$1');
  return /[0-9]{7}/.test(joined);
}

/**
 * Format characters (`\p{Cf}` — ZWJ, ZWNJ, ZWSP…), marks (`\p{M}`) and the blank FILLERS that are letters or symbols by
 * category yet render nothing: the Hangul fillers U+115F / U+1160 / U+3164 / U+FFA0 (`Lo`) and the braille blank U+2800
 * (`So`). ⚠ LOCKSTEP with `apps/mobile/lib/workplace.ts` (review 2026-10-15 R2-5).
 */
const INVISIBLE_RE = /[\p{Cf}\p{M}\u115F\u1160\u3164\uFFA0\u2800]/gu;
/** At least one letter or digit must survive — a residue of punctuation or symbols alone is ⛔ a name. */
const LETTER_OR_DIGIT_RE = /[\p{L}\p{N}]/u;

/**
 * A typed workplace name or place is valid when, trimmed, it is 1–120 characters, carries ⛔ no run of seven digits
 * (`hasSevenDigitRun` — a phone number, SW9) and is VISIBLE: with every format character, mark and blank filler removed,
 * and the rest trimmed, at least one LETTER or DIGIT remains (a zero-width string, a run of combining marks, format
 * characters around a space, a row of Hangul fillers or braille blanks all render blank). The length is the trimmed
 * ORIGINAL's — a ZWJ / ZWNJ inside a Devanagari word is legitimate and KEPT. ⚠ LOCKSTEP with 0161's typed-text CHECKs
 * (which see only ASCII and ⛔ the visibility rule) and with the app's copy of this rule.
 */
export function isValidTypedWorkplaceText(text: string): boolean {
  const trimmed = text.trim();
  const len = codePointLength(trimmed);
  if (len < 1 || len > WORKPLACE_TYPED_TEXT_MAX) return false;
  const residue = trimmed.replace(INVISIBLE_RE, '').trim();
  if (residue === '' || !LETTER_OR_DIGIT_RE.test(residue)) return false;
  return !hasSevenDigitRun(trimmed);
}

/** Escape `%`, `_` and `\` for an `ILIKE … ESCAPE '\'` substring pattern. */
export function escapeLikePattern(text: string): string {
  return text.replace(/[\\%_]/g, (c) => `\\${c}`);
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** `YYYY-MM-DD` of a real calendar date (⛔ `2023-02-30`). */
export function isCalendarDate(value: string): boolean {
  const m = ISO_DATE.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

/** Today's date in IST (`YYYY-MM-DD`) at `now`. */
export function istToday(now: Date): string {
  return new Date(now.getTime() + 330 * 60_000).toISOString().slice(0, 10);
}

/**
 * The start-date rule (SW6): a real date, ⛔ in the future (IST), ⛔ before 1950-01-01, ⛔ before `previousStartedOn` (the
 * member's latest recorded start). ISO dates compare correctly as strings.
 */
export function isValidStartDate(startedOn: string, now: Date, previousStartedOn: string | null): boolean {
  if (!isCalendarDate(startedOn)) return false;
  if (startedOn < WORKPLACE_START_DATE_FLOOR) return false;
  if (startedOn > istToday(now)) return false;
  if (previousStartedOn !== null && startedOn < previousStartedOn) return false;
  return true;
}

function encodeCursor(parts: readonly string[]): string {
  return Buffer.from(JSON.stringify(parts), 'utf8').toString('base64url');
}

function decodeCursor(cursor: string, arity: number): string[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
  } catch {
    throw new WorkplaceCursorInvalidError();
  }
  if (!Array.isArray(parsed) || parsed.length !== arity || !parsed.every((p) => typeof p === 'string')) {
    throw new WorkplaceCursorInvalidError();
  }
  return parsed as string[];
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Story 6.36c — the SAME opaque cursor for the staff list and the request queue (`workplace-admin.ts`). */
export const encodeWorkplaceCursor = encodeCursor;
/** Story 6.36c — decode {@link encodeWorkplaceCursor}'s cursor of `arity` parts, else `WorkplaceCursorInvalidError`. */
export const decodeWorkplaceCursor = decodeCursor;
/** Story 6.36c — a UUID-shaped string (a cursor part, a path id before the cast). */
export function isWorkplaceUuid(value: string): boolean {
  return UUID_RE.test(value);
}

// ── The list ───────────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * `true` when the Pariwar has ANY `workplace_districts` row — an import has run, so the picker replaces today's free-text
 * district box (SW7). A Pariwar with ⛔ no row keeps the box.
 */
export async function pariwarHasWorkplaceList(db: Db, pariwarId: PariwarId): Promise<boolean> {
  const rows = await db
    .select({ district: workplaceDistricts.district })
    .from(workplaceDistricts)
    .where(eq(workplaceDistricts.pariwarId, pariwarId))
    .limit(1);
  return rows.length > 0;
}

/** The Pariwar's LISTED district spellings, A–Z (a retired spelling ⛔ never; empty with ⛔ no import — AC3). */
export async function listWorkplaceDistricts(db: Db, pariwarId: PariwarId, opts: { limit?: number } = {}): Promise<string[]> {
  const rows = await db
    .select({ district: workplaceDistricts.district })
    .from(workplaceDistricts)
    .where(and(eq(workplaceDistricts.pariwarId, pariwarId), eq(workplaceDistricts.status, 'listed')))
    .orderBy(asc(workplaceDistricts.district))
    .limit(clampLimit(opts.limit, WORKPLACE_DISTRICTS_LIMIT));
  return rows.map((r) => r.district);
}

/**
 * The districts read as ONE PAGE with an honest `hasMore` — the route's shape (AC3). ⚠ [Review][Patch] 2026-10-15: the
 * handler first asked `listWorkplaceDistricts` for `limit + 1`, which the clamp cut back to the cap, so `hasMore` was
 * structurally false at the default and the cap. One more than the page, the clamp's bounds shifted by one (the search's
 * and the history's form). ⛔ No cursor — the contract promises ⛔ a second page; the remedy for `hasMore` is a larger `limit`.
 */
export async function pageWorkplaceDistricts(db: Db, pariwarId: PariwarId, opts: { limit?: number } = {}): Promise<{ items: string[]; hasMore: boolean }> {
  const limit = clampLimit(opts.limit, WORKPLACE_DISTRICTS_LIMIT);
  const rows = await db
    .select({ district: workplaceDistricts.district })
    .from(workplaceDistricts)
    .where(and(eq(workplaceDistricts.pariwarId, pariwarId), eq(workplaceDistricts.status, 'listed')))
    .orderBy(asc(workplaceDistricts.district))
    .limit(clampLimit(limit + 1, { default: WORKPLACE_DISTRICTS_LIMIT.default + 1, cap: WORKPLACE_DISTRICTS_LIMIT.cap + 1 }));
  return { items: rows.slice(0, limit).map((r) => r.district), hasMore: rows.length > limit };
}

/**
 * Lock a district spelling `FOR SHARE` and say whether it is LISTED. Held until the caller's transaction ends, so a
 * concurrent `--rename-district` (which retires the spelling first) waits — ⛔ a posting can never land on a spelling being
 * retired. ⛔ No such spelling ⇒ `false`.
 */
export async function lockListedDistrict(db: Db, pariwarId: PariwarId, district: string): Promise<boolean> {
  const rows = await db
    .select({ status: workplaceDistricts.status })
    .from(workplaceDistricts)
    .where(and(eq(workplaceDistricts.pariwarId, pariwarId), eq(workplaceDistricts.district, district)))
    .for('share');
  return rows[0]?.status === 'listed';
}

/** One row of the picker's search. */
export interface WorkplaceSummary {
  readonly workplaceId: WorkplaceId;
  readonly kind: WorkplaceKind;
  readonly name: string;
  readonly district: string;
  readonly villageName: string | null;
  readonly clusterName: string | null;
}

export interface SearchWorkplacesInput {
  readonly pariwarId: PariwarId;
  readonly district: string;
  readonly kind: WorkplaceKind;
  /** Case-insensitive substring of the name or the village; blank ⇒ every listed row of the district and kind. */
  readonly q?: string | undefined;
  readonly limit?: number | undefined;
  readonly cursor?: string | undefined;
}

export interface WorkplacePage<T> {
  readonly items: T[];
  readonly nextCursor: string | null;
  readonly hasMore: boolean;
}

const summaryColumns = {
  workplaceId: workplaces.workplaceId,
  kind: workplaces.kind,
  name: workplaces.name,
  district: workplaces.district,
  villageName: workplaces.villageName,
  clusterName: workplaces.clusterName,
};

/**
 * The picker's SERVER-side search (SW4): ONE district's LISTED workplaces of ONE kind, by name or village (case-insensitive
 * substring, the input ESCAPED for `ILIKE`), A–Z by name then id, keyset-paginated (`clampLimit` — the
 * `domain-accessor-invariants` gate). ⛔ A delisted row; ⛔ another Pariwar's row (RLS + the explicit `pariwar_id`).
 */
export async function searchWorkplaces(db: Db, input: SearchWorkplacesInput): Promise<WorkplacePage<WorkplaceSummary>> {
  const limit = clampLimit(input.limit, WORKPLACE_SEARCH_LIMIT);
  const conditions: SQL[] = [
    eq(workplaces.pariwarId, input.pariwarId),
    eq(workplaces.district, input.district),
    eq(workplaces.kind, input.kind),
    eq(workplaces.status, 'listed'),
  ];
  // Clamped to `WORKPLACE_SEARCH_TEXT_MAX` code points — the contract's `max(100)` is the front door (the api spec asserts
  // the two agree); this is the defence behind it.
  const q = [...(input.q ?? '').trim()].slice(0, WORKPLACE_SEARCH_TEXT_MAX).join('').trim();
  if (q !== '') {
    const pattern = `%${escapeLikePattern(q)}%`;
    conditions.push(sql`(${workplaces.name} ILIKE ${pattern} ESCAPE '\\' OR ${workplaces.villageName} ILIKE ${pattern} ESCAPE '\\')`);
  }
  if (input.cursor !== undefined) {
    const [name, id] = decodeCursor(input.cursor, 2) as [string, string];
    if (!UUID_RE.test(id)) throw new WorkplaceCursorInvalidError();
    conditions.push(sql`(${workplaces.name}, ${workplaces.workplaceId}) > (${name}, ${id}::uuid)`);
  }
  const rows = await db
    .select(summaryColumns)
    .from(workplaces)
    .where(and(...conditions))
    .orderBy(asc(workplaces.name), asc(workplaces.workplaceId))
    // One more than the page — `hasMore` (the clamp's bounds shifted by one, the `moderation/read.ts` form).
    .limit(clampLimit(limit + 1, { default: WORKPLACE_SEARCH_LIMIT.default + 1, cap: WORKPLACE_SEARCH_LIMIT.cap + 1 }));
  const hasMore = rows.length > limit;
  const items = rows.slice(0, limit);
  const last = items[items.length - 1];
  return { items, hasMore, nextCursor: hasMore && last ? encodeCursor([last.name, last.workplaceId]) : null };
}

/** A LISTED workplace of the Pariwar, or `null` (unknown, delisted and another Pariwar's are the same `null`). */
export async function getListedWorkplace(db: Db, pariwarId: PariwarId, workplaceId: string): Promise<WorkplaceSummary | null> {
  if (!UUID_RE.test(workplaceId)) return null;
  const rows = await db
    .select(summaryColumns)
    .from(workplaces)
    .where(and(eq(workplaces.pariwarId, pariwarId), eq(workplaces.workplaceId, workplaceId as WorkplaceId), eq(workplaces.status, 'listed')))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * The posting writer's workplace read: a LISTED workplace whose district spelling is LISTED, both locked `FOR SHARE` (the
 * district FIRST — the house lock order). A concurrent rename that moved the workplace between the read and the lock is
 * re-read ONCE. `null` ⇒ `workplace.not_found`.
 */
export async function lockListedWorkplace(db: Db, pariwarId: PariwarId, workplaceId: string): Promise<WorkplaceSummary | null> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const w = await getListedWorkplace(db, pariwarId, workplaceId);
    if (!w) return null;
    if (!(await lockListedDistrict(db, pariwarId, w.district))) continue;
    const locked = await db
      .select(summaryColumns)
      .from(workplaces)
      .where(
        and(
          eq(workplaces.pariwarId, pariwarId),
          eq(workplaces.workplaceId, w.workplaceId),
          eq(workplaces.status, 'listed'),
          eq(workplaces.district, w.district),
        ),
      )
      .for('share');
    if (locked[0]) return locked[0];
  }
  return null;
}

// ── The posting write's helpers ────────────────────────────────────────────────────────────────────────────────────────

/**
 * Serialise ONE member's posting writes (a transaction-scoped advisory lock): the "before the previous start" check and the
 * "end the older open request" step then read a stable history. Take it FIRST in the write.
 */
export async function lockMemberPostingWrites(db: Db, memberId: MemberId): Promise<void> {
  await db.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`member_posting:${memberId}`}))`);
}

/** The start date of the member's LATEST posting that records one (`null` ⇒ ⛔ no check — legacy rows carry none). */
export async function latestPostingStartedOn(db: Db, pariwarId: PariwarId, memberId: MemberId): Promise<string | null> {
  const rows = await db
    .select({ startedOn: memberPostings.startedOn })
    .from(memberPostings)
    .where(and(eq(memberPostings.pariwarId, pariwarId), eq(memberPostings.memberId, memberId), isNotNull(memberPostings.startedOn)))
    .orderBy(desc(memberPostings.createdAt), desc(memberPostings.postingId))
    .limit(1);
  return rows[0]?.startedOn ?? null;
}

export interface InsertWorkplaceRequestInput {
  readonly pariwarId: PariwarId;
  readonly memberId: MemberId;
  /** A LISTED spelling — the caller has locked it (`lockListedDistrict`). */
  readonly district: string;
  readonly typedName: string;
  readonly typedPlace?: string | null | undefined;
  readonly startedOn: string;
}

/**
 * Write ONE *"my workplace isn't listed"* request (`pending`) — BEFORE the posting that references it (SW9). The typed
 * name and place are trimmed and checked on a digit-FOLDED copy (`isValidTypedWorkplaceText`) ⇒
 * `workplace.typed_name_invalid`. ⛔ The typed text is never logged.
 */
export async function insertWorkplaceRequest(db: Db, input: InsertWorkplaceRequestInput): Promise<WorkplaceRequestRow> {
  const typedName = input.typedName.trim();
  const rawPlace = input.typedPlace?.trim() ?? '';
  const typedPlace = rawPlace === '' ? null : rawPlace;
  if (!isValidTypedWorkplaceText(typedName) || (typedPlace !== null && !isValidTypedWorkplaceText(typedPlace))) {
    throw new WorkplaceWriteRefusedError('workplace.typed_name_invalid');
  }
  const inserted = await db
    .insert(workplaceRequests)
    .values({
      pariwarId: input.pariwarId,
      memberId: input.memberId,
      district: input.district,
      typedName,
      typedPlace,
      startedOn: input.startedOn,
    })
    .returning();
  const row = inserted[0];
  if (!row) throw new Error('[insertWorkplaceRequest] insert returned no row — check session scope');
  return row;
}

/**
 * End the member's OLDER open (`pending` / `suggested`) requests — `withdrawn` (SW8: EVERY posting write does this), ⛔ the
 * ids in `keep` (the posting's own request; the request being confirmed — 6.36c). Returns how many were ended. Called by
 * `insertMemberPosting` in the SAME transaction.
 */
export async function withdrawOlderOpenRequests(
  db: Db,
  pariwarId: PariwarId,
  memberId: MemberId,
  keep: readonly WorkplaceRequestId[],
): Promise<number> {
  const conditions: SQL[] = [
    eq(workplaceRequests.pariwarId, pariwarId),
    eq(workplaceRequests.memberId, memberId),
    inArray(workplaceRequests.state, [...WORKPLACE_REQUEST_OPEN_STATES]),
  ];
  if (keep.length > 0) conditions.push(notInArray(workplaceRequests.requestId, [...keep]));
  const ended = await db
    .update(workplaceRequests)
    .set({ state: 'withdrawn', resolvedAt: sql`now()` })
    .where(and(...conditions))
    .returning({ requestId: workplaceRequests.requestId });
  return ended.length;
}

// ── The member's own history (AC3b) ────────────────────────────────────────────────────────────────────────────────────

/** One row of the member's posting history, newest first. */
export interface MemberPostingHistoryItem {
  readonly postingId: PostingId;
  /** The row's recorded time — UTC ISO with µs (`…:SS.ffffffZ`; a cursor part — ⛔ a JS Date, which drops µs). */
  readonly recordedAt: string;
  readonly district: string;
  readonly startedOn: string | null;
  readonly isRetirement: boolean;
  /** The listed school or office the row names (even if since delisted — I3). */
  readonly workplace: { readonly workplaceId: WorkplaceId; readonly kind: WorkplaceKind; readonly name: string } | null;
  /** The *"isn't listed"* request the row names — the member's OWN typed text and the request's state. */
  readonly request: {
    readonly requestId: WorkplaceRequestId;
    readonly state: WorkplaceRequestState;
    readonly typedName: string | null;
    readonly typedPlace: string | null;
    /** The Pariwar Admin's suggestion while the request is `suggested` (6.36c writes it). */
    readonly suggested: { readonly workplaceId: WorkplaceId; readonly name: string; readonly district: string } | null;
  } | null;
}

const suggestedWorkplaces = alias(workplaces, 'suggested_workplace');

/** A `createdAt` / `recordedAt` cursor part — UTC, ALWAYS six fractional digits (µs — the cursor compares it in SQL, exactly). */
const TIMESTAMP_CURSOR_RE = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})\.\d{6}Z$/;

/**
 * `true` when a cursor's timestamp part (`createdAt`, `recordedAt` — same shape everywhere it is used) is a REAL
 * instant: the shape, a calendar date (`isCalendarDate` — ⛔ month 13, ⛔ 30 February), hour 00–23, minute and second
 * 00–59 (checked by number — Node's `Date.parse` lets `T24:00:00` through), and `Date.parse` finite. A forged cursor
 * that passes the shape alone would reach the `::timestamptz` cast and die as a 22008 — a 500, ⛔ the 400 the route owes
 * (review 2026-10-15 R2-4). Shared by every keyset list of this cursor shape (`known-people-campaigns.ts`'s campaign
 * list, `workplace-admin.ts`'s request queue, and this file's own posting history).
 */
export function isTimestampCursor(value: string): boolean {
  const m = TIMESTAMP_CURSOR_RE.exec(value);
  if (!m) return false;
  const [hh, mm, ss] = [Number(m[2]), Number(m[3]), Number(m[4])];
  if (hh > 23 || mm > 59 || ss > 59) return false;
  // Postgres has ⛔ year 0 (`0000-01-01` is a calendar date to V8 and to `isCalendarDate`, and 22008 to `::timestamptz`);
  // nothing was recorded before 1970 anyway.
  if (Number(m[1]!.slice(0, 4)) < 1970) return false;
  return isCalendarDate(m[1]!) && Number.isFinite(Date.parse(value));
}

/**
 * The member's postings, newest first (`created_at DESC, posting_id DESC` — the peer-mesh reads' tie-break), each with its
 * workplace and its request, keyset-paginated (`clampLimit`). Tenant-scoped; the member's OWN rows only.
 */
export async function listMemberPostingHistory(
  db: Db,
  pariwarId: PariwarId,
  memberId: MemberId,
  opts: { limit?: number | undefined; cursor?: string | undefined } = {},
): Promise<WorkplacePage<MemberPostingHistoryItem>> {
  const limit = clampLimit(opts.limit, POSTING_HISTORY_LIMIT);
  const conditions: SQL[] = [eq(memberPostings.pariwarId, pariwarId), eq(memberPostings.memberId, memberId)];
  if (opts.cursor !== undefined) {
    const [recordedAt, id] = decodeCursor(opts.cursor, 2) as [string, string];
    if (!UUID_RE.test(id) || !isTimestampCursor(recordedAt)) throw new WorkplaceCursorInvalidError();
    conditions.push(sql`(${memberPostings.createdAt}, ${memberPostings.postingId}) < (${recordedAt}::timestamptz, ${id}::uuid)`);
  }
  const rows = await db
    .select({
      postingId: memberPostings.postingId,
      recordedAt: sql<string>`to_char(${memberPostings.createdAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`,
      district: memberPostings.district,
      startedOn: memberPostings.startedOn,
      isRetirement: memberPostings.isRetirement,
      workplaceId: workplaces.workplaceId,
      workplaceKind: workplaces.kind,
      workplaceName: workplaces.name,
      requestId: workplaceRequests.requestId,
      requestState: workplaceRequests.state,
      typedName: workplaceRequests.typedName,
      typedPlace: workplaceRequests.typedPlace,
      suggestedId: suggestedWorkplaces.workplaceId,
      suggestedName: suggestedWorkplaces.name,
      suggestedDistrict: suggestedWorkplaces.district,
    })
    .from(memberPostings)
    .leftJoin(workplaces, and(eq(workplaces.pariwarId, memberPostings.pariwarId), eq(workplaces.workplaceId, memberPostings.workplaceId)))
    .leftJoin(
      workplaceRequests,
      and(eq(workplaceRequests.pariwarId, memberPostings.pariwarId), eq(workplaceRequests.requestId, memberPostings.workplaceRequestId)),
    )
    .leftJoin(
      suggestedWorkplaces,
      and(
        eq(suggestedWorkplaces.pariwarId, workplaceRequests.pariwarId),
        eq(suggestedWorkplaces.workplaceId, workplaceRequests.suggestedWorkplaceId),
        eq(workplaceRequests.state, 'suggested'),
      ),
    )
    .where(and(...conditions))
    .orderBy(desc(memberPostings.createdAt), desc(memberPostings.postingId))
    .limit(clampLimit(limit + 1, { default: POSTING_HISTORY_LIMIT.default + 1, cap: POSTING_HISTORY_LIMIT.cap + 1 }));
  const hasMore = rows.length > limit;
  const items: MemberPostingHistoryItem[] = rows.slice(0, limit).map((r) => ({
    postingId: r.postingId,
    recordedAt: r.recordedAt,
    district: r.district,
    startedOn: r.startedOn,
    isRetirement: r.isRetirement,
    workplace:
      r.workplaceId !== null && r.workplaceKind !== null && r.workplaceName !== null
        ? { workplaceId: r.workplaceId, kind: r.workplaceKind, name: r.workplaceName }
        : null,
    request:
      r.requestId !== null && r.requestState !== null
        ? {
            requestId: r.requestId,
            state: r.requestState,
            typedName: r.typedName,
            typedPlace: r.typedPlace,
            suggested:
              r.suggestedId !== null && r.suggestedName !== null && r.suggestedDistrict !== null
                ? { workplaceId: r.suggestedId, name: r.suggestedName, district: r.suggestedDistrict }
                : null,
          }
        : null,
  }));
  const last = items[items.length - 1];
  return { items, hasMore, nextCursor: hasMore && last ? encodeCursor([last.recordedAt, last.postingId]) : null };
}
