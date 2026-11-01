// Module read accessors — Story 12.1 (QE12; AC8). Every read takes an EXPLICIT `pariwarId` (defense in
// depth alongside RLS — the `contribution/read.ts` convention). ⛔ Shelf read: which members SEE a module is
// Story 12.3's predicate (C1, C9).
//
// ⚠ ADMIN SHAPE. `getModule` / `listModulesForPariwar` return the WHOLE row — including
// `lead_handoff_url`, `lead_handoff_signing_key_secret_name` and `audit_id`. They serve the authoring and
// operator surfaces (12.2) and the lead route's own checks; ⛔ serialise one to a member. The member-facing
// shelf read (12.3) FIELD-PICKS what a member may see (checklist family 6; carried item C9).

import { and, asc, count, desc, eq, getTableColumns, ne, sql } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { ModuleId, PariwarId } from '../ids/index.js';
import { clampLimit } from '../pagination.js';
import { eventsLog } from '../schema/events_log.js';
import {
  marketplaceModules,
  type MarketplaceModule,
  type MarketplaceModuleState,
} from '../schema/marketplace_modules.js';
import { ModuleCursorInvalidError } from './errors.js';
import { replayModuleState } from './state.js';

/** `listModulesForPariwar`'s default page size. */
export const LIST_MODULES_DEFAULT_LIMIT = 50;
/** `listModulesForPariwar`'s hard cap (forced pagination — family (a)). */
export const LIST_MODULES_MAX_LIMIT = 200;

/** One module row in this Pariwar, or null. ⚠ ADMIN SHAPE — every column; ⛔ serialise it to a member (see the file header). */
export async function getModule(db: Db, pariwarId: PariwarId, moduleId: ModuleId): Promise<MarketplaceModule | null> {
  const rows = await db
    .select()
    .from(marketplaceModules)
    .where(and(eq(marketplaceModules.pariwarId, pariwarId), eq(marketplaceModules.moduleId, moduleId)))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * A page of this Pariwar's modules, newest first (`created_at DESC, module_id DESC` — the id breaks ties
 * deterministically), optionally of one state. The page size is `clampLimit`-ed INLINE (TR5: the
 * domain-accessor-invariants gate rejects `.limit(NAMED_CONST)`). ⚠ ADMIN SHAPE — whole rows; ⛔ serialise them to a member.
 */
export async function listModulesForPariwar(
  db: Db,
  pariwarId: PariwarId,
  opts: { state?: MarketplaceModuleState; limit?: number } = {},
): Promise<MarketplaceModule[]> {
  const where =
    opts.state === undefined
      ? eq(marketplaceModules.pariwarId, pariwarId)
      : and(eq(marketplaceModules.pariwarId, pariwarId), eq(marketplaceModules.currentState, opts.state));
  return db
    .select()
    .from(marketplaceModules)
    .where(where)
    .orderBy(desc(marketplaceModules.createdAt), desc(marketplaceModules.moduleId))
    .limit(clampLimit(opts.limit, { default: LIST_MODULES_DEFAULT_LIMIT, cap: LIST_MODULES_MAX_LIMIT }));
}

/**
 * The module's lifecycle STATE as of `at` — the `member/read.ts` `getMemberStateAt` shape plus an explicit
 * `pariwar_id` predicate. Non-nullable like the member shape: a module with no event at or before `at` (or
 * none at all) replays to the pre-genesis `draft`, so a caller that needs existence checks `getModule` first.
 *
 * ⚠ It replays the longest PREFIX of the stream, in `event_version` order, whose events all have
 * `occurred_at <= at` — ⛔ every event that individually satisfies `occurred_at <= at`. `occurred_at` is
 * `now()`, the TRANSACTION START (TR4), so a transaction that began first but won the row lock second appends
 * the HIGHER version with the LOWER timestamp; filtering on the timestamp alone would replay {v1, v3} and skip
 * v2 — a state the module never had. The prefix always is a state it did have.
 *
 * ⚠ `module.lead_submitted` is left out of the read: a lead is a same-state event (`active → active`), so it
 * cannot change the answer, and an uncapped module accumulates one per lead. What remains is at most the
 * genesis plus one event per transition (four today; `module.restored` in 12.6 adds more) — a small stream.
 *
 * ⚠ CLOCK DOMAIN: `occurred_at` is DB time; an `at` taken from the APP clock can disagree with it by the
 * skew between them (the `getCurrentMemberState` caveat). Pass a DB-sourced instant when it matters.
 */
export async function getModuleStateAt(
  db: Db,
  pariwarId: PariwarId,
  moduleId: ModuleId,
  at: Date,
): Promise<MarketplaceModuleState> {
  // `afterAt` is compared IN THE DATABASE: `occurred_at` carries microseconds and a JS `Date` only milliseconds,
  // so cutting the prefix in JS would treat an event stamped a few µs after `at` as being at `at`.
  const rows = await db
    .select({ ...getTableColumns(eventsLog), afterAt: sql<boolean>`${eventsLog.occurredAt} > ${at.toISOString()}::timestamptz` })
    .from(eventsLog)
    .where(
      and(
        eq(eventsLog.streamId, moduleId),
        eq(eventsLog.pariwarId, pariwarId),
        ne(eventsLog.eventType, 'module.lead_submitted'),
      ),
    )
    .orderBy(asc(eventsLog.eventVersion));
  const firstAfter = rows.findIndex((row) => row.afterAt);
  return replayModuleState(firstAfter === -1 ? rows : rows.slice(0, firstAfter));
}

// ── Story 12.2 — the admin list's CURSOR page, the author of record, the lead count ─────────────────
// (`2026-11-01-433` QE9, QE15, QE16 as AMENDED by BigDev — the strict base64url decode; 12.1 RVD6.)
// ⚠ `listModulesForPariwar` above is UNCHANGED (12.1's `read.spec.ts` pins its array-of-at-most-`limit` return); the
// cursor read is a NEW function — the `listWorkplaceDistricts` / `pageWorkplaceDistricts` twin pair.

/** A keyset position: the row's EXACT `created_at::text` (µs — ⛔ a JS `Date`, which keeps ms only and would SKIP rows
 *  written in the same millisecond — TR10; the `claim/correction-queue-read.ts` `createdAtExact` precedent) + its id. */
export interface ModuleListCursor {
  readonly createdAtExact: string;
  readonly moduleId: ModuleId;
}

/** One page row: the WHOLE module row (⚠ ADMIN SHAPE) plus its exact `created_at` text. */
export type ModulePageRow = MarketplaceModule & { readonly createdAtExact: string };

/** The longest cursor `decodeModuleCursor` accepts (a server-built one is ~110 characters). */
export const MODULE_CURSOR_MAX_LENGTH = 256;

/** `created_at::text` as Postgres writes it (ISO DateStyle): a zero fraction is omitted; the offset may carry minutes /
 *  seconds (a non-UTC session). Shape ONLY — every field is range-checked separately (TR24). */
const CREATED_AT_TEXT = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})(\.\d{1,6})?([+-])(\d{2})(?::(\d{2}))?(?::(\d{2}))?$/;
const LOWER_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const BASE64URL = /^[A-Za-z0-9_-]+$/;

/** The opaque cursor for a page's last row: base64url (⛔ padding — Node emits none) of the CANONICAL `{"c":…,"m":…}`. */
export function encodeModuleCursor(c: ModuleListCursor): string {
  return Buffer.from(JSON.stringify({ c: c.createdAtExact, m: c.moduleId }), 'utf8').toString('base64url');
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
 * Decode a list cursor STRICTLY, in JS, BEFORE any SQL (QE16 as amended). Node's `Buffer.from(s, 'base64url')` is
 * LENIENT — it accepts `+` / `/`, `=` padding and a `len % 4 === 1` tail, skips junk, ignores non-zero trailing bits —
 * `toString('utf8')` turns bad UTF-8 into U+FFFD, and `JSON.parse` keeps the LAST of duplicate keys (TR25). So, in order:
 *   1. a string of 1–256 characters in the URL-safe alphabet only (⛔ `=`, ⛔ `+` / `/`, ⛔ whitespace), `length % 4 !== 1`;
 *   2. the bytes re-encode to EXACTLY `s` (canonical — rejects non-zero trailing bits and anything the decoder skipped);
 *   3. the bytes are valid UTF-8 (`fatal: true`);
 *   4. the JSON is a plain object with EXACTLY the keys `c`, `m` (in that order), both strings, whose text equals the
 *      canonical `JSON.stringify({ c, m })` (rejects duplicate / reordered keys, whitespace, escape variants);
 *   5. `c` is a Postgres `timestamptz` text with every field in range (⛔ `infinity` / `now` / `epoch`, ⛔ `2026-13-01`);
 *      `m` is a lower-case UUID.
 * A cast failure on the hook's READ transaction would abort it and answer 500 (TR19) — hence all of this.
 *
 * @throws ModuleCursorInvalidError
 */
export function decodeModuleCursor(s: unknown): ModuleListCursor {
  const fail = (reason: string): never => {
    throw new ModuleCursorInvalidError(reason);
  };
  if (typeof s !== 'string' || s.length < 1 || s.length > MODULE_CURSOR_MAX_LENGTH) fail('length');
  const str = s as string;
  if (!BASE64URL.test(str) || str.length % 4 === 1) fail('alphabet');
  const bytes = Buffer.from(str, 'base64url');
  if (bytes.toString('base64url') !== str) fail('not canonical base64url');
  let text = '';
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
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
  if (keys.length !== 2 || keys[0] !== 'c' || keys[1] !== 'm') fail('keys');
  const c = rec['c'];
  const m = rec['m'];
  if (typeof c !== 'string' || typeof m !== 'string') fail('field types');
  if (text !== JSON.stringify({ c, m })) fail('not canonical json');
  const match = CREATED_AT_TEXT.exec(c as string);
  if (match === null || !createdAtInRange(match)) fail('created_at');
  if (!LOWER_UUID.test(m as string)) fail('module id');
  return { createdAtExact: c as string, moduleId: m as ModuleId };
}

/**
 * A page of this Pariwar's modules in the list order (`created_at DESC, module_id DESC`), optionally of one state, AFTER
 * a keyset position. The keyset compares IN SQL — `(created_at, module_id) < ($c::timestamptz, $m::uuid)` — on the exact
 * `created_at::text` (⛔ OFFSET, ⛔ a JS `Date` round-trip). Over-fetches one row for `nextCursor` (the
 * `pageWorkplaceDistricts` form, clamped INLINE). `after` MUST come from `decodeModuleCursor` (validated before SQL).
 * ⚠ ADMIN SHAPE — whole rows; ⛔ serialise them to a member.
 */
export async function pageModulesForPariwar(
  db: Db,
  pariwarId: PariwarId,
  opts: { state?: MarketplaceModuleState; limit?: number; after?: ModuleListCursor } = {},
): Promise<{ items: ModulePageRow[]; nextCursor: string | null }> {
  const limit = clampLimit(opts.limit, { default: LIST_MODULES_DEFAULT_LIMIT, cap: LIST_MODULES_MAX_LIMIT });
  const conds = [eq(marketplaceModules.pariwarId, pariwarId)];
  if (opts.state !== undefined) conds.push(eq(marketplaceModules.currentState, opts.state));
  if (opts.after !== undefined) {
    conds.push(
      sql`(${marketplaceModules.createdAt}, ${marketplaceModules.moduleId}) < (${opts.after.createdAtExact}::timestamptz, ${opts.after.moduleId}::uuid)`,
    );
  }
  const rows = await db
    .select({ ...getTableColumns(marketplaceModules), createdAtExact: sql<string>`${marketplaceModules.createdAt}::text` })
    .from(marketplaceModules)
    .where(and(...conds))
    .orderBy(desc(marketplaceModules.createdAt), desc(marketplaceModules.moduleId))
    .limit(clampLimit(limit + 1, { default: LIST_MODULES_DEFAULT_LIMIT + 1, cap: LIST_MODULES_MAX_LIMIT + 1 }));
  const items = rows.slice(0, limit);
  const last = items[items.length - 1];
  return {
    items,
    nextCursor:
      rows.length > limit && last !== undefined
        ? encodeModuleCursor({ createdAtExact: last.createdAtExact, moduleId: last.moduleId })
        : null,
  };
}

/**
 * The author of record: the `events_log.actor_id` of the module's `module.authored` event (QE9) — `null` when the
 * genesis was authored by `system` (or there is ⛔ genesis in this Pariwar). ⚠ The publish route DENIES a null author
 * (I4): the tone gate's `reviewedBy === authoredBy` is never true against null (TR21).
 */
export async function getModuleAuthorActorId(db: Db, pariwarId: PariwarId, moduleId: ModuleId): Promise<string | null> {
  const rows = await db
    .select({ actorId: eventsLog.actorId })
    .from(eventsLog)
    .where(
      and(eq(eventsLog.streamId, moduleId), eq(eventsLog.pariwarId, pariwarId), eq(eventsLog.eventType, 'module.authored')),
    )
    .limit(1);
  return rows[0]?.actorId ?? null;
}

/** How many `module.lead_submitted` events THIS module's stream holds (bounded by the `stream_id` index) — QE15's C10
 *  warning count. Always 0 in 12.2 (⛔ lead route). */
export async function countModuleLeads(db: Db, pariwarId: PariwarId, moduleId: ModuleId): Promise<number> {
  const rows = await db
    .select({ n: count() })
    .from(eventsLog)
    .where(
      and(
        eq(eventsLog.streamId, moduleId),
        eq(eventsLog.pariwarId, pariwarId),
        eq(eventsLog.eventType, 'module.lead_submitted'),
      ),
    );
  return Number(rows[0]?.n ?? 0);
}
