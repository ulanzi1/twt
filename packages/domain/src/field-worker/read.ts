// Field-worker read accessors — Story 13.1 (QE4, QE11, QE17; AC10).
//
// Every read carries an EXPLICIT `pariwar_id` predicate (RLS is ⛔ the only filter — a superuser bypasses it, 13.2 TR3;
// `-449`: under FORCE a plain owner does not). The worker reads return a `FieldWorkerView` that OMITS the three PII columns (`name_ciphertext`,
// `mobile_ciphertext`, `mobile_blind_index`) in the SELECT LIST — ⛔ dropped after the fetch. ⛔ No function here decrypts a
// worker's data. Story 13.1a adds the ONLY two reads that return ciphertext — `pageFieldWorkersForPariwar` (the name) and
// `getFieldWorkerSealedIdentity` (the name and the mobile) — for the API layer's audited decrypt-on-read (13.1a AD7, AD9); the
// worker's own read is still Story 13.3's (C1).

import { and, asc, desc, eq, ne, sql } from 'drizzle-orm';

import { UUID_REGEX, type Db } from '../db.js';
import { geoTreeVersionInForce, type GeoTreeInForce } from '../geo-tree/registry.js';
import type { FieldWorkerId, MemberAttributionId, PariwarId } from '../ids/index.js';
import { findListedWorkplaceDistricts } from '../marketplace/scope-options.js';
import { clampLimit } from '../pagination.js';
import { eventsLog } from '../schema/events_log.js';
import { fieldWorkers, type FieldWorkerState } from '../schema/field_workers.js';
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
// two reads below are the ONLY ones that return CIPHERTEXT — for the API layer's audited decrypt (13.1a AD7, AD9). The cursor
// code is a copy of `marketplace/read.ts`'s strict decoder (the 4th copy — extraction is BigDev's to schedule, 13.1a C4).

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
 *  (7) all seven event types replay (one event per transition — small), through `foldFieldWorkerProjection`.
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
