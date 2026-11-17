// The appeal's reads — Story 13.1f (decision `2026-11-16-464` AD7, AD9, AD13). Every read carries an EXPLICIT `pariwar_id` predicate (RLS
// is ⛔ the only filter). ⛔ No function here decrypts: the list returns the worker's NAME as ciphertext and the API decrypts it behind one
// audit line a page (13.1d's shape). ⛔ A mobile or a code anywhere (I6). Officer names are CURRENT display names, never derived from an
// email ([[project_admin_display_name_attribution]]). The trustee-only rule (AD13 — a reader under `trustee_panel` sees ONLY Panel-heard
// appeals, on every read) is the caller's `heardBy` filter, applied uniformly.

import { and, desc, eq, sql } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { FieldWorkerEndingAppealId, FieldWorkerId, PariwarId } from '../ids/index.js';
import { clampLimit } from '../pagination.js';
import {
  fieldWorkerEndingAppeals,
  type FieldWorkerEndingAppealChannel,
  type FieldWorkerEndingAppealHearer,
  type FieldWorkerEndingAppealState,
} from '../schema/field_worker_ending_appeals.js';
import { fieldWorkers } from '../schema/field_workers.js';
import { users } from '../schema/users.js';
import { decodeFieldWorkerCursor, encodeFieldWorkerCursor } from './read.js';

/** The NUL character — the one code point a Postgres text parameter cannot carry (built, ⛔ written as an escape). */
const NUL = String.fromCharCode(0);

/** AD13 — page sizes (13.1d's: one audit line names a page's workers). */
export const PAGE_ENDING_APPEALS_DEFAULT_LIMIT = 20;
export const PAGE_ENDING_APPEALS_MAX_LIMIT = 25;

/** One appeal as every response shows it (AD7) — ids, dates, codes and the lodger's CURRENT name. ⛔ Name, mobile or code of the worker. */
export interface FieldWorkerEndingAppealView {
  readonly appealId: FieldWorkerEndingAppealId;
  readonly fieldWorkerId: FieldWorkerId;
  readonly endingEventVersion: number;
  readonly state: FieldWorkerEndingAppealState;
  readonly heardBy: FieldWorkerEndingAppealHearer;
  readonly receivedOn: string;
  readonly receivedVia: FieldWorkerEndingAppealChannel;
  readonly decidedOn: string | null;
  readonly lodgedBy: { readonly userId: string; readonly displayName: string | null };
  readonly createdAt: string;
}

const t = fieldWorkerEndingAppeals;
const VIEW_COLUMNS = {
  appealId: t.appealId,
  fieldWorkerId: t.fieldWorkerId,
  endingEventVersion: t.endingEventVersion,
  state: t.state,
  heardBy: t.heardBy,
  receivedOn: sql<string>`${t.receivedOn}::text`,
  receivedVia: t.receivedVia,
  decidedOn: sql<string | null>`${t.decidedOn}::text`,
  lodgedByUserId: t.lodgedByUserId,
  lodgedByDisplay: users.displayName,
  createdAt: t.createdAt,
  createdAtExact: sql<string>`${t.createdAt}::text`,
};

type ViewSelect = { [K in keyof typeof VIEW_COLUMNS]: unknown };

function toView(r: ViewSelect): FieldWorkerEndingAppealView {
  const display = (r.lodgedByDisplay as string | null) ?? null;
  return {
    appealId: r.appealId as FieldWorkerEndingAppealId,
    fieldWorkerId: r.fieldWorkerId as FieldWorkerId,
    endingEventVersion: Number(r.endingEventVersion),
    state: r.state as FieldWorkerEndingAppealState,
    heardBy: r.heardBy as FieldWorkerEndingAppealHearer,
    receivedOn: r.receivedOn as string,
    receivedVia: r.receivedVia as FieldWorkerEndingAppealChannel,
    decidedOn: (r.decidedOn as string | null) ?? null,
    lodgedBy: { userId: r.lodgedByUserId as string, displayName: display !== null && display.trim() !== '' ? display : null },
    createdAt: new Date(r.createdAt as Date).toISOString(),
  };
}

/** One appeal of this Pariwar, or null. */
export async function getFieldWorkerEndingAppeal(
  db: Db,
  pariwarId: PariwarId,
  appealId: FieldWorkerEndingAppealId,
): Promise<FieldWorkerEndingAppealView | null> {
  const rows = await db
    .select(VIEW_COLUMNS)
    .from(t)
    .leftJoin(users, eq(users.id, t.lodgedByUserId))
    .where(and(eq(t.pariwarId, pariwarId), eq(t.appealId, appealId)))
    .limit(1);
  return rows[0] ? toView(rows[0]) : null;
}

/** What the decide / withdraw gate loader and its pre-read need of an appeal (a missing / foreign id ⇒ null ⇒ 403 for all). */
export interface FieldWorkerEndingAppealGateRow {
  readonly fieldWorkerId: FieldWorkerId;
  readonly heardBy: FieldWorkerEndingAppealHearer;
  readonly state: FieldWorkerEndingAppealState;
  readonly endedByUserId: string;
  /** The WORKER's district (frozen while terminated) — the gate's target. */
  readonly district: string;
}

export async function getFieldWorkerEndingAppealGateRow(
  db: Db,
  pariwarId: PariwarId,
  appealId: FieldWorkerEndingAppealId,
): Promise<FieldWorkerEndingAppealGateRow | null> {
  const rows = await db
    .select({ fieldWorkerId: t.fieldWorkerId, heardBy: t.heardBy, state: t.state, endedByUserId: t.endedByUserId, district: fieldWorkers.district })
    .from(t)
    .innerJoin(fieldWorkers, and(eq(fieldWorkers.pariwarId, t.pariwarId), eq(fieldWorkers.fieldWorkerId, t.fieldWorkerId)))
    .where(and(eq(t.pariwarId, pariwarId), eq(t.appealId, appealId)))
    .limit(1);
  return rows[0] ?? null;
}

/** One list row: the appeal, the worker's district, and the worker's NAME as ciphertext (the API decrypts it, audited). */
export interface FieldWorkerEndingAppealListRow extends FieldWorkerEndingAppealView {
  readonly nameCiphertext: string;
  readonly district: string;
}

/** A keyset position for the list — the worker-list codec (`decodeFieldWorkerCursor`'s strict checks): the exact `created_at::text` + id. */
export function decodeEndingAppealCursor(s: unknown): { readonly atExact: string; readonly id: string } {
  const c = decodeFieldWorkerCursor(s);
  return { atExact: c.createdAtExact, id: c.fieldWorkerId };
}

/**
 * AD13 — a page of this Pariwar's appeals, newest first (`created_at DESC, appeal_id DESC`): optionally of ONE district (the WORKER's,
 * frozen while terminated) and ONE state; `heardBy` set ⇒ only appeals that hearer hears (the trustee-only rule). `after` MUST come from
 * `decodeEndingAppealCursor`. A non-integer `limit` throws `RangeError`; `clampLimit`-ed (default 20, ceiling 25).
 */
export async function pageFieldWorkerEndingAppeals(
  db: Db,
  pariwarId: PariwarId,
  opts: {
    district?: string;
    state?: FieldWorkerEndingAppealState;
    heardBy?: FieldWorkerEndingAppealHearer;
    after?: { readonly atExact: string; readonly id: string };
    limit?: number;
  },
): Promise<{ items: FieldWorkerEndingAppealListRow[]; nextCursor: string | null }> {
  if (opts.limit !== undefined && !Number.isInteger(opts.limit)) {
    throw new RangeError(`pageFieldWorkerEndingAppeals: limit must be an integer, got ${String(opts.limit)}`);
  }
  if (opts.district !== undefined && opts.district.includes(NUL)) return { items: [], nextCursor: null };
  const limit = clampLimit(opts.limit, { default: PAGE_ENDING_APPEALS_DEFAULT_LIMIT, cap: PAGE_ENDING_APPEALS_MAX_LIMIT });
  const conds = [eq(t.pariwarId, pariwarId)];
  if (opts.district !== undefined) conds.push(eq(fieldWorkers.district, opts.district));
  if (opts.state !== undefined) conds.push(eq(t.state, opts.state));
  if (opts.heardBy !== undefined) conds.push(eq(t.heardBy, opts.heardBy));
  if (opts.after !== undefined) conds.push(sql`(${t.createdAt}, ${t.appealId}) < (${opts.after.atExact}::timestamptz, ${opts.after.id}::uuid)`);
  const rows = await db
    .select({ ...VIEW_COLUMNS, nameCiphertext: fieldWorkers.nameCiphertext, district: fieldWorkers.district })
    .from(t)
    .innerJoin(fieldWorkers, and(eq(fieldWorkers.pariwarId, t.pariwarId), eq(fieldWorkers.fieldWorkerId, t.fieldWorkerId)))
    .leftJoin(users, eq(users.id, t.lodgedByUserId))
    .where(and(...conds))
    .orderBy(desc(t.createdAt), desc(t.appealId))
    .limit(clampLimit(limit + 1, { default: PAGE_ENDING_APPEALS_DEFAULT_LIMIT + 1, cap: PAGE_ENDING_APPEALS_MAX_LIMIT + 1 }));
  const page = rows.slice(0, limit);
  const last = page[page.length - 1];
  return {
    items: page.map((r) => ({ ...toView(r), nameCiphertext: r.nameCiphertext, district: r.district })),
    nextCursor:
      rows.length > limit && last !== undefined
        ? encodeFieldWorkerCursor({ createdAtExact: last.createdAtExact, fieldWorkerId: last.appealId as unknown as FieldWorkerId })
        : null,
  };
}

/**
 * AD13 — one worker's appeals, newest first, at most `limit` (default 20, cap 25); `heardBy` set ⇒ only that hearer's. No decrypt, no
 * audit line (no name). The Find worker panel shows it.
 */
export async function listFieldWorkerEndingAppealsOf(
  db: Db,
  pariwarId: PariwarId,
  fieldWorkerId: FieldWorkerId,
  opts: { heardBy?: FieldWorkerEndingAppealHearer; limit?: number } = {},
): Promise<FieldWorkerEndingAppealView[]> {
  if (opts.limit !== undefined && !Number.isInteger(opts.limit)) {
    throw new RangeError(`listFieldWorkerEndingAppealsOf: limit must be an integer, got ${String(opts.limit)}`);
  }
  const limit = clampLimit(opts.limit, { default: PAGE_ENDING_APPEALS_DEFAULT_LIMIT, cap: PAGE_ENDING_APPEALS_MAX_LIMIT });
  const conds = [eq(t.pariwarId, pariwarId), eq(t.fieldWorkerId, fieldWorkerId)];
  if (opts.heardBy !== undefined) conds.push(eq(t.heardBy, opts.heardBy));
  const rows = await db
    .select(VIEW_COLUMNS)
    .from(t)
    .leftJoin(users, eq(users.id, t.lodgedByUserId))
    .where(and(...conds))
    .orderBy(desc(t.createdAt), desc(t.appealId))
    .limit(clampLimit(limit, { default: PAGE_ENDING_APPEALS_DEFAULT_LIMIT, cap: PAGE_ENDING_APPEALS_MAX_LIMIT }));
  return rows.map(toView);
}

/**
 * `-465` Q6 B — the undo route's PRE-READ (no lock, no audit line): does the worker's CURRENT ending (`ending_event_version` = the row's
 * `state_event_version`) have an appeal the Trustee Panel heard and refused? The command re-checks under the worker lock.
 */
export async function hasPanelRefusedAppealOnCurrentEnding(db: Db, pariwarId: PariwarId, fieldWorkerId: FieldWorkerId): Promise<boolean> {
  const rows = await db
    .select({ hit: sql<number>`1` })
    .from(fieldWorkerEndingAppeals)
    .innerJoin(
      fieldWorkers,
      and(
        eq(fieldWorkers.pariwarId, fieldWorkerEndingAppeals.pariwarId),
        eq(fieldWorkers.fieldWorkerId, fieldWorkerEndingAppeals.fieldWorkerId),
        eq(fieldWorkers.stateEventVersion, fieldWorkerEndingAppeals.endingEventVersion),
      ),
    )
    .where(
      and(
        eq(fieldWorkerEndingAppeals.pariwarId, pariwarId),
        eq(fieldWorkerEndingAppeals.fieldWorkerId, fieldWorkerId),
        eq(fieldWorkers.currentState, 'terminated'),
        eq(fieldWorkerEndingAppeals.heardBy, 'trustee_panel'),
        eq(fieldWorkerEndingAppeals.state, 'refused'),
      ),
    )
    .limit(1);
  return rows.length > 0;
}
