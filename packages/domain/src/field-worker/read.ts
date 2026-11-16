// Field-worker read accessors — Story 13.1 (QE4, QE11, QE17; AC10).
//
// Every read carries an EXPLICIT `pariwar_id` predicate (RLS is ⛔ the only filter — a superuser bypasses it, 13.2 TR3;
// `-449`: under FORCE a plain owner does not). The worker reads return a `FieldWorkerView` that OMITS the three PII columns (`name_ciphertext`,
// `mobile_ciphertext`, `mobile_blind_index`) in the SELECT LIST — ⛔ dropped after the fetch. ⛔ No function here decrypts a
// worker's data. Story 13.1a adds two reads that return ciphertext — `pageFieldWorkersForPariwar` (the name) and
// `getFieldWorkerSealedIdentity` (the name and the mobile) — for the API layer's audited decrypt-on-read (13.1a AD7, AD9), and Story
// 13.1b a third, `getFieldWorkerForCodeSms` (the mobile alone), for the sweep's audited decrypt; the worker's own read is still
// Story 13.3's (C1). Story 13.1c adds the worker's LOG read (`listFieldWorkerEvents`) — the event stream, which holds no identity data
// of the WORKER (no name, mobile or code — 13.1 QE4; it does hold reasons and dates); the one personal datum it joins in is each acting
// OFFICER's current display name.

import { and, asc, desc, eq, ne, sql } from 'drizzle-orm';

import type pg from 'pg';

import { bindScopedDb, UUID_REGEX, type Db } from '../db.js';
import { geoTreeVersionInForce, type GeoTreeInForce } from '../geo-tree/registry.js';
import type { FieldWorkerId, MemberAttributionId, PariwarId } from '../ids/index.js';
import { findListedWorkplaceDistricts } from '../marketplace/scope-options.js';
import { clampLimit } from '../pagination.js';
import { eventsLog } from '../schema/events_log.js';
import type { FieldWorkerEndingAppealHearer } from '../schema/field_worker_ending_appeals.js';
import { fieldWorkers, type FieldWorkerReasonCode, type FieldWorkerState } from '../schema/field_workers.js';
import { users } from '../schema/users.js';
import { pageWorkplaceDistricts } from '../member/workplace.js';
import { FieldWorkerCaptureNotFoundError, FieldWorkerCursorInvalidError, FieldWorkerDistrictUnknownError } from './errors.js';
import { foldFieldWorkerProjection, type FieldWorkerProjection } from './state.js';

/** The NUL character — the one code point a Postgres text parameter cannot carry (built, ⛔ written as an escape). */
const NUL = String.fromCharCode(0);

/** `listFieldWorkersForPariwar`'s default page size. */
export const LIST_FIELD_WORKERS_DEFAULT_LIMIT = 50;
/** `listFieldWorkersForPariwar`'s hard cap (forced pagination). */
export const LIST_FIELD_WORKERS_MAX_LIMIT = 200;

/**
 * The columns a `FieldWorkerView` carries — every column EXCEPT the three PII ones (`name_ciphertext`, `mobile_ciphertext`,
 * `mobile_blind_index`), listed one by one so a column added later is NOT read by default; `ended_on` as text (QE4).
 */
const FIELD_WORKER_VIEW_COLUMNS = {
  fieldWorkerId: fieldWorkers.fieldWorkerId,
  pariwarId: fieldWorkers.pariwarId,
  registeredByUserId: fieldWorkers.registeredByUserId,
  registeredByDisplay: fieldWorkers.registeredByDisplay,
  createdAt: fieldWorkers.createdAt,
  currentState: fieldWorkers.currentState,
  stateEventVersion: fieldWorkers.stateEventVersion,
  kycStatus: fieldWorkers.kycStatus,
  stateReasonCode: fieldWorkers.stateReasonCode,
  district: fieldWorkers.district,
  endedOn: sql<string | null>`${fieldWorkers.endedOn}::text`.as('ended_on'),
  auditId: fieldWorkers.auditId,
  updatedAt: fieldWorkers.updatedAt,
};

/**
 * A field worker WITHOUT their personal data (AC10) — the shape every read returns. `district` is the REPORTING district
 * (QE17 — not personal data); `endedOn` is `YYYY-MM-DD` or null.
 */
export interface FieldWorkerView {
  readonly fieldWorkerId: FieldWorkerId;
  readonly pariwarId: PariwarId;
  readonly registeredByUserId: string;
  readonly registeredByDisplay: string;
  readonly createdAt: Date;
  readonly currentState: FieldWorkerState;
  readonly stateEventVersion: number;
  readonly kycStatus: 'pending' | 'completed';
  readonly stateReasonCode: FieldWorkerProjection['reasonCode'];
  readonly district: string;
  readonly endedOn: string | null;
  readonly auditId: string;
  readonly updatedAt: Date;
}

/** One worker in this Pariwar, or null — ⛔ the PII columns. */
export async function getFieldWorker(db: Db, pariwarId: PariwarId, fieldWorkerId: FieldWorkerId): Promise<FieldWorkerView | null> {
  const rows = await db
    .select(FIELD_WORKER_VIEW_COLUMNS)
    .from(fieldWorkers)
    .where(and(eq(fieldWorkers.pariwarId, pariwarId), eq(fieldWorkers.fieldWorkerId, fieldWorkerId)))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * A page of this Pariwar's workers, newest first (`created_at DESC, field_worker_id DESC`), optionally of one state — ⛔ the
 * PII columns. The size is `clampLimit`-ed INLINE; a non-integer `limit` throws `RangeError` (13.2 D1: `clampLimit(NaN)` is
 * NaN, and Drizzle then drops the LIMIT).
 */
export async function listFieldWorkersForPariwar(
  db: Db,
  pariwarId: PariwarId,
  opts: { state?: FieldWorkerState; limit?: number } = {},
): Promise<FieldWorkerView[]> {
  if (opts.limit !== undefined && !Number.isInteger(opts.limit)) {
    throw new RangeError(`listFieldWorkersForPariwar: limit must be an integer, got ${String(opts.limit)}`);
  }
  const where =
    opts.state === undefined
      ? eq(fieldWorkers.pariwarId, pariwarId)
      : and(eq(fieldWorkers.pariwarId, pariwarId), eq(fieldWorkers.currentState, opts.state));
  return db
    .select(FIELD_WORKER_VIEW_COLUMNS)
    .from(fieldWorkers)
    .where(where)
    .orderBy(desc(fieldWorkers.createdAt), desc(fieldWorkers.fieldWorkerId))
    .limit(clampLimit(opts.limit, { default: LIST_FIELD_WORKERS_DEFAULT_LIMIT, cap: LIST_FIELD_WORKERS_MAX_LIMIT }));
}

/**
 * The id of the LIVE worker (⛔ terminated — the partial unique index's predicate) holding this mobile index in this
 * Pariwar, or null — the registration route's duplicate-mobile PRE-CHECK (QE9). The concurrent loser is caught by the
 * index itself, by name, in the genesis.
 */
export async function findLiveFieldWorkerByMobileIndex(
  db: Db,
  pariwarId: PariwarId,
  mobileBlindIndex: string,
): Promise<FieldWorkerId | null> {
  const rows = await db
    .select({ fieldWorkerId: fieldWorkers.fieldWorkerId })
    .from(fieldWorkers)
    .where(
      and(
        eq(fieldWorkers.pariwarId, pariwarId),
        eq(fieldWorkers.mobileBlindIndex, mobileBlindIndex),
        ne(fieldWorkers.currentState, 'terminated'),
      ),
    )
    .limit(1);
  return rows[0]?.fieldWorkerId ?? null;
}

/**
 * QE17 — `district` must be a LISTED district of the Pariwar at `at` (the write transaction's DB `now()`): a `district`
 * node of the geo tree in force when there is one, else a LISTED workplace district — the same two reads 12.2's
 * `assertScopeValuesRecorded` makes (⛔ that function, ⛔ its error). Compared BYTE FOR BYTE (TR12: a Pariwar Admin's grant
 * covers ANY string, so this is the only data-quality guard).
 *
 * ⚠ A district holding the NUL character is refused as unknown BEFORE any read (review R4): Postgres cannot bind NUL in a text
 * parameter (22021 ⇒ an unmapped 500), the no-tree branch binds the district as one, and no LISTED district can contain it.
 *
 * @throws FieldWorkerDistrictUnknownError
 */
export async function assertDistrictRecorded(db: Db, pariwarId: PariwarId, district: string, at: Date): Promise<void> {
  if (district.includes(NUL)) throw new FieldWorkerDistrictUnknownError(pariwarId);
  const tree = await geoTreeVersionInForce(db, pariwarId, at);
  const listed =
    tree !== null
      ? treeDistricts(tree).includes(district)
      : (await findListedWorkplaceDistricts(db, pariwarId, [district])).has(district);
  if (!listed) throw new FieldWorkerDistrictUnknownError(pariwarId);
}

/** The `district` node values of a tree in force — the ONE place `assertDistrictRecorded` and `listRecordedDistricts` read them. */
function treeDistricts(tree: GeoTreeInForce): string[] {
  return tree.document.nodes.filter((n) => n.dimension === 'district').map((n) => n.value);
}

/** The no-tree branch's cap — `pageWorkplaceDistricts`' own ceiling (13.1a AC8; ⛔ a second page). */
export const RECORDED_DISTRICTS_LIMIT = 200;

/**
 * Story 13.1a (AC8) — the Pariwar's RECORDED districts at `at`, for the screens' pickers: the geo tree's `district` nodes when a
 * tree is in force, else the LISTED workplace districts — the SAME two sources `assertDistrictRecorded` judges (so every value
 * returned passes it). Sorted by UTF-16 code unit (`a < b` — 12.2's `byValue`, locale-free), de-duplicated, exact bytes
 * (I11). `truncated` is true when the no-tree list holds more than `RECORDED_DISTRICTS_LIMIT` (the tree branch never is); the
 * screens then also take an exact typed district (`-447` item 5). Not personal data.
 */
export async function listRecordedDistricts(db: Db, pariwarId: PariwarId, at: Date): Promise<{ districts: string[]; truncated: boolean }> {
  const tree = await geoTreeVersionInForce(db, pariwarId, at);
  const source =
    tree !== null ? { items: treeDistricts(tree), hasMore: false } : await pageWorkplaceDistricts(db, pariwarId, { limit: RECORDED_DISTRICTS_LIMIT });
  const districts = [...new Set(source.items)].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return { districts, truncated: source.hasMore };
}

// ── Story 13.1a — the keyset page and the sealed identity (AD9, AD10; decision `-447` items 1, 3) ──────────────────────
// ⚠ `getFieldWorker` / `listFieldWorkersForPariwar` / `FieldWorkerView` above are UNCHANGED (13.1's read.spec pins them). The
// two reads below return CIPHERTEXT for the API layer's audited decrypt (13.1a AD7, AD9); the only other one is
// `getFieldWorkerForCodeSms`, the sweep's (13.1b). The cursor code is a copy of `marketplace/read.ts`'s strict decoder (the 4th copy — extraction is BigDev's to schedule, 13.1a C4).

/** `pageFieldWorkersForPariwar`'s default page size (13.1a AD10). */
export const PAGE_FIELD_WORKERS_DEFAULT_LIMIT = 20;
/** Its ceiling — a bulk-PII guard (each row is a decrypted name on an officer's screen), ⚠ ⛔ a tuning knob. */
export const PAGE_FIELD_WORKERS_MAX_LIMIT = 25;

/** A keyset position: the row's EXACT `created_at::text` (µs — ⛔ a JS `Date`, which keeps ms only) + its id. */
export interface FieldWorkerListCursor {
  readonly createdAtExact: string;
  readonly fieldWorkerId: FieldWorkerId;
}

/** One page row: the PII-free view, the NAME ciphertext only (⛔ the mobile — the list never carries one, AD9), the exact stamp. */
export interface FieldWorkerListRow {
  readonly view: FieldWorkerView;
  readonly nameCiphertext: string;
  readonly createdAtExact: string;
}

/** The longest cursor `decodeFieldWorkerCursor` accepts (a server-built one is ~110 characters). */
export const FIELD_WORKER_CURSOR_MAX_LENGTH = 256;

/** `created_at::text` as Postgres writes it (ISO DateStyle). Shape ONLY — every field is range-checked separately. */
const CREATED_AT_TEXT = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})(\.\d{1,6})?([+-])(\d{2})(?::(\d{2}))?(?::(\d{2}))?$/;
const LOWER_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const BASE64URL = /^[A-Za-z0-9_-]+$/;

/** The opaque cursor for a page's last row: base64url (⛔ padding) of the CANONICAL `{"c":…,"w":…}`. */
export function encodeFieldWorkerCursor(c: FieldWorkerListCursor): string {
  return Buffer.from(JSON.stringify({ c: c.createdAtExact, w: c.fieldWorkerId }), 'utf8').toString('base64url');
}

/** True iff every field of a `CREATED_AT_TEXT` match is in range — a shape-valid `2026-02-30 …` would 22008 at the cast. */
function createdAtInRange(m: RegExpExecArray): boolean {
  const n = (i: number): number => (m[i] === undefined ? 0 : Number(m[i]));
  const [year, month, day, hour, minute, second] = [n(1), n(2), n(3), n(4), n(5), n(6)];
  if (year < 2000 || year > 9999 || month < 1 || month > 12) return false;
  if (day < 1 || day > new Date(Date.UTC(year, month, 0)).getUTCDate()) return false;
  if (hour > 23 || minute > 59 || second > 59) return false;
  return n(9) <= 15 && n(10) <= 59 && n(11) <= 59;
}

/**
 * Decode a list cursor STRICTLY, in JS, BEFORE any SQL — `marketplace/read.ts` `decodeModuleCursor`'s five steps, with the
 * keys `c`, `w`: the URL-safe alphabet and a canonical re-encode; fatal UTF-8 with the BOM kept in the text; a plain object
 * with EXACTLY `c`, `w` in that order whose text is the canonical `JSON.stringify`; `c` a `timestamptz` text in range; `w` a
 * lower-case UUID. A cast failure on the read transaction would abort it and answer 500 — hence all of this.
 *
 * @throws FieldWorkerCursorInvalidError
 */
export function decodeFieldWorkerCursor(s: unknown): FieldWorkerListCursor {
  const fail = (reason: string): never => {
    throw new FieldWorkerCursorInvalidError(reason);
  };
  if (typeof s !== 'string' || s.length < 1 || s.length > FIELD_WORKER_CURSOR_MAX_LENGTH) fail('length');
  const str = s as string;
  if (!BASE64URL.test(str) || str.length % 4 === 1) fail('alphabet');
  const bytes = Buffer.from(str, 'base64url');
  if (bytes.toString('base64url') !== str) fail('not canonical base64url');
  let text = '';
  try {
    text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
  } catch {
    fail('not utf-8');
  }
  let obj: unknown;
  try {
    obj = JSON.parse(text);
  } catch {
    fail('not json');
  }
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) fail('not an object');
  const rec = obj as Record<string, unknown>;
  const keys = Object.keys(rec);
  if (keys.length !== 2 || keys[0] !== 'c' || keys[1] !== 'w') fail('keys');
  const c = rec['c'];
  const w = rec['w'];
  if (typeof c !== 'string' || typeof w !== 'string') fail('field types');
  if (text !== JSON.stringify({ c, w })) fail('not canonical json');
  const match = CREATED_AT_TEXT.exec(c as string);
  if (match === null || !createdAtInRange(match)) fail('created_at');
  if (!LOWER_UUID.test(w as string)) fail('field worker id');
  return { createdAtExact: c as string, fieldWorkerId: w as FieldWorkerId };
}

/**
 * Story 13.1a (AD10) — a page of this Pariwar's workers in ONE state, optionally of ONE district (byte-equal — I11), in the
 * list order `created_at DESC, field_worker_id DESC`, AFTER a keyset position compared IN SQL on the exact `created_at::text`
 * (⛔ OFFSET). Served in index order by `field_workers_pariwar_created_idx` (0201: `pariwar_id`, then the page order), measured with
 * no Sort at ~2,500 rows a Pariwar for all four forms (first, cursor, district, district + cursor), as the superuser AND as `twt_app`
 * under RLS; a far smaller Pariwar may rightly plan a bitmap scan and a small Sort — `current_state` and
 * `district` are filters on that range (an enum comparison cannot be an index condition under RLS; review CR35, decision `-448`;
 * `page.spec.ts` EXPLAINs this very statement). A rare state walks more of the Pariwar's entries. Over-fetches one row for `nextCursor`.
 * `after` MUST come from `decodeFieldWorkerCursor`. A non-integer `limit` throws `RangeError`; the size is `clampLimit`-ed
 * (default 20, ceiling 25). Returns the NAME ciphertext only.
 */
export async function pageFieldWorkersForPariwar(
  db: Db,
  pariwarId: PariwarId,
  opts: { state: FieldWorkerState; district?: string; after?: FieldWorkerListCursor; limit?: number },
): Promise<{ items: FieldWorkerListRow[]; nextCursor: string | null }> {
  if (opts.limit !== undefined && !Number.isInteger(opts.limit)) {
    throw new RangeError(`pageFieldWorkersForPariwar: limit must be an integer, got ${String(opts.limit)}`);
  }
  // A NUL can never match a stored district (Postgres `text` holds none) and binding one aborts the transaction (22021) —
  // the same guard `assertDistrictRecorded` has; an empty page and no statement (review round 2, CR30).
  if (opts.district !== undefined && opts.district.includes(NUL)) return { items: [], nextCursor: null };
  const limit = clampLimit(opts.limit, { default: PAGE_FIELD_WORKERS_DEFAULT_LIMIT, cap: PAGE_FIELD_WORKERS_MAX_LIMIT });
  const conds = [eq(fieldWorkers.pariwarId, pariwarId), eq(fieldWorkers.currentState, opts.state)];
  if (opts.district !== undefined) conds.push(eq(fieldWorkers.district, opts.district));
  if (opts.after !== undefined) {
    conds.push(
      sql`(${fieldWorkers.createdAt}, ${fieldWorkers.fieldWorkerId}) < (${opts.after.createdAtExact}::timestamptz, ${opts.after.fieldWorkerId}::uuid)`,
    );
  }
  const rows = await db
    .select({
      ...FIELD_WORKER_VIEW_COLUMNS,
      nameCiphertext: fieldWorkers.nameCiphertext,
      createdAtExact: sql<string>`${fieldWorkers.createdAt}::text`,
    })
    .from(fieldWorkers)
    .where(and(...conds))
    .orderBy(desc(fieldWorkers.createdAt), desc(fieldWorkers.fieldWorkerId))
    .limit(clampLimit(limit + 1, { default: PAGE_FIELD_WORKERS_DEFAULT_LIMIT + 1, cap: PAGE_FIELD_WORKERS_MAX_LIMIT + 1 }));
  const items = rows.slice(0, limit).map(({ nameCiphertext, createdAtExact, ...view }) => ({ view, nameCiphertext, createdAtExact }));
  const last = items[items.length - 1];
  return {
    items,
    nextCursor:
      rows.length > limit && last !== undefined
        ? encodeFieldWorkerCursor({ createdAtExact: last.createdAtExact, fieldWorkerId: last.view.fieldWorkerId })
        : null,
  };
}

/** One worker's sealed identity — the view, the approver snapshot (`-447` item 2) and the TWO ciphertexts (13.1a AD9). */
export interface FieldWorkerSealedIdentity {
  readonly view: FieldWorkerView;
  readonly approvedByDisplay: string | null;
  readonly nameCiphertext: string;
  readonly mobileCiphertext: string;
}

/**
 * Story 13.1a (AD9; decision `-447` item 1) — one worker's sealed identity, ONLY while the worker is still in `district` (the
 * district the caller's gate passed, byte-equal): the row the read discloses is the row the authorization covered, on ONE
 * statement — a worker moved after the gate's loader read returns null here, never another district's data. `null` for an
 * unknown worker, another Pariwar's, or one no longer in `district`.
 */
export async function getFieldWorkerSealedIdentity(
  db: Db,
  pariwarId: PariwarId,
  fieldWorkerId: FieldWorkerId,
  opts: { district: string },
): Promise<FieldWorkerSealedIdentity | null> {
  const rows = await db
    .select({
      ...FIELD_WORKER_VIEW_COLUMNS,
      approvedByDisplay: fieldWorkers.approvedByDisplay,
      nameCiphertext: fieldWorkers.nameCiphertext,
      mobileCiphertext: fieldWorkers.mobileCiphertext,
    })
    .from(fieldWorkers)
    .where(and(eq(fieldWorkers.pariwarId, pariwarId), eq(fieldWorkers.fieldWorkerId, fieldWorkerId), eq(fieldWorkers.district, opts.district)))
    .limit(1);
  const r = rows[0];
  if (r === undefined) return null;
  const { approvedByDisplay, nameCiphertext, mobileCiphertext, ...view } = r;
  return { view, approvedByDisplay, nameCiphertext, mobileCiphertext };
}

/** What the code SMS sweep may know of a worker before it sends (Story 13.1b, AD4): the state, and the sealed mobile. ⛔ The name. */
export interface FieldWorkerForCodeSms {
  readonly currentState: FieldWorkerState;
  readonly mobileCiphertext: string;
}

/**
 * Story 13.1b (AD4, AC7) — one worker's state and sealed mobile, for the sweep's audited decrypt. A plain read, ⛔ `FOR SHARE`: 13.1a's
 * lock held `active` through an audit line on a second connection, which on a jobs pool is the starvation trap (AD4 accepts the seconds
 * after it). The `pariwar_id` predicate is the ONLY Pariwar filter here: the sweep's scope sets ⛔ role (G3).
 *
 * DELIBERATE (checklist family 9): two bypasses of the 13.1a read's protections, both in AD4 and `-450`. (1) No `FOR SHARE`, so a suspension
 * landing between this read and the gateway call does not stop the text. (2) The Pariwar predicate is explicit and nothing else bounds it.
 * Re-examine (1) when Story 13.1c ships a suspend route, because until then no worker can leave `active` in that window; re-examine (2) if
 * the sweep's scope ever sets a role.
 * ⭐ RE-EXAMINED 2026-11-07 by Story 13.1c (AD10 (c)), which ships suspend AND terminate: (1) is RE-ACCEPTED, unchanged (13.1b AD4). A
 * suspension or an ending in the seconds between this read and the gateway call can still let the text go; the text only tells the worker
 * their own code, and what a signup on that code earns while the worker is not `active` is the credit recorder's under `-454` Q6 C (held
 * for `under_review`), not the text's — for an ended worker, nothing. The sweep is ⛔ touched.
 */
export async function getFieldWorkerForCodeSms(db: Db, pariwarId: PariwarId, fieldWorkerId: FieldWorkerId): Promise<FieldWorkerForCodeSms | null> {
  const rows = await db
    .select({ currentState: fieldWorkers.currentState, mobileCiphertext: fieldWorkers.mobileCiphertext })
    .from(fieldWorkers)
    .where(and(eq(fieldWorkers.pariwarId, pariwarId), eq(fieldWorkers.fieldWorkerId, fieldWorkerId)))
    .limit(1);
  return rows[0] ?? null;
}

// ── The worker's log (Story 13.1c AD7; `-441` "Keep the full log of field worker") ─────────────────────

/** `listFieldWorkerEvents`'s default page size. */
export const LIST_FIELD_WORKER_EVENTS_DEFAULT_LIMIT = 50;
/** `listFieldWorkerEvents`'s hard cap (a worker has seven event types; real streams are short). */
export const LIST_FIELD_WORKER_EVENTS_MAX_LIMIT = 100;

/**
 * One event of a worker's stream, as the log shows it (AD7). Every field an event does not carry is `null`. ⛔ A name, a mobile or a
 * code — the payloads hold none (13.1 QE4). `actorDisplayName` is the officer's CURRENT `users.display_name`, read at READ time (a
 * variance from 6.11 R5's snapshot, so no staff name enters the append-only log); NULL or blank ⇒ `null`, ⛔ an email fallback.
 * `role`, `permissionKey`, `grant` and `targetDistrict` come from the payload's authorization snapshot (every event carries one since
 * 13.1a AD3 / 13.1c AD3; a stream written before them exists only in test databases).
 */
export interface FieldWorkerLogEntry {
  readonly eventVersion: number;
  readonly eventType: string;
  /** `events_log.occurred_at` (the transaction START) as an ISO-8601 instant. Order by `eventVersion`, ⛔ by this (TR4). */
  readonly occurredAt: string;
  readonly actorUserId: string | null;
  readonly actorDisplayName: string | null;
  readonly role: string | null;
  readonly permissionKey: string | null;
  readonly grant: { readonly dimension: string; readonly value: string | null } | null;
  readonly targetDistrict: string | null;
  readonly reasonCode: string | null;
  readonly fromDistrict: string | null;
  readonly toDistrict: string | null;
  readonly endedOn: string | null;
  /** Story 13.1f — the payload's `to_state` (the undo's restored state; every event carries one). */
  readonly toState: string | null;
  /** Story 13.1f — the undo's `cause` (`mistake` | `appeal_allowed`), else null. */
  readonly cause: string | null;
  /** Story 13.1f — the allowed appeal an undo carries out, else null. */
  readonly appealId: string | null;
  /** Story 13.1f (AD12) — the genesis's link to an earlier ended record, else null. */
  readonly previousFieldWorkerId: string | null;
}

/** One page of the log, and the `after` that reads the next one (`null` when this page is the last). */
export interface FieldWorkerLogPage {
  readonly items: readonly FieldWorkerLogEntry[];
  readonly nextAfter: number | null;
}

/** `value` if it is a string, else `null` — the payload is JSON read back; a field an event lacks is `null`. */
function str(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

/**
 * Story 13.1c (AD7) — a page of one worker's WHOLE event stream, in `event_version` order: keyset on `event_version > afterVersion`
 * (default 0), `clampLimit`-ed (default 50, cap 100). `null` iff no `field_workers` row exists for (pariwar, id) — the existence check
 * of `getFieldWorkerStateAt`. The log FOLLOWS the worker: a worker moved A → B shows the events from A too (`-441`'s "full log"). Runs on
 * the caller's (hook) transaction; it writes nothing, decrypts nothing, and needs no audit line (AD7). The officer's name is a LEFT JOIN
 * to `users` (readable under `twt_app` — `users_global_access`, 0005).
 * @throws RangeError  `afterVersion` is not a non-negative integer, or `limit` is not an integer (⛔ statement sent).
 */
export async function listFieldWorkerEvents(
  db: Db,
  pariwarId: PariwarId,
  fieldWorkerId: FieldWorkerId,
  opts: { afterVersion?: number; limit?: number } = {},
): Promise<FieldWorkerLogPage | null> {
  const after = opts.afterVersion ?? 0;
  if (!Number.isSafeInteger(after) || after < 0) throw new RangeError('afterVersion must be a non-negative integer');
  // `clampLimit` passes NaN and a fraction through (`Math.max(1, NaN)` is NaN) and Postgres would answer 22P02 — the sibling's guard.
  if (opts.limit !== undefined && !Number.isInteger(opts.limit)) {
    throw new RangeError(`listFieldWorkerEvents: limit must be an integer, got ${String(opts.limit)}`);
  }
  const limit = clampLimit(opts.limit, { default: LIST_FIELD_WORKER_EVENTS_DEFAULT_LIMIT, cap: LIST_FIELD_WORKER_EVENTS_MAX_LIMIT });

  const exists = await db
    .select({ one: sql<number>`1` })
    .from(fieldWorkers)
    .where(and(eq(fieldWorkers.pariwarId, pariwarId), eq(fieldWorkers.fieldWorkerId, fieldWorkerId)))
    .limit(1);
  if (exists.length === 0) return null;

  const rows = await db
    .select({
      eventVersion: eventsLog.eventVersion,
      eventType: eventsLog.eventType,
      occurredAt: eventsLog.occurredAt,
      actorId: eventsLog.actorId,
      payload: eventsLog.payload,
      displayName: users.displayName,
    })
    .from(eventsLog)
    .leftJoin(users, eq(users.id, eventsLog.actorId))
    .where(and(eq(eventsLog.pariwarId, pariwarId), eq(eventsLog.streamId, fieldWorkerId), sql`${eventsLog.eventVersion} > ${after}`))
    .orderBy(asc(eventsLog.eventVersion))
    .limit(clampLimit(limit + 1, { default: LIST_FIELD_WORKER_EVENTS_DEFAULT_LIMIT + 1, cap: LIST_FIELD_WORKER_EVENTS_MAX_LIMIT + 1 }));

  const items = rows.slice(0, limit).map((r): FieldWorkerLogEntry => {
    const p = (typeof r.payload === 'object' && r.payload !== null ? r.payload : {}) as Record<string, unknown>;
    const a = (typeof p['authorization'] === 'object' && p['authorization'] !== null ? p['authorization'] : null) as Record<string, unknown> | null;
    const g = (a !== null && typeof a['grant'] === 'object' && a['grant'] !== null ? a['grant'] : null) as Record<string, unknown> | null;
    const t = (a !== null && typeof a['target'] === 'object' && a['target'] !== null ? a['target'] : null) as Record<string, unknown> | null;
    const name = r.displayName ?? null;
    return {
      eventVersion: Number(r.eventVersion),
      eventType: r.eventType,
      occurredAt: new Date(r.occurredAt).toISOString(),
      actorUserId: r.actorId ?? null,
      actorDisplayName: name !== null && name.trim() !== '' ? name : null,
      role: a === null ? null : str(a['role']),
      permissionKey: a === null ? null : str(a['permission_key']),
      grant: g === null || typeof g['dimension'] !== 'string' ? null : { dimension: g['dimension'], value: str(g['value']) },
      targetDistrict: t === null ? null : str(t['value']),
      reasonCode: str(p['reason_code']),
      fromDistrict: str(p['from_district']),
      toDistrict: str(p['to_district']),
      endedOn: str(p['ended_on']),
      toState: str(p['to_state']),
      cause: str(p['cause']),
      appealId: str(p['appeal_id']),
      previousFieldWorkerId: str(p['previous_field_worker_id']),
    };
  });
  return { items, nextAfter: rows.length > limit ? items[items.length - 1]!.eventVersion : null };
}

// ── The as-of read (QE11, AC10) ────────────────────────────────────────────────────────────────────

/**
 * The instant is NAMED, ⛔ passed (13.2 AT4 (c)): a stored capture, or `'now'`. There is ⛔ `{ instant }` arm and ⛔ JS
 * `Date` — a JS `Date` keeps milliseconds only. LOCAL type — ⛔ 13.2's `AttributionAsOf` (I9).
 */
export type FieldWorkerAsOf = { readonly captureId: MemberAttributionId } | 'now';

/** `null` for `'now'`, else the capture id — or `TypeError` BEFORE any SQL (13.2's `parseAsOf` rule). */
function parseFieldWorkerAsOf(asOf: unknown): string | null {
  if (asOf === 'now') return null;
  if (typeof asOf === 'object' && asOf !== null && !Array.isArray(asOf)) {
    const keys = Object.keys(asOf);
    const captureId = (asOf as { captureId?: unknown }).captureId;
    if (keys.length === 1 && keys[0] === 'captureId' && typeof captureId === 'string' && UUID_REGEX.test(captureId)) {
      return captureId;
    }
  }
  throw new TypeError("asOf must be 'now' or { captureId: <member_attribution id> }");
}

/**
 * The worker's lifecycle projection AS OF a member's capture (or now) — for Story 13.8's signup and 13.5's backfill: apply
 * `acceptsNewAttributions(result.state)` (C2). `null` iff no `field_workers` row exists for (pariwar, id).
 *
 * THE ORDERING CONTRACT (AC10; copied from the SHIPPED `getModuleStateAt`):
 *  (1) events are ordered by `event_version`, ⛔ `occurred_at`;
 *  (2) the answer folds the longest PREFIX whose events ALL have `occurred_at <= captured_at` — cut at the FIRST event
 *      stamped after the instant (⛔ a per-event filter: `occurred_at` is the transaction START, so a transaction that began
 *      first but won the row lock second appends the HIGHER version with the LOWER stamp; a filter would replay {v1, v3}
 *      and skip v2 — `active` with KYC pending, a state I5 forbids and the worker never had);
 *  (3) a TIE counts — an event stamped exactly AT the capture is included (13.2's `allocated_at <= captured_at` way round);
 *  (4) every comparison is made IN SQL at microsecond precision — `captured_at` is read in the SAME statement, never into JS;
 *  (5) `'now'` applies NO cut — the whole stream, the latest committed state (= the stored projection, I4);
 *  (6) an empty prefix is the initial `pending_kyc` (the worker exists);
 *  (7) all EIGHT event types replay (one event per transition — small), through `foldFieldWorkerProjection` — Story 13.1f's
 *      `field_worker.ending_undone` included: a capture made while the worker was ended reads `terminated`; one after the undo, the
 *      restored state.
 * ⚠ (8) CLOCK DOMAINS: `events_log.occurred_at` and `member_attribution.captured_at` are both `now()` — the TRANSACTION
 * START — while 13.2's `allocated_at` is `clock_timestamp()`. A transition therefore counts from the moment its transaction
 * BEGAN, at BOTH edges: a signup whose transaction starts inside a SUSPENSION's window reads as already-suspended here while
 * a live read of the row still says `active`; one starting inside an ACTIVATION's window reads as `active` although the
 * activation had not committed. This is the event-sourced, replayable answer (I4) — ⛔ "fix" it with `clock_timestamp()`.
 *
 * @throws TypeError                        `asOf` is neither form (⛔ statement sent).
 * @throws FieldWorkerCaptureNotFoundError  `{ captureId }` names no `member_attribution` row of THIS Pariwar.
 */
export async function getFieldWorkerStateAt(
  db: Db,
  pariwarId: PariwarId,
  fieldWorkerId: FieldWorkerId,
  asOf: FieldWorkerAsOf,
): Promise<FieldWorkerProjection | null> {
  const captureId = parseFieldWorkerAsOf(asOf);

  const exists = await db
    .select({ one: sql<number>`1` })
    .from(fieldWorkers)
    .where(and(eq(fieldWorkers.pariwarId, pariwarId), eq(fieldWorkers.fieldWorkerId, fieldWorkerId)))
    .limit(1);
  if (exists.length === 0) return null;

  if (captureId !== null) {
    // ⚠ Explicit aliases and BOUND parameters — ⛔ a Column-to-Column correlation (`events_log` and `member_attribution` both
    // have `pariwar_id`; a same-named outer Column turns a Drizzle correlated subquery into a tautology).
    const capture = await db.execute(
      sql`SELECT 1 FROM member_attribution ma WHERE ma.attribution_id = ${captureId}::uuid AND ma.pariwar_id = ${pariwarId}::uuid`,
    );
    if (capture.rows.length === 0) throw new FieldWorkerCaptureNotFoundError(pariwarId, captureId);
  }

  const afterCapture =
    captureId === null
      ? sql<boolean>`false`
      : sql<boolean>`${eventsLog.occurredAt} > (SELECT ma.captured_at FROM member_attribution ma
                                                 WHERE ma.attribution_id = ${captureId}::uuid AND ma.pariwar_id = ${pariwarId}::uuid)`;
  const rows = await db
    .select({
      type: eventsLog.eventType,
      payload: eventsLog.payload,
      eventVersion: eventsLog.eventVersion,
      afterCapture,
    })
    .from(eventsLog)
    .where(and(eq(eventsLog.pariwarId, pariwarId), eq(eventsLog.streamId, fieldWorkerId)))
    .orderBy(asc(eventsLog.eventVersion));
  const firstAfter = rows.findIndex((r) => r.afterCapture === true);
  const prefix = firstAfter === -1 ? rows : rows.slice(0, firstAfter);
  return foldFieldWorkerProjection(prefix.map((r) => ({ type: r.type, payload: r.payload, eventVersion: r.eventVersion })));
}

/**
 * Story 13.1a (AD8; decision `-447` item 1 — review R2 / R3) — the code route's eligibility read: the worker's state and district,
 * with the row locked `FOR SHARE` on the caller's (READ COMMITTED) transaction. The lock is held until that transaction ends, so a
 * concurrent suspend, terminate or move — each takes the row `FOR UPDATE` — waits until the code has been read on the SAME
 * transaction: the `active` check and the district check cannot go stale between this read and the door's. `null` for an unknown
 * worker or another Pariwar's. Under twt_app the lock needs the UPDATE grant and policy (13.1's commands use the same).
 */
export async function lockFieldWorkerForCodeRead(
  db: Db,
  pariwarId: PariwarId,
  fieldWorkerId: FieldWorkerId,
): Promise<{ readonly currentState: FieldWorkerState; readonly district: string } | null> {
  const rows = await db
    .select({ currentState: fieldWorkers.currentState, district: fieldWorkers.district })
    .from(fieldWorkers)
    .where(and(eq(fieldWorkers.pariwarId, pariwarId), eq(fieldWorkers.fieldWorkerId, fieldWorkerId)))
    .for('share');
  return rows[0] ?? null;
}

// ── Story 13.1f — the current ending, the shown number, the link, the eligible list (decision `2026-11-16-464` AD5, AD11–AD13, AD17) ──

/**
 * AD17 — "the current ending" of a TERMINATED worker: its `field_worker.terminated` event (the one at the row's `state_event_version` —
 * nothing else is written to the stream while terminated), the hearer fixed at that ending (`appeal_heard_by`, read RAW from the JSON
 * — TR18; ABSENT ⇒ `trustee_panel`, the more independent hearer: a legacy event, test databases only — AD8) and the ENDER (that row's
 * `events_log.actor_id` COLUMN — ⛔ a payload key). ⛔ The strict write schema. `null` unless the worker exists here and is terminated.
 * The legacy rule lives HERE and nowhere else.
 */
export interface FieldWorkerCurrentEnding {
  readonly endingVersion: number;
  readonly heardBy: FieldWorkerEndingAppealHearer;
  readonly endedByUserId: string;
  readonly endedOn: string;
  readonly reasonCode: FieldWorkerReasonCode;
  readonly district: string;
}

export async function getCurrentFieldWorkerEnding(
  db: Db,
  pariwarId: PariwarId,
  fieldWorkerId: FieldWorkerId,
): Promise<FieldWorkerCurrentEnding | null> {
  const res = await db.execute(sql`
    SELECT e.event_version, COALESCE(e.payload->>'appeal_heard_by', 'trustee_panel') AS heard_by, e.actor_id,
           fw.ended_on::text AS ended_on, fw.state_reason_code::text AS reason_code, fw.district
      FROM field_workers fw
      JOIN events_log e ON e.pariwar_id = fw.pariwar_id AND e.stream_id = fw.field_worker_id AND e.event_version = fw.state_event_version
     WHERE fw.pariwar_id = ${pariwarId}::uuid AND fw.field_worker_id = ${fieldWorkerId}::uuid
       AND fw.current_state = 'terminated' AND e.event_type = 'field_worker.terminated'`);
  const r = res.rows[0] as
    | { event_version: string | number; heard_by: string; actor_id: string | null; ended_on: string; reason_code: string; district: string }
    | undefined;
  if (r === undefined || r.actor_id === null) return null;
  if (r.heard_by !== 'pariwar_admin' && r.heard_by !== 'trustee_panel') return null;
  return {
    endingVersion: Number(r.event_version),
    heardBy: r.heard_by,
    endedByUserId: r.actor_id,
    endedOn: r.ended_on,
    reasonCode: r.reason_code as FieldWorkerReasonCode,
    district: r.district,
  };
}

/** AD17's in-lock twin — the same read on the client that holds the worker's row lock (the lodge command's step (3)). */
export async function getCurrentFieldWorkerEndingLocked(
  client: pg.PoolClient,
  pariwarId: PariwarId,
  fieldWorkerId: FieldWorkerId,
): Promise<FieldWorkerCurrentEnding | null> {
  return getCurrentFieldWorkerEnding(bindScopedDb(client), pariwarId, fieldWorkerId);
}

/** AD11 — at most this many earlier endings are shown on the register screen. */
export const PREVIOUS_ENDINGS_SHOWN_MAX = 5;

/** One earlier ENDED record holding a number — what the registering officer is shown (Q3 A: a date and a reason; ⛔ name, district, officer). */
export interface FieldWorkerPreviousEnding {
  readonly fieldWorkerId: FieldWorkerId;
  readonly endedOn: string;
  readonly reasonCode: FieldWorkerReasonCode;
}

/**
 * AD11 — this Pariwar's TERMINATED workers holding `mobileBlindIndex` (every district), `ended_on DESC, field_worker_id`, at most 5.
 * Decrypts nothing (the index is a keyed hash). The register route's ended pre-check, after the live one.
 */
export async function findEndedFieldWorkersByMobileIndex(
  db: Db,
  pariwarId: PariwarId,
  mobileBlindIndex: string,
): Promise<FieldWorkerPreviousEnding[]> {
  const rows = await db
    .select({
      fieldWorkerId: fieldWorkers.fieldWorkerId,
      endedOn: sql<string>`${fieldWorkers.endedOn}::text`,
      reasonCode: fieldWorkers.stateReasonCode,
    })
    .from(fieldWorkers)
    .where(
      and(
        eq(fieldWorkers.pariwarId, pariwarId),
        eq(fieldWorkers.mobileBlindIndex, mobileBlindIndex),
        eq(fieldWorkers.currentState, 'terminated'),
      ),
    )
    .orderBy(desc(fieldWorkers.endedOn), asc(fieldWorkers.fieldWorkerId))
    .limit(PREVIOUS_ENDINGS_SHOWN_MAX);
  return rows.map((r) => ({ fieldWorkerId: r.fieldWorkerId, endedOn: r.endedOn, reasonCode: r.reasonCode as FieldWorkerReasonCode }));
}

/** AD5 — the worker's mobile BLIND INDEX (a keyed hash, ⛔ decrypted), or null — the undo's pre-read of "the number is live again". */
export async function getFieldWorkerMobileIndex(db: Db, pariwarId: PariwarId, fieldWorkerId: FieldWorkerId): Promise<string | null> {
  const rows = await db
    .select({ mobileBlindIndex: fieldWorkers.mobileBlindIndex })
    .from(fieldWorkers)
    .where(and(eq(fieldWorkers.pariwarId, pariwarId), eq(fieldWorkers.fieldWorkerId, fieldWorkerId)))
    .limit(1);
  return rows[0]?.mobileBlindIndex ?? null;
}

/**
 * AD12 — the link's re-check, IN the registration's scope transaction BEFORE the genesis INSERT: the candidate record's state and
 * blind index, the row locked `FOR SHARE` (the `lockFieldWorkerForCodeRead` precedent). A concurrent undo of that record (it holds
 * `FOR UPDATE`) finishes first, and the registration then sees it live and answers `link_invalid` — without the lock, the INSERT's FK
 * check waits on the undo while the undo's UPDATE waits on the INSERT's index entry: a deadlock (TR15). `null` for an unknown id or
 * another Pariwar's.
 */
export async function lockFieldWorkerForLink(
  db: Db,
  pariwarId: PariwarId,
  fieldWorkerId: FieldWorkerId,
): Promise<{ readonly currentState: FieldWorkerState; readonly mobileBlindIndex: string } | null> {
  const rows = await db
    .select({ currentState: fieldWorkers.currentState, mobileBlindIndex: fieldWorkers.mobileBlindIndex })
    .from(fieldWorkers)
    .where(and(eq(fieldWorkers.pariwarId, pariwarId), eq(fieldWorkers.fieldWorkerId, fieldWorkerId)))
    .for('share');
  return rows[0] ?? null;
}

/** AD12 — how many links `listFieldWorkerLinkChain` follows. */
export const FIELD_WORKER_LINK_CHAIN_MAX = 10;

/**
 * AD12 — the earlier records reached from `fieldWorkerId` by following `previous_field_worker_id`, nearest first, at most 10 hops (a
 * cycle is impossible — the column is set at the INSERT to an EXISTING row — but the depth is capped anyway). Each with its district,
 * for the reader's own read check. Excludes the worker itself.
 */
export async function listFieldWorkerLinkChain(
  db: Db,
  pariwarId: PariwarId,
  fieldWorkerId: FieldWorkerId,
): Promise<{ readonly fieldWorkerId: FieldWorkerId; readonly district: string }[]> {
  const res = await db.execute(sql`
    WITH RECURSIVE chain(id, depth) AS (
      SELECT fw.previous_field_worker_id, 1
        FROM field_workers fw
       WHERE fw.pariwar_id = ${pariwarId}::uuid AND fw.field_worker_id = ${fieldWorkerId}::uuid AND fw.previous_field_worker_id IS NOT NULL
      UNION ALL
      SELECT fw.previous_field_worker_id, c.depth + 1
        FROM chain c JOIN field_workers fw ON fw.pariwar_id = ${pariwarId}::uuid AND fw.field_worker_id = c.id
       WHERE fw.previous_field_worker_id IS NOT NULL AND c.depth < ${FIELD_WORKER_LINK_CHAIN_MAX}
    )
    SELECT c.id AS field_worker_id, fw.district
      FROM chain c JOIN field_workers fw ON fw.pariwar_id = ${pariwarId}::uuid AND fw.field_worker_id = c.id
     ORDER BY c.depth`);
  return (res.rows as { field_worker_id: string; district: string }[]).map((r) => ({
    fieldWorkerId: r.field_worker_id as FieldWorkerId,
    district: r.district,
  }));
}

/** AD13 — the eligible list's page size (13.1d's — one audit line names a page's workers). */
export const PAGE_APPEAL_ELIGIBLE_DEFAULT_LIMIT = 20;
export const PAGE_APPEAL_ELIGIBLE_MAX_LIMIT = 25;

/** One ended worker a hearer can record an appeal for — the NAME as ciphertext (the API decrypts it, audited). ⛔ mobile, ⛔ code. */
export interface FieldWorkerAppealEligibleRow {
  readonly fieldWorkerId: FieldWorkerId;
  readonly nameCiphertext: string;
  readonly district: string;
  readonly endedOn: string;
  readonly reasonCode: FieldWorkerReasonCode;
  readonly endingEventVersion: number;
  readonly heardBy: FieldWorkerEndingAppealHearer;
}

/**
 * The eligible list's cursor reuses the worker-list codec (`decodeFieldWorkerCursor` — strict, before any SQL): `c` carries the
 * `ended_on` date as `YYYY-MM-DD 00:00:00+00` (a `timestamptz` text the codec accepts), `w` the worker id.
 */
export function encodeAppealEligibleCursor(endedOn: string, fieldWorkerId: FieldWorkerId): string {
  return encodeFieldWorkerCursor({ createdAtExact: `${endedOn} 00:00:00+00`, fieldWorkerId });
}
/** @throws FieldWorkerCursorInvalidError */
export function decodeAppealEligibleCursor(s: unknown): { readonly endedOn: string; readonly fieldWorkerId: FieldWorkerId } {
  const c = decodeFieldWorkerCursor(s);
  if (!/^\d{4}-\d{2}-\d{2} 00:00:00\+00$/.test(c.createdAtExact)) throw new FieldWorkerCursorInvalidError('ended_on');
  return { endedOn: c.createdAtExact.slice(0, 10), fieldWorkerId: c.fieldWorkerId };
}

/**
 * AD13 — this Pariwar's TERMINATED workers whose CURRENT ending (AD17: the terminated event at `state_event_version`) has no OPEN or
 * REFUSED appeal and whose hearer is one of `hearers` (the hear keys the reader holds — the API decides, `_as_panel` counted only from a
 * non-`global` grant), optionally of ONE district; `ended_on DESC, field_worker_id DESC`. An empty `hearers` reads nothing.
 */
export async function pageAppealEligibleFieldWorkers(
  db: Db,
  pariwarId: PariwarId,
  opts: {
    district?: string;
    hearers: readonly FieldWorkerEndingAppealHearer[];
    after?: { readonly endedOn: string; readonly fieldWorkerId: FieldWorkerId };
    limit?: number;
  },
): Promise<{ items: FieldWorkerAppealEligibleRow[]; nextCursor: string | null }> {
  if (opts.limit !== undefined && !Number.isInteger(opts.limit)) {
    throw new RangeError(`pageAppealEligibleFieldWorkers: limit must be an integer, got ${String(opts.limit)}`);
  }
  if (opts.hearers.length === 0) return { items: [], nextCursor: null };
  if (opts.district !== undefined && opts.district.includes(NUL)) return { items: [], nextCursor: null };
  const limit = clampLimit(opts.limit, { default: PAGE_APPEAL_ELIGIBLE_DEFAULT_LIMIT, cap: PAGE_APPEAL_ELIGIBLE_MAX_LIMIT });
  const fetch = clampLimit(limit + 1, { default: PAGE_APPEAL_ELIGIBLE_DEFAULT_LIMIT + 1, cap: PAGE_APPEAL_ELIGIBLE_MAX_LIMIT + 1 });
  const hearers = sql.join(opts.hearers.map((h) => sql`${h}`), sql`, `);
  const res = await db.execute(sql`
    SELECT fw.field_worker_id, fw.name_ciphertext, fw.district, fw.ended_on::text AS ended_on, fw.state_reason_code::text AS reason_code,
           e.event_version AS ending_event_version, COALESCE(e.payload->>'appeal_heard_by', 'trustee_panel') AS heard_by
      FROM field_workers fw
      JOIN events_log e ON e.pariwar_id = fw.pariwar_id AND e.stream_id = fw.field_worker_id AND e.event_version = fw.state_event_version
     WHERE fw.pariwar_id = ${pariwarId}::uuid AND fw.current_state = 'terminated' AND e.event_type = 'field_worker.terminated'
       AND COALESCE(e.payload->>'appeal_heard_by', 'trustee_panel') IN (${hearers})
       ${opts.district === undefined ? sql`` : sql`AND fw.district = ${opts.district}`}
       ${opts.after === undefined ? sql`` : sql`AND (fw.ended_on, fw.field_worker_id) < (${opts.after.endedOn}::date, ${opts.after.fieldWorkerId}::uuid)`}
       AND NOT EXISTS (
         SELECT 1 FROM field_worker_ending_appeals a
          WHERE a.pariwar_id = fw.pariwar_id AND a.field_worker_id = fw.field_worker_id
            AND a.ending_event_version = fw.state_event_version AND a.state IN ('open', 'refused'))
     ORDER BY fw.ended_on DESC, fw.field_worker_id DESC
     LIMIT ${fetch}`);
  const rows = res.rows as {
    field_worker_id: string;
    name_ciphertext: string;
    district: string;
    ended_on: string;
    reason_code: string;
    ending_event_version: string | number;
    heard_by: FieldWorkerEndingAppealHearer;
  }[];
  const page = rows.slice(0, limit);
  const last = page[page.length - 1];
  return {
    items: page.map((r) => ({
      fieldWorkerId: r.field_worker_id as FieldWorkerId,
      nameCiphertext: r.name_ciphertext,
      district: r.district,
      endedOn: r.ended_on,
      reasonCode: r.reason_code as FieldWorkerReasonCode,
      endingEventVersion: Number(r.ending_event_version),
      heardBy: r.heard_by,
    })),
    nextCursor: rows.length > limit && last !== undefined ? encodeAppealEligibleCursor(last.ended_on, last.field_worker_id as FieldWorkerId) : null,
  };
}
