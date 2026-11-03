// Field-worker read accessors — Story 13.1 (QE4, QE11, QE17; AC10).
//
// Every read carries an EXPLICIT `pariwar_id` predicate (RLS is ⛔ the only filter — an owner-role caller bypasses it, 13.2
// TR3). The worker reads return a `FieldWorkerView` that OMITS the three PII columns (`name_ciphertext`,
// `mobile_ciphertext`, `mobile_blind_index`) in the SELECT LIST — ⛔ dropped after the fetch. ⛔ No function here decrypts a
// worker's data: decrypt-on-read is Story 13.3's / 13.4's decision (C1, C6).

import { and, asc, desc, eq, ne, sql } from 'drizzle-orm';

import { UUID_REGEX, type Db } from '../db.js';
import { geoTreeVersionInForce } from '../geo-tree/registry.js';
import type { FieldWorkerId, MemberAttributionId, PariwarId } from '../ids/index.js';
import { findListedWorkplaceDistricts } from '../marketplace/scope-options.js';
import { clampLimit } from '../pagination.js';
import { eventsLog } from '../schema/events_log.js';
import { fieldWorkers, type FieldWorkerState } from '../schema/field_workers.js';
import { FieldWorkerCaptureNotFoundError, FieldWorkerDistrictUnknownError } from './errors.js';
import { foldFieldWorkerProjection, type FieldWorkerProjection } from './state.js';

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
 * @throws FieldWorkerDistrictUnknownError
 */
export async function assertDistrictRecorded(db: Db, pariwarId: PariwarId, district: string, at: Date): Promise<void> {
  const tree = await geoTreeVersionInForce(db, pariwarId, at);
  const listed =
    tree !== null
      ? tree.document.nodes.some((n) => n.dimension === 'district' && n.value === district)
      : (await findListedWorkplaceDistricts(db, pariwarId, [district])).has(district);
  if (!listed) throw new FieldWorkerDistrictUnknownError(pariwarId);
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
